import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  FileCode,
  GitFork,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface GistFile {
  filename: string;
  language: string | null;
  raw_url: string;
  size: number;
  type: string;
  content?: string;
}

interface GistOwner {
  login: string;
  avatar_url: string;
}

interface Gist {
  id: string;
  description: string | null;
  owner: GistOwner;
  files: Record<string, GistFile>;
  created_at: string;
  updated_at: string;
  public: boolean;
  forks_url?: string;
  git_pull_url: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GistCard({
  gist,
  onSave,
}: { gist: Gist; onSave: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [forking, setForking] = useState(false);

  const files = Object.values(gist.files);
  const mainFile = files[0];
  const description = gist.description || mainFile?.filename || "Untitled Gist";

  const loadFileContent = async (file: GistFile) => {
    if (fileContents[file.filename]) return;
    setLoadingFile(file.filename);
    try {
      const res = await fetch(file.raw_url);
      const text = await res.text();
      setFileContents((prev) => ({ ...prev, [file.filename]: text }));
    } catch {
      toast.error("Failed to load file content");
    } finally {
      setLoadingFile(null);
    }
  };

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && mainFile) {
      await loadFileContent(mainFile);
    }
  };

  const handleFork = async () => {
    const pat = localStorage.getItem("github_pat");
    if (!pat) {
      toast.error("GitHub PAT required to fork. Add it in Settings.");
      return;
    }
    setForking(true);
    try {
      const res = await fetch(`https://api.github.com/gists/${gist.id}/forks`, {
        method: "POST",
        headers: {
          Authorization: `token ${pat}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (res.ok) {
        toast.success("Gist forked successfully!");
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to fork gist");
      }
    } catch {
      toast.error("Network error while forking");
    } finally {
      setForking(false);
    }
  };

  return (
    <div
      data-ocid="gist.item.1"
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarImage src={gist.owner.avatar_url} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {gist.owner.login[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {description}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {gist.owner.login} · {formatDate(gist.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onSave(gist.id)}
              data-ocid="gist.save_button"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleFork}
              disabled={forking}
              data-ocid="gist.fork_button"
            >
              <GitFork className="w-3.5 h-3.5 mr-1" />
              {forking ? "..." : "Fork"}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {files.slice(0, 5).map((f) => (
            <Badge
              key={f.filename}
              variant="secondary"
              className="text-[10px] font-mono px-1.5 py-0 gap-1"
            >
              <FileCode className="w-2.5 h-2.5" />
              {f.filename}
              {f.language && (
                <span className="text-primary/70">·{f.language}</span>
              )}
            </Badge>
          ))}
          {files.length > 5 && (
            <Badge variant="outline" className="text-[10px] font-mono">
              +{files.length - 5} more
            </Badge>
          )}
        </div>
      </div>

      <div className="border-t border-border/50">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          onClick={handleExpand}
          data-ocid="gist.toggle"
        >
          <span>View file contents</span>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {expanded && (
          <div className="border-t border-border/50">
            {files.map((file) => (
              <div
                key={file.filename}
                className="border-b border-border/30 last:border-0"
              >
                <button
                  type="button"
                  className="w-full px-4 py-2 flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                  onClick={() => loadFileContent(file)}
                >
                  <FileCode className="w-3 h-3" />
                  {file.filename}
                  <span className="ml-auto text-muted-foreground/50">
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                </button>
                {(fileContents[file.filename] ||
                  loadingFile === file.filename) && (
                  <div className="px-0">
                    {loadingFile === file.filename ? (
                      <div className="px-4 py-3">
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-3 w-4/5 mb-1" />
                        <Skeleton className="h-3 w-3/5" />
                      </div>
                    ) : (
                      <ScrollArea className="h-40">
                        <pre className="px-4 py-3 text-[11px] font-mono text-foreground/80 bg-black/20 overflow-x-auto whitespace-pre">
                          {fileContents[file.filename]}
                        </pre>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GistExplorerPage() {
  const [tab, setTab] = useState("trending");
  const [trendingGists, setTrendingGists] = useState<Gist[]>([]);
  const [searchGists, setSearchGists] = useState<Gist[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [savedGistIds, setSavedGistIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("saved_gists") || "[]");
    } catch {
      return [];
    }
  });

  const fetchTrending = useCallback(async () => {
    setLoadingTrending(true);
    try {
      const res = await fetch(
        "https://api.github.com/gists/public?per_page=30",
      );
      const data = await res.json();
      setTrendingGists(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load public gists");
    } finally {
      setLoadingTrending(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    try {
      // Search gists by description using public endpoint with filtering
      const res = await fetch(
        "https://api.github.com/gists/public?per_page=100",
      );
      const data = await res.json();
      const filtered = (Array.isArray(data) ? data : []).filter((g: Gist) => {
        const q = searchQuery.toLowerCase();
        const desc = (g.description || "").toLowerCase();
        const fileNames = Object.keys(g.files).join(" ").toLowerCase();
        return desc.includes(q) || fileNames.includes(q);
      });
      setSearchGists(filtered);
    } catch {
      toast.error("Search failed");
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSave = (id: string) => {
    const updated = savedGistIds.includes(id)
      ? savedGistIds.filter((s) => s !== id)
      : [...savedGistIds, id];
    setSavedGistIds(updated);
    localStorage.setItem("saved_gists", JSON.stringify(updated));
    toast.success(
      savedGistIds.includes(id)
        ? "Gist removed from bookmarks"
        : "Gist saved to bookmarks",
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileCode className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Gist <span className="text-primary">Explorer</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          Browse public GitHub gists, view file contents, and fork to your
          account.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger
            value="trending"
            data-ocid="gist.trending.tab"
            className="gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Trending
          </TabsTrigger>
          <TabsTrigger
            value="search"
            data-ocid="gist.search.tab"
            className="gap-1.5"
          >
            <Search className="w-3.5 h-3.5" /> Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trending">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-mono text-muted-foreground">
              <span className="text-primary">{trendingGists.length}</span>{" "}
              public gists loaded
            </p>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={fetchTrending}
              disabled={loadingTrending}
              data-ocid="gist.refresh.button"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${loadingTrending ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {loadingTrending ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              data-ocid="gist.loading_state"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="bg-card border border-border rounded-xl p-4 space-y-3"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : trendingGists.length === 0 ? (
            <div className="text-center py-16" data-ocid="gist.empty_state">
              <FileCode className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-sm">
                No gists found
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trendingGists.map((gist) => (
                <GistCard key={gist.id} gist={gist} onSave={handleSave} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Search gists by description or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono text-sm"
              data-ocid="gist.search_input"
            />
            <Button
              onClick={handleSearch}
              disabled={loadingSearch}
              data-ocid="gist.search.button"
            >
              {loadingSearch ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {loadingSearch ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              data-ocid="gist.search.loading_state"
            >
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-card border border-border rounded-xl p-4 space-y-3"
                >
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : searchGists.length === 0 && searchQuery ? (
            <div
              className="text-center py-16"
              data-ocid="gist.search.empty_state"
            >
              <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-mono text-sm">
                No gists found for &quot;{searchQuery}&quot;
              </p>
            </div>
          ) : searchGists.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
              Enter a keyword to search gists
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchGists.map((gist) => (
                <GistCard key={gist.id} gist={gist} onSave={handleSave} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
