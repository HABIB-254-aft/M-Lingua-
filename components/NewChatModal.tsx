"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Search, UserPlus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { searchUsers } from "@/lib/firebase/firestore";
import { getCurrentUser } from "@/lib/firebase/auth";
import { createConversation } from "@/lib/firebase/messages";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (conversationId: string) => void;
}

interface SearchResult {
  id: string;
  displayName?: string;
  username?: string;
  email: string;
  photoURL?: string;
}

/**
 * NewChatModal Component
 * 
 * A modal for searching and starting new conversations.
 * Features:
 * - Large focused search bar
 * - User list from Firebase
 * - Creates conversation document on user selection
 * - Empty state with invite message
 */
export default function NewChatModal({
  isOpen,
  onClose,
  onConversationCreated,
}: NewChatModalProps) {
  const { darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when modal closes
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Search users when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setSearchResults([]);
          return;
        }

        const { users, error } = await searchUsers(searchQuery, "all", 20, currentUser.uid);
        if (error) {
          console.error("Error searching users:", error);
          setSearchResults([]);
        } else {
          // Filter out current user
          const filteredUsers = users.filter(
            (user) => user.id !== currentUser.uid
          );
          setSearchResults(filteredUsers);
        }
      } catch (error) {
        console.error("Error in search:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle user selection and create conversation
  const handleSelectUser = async (user: SearchResult) => {
    try {
      setIsCreating(true);
      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.error("No current user");
        return;
      }

      // Create conversation
      const { conversationId, error } = await createConversation(
        currentUser.uid,
        user.id
      );

      if (error) {
        console.error("Error creating conversation:", error);
        alert("Failed to create conversation. Please try again.");
        return;
      }

      // Close modal and notify parent
      onClose();
      if (onConversationCreated && conversationId) {
        onConversationCreated(conversationId);
      }
    } catch (error) {
      console.error("Error selecting user:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsCreating(false);
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
                  New Message
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

              {/* Search Input */}
              <div className="p-4">
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
                    placeholder="Search by name or email..."
                    className={`w-full pl-10 pr-4 py-3 text-base rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode
                        ? "bg-slate-700 text-slate-100 border-slate-600 placeholder-slate-400"
                        : "bg-slate-50 text-slate-900 border-slate-300 placeholder-slate-500"
                    }`}
                    aria-label="Search users"
                  />
                </div>
              </div>

              {/* Results List */}
              <div
                className={`max-h-96 overflow-y-auto border-t ${
                  darkMode ? "border-slate-700" : "border-slate-200"
                }`}
              >
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Searching...
                      </p>
                    </div>
                  </div>
                ) : hasSearched && searchResults.length === 0 ? (
                  // Empty State
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div
                      className={`text-5xl mb-4 ${
                        darkMode ? "text-slate-600" : "text-slate-300"
                      }`}
                    >
                      👤
                    </div>
                    <p
                      className={`text-base font-medium mb-2 ${
                        darkMode ? "text-slate-200" : "text-slate-900"
                      }`}
                    >
                      No users found. Invite them to M-Lingua!
                    </p>
                    <p
                      className={`text-sm mb-6 ${
                        darkMode ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Try a different search term or share M-Lingua with your friends
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // TODO: Implement invite friend functionality
                        console.log("Invite friend");
                      }}
                      className={`px-6 py-3 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 inline-flex items-center gap-2 ${
                        darkMode
                          ? "bg-blue-600 hover:bg-blue-700 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>Invite Friend</span>
                    </button>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {searchResults.map((user) => {
                      const displayName =
                        user.displayName || user.username || user.email;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          disabled={isCreating}
                          className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            darkMode ? "text-slate-100" : "text-slate-900"
                          }`}
                          aria-label={`Start chat with ${displayName}`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
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

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <h3
                                className={`font-semibold text-sm truncate ${
                                  darkMode ? "text-slate-100" : "text-slate-900"
                                }`}
                              >
                                {displayName}
                              </h3>
                              {user.username && (
                                <p
                                  className={`text-xs truncate ${
                                    darkMode ? "text-slate-400" : "text-slate-600"
                                  }`}
                                >
                                  @{user.username}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Initial state
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Search
                      className={`w-12 h-12 mb-4 ${
                        darkMode ? "text-slate-600" : "text-slate-300"
                      }`}
                    />
                    <p
                      className={`text-sm ${
                        darkMode ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Start typing to search for users
                    </p>
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

