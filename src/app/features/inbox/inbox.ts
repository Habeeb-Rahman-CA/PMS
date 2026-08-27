import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdeaService } from '../../core/services/idea.service';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { Idea, IdeaStatus } from '../../core/models/idea.model';
import { Project, Task } from '../../core/models/project.model';
import { ProjectModalComponent } from '../../shared/components/project-modal';
import { TaskModalComponent } from '../../shared/components/task-modal';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProjectModalComponent,
    TaskModalComponent
  ],
  template: `
    <div class="inbox-page-container">
      <!-- Header Banner -->
      <div class="inbox-header glass-panel">
        <div class="header-main">
          <div>
            <h2>
              <i class="fi fi-rr-lightbulb text-amber"></i> Ideas & Scratchpad Inbox
            </h2>
            <p class="subtitle">Quickly capture feature concepts and project ideas separate from active work</p>
          </div>

          <div class="header-stats">
            <span class="stat-badge amber">
              <i class="fi fi-rr-inbox"></i> {{ activeInboxCount() }} Active Ideas
            </span>
            <span class="stat-badge emerald">
              <i class="fi fi-rr-check"></i> {{ convertedCount() }} Converted
            </span>
          </div>
        </div>
      </div>

      <!-- 1. Quick Capture Input Box -->
      <div class="quick-capture-card glass-panel">
        <div class="card-title">
          <i class="fi fi-rr-bolt text-cyan"></i>
          <h3>Quick Idea Capture</h3>
        </div>

        <div class="capture-form">
          <div class="form-row">
            <input
              type="text"
              class="form-input idea-title-input"
              placeholder="What's your project idea or feature concept?"
              [(ngModel)]="newTitle"
              (keyup.enter)="quickAddIdea()"
            />
          </div>

          <div class="form-row">
            <textarea
              class="form-textarea idea-desc-input"
              rows="2"
              placeholder="Add optional notes, scope thoughts, or links..."
              [(ngModel)]="newDescription"
            ></textarea>
          </div>

          <div class="form-footer-row">
            <input
              type="text"
              class="form-input tags-input"
              placeholder="Tags (comma separated e.g. cli, ai, saas)"
              [(ngModel)]="newTagsStr"
            />

            <button
              class="btn btn-primary"
              [disabled]="!newTitle.trim()"
              (click)="quickAddIdea()"
            >
              <i class="fi fi-rr-plus"></i> Save Idea to Inbox
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Status Filter Tabs & Search -->
      <div class="controls-bar glass-panel">
        <div class="status-tabs">
          @for (tab of tabs; track tab.id) {
            <button
              class="tab-btn"
              [class.active]="selectedTab() === tab.id"
              (click)="selectedTab.set(tab.id)"
            >
              <span>{{ tab.label }}</span>
              <span class="tab-count">{{ getTabCount(tab.id) }}</span>
            </button>
          }
        </div>

        <div class="search-box">
          <i class="fi fi-rr-search search-icon"></i>
          <input
            type="text"
            class="form-input search-input"
            placeholder="Filter ideas..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
          />
        </div>
      </div>

      <!-- 3. Ideas Grid Feed -->
      <div class="ideas-grid">
        @if (filteredIdeas().length === 0) {
          <div class="empty-state glass-panel">
            <i class="fi fi-rr-inbox empty-icon"></i>
            <h3>No ideas in this view</h3>
            <p>Use the Quick Idea Capture above to dump concepts onto your scratchpad.</p>
          </div>
        } @else {
          @for (idea of filteredIdeas(); track idea.id) {
            <div class="idea-card glass-panel" [class.converted-card]="idea.status !== 'inbox'">
              <!-- Card Top -->
              <div class="card-header">
                <div class="title-wrap">
                  <span class="lightbulb-dot" [class.active-dot]="idea.status === 'inbox'">
                    <i class="fi fi-rr-lightbulb"></i>
                  </span>
                  <h3>{{ idea.title }}</h3>
                </div>

                <div class="status-badge-wrap">
                  @if (idea.status === 'converted_project') {
                    <span class="badge-status emerald">Converted to Project</span>
                  } @else if (idea.status === 'converted_task') {
                    <span class="badge-status cyan">Converted to Task</span>
                  } @else if (idea.status === 'archived') {
                    <span class="badge-status muted">Archived</span>
                  } @else {
                    <span class="badge-status amber">Inbox</span>
                  }
                </div>
              </div>

              <!-- Body Description -->
              <p class="idea-desc">{{ idea.description || 'No detailed description added.' }}</p>

              <!-- Tags -->
              @if (idea.tags && idea.tags.length > 0) {
                <div class="tags-list font-mono">
                  @for (t of idea.tags; track t) {
                    <span class="tag-chip">#{{ t }}</span>
                  }
                </div>
              }

              <!-- Card Actions Toolbar -->
              <div class="card-actions">
                <span class="created-time">
                  <i class="fi fi-rr-clock"></i> {{ formatDate(idea.created_at) }}
                </span>

                <div class="action-buttons">
                  @if (idea.status === 'inbox') {
                    <!-- Convert to Project Button -->
                    <button
                      class="btn btn-secondary btn-xs text-cyan"
                      (click)="initiateConvertProject(idea)"
                      title="Convert idea into a full project"
                    >
                      <i class="fi fi-rr-folder-add"></i> Convert to Project
                    </button>

                    <!-- Convert to Task Button -->
                    <button
                      class="btn btn-secondary btn-xs text-emerald"
                      (click)="initiateConvertTask(idea)"
                      title="Convert idea into a task"
                    >
                      <i class="fi fi-rr-list-check"></i> Convert to Task
                    </button>

                    <button
                      class="btn btn-ghost btn-xs btn-icon"
                      (click)="archiveIdea(idea.id)"
                      title="Archive Idea"
                    >
                      <i class="fi fi-rr-box-alt"></i>
                    </button>
                  } @else {
                    <button
                      class="btn btn-ghost btn-xs text-muted"
                      (click)="restoreIdea(idea.id)"
                      title="Restore to Inbox"
                    >
                      <i class="fi fi-rr-refresh"></i> Restore
                    </button>
                  }

                  <button
                    class="btn btn-ghost btn-xs btn-icon btn-danger"
                    (click)="deleteIdea(idea.id)"
                    title="Delete Idea"
                  >
                    <i class="fi fi-rr-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Conversion Modals -->
      @if (showProjectModal()) {
        <app-project-modal
          [projectToEdit]="prefilledProject()"
          (close)="onProjectModalClose($event)"
        ></app-project-modal>
      }

      @if (showTaskModal()) {
        <app-task-modal
          [defaultProjectId]="projectService.projects()[0]?.id || ''"
          (close)="onTaskModalClose($event)"
        ></app-task-modal>
      }
    </div>
  `,
  styles: [`
    .inbox-page-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .inbox-header {
      padding: 1.25rem 1.5rem;
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
    .subtitle {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 0.2rem;
    }
    .header-stats {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .stat-badge {
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .stat-badge.amber {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .stat-badge.emerald {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* Quick Capture Card */
    .quick-capture-card {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-left: 4px solid var(--accent-cyan);
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card-title h3 {
      font-size: 1.05rem;
      font-weight: 600;
    }
    .capture-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .idea-title-input {
      font-size: 0.95rem;
      font-weight: 500;
    }
    .idea-desc-input {
      font-size: 0.85rem;
      resize: vertical;
    }
    .form-footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .tags-input {
      flex: 1;
      max-width: 450px;
      font-size: 0.825rem;
    }

    /* Controls Bar */
    .controls-bar {
      padding: 0.75rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .status-tabs {
      display: flex;
      gap: 0.4rem;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
    }
    .tab-btn:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }
    .tab-btn.active {
      background: var(--bg-surface-active);
      color: var(--accent-cyan);
      border-color: rgba(6, 182, 212, 0.3);
    }
    .tab-count {
      font-size: 0.725rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
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

    /* Ideas Grid */
    .ideas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.25rem;
    }
    .idea-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      background: var(--bg-surface);
      transition: var(--transition);
    }
    .idea-card:hover {
      border-color: var(--border-active);
      transform: translateY(-2px);
    }
    .idea-card.converted-card {
      opacity: 0.75;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .title-wrap {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .lightbulb-dot {
      color: var(--text-subtle);
      font-size: 1rem;
      margin-top: 0.1rem;
    }
    .lightbulb-dot.active-dot {
      color: var(--accent-amber);
    }
    .title-wrap h3 {
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.35;
    }
    .badge-status {
      font-size: 0.675rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      white-space: nowrap;
    }
    .badge-status.amber { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
    .badge-status.emerald { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); }
    .badge-status.cyan { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
    .badge-status.muted { background: rgba(156, 163, 175, 0.15); color: var(--text-muted); }

    .idea-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.45;
    }
    .tags-list {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .tag-chip {
      font-size: 0.7rem;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.1);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-sm);
    }
    .card-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      color: var(--text-subtle);
    }
    .created-time {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .btn-xs {
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
    }
    .text-cyan { color: var(--accent-cyan) !important; }
    .text-emerald { color: var(--accent-emerald) !important; }
    .btn-danger:hover {
      color: var(--accent-rose);
      background: rgba(244, 63, 94, 0.15);
    }

    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      grid-column: 1 / -1;
    }
    .empty-icon {
      font-size: 2.5rem;
      color: var(--accent-amber);
    }
  `]
})
export class InboxComponent {
  newTitle = '';
  newDescription = '';
  newTagsStr = '';

