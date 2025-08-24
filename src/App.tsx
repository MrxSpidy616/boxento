import React, { useState, useEffect, useRef } from 'react'
import { Plus, Moon, Sun, Cloud, CloudOff, Loader2 } from 'lucide-react'
// Import GridLayout components - direct imports to avoid runtime issues

// @ts-expect-error - The types don't correctly represent the module structure
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { getWidgetComponent, getWidgetConfigByType, WIDGET_REGISTRY } from '@/components/widgets'
import { 
  WidgetConfig, 
  Widget,
  LayoutItem
} from '@/types'
import WidgetErrorBoundary from '@/components/widgets/common/WidgetErrorBoundary'
import WidgetSelector from '@/components/widgets/common/WidgetSelector'
import { configManager } from '@/lib/configManager'
import { UserMenuButton } from '@/components/auth/UserMenuButton'
import { auth } from '@/lib/firebase'
import { userDashboardService } from '@/lib/firestoreService'
import { useSync } from '@/lib/SyncContext'
import { Button } from './components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PasteDetectionLayer } from '@/components/clipboard/PasteDetectionLayer'
import { Toaster } from 'sonner'
import { UrlMatchResult } from '@/lib/services/clipboard/urlDetector'
import { Changelog } from '@/components/Changelog'
import { faviconService } from '@/lib/services/favicon'
import { useAppSettings } from '@/context/AppSettingsContext'
import { DashboardContextMenu } from '@/components/dashboard/DashboardContextMenu'

interface WidgetCategory {
  [category: string]: WidgetConfig[];
}

// Define breakpoints
const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

// Create responsive grid layout with width provider - once, outside the component
// This is important for performance as it prevents recreation on each render
const ResponsiveReactGridLayout = WidthProvider(Responsive);

// Helper function to validate layout items
const validateLayoutItem = (item: LayoutItem): LayoutItem => ({
  ...item,
  w: Math.max(item.w, 2), // Minimum width of 2
  h: Math.max(item.h, 2)  // Minimum height of 2
});

// Helper function to validate a layout
const validateLayout = (layout: LayoutItem[]): LayoutItem[] => {
  return layout.map(validateLayoutItem);
};

// Helper function to validate all layouts for all breakpoints
const validateLayouts = (layouts: { [key: string]: LayoutItem[] }): { [key: string]: LayoutItem[] } => {
  const validatedLayouts = { ...layouts };
  
  // Ensure all breakpoints have layouts
  Object.keys(breakpoints).forEach(breakpoint => {
    if (!validatedLayouts[breakpoint]) {
      validatedLayouts[breakpoint] = [];
    }
    
    // Enforce minimum sizes on all layouts
    validatedLayouts[breakpoint] = validatedLayouts[breakpoint].map(validateLayoutItem);
  });
  
  return validatedLayouts;
};

// Helper function to create a default layout item
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
  // For mobile layouts (xs, xxs), stack vertically
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

// Helper function to create default layouts for all breakpoints
const createDefaultLayoutsForWidgets = (
  widgets: Widget[]
): { [key: string]: LayoutItem[] } => {
  const newLayouts: { [key: string]: LayoutItem[] } = {};
  
  // For each breakpoint, create layout items for all widgets
  Object.keys(breakpoints).forEach(breakpoint => {
    const colsForBreakpoint = cols[breakpoint as keyof typeof cols];
    
    // Create layout items for each widget, using smart positioning based on breakpoint
    newLayouts[breakpoint] = widgets.map((widget, index) => 
      createDefaultLayoutItem(widget.id, index, colsForBreakpoint, breakpoint)
    );
  });
  
  return newLayouts;
};

// Helper to prepare widget config for saving (remove functions)
const prepareWidgetConfigForSave = (config: Record<string, unknown>): Record<string, unknown> => {
  // Create a copy of the config without function properties
  const configToSave = { ...config };
  delete configToSave.onDelete;
  delete configToSave.onUpdate;
  return configToSave;
};

// Helper to load from localStorage
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const savedItem = localStorage.getItem(key);
    if (savedItem) {
      return JSON.parse(savedItem);
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  
  return defaultValue;
};

