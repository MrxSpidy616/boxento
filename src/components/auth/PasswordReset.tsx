import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/useAuth';

interface PasswordResetProps {
  onBack: () => void;
  onSuccess?: () => void;
}

interface AuthContextType {
  resetPassword: (email: string) => Promise<void>;
}

export function PasswordReset({ onBack, onSuccess }: PasswordResetProps) {
  const { resetPassword } = useAuth() as AuthContextType;
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Further reduced padding on xs */}
      <CardHeader className="pb-2 px-3 sm:px-6 pt-6">
        {/* Added responsive title size */}
        <CardTitle className="text-xl sm:text-2xl">Reset Password</CardTitle>
        <CardDescription className="text-sm"> {/* Added text-sm */}
          Enter your email address and we'll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      {/* Further reduced padding on xs */}
      <CardContent className="px-3 sm:px-6 pt-4 pb-4">
        {/* Further reduced vertical spacing on xs */}
        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email" 
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <p className="text-sm text-green-500">
              Check your email for password reset instructions
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      </CardContent>
      {/* Further reduced padding on xs */}
      <CardFooter className="px-3 sm:px-6 pb-6 pt-0">
        <Button 
          variant="link" 
          onClick={onBack}
          // Reduced font size on xs
          className="w-full text-xs sm:text-sm"
          type="button"
        >
          Back to Sign In
        </Button>
      </CardFooter>
    </div>
  );
} 