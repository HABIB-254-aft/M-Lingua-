"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Plus, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/firebase/auth";
import { getUserProfile, getUserPresence } from "@/lib/firebase/firestore";
import { subscribeToConversations, Conversation } from "@/lib/firebase/messages";
import StartChatModal from "./StartChatModal";

interface ConversationCard {
  id: string;
  displayName: string;
  photoURL?: string;
  isOnline: boolean;
  lastMessage?: string;
  timestamp?: string;
  unread?: number;
}

interface ChatSidebarProps {
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string | null) => void;
  onConversationCreated?: (conversationId: string) => void;
  onOpenFriendsDrawer?: () => void;
}

/**
 * ChatSidebar Component
 * 
 * A sidebar showing recent conversations (1/3 screen width on desktop).
 * Features:
 * - Plus icon button to open NewChatModal
 * - Conversation cards with avatars, status dots, and timestamps
 * - Active state with blue background and left border
 */
export default function ChatSidebar({
  selectedConversationId,
  onSelectConversation,
  onConversationCreated,
  onOpenFriendsDrawer,
}: ChatSidebarProps) {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationCard[]>([]);
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle navigation to home
  const handleGoHome = () => {
    // Clear active conversation state by calling the parent handler
    if (onSelectConversation) {
      onSelectConversation(null);
    }
    // Navigate to home
    router.push("/home");
  };

  // Load conversations and user data
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const loadConversations = async (conversationsList: Conversation[]) => {
      const conversationCards: ConversationCard[] = await Promise.all(
        conversationsList.map(async (conv) => {
          // Get the other participant (not current user)
          const otherUserId = conv.participants.find(
            (id) => id !== currentUser.uid
          );

          if (!otherUserId) {
            return null;
          }

          // Get user profile
          const profile = await getUserProfile(otherUserId);
          if (!profile) {
            return null;
          }

          // Get user presence
          const { presence } = await getUserPresence(otherUserId);

          // Format timestamp
          let timestamp = "";
          if (conv.lastMessageTime) {
            const time = conv.lastMessageTime instanceof Date
              ? conv.lastMessageTime
              : (conv.lastMessageTime as any).toDate();
            const now = new Date();
            const diffMs = now.getTime() - time.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) {
              timestamp = "now";
            } else if (diffMins < 60) {
              timestamp = `${diffMins}m ago`;
            } else if (diffHours < 24) {
              timestamp = `${diffHours}h ago`;
            } else if (diffDays < 7) {
              timestamp = `${diffDays}d ago`;
            } else {
              timestamp = time.toLocaleDateString();
            }
          }

          return {
            id: conv.id,
            displayName: profile.displayName || profile.username || profile.email,
            photoURL: profile.photoURL,
            isOnline: presence?.status === "Online",
            lastMessage: conv.lastMessage,
            timestamp,
            unread: 0, // TODO: Calculate unread count
          };
        })
      );

      // Filter out null values
      const validCards = conversationCards.filter(
        (card): card is ConversationCard => card !== null
      );

      setConversations(validCards);
      setIsLoading(false);
    };

    // Subscribe to conversations
    const unsubscribe = subscribeToConversations(currentUser.uid, (conversationsList) => {
      loadConversations(conversationsList);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleConversationStarted = (conversationId: string) => {
    if (onConversationCreated) {
      onConversationCreated(conversationId);
    }
    setShowStartChatModal(false);
  };

  return (
    <>
      <div
        className={`w-full md:w-1/3 lg:w-1/3 flex flex-col border-r ${
          darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"
        }`}
      >
        {/* Breadcrumb - Back to Dashboard */}
        <div
          className={`px-4 pt-3 pb-2 border-b ${
            darkMode ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={handleGoHome}
            className={`flex items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded ${
              darkMode
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
            aria-label="Back to Dashboard"
            title="Back to Dashboard (Alt+H or Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Header with Plus Button */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            darkMode ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <h2
            className={`text-lg font-bold ${
              darkMode ? "text-slate-100" : "text-slate-900"
            }`}
          >
            Messages
          </h2>
          <button
            type="button"
            onClick={() => setShowStartChatModal(true)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            aria-label="Start conversation"
            title="Start conversation"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p
                  className={`text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Loading conversations...
                </p>
              </div>
            </div>
          ) : conversations.length > 0 ? (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {conversations.map((conv) => {
                const isSelected = selectedConversationId === conv.id;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full px-4 py-3 text-left transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? darkMode
                          ? "bg-blue-600/10"
                          : "bg-blue-600/10"
                        : darkMode
                          ? "hover:bg-slate-800"
                          : "hover:bg-slate-50"
                    }`}
                    aria-label={`Conversation with ${conv.displayName}`}
                  >
                    {/* Active State - Thick Blue Left Border */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400" />
                    )}

                    <div className="flex items-center gap-3">
                      {/* Avatar with Green Pulse Dot */}
                      <div className="relative flex-shrink-0">
                        {conv.photoURL ? (
                          <img
                            src={conv.photoURL}
                            alt={conv.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                              darkMode ? "bg-blue-600" : "bg-blue-500"
                            }`}
                          >
                            {conv.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Green Pulse Dot for Online */}
                        {conv.isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          {/* Bold Display Name */}
                          <h3
                            className={`font-bold text-sm truncate ${
                              darkMode ? "text-slate-100" : "text-slate-900"
                            }`}
                          >
                            {conv.displayName}
                          </h3>
                          {/* Timestamp */}
                          {conv.timestamp && (
                            <span
                              className={`text-xs whitespace-nowrap ml-2 flex-shrink-0 ${
                                darkMode ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {conv.timestamp}
                            </span>
                          )}
                        </div>
                        {/* Greyed-out Last Message */}
                        {conv.lastMessage && (
                          <p
                            className={`text-sm truncate ${
                              darkMode ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {conv.lastMessage}
                          </p>
                        )}
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
                  darkMode ? "text-slate-600" : "text-slate-400"
                }`}
              >
                💬
              </div>
              <p
                className={`text-sm mb-4 ${
                  darkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                No conversations yet
              </p>
              <button
                type="button"
                onClick={() => setShowStartChatModal(true)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Start Chat Modal */}
      <StartChatModal
        isOpen={showStartChatModal}
        onClose={() => setShowStartChatModal(false)}
        onConversationStarted={handleConversationStarted}
        onOpenFriendsDrawer={onOpenFriendsDrawer}
      />
    </>
  );
}

