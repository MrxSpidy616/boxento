import React, { useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface SignupFormProps {
  onToggleForm: () => void;
  onSuccess?: () => void;
  onPhoneAuth?: () => void;
}

export function SignupForm({ onToggleForm, onSuccess }: SignupFormProps) {
  const auth = useAuth();
  if (!auth) throw new Error("Auth context is not available");
  const { signup } = auth;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await signup(email, password);
      if (onSuccess) onSuccess();
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
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
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">Create an account</CardTitle>
        <CardDescription className="text-muted-foreground text-sm"> {/* Added text-sm */}
          Enter your details to create your account
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
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-foreground">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              required
              className="bg-background border-input"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center">
          {/* Reduced font size on xs */}
          <Button variant="link" onClick={onToggleForm} type="button" className="text-primary text-xs sm:text-sm">
            Already have an account? Sign in
          </Button>
        </div>
      </CardContent>
    </div>
  );
} 