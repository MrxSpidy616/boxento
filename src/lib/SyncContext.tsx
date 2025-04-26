import { onSnapshot, doc, collection } from 'firebase/firestore';
import { ReactNode, createContext, useContext, useState, useEffect, Component, type ErrorInfo } from 'react';
import { useAuth } from './useAuth';
import { db } from './firebase';

type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

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
  
  // Set up listeners for Firestore data changes
  useEffect(() => {
    if (!authContext?.currentUser || !db) return;
    
    setSyncStatus('syncing');
    setIsSyncing(true);
    
    let layoutsUnsubscribe: () => void = () => {};
    let widgetsUnsubscribe: () => void = () => {};
    let widgetConfigsUnsubscribe: () => void = () => {};
    
    try {
      // Listen for layouts changes
      layoutsUnsubscribe = onSnapshot(
        doc(db, 'users', authContext.currentUser.uid, 'dashboard', 'layouts'),
        (doc) => {
          if (doc.exists()) {
            // Update localStorage as a fallback - store direct data, not wrapped in 'layouts'
            localStorage.setItem('boxento-layouts', JSON.stringify(doc.data()));
            
            setLastSyncTime(new Date());
            setSyncStatus('success');
            setIsSyncing(false);
            setSyncError(null);
          }
        },
        (error) => {
          console.error('Error syncing layouts:', error);
          setSyncError(`Error syncing layouts: ${error.message}`);
          setSyncStatus('error');
          setIsSyncing(false);
        }
      );
      
      // Listen for widgets collection changes
      widgetsUnsubscribe = onSnapshot(
        doc(db, 'users', authContext.currentUser.uid, 'dashboard', 'widget-list'),
        (doc) => {
          if (doc.exists()) {
            // Update localStorage as a fallback
            localStorage.setItem('boxento-widgets', JSON.stringify(doc.data().widgets));
            
            setLastSyncTime(new Date());
            setSyncStatus('success');
            setIsSyncing(false);
            setSyncError(null);
          }
        },
        (error) => {
          console.error('Error syncing widgets:', error);
          setSyncError(`Error syncing widgets: ${error.message}`);
          setSyncStatus('error');
          setIsSyncing(false);
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
            
            // Update localStorage as a fallback
            localStorage.setItem('boxento-widget-configs', JSON.stringify(configs));
            
            setLastSyncTime(new Date());
            setSyncStatus('success');
            setIsSyncing(false);
            setSyncError(null);
          },
          (error) => {
            console.error('Error syncing widget configurations:', error);
            setSyncError(`Error syncing widget configurations: ${error.message}`);
            setSyncStatus('error');
            setIsSyncing(false);
          }
        );
      } catch (configError: unknown) {
        const errorMessage = configError instanceof Error ? configError.message : 'Unknown error';
        console.error('Error setting up widget configs listener:', configError);
        setSyncError(`Error setting up sync: ${errorMessage}`);
        setSyncStatus('error');
        setIsSyncing(false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error setting up Firestore listeners:', error);
      setSyncError(`Error setting up sync: ${errorMessage}`);
      setSyncStatus('error');
      setIsSyncing(false);
    }
    
    // Cleanup listeners
    return () => {
      try {
        layoutsUnsubscribe();
        widgetsUnsubscribe();
        widgetConfigsUnsubscribe();
      } catch (error: unknown) {
        console.error('Error cleaning up Firestore listeners:', error);
      }
    };
  }, [authContext]);
  
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