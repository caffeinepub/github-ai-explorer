import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type BookmarkID = string;
export type Tag = string;
export interface BookmarkEntry {
    repoId: BookmarkID;
    note?: Note;
    tags: Array<Tag>;
}
export interface UserProfile {
    name: string;
}
export type Note = string;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBookmark(repoId: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    checkBookmark(repoId: string): Promise<boolean>;
    getBookmarks(): Promise<Array<BookmarkEntry>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMyGithubToken(): Promise<string | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    removeBookmark(repoId: string): Promise<void>;
    removeMyGithubToken(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setMyGithubToken(token: string): Promise<void>;
    updateBookmarkNote(repoId: string, note: Note | null): Promise<void>;
    updateBookmarkTags(repoId: string, tags: Array<Tag>): Promise<void>;
}
