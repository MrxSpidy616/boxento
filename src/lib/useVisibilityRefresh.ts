import { useEffect, useRef, useCallback } from 'react';

interface UseVisibilityRefreshOptions {
  /** Callback to refresh data */
  onRefresh: () => void;
  /** Minimum time (in ms) the tab must be hidden before triggering refresh on visibility change. Default: 60000 (1 minute) */
  minHiddenTime?: number;
  /** Optional periodic refresh interval (in ms). Set to 0 to disable. Default: 0 */
  refreshInterval?: number;
  /** Whether the hook is enabled. Default: true */
  enabled?: boolean;
}

/**
 * Hook that handles data refresh based on page visibility and optional periodic intervals.
 *
 * This hook solves the problem of stale data in long-running tabs by:
 * 1. Detecting when a tab becomes visible after being hidden
 * 2. Triggering a refresh if the tab was hidden for longer than minHiddenTime
 * 3. Optionally running periodic refreshes that pause when the tab is hidden
 *
 * @example
 * ```tsx
 * useVisibilityRefresh({
 *   onRefresh: fetchGitHubData,
 *   minHiddenTime: 60000, // 1 minute
 *   refreshInterval: 300000, // 5 minutes
 *   enabled: !!config.username
 * });
 * ```
 */
export function useVisibilityRefresh({
  onRefresh,
  minHiddenTime = 60000,
  refreshInterval = 0,
  enabled = true,
}: UseVisibilityRefreshOptions): void {
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const lastRefreshTimeRef = useRef<number>(Date.now());
  const intervalIdRef = useRef<number | null>(null);

  // Stable callback reference
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const triggerRefresh = useCallback(() => {
    lastRefreshTimeRef.current = Date.now();
    onRefreshRef.current();
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden - record the time
        lastVisibleTimeRef.current = Date.now();

        // Clear any running interval when tab is hidden
        if (intervalIdRef.current !== null) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
      } else {
        // Tab is now visible
        const hiddenDuration = Date.now() - lastVisibleTimeRef.current;

        // Refresh if tab was hidden long enough
        if (hiddenDuration >= minHiddenTime) {
          triggerRefresh();
        }

        // Restart the periodic interval if configured
        if (refreshInterval > 0) {
          intervalIdRef.current = window.setInterval(triggerRefresh, refreshInterval);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, minHiddenTime, refreshInterval, triggerRefresh]);

  // Handle periodic refresh (only when tab is visible)
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;

    // Only start interval if document is visible
    if (!document.hidden) {
      intervalIdRef.current = window.setInterval(triggerRefresh, refreshInterval);
    }

    return () => {
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, refreshInterval, triggerRefresh]);

  // Handle window focus (additional trigger for when switching between windows)
  useEffect(() => {
    if (!enabled) return;

    const handleFocus = () => {
      const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;

      // Refresh if it's been longer than minHiddenTime since last refresh
      if (timeSinceLastRefresh >= minHiddenTime) {
        triggerRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, minHiddenTime, triggerRefresh]);
}
