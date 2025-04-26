import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../lib/firebase';
import { userDashboardService } from '../lib/firestoreService';

type FaviconMode = 'simple' | 'smart';
type ThemeMode = 'light' | 'dark' | 'system';
type ThemeCombo = {
  id: string;
  name: string;
  lightTheme: string;
  darkTheme: string;
};

interface AppSettings {
  faviconMode: FaviconMode;
  themeMode: ThemeMode;
  themeCombo: string; // ID of selected theme combo
  themeComboOptions: ThemeCombo[];
  // Add other app-level settings here
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  faviconMode: 'simple',
  themeMode: 'system',
  themeCombo: 'default',
  themeComboOptions: [
    {
      id: 'default',
      name: 'Default',
      lightTheme: 'light',
      darkTheme: 'dark',
    },
    {
      id: 'sequoia',
      name: 'Sequoia',
      lightTheme: 'sequoia-light',
      darkTheme: 'sequoia-dark',
    },
    {
      id: 'macintosh',
      name: 'Macintosh',
      lightTheme: 'macintosh-light',
      darkTheme: 'macintosh-dark',
    },
    {
      id: 'sonoma',
      name: 'Sonoma',
      lightTheme: 'sonoma-light',
      darkTheme: 'sonoma-dark',
    },
  ],
};

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsUpdateTimeout, setSettingsUpdateTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load settings on mount and when auth state changes
  useEffect(() => {
    const loadAppSettings = async () => {
      setIsLoading(true);
      
      try {
        if (auth?.currentUser) {
          // User is logged in, try to load from Firestore
          const firestoreSettings = await userDashboardService.loadAppSettings();
          
          if (firestoreSettings) {
            // Merge with default settings to ensure all properties exist
            setSettings({
              ...defaultSettings,
              ...firestoreSettings
            });
            
            // Also update localStorage for offline access
            localStorage.setItem('boxento-app-settings', JSON.stringify(firestoreSettings));
          } else {
            // No settings in Firestore yet
            const localSettings = loadFromLocalStorage();
            setSettings(localSettings);
            
            // Save local settings to Firestore since this is first login
            const settingsRecord = { ...localSettings } as unknown as Record<string, unknown>;
            await userDashboardService.saveAppSettings(settingsRecord);
          }
        } else {
          // User is not logged in, load from localStorage
          const localSettings = loadFromLocalStorage();
          setSettings(localSettings);
        }
      } catch (error) {
        console.error('Error loading app settings:', error);
        // Fallback to localStorage
        setSettings(loadFromLocalStorage());
      } finally {
        setIsLoading(false);
      }
    };
    
    // Listen for auth state changes
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(() => {
      loadAppSettings();
    });
    
    return () => unsubscribe();
  }, []);

  // Helper function to load settings from localStorage
  const loadFromLocalStorage = (): AppSettings => {
    try {
      const savedSettings = localStorage.getItem('boxento-app-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        return { ...defaultSettings, ...parsedSettings };
      }
    } catch (error) {
      console.error('Error loading app settings from localStorage:', error);
    }
    return defaultSettings;
  };

  // Save settings to localStorage and Firestore
  const saveSettings = async (newSettings: AppSettings) => {
    // Save to localStorage immediately
    localStorage.setItem('boxento-app-settings', JSON.stringify(newSettings));
    
    // Save to Firestore if user is logged in (with debounce)
    if (auth?.currentUser) {
      if (settingsUpdateTimeout) {
        clearTimeout(settingsUpdateTimeout);
      }
      
      const timeout = setTimeout(async () => {
        try {
          // Convert AppSettings to Record<string, unknown> to match Firestore service
          const settingsRecord = { ...newSettings } as unknown as Record<string, unknown>;
          await userDashboardService.saveAppSettings(settingsRecord);
          console.log('App settings saved to Firestore');
        } catch (error) {
          console.error('Error saving app settings to Firestore:', error);
        }
      }, 500);
      
      setSettingsUpdateTimeout(timeout);
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, resetSettings, isLoading }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider');
  }
  return context;
} 