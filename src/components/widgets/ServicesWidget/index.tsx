import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import WidgetHeader from '../common/WidgetHeader';
import { WidgetProps } from '@/types';
import { ServicesWidgetConfig, Service } from './types';
import { cn } from '@/lib/utils';
import {
  Globe,
  Server,
  LayoutGrid,
  PiggyBank,
  BookOpen,
  Play,
  Film,
  Bot,
  Plus,
  Trash2,
  LucideIcon,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';

type ServicesWidgetProps = WidgetProps<ServicesWidgetConfig>;

// Icon mapping
const ICONS: Record<string, LucideIcon> = {
  Globe,
  Server,
  LayoutGrid,
  PiggyBank,
  BookOpen,
  Play,
  Film,
  Bot,
};

// Base URL for services - override with VITE_SERVICES_BASE_URL env var
// Examples: "http://localhost" or "https://mini.tailf2415.ts.net"
const SERVICES_BASE_URL = import.meta.env.VITE_SERVICES_BASE_URL || 'http://localhost';
const IS_REMOTE = SERVICES_BASE_URL.includes('https://');

// Service ports - can be overridden with environment variables
const FAVA_PORT = import.meta.env.VITE_FAVA_PORT || '7503';

// Default services - users can customize URLs in widget settings
const DEFAULT_SERVICES: Service[] = [
  {
    id: 'boxento',
    name: 'Boxento',
    // Boxento uses default port (443) when served via Tailscale HTTPS, else 5173
    url: IS_REMOTE ? SERVICES_BASE_URL : `${SERVICES_BASE_URL}:5173`,
    icon: 'LayoutGrid',
    description: 'Dashboard',
    category: 'Utilities'
  },
  {
    id: 'paisa',
    name: 'Paisa',
    url: `${SERVICES_BASE_URL}:7500`,
    icon: 'PiggyBank',
    description: 'Personal Finance',
    category: 'Finance'
  },
  {
    id: 'fava',
    name: 'Fava',
    url: `${SERVICES_BASE_URL}:${FAVA_PORT}`,
    icon: 'BookOpen',
    description: 'Beancount',
    category: 'Finance'
  },
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    url: `${SERVICES_BASE_URL}:8096`,
    icon: 'Play',
    description: 'Media Server',
    category: 'Media'
  },
  {
    id: 'riven',
    name: 'Riven',
    url: `${SERVICES_BASE_URL}:3000`,
    icon: 'Film',
    description: 'Media Requests',
    category: 'Media'
  },
  {
    id: 'ollama',
    name: 'Open WebUI',
    url: `${SERVICES_BASE_URL}:3080`,
    icon: 'Bot',
    description: 'Local AI Chat',
    category: 'AI'
  }
];

const DEFAULT_CONFIG: ServicesWidgetConfig = {
  title: 'Services',
  services: DEFAULT_SERVICES,
  showStatus: true,
  checkInterval: 60
};

const mergeConfigWithDefaults = (config?: ServicesWidgetConfig): ServicesWidgetConfig => ({
  ...DEFAULT_CONFIG,
  ...config,
  services: config?.services ?? DEFAULT_SERVICES
});

const getIcon = (iconName?: string): LucideIcon => {
  if (!iconName) return Globe;
  return ICONS[iconName] || Globe;
};

const getStatusColor = (status?: 'online' | 'offline' | 'checking') => {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'offline':
      return 'bg-red-500';
    case 'checking':
      return 'bg-yellow-500 animate-pulse';
    default:
      return 'bg-gray-400';
  }
};

const getStatusLabel = (status?: 'online' | 'offline' | 'checking') => {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'checking':
      return 'Checking';
    default:
      return 'Unknown';
  }
};

const getStatusIcon = (status?: 'online' | 'offline' | 'checking') => {
  switch (status) {
    case 'online':
      return Wifi;
    case 'offline':
      return WifiOff;
    default:
      return Activity;
  }
};

const getServiceHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0];
  }
};

const getServicePathLabel = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
  } catch {
    return '/';
  }
};

const ServicesWidget: React.FC<ServicesWidgetProps> = ({ width, height, config }) => {
  const isTiny = width === 1 && height === 1;
  const mergedConfig = useMemo(() => mergeConfigWithDefaults(config), [config]);

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [localConfig, setLocalConfig] = useState<ServicesWidgetConfig>(() => mergedConfig);
  const [serviceStatus, setServiceStatus] = useState<Record<string, 'online' | 'offline' | 'checking'>>({});
  // const [editingService, setEditingService] = useState<Service | null>(null);
  const [showAddService, setShowAddService] = useState<boolean>(false);
  const [newService, setNewService] = useState<Partial<Service>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update local config when props change
  useEffect(() => {
    setLocalConfig(mergedConfig);
  }, [mergedConfig]);

  // Check service status
  const checkServiceStatus = useCallback(async (service: Service) => {
    setServiceStatus(prev => ({ ...prev, [service.id]: 'checking' }));

    try {
      // Use the service URL or a custom status URL
      const urlToCheck = service.statusUrl || service.url;

      // We can't directly fetch due to CORS, so we'll use a simple approach
      // In production, you'd want a backend proxy for this
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(urlToCheck, {
        method: 'HEAD',
        mode: 'no-cors', // This won't give us status but will tell us if reachable
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      // With no-cors, we can't read the response, but if we get here without error, it's likely online
      setServiceStatus(prev => ({ ...prev, [service.id]: 'online' }));
    } catch {
      setServiceStatus(prev => ({ ...prev, [service.id]: 'offline' }));
    }
  }, []);

  // Check all services on mount and interval
  useEffect(() => {
    if (!localConfig.showStatus) return;

    const checkAll = () => {
      localConfig.services.forEach(service => {
        checkServiceStatus(service);
      });
    };

    checkAll();
    const interval = setInterval(checkAll, (localConfig.checkInterval || 60) * 1000);

    return () => clearInterval(interval);
  }, [localConfig.services, localConfig.showStatus, localConfig.checkInterval, checkServiceStatus]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setContainerWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Open service in new tab
  const openService = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const getCompactGridCols = () => {
    if (width >= 4) return 'grid-cols-4';
    if (width >= 3) return 'grid-cols-3';
    if (width >= 2) return 'grid-cols-2';
    return 'grid-cols-1';
  };

  const getRegularGridColumns = (measuredWidth: number) => {
    if (measuredWidth >= 1500) return 5;
    if (measuredWidth >= 1100) return 4;
    if (measuredWidth >= 680) return 3;
    if (measuredWidth >= 430) return 2;

    if (width >= 12) return 5;
    if (width >= 9) return 4;
    if (width >= 6) return 3;
    if (width >= 3) return 2;
    return 1;
  };

  // Delete service handler
  const handleDeleteService = useCallback((serviceId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== serviceId)
    }));
  }, []);

  const { categoryCount, onlineCount, offlineCount } = useMemo(() => {
    const stats = localConfig.services.reduce(
      (acc, service) => {
        if (service.category) {
          acc.categories.add(service.category);
        }

        const status = serviceStatus[service.id];
        if (status === 'online') {
          acc.online += 1;
        } else if (status === 'offline') {
          acc.offline += 1;
        }

        return acc;
      },
      {
        categories: new Set<string>(),
        online: 0,
        offline: 0,
      }
    );

    return {
      categoryCount: stats.categories.size,
      onlineCount: stats.online,
      offlineCount: stats.offline,
    };
  }, [localConfig.services, serviceStatus]);

  const renderServiceSettingsCard = useCallback((service: Service) => {
    const Icon = getIcon(service.icon);
    const status = serviceStatus[service.id];
    const StatusIcon = getStatusIcon(status);

    return (
      <div
        key={service.id}
        className="grid min-w-[760px] grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_minmax(0,0.85fr)_auto] gap-3 px-3 py-2.5"
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <Icon className="size-3.5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{service.name}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {service.description || 'No description'}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="truncate font-mono text-[11px] text-foreground" title={service.url}>
            {service.url}
          </div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">
            {getServiceHost(service.url)} · {getServicePathLabel(service.url)}
          </div>
        </div>

        <div className="min-w-0 text-[11px] text-muted-foreground">
          <div className="truncate">{service.category || 'Uncategorized'}</div>
          {localConfig.showStatus && (
            <div
              className={cn(
                'mt-1 inline-flex items-center gap-1 font-medium',
                status === 'online' && 'text-emerald-700 dark:text-emerald-300',
                status === 'offline' && 'text-rose-700 dark:text-rose-300'
              )}
            >
              <div className={cn('size-1.5 rounded-full', getStatusColor(status))} />
              <StatusIcon className="size-3" />
              <span>{getStatusLabel(status)}</span>
            </div>
          )}
        </div>

        <div className="flex items-start gap-1 justify-self-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openService(service.url)}
            aria-label={`Open ${service.name}`}
          >
            <ArrowUpRight />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteService(service.id)}
            aria-label={`Delete ${service.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    );
  }, [handleDeleteService, localConfig.showStatus, openService, serviceStatus]);

  // Render service card
  const renderServiceCard = (service: Service, compact: boolean = false) => {
    const Icon = getIcon(service.icon);
    const status = serviceStatus[service.id];

    if (compact) {
      const StatusIcon = getStatusIcon(status);

      return (
        <button
          key={service.id}
          onClick={() => openService(service.url)}
          className="relative flex flex-col items-center justify-center gap-2 rounded-xl border border-black/5 bg-black/[0.02] p-2 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
          title={`${service.name}${service.description ? ` - ${service.description}` : ''}`}
        >
          {localConfig.showStatus && (
            <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(status)}`} />
          )}
          <Icon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <span className="w-full truncate text-center text-xs font-medium">{service.name}</span>
          {localConfig.showStatus && (
            <StatusIcon className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          )}
        </button>
      );
    }

    const serviceHost = getServiceHost(service.url);
    const StatusIcon = getStatusIcon(status);

    return (
      <button
        key={service.id}
        onClick={() => openService(service.url)}
        className="group flex h-full min-h-[112px] flex-col justify-between rounded-xl border border-black/5 bg-black/[0.02] p-4 text-left transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 text-gray-700 shadow-sm ring-1 ring-black/5 dark:bg-black/20 dark:text-gray-200 dark:ring-white/10">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{service.name}</div>
              <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{serviceHost}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-black/5 dark:bg-black/20 dark:text-gray-300 dark:ring-white/10">
            {localConfig.showStatus && (
              <div className={`h-2 w-2 rounded-full ${getStatusColor(status)}`} />
            )}
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{getStatusLabel(status)}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {service.description && (
            <div className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{service.description}</div>
          )}
          {!service.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Open service dashboard</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500 dark:text-gray-400">
          <div className="flex min-w-0 items-center gap-2">
            {service.category && (
              <span className="truncate rounded-full bg-white/70 px-2 py-1 ring-1 ring-black/5 dark:bg-black/20 dark:ring-white/10">
                {service.category}
              </span>
            )}
            <span className="truncate">{serviceHost}</span>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </button>
    );
  };

  // Render content based on size
  const renderContent = () => {
    const services = localConfig.services || [];
    const isShort = height === 1 && width > 1;
    const isCompact = width <= 2 || height <= 2;
    const regularColumns = Math.min(getRegularGridColumns(containerWidth), Math.max(services.length, 1));
    const statusSummary = services.reduce(
      (summary, service) => {
        const status = serviceStatus[service.id];
        if (status === 'online') summary.online += 1;
        else if (status === 'offline') summary.offline += 1;
        else if (status === 'checking') summary.checking += 1;
        return summary;
      },
      { online: 0, offline: 0, checking: 0 }
    );

    if (services.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Server className="w-8 h-8 mb-2" />
          <span className="text-sm">No services configured</span>
          <button
            onClick={() => setShowSettings(true)}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            Add services
          </button>
        </div>
      );
    }

    if (isTiny) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
          <div className="text-lg font-semibold leading-none text-gray-900 dark:text-gray-100">
            {localConfig.showStatus ? `${statusSummary.online}/${services.length}` : services.length}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-300">
            {localConfig.showStatus ? 'online' : 'services'}
          </div>
        </div>
      );
    }

    if (isShort) {
      const ribbonServices = services.slice(0, Math.min(services.length, Math.max(2, width + 1)));
      return (
        <div className="flex h-full items-center gap-2 overflow-x-auto px-1 text-xs">
          <span className="shrink-0 rounded-full bg-black/[0.04] px-2 py-1 font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
            {services.length} services
          </span>
          {localConfig.showStatus && (
            <>
              <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-1 text-green-700 dark:text-green-300">
                {statusSummary.online} online
              </span>
              <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-1 text-red-700 dark:text-red-300">
                {statusSummary.offline} offline
              </span>
            </>
          )}
          {ribbonServices.map((service) => {
            const Icon = getIcon(service.icon);
            return (
              <button
                key={service.id}
                onClick={() => openService(service.url)}
                className="flex shrink-0 items-center gap-2 rounded-full border border-black/5 bg-white/80 px-2.5 py-1.5 text-gray-700 ring-1 ring-black/5 transition-colors hover:bg-black/[0.04] dark:border-white/10 dark:bg-black/20 dark:text-gray-200 dark:ring-white/10"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="max-w-[8rem] truncate">{service.name}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (isCompact) {
      return (
        <div className={`grid ${getCompactGridCols()} gap-2 h-full overflow-auto`}>
          {services.map(service => renderServiceCard(service, true))}
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col gap-3 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="rounded-full bg-black/[0.04] px-2.5 py-1 font-medium text-gray-700 dark:bg-white/[0.06] dark:text-gray-200">
            {services.length} services
          </span>
          {localConfig.showStatus && (
            <>
              <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-green-700 dark:text-green-300">
                {statusSummary.online} online
              </span>
              <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-700 dark:text-red-300">
                {statusSummary.offline} offline
              </span>
              {statusSummary.checking > 0 && (
                <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-yellow-700 dark:text-yellow-300">
                  {statusSummary.checking} checking
                </span>
              )}
            </>
          )}
        </div>

        <div
          className="grid flex-1 gap-3 overflow-auto pr-1"
          style={{
            gridTemplateColumns: `repeat(${regularColumns}, minmax(0, 1fr))`,
            gridAutoRows: 'minmax(112px, auto)',
          }}
        >
          {services.map(service => renderServiceCard(service, false))}
        </div>
      </div>
    );
  };

  // Add service handler
  const handleAddService = useCallback(() => {
    if (!newService.name || !newService.url) return;

    const service: Service = {
      id: `service-${Date.now()}`,
      name: newService.name,
      url: newService.url,
      icon: newService.icon || 'Globe',
      description: newService.description,
      category: newService.category
    };

    setLocalConfig(prev => ({
      ...prev,
      services: [...prev.services, service]
    }));
    setNewService({});
    setShowAddService(false);
  }, [newService]);

  const resetSettingsDraft = useCallback(() => {
    setLocalConfig(mergedConfig);
  }, [mergedConfig]);

  const handleSettingsOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      resetSettingsDraft();
    } else {
      setLocalConfig(mergedConfig);
    }
    setShowSettings(nextOpen);
  }, [mergedConfig, resetSettingsDraft]);

  const handleCancelSettings = useCallback(() => {
    resetSettingsDraft();
    setShowSettings(false);
  }, [resetSettingsDraft]);

  // Save settings
  const saveSettings = useCallback(() => {
    if (config?.onUpdate) {
      config.onUpdate(localConfig);
    }
    setShowSettings(false);
  }, [config, localConfig]);

  // Settings dialog
  const renderSettings = () => (
    <Dialog open={showSettings} onOpenChange={handleSettingsOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-[980px]">
        <DialogHeader className="gap-2 px-6 pt-6">
          <DialogTitle>Services Settings</DialogTitle>
          <DialogDescription>
            Tune the widget and manage the service catalog from one dense editor view.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="title-input">Widget title</Label>
              <Input
                id="title-input"
                type="text"
                value={localConfig.title || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLocalConfig({ ...localConfig, title: e.target.value })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border border-border/70 px-3 py-2 md:min-w-[280px]">
              <div className="min-w-0">
                <Label htmlFor="status-toggle" className="text-sm font-medium">
                  Show status indicators
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Surface online and offline state in the service list.
                </p>
              </div>
              <Switch
                id="status-toggle"
                checked={Boolean(localConfig.showStatus)}
                onCheckedChange={(checked: boolean) =>
                  setLocalConfig({ ...localConfig, showStatus: checked })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Services</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {localConfig.services.length} total · {categoryCount} categories
                {localConfig.showStatus ? ` · ${onlineCount} online · ${offlineCount} offline` : ' · status hidden'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddService(true)}>
              <Plus />
              Add service
            </Button>
          </div>

          <div className="overflow-hidden rounded-md border border-border/70">
            <div className="overflow-x-auto">
              <div className="grid min-w-[760px] grid-cols-[minmax(0,1.1fr)_minmax(0,1.7fr)_minmax(0,0.85fr)_auto] gap-3 border-b border-border/70 bg-muted/20 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <span>Service</span>
                <span>URL</span>
                <span>Meta</span>
                <span className="justify-self-end">Actions</span>
              </div>

              <div className="max-h-[min(54vh,520px)] divide-y divide-border/70 overflow-y-auto">
                {localConfig.services.map((service) => renderServiceSettingsCard(service))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {config?.onDelete && (
              <Button variant="destructive" onClick={config.onDelete}>
                Delete Widget
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCancelSettings}>
              Cancel
            </Button>
            <Button variant="default" onClick={saveSettings}>
              Save changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Add service dialog
  const renderAddServiceDialog = () => (
    <Dialog open={showAddService} onOpenChange={setShowAddService}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">Name *</Label>
            <Input
              id="service-name"
              type="text"
              placeholder="My Service"
              value={newService.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewService({...newService, name: e.target.value})
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-url">URL *</Label>
            <Input
              id="service-url"
              type="url"
              placeholder="https://example.com"
              value={newService.url || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewService({...newService, url: e.target.value})
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-icon">Icon (Lucide icon name)</Label>
            <Input
              id="service-icon"
              type="text"
              placeholder="Globe, Server, Database..."
              value={newService.icon || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewService({...newService, icon: e.target.value})
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-desc">Description</Label>
            <Input
              id="service-desc"
              type="text"
              placeholder="What this service does"
              value={newService.description || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewService({...newService, description: e.target.value})
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAddService(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleAddService}
            disabled={!newService.name || !newService.url}
          >
            Add Service
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div
      ref={containerRef}
      className={`widget-container h-full flex flex-col relative ${isTiny ? 'widget-drag-handle' : ''}`}
    >
      {!isTiny && (
        <WidgetHeader
          title={localConfig.title || DEFAULT_CONFIG.title}
          onSettingsClick={() => setShowSettings(true)}
          compact={width === 1 || height === 1}
        />
      )}

      <div className={`flex-grow overflow-hidden ${isTiny ? 'p-2' : width === 1 || height === 1 ? 'p-1.5' : 'p-2'}`}>
        {renderContent()}
      </div>

      {renderSettings()}
      {renderAddServiceDialog()}
    </div>
  );
};

export default ServicesWidget;
