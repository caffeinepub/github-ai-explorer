import { useEffect, useCallback } from 'react';
import { useGetUserSettings, useSaveUserSettings } from './useQueries';
import type { UserSettings } from '../types/app';

type ThemeValue = 'light' | 'dark' | 'system';

const DEFAULT_SETTINGS: UserSettings = {
  displayName: '',
  avatarUrl: '',
  defaultSearchSort: 'stars',
  defaultLanguageFilter: '',
  resultsPerPage: BigInt(10),
  notificationsEnabled: false,
  savedSearchAlertsEnabled: false,
  theme: 'system',
  profileVisibility: 'private',
  showActivityStats: true,
  compactView: false,
  showStarCount: true,
};

function applyThemeToDOM(theme: ThemeValue) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export function useTheme() {
  const { data: settings } = useGetUserSettings();
  const saveSettings = useSaveUserSettings();

  const theme = (settings?.theme as ThemeValue) || 'system';

  // Apply theme whenever settings change
  useEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeToDOM('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: ThemeValue) => {
      applyThemeToDOM(newTheme);
      const merged: UserSettings = {
        ...DEFAULT_SETTINGS,
        ...settings,
        theme: newTheme,
      };
      saveSettings.mutate(merged);
    },
    [settings, saveSettings]
  );

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  return { theme, setTheme, resolvedTheme };
}
