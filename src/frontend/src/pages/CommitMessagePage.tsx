import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  ClipboardCopy,
  GitCommit,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import React, { useState } from "react";
import { toast } from "sonner";

type CommitType =
  | "feat"
  | "fix"
  | "refactor"
  | "chore"
  | "docs"
  | "style"
  | "test"
  | "perf"
  | "ci"
  | "build";

interface ParsedDiff {
  type: CommitType;
  scope: string;
  subject: string;
  body: string[];
  additions: number;
  deletions: number;
  files: string[];
}

function parseGitDiff(diff: string): ParsedDiff {
  const lines = diff.split("\n");
  const files: string[] = [];
  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (line.startsWith("+++ b/") || line.startsWith("--- a/")) {
      const file = line.replace("+++ b/", "").replace("--- a/", "").trim();
      if (file !== "/dev/null" && !files.includes(file)) {
        files.push(file);
      }
    } else if (line.startsWith("+") && !line.startsWith("++")) {
      additions++;
    } else if (line.startsWith("-") && !line.startsWith("--")) {
      deletions++;
    }
  }

  const type = inferCommitType(diff, files);
  const scope = inferScope(files);
  const subject = inferSubject(files, type);
  const body = buildBody(files, additions, deletions);

  return { type, scope, subject, body, additions, deletions, files };
}

function inferCommitType(diff: string, files: string[]): CommitType {
  const allPaths = files.join(" ").toLowerCase();
  const diffLower = diff.toLowerCase();

  if (
    files.some(
      (f) =>
        f.match(/\.(test|spec)\.(ts|tsx|js|jsx|py|rb)$/i) ||
        f.includes("__tests__") ||
        f.includes("/tests/") ||
        f.includes("/test/"),
    )
  )
    return "test";
  if (
    files.some(
      (f) =>
        f.match(/\.(md|mdx|rst|txt)$/i) ||
        f.includes("/docs/") ||
        f.includes("README") ||
        f.includes("CHANGELOG"),
    )
  )
    return "docs";
  if (
    files.some(
      (f) =>
        f.match(/\.(css|scss|sass|less|styled)\.(ts|tsx|js)?$/i) ||
        f.endsWith(".css") ||
        f.endsWith(".scss"),
    )
  )
    return "style";
  if (
    files.some(
      (f) =>
        f.includes(".github/") ||
        f.includes("ci/") ||
        f.includes(".circleci") ||
        f.endsWith(".yml") ||
        f.endsWith(".yaml"),
    )
  )
    return "ci";
  if (
    files.some((f) =>
      f.match(
        /^(package\.json|Cargo\.toml|go\.mod|requirements\.txt|Gemfile|build\.gradle|pom\.xml|Makefile|Dockerfile|docker-compose)/i,
      ),
    )
  )
    return "build";

  if (
    diffLower.includes("fix") ||
    diffLower.includes("bug") ||
    diffLower.includes("error") ||
    diffLower.includes("issue") ||
    diffLower.includes("patch") ||
    diffLower.includes("correct")
  )
    return "fix";
  if (
    diffLower.includes("refactor") ||
    diffLower.includes("rename") ||
    diffLower.includes("reorganize") ||
    diffLower.includes("restructure") ||
    diffLower.includes("cleanup") ||
    diffLower.includes("clean up")
  )
    return "refactor";
  if (
    diffLower.includes("perf") ||
    diffLower.includes("performance") ||
    diffLower.includes("optim") ||
    diffLower.includes("speed") ||
    diffLower.includes("fast")
  )
    return "perf";
  if (
    diffLower.includes("chore") ||
    allPaths.includes("config") ||
    allPaths.includes(".lock") ||
    allPaths.includes(".gitignore")
  )
    return "chore";

  if (files.length > 0) return "feat";
  return "chore";
}

