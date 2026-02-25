import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { useGetCallerUserProfile } from '../hooks/useQueries';
import { GithubTokenSettings } from './GithubTokenSettings';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Telescope, Search, TrendingUp, Bookmark, LogIn, LogOut, User, Key, Heart } from 'lucide-react';

export default function Layout() {
  const { identity, login, clear, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';
  const { data: userProfile } = useGetCallerUserProfile();
  const [tokenSettingsOpen, setTokenSettingsOpen] = useState(false);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.message === 'User is already authenticated') {
        await clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/assets/generated/repo-radar-logo.dim_128x128.png"
                alt="Repo Radar"
                className="w-8 h-8 rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-mono font-bold text-lg text-primary group-hover:text-primary/80 transition-colors">
                Repo<span className="text-foreground">Radar</span>
              </span>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                to="/search"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
              <Link
                to="/trending"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                Trending
              </Link>
              <Link
                to="/bookmarks"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Bookmarks
              </Link>
            </nav>

            {/* Auth */}
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline max-w-[120px] truncate">
                        {userProfile?.name || 'Account'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => setTokenSettingsOpen(true)}
                      className="gap-2 cursor-pointer"
                    >
                      <Key className="w-4 h-4" />
                      GitHub Token
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="sm"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="gap-2"
                >
                  {isLoggingIn ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      Login
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
            <Link
              to="/search"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" />
              Search
            </Link>
            <Link
              to="/trending"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Trending
            </Link>
            <Link
              to="/bookmarks"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Bookmarks
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border/50 bg-background/80 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Telescope className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold text-primary">RepoRadar</span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Built with <Heart className="w-3.5 h-3.5 text-primary fill-primary mx-1" /> using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium ml-1"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      {isAuthenticated && (
        <GithubTokenSettings
          open={tokenSettingsOpen}
          onClose={() => setTokenSettingsOpen(false)}
        />
      )}
    </div>
  );
}
