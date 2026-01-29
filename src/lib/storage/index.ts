/**
 * Storage Provider Factory
 *
 * Selects the appropriate storage provider based on environment and availability:
 * 1. SQLite (if VITE_SQLITE_API_URL is set and backend is reachable)
 * 2. Firebase (if user is authenticated)
 * 3. LocalStorage (fallback)
 */

import type { StorageProvider, StorageProviderType } from './StorageProvider';
import { localStorageProvider } from './LocalStorageProvider';
import { firebaseStorageProvider } from './FirebaseStorageProvider';
import { getSqliteStorageProvider } from './SqliteStorageProvider';

export type { StorageProvider, StorageProviderType, Dashboard, AppSettings } from './StorageProvider';
export { LocalStorageProvider, localStorageProvider } from './LocalStorageProvider';
export { FirebaseStorageProvider, firebaseStorageProvider } from './FirebaseStorageProvider';
export { SqliteStorageProvider, getSqliteStorageProvider } from './SqliteStorageProvider';

let currentProvider: StorageProvider = localStorageProvider;
let currentProviderType: StorageProviderType = 'localStorage';
let isInitialized = false;

/**
 * Initialize storage and detect the best available provider
 */
export async function initializeStorage(): Promise<StorageProvider> {
  // Check for SQLite backend first (self-hosted mode)
  const sqliteApiUrl = import.meta.env.VITE_SQLITE_API_URL;
  if (sqliteApiUrl) {
    const sqliteProvider = getSqliteStorageProvider();
    const isAvailable = await sqliteProvider.initialize();
    if (isAvailable) {
      console.log('[Storage] Using SQLite backend:', sqliteApiUrl);
      currentProvider = sqliteProvider;
      currentProviderType = 'sqlite';
      isInitialized = true;
      return currentProvider;
    } else {
      console.warn('[Storage] SQLite backend configured but not reachable, falling back');
    }
  }

  // Check Firebase (requires authentication)
  if (firebaseStorageProvider.isAvailable) {
    console.log('[Storage] Using Firebase storage');
    currentProvider = firebaseStorageProvider;
    currentProviderType = 'firebase';
    isInitialized = true;
    return currentProvider;
  }

  // Fall back to localStorage
  console.log('[Storage] Using localStorage');
  currentProvider = localStorageProvider;
  currentProviderType = 'localStorage';
  isInitialized = true;
  return currentProvider;
}

/**
 * Get the current storage provider
 */
export function getStorageProvider(): StorageProvider {
  return currentProvider;
}

/**
 * Get the current provider type
 */
export function getStorageProviderType(): StorageProviderType {
  return currentProviderType;
}

/**
 * Check if storage has been initialized
 */
export function isStorageInitialized(): boolean {
  return isInitialized;
}

/**
 * Force switch to a specific provider (for testing or manual override)
 */
export function setStorageProvider(type: StorageProviderType): StorageProvider {
  switch (type) {
    case 'sqlite':
      currentProvider = getSqliteStorageProvider();
      break;
    case 'firebase':
      currentProvider = firebaseStorageProvider;
      break;
    case 'localStorage':
    default:
      currentProvider = localStorageProvider;
  }
  currentProviderType = type;
  return currentProvider;
}

/**
 * Re-initialize storage (call after auth state changes)
 */
export async function refreshStorageProvider(): Promise<StorageProvider> {
  isInitialized = false;
  return initializeStorage();
}