// Define the Footer component
const AppFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-4 sm:py-6 px-4 my-4 sm:my-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-4 sm:gap-6">
        {/* Mobile layout (stacked) */}
        {/* Reduced gap from gap-4 to gap-3 for tighter mobile spacing */}
        <div className="flex flex-col items-center gap-3 sm:hidden">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Built by{' '}
            <a 
              href="https://sushaantu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Sushaantu
            </a>
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <a
              href="https://github.com/sushaantu/boxento"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span className="sr-only sm:not-sr-only">View Source</span>
            </a>
            <a
              href="https://twitter.com/intent/tweet?text=Check%20out%20Boxento%20-%20An%20awesome%20open-source%20dashboard%20built%20by%20%40su%20%F0%9F%9A%80&url=https%3A%2F%2Fgithub.com%2Fsushaantu%2Fboxento"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
              <span className="sr-only sm:not-sr-only">Share Project</span>
            </a>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <a
              href="https://github.com/sushaantu/boxento/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Report Issue
            </a>
            <a
              href="https://github.com/sushaantu/boxento#contributing"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Contribute
            </a>
          </div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            © {currentYear}
          </div>
        </div>

        {/* Desktop/Tablet layout (side by side) */}
        <div className="hidden sm:flex sm:flex-row justify-between items-center">
          <div className="flex items-center gap-4 md:gap-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Built by{' '}
              <a 
                href="https://sushaantu.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Sushaantu
              </a>
            </p>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <a
                href="https://github.com/sushaantu/boxento"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View Source
              </a>
              <a
                href="https://twitter.com/intent/tweet?text=Check%20out%20Boxento%20-%20An%20awesome%20open-source%20dashboard%20built%20by%20%40su%20%F0%9F%9A%80&url=https%3A%2F%2Fgithub.com%2Fsushaantu%2Fboxento"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Share Project
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-center gap-4 md:gap-6 text-sm text-gray-500 dark:text-gray-400">
              <a
                href="https://github.com/sushaantu/boxento/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Report Issue
              </a>
              <a
                href="https://github.com/sushaantu/boxento#contributing"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Contribute
              </a>
            </div>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <div className="text-sm text-gray-400 dark:text-gray-500">
              © {currentYear}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};


