import { useState } from 'react';
import { toast } from 'sonner';
import { commitFilesToRepo } from '../services/githubApi';
import type { CommitFile } from '../types/github';

export type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

export function useCommitSetupFiles() {
  const [isPending, setIsPending] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<Record<string, FileStatus>>({});

  const commit = async (
    owner: string,
    repo: string,
    token: string,
    files: CommitFile[]
  ): Promise<boolean> => {
    setIsPending(true);
    const initial: Record<string, FileStatus> = {};
    for (const f of files) initial[f.path] = 'pending';
    setFileStatuses(initial);

    try {
      await commitFilesToRepo(owner, repo, token, files, (path, status) => {
        setFileStatuses(prev => ({ ...prev, [path]: status }));
      });
      toast.success(`All files committed to ${owner}/${repo} — https://github.com/${owner}/${repo}`);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to commit files';
      toast.error(message);
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { commit, isPending, fileStatuses };
}
