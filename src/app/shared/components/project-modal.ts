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
      <div class="modal-card paper-panel font-mono" (click)="$event.stopPropagation()">
        <!-- Header Strip -->
        <div class="modal-header">
          <div class="header-left">
            <span class="badge-mono">{{ isEditMode ? 'EDIT PROJECT' : 'NEW PROJECT' }}</span>
            <h3>
              <i [class]="isEditMode ? 'fi fi-rr-edit text-cyan' : 'fi fi-rr-folder-add text-cyan'"></i>
              <span>{{ isEditMode ? 'Edit Project Setup' : 'Create Project' }}</span>
            </h3>
          </div>
          <button class="btn btn-ghost btn-xs close-btn" (click)="close.emit()" title="Close (Esc)">
            <span class="key-badge">ESC</span>
            <i class="fi fi-rr-cross"></i>
          </button>
        </div>

        <form (ngSubmit)="saveProject()" class="modal-form">
          <div class="form-body">
            <!-- Project Name -->
            <div class="form-group">
              <label class="form-label">PROJECT NAME <span class="text-rose">*</span></label>
              <input
                type="text"
                class="form-input"
                [(ngModel)]="name"
                name="name"
                placeholder="e.g. Tokio Async Microservice or DevFlow Core Engine"
                required
                autofocus
              />
            </div>

            <!-- Repository URL -->
            <div class="form-group">
              <label class="form-label">REPOSITORY URL (OPTIONAL)</label>
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
              <label class="form-label">INITIAL STATUS</label>
              <select class="form-select" [(ngModel)]="status" name="status">
                <option value="active">Active Workspace</option>
                <option value="completed">Completed Project</option>
                <option value="archived">Archived Workspace</option>
              </select>
            </div>

            <!-- Labels Input -->
            <div class="form-group">
              <label class="form-label">TAGS / TECH STACK (COMMA-SEPARATED)</label>
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
              <label class="form-label">DESCRIPTION / SUMMARY</label>
              <textarea
                class="form-textarea"
                rows="3"
                [(ngModel)]="description"
                name="description"
                placeholder="High-level architecture goals, scope summary, or tech stack details..."
              ></textarea>
            </div>

            <!-- Color Accent Picker -->
            <div class="form-group">
              <label class="form-label">PROJECT COLOR ACCENT</label>
              <div class="color-picker">
                @for (c of availableColors; track c) {
                  <button
                    type="button"
                    class="color-btn"
                    [style.background-color]="c"
                    [class.selected]="color === c"
                    (click)="color = c"
                    [title]="c"
                  >
                    @if (color === c) {
                      <i class="fi fi-rr-check text-white"></i>
                    }
                  </button>
                }
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <div class="footer-hint">
              <span class="status-dot dot-emerald"></span>
              <span>PROJECT METADATA</span>
            </div>
            <div class="footer-actions">
              <button type="button" class="btn btn-secondary btn-sm" (click)="close.emit()">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="!name.trim()">
                <i class="fi fi-rr-check"></i>
                <span>{{ isEditMode ? 'Save Changes' : 'Create Project' }}</span>
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
      max-width: 540px;
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

    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field-icon {
      position: absolute;
      left: 0.75rem;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .icon-padded {
      padding-left: 2.3rem;
    }

    .color-picker {
      display: flex;
      gap: 0.65rem;
      margin-top: 0.2rem;
    }
    .color-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-fast);
    }
    .color-btn.selected {
      border-color: var(--text-main);
      transform: scale(1.15);
    }
    .text-white {
      color: #ffffff;
      font-size: 0.7rem;
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
export class ProjectModalComponent implements OnInit {
  @Input() projectToEdit: Partial<Project> | null = null;
  @Output() close = new EventEmitter<Project | undefined>();

  name = '';
  repositoryUrl = '';
  description = '';
  status: 'active' | 'archived' | 'completed' = 'active';
  labelsInput = '';
  color = '#06b6d4';

  availableColors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'];

  get isEditMode(): boolean {
    return !!(this.projectToEdit && this.projectToEdit.id);
  }

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    if (this.projectToEdit) {
      this.name = this.projectToEdit.name || '';
      this.repositoryUrl = this.projectToEdit.repository_url || '';
      this.description = this.projectToEdit.description || '';
      this.status = this.projectToEdit.status || 'active';
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

    let resultProject: Project | undefined = undefined;

    if (this.isEditMode && this.projectToEdit && this.projectToEdit.id) {
      const updated = await this.projectService.updateProject(this.projectToEdit.id, {
        name: this.name,
        repository_url: this.repositoryUrl,
        description: this.description,
        status: this.status,
        labels: parsedLabels,
        color: this.color
      });
      resultProject = updated || undefined;
    } else {
      const created = await this.projectService.createProject({
        name: this.name,
        repository_url: this.repositoryUrl,
        description: this.description,
        status: this.status,
        labels: parsedLabels,
        color: this.color
      });
      resultProject = created;
    }

    this.close.emit(resultProject);
  }
}
