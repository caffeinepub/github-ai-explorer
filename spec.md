# GitHub AI Explorer

## Current State
Full-featured GitHub explorer with: repo discovery, bookmarks, AI analysis, terminal with local bridge (always docked), Docker integration, workflow builder with Quick Run + presets, AI pair programmer panel, commit message generator, repo comparison tool, analytics dashboards (star history, activity heatmap, issue tracker, PR pulse, CI/CD viewer, batch export), advanced AI command suggestions, bridge scripts, profile/settings, Internet Identity auth.

## Requested Changes (Diff)

### Add
- **GitHub Gist Explorer page** (`/gists`): Browse trending public gists, search by keyword, view gist file contents, fork gists via PAT, save/bookmark gists.
- **Team Collaboration page** (`/teams`): Create teams via Internet Identity, invite members by principal, share bookmarks and repos within team, view team activity feed.
- **Notifications & Alerts center** (`/notifications`): In-app notification center showing repo activity alerts (new stars, issues, PRs), watch list updates, CI/CD status changes, team activity. Stored per user in backend.
- Backend types and methods for teams, team members, team shared bookmarks, and notifications/alerts.
- Nav links for Gists, Teams, Notifications in Layout.

### Modify
- Backend: add Team, TeamMember, Notification types and CRUD methods.
- Layout: add nav items for new pages.

### Remove
- Nothing removed.

## Implementation Plan
1. Add backend types: Team (id, name, ownerId, memberIds, sharedBookmarks, createdAt), Notification (id, userId, type, title, body, read, createdAt).
2. Add backend methods: createTeam, getMyTeams, addTeamMember, getTeamSharedBookmarks, addTeamBookmark, getNotifications, markNotificationRead, addNotification, clearNotifications.
3. Build GistExplorerPage: search/browse gists via GitHub API, view files, fork via PAT.
4. Build TeamsPage: create/join teams, member list, shared bookmarks tab, team activity.
5. Build NotificationsPage: list notifications, mark read, clear all, filter by type.
6. Wire nav links in Layout for all three pages.
