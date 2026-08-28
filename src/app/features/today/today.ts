import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Task } from '../../core/models/project.model';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal';
import { TaskModalComponent } from '../../shared/components/task-modal';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskDetailModalComponent, TaskModalComponent],
  template: `
    <div class="today-workspace">
      <!-- Top Banner Strip -->
      <div class="today-banner paper-panel">
        <div class="banner-left">
          <span class="badge-mono">01 TODAY</span>
          <h2>Focus Dashboard</h2>
          <span class="banner-date font-mono">{{ todayDateFormatted() }}</span>
        </div>

        <div class="banner-right">
          <div class="streak-pill badge-mono font-mono">
            <i class="fi fi-rr-flame text-amber"></i> STREAK: {{ streakDays }} DAYS
          </div>
          <button class="btn btn-primary btn-sm" (click)="showNewTaskModal.set(true)">
            <i class="fi fi-rr-plus"></i> New Task <span class="key-badge">N</span>
          </button>
        </div>
      </div>

      <!-- Quick Add Task Input Bar -->
      <div class="quick-add-bar paper-panel">
        <i class="fi fi-rr-check-circle text-muted"></i>
        <input
          type="text"
          class="quick-input font-mono"
          placeholder="Quick add a task for Today (press Enter)..."
          [(ngModel)]="quickTaskTitle"
          (keydown.enter)="quickAddTask()"
        />
        <button class="btn btn-secondary btn-xs" (click)="quickAddTask()" [disabled]="!quickTaskTitle().trim()">
          Add Task
        </button>
      </div>

      <!-- 2-Column Focus Grid -->
      <div class="today-grid">
        <!-- Main Column: Today's Action Items -->
        <div class="grid-main">
          <div class="paper-panel section-box">
            <div class="box-header">
              <h3>
                <span class="status-dot dot-emerald"></span> Today's Action Items
              </h3>
              <span class="badge-mono font-mono">{{ todayTasks().length }} Items</span>
            </div>

            <div class="box-body">
              @if (todayTasks().length === 0) {
                <div class="empty-state font-mono">
                  <i class="fi fi-rr-sun text-amber"></i>
                  <span>No action items due today. All caught up!</span>
                </div>
              } @else {
                <div class="task-list">
                  @for (t of todayTasks(); track t.id) {
                    <div class="task-item-row" (click)="openDetail(t)">
                      <div class="row-left">
                        <button class="btn-check" (click)="toggleTaskComplete($event, t)" [title]="t.completed ? 'Mark incomplete' : 'Mark complete'">
                          <i [class]="t.completed ? 'fi fi-rr-check-square text-emerald' : 'fi fi-rr-square text-muted'"></i>
                        </button>

                        <span class="task-title" [class.completed]="t.completed">{{ t.title }}</span>

                        <span class="badge-mono" [class.badge-urgent]="t.priority === 'urgent'" [class.badge-high]="t.priority === 'high'">
                          {{ t.priority }}
                        </span>

                        <span class="badge-type" [class]="t.type">{{ t.type }}</span>
                      </div>

                      <div class="row-right font-mono">
                        <span class="status-tag">
                          <span class="status-dot" [class]="getDotClass(t.status)"></span> {{ t.status }}
                        </span>
                        @if (t.due_date) {
                          <span class="due-tag">{{ t.due_date }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Urgent Priority & Overdue Items -->
          <div class="paper-panel section-box">
            <div class="box-header">
              <h3>
                <span class="status-dot dot-rose"></span> Urgent Priority & Overdue Attention
              </h3>
              <span class="badge-mono font-mono">{{ urgentOrOverdue().length }} Items</span>
            </div>

            <div class="box-body">
              @if (urgentOrOverdue().length === 0) {
                <div class="empty-state font-mono">
                  <i class="fi fi-rr-check-circle text-emerald"></i>
                  <span>No urgent or overdue tasks remaining.</span>
                </div>
              } @else {
                <div class="task-list">
                  @for (t of urgentOrOverdue(); track t.id) {
                    <div class="task-item-row urgent-row" (click)="openDetail(t)">
                      <div class="row-left">
                        <span class="status-dot dot-rose"></span>
                        <span class="task-title">{{ t.title }}</span>
                        <span class="badge-mono badge-urgent">{{ t.priority }}</span>
                      </div>
                      <div class="row-right font-mono">
                        <span class="status-tag">{{ t.status }}</span>
                        <span class="due-tag text-rose">{{ t.due_date || 'No Date' }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Sidebar Column: Summary Statistics & Quick Nav -->
        <div class="grid-side">
          <!-- Daily Progress Widget -->
          <div class="paper-panel side-box">
            <div class="box-header">
              <span class="form-label">DAILY COMPLETION</span>
              <span class="font-mono">{{ completionRate() }}%</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" [style.width]="completionRate() + '%'"></div>
            </div>
            <div class="stat-sub font-mono">
              Completed {{ completedTodayCount() }} of {{ totalCount() }} total tasks
            </div>
          </div>

          <!-- Active Workspace Quick Switcher -->
          <div class="paper-panel side-box">
            <div class="box-header">
              <span class="form-label">WORKSPACES JUMP</span>
            </div>
            <div class="quick-ws-list">
              @for (ws of workspaceService.workspaces; track ws.id) {
                <div class="quick-ws-item" (click)="workspaceService.setWorkspace(ws.id)">
                  <div class="ws-item-left font-mono">
                    <span class="ws-code">{{ ws.code }}</span>
                    <span>{{ ws.name }}</span>
                  </div>
                  <span class="key-badge">{{ ws.key }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Modals -->
      @if (showNewTaskModal()) {
        <app-task-modal
          (close)="showNewTaskModal.set(false)"
        ></app-task-modal>
      }

      @if (activeDetailTask(); as dt) {
        <app-task-detail-modal
          [task]="dt"
          (close)="activeDetailTask.set(null)"
        ></app-task-detail-modal>
      }
    </div>
  `,
  styles: [`
    .today-workspace {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }
    .today-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.1rem;
      background: var(--bg-surface);
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .banner-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .banner-left h2 {
      font-size: 1.15rem;
    }
    .banner-date {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .banner-right {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .quick-add-bar {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem 0.85rem;
      background: var(--bg-surface-subtle);
    }
    .quick-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 0.85rem;
      color: var(--text-main);
      outline: none;
    }

    .today-grid {
      display: grid;
      grid-template-columns: 1fr 280px;
      gap: 1rem;
    }
    @media (max-width: 900px) {
      .today-grid { grid-template-columns: 1fr; }
    }
    .grid-main, .grid-side {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-box, .side-box {
      padding: 0.85rem 1rem;
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
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .empty-state {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
    }

    .task-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .task-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.45rem 0.65rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: var(--transition-fast);
    }
    .task-item-row:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-medium);
    }
    .task-item-row.urgent-row {
      border-left: 3px solid var(--accent-rose);
    }

    .row-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }
    .btn-check {
      background: transparent;
      border: none;
      font-size: 0.95rem;
      cursor: pointer;
      padding: 0.1rem;
      display: flex;
    }
    .task-title {
      font-size: 0.825rem;
      font-weight: 500;
      color: var(--text-main);
    }
    .task-title.completed {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .row-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.725rem;
    }
    .status-tag {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .due-tag {
      color: var(--text-muted);
    }

    .progress-bar-track {
      width: 100%;
      height: 6px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--accent-emerald);
      transition: width 0.3s ease;
    }
    .stat-sub {
      font-size: 0.725rem;
      color: var(--text-muted);
    }

    .quick-ws-list {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .quick-ws-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.6rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      cursor: pointer;
      font-size: 0.775rem;
    }
    .quick-ws-item:hover {
      background: var(--bg-surface-hover);
    }
    .ws-item-left {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .ws-code {
      font-weight: 700;
      color: var(--text-muted);
    }
  `]
})
export class TodayComponent {
  quickTaskTitle = signal<string>('');
  streakDays = 5;
  showNewTaskModal = signal<boolean>(false);
  activeDetailTask = signal<Task | null>(null);

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public workspaceService: WorkspaceService
  ) {}

  todayDateFormatted = computed(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  });

  todayTasks = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.taskService.tasks().filter(t => t.due_date === todayStr || (!t.completed && t.status !== 'done'));
  });

  urgentOrOverdue = computed(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return this.taskService.tasks().filter(t =>
      !t.completed &&
      t.status.toLowerCase() !== 'done' &&
      (t.priority === 'urgent' || (t.due_date && t.due_date < todayStr))
    );
  });

  totalCount = computed(() => this.taskService.tasks().length);
  completedTodayCount = computed(() => this.taskService.tasks().filter(t => t.completed || t.status.toLowerCase() === 'done').length);
  completionRate = computed(() => {
    const tot = this.totalCount();
    if (tot === 0) return 0;
    return Math.round((this.completedTodayCount() / tot) * 100);
  });

  async quickAddTask() {
    const title = this.quickTaskTitle().trim();
    if (!title) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultProj = this.projectService.projects()[0]?.id || '';
    await this.taskService.createTask({
      title,
      project_id: defaultProj,
      due_date: todayStr,
      status: 'todo',
      priority: 'medium',
      type: 'task'
    });
    this.quickTaskTitle.set('');
  }

  toggleTaskComplete(e: MouseEvent, t: Task) {
    e.stopPropagation();
    const nextStatus = t.completed ? 'todo' : 'done';
    this.taskService.updateTask(t.id, { completed: !t.completed, status: nextStatus });
  }

  openDetail(t: Task) {
    this.activeDetailTask.set(t);
  }

  getDotClass(status: string): string {
    const s = status.toLowerCase();
    if (s.includes('done') || s.includes('complete')) return 'dot-emerald';
    if (s.includes('prog') || s.includes('review')) return 'dot-cyan';
    if (s.includes('urg')) return 'dot-rose';
    return 'dot-neutral';
  }
}
