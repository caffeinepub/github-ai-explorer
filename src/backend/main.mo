import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Set "mo:core/Set";
import Nat "mo:core/Nat";

// Enable migration on upgrade
import Migration "migration";
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

  type BookmarkEntry = {
    repoId : Text;
    tags : [Tag];
    note : ?Note;
  };

  public type Notification = {
    id : Text;
    userId : Principal;
    notificationType : Text;
    title : Text;
    body : Text;
    read : Bool;
    createdAt : Int;
  };

  public type Team = {
    id : Text;
    name : Text;
    ownerId : Principal;
    sharedBookmarks : [Text];
    createdAt : Int;
  };

  // Persistent Storage Maps
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userSettings = Map.empty<Principal, UserSettings>();
  let userBookmarks = Map.empty<Principal, List.List<BookmarkEntry>>();
  let githubTokens = Map.empty<Principal, Text>();
  let terminalSessions = Map.empty<Text, TerminalSession>();
  let cacheStore = Map.empty<Principal, Map.Map<Text, Text>>();
  let userPATs = Map.empty<Principal, Text>();
  let notifications = Map.empty<Principal, List.List<Notification>>();

  // Team Management Maps
  let teams = Map.empty<Text, Team>();
  let teamMembers = Map.empty<Text, Set.Set<Principal>>();

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

  // ------------------------- Team Collaboration Features -------------------------

  /// Create a new team
  public shared ({ caller }) func createTeam(teamId : Text, name : Text) : async Team {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can create teams");
    };

    if (teams.containsKey(teamId)) {
      Runtime.trap("A team with this id already exists");
    };

    let newTeam : Team = {
      id = teamId;
      name;
      ownerId = caller;
      sharedBookmarks = [];
      createdAt = Time.now();
    };

    let initialMembers = Set.fromIter([caller].values());

    teams.add(teamId, newTeam);
    teamMembers.add(teamId, initialMembers);

    newTeam;
  };

  /// Get my teams (teams where I am a member)
  public query ({ caller }) func getMyTeams() : async [Team] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can get their teams");
    };

    teams.values().filter(func(team) { getTeamMemberIdsInternal(team.id).contains(caller) }).toArray();
  };

  func getTeamMemberIdsInternal(teamId : Text) : Set.Set<Principal> {
    switch (teamMembers.get(teamId)) {
      case (null) { Set.empty() };
      case (?members) { members };
    };
  };

  /// Get team members
  public query ({ caller }) func getTeamMembers(teamId : Text) : async [Principal] {
    ignore processTeamQuery(teamId, caller, false); // Will trap if not authorized

    let members = getTeamMemberIdsInternal(teamId).toArray();
    members;
  };

  /// Add team member
  public shared ({ caller }) func addTeamMember(teamId : Text, userId : Principal) : async () {
    ignore processTeamQuery(teamId, caller, true); // Will trap if not authorized

    let currentMembers = getTeamMemberIdsInternal(teamId);

    if (currentMembers.contains(userId)) {
      Runtime.trap("User is already a team member");
    };

    let updatedMembers = Set.fromIter(currentMembers.values().concat([userId].values()));
    teamMembers.add(teamId, updatedMembers);
  };

  /// Remove team member
  public shared ({ caller }) func removeTeamMember(teamId : Text, userId : Principal) : async () {
    ignore processTeamQuery(teamId, caller, true); // Will trap if not authorized

    removeTeamMemberInternal(teamId, userId);
  };

  /// Remove team member helper
  func removeTeamMemberInternal(teamId : Text, userId : Principal) {
    let currentMembers = getTeamMemberIdsInternal(teamId);

    if (not currentMembers.contains(userId)) {
      Runtime.trap("User is not a team member");
    };

    let updatedMemberList = currentMembers.toArray();
    let filteredMembers = updatedMemberList.filter(func(member) { member != userId });
    let updatedMembers = Set.fromIter(filteredMembers.values());
    teamMembers.add(teamId, updatedMembers);
  };

  func processTeamQuery(teamId : Text, caller : Principal, requiresAdmin : Bool) : Team {
    switch (teams.get(teamId)) {
      case (null) { Runtime.trap("Team not found") };
      case (?team) {
        let members = getTeamMemberIdsInternal(teamId);

        if (caller != team.ownerId and not members.contains(caller) and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Must be a team member to query team info");
        };

        if (requiresAdmin and caller != team.ownerId and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Must be team owner to perform action");
        };

        team;
      };
    };
  };

  /// Get team shared bookmarks
  public query ({ caller }) func getTeamBookmarks(teamId : Text) : async [Text] {
    let team = processTeamQuery(teamId, caller, false);
    team.sharedBookmarks;
  };

  /// Add team shared bookmark
  public shared ({ caller }) func addTeamBookmark(teamId : Text, repoId : Text) : async () {
    let team = processTeamQuery(teamId, caller, false);

    if (team.sharedBookmarks.any(func(bookmark) { bookmark == repoId })) {
      Runtime.trap("Repository is already bookmarked for this team");
    };

    let updatedBookmarks = team.sharedBookmarks.concat([repoId]);
    let updatedTeam = { team with sharedBookmarks = updatedBookmarks };
    teams.add(teamId, updatedTeam);
  };

  /// Remove team shared bookmark
  public shared ({ caller }) func removeTeamBookmark(teamId : Text, repoId : Text) : async () {
    let team = processTeamQuery(teamId, caller, true);
    let newBookmarks = team.sharedBookmarks.filter(func(entry) { entry != repoId });

    let updatedTeam = { team with sharedBookmarks = newBookmarks };
    teams.add(teamId, updatedTeam);
  };

  // ------------------------- Notification System -------------------------

  public shared ({ caller }) func addNotification(title : Text, body : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add notifications");
    };

    let newNotification : Notification = {
      id = caller.toText() # Time.now().toText();
      userId = caller;
      notificationType = "info";
      title;
      body;
      read = false;
      createdAt = Time.now();
    };

    let userNotifications = switch (notifications.get(caller)) {
      case (null) { List.empty<Notification>() };
      case (?list) { list };
    };
    userNotifications.add(newNotification);
    notifications.add(caller, userNotifications);
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get notifications");
    };

    let userNotifications = switch (notifications.get(caller)) {
      case (null) { List.empty<Notification>() };
      case (?list) { list };
    };
    userNotifications.toArray();
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    switch (notifications.get(caller)) {
      case (null) { Runtime.trap("No notifications found") };
      case (?userNotifications) {
        let notificationsArray = userNotifications.toArray();
        let updatedNotificationsArray = notificationsArray.map(
          func(notification) { if (notification.id == notificationId) { { notification with read = true } } else { notification } }
        );
        let updatedNotifications = List.fromArray<Notification>(updatedNotificationsArray);
        notifications.add(caller, updatedNotifications);
      };
    };
  };

  public shared ({ caller }) func clearNotifications() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear notifications");
    };

    notifications.remove(caller);
  };
};
