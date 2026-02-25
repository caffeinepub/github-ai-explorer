import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h3 className="font-mono font-semibold text-foreground mb-2">Something went wrong</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 font-mono">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="font-mono border-border hover:border-primary hover:text-primary"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}
