import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { Task, Project } from '../../core/models/project.model';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="archive-workspace">
      <!-- Header -->
      <div class="view-header-strip paper-panel">
        <div class="view-header-left">
          <span class="badge-mono">06 ARCHIVE</span>
          <h2 class="view-header-title">Completed Work & Audit</h2>
        </div>

        <div class="view-header-right font-mono">
          <button class="btn btn-primary btn-sm" (click)="exportData()">
            <i class="fi fi-rr-file-excel"></i> Export
          </button>
        </div>
      </div>

      @if (taskService.loading()) {
        <div class="archive-grid font-mono">
          <div class="paper-panel archive-box">
            <div class="box-body" style="padding: 1rem;">
              @for (i of [1, 2, 3]; track i) {
                <div class="skeleton-card" style="margin-bottom: 0.5rem;">
                  <div class="skeleton-line" style="width: 70%;"></div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else {
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
    }
    </div>
  `,
  styles: [`
    .archive-workspace {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
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
    const wb = XLSX.utils.book_new();

    // 1. Sheet: Completed Tasks
    const completedRows = this.completedTasks().map(t => ({
      'Task ID': `TASK-${t.id.slice(0, 4).toUpperCase()}`,
      'Title / Summary': t.title,
      'Issue Type': (t.type || 'task').toUpperCase(),
      'Priority': (t.priority || 'medium').toUpperCase(),
      'Status': 'COMPLETED',
      'Project Name': this.getProjectName(t.project_id),
      'Assignee': t.assignee || 'Unassigned',
      'Due Date': t.due_date || 'N/A',
      'Created Date': t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'
    }));
    const completedWs = XLSX.utils.json_to_sheet(completedRows);
    XLSX.utils.book_append_sheet(wb, completedWs, 'Completed Tasks');

    // 2. Sheet: All Workspace Tasks
    const allTaskRows = this.taskService.tasks().map(t => ({
      'Task ID': `TASK-${t.id.slice(0, 4).toUpperCase()}`,
      'Title / Summary': t.title,
      'Issue Type': (t.type || 'task').toUpperCase(),
      'Priority': (t.priority || 'medium').toUpperCase(),
      'Status': t.status.toUpperCase(),
      'Completed': t.completed ? 'YES' : 'NO',
      'Project Name': this.getProjectName(t.project_id),
      'Assignee': t.assignee || 'Unassigned',
      'Due Date': t.due_date || 'N/A',
      'Created Date': t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'
    }));
    const allTasksWs = XLSX.utils.json_to_sheet(allTaskRows);
    XLSX.utils.book_append_sheet(wb, allTasksWs, 'All Tasks');

    // 3. Sheet: Projects Summary
    const projectRows = this.projectService.projects().map(p => {
      const pTasks = this.taskService.tasks().filter(t => t.project_id === p.id);
      const pDone = pTasks.filter(t => t.completed || t.status.toLowerCase() === 'done').length;
      const progress = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;
      return {
        'Project Key': `PROJ-${p.id.slice(0, 4).toUpperCase()}`,
        'Project Name': p.name,
        'Description': p.description || '',
        'Status': p.status.toUpperCase(),
        'Total Tasks': pTasks.length,
        'Completed Tasks': pDone,
        'Progress (%)': `${progress}%`
      };
    });
    const projectsWs = XLSX.utils.json_to_sheet(projectRows);
    XLSX.utils.book_append_sheet(wb, projectsWs, 'Projects Summary');

    // 4. Sheet: Activity Log Stream
    const activityRows = this.activities().map(act => ({
      'Action': act.action,
      'Description': act.description,
      'Timestamp': this.formatDate(act.timestamp)
    }));
    const activitiesWs = XLSX.utils.json_to_sheet(activityRows);
    XLSX.utils.book_append_sheet(wb, activitiesWs, 'Activity Stream');

    // Generate & download .xlsx file
    const filename = `devflow-workspace-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  getProjectName(id: string): string {
    if (!id) return 'General';
    const p = this.projectService.projects().find(item => item.id === id);
    return p ? p.name : 'General';
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
