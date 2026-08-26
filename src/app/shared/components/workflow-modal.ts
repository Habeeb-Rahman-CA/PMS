import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { DEFAULT_WORKFLOW_COLUMNS, Project, WorkflowColumn } from '../../core/models/project.model';

@Component({
  selector: 'app-workflow-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>
            <i class="fi fi-rr-settings-sliders text-cyan"></i>
            <span>Configure Status Workflow</span>
          </h3>
          <button class="btn btn-ghost btn-sm" (click)="close.emit()">
            <i class="fi fi-rr-cross"></i>
          </button>
        </div>

        <p class="modal-subtext">
          Customize status columns for <strong>{{ project ? project.name : 'Default Workspace' }}</strong>.
          The default workflow is: <code>Backlog → To Do → In Progress → Review → Done</code>.
        </p>

        <div class="columns-list">
          @for (col of columns; track col.id; let i = $index) {
            <div class="column-item">
              <span class="drag-handle"><i class="fi fi-rr-menu-dots-vertical"></i></span>

              <input
                type="color"
                class="color-picker-inline"
                [(ngModel)]="col.color"
              />

              <input
                type="text"
                class="form-input col-name-input"
                [(ngModel)]="col.name"
                placeholder="Column Name"
              />

              <div class="col-actions">
                @if (i > 0) {
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="moveColumn(i, -1)">
                    <i class="fi fi-rr-angle-up"></i>
                  </button>
                }
                @if (i < columns.length - 1) {
                  <button type="button" class="btn btn-ghost btn-sm btn-icon" (click)="moveColumn(i, 1)">
                    <i class="fi fi-rr-angle-down"></i>
                  </button>
                }
                @if (columns.length > 1) {
                  <button type="button" class="btn btn-ghost btn-sm btn-icon btn-danger" (click)="removeColumn(i)">
                    <i class="fi fi-rr-trash"></i>
                  </button>
                }
              </div>
            </div>
          }
        </div>

        <!-- Add Column Row -->
        <div class="add-col-row">
          <input
            type="text"
            class="form-input new-col-input"
            placeholder="New status column name..."
            [(ngModel)]="newColumnName"
            (keyup.enter)="addColumn()"
          />
          <button type="button" class="btn btn-secondary btn-sm" (click)="addColumn()">
            <i class="fi fi-rr-plus"></i> Add Column
          </button>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-ghost btn-sm" (click)="resetToDefault()">
            <i class="fi fi-rr-refresh"></i> Reset to Default
          </button>

          <div class="right-buttons">
            <button type="button" class="btn btn-secondary" (click)="close.emit()">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" (click)="saveWorkflow()">
              <i class="fi fi-rr-check"></i> Save Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-subtext {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1.25rem;
      line-height: 1.45;
    }
    .modal-subtext code {
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.1);
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-sm);
    }
    .columns-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 0.25rem;
      margin-bottom: 1rem;
    }
    .column-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--bg-surface);
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }
    .drag-handle {
      color: var(--text-subtle);
    }
    .color-picker-inline {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      cursor: pointer;
    }
    .col-name-input {
      flex: 1;
      padding: 0.35rem 0.6rem;
      font-size: 0.875rem;
    }
    .col-actions {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }
    .add-col-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .new-col-input {
      flex: 1;
      font-size: 0.85rem;
    }
    .modal-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
    }
    .right-buttons {
      display: flex;
      gap: 0.75rem;
    }
  `]
})
export class WorkflowModalComponent implements OnInit {
  @Input() project: Project | null = null;
  @Output() close = new EventEmitter<void>();

  columns: WorkflowColumn[] = [];
  newColumnName = '';

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    if (this.project && this.project.workflow_columns && this.project.workflow_columns.length > 0) {
      this.columns = JSON.parse(JSON.stringify(this.project.workflow_columns));
    } else {
      this.columns = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_COLUMNS));
    }
  }

  addColumn() {
    if (!this.newColumnName.trim()) return;
    const name = this.newColumnName.trim();
    const id = name.toLowerCase().replace(/\s+/g, '_');
    this.columns.push({
      id,
      name,
      position: this.columns.length,
      color: '#06b6d4'
    });
    this.newColumnName = '';
  }

  removeColumn(index: number) {
    this.columns.splice(index, 1);
  }

  moveColumn(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= this.columns.length) return;
    const temp = this.columns[index];
    this.columns[index] = this.columns[target];
    this.columns[target] = temp;
  }

  resetToDefault() {
    this.columns = JSON.parse(JSON.stringify(DEFAULT_WORKFLOW_COLUMNS));
  }

  async saveWorkflow() {
    // Normalize position numbers
    const updatedCols = this.columns.map((col, idx) => ({
      ...col,
      position: idx
    }));

    if (this.project) {
      await this.projectService.updateProject(this.project.id, {
        workflow_columns: updatedCols
      });
    }

    this.close.emit();
  }
}
