import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Bug, Search, AlertCircle, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GitHubLabel {
  id: number;
  name: string;
  color: string;
}

interface GitHubAssignee {
  login: string;
  avatar_url: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  created_at: string;
  labels: GitHubLabel[];
  assignees: GitHubAssignee[];
}

function getGitHubToken(): string | null {
  return localStorage.getItem("github_pat") || localStorage.getItem("github-token");
}

async function fetchIssues(
  owner: string,
  repo: string,
  state: "open" | "closed",
  page: number
): Promise<{ issues: GitHubIssue[]; hasMore: boolean }> {
  const token = getGitHubToken();
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  if (token) headers["Authorization"] = `token ${token}`;

  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=30&page=${page}`;
  const res = await fetch(url, { headers });
  if (res.status === 404) throw new Error("Repository not found.");
  if (res.status === 403) throw new Error("API rate limit exceeded. Add a GitHub PAT in Settings.");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const issues: GitHubIssue[] = await res.json();
  const realIssues = issues.filter((i) => !("pull_request" in i));
  return { issues: realIssues, hasMore: realIssues.length === 30 };
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

function getLabelStyle(hexColor: string): { backgroundColor: string; color: string; borderColor: string } {
  const clean = hexColor.replace("#", "");
  return {
    backgroundColor: `#${clean}33`,
    color: `#${clean}`,
    borderColor: `#${clean}66`,
  };
}

interface IssueCardProps {
  issue: GitHubIssue;
}

function IssueCard({ issue }: IssueCardProps) {
  const isOpen = issue.state === "open";
  return (
    <a
      href={issue.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
            isOpen
              ? "bg-green-500/10 text-green-400 border-green-500/30"
              : "bg-purple-500/10 text-purple-400 border-purple-500/30"
          }`}
        >
          {isOpen ? "open" : "closed"}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground shrink-0">#{issue.number}</span>
            <h3 className="font-mono text-sm text-foreground group-hover:text-primary transition-colors leading-snug break-words">
              {issue.title}
            </h3>
          </div>

          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {issue.labels.map((label) => {
                const style = getLabelStyle(label.color);
                return (
                  <span
                    key={label.id}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                    style={style}
                  >
                    {label.name}
                  </span>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] font-mono text-muted-foreground">
              Opened {formatRelativeDate(issue.created_at)}
            </span>
            {issue.assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-muted-foreground" />
                <div className="flex -space-x-1">
                  {issue.assignees.slice(0, 3).map((assignee) => (
                    <img
                      key={assignee.login}
                      src={assignee.avatar_url}
                      alt={assignee.login}
                      className="w-4 h-4 rounded-full border border-border"
                      title={assignee.login}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

export default function IssueTrackerPage() {
  const { owner, name } = useParams({ from: "/repo/$owner/$name/issues" });
  const navigate = useNavigate();

  const [stateFilter, setStateFilter] = useState<"open" | "closed">("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadIssues = useCallback(
    async (st: "open" | "closed", pg: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchIssues(owner, name, st, pg);
        setIssues(result.issues);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load issues");
      } finally {
        setIsLoading(false);
      }
    },
    [owner, name]
  );

  useEffect(() => {
    setPage(1);
    loadIssues(stateFilter, 1);
  }, [stateFilter, loadIssues]);

  function handleStateChange(newState: "open" | "closed") {
    setStateFilter(newState);
    setSearchQuery("");
  }

  function handlePrev() {
    const newPage = Math.max(1, page - 1);
    setPage(newPage);
    loadIssues(stateFilter, newPage);
  }

  function handleNext() {
    const newPage = page + 1;
    setPage(newPage);
    loadIssues(stateFilter, newPage);
  }

  const filtered = issues.filter(
    (issue) =>
      searchQuery.trim() === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const repoPath = `/repo/${owner}/${name}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: repoPath })}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground font-mono text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {owner}/{name}
      </Button>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Bug className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Issue <span className="text-primary">Tracker</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {owner}/{name} · browse open and closed issues
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => handleStateChange("open")}
            className={`px-4 py-2 font-mono text-xs transition-colors ${
              stateFilter === "open"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => handleStateChange("closed")}
            className={`px-4 py-2 font-mono text-xs transition-colors border-l border-border ${
              stateFilter === "closed"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            Closed
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter issues by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {["s0", "s1", "s2", "s3", "s4", "s5"].map((key) => (
            <div key={key} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-16 h-5 bg-secondary rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-4 bg-secondary rounded-full w-16" />
                    <div className="h-4 bg-secondary rounded-full w-12" />
                  </div>
                  <div className="h-3 bg-secondary rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="font-mono text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadIssues(stateFilter, page)}
            className="font-mono text-xs"
          >
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center">
          <Bug className="w-8 h-8 text-muted-foreground/40" />
          <p className="font-mono text-sm text-muted-foreground">
            {searchQuery ? "No issues match your filter." : `No ${stateFilter} issues found.`}
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs font-mono text-muted-foreground mb-4">
            Showing{" "}
            <span className="text-primary">{filtered.length}</span>{" "}
            {stateFilter} issue{filtered.length !== 1 ? "s" : ""}
            {searchQuery && ` matching "${searchQuery}"`}
            {` · page ${page}`}
          </div>

          <div className="space-y-2">
            {filtered.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>

          {(page > 1 || hasMore) && (
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={page === 1}
                className="gap-2 font-mono text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </Button>
              <span className="font-mono text-xs text-muted-foreground">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!hasMore}
                className="gap-2 font-mono text-xs"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
