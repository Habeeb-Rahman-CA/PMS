import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Task, TaskComment } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  tasks = signal<Task[]>([]);
  taskComments = signal<Record<string, TaskComment[]>>({});
  loading = signal<boolean>(false);

  constructor(private supabaseService: SupabaseService) {
    this.loadFromStorage();
    this.loadTasksFromSupabase();
  }

  private loadFromStorage() {
    const cached = localStorage.getItem('devflow_tasks_data');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.tasks && Array.isArray(data.tasks) && data.tasks.length > 0) {
          this.tasks.set(data.tasks);
          if (data.comments) {
            this.taskComments.set(data.comments);
          }
          return;
        }
      } catch (e) {
        console.error('Failed to parse local tasks cache', e);
      }
    }

    // Seed realistic demo tasks demonstrating issue types, priorities, labels, and status columns
    const initialTasks: Task[] = [
      {
        id: 'task-demo-1',
        project_id: 'proj-default-1',
        title: 'Architect Supabase Database Schema & RLS Security Policies',
        description: 'Define PostgreSQL relational tables for projects, workflows, tasks, and task comments with strict row level security.',
        type: 'epic',
        status: 'Done',
        priority: 'urgent',
        labels: ['database', 'security', 'backend'],
        assignee: 'Alex',
        due_date: '2026-08-25',
        position: 0,
        is_next: false,
        completed: true,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'task-demo-2',
        project_id: 'proj-default-1',
        title: 'Implement Angular CDK Drag and Drop Kanban Board',
        description: 'Enable smooth drag and drop between task status columns with real-time signal updates and persistent caching.',
        type: 'story',
        status: 'In Progress',
        priority: 'high',
        labels: ['frontend', 'ui', 'kanban'],
        assignee: 'Self',
        due_date: '2026-08-30',
        position: 0,
        is_next: true,
        completed: false,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'task-demo-3',
        project_id: 'proj-default-1',
        title: 'Fix issue type filter dropdown z-index positioning in dark mode',
        description: 'Ensure filter select inputs do not overflow or get clipped in responsive viewports.',
        type: 'bug',
        status: 'To Do',
        priority: 'medium',
        labels: ['bug', 'css', 'ui'],
        assignee: 'Sarah',
        due_date: '2026-09-02',
        position: 0,
        is_next: false,
        completed: false,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'task-demo-4',
        project_id: 'proj-default-1',
        title: 'Setup Cloudflare Pages Deployment & Edge Caching',
        description: 'Configure automated git deployments and edge headers for lightning fast PWA load times.',
        type: 'task',
        status: 'Backlog',
        priority: 'low',
        labels: ['devops', 'cloudflare'],
        assignee: 'DevOps',
        due_date: '2026-09-10',
        position: 0,
        is_next: false,
        completed: false,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
      }
    ];

    this.tasks.set(initialTasks);
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('devflow_tasks_data', JSON.stringify({
      tasks: this.tasks(),
      comments: this.taskComments()
    }));
  }

  async loadTasksFromSupabase() {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        this.tasks.set(data as Task[]);
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Could not load tasks from Supabase', e);
    } finally {
      this.loading.set(false);
    }
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    const newId = crypto.randomUUID();
    const newTask: Task = {
      id: newId,
      project_id: taskData.project_id || '',
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      type: taskData.type || 'task',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      labels: taskData.labels || [],
      assignee: taskData.assignee || 'Self',
      due_date: taskData.due_date || '',
      position: 0,
      is_next: taskData.is_next || false,
      completed: taskData.status === 'done',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update signal state immediately
    this.tasks.update(list => [newTask, ...list]);
    this.saveToStorage();

    // Async sync to Supabase database
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('tasks')
        .insert([{
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
        }])
        .select();

      if (error) {
        console.error('Supabase task insert error:', error);
      } else if (data && data[0]) {
        const inserted = data[0] as Task;
        this.tasks.update(list => list.map(t => t.id === newId ? inserted : t));
        this.saveToStorage();
        return inserted;
      }
    } catch (e) {
      console.warn('Supabase task sync warning:', e);
    }

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
    }

    try {
      const { error } = await this.supabaseService.supabase
        .from('tasks')
        .update(updatedFields)
        .eq('id', id);

      if (error) {
        console.error('Supabase task update error:', error);
      }
    } catch (e) {
      console.warn('Supabase task update warning:', e);
    }

    return updatedTask;
  }

  async deleteTask(id: string) {
    this.tasks.update(list => list.filter(t => t.id !== id));
    this.saveToStorage();

    try {
      await this.supabaseService.supabase.from('tasks').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase task delete warning:', e);
    }
  }

  // --- Task Comments ---

  async loadCommentsForTask(taskId: string): Promise<TaskComment[]> {
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

    // Async sync to Supabase database
    try {
      await this.supabaseService.supabase.from('task_comments').insert([newComm]);
    } catch (e) {
      console.warn('Supabase comment insert warning:', e);
    }

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

    try {
      await this.supabaseService.supabase
        .from('task_comments')
        .update({ content: newContent, updated_at: updatedAt })
        .eq('id', commentId);
    } catch (e) {
      console.warn('Supabase comment update warning:', e);
    }

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

    try {
      await this.supabaseService.supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);
    } catch (e) {
      console.warn('Supabase comment delete warning:', e);
    }
  }
}

