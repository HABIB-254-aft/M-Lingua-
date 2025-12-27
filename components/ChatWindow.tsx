"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  reactions?: Record<string, string[]>; // emoji -> array of userIds who reacted
  attachments?: Array<{
    id: string;
    type: 'image' | 'file' | 'audio';
    name: string;
    data: string; // base64 encoded data
    mimeType: string;
    size?: number;
    duration?: number; // audio duration in seconds
  }>;
  edited?: boolean; // whether message was edited
  deleted?: boolean; // whether message was deleted
}

export default function ChatWindow({ isOpen, onClose, friend, currentUser }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null); // message ID
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const friendTypingCheckIntervalRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const reactionPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(40).fill(0.08)); // Initialize with flat line (8% height)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [chatTheme, setChatTheme] = useState<string>('default');
  const shouldAutoScrollRef = useRef<boolean>(true);
  const previousMessagesLengthRef = useRef<number>(0);
  const voiceInputRecognitionRef = useRef<any | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const shouldSendRecordingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingActiveRef = useRef<boolean>(false);

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

  // Load chat theme
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(`mlingua_chat_theme_${currentUser?.id}`);
      if (savedTheme) {
        setChatTheme(savedTheme);
      }
    } catch (e) {
      // ignore
    }
  }, [currentUser?.id]);

  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      // Optionally request permission - we'll do it when first message arrives
    }
  }, []);

  // Show notification for new messages (when chat is not open)
  const showNotification = useCallback((messageText: string, senderName: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (isOpen) return; // Don't notify if chat is open
    if (document.hasFocus()) return; // Don't notify if window is focused

    try {
      const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true';
      if (!notificationsEnabled) return;

      if (Notification.permission === 'granted') {
        new Notification(`${senderName}`, {
          body: messageText || 'Sent an attachment',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: `chat-${friend?.id}`,
          requireInteraction: false,
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`${senderName}`, {
              body: messageText || 'Sent an attachment',
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              tag: `chat-${friend?.id}`,
            });
          }
        });
      }
    } catch (e) {
      console.error('Error showing notification:', e);
    }
  }, [isOpen, friend?.id]);

  // Load messages when chat opens or friend/user changes
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !friend?.id) {
      markedAsReadRef.current = false;
      setTypingIndicator(false);
      if (friendTypingCheckIntervalRef.current) {
        clearInterval(friendTypingCheckIntervalRef.current);
        friendTypingCheckIntervalRef.current = null;
      }
      // Clean up voice input if active
      if (voiceInputRecognitionRef.current) {
        try {
          voiceInputRecognitionRef.current.stop();
        } catch {
          // ignore
        }
        voiceInputRecognitionRef.current = null;
      }
      setIsRecordingVoice(false);
      setShowEmojiPicker(false);
      return;
    }
    
    markedAsReadRef.current = false;
    shouldAutoScrollRef.current = true; // Reset to auto-scroll when chat opens
    previousMessagesLengthRef.current = 0;
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

  // Check if user is near bottom of chat
  const checkIfNearBottom = useCallback(() => {
    if (!chatContainerRef.current) return true;
    const container = chatContainerRef.current;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  }, []);

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    shouldAutoScrollRef.current = checkIfNearBottom();
  }, [checkIfNearBottom]);

  // Scroll to bottom when new messages arrive or friend starts typing (only if user is near bottom)
  useEffect(() => {
    // Check if new messages were added (not just updated)
    const hasNewMessages = messages.length > previousMessagesLengthRef.current;
    previousMessagesLengthRef.current = messages.length;

    // Only auto-scroll if:
    // 1. User is near bottom (hasn't manually scrolled up), OR
    // 2. New messages were just added (user sent a message or new message arrived)
    if (hasNewMessages || shouldAutoScrollRef.current) {
      if (messagesEndRef.current && chatContainerRef.current) {
        const wasNearBottom = checkIfNearBottom();
        if (wasNearBottom || hasNewMessages) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            shouldAutoScrollRef.current = true;
          }, 100);
        }
      }
    }
  }, [messages, friendIsTyping, checkIfNearBottom]);

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
    // Format as HH:MM for same day, or date for older messages
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      // Same day: show time as HH:MM
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      // Different day: show date
      return date.toLocaleDateString();
    }
  };

  // Search functionality - filter messages based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return messages.filter(msg => msg.text.toLowerCase().includes(query));
  }, [searchQuery, messages]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery("");
      setCurrentSearchIndex(-1);
    } else if (e.key === 'Enter' && e.shiftKey === false) {
      e.preventDefault();
      navigateToNextResult();
    } else if (e.key === 'Enter' && e.shiftKey === true) {
      e.preventDefault();
      navigateToPreviousResult();
    }
  };

  const navigateToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
    setCurrentSearchIndex(nextIndex);
    scrollToSearchResult(nextIndex);
  };

  const navigateToPreviousResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToSearchResult(prevIndex);
  };

  const scrollToSearchResult = (index: number) => {
    if (searchResults[index]) {
      const messageId = searchResults[index].id;
      const messageElement = messageRefs.current[messageId];
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Keyboard shortcut: Ctrl/Cmd + F to open search
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset search index when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setCurrentSearchIndex(searchResults.length > 0 ? 0 : -1);
    } else {
      setCurrentSearchIndex(-1);
    }
  }, [searchQuery, searchResults.length]);

  // Scroll to current search result when index changes
  useEffect(() => {
    if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length) {
      scrollToSearchResult(currentSearchIndex);
    }
  }, [currentSearchIndex]);

  // Auto-focus search input when search bar opens
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // File handling functions
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Audio recording functions
  const startRecordingAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up Web Audio API for real-time audio analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;

      // Real-time waveform analysis
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      isRecordingActiveRef.current = true;
      
      // Initialize waveform with flat line
      setWaveformData(Array(40).fill(0.08));
      
      const updateWaveform = () => {
        if (!analyserRef.current || !isRecordingActiveRef.current) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }
        
        // Use time domain data for waveform visualization
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate average volume/amplitude and normalize
        let sum = 0;
        let max = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = Math.abs(dataArray[i] - 128); // Center around 0
          sum += value;
          max = Math.max(max, value);
        }
        const averageAmplitude = sum / dataArray.length;
        const normalizedAmplitude = averageAmplitude / 128; // Normalize to 0-1
        const maxAmplitude = max / 128;
        
        // Threshold for silence (adjust as needed)
        const silenceThreshold = 0.02;
        
        // Generate waveform data - flat line when silent, animated when speaking
        const newWaveformData = Array.from({ length: 40 }, (_, i) => {
          // Sample from time domain data
          const sampleIndex = Math.floor((i / 40) * (dataArray.length - 1));
          const sampleValue = Math.abs(dataArray[sampleIndex] - 128) / 128; // Normalize sample
          
          if (normalizedAmplitude < silenceThreshold && maxAmplitude < silenceThreshold * 2) {
            // Flat line (8% height) when silent
            return 0.08;
          } else {
            // Use the sample value directly, with some smoothing and ensure visibility
            const height = 0.15 + (sampleValue * 0.65) + (normalizedAmplitude * 0.15);
            return Math.max(0.08, Math.min(0.95, height));
          }
        });
        
        setWaveformData(newWaveformData);
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      
      // Start waveform updates immediately
      updateWaveform();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop waveform updates
        isRecordingActiveRef.current = false;
        
        // Clean up audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        if (microphoneRef.current) {
          microphoneRef.current.disconnect();
          microphoneRef.current = null;
        }
        if (analyserRef.current) {
          analyserRef.current.disconnect();
          analyserRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        // Reset waveform to flat line
        setWaveformData(Array(40).fill(0.08));
        
        // Only send if shouldSendRecordingRef is true (user clicked send button)
        if (!shouldSendRecordingRef.current) {
          // Recording was cancelled, just clean up
          audioChunksRef.current = [];
          setIsRecordingAudio(false);
          setRecordingTime(0);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Get audio duration
          const audio = new Audio(URL.createObjectURL(audioBlob));
          audio.onloadedmetadata = () => {
            const duration = Math.round(audio.duration);
            
            // Create audio attachment
            const audioAttachment = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'audio' as const,
              name: `voice-message-${Date.now()}.webm`,
              data: base64Audio,
              mimeType: 'audio/webm',
              size: audioBlob.size,
              duration: duration,
            };

            // Send message with audio (using functional setState to avoid stale closure)
            if (currentUser && friend) {
              const message: Message = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                senderId: currentUser.id,
                receiverId: friend.id,
                text: "",
                timestamp: new Date().toISOString(),
                read: false,
                reactions: {},
                attachments: [audioAttachment],
              };

              setMessages(prevMessages => {
                const updatedMessages = [...prevMessages, message];
                // Save to localStorage
                const chatKey = getChatKey(currentUser.id, friend.id);
                try {
                  localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
                } catch (e) {
                  console.error("Error saving audio message:", e);
                }
                updateUnreadCount(friend.id, currentUser.id, true);
                
                // Scroll to bottom
                shouldAutoScrollRef.current = true;
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
                
                return updatedMessages;
              });
              setNewMessage("");
            }

            URL.revokeObjectURL(audio.src);
            // Reset recording state
            audioChunksRef.current = [];
            setIsRecordingAudio(false);
            setRecordingTime(0);
            shouldSendRecordingRef.current = false;
          };
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingTime(0);
      
      // Start timer (updates every second)
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      alert("Could not access microphone. Please allow microphone access and try again.");
    }
  }, [currentUser, friend, messages, newMessage, saveMessages, updateUnreadCount]);

  const stopRecordingAudio = useCallback(() => {
    isRecordingActiveRef.current = false;
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    // Clean up audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    // Reset waveform to flat line
    setWaveformData(Array(40).fill(0.08));
  }, []);

  const cancelRecording = useCallback(() => {
    shouldSendRecordingRef.current = false;
    stopRecordingAudio();
  }, [stopRecordingAudio]);

  const sendRecording = useCallback(() => {
    if (!isRecordingAudio) return;
    shouldSendRecordingRef.current = true;
    stopRecordingAudio();
  }, [isRecordingAudio, stopRecordingAudio]);

  // Cleanup audio recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch (e) {
          // ignore
        }
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (microphoneRef.current) {
        microphoneRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const sendMessageWithFiles = useCallback(async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !currentUser || !friend) return;

    // Add missing dependency: updateUnreadCount needs to be available

    // Clear typing indicator
    setTypingIndicator(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Convert files to base64
    const attachments = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64Data = await convertFileToBase64(file);
        return {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type: file.type.startsWith('image/') ? 'image' as const : file.type.startsWith('audio/') ? 'audio' as const : 'file' as const,
          name: file.name,
          data: base64Data,
          mimeType: file.type,
          size: file.size,
        };
      })
    );

    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      senderId: currentUser.id,
      receiverId: friend.id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false,
      reactions: {},
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setNewMessage("");
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Update unread count
    updateUnreadCount(friend.id, currentUser.id, true);

    // Show notification if chat is not open
    if (!isOpen) {
      showNotification(message.text, friend?.name || friend?.displayName || 'Friend');
    }

    // Scroll to bottom (always scroll when sending a message)
    shouldAutoScrollRef.current = true;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [newMessage, selectedFiles, currentUser, friend, messages, saveMessages, setTypingIndicator, updateUnreadCount, isOpen, showNotification]);

  // Send message (wrapper that uses sendMessageWithFiles)
  const sendMessage = useCallback(() => {
    sendMessageWithFiles();
  }, [sendMessageWithFiles]);

  // Available emoji reactions
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '👏'];

  // Emoji picker emojis (common emojis for quick insertion)
  const emojiPickerEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
    '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚',
    '🖐', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  ];

  // Insert emoji into message
  const insertEmoji = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Start/stop voice input
  const toggleVoiceInput = useCallback(async () => {
    if (isRecordingVoice) {
      // Stop recording
      if (voiceInputRecognitionRef.current) {
        try {
          voiceInputRecognitionRef.current.stop();
        } catch (error) {
          console.error("Error stopping voice input:", error);
        }
      }
      setIsRecordingVoice(false);
      voiceInputRecognitionRef.current = null;
    } else {
      // Start recording
      if (typeof window === "undefined") return;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition is not supported in your browser.");
        return;
      }

      // Check microphone permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (error: any) {
        alert("Microphone access is required. Please allow access and try again.");
        return;
      }

      try {
        if (voiceInputRecognitionRef.current) {
          try {
            voiceInputRecognitionRef.current.stop();
          } catch {
            // ignore
          }
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setNewMessage(prev => prev + (prev ? " " : "") + transcript);
          setIsRecordingVoice(false);
          voiceInputRecognitionRef.current = null;
        };

        recognition.onerror = (event: any) => {
          console.error("Voice input error:", event.error);
          setIsRecordingVoice(false);
          voiceInputRecognitionRef.current = null;
          if (event.error === "no-speech") {
            // User didn't speak, just silently stop
            return;
          }
          alert("Voice input error. Please try again.");
        };

        recognition.onend = () => {
          setIsRecordingVoice(false);
          voiceInputRecognitionRef.current = null;
        };

        voiceInputRecognitionRef.current = recognition;
        setIsRecordingVoice(true);
        recognition.start();
      } catch (error) {
        console.error("Error starting voice input:", error);
        setIsRecordingVoice(false);
        voiceInputRecognitionRef.current = null;
      }
    }
  }, [isRecordingVoice]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Toggle reaction on a message
  const toggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!currentUser?.id) return;

    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id !== messageId) return msg;

        const reactions = msg.reactions || {};
        const usersWhoReacted = reactions[emoji] || [];
        const userIndex = usersWhoReacted.indexOf(currentUser.id);

        let updatedReactions: Record<string, string[]>;
        if (userIndex >= 0) {
          // Remove reaction
          updatedReactions = {
            ...reactions,
            [emoji]: usersWhoReacted.filter(id => id !== currentUser.id),
          };
          // Remove emoji key if no users left
          if (updatedReactions[emoji].length === 0) {
            delete updatedReactions[emoji];
          }
        } else {
          // Add reaction
          updatedReactions = {
            ...reactions,
            [emoji]: [...usersWhoReacted, currentUser.id],
          };
        }

        return {
          ...msg,
          reactions: updatedReactions,
        };
      });

      // Save to localStorage
      saveMessages(updatedMessages);
      return updatedMessages;
    });

    setShowReactionPicker(null);
  }, [currentUser?.id, saveMessages]);

  // Edit message
  const startEditingMessage = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.text);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMessageId(null);
    setEditingText("");
  }, []);

  const saveEditedMessage = useCallback(() => {
    if (!editingMessageId || !editingText.trim()) {
      cancelEditing();
      return;
    }

    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === editingMessageId) {
          return {
            ...msg,
            text: editingText.trim(),
            edited: true,
          };
        }
        return msg;
      });

      saveMessages(updatedMessages);
      return updatedMessages;
    });

    cancelEditing();
  }, [editingMessageId, editingText, saveMessages, cancelEditing]);

  // Delete message
  const deleteMessage = useCallback((messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    setMessages(prevMessages => {
      const updatedMessages = prevMessages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            text: "[Message deleted]",
            deleted: true,
            attachments: undefined, // Remove attachments when deleted
          };
        }
        return msg;
      });

      saveMessages(updatedMessages);
      return updatedMessages;
    });
  }, [saveMessages]);

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target as Node)) {
        setShowReactionPicker(null);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReactionPicker]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[70] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Chat Window */}
      <div className="fixed right-0 bottom-0 top-0 md:right-4 md:bottom-4 md:top-4 w-full md:w-[600px] md:max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col transform transition-transform duration-300 ease-out md:rounded-lg overflow-hidden">
        {/* Header */}
        <div className={`flex flex-col border-b border-gray-200 dark:border-gray-700 ${
          chatTheme === 'green' 
            ? 'bg-green-600 dark:bg-green-700'
            : chatTheme === 'purple'
            ? 'bg-purple-600 dark:bg-purple-700'
            : 'bg-blue-600 dark:bg-blue-700'
        }`}>
          <div className="flex items-center justify-between p-3 md:p-4">
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
            <div className="flex items-center gap-2">
              {/* Theme Selector */}
              <select
                value={chatTheme}
                onChange={(e) => {
                  const newTheme = e.target.value;
                  setChatTheme(newTheme);
                  try {
                    localStorage.setItem(`mlingua_chat_theme_${currentUser?.id}`, newTheme);
                  } catch (e) {
                    // ignore
                  }
                }}
                className="px-2 py-1 text-xs bg-white/20 text-white rounded border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={(e) => e.stopPropagation()}
                title="Chat theme"
              >
                <option value="default">Blue</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (!showSearch) {
                    setTimeout(() => searchInputRef.current?.focus(), 100);
                  } else {
                    setSearchQuery("");
                    setCurrentSearchIndex(-1);
                  }
                }}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Search messages"
                title="Search messages (Ctrl/Cmd + F)"
              >
                🔍
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="px-4 pb-3 border-t border-blue-500 dark:border-blue-600">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search messages... (Enter: next, Shift+Enter: previous, Esc: close)"
                    className="w-full px-3 py-2 pr-20 border border-blue-400 dark:border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    aria-label="Search messages"
                  />
                  {searchQuery.trim() && searchResults.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                      {currentSearchIndex + 1} / {searchResults.length}
                    </div>
                  )}
                </div>
                {searchQuery.trim() && searchResults.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={navigateToPreviousResult}
                      className="px-2 py-1.5 text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                      aria-label="Previous result"
                      title="Previous (Shift+Enter)"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={navigateToNextResult}
                      className="px-2 py-1.5 text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded text-sm font-medium transition-colors"
                      aria-label="Next result"
                      title="Next (Enter)"
                    >
                      ↓
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setCurrentSearchIndex(-1);
                    searchInputRef.current?.focus();
                  }}
                  className="px-3 py-1.5 text-white hover:bg-blue-700 dark:hover:bg-blue-600 rounded text-sm transition-colors"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              </div>
              {searchQuery.trim() && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-blue-100">No messages found</p>
              )}
            </div>
          )}
        </div>

        {/* Messages Container */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50 dark:bg-gray-800"
        >
          {(searchQuery.trim() ? searchResults : messages).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">
                {searchQuery.trim() ? "No messages found" : "No messages yet. Start the conversation!"}
              </p>
            </div>
          ) : (
            (searchQuery.trim() ? searchResults : messages).map((message, index) => {
              const isOwnMessage = message.senderId === currentUser?.id;
              // Check if this message is the current search result
              const isCurrentSearchResult = searchQuery.trim() && 
                currentSearchIndex >= 0 && 
                searchResults[currentSearchIndex]?.id === message.id;
              return (
                <div
                  key={message.id}
                  ref={(el) => {
                    messageRefs.current[message.id] = el;
                  }}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} ${isCurrentSearchResult ? "ring-2 ring-yellow-400 dark:ring-yellow-500 rounded-lg p-1" : ""} group relative`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-2 py-1 relative ${
                      isOwnMessage
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {/* Edit/Delete buttons for own messages */}
                    {isOwnMessage && !message.deleted && editingMessageId !== message.id && (
                      <div className="absolute -right-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => startEditingMessage(message)}
                          className="w-7 h-7 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded text-xs"
                          title="Edit message"
                          aria-label="Edit message"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMessage(message.id)}
                          className="w-7 h-7 flex items-center justify-center bg-red-200 dark:bg-red-900 hover:bg-red-300 dark:hover:bg-red-800 rounded text-xs"
                          title="Delete message"
                          aria-label="Delete message"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-1 space-y-1.5">
                        {message.attachments.map((attachment) => {
                          if (attachment.type === 'image') {
                            return (
                              <div key={attachment.id} className="rounded-lg overflow-hidden">
                                <img
                                  src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                  alt={attachment.name}
                                  className="max-w-full max-h-64 object-contain rounded-lg"
                                  loading="lazy"
                                />
                              </div>
                            );
                          } else if (attachment.type === 'audio') {
                            const AudioPlayer = () => {
                              const [isPlaying, setIsPlaying] = useState(false);
                              const [currentTime, setCurrentTime] = useState(0);
                              const [duration, setDuration] = useState(attachment.duration || 0);
                              const audioRef = useRef<HTMLAudioElement | null>(null);

                              useEffect(() => {
                                if (!audioRef.current) {
                                  const audio = new Audio(`data:${attachment.mimeType};base64,${attachment.data}`);
                                  audioRef.current = audio;
                                  audioRefs.current[attachment.id] = audio;

                                  audio.addEventListener('loadedmetadata', () => {
                                    setDuration(audio.duration);
                                  });

                                  audio.addEventListener('timeupdate', () => {
                                    setCurrentTime(audio.currentTime);
                                  });

                                  audio.addEventListener('ended', () => {
                                    setIsPlaying(false);
                                    setCurrentTime(0);
                                  });
                                }

                                return () => {
                                  if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current = null;
                                  }
                                };
                              }, [attachment.id, attachment.mimeType, attachment.data]);

                              const togglePlay = async () => {
                                if (audioRef.current) {
                                  if (isPlaying) {
                                    audioRef.current.pause();
                                    setIsPlaying(false);
                                  } else {
                                    try {
                                      await audioRef.current.play();
                                      setIsPlaying(true);
                                    } catch (error) {
                                      // Handle play() interruption gracefully
                                      console.log("Play interrupted:", error);
                                    }
                                  }
                                }
                              };

                              const formatTime = (seconds: number) => {
                                const mins = Math.floor(seconds / 60);
                                const secs = Math.floor(seconds % 60);
                                return `${mins}:${secs.toString().padStart(2, '0')}`;
                              };

                              return (
                                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={togglePlay}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full ${
                                      isOwnMessage 
                                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                    } transition-colors flex-shrink-0`}
                                    aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                                  >
                                    {isPlaying ? '⏸' : '▶'}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 relative">
                                        <div
                                          className="absolute left-0 top-0 h-full bg-blue-600 rounded-full"
                                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                      </span>
                                    </div>
                                  </div>
                                  <audio
                                    ref={(el) => {
                                      if (el) audioRef.current = el;
                                    }}
                                    src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                    preload="metadata"
                                    style={{ display: 'none' }}
                                  />
                                </div>
                              );
                            };

                            return <AudioPlayer key={attachment.id} />;
                          } else {
                            return (
                              <div
                                key={attachment.id}
                                className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-600 rounded-lg"
                              >
                                <span className="text-2xl">📎</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{attachment.name}</p>
                                  {attachment.size && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {(attachment.size / 1024).toFixed(1)} KB
                                    </p>
                                  )}
                                </div>
                                <a
                                  href={`data:${attachment.mimeType};base64,${attachment.data}`}
                                  download={attachment.name}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                    {/* Message Text with inline timestamp and read receipts */}
                    {editingMessageId === message.id ? (
                      /* Edit mode */
                      <div className="flex flex-col gap-1">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                          rows={2}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              saveEditedMessage();
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              cancelEditing();
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={saveEditedMessage}
                            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                          <span className="text-gray-500">Press Ctrl+Enter to save</span>
                        </div>
                      </div>
                    ) : message.text ? (
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className={`text-sm break-words ${message.deleted ? 'italic opacity-70' : ''}`}>
                          {searchQuery.trim() ? highlightText(message.text, searchQuery) : message.text}
                        </span>
                        {message.edited && !message.deleted && (
                          <span className="text-[9px] opacity-60 italic">(edited)</span>
                        )}
                        <span
                          className={`text-[10px] leading-none whitespace-nowrap ${
                            isOwnMessage ? "text-blue-100 opacity-80" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                          {isOwnMessage && message.read && (
                            <span className="ml-1">✓✓</span>
                          )}
                          {isOwnMessage && !message.read && (
                            <span className="ml-1">✓</span>
                          )}
                        </span>
                      </div>
                    ) : (
                      /* Timestamp only for messages without text (only attachments) */
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-[10px] leading-none whitespace-nowrap ${
                            isOwnMessage ? "text-blue-100 opacity-80" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                          {isOwnMessage && message.read && (
                            <span className="ml-1">✓✓</span>
                          )}
                          {isOwnMessage && !message.read && (
                            <span className="ml-1">✓</span>
                          )}
                        </span>
                      </div>
                    )}
                    {/* Reactions */}
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(message.reactions).map(([emoji, userIds]) => {
                          if (userIds.length === 0) return null;
                          const hasUserReacted = userIds.includes(currentUser?.id || '');
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => toggleReaction(message.id, emoji)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                hasUserReacted
                                  ? 'bg-blue-500 dark:bg-blue-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                              } transition-colors`}
                              title={`${userIds.length} ${userIds.length === 1 ? 'reaction' : 'reactions'}`}
                            >
                              <span>{emoji}</span>
                              <span>{userIds.length}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReactionPicker(showReactionPicker === message.id ? null : message.id);
                          }}
                          className="px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                          aria-label="Add reaction"
                        >
                          +
                        </button>
                      </div>
                    )}
                    {(!message.reactions || Object.keys(message.reactions).length === 0) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReactionPicker(showReactionPicker === message.id ? null : message.id);
                        }}
                        className="mt-1 px-2 py-0.5 rounded-full text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Add reaction"
                      >
                        😊 Add reaction
                      </button>
                    )}
                  </div>
                  {/* Reaction Picker */}
                  {showReactionPicker === message.id && (
                    <div
                      ref={reactionPickerRef}
                      className={`absolute bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 flex gap-1 z-10 ${isOwnMessage ? 'right-0' : 'left-0'}`}
                    >
                      {availableReactions.map((emoji) => {
                        const hasReacted = message.reactions?.[emoji]?.includes(currentUser?.id || '') || false;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => toggleReaction(message.id, emoji)}
                            className={`text-2xl p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                              hasReacted ? 'bg-blue-100 dark:bg-blue-900' : ''
                            }`}
                            aria-label={`React with ${emoji}`}
                            title={hasReacted ? `Remove ${emoji} reaction` : `Add ${emoji} reaction`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {friendIsTyping && (
            <div className="flex justify-start">
              <div className="max-w-[75%] rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm italic">
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
        <div className="p-2 md:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  {file.type.startsWith('image/') ? (
                    <>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">📎</span>
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select files"
            />
            {/* Plus/Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Attach file"
              title="Attach file"
            >
              ➕
            </button>
            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-2 py-2 md:px-3 md:py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-base md:text-lg"
                aria-label="Add emoji"
                title="Add emoji"
              >
                😊
              </button>
              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-20"
                  style={{ width: '280px', maxHeight: '300px', overflowY: 'auto' }}
                >
                  <div className="grid grid-cols-8 gap-1">
                    {emojiPickerEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="text-2xl p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Audio Recording Button - only show when not recording */}
            {!isRecordingAudio && (
              <button
                type="button"
                onClick={startRecordingAudio}
                className="px-2 py-2 md:px-3 md:py-2 rounded-lg transition-colors text-base md:text-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Record audio"
                title="Record audio message"
              >
                🎙️
              </button>
            )}
            {/* Recording UI */}
            {isRecordingAudio && (
              <div className="flex-1 flex items-center gap-2 px-2 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {/* Delete/Cancel Button */}
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="Cancel recording"
                  title="Cancel recording"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
                {/* Recording Indicator */}
                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse" title="Recording" />
                {/* Recording Time */}
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
                {/* Waveform Visualization */}
                <div className="flex-1 flex items-center gap-0.5 h-8 px-2">
                  {waveformData.map((height, i) => {
                    // height is normalized (0-1), convert to percentage
                    const heightPercent = height * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-red-500 dark:bg-red-400 transition-all duration-75"
                        style={{ 
                          height: `${heightPercent}%`, 
                          minHeight: '4px',
                          maxHeight: '100%'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {/* Textarea - hide when recording */}
            {!isRecordingAudio && (
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
                className="flex-1 px-2 py-2 md:px-4 md:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm md:text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 resize-none"
                aria-label="Message input"
              />
            )}
            <button
              ref={sendBtnRef}
              type="button"
              onClick={isRecordingAudio ? sendRecording : sendMessage}
              disabled={!isRecordingAudio && !newMessage.trim() && selectedFiles.length === 0}
              className={`px-3 py-2 md:px-4 md:py-2 bg-blue-600 text-white text-sm md:text-base font-medium rounded-lg hover:bg-blue-700 focus:visible:outline-none focus:visible:ring-2 focus:visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isRecordingAudio ? 'min-w-[40px]' : ''
              }`}
              aria-label={isRecordingAudio ? "Send recording" : "Send message"}
            >
              {isRecordingAudio ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

