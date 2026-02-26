import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Star, GitFork, Eye } from 'lucide-react';
import { BookmarkButton } from './BookmarkButton';
import { AIAnalysisPanel } from './AIAnalysisPanel';
import type { Repository } from '../types/github';
import { TooltipProvider } from '@/components/ui/tooltip';

interface RepositoryCardProps {
  repo: Repository;
  rank?: number;
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  Rust: '#ce422b',
  Go: '#00add8',
  Java: '#ed8b00',
  'C++': '#00599c',
  C: '#555555',
  'C#': '#239120',
  Ruby: '#cc342d',
  PHP: '#777bb4',
  Swift: '#fa7343',
  Kotlin: '#7f52ff',
  Dart: '#0175c2',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#42b883',
  Scala: '#dc322f',
  Elixir: '#6e4a7e',
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function RepositoryCard({ repo, rank }: RepositoryCardProps) {
  const navigate = useNavigate();
  const [owner, name] = repo.full_name.split('/');
  const langColor = repo.language ? (LANGUAGE_COLORS[repo.language] || '#6b7280') : null;

  const handleCardClick = () => {
    navigate({ to: '/repo/$owner/$name', params: { owner, name } });
  };

  return (
    <TooltipProvider>
      <div className="card-hover group relative flex flex-col gap-3 p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-200">
        {rank && (
          <span className="absolute top-3 right-3 text-xs font-mono text-muted-foreground/50">
            #{rank}
          </span>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <button
              onClick={handleCardClick}
              className="font-mono font-semibold text-sm text-primary hover:underline truncate block text-left w-full"
            >
              {repo.full_name}
            </button>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              by {repo.owner.login}
            </p>
          </div>
          <BookmarkButton repoId={repo.full_name} />
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {repo.description}
          </p>
        )}

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {repo.topics.slice(0, 4).map((topic) => (
              <span
                key={topic}
                className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {topic}
              </span>
            ))}
            {repo.topics.length > 4 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{repo.topics.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {langColor && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: langColor }} />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5" />
            {formatCount(repo.stargazers_count)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5" />
            {formatCount(repo.forks_count)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatCount(repo.watchers_count)}
          </span>
        </div>

        {/* AI Analysis */}
        <AIAnalysisPanel repo={repo} />
      </div>
    </TooltipProvider>
  );
}

export default RepositoryCard;
