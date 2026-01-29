import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import WidgetHeader from '../common/WidgetHeader';
import { WidgetProps } from '@/types';
import { CronHealthWidgetConfig, Job, HealthResponse } from './types';
import {
  Server,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Timer
} from 'lucide-react';

type CronHealthWidgetProps = WidgetProps<CronHealthWidgetConfig>;

const DEFAULT_CONFIG: CronHealthWidgetConfig = {
  title: 'System Health',
  apiUrl: 'http://localhost:7505',
  refreshInterval: 60
};

const CronHealthWidget: React.FC<CronHealthWidgetProps> = ({ width, height, config }) => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [localConfig, setLocalConfig] = useState<CronHealthWidgetConfig>({
    ...DEFAULT_CONFIG,
    ...config
  });
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Update local config when props change
  useEffect(() => {
    setLocalConfig(prev => ({ ...prev, ...config }));
  }, [config]);

  // Fetch health data
  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(localConfig.apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: HealthResponse = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [localConfig.apiUrl]);

  // Fetch on mount and interval
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, (localConfig.refreshInterval || 60) * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth, localConfig.refreshInterval]);

  // Get status icon and color
  const getStatusDisplay = (status: Job['status']) => {
    switch (status) {
      case 'running':
      case 'success':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500' };
      case 'stopped':
      case 'unloaded':
        return { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500' };
      default:
        return { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400' };
    }
  };

  // Get job icon
  const getJobIcon = (type: Job['type']) => {
    return type === 'cron' ? Timer : Server;
  };

  // Format time ago
  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  };

  // Render job item
  const renderJob = (job: Job, compact: boolean = false) => {
    const statusDisplay = getStatusDisplay(job.status);
    const StatusIcon = statusDisplay.icon;
    const JobIcon = getJobIcon(job.type);

    if (compact) {
      return (
        <div
          key={job.id}
          className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title={`${job.name}: ${job.message || job.status}`}
        >
          <div className={`w-2 h-2 rounded-full ${statusDisplay.bg}`} />
          <span className="text-xs truncate flex-grow">{job.name}</span>
        </div>
      );
    }

    return (
      <div
        key={job.id}
        className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <JobIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{job.name}</span>
            <StatusIcon className={`w-4 h-4 ${statusDisplay.color}`} />
          </div>
          <div className="text-xs text-gray-500 truncate">
            {job.message}
            {job.lastRun && (
              <span className="ml-2 text-gray-400">• {formatTimeAgo(job.lastRun)}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    if (loading && !healthData) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <XCircle className="w-6 h-6 mb-1 text-red-500" />
          <span className="text-xs">{error}</span>
          <button onClick={fetchHealth} className="text-xs text-blue-500 mt-1">Retry</button>
        </div>
      );
    }

    if (!healthData || healthData.jobs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Server className="w-6 h-6 mb-1" />
          <span className="text-xs">No jobs found</span>
        </div>
      );
    }

    const isCompact = width <= 2 || height <= 2;

    // Summary counts
    const running = healthData.jobs.filter(j => j.status === 'running' || j.status === 'success').length;
    const failed = healthData.jobs.filter(j => j.status === 'failed').length;
    const total = healthData.jobs.length;

    return (
      <div className="h-full flex flex-col gap-2">
        {/* Summary bar */}
        <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
          <span className="text-green-500">{running} ok</span>
          {failed > 0 && <span className="text-red-500">{failed} failed</span>}
          <span className="flex-grow" />
          <span>{total} total</span>
        </div>

        {/* Job list */}
        <div className="flex-grow overflow-auto space-y-1">
          {healthData.jobs.map(job => renderJob(job, isCompact))}
        </div>

        {/* Last updated */}
        {healthData.updated && (
          <div className="text-xs text-gray-400 text-right">
            Updated: {formatTimeAgo(healthData.updated)}
          </div>
        )}
      </div>
    );
  };

  // Save settings
  const saveSettings = () => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  };

  // Settings dialog
  const renderSettings = () => (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>System Health Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title-input">Widget Title</Label>
            <Input
              id="title-input"
              type="text"
              value={localConfig.title || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLocalConfig({ ...localConfig, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-url">Health API URL</Label>
            <Input
              id="api-url"
              type="url"
              value={localConfig.apiUrl || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLocalConfig({ ...localConfig, apiUrl: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refresh-interval">Refresh Interval (seconds)</Label>
            <Input
              id="refresh-interval"
              type="number"
              min={10}
              value={localConfig.refreshInterval || 60}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setLocalConfig({ ...localConfig, refreshInterval: parseInt(e.target.value) || 60 })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            {config?.onDelete && (
              <Button variant="destructive" onClick={config.onDelete}>
                Delete Widget
              </Button>
            )}
            <Button variant="default" onClick={saveSettings}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="widget-container h-full flex flex-col relative">
      <WidgetHeader
        title={localConfig.title || DEFAULT_CONFIG.title}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="flex-grow p-2 overflow-hidden">
        {renderContent()}
      </div>

      {renderSettings()}
    </div>
  );
};

export default CronHealthWidget;
