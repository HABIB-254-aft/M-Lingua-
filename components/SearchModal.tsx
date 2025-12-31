"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { X, Search, UserPlus } from "lucide-react";
import { searchUsers } from "@/lib/firebase/firestore";
import { getCurrentUser } from "@/lib/firebase/auth";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

interface SearchResult {
  id: string;
  displayName?: string;
  username?: string;
  email: string;
  photoURL?: string;
}

/**
 * SearchModal Component
 * 
 * A modal for searching and selecting users to start a new chat.
 * Features:
 * - Backdrop blur overlay
 * - High-contrast search bar with focus ring
 * - Results list with user avatars
 * - Empty state with "Invite Friend" button
 * - WCAG compliant text contrast
 * - Keyboard navigation (ESC to close, Enter to select)
 */
export default function SearchModal({
  isOpen,
  onClose,
  onSelectUser,
}: SearchModalProps) {
  const { darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      // Small delay to ensure modal is rendered
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

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
          // Users are already filtered by searchUsers function
          setSearchResults(users);
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

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle user selection
  const handleSelectUser = (user: SearchResult) => {
    onSelectUser(user.id);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-modal-title"
    >
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-md rounded-2xl shadow-2xl ${
          darkMode ? "bg-slate-800" : "bg-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            darkMode ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <h2
            id="search-modal-title"
            className={`text-xl font-bold ${
              darkMode ? "text-slate-100" : "text-slate-900"
            }`}
          >
            New Message
          </h2>
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
              placeholder="Search by name, username, or email..."
              className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                <div
                  className={`w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2`}
                />
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
                No users found
              </p>
              <p
                className={`text-sm mb-6 ${
                  darkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Try a different search term or invite a friend to join
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
                    className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
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
            // Initial state - no search yet
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
      </div>
    </div>
  );
}

