import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkspaceService } from '../../core/services/workspace.service';

@Component({
  selector: 'app-shortcuts-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="shortcuts-card paper-panel" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3><i class="fi fi-rr-keyboard text-cyan"></i> Keyboard Shortcuts Guide</h3>
          <button class="btn btn-ghost btn-xs" (click)="close()"><i class="fi fi-rr-cross"></i></button>
        </div>

        <div class="shortcuts-grid">
          <div class="shortcuts-group">
            <span class="group-title font-mono">WORKSPACE SWITCHING</span>
            <div class="shortcut-row">
              <span class="row-label">01 TODAY Focus View</span>
              <span class="key-badge">1</span>
            </div>
            <div class="shortcut-row">
              <span class="row-label">02 PROJECTS Overview</span>
              <span class="key-badge">2</span>
            </div>
            <div class="shortcut-row">
              <span class="row-label">03 BACKLOG Task List & Filters</span>
              <span class="key-badge">3</span>
            </div>
            <div class="shortcut-row">
              <span class="row-label">04 BOARD Kanban View</span>
              <span class="key-badge">4</span>
            </div>
            <div class="shortcut-row">
              <span class="row-label">05 CALENDAR Task View</span>
              <span class="key-badge">5</span>
            </div>
            <div class="shortcut-row">
              <span class="row-label">06 ARCHIVE & Exports</span>
              <span class="key-badge">6</span>
            </div>
          </div>

          <div class="shortcuts-group">
            <span class="group-title font-mono">GLOBAL CONTROLS</span>
            <div class="shortcut-row">
              <span class="row-label">Command Palette</span>
              <div class="keys-inline">
                <span class="key-badge">⌘</span> + <span class="key-badge">K</span>
              </div>
            </div>
            <div class="shortcut-row">
              <span class="row-label">Shortcuts Guide</span>
              <span class="key-badge">?</span>
            </div>
            <div class="shortcut-row">
              <span class="row-label">Close Modal / Esc</span>
              <span class="key-badge">ESC</span>
            </div>
          </div>
        </div>

        <div class="modal-footer font-mono">
          <span>Press any key number 1-6 to immediately change active workspace</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shortcuts-card {
      width: 100%;
      max-width: 520px;
    }
    .shortcuts-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    .shortcuts-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .group-title {
      font-size: 0.725rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }
    .shortcut-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.65rem;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xs);
    }
    .row-label {
      font-size: 0.8rem;
      color: var(--text-main);
    }
    .keys-inline {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .modal-footer {
      font-size: 0.725rem;
      color: var(--text-muted);
      text-align: center;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
    }
  `]
})
export class ShortcutsModalComponent {
  constructor(public workspaceService: WorkspaceService) {}

  close() {
    this.workspaceService.shortcutsModalOpen.set(false);
  }
}
