import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { Task, TaskComment, Workflow } from '../../core/models/project.model';

@Component({
  selector: 'app-task-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal-card detail-card" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="detail-header">
          <div class="header-type-row">
            <span class="badge" [class]="'badge-' + task.type">
              <i [class]="getTypeIcon(task.type)"></i> {{ task.type }}
            </span>
            <span class="badge" [class]="'badge-' + task.priority">
              {{ task.priority }} priority
            </span>
            @if (getProjectName(task.project_id); as projName) {
              <span class="project-tag">
                <i class="fi fi-rr-folder"></i> {{ projName }}
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
            <h2 class="task-title">{{ task.title }}</h2>

            <div class="description-box">
              <h4 class="section-heading"><i class="fi fi-rr-align-left"></i> Description</h4>
              <p class="desc-text">{{ task.description || 'No description provided for this task.' }}</p>
            </div>

            <!-- Labels -->
            @if (task.labels && task.labels.length > 0) {
              <div class="labels-box">
                <h4 class="section-heading"><i class="fi fi-rr-tags"></i> Labels</h4>
                <div class="chips font-mono">
                  @for (l of task.labels; track l) {
                    <span class="chip">#{{ l }}</span>
                  }
                </div>
              </div>
            }

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
              <select
                class="form-select status-select"
                [ngModel]="task.status"
                (ngModelChange)="updateStatus($event)"
              >
                @for (col of getAvailableStatuses(); track col.id) {
                  <option [value]="col.name">{{ col.name }}</option>
                }
              </select>
            </div>

            <div class="meta-group">
              <label class="meta-label">Assignee</label>
              <div class="meta-val">
                <i class="fi fi-rr-user text-cyan"></i> {{ task.assignee || 'Self' }}
              </div>
            </div>

            <div class="meta-group">
              <label class="meta-label">Due Date</label>
              <div class="meta-val">
                <i class="fi fi-rr-calendar"></i> {{ task.due_date || 'No due date' }}
              </div>
            </div>

            <div class="meta-group">
              <label class="meta-label">Created</label>
              <div class="meta-subval">{{ formatDate(task.created_at) }}</div>
            </div>

            <div class="meta-actions">
              <button class="btn btn-secondary btn-sm full-width" (click)="editTask.emit(task)">
                <i class="fi fi-rr-edit"></i> Edit Task
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
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .project-tag {
      font-size: 0.8rem;
      color: var(--accent-cyan);
      display: flex;
      align-items: center;
      gap: 0.3rem;
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
    .task-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .section-heading {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
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
    .chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .chip {
      font-size: 0.75rem;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.15);
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-sm);
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

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService,
    private workflowService: WorkflowService
  ) {}

  async ngOnInit() {
    if (this.task) {
      const list = await this.taskService.loadCommentsForTask(this.task.id);
      this.comments.set(list);
    }
  }

  getAvailableStatuses(): Workflow[] {
    return this.workflowService.getWorkflowsForProject(this.task?.project_id);
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

  async updateStatus(newStatus: string) {
    const available = this.getAvailableStatuses();
    const wf = available.find(w => w.name === newStatus);

    const updated = await this.taskService.updateTask(this.task.id, {
      status: newStatus,
      workflow_id: wf?.id
    });
    if (updated) this.task = updated;
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
