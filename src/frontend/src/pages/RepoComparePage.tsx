import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowLeftRight,
  ExternalLink,
  GitFork,
  Loader2,
  Scale,
  Star,
  Trophy,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { toast } from "sonner";

interface RepoData {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  language: string | null;
  license: { spdx_id: string } | null;
  watchers_count: number;
  size: number;
  html_url: string;
  owner: { login: string; avatar_url: string };
}

function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const slashMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
  return null;
}

async function fetchRepo(owner: string, repo: string): Promise<RepoData> {
  const pat = localStorage.getItem("github_pat");
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (pat) headers.Authorization = `token ${pat}`;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });
  if (!res.ok) throw new Error(`${res.status}: ${owner}/${repo} not found`);
  return res.json();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type MetricKey = keyof RepoData;

interface CompareRow {
  label: string;
  key: MetricKey;
  format?: (val: any) => string;
  higherIsBetter?: boolean;
}

const COMPARE_ROWS: CompareRow[] = [
  { label: "Stars", key: "stargazers_count", higherIsBetter: true },
  { label: "Forks", key: "forks_count", higherIsBetter: true },
  { label: "Open Issues", key: "open_issues_count", higherIsBetter: false },
  { label: "Watchers", key: "watchers_count", higherIsBetter: true },
  { label: "Size", key: "size", format: formatSize, higherIsBetter: false },
  { label: "Last Updated", key: "updated_at", format: formatDate },
  { label: "Language", key: "language", format: (v) => v || "N/A" },
  { label: "License", key: "license", format: (v) => v?.spdx_id || "None" },
];

export default function RepoComparePage() {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");
  const [repo1, setRepo1] = useState<RepoData | null>(null);
  const [repo2, setRepo2] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    const p1 = parseRepoInput(input1);
    const p2 = parseRepoInput(input2);

    if (!p1) {
      toast.error("Invalid format for Repo 1. Use owner/repo or a GitHub URL.");
      return;
    }
    if (!p2) {
      toast.error("Invalid format for Repo 2. Use owner/repo or a GitHub URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setRepo1(null);
    setRepo2(null);

    try {
      const [r1, r2] = await Promise.all([
        fetchRepo(p1.owner, p1.repo),
        fetchRepo(p2.owner, p2.repo),
      ]);
      setRepo1(r1);
      setRepo2(r2);
    } catch (err: any) {
      setError(err.message || "Failed to fetch repo data");
    } finally {
      setLoading(false);
    }
  };

  const getWinner = (row: CompareRow): 1 | 2 | null => {
    if (!repo1 || !repo2) return null;
    if (row.key === "updated_at") {
      const d1 = new Date(repo1.updated_at).getTime();
      const d2 = new Date(repo2.updated_at).getTime();
      if (d1 > d2) return 1;
      if (d2 > d1) return 2;
      return null;
    }
    if (row.key === "language" || row.key === "license") return null;
    const v1 = repo1[row.key] as number;
    const v2 = repo2[row.key] as number;
    if (v1 === v2) return null;
    if (row.higherIsBetter !== false) return v1 > v2 ? 1 : 2;
    return v1 < v2 ? 1 : 2;
  };

  const overallWinner = (): 1 | 2 | null => {
    if (!repo1 || !repo2) return null;
    let score1 = 0;
    let score2 = 0;
    for (const row of COMPARE_ROWS) {
      const w = getWinner(row);
      if (w === 1) score1++;
      else if (w === 2) score2++;
    }
    if (score1 > score2) return 1;
    if (score2 > score1) return 2;
    return null;
  };

  const winner = overallWinner();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Scale className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Repo Comparison Tool
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Side-by-side analysis of any two GitHub repositories
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="repo-input-1"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              Repository 1
            </label>
            <Input
              id="repo-input-1"
              data-ocid="compare.input.1"
              value={input1}
              onChange={(e) => setInput1(e.target.value)}
              placeholder="owner/repo or github.com/owner/repo"
              className="font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCompare()}
            />
          </div>
          <div>
            <label
              htmlFor="repo-input-2"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block"
            >
              Repository 2
            </label>
            <Input
              id="repo-input-2"
              data-ocid="compare.input.2"
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder="owner/repo or github.com/owner/repo"
              className="font-mono text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleCompare()}
            />
          </div>
        </div>

        <Button
          data-ocid="compare.primary_button"
          onClick={handleCompare}
          disabled={loading || !input1.trim() || !input2.trim()}
          className="gap-2 mb-8"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching repos...
            </>
          ) : (
            <>
              <ArrowLeftRight className="w-4 h-4" /> Compare Repos
            </>
          )}
        </Button>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              data-ocid="compare.loading_state"
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Fetching repo data from GitHub API...
              </p>
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              data-ocid="compare.error_state"
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
            >
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Failed to fetch repositories
                </p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make sure the repos exist and are public, or add a GitHub PAT
                  in Settings for private repos.
                </p>
              </div>
            </motion.div>
          )}

          {repo1 && repo2 && !loading && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div />
                {[repo1, repo2].map((repo, i) => (
                  <div
                    key={repo.full_name}
                    className={`rounded-lg border p-4 ${
                      winner === i + 1
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-muted/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="w-6 h-6 rounded-full"
                      />
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate flex items-center gap-1"
                      >
                        {repo.full_name}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                    {repo.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    {winner === i + 1 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">
                          Overall Winner
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="rounded-lg border border-border/60 overflow-hidden"
                data-ocid="compare.table"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="w-[140px] font-semibold text-foreground">
                        Metric
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        <span className="text-primary">①</span>{" "}
                        {repo1.full_name.split("/")[1]}
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        <span className="text-primary">②</span>{" "}
                        {repo2.full_name.split("/")[1]}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMPARE_ROWS.map((row, idx) => {
                      const w = getWinner(row);
                      const v1 = row.format
                        ? row.format(repo1[row.key])
                        : String(repo1[row.key] ?? "N/A");
                      const v2 = row.format
                        ? row.format(repo2[row.key])
                        : String(repo2[row.key] ?? "N/A");
                      return (
                        <TableRow
                          key={row.key}
                          className={idx % 2 === 0 ? "bg-muted/5" : ""}
                        >
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {row.label}
                          </TableCell>
                          <TableCell
                            className={`font-mono text-sm font-medium ${
                              w === 1
                                ? "text-emerald-400"
                                : "text-foreground/80"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {w === 1 && (
                                <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              )}
                              {v1}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`font-mono text-sm font-medium ${
                              w === 2
                                ? "text-emerald-400"
                                : "text-foreground/80"
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              {w === 2 && (
                                <Star className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                              )}
                              {v2}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {[repo1, repo2].map((repo, i) => {
                  const score = COMPARE_ROWS.filter(
                    (r) => getWinner(r) === i + 1,
                  ).length;
                  return (
                    <div
                      key={repo.full_name}
                      className={`rounded-lg border p-3 flex items-center gap-3 ${
                        winner === i + 1
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/50 bg-muted/10"
                      }`}
                    >
                      {winner === i + 1 ? (
                        <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                      ) : (
                        <GitFork className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {repo.full_name.split("/")[1]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Won {score} of{" "}
                          {
                            COMPARE_ROWS.filter((r) => getWinner(r) !== null)
                              .length
                          }{" "}
                          metrics
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`ml-auto font-mono ${
                          winner === i + 1
                            ? "border-primary/40 text-primary"
                            : ""
                        }`}
                      >
                        {score} pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
