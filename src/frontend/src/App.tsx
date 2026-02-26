import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
} from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { useTheme } from './hooks/useTheme';
import Layout from './components/Layout';
import ProfileSetupModal from './components/ProfileSetupModal';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import TrendingPage from './pages/TrendingPage';
import BookmarksPage from './pages/BookmarksPage';
import RepoDetailsPage from './pages/RepoDetailsPage';
import StarHistoryPage from './pages/StarHistoryPage';
import ActivityHeatmapPage from './pages/ActivityHeatmapPage';
import IssueTrackerPage from './pages/IssueTrackerPage';
import ProfileHomePage from './pages/ProfileHomePage';
import SettingsPage from './pages/SettingsPage';
import TerminalPage from './pages/TerminalPage';
import BridgeSetupPage from './pages/BridgeSetupPage';
import { Toaster } from '@/components/ui/sonner';

// Root layout component — uses Layout which renders <Outlet /> internally
function RootLayout() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading, isFetched } = useGetCallerUserProfile();

  // Apply saved theme on mount
  useTheme();

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !isLoading && isFetched && userProfile === null;

  return (
    <>
      <Layout />
      <ProfileSetupModal
        open={showProfileSetup}
        onComplete={() => {}}
      />
      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: 'bg-card border-border text-foreground font-mono text-xs',
          },
        }}
      />
    </>
  );
}

// Routes
const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: SearchPage,
});

const trendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trending',
  component: TrendingPage,
});

const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bookmarks',
  component: BookmarksPage,
});

const repoDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repo/$owner/$name',
  component: RepoDetailsPage,
});

const starHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repo/$owner/$name/stars',
  component: StarHistoryPage,
});

const activityHeatmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repo/$owner/$name/activity',
  component: ActivityHeatmapPage,
});

const issueTrackerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/repo/$owner/$name/issues',
  component: IssueTrackerPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfileHomePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const terminalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terminal',
  component: TerminalPage,
});

const bridgeSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bridge-setup',
  component: BridgeSetupPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  trendingRoute,
  bookmarksRoute,
  repoDetailsRoute,
  starHistoryRoute,
  activityHeatmapRoute,
  issueTrackerRoute,
  profileRoute,
  settingsRoute,
  terminalRoute,
  bridgeSetupRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
