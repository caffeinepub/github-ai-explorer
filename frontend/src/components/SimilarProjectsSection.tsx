import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { fetchSimilarProjects } from '../services/githubApi';
import type { Repository } from '../types/github';
import { Star, GitFork } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SimilarProjectsSectionProps {
  currentRepo: Repository;
  token?: string | null;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function SimilarProjectsSection({ currentRepo, token }: SimilarProjectsSectionProps) {
  const navigate = useNavigate();

  const { data: similar = [], isLoading } = useQuery({
    queryKey: ['similar', currentRepo.language, currentRepo.topics[0]],
    queryFn: () => fetchSimilarProjects(currentRepo.language, currentRepo.topics, token),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = similar.filter((r) => r.full_name !== currentRepo.full_name).slice(0, 5);

  const handleClick = (repo: Repository) => {
    const [owner, name] = repo.full_name.split('/');
    navigate({ to: '/repo/$owner/$name', params: { owner, name } });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <p className="text-sm text-muted-foreground">No similar projects found.</p>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((repo) => (
        <button
          key={repo.id}
          onClick={() => handleClick(repo)}
          className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-muted/30 transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-mono font-medium text-primary truncate group-hover:underline">
                {repo.full_name}
              </p>
              {repo.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {formatCount(repo.stargazers_count)}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="w-3 h-3" />
                {formatCount(repo.forks_count)}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
