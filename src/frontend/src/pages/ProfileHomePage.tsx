import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetUserSettings, useGetBookmarks } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Settings,
  Bookmark,
  LogIn,
  Copy,
  Check,
  Star,
  Activity,
  Eye,
  EyeOff,
  Globe,
  Lock,
} from 'lucide-react';
import { useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <Card className="bg-card border-border/60">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-5 w-12 mb-1 bg-secondary" />
            ) : (
              <p className="font-mono font-bold text-lg text-foreground leading-none">{value}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfileHomePage() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const isAuthenticated = !!identity;

  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const { data: settings, isLoading: settingsLoading } = useGetUserSettings();
  const { data: bookmarks, isLoading: bookmarksLoading } = useGetBookmarks();

  const [copied, setCopied] = useState(false);
  const [showPrincipal, setShowPrincipal] = useState(false);

  const principalId = identity?.getPrincipal().toString() ?? '';

  const handleCopyPrincipal = () => {
    navigator.clipboard.writeText(principalId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-4 rounded-full bg-primary/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-mono font-bold text-2xl text-foreground mb-2">Login Required</h1>
        <p className="text-muted-foreground mb-6">You need to be logged in to view your profile.</p>
        <Button onClick={() => navigate({ to: '/' })}>Go to Home</Button>
      </div>
    );
  }

  const displayName = userProfile?.name || 'Anonymous';
  const initials = userProfile?.name ? getInitials(userProfile.name) : '?';
  const bookmarkCount = bookmarks?.length ?? 0;
  const theme = settings?.theme ?? 'system';
  const profileVisibility = settings?.profileVisibility ?? 'private';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center gap-2 mb-8">
        <User className="w-5 h-5 text-primary" />
        <h1 className="font-mono font-bold text-xl text-foreground">
          My <span className="text-primary">Profile</span>
        </h1>
      </div>

      {/* Profile hero card */}
      <Card className="bg-card border-border/60 mb-6">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {settings?.avatarUrl ? (
                <img
                  src={settings.avatarUrl}
                  alt={displayName}
                  className="w-20 h-20 rounded-full border-2 border-primary/40 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-2xl font-mono font-bold text-primary">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {profileLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40 bg-secondary" />
                  <Skeleton className="h-4 w-64 bg-secondary" />
                </div>
              ) : (
                <>
                  <h2 className="font-mono font-bold text-2xl text-foreground">{displayName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {showPrincipal
                        ? principalId
                        : `${principalId.slice(0, 12)}...${principalId.slice(-6)}`}
                    </span>
                    <button
                      onClick={() => setShowPrincipal((v) => !v)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={showPrincipal ? 'Hide principal' : 'Show full principal'}
                    >
                      {showPrincipal ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={handleCopyPrincipal}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy principal ID"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs font-mono gap-1">
                      {profileVisibility === 'public' ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      {profileVisibility === 'public' ? 'Public' : 'Private'}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      Theme: {theme}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            {/* Settings CTA */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: '/settings' })}
              className="gap-2 shrink-0"
            >
              <Settings className="w-4 h-4" />
              Edit Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Bookmark}
          label="Saved Repos"
          value={bookmarkCount}
          loading={bookmarksLoading}
        />
        <StatCard
          icon={Star}
          label="Stars Explored"
          value="—"
          loading={false}
        />
        <StatCard
          icon={Activity}
          label="Repos Viewed"
          value="—"
          loading={false}
        />
        <StatCard
          icon={User}
          label="Profile Status"
          value={profileVisibility === 'public' ? 'Public' : 'Private'}
          loading={settingsLoading}
        />
      </div>

      {/* Recent bookmarks preview */}
      <Card className="bg-card border-border/60 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-base flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" />
              Recent Bookmarks
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/bookmarks' })}
              className="text-xs text-primary hover:text-primary/80"
            >
              View all →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookmarksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full bg-secondary" />
              ))}
            </div>
          ) : bookmarks && bookmarks.length > 0 ? (
            <div className="space-y-2">
              {bookmarks.slice(0, 5).map((b) => (
                <div
                  key={b.repoId}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer group"
                  onClick={() => {
                    const [owner, name] = b.repoId.split('/');
                    if (owner && name) {
                      navigate({ to: '/repo/$owner/$name', params: { owner, name } });
                    }
                  }}
                >
                  <span className="font-mono text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                    {b.repoId}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {b.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No bookmarks yet.{' '}
              <button
                onClick={() => navigate({ to: '/search' })}
                className="text-primary hover:underline"
              >
                Start exploring
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => navigate({ to: '/settings' })}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Go to Settings
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/search' })}
          className="gap-2"
        >
          Explore Repositories
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/bookmarks' })}
          className="gap-2"
        >
          <Bookmark className="w-4 h-4" />
          My Bookmarks
        </Button>
      </div>
    </div>
  );
}
