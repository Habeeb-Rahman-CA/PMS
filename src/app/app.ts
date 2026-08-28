import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceService, WorkspaceSection } from './core/services/workspace.service';
import { SyncService } from './core/services/sync.service';
import { UpdateService } from './core/services/update.service';
import { TodayComponent } from './features/today/today';
import { ProjectsComponent } from './features/projects/projects';
import { TasksComponent } from './features/tasks/tasks';
import { BacklogComponent } from './features/backlog/backlog';
import { CalendarComponent } from './features/calendar/calendar';
import { ArchiveComponent } from './features/archive/archive';
import { CommandPaletteComponent } from './shared/components/command-palette';
import { ShortcutsModalComponent } from './shared/components/shortcuts-modal';
import { TaskModalComponent } from './shared/components/task-modal';

import { TaskShareService } from './core/services/task-share.service';
import { TaskDetailModalComponent } from './shared/components/task-detail-modal';
import { Task } from './core/models/project.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TodayComponent,
    ProjectsComponent,
    TasksComponent,
    BacklogComponent,
    CalendarComponent,
    ArchiveComponent,
    CommandPaletteComponent,
    ShortcutsModalComponent,
    TaskModalComponent,
    TaskDetailModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  sidebarCollapsed = signal<boolean>(false);
  mobileMenuOpen = signal<boolean>(false);
  editingSharedTask = signal<Task | null>(null);

  constructor(
    public workspaceService: WorkspaceService,
    public syncService: SyncService,
    public updateService: UpdateService,
    public taskShareService: TaskShareService
  ) {}

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  selectWorkspace(wsId: WorkspaceSection) {
    this.workspaceService.setWorkspace(wsId);
    this.mobileMenuOpen.set(false);
  }

  onEditSharedTask(task: Task) {
    this.editingSharedTask.set(task);
    this.taskShareService.closeSharedTaskModal();
  }

  closeEditSharedModal() {
    this.editingSharedTask.set(null);
  }
}
