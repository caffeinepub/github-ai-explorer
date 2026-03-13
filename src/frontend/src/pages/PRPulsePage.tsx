import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bug,
  Clock,
  Cpu,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  TrendingUp,
} from "lucide-react";
import React from "react";
import { useGetMyGithubToken } from "../hooks/useQueries";

// ── Types ──────────────────────────────────────────────────────────────────

interface GitHubPR {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at: string | null;
  created_at: string;
  closed_at: string | null;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// ── Data Fetch ─────────────────────────────────────────────────────────────

async function fetchAllPRs(
  owner: string,
  repo: string,
  token?: string | null,
): Promise<GitHubPR[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `token ${token}`;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`;
  const res = await fetch(url, { headers });
  if (res.status === 403)
    throw new Error("API rate limit exceeded. Add a GitHub PAT in Settings.");
  if (res.status === 404) throw new Error("Repository not found.");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

// ── Nav Tabs ───────────────────────────────────────────────────────────────

interface RepoNavTabsProps {
  owner: string;
  name: string;
}

function RepoNavTabs({ owner, name }: RepoNavTabsProps) {
  const tabs = [
    { label: "Details", to: `/repo/${owner}/${name}`, icon: null },
    {
      label: "Star History",
      to: `/repo/${owner}/${name}/stars`,
      icon: TrendingUp,
    },
    {
      label: "Activity",
      to: `/repo/${owner}/${name}/activity`,
      icon: Activity,
    },
    { label: "Issues", to: `/repo/${owner}/${name}/issues`, icon: Bug },
    {
      label: "PR Pulse",
      to: `/repo/${owner}/${name}/pr-pulse`,
      icon: GitPullRequest,
    },
    { label: "CI/CD", to: `/repo/${owner}/${name}/cicd`, icon: Cpu },
  ];

  return (
    <div className="flex gap-1 mt-6 border-b border-border pb-0 overflow-x-auto">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className="inline-flex items-center gap-1.5 px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary/40 transition-colors whitespace-nowrap [&.active]:text-primary [&.active]:border-primary"
          activeProps={{ className: "text-primary border-primary" }}
          activeOptions={{ exact: true }}
        >
          {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs font-mono text-muted-foreground mb-1">{label}</p>
      <p
        className={`text-2xl font-mono font-bold ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs font-mono text-muted-foreground mt-1">{sub}</p>
      )}
    </div>
  );
}

// ── PR Row ─────────────────────────────────────────────────────────────────

interface PRRowProps {
  pr: GitHubPR;
}

function PRRow({ pr }: PRRowProps) {
  const isMerged = pr.merged_at !== null;
  const isOpen = pr.state === "open";

  const statusLabel = isMerged ? "merged" : isOpen ? "open" : "closed";
  const statusClasses = isMerged
    ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
    : isOpen
      ? "bg-green-500/10 text-green-400 border-green-500/30"
      : "bg-red-500/10 text-red-400 border-red-500/30";

  const StatusIcon = isMerged
    ? GitMerge
    : isOpen
      ? GitPullRequest
      : GitPullRequestClosed;

  return (
    <a
      href={pr.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors border-b border-border/40 last:border-0 group"
    >
      <StatusIcon
        className={`w-4 h-4 shrink-0 ${isMerged ? "text-purple-400" : isOpen ? "text-green-400" : "text-red-400"}`}
      />

      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-foreground group-hover:text-primary transition-colors truncate">
          {pr.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] font-mono text-muted-foreground">
            #{pr.number}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {formatRelativeDate(pr.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${statusClasses}`}
        >
          {statusLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <Avatar className="w-5 h-5">
            <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
            <AvatarFallback className="text-[8px]">
              {pr.user.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            {pr.user.login}
          </span>
        </div>
      </div>
    </a>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PRPulsePage() {
  const { owner, name } = useParams({ from: "/repo/$owner/$name/pr-pulse" });
  const navigate = useNavigate();
  const { data: token } = useGetMyGithubToken();

  const {
    data: prs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pr-pulse", owner, name],
    queryFn: () => fetchAllPRs(owner, name, token),
    staleTime: 5 * 60 * 1000,
  });

  // Derived stats
  const totalOpen = prs ? prs.filter((p) => p.state === "open").length : 0;
  const merged = prs ? prs.filter((p) => p.merged_at !== null) : [];
  const closedNotMerged = prs
    ? prs.filter((p) => p.state === "closed" && !p.merged_at)
    : [];
  const totalClosed = merged.length + closedNotMerged.length;
  const mergeRate =
    totalClosed + merged.length > 0
      ? Math.round(
          (merged.length / (merged.length + closedNotMerged.length)) * 100,
        )
      : 0;

  const avgMergeDays =
    merged.length > 0
      ? Math.round(
          merged.reduce(
            (sum, pr) => sum + daysBetween(pr.created_at, pr.merged_at!),
            0,
          ) / merged.length,
        )
      : 0;

  const repoPath = `/repo/${owner}/${name}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: repoPath })}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground font-mono text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {owner}/{name}
      </Button>

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2">
          <GitPullRequest className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            PR <span className="text-primary">Pulse</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {owner}/{name} · pull request activity & metrics
        </p>
      </div>

      <RepoNavTabs owner={owner} name={name} />

      <div className="mt-8">
        {isLoading ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-4 space-y-2"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-14" />
                </div>
              ))}
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border/40"
                >
                  <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="w-5 h-5 rounded-full" />
                </div>
              ))}
            </div>
          </>
        ) : error ? (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load pull requests."}
            </p>
          </div>
        ) : !prs || prs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-3 text-center">
            <GitPullRequest className="w-8 h-8 text-muted-foreground/40" />
            <p className="font-mono text-sm text-muted-foreground">
              No pull requests found for this repository.
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard label="Open PRs" value={totalOpen} accent />
              <StatCard label="Merged" value={merged.length} sub="all time" />
              <StatCard
                label="Merge Rate"
                value={`${mergeRate}%`}
                sub="of closed PRs"
                accent={mergeRate >= 70}
              />
              <StatCard
                label="Avg Time to Merge"
                value={`${avgMergeDays}d`}
                sub={
                  merged.length > 0 ? `across ${merged.length} PRs` : "no data"
                }
              />
            </div>

            {/* PR List */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/50">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Recent <span className="text-primary">{prs.length}</span> pull
                  requests
                </span>
              </div>
              <div className="divide-y divide-border/40 max-h-[600px] overflow-y-auto">
                {prs.map((pr) => (
                  <PRRow key={pr.id} pr={pr} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
