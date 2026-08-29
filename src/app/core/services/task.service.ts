import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SyncService } from './sync.service';
import { Task, TaskComment } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  tasks = signal<Task[]>([]);
  taskComments = signal<Record<string, TaskComment[]>>({});
  loading = signal<boolean>(false);

  constructor(
    private supabaseService: SupabaseService,
    private syncService: SyncService
  ) {
    this.loadFromStorage();
    this.loadTasksFromSupabase();
  }

  normalizeTaskStatuses(tasks: Task[]): { normalized: Task[]; hasChanges: boolean } {
    const validGlobalStatuses = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

    let hasChanges = false;
    const normalized = tasks.map(t => {
      const currentStatus = (t.status || '').trim();
      let targetStatus = currentStatus;

      const exactMatch = validGlobalStatuses.find(s => s.toLowerCase() === currentStatus.toLowerCase());
      if (exactMatch) {
        targetStatus = exactMatch;
      } else {
        const lower = currentStatus.toLowerCase();
        if (lower.includes('backlog')) {
          targetStatus = 'Backlog';
        } else if (lower.includes('todo') || lower === 'to do' || lower === 'open') {
          targetStatus = 'To Do';
        } else if (lower.includes('progress') || lower.includes('doing') || lower === 'wip') {
          targetStatus = 'In Progress';
        } else if (lower.includes('review') || lower.includes('testing')) {
          targetStatus = 'In Review';
        } else if (lower.includes('done') || lower.includes('complete') || lower.includes('closed')) {
          targetStatus = 'Done';
        } else {
          targetStatus = 'Backlog';
        }
      }

      const targetCompleted = targetStatus === 'Done';

      if (targetStatus !== currentStatus || t.completed !== targetCompleted) {
        hasChanges = true;
        return {
          ...t,
          status: targetStatus,
          completed: targetCompleted,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    });

    return { normalized, hasChanges };
  }

  private loadFromStorage() {
    const cached = localStorage.getItem('bilo_tasks_data');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.tasks && Array.isArray(data.tasks)) {
          const cleanTasks = data.tasks.filter((t: Task) => !t.id.startsWith('task-demo-'));
          const { normalized } = this.normalizeTaskStatuses(cleanTasks);
          this.tasks.set(normalized);
          if (data.comments) {
            this.taskComments.set(data.comments);
          }
          return;
        }
      } catch (e) {
        console.error('Failed to parse local tasks cache', e);
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem('bilo_tasks_data', JSON.stringify({
      tasks: this.tasks(),
      comments: this.taskComments()
    }));
  }

  async loadTasksFromSupabase() {
    if (!this.syncService.isOnline()) return;

    this.loading.set(true);
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const { normalized, hasChanges } = this.normalizeTaskStatuses(data as Task[]);
        this.tasks.set(normalized);
        this.saveToStorage();

        if (hasChanges) {
          // Sync normalized statuses back to Supabase DB
          for (const t of normalized) {
            this.supabaseService.supabase
              .from('tasks')
              .update({ status: t.status, completed: t.completed })
              .eq('id', t.id)
              .then();
          }
        }
      }
    } catch (e) {
      console.warn('Could not load tasks from Supabase', e);
    } finally {
      this.loading.set(false);
    }
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const newId = crypto.randomUUID();

    let initialStatus = (taskData.status || 'Backlog').trim();
    const exactMatch = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'].find(s => s.toLowerCase() === initialStatus.toLowerCase());
    if (exactMatch) {
      initialStatus = exactMatch;
    } else {
      const lower = initialStatus.toLowerCase();
      if (lower.includes('backlog')) initialStatus = 'Backlog';
      else if (lower.includes('todo') || lower === 'to do' || lower === 'open') initialStatus = 'To Do';
      else if (lower.includes('progress') || lower.includes('doing')) initialStatus = 'In Progress';
      else if (lower.includes('review')) initialStatus = 'In Review';
      else if (lower.includes('done') || lower.includes('complete')) initialStatus = 'Done';
      else initialStatus = 'Backlog';
    }

    const newTask: Task = {
      id: newId,
      project_id: taskData.project_id || '',
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      type: taskData.type || 'task',
      status: initialStatus,
      priority: taskData.priority || 'medium',
      labels: taskData.labels || [],
      assignee: taskData.assignee || 'Self',
      due_date: taskData.due_date || '',
      position: 0,
      is_next: taskData.is_next || false,
      completed: initialStatus === 'Done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update signal state & local storage immediately
    this.tasks.update(list => [newTask, ...list]);
    this.saveToStorage();

    // Queue mutation for sync
    const payload = {
      id: newTask.id,
      project_id: newTask.project_id || null,
      title: newTask.title,
      description: newTask.description,
      type: newTask.type,
      status: newTask.status,
      priority: newTask.priority,
      labels: newTask.labels,
      assignee: newTask.assignee,
      due_date: newTask.due_date || null,
      completed: newTask.completed
    };

    this.syncService.enqueue('CREATE_TASK', payload);
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const updatedFields = {
      ...updates,
      completed: updates.status ? updates.status === 'done' : undefined,
      updated_at: new Date().toISOString()
    };

    let updatedTask: Task | null = null;
    this.tasks.update(list => list.map(t => {
      if (t.id === id) {
        updatedTask = { ...t, ...updatedFields } as Task;
        return updatedTask;
      }
      return t;
    }));

    if (updatedTask) {
      this.saveToStorage();
      this.syncService.enqueue('UPDATE_TASK', { id, ...updatedFields });
    }

    return updatedTask;
  }

  async deleteTask(id: string) {
    this.tasks.update(list => list.filter(t => t.id !== id));
    this.saveToStorage();
    this.syncService.enqueue('DELETE_TASK', { id });
  }

  // --- Task Comments / Notes ---

  async loadCommentsForTask(taskId: string): Promise<TaskComment[]> {
    if (this.syncService.isOnline()) {
      try {
        const { data, error } = await this.supabaseService.supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          this.taskComments.update(map => ({
            ...map,
            [taskId]: data as TaskComment[]
          }));
          this.saveToStorage();
          return data as TaskComment[];
        }
      } catch (e) {
        console.warn('Could not load comments from Supabase', e);
      }
    }

    return this.taskComments()[taskId] || [];
  }

  async addComment(taskId: string, content: string, authorName: string = 'Self'): Promise<TaskComment> {
    const newComm: TaskComment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      author_name: authorName,
      content,
      created_at: new Date().toISOString()
    };

    // Update signal state immediately
    this.taskComments.update(map => ({
      ...map,
      [taskId]: [...(map[taskId] || []), newComm]
    }));
    this.saveToStorage();

    this.syncService.enqueue('ADD_COMMENT', newComm);
    return newComm;
  }

  async updateComment(commentId: string, taskId: string, newContent: string): Promise<TaskComment | null> {
    const updatedAt = new Date().toISOString();
    let updatedComment: TaskComment | null = null;

    this.taskComments.update(map => {
      const list = map[taskId] || [];
      const newList: TaskComment[] = list.map(c => {
        if (c.id === commentId) {
          const updated: TaskComment = { ...c, content: newContent, updated_at: updatedAt };
          updatedComment = updated;
          return updated;
        }
        return c;
      });
      return { ...map, [taskId]: newList };
    });

    this.saveToStorage();
    this.syncService.enqueue('UPDATE_COMMENT', { id: commentId, content: newContent, updated_at: updatedAt });
    return updatedComment;
  }

  async deleteComment(commentId: string, taskId: string): Promise<void> {
    this.taskComments.update(map => {
      const list = map[taskId] || [];
      return {
        ...map,
        [taskId]: list.filter(c => c.id !== commentId)
      };
    });

    this.saveToStorage();
    this.syncService.enqueue('DELETE_COMMENT', { id: commentId });
  }
}
