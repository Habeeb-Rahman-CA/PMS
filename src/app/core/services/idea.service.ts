import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Idea } from '../models/idea.model';

const STORAGE_KEY = 'devflow_ideas';

@Injectable({
  providedIn: 'root'
})
export class IdeaService {
  ideas = signal<Idea[]>([]);
  loading = signal<boolean>(false);

  constructor(private supabaseService: SupabaseService) {
    this.loadFromStorage();
    this.loadIdeasFromSupabase();
  }

  private loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.ideas.set(parsed);
      } catch (e) {
        console.error('Failed to parse ideas from local storage', e);
      }
    } else {
      this.seedInitialIdeas();
    }
  }

  private saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ideas()));
  }

  private seedInitialIdeas() {
    const seed: Idea[] = [
      {
        id: crypto.randomUUID(),
        title: 'Micro-SaaS Analytics Webhook Plugin',
        description: 'Lightweight JavaScript snippet for real-time telemetry and conversion tracking.',
        tags: ['saas', 'analytics', 'webhooks'],
        status: 'inbox',
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        title: 'AI Automated PR Reviewer Bot',
        description: 'GitHub Action bot that analyzes incoming diffs and posts inline code quality review suggestions.',
        tags: ['ai', 'github-action', 'ci-cd'],
        status: 'inbox',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: crypto.randomUUID(),
        title: 'Developer Terminal Scratchpad CLI',
        description: 'Minimal Rust CLI tool to quickly sync local markdown notes to DevFlow Inbox.',
        tags: ['cli', 'developer-tool'],
        status: 'inbox',
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];

    this.ideas.set(seed);
    this.saveToStorage();
  }

  async loadIdeasFromSupabase() {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        this.ideas.set(data as Idea[]);
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Could not load ideas from Supabase', e);
    } finally {
      this.loading.set(false);
    }
  }

  async createIdea(title: string, description: string = '', tags: string[] = []): Promise<Idea> {
    const newIdea: Idea = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      tags,
      status: 'inbox',
      created_at: new Date().toISOString()
    };

    this.ideas.update(list => [newIdea, ...list]);
    this.saveToStorage();

    try {
      await this.supabaseService.supabase.from('ideas').insert([{
        id: newIdea.id,
        title: newIdea.title,
        description: newIdea.description,
        tags: newIdea.tags,
        status: newIdea.status
      }]);
    } catch (e) {
      console.warn('Supabase idea insert warning:', e);
    }

    return newIdea;
  }

  async updateIdea(id: string, updates: Partial<Idea>): Promise<Idea | null> {
    let updatedIdea: Idea | null = null;
    this.ideas.update(list => list.map(item => {
      if (item.id === id) {
        updatedIdea = { ...item, ...updates };
        return updatedIdea;
      }
      return item;
    }));

    if (updatedIdea) this.saveToStorage();

    try {
      await this.supabaseService.supabase.from('ideas').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase idea update warning:', e);
    }

    return updatedIdea;
  }

  async markConverted(id: string, targetType: 'project' | 'task', convertedId?: string) {
    const newStatus = targetType === 'project' ? 'converted_project' : 'converted_task';
    await this.updateIdea(id, {
      status: newStatus,
      converted_id: convertedId
    });
  }

  async deleteIdea(id: string) {
    this.ideas.update(list => list.filter(item => item.id !== id));
    this.saveToStorage();

    try {
      await this.supabaseService.supabase.from('ideas').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase idea delete warning:', e);
    }
  }
}
