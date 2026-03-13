import { Toaster } from "@/components/ui/sonner";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import React from "react";
import Layout from "./components/Layout";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "./hooks/useQueries";
import { useTheme } from "./hooks/useTheme";
import ActivityHeatmapPage from "./pages/ActivityHeatmapPage";
import BookmarksPage from "./pages/BookmarksPage";
import BridgeSetupPage from "./pages/BridgeSetupPage";
import CICDPage from "./pages/CICDPage";
import DockerPage from "./pages/DockerPage";
import HomePage from "./pages/HomePage";
import IssueTrackerPage from "./pages/IssueTrackerPage";
import PRPulsePage from "./pages/PRPulsePage";
import ProfileHomePage from "./pages/ProfileHomePage";
import RepoDetailsPage from "./pages/RepoDetailsPage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";
import StarHistoryPage from "./pages/StarHistoryPage";
import TerminalPage from "./pages/TerminalPage";
import TrendingPage from "./pages/TrendingPage";
import WorkflowsPage from "./pages/WorkflowsPage";

function RootLayout() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading, isFetched } = useGetCallerUserProfile();
  useTheme();
  const isAuthenticated = !!identity;
  const showProfileSetup =
    isAuthenticated && !isLoading && isFetched && userProfile === null;
  return (
    <>
      <Layout />
      <ProfileSetupModal open={showProfileSetup} onComplete={() => {}} />
      <Toaster
        theme="dark"
        toastOptions={{
          classNames: {
            toast: "bg-card border-border text-foreground font-mono text-xs",
          },
        }}
      />
    </>
  );
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});
const trendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/trending",
  component: TrendingPage,
});
const bookmarksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bookmarks",
  component: BookmarksPage,
});
const repoDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name",
  component: RepoDetailsPage,
});
const starHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name/stars",
  component: StarHistoryPage,
});
const activityHeatmapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name/activity",
  component: ActivityHeatmapPage,
});
const issueTrackerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name/issues",
  component: IssueTrackerPage,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfileHomePage,
});
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});
const terminalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terminal",
  component: TerminalPage,
});
const bridgeSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bridge-setup",
  component: BridgeSetupPage,
});
const prPulseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name/pr-pulse",
  component: PRPulsePage,
});
const cicdRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name/cicd",
  component: CICDPage,
});
const dockerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/repo/$owner/$name/docker",
  component: DockerPage,
});
const workflowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workflows",
  component: WorkflowsPage,
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
  prPulseRoute,
  cicdRoute,
  dockerRoute,
  profileRoute,
  settingsRoute,
  terminalRoute,
  bridgeSetupRoute,
  workflowsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
