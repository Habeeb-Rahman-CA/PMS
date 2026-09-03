import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  deferredPrompt = signal<any>(null);
  canInstallPwa = signal<boolean>(false);
  isStandalone = signal<boolean>(false);

  constructor() {
    this.initPwaInstall();
  }

  private initPwaInstall() {
    if (typeof window === 'undefined') return;

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      this.isStandalone.set(true);
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt.set(e);
      this.canInstallPwa.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt.set(null);
      this.canInstallPwa.set(false);
      this.isStandalone.set(true);
    });
  }

  async promptInstall() {
    const promptEvent = this.deferredPrompt();
    if (!promptEvent) return;

    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    if (result && result.outcome === 'accepted') {
      this.canInstallPwa.set(false);
      this.deferredPrompt.set(null);
    }
  }
}
