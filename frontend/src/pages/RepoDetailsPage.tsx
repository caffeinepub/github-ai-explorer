import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, GitFork, Eye, ExternalLink, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookmarkButton } from '../components/BookmarkButton';
import { ForkButton } from '../components/ForkButton';
import { AISetupAssistant } from '../components/AISetupAssistant';
import { ContributorsList } from '../components/ContributorsList';
import { TechStackBadges } from '../components/TechStackBadges';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { AIAnalysisPanel } from '../components/AIAnalysisPanel';
import { getRepositoryByFullName, getRepositoryReadme, getRepositoryContributors, getRepositoryFileTree } from '../services/githubApi';
import { detectTechStack } from '../utils/techStackDetector';
import { useGetMyGithubToken } from '../hooks/useQueries';
import type { ForkResult } from '../types/github';
import { TooltipProvider } from '@/components/ui/tooltip';

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function RepoDetailsPage() {
  const { owner, name } = useParams({ from: '/repo/$owner/$name' });
  const navigate = useNavigate();
  const { data: token } = useGetMyGithubToken();
  const [forkedRepo, setForkedRepo] = useState<ForkResult | null>(null);

  const fullName = `${owner}/${name}`;

  const { data: repo, isLoading: repoLoading, error: repoError } = useQuery({
    queryKey: ['repo', fullName],
    queryFn: () => getRepositoryByFullName(fullName, token),
    staleTime: 5 * 60 * 1000,
  });

  const { data: readme = '', isLoading: readmeLoading } = useQuery({
    queryKey: ['readme', fullName],
    queryFn: () => getRepositoryReadme(owner, name, token),
    enabled: !!repo,
    staleTime: 10 * 60 * 1000,
  });

  const { data: contributors = [], isLoading: contributorsLoading } = useQuery({
    queryKey: ['contributors', fullName],
    queryFn: () => getRepositoryContributors(owner, name, token),
    enabled: !!repo,
    staleTime: 10 * 60 * 1000,
  });

  const { data: fileTree } = useQuery({
    queryKey: ['filetree', fullName],
    queryFn: () => getRepositoryFileTree(owner, name, repo?.default_branch || 'HEAD', token),
    enabled: !!repo,
    staleTime: 10 * 60 * 1000,
  });

  const techBadges = repo
    ? detectTechStack(repo.language, repo.topics, fileTree?.tree.map((f) => f.path) || [])
    : [];

  if (repoLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (repoError || !repo) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate({ to: '/search' })} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-destructive/10 mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="font-semibold text-lg mb-2">Repository not found</h2>
          <p className="text-muted-foreground text-sm">
            {repoError instanceof Error ? repoError.message : 'This repository may have been deleted or made private.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/search' })}
          className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Repo header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-mono font-bold text-2xl text-primary">{repo.full_name}</h1>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              {repo.description && (
                <p className="text-muted-foreground mt-1 leading-relaxed">{repo.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <BookmarkButton repoId={repo.full_name} />
              <ForkButton
                owner={owner}
                repo={name}
                onForked={(result) => setForkedRepo(result)}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-foreground">{formatCount(repo.stargazers_count)}</span> stars
            </span>
            <span className="flex items-center gap-1.5">
              <GitFork className="w-4 h-4" />
              <span className="font-medium text-foreground">{formatCount(repo.forks_count)}</span> forks
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span className="font-medium text-foreground">{formatCount(repo.watchers_count)}</span> watchers
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span className="font-medium text-foreground">{repo.open_issues_count}</span> open issues
            </span>
            <span className="text-xs">Updated {formatDate(repo.pushed_at)}</span>
          </div>

          {/* Topics */}
          {repo.topics && repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {repo.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Tech stack */}
          {techBadges.length > 0 && (
            <div className="mt-4">
              <TechStackBadges badges={techBadges} />
            </div>
          )}
        </div>

        {/* AI Setup Assistant */}
        <div className="mb-6">
          <AISetupAssistant repo={repo} forkedRepo={forkedRepo} />
        </div>

        {/* AI Analysis */}
        <div className="mb-6">
          <AIAnalysisPanel repo={repo} />
        </div>

        {/* Tabs: README / Contributors */}
        <Tabs defaultValue="readme">
          <TabsList>
            <TabsTrigger value="readme">README</TabsTrigger>
            <TabsTrigger value="contributors">
              Contributors
              {contributors.length > 0 && (
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {contributors.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="readme" className="mt-4">
            {readmeLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" style={{ width: `${60 + Math.random() * 40}%` }} />
                ))}
              </div>
            ) : readme ? (
              <div className="prose-container rounded-xl border border-border/50 p-6 bg-card/30">
                <MarkdownRenderer content={readme} />
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No README found for this repository.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contributors" className="mt-4">
            {contributorsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 p-4 bg-card/30">
                <ContributorsList contributors={contributors} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
