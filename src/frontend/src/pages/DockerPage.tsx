import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Container,
  Copy,
  Download,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";
import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { useGetMyGithubToken } from "../hooks/useQueries";
import {
  type DockerLayer,
  analyzeDockerLayers,
  generateDockerCompose,
  generateDockerfile,
} from "../services/dockerGenerator";
import {
  getRepositoryByFullName,
  getRepositoryFileTree,
} from "../services/githubApi";

type ActiveTab = "dockerfile" | "compose";

const LAYER_SIZE_COLORS: Record<string, string> = {
  FROM: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  RUN: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  COPY: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  ADD: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  ENV: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  WORKDIR: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  USER: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  EXPOSE: "bg-green-500/15 text-green-400 border-green-500/30",
  CMD: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  ENTRYPOINT: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  ARG: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  LABEL: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function getLayerColor(instruction: string): string {
  return (
    LAYER_SIZE_COLORS[instruction] ??
    "bg-muted/50 text-muted-foreground border-border"
  );
}

function isCacheBuster(layer: string): boolean {
  return ["FROM", "RUN", "COPY", "ADD"].includes(layer);
}

export default function DockerPage() {
  const { owner, name } = useParams({ from: "/repo/$owner/$name/docker" });
  const navigate = useNavigate();
  const { data: token } = useGetMyGithubToken();

  const fullName = `${owner}/${name}`;

  const { data: repo, isLoading: repoLoading } = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => getRepositoryByFullName(fullName, token),
    staleTime: 5 * 60 * 1000,
  });

  const { data: fileTree } = useQuery({
    queryKey: ["filetree", fullName],
    queryFn: () =>
      getRepositoryFileTree(owner, name, repo?.default_branch || "HEAD", token),
    enabled: !!repo,
    staleTime: 10 * 60 * 1000,
  });

  const filePaths = fileTree?.tree.map((f) => f.path) || [];
  const language = repo?.language ?? null;
  const topics = repo?.topics ?? [];

  const [activeTab, setActiveTab] = useState<ActiveTab>("dockerfile");
  const [dockerfileContent, setDockerfileContent] = useState<string>("");
  const [composeContent, setComposeContent] = useState<string>("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Generate on repo load
  React.useEffect(() => {
    if (repo && !isGenerated) {
      const df = generateDockerfile(fullName, language, topics, filePaths);
      const dc = generateDockerCompose(fullName, language, topics, filePaths);
      setDockerfileContent(df);
      setComposeContent(dc);
      setIsGenerated(true);
    }
  }, [repo, isGenerated, fullName, language, topics, filePaths]);

  const handleRegenerate = useCallback(() => {
    const df = generateDockerfile(fullName, language, topics, filePaths);
    const dc = generateDockerCompose(fullName, language, topics, filePaths);
    setDockerfileContent(df);
    setComposeContent(dc);
    toast.success("Files regenerated from latest repo data");
  }, [fullName, language, topics, filePaths]);

  const handleCopy = useCallback(() => {
    const content =
      activeTab === "dockerfile" ? dockerfileContent : composeContent;
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Copied to clipboard");
    });
  }, [activeTab, dockerfileContent, composeContent]);

  const handleDownload = useCallback(() => {
    const filename =
      activeTab === "dockerfile" ? "Dockerfile" : "docker-compose.yml";
    const content =
      activeTab === "dockerfile" ? dockerfileContent : composeContent;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded`);
  }, [activeTab, dockerfileContent, composeContent]);

  const handleCommitToFork = useCallback(async () => {
    if (!token) {
      toast.error("GitHub token required. Add it in Settings.");
      return;
    }
    const filename =
      activeTab === "dockerfile" ? "Dockerfile" : "docker-compose.yml";
    const content =
      activeTab === "dockerfile" ? dockerfileContent : composeContent;
    setIsCommitting(true);
    try {
      // Check if file already exists (to get SHA for update)
      let sha: string | undefined;
      const checkRes = await fetch(
        `https://api.github.com/repos/${owner}/${name}/contents/${filename}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );
      if (checkRes.ok) {
        const existing = await checkRes.json();
        sha = existing.sha;
      }

      const body: Record<string, string> = {
        message: `chore: add ${filename} via GitHub AI Explorer`,
        content: btoa(unescape(encodeURIComponent(content))),
      };
      if (sha) body.sha = sha;

      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${name}/contents/${filename}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!commitRes.ok) {
        const err = await commitRes.json();
        throw new Error(err.message || "Commit failed");
      }

      toast.success(`${filename} committed to ${owner}/${name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to commit file");
    } finally {
      setIsCommitting(false);
    }
  }, [activeTab, dockerfileContent, composeContent, token, owner, name]);

  const layers: DockerLayer[] = analyzeDockerLayers(dockerfileContent);

  if (repoLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: `/repo/${owner}/${name}` })}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground font-mono text-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {owner}/{name}
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <Container className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-mono font-bold text-xl text-foreground">
              Docker <span className="text-primary">Integration</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            {owner}/{name} · AI-generated container configuration
          </p>
          {repo?.language && (
            <Badge variant="outline" className="mt-2 font-mono text-xs">
              {repo.language}
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            className="gap-2 font-mono text-xs"
            data-ocid="docker.regenerate_button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2 font-mono text-xs"
            data-ocid="docker.copy_button"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2 font-mono text-xs"
            data-ocid="docker.download_button"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
          <Button
            size="sm"
            onClick={handleCommitToFork}
            disabled={isCommitting || !token}
            className="gap-2 font-mono text-xs"
            data-ocid="docker.commit_button"
          >
            {isCommitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {isCommitting ? "Committing..." : "Commit to Repo"}
          </Button>
        </div>
      </div>

      {!token && (
        <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-xs font-mono">
            Add a GitHub token in{" "}
            <Link
              to="/settings"
              className="underline underline-offset-2 hover:text-amber-300"
            >
              Settings
            </Link>{" "}
            to enable committing files to repos.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border mb-0">
        <button
          type="button"
          onClick={() => setActiveTab("dockerfile")}
          data-ocid="docker.dockerfile_tab"
          className={`inline-flex items-center gap-1.5 px-4 py-2 font-mono text-xs border-b-2 transition-colors ${
            activeTab === "dockerfile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Dockerfile
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("compose")}
          data-ocid="docker.compose_tab"
          className={`inline-flex items-center gap-1.5 px-4 py-2 font-mono text-xs border-b-2 transition-colors ${
            activeTab === "compose"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          docker-compose.yml
        </button>
      </div>

      {/* Code editor */}
      <div className="relative rounded-b-xl rounded-tr-xl border border-t-0 border-border bg-[#0d1117] overflow-hidden mb-6">
        {/* Editor header bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-[#161b22]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            {activeTab === "dockerfile" ? "Dockerfile" : "docker-compose.yml"}
          </span>
          {isGenerated && (
            <div className="ml-auto flex items-center gap-1 text-emerald-400/70">
              <CheckCircle2 className="w-3 h-3" />
              <span className="text-[10px] font-mono">AI-generated</span>
            </div>
          )}
        </div>

        <textarea
          data-ocid="docker.editor"
          value={
            activeTab === "dockerfile" ? dockerfileContent : composeContent
          }
          onChange={(e) =>
            activeTab === "dockerfile"
              ? setDockerfileContent(e.target.value)
              : setComposeContent(e.target.value)
          }
          spellCheck={false}
          className={[
            "w-full min-h-[520px] resize-y",
            "font-mono text-sm leading-relaxed",
            "bg-[#0d1117] text-[#e6edf3]",
            "p-5",
            "outline-none focus:outline-none",
            "border-none",
            "placeholder-white/20",
            "scrollbar-thin",
          ].join(" ")}
          style={{
            fontFamily: '"JetBrains Mono", "Geist Mono", monospace',
            tabSize: 2,
          }}
        />
      </div>

      {/* Layer analysis — Dockerfile tab only */}
      {activeTab === "dockerfile" && layers.length > 0 && (
        <div
          data-ocid="docker.layer_analysis.panel"
          className="rounded-xl border border-border bg-card/50 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-card/80">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="font-mono text-sm font-semibold text-foreground">
              Layer Analysis
            </h2>
            <Badge variant="outline" className="ml-auto font-mono text-xs">
              {layers.length} layers
            </Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-mono text-xs text-muted-foreground w-10">
                  #
                </TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground w-28">
                  Instruction
                </TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground w-32">
                  Est. Size
                </TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground">
                  Description
                </TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground w-24 text-right">
                  Cache
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {layers.map((layer, idx) => (
                <TableRow
                  key={`${layer.layer}-${idx}`}
                  data-ocid={`docker.layer_analysis.item.${idx + 1}`}
                  className="border-border/30 hover:bg-muted/20"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getLayerColor(
                        layer.layer,
                      )}`}
                    >
                      {layer.layer}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                    {layer.size}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground/80 py-2.5">
                    {layer.description}
                  </TableCell>
                  <TableCell className="text-right py-2.5">
                    {isCacheBuster(layer.layer) ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-amber-500/30 text-amber-400/70"
                      >
                        cacheable
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono border-border text-muted-foreground/50"
                      >
                        metadata
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="px-5 py-3 border-t border-border/30 bg-card/40">
            <p className="text-[11px] font-mono text-muted-foreground">
              💡 Layer sizes are estimates. Cacheable layers are invalidated
              when content changes. Order frequently-changing instructions last
              to maximize cache hits.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
