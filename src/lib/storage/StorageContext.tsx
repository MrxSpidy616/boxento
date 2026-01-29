/**
 * Storage Context
 *
 * React context for accessing the storage provider throughout the app.
 * Handles initialization and provider switching.
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  StorageProvider,
  StorageProviderType,
  initializeStorage,
  getStorageProvider,
  getStorageProviderType,
  refreshStorageProvider,
  isStorageInitialized,
} from './index';

interface StorageContextValue {
  provider: StorageProvider;
  providerType: StorageProviderType;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const StorageContext = createContext<StorageContextValue | null>(null);

interface StorageProviderProps {
  children: ReactNode;
  onInitialized?: (provider: StorageProvider) => void;
}

export function StorageContextProvider({ children, onInitialized }: StorageProviderProps) {
  const [provider, setProvider] = useState<StorageProvider>(getStorageProvider());
  const [providerType, setProviderType] = useState<StorageProviderType>(getStorageProviderType());
  const [isInitialized, setIsInitialized] = useState(isStorageInitialized());
  const [isLoading, setIsLoading] = useState(!isStorageInitialized());
  const [error, setError] = useState<Error | null>(null);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newProvider = await initializeStorage();
      setProvider(newProvider);
      setProviderType(getStorageProviderType());
      setIsInitialized(true);
      onInitialized?.(newProvider);
    } catch (e) {
      console.error('[StorageContext] Initialization error:', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [onInitialized]);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newProvider = await refreshStorageProvider();
      setProvider(newProvider);
      setProviderType(getStorageProviderType());
    } catch (e) {
      console.error('[StorageContext] Refresh error:', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isStorageInitialized()) {
      initialize();
    }
  }, [initialize]);

  const value: StorageContextValue = {
    provider,
    providerType,
    isInitialized,
    isLoading,
    error,
    refresh,
  };

  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageContextProvider');
  }
  return context;
}

export function useStorageProvider(): StorageProvider {
  const { provider } = useStorage();
  return provider;
}

export { StorageContext };
