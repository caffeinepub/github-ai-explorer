# Specification

## Summary
**Goal:** Extend the GitHub Explorer app with six new features on the repository detail page and navigation: a Personalized Recommendations Feed, a Project Roadmap Extractor, a One-Click README Generator, a Termux Integration panel, enhanced Docker support (Dockerfile + docker-compose.yml), and a GitHub Personal Access Token settings UI.

**Planned changes:**
- Add a **Recommendations** page/section in the main navigation that surfaces similar repos based on the user's bookmarks using matching languages and topics from the GitHub API.
- Add a **Roadmap** tab on the RepoDetailsPage that visualizes milestones, issue counts, due dates, and progress indicators using GitHub API data (issues, milestones, labels), with no external AI service.
- Add a **Generate README** tab/button on the RepoDetailsPage that produces a professional README.md client-side using repo metadata, detected tech stack, and file structure, with copy, download, and optional commit-to-fork functionality.
- Add a **Termux** tab on the RepoDetailsPage that generates a ready-to-copy multi-step shell script (gh auth login, fork, clone, install dependencies) based on the detected tech stack, displayed in a CodeBlock with copy and download options.
- Enhance the **Docker** tab on the RepoDetailsPage to generate and display both a Dockerfile and a docker-compose.yml using existing generators, with copy, download, and optional commit-to-fork options.
- Add a **GitHub Token Settings** option in the authenticated user dropdown (Layout header) that opens the GithubTokenSettings dialog for entering, viewing (masked), updating, or removing a locally stored PAT (localStorage), with toast notifications on save/removal.

**User-visible outcome:** Users can discover recommended repositories based on their bookmarks, view a visual project roadmap, generate and download a README or Docker config files for any repo, copy Termux shell scripts to set up repos on mobile, and manage their GitHub Personal Access Token directly from the app header.
