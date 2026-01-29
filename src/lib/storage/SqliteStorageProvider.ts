/**
 * SQLite Storage Provider
 *
 * Implements StorageProvider using HTTP requests to the Boxento backend.
 * Used for self-hosted deployments where data is shared across all devices.
 */

import { StorageProvider, Dashboard, AppSettings } from './StorageProvider';
import { LayoutItem, Widget } from '@/types';
import { WidgetConfigStore } from '../configManager';

export class SqliteStorageProvider implements StorageProvider {
  readonly name = 'sqlite';
  private baseUrl: string;
  private _isAvailable: boolean = false;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_SQLITE_API_URL || '';
  }

  get isAvailable(): boolean {
    return this._isAvailable && !!this.baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Dashboard operations
  async getDashboards(): Promise<Dashboard[]> {
    try {
      return await this.request<Dashboard[]>('/dashboards');
    } catch (e) {
      console.error('Failed to get dashboards:', e);
      // Return default if backend unavailable
      return [{
        id: 'personal',
        name: 'Personal',
        visibility: 'private',
        isDefault: true,
      }];
    }
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    try {
      return await this.request<Dashboard>(`/dashboards/${id}`);
    } catch {
      return null;
    }
  }

  async saveDashboard(dashboard: Dashboard): Promise<void> {
    const existing = await this.getDashboard(dashboard.id);
    if (existing) {
      await this.request(`/dashboards/${dashboard.id}`, {
        method: 'PUT',
        body: JSON.stringify(dashboard),
      });
    } else {
      await this.request('/dashboards', {
        method: 'POST',
        body: JSON.stringify(dashboard),
      });
    }
  }

  async deleteDashboard(id: string): Promise<void> {
    await this.request(`/dashboards/${id}`, { method: 'DELETE' });
  }

  // Layout operations
  async getLayouts(dashboardId: string): Promise<{ [breakpoint: string]: LayoutItem[] } | null> {
    try {
      const layouts = await this.request<{ [breakpoint: string]: LayoutItem[] }>(
        `/dashboards/${dashboardId}/layouts`
      );
      return Object.keys(layouts).length > 0 ? layouts : null;
    } catch {
      return null;
    }
  }

  async saveLayouts(dashboardId: string, layouts: { [breakpoint: string]: LayoutItem[] }): Promise<void> {
    await this.request(`/dashboards/${dashboardId}/layouts`, {
      method: 'PUT',
      body: JSON.stringify(layouts),
    });
  }

  // Widget operations
  async getWidgets(dashboardId: string): Promise<Widget[] | null> {
    try {
      const widgets = await this.request<Widget[]>(`/dashboards/${dashboardId}/widgets`);
      return widgets.length > 0 ? widgets : null;
    } catch {
      return null;
    }
  }

  async saveWidgets(dashboardId: string, widgets: Widget[]): Promise<void> {
    await this.request(`/dashboards/${dashboardId}/widgets`, {
      method: 'PUT',
      body: JSON.stringify(widgets),
    });
  }

  // Widget config operations
  async getWidgetConfig(widgetId: string): Promise<Record<string, unknown> | null> {
    try {
      return await this.request<Record<string, unknown>>(`/configs/${widgetId}`);
    } catch {
      return null;
    }
  }

  async saveWidgetConfig(widgetId: string, config: Record<string, unknown>): Promise<void> {
    await this.request(`/configs/${widgetId}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async getAllWidgetConfigs(): Promise<WidgetConfigStore> {
    try {
      return await this.request<WidgetConfigStore>('/configs');
    } catch {
      return {};
    }
  }

  async saveAllWidgetConfigs(configs: WidgetConfigStore): Promise<void> {
    // Save each config individually
    const promises = Object.entries(configs).map(([widgetId, config]) =>
      this.saveWidgetConfig(widgetId, config)
    );
    await Promise.all(promises);
  }

  async deleteWidgetConfig(widgetId: string): Promise<void> {
    try {
      await this.request(`/configs/${widgetId}`, { method: 'DELETE' });
    } catch {
      // Ignore errors if config doesn't exist
    }
  }

  // App settings
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const settings = await this.request<AppSettings>('/settings');
      return Object.keys(settings).length > 0 ? settings : null;
    } catch {
      return null;
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    await this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Health check - also updates availability status
  async healthCheck(): Promise<boolean> {
    if (!this.baseUrl) {
      this._isAvailable = false;
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });
      this._isAvailable = response.ok;
      return this._isAvailable;
    } catch {
      this._isAvailable = false;
      return false;
    }
  }

  // Initialize - check if backend is available
  async initialize(): Promise<boolean> {
    return this.healthCheck();
  }
}

// Singleton instance
let sqliteProvider: SqliteStorageProvider | null = null;

export function getSqliteStorageProvider(): SqliteStorageProvider {
  if (!sqliteProvider) {
    sqliteProvider = new SqliteStorageProvider();
  }
  return sqliteProvider;
}
