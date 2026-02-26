import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Migration "migration";

// Enable migration on upgrade
(with migration = Migration.run)
actor {
  type BookmarkID = Text;
  type Tag = Text;
  type Note = Text;

  public type UserProfile = {
    name : Text;
  };

  public type UserSettings = {
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

  public type TerminalSession = {
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

  let userProfiles = Map.empty<Principal, UserProfile>();
  let userSettings = Map.empty<Principal, UserSettings>();
  let userBookmarks = Map.empty<Principal, List.List<BookmarkEntry>>();
  let githubTokens = Map.empty<Principal, Text>();
  let terminalSessions = Map.empty<Text, TerminalSession>();
  let cacheStore = Map.empty<Principal, Map.Map<Text, Text>>();
  let userPATs = Map.empty<Principal, Text>();

  // Initialize the authentication system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // --- User Profile Functions ---
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // --- GitHub Personal Access Token (PAT) Management ---
  public shared ({ caller }) func saveGitHubPAT(pat : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save PATs");
    };
    userPATs.add(caller, pat);
  };

  public query ({ caller }) func getGitHubPAT() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get PATs");
    };
    userPATs.get(caller);
  };

  public shared ({ caller }) func clearGitHubPAT() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear PATs");
    };
    userPATs.remove(caller);
  };

  // --- Simple Key-Value Cache Store (Per-User Scoped) ---
  public shared ({ caller }) func setCachedData(key : Text, value : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set cache data");
    };
    let userCache = switch (cacheStore.get(caller)) {
      case (null) {
        let newCache = Map.empty<Text, Text>();
        cacheStore.add(caller, newCache);
        newCache;
      };
      case (?cache) { cache };
    };
    userCache.add(key, value);
  };

  public query ({ caller }) func getCachedData(key : Text) : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get cache data");
    };
    switch (cacheStore.get(caller)) {
      case (null) { null };
      case (?userCache) { userCache.get(key) };
    };
  };

  // --- Terminal Session Persistence ---
  public shared ({ caller }) func saveTerminalSession(session : TerminalSession) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in to save terminal sessions");
    };
    let ownedSession = { session with userId = caller };
    terminalSessions.add(ownedSession.id, ownedSession);
  };

  public query ({ caller }) func loadTerminalSessions() : async [TerminalSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in to load terminal sessions");
    };
    terminalSessions.values().filter(func(s : TerminalSession) : Bool { s.userId == caller }).toArray();
  };

  public shared ({ caller }) func deleteTerminalSession(sessionId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in to delete terminal sessions");
    };
    switch (terminalSessions.get(sessionId)) {
      case (null) { Runtime.trap("Terminal session not found") };
      case (?session) {
        if (session.userId != caller) {
          Runtime.trap("Unauthorized: Cannot delete another user's terminal session");
        };
        terminalSessions.remove(sessionId);
      };
    };
  };

  public shared ({ caller }) func updateCommandHistory(sessionId : Text, command : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in to update command history");
    };
    switch (terminalSessions.get(sessionId)) {
      case (null) { Runtime.trap("Terminal session not found") };
      case (?session) {
        if (session.userId != caller) {
          Runtime.trap("Unauthorized: Cannot modify another user's terminal session");
        };
        let updatedHistory = session.commandHistory.concat([command]);
        let updatedSession = { session with commandHistory = updatedHistory };
        terminalSessions.add(sessionId, updatedSession);
      };
    };
  };

  public shared ({ caller }) func appendOutput(sessionId : Text, output : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be logged in to append output");
    };
    switch (terminalSessions.get(sessionId)) {
      case (null) { Runtime.trap("Terminal session not found") };
      case (?session) {
        if (session.userId != caller) {
          Runtime.trap("Unauthorized: Cannot modify another user's terminal session");
        };
        let updatedHistory = session.outputHistory.concat([output]);
        let updatedSession = { session with outputHistory = updatedHistory };
        terminalSessions.add(sessionId, updatedSession);
      };
    };
  };
};

