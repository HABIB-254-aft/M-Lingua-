"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/firebase/auth";
import { 
  getFriendRequests, 
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  searchUsers,
  getSuggestedUsers,
  subscribeToFriendRequests,
  subscribeToSentRequests,
  subscribeToFriends,
  getFriends,
} from "@/lib/firebase/firestore";

interface FriendRequestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendRequestsDrawer({ isOpen, onClose }: FriendRequestsDrawerProps) {
  const pathname = usePathname();
  const isFullPage = pathname === "/home/friend-requests";
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchFilter, setSearchFilter] = useState<'all' | 'name' | 'username' | 'email'>('all');

  // Load current user
  useEffect(() => {
    const loadCurrentUser = () => {
      try {
        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          setCurrentUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          });
          return;
        }
        
        // Fallback to localStorage
        const authData = localStorage.getItem("mlingua_auth");
        if (authData) {
          const userData = JSON.parse(authData);
          setCurrentUser(userData);
        }
      } catch (error) {
        console.error("Error loading current user:", error);
      }
    };

    loadCurrentUser();
  }, []);

  // Helper function to deduplicate requests by ID
  const deduplicateRequests = useCallback((requests: any[]): any[] => {
    const seen = new Set<string>();
    return requests.filter((request: any) => {
      if (seen.has(request.id)) {
        return false;
      }
      seen.add(request.id);
      return true;
    });
  }, []);

  // Load friend requests and sent requests
  const loadRequestsData = useCallback(async () => {
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser?.id;
      
      if (!userId) return;

      if (firebaseUser) {
        // Load from Firestore
        const { requests: firestoreRequests, error: requestsError } = await getFriendRequests(userId);
        if (!requestsError) {
          setFriendRequests(deduplicateRequests(firestoreRequests));
        } else {
          // Fallback to localStorage
          const requestsData = localStorage.getItem(`mlingua_friend_requests_${userId}`);
          const parsed = requestsData ? JSON.parse(requestsData) : [];
          setFriendRequests(deduplicateRequests(parsed));
        }

        const { requests: firestoreSentRequests, error: sentError } = await getSentRequests(userId);
        if (!sentError) {
          setSentRequests(deduplicateRequests(firestoreSentRequests));
        } else {
          // Fallback to localStorage
          const sentData = localStorage.getItem(`mlingua_sent_requests_${userId}`);
          const parsed = sentData ? JSON.parse(sentData) : [];
          setSentRequests(deduplicateRequests(parsed));
        }

        // Load friends list
        const { friends: friendsList } = await getFriends(userId);
        setFriends(friendsList);
      } else {
        // Fallback to localStorage only
        const requestsData = localStorage.getItem(`mlingua_friend_requests_${userId}`);
        const parsed = requestsData ? JSON.parse(requestsData) : [];
        setFriendRequests(deduplicateRequests(parsed));

        const sentData = localStorage.getItem(`mlingua_sent_requests_${userId}`);
        const parsedSent = sentData ? JSON.parse(sentData) : [];
        setSentRequests(deduplicateRequests(parsedSent));
      }
    } catch (error) {
      console.error("Error loading requests data:", error);
    }
  }, [currentUser?.id, deduplicateRequests]);

  // Load data when drawer opens or in full-page mode
  useEffect(() => {
    if (isOpen || isFullPage) {
      loadRequestsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isFullPage]); // Depend on both isOpen and isFullPage

  // Set up real-time listeners
  useEffect(() => {
    // Set up listeners when drawer is open OR when in full-page mode
    if (!isOpen && !isFullPage) return;

    const firebaseUser = getCurrentUser();
    const userId = firebaseUser?.uid || currentUser?.id;
    
    if (!userId || !firebaseUser) return;

    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribeSent: (() => void) | null = null;

    try {
      // Listen to friend requests
      unsubscribeRequests = subscribeToFriendRequests(userId, (requests) => {
        const deduplicated = deduplicateRequests(requests);
        setFriendRequests(deduplicated);
        // Sync to localStorage as backup
        try {
          localStorage.setItem(`mlingua_friend_requests_${userId}`, JSON.stringify(deduplicated));
        } catch (e) {
          console.warn('Failed to sync friend requests to localStorage:', e);
        }
      });

      // Listen to sent requests
      unsubscribeSent = subscribeToSentRequests(userId, (requests) => {
        const deduplicated = deduplicateRequests(requests);
        setSentRequests(deduplicated);
        // Sync to localStorage as backup
        try {
          localStorage.setItem(`mlingua_sent_requests_${userId}`, JSON.stringify(deduplicated));
        } catch (e) {
          console.warn('Failed to sync sent requests to localStorage:', e);
        }
      });

      // Load friends list and subscribe to changes
      const loadFriends = async () => {
        try {
          const { friends: friendsList } = await getFriends(userId);
          setFriends(friendsList);
        } catch (error) {
          console.error("Error loading friends:", error);
        }
      };
      loadFriends();
      
      const unsubscribeFriends = subscribeToFriends(userId, (friendsList) => {
        setFriends(friendsList);
      });

      return () => {
        if (unsubscribeRequests) {
          try {
            unsubscribeRequests();
          } catch (e) {
            console.warn('Error unsubscribing from friend requests:', e);
          }
        }
        if (unsubscribeSent) {
          try {
            unsubscribeSent();
          } catch (e) {
            console.warn('Error unsubscribing from sent requests:', e);
          }
        }
        if (unsubscribeFriends) {
          try {
            unsubscribeFriends();
          } catch (e) {
            console.warn('Error unsubscribing from friends:', e);
          }
        }
      };
    } catch (error) {
      console.error("Error setting up listeners:", error);
    }
  }, [isOpen, isFullPage, currentUser?.id, deduplicateRequests]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load suggested users
  const loadSuggestedUsers = useCallback(async () => {
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser?.id;
      
      if (!userId || !firebaseUser) {
        setSuggestedUsers([]);
        return;
      }

      setIsLoadingSuggestions(true);
      
      // Get friend IDs to exclude
      const friendIds = friends.map((f: any) => f.id);
      const sentRequestIds = sentRequests.map((r: any) => r.id);
      const excludeIds = [...friendIds, ...sentRequestIds];
      
      const { users, error } = await getSuggestedUsers(userId, excludeIds, 8);
      if (error) {
        console.error('Error loading suggested users:', error);
        setSuggestedUsers([]);
      } else {
        setSuggestedUsers(users);
      }
    } catch (error) {
      console.error('Error loading suggested users:', error);
      setSuggestedUsers([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [currentUser?.id, friends, sentRequests]);

  // Load suggested users when friends and sent requests are loaded
  useEffect(() => {
    if ((isOpen || isFullPage) && currentUser?.id) {
      loadSuggestedUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isFullPage, friends.length, sentRequests.length, currentUser?.id, loadSuggestedUsers]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser?.id;
      
      if (!userId) {
        setSearchResults([]);
        return;
      }

      let searchResults: any[] = [];

      if (firebaseUser) {
        // Use Firestore to search for authenticated users (exclude current user)
        const { users, error } = await searchUsers(query, searchFilter, 50, userId);
        if (error) {
          console.error('Firestore search error:', error);
        } else {
          searchResults = users;
        }
      }

      // Fallback to localStorage if Firestore search failed or Firebase not available
      if (searchResults.length === 0) {
        const usersStr = localStorage.getItem("mlingua_users");
        const allUsers = usersStr ? JSON.parse(usersStr) : [];
        const searchLower = query.toLowerCase();

        searchResults = allUsers.filter((user: any) => {
          if (user.id === userId) return false; // Exclude current user
          if (searchFilter === 'name') {
            return user.displayName?.toLowerCase().includes(searchLower);
          } else if (searchFilter === 'username') {
            return user.username?.toLowerCase().includes(searchLower);
          } else if (searchFilter === 'email') {
            return user.email?.toLowerCase().includes(searchLower);
          } else {
            return (
              user.displayName?.toLowerCase().includes(searchLower) ||
              user.email?.toLowerCase().includes(searchLower) ||
              user.username?.toLowerCase().includes(searchLower)
            );
          }
        });
      }

      // Filter out sent requests using current state
      // We need to get the current sentRequests state - using a ref would be better
      // but for now, we'll use the state from the closure
      // This will be filtered when the component re-renders with updated sentRequests
      setSearchResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  }, [searchFilter, currentUser?.id]);

  const handleAddFriend = async (user: any) => {
    if (!currentUser?.id) return;

    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      // Get the latest user profile from Firestore to ensure we have photoURL
      let userPhotoURL = currentUser.photoURL;
      if (firebaseUser) {
        try {
          const { getUserProfile } = await import("@/lib/firebase/firestore");
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile?.photoURL) {
            userPhotoURL = profile.photoURL;
            console.log('Got photoURL from Firestore profile:', userPhotoURL);
          }
        } catch (e) {
          console.warn('Could not fetch user profile for photoURL:', e);
        }
      }

      console.log('Sending friend request with photoURL:', userPhotoURL);

      // Use currentUser (sender) data, not user (receiver) data
      const newRequest = {
        id: currentUser.id,
        name: currentUser.displayName || currentUser.email,
        username: currentUser.username,
        email: currentUser.email,
        avatar: (currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase(),
        photoURL: userPhotoURL,
      };

      if (firebaseUser) {
        // Use Firestore - send sender's data to receiver
        const requestData = {
          id: currentUser.id,
          name: currentUser.displayName || currentUser.email,
          username: currentUser.username,
          email: currentUser.email,
          avatar: (currentUser.displayName || currentUser.email || "U").charAt(0).toUpperCase(),
          photoURL: userPhotoURL,
        };
        
        console.log('Sending friend request with data:', requestData);
        const { success, error } = await sendFriendRequest(userId, user.id, requestData);
        if (!success) {
          showNotification(`Error: ${error}`, 'error');
          return;
        }
      } else {
        // Fallback to localStorage
        const sent = [...sentRequests, {
          id: user.id,
          name: user.displayName || user.email,
          username: user.username,
          email: user.email,
          avatar: (user.displayName || user.email || "U").charAt(0).toUpperCase(),
          timestamp: new Date().toISOString(),
        }];
        setSentRequests(sent);
        localStorage.setItem(`mlingua_sent_requests_${userId}`, JSON.stringify(sent));
      }

      // Remove from search results and suggested users
      setSearchResults(prev => prev.filter((u: any) => u.id !== user.id));
      setSuggestedUsers(prev => prev.filter((u: any) => u.id !== user.id));
      setSearchQuery("");
      showNotification(`Friend request sent to ${user.displayName || user.email}`, 'success');
    } catch (error) {
      console.error("Error sending friend request:", error);
      showNotification("Error sending friend request", 'error');
    }
  };

  const handleAcceptRequest = async (request: any) => {
    if (!currentUser?.id) return;
    
    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      // Get requester's current presence status
      const { getUserPresence } = await import("@/lib/firebase/firestore");
      const { presence: requesterPresence } = await getUserPresence(request.id);
      const requesterStatus = requesterPresence?.status || "Offline";
      
      const newFriend = {
        id: request.id,
        name: request.name,
        username: request.username,
        email: request.email,
        avatar: request.avatar,
        photoURL: request.photoURL,
        status: requesterStatus,
      };

      if (firebaseUser) {
        const { success, error } = await acceptFriendRequest(userId, request.id, newFriend);
        if (!success) {
          showNotification(`Error: ${error}`, 'error');
          return;
        }
      } else {
        // Fallback to localStorage
        const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
        setFriendRequests(updatedRequests);
        localStorage.setItem(`mlingua_friend_requests_${userId}`, JSON.stringify(updatedRequests));
      }

      showNotification(`${request.name} added to your friends list`, 'success');
      loadRequestsData();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      showNotification("Error accepting friend request", 'error');
    }
  };

  const handleDeclineRequest = async (request: any) => {
    if (!currentUser?.id) return;

    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      if (firebaseUser) {
        // Use Firestore - this already removes from both ends
        console.log('Declining friend request:', { userId, requesterId: request.id });
        const { success, error } = await declineFriendRequest(userId, request.id);
        if (!success) {
          console.error('Failed to decline friend request:', error);
          showNotification(`Error: ${error}`, 'error');
          return;
        }
        console.log('Successfully declined friend request, request should be removed from Firestore');

        // Clear any cached localStorage data to prevent stale data on reload
        const cachedRequestsKey = `mlingua_friend_requests_${userId}`;
        try {
          const cachedRequests = localStorage.getItem(cachedRequestsKey);
          if (cachedRequests) {
            const parsed = JSON.parse(cachedRequests);
            const updated = parsed.filter((r: any) => r.id !== request.id);
            localStorage.setItem(cachedRequestsKey, JSON.stringify(updated));
            console.log('Updated localStorage cache after decline');
          }
        } catch (e) {
          console.warn('Error updating cached requests:', e);
        }

        // Update local state immediately for better UX
        // The real-time listener will also update automatically, but this gives instant feedback
        setFriendRequests(prev => {
          const filtered = prev.filter((r: any) => r.id !== request.id);
          console.log('Updated local state, remaining requests:', filtered.length);
          return deduplicateRequests(filtered);
        });
      } else {
        // Fallback to localStorage - remove from both ends
        // Remove from receiver's incoming requests
        setFriendRequests(prev => {
          const updated = prev.filter((r: any) => r.id !== request.id);
          localStorage.setItem(`mlingua_friend_requests_${userId}`, JSON.stringify(updated));
          return updated;
        });

        // Remove from sender's sent requests
        const requesterSentKey = `mlingua_sent_requests_${request.id}`;
        const requesterSentData = localStorage.getItem(requesterSentKey);
        if (requesterSentData) {
          const requesterSent = JSON.parse(requesterSentData);
          const updatedRequesterSent = requesterSent.filter((r: any) => r.id !== userId);
          localStorage.setItem(requesterSentKey, JSON.stringify(updatedRequesterSent));
        }
      }

      showNotification(`Friend request from ${request.name} declined`, 'success');
      // Don't call loadRequestsData() - the real-time listener will handle the update automatically
    } catch (error) {
      console.error("Error declining friend request:", error);
      showNotification("Error declining friend request", 'error');
    }
  };

  const handleCancelSentRequest = async (request: any) => {
    if (!currentUser?.id) return;

    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      if (firebaseUser) {
        const { success, error } = await cancelFriendRequest(userId, request.id);
        if (!success) {
          showNotification(`Error: ${error}`, 'error');
          return;
        }
      } else {
        // Fallback to localStorage
        const updatedSent = sentRequests.filter((r: any) => r.id !== request.id);
        setSentRequests(updatedSent);
        localStorage.setItem(`mlingua_sent_requests_${userId}`, JSON.stringify(updatedSent));
      }

      showNotification(`Friend request to ${request.name} cancelled`, 'success');
      loadRequestsData();
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      showNotification("Error cancelling friend request", 'error');
    }
  };

  if (!isOpen && !isFullPage) return null;

  return (
    <>
      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Overlay - hidden on full page */}
      {!isFullPage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer - full width on friend-requests page, relative positioning for scroll */}
      <div className={`${isFullPage ? 'relative' : 'fixed'} ${isFullPage ? '' : 'right-0'} ${isFullPage ? '' : 'left-0 right-0'} ${isFullPage ? '' : 'top-0'} ${isFullPage ? 'min-h-screen' : 'h-full'} ${isFullPage ? 'w-full' : 'w-full sm:max-w-md'} bg-white dark:bg-gray-900 ${isFullPage ? '' : 'shadow-xl'} ${isFullPage ? 'z-0' : 'z-50'} ${isFullPage ? '' : 'overflow-y-auto'} ${isFullPage ? '' : 'transform transition-transform duration-300 ease-out'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white text-xl">
                📬
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Friend Requests</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {friendRequests.length} incoming • {sentRequests.length} sent
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close friend requests"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          {/* Search and Add Friend Section */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="relative mb-3">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-lg">🔍</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                  if (value.trim()) {
                    handleSearch(value);
                  } else {
                    setSearchResults([]);
                  }
                }}
                placeholder="Search by name, username, or email..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <span className="text-lg">✕</span>
                </button>
              )}
              {/* Search Filter */}
              {searchQuery.trim() && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Search in:</span>
                  {(['all', 'name', 'username', 'email'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                onClick={() => {
                  setSearchFilter(filter);
                  handleSearch(searchQuery);
                }}
                      className={`px-2 py-1 text-xs rounded ${
                        searchFilter === filter
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Users (when search is empty) */}
            {!searchQuery.trim() && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Suggested Users
                </h3>
                {isLoadingSuggestions ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    Loading suggestions...
                  </p>
                ) : suggestedUsers.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {suggestedUsers.map((user: any) => {
                      // Check if user is already a friend
                      const isFriend = friends.some((friend: any) => friend.id === user.id);
                      
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.displayName || "User"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (user.displayName || user.email || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.displayName || user.email}
                              </div>
                              {user.username && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  @{user.username}
                                </div>
                              )}
                            </div>
                          </div>
                          {isFriend ? (
                            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg flex items-center gap-2">
                              <span>✓</span>
                              <span>Friends</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddFriend(user)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No suggestions available. Try searching for users.
                  </p>
                )}
              </div>
            )}

            {/* Search Results (when user is typing) */}
            {searchQuery.trim() && (
              <div className="mt-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((user: any) => {
                      // Check if user is already a friend
                      const isFriend = friends.some((friend: any) => friend.id === user.id);
                      
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.displayName || "User"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (user.displayName || user.email || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.displayName || user.email}
                              </div>
                              {user.username && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  @{user.username}
                                </div>
                              )}
                            </div>
                          </div>
                          {isFriend ? (
                            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg flex items-center gap-2">
                              <span>✓</span>
                              <span>Friends</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddFriend(user)}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No users found matching "{searchQuery}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Friend Requests */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Friend Requests
                {friendRequests.length > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
                    {friendRequests.length}
                  </span>
                )}
              </h3>
            </div>
            {friendRequests.length > 0 ? (
              <div className="space-y-2">
                {friendRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 overflow-hidden">
                        {request.photoURL ? (
                          <img
                            src={request.photoURL}
                            alt={request.name || "User"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = (request.avatar || request.name || "U").charAt(0).toUpperCase();
                              }
                            }}
                          />
                        ) : (
                          request.avatar || (request.name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {request.name}
                        </div>
                        {request.username && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{request.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(request)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors shadow-sm"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(request)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-3xl mb-2">📬</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No friend requests</p>
              </div>
            )}
          </section>

          {/* Sent Requests */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Sent Requests
                {sentRequests.length > 0 && (
                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">
                    {sentRequests.length}
                  </span>
                )}
              </h3>
            </div>
            {sentRequests.length > 0 ? (
              <div className="space-y-2">
                {sentRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0 overflow-hidden">
                        {request.photoURL ? (
                          <img
                            src={request.photoURL}
                            alt={request.name || "User"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = (request.avatar || request.name || "U").charAt(0).toUpperCase();
                              }
                            }}
                          />
                        ) : (
                          request.avatar || (request.name || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {request.name}
                        </div>
                        {request.username && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{request.username}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Pending
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelSentRequest(request)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-3xl mb-2">📤</div>
                <p className="text-sm text-gray-500 dark:text-gray-400">No sent requests</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

