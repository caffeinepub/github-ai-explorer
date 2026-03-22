import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import type { BookmarkEntry, UserSettings } from "../types/app";
import { useActor } from "./useActor";

// ── User Profile ──────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
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
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ── User Settings (client-side only — backend does not support this) ──────

const SETTINGS_STORAGE_KEY = "user-settings";

function loadSettingsFromStorage(): UserSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // resultsPerPage is stored as number in JSON, convert back to bigint
    return { ...parsed, resultsPerPage: BigInt(parsed.resultsPerPage ?? 10) };
  } catch {
    return null;
  }
}

function saveSettingsToStorage(settings: UserSettings) {
  try {
    // Store resultsPerPage as number since JSON doesn't support bigint
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...settings,
        resultsPerPage: Number(settings.resultsPerPage),
      }),
    );
  } catch {
    // ignore
  }
}

export function useGetUserSettings() {
  const query = useQuery<UserSettings | null>({
    queryKey: ["userSettings"],
    queryFn: async () => loadSettingsFromStorage(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return {
    ...query,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
  };
}

export function useSaveUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      saveSettingsToStorage(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });
}

// ── Bookmarks (client-side only — backend does not support this) ──────────

const BOOKMARKS_STORAGE_KEY = "user-bookmarks";

function loadBookmarksFromStorage(): BookmarkEntry[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveBookmarksToStorage(bookmarks: BookmarkEntry[]) {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // ignore
  }
}

export function useGetBookmarks() {
  return useQuery<BookmarkEntry[]>({
    queryKey: ["bookmarks"],
    queryFn: async () => loadBookmarksFromStorage(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useAddBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoId: string) => {
      const current = loadBookmarksFromStorage();
      if (!current.some((b) => b.repoId === repoId)) {
        const updated = [...current, { repoId, tags: [], note: null }];
        saveBookmarksToStorage(updated);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (repoId: string) => {
      const current = loadBookmarksFromStorage();
      saveBookmarksToStorage(current.filter((b) => b.repoId !== repoId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useUpdateBookmarkTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoId,
      tags,
    }: { repoId: string; tags: string[] }) => {
      const current = loadBookmarksFromStorage();
      saveBookmarksToStorage(
        current.map((b) => (b.repoId === repoId ? { ...b, tags } : b)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useUpdateBookmarkNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoId,
      note,
    }: { repoId: string; note: string | null }) => {
      const current = loadBookmarksFromStorage();
      saveBookmarksToStorage(
        current.map((b) => (b.repoId === repoId ? { ...b, note } : b)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

// ── GitHub Token (client-side only — backend does not support this) ───────

const GITHUB_TOKEN_STORAGE_KEY = "github-token";

export function useGetMyGithubToken() {
  return useQuery<string | null>({
    queryKey: ["githubToken"],
    queryFn: async () => localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function useSetMyGithubToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["githubToken"] });
    },
  });
}

export function useRemoveMyGithubToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["githubToken"] });
    },
  });
}

// ── Notifications ─────────────────────────────────────────────────────────

export function useGetNotifications() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAddNotification() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, body }: { title: string; body: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addNotification(title, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkNotificationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.markNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useClearNotifications() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.clearNotifications();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ── Teams ─────────────────────────────────────────────────────────────────

export function useGetMyTeams() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["myTeams"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyTeams();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateTeam() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teamId, name }: { teamId: string; name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTeam(teamId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
    },
  });
}

export function useGetTeamMembers(teamId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeamMembers(teamId);
    },
    enabled: !!actor && !actorFetching && !!teamId,
  });
}

export function useGetTeamBookmarks(teamId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["teamBookmarks", teamId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTeamBookmarks(teamId);
    },
    enabled: !!actor && !actorFetching && !!teamId,
  });
}

export function useAddTeamMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      userId,
    }: { teamId: string; userId: Principal }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addTeamMember(teamId, userId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["teamMembers", variables.teamId],
      });
    },
  });
}

export function useAddTeamBookmark() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      teamId,
      repoId,
    }: { teamId: string; repoId: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addTeamBookmark(teamId, repoId);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["teamBookmarks", variables.teamId],
      });
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
    },
  });
}
