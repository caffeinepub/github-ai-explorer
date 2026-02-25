import React, { useEffect, useState } from 'react';
import { Bookmark, LogIn, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { BookmarkCard } from '../components/BookmarkCard';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { TagFilter } from '../components/TagFilter';
import { useBookmarks } from '../hooks/useBookmarks';
import { useRemoveBookmark } from '../hooks/useQueries';
import { getRepositoryByFullName } from '../services/githubApi';
import type { Repository } from '../types/github';
import type { BookmarkEntry } from '../backend';

interface RepoState {
  bookmark: BookmarkEntry;
  repo: Repository | null;
  error: boolean;
}

function BookmarkCardSkeleton() {
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
      <div className="flex gap-3">
        <Skeleton className="h-5 w-20 bg-secondary" />
        <Skeleton className="h-5 w-14 bg-secondary" />
      </div>
    </div>
  );
}

export default function BookmarksPage() {
  const { bookmarks, isLoading: bookmarksLoading, isAuthenticated } = useBookmarks();
  const removeMutation = useRemoveBookmark();
  const [repoStates, setRepoStates] = useState<RepoState[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated || bookmarksLoading) return;
    if (bookmarks.length === 0) {
      setRepoStates([]);
      return;
    }

    setFetchingRepos(true);
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        bookmarks.map((b) => getRepositoryByFullName(b.repoId))
      );
      const states: RepoState[] = results.map((result, i) => ({
        bookmark: bookmarks[i],
        repo: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected',
      }));
      setRepoStates(states);
      setFetchingRepos(false);
    };

    fetchAll();
  }, [bookmarks, bookmarksLoading, isAuthenticated]);

  const isLoading = bookmarksLoading || fetchingRepos;

  // Collect all unique tags
  const allTags = Array.from(
    new Set(bookmarks.flatMap((b) => b.tags))
  );

  // Filter by selected tags
  const filteredStates = selectedTags.length === 0
    ? repoStates
    : repoStates.filter(({ bookmark }) =>
        selectedTags.every((tag) => bookmark.tags.includes(tag))
      );

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Bookmark className="w-5 h-5 text-primary" />
            <h1 className="font-mono font-bold text-xl text-foreground">
              My <span className="text-primary">Bookmarks</span>
            </h1>
          </div>
        </div>
        <EmptyState
          icon={LogIn}
          title="Login required"
          description="You need to be logged in to view and manage your bookmarked repositories."
          action={
            <Link to="/search">
              <Button size="sm" className="font-mono">
                <LogIn className="w-3.5 h-3.5 mr-2" />
                Go to Search
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bookmark className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            My <span className="text-primary">Bookmarks</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Your saved repositories, ready to revisit.
        </p>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <TagFilter
            allTags={allTags}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            onClearAll={() => setSelectedTags([])}
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-4 flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading bookmarks...
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <BookmarkCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : repoStates.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Start exploring repositories and bookmark the ones you find interesting."
          action={
            <Link to="/search">
              <Button size="sm" className="font-mono">
                Explore Repositories
              </Button>
            </Link>
          }
        />
      ) : (
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-4">
            <span className="text-primary">{filteredStates.length}</span> of{' '}
            <span className="text-primary">{repoStates.length}</span> bookmarked repositories
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStates.map(({ bookmark, repo, error }) => {
              if (error || !repo) {
                return (
                  <div key={bookmark.repoId} className="bg-card border border-border/50 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm text-foreground/70">{bookmark.repoId}</p>
                        <p className="text-xs text-destructive mt-1">Repository unavailable or deleted</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={removeMutation.isPending}
                        onClick={() => removeMutation.mutate(bookmark.repoId)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              }
              return <BookmarkCard key={bookmark.repoId} repo={repo} bookmark={bookmark} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
