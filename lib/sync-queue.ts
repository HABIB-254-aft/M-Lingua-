// Background sync queue utility
// Queues failed API requests for retry when online

export interface QueuedRequest {
  id?: number;
  type: 'translation' | 'api';
  url: string;
  options: RequestInit;
  timestamp: number;
  retries: number;
}

const MAX_RETRIES = 3;
const SYNC_QUEUE_DB = 'mlingua_sync';
const SYNC_QUEUE_STORE = 'sync_queue';

// Open IndexedDB for sync queue
function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_QUEUE_DB, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const store = db.createObjectStore(SYNC_QUEUE_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Queue a request for background sync
export async function queueRequest(
  type: 'translation' | 'api',
  url: string,
  options: RequestInit
): Promise<number> {
  try {
    const db = await openSyncDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    
    const queuedRequest: Omit<QueuedRequest, 'id'> = {
      type,
      url,
      options,
      timestamp: Date.now(),
      retries: 0,
    };
    
    const request = store.add(queuedRequest);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const id = request.result as number;
        console.log(`[SyncQueue] Queued ${type} request:`, id);
        
        // Trigger background sync if available
        if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register('sync-translations').catch((error) => {
              console.error('[SyncQueue] Failed to register sync:', error);
            });
          });
        }
        
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SyncQueue] Failed to queue request:', error);
    throw error;
  }
}

// Get all queued requests
export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  try {
    const db = await openSyncDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result as QueuedRequest[]);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SyncQueue] Failed to get queued requests:', error);
    return [];
  }
}

// Remove a queued request (after successful sync)
export async function removeQueuedRequest(id: number): Promise<void> {
  try {
    const db = await openSyncDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.delete(id);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log(`[SyncQueue] Removed queued request:`, id);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SyncQueue] Failed to remove queued request:', error);
    throw error;
  }
}

// Clear all queued requests
export async function clearQueuedRequests(): Promise<void> {
  try {
    const db = await openSyncDB();
    const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(SYNC_QUEUE_STORE);
    const request = store.clear();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[SyncQueue] Cleared all queued requests');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SyncQueue] Failed to clear queued requests:', error);
    throw error;
  }
}

// Retry a queued request
export async function retryQueuedRequest(request: QueuedRequest): Promise<boolean> {
  try {
    // Check if max retries reached
    if (request.retries >= MAX_RETRIES) {
      console.log(`[SyncQueue] Max retries reached for request:`, request.id);
      await removeQueuedRequest(request.id!);
      return false;
    }
    
    // Try to fetch the request
    const response = await fetch(request.url, request.options);
    
    if (response.ok) {
      // Success - remove from queue
      await removeQueuedRequest(request.id!);
      return true;
    } else {
      // Failed - increment retries
      const db = await openSyncDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const updatedRequest = { ...request, retries: request.retries + 1 };
      store.put(updatedRequest);
      
      return false;
    }
  } catch (error) {
    console.error('[SyncQueue] Failed to retry request:', error);
    
    // Increment retries
    try {
      const db = await openSyncDB();
      const transaction = db.transaction([SYNC_QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_QUEUE_STORE);
      const updatedRequest = { ...request, retries: request.retries + 1 };
      store.put(updatedRequest);
    } catch (updateError) {
      console.error('[SyncQueue] Failed to update retry count:', updateError);
    }
    
    return false;
  }
}

