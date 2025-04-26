import { useState } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { AuthForm } from './AuthForm';
import { PasswordReset } from './PasswordReset';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthView = 'auth' | 'reset-password' ;

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [view, setView] = useState<AuthView>('auth');

  const handleBack = () => {
    setView('auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      {/* Further reduced padding on xs screens (p-3) */}
      <DialogContent className="p-3 sm:p-6 gap-0 w-[90vw] max-w-md max-h-[85vh] overflow-y-auto rounded-lg">
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"> {/* Ensure close button is above content */}
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        {view === 'auth' && (
          <AuthForm 
            onSuccess={onClose}
            onForgotPassword={() => setView('reset-password')}
          />
        )}
        {view === 'reset-password' && (
          <PasswordReset 
            onBack={handleBack}
            onSuccess={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
} 