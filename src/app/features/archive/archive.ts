import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { Task } from '../../core/models/project.model';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="archive-workspace">
      <!-- Header -->
      <div class="archive-header paper-panel">
        <div class="header-left">
          <span class="badge-mono">06 ARCHIVE</span>
          <h2>Completed Work & Historical Audit</h2>
        </div>

        <div class="header-right font-mono">
          <button class="btn btn-secondary btn-sm" (click)="exportData()">
            <i class="fi fi-rr-download"></i> Export JSON Backup
          </button>
        </div>
      </div>

      <div class="archive-grid">
        <!-- Completed Tasks Section -->
        <div class="paper-panel archive-box">
          <div class="box-header">
            <h3><i class="fi fi-rr-check-circle text-emerald"></i> Completed Tasks History</h3>
            <span class="badge-mono font-mono">{{ completedTasks().length }} Items</span>
          </div>

          <div class="box-body">
            @if (completedTasks().length === 0) {
              <div class="empty-archive font-mono">
                <i class="fi fi-rr-box-alt text-muted"></i>
                <span>No completed tasks in archive yet.</span>
              </div>
            } @else {
              <div class="archive-list">
                @for (t of completedTasks(); track t.id) {
                  <div class="archive-item-row">
                    <div class="row-left">
                      <span class="status-dot dot-emerald"></span>
                      <span class="task-title">{{ t.title }}</span>
                      <span class="badge-mono">{{ t.type }}</span>
                    </div>

                    <div class="row-right font-mono">
                      <span class="text-subtle">ID: {{ t.id.slice(0, 8) }}</span>
                      <span class="text-muted">Completed</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- Activity Audit Log -->
        <div class="paper-panel archive-box">
          <div class="box-header">
            <h3><i class="fi fi-rr-time-past text-cyan"></i> Workspace Activity Stream</h3>
            <span class="badge-mono font-mono">{{ activities().length }} Entries</span>
          </div>

          <div class="box-body">
            <div class="activity-timeline font-mono">
              @for (act of activities(); track act.id) {
                <div class="act-row">
                  <span class="act-dot"></span>
                  <div class="act-details">
                    <span class="act-action">{{ act.action }}: {{ act.description }}</span>
                    <span class="act-date">{{ formatDate(act.timestamp) }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .archive-workspace {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }
    .archive-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.1rem;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .header-left h2 {
      font-size: 1.15rem;
    }

    .archive-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 900px) {
      .archive-grid { grid-template-columns: 1fr; }
    }

    .archive-box {
      padding: 0.85rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .box-header h3 {
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .empty-archive {
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }

    .archive-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .archive-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.45rem 0.65rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
    }
    .row-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .task-title {
      font-size: 0.825rem;
      color: var(--text-main);
      text-decoration: line-through;
    }
    .row-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.725rem;
    }

    .activity-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .act-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      font-size: 0.775rem;
    }
    .act-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted);
      margin-top: 5px;
      flex-shrink: 0;
    }
    .act-details {
      display: flex;
      flex-direction: column;
    }
    .act-action {
      color: var(--text-main);
    }
    .act-date {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
  `]
})
export class ArchiveComponent {
  constructor(
    public taskService: TaskService,
    public projectService: ProjectService
  ) {}

  completedTasks = computed(() =>
    this.taskService.tasks().filter(t => t.completed || t.status.toLowerCase() === 'done')
  );

  activities = computed(() => this.projectService.activities());

  exportData() {
    const data = {
      projects: this.projectService.projects(),
      tasks: this.taskService.tasks(),
      activities: this.projectService.activities(),
      exportedAt: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devflow-workspace-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
