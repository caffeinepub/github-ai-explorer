import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bug,
  CheckCircle,
  Circle,
  Clock,
  Cpu,
  GitPullRequest,
  RefreshCw,
  TrendingUp,
  Workflow,
  XCircle,
} from "lucide-react";
import React from "react";
import { useGetMyGithubToken } from "../hooks/useQueries";

// ── Types ──────────────────────────────────────────────────────────────────

interface GitHubWorkflow {
  id: number;
  name: string;
  state: string;
  path: string;
}

interface GitHubWorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  event: string;
  html_url: string;
  head_branch: string;
}

interface WorkflowWithRuns {
  workflow: GitHubWorkflow;
  runs: GitHubWorkflowRun[];
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

// ── Data Fetch ─────────────────────────────────────────────────────────────

async function fetchWorkflows(
  owner: string,
  repo: string,
  token?: string | null,
): Promise<GitHubWorkflow[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
    { headers },
  );
  if (res.status === 403)
    throw new Error("API rate limit exceeded. Add a GitHub PAT in Settings.");
  if (res.status === 404) throw new Error("Repository not found.");
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const data = await res.json();
  return data.workflows || [];
}

async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  workflowId: number,
  token?: string | null,
): Promise<GitHubWorkflowRun[]> {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" };
  if (token) headers.Authorization = `token ${token}`;
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=5`,
    { headers },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.workflow_runs || [];
}

async function fetchWorkflowsWithRuns(
  owner: string,
  repo: string,
  token?: string | null,
): Promise<WorkflowWithRuns[]> {
  const workflows = await fetchWorkflows(owner, repo, token);
  if (workflows.length === 0) return [];
  const results = await Promise.all(
    workflows.map(async (wf) => ({
      workflow: wf,
      runs: await fetchWorkflowRuns(owner, repo, wf.id, token),
    })),
  );
  return results;
}

// ── Status Helpers ─────────────────────────────────────────────────────────

type RunStatus = "success" | "failure" | "in_progress" | "other";

function getRunStatus(run: GitHubWorkflowRun): RunStatus {
  if (run.status === "in_progress" || run.status === "queued")
    return "in_progress";
  if (run.conclusion === "success") return "success";
  if (run.conclusion === "failure" || run.conclusion === "timed_out")
    return "failure";
  return "other";
}

interface StatusDotProps {
  status: RunStatus;
}

function StatusDot({ status }: StatusDotProps) {
  if (status === "success")
    return <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />;
  if (status === "failure")
    return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  if (status === "in_progress")
    return (
      <RefreshCw className="w-4 h-4 text-yellow-400 shrink-0 animate-spin" />
    );
  return <Circle className="w-4 h-4 text-gray-400 shrink-0" />;
}

function statusBadgeClasses(status: RunStatus): string {
  if (status === "success")
    return "bg-green-500/10 text-green-400 border-green-500/30";
  if (status === "failure")
    return "bg-red-500/10 text-red-400 border-red-500/30";
  if (status === "in_progress")
    return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  return "bg-gray-500/10 text-gray-400 border-gray-500/30";
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

// ── Workflow Card ──────────────────────────────────────────────────────────

interface WorkflowCardProps {
  wfWithRuns: WorkflowWithRuns;
}

function WorkflowCard({ wfWithRuns }: WorkflowCardProps) {
  const { workflow, runs } = wfWithRuns;
  const latestRun = runs[0] ?? null;
  const latestStatus = latestRun ? getRunStatus(latestRun) : "other";
  const latestConclusion =
    latestRun?.conclusion ?? latestRun?.status ?? "unknown";

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Workflow className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-foreground truncate">
              {workflow.name}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
              {workflow.path}
            </p>
          </div>
        </div>
        {latestRun && (
          <span
            className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${statusBadgeClasses(latestStatus)}`}
          >
            {latestConclusion}
          </span>
        )}
      </div>

      {/* Last run info */}
      {latestRun ? (
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
          <StatusDot status={latestStatus} />
          <span>
            Last run{" "}
            <span className="text-foreground">
              {formatRelativeDate(latestRun.created_at)}
            </span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {latestRun.event}
          </span>
          {latestRun.head_branch && (
            <>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline text-primary/80">
                {latestRun.head_branch}
              </span>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs font-mono text-muted-foreground">
          No runs recorded yet
        </p>
      )}

      {/* Recent runs mini-row */}
      {runs.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-muted-foreground mr-1">
            Recent:
          </span>
          {runs.slice(0, 5).map((run) => {
            const st = getRunStatus(run);
            return (
              <a
                key={run.id}
                href={run.html_url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${run.event} · ${run.conclusion ?? run.status} · ${formatRelativeDate(run.created_at)}`}
                className="block"
              >
                <div
                  className={`w-3 h-3 rounded-full transition-opacity hover:opacity-70 ${
                    st === "success"
                      ? "bg-green-400"
                      : st === "failure"
                        ? "bg-red-400"
                        : st === "in_progress"
                          ? "bg-yellow-400"
                          : "bg-gray-400"
                  }`}
                />
              </a>
            );
          })}
          <span className="text-[10px] font-mono text-muted-foreground ml-1">
            (newest first)
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CICDPage() {
  const { owner, name } = useParams({ from: "/repo/$owner/$name/cicd" });
  const navigate = useNavigate();
  const { data: token } = useGetMyGithubToken();

  const {
    data: workflowsWithRuns,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["cicd", owner, name],
    queryFn: () => fetchWorkflowsWithRuns(owner, name, token),
    staleTime: 5 * 60 * 1000,
  });

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
          <Cpu className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            CI/CD <span className="text-primary">Pipelines</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {owner}/{name} · GitHub Actions workflows & recent runs
        </p>
      </div>

      <RepoNavTabs owner={owner} name={name} />

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-3 w-56" />
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="w-3 h-3 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load workflows."}
            </p>
          </div>
        ) : !workflowsWithRuns || workflowsWithRuns.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
            <Cpu className="w-8 h-8 text-muted-foreground/40" />
            <p className="font-mono text-sm text-muted-foreground">
              No GitHub Actions workflows found.
            </p>
            <p className="text-xs font-mono text-muted-foreground max-w-sm">
              This repository may not use GitHub Actions, or workflows may
              require authentication to view.
            </p>
          </div>
        ) : (
          <>
            <div className="text-xs font-mono text-muted-foreground mb-4">
              <span className="text-primary">{workflowsWithRuns.length}</span>{" "}
              workflow
              {workflowsWithRuns.length !== 1 ? "s" : ""} found
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workflowsWithRuns.map((wfr) => (
                <WorkflowCard key={wfr.workflow.id} wfWithRuns={wfr} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
