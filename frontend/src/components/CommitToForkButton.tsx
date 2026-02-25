import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useCommitSetupFiles, type FileStatus } from '../hooks/useCommitSetupFiles';
import type { CommitFile } from '../types/github';

interface CommitToForkButtonProps {
  forkOwner: string;
  forkRepo: string;
  token: string;
  files: CommitFile[];
  disabled?: boolean;
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case 'uploading': return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
    case 'success': return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
    case 'error': return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    default: return <span className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40" />;
  }
}

export function CommitToForkButton({ forkOwner, forkRepo, token, files, disabled }: CommitToForkButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { commit, isPending, fileStatuses } = useCommitSetupFiles();

  const hasStatuses = Object.keys(fileStatuses).length > 0;

  const handleConfirm = async () => {
    setShowConfirm(false);
    await commit(forkOwner, forkRepo, token, files);
  };

  return (
    <>
      <div className="space-y-2">
        {hasStatuses && (
          <div className="space-y-1">
            {files.map(f => (
              <div key={f.path} className="flex items-center gap-2 text-xs text-muted-foreground">
                <StatusIcon status={fileStatuses[f.path] || 'pending'} />
                <span className="font-mono">{f.path}</span>
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          disabled={disabled || isPending || files.length === 0}
          className="gap-2 w-full"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {isPending ? 'Committing...' : 'Commit to Fork'}
        </Button>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Commit Setup Files to Fork?</AlertDialogTitle>
            <AlertDialogDescription>
              This will commit the following files to{' '}
              <code className="font-mono text-primary">{forkOwner}/{forkRepo}</code>.
              Existing files with the same names will be overwritten.
              <ul className="mt-2 space-y-1">
                {files.map(f => (
                  <li key={f.path} className="font-mono text-xs">• {f.path}</li>
                ))}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Commit Files</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