  selectedTab = signal<string>('inbox');
  searchQuery = signal<string>('');

  convertingIdea = signal<Idea | null>(null);
  showProjectModal = signal<boolean>(false);
  showTaskModal = signal<boolean>(false);

  prefilledProject = signal<Partial<Project> | null>(null);

  tabs = [
    { id: 'inbox', label: 'Inbox Ideas' },
    { id: 'converted', label: 'Converted' },
    { id: 'archived', label: 'Archived' },
    { id: 'all', label: 'All Ideas' }
  ];

  constructor(
    public ideaService: IdeaService,
    public projectService: ProjectService,
    public taskService: TaskService
  ) {}

  activeInboxCount = computed(() => {
    return this.ideaService.ideas().filter(i => i.status === 'inbox').length;
  });

  convertedCount = computed(() => {
    return this.ideaService.ideas().filter(i => i.status.startsWith('converted')).length;
  });

  filteredIdeas = computed(() => {
    const list = this.ideaService.ideas();
    const tab = this.selectedTab();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(idea => {
      if (tab === 'inbox' && idea.status !== 'inbox') return false;
      if (tab === 'converted' && !idea.status.startsWith('converted')) return false;
      if (tab === 'archived' && idea.status !== 'archived') return false;

      if (q) {
        const titleMatch = idea.title.toLowerCase().includes(q);
        const descMatch = idea.description?.toLowerCase().includes(q);
        const tagMatch = idea.tags?.some(t => t.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !tagMatch) return false;
      }

      return true;
    });
  });

