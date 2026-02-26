import React, { useState } from 'react';
import { Save, Trash2, RotateCcw, Clock, FolderOpen, Loader2, Terminal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useLoadTerminalSessions,
  useSaveTerminalSessionWithToast,
  useDeleteTerminalSession,
} from '../../hooks/useTerminalSessions';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import type { TerminalTab } from '../../hooks/useTerminalState';
import type { TerminalSession } from '../../backend';

interface SessionManagerProps {
  open: boolean;
  onClose: () => void;
  activeTab: TerminalTab;
  onRestoreSession: (session: { name: string; commandHistory: string[]; workingDirectory: string }) => void;
}

export function SessionManager({ open, onClose, activeTab, onRestoreSession }: SessionManagerProps) {
  const { identity } = useInternetIdentity();
  const { data: sessions = [], isLoading } = useLoadTerminalSessions();
  const saveSession = useSaveTerminalSessionWithToast();
  const deleteSession = useDeleteTerminalSession();
  const [saveName, setSaveName] = useState('');

  const handleSave = async () => {
    if (!saveName.trim() || !identity) return;
    const now = BigInt(Date.now()) * BigInt(1_000_000);
    const session: TerminalSession = {
      id: `${activeTab.id}-named-${Date.now()}`,
      name: saveName.trim(),
      userId: identity.getPrincipal(),
      commandHistory: activeTab.commandHistory,
      workingDirectory: activeTab.workingDirectory,
      outputHistory: activeTab.outputBuffer
        .filter((l) => l.type !== 'command')
        .map((l) => l.text)
        .slice(-100),
      createdAt: now,
      lastUsedAt: now,
      lastSavedAt: now,
    };
    await saveSession.mutateAsync(session);
    setSaveName('');
  };

  const handleRestore = (session: TerminalSession) => {
    onRestoreSession({
      name: session.name,
      commandHistory: session.commandHistory,
      workingDirectory: session.workingDirectory,
    });
    onClose();
  };

  const handleDelete = (sessionId: string) => {
    deleteSession.mutate(sessionId);
  };

  const formatDate = (ns: bigint) => {
    const ms = Number(ns) / 1_000_000;
    return new Date(ms).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0d1117] border-white/10 text-white max-w-lg font-mono">
        <DialogHeader>
          <DialogTitle className="text-neon-green flex items-center gap-2">
            <Save className="w-4 h-4" /> Session Manager
          </DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Save and restore terminal sessions across logins.
          </DialogDescription>
        </DialogHeader>

        {!identity ? (
          <div className="py-8 text-center space-y-2">
            <Terminal className="w-8 h-8 text-white/20 mx-auto" />
            <p className="text-white/40 text-sm">Login to save and restore sessions.</p>
          </div>
        ) : (
          <>
            {/* Save current session */}
            <div className="space-y-2">
              <p className="text-xs text-white/50">
                Save current session:{' '}
                <span className="text-neon-green">{activeTab.name}</span>
              </p>
              <div className="flex gap-2">
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Session name..."
                  className="bg-black/30 border-white/10 text-white placeholder-white/20 text-xs h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  disabled={saveSession.isPending}
                />
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!saveName.trim() || saveSession.isPending}
                  className="bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 text-neon-green h-8 shrink-0"
                >
                  {saveSession.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs text-white/50 mb-2">
                Saved sessions ({isLoading ? '…' : sessions.length})
              </p>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-xs text-white/25 text-center py-6">
                  No saved sessions yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {sessions.map((session) => {
                    const isDeleting =
                      deleteSession.isPending && deleteSession.variables === session.id;
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-2 p-2 rounded border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 truncate">{session.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                              <FolderOpen className="w-2.5 h-2.5" />
                              {session.workingDirectory}
                            </span>
                            <span className="text-[10px] text-white/25 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {formatDate(session.lastSavedAt)}
                            </span>
                            <span className="text-[10px] text-white/20">
                              {session.commandHistory.length} cmd
                              {session.commandHistory.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-neon-green/60 hover:text-neon-green hover:bg-neon-green/10"
                            onClick={() => handleRestore(session)}
                            title="Restore session"
                            disabled={isDeleting}
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                            onClick={() => handleDelete(session.id)}
                            title="Delete session"
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
