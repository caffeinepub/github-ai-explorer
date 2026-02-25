import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterState {
  query: string;
  language: string;
  topic: string;
  minStars: number;
}

interface SearchFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

const LANGUAGES = [
  'TypeScript', 'JavaScript', 'Python', 'Rust', 'Go', 'Java',
  'C++', 'C', 'Swift', 'Kotlin', 'Ruby', 'PHP', 'Dart',
  'Scala', 'Elixir', 'Haskell', 'Zig', 'Shell', 'HTML',
];

const STAR_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '100+', value: 100 },
  { label: '500+', value: 500 },
  { label: '1k+', value: 1000 },
  { label: '5k+', value: 5000 },
  { label: '10k+', value: 10000 },
  { label: '50k+', value: 50000 },
];

export default function SearchFilters({ filters, onChange, onSearch, isLoading }: SearchFiltersProps) {
  const hasActiveFilters = filters.language || filters.topic || filters.minStars > 0;

  const clearFilters = () => {
    onChange({ query: filters.query, language: '', topic: '', minStars: 0 });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search repositories... (e.g. react hooks, machine learning)"
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-4 font-mono text-sm bg-secondary/50 border-border focus:border-primary focus:ring-primary/20 placeholder:text-muted-foreground/60 h-11"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Language filter */}
        <Select
          value={filters.language || 'all'}
          onValueChange={(val) => onChange({ ...filters, language: val === 'all' ? '' : val })}
        >
          <SelectTrigger className="h-8 w-36 text-xs font-mono bg-secondary/50 border-border focus:border-primary">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all" className="text-xs font-mono">All Languages</SelectItem>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang} className="text-xs font-mono">
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Topic filter */}
        <Input
          type="text"
          placeholder="Topic (e.g. react)"
          value={filters.topic}
          onChange={(e) => onChange({ ...filters, topic: e.target.value })}
          onKeyDown={handleKeyDown}
          className="h-8 w-36 text-xs font-mono bg-secondary/50 border-border focus:border-primary placeholder:text-muted-foreground/60"
        />

        {/* Min stars filter */}
        <Select
          value={String(filters.minStars)}
          onValueChange={(val) => onChange({ ...filters, minStars: Number(val) })}
        >
          <SelectTrigger className="h-8 w-28 text-xs font-mono bg-secondary/50 border-border focus:border-primary">
            <SelectValue placeholder="Min Stars" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {STAR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)} className="text-xs font-mono">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}

        <Button
          onClick={onSearch}
          disabled={isLoading}
          size="sm"
          className="ml-auto h-8 px-4 text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 shadow-neon"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </Button>
      </div>
    </div>
  );
}
