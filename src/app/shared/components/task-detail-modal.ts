import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { TaskShareService } from '../../core/services/task-share.service';
import { Task, TaskComment, TaskPriority, TaskType, Workflow } from '../../core/models/project.model';
import { getTaskKey } from '../../core/utils/task-key.util';
import { SelectComponent, SelectOption } from './select';
import { DatePickerComponent } from './date-picker';

@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectComponent, DatePickerComponent],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card detail-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="detail-header">
          <div class="header-type-row font-mono">
            <span class="badge" [class]="'badge-' + task.type">
              <i [class]="getTypeIcon(task.type)"></i> {{ task.type }}
            </span>
            <span
              class="task-key-badge font-mono clickable-key"
              (click)="taskShareService.copyTaskShareLink(task, $event)"
              title="Click to copy share link"
            >
              <i class="fi fi-rr-link link-icon"></i> {{ getTaskKeyStr(task) }}
            </span>
            <span class="priority-badge" [class]="(task.priority || 'medium').toLowerCase()">
              {{ task.priority || 'medium' }}
            </span>
            @if (getProjectName(task.project_id); as projName) {
              <span class="project-pill font-mono">
                <i class="fi fi-rr-folder text-amber"></i> {{ projName }}
              </span>
            }
          </div>

          <button class="btn btn-ghost btn-sm" (click)="close.emit()">
            <i class="fi fi-rr-cross"></i>
          </button>
        </div>

        <div class="detail-body">
          <!-- Main Content Left Column -->
          <div class="main-col">
            <!-- Inline Title Edit -->
            @if (isEditingTitle()) {
              <div class="inline-title-edit">
                <input
                  id="inline-title-input"
                  type="text"
                  class="form-input inline-title-input font-mono"
                  [(ngModel)]="titleInputText"
                  (keydown.enter)="saveTitle()"
                  (keydown.escape)="cancelTitleEdit()"
                  (blur)="saveTitle()"
                />
              </div>
            } @else {
              <h2
                class="task-title editable-field"
                (dblclick)="startEditingTitle()"
                title="Double-click to edit title"
              >
                <span>{{ task.title }}</span>
                <i class="fi fi-rr-edit edit-hint-icon" (click)="startEditingTitle()" title="Edit title"></i>
              </h2>
            }

            <!-- Description Box -->
            <div class="description-box">
              <div class="section-heading-row">
                <h4 class="section-heading"><i class="fi fi-rr-align-left"></i> Description</h4>
                @if (!isEditingDesc()) {
                  <button class="btn-ghost-edit" (click)="startEditingDesc()" title="Edit description">
                    <i class="fi fi-rr-edit"></i> Edit
                  </button>
                }
              </div>

              @if (isEditingDesc()) {
                <div class="inline-desc-edit">
                  <textarea
                    id="inline-desc-input"
                    class="form-textarea inline-desc-textarea"
                    rows="4"
                    [(ngModel)]="descInputText"
                    placeholder="Add a detailed description..."
                  ></textarea>
                  <div class="inline-edit-btn-row">
                    <button class="btn btn-secondary btn-xs" (click)="cancelDescEdit()">Cancel</button>
                    <button class="btn btn-primary btn-xs" (click)="saveDesc()">Save Description</button>
                  </div>
                </div>
              } @else {
                <div
                  class="desc-text editable-field"
                  [class.empty-desc]="!task.description"
                  (dblclick)="startEditingDesc()"
                  title="Double-click to edit description"
                >
                  {{ task.description || 'No description provided for this task. Double-click or click Edit to add one.' }}
                </div>
              }
            </div>

            <!-- Labels Box -->
            <div class="labels-box">
              <div class="section-heading-row">
                <h4 class="section-heading"><i class="fi fi-rr-tags"></i> Labels</h4>
                @if (!isEditingLabels()) {
                  <button class="btn-ghost-edit" (click)="startEditingLabels()" title="Edit labels">
                    <i class="fi fi-rr-edit"></i> Edit
                  </button>
                }
              </div>

              @if (isEditingLabels()) {
                <div class="inline-labels-edit">
                  <input
                    id="inline-labels-input"
                    type="text"
                    class="form-input inline-labels-input font-mono"
                    [(ngModel)]="labelsInputText"
                    placeholder="Comma-separated labels, e.g. frontend, angular, bug"
                    (keydown.enter)="saveLabels()"
                    (keydown.escape)="cancelLabelsEdit()"
                    (blur)="saveLabels()"
                  />
                  <span class="input-hint font-mono">Press Enter or click outside to save</span>
                </div>
              } @else {
                <div
                  class="chips font-mono editable-field"
                  (dblclick)="startEditingLabels()"
                  title="Double-click to edit labels"
                >
                  @if (task.labels && task.labels.length > 0) {
                    @for (l of task.labels; track l) {
                      <span class="chip">#{{ l }}</span>
                    }
                  } @else {
                    <span class="no-labels-text">+ Double-click to add labels</span>
                  }
                </div>
              }
            </div>

            <!-- Comments & Discussion Section -->
            <div class="comments-section">
              <div class="comments-header">
                <h3 class="comments-heading">
                  <i class="fi fi-rr-comment-alt-middle text-cyan"></i> Task Comments
                  <span class="comment-count-badge">{{ comments().length }}</span>
                </h3>
              </div>

              <!-- New Comment Input Box -->
              <div class="add-comment-box">
                <textarea
                  class="form-textarea comment-input"
                  rows="2"
                  placeholder="Write a comment or update..."
                  [(ngModel)]="newCommentText"
                ></textarea>
                <div class="comment-btn-row">
                  <button
                    class="btn btn-primary btn-sm"
                    [disabled]="!newCommentText.trim()"
                    (click)="submitComment()"
                  >
                    <i class="fi fi-rr-paper-plane"></i> Post Comment
                  </button>
                </div>
              </div>

              <!-- Lightweight Comments List -->
              <div class="comments-list">
                @if (comments().length === 0) {
                  <div class="empty-comments">
                    <i class="fi fi-rr-comment-slash"></i>
                    <span>No comments yet. Post the first update above!</span>
                  </div>
                } @else {
                  @for (c of comments(); track c.id) {
                    <div class="comment-item glass-panel">
                      <div class="comment-avatar">
                        <i class="fi fi-rr-user"></i>
                      </div>

                      <div class="comment-content">
                        <!-- Comment Header & Actions -->
                        <div class="comment-meta">
                          <div class="meta-left">
                            <span class="author">{{ c.author_name }}</span>
                            <span class="time" [title]="c.created_at">
                              <i class="fi fi-rr-clock"></i> {{ formatDate(c.created_at) }}
                              @if (c.updated_at) {
                                <span class="edited-tag">(edited)</span>
                              }
                            </span>
                          </div>

                          <!-- Actions: Edit & Delete -->
                          <div class="comment-actions">
                            @if (editingCommentId() !== c.id) {
                              <button
                                class="btn-action-icon"
                                (click)="startEditingComment(c)"
                                title="Edit comment"
                              >
                                <i class="fi fi-rr-edit"></i>
                              </button>

                              <button
                                class="btn-action-icon text-rose"
                                (click)="confirmDeleteComment(c.id)"
                                title="Delete comment"
                              >
                                <i class="fi fi-rr-trash"></i>
                              </button>
                            }
                          </div>
                        </div>

                        <!-- Inline Edit or Read Mode -->
                        @if (editingCommentId() === c.id) {
                          <div class="inline-edit-box">
                            <textarea
                              class="form-textarea edit-textarea"
                              rows="2"
                              [(ngModel)]="editText"
                            ></textarea>
                            <div class="edit-btn-row">
                              <button
                                class="btn btn-secondary btn-xs"
                                (click)="cancelCommentEdit()"
                              >
                                Cancel
                              </button>
                              <button
                                class="btn btn-primary btn-xs"
                                [disabled]="!editText.trim()"
                                (click)="saveCommentEdit(c.id)"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        } @else {
                          <p class="text">{{ c.content }}</p>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </div>

          <!-- Metadata Sidebar Right Column -->
          <div class="meta-col glass-panel">
            <div class="meta-group">
              <label class="meta-label">Status</label>
              <app-select
                [options]="statusOptions"
                [value]="task.status"
                (valueChange)="updateStatus($event)"
                placeholder="Select status..."
              ></app-select>
            </div>

            <div class="meta-group">
              <label class="meta-label">Issue Type</label>
              <app-select
                [options]="typeOptions"
                [value]="task.type"
                (valueChange)="updateType($event)"
                placeholder="Select type..."
              ></app-select>
            </div>

            <div class="meta-group">
              <label class="meta-label">Priority</label>
              <app-select
                [options]="priorityOptions"
                [value]="task.priority || 'medium'"
                (valueChange)="updatePriority($event)"
                placeholder="Select priority..."
              ></app-select>
            </div>

            <div class="meta-group">
              <label class="meta-label">Assignee</label>
              <input
                type="text"
                class="form-input meta-input font-mono"
                [ngModel]="task.assignee || ''"
                (blur)="updateAssignee($event)"
                (keydown.enter)="updateAssignee($event)"
                placeholder="Assignee name..."
              />
            </div>

            <div class="meta-group">
              <label class="meta-label">Due Date</label>
              <app-date-picker
                [value]="task.due_date || ''"
                (valueChange)="updateDueDate($event)"
                placeholder="Set due date..."
              ></app-date-picker>
            </div>

            <div class="meta-group">
              <label class="meta-label">Created</label>
              <div class="meta-subval font-mono">{{ formatDate(task.created_at) }}</div>
            </div>

            <div class="meta-actions">
              <button class="btn btn-secondary btn-sm full-width" (click)="taskShareService.copyTaskShareLink(task, $event)">
                <i class="fi fi-rr-share"></i> Copy Share Link
              </button>
              <button class="btn btn-ghost btn-sm btn-danger full-width" (click)="deleteTask()">
                <i class="fi fi-rr-trash"></i> Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-card {
      max-width: 850px;
    }
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .header-type-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .task-key-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
    }
    .priority-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .priority-badge.urgent { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .priority-badge.high { background: #fef3c7; color: #d97706; border-color: #fcd34d; }
    .priority-badge.medium { background: #e0f2fe; color: #0284c7; border-color: #7dd3fc; }
    .priority-badge.low { background: #f3f4f6; color: #4b5563; border-color: #d1d5db; }

    .project-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      padding: 0.15rem 0.55rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-medium);
      border-radius: var(--radius-xs);
      color: var(--text-main);
      font-weight: 600;
    }
    .detail-body {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .detail-body {
        grid-template-columns: 1fr;
      }
    }
    .main-col {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .section-heading-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }
    .section-heading {
      font-size: 0.875rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-ghost-edit {
      background: transparent;
      border: none;
      color: var(--text-subtle);
      font-size: 0.75rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.4rem;
      border-radius: var(--radius-xs);
      transition: var(--transition);
    }
    .btn-ghost-edit:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }
    .editable-field {
      cursor: pointer;
      position: relative;
      transition: var(--transition);
    }
    .editable-field:hover {
      outline: 1px dashed var(--accent-cyan);
      outline-offset: 2px;
      border-radius: var(--radius-xs);
    }
    .task-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .task-title.editable-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.2rem 0.4rem;
      border-radius: var(--radius-xs);
    }
    .edit-hint-icon {
      font-size: 0.9rem;
      color: var(--text-subtle);
      opacity: 0;
      transition: var(--transition);
    }
    .task-title.editable-field:hover .edit-hint-icon {
      opacity: 0.8;
      color: var(--accent-cyan);
    }
    .inline-title-edit {
      width: 100%;
    }
    .inline-title-input {
      font-size: 1.25rem;
      font-weight: 700;
      padding: 0.35rem 0.6rem;
      width: 100%;
    }
    .desc-text {
      font-size: 0.9rem;
      color: var(--text-main);
      line-height: 1.55;
      background: var(--bg-canvas);
      padding: 0.85rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }
    .empty-desc {
      color: var(--text-subtle) !important;
      font-style: italic;
    }
    .inline-desc-edit {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .inline-desc-textarea {
      font-size: 0.875rem;
      line-height: 1.5;
    }
    .inline-edit-btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
    }
    .chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      padding: 0.2rem;
    }
    .chip {
      font-size: 0.75rem;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.15);
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-sm);
    }
    .no-labels-text {
      font-size: 0.775rem;
      color: var(--text-subtle);
      font-style: italic;
    }
    .inline-labels-edit {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .inline-labels-input {
      font-size: 0.825rem;
      padding: 0.35rem 0.5rem;
    }
    .input-hint {
      font-size: 0.7rem;
      color: var(--text-subtle);
    }
    .meta-input {
      font-size: 0.825rem;
      padding: 0.35rem 0.5rem;
      height: 32px;
    }
    .comments-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .comments-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .comments-heading {
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .comment-count-badge {
      font-size: 0.725rem;
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
    }
    .add-comment-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .comment-input {
      font-size: 0.85rem;
      resize: vertical;
    }
    .comment-btn-row {
      display: flex;
      justify-content: flex-end;
    }
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .empty-comments {
      padding: 1.5rem 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      color: var(--text-subtle);
      font-size: 0.825rem;
      border: 1px dashed var(--border-subtle);
      border-radius: var(--radius-md);
    }
    .comment-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem;
      background: var(--bg-surface);
    }
    .comment-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(6, 182, 212, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-cyan);
      font-size: 0.85rem;
      flex-shrink: 0;
    }
    .comment-content {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex: 1;
    }
    .comment-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.775rem;
    }
    .meta-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .author {
      font-weight: 600;
      color: var(--text-main);
    }
    .time {
      color: var(--text-subtle);
      font-size: 0.725rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .edited-tag {
      font-style: italic;
      color: var(--text-subtle);
      opacity: 0.8;
    }
    .comment-actions {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .btn-action-icon {
      background: transparent;
      border: none;
      color: var(--text-subtle);
      cursor: pointer;
      padding: 0.15rem 0.35rem;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      transition: var(--transition);
    }
    .btn-action-icon:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }
    .text-rose { color: var(--accent-rose) !important; }
    .text-rose:hover { background: rgba(244, 63, 94, 0.15) !important; }

    .text {
      font-size: 0.875rem;
      color: var(--text-main);
      line-height: 1.45;
      white-space: pre-wrap;
    }
    .inline-edit-box {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-top: 0.2rem;
    }
    .edit-textarea {
      font-size: 0.85rem;
    }
    .edit-btn-row {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
    }
    .btn-xs {
      padding: 0.2rem 0.55rem;
      font-size: 0.75rem;
    }

    .meta-col {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: fit-content;
    }
    .meta-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .meta-label {
      font-size: 0.75rem;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-val {
      font-size: 0.875rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .meta-subval {
      font-size: 0.775rem;
      color: var(--text-muted);
    }
    .full-width {
      width: 100%;
    }
    .meta-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
    }
  `]
})
export class TaskDetailModalComponent implements OnInit {
  @Input() task!: Task;
  @Output() close = new EventEmitter<void>();
  @Output() editTask = new EventEmitter<Task>();

  comments = signal<TaskComment[]>([]);
  newCommentText = '';

  editingCommentId = signal<string | null>(null);
  editText = '';

  // Inline edit state
  isEditingTitle = signal<boolean>(false);
  titleInputText = '';

  isEditingDesc = signal<boolean>(false);
  descInputText = '';

  isEditingLabels = signal<boolean>(false);
  labelsInputText = '';

  priorityOptions: SelectOption[] = [
    { value: 'urgent', label: 'Urgent', icon: 'fi fi-rr-exclamation text-rose' },
    { value: 'high', label: 'High', icon: 'fi fi-rr-arrow-up text-amber' },
    { value: 'medium', label: 'Medium', icon: 'fi fi-rr-minus text-cyan' },
    { value: 'low', label: 'Low', icon: 'fi fi-rr-arrow-down text-subtle' }
  ];

  typeOptions: SelectOption[] = [
    { value: 'task', label: 'Task', icon: 'fi fi-rr-checkbox' },
    { value: 'story', label: 'User Story', icon: 'fi fi-rr-book-alt text-cyan' },
    { value: 'bug', label: 'Bug', icon: 'fi fi-rr-bug text-rose' },
    { value: 'epic', label: 'Epic', icon: 'fi fi-rr-rocket-takeoff text-amber' }
  ];

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private workflowService: WorkflowService,
    public taskShareService: TaskShareService
  ) { }

  async ngOnInit() {
    if (this.task) {
      const list = await this.taskService.loadCommentsForTask(this.task.id);
      this.comments.set(list);
    }
  }

  getAvailableStatuses(): Workflow[] {
    return this.workflowService.getWorkflowsForProject(this.task?.project_id);
  }

  get statusOptions(): SelectOption[] {
    return this.getAvailableStatuses().map(s => ({
      value: s.name,
      label: s.name
    }));
  }

  getTaskKeyStr(task?: Task): string {
    return getTaskKey(task, this.projectService.projects());
  }

  getProjectName(projectId?: string): string | null {
    if (!projectId) return null;
    const proj = this.projectService.projects().find(p => p.id === projectId);
    return proj ? proj.name : null;
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'story': return 'fi fi-rr-book-alt';
      case 'bug': return 'fi fi-rr-bug';
      case 'epic': return 'fi fi-rr-rocket-takeoff';
      default: return 'fi fi-rr-checkbox';
    }
  }

  // Inline Title Editing
  startEditingTitle() {
    this.titleInputText = this.task.title;
    this.isEditingTitle.set(true);
    setTimeout(() => {
      const el = document.getElementById('inline-title-input');
      if (el) (el as HTMLInputElement).focus();
    }, 50);
  }

  cancelTitleEdit() {
    this.isEditingTitle.set(false);
  }

  async saveTitle() {
    if (!this.isEditingTitle()) return;
    this.isEditingTitle.set(false);
    const trimmed = this.titleInputText.trim();
    if (trimmed && trimmed !== this.task.title) {
      const updated = await this.taskService.updateTask(this.task.id, { title: trimmed });
      if (updated) this.task = updated;
    }
  }

  // Inline Description Editing
  startEditingDesc() {
    this.descInputText = this.task.description || '';
    this.isEditingDesc.set(true);
    setTimeout(() => {
      const el = document.getElementById('inline-desc-input');
      if (el) (el as HTMLTextAreaElement).focus();
    }, 50);
  }

  cancelDescEdit() {
    this.isEditingDesc.set(false);
  }

  async saveDesc() {
    if (!this.isEditingDesc()) return;
    this.isEditingDesc.set(false);
    if (this.descInputText !== (this.task.description || '')) {
      const updated = await this.taskService.updateTask(this.task.id, { description: this.descInputText });
      if (updated) this.task = updated;
    }
  }

  // Inline Labels Editing
  startEditingLabels() {
    this.labelsInputText = (this.task.labels || []).join(', ');
    this.isEditingLabels.set(true);
    setTimeout(() => {
      const el = document.getElementById('inline-labels-input');
      if (el) (el as HTMLInputElement).focus();
    }, 50);
  }

  cancelLabelsEdit() {
    this.isEditingLabels.set(false);
  }

  async saveLabels() {
    if (!this.isEditingLabels()) return;
    this.isEditingLabels.set(false);
    const parsed = this.labelsInputText
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => l.length > 0);
    const updated = await this.taskService.updateTask(this.task.id, { labels: parsed });
    if (updated) this.task = updated;
  }

  // Metadata Field Handlers
  async updateStatus(newStatus: string) {
    const available = this.getAvailableStatuses();
    const wf = available.find(w => w.name === newStatus);

    const updated = await this.taskService.updateTask(this.task.id, {
      status: newStatus,
      workflow_id: wf?.id
    });
    if (updated) this.task = updated;
  }

  async updatePriority(newPriority: TaskPriority) {
    const updated = await this.taskService.updateTask(this.task.id, { priority: newPriority });
    if (updated) this.task = updated;
  }

  async updateType(newType: TaskType) {
    const updated = await this.taskService.updateTask(this.task.id, { type: newType });
    if (updated) this.task = updated;
  }

  async updateDueDate(newDueDate: string) {
    const updated = await this.taskService.updateTask(this.task.id, { due_date: newDueDate });
    if (updated) this.task = updated;
  }

  async updateAssignee(event: Event) {
    const val = (event.target as HTMLInputElement).value.trim();
    if (val !== (this.task.assignee || '')) {
      const updated = await this.taskService.updateTask(this.task.id, { assignee: val });
      if (updated) this.task = updated;
    }
  }

  async submitComment() {
    if (!this.newCommentText.trim()) return;
    const added = await this.taskService.addComment(this.task.id, this.newCommentText.trim());
    this.comments.update(list => [...list, added]);
    this.newCommentText = '';
  }

  startEditingComment(comment: TaskComment) {
    this.editingCommentId.set(comment.id);
    this.editText = comment.content;
  }

  cancelCommentEdit() {
    this.editingCommentId.set(null);
    this.editText = '';
  }

  async saveCommentEdit(commentId: string) {
    if (!this.editText.trim()) return;
    const updated = await this.taskService.updateComment(commentId, this.task.id, this.editText.trim());
    if (updated) {
      this.comments.update(list => list.map(c => c.id === commentId ? updated : c));
    }
    this.cancelCommentEdit();
  }

  async confirmDeleteComment(commentId: string) {
    if (confirm('Delete this comment?')) {
      await this.taskService.deleteComment(commentId, this.task.id);
      this.comments.update(list => list.filter(c => c.id !== commentId));
    }
  }

  async deleteTask() {
    if (confirm(`Delete issue "${this.task.title}"?`)) {
      await this.taskService.deleteTask(this.task.id);
      this.close.emit();
    }
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
