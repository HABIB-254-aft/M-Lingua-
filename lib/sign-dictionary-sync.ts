// Utility to sync sign dictionary to IndexedDB

import { storeSignDictionary, getAllSignDictionary, type SignDictionaryEntry } from './indexeddb';

// Extract sign dictionary from SignLanguageAvatar component
export function extractSignDictionaryFromComponent(): SignDictionaryEntry[] {
  // This will be populated from the actual signMap in SignLanguageAvatar
  // For now, we'll create a function that can be called with the signMap
  return [];
}

// Sync sign dictionary to IndexedDB
export async function syncSignDictionaryToIndexedDB(
  signMap: Record<string, { type: string; color: string; emoji?: string }>
): Promise<void> {
  try {
    const entries: SignDictionaryEntry[] = Object.entries(signMap).map(([word, data]) => ({
      word,
      type: data.type,
      color: data.color,
      emoji: data.emoji,
      lastUpdated: Date.now(),
    }));

    await storeSignDictionary(entries);
    console.log(`✅ Synced ${entries.length} sign dictionary entries to IndexedDB`);
  } catch (error) {
    console.error('Failed to sync sign dictionary to IndexedDB:', error);
  }
}

// Load sign dictionary from IndexedDB
export async function loadSignDictionaryFromIndexedDB(): Promise<
  Record<string, { type: string; color: string; emoji?: string }> | null
> {
  try {
    const entries = await getAllSignDictionary();
    if (entries.length === 0) {
      return null;
    }

    const signMap: Record<string, { type: string; color: string; emoji?: string }> = {};
    entries.forEach((entry) => {
      signMap[entry.word] = {
        type: entry.type,
        color: entry.color,
        emoji: entry.emoji,
      };
    });

    console.log(`✅ Loaded ${entries.length} sign dictionary entries from IndexedDB`);
    return signMap;
  } catch (error) {
    console.error('Failed to load sign dictionary from IndexedDB:', error);
    return null;
  }
}

// Check if IndexedDB has sign dictionary
export async function hasSignDictionaryInIndexedDB(): Promise<boolean> {
  try {
    const entries = await getAllSignDictionary();
    return entries.length > 0;
  } catch {
    return false;
  }
}

