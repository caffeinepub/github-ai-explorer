import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  type BookmarkID = Text;
  type Tag = Text;
  type Note = Text;

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

  type BookmarkEntry = {
    repoId : BookmarkID;
    tags : [Tag];
    note : ?Note;
  };

  type TerminalSession = {
    id : Text;
    name : Text;
    userId : Principal.Principal;
    commandHistory : [Text];
    workingDirectory : Text;
    createdAt : Int;
    lastUsedAt : Int;
    outputHistory : [Text];
    lastSavedAt : Int;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    userSettings : Map.Map<Principal.Principal, UserSettings>;
    userBookmarks : Map.Map<Principal.Principal, List.List<BookmarkEntry>>;
    terminalSessions : Map.Map<Text, TerminalSession>;
    githubTokens : Map.Map<Principal.Principal, Text>;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal.Principal, UserProfile>;
    userSettings : Map.Map<Principal.Principal, UserSettings>;
    userBookmarks : Map.Map<Principal.Principal, List.List<BookmarkEntry>>;
    terminalSessions : Map.Map<Text, TerminalSession>;
    cacheStore : Map.Map<Principal.Principal, Map.Map<Text, Text>>;
    githubTokens : Map.Map<Principal.Principal, Text>;
    userPATs : Map.Map<Principal.Principal, Text>;
  };

  public func run(old : OldActor) : NewActor {
    {
      userProfiles = old.userProfiles;
      userSettings = old.userSettings;
      userBookmarks = old.userBookmarks;
      terminalSessions = old.terminalSessions;
      cacheStore = Map.empty<Principal.Principal, Map.Map<Text, Text>>();
      githubTokens = old.githubTokens;
      userPATs = Map.empty<Principal.Principal, Text>();
    };
  };
};
