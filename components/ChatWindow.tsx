"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  friend: any; // Friend user object
  currentUser: any; // Current logged-in user
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export default function ChatWindow({ isOpen, onClose, friend, currentUser }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const friendTypingCheckIntervalRef = useRef<number | null>(null);

  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const sendBtnRef = useRef<HTMLButtonElement | null>(null);
  const markedAsReadRef = useRef(false);

  // Load messages from localStorage
  const loadMessages = useCallback(() => {
    if (!currentUser || !friend) return;

    try {
      const chatKey = getChatKey(currentUser.id, friend.id);
      const messagesData = localStorage.getItem(chatKey);
      if (messagesData) {
        const loadedMessages = JSON.parse(messagesData);
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  }, [currentUser?.id, friend?.id]);

  // Get chat storage key (always use same key regardless of sender/receiver order)
  const getChatKey = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `mlingua_chat_${sortedIds[0]}_${sortedIds[1]}`;
  };

  // Get typing indicator key
  const getTypingKey = (userId1: string, userId2: string) => {
    const sortedIds = [userId1, userId2].sort();
    return `mlingua_typing_${sortedIds[0]}_${sortedIds[1]}`;
  };

  // Set typing indicator (when current user is typing)
  const setTypingIndicator = useCallback((typing: boolean) => {
    if (!currentUser || !friend) return;
    
    try {
      const typingKey = getTypingKey(currentUser.id, friend.id);
      if (typing) {
        const typingData = {
          userId: currentUser.id,
          timestamp: Date.now(),
        };
        localStorage.setItem(typingKey, JSON.stringify(typingData));
      } else {
        localStorage.removeItem(typingKey);
      }
    } catch (error) {
      console.error("Error setting typing indicator:", error);
    }
  }, [currentUser?.id, friend?.id]);

  // Check if friend is typing
  const checkFriendTyping = useCallback(() => {
    if (!currentUser || !friend) return;

    try {
      const typingKey = getTypingKey(currentUser.id, friend.id);
      const typingData = localStorage.getItem(typingKey);
      
      if (typingData) {
        const data = JSON.parse(typingData);
        const now = Date.now();
        const timeDiff = now - data.timestamp;
        
        // If friend is typing and it's recent (within last 3 seconds)
        if (data.userId === friend.id && timeDiff < 3000) {
          setFriendIsTyping(true);
        } else {
          setFriendIsTyping(false);
        }
      } else {
        setFriendIsTyping(false);
      }
    } catch (error) {
      setFriendIsTyping(false);
    }
  }, [currentUser?.id, friend?.id]);

  // Save messages to localStorage
  const saveMessages = useCallback((msgs: Message[]) => {
    if (!currentUser || !friend) return;

    try {
      const chatKey = getChatKey(currentUser.id, friend.id);
      localStorage.setItem(chatKey, JSON.stringify(msgs));
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  }, [currentUser?.id, friend?.id]);

  // Send message
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !currentUser || !friend) return;

    // Clear typing indicator when sending
    setTypingIndicator(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      receiverId: friend.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false, // Will be marked as read when receiver opens chat
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setNewMessage("");

    // Update unread count for receiver (simulate notification)
    updateUnreadCount(friend.id, currentUser.id, true);

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [newMessage, currentUser, friend, messages, saveMessages, setTypingIndicator]);

  // Update unread message count
  const updateUnreadCount = (userId: string, fromUserId: string, increment: boolean) => {
    try {
      const unreadKey = `mlingua_unread_${userId}`;
      const unreadData = localStorage.getItem(unreadKey);
      let unreadCounts: Record<string, number> = unreadData ? JSON.parse(unreadData) : {};

      if (increment) {
        unreadCounts[fromUserId] = (unreadCounts[fromUserId] || 0) + 1;
      } else {
        delete unreadCounts[fromUserId];
      }

      localStorage.setItem(unreadKey, JSON.stringify(unreadCounts));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('unreadCountUpdated'));
    } catch (error) {
      console.error("Error updating unread count:", error);
    }
  };

  // Mark messages as read (using functional update to avoid dependency on messages)
  const markMessagesAsRead = useCallback(() => {
    if (!currentUser || !friend) return;

    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map(msg => 
        msg.receiverId === currentUser.id && !msg.read
          ? { ...msg, read: true }
          : msg
      );

      const hasChanges = updatedMessages.some((msg, idx) => msg.read !== prevMessages[idx]?.read);
      
      if (hasChanges) {
        try {
          const chatKey = getChatKey(currentUser.id, friend.id);
          localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
        } catch (error) {
          console.error("Error saving messages:", error);
        }
        updateUnreadCount(currentUser.id, friend.id, false);
        return updatedMessages;
      }
      
      return prevMessages;
    });
  }, [currentUser?.id, friend?.id]);

  // Load messages when chat opens or friend/user changes
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !friend?.id) {
      markedAsReadRef.current = false;
      setTypingIndicator(false);
      if (friendTypingCheckIntervalRef.current) {
        clearInterval(friendTypingCheckIntervalRef.current);
        friendTypingCheckIntervalRef.current = null;
      }
      return;
    }
    
    markedAsReadRef.current = false;
    loadMessages();
    checkFriendTyping();
    
    // Auto-refresh messages every 2 seconds (simulate real-time)
    const interval = setInterval(() => {
      loadMessages();
    }, 2000);

    // Check for friend typing status every 1 second
    const typingInterval = setInterval(() => {
      checkFriendTyping();
    }, 1000);
    friendTypingCheckIntervalRef.current = typingInterval as unknown as number;

    return () => {
      clearInterval(interval);
      if (friendTypingCheckIntervalRef.current) {
        clearInterval(friendTypingCheckIntervalRef.current);
        friendTypingCheckIntervalRef.current = null;
      }
      setTypingIndicator(false);
    };
  }, [isOpen, currentUser?.id, friend?.id, loadMessages, checkFriendTyping, setTypingIndicator]);

  // Mark messages as read once after loading (only once per chat session)
  useEffect(() => {
    if (isOpen && currentUser?.id && friend?.id && messages.length > 0 && !markedAsReadRef.current) {
      markMessagesAsRead();
      markedAsReadRef.current = true;
    }
  }, [isOpen, currentUser?.id, friend?.id, messages.length, markMessagesAsRead]);

  // Scroll to bottom when new messages arrive or friend starts typing
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, friendIsTyping]);

  // Voice navigation functions
  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch (_e) {
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

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) return;

      const r = new SpeechRec();
      r.lang = "en-US";
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;

      r.onresult = (ev: any) => {
        try {
          const transcript = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || "";
          const textCmd = transcript.trim().toLowerCase();
          if (!textCmd) return;

          stopVoiceRecognition();

          if (textCmd.includes("send") || textCmd.includes("send message")) {
            if (newMessage.trim()) {
              sendBtnRef.current?.click();
            }
            return;
          }

          if (textCmd.includes("close") || textCmd.includes("back") || textCmd.includes("go back")) {
            onClose();
            return;
          }

          // If not a command, treat as message text
          setNewMessage(transcript.trim());
        } catch (_e) {
          // ignore
        }
      };

      r.onerror = () => {
        stopVoiceRecognition();
      };

      r.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        if (isOpen && !isVoiceSpeakingRef.current) {
          setTimeout(() => startVoiceRecognition(), 500);
        }
      };

      voiceRecognitionRef.current = r;
      try {
        r.start();
        isVoiceListeningRef.current = true;
      } catch (_err) {
        voiceRecognitionRef.current = null;
        isVoiceListeningRef.current = false;
      }
    } catch (_e) {
      // ignore
    }
  }, [isOpen, onClose, newMessage]);

  // Voice navigation setup
  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition();
      spokenRef.current = false;
      return;
    }

    spokenRef.current = false;
    const timer = setTimeout(() => {
      try {
        const mode = localStorage.getItem("accessibilityMode");
        if (mode === "blind" && !spokenRef.current) {
          spokenRef.current = true;
          const message = `Chat with ${friend?.name || friend?.displayName || "Friend"}. Type your message and press Enter to send. Say 'send' to send, or 'close' to close.`;
          const synth = window.speechSynthesis;
          if (synth) {
            try { synth.cancel(); } catch (_e) {}
            isVoiceSpeakingRef.current = true;
            const u = new SpeechSynthesisUtterance(message);
            u.lang = "en-US";
            u.addEventListener("end", () => {
              isVoiceSpeakingRef.current = false;
              startVoiceRecognition();
            });
            synth.speak(u);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      stopVoiceRecognition();
    };
  }, [isOpen, friend, startVoiceRecognition, stopVoiceRecognition, onClose]);

  if (!isOpen) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[70] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Window */}
      <div className="fixed right-0 bottom-0 w-full max-w-md h-[600px] bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 dark:bg-blue-700">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg flex-shrink-0">
              {friend?.avatar || (friend?.name || friend?.displayName || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">
                {friend?.name || friend?.displayName || "Friend"}
              </h3>
              <p className="text-blue-100 text-xs">
                {friend?.status === 'Online' ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
            aria-label="Close chat"
          >
            ✕
          </button>
        </div>

        {/* Messages Container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <p className="text-sm break-words">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {formatTime(message.timestamp)}
                      {isOwnMessage && message.read && (
                        <span className="ml-1">✓✓</span>
                      )}
                      {isOwnMessage && !message.read && (
                        <span className="ml-1">✓</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          {friendIsTyping && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm italic">
                <div className="flex items-center gap-1">
                  <span>{friend?.name || friend?.displayName || "Friend"}</span>
                  <span> is typing</span>
                  <span className="flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-end gap-2">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                
                // Set typing indicator when user types
                setTypingIndicator(true);
                if (typingTimeoutRef.current) {
                  clearTimeout(typingTimeoutRef.current);
                }
                setIsTyping(true);
                
                // Clear typing indicator after 2 seconds of inactivity
                typingTimeoutRef.current = window.setTimeout(() => {
                  setIsTyping(false);
                  setTypingIndicator(false);
                }, 2000);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none"
              aria-label="Message input"
            />
            <button
              ref={sendBtnRef}
              type="button"
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:visible:outline-none focus:visible:ring-2 focus:visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

