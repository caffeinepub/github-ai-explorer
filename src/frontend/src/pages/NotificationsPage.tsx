import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  BellOff,
  CheckCheck,
  CircleDot,
  GitBranch,
  GitPullRequest,
  Info,
  LogIn,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Notification } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddNotification,
  useClearNotifications,
  useGetNotifications,
  useMarkNotificationRead,
} from "../hooks/useQueries";

function typeIcon(type: string) {
  switch (type) {
    case "team":
      return <Users className="w-4 h-4 text-blue-400" />;
    case "ci":
      return <GitBranch className="w-4 h-4 text-yellow-400" />;
    case "pr":
      return <GitPullRequest className="w-4 h-4 text-purple-400" />;
    case "star":
      return <Star className="w-4 h-4 text-yellow-400" />;
    default:
      return <Bell className="w-4 h-4 text-primary" />;
  }
}

function formatTime(createdAt: bigint) {
  const ms = Number(createdAt / 1_000_000n);
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 p-4 border-b border-border/40 last:border-0 transition-colors ${
        notification.read ? "opacity-60" : "bg-primary/5"
      }`}
      data-ocid="notification.item.1"
    >
      <div className="mt-0.5">{typeIcon(notification.notificationType)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <p className="text-sm font-semibold text-foreground truncate">
            {notification.title}
          </p>
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {formatTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{notification.body}</p>
      </div>
      {!notification.read && (
        <button
          type="button"
          onClick={() => onMarkRead(notification.id)}
          className="shrink-0 p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Mark as read"
          data-ocid="notification.read.button"
        >
          <CircleDot className="w-3.5 h-3.5 text-primary" />
        </button>
      )}
    </div>
  );
}

const SEED_NOTIFICATIONS = [
  {
    title: "New stars on torvalds/linux",
    body: "Repository torvalds/linux gained 128 new stars today.",
    type: "star",
  },
  {
    title: "Team activity in DevOps Squad",
    body: "3 new shared bookmarks were added to your team.",
    type: "team",
  },
  {
    title: "CI/CD pipeline completed",
    body: "Build #1492 passed for facebook/react on main branch.",
    type: "ci",
  },
  {
    title: "PR merged: feat/dark-mode",
    body: "Pull request #847 was merged in vercel/next.js.",
    type: "pr",
  },
];

export default function NotificationsPage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const [tab, setTab] = useState("all");
  const [seeded, setSeeded] = useState(false);

  const { data: notifications, isLoading, refetch } = useGetNotifications();
  const markRead = useMarkNotificationRead();
  const clearAll = useClearNotifications();
  const addNotification = useAddNotification();

  // Seed sample notifications if empty
  // biome-ignore lint/correctness/useExhaustiveDependencies: seeding logic only runs once when notifications first load
  useEffect(() => {
    if (!isAuthenticated || seeded || isLoading) return;
    if (notifications && notifications.length === 0) {
      setSeeded(true);
      Promise.all(
        SEED_NOTIFICATIONS.map((n) =>
          addNotification.mutateAsync({ title: n.title, body: n.body }),
        ),
      ).then(() => refetch());
    } else if (notifications && notifications.length > 0) {
      setSeeded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, notifications, isLoading]);

  const handleMarkRead = async (id: string) => {
    try {
      await markRead.mutateAsync(id);
      refetch();
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    const unread = (notifications || []).filter((n) => !n.read);
    try {
      await Promise.all(unread.map((n) => markRead.mutateAsync(n.id)));
      refetch();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAll.mutateAsync();
      refetch();
      setSeeded(false);
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className="max-w-md mx-auto px-4 py-24 text-center"
        data-ocid="notifications.auth.section"
      >
        <Bell className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
        <h2 className="font-mono font-bold text-xl text-foreground mb-2">
          Login Required
        </h2>
        <p className="text-sm text-muted-foreground mb-6 font-mono">
          Notifications require Internet Identity login.
        </p>
        <Button
          onClick={login}
          disabled={loginStatus === "logging-in"}
          className="gap-2"
          data-ocid="notifications.login.button"
        >
          <LogIn className="w-4 h-4" />
          {loginStatus === "logging-in"
            ? "Logging in..."
            : "Login with Internet Identity"}
        </Button>
      </div>
    );
  }

  const allNotifs = notifications || [];
  const unread = allNotifs.filter((n) => !n.read);

  const filterNotifs = (list: Notification[]) => {
    switch (tab) {
      case "unread":
        return list.filter((n) => !n.read);
      case "repo":
        return list.filter(
          (n) => n.notificationType === "repo" || n.notificationType === "star",
        );
      case "team":
        return list.filter((n) => n.notificationType === "team");
      default:
        return list;
    }
  };

  const displayed = filterNotifs(allNotifs);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-primary" />
            <h1 className="font-mono font-bold text-xl text-foreground">
              Notifications
              {unread.length > 0 && (
                <Badge className="ml-2 font-mono text-[10px] px-1.5 py-0">
                  {unread.length}
                </Badge>
              )}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            Alerts for repo activity, team updates, CI/CD status, and more.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1.5"
            onClick={handleMarkAllRead}
            disabled={unread.length === 0}
            data-ocid="notifications.mark_all_read.button"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs gap-1.5 text-destructive hover:text-destructive"
            onClick={handleClearAll}
            disabled={allNotifs.length === 0}
            data-ocid="notifications.clear_all.button"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" data-ocid="notifications.all.tab">
            All{" "}
            {allNotifs.length > 0 && (
              <span className="ml-1 text-muted-foreground">
                ({allNotifs.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread" data-ocid="notifications.unread.tab">
            Unread{" "}
            {unread.length > 0 && (
              <span className="ml-1 text-primary">({unread.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="repo" data-ocid="notifications.repo.tab">
            Repo
          </TabsTrigger>
          <TabsTrigger value="team" data-ocid="notifications.team.tab">
            Team
          </TabsTrigger>
        </TabsList>

        {["all", "unread", "repo", "team"].map((t) => (
          <TabsContent key={t} value={t}>
            {isLoading ? (
              <div
                className="bg-card border border-border rounded-xl overflow-hidden"
                data-ocid="notifications.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 border-b border-border/40"
                  >
                    <Skeleton className="w-4 h-4 rounded-full mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div
                className="text-center py-16 bg-card border border-border rounded-xl"
                data-ocid="notifications.empty_state"
              >
                <BellOff className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="font-mono text-sm text-muted-foreground mb-2">
                  {tab === "unread"
                    ? "No unread notifications"
                    : "No notifications"}
                </p>
                <p className="text-xs text-muted-foreground/60 font-mono max-w-xs mx-auto">
                  Notifications appear here for repo stars, team activity, CI/CD
                  results, and PR updates.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground/50 font-mono">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>Triggers: repo watch, team events, CI/CD status</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {displayed.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
