"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import ChatSidebar from "@/components/ChatSidebar";
import FriendsDrawer from "@/components/FriendsDrawer";
import { MessageSquare } from "lucide-react";

/**
 * Messages Page Content
 * 
 * Main messaging interface with:
 * - ChatSidebar (1/3 width) on the left
 * - Chat view on the right (to be implemented)
 * - Keyboard shortcuts for navigation (Esc or Alt+H to go home)
 */
export default function MessagesPageContent() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showFriendsDrawer, setShowFriendsDrawer] = useState(false);

  // Check for conversation ID in URL query params
  useEffect(() => {
    const conversationId = searchParams?.get('id');
    if (conversationId) {
      setSelectedConversationId(conversationId);
      // Clean up URL (remove query param) after setting state
      router.replace('/home/messages', { scroll: false });
    }
  }, [searchParams, router]);

  // Handle navigation to home
  const handleGoHome = useCallback(() => {
    // Clear active conversation state
    setSelectedConversationId(null);
    // Navigate to home
    router.push("/home");
  }, [router]);

  // Keyboard shortcuts: Esc or Alt+H to navigate home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc key to go home
      if (e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        // Only navigate if not in a modal or input field
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          handleGoHome();
        }
      }

      // Alt+H (or Cmd+H on Mac) to go home
      if (e.key === "h" && (e.altKey || e.metaKey) && !e.ctrlKey && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          handleGoHome();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleGoHome]);

  const handleSelectConversation = (conversationId: string | null) => {
    if (conversationId) {
      // Navigate to detail page
      router.push(`/home/messages/${conversationId}`);
    } else {
      // Clear selection - navigate back to messages list
      setSelectedConversationId(null);
      router.push('/home/messages');
    }
  };

  const handleConversationCreated = (conversationId: string) => {
    // Navigate to detail page
    router.push(`/home/messages/${conversationId}`);
  };

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        darkMode ? "bg-slate-900" : "bg-slate-50"
      }`}
    >
      {/* Chat Sidebar - 1/3 width */}
      <ChatSidebar
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onConversationCreated={handleConversationCreated}
        onOpenFriendsDrawer={() => setShowFriendsDrawer(true)}
      />

      {/* Friends Drawer */}
      <FriendsDrawer isOpen={showFriendsDrawer} onClose={() => setShowFriendsDrawer(false)} />

      {/* Chat View - 2/3 width */}
      <div className="flex-1 flex items-center justify-center">
        {selectedConversationId ? (
          // Show loading state - navigation happens in handleSelectConversation
          <div className="text-center p-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p
              className={`text-sm ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Loading conversation...
            </p>
          </div>
        ) : (
          <div className="text-center p-8">
            <MessageSquare
              className={`w-24 h-24 mx-auto mb-4 ${
                darkMode ? "text-slate-600" : "text-slate-300"
              }`}
              strokeWidth={1}
            />
            <p
              className={`text-xl font-semibold mb-2 ${
                darkMode ? "text-slate-300" : "text-slate-700"
              }`}
            >
              Select a conversation to start messaging
            </p>
            <p
              className={`text-sm ${
                darkMode ? "text-slate-500" : "text-slate-500"
              }`}
            >
              Choose a conversation from the sidebar or start a new one
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

