// Local type definitions for features not backed by the current backend interface.
// These types were previously generated from the backend but are now maintained client-side.

export interface BookmarkEntry {
  repoId: string;
  tags: string[];
  note: string | null;
}

export interface UserSettings {
  displayName: string;
  avatarUrl: string;
  defaultSearchSort: string;
  defaultLanguageFilter: string;
  resultsPerPage: bigint;
  notificationsEnabled: boolean;
  savedSearchAlertsEnabled: boolean;
  theme: string;
  profileVisibility: string;
  showActivityStats: boolean;
  compactView: boolean;
  showStarCount: boolean;
}
