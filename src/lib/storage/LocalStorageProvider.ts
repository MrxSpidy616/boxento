/**
 * LocalStorage Provider
 *
 * Implements StorageProvider using browser localStorage.
 * This is device-specific storage - data does not sync across devices.
 */

import { StorageProvider, Dashboard, AppSettings } from './StorageProvider';
import { LayoutItem, Widget } from '@/types';
import { WidgetConfigStore } from '../configManager';
import { STORAGE_KEYS } from '../constants';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'localStorage';

  get isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private safeGetItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return null;
    }
  }

  private safeSetItem(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
    }
  }

  // Dashboard operations
  async getDashboards(): Promise<Dashboard[]> {
    const dashboards = this.safeGetItem<Dashboard[]>('boxento-dashboards');
    if (!dashboards || dashboards.length === 0) {
      // Return default personal dashboard
      return [{
        id: 'personal',
        name: 'Personal',
        visibility: 'private',
        isDefault: true,
        createdAt: new Date().toISOString(),
      }];
    }
    return dashboards;
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    const dashboards = await this.getDashboards();
    return dashboards.find(d => d.id === id) || null;
  }

  async saveDashboard(dashboard: Dashboard): Promise<void> {
    const dashboards = await this.getDashboards();
    const index = dashboards.findIndex(d => d.id === dashboard.id);
    if (index >= 0) {
      dashboards[index] = { ...dashboards[index], ...dashboard, updatedAt: new Date().toISOString() };
    } else {
      dashboards.push({ ...dashboard, createdAt: new Date().toISOString() });
    }
    this.safeSetItem('boxento-dashboards', dashboards);
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboards = await this.getDashboards();
    const filtered = dashboards.filter(d => d.id !== id);
    this.safeSetItem('boxento-dashboards', filtered);
    // Also clean up dashboard-specific data
    localStorage.removeItem(`boxento-widgets-${id}`);
    localStorage.removeItem(`boxento-layouts-${id}`);
  }

  // Layout operations
  async getLayouts(dashboardId: string): Promise<{ [breakpoint: string]: LayoutItem[] } | null> {
    // Try dashboard-specific key first
    let layouts = this.safeGetItem<{ [breakpoint: string]: LayoutItem[] }>(`boxento-layouts-${dashboardId}`);
    if (layouts) return layouts;

    // Fall back to legacy global key for personal dashboard
    if (dashboardId === 'personal') {
      layouts = this.safeGetItem<{ [breakpoint: string]: LayoutItem[] }>(STORAGE_KEYS.LAYOUTS);
      return layouts;
    }

    return null;
  }

  async saveLayouts(dashboardId: string, layouts: { [breakpoint: string]: LayoutItem[] }): Promise<void> {
    // Save to dashboard-specific key
    this.safeSetItem(`boxento-layouts-${dashboardId}`, layouts);
    // Also save to legacy key for personal dashboard
    if (dashboardId === 'personal') {
      this.safeSetItem(STORAGE_KEYS.LAYOUTS, layouts);
    }
  }

  // Widget operations
  async getWidgets(dashboardId: string): Promise<Widget[] | null> {
    // Try dashboard-specific key first
    let widgets = this.safeGetItem<Widget[]>(`boxento-widgets-${dashboardId}`);
    if (widgets) return widgets;

    // Fall back to legacy global key for personal dashboard
    if (dashboardId === 'personal') {
      widgets = this.safeGetItem<Widget[]>(STORAGE_KEYS.WIDGETS);
      return widgets;
    }

    return null;
  }

  async saveWidgets(dashboardId: string, widgets: Widget[]): Promise<void> {
    // Save to dashboard-specific key
    this.safeSetItem(`boxento-widgets-${dashboardId}`, widgets);
    // Also save to legacy key for personal dashboard
    if (dashboardId === 'personal') {
      this.safeSetItem(STORAGE_KEYS.WIDGETS, widgets);
    }
  }

  // Widget config operations
  async getWidgetConfig(widgetId: string): Promise<Record<string, unknown> | null> {
    const configs = await this.getAllWidgetConfigs();
    return configs[widgetId] || null;
  }

  async saveWidgetConfig(widgetId: string, config: Record<string, unknown>): Promise<void> {
    const configs = await this.getAllWidgetConfigs();
    configs[widgetId] = config;
    this.safeSetItem(STORAGE_KEYS.WIDGET_CONFIGS, configs);
  }

  async getAllWidgetConfigs(): Promise<WidgetConfigStore> {
    return this.safeGetItem<WidgetConfigStore>(STORAGE_KEYS.WIDGET_CONFIGS) || {};
  }

  async saveAllWidgetConfigs(configs: WidgetConfigStore): Promise<void> {
    this.safeSetItem(STORAGE_KEYS.WIDGET_CONFIGS, configs);
  }

  async deleteWidgetConfig(widgetId: string): Promise<void> {
    const configs = await this.getAllWidgetConfigs();
    delete configs[widgetId];
    this.safeSetItem(STORAGE_KEYS.WIDGET_CONFIGS, configs);
  }

  // App settings
  async getAppSettings(): Promise<AppSettings | null> {
    return this.safeGetItem<AppSettings>(STORAGE_KEYS.APP_SETTINGS);
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    this.safeSetItem(STORAGE_KEYS.APP_SETTINGS, settings);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    return this.isAvailable;
  }
}

export const localStorageProvider = new LocalStorageProvider();
