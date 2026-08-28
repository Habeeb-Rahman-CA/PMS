import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Project, Task } from '../../core/models/project.model';
import { ProjectModalComponent } from '../../shared/components/project-modal';
import { TaskModalComponent } from '../../shared/components/task-modal';
import { TaskDetailModalComponent } from '../../shared/components/task-detail-modal';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProjectModalComponent,
    TaskModalComponent,
    TaskDetailModalComponent
  ],
  template: `
    <div class="compact-dashboard-container">
      <!-- 1. Header Bar: Selector & Actions -->
      <div class="dash-header paper-panel">
        <div class="header-left">
          <span class="badge-mono">02 PROJECTS</span>
          <h2>Projects Workspace</h2>

          <select
            class="form-select project-select font-mono"
            [ngModel]="selectedProjectId()"
            (ngModelChange)="onProjectSelect($event)"
          >
            <option value="all">All Projects</option>
            @for (p of projectService.projects(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>

          @if (activeProjectObj()?.repository_url; as repoUrl) {
            <a [href]="repoUrl" target="_blank" class="repo-badge btn btn-ghost btn-xs font-mono">
              <i class="fi fi-brands-github"></i> Repository
            </a>
          }
        </div>

        <div class="header-right">
          <button class="btn btn-secondary btn-sm" (click)="openCreateTaskModal()">
            <i class="fi fi-rr-plus"></i> New Task
          </button>
          <button class="btn btn-primary btn-sm" (click)="openCreateProjectModal()">
            <i class="fi fi-rr-folder-add"></i> New Project
          </button>
        </div>
      </div>

      <!-- 2. At-a-Glance 4 Stat Cards Row -->
      <div class="stats-row">
        <!-- Card 1: Overall Progress -->
        <div class="stat-card paper-panel">
          <div class="stat-header font-mono">
            <span class="stat-lbl">Overall Progress</span>
            <span class="badge-mono text-emerald" [class.complete]="dashboardProgress().percent === 100">
              {{ dashboardProgress().percent }}%
            </span>
          </div>
          <div class="mini-bar-track">
            <div
              class="mini-bar-fill"
              [style.width]="dashboardProgress().percent + '%'"
              [style.background-color]="activeProjectObj()?.color || 'var(--accent-cyan)'"
            ></div>
          </div>
          <div class="stat-sub font-mono">
            {{ dashboardProgress().completed }} of {{ dashboardProgress().total }} Tasks Completed
          </div>
        </div>

        <!-- Card 2: Status Breakdown -->
        <div class="stat-card paper-panel">
          <div class="stat-header font-mono">
            <span class="stat-lbl">Status Breakdown</span>
            <button class="btn btn-ghost btn-xs font-mono" (click)="workspaceService.setWorkspace('03 TASKS')">
              Board <i class="fi fi-rr-angle-small-right"></i>
            </button>
          </div>
          <div class="status-pills-row font-mono">
            @for (st of statusBreakdown(); track st.id) {
              <div class="mini-status-pill" [title]="st.name + ': ' + st.count">
                <span class="status-dot" [style.background-color]="st.color"></span>
                <span class="st-name">{{ st.name }}</span>
                <span class="st-cnt">{{ st.count }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Card 3: Open Bugs & High Priority -->
        <div class="stat-card paper-panel" [class.has-issues]="openBugsAndHighPriority().length > 0">
          <div class="stat-header font-mono">
            <span class="stat-lbl">Bugs & High Priority</span>
            <span class="badge-mono badge-urgent">{{ openBugsAndHighPriority().length }}</span>
          </div>
          <div class="stat-big-val font-mono">
            {{ openBugsAndHighPriority().length }} <span class="val-sub">Need Attention</span>
          </div>
        </div>

        <!-- Card 4: Overdue & Upcoming -->
        <div class="stat-card paper-panel" [class.has-overdue]="overdueCount() > 0">
          <div class="stat-header font-mono">
            <span class="stat-lbl">Due Soon / Overdue</span>
            <span class="badge-mono badge-high">{{ upcomingOrOverdueTasks().length }}</span>
          </div>
          <div class="stat-big-val font-mono">
            <span [class.text-rose]="overdueCount() > 0">{{ overdueCount() }} Overdue</span>
            <span class="val-sub">/ {{ upcomingOrOverdueTasks().length }} Due</span>
          </div>
        </div>
      </div>

      <!-- 3. Compact 2-Column Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- LEFT COLUMN: Open Bugs & Urgent Tasks + Upcoming Schedule -->
        <div class="grid-col">
          <!-- Open Bugs & High Priority Section -->
          <div class="section-box paper-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-bug text-rose"></i> Open Bugs & High Priority</h3>
              <span class="badge-mono font-mono">{{ openBugsAndHighPriority().length }}</span>
            </div>

            <div class="box-body">
              @if (openBugsAndHighPriority().length === 0) {
                <div class="compact-empty font-mono">
                  <i class="fi fi-rr-check-circle text-emerald"></i>
                  <span>No open bugs or urgent priority items</span>
                </div>
              } @else {
                <div class="compact-task-list font-mono">
                  @for (t of openBugsAndHighPriority(); track t.id) {
                    <div class="compact-task-row" (click)="openDetailModal(t)">
                      <div class="row-left">
                        <span class="badge-type" [class]="t.type">
                          <i [class]="getTypeIcon(t.type)"></i> {{ t.type }}
                        </span>
                        <span class="badge-mono" [class.badge-urgent]="t.priority === 'urgent'" [class.badge-high]="t.priority === 'high'">
                          {{ t.priority }}
                        </span>
                        <span class="task-title-text">{{ t.title }}</span>
                      </div>
                      <div class="row-right">
                        <span class="status-tag">{{ t.status }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Upcoming & Overdue Schedule Section -->
          <div class="section-box paper-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-calendar text-amber"></i> Upcoming & Overdue Tasks</h3>
              <span class="badge-mono font-mono">{{ upcomingOrOverdueTasks().length }}</span>
            </div>

            <div class="box-body">
              @if (upcomingOrOverdueTasks().length === 0) {
                <div class="compact-empty font-mono">
                  <i class="fi fi-rr-calendar-check text-cyan"></i>
                  <span>No upcoming or overdue tasks scheduled</span>
                </div>
              } @else {
                <div class="compact-task-list font-mono">
                  @for (t of upcomingOrOverdueTasks(); track t.id) {
                    <div class="compact-task-row" (click)="openDetailModal(t)">
                      <div class="row-left">
                        <span class="badge-mono" [class.badge-urgent]="t.isOverdue">
                          <i class="fi fi-rr-clock"></i> {{ t.isOverdue ? 'Overdue' : 'Due' }}: {{ t.due_date }}
                        </span>
                        <span class="task-title-text">{{ t.title }}</span>
                      </div>
                      <div class="row-right">
                        <span class="status-tag">{{ t.status }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Projects List & Activity Stream -->
        <div class="grid-col">
          <!-- Projects Summary List -->
          <div class="section-box paper-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-folder text-cyan"></i> Projects Overview</h3>
              <button class="btn btn-ghost btn-xs font-mono" (click)="openCreateProjectModal()">
                <i class="fi fi-rr-plus"></i> Add
              </button>
            </div>

            <div class="box-body">
              <div class="compact-proj-list">
                @for (p of projectService.projects(); track p.id) {
                  <div
                    class="compact-proj-card paper-panel"
                    [class.active-proj]="selectedProjectId() === p.id"
                    (click)="onProjectSelect(p.id)"
                  >
                    <div class="proj-top">
                      <div class="proj-name-group">
                        <span class="status-dot" [style.background-color]="p.color"></span>
                        <span class="proj-name">{{ p.name }}</span>
                      </div>
                      <span class="badge-mono" [class.badge-medium]="p.status === 'active'">{{ p.status }}</span>
                    </div>

                    <div class="proj-mid font-mono">
                      <div class="mini-bar-track">
                        <div
                          class="mini-bar-fill"
                          [style.width]="projectService.getProjectProgress(p.id).percent + '%'"
                          [style.background-color]="p.color"
                        ></div>
                      </div>
                      <span class="proj-pct">{{ projectService.getProjectProgress(p.id).percent }}%</span>
                    </div>

                    <div class="proj-bottom font-mono">
                      @if (p.repository_url) {
                        <a [href]="p.repository_url" target="_blank" class="repo-icon-link" (click)="$event.stopPropagation()">
                          <i class="fi fi-brands-github"></i> Repo
                        </a>
                      }
                      <div class="proj-actions" (click)="$event.stopPropagation()">
                        <button class="btn-xs-icon" (click)="openEditModal(p)"><i class="fi fi-rr-edit"></i></button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Activity Log Section -->
          <div class="section-box paper-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-clock-three text-cyan"></i> Recent Activity</h3>
            </div>

            <div class="box-body">
              @if (projectActivities().length === 0) {
                <div class="compact-empty font-mono">
                  <i class="fi fi-rr-time-past text-subtle"></i>
                  <span>No recent activity</span>
                </div>
              } @else {
                <div class="compact-timeline font-mono">
                  @for (act of projectActivities(); track act.id) {
                    <div class="timeline-row">
                      <span class="status-dot dot-cyan"></span>
                      <div class="timeline-info">
                        <span class="act-title">{{ act.action }}: {{ act.description }}</span>
                        <span class="act-time">{{ formatDate(act.timestamp) }}</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Modals -->
      @if (showProjectModal()) {
        <app-project-modal
          [projectToEdit]="editingProject()"
          (close)="closeProjectModal()"
        ></app-project-modal>
      }

      @if (showTaskModal()) {
        <app-task-modal
          [defaultProjectId]="selectedProjectId() === 'all' ? (projectService.projects()[0]?.id || '') : selectedProjectId()"
          (close)="closeTaskModal()"
        ></app-task-modal>
      }

      @if (activeDetailTask(); as detailTask) {
        <app-task-detail-modal
          [task]="detailTask"
          (close)="closeDetailModal()"
        ></app-task-detail-modal>
      }
    </div>
  `,
  styles: [`
    .compact-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      width: 100%;
    }

    .dash-header {
      padding: 0.85rem 1.1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
      background: var(--bg-surface);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .header-left h2 {
      font-size: 1.15rem;
    }
    .project-select {
      width: 180px;
      padding: 0.25rem 0.5rem;
      font-size: 0.775rem;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-lbl {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    .mini-bar-track {
      width: 100%;
      height: 5px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
      overflow: hidden;
    }
    .mini-bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    .stat-sub {
      font-size: 0.725rem;
      color: var(--text-muted);
    }

    .status-pills-row {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .mini-status-pill {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-xs);
      font-size: 0.7rem;
    }
    .st-name { color: var(--text-muted); }
    .st-cnt { font-weight: 700; color: var(--text-main); }
    .stat-big-val {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .val-sub { font-size: 0.75rem; color: var(--text-muted); font-weight: 400; }
    .stat-card.has-issues { border-left: 3px solid var(--accent-rose); }
    .stat-card.has-overdue { border-left: 3px solid var(--accent-amber); }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 1rem;
    }
    @media (max-width: 1024px) {
      .dashboard-grid { grid-template-columns: 1fr; }
    }
    .grid-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-box {
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.45rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .box-header h3 {
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .compact-empty {
      padding: 1.5rem 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .compact-task-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .compact-task-row {
      padding: 0.45rem 0.65rem;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-xs);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      transition: var(--transition-fast);
    }
    .compact-task-row:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-medium);
    }
    .row-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      flex: 1;
    }
    .task-title-text {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-main);
    }
    .status-tag {
      font-size: 0.7rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      color: var(--text-muted);
    }

    .compact-proj-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .compact-proj-card {
      padding: 0.55rem 0.75rem;
      background: var(--bg-surface-subtle);
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      cursor: pointer;
      transition: var(--transition-fast);
    }
    .compact-proj-card:hover {
      background: var(--bg-surface-hover);
      border-color: var(--border-medium);
    }
    .compact-proj-card.active-proj {
      border-color: var(--text-main);
      background: var(--bg-surface);
    }
    .proj-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .proj-name-group {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .proj-name {
      font-size: 0.825rem;
      font-weight: 600;
    }
    .proj-mid {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .proj-pct {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .proj-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.725rem;
    }
    .repo-icon-link {
      color: var(--accent-cyan);
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .proj-actions {
      display: flex;
      gap: 0.2rem;
      margin-left: auto;
    }
    .btn-xs-icon {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.1rem 0.3rem;
      border-radius: var(--radius-xs);
    }

    .compact-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .timeline-row {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      font-size: 0.75rem;
    }
    .timeline-info {
      display: flex;
      flex-direction: column;
    }
    .act-title { color: var(--text-main); font-weight: 500; }
    .act-time { color: var(--text-muted); font-size: 0.675rem; }
  `]
})
export class ProjectsComponent {
  selectedProjectId = signal<string>('all');

