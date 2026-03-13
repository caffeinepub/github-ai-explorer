import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Code,
  GitBranch,
  GitCommit,
  Heart,
  Key,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  Telescope,
  Terminal,
  TrendingUp,
  User,
} from "lucide-react";
import React, { Suspense, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { useTheme } from "../hooks/useTheme";
import { GithubTokenSettings } from "./GithubTokenSettings";

const TerminalPage = React.lazy(() => import("../pages/TerminalPage"));

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Layout() {
  const { identity, login, clear, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";
  const { data: userProfile } = useGetCallerUserProfile();
  const [tokenSettingsOpen, setTokenSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [terminalDockedOpen, setTerminalDockedOpen] = useState(false);

  const handleLogin = async () => {
    try {
      await login();
    } catch (err: unknown) {
      const error = err as Error;
      if (error?.message === "User is already authenticated") {
        await clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    navigate({ to: "/" });
  };

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const current = order.indexOf(theme as "light" | "dark" | "system");
    const next = order[(current + 1) % order.length];
    setTheme(next);
  };

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const themeLabel =
    theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";
  const displayName = userProfile?.name || "Account";
  const initials = userProfile?.name ? getInitials(userProfile.name) : "?";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/assets/generated/repo-radar-logo.dim_128x128.png"
                alt="Repo Radar"
                className="w-8 h-8 rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="font-mono font-bold text-lg text-primary group-hover:text-primary/80 transition-colors">
                Repo<span className="text-foreground">Radar</span>
              </span>
            </Link>

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
              <Link
                to="/workflows"
                data-ocid="nav.workflows.link"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                Workflows
              </Link>
              <Link
                to="/commit-msg"
                data-ocid="nav.commit-msg.link"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <GitCommit className="w-4 h-4" />
                Commit Msg
              </Link>
              <Link
                to="/compare"
                data-ocid="nav.compare.link"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Compare
              </Link>
              <Link
                to="/terminal"
                data-ocid="nav.terminal.link"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Terminal className="w-4 h-4" />
                Terminal
              </Link>
            </nav>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 pl-1.5"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-[10px] font-mono font-bold text-primary">
                        {initials}
                      </div>
                      <span className="hidden sm:inline max-w-[100px] truncate text-sm">
                        {displayName}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="pb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-mono font-bold text-primary">
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold truncate">
                            {displayName}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            Logged in
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/profile" })}
                      className="gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      Profile Home
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/settings" })}
                      className="gap-2 cursor-pointer"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={cycleTheme}
                      className="gap-2 cursor-pointer"
                    >
                      <ThemeIcon className="w-4 h-4" />
                      Theme: {themeLabel}
                    </DropdownMenuItem>
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
            <Link
              to="/workflows"
              data-ocid="nav.workflows.link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Workflows
            </Link>
            <Link
              to="/commit-msg"
              data-ocid="nav.commit-msg.link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <GitCommit className="w-3.5 h-3.5" />
              Commit Msg
            </Link>
            <Link
              to="/compare"
              data-ocid="nav.compare.link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Compare
            </Link>
            <Link
              to="/terminal"
              data-ocid="nav.terminal.link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              <Terminal className="w-3.5 h-3.5" />
              Terminal
            </Link>
          </div>
        </div>
      </header>

      <main className={`flex-1 ${terminalDockedOpen ? "pb-0" : "pb-10"}`}>
        <Outlet />
      </main>

      <footer className="border-t border-border/50 bg-background/80 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Telescope className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold text-primary">
                RepoRadar
              </span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Built with{" "}
              <Heart className="w-3.5 h-3.5 text-primary fill-primary mx-1" />{" "}
              using{" "}
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

      {/* Docked Terminal Bar */}
      <div
        data-ocid="terminal.panel"
        className="sticky bottom-0 z-50 border-t border-white/10"
        style={{ background: "#0d1117" }}
      >
        {/* Collapsed bar / header */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 h-10 cursor-pointer select-none"
          style={{ background: "#161b22" }}
          onClick={() => setTerminalDockedOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-green-400" />
            <span className="text-xs font-mono font-semibold text-white/70 tracking-wide">
              TERMINAL
            </span>
            {terminalDockedOpen && (
              <span className="text-[10px] font-mono text-white/30 hidden sm:inline">
                — docked
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              data-ocid="terminal.toggle"
              onClick={(e) => {
                e.stopPropagation();
                setTerminalDockedOpen((o) => !o);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title={
                terminalDockedOpen ? "Minimize terminal" : "Expand terminal"
              }
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pair</span>
            </button>
            <button
              type="button"
              data-ocid="terminal.toggle"
              onClick={(e) => {
                e.stopPropagation();
                setTerminalDockedOpen((o) => !o);
              }}
              className="p-1 rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title={terminalDockedOpen ? "Collapse" : "Expand"}
            >
              {terminalDockedOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </button>

        {/* Expanded terminal panel */}
        {terminalDockedOpen && (
          <div
            className="overflow-hidden"
            style={{ height: "50vh" }}
            data-ocid="terminal.section"
          >
            <Suspense
              fallback={
                <div
                  className="flex items-center justify-center h-full"
                  data-ocid="terminal.loading_state"
                >
                  <span className="text-xs font-mono text-white/40 animate-pulse">
                    Loading terminal...
                  </span>
                </div>
              }
            >
              <TerminalPage />
            </Suspense>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <GithubTokenSettings
          open={tokenSettingsOpen}
          onClose={() => setTokenSettingsOpen(false)}
        />
      )}
    </div>
  );
}
