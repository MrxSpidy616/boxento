/**
 * Firebase Storage Provider
 *
 * Implements StorageProvider using Firestore.
 * Requires authentication - wraps existing firestoreService.
 */

import { StorageProvider, Dashboard, AppSettings } from './StorageProvider';
import { LayoutItem, Widget } from '@/types';
import { WidgetConfigStore } from '../configManager';
import { userDashboardService } from '../firestoreService';
import { auth, isFirebaseInitialized } from '../firebase';

export class FirebaseStorageProvider implements StorageProvider {
  readonly name = 'firebase';

  get isAvailable(): boolean {
    return isFirebaseInitialized && !!auth?.currentUser;
  }

  private checkAuth(): void {
    if (!this.isAvailable) {
      throw new Error('Firebase not available or user not authenticated');
    }
  }

  /**
   * Check if the dashboard ID is 'personal'.
   * Firebase only supports a single personal dashboard per user.
   * Non-personal dashboards should use localStorage only.
   */
  private isPersonalDashboard(dashboardId: string): boolean {
    return dashboardId === 'personal';
  }

  // Dashboard operations
  // Note: Firebase currently only supports a single "personal" dashboard per user
  // Multi-dashboard support would require schema changes
  async getDashboards(): Promise<Dashboard[]> {
    // Firebase uses a single user dashboard, return it as 'personal'
    return [{
      id: 'personal',
      name: 'Personal',
      visibility: 'private',
      isDefault: true,
    }];
  }

  async getDashboard(id: string): Promise<Dashboard | null> {
    if (id === 'personal') {
      return {
        id: 'personal',
        name: 'Personal',
        visibility: 'private',
        isDefault: true,
      };
    }
    return null;
  }

  async saveDashboard(_dashboard: Dashboard): Promise<void> {
    // Firebase currently doesn't support saving dashboard metadata separately
    // The dashboard is implicitly created when saving widgets/layouts
  }

  async deleteDashboard(_id: string): Promise<void> {
    // Firebase doesn't support deleting the personal dashboard
    throw new Error('Cannot delete personal dashboard in Firebase mode');
  }

  // Layout operations
  async getLayouts(dashboardId: string): Promise<{ [breakpoint: string]: LayoutItem[] } | null> {
    // Firebase only supports the personal dashboard
    if (!this.isPersonalDashboard(dashboardId)) {
      return null;
    }
    this.checkAuth();
    return userDashboardService.loadLayouts();
  }

  async saveLayouts(dashboardId: string, layouts: { [breakpoint: string]: LayoutItem[] }): Promise<void> {
    // Firebase only supports the personal dashboard - silently ignore non-personal saves
    // to prevent overwriting personal data when editing other dashboards
    if (!this.isPersonalDashboard(dashboardId)) {
      console.log('[Firebase] Ignoring saveLayouts for non-personal dashboard:', dashboardId);
      return;
    }
    this.checkAuth();
    return userDashboardService.saveLayouts(layouts);
  }

  // Widget operations
  async getWidgets(dashboardId: string): Promise<Widget[] | null> {
    // Firebase only supports the personal dashboard
    if (!this.isPersonalDashboard(dashboardId)) {
      return null;
    }
    this.checkAuth();
    const widgets = await userDashboardService.loadWidgets();
    return widgets as Widget[] | null;
  }

  async saveWidgets(dashboardId: string, widgets: Widget[]): Promise<void> {
    // Firebase only supports the personal dashboard - silently ignore non-personal saves
    // to prevent overwriting personal data when editing other dashboards
    if (!this.isPersonalDashboard(dashboardId)) {
      console.log('[Firebase] Ignoring saveWidgets for non-personal dashboard:', dashboardId);
      return;
    }
    this.checkAuth();
    return userDashboardService.saveWidgets(widgets);
  }

  // Widget config operations
  async getWidgetConfig(widgetId: string): Promise<Record<string, unknown> | null> {
    this.checkAuth();
    return userDashboardService.loadWidgetConfig(widgetId);
  }

  async saveWidgetConfig(widgetId: string, config: Record<string, unknown>): Promise<void> {
    this.checkAuth();
    return userDashboardService.saveWidgetConfig(widgetId, config);
  }

  async getAllWidgetConfigs(): Promise<WidgetConfigStore> {
    this.checkAuth();
    return (await userDashboardService.loadAllWidgetConfigs()) || {};
  }

  async saveAllWidgetConfigs(configs: WidgetConfigStore): Promise<void> {
    this.checkAuth();
    return userDashboardService.saveAllWidgetConfigs(configs);
  }

  async deleteWidgetConfig(widgetId: string): Promise<void> {
    this.checkAuth();
    return userDashboardService.deleteWidgetConfig(widgetId);
  }

  // App settings
  async getAppSettings(): Promise<AppSettings | null> {
    this.checkAuth();
    const settings = await userDashboardService.loadAppSettings();
    return settings as AppSettings | null;
  }

  async saveAppSettings(settings: AppSettings): Promise<void> {
    this.checkAuth();
    return userDashboardService.saveAppSettings(settings);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    return this.isAvailable;
  }
}

export const firebaseStorageProvider = new FirebaseStorageProvider();
