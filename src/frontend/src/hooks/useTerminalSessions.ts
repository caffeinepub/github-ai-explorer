import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { TerminalSession } from '../backend';
import { toast } from 'sonner';

// ── Query: load all sessions for the authenticated caller ──────────────────
export function useLoadTerminalSessions() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<TerminalSession[]>({
    queryKey: ['terminalSessions'],
    queryFn: async () => {
      if (!actor || !identity) return [];
      return actor.loadTerminalSessions();
    },
    enabled: !!actor && !actorFetching && !!identity,
  });
}

// ── Mutation: save (create or update) a session ────────────────────────────
export function useSaveTerminalSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: TerminalSession) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveTerminalSession(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminalSessions'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save session';
      toast.error(msg);
    },
  });
}

// ── Mutation: save with success toast (used from SessionManager UI) ────────
export function useSaveTerminalSessionWithToast() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (session: TerminalSession) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveTerminalSession(session);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminalSessions'] });
      toast.success('Session saved successfully');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to save session';
      toast.error(msg);
    },
  });
}

// ── Mutation: delete a session ─────────────────────────────────────────────
export function useDeleteTerminalSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTerminalSession(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminalSessions'] });
      toast.success('Session deleted');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to delete session';
      toast.error(msg);
    },
  });
}

// ── Hook: auto-restore sessions once after login ───────────────────────────
export function useAutoRestoreSessions(
  onRestore: (sessions: TerminalSession[]) => void
) {
  const { data: sessions, isFetched } = useLoadTerminalSessions();
  const { identity } = useInternetIdentity();
  const restoredRef = useRef(false);

  useEffect(() => {
    // Reset when user logs out
    if (!identity) {
      restoredRef.current = false;
      return;
    }
    // Restore once when sessions are first fetched after login
    if (isFetched && !restoredRef.current) {
      restoredRef.current = true;
      if (sessions && sessions.length > 0) {
        onRestore(sessions);
      }
    }
  }, [isFetched, sessions, identity, onRestore]);
}
