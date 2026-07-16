import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook that monitors network connectivity status.
 *
 * Features:
 * - Detects online/offline status changes
 * - Shows toast notifications when connection is lost/restored
 * - Tracks if the user was recently offline (for triggering refreshes)
 *
 * @param showToasts - Whether to show toast notifications (default: true)
 * @returns NetworkStatus object with isOnline and wasOffline flags
 */
export function useNetworkStatus(showToasts = true): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    if (showToasts) {
      toast.success('Back online', {
        description: 'Your connection has been restored.',
        duration: 3000,
      });
    }
    // Reset wasOffline flag after a short delay to allow components to react
    setTimeout(() => setWasOffline(false), 1000);
  }, [showToasts]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    if (showToasts) {
      toast.warning('You are offline', {
        description: 'Changes will be saved when you reconnect.',
        duration: 5000,
      });
    }
  }, [showToasts]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline };
}

/**
 * Wrapper for fetch that checks network status first.
 * Shows a toast if offline and returns null instead of making the request.
 *
 * @param input - Fetch input (URL or Request)
 * @param init - Fetch init options
 * @returns Response or null if offline
 */
export async function fetchWithOfflineCheck(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response | null> {
  if (!navigator.onLine) {
    toast.error('No internet connection', {
      description: 'Please check your network and try again.',
      duration: 4000,
    });
    return null;
  }

  try {
    return await fetch(input, init);
  } catch (error) {
    // Network error (could be offline or CORS, etc.)
    if (!navigator.onLine) {
      toast.error('Connection lost', {
        description: 'The request failed because you went offline.',
        duration: 4000,
      });
    }
    throw error;
  }
}
