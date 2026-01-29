/**
 * Storage Provider Interface
 *
 * Defines a common interface for different storage backends:
 * - LocalStorage: Browser localStorage (device-specific)
 * - Firebase: Firestore cloud database (requires auth)
 * - SQLite: Self-hosted backend (shared across devices)
 */

import { LayoutItem, Widget } from '@/types';
import { WidgetConfigStore } from '../configManager';

export interface Dashboard {
  id: string;
  name: string;
  visibility: 'private' | 'public' | 'team';
  sharedWith?: { email: string; permission: 'view' | 'edit' }[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppSettings {
  faviconMode?: string;
  themeMode?: string;
  themeCombo?: string;
  [key: string]: unknown;
}

export interface StorageProvider {
  // Provider identification
  readonly name: string;
  readonly isAvailable: boolean;

  // Dashboard operations
  getDashboards(): Promise<Dashboard[]>;
  getDashboard(id: string): Promise<Dashboard | null>;
  saveDashboard(dashboard: Dashboard): Promise<void>;
  deleteDashboard(id: string): Promise<void>;

  // Layout operations (per dashboard)
  getLayouts(dashboardId: string): Promise<{ [breakpoint: string]: LayoutItem[] } | null>;
  saveLayouts(dashboardId: string, layouts: { [breakpoint: string]: LayoutItem[] }): Promise<void>;

  // Widget operations (per dashboard)
  getWidgets(dashboardId: string): Promise<Widget[] | null>;
  saveWidgets(dashboardId: string, widgets: Widget[]): Promise<void>;

  // Widget config operations (global - configs are keyed by widget ID)
  getWidgetConfig(widgetId: string): Promise<Record<string, unknown> | null>;
  saveWidgetConfig(widgetId: string, config: Record<string, unknown>): Promise<void>;
  getAllWidgetConfigs(): Promise<WidgetConfigStore>;
  saveAllWidgetConfigs(configs: WidgetConfigStore): Promise<void>;
  deleteWidgetConfig(widgetId: string): Promise<void>;

  // App settings
  getAppSettings(): Promise<AppSettings | null>;
  saveAppSettings(settings: AppSettings): Promise<void>;

  // Health check
  healthCheck(): Promise<boolean>;
}

export type StorageProviderType = 'localStorage' | 'firebase' | 'sqlite';
