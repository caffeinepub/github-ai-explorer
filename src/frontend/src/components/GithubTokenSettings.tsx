import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Eye, EyeOff, Trash2, CheckCircle, ExternalLink } from 'lucide-react';
import { useGetMyGithubToken, useSetMyGithubToken, useRemoveMyGithubToken } from '../hooks/useQueries';
import { toast } from 'sonner';

interface GithubTokenSettingsProps {
  open: boolean;
  onClose: () => void;
}

export function GithubTokenSettings({ open, onClose }: GithubTokenSettingsProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  const { data: existingToken, isLoading } = useGetMyGithubToken();
  const setToken = useSetMyGithubToken();
  const removeToken = useRemoveMyGithubToken();

  const hasToken = !!existingToken;

  const handleSave = async () => {
    if (!tokenInput.trim()) return;
    try {
      await setToken.mutateAsync(tokenInput.trim());
      setTokenInput('');
      toast.success('GitHub token saved successfully');
    } catch {
      toast.error('Failed to save token');
    }
  };

  const handleRemove = async () => {
    try {
      await removeToken.mutateAsync();
      toast.success('GitHub token removed');
    } catch {
      toast.error('Failed to remove token');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle>GitHub Personal Access Token</DialogTitle>
          </div>
          <DialogDescription>
            Your token is stored securely and used for forking repositories and committing setup files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          ) : hasToken ? (
            <Alert>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <AlertDescription className="flex items-center justify-between">
                <span>Token saved: <code className="font-mono">{'•'.repeat(20)}</code></span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removeToken.isPending}
                  className="text-destructive hover:text-destructive ml-2"
                >
                  {removeToken.isPending ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="pat-input">{hasToken ? 'Update Token' : 'Enter Token'}</Label>
            <div className="relative">
              <Input
                id="pat-input"
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires <code>repo</code> scope.{' '}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=Repo+Radar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Create token <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={!tokenInput.trim() || setToken.isPending}
              className="flex-1"
            >
              {setToken.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                hasToken ? 'Update Token' : 'Save Token'
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
