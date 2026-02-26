import { useState } from 'react';
import { toast } from 'sonner';
import { forkRepository } from '../services/githubApi';
import type { ForkResult } from '../types/github';

export function useForkRepo() {
  const [isPending, setIsPending] = useState(false);
  const [forkedRepo, setForkedRepo] = useState<ForkResult | null>(null);

  const fork = async (owner: string, repo: string, token: string): Promise<ForkResult | null> => {
    setIsPending(true);
    try {
      const result = await forkRepository(owner, repo, token);
      setForkedRepo(result);
      toast.success(`Forked successfully! View at: ${result.html_url}`);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fork repository';
      toast.error(message);
      return null;
    } finally {
      setIsPending(false);
    }
  };

  return { fork, isPending, forkedRepo };
}
