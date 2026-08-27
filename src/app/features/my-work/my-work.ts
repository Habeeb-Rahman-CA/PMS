import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { Task, Project } from '../../core/models/project.model';
import { TaskModalComponent } from '../../shared/components/task-modal';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal';

@Component({
  selector: 'app-my-work',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TaskModalComponent,
    TaskDetailModalComponent
  ],
  template: `
    <div class="my-work-container">
      <!-- Header Banner -->
      <div class="my-work-header glass-panel">
        <div class="header-main">
          <div class="header-title">
            <h2>My Work</h2>
          </div>

          <div class="header-actions">
            <!-- Project Filter Dropdown -->
            <select
              class="form-select project-filter-select"
              [ngModel]="selectedProjectId()"
              (ngModelChange)="selectedProjectId.set($event)"
            >
              <option value="all">All Projects</option>
              @for (p of projectService.projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>

            <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
              <i class="fi fi-rr-plus"></i> Quick Create Task
            </button>
          </div>
        </div>

        <!-- Global Summary Stats Bar -->
        <div class="summary-stats-bar">
          <div class="stat-pill">
            <i class="fi fi-rr-target text-cyan"></i>
            <span class="num">{{ todayWork().length }}</span>
            <span class="lbl">Today's Focus</span>
          </div>
          <div class="stat-pill">
            <i class="fi fi-rr-spinner text-amber"></i>
            <span class="num">{{ inProgressTasks().length }}</span>
            <span class="lbl">In Progress</span>
          </div>
          <div class="stat-pill">
            <i class="fi fi-rr-flame text-rose"></i>
            <span class="num">{{ highPriorityTasks().length }}</span>
            <span class="lbl">High Priority</span>
          </div>
          <div class="stat-pill">
            <i class="fi fi-rr-clock text-amber"></i>
            <span class="num">{{ overdueAndUpcomingTasks().length }}</span>
            <span class="lbl">Due / Overdue</span>
          </div>
          <div class="stat-pill">
            <i class="fi fi-rr-check-circle text-emerald"></i>
            <span class="num">{{ recentlyCompletedWork().length }}</span>
            <span class="lbl">Completed</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation Filters -->
      <div class="work-tabs-bar glass-panel">
        <div class="tabs-list">
          @for (tab of tabs; track tab.id) {
            <button
              class="tab-btn"
              [class.active]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >
              <i [class]="tab.icon"></i>
              <span>{{ tab.label }}</span>
              <span class="tab-badge" [class]="tab.badgeClass">{{ getTabCount(tab.id) }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Section Content Area -->
      <div class="sections-grid">
        <!-- TAB 1: TODAY / CURRENT WORK -->
        @if (activeTab() === 'all' || activeTab() === 'today') {
          <div class="work-section glass-panel">
            <div class="section-header">
              <div class="section-title">
                <i class="fi fi-rr-target text-cyan"></i>
                <h3>Today / Current Work</h3>
                <span class="cnt-badge text-cyan">{{ todayWork().length }}</span>
              </div>
            </div>

            <div class="section-body">
              @if (todayWork().length === 0) {
                <div class="empty-section">
                  <i class="fi fi-rr-smile text-cyan"></i>
                  <p>No tasks specifically due today or flagged as current focus.</p>
                </div>
              } @else {
                <div class="tasks-list">
                  @for (t of todayWork(); track t.id) {
                    <ng-container *ngTemplateOutlet="taskCardTpl; context: { $implicit: t }"></ng-container>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 2: IN-PROGRESS TASKS -->
        @if (activeTab() === 'all' || activeTab() === 'in_progress') {
          <div class="work-section glass-panel">
            <div class="section-header">
              <div class="section-title">
                <i class="fi fi-rr-spinner text-amber"></i>
                <h3>In-Progress Tasks</h3>
                <span class="cnt-badge text-amber">{{ inProgressTasks().length }}</span>
              </div>
            </div>

            <div class="section-body">
              @if (inProgressTasks().length === 0) {
                <div class="empty-section">
                  <i class="fi fi-rr-inbox text-subtle"></i>
                  <p>No tasks currently marked as In Progress.</p>
                </div>
              } @else {
                <div class="tasks-list">
                  @for (t of inProgressTasks(); track t.id) {
                    <ng-container *ngTemplateOutlet="taskCardTpl; context: { $implicit: t }"></ng-container>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 3: HIGH-PRIORITY TASKS -->
        @if (activeTab() === 'all' || activeTab() === 'high_priority') {
          <div class="work-section glass-panel">
            <div class="section-header">
              <div class="section-title">
                <i class="fi fi-rr-flame text-rose"></i>
                <h3>High-Priority Tasks</h3>
                <span class="cnt-badge text-rose">{{ highPriorityTasks().length }}</span>
              </div>
            </div>

            <div class="section-body">
              @if (highPriorityTasks().length === 0) {
                <div class="empty-section">
                  <i class="fi fi-rr-check-circle text-emerald"></i>
                  <p>No urgent or high priority tasks pending.</p>
                </div>
              } @else {
                <div class="tasks-list">
                  @for (t of highPriorityTasks(); track t.id) {
                    <ng-container *ngTemplateOutlet="taskCardTpl; context: { $implicit: t }"></ng-container>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 4: OVERDUE & UPCOMING TASKS -->
        @if (activeTab() === 'all' || activeTab() === 'upcoming') {
          <div class="work-section glass-panel">
            <div class="section-header">
              <div class="section-title">
                <i class="fi fi-rr-clock text-amber"></i>
                <h3>Overdue & Upcoming Tasks</h3>
                <span class="cnt-badge text-amber">{{ overdueAndUpcomingTasks().length }}</span>
              </div>
            </div>

            <div class="section-body">
              @if (overdueAndUpcomingTasks().length === 0) {
                <div class="empty-section">
                  <i class="fi fi-rr-calendar-check text-cyan"></i>
                  <p>No overdue or upcoming tasks scheduled.</p>
                </div>
              } @else {
                <div class="tasks-list">
                  @for (t of overdueAndUpcomingTasks(); track t.id) {
                    <ng-container *ngTemplateOutlet="taskCardTpl; context: { $implicit: t }"></ng-container>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- TAB 5: RECENTLY COMPLETED WORK -->
        @if (activeTab() === 'all' || activeTab() === 'completed') {
          <div class="work-section glass-panel">
            <div class="section-header">
              <div class="section-title">
                <i class="fi fi-rr-check-circle text-emerald"></i>
                <h3>Recently Completed Work</h3>
                <span class="cnt-badge text-emerald">{{ recentlyCompletedWork().length }}</span>
              </div>
            </div>

            <div class="section-body">
              @if (recentlyCompletedWork().length === 0) {
                <div class="empty-section">
                  <i class="fi fi-rr-list text-subtle"></i>
                  <p>No completed work recorded yet.</p>
                </div>
              } @else {
                <div class="tasks-list">
                  @for (t of recentlyCompletedWork(); track t.id) {
                    <ng-container *ngTemplateOutlet="taskCardTpl; context: { $implicit: t }"></ng-container>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Reusable Task Card Template -->
      <ng-template #taskCardTpl let-t>
        <div class="task-card-item glass-panel" (click)="openDetailModal(t)">
          <div class="card-item-left">
            <button
              class="check-btn"
              [class.checked]="t.completed || t.status === 'Done'"
              (click)="$event.stopPropagation(); toggleTaskCompletion(t)"
              [title]="t.completed ? 'Mark incomplete' : 'Mark complete'"
            >
              <i [class]="t.completed || t.status === 'Done' ? 'fi fi-rr-check' : 'fi fi-rr-circle'"></i>
            </button>

            <div class="task-details">
              <div class="task-top-meta">
                <span class="badge" [class]="'badge-' + t.type">
                  <i [class]="getTypeIcon(t.type)"></i> {{ t.type }}
                </span>
                <span class="badge" [class]="'badge-' + t.priority">
                  {{ t.priority }}
                </span>
                @if (getProject(t.project_id); as proj) {
                  <span class="project-tag">
                    <span class="dot" [style.background-color]="proj.color"></span>
                    {{ proj.name }}
                  </span>
                }
              </div>

              <h4 class="task-title" [class.line-through]="t.completed">{{ t.title }}</h4>

              @if (t.labels && t.labels.length > 0) {
                <div class="task-labels font-mono">
                  @for (lbl of t.labels; track lbl) {
                    <span class="chip">#{{ lbl }}</span>
                  }
                </div>
              }
            </div>
          </div>

          <div class="card-item-right">
            <span class="status-pill">{{ t.status }}</span>

            @if (t.due_date) {
              <span class="due-pill" [class.overdue-pill]="isOverdue(t.due_date) && !t.completed">
                <i class="fi fi-rr-calendar"></i> {{ t.due_date }}
              </span>
            }

            <i class="fi fi-rr-angle-small-right arrow-icon"></i>
          </div>
        </div>
      </ng-template>

      <!-- Modals -->
      @if (showCreateModal()) {
        <app-task-modal
          [defaultProjectId]="selectedProjectId() === 'all' ? (projectService.projects()[0]?.id || '') : selectedProjectId()"
          (close)="closeCreateModal()"
        ></app-task-modal>
      }

      @if (activeDetailTask(); as detailTask) {
        <app-task-detail-modal
          [task]="detailTask"
          (close)="closeDetailModal()"
        ></app-task-detail-modal>
      }
    </div>
  `,
  styles: [`
    .my-work-container {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.25rem;
      max-width: 1500px;
      margin: 0 auto;
    }
    .my-work-header {
      padding: 1.1rem 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-title h2 {
      font-size: 1.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.85rem;
      margin-top: 0.15rem;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .project-filter-select {
      width: 210px;
      padding: 0.35rem 0.65rem;
      font-size: 0.825rem;
    }
    .text-cyan { color: var(--accent-cyan); }
    .text-amber { color: var(--accent-amber); }
    .text-rose { color: var(--accent-rose); }
    .text-emerald { color: var(--accent-emerald); }
    .text-subtle { color: var(--text-subtle); }

    .summary-stats-bar {
      display: flex;
      gap: 0.75rem;
      padding-top: 0.85rem;
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
    }
    .stat-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    .stat-pill .num {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-main);
    }
    .stat-pill .lbl {
      color: var(--text-muted);
    }

    /* Tab Filter Bar */
    .work-tabs-bar {
      padding: 0.5rem 0.85rem;
    }
    .tabs-list {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
    }
    .tab-btn:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }
    .tab-btn.active {
      background: var(--bg-surface-active);
      color: var(--accent-cyan);
      border-color: rgba(6, 182, 212, 0.3);
    }
    .tab-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.05rem 0.45rem;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
    }
    .badge-cyan { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
    .badge-rose { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); }
    .badge-emerald { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }

    /* Sections Layout */
    .sections-grid {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .work-section {
      padding: 1.1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-title h3 {
      font-size: 1rem;
      font-weight: 600;
    }
    .cnt-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.1rem 0.5rem;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.08);
    }

    .empty-section {
      padding: 1.5rem 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      color: var(--text-muted);
      font-size: 0.825rem;
    }
    .empty-section i { font-size: 1.5rem; }

    /* Task Card Item List */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .task-card-item {
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      background: var(--bg-surface);
      transition: var(--transition);
    }
    .task-card-item:hover {
      border-color: var(--border-active);
      transform: translateX(4px);
    }
    .card-item-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }
    .check-btn {
      background: transparent;
      border: none;
      color: var(--text-subtle);
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: var(--transition);
    }
    .check-btn:hover {
      color: var(--accent-emerald);
    }
    .check-btn.checked {
      color: var(--accent-emerald);
    }
    .task-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .task-top-meta {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }
    .project-tag {
      font-size: 0.725rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .project-tag .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .task-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-main);
    }
    .task-title.line-through {
      text-decoration: line-through;
      color: var(--text-subtle);
    }
    .task-labels {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .task-labels .chip {
      font-size: 0.675rem;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.1);
      padding: 0.05rem 0.4rem;
      border-radius: var(--radius-sm);
    }
    .card-item-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .status-pill {
      font-size: 0.725rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
    }
    .due-pill {
      font-size: 0.725rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .due-pill.overdue-pill {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      font-weight: 600;
    }
    .arrow-icon {
      color: var(--text-subtle);
      font-size: 0.9rem;
    }
  `]
})
export class MyWorkComponent {
  selectedProjectId = signal<string>('all');
  activeTab = signal<string>('all');

