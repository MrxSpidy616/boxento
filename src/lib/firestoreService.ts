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
import { LayoutItem } from '@/types';

// Breakpoints and columns configuration - must match App.tsx
const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

// Helper function to check if Firebase is initialized and return a non-null Firestore instance
const checkFirebase = (): Firestore => {
  if (!isFirebaseInitialized || !db) {
    throw new Error('Firebase is not initialized');
  }
  return db;
};

// Helper function to create a default layout item for a widget
const createDefaultLayoutItem = (
  widgetId: string, 
  index: number, 
  colCount: number,
  breakpoint: string
): LayoutItem => {
  // For desktop layouts (lg, md), create a grid layout
  if (breakpoint === 'lg' || breakpoint === 'md') {
    // Calculate a grid position that works well with vertical compacting
    const maxItemsPerRow = Math.max(1, Math.floor(colCount / 3)); 
    const col = index % maxItemsPerRow;
    const row = Math.floor(index / maxItemsPerRow);
    
    return {
      i: widgetId,
      x: col * 3,
      y: row * 3,
      w: 3,
      h: 3,
      minW: 2,
      minH: 2
    };
  } 
  // For medium tablet layouts
  else if (breakpoint === 'sm') {
    // For tablet, use 2 items per row
    const itemsPerRow = 2;
    const col = index % itemsPerRow;
    const row = Math.floor(index / itemsPerRow);
    
    return {
      i: widgetId,
      x: col * 3,
      y: row * 3,
      w: 3,
      h: 3,
      minW: 2,
      minH: 2
    };
  }
  // For mobile layouts (xs, xxs), force 2x2 grid size and stack vertically
  else {
    return {
      i: widgetId,
      x: 0,
      y: index * 2,
      w: 2,
      h: 2,
      minW: 2,
      minH: 2,
      maxW: 2,
      maxH: 2
    };
  }
};

// Get the current user ID
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
          console.log('Migrating legacy layout structure...');
          
          // Save layouts directly without the wrapper
          await setDoc(docRef, data.layouts, { merge: true });
          console.log('Layout data structure migration complete');
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
        console.log('localStorage is not available');
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
      
      console.log('Migration from localStorage to Firestore completed');
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
          console.log(`Created missing layout for widget ${widget.id} in breakpoint ${breakpoint}`);
        }
      });
      
      // Remove layouts for widgets that don't exist
      const initialLength = layouts[breakpoint]?.length ?? 0;
      layouts[breakpoint] = (layouts[breakpoint] ?? []).filter(item => widgetIds.has(item.i));
      if (layouts[breakpoint].length !== initialLength) {
        layoutsNeedUpdate = true;
        console.log(`Removed ${initialLength - layouts[breakpoint].length} orphaned layouts from breakpoint ${breakpoint}`);
      }
    });
    
    // Save updated layouts if needed
    if (layoutsNeedUpdate) {
      console.log('Updating layouts to ensure all widgets have layout items');
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