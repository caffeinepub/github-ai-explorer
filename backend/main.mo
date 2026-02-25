import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


// Enable migration on upgrade

actor {
  type BookmarkID = Text;
  type Tag = Text;
  type Note = Text;

  public type UserProfile = {
    name : Text;
  };

  // Bookmarked repository entry with metadata
  type BookmarkEntry = {
    repoId : BookmarkID;
    tags : [Tag];
    note : ?Note;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let userBookmarks = Map.empty<Principal, List.List<BookmarkEntry>>();
  let githubTokens = Map.empty<Principal, Text>();

  // Initialize the authentication system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // --- User Profile Functions ---
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
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
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // --- GitHub Personal Access Token Functions ---
  public shared ({ caller }) func setMyGithubToken(token : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to set GitHub token");
    };
    githubTokens.add(caller, token);
  };

  public shared ({ caller }) func removeMyGithubToken() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to remove GitHub token");
    };
    githubTokens.remove(caller);
  };

  public query ({ caller }) func getMyGithubToken() : async ?Text {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to get GitHub token");
    };
    githubTokens.get(caller);
  };

  // --- Bookmark Functions ---
  public shared ({ caller }) func addBookmark(repoId : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to add bookmarks");
    };

    let newBookmark = {
      repoId;
      tags = [];
      note = null;
    };

    switch (userBookmarks.get(caller)) {
      case (null) {
        let bookmarks = List.empty<BookmarkEntry>();
        bookmarks.add(newBookmark);
        userBookmarks.add(caller, bookmarks);
      };
      case (?bookmarks) {
        if (bookmarks.any(func(entry) { entry.repoId == repoId })) {
          Runtime.trap("Repo is already bookmarked");
        };
        bookmarks.add(newBookmark);
      };
    };
  };

  public shared ({ caller }) func removeBookmark(repoId : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to remove bookmarks");
    };

    switch (userBookmarks.get(caller)) {
      case (null) { Runtime.trap("No bookmarks found for user") };
      case (?bookmarks) {
        if (not bookmarks.any(func(entry) { entry.repoId == repoId })) {
          Runtime.trap("Bookmark not found");
        };
        let newBookmarks = bookmarks.filter(func(entry) { entry.repoId != repoId });
        userBookmarks.add(caller, newBookmarks);
      };
    };
  };

  public shared ({ caller }) func updateBookmarkTags(repoId : Text, tags : [Tag]) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to update tags");
    };

    switch (userBookmarks.get(caller)) {
      case (null) { Runtime.trap("No bookmarks found for user") };
      case (?bookmarks) {
        if (not bookmarks.any(func(entry) { entry.repoId == repoId })) {
          Runtime.trap("Bookmark not found");
        };
        let updatedBookmarks = bookmarks.map<BookmarkEntry, BookmarkEntry>(
          func(entry) {
            if (entry.repoId == repoId) { { entry with tags } } else {
              entry;
            };
          }
        );
        userBookmarks.add(caller, updatedBookmarks);
      };
    };
  };

  public shared ({ caller }) func updateBookmarkNote(repoId : Text, note : ?Note) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to update note");
    };

    switch (userBookmarks.get(caller)) {
      case (null) { Runtime.trap("No bookmarks found for user") };
      case (?bookmarks) {
        if (not bookmarks.any(func(entry) { entry.repoId == repoId })) {
          Runtime.trap("Bookmark not found");
        };
        let updatedBookmarks = bookmarks.map<BookmarkEntry, BookmarkEntry>(
          func(entry) {
            if (entry.repoId == repoId) { { entry with note } } else { entry };
          }
        );
        userBookmarks.add(caller, updatedBookmarks);
      };
    };
  };

  public query ({ caller }) func getBookmarks() : async [BookmarkEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Must be logged in to get bookmarks");
    };

    switch (userBookmarks.get(caller)) {
      case (null) { [] };
      case (?bookmarks) { bookmarks.toArray() };
    };
  };

  public query ({ caller }) func checkBookmark(repoId : Text) : async Bool {
    switch (userBookmarks.get(caller)) {
      case (null) { false };
      case (?bookmarks) { bookmarks.any(func(entry) { entry.repoId == repoId }) };
    };
  };
};
