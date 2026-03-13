# GitHub AI Explorer

## Current State
Full-featured GitHub explorer with terminal (local bridge), AI assistant panel, repo discovery, bookmarking, forking via PAT, Docker/Termux generation, analytics dashboards, profile/settings, session persistence via Internet Identity. Terminal has an AI assistant panel and command palette.

## Requested Changes (Diff)

### Add
- **Custom Workflow Builder** (#13): New page/section to create, save, and run reusable global workflows. Each workflow is a named sequence of steps (e.g., fork repo, generate setup script, open terminal, run install commands). Stored in localStorage. Users can create, edit, delete, reorder steps, and run workflows.
- **AI Pair Programmer Panel** (#11): Side panel accessible from terminal toolbar. User describes in plain English what they want to build; AI generates code snippets, commands, or step-by-step instructions in a conversational interface. Generated commands can be copied or run directly in the terminal.

### Modify
- App.tsx: Add route `/workflows`
- TerminalPage: Add Pair Programmer panel toggle button in toolbar
- Layout/navigation: Add Workflows nav link

### Remove
- Nothing

## Implementation Plan
1. Create WorkflowsPage.tsx with list, create/edit/delete/run workflows
2. Create WorkflowBuilderModal.tsx for creating/editing workflow steps
3. Create WorkflowRunModal.tsx for executing workflow step-by-step
4. Create AIPairProgrammerPanel.tsx in components/Terminal/
5. Update App.tsx, TerminalPage.tsx, and Layout.tsx
6. Workflow data stored in localStorage (github-explorer-workflows)
