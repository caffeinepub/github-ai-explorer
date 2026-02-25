import React, { useState, useCallback, useRef } from 'react';
import { Search, Telescope } from 'lucide-react';
import SearchFilters, { FilterState } from '../components/SearchFilters';
import { RepositoryCard } from '../components/RepositoryCard';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { searchRepositories } from '../services/githubApi';
import type { Repository } from '../types/github';

const DEFAULT_FILTERS: FilterState = {
  query: '',
  language: '',
  topic: '',
  minStars: 0,
};

function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-48 bg-secondary" />
          <Skeleton className="h-3 w-24 bg-secondary" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md bg-secondary" />
      </div>
      <Skeleton className="h-3 w-full bg-secondary" />
      <Skeleton className="h-3 w-3/4 bg-secondary" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full bg-secondary" />
        <Skeleton className="h-5 w-12 rounded-full bg-secondary" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-5 w-20 bg-secondary" />
        <Skeleton className="h-5 w-14 bg-secondary" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (f: FilterState) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const result = await searchRepositories({
        query: f.query,
        language: f.language || undefined,
        topic: f.topic || undefined,
        minStars: f.minStars || undefined,
      });
      setRepos(result.items);
      setTotalCount(result.total_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search repositories.');
      setRepos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(filters);
  }, [filters, doSearch]);

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Search className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Search <span className="text-primary">Repositories</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          Discover GitHub projects by keyword, language, topic, or popularity.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 p-4 bg-card border border-border rounded-xl">
        <SearchFilters
          filters={filters}
          onChange={handleFiltersChange}
          onSearch={handleSearch}
          isLoading={isLoading}
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-4 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Scanning repositories...
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={handleSearch} />
      ) : !hasSearched ? (
        <EmptyState
          icon={Telescope}
          title="Ready to explore"
          description="Enter a search query or apply filters to discover interesting GitHub repositories."
          action={
            <button
              onClick={() => {
                const newFilters = { query: 'awesome', language: '', topic: '', minStars: 1000 };
                setFilters(newFilters);
                setTimeout(() => doSearch(newFilters), 0);
              }}
              className="text-xs font-mono text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
            >
              Try: search "awesome" with 1k+ stars
            </button>
          }
        />
      ) : repos.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No repositories found"
          description="Try adjusting your search query or filters to find more results."
        />
      ) : (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-4">
            <span className="text-primary">{totalCount.toLocaleString()}</span> repositories found
            {repos.length < totalCount && ` · showing top ${repos.length}`}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {repos.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
