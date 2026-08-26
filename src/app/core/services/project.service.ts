import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Project, Task, Workflow, TechNote } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  projects = signal<Project[]>([]);
  activeProject = signal<Project | null>(null);
  nextTasks = signal<Task[]>([]);
  loading = signal<boolean>(false);

  constructor(private supabaseService: SupabaseService) {}

  async loadProjects() {
    this.loading.set(true);
    const { data, error } = await this.supabaseService.supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      this.projects.set(data as Project[]);
    }
    this.loading.set(false);
  }

  async loadNextUpTasks() {
    const { data, error } = await this.supabaseService.supabase
      .from('tasks')
      .select('*')
      .eq('is_next', true)
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      this.nextTasks.set(data as Task[]);
    }
  }

  async createProject(project: Partial<Project>) {
    const { data, error } = await this.supabaseService.supabase
      .from('projects')
      .insert([project])
      .select();

    if (!error && data) {
      await this.loadProjects();
      return data[0] as Project;
    }
    throw error;
  }

  async createTask(task: Partial<Task>) {
    const { data, error } = await this.supabaseService.supabase
      .from('tasks')
      .insert([task])
      .select();

    if (!error && data) {
      if (task.is_next) {
        await this.loadNextUpTasks();
      }
      return data[0] as Task;
    }
    throw error;
  }
}
