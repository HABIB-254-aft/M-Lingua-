"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, serverTimestamp, Timestamp, DocumentData, QuerySnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { getUserProfile, getUserPresence } from "@/lib/firebase/firestore";
import { Send, ArrowLeft } from "lucide-react";
import MessageBubble from "../MessageBubble";

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | Date;
  read: boolean;
}

interface ConversationData {
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp | Date;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

interface FriendInfo {
  id: string;
  name: string;
  photoURL?: string;
  isOnline: boolean;
}

/**
 * ChatHeader Component
 * Displays friend's avatar, name, and online status
 */
function ChatHeader({ friendInfo }: { friendInfo: FriendInfo | null }) {
  const { darkMode } = useTheme();
  const router = useRouter();

  if (!friendInfo) {
    return (
      <div
        className={`sticky top-0 z-10 px-4 py-3 border-b ${
          darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.push("/home/messages")}
            className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              darkMode
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            aria-label="Back to messages"
            title="Back to messages"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className={`w-10 h-10 rounded-full ${darkMode ? "bg-slate-700" : "bg-slate-300"} animate-pulse`} />
          <div className="flex-1">
            <div className={`h-4 w-32 rounded ${darkMode ? "bg-slate-700" : "bg-slate-300"} animate-pulse mb-2`} />
            <div className={`h-3 w-20 rounded ${darkMode ? "bg-slate-700" : "bg-slate-300"} animate-pulse`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`sticky top-0 z-10 px-4 py-3 border-b ${
        darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Back Button */}
        <button
          onClick={() => router.push("/home/messages")}
          className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            darkMode
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          aria-label="Back to messages"
          title="Back to messages"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {friendInfo.photoURL ? (
            <img
              src={friendInfo.photoURL}
              alt={friendInfo.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                darkMode ? "bg-blue-600" : "bg-blue-500"
              }`}
            >
              {friendInfo.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Online Status Dot */}
          {friendInfo.isOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 pulse-online" />
          )}
        </div>

        {/* Name and Status */}
        <div className="flex-1 min-w-0">
          <h2
            className={`font-semibold text-base truncate ${
              darkMode ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {friendInfo.name}
          </h2>
          <p
            className={`text-xs truncate ${
              friendInfo.isOnline
                ? darkMode
                  ? "text-emerald-400"
                  : "text-emerald-600"
                : darkMode
                ? "text-slate-400"
                : "text-slate-500"
            }`}
          >
            {friendInfo.isOnline ? "Online" : "Offline"}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * MessageList Component
 * Scrollable container for messages with auto-scroll
 */
function MessageList({
  messages,
  currentUserId,
  friendInfo,
}: {
  messages: Message[];
  currentUserId: string;
  friendInfo: FriendInfo | null;
}) {
  const { darkMode } = useTheme();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  if (messages.length === 0) {
    return (
      <div
        className="flex-1 flex items-center justify-center p-8"
        ref={messagesContainerRef}
      >
        <div className="text-center">
          <p
            className={`text-sm ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            No messages yet. Start the conversation!
          </p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent"
    >
      <div className="flex flex-col">
        {messages.map((message) => {
          // Determine receiver ID (the other participant)
          const receiverId = message.senderId === currentUserId
            ? friendInfo?.id || ""
            : currentUserId;

          return (
            <MessageBubble
              key={message.id}
              id={message.id}
              text={message.text}
              senderId={message.senderId}
              receiverId={receiverId}
              currentUserId={currentUserId}
              timestamp={message.timestamp}
              read={message.read}
              senderAvatar={message.senderId === currentUserId ? undefined : friendInfo?.photoURL}
              senderName={message.senderId === currentUserId ? undefined : friendInfo?.name}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

/**
 * MessageInput Component
 * Fixed bottom bar with text input and send button
 */
function MessageInput({
  conversationId,
  currentUserId,
  onSend,
  disabled,
}: {
  conversationId: string;
  currentUserId: string;
  onSend: () => void;
  disabled: boolean;
}) {
  const { darkMode } = useTheme();
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || isSending || disabled) return;

    const text = messageText.trim();
    setMessageText("");
    setIsSending(true);

    try {
      // Create message document
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const messageData = {
        text,
        senderId: currentUserId,
        createdAt: serverTimestamp(),
        read: false,
      };
      
      console.log('[MessageInput] Sending message:', {
        conversationId,
        text,
        senderId: currentUserId,
      });
      
      await addDoc(messagesRef, messageData);

      // Update parent conversation document
      const conversationRef = doc(db, "conversations", conversationId);
      await updateDoc(conversationRef, {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onSend();
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
      setMessageText(text); // Restore message text on error
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className={`sticky bottom-0 z-10 px-4 py-3 border-t ${
        darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
      }`}
    >
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending || disabled}
          className={`flex-1 px-4 py-2.5 rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            darkMode
              ? "bg-slate-800 text-slate-100 border-slate-600 placeholder-slate-400"
              : "bg-slate-50 text-slate-900 border-slate-300 placeholder-slate-500"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label="Message input"
        />
        <button
          type="submit"
          disabled={!messageText.trim() || isSending || disabled}
          className={`p-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            darkMode
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          aria-label="Send message"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * ChatInterface Component
 * Main chat interface with header, message list, and input
 */
export default function ChatInterface({
  conversationId,
  currentUserId,
}: ChatInterfaceProps) {
  const { darkMode } = useTheme();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendInfo, setFriendInfo] = useState<FriendInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load friend info
  useEffect(() => {
    if (!conversation || !conversation.participants) return;

    const loadFriendInfo = async () => {
      try {
        // Find the other participant (not current user)
        const friendId = conversation.participants.find((id) => id !== currentUserId);
        if (!friendId) {
          setError("Invalid conversation: participant not found");
          return;
        }

        // Fetch friend profile and presence
        const [profile, presenceResult] = await Promise.all([
          getUserProfile(friendId),
          getUserPresence(friendId),
        ]);

        if (profile) {
          setFriendInfo({
            id: friendId,
            name: profile.displayName || profile.username || profile.email || "Unknown",
            photoURL: profile.photoURL,
            isOnline: presenceResult.presence?.status === "Online",
          });
        } else {
          setFriendInfo({
            id: friendId,
            name: "Unknown User",
            isOnline: false,
          });
        }
      } catch (err: any) {
        console.error("Error loading friend info:", err);
        setError("Failed to load friend information");
      }
    };

    loadFriendInfo();
  }, [conversation, currentUserId]);

  // Listen to conversation document
  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setIsLoading(false);
      return;
    }

    // Reset loading state when conversationId changes
    setIsLoading(true);
    setError(null);

    const conversationRef = doc(db, "conversations", conversationId);
    const unsubscribe = onSnapshot(
      conversationRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as ConversationData;
          setConversation(data);
          setError(null);
        } else {
          setError("Conversation not found");
          setConversation(null);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error listening to conversation:", err);
        if (err.code === "permission-denied") {
          setError("You don't have permission to view this conversation");
        } else {
          setError("Failed to load conversation");
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, currentUserId]);

  // Listen to messages subcollection
  useEffect(() => {
    if (!conversationId) {
      // Only clear messages if conversationId is explicitly null/undefined
      // Don't clear on initial mount when conversationId might not be ready yet
      if (conversationId === null || conversationId === undefined) {
        setMessages([]);
      }
      return;
    }

    // Don't clear messages immediately - wait for new data to arrive
    // This prevents flickering on refresh
    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const messagesList: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamp to Date if it exists
          let timestamp: Date | Timestamp = new Date();
          if (data.createdAt) {
            if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
              timestamp = data.createdAt.toDate();
            } else {
              timestamp = data.createdAt;
            }
          }
          messagesList.push({
            id: doc.id,
            text: data.text || "",
            senderId: data.senderId || "",
            timestamp: timestamp,
            read: data.read || false,
          });
        });
        // Only update messages if we got data, or if the list is empty (to clear old messages from different conversation)
        setMessages(messagesList);
      },
      (err) => {
        console.error("Error listening to messages:", err);
        if (err.code === "permission-denied") {
          setError("You don't have permission to view messages");
        }
        // Don't clear messages on error - keep existing messages visible
      }
    );

    return () => {
      // Only unsubscribe, don't clear messages here
      unsubscribe();
    };
  }, [conversationId]);

  // Handle message sent callback
  const handleMessageSent = useCallback(() => {
    // Message will be added via real-time listener
    // This callback can be used for additional actions if needed
  }, []);

  // Error state - only show if we have no conversation and no messages
  // If we have messages, show them even if there's an error (might be a temporary issue)
  if (error && !isLoading && !conversation && messages.length === 0) {
    return (
      <div
        className={`flex-1 flex items-center justify-center p-8 ${
          darkMode ? "bg-slate-900" : "bg-slate-50"
        }`}
      >
        <div className="text-center max-w-md">
          <p
            className={`text-lg font-semibold mb-2 ${
              darkMode ? "text-slate-200" : "text-slate-900"
            }`}
          >
            {error}
          </p>
          <p
            className={`text-sm ${
              darkMode ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  // Show loading overlay only if we have no data at all
  // If we have messages or conversation data, show the interface even if still loading
  const showLoadingOverlay = isLoading && messages.length === 0 && !conversation && !error;

  return (
    <div
      className={`flex flex-col h-full relative ${
        darkMode ? "bg-slate-900" : "bg-slate-50"
      }`}
    >
      {/* Loading Overlay - Only show if we have absolutely no data */}
      {showLoadingOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-50">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p
              className={`text-sm ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Loading conversation...
            </p>
          </div>
        </div>
      )}

      {/* Chat Header - Sticky at top */}
      <ChatHeader friendInfo={friendInfo} />

      {/* Message List - Scrollable middle section */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        friendInfo={friendInfo}
      />

      {/* Message Input - Sticky at bottom */}
      <MessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
        onSend={handleMessageSent}
        disabled={!!error || isLoading}
      />
    </div>
  );
}

