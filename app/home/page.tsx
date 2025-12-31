"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import ProfileDrawer from "@/components/ProfileDrawer";
import FriendsDrawer from "@/components/FriendsDrawer";
import FriendRequestsDrawer from "@/components/FriendRequestsDrawer";
import SettingsDrawer from "@/components/SettingsDrawer";
import EmptyState from "@/components/EmptyState";
import { 
  MessageSquare, 
  Users, 
  UserPlus, 
  Star, 
  Mic, 
  Volume2, 
  Hand, 
  Languages, 
  FileText,
  Send,
  UserPlus as AddFriendIcon,
  Activity,
  Clock
} from "lucide-react";
import { getCurrentUser } from "@/lib/firebase/auth";
import { subscribeToFriends, getFriends, getFriendRequests, getUserPresence } from "@/lib/firebase/firestore";
import type { Friend } from "@/lib/firebase/firestore";

/**
 * Premium Dashboard Homepage
 * 
 * Combines dashboard design with voice navigation for accessibility
 */
export default function Home() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Real data from Firebase
  const [recentMessages, setRecentMessages] = useState<Array<{ id: string; name: string; lastMessage: string; time: string; unread: number }>>([]);
  const [recentFriends, setRecentFriends] = useState<Array<{ id: string; name: string; status: string; avatar: string }>>([]);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; icon: any; title: string; time: string; color: string }>>([]);
  const currentUserIdRef = useRef<string | null>(null);

  // Voice navigation refs (from original homepage)
  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const spokenRef = useRef(false);
  const speakMessageRef = useRef<((message: string, onEnd?: () => void) => void) | null>(null);
  const startRecognitionRef = useRef<(() => void) | null>(null);

  // Load user data and set up Firebase listeners
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          currentUserIdRef.current = firebaseUser.uid;

          // Initial load of friends (before subscription)
          const loadInitialFriends = async () => {
            const { friends: initialFriends, error } = await getFriends(firebaseUser.uid);
            if (!error && initialFriends) {
              console.log('[Homepage] Initial friends load:', initialFriends.length);
              setFriendsCount(initialFriends.length);
              
              if (initialFriends.length > 0) {
                const friendsWithPresence = await Promise.all(
                  initialFriends.slice(0, 3).map(async (friend) => {
                    const { presence } = await getUserPresence(friend.id);
                    return {
                      id: friend.id,
                      name: friend.name || friend.username || friend.email,
                      status: presence?.status === 'Online' ? 'Online' : 'Offline',
                      avatar: friend.photoURL ? '' : (friend.name || friend.username || friend.email || 'U').charAt(0).toUpperCase(),
                    };
                  })
                );
                setRecentFriends(friendsWithPresence);
              }
            }
          };
          
          loadInitialFriends();

          // Set up friends listener for real-time updates
          const unsubscribeFriends = subscribeToFriends(firebaseUser.uid, async (friends: Friend[]) => {
            console.log('[Homepage] Friends subscription callback received:', friends.length, 'friends');
            setFriendsCount(friends.length);
            
            // Get presence for each friend and format for display
            if (friends.length > 0) {
              const friendsWithPresence = await Promise.all(
                friends.slice(0, 3).map(async (friend) => {
                  const { presence } = await getUserPresence(friend.id);
                  return {
                    id: friend.id,
                    name: friend.name || friend.username || friend.email,
                    status: presence?.status === 'Online' ? 'Online' : 'Offline',
                    avatar: friend.photoURL ? '' : (friend.name || friend.username || friend.email || 'U').charAt(0).toUpperCase(),
                  };
                })
              );
              
              console.log('[Homepage] Setting recent friends:', friendsWithPresence.length);
              setRecentFriends(friendsWithPresence);
            } else {
              console.log('[Homepage] No friends found, clearing recent friends');
              setRecentFriends([]);
            }
          });

          // Load friend requests count
          const { requests } = await getFriendRequests(firebaseUser.uid);
          setFriendRequestsCount(requests.length);

          return () => {
            unsubscribeFriends();
          };
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Voice navigation functions (preserved from original homepage)
  const stopRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch (_e) {
          // ignore
        }
      }
    } finally {
      recognitionRef.current = null;
      isListeningRef.current = false;
    }
  }, []);

  const clearTypingTimer = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current as any);
        typingTimerRef.current = null;
      }
    } catch (_e) {}
  }, []);

  const speakMessage = useCallback((message: string, onEnd?: () => void) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    stopRecognition();

    try {
      try { synth.cancel(); } catch (_e) {}
      isSpeakingRef.current = true;
      const u = new SpeechSynthesisUtterance(message);
      u.lang = "en-US";
      u.addEventListener("end", () => {
        isSpeakingRef.current = false;
        if (onEnd) {
          onEnd();
        } else if (!isTypingRef.current && startRecognitionRef.current) {
          startRecognitionRef.current();
        }
      });
      synth.speak(u);
    } catch (_e) {
      isSpeakingRef.current = false;
      if (!isTypingRef.current && startRecognitionRef.current) {
        startRecognitionRef.current();
      }
    }
  }, [stopRecognition]);

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;
    } catch (_e) {
      return;
    }

    if (isSpeakingRef.current) return;
    if (isListeningRef.current) return;
    if (isTypingRef.current) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const r = new SpeechRec();
      r.lang = "en-US";
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;

      r.onresult = (ev: any) => {
        try {
          const transcript = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || "";
          const text = transcript.trim().toLowerCase();
          if (!text) return;

          stopRecognition();

          // Feature navigation
          if (text.includes("text") && text.includes("speech")) {
            const textIndex = text.indexOf("text");
            const speechIndex = text.indexOf("speech");
            if (textIndex < speechIndex) {
              router.push("/home/text-to-speech");
              return;
            } else {
              router.push("/home/speech-to-text");
              return;
            }
          }

          if (text.includes("speech text") || text === "speech text") {
            router.push("/home/speech-to-text");
            return;
          }

          if (text.includes("text speech") || text === "text speech") {
            router.push("/home/text-to-speech");
            return;
          }

          if (text.includes("translation") || text.includes("translate")) {
            router.push("/home/translation");
            return;
          }

          if ((text.includes("speech") && text.includes("sign")) || text.includes("speech sign") || text === "speech sign") {
            router.push("/home/speech-to-sign");
            return;
          }

          if ((text.includes("text") && text.includes("sign") && !text.includes("speech")) || text.includes("text sign") || text === "text sign") {
            router.push("/home/text-to-sign");
            return;
          }

          if (text.includes("conversation")) {
            router.push("/home/conversation-mode");
            return;
          }

          // Dashboard navigation
          if (text.includes("messages") || text.includes("message")) {
            router.push("/test-chat-layout");
            return;
          }

          if (text.includes("friends")) {
            setShowFriends(true);
            return;
          }

          // Help commands
          if (text.includes("help") || text.includes("repeat")) {
            const welcomeMessage = "Welcome to M-Lingua dashboard. You have 6 features available: Speech to Text, Text to Speech, Translation, Speech to Sign, Text to Sign, and Conversation Mode. You can also say 'messages' to view messages, or 'friends' to open friends. Say a feature name to open it, or say 'help' or 'repeat' to hear these options again.";
            if (speakMessageRef.current) {
              speakMessageRef.current(welcomeMessage, () => {
                if (startRecognitionRef.current) {
                  startRecognitionRef.current();
                }
              });
            }
            return;
          }

          // If command not recognized
          const unrecognizedMessage = "Command not recognized. Say 'help' to hear the available commands again.";
          if (speakMessageRef.current) {
            speakMessageRef.current(unrecognizedMessage, () => {
              if (startRecognitionRef.current) {
                startRecognitionRef.current();
              }
            });
          }
        } catch (_e) {
          // ignore
        }
      };

      r.onerror = () => {
        stopRecognition();
      };

      r.onend = () => {
        isListeningRef.current = false;
        recognitionRef.current = null;
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !isSpeakingRef.current && !isTypingRef.current && startRecognitionRef.current) {
            setTimeout(() => startRecognitionRef.current!(), 300);
          }
        } catch (_e) {
          // ignore
        }
      };

      recognitionRef.current = r;
      try {
        r.start();
        isListeningRef.current = true;
      } catch (_err) {
        recognitionRef.current = null;
        isListeningRef.current = false;
      }
    } catch (_e) {
      // ignore
    }
  }, [router, stopRecognition]);

  // Store refs to break circular dependency
  useEffect(() => {
    speakMessageRef.current = speakMessage;
  }, [speakMessage]);

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  // Voice navigation setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    spokenRef.current = false;

    let timer: NodeJS.Timeout | null = null;
    let frameId: number | null = null;

    frameId = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !spokenRef.current && speakMessageRef.current) {
            spokenRef.current = true;
            const welcomeMessage = "Welcome to M-Lingua dashboard. You have 6 features available: Speech to Text, Text to Speech, Translation, Speech to Sign, Text to Sign, and Conversation Mode. You can also say 'messages' to view messages, or 'friends' to open friends. Say a feature name to open it, or say 'help' or 'repeat' to hear these options again.";
            speakMessageRef.current(welcomeMessage, () => {
              if (startRecognitionRef.current) {
                startRecognitionRef.current();
              }
            });
          }
        } catch (e) {
          // fail silently
        }
      }, 200);
    });

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      if (timer) {
        clearTimeout(timer);
      }
      stopRecognition();
      try { clearTypingTimer(); } catch (_e) {}
      isTypingRef.current = false;
    };
  }, [stopRecognition, clearTypingTimer, speakMessage, startRecognition]);

  const communicationFeatures = [
    { 
      id: "speech-to-text", 
      title: "Speech to Text", 
      icon: Mic, 
      href: "/home/speech-to-text", 
      color: "blue",
      description: "Convert spoken words into readable text"
    },
    { 
      id: "text-to-speech", 
      title: "Text to Speech", 
      icon: Volume2, 
      href: "/home/text-to-speech", 
      color: "purple",
      description: "Hear written text read aloud"
    },
    { 
      id: "speech-to-sign", 
      title: "Speech to Sign", 
      icon: Hand, 
      href: "/home/speech-to-sign", 
      color: "purple",
      description: "See spoken words in sign language"
    },
    { 
      id: "conversation-mode", 
      title: "Conversation Mode", 
      icon: MessageSquare, 
      href: "/home/conversation-mode", 
      color: "blue",
      description: "Real-time communication"
    },
    { 
      id: "translation", 
      title: "Translation", 
      icon: Languages, 
      href: "/home/translation", 
      color: "emerald",
      description: "Translate between languages"
    },
    { 
      id: "text-to-sign", 
      title: "Text to Sign", 
      icon: FileText, 
      href: "/home/text-to-sign", 
      color: "purple",
      description: "Convert text to sign language"
    },
  ];

  const stats = [
    { 
      label: "Unread Messages", 
      value: (unreadMessagesCount ?? 0).toString(), 
      icon: MessageSquare, 
      color: "blue",
      bgColor: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: darkMode ? "text-blue-400" : "text-blue-600"
    },
    { 
      label: "Friends", 
      value: (friendsCount ?? 0).toString(), 
      icon: Users, 
      color: "emerald",
      bgColor: darkMode ? "bg-emerald-500/10" : "bg-emerald-50",
      iconColor: darkMode ? "text-emerald-400" : "text-emerald-600"
    },
    { 
      label: "Friend Requests", 
      value: (friendRequestsCount ?? 0).toString(), 
      icon: UserPlus, 
      color: "orange",
      bgColor: darkMode ? "bg-orange-500/10" : "bg-orange-50",
      iconColor: darkMode ? "text-orange-400" : "text-orange-600"
    },
    { 
      label: "Most Used Feature", 
      value: "Translation", 
      icon: Star, 
      color: "purple",
      bgColor: darkMode ? "bg-purple-500/10" : "bg-purple-50",
      iconColor: darkMode ? "text-purple-400" : "text-purple-600"
    },
  ];

  return (
    <>
      {/* Main Content - Premium Dashboard */}
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Hero Card */}
          <div className={`mb-8 p-8 rounded-2xl border ${darkMode ? 'border-slate-800/50' : 'border-slate-200/50'} shadow-sm ${
            darkMode 
              ? 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent' 
              : 'bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent'
          }`}>
            <h1 className={`text-4xl font-bold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
              Welcome back! 👋
            </h1>
            <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Here's what's happening with your communication tools and connections.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div 
                  key={index}
                  className={`p-6 rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm hover:shadow-md transition-all duration-200`}
                >
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}>
                    <IconComponent className={`w-6 h-6 ${stat.iconColor} glow-icon`} />
                  </div>
                  <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
                    {stat.value}
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Recent Messages & Quick Access */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Messages */}
              <div className={`rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
                    Recent Messages
                  </h2>
                  <button
                    onClick={() => router.push('/test-chat-layout')}
                    className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded`}
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3 transition-opacity duration-300">
                  {recentMessages.length === 0 ? (
                    <div className="opacity-100">
                      <EmptyState
                        icon={<MessageSquare className="w-full h-full" />}
                        title="No messages yet"
                        description="Start a conversation to break the barrier!"
                        actionButton={{
                          label: "Start Chatting",
                          onClick: () => router.push('/test-chat-layout'),
                        }}
                        iconColor="blue"
                        iconSize="64"
                      />
                    </div>
                  ) : (
                    recentMessages.map((message) => (
                      <button
                        key={message.id}
                        onClick={() => router.push('/test-chat-layout')}
                        className={`w-full p-4 rounded-xl border transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 opacity-fade-in ${
                          darkMode 
                            ? 'border-slate-800/50 bg-slate-800/30 hover:bg-slate-800/50' 
                            : 'border-slate-200/50 bg-slate-50/50 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm`}>
                            {message.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'} truncate`}>
                                {message.name}
                              </h3>
                              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex-shrink-0 ml-2`}>
                                {message.time}
                              </span>
                            </div>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'} truncate`}>
                              {message.lastMessage}
                            </p>
                          </div>
                          {message.unread > 0 && (
                            <span className={`px-2.5 py-1 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs font-bold rounded-full flex-shrink-0 shadow-sm`}>
                              {message.unread}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Access Features */}
              <div 
                data-tour="quick-access"
                className={`rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm p-6`}
              >
                <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
                  Quick Access
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {communicationFeatures.map((feature) => {
                    const IconComponent = feature.icon;
                    const colorClasses = {
                      blue: darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
                      purple: darkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
                      emerald: darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
                    };
                    return (
                      <Link
                        key={feature.id}
                        href={feature.href}
                        className={`group p-6 rounded-2xl border hover:-translate-y-1 transition-all duration-200 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          darkMode 
                            ? 'border-slate-800/50 bg-slate-800/30 hover:bg-slate-800/50' 
                            : 'border-slate-200/50 bg-slate-50/50 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className={`w-16 h-16 rounded-2xl ${colorClasses[feature.color as keyof typeof colorClasses]} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}>
                          <IconComponent className="w-8 h-8 glow-icon" />
                        </div>
                        <h3 className={`text-sm font-semibold mb-1 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {feature.title}
                        </h3>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {feature.description}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Friends & Activity */}
            <div className="space-y-6">
              {/* Friends List */}
              <div className={`rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm p-6`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
                    Friends
                  </h2>
                  <button
                    onClick={() => setShowFriends(true)}
                    className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded`}
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-4 transition-opacity duration-300">
                  {recentFriends.length === 0 ? (
                    <div className="opacity-100">
                      <EmptyState
                        icon={<Users className="w-full h-full" />}
                        title="Your circle is empty"
                        description="Connect with others to use real-time sign translation."
                        actionButton={{
                          label: "Find Friends",
                          onClick: () => setShowFriends(true),
                        }}
                        iconColor="green"
                        iconSize="64"
                      />
                    </div>
                  ) : (
                    recentFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-colors cursor-pointer opacity-fade-in ${
                          darkMode 
                            ? 'hover:bg-slate-800/50' 
                            : 'hover:bg-slate-50/50'
                        }`}
                        onClick={() => setShowFriends(true)}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-xl ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold shadow-sm ring-2 ${darkMode ? 'ring-slate-900' : 'ring-white'}`}>
                            {friend.avatar}
                          </div>
                          {friend.status === 'Online' && (
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 ${darkMode ? 'border-slate-900' : 'border-white'} pulse-online`}></div>
                          )}
                          {friend.status === 'Offline' && (
                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-400 border-2 ${darkMode ? 'border-slate-900' : 'border-white'}`}></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'} truncate`}>
                            {friend.name}
                          </h3>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {friend.status}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className={`rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm p-6`}>
                <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
                  Recent Activity
                </h2>
                <div className="space-y-4 transition-opacity duration-300">
                  {recentActivity.length === 0 ? (
                    <div className="opacity-100">
                      <EmptyState
                        icon={<Activity className="w-full h-full" />}
                        title="Ready to communicate?"
                        description="Your recent translations and speech-to-text logs will show up here."
                        actionButton={{
                          label: "Try a Feature",
                          onClick: () => router.push('/home/translation'),
                        }}
                        iconColor="purple"
                        iconSize="64"
                      />
                    </div>
                  ) : (
                    recentActivity.map((activity) => {
                      const IconComponent = activity.icon;
                      const colorClasses = {
                        blue: darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600',
                        emerald: darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
                        purple: darkMode ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600',
                      };
                      return (
                        <div key={activity.id} className="flex items-start gap-4 opacity-fade-in">
                          <div className={`w-10 h-10 rounded-xl ${colorClasses[activity.color as keyof typeof colorClasses]} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                              {activity.title}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className={`w-3 h-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {activity.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm p-6`}>
                <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/test-chat-layout')}
                    className={`w-full px-4 py-3.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-xl hover:opacity-90 transition-opacity text-left flex items-center gap-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 shadow-sm`}
                  >
                    <Send className="w-5 h-5" />
                    <span>New Message</span>
                  </button>
                  <button
                    onClick={() => setShowFriends(true)}
                    className={`w-full px-4 py-3.5 ${darkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-100 border border-slate-200/50'} ${darkMode ? 'text-slate-200' : 'text-slate-700'} rounded-xl hover:opacity-80 transition-opacity text-left flex items-center gap-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                  >
                    <AddFriendIcon className="w-5 h-5" />
                    <span>Add Friend</span>
                  </button>
                  <button
                    onClick={() => router.push('/home/translation')}
                    className={`w-full px-4 py-3.5 ${darkMode ? 'bg-slate-800/50 border border-slate-700/50' : 'bg-slate-100 border border-slate-200/50'} ${darkMode ? 'text-slate-200' : 'text-slate-700'} rounded-xl hover:opacity-80 transition-opacity text-left flex items-center gap-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
                  >
                    <Languages className="w-5 h-5" />
                    <span>Translate Text</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawers */}
      <ProfileDrawer isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <FriendsDrawer isOpen={showFriends} onClose={() => setShowFriends(false)} />
      <FriendRequestsDrawer isOpen={showFriendRequests} onClose={() => setShowFriendRequests(false)} />
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
