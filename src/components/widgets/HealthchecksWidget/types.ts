import { WidgetProps } from '@/types';

export type HealthchecksStatus = 'up' | 'down' | 'grace' | 'late' | 'new' | 'paused';

export interface HealthchecksCheck {
  name: string;
  slug: string;
  tags: string;
  description: string;
  status: HealthchecksStatus;
  started: boolean;
  lastPing: string | null;
  nextPing: string | null;
  lastDuration: number | null;
  graceSeconds: number;
  timeoutSeconds: number;
}

export interface HealthchecksWidgetData {
  dashboardUrl: string;
  checks: HealthchecksCheck[];
  summary: {
    total: number;
    up: number;
    down: number;
    grace: number;
    late: number;
    new: number;
    paused: number;
  };
  updatedAt: string;
}

export interface HealthchecksWidgetConfig {
  id?: string;
  title?: string;
  apiUrl?: string;
  dashboardUrl?: string;
  refreshInterval?: number;
  maxItems?: number;
  tagFilter?: string;
  statusFilter?: 'all' | 'attention' | 'healthy';
  showTags?: boolean;
  showDescription?: boolean;
  onUpdate?: (config: HealthchecksWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type HealthchecksWidgetProps = WidgetProps<HealthchecksWidgetConfig>;
