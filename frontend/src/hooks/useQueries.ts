import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, BookmarkEntry } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetBookmarks() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<BookmarkEntry[]>({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBookmarks();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addBookmark(repoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useRemoveBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeBookmark(repoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useUpdateBookmarkTags() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ repoId, tags }: { repoId: string; tags: string[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateBookmarkTags(repoId, tags);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useUpdateBookmarkNote() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ repoId, note }: { repoId: string; note: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateBookmarkNote(repoId, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useGetMyGithubToken() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['githubToken'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyGithubToken();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useSetMyGithubToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setMyGithubToken(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['githubToken'] });
    },
  });
}

export function useRemoveMyGithubToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeMyGithubToken();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['githubToken'] });
    },
  });
}
