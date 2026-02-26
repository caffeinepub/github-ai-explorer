import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield, LogIn } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDialog?: boolean;
  onDialogClose?: () => void;
}

export function AuthGuard({ children, fallback, showDialog = false, onDialogClose }: AuthGuardProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  if (isAuthenticated) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return null;
}

interface AuthPromptDialogProps {
  open: boolean;
  onClose: () => void;
  actionDescription?: string;
}

export function AuthPromptDialog({ open, onClose, actionDescription }: AuthPromptDialogProps) {
  const { login, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isLoggingIn = loginStatus === 'logging-in';

  const handleLogin = async () => {
    try {
      await login();
      queryClient.invalidateQueries();
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.message === 'User is already authenticated') {
        onClose();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>Login Required</DialogTitle>
          </div>
          <DialogDescription>
            {actionDescription
              ? `You need to be logged in to ${actionDescription}.`
              : 'You need to be logged in to use this feature.'}
            {' '}Login securely with Internet Identity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleLogin} disabled={isLoggingIn} className="flex-1">
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Login
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
