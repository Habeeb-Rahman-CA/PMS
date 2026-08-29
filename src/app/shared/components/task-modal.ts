import { Component, EventEmitter, Input, OnInit, Output, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { Task, TaskPriority, TaskType, Workflow } from '../../core/models/project.model';
import { DatePickerComponent } from './date-picker';
import { SelectComponent, SelectOption } from './select';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerComponent, SelectComponent],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card paper-panel font-mono" (click)="$event.stopPropagation()">
        <!-- Header Strip -->
        <div class="modal-header">
          <div class="header-left">
            <h3>
              <span>{{ isEditMode ? 'Edit Task Details' : 'Create New Task' }}</span>
            </h3>
          </div>
          <button class="btn btn-ghost btn-xs close-btn" (click)="close.emit()" title="Close">
            <i class="fi fi-rr-cross"></i>
          </button>
        </div>

        <form (ngSubmit)="saveTask()" class="modal-form">
          <div class="form-body">
            <!-- Title -->
            <div class="form-group">
              <label class="form-label">SUMMARY / TITLE <span class="text-rose">*</span></label>
              <input
                #titleInput
                type="text"
                class="form-input"
                [(ngModel)]="title"
                name="title"
                placeholder="e.g. Implement JWT Auth interceptor or Fix CSS grid layout"
                required
              />
            </div>

            <!-- Type & Project Row -->
            <div class="form-row">
              <div class="form-group half">
                <label class="form-label">ISSUE TYPE</label>
                <app-select [options]="typeOptions" [(value)]="type" placeholder="Select type..."></app-select>
              </div>

              <div class="form-group half">
                <label class="form-label">PROJECT <span class="text-rose">*</span></label>
                <app-select [options]="projectOptions" [(value)]="projectId" placeholder="Select project..."></app-select>
              </div>
            </div>

            <!-- Priority & Status Row -->
            @if (isEditMode) {
              <div class="form-row">
                <div class="form-group half">
                  <label class="form-label">STATUS COLUMN</label>
                  <app-select [options]="statusOptions" [(value)]="status" placeholder="Select status..."></app-select>
                </div>

                <div class="form-group half">
                  <label class="form-label">PRIORITY</label>
                  <app-select [options]="priorityOptions" [(value)]="priority" placeholder="Select priority..."></app-select>
                </div>
              </div>
            } @else {
              <div class="form-group">
                <label class="form-label">PRIORITY</label>
                <app-select [options]="priorityOptions" [(value)]="priority" placeholder="Select priority..."></app-select>
              </div>
            }

            <!-- Assignee & Due Date Row -->
            <div class="form-row">
              <div class="form-group half">
                <label class="form-label">ASSIGNEE</label>
                <input
                  type="text"
                  class="form-input"
                  [(ngModel)]="assignee"
                  name="assignee"
                  placeholder="Self"
                />
              </div>

              <div class="form-group half">
                <label class="form-label">DUE DATE</label>
                <app-date-picker
                  [value]="dueDate"
                  (valueChange)="dueDate = $event"
                  placeholder="Select due date..."
                ></app-date-picker>
              </div>
            </div>

            <!-- Labels Input -->
            <div class="form-group">
              <label class="form-label">TAGS / LABELS (COMMA-SEPARATED)</label>
              <input
                type="text"
                class="form-input"
                [(ngModel)]="labelsInput"
                name="labelsInput"
                placeholder="e.g. backend, security, priority"
              />
            </div>

            <!-- Description -->
            <div class="form-group">
              <label class="form-label">DESCRIPTION / NOTES</label>
              <textarea
                class="form-textarea"
                rows="3"
                [(ngModel)]="description"
                name="description"
                placeholder="Acceptance criteria, technical notes, or reference URLs..."
              ></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <div class="footer-hint">
              <span class="status-dot dot-emerald"></span>
              <span>BILO WORKSPACE ITEM</span>
            </div>
            <div class="footer-actions">
              <button type="button" class="btn btn-secondary btn-sm" (click)="close.emit()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="!title.trim() || !projectId">
                <i class="fi fi-rr-check"></i>
                <span>{{ isEditMode ? 'Save Changes' : 'Create Task' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-card {
      width: 100%;
      max-width: 580px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-surface);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-xs);
      box-shadow: var(--shadow-modal);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.15rem;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .header-left h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .close-btn {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .form-body {
      padding: 1.15rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-height: calc(90vh - 120px);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .form-row {
      display: flex;
      gap: 0.85rem;
    }
    .half {
      flex: 1;
    }

    .form-label {
      font-size: 0.675rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .form-input, .form-select, .form-textarea {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      color: var(--text-main);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      padding: 0.45rem 0.65rem;
      transition: var(--transition-fast);
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--border-medium);
      background: var(--bg-surface);
    }

    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.15rem;
      background: var(--bg-surface-subtle);
      border-top: 1px solid var(--border-subtle);
    }
    .footer-hint {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.675rem;
      color: var(--text-muted);
    }
    .footer-actions {
      display: flex;
      gap: 0.5rem;
    }
  `]
})
export class TaskModalComponent implements OnInit, AfterViewInit {
  @Input() taskToEdit: Task | null = null;
  @Input() defaultProjectId: string = '';
  @Input() defaultStatus: string = '';
  @Input() defaultDueDate: string = '';
  @Output() close = new EventEmitter<Task | undefined>();

  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  title = '';
  description = '';
  projectId = '';
  type: TaskType = 'task';
  status: string = '';
  priority: TaskPriority = 'medium';
  assignee = 'Self';
  dueDate = '';
  labelsInput = '';

  typeOptions: SelectOption[] = [
    { value: 'task', label: 'Task', icon: 'fi fi-rr-check-box' },
    { value: 'bug', label: 'Bug', icon: 'fi fi-rr-bug' },
    { value: 'story', label: 'Story', icon: 'fi fi-rr-bookmark' },
    { value: 'epic', label: 'Epic', icon: 'fi fi-rr-bolt' }
  ];

  priorityOptions: SelectOption[] = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  get projectOptions(): SelectOption[] {
    return this.projectService.projects().map(p => ({
      value: p.id,
      label: p.name,
      icon: 'fi fi-rr-folder'
    }));
  }

  get statusOptions(): SelectOption[] {
    const statuses = this.getAvailableStatuses();
    return statuses.map(s => ({
      value: s.name,
      label: s.name
    }));
  }

  get isEditMode(): boolean {
    return !!this.taskToEdit;
  }

  constructor(
    private taskService: TaskService,
    public projectService: ProjectService,
    public workflowService: WorkflowService
  ) { }

  ngOnInit() {
    if (this.taskToEdit) {
      this.title = this.taskToEdit.title;
      this.description = this.taskToEdit.description || '';
      this.projectId = this.taskToEdit.project_id || '';
      this.type = this.taskToEdit.type || 'task';
      this.status = this.taskToEdit.status || '';
      this.priority = this.taskToEdit.priority || 'medium';
      this.assignee = this.taskToEdit.assignee || 'Self';
      this.dueDate = this.taskToEdit.due_date || '';
      this.labelsInput = (this.taskToEdit.labels || []).join(', ');
    } else {
      if (this.defaultProjectId) this.projectId = this.defaultProjectId;
      if (this.defaultStatus) this.status = this.defaultStatus;
      if (this.defaultDueDate) this.dueDate = this.defaultDueDate;
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.titleInput) {
        this.titleInput.nativeElement.focus();
      }
    }, 50);
  }

  getAvailableStatuses(): Workflow[] {
    return this.workflowService.getWorkflowsForProject(this.projectId);
  }

  async saveTask() {
    if (!this.title.trim() || !this.projectId) return;

    const parsedLabels = this.labelsInput
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);

    const available = this.getAvailableStatuses();
    const finalStatus = this.isEditMode
      ? (this.status || (available.length > 0 ? available[0].name : 'todo'))
      : (this.defaultStatus || (available.length > 0 ? available[0].name : 'todo'));
    const activeWf = available.find(w => w.name === finalStatus) || (available.length > 0 ? available[0] : undefined);

    let resTask: Task | undefined = undefined;

    if (this.isEditMode && this.taskToEdit) {
      const updated = await this.taskService.updateTask(this.taskToEdit.id, {
        title: this.title,
        description: this.description,
        project_id: this.projectId,
        workflow_id: activeWf?.id,
        type: this.type,
        status: finalStatus,
        priority: this.priority,
        assignee: this.assignee,
        due_date: this.dueDate,
        labels: parsedLabels
      });
      resTask = updated || undefined;
    } else {
      const created = await this.taskService.createTask({
        title: this.title,
        description: this.description,
        project_id: this.projectId,
        workflow_id: activeWf?.id,
        type: this.type,
        status: finalStatus,
        priority: this.priority,
        assignee: this.assignee,
        due_date: this.dueDate,
        labels: parsedLabels
      });
      resTask = created;
    }

    this.close.emit(resTask);
  }
}
