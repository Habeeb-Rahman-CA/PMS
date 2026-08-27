import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { Project, Task, Workflow } from '../../core/models/project.model';
import { TaskModalComponent } from '../../shared/components/task-modal';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal';
import { WorkflowModalComponent } from '../../shared/components/workflow-modal';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DragDropModule,
    TaskModalComponent,
    TaskDetailModalComponent,
    WorkflowModalComponent
  ],
  template: `
    <div class="tasks-page-container">
      <!-- Header Banner -->
      <div class="tasks-header glass-panel">
        <div class="header-main">
          <div>
            <h2>Tasks</h2>
          </div>

          <div class="header-actions">
            @if (selectedProjectId() !== 'all') {
              <button class="btn btn-secondary" (click)="openWorkflowModal()">
                <i class="fi fi-rr-settings-sliders"></i> Workflow
              </button>
            }

            <button
              class="btn btn-primary"
              [disabled]="activeColumns().length === 0"
              (click)="openCreateModal()"
            >
              <i class="fi fi-rr-plus"></i> New Task
            </button>
          </div>
        </div>

        <!-- Filter Toolbar -->
        <div class="filter-bar">
          <div class="filters-left">
            <!-- Project Filter -->
            <div class="filter-group">
              <label class="filter-label">Project</label>
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
              <label class="filter-label">Issue Type</label>
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
              <label class="filter-label">Priority</label>
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
              <label class="filter-label">Label</label>
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
              <label class="filter-label">Due Date</label>
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
                <button class="btn btn-ghost btn-sm reset-btn" (click)="resetFilters()">
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
      </div>

      <!-- Kanban Board -->
      @if (activeColumns().length === 0) {
        <div class="empty-board glass-panel">
          <i class="fi fi-rr-settings-sliders empty-board-icon"></i>
          <h3>No Status Workflow Configured</h3>
          <p>You haven't created any status columns for this project yet.</p>
          <button class="btn btn-primary" (click)="openWorkflowModal()">
            <i class="fi fi-rr-plus"></i> Add Status Columns
          </button>
        </div>
      } @else {
        <div class="kanban-board" cdkDropListGroup>
          @for (col of activeColumns(); track col.id) {
            <div class="kanban-column glass-panel">
              <!-- Column Header -->
              <div class="column-header">
                <div class="column-title">
                  <span class="col-dot" [style.background-color]="col.color || '#06b6d4'"></span>
                  <h3>{{ col.name }}</h3>
                  <span class="col-count">{{ getColumnTasks(col.name).length }}</span>
                </div>
                <button
                  class="btn btn-ghost btn-sm btn-icon"
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
                      class="task-card glass-panel"
                      cdkDrag
                      [cdkDragData]="t"
                      (click)="openDetailModal(t)"
                    >
                      <!-- Card Top Row: Issue Type & Priority -->
                      <div class="card-top">
                        <div class="type-badge-wrap">
                          <span class="badge" [class]="'badge-' + t.type">
                            <i [class]="getTypeIcon(t.type)"></i> {{ t.type }}
                          </span>
                          <span class="badge" [class]="'badge-' + t.priority">
                            {{ t.priority }}
                          </span>
                        </div>
                        <i class="fi fi-rr-grip-dots-vertical drag-grip" title="Drag to move"></i>
                      </div>

                      <!-- Card Title -->
                      <h4 class="card-title">{{ t.title }}</h4>

                      <!-- Card Labels -->
                      @if (t.labels && t.labels.length > 0) {
                        <div class="card-labels">
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
                      <div class="card-bottom">
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

      <!-- Workflow Config Modal -->
      @if (showWorkflowModal()) {
        <app-workflow-modal
          [project]="getSelectedProjectObj()"
          (close)="closeWorkflowModal()"
        ></app-workflow-modal>
      }
    </div>
  `,
  styles: [`
    .tasks-page-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      width: 100%;
      margin: 0 auto;
    }
    .tasks-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .header-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-main h2 {
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .text-cyan { color: var(--accent-cyan); }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.2rem;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filters-left {
      display: flex;
      gap: 0.85rem;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .filter-label {
      font-size: 0.7rem;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .filter-select {
      width: 145px;
      padding: 0.35rem 0.6rem;
      font-size: 0.825rem;
    }
    .reset-btn {
      padding: 0.35rem 0.6rem;
      font-size: 0.8rem;
      color: var(--accent-rose);
    }
    .reset-btn:hover {
      background: rgba(244, 63, 94, 0.1);
    }
    .search-box {
      position: relative;
      align-self: flex-end;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-subtle);
      font-size: 0.85rem;
    }
    .search-input {
      padding-left: 2.2rem;
      width: 220px;
      font-size: 0.825rem;
    }
    .empty-board {
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }
    .empty-board-icon {
      font-size: 2.5rem;
      color: var(--accent-cyan);
    }
    .empty-board h3 {
      font-size: 1.25rem;
      color: var(--text-main);
    }
    .empty-board p {
      color: var(--text-muted);
      font-size: 0.9rem;
      max-width: 450px;
    }
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      align-items: start;
    }
    .kanban-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      min-height: 580px;
      background: var(--bg-surface);
    }
    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .column-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .column-title h3 {
      font-size: 0.95rem;
      font-weight: 600;
    }
    .col-count {
      font-size: 0.725rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      color: var(--text-muted);
    }
    .col-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .column-cards {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      flex: 1;
      min-height: 480px;
    }
    .empty-column {
      padding: 3rem 1rem;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-subtle);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
    .empty-column i {
      font-size: 1.25rem;
      opacity: 0.5;
    }
    .task-card {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      background: var(--bg-card);
      cursor: grab;
      transition: var(--transition);
      user-select: none;
    }
    .task-card:active {
      cursor: grabbing;
    }
    .task-card:hover {
      border-color: var(--border-active);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .type-badge-wrap {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }
    .drag-grip {
      color: var(--text-subtle);
      font-size: 0.85rem;
      opacity: 0.5;
    }
    .card-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.35;
    }
    .card-labels {
      display: flex;
      gap: 0.3rem;
      flex-wrap: wrap;
    }
    .label-chip {
      font-size: 0.7rem;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.1);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: var(--transition);
    }
    .label-chip:hover, .label-chip.active-label {
      background: var(--accent-cyan);
      color: #ffffff;
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-subtle);
      padding-top: 0.4rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .due-date.overdue {
      color: #ef4444;
      font-weight: 600;
    }
    /* CDK Drag & Drop styles */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: var(--radius-md);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7);
      background: var(--bg-card);
      padding: 1rem;
      border: 1px solid var(--accent-cyan);
    }
    .cdk-drag-placeholder {
      opacity: 0.25;
      border: 2px dashed var(--accent-cyan);
      border-radius: var(--radius-md);
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
  showWorkflowModal = signal<boolean>(false);
  createDefaultStatus = signal<string>('');
  editingTask = signal<Task | null>(null);
  activeDetailTask = signal<Task | null>(null);

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService,
    public workflowService: WorkflowService
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

      // Label filter
      if (label !== 'all') {
        if (!t.labels || !t.labels.some(l => l.toLowerCase() === label)) return false;
      }

      // Due Date Filter logic
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

      // Text search
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
      default: return 'fi fi-rr-checkbox';
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

  openWorkflowModal() {
    this.showWorkflowModal.set(true);
  }

  closeWorkflowModal() {
    this.showWorkflowModal.set(false);
  }

  openDetailModal(task: Task) {
    this.activeDetailTask.set(task);
  }

  closeDetailModal() {
    this.activeDetailTask.set(null);
  }
}
