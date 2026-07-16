import { db, auth, isFirebaseInitialized } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  Firestore
} from 'firebase/firestore';
import { WidgetConfigStore } from './configManager';
import { LayoutItem, Widget } from '@/types';
import { breakpoints, cols, createDefaultLayoutItem } from './layoutUtils';
import { Dashboard, DashboardVisibility, SharedUser } from '@/components/dashboard/DashboardSwitcher';

// Public dashboard data structure
export interface PublicDashboardData {
  id: string;
  name: string;
  visibility: DashboardVisibility;
  sharedWith: SharedUser[];
  ownerId: string;
  ownerEmail?: string;
  createdAt: string;
  updatedAt: string;
  widgets: Widget[];
  layouts: { [key: string]: LayoutItem[] };
  widgetConfigs: WidgetConfigStore;
}

const checkFirebase = (): Firestore => {
  if (!isFirebaseInitialized || !db) {
    throw new Error('Firebase is not initialized');
  }
  return db;
};

const getCurrentUserId = (): string | null => {
  if (!isFirebaseInitialized || !auth) return null;
  return auth.currentUser?.uid || null;
};

// User dashboard data service
export const userDashboardService = {
  // Save the user's dashboard layouts
  saveLayouts: async (layouts: { [key: string]: LayoutItem[] }): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const firestore = checkFirebase();
      
      // Sanitize the layouts object to remove undefined values
      const sanitizedLayouts = JSON.parse(JSON.stringify(layouts));
      
      // Store layouts directly without wrapping in another object
      await setDoc(doc(firestore, 'users', userId, 'dashboard', 'layouts'), sanitizedLayouts, { merge: true });
    } catch (error) {
      console.error('Error saving layouts to Firestore:', error);
      throw error;
    }
  },

  // Load the user's dashboard layouts
  loadLayouts: async (): Promise<{ [key: string]: LayoutItem[] } | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    try {
      const firestore = checkFirebase();
      const docRef = doc(firestore, 'users', userId, 'dashboard', 'layouts');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as { [key: string]: LayoutItem[] };
      }
      return null;
    } catch (error) {
      console.error('Error loading layouts from Firestore:', error);
      throw error;
    }
  },

  // Save a widget configuration
  saveWidgetConfig: async (widgetId: string, config: Record<string, unknown>): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const firestore = checkFirebase();
      // Sanitize the config object to remove undefined values
      const sanitizedConfig = JSON.parse(JSON.stringify(config));
      
      await setDoc(
        doc(firestore, 'users', userId, 'dashboard', 'widget-configs', 'configs', widgetId),
        { config: sanitizedConfig },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving widget config to Firestore:', error);
      throw error;
    }
  },

  // Load a widget configuration
  loadWidgetConfig: async (widgetId: string): Promise<Record<string, unknown> | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    try {
      const firestore = checkFirebase();
      const docRef = doc(firestore, 'users', userId, 'dashboard', 'widget-configs', 'configs', widgetId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data()?.config || null;
      }
      return null;
    } catch (error) {
      console.error('Error loading widget config from Firestore:', error);
      throw error;
    }
  },

  // Save all widget configurations at once
  saveAllWidgetConfigs: async (configs: WidgetConfigStore): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const firestore = checkFirebase();
      // Create a batch of operations for better performance
      const batch = writeBatch(firestore);
      
      // Add each widget config to the batch
      Object.entries(configs).forEach(([widgetId, config]) => {
        const docRef = doc(firestore, 'users', userId, 'dashboard', 'widget-configs', 'configs', widgetId);
        batch.set(docRef, { config }, { merge: true });
      });
      
      // Commit the batch
      await batch.commit();
    } catch (error) {
      console.error('Error saving all widget configs to Firestore:', error);
      throw error;
    }
  },

  // Load all widget configurations
  loadAllWidgetConfigs: async (): Promise<WidgetConfigStore | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    try {
      const firestore = checkFirebase();
      const colRef = collection(firestore, 'users', userId, 'dashboard', 'widget-configs', 'configs');
      const querySnapshot = await getDocs(colRef);
      
      const configs: WidgetConfigStore = {};
      querySnapshot.forEach((doc) => {
        configs[doc.id] = doc.data()?.config || {};
      });
      
      return configs;
    } catch (error) {
      console.error('Error loading all widget configs from Firestore:', error);
      throw error;
    }
  },

  // Save the list of installed widgets
  saveWidgets: async (widgets: Record<string, unknown>[]): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Strip out configuration data to avoid redundancy
      const essentialWidgetData = widgets.map(widget => {
        // Extract only the essential fields
        const id = widget.id as string | undefined;
        const type = widget.type as string | undefined;
        
        if (!id || !type) {
          throw new Error('Widget data is missing required fields (id or type)');
        }
        
        return {
          id,
          type,
          // Add any other essential metadata fields here (but NOT config)
        };
      });
      
      // Sanitize the widgets array to remove undefined values
      const sanitizedWidgets = JSON.parse(JSON.stringify(essentialWidgetData));
      
      const firestore = checkFirebase();
      await setDoc(
        doc(firestore, 'users', userId, 'dashboard', 'widget-list'),
        { widgets: sanitizedWidgets },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving widgets to Firestore:', error);
      throw error;
    }
  },

  // Load the list of installed widgets
  loadWidgets: async (): Promise<Record<string, unknown>[] | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;
    
    try {
      const firestore = checkFirebase();
      const docRef = doc(firestore, 'users', userId, 'dashboard', 'widget-list');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data()?.widgets || null;
      }
      return null;
    } catch (error) {
      console.error('Error loading widgets from Firestore:', error);
      throw error;
    }
  },

  // Rebuild layouts from widgets (recovery function)
  rebuildLayoutsFromWidgets: async (widgets: { id: string; type: string }[]): Promise<{ [key: string]: LayoutItem[] }> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Generate new layouts for all widgets
    const newLayouts: { [key: string]: LayoutItem[] } = {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: []
    };

    // Position widgets in a grid
    widgets.forEach((widget, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;

      // Desktop (lg) - 12 columns, 3 cols per widget
      newLayouts.lg.push({
        i: widget.id,
        x: (col * 3) % 12,
        y: row * 3,
        w: 3,
        h: 3,
        minW: 2,
        minH: 2
      });

      // Medium (md) - 10 columns
      newLayouts.md.push({
        i: widget.id,
        x: (col * 3) % 9,
        y: row * 3,
        w: 3,
        h: 3,
        minW: 2,
        minH: 2
      });

      // Small (sm) - 6 columns
      newLayouts.sm.push({
        i: widget.id,
        x: (col * 3) % 6,
        y: row * 3,
        w: 3,
        h: 3,
        minW: 2,
        minH: 2
      });

      // Extra small (xs, xxs) - 2 columns
      newLayouts.xs.push({
        i: widget.id,
        x: 0,
        y: index * 3,
        w: 2,
        h: 3,
        minW: 2,
        minH: 2
      });

      newLayouts.xxs.push({
        i: widget.id,
        x: 0,
        y: index * 3,
        w: 2,
        h: 3,
        minW: 2,
        minH: 2
      });
    });

    // Save the new layouts
    await userDashboardService.saveLayouts(newLayouts);
    console.log('[Recovery] Rebuilt layouts for', widgets.length, 'widgets');

    return newLayouts;
  },

  // Delete a widget configuration
  deleteWidgetConfig: async (widgetId: string): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    try {
      const firestore = checkFirebase();
      await deleteDoc(doc(firestore, 'users', userId, 'dashboard', 'widget-configs', 'configs', widgetId));
    } catch (error) {
      console.error('Error deleting widget config from Firestore:', error);
      throw error;
    }
  },

  // Migrate legacy layout data structure
  migrateLayoutDataStructure: async (): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      const firestore = checkFirebase();
      const docRef = doc(firestore, 'users', userId, 'dashboard', 'layouts');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if layouts are nested under 'layouts' property (old format)
        if (data && 'layouts' in data && typeof data.layouts === 'object' && !Array.isArray(data.layouts)) {
          // Save layouts directly without the wrapper
          await setDoc(docRef, data.layouts, { merge: true });
          console.warn('Migrated legacy layout structure to new format');
        }
      }
    } catch (error) {
      console.error('Error migrating layout data structure:', error);
      throw error;
    }
  },

  // Migrate data from localStorage to Firestore
  migrateFromLocalStorage: async (): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }

      // Helper function to safely parse JSON
      const safeJSONParse = <T>(str: string | null): T | null => {
        if (!str) return null;
        try {
          return JSON.parse(str) as T;
        } catch (error) {
          console.error('Error parsing JSON:', error);
          return null;
        }
      };

      // Migrate layouts
      const storedLayouts = localStorage.getItem('boxento-layouts');
      const layouts = safeJSONParse<{ [key: string]: LayoutItem[] }>(storedLayouts);
      if (layouts) {
        await userDashboardService.saveLayouts(layouts);
      }
      
      // Migrate widgets
      const storedWidgets = localStorage.getItem('boxento-widgets');
      const widgets = safeJSONParse<Record<string, unknown>[]>(storedWidgets);
      if (widgets) {
        await userDashboardService.saveWidgets(widgets);
      }
      
      // Migrate widget configs
      const storedConfigs = localStorage.getItem('boxento-widget-configs');
      const configs = safeJSONParse<WidgetConfigStore>(storedConfigs);
      if (configs) {
        await userDashboardService.saveAllWidgetConfigs(configs);
      }
      
    } catch (error) {
      console.error('Error migrating data from localStorage to Firestore:', error);
      throw error;
    }
  },

  // Validate and fix layouts to ensure they match widgets
  validateAndFixLayouts: async (widgets: { id: string, type: string }[]): Promise<{ [key: string]: LayoutItem[] }> => {
    const layouts = await userDashboardService.loadLayouts() || {};
    let layoutsNeedUpdate = false;
    
    // Create a set of widget IDs for quick lookup
    const widgetIds = new Set(widgets.map(w => w.id));
    
    // Check each breakpoint to ensure all widgets have layout items
    Object.keys(breakpoints).forEach(breakpoint => {
      // Ensure layouts[breakpoint] is an array
      if (!layouts[breakpoint] || !Array.isArray(layouts[breakpoint])) {
        layouts[breakpoint] = [];
        layoutsNeedUpdate = true;
      }
      
      // Add layouts for widgets that don't have them
      widgets.forEach(widget => {
        if (!layouts[breakpoint]?.some(item => item.i === widget.id)) {
          // Create a new layout item at the end of the layout
          const colsForBreakpoint = breakpoint in cols ? cols[breakpoint as keyof typeof cols] : 12;
          const newItem = createDefaultLayoutItem(
            widget.id, 
            layouts[breakpoint].length,
            colsForBreakpoint,
            breakpoint
          );
          layouts[breakpoint].push(newItem);
          layoutsNeedUpdate = true;
        }
      });

      // Remove layouts for widgets that don't exist
      const initialLength = layouts[breakpoint]?.length ?? 0;
      layouts[breakpoint] = (layouts[breakpoint] ?? []).filter(item => widgetIds.has(item.i));
      if (layouts[breakpoint].length !== initialLength) {
        layoutsNeedUpdate = true;
      }
    });

    // Save updated layouts if needed
    if (layoutsNeedUpdate) {
      await userDashboardService.saveLayouts(layouts);
    }
    
    return layouts;
  },

  // Save app settings
  saveAppSettings: async (settings: Record<string, unknown>): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');
    
    try {
      // Sanitize the settings object to remove undefined values
      const sanitizedSettings = JSON.parse(JSON.stringify(settings));
      
      const firestore = checkFirebase();
      await setDoc(
        doc(firestore, 'users', userId, 'dashboard', 'app-settings'),
        { settings: sanitizedSettings },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving app settings to Firestore:', error);
      throw error;
    }
  },

  // Load app settings
  loadAppSettings: async (): Promise<Record<string, unknown> | null> => {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
      const firestore = checkFirebase();
      const docRef = doc(firestore, 'users', userId, 'dashboard', 'app-settings');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data()?.settings || null;
      }
      return null;
    } catch (error) {
      console.error('Error loading app settings from Firestore:', error);
      throw error;
    }
  }
};

