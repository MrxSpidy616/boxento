/**
 * Shared Credentials Manager for Boxento
 * 
 * Provides a global store for API keys and other credentials,
 * allowing multiple widget instances of the same type to share credentials.
 */

import { useState, useEffect } from 'react';
import { encryptionUtils } from './encryption';

// Storage key for shared credentials
const SHARED_CREDENTIALS_KEY = 'boxento-shared-credentials';

// Credential types that widgets can use
export type CredentialType = 
  | 'openexchangerates-api'  // Currency converter widget
  | string;               // Allow extension for future widgets

/**
 * Interface for the shared credentials store
 */
interface SharedCredentialsStore {
  [credentialType: string]: string; // Encrypted credentials
}

/**
 * Shared Credentials Manager
 * Provides methods to save, retrieve, and manage shared credentials
 */
export const sharedCredentialsManager = {
  /**
   * Get a shared credential by type
   * 
   * @param credentialType - Type of credential to retrieve
   * @returns The decrypted credential or null if not found
   */
  getCredential: (credentialType: CredentialType): string | null => {
    try {
      const stored = localStorage.getItem(SHARED_CREDENTIALS_KEY);
      const credentials: SharedCredentialsStore = stored ? JSON.parse(stored) : {};
      const credential = credentials[credentialType] || null;
      
      if (!credential) return null;
      
      return encryptionUtils.decrypt(credential);
    } catch (e) {
      console.error('Error loading shared credential', e);
      return null;
    }
  },
  
  /**
   * Save a shared credential
   * 
   * @param credentialType - Type of credential to save
   * @param credential - Credential value to encrypt and save
   */
  saveCredential: (credentialType: CredentialType, credential: string): void => {
    try {
      const stored = localStorage.getItem(SHARED_CREDENTIALS_KEY);
      const credentials: SharedCredentialsStore = stored ? JSON.parse(stored) : {};
      
      credentials[credentialType] = encryptionUtils.encrypt(credential);
      localStorage.setItem(SHARED_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (e) {
      console.error('Error saving shared credential', e);
    }
  },
  
  /**
   * Check if a shared credential exists
   * 
   * @param credentialType - Type of credential to check
   * @returns True if the credential exists
   */
  hasCredential: (credentialType: CredentialType): boolean => {
    try {
      const stored = localStorage.getItem(SHARED_CREDENTIALS_KEY);
      const credentials: SharedCredentialsStore = stored ? JSON.parse(stored) : {};
      return !!credentials[credentialType];
    } catch (e) {
      console.error('Error checking shared credential', e);
      return false;
    }
  },
  
  /**
   * Remove a shared credential
   * 
   * @param credentialType - Type of credential to remove
   */
  removeCredential: (credentialType: CredentialType): void => {
    try {
      const stored = localStorage.getItem(SHARED_CREDENTIALS_KEY);
      const credentials: SharedCredentialsStore = stored ? JSON.parse(stored) : {};
      
      delete credentials[credentialType];
      localStorage.setItem(SHARED_CREDENTIALS_KEY, JSON.stringify(credentials));
    } catch (e) {
      console.error('Error removing shared credential', e);
    }
  },
  
  /**
   * Get all credential types
   * 
   * @returns Array of credential types that are stored
   */
  getAllCredentialTypes: (): CredentialType[] => {
    try {
      const stored = localStorage.getItem(SHARED_CREDENTIALS_KEY);
      const credentials: SharedCredentialsStore = stored ? JSON.parse(stored) : {};
      return Object.keys(credentials) as CredentialType[];
    } catch (e) {
      console.error('Error getting credential types', e);
      return [];
    }
  }
};

/**
 * React hook for accessing and managing shared credentials
 * 
 * @param credentialType - Type of credential to manage
 * @returns Object with credential value and update function
 */
export const useSharedCredential = (credentialType: CredentialType) => {
  const [credential, setCredential] = useState<string | null>(
    sharedCredentialsManager.getCredential(credentialType)
  );
  
  // Update local state when the credential changes in storage
  useEffect(() => {
    const syncCredential = () => {
      const storedCredential = sharedCredentialsManager.getCredential(credentialType);
      setCredential(storedCredential);
    };

    // Initial sync
    syncCredential();
    
    // Listen for storage events to update state when another instance changes the credential
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SHARED_CREDENTIALS_KEY || e.key === 'boxento-credential-sync-trigger') {
        syncCredential();
      }
    };
    
    // Listen for custom events from other instances of this hook
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.type === credentialType) {
        syncCredential();
      }
    };
    
    // Set up an interval to periodically check for storage changes
    // This helps when multiple widgets are on the same page
    const intervalId = setInterval(syncCredential, 2000);
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('sharedCredentialUpdate', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sharedCredentialUpdate', handleCustomEvent);
      clearInterval(intervalId);
    };
  }, [credentialType]);
  
  // Function to update the credential
  const updateCredential = (newCredential: string) => {
    
    // Only save if there's an actual value
    if (newCredential && newCredential.trim() !== '') {
      sharedCredentialsManager.saveCredential(credentialType, newCredential);
      setCredential(newCredential);
      
      // To ensure updates are visible across components, trigger a custom event
      const event = new CustomEvent('sharedCredentialUpdate', { 
        detail: { type: credentialType, value: newCredential } 
      });
      window.dispatchEvent(event);
      
      // Attempt to trigger a storage event for cross-tab sync
      // This is a hack, but it helps ensure changes propagate
      const dummyKey = 'boxento-credential-sync-trigger';
      localStorage.setItem(dummyKey, Date.now().toString());
      localStorage.removeItem(dummyKey);
    }
  };
  
  return { 
    credential, 
    updateCredential,
    hasCredential: sharedCredentialsManager.hasCredential(credentialType),
    removeCredential: () => {
      sharedCredentialsManager.removeCredential(credentialType);
      setCredential(null);
    }
  };
};