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
  private checkInterval: NodeJS.Timeout | null = null;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL = 10000; // Check every 10 seconds (more frequent)
  private readonly CHECK_TIMEOUT = 3000; // 3 second timeout for connection check

  constructor() {
    // Only run in browser context (not in service worker)
    if (typeof window !== 'undefined') {
      // Listen to browser online/offline events
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
      
      // Initial connection check
      this.checkConnection().then(() => {
        // Start periodic connection checks
        this.startPeriodicChecks();
      });
      
      // Also check service worker status
      this.checkServiceWorkerStatus();
    }
  }

  private startPeriodicChecks() {
    // Clear any existing interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      // Only check if enough time has passed since last check
      if (now - this.lastCheckTime >= this.CHECK_INTERVAL) {
        console.log('Periodic connection check running...');
        this.checkConnection().then((isOnline) => {
          console.log('Periodic check result:', isOnline ? 'Online' : 'Offline');
        }).catch((error) => {
          console.warn('Periodic check error:', error);
        });
      }
    }, this.CHECK_INTERVAL);
  }

  public stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private handleOnline() {
    const previousStatus = this.isOnline;
    // Verify actual connectivity when browser says we're online
    this.checkConnection().then((actuallyOnline) => {
      if (actuallyOnline && !previousStatus) {
        this.wasOffline = true;
        this.notifyListeners({ isOnline: true, wasOffline: true });
        
        // Reset wasOffline after a short delay
        setTimeout(() => {
          this.wasOffline = false;
        }, 2000);
      } else if (actuallyOnline) {
        this.notifyListeners({ isOnline: true, wasOffline: false });
      }
    });
  }

  private handleOffline() {
    // Browser says we're offline - immediately notify listeners
    // This is important because when offline, we can't do network checks
    const wasOnline = this.isOnline;
    this.isOnline = false;
    
    if (wasOnline) {
      // Only notify if status actually changed
      console.log('Browser detected offline status - notifying listeners');
      this.notifyListeners({ isOnline: false, wasOffline: false });
    }
    
    // Also do a connection check to confirm (but this will likely fail when offline)
    // The check is async, so listeners are already notified
    this.checkConnection().catch(() => {
      // Expected to fail when offline
    });
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
    
    // First check navigator.onLine (fast check)
    if (!navigator.onLine) {
      const wasOnline = this.isOnline;
      if (wasOnline) {
        console.log('navigator.onLine is false - user is offline');
        this.isOnline = false;
        this.notifyListeners({ isOnline: false, wasOffline: false });
      }
      this.lastCheckTime = Date.now();
      return false;
    }
    
    // Try to fetch a small resource to verify actual connectivity
    let connected = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CHECK_TIMEOUT);
      
      // Try to fetch a same-origin resource
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      // If we get any response (even 404), we have connectivity
      connected = true;
    } catch (error) {
      // Network error means we're offline
      connected = false;
    }
    
    // Update status if it changed
    if (connected !== this.isOnline) {
      this.isOnline = connected;
      this.notifyListeners({ 
        isOnline: connected, 
        wasOffline: !connected && this.wasOffline 
      });
    }
    
    this.lastCheckTime = Date.now();
    return connected;
  }
}

// Singleton instance
export const offlineDetector = new OfflineDetector();

// Note: React hook is in a separate file to avoid React dependency in this utility
// Use the offlineDetector instance directly or import useOfflineStatus from a React component

