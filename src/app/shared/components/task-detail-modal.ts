import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { ProjectService } from '../../core/services/project.service';
import { Task, TaskComment, TaskStatus } from '../../core/models/project.model';

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
                <div class="chips">
                  @for (l of task.labels; track l) {
                    <span class="chip">#{{ l }}</span>
                  }
                </div>
              </div>
            }

            <!-- Comments & Discussion Section -->
            <div class="comments-section">
              <h3 class="comments-heading">
                <i class="fi fi-rr-comment-alt-middle"></i> Activity & Comments
              </h3>

              <div class="add-comment-box">
                <textarea
                  class="form-textarea"
                  rows="2"
                  placeholder="Add a comment or discussion note..."
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

              <!-- Comments List -->
              <div class="comments-list">
                @if (comments().length === 0) {
                  <p class="no-comments">No comments yet. Start the discussion above!</p>
                } @else {
                  @for (c of comments(); track c.id) {
                    <div class="comment-item">
                      <div class="comment-avatar">
                        <i class="fi fi-rr-user"></i>
                      </div>
                      <div class="comment-content">
                        <div class="comment-meta">
                          <span class="author">{{ c.author_name }}</span>
                          <span class="time">{{ formatDate(c.created_at) }}</span>
                        </div>
                        <p class="text">{{ c.content }}</p>
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
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
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
    .comments-heading {
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .add-comment-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .comment-btn-row {
      display: flex;
      justify-content: flex-end;
    }
    .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .no-comments {
      font-size: 0.825rem;
      color: var(--text-subtle);
      font-style: italic;
    }
    .comment-item {
      display: flex;
      gap: 0.75rem;
      background: var(--bg-surface);
      padding: 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }
    .comment-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--bg-surface-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-cyan);
    }
    .comment-content {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      flex: 1;
    }
    .comment-meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
    }
    .author {
      font-weight: 600;
      color: var(--text-main);
    }
    .time {
      color: var(--text-subtle);
    }
    .text {
      font-size: 0.85rem;
      color: var(--text-muted);
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

  constructor(
    private taskService: TaskService,
    private projectService: ProjectService
  ) {}

  async ngOnInit() {
    if (this.task) {
      const list = await this.taskService.loadCommentsForTask(this.task.id);
      this.comments.set(list);
    }
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

  async updateStatus(newStatus: TaskStatus) {
    const updated = await this.taskService.updateTask(this.task.id, { status: newStatus });
    if (updated) this.task = updated;
  }

  async submitComment() {
    if (!this.newCommentText.trim()) return;
    const added = await this.taskService.addComment(this.task.id, this.newCommentText.trim());
    this.comments.update(list => [...list, added]);
    this.newCommentText = '';
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
