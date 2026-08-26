import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { Project, Task, WorkflowColumn } from '../../core/models/project.model';
import { TaskModalComponent } from '../../shared/components/task-modal';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal';
import { WorkflowModalComponent } from '../../shared/components/workflow-modal';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskModalComponent, TaskDetailModalComponent, WorkflowModalComponent],
  template: `
    <div class="tasks-page-container">
      <!-- Header Banner -->
      <div class="tasks-header glass-panel">
        <div class="header-main">
          <div>
            <h2>
              <i class="fi fi-rr-list-check text-cyan"></i> Task & Issue Manager
            </h2>
            <p class="subtitle">Organize stories, bugs, tasks, and epics across status workflows</p>
          </div>

          <div class="header-actions">
            <button class="btn btn-secondary" (click)="openWorkflowModal()">
              <i class="fi fi-rr-settings-sliders"></i> Configure Workflow
            </button>

            <button class="btn btn-primary" (click)="openCreateModal()">
              <i class="fi fi-rr-plus"></i> Create Issue
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="filters-left">
            <!-- Project Selector Filter -->
            <select
              class="form-select filter-select"
              [ngModel]="selectedProjectId()"
              (ngModelChange)="selectedProjectId.set($event)"
            >
              <option value="all">All Projects</option>
              @for (p of projectService.projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>

            <!-- Type Filter -->
            <select
              class="form-select filter-select"
              [ngModel]="selectedType()"
              (ngModelChange)="selectedType.set($event)"
            >
              <option value="all">All Issue Types</option>
              <option value="story">Story</option>
              <option value="bug">Bug</option>
              <option value="task">Task</option>
              <option value="epic">Epic</option>
            </select>

            <!-- Priority Filter -->
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

          <!-- Search Input -->
          <div class="search-box">
            <i class="fi fi-rr-search search-icon"></i>
            <input
              type="text"
              class="form-input search-input"
              placeholder="Search tasks, labels..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
            />
          </div>
        </div>
      </div>

      <!-- Kanban Workflow Board -->
      <div class="kanban-board">
        @for (col of activeColumns(); track col.id) {
          <div class="kanban-column glass-panel">
            <div class="column-header">
              <div class="column-title">
                <span class="col-dot" [style.background-color]="col.color || '#06b6d4'"></span>
                <h3>{{ col.name }}</h3>
                <span class="col-count">{{ getColumnTasks(col.id).length }}</span>
              </div>
              <button
                class="btn btn-ghost btn-sm btn-icon"
                (click)="openCreateModal(col.id)"
                title="Add Issue to {{ col.name }}"
              >
                <i class="fi fi-rr-plus"></i>
              </button>
            </div>

            <div class="column-cards">
              @if (getColumnTasks(col.id).length === 0) {
                <div class="empty-column">No issues in {{ col.name }}</div>
              } @else {
                @for (t of getColumnTasks(col.id); track t.id) {
                  <div
                    class="task-card glass-panel"
                    (click)="openDetailModal(t)"
                  >
                    <div class="card-top">
                      <span class="badge" [class]="'badge-' + t.type">
                        <i [class]="getTypeIcon(t.type)"></i> {{ t.type }}
                      </span>
                      <span class="badge" [class]="'badge-' + t.priority">
                        {{ t.priority }}
                      </span>
                    </div>

                    <h4 class="card-title">{{ t.title }}</h4>

                    @if (t.labels && t.labels.length > 0) {
                      <div class="card-labels">
                        @for (lbl of t.labels; track lbl) {
                          <span class="label-chip">#{{ lbl }}</span>
                        }
                      </div>
                    }

                    <div class="card-bottom">
                      <span class="assignee">
                        <i class="fi fi-rr-user"></i> {{ t.assignee || 'Self' }}
                      </span>

                      @if (t.due_date) {
                        <span class="due-date">
                          <i class="fi fi-rr-calendar"></i> {{ t.due_date }}
                        </span>
                      }
                    </div>
                  </div>
                }
              }
            </div>
          </div>
        }
      </div>

      <!-- Quick Create Modal -->
      @if (showCreateModal()) {
        <app-task-modal
          [taskToEdit]="editingTask()"
          [defaultProjectId]="selectedProjectId() === 'all' ? '' : selectedProjectId()"
          [defaultStatus]="createDefaultStatus()"
          (close)="closeCreateModal()"
        ></app-task-modal>
      }

      <!-- Detail Page/Modal with Comments -->
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
      max-width: 1600px;
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
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
      flex-wrap: wrap;
      gap: 1rem;
    }
    .filters-left {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .filter-select {
      width: 160px;
      padding: 0.4rem 0.65rem;
      font-size: 0.825rem;
    }
    .search-box {
      position: relative;
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
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
      overflow-x: auto;
      padding-bottom: 1rem;
    }
    .kanban-column {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      min-height: 500px;
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
    }
    .empty-column {
      padding: 2rem 1rem;
      text-align: center;
      font-size: 0.8rem;
      color: var(--text-subtle);
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-md);
    }
    .task-card {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      background: var(--bg-card);
      cursor: pointer;
      transition: var(--transition);
    }
    .task-card:hover {
      border-color: var(--border-active);
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
  `]
})
export class TasksComponent {
  selectedProjectId = signal<string>('all');
  selectedType = signal<string>('all');
  selectedPriority = signal<string>('all');
  searchQuery = signal<string>('');

  showCreateModal = signal<boolean>(false);
  showWorkflowModal = signal<boolean>(false);
  createDefaultStatus = signal<string>('todo');
  editingTask = signal<Task | null>(null);
  activeDetailTask = signal<Task | null>(null);

  constructor(
    public taskService: TaskService,
    public projectService: ProjectService
  ) {}

  activeColumns = computed<WorkflowColumn[]>(() => {
    return this.projectService.getProjectWorkflowColumns(this.selectedProjectId());
  });

  filteredTasks = computed(() => {
    const list = this.taskService.tasks();
    const projId = this.selectedProjectId();
    const type = this.selectedType();
    const priority = this.selectedPriority();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(t => {
      if (projId !== 'all' && t.project_id !== projId) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      if (q) {
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesLabel = t.labels?.some(l => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesLabel) return false;
      }
      return true;
    });
  });

  getColumnTasks(colId: string): Task[] {
    return this.filteredTasks().filter(t => t.status === colId);
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

  openCreateModal(defaultStatus: string = 'todo') {
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
