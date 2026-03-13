import { WidgetProps } from '@/types';

/**
 * A single job/service status
 */
export interface Job {
  id: string;
  name: string;
  type: 'cron' | 'service';
  status: 'running' | 'success' | 'failed' | 'stopped' | 'unknown' | 'unloaded';
  message?: string;
  schedule?: string;
  lastRun?: string;
}

/**
 * Health API response
 */
export interface HealthResponse {
  jobs: Job[];
  updated: string;
}

/**
 * Configuration options for the CronHealth widget
 */
export interface CronHealthWidgetConfig {
  id?: string;
  title?: string;
  apiUrl: string; // URL to fetch health JSON from
  refreshInterval?: number; // Refresh interval in seconds (default: 60)
  onUpdate?: (config: CronHealthWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

/**
 * Props for the CronHealth widget component
 */
export type CronHealthWidgetProps = WidgetProps<CronHealthWidgetConfig>;
