import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceService } from './core/services/workspace.service';
import { TodayComponent } from './features/today/today';
import { ProjectsComponent } from './features/projects/projects';
import { TasksComponent } from './features/tasks/tasks';
import { BacklogComponent } from './features/backlog/backlog';
import { CalendarComponent } from './features/calendar/calendar';
import { ArchiveComponent } from './features/archive/archive';
import { CommandPaletteComponent } from './shared/components/command-palette';
import { ShortcutsModalComponent } from './shared/components/shortcuts-modal';
import { TaskModalComponent } from './shared/components/task-modal';

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
    TaskModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  sidebarCollapsed = signal<boolean>(false);

  constructor(public workspaceService: WorkspaceService) {}

  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }
}
