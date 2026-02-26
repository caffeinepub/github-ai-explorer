import React, { useEffect, useState } from 'react';
import { TrendingUp, Flame, RefreshCw } from 'lucide-react';
import { RepositoryCard } from '../components/RepositoryCard';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { getTrendingRepositories } from '../services/githubApi';
import { TimeRangeSelector } from '../components/TimeRangeSelector';
import type { Repository } from '../types/github';
import { Button } from '@/components/ui/button';

type TimeRange = 'day' | 'week' | 'month';

function CardSkeleton({ rank }: { rank: number }) {
  return (
    <div className="relative bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="absolute top-3 right-3 text-xs font-mono text-muted-foreground/40">#{rank}</div>
      <div className="flex justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-48 bg-secondary" />
          <Skeleton className="h-3 w-24 bg-secondary" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md bg-secondary" />
      </div>
      <Skeleton className="h-3 w-full bg-secondary" />
      <Skeleton className="h-3 w-3/4 bg-secondary" />
      <div className="flex gap-3">
        <Skeleton className="h-5 w-20 bg-secondary" />
        <Skeleton className="h-5 w-14 bg-secondary" />
      </div>
    </div>
  );
}

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
};

export default function TrendingPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const fetchTrending = async (range: TimeRange = timeRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getTrendingRepositories(range);
      setRepos(items);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trending repositories.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending(timeRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-5 h-5 text-primary" />
            <h1 className="font-mono font-bold text-xl text-foreground">
              Trending <span className="text-primary">{TIME_RANGE_LABELS[timeRange]}</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            Top repositories ranked by stars.
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground/60 font-mono mt-1">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
          <Button
            onClick={() => fetchTrending(timeRange)}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="font-mono text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-6 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Scanning trending repositories...
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <CardSkeleton key={i} rank={i + 1} />
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchTrending(timeRange)} />
      ) : (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-6">
            <span className="text-primary">{repos.length}</span> trending repositories {TIME_RANGE_LABELS[timeRange].toLowerCase()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((repo, index) => (
              <RepositoryCard key={repo.id} repo={repo} rank={index + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
