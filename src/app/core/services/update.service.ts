import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  updateAvailable = signal<boolean>(false);
  private waitingWorker: ServiceWorker | null = null;

  constructor() {
    this.initServiceWorker();
  }

  private initServiceWorker(): void {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // 1. Check if a worker is already waiting in background
      if (registration.waiting) {
        this.waitingWorker = registration.waiting;
        this.updateAvailable.set(true);
      }

      // 2. Listen for new worker installations
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.waitingWorker = newWorker;
            this.updateAvailable.set(true);
          }
        });
      });

      // 3. Periodically check for app updates every 15 minutes
      setInterval(() => {
        registration.update().catch((err) => {
          console.warn('[UpdateService] Failed to check for SW updates:', err);
        });
      }, 15 * 60 * 1000);
    }).catch((err) => {
      console.warn('[UpdateService] Service Worker registration failed:', err);
    });

    // 4. Handle controllerchange to reload if skipWaiting is triggered elsewhere
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  /**
   * Called when user clicks "Reload now" on the Update Notification Banner.
   */
  activateUpdate(): void {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }
}
