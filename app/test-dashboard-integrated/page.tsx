"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
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

/**
 * Premium Dashboard Design - Integrated Version
 * 
 * This is what the dashboard would look like when integrated into /home/page.tsx
 * 
 * DESIGN SYSTEM:
 * - Typography: Inter/Lexend
 * - Primary: #3B82F6 (Electric Blue)
 * - Secondary: #8B5CF6 (Deep Purple)
 * - Success: #10B981 (Emerald)
 * - Background: Light (#F8FAFC), Dark (#0F172A)
 * - Containers: rounded-2xl, border border-slate-200/50, shadow-sm
 */
export default function TestDashboardIntegrated() {
  const { darkMode } = useTheme();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mock data for dashboard - can be empty for empty state testing
  const recentMessages: Array<{ id: string; name: string; lastMessage: string; time: string; unread: number }> = [
    // { id: "1", name: "John Doe", lastMessage: "Hey, how are you?", time: "2m ago", unread: 2 },
    // { id: "2", name: "Jane Smith", lastMessage: "See you tomorrow!", time: "1h ago", unread: 0 },
    // { id: "3", name: "Mike Johnson", lastMessage: "Thanks for the help", time: "3h ago", unread: 5 },
  ];

  const recentFriends: Array<{ id: string; name: string; status: string; avatar: string }> = [
    // { id: "1", name: "Sarah Williams", status: "Online", avatar: "S" },
    // { id: "2", name: "Alex Brown", status: "Offline", avatar: "A" },
    // { id: "3", name: "Emma Davis", status: "Online", avatar: "E" },
  ];

  const recentActivity: Array<{ id: string; icon: any; title: string; time: string; color: string }> = [
    // { id: "1", icon: Mic, title: "Speech to Text conversion", time: "5 minutes ago", color: "blue" },
    // { id: "2", icon: Languages, title: "Translation completed", time: "1 hour ago", color: "emerald" },
    // { id: "3", icon: Hand, title: "Sign language animation created", time: "2 hours ago", color: "purple" },
  ];

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
      value: "7", 
      icon: MessageSquare, 
      color: "blue",
      bgColor: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: darkMode ? "text-blue-400" : "text-blue-600"
    },
    { 
      label: "Friends", 
      value: "12", 
      icon: Users, 
      color: "emerald",
      bgColor: darkMode ? "bg-emerald-500/10" : "bg-emerald-50",
      iconColor: darkMode ? "text-emerald-400" : "text-emerald-600"
    },
    { 
      label: "Friend Requests", 
      value: "2", 
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
      {/* NOTE: Header and Footer are provided by layout.tsx - not included here */}
      
      {/* Main Content - Premium Dashboard */}
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} transition-colors`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Hero Card with Mesh Gradient */}
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

          {/* Stats Grid with Glow Icons */}
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

              {/* Quick Access Features - Vertical Icon Stacks */}
              <div className={`rounded-2xl border ${darkMode ? 'border-slate-800/50 bg-slate-900/50' : 'border-slate-200/50 bg-white'} shadow-sm p-6`}>
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
