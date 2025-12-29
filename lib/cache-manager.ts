// Cache management utility
// Handles cache versioning, invalidation, and updates

import { getCacheMetadata, setCacheMetadata, clearStore, STORES } from './indexeddb';

const CACHE_VERSION_KEY = 'cache_version';
const CURRENT_CACHE_VERSION = '2.0.0'; // Update this when cache structure changes
const CACHE_EXPIRY_KEY = 'cache_expiry';
const DEFAULT_CACHE_EXPIRY_DAYS = 30; // Cache expires after 30 days

// Check if cache needs to be invalidated
export async function checkCacheVersion(): Promise<boolean> {
  try {
    const storedVersion = await getCacheMetadata(CACHE_VERSION_KEY);
    
    if (!storedVersion || storedVersion !== CURRENT_CACHE_VERSION) {
      console.log('[CacheManager] Cache version mismatch, invalidating cache');
      await invalidateCache();
      await setCacheMetadata(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
      return false; // Cache was invalidated
    }
    
    return true; // Cache is up to date
  } catch (error) {
    console.error('[CacheManager] Error checking cache version:', error);
    return false;
  }
}

// Invalidate all caches
export async function invalidateCache(): Promise<void> {
  try {
    console.log('[CacheManager] Invalidating all caches');
    
    // Clear all stores except metadata
    await clearStore(STORES.SIGN_DICTIONARY);
    await clearStore(STORES.TRANSLATIONS);
    await clearStore(STORES.SIGN_ANIMATIONS);
    
    // Update version
    await setCacheMetadata(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
    await setCacheMetadata(CACHE_EXPIRY_KEY, Date.now() + (DEFAULT_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
    
    console.log('[CacheManager] Cache invalidated successfully');
  } catch (error) {
    console.error('[CacheManager] Error invalidating cache:', error);
    throw error;
  }
}

// Check if cache has expired
export async function isCacheExpired(): Promise<boolean> {
  try {
    const expiry = await getCacheMetadata(CACHE_EXPIRY_KEY);
    
    if (!expiry) {
      // No expiry set, set one
      await setCacheMetadata(CACHE_EXPIRY_KEY, Date.now() + (DEFAULT_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000));
      return false;
    }
    
    return Date.now() > expiry;
  } catch (error) {
    console.error('[CacheManager] Error checking cache expiry:', error);
    return false;
  }
}

// Clean up expired cache entries
export async function cleanupExpiredCache(): Promise<void> {
  try {
    const expired = await isCacheExpired();
    
    if (expired) {
      console.log('[CacheManager] Cache expired, cleaning up');
      await invalidateCache();
    } else {
      // Clean up old translations (older than 30 days)
      const { getAllTranslations, deleteTranslation } = await import('./indexeddb');
      const translations = await getAllTranslations();
      const thirtyDaysAgo = Date.now() - (DEFAULT_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      for (const translation of translations) {
        if (translation.timestamp && translation.timestamp < thirtyDaysAgo && translation.id) {
          try {
            await deleteTranslation(translation.id);
          } catch (deleteError) {
            // Ignore individual delete errors
            console.warn('[CacheManager] Failed to delete translation:', deleteError);
          }
        }
      }
    }
  } catch (error) {
    console.error('[CacheManager] Error cleaning up cache:', error);
  }
}

// Initialize cache management
export async function initCacheManager(): Promise<void> {
  try {
    // Check cache version
    await checkCacheVersion();
    
    // Clean up expired entries
    await cleanupExpiredCache();
    
    console.log('[CacheManager] Cache manager initialized');
  } catch (error) {
    console.error('[CacheManager] Error initializing cache manager:', error);
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  version: string;
  expiry: number | null;
  signDictionaryCount: number;
  translationCount: number;
  totalSize: number;
}> {
  try {
    const { getAllSignDictionary, getAllTranslations, getCacheSize } = await import('./indexeddb');
    
    const version = (await getCacheMetadata(CACHE_VERSION_KEY)) || 'unknown';
    const expiry = await getCacheMetadata(CACHE_EXPIRY_KEY);
    const signDictionary = await getAllSignDictionary();
    const translations = await getAllTranslations();
    const totalSize = await getCacheSize();
    
    return {
      version: version as string,
      expiry: expiry as number | null,
      signDictionaryCount: signDictionary.length,
      translationCount: translations.length,
      totalSize,
    };
  } catch (error) {
    console.error('[CacheManager] Error getting cache stats:', error);
    return {
      version: 'unknown',
      expiry: null,
      signDictionaryCount: 0,
      translationCount: 0,
      totalSize: 0,
    };
  }
}

