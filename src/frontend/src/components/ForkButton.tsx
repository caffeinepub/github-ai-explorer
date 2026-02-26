import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GitFork, ExternalLink } from 'lucide-react';
import { AuthPromptDialog } from './AuthGuard';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetMyGithubToken } from '../hooks/useQueries';
import { useForkRepo } from '../hooks/useForkRepo';
import type { ForkResult } from '../types/github';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ForkButtonProps {
  owner: string;
  repo: string;
  onForked?: (result: ForkResult) => void;
  size?: 'sm' | 'default';
}

export function ForkButton({ owner, repo, onForked, size = 'default' }: ForkButtonProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: token } = useGetMyGithubToken();
  const { fork, isPending, forkedRepo } = useForkRepo();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handleFork = async () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    if (!token) return;
    const result = await fork(owner, repo, token);
    if (result && onForked) onForked(result);
  };

  if (forkedRepo) {
    return (
      <Button variant="outline" size={size} asChild className="gap-2 text-green-400 border-green-500/40">
        <a href={forkedRepo.html_url} target="_blank" rel="noopener noreferrer">
          <GitFork className="w-4 h-4" />
          View Fork
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </Button>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size={size} onClick={() => setShowAuthDialog(true)} className="gap-2">
              <GitFork className="w-4 h-4" />
              Fork
            </Button>
          </TooltipTrigger>
          <TooltipContent>Login to fork this repository</TooltipContent>
        </Tooltip>
        <AuthPromptDialog
          open={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
          actionDescription="fork repositories"
        />
      </>
    );
  }

  if (!token) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size={size} disabled className="gap-2 opacity-60">
            <GitFork className="w-4 h-4" />
            Fork
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add a GitHub token in settings to fork</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button variant="outline" size={size} onClick={handleFork} disabled={isPending} className="gap-2">
      {isPending ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <GitFork className="w-4 h-4" />
      )}
      {isPending ? 'Forking...' : 'Fork'}
    </Button>
  );
}
