import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  RouterProvider,
} from '@tanstack/react-router';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import Layout from './components/Layout';
import ProfileSetupModal from './components/ProfileSetupModal';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import TrendingPage from './pages/TrendingPage';
import BookmarksPage from './pages/BookmarksPage';
import RepoDetailsPage from './pages/RepoDetailsPage';
import { Toaster } from '@/components/ui/sonner';

// Root layout component — uses Layout which renders <Outlet /> internally
function RootLayout() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading, isFetched } = useGetCallerUserProfile();

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

const routeTree = rootRoute.addChildren([
  indexRoute,
  searchRoute,
  trendingRoute,
  bookmarksRoute,
  repoDetailsRoute,
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
