"use client";

import { useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/firebase/auth";
import { 
  getFriendRequests, 
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  searchUsers,
  subscribeToFriendRequests,
  subscribeToSentRequests,
} from "@/lib/firebase/firestore";

interface FriendRequestsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendRequestsDrawer({ isOpen, onClose }: FriendRequestsDrawerProps) {
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
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
          setFriendRequests(firestoreRequests);
        } else {
          // Fallback to localStorage
          const requestsData = localStorage.getItem(`mlingua_friend_requests_${userId}`);
          setFriendRequests(requestsData ? JSON.parse(requestsData) : []);
        }

        const { requests: firestoreSentRequests, error: sentError } = await getSentRequests(userId);
        if (!sentError) {
          setSentRequests(firestoreSentRequests);
        } else {
          // Fallback to localStorage
          const sentData = localStorage.getItem(`mlingua_sent_requests_${userId}`);
          setSentRequests(sentData ? JSON.parse(sentData) : []);
        }
      } else {
        // Fallback to localStorage only
        const requestsData = localStorage.getItem(`mlingua_friend_requests_${userId}`);
        setFriendRequests(requestsData ? JSON.parse(requestsData) : []);

        const sentData = localStorage.getItem(`mlingua_sent_requests_${userId}`);
        setSentRequests(sentData ? JSON.parse(sentData) : []);
      }
    } catch (error) {
      console.error("Error loading requests data:", error);
    }
  }, [currentUser?.id]);

  // Load data when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadRequestsData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen, not loadRequestsData to avoid infinite loops

  // Set up real-time listeners
  useEffect(() => {
    if (!isOpen) return;

    const firebaseUser = getCurrentUser();
    const userId = firebaseUser?.uid || currentUser?.id;
    
    if (!userId || !firebaseUser) return;

    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribeSent: (() => void) | null = null;

    try {
      // Listen to friend requests
      unsubscribeRequests = subscribeToFriendRequests(userId, (requests) => {
        setFriendRequests(requests);
      });

      // Listen to sent requests
      unsubscribeSent = subscribeToSentRequests(userId, (requests) => {
        setSentRequests(requests);
      });
    } catch (error) {
      console.error("Error setting up listeners:", error);
    }

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
    };
  }, [isOpen, currentUser?.id]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
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
        // Use Firestore to search for authenticated users
        const { users, error } = await searchUsers(query, searchFilter, 50);
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

      // Filter out current user, existing friends, and sent requests
      const filtered = searchResults.filter((user: any) => {
        if (user.id === userId) return false;
        if (sentRequests.find((r: any) => r.id === user.id)) return false;
        return true;
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleAddFriend = async (user: any) => {
    if (!currentUser?.id) return;

    try {
      const firebaseUser = getCurrentUser();
      const userId = firebaseUser?.uid || currentUser.id;

      const newRequest = {
        id: user.id,
        name: user.displayName || user.email,
        username: user.username,
        email: user.email,
        photoURL: user.photoURL,
        avatar: (user.displayName || user.email || "U").charAt(0).toUpperCase(),
      };

      if (firebaseUser) {
        // Use Firestore
        const { success, error } = await sendFriendRequest(userId, user.id, newRequest);
        if (!success) {
          showNotification(`Error: ${error}`, 'error');
          return;
        }
      } else {
        // Fallback to localStorage
        const sent = [...sentRequests, {
          ...newRequest,
          timestamp: new Date().toISOString(),
        }];
        setSentRequests(sent);
        localStorage.setItem(`mlingua_sent_requests_${userId}`, JSON.stringify(sent));
      }

      // Remove from search results
      setSearchResults(searchResults.filter((u: any) => u.id !== user.id));
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
        const { success, error } = await declineFriendRequest(userId, request.id);
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

      showNotification(`Friend request from ${request.name} declined`, 'success');
      loadRequestsData();
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

  if (!isOpen) return null;

  // Check if we're on the friend-requests page (full page mode)
  const isFullPage = typeof window !== "undefined" && window.location.pathname === "/home/friend-requests";

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
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim()) {
                    handleSearch(e.target.value);
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

            {/* Search Results */}
            {searchQuery.trim() && (
              <div className="mt-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((user: any) => (
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
                        <button
                          type="button"
                          onClick={() => handleAddFriend(user)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    ))}
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