  showProjectModal = signal<boolean>(false);
  showTaskModal = signal<boolean>(false);
  editingProject = signal<Project | null>(null);
  activeDetailTask = signal<Task | null>(null);

  constructor(
    public projectService: ProjectService,
    public taskService: TaskService,
    public workflowService: WorkflowService,
    public workspaceService: WorkspaceService
  ) {
    const activeP = this.projectService.activeProject();
    if (activeP) {
      this.selectedProjectId.set(activeP.id);
    }
  }

  activeProjectObj = computed<Project | null>(() => {
    const projId = this.selectedProjectId();
    if (!projId || projId === 'all') return null;
    return this.projectService.projects().find(p => p.id === projId) || null;
  });

  onProjectSelect(projId: string) {
    this.selectedProjectId.set(projId);
    if (projId !== 'all') {
      const proj = this.projectService.projects().find(p => p.id === projId);
      if (proj) this.projectService.activeProject.set(proj);
    } else {
      this.projectService.activeProject.set(null);
    }
  }

  dashboardProgress = computed(() => {
    const proj = this.activeProjectObj();
    const tasks = this.taskService.tasks();
    const projTasks = proj ? tasks.filter(t => t.project_id === proj.id) : tasks;

    const total = projTasks.length;
    const completed = projTasks.filter(t => t.completed || t.status.toLowerCase() === 'done').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percent };
  });

  statusBreakdown = computed(() => {
    const proj = this.activeProjectObj();
    const projId = proj ? proj.id : 'all';
    const workflows = this.workflowService.getWorkflowsForProject(projId);
    const tasks = this.taskService.tasks();
    const projTasks = proj ? tasks.filter(t => t.project_id === proj.id) : tasks;

    return workflows.map(wf => {
      const count = projTasks.filter(t => t.status === wf.name).length;
      return {
        id: wf.id,
        name: wf.name,
        color: wf.color || '#0284c7',
        count
      };
    });
  });

  openBugsAndHighPriority = computed(() => {
    const proj = this.activeProjectObj();
    const tasks = this.taskService.tasks();
    const projTasks = proj ? tasks.filter(t => t.project_id === proj.id) : tasks;

    return projTasks.filter(t =>
      !t.completed &&
      t.status.toLowerCase() !== 'done' &&
      (t.type === 'bug' || t.priority === 'urgent' || t.priority === 'high')
    );
  });

  upcomingOrOverdueTasks = computed(() => {
    const proj = this.activeProjectObj();
    const tasks = this.taskService.tasks();
    const projTasks = proj ? tasks.filter(t => t.project_id === proj.id) : tasks;
    const todayStr = new Date().toISOString().split('T')[0];

    return projTasks
      .filter(t => !t.completed && t.status.toLowerCase() !== 'done' && t.due_date)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .map(t => {
        const isOverdue = !!(t.due_date && t.due_date < todayStr);
        return { ...t, isOverdue };
      });
  });

  overdueCount = computed(() => {
    return this.upcomingOrOverdueTasks().filter(t => t.isOverdue).length;
  });

  projectActivities = computed(() => {
    const proj = this.activeProjectObj();
    if (!proj) return this.projectService.activities().slice(0, 5);
    return this.projectService.getProjectRecentActivity(proj.id).slice(0, 5);
  });

  getTypeIcon(type: string): string {
    switch (type) {
      case 'story': return 'fi fi-rr-book-alt';
      case 'bug': return 'fi fi-rr-bug';
      case 'epic': return 'fi fi-rr-rocket-takeoff';
      default: return 'fi fi-rr-check-circle';
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  openCreateProjectModal() {
    this.editingProject.set(null);
    this.showProjectModal.set(true);
  }

  openEditModal(p: Project) {
    this.editingProject.set(p);
    this.showProjectModal.set(true);
  }

  closeProjectModal() {
    this.showProjectModal.set(false);
    this.editingProject.set(null);
  }

  openCreateTaskModal() {
    this.showTaskModal.set(true);
  }

  closeTaskModal() {
    this.showTaskModal.set(false);
  }

  openDetailModal(t: Task) {
    this.activeDetailTask.set(t);
  }

  closeDetailModal() {
    this.activeDetailTask.set(null);
  }
}
