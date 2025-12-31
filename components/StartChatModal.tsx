"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, Transition } from "@headlessui/react";
import { X, Search, MessageSquare } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { getCurrentUser } from "@/lib/firebase/auth";
import { startConversation } from "@/lib/firebase/messages";
import { useFriends } from "@/hooks/useFriends";
import SkeletonLoader from "./SkeletonLoader";
import EmptyFriendsView from "./EmptyFriendsView";

interface StartChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationStarted?: (conversationId: string) => void;
  onOpenFriendsDrawer?: () => void;
}

/**
 * StartChatModal Component
 * 
 * A modal for starting conversations with friends.
 * Features:
 * - Fetches current user's accepted friends
 * - Search filter for friends list
 * - Message button for each friend
 * - EmptyState when no friends
 * - Links to Add Friends drawer
 */
export default function StartChatModal({
  isOpen,
  onClose,
  onConversationStarted,
  onOpenFriendsDrawer,
}: StartChatModalProps) {
  const { darkMode } = useTheme();
  const router = useRouter();
  const { friends, isLoading, error: friendsError } = useFriends(isOpen); // Only load when modal is open
  const [filteredFriends, setFilteredFriends] = useState<typeof friends>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isStarting, setIsStarting] = useState<string | null>(null); // Track which conversation is being started
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debug: Log friends when they change
  useEffect(() => {
    if (friends.length > 0) {
      console.log('[StartChatModal] Friends loaded:', friends.length, friends.map(f => ({ name: f.name, username: f.username, email: f.email })));
    } else if (!isLoading) {
      console.log('[StartChatModal] No friends found. Error:', friendsError);
    }
  }, [friends, isLoading, friendsError]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when modal closes
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter friends based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFriends(friends);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = friends.filter((friend) => {
      // Get all searchable fields
      const name = (friend.name || "").toLowerCase();
      const username = (friend.username || "").toLowerCase();
      const email = (friend.email || "").toLowerCase();
      
      // Check if query matches any part of name, username, or email
      // Also split by spaces to handle "first last" name searches
      const nameParts = name.split(/\s+/);
      const usernameParts = username.split(/\s+/);
      
      return (
        name.includes(query) ||
        username.includes(query) ||
        email.includes(query) ||
        nameParts.some(part => part.includes(query)) ||
        usernameParts.some(part => part.includes(query)) ||
        query.split(/\s+/).some(q => name.includes(q) || username.includes(q))
      );
    });
    setFilteredFriends(filtered);
  }, [searchQuery, friends]);

  // Handle starting conversation with a friend
  const handleStartConversation = async (friendId: string) => {
    try {
      setIsStarting(friendId);
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error("No current user");
        return;
      }

      // Start conversation (checks if exists, creates if not)
      const { conversationId, error } = await startConversation(
        currentUser.uid,
        friendId
      );

      if (error) {
        console.error("Error starting conversation:", error);
        alert("Failed to start conversation. Please try again.");
        return;
      }

      if (!conversationId) {
        console.error("No conversation ID returned");
        alert("Failed to start conversation. Please try again.");
        return;
      }

      // Close modal
      onClose();

      // Notify parent if callback provided
      if (onConversationStarted) {
        onConversationStarted(conversationId);
      }

      // Redirect to messages detail page with conversation ID
      router.push(`/home/messages/${conversationId}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsStarting(null);
    }
  };

  // Handle opening friends drawer
  const handleSearchForPeople = () => {
    onClose();
    if (onOpenFriendsDrawer) {
      onOpenFriendsDrawer();
    }
  };

  return (
    <Transition show={isOpen} as="div">
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel
              className={`w-full max-w-md rounded-2xl shadow-2xl ${
                darkMode ? "bg-slate-800" : "bg-white"
              }`}
            >
              {/* Header */}
              <div
                className={`flex items-center justify-between p-4 border-b ${
                  darkMode ? "border-slate-700" : "border-slate-200"
                }`}
              >
                <Dialog.Title
                  className={`text-xl font-bold ${
                    darkMode ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  Start Conversation
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    darkMode
                      ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search friends by name..."
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? "bg-slate-700 text-slate-100 border-slate-600 placeholder-slate-400"
                        : "bg-slate-50 text-slate-900 border-slate-300 placeholder-slate-500"
                    }`}
                    aria-label="Search friends"
                  />
                </div>
              </div>

              {/* Friends List */}
              <div
                className={`max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent ${
                  darkMode ? "border-slate-700" : "border-slate-200"
                }`}
              >
                {/* State 1: Loading - Shimmering skeleton list */}
                {isLoading ? (
                  <div className="p-4">
                    <SkeletonLoader count={5} />
                  </div>
                ) : filteredFriends.length > 0 ? (
                  /* State 3: Success - Searchable list */
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredFriends.map((friend) => {
                      const displayName = friend.name || friend.username || friend.email;
                      const isStartingThis = isStarting === friend.id;
                      return (
                        <div
                          key={friend.id}
                          className={`px-4 py-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                            darkMode ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {/* Avatar */}
                          {friend.photoURL ? (
                            <img
                              src={friend.photoURL}
                              alt={displayName}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                                darkMode ? "bg-blue-600" : "bg-blue-500"
                              }`}
                            >
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Friend Info */}
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`font-semibold text-sm truncate ${
                                darkMode ? "text-slate-100" : "text-slate-900"
                              }`}
                            >
                              {displayName}
                            </h3>
                            {friend.username && (
                              <p
                                className={`text-xs truncate ${
                                  darkMode ? "text-slate-400" : "text-slate-600"
                                }`}
                              >
                                @{friend.username}
                              </p>
                            )}
                          </div>

                          {/* Message Button */}
                          <button
                            type="button"
                            onClick={() => handleStartConversation(friend.id)}
                            disabled={isStartingThis || !!isStarting}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 inline-flex items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                              darkMode
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                            aria-label={`Start conversation with ${displayName}`}
                          >
                            {isStartingThis ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Starting...</span>
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-4 h-4" />
                                <span>Message</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* State 2: Empty - EmptyFriendsView */
                  <div className="p-6">
                    {searchQuery.trim() ? (
                      // Search returned no results
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p
                          className={`text-sm mb-2 ${
                            darkMode ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          No friends match "{searchQuery}". Try a different search term.
                        </p>
                        {friends.length > 0 && (
                          <p
                            className={`text-xs mt-1 ${
                              darkMode ? "text-slate-500" : "text-slate-500"
                            }`}
                          >
                            You have {friends.length} friend{friends.length !== 1 ? 's' : ''} in total.
                          </p>
                        )}
                      </div>
                    ) : (
                      // No friends at all
                      <EmptyFriendsView
                        onFindFriends={handleSearchForPeople}
                      />
                    )}
                  </div>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

