import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Workflow } from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  workflows = signal<Workflow[]>([]);
  loading = signal<boolean>(false);

  constructor(private supabaseService: SupabaseService) {
    this.loadFromStorage();
    this.loadAllWorkflows();
  }

  private loadFromStorage() {
    const cached = localStorage.getItem('devflow_workflows_data');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (Array.isArray(data)) {
          this.workflows.set(data);
        }
      } catch (e) {
        console.error('Failed to parse local workflows cache', e);
      }
    }
  }

  private saveToStorage() {
    localStorage.setItem('devflow_workflows_data', JSON.stringify(this.workflows()));
  }

  async loadAllWorkflows() {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('workflows')
        .select('*')
        .order('position', { ascending: true });

      if (!error && data) {
        this.workflows.set(data as Workflow[]);
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Could not load workflows from Supabase', e);
    } finally {
      this.loading.set(false);
    }
  }

  getWorkflowsForProject(projectId: string): Workflow[] {
    if (!projectId) return [];
    
    if (projectId === 'all') {
      return [
        { id: 'wf-backlog-all', project_id: 'all', name: 'Backlog', color: '#64748b', position: 0, created_at: '' },
        { id: 'wf-todo-all', project_id: 'all', name: 'To Do', color: '#3b82f6', position: 1, created_at: '' },
        { id: 'wf-in-progress-all', project_id: 'all', name: 'In Progress', color: '#eab308', position: 2, created_at: '' },
        { id: 'wf-in-review-all', project_id: 'all', name: 'In Review', color: '#a855f7', position: 3, created_at: '' },
        { id: 'wf-done-all', project_id: 'all', name: 'Done', color: '#22c55e', position: 4, created_at: '' }
      ];
    }

    const custom = this.workflows()
      .filter(w => w.project_id === projectId)
      .sort((a, b) => a.position - b.position);

    if (custom.length > 0) return custom;

    return [
      { id: `wf-backlog-${projectId}`, project_id: projectId, name: 'Backlog', color: '#64748b', position: 0, created_at: '' },
      { id: `wf-todo-${projectId}`, project_id: projectId, name: 'To Do', color: '#3b82f6', position: 1, created_at: '' },
      { id: `wf-in-progress-${projectId}`, project_id: projectId, name: 'In Progress', color: '#eab308', position: 2, created_at: '' },
      { id: `wf-in-review-${projectId}`, project_id: projectId, name: 'In Review', color: '#a855f7', position: 3, created_at: '' },
      { id: `wf-done-${projectId}`, project_id: projectId, name: 'Done', color: '#22c55e', position: 4, created_at: '' }
    ];
  }

  async createWorkflow(projectId: string, name: string, color: string = '#06b6d4'): Promise<Workflow> {
    const projWorkflows = this.getWorkflowsForProject(projectId);
    const generatedId = crypto.randomUUID();

    const newWorkflow: Workflow = {
      id: generatedId,
      project_id: projectId,
      name: name.trim(),
      color: color || '#06b6d4',
      position: projWorkflows.length,
      created_at: new Date().toISOString()
    };

    // Update state immediately
    this.workflows.update(list => [...list, newWorkflow]);
    this.saveToStorage();

    // Async sync to Supabase database
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('workflows')
        .insert([{
          id: newWorkflow.id,
          project_id: newWorkflow.project_id,
          name: newWorkflow.name,
          color: newWorkflow.color,
          position: newWorkflow.position
        }])
        .select();

      if (error) {
        console.error('Supabase workflow insert error:', error);
      } else if (data && data[0]) {
        const inserted = data[0] as Workflow;
        this.workflows.update(list => list.map(w => w.id === generatedId ? inserted : w));
        this.saveToStorage();
        return inserted;
      }
    } catch (e) {
      console.warn('Supabase workflow insert warning:', e);
    }

    return newWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
    let updatedWf: Workflow | null = null;
    this.workflows.update(list => list.map(w => {
      if (w.id === id) {
        updatedWf = { ...w, ...updates };
        return updatedWf;
      }
      return w;
    }));

    if (updatedWf) {
      this.saveToStorage();
    }

    try {
      const { error } = await this.supabaseService.supabase
        .from('workflows')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error('Supabase workflow update error:', error);
      }
    } catch (e) {
      console.warn('Supabase workflow update warning:', e);
    }

    return updatedWf;
  }

  async deleteWorkflow(id: string) {
    this.workflows.update(list => list.filter(w => w.id !== id));
    this.saveToStorage();

    try {
      const { error } = await this.supabaseService.supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase workflow delete error:', error);
      }
    } catch (e) {
      console.warn('Supabase workflow delete warning:', e);
    }
  }

  async updateWorkflowPositions(projectId: string, orderedWorkflows: Workflow[]) {
    const updated = orderedWorkflows.map((w, idx) => ({
      ...w,
      position: idx
    }));

    this.workflows.update(list => {
      const otherProjWorkflows = list.filter(w => w.project_id !== projectId);
      return [...otherProjWorkflows, ...updated];
    });
    this.saveToStorage();

    for (const w of updated) {
      try {
        await this.supabaseService.supabase
          .from('workflows')
          .update({ position: w.position, name: w.name, color: w.color })
          .eq('id', w.id);
      } catch {}
    }
  }
}
