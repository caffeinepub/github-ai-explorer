import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Notification {
    id: string;
    title: string;
    body: string;
    userId: Principal;
    notificationType: string;
    createdAt: bigint;
    read: boolean;
}
export interface TerminalSession {
    id: string;
    lastUsedAt: bigint;
    userId: Principal;
    name: string;
    createdAt: bigint;
    outputHistory: Array<string>;
    lastSavedAt: bigint;
    commandHistory: Array<string>;
    workingDirectory: string;
}
export interface UserProfile {
    name: string;
}
export interface Team {
    id: string;
    ownerId: Principal;
    name: string;
    createdAt: bigint;
    sharedBookmarks: Array<string>;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addNotification(title: string, body: string): Promise<void>;
    /**
     * / Add team shared bookmark
     */
    addTeamBookmark(teamId: string, repoId: string): Promise<void>;
    /**
     * / Add team member
     */
    addTeamMember(teamId: string, userId: Principal): Promise<void>;
    appendOutput(sessionId: string, output: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearGitHubPAT(): Promise<void>;
    clearNotifications(): Promise<void>;
    /**
     * / Create a new team
     */
    createTeam(teamId: string, name: string): Promise<Team>;
    deleteTerminalSession(sessionId: string): Promise<void>;
    getCachedData(key: string): Promise<string | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGitHubPAT(): Promise<string | null>;
    /**
     * / Get my teams (teams where I am a member)
     */
    getMyTeams(): Promise<Array<Team>>;
    getNotifications(): Promise<Array<Notification>>;
    /**
     * / Get team shared bookmarks
     */
    getTeamBookmarks(teamId: string): Promise<Array<string>>;
    /**
     * / Get team members
     */
    getTeamMembers(teamId: string): Promise<Array<Principal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    loadTerminalSessions(): Promise<Array<TerminalSession>>;
    markNotificationRead(notificationId: string): Promise<void>;
    /**
     * / Remove team shared bookmark
     */
    removeTeamBookmark(teamId: string, repoId: string): Promise<void>;
    /**
     * / Remove team member
     */
    removeTeamMember(teamId: string, userId: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveGitHubPAT(pat: string): Promise<void>;
    saveTerminalSession(session: TerminalSession): Promise<void>;
    setCachedData(key: string, value: string): Promise<void>;
    updateCommandHistory(sessionId: string, command: string): Promise<void>;
}
