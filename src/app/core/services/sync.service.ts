import { Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PendingSyncOp {
  id: string;
  type:
    | 'CREATE_TASK'
    | 'UPDATE_TASK'
    | 'DELETE_TASK'
    | 'CREATE_PROJECT'
    | 'UPDATE_PROJECT'
    | 'DELETE_PROJECT'
    | 'ADD_COMMENT'
    | 'UPDATE_COMMENT'
    | 'DELETE_COMMENT';
  payload: any;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  isOnline = signal<boolean>(navigator.onLine);
  pendingSyncQueue = signal<PendingSyncOp[]>([]);
  syncing = signal<boolean>(false);

  constructor(private supabaseService: SupabaseService) {
    this.loadQueueFromStorage();

    window.addEventListener('online', () => {
      console.log('[Bilo Sync] Network connectivity restored. Triggering offline sync...');
      this.isOnline.set(true);
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      console.log('[Bilo Sync] Device went offline. Queueing local mutations for sync.');
      this.isOnline.set(false);
    });

    // Initial sync check if online and items pending
    if (this.isOnline() && this.pendingSyncQueue().length > 0) {
      this.processQueue();
    }
  }

  private loadQueueFromStorage() {
    const cached = localStorage.getItem('bilo_sync_queue');
    if (cached) {
      try {
        const queue = JSON.parse(cached);
        if (Array.isArray(queue)) {
          this.pendingSyncQueue.set(queue);
        }
      } catch (e) {
        console.error('Failed to parse offline sync queue:', e);
      }
    }
  }

  private saveQueueToStorage() {
    localStorage.setItem('bilo_sync_queue', JSON.stringify(this.pendingSyncQueue()));
  }

  enqueue(opType: PendingSyncOp['type'], payload: any) {
    const op: PendingSyncOp = {
      id: crypto.randomUUID(),
      type: opType,
      payload,
      timestamp: new Date().toISOString()
    };

    this.pendingSyncQueue.update(q => [...q, op]);
    this.saveQueueToStorage();

    if (this.isOnline()) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.syncing() || !this.isOnline()) return;

    const queue = [...this.pendingSyncQueue()];
    if (queue.length === 0) return;

    this.syncing.set(true);

    const remainingOps: PendingSyncOp[] = [];

    for (const op of queue) {
      try {
        const success = await this.executeOp(op);
        if (!success) {
          remainingOps.push(op);
        }
      } catch (e) {
        console.warn(`[Bilo Sync] Operation ${op.type} failed, retaining in queue:`, e);
        remainingOps.push(op);
      }
    }

    this.pendingSyncQueue.set(remainingOps);
    this.saveQueueToStorage();
    this.syncing.set(false);
  }

  private async executeOp(op: PendingSyncOp): Promise<boolean> {
    const sb = this.supabaseService.supabase;
    const { type, payload } = op;

    switch (type) {
      case 'CREATE_TASK': {
        const { error } = await sb.from('tasks').upsert([payload]);
        return !error;
      }
      case 'UPDATE_TASK': {
        const { id, ...updates } = payload;
        const { error } = await sb.from('tasks').update(updates).eq('id', id);
        return !error;
      }
      case 'DELETE_TASK': {
        const { error } = await sb.from('tasks').delete().eq('id', payload.id);
        return !error;
      }
      case 'CREATE_PROJECT': {
        const { error } = await sb.from('projects').upsert([payload]);
        return !error;
      }
      case 'UPDATE_PROJECT': {
        const { id, ...updates } = payload;
        const { error } = await sb.from('projects').update(updates).eq('id', id);
        return !error;
      }
      case 'DELETE_PROJECT': {
        const { error } = await sb.from('projects').delete().eq('id', payload.id);
        return !error;
      }
      case 'ADD_COMMENT': {
        const { error } = await sb.from('task_comments').upsert([payload]);
        return !error;
      }
      case 'UPDATE_COMMENT': {
        const { id, content, updated_at } = payload;
        const { error } = await sb.from('task_comments').update({ content, updated_at }).eq('id', id);
        return !error;
      }
      case 'DELETE_COMMENT': {
        const { error } = await sb.from('task_comments').delete().eq('id', payload.id);
        return !error;
      }
      default:
        return true;
    }
  }
}
