import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { ProjectModalComponent } from '../../shared/components/project-modal';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectModalComponent],
  template: `
    <div class="projects-page-container">
      <!-- Header Banner -->
      <div class="projects-page-header glass-panel">
        <div class="header-main">
          <div class="header-title">
            <h2>
              <i class="fi fi-rr-folder text-cyan"></i> Developer Workspaces
            </h2>
            <p class="subtitle">Manage project goals, progress metrics, labels, and GitHub repositories</p>
          </div>

          <div class="header-actions">
            <button class="btn btn-primary" (click)="openCreateModal()">
              <i class="fi fi-rr-plus"></i> Create Project
            </button>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="controls-bar">
          <div class="status-tabs">
            @for (tab of statusTabs; track tab.id) {
              <button
                class="tab-btn"
                [class.active]="selectedStatus() === tab.id"
                (click)="selectedStatus.set(tab.id)"
              >
                <span>{{ tab.label }}</span>
                <span class="tab-count">{{ getStatusCount(tab.id) }}</span>
              </button>
            }
          </div>

          <div class="filters-right">
            <div class="search-box">
              <i class="fi fi-rr-search search-icon"></i>
              <input
                type="text"
                class="form-input search-input"
                placeholder="Search name, labels, description..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="projects-layout">
        <!-- Projects Grid Feed -->
        <div class="projects-grid">
          @if (filteredProjects().length === 0) {
            <div class="empty-state glass-panel">
              <i class="fi fi-rr-folder-open empty-icon"></i>
              <h3>No projects match your filter</h3>
              <p>Create a new developer project or adjust your status search filters.</p>
              <button class="btn btn-primary btn-sm" (click)="openCreateModal()">
                <i class="fi fi-rr-plus"></i> Create Project
              </button>
            </div>
          } @else {
            @for (p of filteredProjects(); track p.id) {
              <div
                class="project-card glass-panel"
                [class.selected]="projectService.activeProject()?.id === p.id"
                [style.border-top-color]="p.color"
                (click)="projectService.activeProject.set(p)"
              >
                <!-- Card Header -->
                <div class="card-header">
                  <div class="title-with-color">
                    <span class="color-badge" [style.background-color]="p.color"></span>
                    <h3>{{ p.name }}</h3>
                  </div>

                  <div class="badges-row">
                    <span class="badge-status" [class]="p.status">
                      {{ p.status }}
                    </span>
                  </div>
                </div>

                <!-- Description -->
                <p class="card-description">
                  {{ p.description || 'No project description provided.' }}
                </p>

                <!-- Labels List -->
                @if (p.labels && p.labels.length > 0) {
                  <div class="labels-container">
                    @for (lbl of p.labels; track lbl) {
                      <span class="label-chip">#{{ lbl }}</span>
                    }
                  </div>
                }

                <!-- Project Progress Bar -->
                <div class="progress-section">
                  <div class="progress-info">
                    <span class="progress-label">Completion Progress</span>
                    <span class="progress-val">
                      {{ projectService.getProjectProgress(p.id).completed }} / {{ projectService.getProjectProgress(p.id).total }} Tasks ({{ projectService.getProjectProgress(p.id).percent }}%)
                    </span>
                  </div>
                  <div class="progress-track">
                    <div
                      class="progress-fill"
                      [style.width]="projectService.getProjectProgress(p.id).percent + '%'"
                      [style.background-color]="p.color"
                    ></div>
                  </div>
                </div>

                <!-- Footer & Actions -->
                <div class="card-footer" (click)="$event.stopPropagation()">
                  <div class="repo-area">
                    @if (p.repository_url) {
                      <a [href]="p.repository_url" target="_blank" class="repo-link btn btn-ghost btn-sm">
                        <i class="fi fi-brands-github"></i> Repository
                      </a>
                    }
                  </div>

                  <div class="action-buttons">
                    <button
                      class="btn btn-ghost btn-sm btn-icon"
                      (click)="openEditModal(p)"
                      title="Edit Project"
                    >
                      <i class="fi fi-rr-edit"></i>
                    </button>

                    <button
                      class="btn btn-ghost btn-sm btn-icon"
                      (click)="projectService.archiveProject(p.id)"
                      [title]="p.status === 'archived' ? 'Restore Project' : 'Archive Project'"
                    >
                      <i [class]="p.status === 'archived' ? 'fi fi-rr-refresh' : 'fi fi-rr-box-alt'"></i>
                    </button>

                    <button
                      class="btn btn-ghost btn-sm btn-icon btn-danger"
                      (click)="confirmDeleteProject(p)"
                      title="Delete Project"
                    >
                      <i class="fi fi-rr-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Selected Project Recent Activity Sidebar -->
        @if (projectService.activeProject(); as activeP) {
          <aside class="activity-sidebar glass-panel">
            <div class="sidebar-header">
              <span class="color-dot" [style.background-color]="activeP.color"></span>
              <div>
                <h3>{{ activeP.name }} Overview</h3>
                <span class="subtext">Recent Activity Log</span>
              </div>
            </div>

            <div class="overview-stats">
              <div class="stat-box">
                <span class="stat-num">{{ projectService.getProjectProgress(activeP.id).total }}</span>
                <span class="stat-lbl">Total Tasks</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ projectService.getProjectProgress(activeP.id).completed }}</span>
                <span class="stat-lbl">Done</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ projectService.getProjectProgress(activeP.id).percent }}%</span>
                <span class="stat-lbl">Progress</span>
              </div>
            </div>

            <div class="activity-feed">
              <h4 class="feed-title">
                <i class="fi fi-rr-clock-three"></i> Activity Log
              </h4>

              @if (projectService.getProjectRecentActivity(activeP.id).length === 0) {
                <p class="no-activity">No recent activities logged for this project.</p>
              } @else {
                <div class="timeline">
                  @for (act of projectService.getProjectRecentActivity(activeP.id); track act.id) {
                    <div class="timeline-item">
                      <div class="timeline-badge"></div>
                      <div class="timeline-content">
                        <span class="act-action">{{ act.action }}</span>
                        <p class="act-desc">{{ act.description }}</p>
                        <span class="act-time">{{ formatDate(act.timestamp) }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </aside>
        }
      </div>

      <!-- Create / Edit Modal -->
      @if (showModal()) {
        <app-project-modal
          [projectToEdit]="editingProject()"
          (close)="closeModal()"
        ></app-project-modal>
      }
    </div>
  `,
  styles: [`
    .projects-page-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    .projects-page-header {
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
    .header-title h2 {
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
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
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
    .filters-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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
      width: 240px;
      font-size: 0.825rem;
    }
    .projects-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 1.5rem;
    }
    @media (max-width: 1024px) {
      .projects-layout {
        grid-template-columns: 1fr;
      }
    }
    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }
    .project-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      border-top: 3px solid var(--accent-cyan);
      background: var(--bg-surface);
      cursor: pointer;
      transition: var(--transition);
    }
    .project-card:hover {
      border-color: var(--border-active);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .project-card.selected {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .title-with-color {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .color-badge {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .title-with-color h3 {
      font-size: 1.05rem;
      font-weight: 600;
    }
    .badges-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .badge-status {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-status.archived {
      background: rgba(156, 163, 175, 0.15);
      color: var(--text-muted);
      border-color: rgba(156, 163, 175, 0.3);
    }
    .card-description {
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .labels-container {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .label-chip {
      font-size: 0.725rem;
      color: var(--accent-cyan);
      background: rgba(6, 182, 212, 0.1);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      margin-top: 0.25rem;
    }
    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .progress-track {
      width: 100%;
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
      margin-top: 0.25rem;
    }
    .repo-link {
      font-size: 0.8rem;
    }
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: auto;
    }
    .btn-danger:hover {
      color: var(--accent-rose);
      background: rgba(244, 63, 94, 0.15);
    }
    .activity-sidebar {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: 0.75rem;
    }
    .color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .sidebar-header h3 {
      font-size: 1rem;
    }
    .subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .overview-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .stat-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.6rem;
      text-align: center;
      display: flex;
      flex-direction: column;
    }
    .stat-num {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--accent-cyan);
    }
    .stat-lbl {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .feed-title {
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.75rem;
    }
    .no-activity {
      font-size: 0.8rem;
      color: var(--text-subtle);
    }
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      position: relative;
      padding-left: 0.75rem;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 3px;
      top: 4px;
      bottom: 4px;
      width: 2px;
      background: var(--border-subtle);
    }
    .timeline-item {
      position: relative;
      display: flex;
      gap: 0.75rem;
    }
    .timeline-badge {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent-cyan);
      position: absolute;
      left: -11px;
      top: 4px;
    }
    .timeline-content {
      display: flex;
      flex-direction: column;
    }
    .act-action {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-main);
    }
    .act-desc {
      font-size: 0.775rem;
      color: var(--text-muted);
    }
    .act-time {
      font-size: 0.7rem;
      color: var(--text-subtle);
    }
    .empty-state {
      padding: 3rem 1.5rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
    }
    .empty-icon {
      font-size: 2.5rem;
      color: var(--accent-cyan);
    }
  `]
})
export class ProjectsComponent {
  selectedStatus = signal<string>('all');
  searchQuery = signal<string>('');

  showModal = signal<boolean>(false);
  editingProject = signal<Project | null>(null);

  statusTabs = [
    { id: 'all', label: 'All Projects' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
    { id: 'archived', label: 'Archived' }
  ];

  constructor(public projectService: ProjectService) {}

  getStatusCount(statusId: string): number {
    const list = this.projectService.projects();
    if (statusId === 'all') return list.length;
    return list.filter(p => p.status === statusId).length;
  }

  filteredProjects = computed(() => {
    const list = this.projectService.projects();
    const status = this.selectedStatus();
    const q = this.searchQuery().toLowerCase().trim();

    return list.filter(p => {
      if (status !== 'all' && p.status !== status) return false;
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesLabel = p.labels?.some(l => l.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesLabel) return false;
      }
      return true;
    });
  });

  openCreateModal() {
    this.editingProject.set(null);
    this.showModal.set(true);
  }

  openEditModal(project: Project) {
    this.editingProject.set(project);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingProject.set(null);
  }

  async confirmDeleteProject(project: Project) {
    if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      await this.projectService.deleteProject(project.id);
    }
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
