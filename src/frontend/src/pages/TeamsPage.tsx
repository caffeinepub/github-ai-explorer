import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Principal } from "@icp-sdk/core/principal";
import {
  Bookmark,
  ChevronRight,
  LogIn,
  Plus,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import type { Team } from "../backend";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddTeamBookmark,
  useAddTeamMember,
  useCreateTeam,
  useGetMyTeams,
  useGetTeamBookmarks,
  useGetTeamMembers,
} from "../hooks/useQueries";

function TeamDetailPanel({
  team,
  onClose,
  myPrincipal,
}: {
  team: Team;
  onClose: () => void;
  myPrincipal: string;
}) {
  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useGetTeamMembers(team.id);
  const {
    data: bookmarks,
    isLoading: bookmarksLoading,
    refetch: refetchBookmarks,
  } = useGetTeamBookmarks(team.id);
  const addMember = useAddTeamMember();
  const addBookmark = useAddTeamBookmark();
  const [memberInput, setMemberInput] = useState("");
  const [bookmarkInput, setBookmarkInput] = useState("");

  const isOwner = team.ownerId.toString() === myPrincipal;

  const handleAddMember = async () => {
    if (!memberInput.trim()) return;
    try {
      const p = Principal.fromText(memberInput.trim());
      await addMember.mutateAsync({ teamId: team.id, userId: p });
      setMemberInput("");
      refetchMembers();
      toast.success("Member added");
    } catch {
      toast.error("Invalid principal or failed to add member");
    }
  };

  const handleAddBookmark = async () => {
    if (!bookmarkInput.trim()) return;
    try {
      await addBookmark.mutateAsync({
        teamId: team.id,
        repoId: bookmarkInput.trim(),
      });
      setBookmarkInput("");
      refetchBookmarks();
      toast.success("Bookmark added to team");
    } catch {
      toast.error("Failed to add bookmark");
    }
  };

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden"
      data-ocid="team.detail.panel"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-mono font-semibold text-foreground">
            {team.name}
          </h3>
          {isOwner && (
            <Badge variant="secondary" className="text-[10px] font-mono gap-1">
              <Shield className="w-2.5 h-2.5" />
              Owner
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-ocid="team.detail.close_button"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Members */}
        <div>
          <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Members
          </h4>
          {membersLoading ? (
            <div className="space-y-2" data-ocid="team.members.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-40">
              <div className="space-y-1.5">
                {(members || []).map((p, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: principal list
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[9px] bg-primary/20 text-primary">
                        {p.toString().slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {p.toString().slice(0, 20)}...
                    </span>
                    {p.toString() === myPrincipal && (
                      <Badge variant="outline" className="text-[9px] ml-auto">
                        You
                      </Badge>
                    )}
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <p
                    className="text-xs text-muted-foreground font-mono px-2 py-4 text-center"
                    data-ocid="team.members.empty_state"
                  >
                    No members yet
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
          {isOwner && (
            <div className="flex gap-2 mt-3">
              <Input
                placeholder="Principal ID..."
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                className="font-mono text-xs h-8"
                data-ocid="team.add_member.input"
              />
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={handleAddMember}
                disabled={addMember.isPending}
                data-ocid="team.add_member.button"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Shared Bookmarks */}
        <div>
          <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Shared Bookmarks
          </h4>
          {bookmarksLoading ? (
            <div className="space-y-2" data-ocid="team.bookmarks.loading_state">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="h-40">
              <div className="space-y-1.5">
                {(bookmarks || []).map((repoId, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: bookmarks list
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/30"
                  >
                    <Bookmark className="w-3 h-3 text-primary/60" />
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {repoId}
                    </span>
                  </div>
                ))}
                {(!bookmarks || bookmarks.length === 0) && (
                  <p
                    className="text-xs text-muted-foreground font-mono px-2 py-4 text-center"
                    data-ocid="team.bookmarks.empty_state"
                  >
                    No shared bookmarks
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Repo ID (owner/name)..."
              value={bookmarkInput}
              onChange={(e) => setBookmarkInput(e.target.value)}
              className="font-mono text-xs h-8"
              data-ocid="team.add_bookmark.input"
            />
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={handleAddBookmark}
              disabled={addBookmark.isPending}
              data-ocid="team.add_bookmark.button"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  const { identity, login, loginStatus } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const myPrincipal = identity?.getPrincipal().toString() || "";

  const { data: teams, isLoading, refetch } = useGetMyTeams();
  const createTeam = useCreateTeam();
  const [teamName, setTeamName] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    try {
      const id = crypto.randomUUID();
      await createTeam.mutateAsync({ teamId: id, name: teamName.trim() });
      setTeamName("");
      refetch();
      toast.success(`Team "${teamName}" created!`);
    } catch {
      toast.error("Failed to create team");
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className="max-w-md mx-auto px-4 py-24 text-center"
        data-ocid="teams.auth.section"
      >
        <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
        <h2 className="font-mono font-bold text-xl text-foreground mb-2">
          Login Required
        </h2>
        <p className="text-sm text-muted-foreground mb-6 font-mono">
          Teams require Internet Identity login to create and manage.
        </p>
        <Button
          onClick={login}
          disabled={loginStatus === "logging-in"}
          className="gap-2"
          data-ocid="teams.login.button"
        >
          <LogIn className="w-4 h-4" />
          {loginStatus === "logging-in"
            ? "Logging in..."
            : "Login with Internet Identity"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="font-mono font-bold text-xl text-foreground">
            Team <span className="text-primary">Collaboration</span>
          </h1>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          Create teams, share bookmarks, and collaborate with colleagues.
        </p>
      </div>

      {/* Create team */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <h3 className="text-sm font-mono font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Create New Team
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Team name..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
            className="font-mono text-sm"
            data-ocid="team.name.input"
          />
          <Button
            onClick={handleCreateTeam}
            disabled={createTeam.isPending || !teamName.trim()}
            data-ocid="team.create.button"
          >
            {createTeam.isPending ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Team
          </Button>
        </div>
      </div>

      {/* Team detail */}
      {selectedTeam && (
        <div className="mb-6">
          <TeamDetailPanel
            team={selectedTeam}
            onClose={() => setSelectedTeam(null)}
            myPrincipal={myPrincipal}
          />
        </div>
      )}

      {/* Team list */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-ocid="teams.loading_state"
        >
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !teams || teams.length === 0 ? (
        <div
          className="text-center py-16 bg-card border border-border rounded-xl"
          data-ocid="teams.empty_state"
        >
          <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">
            No teams yet. Create your first team above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <button
              type="button"
              key={team.id}
              className={`bg-card border rounded-xl p-4 text-left hover:border-primary/50 transition-all cursor-pointer ${
                selectedTeam?.id === team.id
                  ? "border-primary"
                  : "border-border"
              }`}
              onClick={() =>
                setSelectedTeam(selectedTeam?.id === team.id ? null : team)
              }
              data-ocid="team.item.1"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                {team.ownerId.toString() === myPrincipal && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    <Shield className="w-2.5 h-2.5 mr-1" />
                    Owner
                  </Badge>
                )}
              </div>
              <p className="font-mono font-semibold text-foreground text-sm mb-1">
                {team.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {team.sharedBookmarks.length} shared bookmarks
              </p>
              <div className="flex items-center justify-end mt-2">
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
