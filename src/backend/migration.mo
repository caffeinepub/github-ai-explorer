import Map "mo:core/Map";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Text "mo:core/Text";
import Set "mo:core/Set";

module {
  type Team = {
    id : Text;
    name : Text;
    ownerId : Principal;
    sharedBookmarks : [Text];
    createdAt : Int;
  };

  type BookmarkEntry = {
    repoId : Text;
    tags : [Text];
    note : ?Text;
  };

  type TerminalSession = {
    id : Text;
    name : Text;
    userId : Principal;
    commandHistory : [Text];
    workingDirectory : Text;
    createdAt : Int;
    lastUsedAt : Int;
    outputHistory : [Text];
    lastSavedAt : Int;
  };

  type UserProfile = {
    name : Text;
  };

  type UserSettings = {
    displayName : Text;
    avatarUrl : Text;
    defaultSearchSort : Text;
    defaultLanguageFilter : Text;
    resultsPerPage : Nat;
    notificationsEnabled : Bool;
    savedSearchAlertsEnabled : Bool;
    theme : Text;
    profileVisibility : Text;
    showActivityStats : Bool;
    compactView : Bool;
    showStarCount : Bool;
  };

  type Notification = {
    id : Text;
    userId : Principal;
    notificationType : Text;
    title : Text;
    body : Text;
    read : Bool;
    createdAt : Int;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    userSettings : Map.Map<Principal, UserSettings>;
    userBookmarks : Map.Map<Principal, List.List<BookmarkEntry>>;
    githubTokens : Map.Map<Principal, Text>;
    terminalSessions : Map.Map<Text, TerminalSession>;
    cacheStore : Map.Map<Principal, Map.Map<Text, Text>>;
    userPATs : Map.Map<Principal, Text>;
    // No notifications or team features in old actor
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    userSettings : Map.Map<Principal, UserSettings>;
    userBookmarks : Map.Map<Principal, List.List<BookmarkEntry>>;
    githubTokens : Map.Map<Principal, Text>;
    terminalSessions : Map.Map<Text, TerminalSession>;
    cacheStore : Map.Map<Principal, Map.Map<Text, Text>>;
    userPATs : Map.Map<Principal, Text>;
    notifications : Map.Map<Principal, List.List<Notification>>;
    teams : Map.Map<Text, Team>;
    teamMembers : Map.Map<Text, Set.Set<Principal>>;
  };

  public func run(old : OldActor) : NewActor {
    {
      userProfiles = old.userProfiles;
      userSettings = old.userSettings;
      userBookmarks = old.userBookmarks;
      githubTokens = old.githubTokens;
      terminalSessions = old.terminalSessions;
      cacheStore = old.cacheStore;
      userPATs = old.userPATs;
      notifications = Map.empty<Principal, List.List<Notification>>();
      teams = Map.empty<Text, Team>();
      teamMembers = Map.empty<Text, Set.Set<Principal>>();
    };
  };
};