function App() {
  // Register service worker for PWA functionality
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(() => {
            // ServiceWorker registration successful
          })
          .catch(error => {
            console.error('ServiceWorker registration failed: ', error);
          });
      });
    }
  }, []);

  // Track online status for PWA functionality
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add a class to the body for theme styling
  useEffect(() => {
    document.body.className = 'app-background min-h-screen';
    return () => { document.body.className = ''; };
  }, []);
  
  // Setup default favicon with current time
  useEffect(() => {
    // Initialize with current time
    faviconService.updateWithCurrentTime();
    
    // Update time every minute
    const intervalId = setInterval(() => {
      faviconService.updateWithCurrentTime();
    }, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Default layouts configuration
  const getDefaultLayouts = () => ({
    lg: [
      { i: 'default-todo', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: 'default-weather', x: 3, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-quick-links', x: 5, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'default-notes', x: 8, y: 0, w: 3, h: 3, minW: 2, minH: 2 }
    ],
    md: [
      { i: 'default-todo', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: 'default-weather', x: 3, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-quick-links', x: 5, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'default-notes', x: 0, y: 3, w: 3, h: 3, minW: 2, minH: 2 }
    ],
    sm: [
      { i: 'default-todo', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
      { i: 'default-weather', x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'default-quick-links', x: 0, y: 3, w: 3, h: 2, minW: 2, minH: 2 },
      { i: 'default-notes', x: 3, y: 3, w: 3, h: 3, minW: 2, minH: 2 }
    ],
    xs: [
      { i: 'default-todo', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-weather', x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-quick-links', x: 0, y: 4, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-notes', x: 0, y: 6, w: 2, h: 3, minW: 2, minH: 2 }
    ],
    xxs: [
      { i: 'default-todo', x: 0, y: 0, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-weather', x: 0, y: 2, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-quick-links', x: 0, y: 4, w: 2, h: 2, minW: 2, minH: 2 },
      { i: 'default-notes', x: 0, y: 6, w: 2, h: 3, minW: 2, minH: 2 }
    ]
  });

  // Default widgets
  const getDefaultWidgets = (): Widget[] => [
    {
      id: 'default-todo',
      type: 'todo',
      config: getWidgetConfigByType('todo') || {}
    },
    {
      id: 'default-weather',
      type: 'weather',
      config: getWidgetConfigByType('weather') || {}
    },
    {
      id: 'default-quick-links',
      type: 'quick-links',
      config: getWidgetConfigByType('quick-links') || {}
    },
    {
      id: 'default-notes',
      type: 'notes',
      config: getWidgetConfigByType('notes') || {}
    }
  ];
  
  const { settings, updateSettings } = useAppSettings();
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme as 'light' | 'dark';
      
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light'
  });
  
  const [layouts, setLayouts] = useState<{ [key: string]: LayoutItem[] }>(() => {
    try {
      const savedLayouts = loadFromLocalStorage('boxento-layouts', {});
      if (Object.keys(savedLayouts).length > 0) {
        return validateLayouts(savedLayouts);
      }
    } catch (error) {
      console.error('Error initializing layouts:', error);
    }
    
    // Default layout for all breakpoints with default widgets
    return getDefaultLayouts();
  });
  
  const [widgets, setWidgets] = useState<Widget[]>(() => {
    if (typeof window !== 'undefined') {
      const savedWidgets = loadFromLocalStorage('boxento-widgets', []);
      
      // Only use default widgets if we're not logged in and no widgets in storage
      if (savedWidgets.length === 0 && !auth?.currentUser) {
        return getDefaultWidgets();
      }
      
      // Load each widget's configuration from configManager
      return savedWidgets.map((widget: Widget) => {
        if (widget.id) {
          const savedConfig = configManager.getWidgetConfig(widget.id);
          if (savedConfig) {
            return {
              ...widget,
              config: {
                ...widget.config,
                ...savedConfig
              }
            };
          }
        }
        return widget;
      });
    }
    return []
  });
  
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth - 40 : 1200);
  const [widgetSelectorOpen, setWidgetSelectorOpen] = useState<boolean>(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const widgetCategories: WidgetCategory = (() => {
    // Group widgets by category
    const categories: WidgetCategory = {};
    
    WIDGET_REGISTRY.forEach(widget => {
      const category = widget.category || 'Other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(widget);
    });
    
    return categories;
  })();
  
  // Reference for debouncing layout updates
  const layoutUpdateTimeout = useRef<number | null>(null);
  
  // Get sync status from context
  const { isSyncing, syncStatus } = useSync();
  
  // Track the last created widget for undo functionality
  const [lastCreatedWidgetId, setLastCreatedWidgetId] = useState<string | null>(null);
  
  // Save widgets to storage (localStorage and Firestore if logged in)
  const saveWidgets = async (updatedWidgets: Widget[]): Promise<void> => {
    setWidgets(updatedWidgets);
    
    // Save to localStorage
    localStorage.setItem('boxento-widgets', JSON.stringify(updatedWidgets));
    
    // Save each widget's configuration separately using configManager
    updatedWidgets.forEach(widget => {
      if (widget.config && widget.id) {
        const configToSave = prepareWidgetConfigForSave(widget.config);
        configManager.saveWidgetConfig(widget.id, configToSave);
      }
    });
    
    // Save widgets to Firestore when user is logged in
    if (auth?.currentUser) {
      try {
        await userDashboardService.saveWidgets(updatedWidgets);
        // Widget metadata saved to Firestore
      } catch (error) {
        console.error('Error saving widgets to Firestore:', error);
      }
    }
  };
  
  // Save layouts to storage (localStorage and Firestore if logged in)
  const saveLayouts = async (updatedLayouts: { [key: string]: LayoutItem[] }, debounce = true): Promise<void> => {
    // Update state
    setLayouts(updatedLayouts);
    
    // Save to localStorage
    localStorage.setItem('boxento-layouts', JSON.stringify(updatedLayouts));
    
    // Save to Firestore if logged in
    if (auth?.currentUser) {
      if (debounce) {
        if (layoutUpdateTimeout.current !== null) {
          clearTimeout(layoutUpdateTimeout.current);
        }
        
        layoutUpdateTimeout.current = window.setTimeout(async () => {
          try {
            await userDashboardService.saveLayouts(updatedLayouts);
            // Layouts saved to Firestore
          } catch (error) {
            console.error('Error saving layouts to Firestore:', error);
          }
        }, 500);
      } else {
        try {
          await userDashboardService.saveLayouts(updatedLayouts);
          // Layouts saved to Firestore immediately
        } catch (error) {
          console.error('Error saving layouts to Firestore:', error);
        }
      }
    }
  };
  
  // Update theme based on settings
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let newTheme: 'light' | 'dark' = 'light';

    // Set theme based on app settings
    if (settings.themeMode === 'dark') {
      newTheme = 'dark';
    } else if (settings.themeMode === 'light') {
      newTheme = 'light';
    } else if (settings.themeMode === 'system') {
      newTheme = prefersDarkMode ? 'dark' : 'light';
    }

    // Set the theme
    setTheme(newTheme);

    // Set the document class
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.themeMode]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const bodyPadding = 40; // Account for any potential body margin/padding
      setWindowWidth(window.innerWidth - bodyPadding);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Listen for resize events to update the breakpoint
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      let newBreakpoint = 'lg';
      
      // Find which breakpoint we're in
      for (const bp of Object.keys(breakpoints).sort((a, b) => 
        breakpoints[b as keyof typeof breakpoints] - breakpoints[a as keyof typeof breakpoints])) {
        if (width >= breakpoints[bp as keyof typeof breakpoints]) {
          newBreakpoint = bp;
          break;
        }
      }
      
      if (newBreakpoint !== currentBreakpoint) {
        setCurrentBreakpoint(newBreakpoint);
        // Breakpoint changed
      }
    };
    
    // Initial check
    updateBreakpoint();
    
    // Add listener
    window.addEventListener('resize', updateBreakpoint);
    
    // Clean up
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, [currentBreakpoint]);
  
  // Calculate row height based on window width to ensure square widgets
  const calculateRowHeight = (): number => {
    // Calculate the column width based on available width
    const totalPadding = 40; // containerPadding (20px * 2)
    const totalMargins = 10 * (12 - 1); // margin (10px) * (cols - 1)
    const usableWidth = windowWidth - totalPadding - totalMargins;
    
    // Calculate column width (each column should be square)
    const columnWidth = usableWidth / 12;
    
    // Return the column width as row height to ensure squares
    // Apply responsiveness scaling similar to before
    if (windowWidth < 600) {
      return columnWidth * 0.8; // Smaller on mobile
    } else if (windowWidth < 1200) {
      return columnWidth * 0.9; // Slightly smaller on tablets
    } else {
      return columnWidth; // Default for desktop
    }
  };
  
  const rowHeight = calculateRowHeight();
  
  const toggleTheme = (): void => {
    const newTheme: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Also update app settings
    const newThemeMode: 'light' | 'dark' | 'system' = newTheme === 'dark' ? 'dark' : 'light';
    if (settings.themeMode !== newThemeMode) {
      updateSettings({ themeMode: newThemeMode });
    }
  };
  
  // Add widget function - refactored to reduce duplication
  const addWidget = (type: string): void => {
    // Generate unique ID for this widget instance
    const widgetId = `${type}-${Date.now()}`;
    
    // Create new widget instance
    const newWidget: Widget = {
      id: widgetId,
      type,
      config: getWidgetConfigByType(type) || {}
    };
    
    // Add new widget to state
    const updatedWidgets = [...widgets, newWidget];
    
    // For each breakpoint, create a layout item
    const updatedLayouts = { ...layouts };
    
    // For each breakpoint, add a layout item
    Object.keys(breakpoints).forEach((breakpoint) => {
      if (!updatedLayouts[breakpoint]) {
        updatedLayouts[breakpoint] = [];
      }
      
      // Calculate column count for this breakpoint
      const colCount = cols[breakpoint as keyof typeof cols];
      
      // Create default layout item based on the breakpoint
      const defaultItem = createDefaultLayoutItem(
        widgetId, 
        updatedLayouts[breakpoint].length, 
        colCount,
        breakpoint
      );
      
      // Force 2x2 grid size for mobile
      const isMobile = breakpoint === 'xs' || breakpoint === 'xxs';
      if (isMobile) {
        defaultItem.w = 2;
        defaultItem.h = 2;
        defaultItem.maxW = 2;
        defaultItem.maxH = 2;
      }
      
      updatedLayouts[breakpoint].push(defaultItem);
    });
    
    // Update states and save data
    setWidgets(updatedWidgets);
    setLayouts(updatedLayouts);
    setLastCreatedWidgetId(widgetId);
    
    // Save changes
    saveWidgets(updatedWidgets);
    saveLayouts(updatedLayouts, false);
    
    // Close the widget selector if it's open
    if (widgetSelectorOpen) {
      setWidgetSelectorOpen(false);
    }
  };
  
  // Delete widget function - refactored to reduce duplication
  const deleteWidget = async (widgetId: string): Promise<void> => {
    // Remove widget config from storage
    await configManager.clearConfig(widgetId);
    
    // Remove widget from state
    const updatedWidgets = widgets.filter(widget => widget.id !== widgetId);
    
    // Remove layout item from all breakpoints
    const updatedLayouts = { ...layouts };
    Object.keys(updatedLayouts).forEach(breakpoint => {
      updatedLayouts[breakpoint] = updatedLayouts[breakpoint].filter(item => item.i !== widgetId);
    });
    
    // Update state and save
    setWidgets(updatedWidgets);
    setLayouts(updatedLayouts);
    
    // Save changes
    saveWidgets(updatedWidgets);
    saveLayouts(updatedLayouts, false);
  };
  
  // Update layout function - refactored to reduce duplication
  const handleLayoutChange = (currentLayout: LayoutItem[], allLayouts?: { [key: string]: LayoutItem[] }): void => {
    const validatedLayout = validateLayout(currentLayout);

    // If we have all layouts from the responsive grid
    if (allLayouts) {
      // Use a timeout to debounce the layout update
      if (layoutUpdateTimeout.current !== null) {
        clearTimeout(layoutUpdateTimeout.current);
      }
      
      layoutUpdateTimeout.current = window.setTimeout(() => {
        // Create a validated copy to prevent mutating the input
        const validatedLayouts = validateLayouts(allLayouts);
        
        // Update layout state and save
        setLayouts(validatedLayouts);
        saveLayouts(validatedLayouts);
      }, 100); // 100ms debounce
    } else {
      // If we only have the current layout, update only the current breakpoint
      const updatedLayouts = { ...layouts };
      updatedLayouts[currentBreakpoint] = validatedLayout;
      
      // Update state and save
      setLayouts(updatedLayouts);
      saveLayouts(updatedLayouts);
    }
  };
  
  // Update widget config - refactored to be more maintainable
  const updateWidgetConfig = (widgetId: string, newConfig: Record<string, unknown>): void => {
    // Update widget in state
    const updatedWidgets = widgets.map(widget => 
      widget.id === widgetId 
        ? { ...widget, config: { ...widget.config, ...newConfig } }
        : widget
    );
    
    setWidgets(updatedWidgets);
    
    // Save to configManager - excluding function properties
    const configToSave = prepareWidgetConfigForSave(newConfig);
    configManager.saveWidgetConfig(widgetId, configToSave);
    
    // Save to Firestore if logged in
    if (auth?.currentUser) {
      saveWidgets(updatedWidgets);
    }
  };

  // Unified widget rendering function
  const renderWidget = (widget: Widget, isMobileView = false): React.ReactNode => {
    const WidgetComponent = getWidgetComponent(widget.type);
    
    if (!WidgetComponent) {
      return (
        <div className="widget-error">
          <p>Widget type "{widget.type}" not found</p>
        </div>
      );
    }
    
    // Get widget dimensions
    const getWidgetDimensions = () => {
      // If layout isn't ready yet, use default dimensions
      if (!isLayoutReady) {
        return { width: isMobileView ? 2 : 3, height: isMobileView ? 2 : 3 };
      }
      
      // Find layout item for this widget
      const layoutItem = layouts[currentBreakpoint]?.find(item => item.i === widget.id);
      
      // If no layout item found, use default dimensions
      if (!layoutItem) {
        return { width: isMobileView ? 2 : 3, height: isMobileView ? 2 : 3 };
      }
      
      // Use the layout item dimensions
      return {
        width: isMobileView ? 2 : layoutItem.w,
        height: isMobileView ? 2 : layoutItem.h
      };
    };
    
    const { width, height } = getWidgetDimensions();
    
    // Create widget config with callbacks
    const widgetConfig = {
      ...widget.config,
      onDelete: () => deleteWidget(widget.id),
      onUpdate: (newConfig: Record<string, unknown>) => updateWidgetConfig(widget.id, newConfig)
    };
    
    return (
      <WidgetErrorBoundary>
        <WidgetComponent
          width={width}
          height={height}
          config={widgetConfig}
        />
      </WidgetErrorBoundary>
    );
  };
  
  // Handle drag events - refactored to be more maintainable
  const [dragDirection, setDragDirection] = useState<'left' | 'right' | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);
  const dragThreshold = 5; // Minimum mouse movement to determine direction
  
  const handleDragStart = (_layout: LayoutItem[], _oldItem: LayoutItem, newItem: LayoutItem, _placeholder: LayoutItem, event: MouseEvent): void => {
    document.body.classList.add('dragging', 'react-grid-layout--dragging');
    setDraggedWidgetId(newItem.i);
    lastMousePos.current = { x: event.clientX, y: event.clientY };
    setDragDirection(null);
    // Drag started
  };
  
  const handleDrag = (_layout: LayoutItem[], _oldItem: LayoutItem, _newItem: LayoutItem, _placeholder: LayoutItem, event: MouseEvent): void => {
    // Skip if no mouse position
    if (!lastMousePos.current) return;
    
    // Calculate direction based on mouse movement
    const deltaX = event.clientX - lastMousePos.current.x;
    
    // Only change direction if movement is significant
    if (Math.abs(deltaX) > dragThreshold) {
      const newDirection = deltaX < 0 ? 'left' : 'right';
      
      // Only update if direction changed
      if (newDirection !== dragDirection) {
        setDragDirection(newDirection);
      }
      
      // Update last position
      lastMousePos.current = { x: event.clientX, y: event.clientY };
    }
  };
  
  const handleDragStop = (): void => {
    // Apply rebound class before removing direction class
    if (draggedWidgetId) {
      // Find the widget that was being dragged by ID
      const widgetElement = document.querySelector(`.react-grid-item[data-grid*="i:${draggedWidgetId}"]`);
      if (widgetElement) {
        widgetElement.classList.add('drag-rebound');
        
        // Remove rebound class after animation completes
        setTimeout(() => {
          widgetElement.classList.remove('drag-rebound');
        }, 500); // Match the animation duration in CSS
      }
    }
    
    // Reset states
    setDragDirection(null);
    setDraggedWidgetId(null);
    lastMousePos.current = null;
    
    // Remove classes
    document.body.classList.remove('dragging', 'react-grid-layout--dragging');
    
    // Save the layout
    saveLayouts(layouts, false);
    // Drag completed, layout saved
  };
  
  // Apply drag direction classes to the dragged widget
  useEffect(() => {
    if (draggedWidgetId && dragDirection) {
      // Find the dragged widget element
      const widgetElement = document.querySelector(`.react-grid-item[data-grid*="i:${draggedWidgetId}"].react-draggable-dragging`);
      
      if (widgetElement) {
        // Remove any existing direction classes
        widgetElement.classList.remove('dragging-left', 'dragging-right');
        
        // Add the appropriate direction class
        widgetElement.classList.add(`dragging-${dragDirection}`);
      }
    }
  }, [draggedWidgetId, dragDirection]);
  
  // Handle resize events
  const handleResizeStart = (): void => {
    document.body.classList.add('react-grid-layout--resizing');
  };
  
  const handleResizeStop = (): void => {
    document.body.classList.remove('react-grid-layout--resizing');
    saveLayouts(layouts, false);
  };
  
  // Toggle widget selector
  const toggleWidgetSelector = (): void => {
    setWidgetSelectorOpen(!widgetSelectorOpen);
  };
  
  // Unified function to render widget items for the grid
  const renderWidgetItems = () => {
    return widgets.map(widget => {
      // Find the layout data for this widget
      const layoutItem = layouts[currentBreakpoint]?.find(item => item.i === widget.id);
      
      // Determine if mobile view
      const isMobile = currentBreakpoint === 'xs' || currentBreakpoint === 'xxs';
      
      // Set default dimensions
      const defaultWidth = isMobile ? 2 : 3;
      const defaultHeight = isMobile ? 2 : 3;
      
      // Create data-grid object with fallbacks
      const dataGrid = {
        i: widget.id,
        x: layoutItem?.x ?? 0,
        y: layoutItem?.y ?? 0,
        w: layoutItem?.w ?? defaultWidth,
        h: isMobile ? 5 : (layoutItem?.h ?? defaultHeight),
        minW: layoutItem?.minW ?? 2,
        minH: isMobile ? 3 : (layoutItem?.minH ?? 2)
      };
      
      // Add different classes based on screen size
      const isTablet = currentBreakpoint === 'sm';
      const sizeClass = isMobile ? 'mobile-widget' : isTablet ? 'tablet-widget' : 'desktop-widget';
      
      return (
        <div 
          key={widget.id} 
          className={`widget-wrapper ${sizeClass} app-widget`} 
          data-grid={dataGrid}
          data-breakpoint={currentBreakpoint}
          style={isMobile ? { marginBottom: '16px', height: 'auto' } : undefined}
        >
          {renderWidget(widget, isMobile)}
        </div>
      );
    });
  };
  
  // Unified function to render mobile layout
  const renderMobileLayout = () => {
    return (
      <div className="mobile-widget-list">
        {widgets.map(widget => (
          <div 
            key={widget.id} 
            className="mobile-widget-item"
          >
            {renderWidget(widget, true)}
          </div>
        ))}
      </div>
    );
  };
  
  // Load local data
  const loadLocalData = () => {
    // Load layouts from localStorage
    const localLayouts = loadFromLocalStorage('boxento-layouts', getDefaultLayouts());
    if (localLayouts) setLayouts(localLayouts);
    
    // Load widgets from localStorage
    const localWidgets = loadFromLocalStorage('boxento-widgets', getDefaultWidgets());
    if (localWidgets) setWidgets(localWidgets);
  };
  
  // Function to load user data from Firestore
  const loadUserData = async (): Promise<void> => {
    try {
      let userHasFirestoreData = false;
      
      // Migrate any legacy layout data structure first
      await userDashboardService.migrateLayoutDataStructure();
      
      // Load widgets first - we'll use them to validate layouts
      try {
        // 1. Load widget metadata first (without configs)
        const firestoreWidgets = await userDashboardService.loadWidgets();
        
        if (firestoreWidgets !== null && firestoreWidgets !== undefined) {
          // Widget metadata loaded from Firestore
          
          // 2. Load all widget configurations
          const allConfigs = await configManager.getConfigs(true);
          
          // 3. Merge the widget metadata with their respective configurations
          const typedWidgets = Array.isArray(firestoreWidgets) ? firestoreWidgets.map(widget => {
            const widgetId = widget.id as string;
            return {
              id: widgetId || '',
              type: widget.type as string || '',
              config: widgetId ? (allConfigs[widgetId] || {}) : {}
            } as Widget;
          }) : [];
          
          // 4. Set the merged widgets in state
          setWidgets(typedWidgets);
          userHasFirestoreData = true;
          
          // 5. Validate and fix layouts based on the widgets
          // Validating layouts to ensure they match widgets
          const validatedLayouts = await userDashboardService.validateAndFixLayouts(
            typedWidgets.map(w => ({ id: w.id, type: w.type }))
          );
          
          // 6. Set the validated layouts in state
          setLayouts(validatedLayouts);
          // Validated layouts set
          
          // Also update localStorage to match Firestore state
          localStorage.setItem('boxento-widgets', JSON.stringify(typedWidgets));
          localStorage.setItem('boxento-layouts', JSON.stringify(validatedLayouts));
        } else if (!userHasFirestoreData) {
          // Fall back to localStorage if no Firestore data
          loadLocalData();
          
          // Migrate to Firestore if logged in
          if (auth?.currentUser && widgets.length > 0) {
            try {
              await saveWidgets(widgets);
              await saveLayouts(layouts, false);
            } catch (error) {
              console.error('Error migrating to Firestore:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error loading widgets from Firestore:', error);
        // Only fall back to localStorage if we haven't loaded Firestore data
        if (!userHasFirestoreData) {
          loadLocalData();
        }
      }
    } catch (error) {
      console.error('Error loading user data from Firestore:', error);
      // Fallback to localStorage
      loadLocalData();
    }
  };
  
  // Initialize auth listener
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // User is signed in, load their data from Firestore
        await loadUserData();
      } else {
        // User is signed out, load from localStorage
        loadLocalData();
      }
      
      setIsDataLoaded(true);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  // Effect to handle initial layout loading
  useEffect(() => {
    // Only show the grid once layouts and widgets are loaded
    if (layouts && Object.keys(layouts).length > 0 && widgets.length > 0) {
      // Check if all widgets have layout items
      let allWidgetsHaveLayouts = true;
      
      // Check current breakpoint
      if (currentBreakpoint) {
        for (const widget of widgets) {
          if (!layouts[currentBreakpoint]?.some(item => item.i === widget.id)) {
            allWidgetsHaveLayouts = false;
            // Widget missing layout item for current breakpoint
            break;
          }
        }
      }
      
      // Add delay to ensure layout calculations are complete
      const delay = allWidgetsHaveLayouts ? 300 : 500;
      
      const timer = setTimeout(() => {
        setIsLayoutReady(true);
        // Layout is now ready for rendering
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [layouts, widgets, currentBreakpoint]);
  
  // Clean up orphaned layout items
  useEffect(() => {
    // Only run cleanup if we have both widgets and layouts
    if (widgets.length > 0 && layouts && Object.keys(layouts).length > 0) {
      // Check if there are any orphaned layout items
      let hasOrphanedItems = false;
      const widgetIds = new Set(widgets.map(w => w.id));
      const cleanedLayouts = { ...layouts };
      
      // For each breakpoint, filter out layout items without a corresponding widget
      Object.keys(cleanedLayouts).forEach(breakpoint => {
        const originalLength = cleanedLayouts[breakpoint]?.length || 0;
        
        if (cleanedLayouts[breakpoint] && Array.isArray(cleanedLayouts[breakpoint])) {
          cleanedLayouts[breakpoint] = cleanedLayouts[breakpoint].filter(item => 
            widgetIds.has(item.i)
          );
          
          // Check if we removed any items
          if (cleanedLayouts[breakpoint].length < originalLength) {
            hasOrphanedItems = true;
          }
        }
      });
      
      // If we found orphaned items, update the layouts
      if (hasOrphanedItems) {
        // Cleaning up orphaned layout items
        setLayouts(cleanedLayouts);
        localStorage.setItem('boxento-layouts', JSON.stringify(cleanedLayouts));
      }
    }
  }, [widgets, layouts]);
  
  // Ensure layouts exist for all widgets
  useEffect(() => {
    // Only run this if we have widgets but missing or empty layouts
    if (widgets.length > 0 && 
        (!layouts || 
         Object.keys(layouts).length === 0 || 
         Object.values(layouts).some(layout => layout.length === 0))) {
      
      // Creating default layouts for widgets
      
      // Create default layouts for all widgets
      const newLayouts = createDefaultLayoutsForWidgets(widgets);
      
      // Update layouts state
      setLayouts(newLayouts);
      // Default layouts created
    }
  }, [widgets, layouts]);
  
  // Handle URL detection
  const handleUrlDetected = (result: UrlMatchResult) => {
    let widgetId: string;
    let newWidget: Widget;
    let updatedWidgets: Widget[];
    let updatedLayouts: { [key: string]: LayoutItem[] };

    switch (result.type) {
      case 'youtube':
        // Create YouTube widget
        widgetId = `youtube-${Date.now()}`;
        newWidget = {
          id: widgetId,
          type: 'youtube',
          config: {
            ...getWidgetConfigByType('youtube'),
            videoId: result.data.videoId
          }
        };
        
        // Add new widget to state
        updatedWidgets = [...widgets, newWidget];
        
        // For each breakpoint, create a layout item
        updatedLayouts = { ...layouts };
        
        // For each breakpoint, add a layout item
        Object.keys(breakpoints).forEach((breakpoint) => {
          if (!updatedLayouts[breakpoint]) {
            updatedLayouts[breakpoint] = [];
          }
          
          // Calculate column count for this breakpoint
          const colCount = cols[breakpoint as keyof typeof cols];
          
          // Create default layout item based on the breakpoint
          const defaultItem = createDefaultLayoutItem(
            widgetId, 
            updatedLayouts[breakpoint].length, 
            colCount,
            breakpoint
          );
          
          // Set appropriate size for video content
          if (breakpoint === 'lg' || breakpoint === 'md') {
            defaultItem.w = 4; // Wider for better video viewing
            defaultItem.h = 3; // 16:9 aspect ratio approximately
          }
          
          updatedLayouts[breakpoint].push(defaultItem);
        });
        
        // Update states
        setWidgets(updatedWidgets);
        setLayouts(updatedLayouts);
        setLastCreatedWidgetId(widgetId);
        
        // Save changes
        saveWidgets(updatedWidgets);
        saveLayouts(updatedLayouts, false);
        break;
        
      // Add more cases here for other URL types
      // case 'sports':
      //   // Create sports widget with result.data
      //   break;
      // case 'weather':
      //   // Create weather widget with result.data
      //   break;
      
      default:
        // Unsupported URL type
    }
  };
  
  // Handle undo of last widget creation
  const handleUndoLastWidget = () => {
    if (lastCreatedWidgetId) {
      deleteWidget(lastCreatedWidgetId);
      setLastCreatedWidgetId(null);
    }
  };
  
  // Only render the UI when data is loaded
  if (!isDataLoaded) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`app ${theme === 'dark' ? 'dark' : ''} app-background`} data-theme={theme}>
      {/* Add Toaster */}
      <Toaster 
        position="bottom-right"
        theme={theme}
        closeButton
      />
      
      {/* Add PasteDetectionLayer */}
      <PasteDetectionLayer 
        onUrlDetected={handleUrlDetected}
        onUndo={handleUndoLastWidget}
        className="z-0"
      />
      
      {/* Header */}
      <div className="fixed top-0 z-50 w-full backdrop-blur-sm app-header">
        <div className="px-2 sm:px-4 py-3 flex items-center justify-between"> {/* Use px-2 for xs, px-4 for sm+ */}
          <div className="flex items-center">
            <a href="/" rel="noopener noreferrer" className="text-gray-900 dark:text-white hover:text-gray-700 transition-colors">
              <h1 className="text-lg font-semibold mr-2 sm:mr-3">Boxento</h1> {/* Use mr-2 for xs, mr-3 for sm+ */}
            </a>
            {/* Sync indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    {!isOnline ? (
                      <CloudOff className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                    ) : auth?.currentUser ? (
                      isSyncing ? (
                        <Loader2 className="h-5 w-5 text-green-500 dark:text-green-400" />
                      ) : syncStatus === 'success' ? (
                        <Cloud className="h-5 w-5 text-green-500 dark:text-green-400" />
                      ) : syncStatus === 'error' ? (
                        <Cloud className="h-5 w-5 text-red-500 dark:text-red-400" />
                      ) : (
                        <Cloud className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      )
                    ) : (
                      <Cloud className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-lg">
                  <div>
                    <p className="font-semibold">
                      {!isOnline ? (
                        "You are offline. Some features may be limited."
                      ) : auth?.currentUser ? (
                        isSyncing ? "Syncing..." : 
                        syncStatus === 'success' ? "Everything is synced!" :
                        syncStatus === 'error' ? "Sync error" :
                        "Ready to sync"
                      ) : (
                        "Sign up to sync (saved locally for now)"
                      )}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2"> {/* Use space-x-1 for xs, space-x-2 for sm+ */}
            <Button
              onClick={toggleWidgetSelector}
              aria-label="Add widget"
              className="rounded-full h-9 transition-colors"
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4 sm:mr-2" /> {/* Remove margin on xs */}
              <span className="hidden sm:inline">Add Widget</span> {/* Hide text on xs */}
            </Button>

            <Button
              onClick={toggleTheme}
              className="rounded-full h-9 w-9 p-0 flex items-center justify-center transition-colors"
              size="sm"
              aria-label="Toggle theme"
              variant="outline"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            <Changelog />

            <div className="flex items-center">
              {/* UserMenuButton is now responsive internally */}
              <UserMenuButton className="h-9" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main */}
      <div className="min-h-screen overflow-x-hidden app-background">
        <main className="pt-16 md:pt-20">
          <WidgetSelector 
            isOpen={widgetSelectorOpen}
            onClose={toggleWidgetSelector}
            onAddWidget={addWidget}
            widgetRegistry={WIDGET_REGISTRY}
            widgetCategories={widgetCategories}
          />
          
          <div className="max-w-[1600px] mx-auto">
            <div className="mobile-view-container">
              <div className="mobile-view">
                {renderMobileLayout()}
              </div>
            </div>
            
            <div className="desktop-view-container">
              {/* Conditional rendering with opacity transition */}
              <DashboardContextMenu onAddWidget={toggleWidgetSelector}>
                <div className={`transition-opacity duration-300 ${isLayoutReady ? 'opacity-100' : 'opacity-0'}`}>
                  <ResponsiveReactGridLayout
                    className="layout"
                    layouts={layouts}
                    breakpoints={breakpoints}
                    cols={cols}
                    rowHeight={rowHeight}
                    onLayoutChange={handleLayoutChange}
                    onBreakpointChange={(newBreakpoint: string) => {
                      if (newBreakpoint !== currentBreakpoint) {
                        // Breakpoint changed
                        setCurrentBreakpoint(newBreakpoint);
                      }
                    }}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragStop={handleDragStop}
                    onResizeStart={handleResizeStart}
                    onResizeStop={handleResizeStop}
                    margin={[15, 15]}
                    containerPadding={[10, 10]}
                    draggableHandle=".widget-drag-handle"
                    draggableCancel=".settings-button"
                    useCSSTransforms={true}
                    measureBeforeMount={false}
                    compactType="vertical"
                    verticalCompact={true}
                    preventCollision={false}
                    isResizable={true}
                    isDraggable={true}
                    isBounded={false}
                    autoSize={true}
                    transformScale={1}
                    style={{ width: '100%', minHeight: '100%' }}
                  >
                    {renderWidgetItems()}
                  </ResponsiveReactGridLayout>
                </div>
              </DashboardContextMenu>
              {/* Loading indicator during initial layout calculation */}
              {!isLayoutReady && widgets.length > 0 && (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2">Setting up your dashboard...</span>
                </div>
              )}
            </div>
          </div>
        </main>
        {/* Add the footer */}
        <AppFooter />
      </div>
    </div>
  )
}

export default App