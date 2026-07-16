import { onSnapshot, doc, collection } from 'firebase/firestore';
import { ReactNode, createContext, useContext, useState, useEffect, useRef, useCallback, Component, type ErrorInfo } from 'react';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { db } from './firebase';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

// Debounce utility for localStorage updates
function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface SyncContextProps {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  syncStatus: SyncStatus;
}

const SyncContext = createContext<SyncContextProps>({
  isSyncing: false,
  lastSyncTime: null,
  syncError: null,
  syncStatus: 'idle'
});

export const useSync = () => useContext(SyncContext);

interface SyncErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SyncErrorBoundary extends Component<{ children: ReactNode }, SyncErrorBoundaryState> {
  state: SyncErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): SyncErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Sync error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-900 rounded-lg">
          <h3 className="font-semibold">Sync Error</h3>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export const SyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const authContext = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Track pending sync updates to batch status changes
  const pendingSyncsRef = useRef(new Set<string>());
  // Track retry attempts
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if we've shown an error toast for this error session
  const errorToastShownRef = useRef(false);

  // Debounced localStorage writers (300ms delay to batch rapid updates)
  const debouncedWriteLayouts = useCallback(
    debounce((data: unknown) => {
      localStorage.setItem('boxento-layouts', JSON.stringify(data));
    }, 300),
    []
  );

  const debouncedWriteWidgets = useCallback(
    debounce((data: unknown) => {
      localStorage.setItem('boxento-widgets', JSON.stringify(data));
    }, 300),
    []
  );

  const debouncedWriteConfigs = useCallback(
    debounce((data: unknown) => {
      localStorage.setItem('boxento-widget-configs', JSON.stringify(data));
    }, 300),
    []
  );

  // Debounced sync status updater to batch multiple listener updates
  const debouncedUpdateSyncStatus = useCallback(
    debounce(() => {
      if (pendingSyncsRef.current.size === 0) {
        // If we were in error state, show recovery toast
        if (errorToastShownRef.current) {
          toast.success('Sync restored', {
            description: 'Your data is now syncing again.',
            duration: 3000,
          });
          errorToastShownRef.current = false;
        }
        setLastSyncTime(new Date());
        setSyncStatus('success');
        setIsSyncing(false);
        setSyncError(null);
        retryCountRef.current = 0;
      }
    }, 100),
    []
  );

  // Handle sync error with toast and retry
  const handleSyncError = useCallback((errorMessage: string, source: string) => {
    console.error(`Error syncing ${source}:`, errorMessage);
    setSyncError(`Error syncing ${source}: ${errorMessage}`);
    setSyncStatus('error');
    setIsSyncing(false);

    // Only show toast once per error session
    if (!errorToastShownRef.current) {
      errorToastShownRef.current = true;
      toast.error('Sync failed', {
        description: 'Your changes are saved locally. Will retry automatically.',
        duration: 5000,
      });
    }

    // Retry logic: retry up to 3 times with exponential backoff
    if (retryCountRef.current < 3) {
      const delay = Math.pow(2, retryCountRef.current) * 1000; // 1s, 2s, 4s
      retryCountRef.current++;

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = setTimeout(() => {
        // Trigger a re-render to re-establish listeners
        setSyncStatus('syncing');
        setIsSyncing(true);
      }, delay);
    }
  }, []);

  const markSyncComplete = useCallback((syncType: string) => {
    pendingSyncsRef.current.delete(syncType);
    debouncedUpdateSyncStatus();
  }, [debouncedUpdateSyncStatus]);

  // Set up listeners for Firestore data changes
  useEffect(() => {
    if (!authContext?.currentUser || !db) return;

    setSyncStatus('syncing');
    setIsSyncing(true);
    pendingSyncsRef.current = new Set(['layouts', 'widgets', 'configs']);

    let layoutsUnsubscribe: () => void = () => {};
    let widgetsUnsubscribe: () => void = () => {};
    let widgetConfigsUnsubscribe: () => void = () => {};

    try {
      // Listen for layouts changes
      layoutsUnsubscribe = onSnapshot(
        doc(db, 'users', authContext.currentUser.uid, 'dashboard', 'layouts'),
        (doc) => {
          if (doc.exists()) {
            // Debounced localStorage update
            debouncedWriteLayouts(doc.data());
            markSyncComplete('layouts');
          }
        },
        (error) => {
          handleSyncError(error.message, 'layouts');
        }
      );

      // Listen for widgets collection changes
      widgetsUnsubscribe = onSnapshot(
        doc(db, 'users', authContext.currentUser.uid, 'dashboard', 'widget-list'),
        (doc) => {
          if (doc.exists()) {
            // Debounced localStorage update
            debouncedWriteWidgets(doc.data().widgets);
            markSyncComplete('widgets');
          }
        },
        (error) => {
          handleSyncError(error.message, 'widgets');
        }
      );

      try {
        // Listen for widget configurations
        widgetConfigsUnsubscribe = onSnapshot(
          collection(db, 'users', authContext.currentUser.uid, 'dashboard', 'widget-configs', 'configs'),
          (snapshot) => {
            // Convert the collection to an object
            const configs: Record<string, unknown> = {};
            snapshot.forEach((doc) => {
              configs[doc.id] = doc.data().config;
            });

            // Debounced localStorage update
            debouncedWriteConfigs(configs);
            markSyncComplete('configs');
          },
          (error) => {
            handleSyncError(error.message, 'widget configurations');
          }
        );
      } catch (configError: unknown) {
        const errorMessage = configError instanceof Error ? configError.message : 'Unknown error';
        handleSyncError(errorMessage, 'setup');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      handleSyncError(errorMessage, 'setup');
    }

    // Cleanup listeners and retry timeout
    return () => {
      try {
        layoutsUnsubscribe();
        widgetsUnsubscribe();
        widgetConfigsUnsubscribe();
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      } catch (error: unknown) {
        console.error('Error cleaning up Firestore listeners:', error);
      }
    };
  }, [authContext, debouncedWriteLayouts, debouncedWriteWidgets, debouncedWriteConfigs, markSyncComplete, handleSyncError]);
  
  return (
    <SyncContext.Provider value={{ isSyncing, lastSyncTime, syncError, syncStatus }}>
      {children}
    </SyncContext.Provider>
  );
};

// Export the wrapped provider
export const SafeSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SyncErrorBoundary>
      <SyncProvider>{children}</SyncProvider>
    </SyncErrorBoundary>
  );
}; 