  showCreateModal = signal<boolean>(false);
  activeDetailTask = signal<Task | null>(null);

  tabs = [
    { id: 'all', label: 'All My Work', icon: 'fi fi-rr-layers', badgeClass: 'badge-cyan' },
    { id: 'today', label: "Today's Work", icon: 'fi fi-rr-target', badgeClass: 'badge-cyan' },
    { id: 'in_progress', label: 'In Progress', icon: 'fi fi-rr-spinner', badgeClass: 'badge-amber' },
    { id: 'high_priority', label: 'High Priority', icon: 'fi fi-rr-flame', badgeClass: 'badge-rose' },
    { id: 'upcoming', label: 'Overdue & Upcoming', icon: 'fi fi-rr-clock', badgeClass: 'badge-amber' },
    { id: 'completed', label: 'Recently Completed', icon: 'fi fi-rr-check-circle', badgeClass: 'badge-emerald' }
  ];

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public workflowService: WorkflowService
  ) {}

  filteredGlobalTasks = computed(() => {
    const list = this.taskService.tasks();
    const projId = this.selectedProjectId();
    if (projId === 'all') return list;
    return list.filter(t => t.project_id === projId);
  });

  // 1. Today / Current Work
  todayWork = computed(() => {
    const list = this.filteredGlobalTasks();
    const todayStr = new Date().toISOString().split('T')[0];
    return list.filter(t =>
      !t.completed &&
      t.status.toLowerCase() !== 'done' &&
      (t.is_next || t.due_date === todayStr)
    );
  });

  // 2. In-Progress Tasks
  inProgressTasks = computed(() => {
    const list = this.filteredGlobalTasks();
    return list.filter(t =>
      !t.completed &&
      (t.status.toLowerCase() === 'in progress' || t.status.toLowerCase().includes('progress'))
    );
  });

  // 3. High Priority Tasks
  highPriorityTasks = computed(() => {
    const list = this.filteredGlobalTasks();
    return list.filter(t =>
      !t.completed &&
      t.status.toLowerCase() !== 'done' &&
      (t.priority === 'urgent' || t.priority === 'high')
    );
  });

  // 4. Overdue and Upcoming Tasks
  overdueAndUpcomingTasks = computed(() => {
    const list = this.filteredGlobalTasks();
    const todayStr = new Date().toISOString().split('T')[0];
    return list
      .filter(t => !t.completed && t.status.toLowerCase() !== 'done' && t.due_date)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  });

  // 5. Recently Completed Work
  recentlyCompletedWork = computed(() => {
    const list = this.filteredGlobalTasks();
    return list
      .filter(t => t.completed || t.status.toLowerCase() === 'done')
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  });

  getTabCount(tabId: string): number {
    switch (tabId) {
      case 'today': return this.todayWork().length;
      case 'in_progress': return this.inProgressTasks().length;
      case 'high_priority': return this.highPriorityTasks().length;
      case 'upcoming': return this.overdueAndUpcomingTasks().length;
      case 'completed': return this.recentlyCompletedWork().length;
      default: return this.filteredGlobalTasks().length;
    }
  }

  getProject(projectId: string): Project | null {
    return this.projectService.projects().find(p => p.id === projectId) || null;
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'story': return 'fi fi-rr-book-alt';
      case 'bug': return 'fi fi-rr-bug';
      case 'epic': return 'fi fi-rr-rocket-takeoff';
      default: return 'fi fi-rr-checkbox';
    }
  }

  isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dueDate < todayStr;
  }

  async toggleTaskCompletion(task: Task) {
    const isNowCompleted = !(task.completed || task.status === 'Done');
    const newStatus = isNowCompleted ? 'Done' : 'To Do';

    await this.taskService.updateTask(task.id, {
      completed: isNowCompleted,
      status: newStatus
    });
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
  }

  openDetailModal(task: Task) {
    this.activeDetailTask.set(task);
  }

  closeDetailModal() {
    this.activeDetailTask.set(null);
  }
}