// Public/Shared dashboard service
export const publicDashboardService = {
  /**
   * Save or update a public/team dashboard
   * This stores the dashboard data in a public collection accessible without auth
   */
  saveDashboard: async (
    dashboardId: string,
    dashboard: Dashboard,
    widgets: Widget[],
    layouts: { [key: string]: LayoutItem[] },
    widgetConfigs: WidgetConfigStore
  ): Promise<void> => {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    // Only save if dashboard is public or team
    if (dashboard.visibility === 'private') {
      // Remove from public collection if it was previously public
      await publicDashboardService.deleteDashboard(dashboardId);
      return;
    }

    try {
      const firestore = checkFirebase();

      // Prepare widget data (strip functions from configs)
      const sanitizedWidgets = widgets.map(w => ({
        id: w.id,
        type: w.type,
        // Don't include config here - we'll store separately
      }));

      // Sanitize configs
      const sanitizedConfigs: WidgetConfigStore = {};
      for (const [widgetId, config] of Object.entries(widgetConfigs)) {
        // Only include configs for widgets in this dashboard
        if (widgets.some(w => w.id === widgetId)) {
          const cleanConfig = { ...config };
          delete cleanConfig.onDelete;
          delete cleanConfig.onUpdate;
          sanitizedConfigs[widgetId] = cleanConfig;
        }
      }

      const dashboardData: PublicDashboardData = {
        id: dashboardId,
        name: dashboard.name,
        visibility: dashboard.visibility,
        sharedWith: dashboard.sharedWith || [],
        ownerId: userId,
        ownerEmail: auth?.currentUser?.email || undefined,
        createdAt: dashboard.createdAt,
        updatedAt: new Date().toISOString(),
        widgets: sanitizedWidgets as Widget[],
        layouts: JSON.parse(JSON.stringify(layouts)), // Deep clone to sanitize
        widgetConfigs: sanitizedConfigs,
      };

      await setDoc(
        doc(firestore, 'public-dashboards', dashboardId),
        dashboardData,
        { merge: true }
      );

      console.log('[PublicDashboardService] Saved dashboard:', dashboardId);
    } catch (error) {
      console.error('Error saving public dashboard:', error);
      throw error;
    }
  },

  /**
   * Load a public dashboard by ID (no auth required)
   */
  loadDashboard: async (dashboardId: string): Promise<PublicDashboardData | null> => {
    try {
      const firestore = checkFirebase();
      const docRef = doc(firestore, 'public-dashboards', dashboardId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as PublicDashboardData;
      }
      return null;
    } catch (error) {
      console.error('Error loading public dashboard:', error);
      throw error;
    }
  },

  /**
   * Delete a public dashboard
   */
  deleteDashboard: async (dashboardId: string): Promise<void> => {
    try {
      const firestore = checkFirebase();
      await deleteDoc(doc(firestore, 'public-dashboards', dashboardId));
      console.log('[PublicDashboardService] Deleted dashboard:', dashboardId);
    } catch (error) {
      // Ignore errors if document doesn't exist
      console.log('[PublicDashboardService] Delete error (may not exist):', error);
    }
  },

  /**
   * Check if user has access to a dashboard
   */
  hasAccess: (dashboard: PublicDashboardData, userEmail?: string | null): boolean => {
    // Public dashboards are accessible to everyone
    if (dashboard.visibility === 'public') {
      return true;
    }

    // Team dashboards require email to be in sharedWith list
    if (dashboard.visibility === 'team' && userEmail) {
      return dashboard.sharedWith.some(u => u.email.toLowerCase() === userEmail.toLowerCase());
    }

    return false;
  }
}; 