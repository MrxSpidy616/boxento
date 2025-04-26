import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/useAuth';
import type { AuthContextType } from '@/lib/AuthContext';

const GoogleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.766 12.2764c0-.9175-.075-1.7967-.213-2.6451H12.24v4.9937h6.468c-.283 1.5056-1.13 2.7844-2.406 3.6367v3.0246h3.89c2.274-2.0937 3.574-5.177 3.574-8.9099z" fill="#4285F4"/>
    <path d="M12.24 24c3.245 0 5.967-1.0763 7.955-2.9137l-3.89-3.0246c-1.08.724-2.46 1.1503-4.065 1.1503-3.125 0-5.77-2.1137-6.715-4.9527H1.515v3.1236C3.485 21.2433 7.56 24 12.24 24z" fill="#34A853"/>
    <path d="M5.525 14.2593c-.24-.7137-.375-1.4773-.375-2.2593s.135-1.5456.375-2.2593V6.6171H1.515C.555 8.2459 0 10.0574 0 12s.555 3.754 1.515 5.3829l4.01-3.1236z" fill="#FBBC05"/>
    <path d="M12.24 4.7837c1.755 0 3.33.6041 4.57 1.7914l3.455-3.4551C18.205 1.1959 15.483 0 12.24 0 7.56 0 3.485 2.7567 1.515 6.6171l4.01 3.1236c.945-2.839 3.59-4.9527 6.715-4.9527z" fill="#EA4335"/>
  </svg>
);

const GithubIcon = () => (
  <svg className="size-5 dark:fill-white" viewBox="0 0 24 24" fill="#333333" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const TwitterIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="#1DA1F2" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733a4.67 4.67 0 002.048-2.578 9.3 9.3 0 01-2.958 1.13 4.66 4.66 0 00-7.938 4.25 13.229 13.229 0 01-9.602-4.868c-.4.69-.63 1.49-.63 2.342A4.66 4.66 0 003.96 9.824a4.647 4.647 0 01-2.11-.583v.06a4.66 4.66 0 003.737 4.568 4.692 4.692 0 01-2.104.08 4.661 4.661 0 004.352 3.234 9.348 9.348 0 01-5.786 1.995 9.5 9.5 0 01-1.112-.065 13.175 13.175 0 007.14 2.093c8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602a9.47 9.47 0 002.323-2.41z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="size-5 dark:fill-white" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.52-3.2 0-1.44.71-2.23.51-3.08-.4C3.11 15.46 4.05 8.08 9.25 7.87c1.28.08 2.19.68 2.97.72.97-.12 1.88-.74 3.11-.82 1.89-.13 3.29.71 4.19 1.97-3.29 2.05-2.76 6.4.66 7.87-.59 1.4-1.35 2.76-2.13 3.67zM12.03 7.67C11.88 5.34 13.73 3.47 15.89 3.3c.26 2.56-2.26 4.49-3.86 4.37z"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#F25022" d="M0 0h11.377v11.372H0z"/>
    <path fill="#00A4EF" d="M0 12.623h11.377V24H0z"/>
    <path fill="#7FBA00" d="M12.623 0H24v11.372H12.623z"/>
    <path fill="#FFB900" d="M12.623 12.623H24V24H12.623z"/>
  </svg>
);

export function SocialLoginButtons() {
  const { 
    googleSignIn,
    githubSignIn,
    twitterSignIn,
    facebookSignIn,
    appleSignIn,
    microsoftSignIn
  } = useAuth() as AuthContextType;

  return (
    // Reduced gap on xs screens
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
      <Button 
        variant="outline" 
        onClick={googleSignIn}
        className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900 border dark:border-gray-800"
      >
        <GoogleIcon />
        {/* Hide text on xs */}
        <span className="dark:text-gray-300 hidden sm:inline">Google</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={githubSignIn}
        className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900 border dark:border-gray-800"
      >
        <GithubIcon />
        {/* Hide text on xs */}
        <span className="dark:text-gray-300 hidden sm:inline">GitHub</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={twitterSignIn}
        className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900 border dark:border-gray-800"
      >
        <TwitterIcon />
        {/* Hide text on xs */}
        <span className="dark:text-gray-300 hidden sm:inline">Twitter</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={facebookSignIn}
        className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900 border dark:border-gray-800"
      >
        <FacebookIcon />
        {/* Hide text on xs */}
        <span className="dark:text-gray-300 hidden sm:inline">Facebook</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={appleSignIn}
        className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900 border dark:border-gray-800"
      >
        <AppleIcon />
        {/* Hide text on xs */}
        <span className="dark:text-gray-300 hidden sm:inline">Apple</span>
      </Button>
      <Button 
        variant="outline" 
        onClick={microsoftSignIn}
        className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-950 dark:hover:bg-gray-900 border dark:border-gray-800"
      >
        <MicrosoftIcon />
        {/* Hide text on xs */}
        <span className="dark:text-gray-300 hidden sm:inline">Microsoft</span>
      </Button>
    </div>
  );
} 