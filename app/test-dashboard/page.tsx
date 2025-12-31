"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileDrawer from "@/components/ProfileDrawer";
import FriendsDrawer from "@/components/FriendsDrawer";
import FriendRequestsDrawer from "@/components/FriendRequestsDrawer";
import SettingsDrawer from "@/components/SettingsDrawer";

export default function TestDashboardPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mock data for dashboard
  const recentMessages = [
    { id: "1", name: "John Doe", lastMessage: "Hey, how are you?", time: "2m ago", unread: 2 },
    { id: "2", name: "Jane Smith", lastMessage: "See you tomorrow!", time: "1h ago", unread: 0 },
    { id: "3", name: "Mike Johnson", lastMessage: "Thanks for the help", time: "3h ago", unread: 5 },
  ];

  const recentFriends = [
    { id: "1", name: "Sarah Williams", status: "Online", avatar: "S" },
    { id: "2", name: "Alex Brown", status: "Offline", avatar: "A" },
    { id: "3", name: "Emma Davis", status: "Online", avatar: "E" },
  ];

  const communicationFeatures = [
    { id: "speech-to-text", title: "Speech to Text", icon: "🎤", href: "/home/speech-to-text", color: "purple" },
    { id: "text-to-speech", title: "Text to Speech", icon: "🔊", href: "/home/text-to-speech", color: "blue" },
    { id: "speech-to-sign", title: "Speech to Sign", icon: "✋", href: "/home/speech-to-sign", color: "yellow" },
    { id: "conversation-mode", title: "Conversation Mode", icon: "💬", href: "/home/conversation-mode", color: "purple" },
    { id: "translation", title: "Translation", icon: "🌍", href: "/home/translation", color: "green" },
    { id: "text-to-sign", title: "Text to Sign", icon: "✏️", href: "/home/text-to-sign", color: "yellow" },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors pb-20`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-2">
              <img
                src="/Logo_2.png"
                alt="M-Lingua logo"
                className="h-8 w-8"
              />
              <h1 className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                M-Lingua
              </h1>
            </Link>

            {/* Header Controls */}
            <div className="flex items-center gap-2">
              {/* Profile */}
              <button
                onClick={() => setShowProfile(true)}
                className={`px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}
              >
                👤 Profile
              </button>

              {/* Friend Requests */}
              <button
                onClick={() => setShowFriendRequests(true)}
                className={`relative w-10 h-10 flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}
              >
                👥
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  2
                </span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`w-10 h-10 flex items-center justify-center ${darkMode ? 'bg-blue-600' : 'bg-blue-600'} text-white rounded-lg hover:opacity-80 transition-opacity`}
              >
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Dashboard */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className={`mb-8 p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border`}>
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Welcome back! 👋
            </h1>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Here's what's happening with your communication tools and connections.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border`}>
              <div className={`text-2xl mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>💬</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>7</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Unread Messages</div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border`}>
              <div className={`text-2xl mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>👥</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>12</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Friends</div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border`}>
              <div className={`text-2xl mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>📝</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>24</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Translations Today</div>
            </div>
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border`}>
              <div className={`text-2xl mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>🎤</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>156</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Speech Conversions</div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Recent Messages */}
            <div className={`lg:col-span-2 space-y-6`}>
              {/* Recent Messages */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Recent Messages
                  </h2>
                  <button
                    onClick={() => router.push('/test-chat-layout')}
                    className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:opacity-80`}
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {recentMessages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => router.push('/test-chat-layout')}
                      className={`w-full p-3 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors text-left`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                          {message.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                              {message.name}
                            </h3>
                            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 ml-2`}>
                              {message.time}
                            </span>
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                            {message.lastMessage}
                          </p>
                        </div>
                        {message.unread > 0 && (
                          <span className={`px-2 py-0.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs rounded-full flex-shrink-0`}>
                            {message.unread}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Access Features */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quick Access
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {communicationFeatures.map((feature) => (
                    <Link
                      key={feature.id}
                      href={feature.href}
                      className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} hover:opacity-80 transition-opacity text-center`}
                    >
                      <div className="text-3xl mb-2">{feature.icon}</div>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {feature.title}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Friends & Activity */}
            <div className="space-y-6">
              {/* Online Friends */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Friends
                  </h2>
                  <button
                    onClick={() => setShowFriends(true)}
                    className={`text-sm ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:opacity-80`}
                  >
                    View All →
                  </button>
                </div>
                <div className="space-y-3">
                  {recentFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="relative">
                        <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold`}>
                          {friend.avatar}
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${darkMode ? 'border-gray-800' : 'border-white'} ${
                          friend.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                          {friend.name}
                        </h3>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {friend.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="text-xl">🎤</div>
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Speech to Text conversion
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        5 minutes ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-xl">🌍</div>
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Translation completed
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        1 hour ago
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-xl">✋</div>
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Sign language animation created
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        2 hours ago
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-6`}>
                <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quick Actions
                </h2>
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/test-chat-layout')}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}
                  >
                    <span className="text-xl">💬</span>
                    <span>New Message</span>
                  </button>
                  <button
                    onClick={() => setShowFriends(true)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}
                  >
                    <span className="text-xl">👥</span>
                    <span>Add Friend</span>
                  </button>
                  <button
                    onClick={() => router.push('/home/translation')}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}
                  >
                    <span className="text-xl">🌍</span>
                    <span>Translate Text</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} fixed bottom-0 left-0 right-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-around h-16">
            {/* Friends */}
            <button
              onClick={() => setShowFriends(true)}
              className={`flex flex-col items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              <span className="text-2xl">👥</span>
              <span className="text-xs">Friends</span>
            </button>

            {/* Messages */}
            <button
              onClick={() => router.push('/test-chat-layout')}
              className={`flex flex-col items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              <span className="text-2xl">💬</span>
              <span className="text-xs">Messages</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowSettings(true)}
              className={`flex flex-col items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'} hover:opacity-80 transition-opacity`}
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-xs">Settings</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Drawers */}
      <ProfileDrawer isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <FriendsDrawer isOpen={showFriends} onClose={() => setShowFriends(false)} />
      <FriendRequestsDrawer isOpen={showFriendRequests} onClose={() => setShowFriendRequests(false)} />
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

