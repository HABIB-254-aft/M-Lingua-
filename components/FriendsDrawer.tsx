"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsDrawer({ isOpen, onClose }: FriendsDrawerProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

  // Voice navigation functions
  const speakMessage = useCallback((message: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();
      isVoiceSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "en-US";
      utterance.onend = () => {
        isVoiceSpeakingRef.current = false;
        if (isOpen && isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      utterance.onerror = () => {
        isVoiceSpeakingRef.current = false;
        if (isOpen && isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      synth.speak(utterance);
    } catch {
      isVoiceSpeakingRef.current = false;
    }
  }, [isOpen]);

  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    } finally {
      voiceRecognitionRef.current = null;
      isVoiceListeningRef.current = false;
    }
  }, []);

  const startVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;
    if (isVoiceListeningRef.current) return;
    if (isVoiceSpeakingRef.current) return;
    if (isTypingRef.current) return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) return;

      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        try {
          const transcript = (event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript) || "";
          handleVoiceCommand(transcript.trim().toLowerCase());
        } catch {
          // ignore
        }
      };

      recognition.onerror = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
      };

      recognition.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        if (isOpen && !isVoiceSpeakingRef.current && !isTypingRef.current) {
          setTimeout(() => {
            if (isOpen && !isVoiceSpeakingRef.current && !isTypingRef.current) {
              startVoiceRecognition();
            }
          }, 500);
        }
      };

      voiceRecognitionRef.current = recognition;
      isVoiceListeningRef.current = true;
      recognition.start();
    } catch {
      isVoiceListeningRef.current = false;
      voiceRecognitionRef.current = null;
    }
  }, [isOpen]);

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current !== null) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const scheduleRecognitionRestartAfterIdle = useCallback(() => {
    clearTypingTimer();
    isTypingRef.current = true;
    typingTimerRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      typingTimerRef.current = null;
      if (isOpen && !isVoiceSpeakingRef.current) {
        startVoiceRecognition();
      }
    }, 2000);
  }, [clearTypingTimer, startVoiceRecognition, isOpen]);

  const handleVoiceCommand = useCallback((command: string) => {
    stopVoiceRecognition();

    if (command.includes("close") || command.includes("back")) {
      speakMessage("Closing friends.");
      onClose();
    } else if (command.includes("add friend") || command.includes("add")) {
      setShowAddFriend(true);
      speakMessage("Add friend section opened.");
    } else if (command.includes("repeat")) {
      const friendsCount = friends.length;
      const requestsCount = friendRequests.length;
      speakMessage(`Friends page. You have ${friendsCount} friend${friendsCount !== 1 ? "s" : ""} and ${requestsCount} friend request${requestsCount !== 1 ? "s" : ""}. Say close to close, or repeat to hear options again.`);
    } else {
      speakMessage("Command not recognized. Say close to close, or repeat to hear options again.");
    }
  }, [friends.length, friendRequests.length, onClose, stopVoiceRecognition, speakMessage]);

  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition();
      spokenRef.current = false;
      return;
    }

    // Load current user
    try {
      const authData = localStorage.getItem("mlingua_auth");
      if (authData) {
        setCurrentUser(JSON.parse(authData));
      } else {
        onClose();
        router.push("/login");
        return;
      }
    } catch {
      onClose();
      router.push("/login");
      return;
    }

    // Load friends data
    loadFriendsData();

    // Announce drawer opening and start voice recognition if blind mode is enabled
    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind" && !spokenRef.current) {
        spokenRef.current = true;
        const friendsCount = friends.length;
        const requestsCount = friendRequests.length;
        const message = `Friends page. You have ${friendsCount} friend${friendsCount !== 1 ? "s" : ""} and ${requestsCount} friend request${requestsCount !== 1 ? "s" : ""}. Say close to close, or repeat to hear options again.`;
        speakMessage(message);
      }
    } catch {
      // ignore
    }

    return () => {
      clearTypingTimer();
      stopVoiceRecognition();
      if (typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, onClose, router, speakMessage, stopVoiceRecognition, clearTypingTimer, friends.length, friendRequests.length]);

  const loadFriendsData = () => {
    try {
      // Load friends list
      const friendsData = localStorage.getItem("mlingua_friends");
      setFriends(friendsData ? JSON.parse(friendsData) : []);

      // Load friend requests
      const requestsData = localStorage.getItem("mlingua_friend_requests");
      setFriendRequests(requestsData ? JSON.parse(requestsData) : []);

      // Load sent requests
      const sentData = localStorage.getItem("mlingua_sent_requests");
      setSentRequests(sentData ? JSON.parse(sentData) : []);
    } catch {
      // ignore
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const usersData = localStorage.getItem("mlingua_users");
      const allUsers = usersData ? JSON.parse(usersData) : [];
      const currentUserId = currentUser?.id;

      // Filter out current user and existing friends
      const friendsIds = friends.map((f: any) => f.id);
      const sentRequestIds = sentRequests.map((r: any) => r.id);

      const filtered = allUsers.filter((user: any) => {
        if (user.id === currentUserId) return false;
        if (friendsIds.includes(user.id)) return false;
        if (sentRequestIds.includes(user.id)) return false;

        const searchLower = query.toLowerCase();
        return (
          user.displayName?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower) ||
          user.username?.toLowerCase().includes(searchLower)
        );
      });

      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    }
  };

  const handleAddFriend = (user: any) => {
    try {
      const newRequest = {
        id: user.id,
        name: user.displayName || user.email,
        username: user.username,
        email: user.email,
        avatar: (user.displayName || user.email || "U").charAt(0).toUpperCase(),
        timestamp: new Date().toISOString(),
      };

      const sent = [...sentRequests, newRequest];
      setSentRequests(sent);
      localStorage.setItem("mlingua_sent_requests", JSON.stringify(sent));

      // Remove from search results
      setSearchResults(searchResults.filter((u: any) => u.id !== user.id));
      setSearchQuery("");
      alert(`Friend request sent to ${newRequest.name}`);
    } catch {
      alert("Error sending friend request");
    }
  };

  const handleAcceptRequest = (request: any) => {
    try {
      // Add to friends list
      const newFriend = {
        id: request.id,
        name: request.name,
        username: request.username,
        email: request.email,
        avatar: request.avatar,
        status: "Offline",
      };

      const updatedFriends = [...friends, newFriend];
      setFriends(updatedFriends);
      localStorage.setItem("mlingua_friends", JSON.stringify(updatedFriends));

      // Remove from requests
      const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
      setFriendRequests(updatedRequests);
      localStorage.setItem("mlingua_friend_requests", JSON.stringify(updatedRequests));

      alert(`${request.name} added to your friends list`);
    } catch {
      alert("Error accepting friend request");
    }
  };

  const handleDeclineRequest = (request: any) => {
    try {
      const updatedRequests = friendRequests.filter((r: any) => r.id !== request.id);
      setFriendRequests(updatedRequests);
      localStorage.setItem("mlingua_friend_requests", JSON.stringify(updatedRequests));
      alert(`Friend request from ${request.name} declined`);
    } catch {
      alert("Error declining friend request");
    }
  };

  const handleRemoveFriend = (friend: any) => {
    if (!confirm(`Are you sure you want to remove ${friend.name} from your friends list?`)) {
      return;
    }

    try {
      const updatedFriends = friends.filter((f: any) => f.id !== friend.id);
      setFriends(updatedFriends);
      localStorage.setItem("mlingua_friends", JSON.stringify(updatedFriends));
      alert(`${friend.name} removed from friends list`);
    } catch {
      alert("Error removing friend");
    }
  };

  const handleCancelSentRequest = (request: any) => {
    try {
      const updated = sentRequests.filter((r: any) => r.id !== request.id);
      setSentRequests(updated);
      localStorage.setItem("mlingua_sent_requests", JSON.stringify(updated));
      alert(`Friend request to ${request.name} cancelled`);
    } catch {
      alert("Error cancelling friend request");
    }
  };

  if (!isOpen) return null;

  if (!currentUser) {
    return null; // Will redirect to login
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Friends</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-blue-700"
              aria-label="Close friends"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          {/* Search and Add Friend Section */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  setShowAddFriend(true);
                  handleSearch(e.target.value);
                } else {
                  setShowAddFriend(false);
                  setSearchResults([]);
                }
              }}
              onFocus={() => {
                try {
                  stopVoiceRecognition();
                } catch {
                  // ignore
                }
                isTypingRef.current = true;
                clearTypingTimer();
              }}
              onBlur={() => {
                try {
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              onInput={() => {
                try {
                  isTypingRef.current = true;
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              placeholder="Search by name, username, or email..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600 mb-3"
            />
            <button
              type="button"
              onClick={() => {
                setShowAddFriend(!showAddFriend);
                if (!showAddFriend) {
                  setSearchQuery("");
                  setSearchResults([]);
                }
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
            >
              <span className="text-lg">+</span>
              <span>Add Friend</span>
            </button>

            {showAddFriend && searchQuery.trim() && searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {user.displayName || user.email}
                        </div>
                        {user.username && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            @{user.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddFriend(user)}
                      className="px-4 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friends List */}
          <section className="mb-6">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Friends</h3>
            <hr className="border-gray-200 dark:border-gray-700 mb-3" />
            {friends.length > 0 ? (
              <div className="space-y-2">
                {friends.map((friend: any) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {friend.avatar || (friend.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {friend.name}
                        </div>
                        {friend.username && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            @{friend.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(friend)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                No friends yet. Add friends to get started!
              </p>
            )}
          </section>

          {/* Friend Requests */}
          <section className="mb-6">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Requests</h3>
            <hr className="border-gray-200 dark:border-gray-700 mb-3" />
            {friendRequests.length > 0 ? (
              <div className="space-y-2">
                {friendRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {request.avatar || (request.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {request.name}
                        </div>
                        {request.username && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            @{request.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(request)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(request)}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                No friend requests. Friend requests will appear here.
              </p>
            )}
          </section>

          {/* Sent Requests */}
          <section className="mb-6">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Sent Requests</h3>
            <hr className="border-gray-200 dark:border-gray-700 mb-3" />
            {sentRequests.length > 0 ? (
              <div className="space-y-2">
                {sentRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                        {request.avatar || (request.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {request.name}
                        </div>
                        {request.username && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            @{request.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelSentRequest(request)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                No sent requests.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

