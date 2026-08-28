import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Project, Task, Workflow } from '../../core/models/project.model';
import { TaskModalComponent } from '../../shared/components/task-modal';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    TaskModalComponent,
    TaskDetailModalComponent
  ],
  template: `
    <div class="tasks-page-container">
      <!-- 1. Standalone Top Header Bar -->
      <div class="view-header-strip paper-panel">
        <div class="view-header-left">
          <span class="badge-mono">04 BOARD</span>
          <h2 class="view-header-title">Kanban Board</h2>
        </div>

        <div class="view-header-right">
          <button
            class="btn btn-primary btn-sm"
            [disabled]="activeColumns().length === 0"
            (click)="workspaceService.openCreateTaskModal()"
          >
            <i class="fi fi-rr-plus"></i> New Task <span class="key-badge">N</span>
          </button>
        </div>
      </div>

      <!-- 2. Standalone Filter Toolbar -->
      <div class="filter-bar paper-panel font-mono">
        <div class="filters-left">
          <!-- Project Filter -->
          <div class="filter-group">
            <label class="filter-label">PROJECT</label>
            <select
              class="form-select filter-select"
              [ngModel]="selectedProjectId()"
              (ngModelChange)="onProjectChange($event)"
            >
              <option value="all">All Projects</option>
              @for (p of projectService.projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>

          <!-- Issue Type Filter -->
          <div class="filter-group">
            <label class="filter-label">TYPE</label>
            <select
              class="form-select filter-select"
              [ngModel]="selectedType()"
              (ngModelChange)="selectedType.set($event)"
            >
              <option value="all">All Types</option>
              <option value="story">Story</option>
              <option value="bug">Bug</option>
              <option value="task">Task</option>
              <option value="epic">Epic</option>
            </select>
          </div>

          <!-- Priority Filter -->
          <div class="filter-group">
            <label class="filter-label">PRIORITY</label>
            <select
              class="form-select filter-select"
              [ngModel]="selectedPriority()"
              (ngModelChange)="selectedPriority.set($event)"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <!-- Label Filter -->
          <div class="filter-group">
            <label class="filter-label">LABEL</label>
            <select
              class="form-select filter-select"
              [ngModel]="selectedLabel()"
              (ngModelChange)="selectedLabel.set($event)"
            >
              <option value="all">All Labels</option>
              @for (lbl of availableLabels(); track lbl) {
                <option [value]="lbl">#{{ lbl }}</option>
              }
            </select>
          </div>

          <!-- Due Date Filter -->
          <div class="filter-group">
            <label class="filter-label">DUE DATE</label>
            <select
              class="form-select filter-select"
              [ngModel]="selectedDueDateFilter()"
              (ngModelChange)="selectedDueDateFilter.set($event)"
            >
              <option value="all">All Dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
              <option value="has_date">Has Due Date</option>
              <option value="no_date">No Due Date</option>
            </select>
          </div>

          @if (hasActiveFilters()) {
            <div class="filter-group reset-group">
              <label class="filter-label">&nbsp;</label>
              <button class="btn btn-ghost btn-xs reset-btn" (click)="resetFilters()">
                <i class="fi fi-rr-refresh"></i> Clear Filters
              </button>
            </div>
          }
        </div>

        <!-- Search Box -->
        <div class="search-box">
          <i class="fi fi-rr-search search-icon"></i>
          <input
            type="text"
            class="form-input search-input"
            placeholder="Search title, description..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
      </div>

      <!-- Kanban Board -->
      @if (activeColumns().length === 0) {
        <div class="empty-board paper-panel font-mono">
          <i class="fi fi-rr-folder-open empty-board-icon"></i>
          <h3>No Status Workflow Configured</h3>
          <p>Configure status columns for this project in the <strong>02 PROJECTS</strong> workspace.</p>
          <button class="btn btn-secondary btn-sm" (click)="workspaceService.setWorkspace('02 PROJECTS')">
            <i class="fi fi-rr-folder"></i> Go to Projects
          </button>
        </div>
      } @else {
        <div class="kanban-board" cdkDropListGroup>
          @for (col of activeColumns(); track col.id) {
            <div class="kanban-column paper-panel">
              <!-- Column Header -->
              <div class="column-header">
                <div class="column-title">
                  <span class="status-dot" [style.background-color]="col.color || '#0284c7'"></span>
                  <h3>{{ col.name }}</h3>
                  <span class="badge-mono font-mono">{{ getColumnTasks(col.name).length }}</span>
                </div>
                <button
                  class="btn btn-ghost btn-xs btn-icon"
                  (click)="openCreateModal(col.name)"
                  title="Add Task to {{ col.name }}"
                >
                  <i class="fi fi-rr-plus"></i>
                </button>
              </div>

              <!-- CDK Drop List Container -->
              <div
                class="column-cards"
                cdkDropList
                [cdkDropListData]="getColumnTasks(col.name)"
                (cdkDropListDropped)="drop($event, col)"
              >
                @for (t of getColumnTasks(col.name); track t.id) {
                  <div
                    class="task-card paper-panel"
                    cdkDrag
                    [cdkDragData]="t"
                    (click)="openDetailModal(t)"
                  >
                    <!-- Card Top Row: Issue Type & Priority -->
                    <div class="card-top font-mono">
                      <div class="type-badge-wrap">
                        <span class="badge-type" [class]="t.type">
                          <i [class]="getTypeIcon(t.type)"></i> {{ t.type }}
                        </span>
                        <span class="badge-mono" [class.badge-urgent]="t.priority === 'urgent'" [class.badge-high]="t.priority === 'high'">
                          {{ t.priority }}
                        </span>
                      </div>
                      <i class="fi fi-rr-grip-dots-vertical drag-grip" title="Drag to move"></i>
                    </div>

                    <!-- Card Title -->
                    <h4 class="card-title">{{ t.title }}</h4>

                    <!-- Card Labels -->
                    @if (t.labels && t.labels.length > 0) {
                      <div class="card-labels font-mono">
                        @for (lbl of t.labels; track lbl) {
                          <span
                            class="label-chip"
                            [class.active-label]="selectedLabel() === lbl"
                            (click)="$event.stopPropagation(); selectedLabel.set(selectedLabel() === lbl ? 'all' : lbl)"
                            title="Filter by #{{ lbl }}"
                          >
                            #{{ lbl }}
                          </span>
                        }
                      </div>
                    }

                    <!-- Card Footer: Assignee & Due Date -->
                    <div class="card-bottom font-mono">
                      <span class="assignee">
                        <i class="fi fi-rr-user"></i> {{ t.assignee || 'Self' }}
                      </span>

                      @if (t.due_date) {
                        <span class="due-date" [class.overdue]="isOverdue(t.due_date)">
                          <i class="fi fi-rr-calendar"></i> {{ t.due_date }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Quick Create Modal -->
      @if (showCreateModal()) {
        <app-task-modal
          [taskToEdit]="editingTask()"
          [defaultProjectId]="selectedProjectId() === 'all' ? (projectService.projects()[0]?.id || '') : selectedProjectId()"
          [defaultStatus]="createDefaultStatus()"
          (close)="closeCreateModal()"
        ></app-task-modal>
      }

      <!-- Detail Modal -->
      @if (activeDetailTask(); as detailTask) {
        <app-task-detail-modal
          [task]="detailTask"
          (close)="closeDetailModal()"
          (editTask)="openEditModal($event)"
        ></app-task-detail-modal>
      }
    </div>
  `,
  styles: [`
    .tasks-page-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      width: 100%;
    }
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0.75rem 1rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .filters-left {
      display: flex;
      gap: 0.65rem;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .filter-label {
      font-size: 0.675rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .filter-select {
      width: 130px;
      padding: 0.25rem 0.45rem;
      font-size: 0.775rem;
    }
    .reset-btn {
      color: var(--accent-rose);
    }
    .search-box {
      position: relative;
      align-self: flex-end;
    }
    .search-icon {
      position: absolute;
      left: 0.55rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    .search-input {
      padding-left: 1.8rem;
      width: 180px;
      font-size: 0.775rem;
    }
    .empty-board {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }
    .empty-board-icon {
      font-size: 2rem;
      color: var(--accent-cyan);
    }
    .empty-board h3 {
      font-size: 1.1rem;
      color: var(--text-main);
    }
    .empty-board p {
      color: var(--text-muted);
      font-size: 0.825rem;
      max-width: 400px;
    }
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      align-items: start;
    }
    .kanban-column {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.85rem;
      min-height: 520px;
      background: var(--bg-surface);
    }
    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .column-title {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .column-title h3 {
      font-size: 0.875rem;
      font-weight: 600;
    }
    .column-cards {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      flex: 1;
      min-height: 420px;
    }
    .task-card {
      padding: 0.75rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      cursor: grab;
      transition: var(--transition-fast);
      user-select: none;
    }
    .task-card:active {
      cursor: grabbing;
    }
    .task-card:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-medium);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .type-badge-wrap {
      display: flex;
      gap: 0.35rem;
      align-items: center;
    }
    .drag-grip {
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    .card-title {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.3;
    }
    .card-labels {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
    }
    .label-chip {
      font-size: 0.675rem;
      color: var(--text-muted);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 0.05rem 0.35rem;
      border-radius: var(--radius-xs);
      cursor: pointer;
    }
    .label-chip:hover, .label-chip.active-label {
      background: var(--text-main);
      color: var(--bg-canvas);
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.725rem;
      color: var(--text-muted);
      padding-top: 0.35rem;
      border-top: 1px solid var(--border-subtle);
    }
    .due-date.overdue {
      color: var(--accent-rose);
      font-weight: 600;
    }

    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: var(--radius-xs);
      background: var(--bg-surface);
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--border-active);
    }
    .cdk-drag-placeholder {
      opacity: 0.3;
      border: 1px dashed var(--border-medium);
      border-radius: var(--radius-xs);
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .column-cards.cdk-drop-list-dragging .task-card:not(.cdk-drag-placeholder) {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class TasksComponent {
  selectedProjectId = signal<string>('all');
  selectedType = signal<string>('all');
  selectedPriority = signal<string>('all');
  selectedLabel = signal<string>('all');
  selectedDueDateFilter = signal<string>('all');
  searchQuery = signal<string>('');

  showCreateModal = signal<boolean>(false);
  createDefaultStatus = signal<string>('');
  editingTask = signal<Task | null>(null);
  activeDetailTask = signal<Task | null>(null);

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public workflowService: WorkflowService,
    public workspaceService: WorkspaceService
  ) {
    const projList = this.projectService.projects();
    if (projList.length > 0) {
      this.selectedProjectId.set(projList[0].id);
    }
  }

  onProjectChange(projId: string) {
    this.selectedProjectId.set(projId);
  }

  activeColumns = computed<Workflow[]>(() => {
    return this.workflowService.getWorkflowsForProject(this.selectedProjectId());
  });

  availableLabels = computed<string[]>(() => {
    const list = this.taskService.tasks();
    const projId = this.selectedProjectId();
    const set = new Set<string>();
    list.forEach(t => {
      if (projId === 'all' || t.project_id === projId) {
        t.labels?.forEach(l => {
          if (l.trim()) set.add(l.trim().toLowerCase());
        });
      }
    });
    return Array.from(set).sort();
  });

  hasActiveFilters = computed(() => {
    return (
      this.selectedType() !== 'all' ||
      this.selectedPriority() !== 'all' ||
      this.selectedLabel() !== 'all' ||
      this.selectedDueDateFilter() !== 'all' ||
      this.searchQuery().trim() !== ''
    );
  });

  filteredTasks = computed(() => {
    const list = this.taskService.tasks();
    const projId = this.selectedProjectId();
    const type = this.selectedType();
    const priority = this.selectedPriority();
    const label = this.selectedLabel().toLowerCase();
    const dueFilter = this.selectedDueDateFilter();
    const q = this.searchQuery().toLowerCase().trim();

    const todayStr = new Date().toISOString().split('T')[0];

    return list.filter(t => {
      if (projId !== 'all' && t.project_id !== projId) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (priority !== 'all' && t.priority !== priority) return false;

      if (label !== 'all') {
        if (!t.labels || !t.labels.some(l => l.toLowerCase() === label)) return false;
      }

      if (dueFilter !== 'all') {
        if (dueFilter === 'has_date' && !t.due_date) return false;
        if (dueFilter === 'no_date' && t.due_date) return false;
        if (dueFilter === 'overdue') {
          if (!t.due_date || t.due_date >= todayStr || t.completed) return false;
        }
        if (dueFilter === 'today') {
          if (!t.due_date || t.due_date !== todayStr) return false;
        }
        if (dueFilter === 'week') {
          if (!t.due_date) return false;
          const taskDate = new Date(t.due_date).getTime();
          const now = new Date().getTime();
          const weekFromNow = now + 7 * 86400000;
          if (taskDate < now - 86400000 || taskDate > weekFromNow) return false;
        }
      }

      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesLabel = t.labels?.some(l => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesLabel) return false;
      }

      return true;
    });
  });

  getColumnTasks(statusName: string): Task[] {
    return this.filteredTasks().filter(t => t.status === statusName);
  }

  getSelectedProjectObj(): Project | null {
    const id = this.selectedProjectId();
    if (!id || id === 'all') return null;
    return this.projectService.projects().find(p => p.id === id) || null;
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'story': return 'fi fi-rr-book-alt';
      case 'bug': return 'fi fi-rr-bug';
      case 'epic': return 'fi fi-rr-rocket-takeoff';
      default: return 'fi fi-rr-check-circle';
    }
  }

  isOverdue(dueDate?: string): boolean {
    if (!dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return dueDate < todayStr;
  }

  async drop(event: CdkDragDrop<Task[]>, targetColumn: Workflow) {
    const task: Task = event.item.data;
    if (task && task.status !== targetColumn.name) {
      await this.taskService.updateTask(task.id, {
        status: targetColumn.name,
        workflow_id: targetColumn.id
      });
    }
  }

  resetFilters() {
    this.selectedType.set('all');
    this.selectedPriority.set('all');
    this.selectedLabel.set('all');
    this.selectedDueDateFilter.set('all');
    this.searchQuery.set('');
  }

  openCreateModal(defaultStatus: string = '') {
    this.editingTask.set(null);
    this.createDefaultStatus.set(defaultStatus);
    this.showCreateModal.set(true);
  }

  openEditModal(task: Task) {
    this.activeDetailTask.set(null);
    this.editingTask.set(task);
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.showCreateModal.set(false);
    this.editingTask.set(null);
  }

  openDetailModal(task: Task) {
    this.activeDetailTask.set(task);
  }

  closeDetailModal() {
    this.activeDetailTask.set(null);
  }
}
