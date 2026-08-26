import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../core/models/project.model';

@Component({
  selector: 'app-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>
            <i [class]="isEditMode ? 'fi fi-rr-edit' : 'fi fi-rr-plus-small'"></i>
            <span>{{ isEditMode ? 'Edit Issue / Task' : 'Quick Create Task' }}</span>
          </h3>
          <button class="btn btn-ghost btn-sm" (click)="close.emit()">
            <i class="fi fi-rr-cross"></i>
          </button>
        </div>

        <form (ngSubmit)="saveTask()">
          <!-- Title -->
          <div class="form-group">
            <label class="form-label">Summary / Title *</label>
            <input
              type="text"
              class="form-input"
              [(ngModel)]="title"
              name="title"
              placeholder="e.g. Implement JWT Auth interceptor or Fix CSS grid layout"
              required
              autofocus
            />
          </div>

          <!-- Type & Project Row -->
          <div class="form-row">
            <div class="form-group half">
              <label class="form-label">Issue Type</label>
              <select class="form-select" [(ngModel)]="type" name="type">
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="story">Story</option>
                <option value="epic">Epic</option>
              </select>
            </div>

            <div class="form-group half">
              <label class="form-label">Project</label>
              <select class="form-select" [(ngModel)]="projectId" name="projectId">
                <option value="">No Project (General)</option>
                @for (p of projectService.projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Status & Priority Row -->
          <div class="form-row">
            <div class="form-group half">
              <label class="form-label">Status</label>
              <select class="form-select" [(ngModel)]="status" name="status">
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div class="form-group half">
              <label class="form-label">Priority</label>
              <select class="form-select" [(ngModel)]="priority" name="priority">
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <!-- Assignee & Due Date Row -->
          <div class="form-row">
            <div class="form-group half">
              <label class="form-label">Assignee</label>
              <input
                type="text"
                class="form-input"
                [(ngModel)]="assignee"
                name="assignee"
                placeholder="Self"
              />
            </div>

            <div class="form-group half">
              <label class="form-label">Due Date</label>
              <input
                type="date"
                class="form-input"
                [(ngModel)]="dueDate"
                name="dueDate"
              />
            </div>
          </div>

          <!-- Labels Input -->
          <div class="form-group">
            <label class="form-label">Labels / Tags (comma-separated)</label>
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
            <label class="form-label">Description</label>
            <textarea
              class="form-textarea"
              rows="3"
              [(ngModel)]="description"
              name="description"
              placeholder="Task acceptance criteria, technical details, or notes..."
            ></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fi fi-rr-check"></i>
              <span>{{ isEditMode ? 'Save Changes' : 'Create Issue' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .modal-header h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.15rem;
    }
    .form-row {
      display: flex;
      gap: 1rem;
    }
    .half {
      flex: 1;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);
      margin-top: 0.5rem;
    }
  `]
})
export class TaskModalComponent implements OnInit {
  @Input() taskToEdit: Task | null = null;
  @Input() defaultProjectId: string = '';
  @Input() defaultStatus: TaskStatus = 'todo';
  @Output() close = new EventEmitter<void>();

  title = '';
  description = '';
  projectId = '';
  type: TaskType = 'task';
  status: TaskStatus = 'todo';
  priority: TaskPriority = 'medium';
  assignee = 'Self';
  dueDate = '';
  labelsInput = '';

  get isEditMode(): boolean {
    return !!this.taskToEdit;
  }

  constructor(
    private taskService: TaskService,
    public projectService: ProjectService
  ) {}

  ngOnInit() {
    if (this.taskToEdit) {
      this.title = this.taskToEdit.title;
      this.description = this.taskToEdit.description || '';
      this.projectId = this.taskToEdit.project_id || '';
      this.type = this.taskToEdit.type || 'task';
      this.status = this.taskToEdit.status || 'todo';
      this.priority = this.taskToEdit.priority || 'medium';
      this.assignee = this.taskToEdit.assignee || 'Self';
      this.dueDate = this.taskToEdit.due_date || '';
      this.labelsInput = (this.taskToEdit.labels || []).join(', ');
    } else {
      if (this.defaultProjectId) this.projectId = this.defaultProjectId;
      if (this.defaultStatus) this.status = this.defaultStatus;
    }
  }

  async saveTask() {
    if (!this.title.trim()) return;

    const parsedLabels = this.labelsInput
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);

    if (this.isEditMode && this.taskToEdit) {
      await this.taskService.updateTask(this.taskToEdit.id, {
        title: this.title,
        description: this.description,
        project_id: this.projectId,
        type: this.type,
        status: this.status,
        priority: this.priority,
        assignee: this.assignee,
        due_date: this.dueDate,
        labels: parsedLabels
      });
    } else {
      await this.taskService.createTask({
        title: this.title,
        description: this.description,
        project_id: this.projectId,
        type: this.type,
        status: this.status,
        priority: this.priority,
        assignee: this.assignee,
        due_date: this.dueDate,
        labels: parsedLabels
      });
    }

    this.close.emit();
  }
}
