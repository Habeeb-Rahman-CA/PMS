import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceService } from './core/services/workspace.service';
import { TodayComponent } from './features/today/today';
import { ProjectsComponent } from './features/projects/projects';
import { TasksComponent } from './features/tasks/tasks';
import { ArchiveComponent } from './features/archive/archive';
import { CommandPaletteComponent } from './shared/components/command-palette';
import { ShortcutsModalComponent } from './shared/components/shortcuts-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    TodayComponent,
    ProjectsComponent,
    TasksComponent,
    ArchiveComponent,
    CommandPaletteComponent,
    ShortcutsModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(public workspaceService: WorkspaceService) {}

  currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
