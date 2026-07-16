import { useEffect, useRef, useState, RefObject, MutableRefObject } from 'react';

interface WidgetSettingsHook {
  showSettings: boolean;
  showSettingsRef: MutableRefObject<boolean>;
  toggleSettings: () => void;
  settingsRef: RefObject<HTMLDivElement | null>;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
  portalContainer: HTMLElement | null;
}

export const useWidgetSettings = (): WidgetSettingsHook => {
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const showSettingsRef = useRef<boolean>(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalContainer(document.body);
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        showSettingsRef.current && 
        settingsRef.current && 
        !settingsRef.current.contains(e.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target as Node)
      ) {
        showSettingsRef.current = false;
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  const toggleSettings = (): void => {
    const newValue = !showSettingsRef.current;
    showSettingsRef.current = newValue;
    setTimeout(() => {
      setShowSettings(newValue);
    }, 0);
  };

  return {
    showSettings,
    showSettingsRef,
    toggleSettings,
    settingsRef,
    settingsButtonRef,
    portalContainer
  };
};