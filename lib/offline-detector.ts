// Offline detection utility
// Provides hooks and utilities for detecting online/offline status

export interface OfflineStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

class OfflineDetector {
  private listeners: Set<(status: OfflineStatus) => void> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private wasOffline: boolean = false;

  constructor() {
    // Only run in browser context (not in service worker)
    if (typeof window !== 'undefined') {
      // Listen to browser online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Also check service worker status
      this.checkServiceWorkerStatus();
    }
  }

  private handleOnline() {
    const previousStatus = this.isOnline;
    this.isOnline = true;
    
    if (!previousStatus) {
      this.wasOffline = true;
      this.notifyListeners({ isOnline: true, wasOffline: true });
      
      // Reset wasOffline after a short delay
      setTimeout(() => {
        this.wasOffline = false;
      }, 2000);
    } else {
      this.notifyListeners({ isOnline: true, wasOffline: false });
    }
  }

  private handleOffline() {
    this.isOnline = false;
    this.notifyListeners({ isOnline: false, wasOffline: false });
  }

  private notifyListeners(status: OfflineStatus) {
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in offline status listener:', error);
      }
    });
  }

  private async checkServiceWorkerStatus() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (!registration.active) {
          // Service worker not active, might be offline
          this.isOnline = false;
          this.notifyListeners({ isOnline: false, wasOffline: false });
        }
      } catch (error) {
        console.error('Error checking service worker status:', error);
      }
    }
  }

  public subscribe(listener: (status: OfflineStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify with current status
    listener({ isOnline: this.isOnline, wasOffline: this.wasOffline });
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): OfflineStatus {
    return {
      isOnline: this.isOnline,
      wasOffline: this.wasOffline,
    };
  }

  public async checkConnection(): Promise<boolean> {
    // Only check in browser context
    if (typeof window === 'undefined') {
      return true;
    }
    
    // Try to fetch a small resource to verify actual connectivity
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      this.isOnline = response.ok;
      return response.ok;
    } catch (error) {
      this.isOnline = false;
      return false;
    }
  }
}

// Singleton instance
export const offlineDetector = new OfflineDetector();

// Note: React hook is in a separate file to avoid React dependency in this utility
// Use the offlineDetector instance directly or import useOfflineStatus from a React component

