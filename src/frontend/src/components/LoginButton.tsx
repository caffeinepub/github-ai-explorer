import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: unknown) {
        const err = error as Error;
        if (err?.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <Button
      onClick={handleAuth}
      disabled={isLoggingIn}
      size="sm"
      variant={isAuthenticated ? 'outline' : 'default'}
      className={`
        h-8 px-3 text-xs font-mono transition-all
        ${isAuthenticated
          ? 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/50'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon'
        }
      `}
    >
      {isLoggingIn ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Connecting...</>
      ) : isAuthenticated ? (
        <><LogOut className="w-3.5 h-3.5 mr-1.5" />Logout</>
      ) : (
        <><LogIn className="w-3.5 h-3.5 mr-1.5" />Login</>
      )}
    </Button>
  );
}
