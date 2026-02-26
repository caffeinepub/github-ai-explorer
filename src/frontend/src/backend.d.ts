import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
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
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    appendOutput(sessionId: string, output: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearGitHubPAT(): Promise<void>;
    deleteTerminalSession(sessionId: string): Promise<void>;
    getCachedData(key: string): Promise<string | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGitHubPAT(): Promise<string | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    loadTerminalSessions(): Promise<Array<TerminalSession>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveGitHubPAT(pat: string): Promise<void>;
    saveTerminalSession(session: TerminalSession): Promise<void>;
    setCachedData(key: string, value: string): Promise<void>;
    updateCommandHistory(sessionId: string, command: string): Promise<void>;
}
