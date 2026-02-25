import React from 'react';
import type { TechStackBadge } from '../types/github';

interface TechStackBadgesProps {
  badges: TechStackBadge[];
  size?: 'sm' | 'md';
}

export function TechStackBadges({ badges, size = 'md' }: TechStackBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span
          key={badge.name}
          className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          }`}
          style={{
            borderColor: badge.color + '60',
            backgroundColor: badge.color + '15',
            color: badge.color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: badge.color }}
          />
          {badge.name}
        </span>
      ))}
    </div>
  );
}
