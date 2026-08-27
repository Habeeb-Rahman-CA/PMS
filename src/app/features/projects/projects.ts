import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { WorkflowService } from '../../core/services/workflow.service';
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
    RouterLink,
    ProjectModalComponent,
    TaskModalComponent,
    TaskDetailModalComponent
  ],
  template: `
    <div class="compact-dashboard-container">
      <!-- 1. Header Bar: Selector & Actions -->
      <div class="dash-header glass-panel">
        <div class="header-left">
          <h2>Dashboard</h2>
          
          <select
            class="form-select project-select"
            [ngModel]="selectedProjectId()"
            (ngModelChange)="onProjectSelect($event)"
          >
            <option value="all">All Projects</option>
            @for (p of projectService.projects(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>

          @if (activeProjectObj()?.repository_url; as repoUrl) {
            <a [href]="repoUrl" target="_blank" class="repo-badge btn btn-ghost btn-sm">
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
        <div class="stat-card glass-panel">
          <div class="stat-header">
            <span class="stat-lbl">Overall Progress</span>
            <span class="health-chip" [class.complete]="dashboardProgress().percent === 100">
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
        <div class="stat-card glass-panel">
          <div class="stat-header">
            <span class="stat-lbl">Status Breakdown</span>
            <a routerLink="/tasks" class="mini-link">Board <i class="fi fi-rr-angle-small-right"></i></a>
          </div>
          <div class="status-pills-row">
            @for (st of statusBreakdown(); track st.id) {
              <div class="mini-status-pill" [title]="st.name + ': ' + st.count">
                <span class="dot" [style.background-color]="st.color"></span>
                <span class="st-name">{{ st.name }}</span>
                <span class="st-cnt">{{ st.count }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Card 3: Open Bugs & High Priority -->
        <div class="stat-card glass-panel" [class.has-issues]="openBugsAndHighPriority().length > 0">
          <div class="stat-header">
            <span class="stat-lbl">Bugs & High Priority</span>
            <span class="badge-num rose">{{ openBugsAndHighPriority().length }}</span>
          </div>
          <div class="stat-big-val font-mono">
            {{ openBugsAndHighPriority().length }} <span class="val-sub">Need Attention</span>
          </div>
        </div>

        <!-- Card 4: Overdue & Upcoming -->
        <div class="stat-card glass-panel" [class.has-overdue]="overdueCount() > 0">
          <div class="stat-header">
            <span class="stat-lbl">Due Soon / Overdue</span>
            <span class="badge-num amber">{{ upcomingOrOverdueTasks().length }}</span>
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
          <div class="section-box glass-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-bug text-rose"></i> Open Bugs & High Priority</h3>
              <span class="box-cnt">{{ openBugsAndHighPriority().length }}</span>
            </div>
            
            <div class="box-body">
              @if (openBugsAndHighPriority().length === 0) {
                <div class="compact-empty">
                  <i class="fi fi-rr-check-circle text-emerald"></i>
                  <span>No open bugs or urgent priority items</span>
                </div>
              } @else {
                <div class="compact-task-list">
                  @for (t of openBugsAndHighPriority(); track t.id) {
                    <div class="compact-task-row" (click)="openDetailModal(t)">
                      <div class="row-left">
                        <span class="badge" [class]="'badge-' + t.type">
                          <i [class]="getTypeIcon(t.type)"></i> {{ t.type }}
                        </span>
                        <span class="badge" [class]="'badge-' + t.priority">
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
          <div class="section-box glass-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-calendar text-amber"></i> Upcoming & Overdue Tasks</h3>
              <span class="box-cnt">{{ upcomingOrOverdueTasks().length }}</span>
            </div>

            <div class="box-body">
              @if (upcomingOrOverdueTasks().length === 0) {
                <div class="compact-empty">
                  <i class="fi fi-rr-calendar-check text-cyan"></i>
                  <span>No upcoming or overdue tasks scheduled</span>
                </div>
              } @else {
                <div class="compact-task-list">
                  @for (t of upcomingOrOverdueTasks(); track t.id) {
                    <div class="compact-task-row" (click)="openDetailModal(t)">
                      <div class="row-left">
                        <span class="date-chip" [class.overdue-chip]="t.isOverdue">
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
          <div class="section-box glass-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-folder text-cyan"></i> Projects Overview</h3>
              <button class="btn btn-ghost btn-xs" (click)="openCreateProjectModal()">
                <i class="fi fi-rr-plus"></i> Add
              </button>
            </div>

            <div class="box-body">
              <div class="compact-proj-list">
                @for (p of projectService.projects(); track p.id) {
                  <div
                    class="compact-proj-card"
                    [class.active-proj]="selectedProjectId() === p.id"
                    (click)="onProjectSelect(p.id)"
                  >
                    <div class="proj-top">
                      <div class="proj-name-group">
                        <span class="color-dot" [style.background-color]="p.color"></span>
                        <span class="proj-name">{{ p.name }}</span>
                      </div>
                      <span class="badge-status" [class]="p.status">{{ p.status }}</span>
                    </div>

                    <div class="proj-mid">
                      <div class="mini-bar-track">
                        <div
                          class="mini-bar-fill"
                          [style.width]="projectService.getProjectProgress(p.id).percent + '%'"
                          [style.background-color]="p.color"
                        ></div>
                      </div>
                      <span class="proj-pct">{{ projectService.getProjectProgress(p.id).percent }}%</span>
                    </div>

                    <div class="proj-bottom">
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
          <div class="section-box glass-panel">
            <div class="box-header">
              <h3><i class="fi fi-rr-clock-three text-cyan"></i> Recent Activity</h3>
            </div>

            <div class="box-body">
              @if (projectActivities().length === 0) {
                <div class="compact-empty">
                  <i class="fi fi-rr-time-past text-subtle"></i>
                  <span>No recent activity</span>
                </div>
              } @else {
                <div class="compact-timeline">
                  @for (act of projectActivities(); track act.id) {
                    <div class="timeline-row">
                      <span class="timeline-dot"></span>
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
      padding: 1.25rem;
      max-width: 1500px;
      margin: 0 auto;
    }

    /* 1. Header Bar */
    .dash-header {
      padding: 0.85rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.85rem;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .header-left h2 {
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .text-cyan { color: var(--accent-cyan); }
    .text-rose { color: var(--accent-rose); }
    .text-amber { color: var(--accent-amber); }
    .text-emerald { color: var(--accent-emerald); }
    .project-select {
      width: 200px;
      padding: 0.35rem 0.65rem;
      font-size: 0.825rem;
    }
    .repo-badge {
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* 2. Top Stats Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      padding: 0.85rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      justify-content: center;
    }
    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-lbl {
      font-size: 0.75rem;
      color: var(--text-subtle);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }
    .health-chip {
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      background: rgba(6, 182, 212, 0.15);
      color: var(--accent-cyan);
    }
    .health-chip.complete {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
    }
    .mini-bar-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
    }
    .mini-bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }
    .stat-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .font-mono { font-family: var(--font-mono); }
    .mini-link {
      font-size: 0.75rem;
      color: var(--accent-cyan);
      text-decoration: none;
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
      background: rgba(255, 255, 255, 0.05);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      font-size: 0.725rem;
    }
    .mini-status-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .st-name { color: var(--text-muted); }
    .st-cnt { font-weight: 700; color: var(--text-main); }
    .badge-num {
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
    }
    .badge-num.rose { background: rgba(244, 63, 94, 0.15); color: var(--accent-rose); }
    .badge-num.amber { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }
    .stat-big-val {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
    }
    .val-sub { font-size: 0.775rem; color: var(--text-muted); font-weight: 400; }
    .stat-card.has-issues { border-left: 3px solid var(--accent-rose); }
    .stat-card.has-overdue { border-left: 3px solid var(--accent-amber); }

    /* 3. Main Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1rem;
    }
    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
    .grid-col {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-box {
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .box-header h3 {
      font-size: 0.95rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }
    .box-cnt {
      font-size: 0.725rem;
      background: rgba(255, 255, 255, 0.1);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      color: var(--text-muted);
    }
    .btn-xs {
      padding: 0.2rem 0.5rem;
      font-size: 0.75rem;
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
      gap: 0.45rem;
    }
    .compact-task-row {
      padding: 0.55rem 0.75rem;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border: 1px solid var(--border-subtle);
      transition: var(--transition);
    }
    .compact-task-row:hover {
      border-color: var(--border-active);
      transform: translateX(3px);
    }
    .row-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      flex: 1;
    }
    .task-title-text {
      font-size: 0.825rem;
      font-weight: 500;
      color: var(--text-main);
    }
    .status-tag {
      font-size: 0.7rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
    }
    .date-chip {
      font-size: 0.7rem;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.08);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
    }
    .date-chip.overdue-chip {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      font-weight: 600;
    }

    /* Projects Overview List */
    .compact-proj-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .compact-proj-card {
      padding: 0.65rem 0.85rem;
      background: var(--bg-surface);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      cursor: pointer;
      transition: var(--transition);
    }
    .compact-proj-card:hover {
      border-color: var(--border-active);
    }
    .compact-proj-card.active-proj {
      border-color: var(--accent-cyan);
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.15);
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
    .color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .proj-name {
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-status {
      font-size: 0.675rem;
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-full);
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
    }
    .badge-status.archived {
      background: rgba(156, 163, 175, 0.15);
      color: var(--text-muted);
    }
    .proj-mid {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .proj-pct {
      font-size: 0.725rem;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }
    .proj-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
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
      color: var(--text-subtle);
      cursor: pointer;
      padding: 0.1rem 0.3rem;
      border-radius: var(--radius-sm);
    }
    .btn-xs-icon:hover {
      color: var(--text-main);
      background: var(--bg-surface-hover);
    }

    /* Compact Timeline */
    .compact-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .timeline-row {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      font-size: 0.775rem;
    }
    .timeline-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-cyan);
      margin-top: 5px;
      flex-shrink: 0;
    }
    .timeline-info {
      display: flex;
      flex-direction: column;
    }
    .act-title { color: var(--text-main); font-weight: 500; }
    .act-time { color: var(--text-subtle); font-size: 0.7rem; }
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
    public workflowService: WorkflowService
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

  // 1. Overall Progress
  dashboardProgress = computed(() => {
    const proj = this.activeProjectObj();
    const tasks = this.taskService.tasks();
    const projTasks = proj ? tasks.filter(t => t.project_id === proj.id) : tasks;

    const total = projTasks.length;
    const completed = projTasks.filter(t => t.completed || t.status.toLowerCase() === 'done').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percent };
  });

  // 2. Status Breakdown
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
        color: wf.color || '#06b6d4',
        count
      };
    });
  });

  // 3. Open Bugs & High Priority
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

  // 4. Upcoming & Overdue Tasks
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

  // 5. Recent Activity
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
      default: return 'fi fi-rr-checkbox';
    }
  }

  formatDate(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  openCreateProjectModal() {
    this.editingProject.set(null);
    this.showProjectModal.set(true);
  }

  openEditModal(project: Project) {
    this.editingProject.set(project);
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

  openDetailModal(task: Task) {
    this.activeDetailTask.set(task);
  }

  closeDetailModal() {
    this.activeDetailTask.set(null);
  }
}
