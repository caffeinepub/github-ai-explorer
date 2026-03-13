import { useCallback, useState } from "react";

export interface RepoContext {
  owner: string;
  name: string;
  language: string;
  topics: string[];
  fullName: string;
}

const STORAGE_KEY = "activeRepoContext";

function loadFromStorage(): RepoContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RepoContext;
  } catch {
    return null;
  }
}

export function useRepoContext() {
  const [repoContext, setRepoContextState] = useState<RepoContext | null>(
    loadFromStorage,
  );

  const setRepoContext = useCallback((ctx: RepoContext) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    setRepoContextState(ctx);
  }, []);

  const clearRepoContext = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRepoContextState(null);
  }, []);

  return { repoContext, setRepoContext, clearRepoContext };
}