  getTabCount(tabId: string): number {
    const list = this.ideaService.ideas();
    if (tabId === 'inbox') return list.filter(i => i.status === 'inbox').length;
    if (tabId === 'converted') return list.filter(i => i.status.startsWith('converted')).length;
    if (tabId === 'archived') return list.filter(i => i.status === 'archived').length;
    return list.length;
  }

  async quickAddIdea() {
    if (!this.newTitle.trim()) return;

    const tags = this.newTagsStr
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    await this.ideaService.createIdea(this.newTitle.trim(), this.newDescription.trim(), tags);

    this.newTitle = '';
    this.newDescription = '';
    this.newTagsStr = '';
  }

  initiateConvertProject(idea: Idea) {
    this.convertingIdea.set(idea);
    const slug = idea.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    this.prefilledProject.set({
      name: idea.title,
      slug: slug || 'new-project',
      description: idea.description,
      labels: idea.tags || ['idea']
    });
    this.showProjectModal.set(true);
  }

  onProjectModalClose(createdProject?: Project) {
    this.showProjectModal.set(false);
    const idea = this.convertingIdea();
    if (idea) {
      this.ideaService.markConverted(idea.id, 'project', createdProject?.id);
    }
    this.convertingIdea.set(null);
    this.prefilledProject.set(null);
  }

  initiateConvertTask(idea: Idea) {
    this.convertingIdea.set(idea);
    this.showTaskModal.set(true);
  }

  onTaskModalClose(createdTask?: Task) {
    this.showTaskModal.set(false);
    const idea = this.convertingIdea();
    if (idea) {
      this.ideaService.markConverted(idea.id, 'task', createdTask?.id);
    }
    this.convertingIdea.set(null);
  }

  archiveIdea(id: string) {
    this.ideaService.updateIdea(id, { status: 'archived' });
  }

  restoreIdea(id: string) {
    this.ideaService.updateIdea(id, { status: 'inbox' });
  }

  deleteIdea(id: string) {
    if (confirm('Delete this idea from your scratchpad?')) {
      this.ideaService.deleteIdea(id);
    }
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
