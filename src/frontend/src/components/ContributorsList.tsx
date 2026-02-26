import React from 'react';
import type { Contributor } from '../types/github';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ExternalLink } from 'lucide-react';

interface ContributorsListProps {
  contributors: Contributor[];
}

export function ContributorsList({ contributors }: ContributorsListProps) {
  if (contributors.length === 0) return null;

  return (
    <div className="space-y-3">
      {contributors.slice(0, 10).map((contributor) => (
        <a
          key={contributor.login}
          href={contributor.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={contributor.avatar_url} alt={contributor.login} />
            <AvatarFallback className="text-xs">{contributor.login.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{contributor.login}</p>
            <p className="text-xs text-muted-foreground">{contributor.contributions.toLocaleString()} commits</p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  );
}
