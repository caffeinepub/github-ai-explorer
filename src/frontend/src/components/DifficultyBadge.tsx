import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DifficultyBadgeProps {
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rationale: string;
}

const DIFFICULTY_CONFIG = {
  Beginner: {
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  Intermediate: {
    className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    dot: 'bg-yellow-400',
  },
  Advanced: {
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
};

export function DifficultyBadge({ difficulty, rationale }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-help ${config.className}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {difficulty}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs">{rationale}</p>
      </TooltipContent>
    </Tooltip>
  );
}
