import { Injectable, signal } from '@angular/core';

export type WorkspaceSection = '01 TODAY' | '02 PROJECTS' | '03 BACKLOG' | '04 TASKS' | '05 CALENDAR' | '06 ARCHIVE';

export interface WorkspaceItem {
  id: WorkspaceSection;
  key: string;
  name: string;
  code: string;
  icon: string;
  desc: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  activeWorkspace = signal<WorkspaceSection>('01 TODAY');
  commandPaletteOpen = signal<boolean>(false);
  shortcutsModalOpen = signal<boolean>(false);

  readonly workspaces: WorkspaceItem[] = [
    { id: '01 TODAY', key: '1', name: 'TODAY', code: '01', icon: 'fi fi-rr-sun', desc: 'Focus dashboard & metrics' },
    { id: '02 PROJECTS', key: '2', name: 'PROJECTS', code: '02', icon: 'fi fi-rr-folder', desc: 'Project overview & metrics' },
    { id: '03 BACKLOG', key: '3', name: 'BACKLOG', code: '03', icon: 'fi fi-rr-list-check', desc: 'Jira-style task backlog with comprehensive filters' },
    { id: '04 TASKS', key: '4', name: 'BOARD', code: '04', icon: 'fi fi-rr-layout-fluid', desc: 'Kanban workflow board' },
    { id: '05 CALENDAR', key: '5', name: 'CALENDAR', code: '05', icon: 'fi fi-rr-calendar', desc: 'Jira-style month calendar of created & closed tasks' },
    { id: '06 ARCHIVE', key: '6', name: 'ARCHIVE', code: '06', icon: 'fi fi-rr-box-alt', desc: 'Completed task history & exports' }
  ];

  constructor() {
    this.initKeyboardListeners();
  }

  setWorkspace(workspace: WorkspaceSection) {
    this.activeWorkspace.set(workspace);
  }

  toggleCommandPalette() {
    this.commandPaletteOpen.update(v => !v);
  }

  toggleShortcutsModal() {
    this.shortcutsModalOpen.update(v => !v);
  }

  private initKeyboardListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't intercept shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      // Global hotkeys (Cmd+K / Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleCommandPalette();
        return;
      }

      // Escape closes modals
      if (e.key === 'Escape') {
        if (this.commandPaletteOpen()) {
          this.commandPaletteOpen.set(false);
          return;
        }
        if (this.shortcutsModalOpen()) {
          this.shortcutsModalOpen.set(false);
          return;
        }
      }

      if (isInput) return;

      // Numeric shortcuts 1-6 for switching workspace
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const item = this.workspaces.find(w => w.key === e.key);
        if (item) {
          e.preventDefault();
          this.setWorkspace(item.id);
        }
        return;
      }

      // Help shortcut (?)
      if (e.key === '?') {
        e.preventDefault();
        this.toggleShortcutsModal();
      }
    });
  }
}