function inferScope(files: string[]): string {
  if (files.length === 0) return "";

  const dirs = files
    .map((f) => {
      const parts = f.split("/");
      if (parts.length > 2) return parts[parts.length - 2];
      if (parts.length === 2) return parts[0];
      return "";
    })
    .filter(Boolean);

  const dirCount: Record<string, number> = {};
  for (const d of dirs) {
    dirCount[d] = (dirCount[d] || 0) + 1;
  }

  const sorted = Object.entries(dirCount).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "";

  const top = sorted[0][0];
  if (top === "src" && sorted[1]) return sorted[1][0];
  return top.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function inferSubject(files: string[], type: CommitType): string {
  if (files.length === 0) return "update code";

  const lastFile = files[files.length - 1];
  const fileName =
    lastFile
      .split("/")
      .pop()
      ?.replace(/\.[^.]+$/, "") || "";
  const humanName = fileName
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim()
    .toLowerCase();

  const typeVerbs: Record<CommitType, string> = {
    feat: "add",
    fix: "fix",
    refactor: "refactor",
    chore: "update",
    docs: "update docs for",
    style: "style",
    test: "add tests for",
    perf: "improve performance of",
    ci: "update CI for",
    build: "update build config for",
  };

  const verb = typeVerbs[type];

  if (files.length === 1) {
    return `${verb} ${humanName}`;
  }
  if (files.length <= 3) {
    return `${verb} ${files
      .map(
        (f) =>
          f
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "") || f,
      )
      .join(", ")}`;
  }
  const ext = files[0].split(".").pop() || "";
  return `${verb} ${files.length} ${ext} files`;
}

function buildBody(files: string[], adds: number, dels: number): string[] {
  const body: string[] = [];
  if (files.length > 0) {
    body.push(
      `Files changed: ${files.slice(0, 5).join(", ")}${
        files.length > 5 ? ` (+${files.length - 5} more)` : ""
      }`,
    );
  }
  if (adds > 0 || dels > 0) {
    body.push(
      `${adds} insertion${adds !== 1 ? "s" : ""}, ${dels} deletion${
        dels !== 1 ? "s" : ""
      }`,
    );
  }
  return body;
}

const TYPE_COLORS: Record<CommitType, string> = {
  feat: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  fix: "bg-red-500/20 text-red-400 border-red-500/30",
  refactor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  chore: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  docs: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  style: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  test: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  perf: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  ci: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  build: "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

export default function CommitMessagePage() {
  const [diff, setDiff] = useState("");
  const [result, setResult] = useState<ParsedDiff | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!diff.trim()) {
      toast.error("Paste a git diff first");
      return;
    }
    const parsed = parseGitDiff(diff);
    setResult(parsed);
  };

  const getCommitMessage = (r: ParsedDiff) => {
    const header = r.scope
      ? `${r.type}(${r.scope}): ${r.subject}`
      : `${r.type}: ${r.subject}`;
    if (r.body.length === 0) return header;
    return `${header}\n\n${r.body.join("\n")}`;
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(getCommitMessage(result));
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setDiff("");
    setResult(null);
    setCopied(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <GitCommit className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                AI Commit Message Generator
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Paste your{" "}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  git diff
                </code>{" "}
                and get a conventional commit message instantly
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {(
              [
                "feat",
                "fix",
                "refactor",
                "chore",
                "docs",
                "style",
                "test",
                "perf",
              ] as CommitType[]
            ).map((t) => (
              <span
                key={t}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${TYPE_COLORS[t]}`}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Input area */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="diff-textarea"
              className="text-sm font-medium text-foreground mb-2 block"
            >
              Git Diff Output
            </label>
            <Textarea
              id="diff-textarea"
              data-ocid="commit.textarea"
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder={`Paste your git diff here...\n\nExample:\ndiff --git a/src/App.tsx b/src/App.tsx\n--- a/src/App.tsx\n+++ b/src/App.tsx\n@@ -1,5 +1,8 @@\n+import { NewFeature } from './components/NewFeature';\n ...`}
              className="font-mono text-xs h-64 resize-y bg-muted/30 border-border/60 focus:border-primary/50 placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              data-ocid="commit.primary_button"
              onClick={generate}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Commit Message
            </Button>
            <Button
              data-ocid="commit.cancel_button"
              variant="outline"
              onClick={handleClear}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <motion.div
            data-ocid="commit.panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Generated Message
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${TYPE_COLORS[result.type]}`}
                >
                  {result.type}
                </span>
                {result.scope && (
                  <Badge variant="outline" className="font-mono text-xs">
                    scope: {result.scope}
                  </Badge>
                )}
              </div>
            </div>

            <div className="relative rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/30">
                <span className="text-xs text-muted-foreground font-mono">
                  conventional commit
                </span>
                <Button
                  data-ocid="commit.secondary_button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 gap-1.5 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="p-4 text-sm font-mono text-foreground whitespace-pre-wrap break-all">
                {getCommitMessage(result)}
              </pre>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-center">
                <div className="text-lg font-bold text-foreground font-mono">
                  {result.files.length}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  files changed
                </div>
              </div>
              <div className="rounded-md border border-border/50 bg-emerald-500/5 p-3 text-center">
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  +{result.additions}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  insertions
                </div>
              </div>
              <div className="rounded-md border border-border/50 bg-red-500/5 p-3 text-center">
                <div className="text-lg font-bold text-red-400 font-mono">
                  -{result.deletions}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  deletions
                </div>
              </div>
            </div>

            {/* Files list */}
            {result.files.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  Detected files:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.files.slice(0, 10).map((f) => (
                    <code
                      key={f}
                      className="text-xs bg-muted/40 border border-border/40 rounded px-2 py-0.5 text-foreground/70"
                    >
                      {f.split("/").pop()}
                    </code>
                  ))}
                  {result.files.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{result.files.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tips */}
        {!result && (
          <div className="mt-8 rounded-lg border border-border/40 bg-muted/10 p-5">
            <p className="text-sm font-medium text-foreground mb-3">
              How to get your git diff
            </p>
            <div className="space-y-2">
              {[
                { cmd: "git diff HEAD", desc: "All unstaged changes" },
                { cmd: "git diff --staged", desc: "Staged changes only" },
                { cmd: "git diff HEAD~1", desc: "Last commit changes" },
                { cmd: "git diff main..feature", desc: "Branch comparison" },
              ].map(({ cmd, desc }) => (
                <div key={cmd} className="flex items-center gap-3">
                  <code className="text-xs font-mono bg-muted/50 border border-border/40 rounded px-2 py-1 text-primary min-w-0">
                    {cmd}
                  </code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
