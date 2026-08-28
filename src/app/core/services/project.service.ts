import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { SyncService } from './sync.service';
import { Project, ProjectActivity, Task } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  projects = signal<Project[]>([]);
  activities = signal<ProjectActivity[]>([]);
  tasks = signal<Task[]>([]);
  activeProject = signal<Project | null>(null);
  loading = signal<boolean>(false);

  constructor(
    private supabaseService: SupabaseService,
    private syncService: SyncService
  ) {
    this.loadFromStorage();
    this.loadFromSupabase();
  }

  private loadFromStorage() {
    const cached = localStorage.getItem('bilo_projects_data');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data.projects && Array.isArray(data.projects)) {
          const cleanProjects = data.projects.filter((p: Project) => p.id !== 'proj-default-1');
          this.projects.set(cleanProjects);
          this.activeProject.set(cleanProjects.length > 0 ? cleanProjects[0] : null);
          if (data.activities && Array.isArray(data.activities)) {
            this.activities.set(data.activities);
          }
          return;
        }
      } catch (e) {
        console.error('Failed to load local cache', e);
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem('bilo_projects_data', JSON.stringify({
      projects: this.projects(),
      activities: this.activities()
    }));
  }

  async loadFromSupabase() {
    if (!this.syncService.isOnline()) return;

    this.loading.set(true);
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        this.projects.set(data as Project[]);
        if (data.length > 0) {
          this.activeProject.set(data[0] as Project);
        } else {
          this.activeProject.set(null);
        }
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Could not load projects from Supabase', e);
    } finally {
      this.loading.set(false);
    }
  }

  // --- CRUD Operations ---

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const generatedId = crypto.randomUUID();
    const newProj: Project = {
      id: generatedId,
      name: projectData.name || 'Untitled Project',
      slug: (projectData.name || 'untitled').toLowerCase().replace(/\s+/g, '-'),
      description: projectData.description || '',
      repository_url: projectData.repository_url || '',
      status: projectData.status || 'active',
      labels: projectData.labels || [],
      color: projectData.color || '#06b6d4',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update state immediately
    this.projects.update(list => [newProj, ...list]);
    this.activeProject.set(newProj);
    this.logActivity(newProj.id, 'Created', `Project "${newProj.name}" created`);
    this.saveToStorage();

    const payload = {
      id: newProj.id,
      name: newProj.name,
      slug: newProj.slug,
      description: newProj.description,
      repository_url: newProj.repository_url,
      status: newProj.status,
      labels: newProj.labels,
      color: newProj.color
    };

    this.syncService.enqueue('CREATE_PROJECT', payload);
    return newProj;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const updatedFields = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    let updatedProj: Project | null = null;
    this.projects.update(list => list.map(p => {
      if (p.id === id) {
        updatedProj = { ...p, ...updatedFields };
        return updatedProj;
      }
      return p;
    }));

    if (updatedProj) {
      if (this.activeProject()?.id === id) this.activeProject.set(updatedProj);
      this.logActivity(id, 'Updated', `Project metadata updated`);
      this.saveToStorage();

      this.syncService.enqueue('UPDATE_PROJECT', {
        id,
        name: updates.name,
        slug: updates.name ? updates.name.toLowerCase().replace(/\s+/g, '-') : undefined,
        description: updates.description,
        repository_url: updates.repository_url,
        status: updates.status,
        labels: updates.labels,
        color: updates.color,
        updated_at: new Date().toISOString()
      });
    }

    return updatedProj;
  }

  async archiveProject(id: string) {
    const proj = this.projects().find(p => p.id === id);
    if (!proj) return;
    const newStatus = proj.status === 'archived' ? 'active' : 'archived';
    await this.updateProject(id, { status: newStatus });
  }

  async deleteProject(id: string) {
    const proj = this.projects().find(p => p.id === id);
    if (!proj) return;

    this.projects.update(list => list.filter(p => p.id !== id));
    this.tasks.update(list => list.filter(t => t.project_id !== id));
    this.activities.update(list => list.filter(a => a.project_id !== id));

    if (this.activeProject()?.id === id) {
      const remaining = this.projects();
      this.activeProject.set(remaining.length > 0 ? remaining[0] : null);
    }

    this.saveToStorage();
    this.syncService.enqueue('DELETE_PROJECT', { id });
  }

  logActivity(projectId: string, action: string, description: string) {
    const newAct: ProjectActivity = {
      id: crypto.randomUUID(),
      project_id: projectId,
      action,
      description,
      timestamp: new Date().toISOString()
    };
    this.activities.update(list => [newAct, ...list]);
  }

  getProjectProgress(projectId: string): { completed: number; total: number; percent: number } {
    const projTasks = this.tasks().filter(t => t.project_id === projectId);
    if (projTasks.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = projTasks.filter(t => t.completed).length;
    const percent = Math.round((completed / projTasks.length) * 100);
    return { completed, total: projTasks.length, percent };
  }

  getProjectRecentActivity(projectId: string): ProjectActivity[] {
    return this.activities()
      .filter(a => a.project_id === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }
}
