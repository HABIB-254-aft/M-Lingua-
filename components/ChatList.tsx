"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Plus } from "lucide-react";
import SearchModal from "./SearchModal";

export interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  isOnline: boolean;
  avatar?: string;
}

interface ChatListProps {
  chats: ChatItem[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat?: (userId: string) => void;
}

/**
 * ChatList Component
 * 
 * A scrollable list of recent chats with:
 * - Rounded-xl cards with hover/active states
 * - 48px avatars with green status dots
 * - Bold names, truncated messages, timestamps
 * - Unread indicators
 * - FAB button for new messages
 */
export default function ChatList({
  chats,
  selectedChatId,
  onSelectChat,
  onNewChat,
}: ChatListProps) {
  const { darkMode } = useTheme();
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleNewChat = (userId: string) => {
    if (onNewChat) {
      onNewChat(userId);
    }
    setShowSearchModal(false);
  };

  return (
    <>
      <div className={`flex-1 flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-white'}`}>
        {/* FAB Button - New Message */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Messages
          </h2>
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
            aria-label="New message"
            title="New message"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {chats.map((chat) => {
                const isSelected = selectedChatId === chat.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => onSelectChat(chat.id)}
                    className={`w-full px-4 py-3 text-left transition-colors rounded-xl mx-2 my-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? darkMode
                          ? 'bg-slate-800'
                          : 'bg-blue-50'
                        : darkMode
                          ? 'hover:bg-slate-800'
                          : 'hover:bg-blue-50'
                    }`}
                    aria-label={`Chat with ${chat.name}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with Status Dot */}
                      <div className="relative flex-shrink-0">
                        {chat.avatar ? (
                          <img
                            src={chat.avatar}
                            alt={chat.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                              darkMode ? 'bg-blue-600' : 'bg-blue-500'
                            }`}
                          >
                            {chat.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Green Status Dot for Online */}
                        {chat.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          {/* Bold Name */}
                          <h3
                            className={`font-bold text-sm truncate ${
                              darkMode ? 'text-slate-100' : 'text-slate-900'
                            }`}
                          >
                            {chat.name}
                          </h3>
                          {/* Timestamp with Unread Dot */}
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span
                              className={`text-xs whitespace-nowrap ${
                                darkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {chat.timestamp}
                            </span>
                            {/* Unread Blue Dot */}
                            {chat.unread > 0 && (
                              <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                            )}
                          </div>
                        </div>
                        {/* Truncated Last Message */}
                        <p
                          className={`text-sm truncate ${
                            darkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div
                className={`text-4xl mb-4 ${
                  darkMode ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                💬
              </div>
              <p
                className={`text-sm mb-4 ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                No conversations yet
              </p>
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  darkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectUser={handleNewChat}
      />
    </>
  );
}

