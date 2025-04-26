import React, { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  onToggleForm: () => void;
  onForgotPassword: () => void;
  onSuccess?: () => void;
  onPhoneAuth?: () => void;
}

export function LoginForm({ onToggleForm, onForgotPassword, onSuccess, onPhoneAuth }: LoginFormProps) {
  const auth = useAuth();
  if (!auth) throw new Error("Auth context is not available");
  const { login } = auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      if (onSuccess) onSuccess();
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Further reduced padding on xs, reduced bottom padding */}
      <CardHeader className="space-y-1 px-3 sm:px-6 pt-6 pb-3">
        {/* Reduced title size on xs */}
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-muted-foreground text-sm"> {/* Added text-sm */}
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      {/* Further reduced padding and vertical spacing on xs */}
      <CardContent className="space-y-3 sm:space-y-6 px-3 sm:px-6 pb-6">
        {/* Further reduced vertical spacing on xs */}
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="bg-background border-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
              className="bg-background border-input"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="flex flex-col space-y-2 text-center text-sm">
          {/* Reduced font size on xs */}
          <Button variant="link" onClick={onForgotPassword} type="button" className="text-primary text-xs sm:text-sm">
            Forgot password?
          </Button>
          {onPhoneAuth && (
            <Button variant="link" onClick={onPhoneAuth} type="button" className="text-primary text-xs sm:text-sm">
              Sign in with phone
            </Button>
          )}
          {/* Reduced font size on xs */}
          <Button variant="link" onClick={onToggleForm} type="button" className="text-primary text-xs sm:text-sm">
            Don't have an account? Sign up
          </Button>
        </div>
      </CardContent>
    </div>
  );
} 