import { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  confirmPasswordReset,
  updateProfile,
  Auth
} from 'firebase/auth';
import { auth } from './firebase';
import { configManager } from './configManager';
import { isFirebaseInitialized } from './firebase';

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmReset: (oobCode: string, newPassword: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  googleSignIn: () => Promise<UserCredential>;
  githubSignIn: () => Promise<UserCredential>;
  twitterSignIn: () => Promise<UserCredential>;
  facebookSignIn: () => Promise<UserCredential>;
  appleSignIn: () => Promise<UserCredential>;
  microsoftSignIn: () => Promise<UserCredential>;
  phoneSignIn: () => Promise<unknown>;  // Phone auth requires multiple steps
}

const AuthContext = createContext<AuthContextType | null>(null);
export { AuthContext };

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Set up auth state listener
  useEffect(() => {
    if (!isFirebaseInitialized || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // If Firebase is not initialized, provide no-op functions
  if (!isFirebaseInitialized || !auth) {
    const noOp = () => Promise.reject(new Error('Firebase is not initialized'));
    
    const value = {
      currentUser: null,
      loading: false,
      signup: noOp,
      login: noOp,
      logout: noOp,
      resetPassword: noOp,
      confirmReset: noOp,
      updateUserProfile: noOp,
      googleSignIn: noOp,
      githubSignIn: noOp,
      twitterSignIn: noOp,
      facebookSignIn: noOp,
      appleSignIn: noOp,
      microsoftSignIn: noOp,
      phoneSignIn: noOp,
    };

    return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Providers
  const googleProvider = new GoogleAuthProvider();
  const githubProvider = new GithubAuthProvider();
  const twitterProvider = new TwitterAuthProvider();
  const facebookProvider = new FacebookAuthProvider();
  const appleProvider = new OAuthProvider('apple.com');
  const microsoftProvider = new OAuthProvider('microsoft.com');

  // Email & Password Authentication
  function signup(email: string, password: string, displayName?: string) {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return createUserWithEmailAndPassword(auth, email, password)
      .then((result) => {
        // Update profile if displayName is provided
        if (displayName && result.user) {
          return updateProfile(result.user, { displayName })
            .then(() => result);
        }
        return result;
      });
  }

  function login(email: string, password: string) {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));

    // Function to clear all localStorage except theme and app settings
    const clearAllStorage = () => {
      // Save theme setting and app settings
      const theme = localStorage.getItem('theme');
      const appSettings = localStorage.getItem('boxento-app-settings');
      
      // Clear ALL localStorage
      localStorage.clear();
      
      // Restore theme if available
      if (theme) {
        localStorage.setItem('theme', theme);
      }
      
      // Restore app settings if available
      if (appSettings) {
        localStorage.setItem('boxento-app-settings', appSettings);
      }
      
      // Also clear sessionStorage just to be sure
      sessionStorage.clear();
    };
    
    // Return a promise to handle async operations
    return new Promise<void>((resolve, reject) => {
      try {
        // Clear storage first to ensure widgets reset
        clearAllStorage();
        
        // Attempt to clear Firestore only if user is logged in
        if (auth?.currentUser) {
          // We don't await this because we don't want to delay logout if it fails
          configManager.clearAllConfigs().catch(e => 
            console.warn('Failed to clear Firestore configs, continuing logout', e)
          );
        }
        
        // Now sign out - we know auth is not null from the check at the start of the function
        const authInstance = auth as Auth; // Type assertion since we checked !auth at start
        signOut(authInstance)
          .then(() => {
            // Clear storage again after signout just to be absolutely sure
            clearAllStorage();
            console.log('Logout successful, reloading page...');
            
            // Add a small delay before reload to ensure all operations complete
            setTimeout(() => {
              // Use clean client-side routing instead of cache busting parameter
              window.location.replace(window.location.origin);
            }, 100);
            
            resolve();
          })
          .catch(error => {
            console.error('Error during sign out:', error);
            reject(error);
          });
      } catch (error) {
        console.error('Error during logout process:', error);
        reject(error);
      }
    });
  }

  function resetPassword(email: string) {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return sendPasswordResetEmail(auth, email);
  }

  function confirmReset(oobCode: string, newPassword: string) {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return confirmPasswordReset(auth, oobCode, newPassword);
  }

  function updateUserProfile(displayName: string, photoURL?: string) {
    if (!currentUser) throw new Error('No user signed in');
    return updateProfile(currentUser, { displayName, photoURL: photoURL || null });
  }

  // Social Authentication
  function googleSignIn() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithPopup(auth, googleProvider);
  }

  function githubSignIn() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithPopup(auth, githubProvider);
  }

  function twitterSignIn() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithPopup(auth, twitterProvider);
  }

  function facebookSignIn() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithPopup(auth, facebookProvider);
  }

  function appleSignIn() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithPopup(auth, appleProvider);
  }

  function microsoftSignIn() {
    if (!auth) return Promise.reject(new Error('Firebase is not initialized'));
    return signInWithPopup(auth, microsoftProvider);
  }

  // Phone Authentication
  function phoneSignIn() {
    // This is a placeholder - phone auth requires recaptcha setup and verification
    // Typically, you'd return the verification process or start it here
    return Promise.resolve('Phone auth initialized');
  }

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    confirmReset,
    updateUserProfile,
    googleSignIn,
    githubSignIn,
    twitterSignIn,
    facebookSignIn,
    appleSignIn,
    microsoftSignIn,
    phoneSignIn
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 