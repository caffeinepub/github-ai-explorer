import React from 'react';
import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TagFilterProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClearAll: () => void;
}

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
  'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
  'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25',
  'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25',
  'bg-pink-500/15 text-pink-400 border-pink-500/30 hover:bg-pink-500/25',
  'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/25',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagFilter({ allTags, selectedTags, onToggleTag, onClearAll }: TagFilterProps) {
  if (allTags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Tag className="w-3.5 h-3.5" />
        <span>Filter by tag:</span>
      </div>
      {allTags.map((tag) => {
        const isSelected = selectedTags.includes(tag);
        const colorClass = getTagColor(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${colorClass} ${
              isSelected ? 'ring-1 ring-current' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Tag className="w-2.5 h-2.5" />
            {tag}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="w-3 h-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
