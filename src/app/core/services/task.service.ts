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
        if (data.tasks && Array.isArray(data.tasks)) {
          this.tasks.set(data.tasks);
        }
        if (data.comments) {
          this.taskComments.set(data.comments);
        }
      } catch (e) {
        console.error('Failed to parse local tasks cache', e);
      }
    }
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
}
