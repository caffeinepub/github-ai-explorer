# GitHub AI Explorer

## Current State
The app is a full-featured GitHub Explorer with:
- Internet Identity authentication
- GitHub repo search, trending, and bookmarks
- Repo details with AI analysis, README preview, tech stack detection, Docker/Termux command generation
- Terminal page with AI assistant, command palette, file browser, session manager, local bridge support
- Profile home page and settings page
- GitHub PAT settings for forking
- Backend: TerminalSession persistence, UserProfile storage

## Requested Changes (Diff)

### Add
- **Star History Chart**: Visualize how a repo's star count has grown over time using an interactive chart. Use GitHub Archive or Stars API proxy to fetch historical star data.
- **Repo Activity Heatmap**: GitHub-style contribution/commit heatmap showing weekly commit frequency over the past year, using GitHub API commit activity endpoint.
- **Issue Tracker Dashboard**: View open issues for any repo in a structured dashboard with labels, assignees, status filters, and pagination. Uses GitHub Issues API.
- New route `/repo/:owner/:name/stars` for Star History
- New route `/repo/:owner/:name/activity` for Heatmap
- New route `/repo/:owner/:name/issues` for Issue Tracker
- Tab navigation on RepoDetailsPage linking to these new sub-pages

### Modify
- **RepoDetailsPage**: Add tab bar with links to Star History, Activity Heatmap, and Issues Dashboard for a selected repo
- **Navigation/Layout**: Ensure new pages are accessible from repo details

### Remove
- Nothing removed

## Implementation Plan
1. Write `StarHistoryPage.tsx` — fetches star history via GitHub API (stargazers with timestamps), renders an interactive line chart (using recharts)
2. Write `ActivityHeatmapPage.tsx` — fetches weekly commit activity via GitHub API, renders a 52-week heatmap grid
3. Write `IssueTrackerPage.tsx` — fetches open/closed issues via GitHub API with label filters, search, pagination
4. Update `RepoDetailsPage.tsx` to add a tab bar linking to these new sub-pages
5. Update `App.tsx` to register the 3 new routes

## UX Notes
- Star History: Line chart with tooltips showing date + cumulative star count
- Activity Heatmap: Grid of colored squares (darker = more commits), similar to GitHub profile view, with week/month axis labels
- Issue Tracker: Clean list/card layout with color-coded labels, avatar for assignee, open/closed toggle, search bar, and pagination
- All 3 pages inherit repo context (owner/name) from route params and show a back-link to repo details
- GitHub PAT from settings is used for higher API rate limits where available
