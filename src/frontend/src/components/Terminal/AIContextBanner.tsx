import { GitBranch, X } from "lucide-react";
import type { RepoContext } from "../../hooks/useRepoContext";

interface AIContextBannerProps {
  repoContext: RepoContext | null;
  onUnpin: () => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  JavaScript: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Python: "text-green-400 bg-green-400/10 border-green-400/20",
  Rust: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Go: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  Java: "text-red-400 bg-red-400/10 border-red-400/20",
  Ruby: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  "C++": "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export function AIContextBanner({
  repoContext,
  onUnpin,
}: AIContextBannerProps) {
  return (
    <div
      data-ocid="ai_context.banner"
      className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 bg-black/20 min-h-[32px]"
    >
      {repoContext ? (
        <>
          <GitBranch className="w-3 h-3 text-neon-green shrink-0" />
          <span className="flex-1 text-[10px] font-mono text-white/60 truncate">
            {repoContext.fullName}
          </span>
          {repoContext.language && (
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                LANGUAGE_COLORS[repoContext.language] ??
                "text-white/40 bg-white/5 border-white/10"
              }`}
            >
              {repoContext.language}
            </span>
          )}
          <button
            type="button"
            onClick={onUnpin}
            className="shrink-0 p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
            title="Unpin repo context"
          >
            <X className="w-3 h-3" />
          </button>
        </>
      ) : (
        <span className="text-[10px] font-mono text-white/20 truncate">
          No repo context — pin a repo for smarter suggestions
        </span>
      )}
    </div>
  );
}
