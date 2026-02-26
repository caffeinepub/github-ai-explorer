import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listDirectory, type FileEntry } from '../services/bridgeApi';

export function useFileBrowser(bridgeConnected: boolean) {
  const [currentPath, setCurrentPath] = useState<string>('~');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const { data: entries = [], isLoading, error, refetch } = useQuery<FileEntry[]>({
    queryKey: ['fileBrowser', currentPath],
    queryFn: () => listDirectory(currentPath),
    enabled: bridgeConnected,
    retry: false,
    staleTime: 10000,
  });

  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
  }, []);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const copyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path).catch(() => {});
  }, []);

  const goUp = useCallback(() => {
    if (currentPath === '~' || currentPath === '/') return;
    const parts = currentPath.replace(/\/$/, '').split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || '/');
  }, [currentPath]);

  return {
    currentPath,
    entries,
    isLoading,
    error,
    expandedPaths,
    navigate,
    toggleExpand,
    copyPath,
    goUp,
    refresh: refetch,
  };
}
