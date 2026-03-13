import { WidgetProps } from '@/types';

export type KumaMonitorStatus = 'up' | 'down' | 'pending' | 'maintenance' | 'unknown';

export interface KumaMonitor {
  id: number;
  name: string;
  group: string;
  type: string;
  status: KumaMonitorStatus;
  ping: number | null;
  message: string | null;
  lastChecked: string | null;
  uptime24: number | null;
}

export interface KumaWidgetData {
  dashboardUrl: string;
  monitors: KumaMonitor[];
  summary: {
    total: number;
    up: number;
    down: number;
    pending: number;
    maintenance: number;
  };
  updatedAt: string;
}

export interface KumaWidgetConfig {
  id?: string;
  title?: string;
  apiUrl?: string;
  dashboardUrl?: string;
  refreshInterval?: number;
  maxItems?: number;
  groupFilter?: string;
  statusFilter?: 'all' | 'issues' | 'up';
  showGroups?: boolean;
  showMessages?: boolean;
  onUpdate?: (config: KumaWidgetConfig) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  [key: string]: unknown;
}

export type KumaWidgetProps = WidgetProps<KumaWidgetConfig>;
