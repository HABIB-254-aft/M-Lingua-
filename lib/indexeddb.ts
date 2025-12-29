// IndexedDB utilities for offline support

const DB_NAME = 'mlingua_db';
const DB_VERSION = 1;

// Store names
export const STORES = {
  SIGN_DICTIONARY: 'sign_dictionary',
  TRANSLATIONS: 'translations',
  SIGN_ANIMATIONS: 'sign_animations',
  CACHE_METADATA: 'cache_metadata',
} as const;

// Database instance
let dbInstance: IDBDatabase | null = null;

// Initialize database
export async function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Sign dictionary store
      if (!db.objectStoreNames.contains(STORES.SIGN_DICTIONARY)) {
        const signStore = db.createObjectStore(STORES.SIGN_DICTIONARY, { keyPath: 'word' });
        signStore.createIndex('type', 'type', { unique: false });
      }

      // Translations cache store
      if (!db.objectStoreNames.contains(STORES.TRANSLATIONS)) {
        const translationStore = db.createObjectStore(STORES.TRANSLATIONS, { keyPath: 'id', autoIncrement: true });
        translationStore.createIndex('sourceText', 'sourceText', { unique: false });
        translationStore.createIndex('targetLang', 'targetLang', { unique: false });
        translationStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Sign animations cache store
      if (!db.objectStoreNames.contains(STORES.SIGN_ANIMATIONS)) {
        const animationStore = db.createObjectStore(STORES.SIGN_ANIMATIONS, { keyPath: 'signType' });
        animationStore.createIndex('lastUsed', 'lastUsed', { unique: false });
      }

      // Cache metadata store
      if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
        db.createObjectStore(STORES.CACHE_METADATA, { keyPath: 'key' });
      }
    };
  });
}

// Get database instance
export async function getDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  return initDatabase();
}

// Sign Dictionary Operations
export interface SignDictionaryEntry {
  word: string;
  type: string;
  color: string;
  emoji?: string;
  lastUpdated: number;
}

export async function storeSignDictionary(entries: SignDictionaryEntry[]): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.SIGN_DICTIONARY], 'readwrite');
  const store = transaction.objectStore(STORES.SIGN_DICTIONARY);

  const promises = entries.map((entry) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...entry,
        lastUpdated: Date.now(),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });

  await Promise.all(promises);
}

export async function getSignDictionaryEntry(word: string): Promise<SignDictionaryEntry | null> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.SIGN_DICTIONARY], 'readonly');
  const store = transaction.objectStore(STORES.SIGN_DICTIONARY);

  return new Promise((resolve, reject) => {
    const request = store.get(word);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSignDictionary(): Promise<SignDictionaryEntry[]> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.SIGN_DICTIONARY], 'readonly');
  const store = transaction.objectStore(STORES.SIGN_DICTIONARY);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Translation Cache Operations
export interface TranslationCacheEntry {
  id?: number;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export async function cacheTranslation(entry: TranslationCacheEntry): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.TRANSLATIONS], 'readwrite');
  const store = transaction.objectStore(STORES.TRANSLATIONS);

  return new Promise((resolve, reject) => {
    const request = store.add({
      ...entry,
      timestamp: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedTranslation(
  sourceText: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationCacheEntry | null> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.TRANSLATIONS], 'readonly');
  const store = transaction.objectStore(STORES.TRANSLATIONS);
  const index = store.index('sourceText');

  return new Promise((resolve, reject) => {
    const request = index.getAll(sourceText);
    request.onsuccess = () => {
      const results = request.result as TranslationCacheEntry[];
      const match = results.find(
        (entry) => entry.sourceLang === sourceLang && entry.targetLang === targetLang
      );
      resolve(match || null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllTranslations(): Promise<TranslationCacheEntry[]> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.TRANSLATIONS], 'readonly');
  const store = transaction.objectStore(STORES.TRANSLATIONS);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result as TranslationCacheEntry[]);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getRecentTranslations(limit: number = 100): Promise<TranslationCacheEntry[]> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.TRANSLATIONS], 'readonly');
  const store = transaction.objectStore(STORES.TRANSLATIONS);
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    const request = index.openCursor(null, 'prev'); // Reverse order (newest first)
    const results: TranslationCacheEntry[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// Delete a translation by ID
export async function deleteTranslation(id: number): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.TRANSLATIONS], 'readwrite');
  const store = transaction.objectStore(STORES.TRANSLATIONS);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Sign Animation Cache Operations
export interface SignAnimationCache {
  signType: string;
  animationData: any; // Can store animation configuration
  lastUsed: number;
}

export async function cacheSignAnimation(signType: string, animationData: any): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.SIGN_ANIMATIONS], 'readwrite');
  const store = transaction.objectStore(STORES.SIGN_ANIMATIONS);

  return new Promise((resolve, reject) => {
    const request = store.put({
      signType,
      animationData,
      lastUsed: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedSignAnimation(signType: string): Promise<SignAnimationCache | null> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.SIGN_ANIMATIONS], 'readonly');
  const store = transaction.objectStore(STORES.SIGN_ANIMATIONS);

  return new Promise((resolve, reject) => {
    const request = store.get(signType);
    request.onsuccess = () => {
      if (request.result) {
        // Update last used timestamp
        const entry = request.result as SignAnimationCache;
        entry.lastUsed = Date.now();
        cacheSignAnimation(signType, entry.animationData); // Update timestamp
        resolve(entry);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// Cache Metadata Operations
export interface CacheMetadata {
  key: string;
  value: any;
  lastUpdated: number;
}

export async function setCacheMetadata(key: string, value: any): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.CACHE_METADATA], 'readwrite');
  const store = transaction.objectStore(STORES.CACHE_METADATA);

  return new Promise((resolve, reject) => {
    const request = store.put({
      key,
      value,
      lastUpdated: Date.now(),
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCacheMetadata(key: string): Promise<any | null> {
  const db = await getDatabase();
  const transaction = db.transaction([STORES.CACHE_METADATA], 'readonly');
  const store = transaction.objectStore(STORES.CACHE_METADATA);

  return new Promise((resolve, reject) => {
    const request = store.get(key);
    request.onsuccess = () => {
      const result = request.result as CacheMetadata | undefined;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

// Cache version management
const CACHE_VERSION_KEY = 'cache_version';
const CURRENT_CACHE_VERSION = 1;

export async function checkCacheVersion(): Promise<boolean> {
  const storedVersion = await getCacheMetadata(CACHE_VERSION_KEY);
  if (storedVersion === null || storedVersion !== CURRENT_CACHE_VERSION) {
    // Cache version mismatch or first time - need to update
    await setCacheMetadata(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    return false; // Cache needs update
  }
  return true; // Cache is up to date
}

// Clear a specific store
export async function clearStore(storeName: string): Promise<void> {
  const db = await getDatabase();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all cache
export async function clearCache(): Promise<void> {
  const stores = [STORES.SIGN_DICTIONARY, STORES.TRANSLATIONS, STORES.SIGN_ANIMATIONS, STORES.CACHE_METADATA];

  for (const storeName of stores) {
    await clearStore(storeName);
  }
}

// Get cache size estimate (approximate)
export async function getCacheSize(): Promise<number> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  } catch {
    return 0;
  }
}

