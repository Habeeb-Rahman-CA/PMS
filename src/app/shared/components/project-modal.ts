import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>
            <i [class]="isEditMode ? 'fi fi-rr-edit' : 'fi fi-rr-folder-add'"></i>
            <span>{{ isEditMode ? 'Edit Project Details' : 'Create New Project' }}</span>
          </h3>
          <button class="btn btn-ghost btn-sm" (click)="close.emit()">
            <i class="fi fi-rr-cross"></i>
          </button>
        </div>

        <form (ngSubmit)="saveProject()">
          <!-- Project Name -->
          <div class="form-group">
            <label class="form-label">Project Name *</label>
            <input
              type="text"
              class="form-input"
              [(ngModel)]="name"
              name="name"
              placeholder="e.g. Tokio Async Microservice"
              required
              autofocus
            />
          </div>

          <!-- Repository URL -->
          <div class="form-group">
            <label class="form-label">Repository URL (Optional)</label>
            <div class="input-with-icon">
              <i class="fi fi-brands-github field-icon"></i>
              <input
                type="url"
                class="form-input icon-padded"
                [(ngModel)]="repositoryUrl"
                name="repositoryUrl"
                placeholder="https://github.com/org/repository"
              />
            </div>
          </div>

          <!-- Status Row -->
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-select" [(ngModel)]="status" name="status">
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <!-- Labels Input -->
          <div class="form-group">
            <label class="form-label">Labels / Tags (comma-separated)</label>
            <input
              type="text"
              class="form-input"
              [(ngModel)]="labelsInput"
              name="labelsInput"
              placeholder="e.g. frontend, angular, rust, pwa"
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
              placeholder="High-level architecture goals, tech stack, or context..."
            ></textarea>
          </div>

          <!-- Color Accent Picker -->
          <div class="form-group">
            <label class="form-label">Accent Color</label>
            <div class="color-picker">
              @for (c of availableColors; track c) {
                <button
                  type="button"
                  class="color-btn"
                  [style.background-color]="c"
                  [class.selected]="color === c"
                  (click)="color = c"
                >
                  @if (color === c) {
                    <i class="fi fi-rr-check text-white"></i>
                  }
                </button>
              }
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              <i class="fi fi-rr-check"></i>
              <span>{{ isEditMode ? 'Save Changes' : 'Create Project' }}</span>
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
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field-icon {
      position: absolute;
      left: 0.75rem;
      color: var(--text-subtle);
      font-size: 1rem;
    }
    .icon-padded {
      padding-left: 2.3rem;
    }
    .color-picker {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.35rem;
    }
    .color-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
    }
    .color-btn.selected {
      border-color: #ffffff;
      transform: scale(1.15);
      box-shadow: 0 0 10px rgba(255,255,255,0.4);
    }
    .text-white {
      color: #ffffff;
      font-size: 0.75rem;
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
export class ProjectModalComponent implements OnInit {
  @Input() projectToEdit: Project | null = null;
  @Output() close = new EventEmitter<void>();

  name = '';
  repositoryUrl = '';
  description = '';
  status: 'active' | 'archived' | 'completed' = 'active';
  labelsInput = '';
  color = '#06b6d4';

  availableColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'];

  get isEditMode(): boolean {
    return !!this.projectToEdit;
  }

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    if (this.projectToEdit) {
      this.name = this.projectToEdit.name;
      this.repositoryUrl = this.projectToEdit.repository_url || '';
      this.description = this.projectToEdit.description || '';
      this.status = this.projectToEdit.status;
      this.labelsInput = (this.projectToEdit.labels || []).join(', ');
      this.color = this.projectToEdit.color || '#06b6d4';
    }
  }

  async saveProject() {
    if (!this.name.trim()) return;

    const parsedLabels = this.labelsInput
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);

    if (this.isEditMode && this.projectToEdit) {
      await this.projectService.updateProject(this.projectToEdit.id, {
        name: this.name,
        repository_url: this.repositoryUrl,
        description: this.description,
        status: this.status,
        labels: parsedLabels,
        color: this.color
      });
    } else {
      await this.projectService.createProject({
        name: this.name,
        repository_url: this.repositoryUrl,
        description: this.description,
        status: this.status,
        labels: parsedLabels,
        color: this.color
      });
    }

    this.close.emit();
  }
}
