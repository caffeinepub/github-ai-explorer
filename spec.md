# GitHub AI Explorer

## Current State
The app has an existing AI Assistant Panel in the terminal (`AIAssistantPanel.tsx`) that provides basic command suggestions via `useAICommandSuggestion` and `useAIErrorAnalysis` hooks. The terminal also has a `CommandPalette.tsx` for command search. The backend stores terminal sessions with command history per user. The AI suggestions are currently rule-based (keyword matching), not context-aware.

## Requested Changes (Diff)

### Add
- `useRepoContext` hook: reads the currently active/focused repo from localStorage or URL params, returns repo metadata (name, language, topics, tech stack)
- `useWorkflowHistory` hook: aggregates command history across all terminal sessions stored in backend, builds frequency maps per repo and globally
- `AIContextBanner` component: small banner in the terminal showing the active repo context (name, language) and a "context-aware mode" indicator
- Context-aware suggestion engine in `useAICommandSuggestion`: when a repo context is set, bias suggestions toward that repo's language/stack (e.g. if repo is Python, prioritize pip/pytest/python commands; if Node.js, prioritize npm/yarn/node)
- Proactive suggestions sidebar section in `AIAssistantPanel`: shows "Suggested next steps" based on recent command history patterns without the user needing to type
- Workflow pattern recognition: detect common sequences (e.g. after `git clone` suggest `cd <repo> && npm install`; after `npm install` suggest `npm run dev`)
- Repo-pinning in terminal: a button to pin the active repo context to the terminal session so AI suggestions stay scoped to it

### Modify
- `AIAssistantPanel.tsx`: add a context section at the top showing pinned repo, add proactive suggestions panel, pass repo context to suggestion engine
- `useAICommandSuggestion.ts` (or equivalent): enhance to accept repo context (language, topics) and workflow history to produce better-ranked suggestions
- `TerminalPage.tsx` or `TerminalViewport.tsx`: pass active repo context from URL/localStorage to the AI panel

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/hooks/useRepoContext.ts` — reads active repo from localStorage key `activeRepoContext`, exposes `repoContext` and `setRepoContext`
2. Create `src/frontend/src/hooks/useWorkflowHistory.ts` — loads terminal sessions from backend, computes top-N commands globally and per repo, returns `getTopCommands(repoName?)` 
3. Enhance `src/frontend/src/utils/aiCommandRules.ts` (or equivalent) — add context-aware scoring: if repoContext.language === 'Python', boost Python commands; if 'JavaScript'/'TypeScript', boost Node commands; etc.
4. Create `src/frontend/src/components/Terminal/AIContextBanner.tsx` — compact banner showing pinned repo name + language + unpin button
5. Update `AIAssistantPanel.tsx` — add ProactiveSuggestions section ("Based on your history"), integrate repo context banner, pass context to suggestion hook
6. Update terminal page/viewport to detect repo from URL params or localStorage and expose setRepoContext
7. Validate and build
