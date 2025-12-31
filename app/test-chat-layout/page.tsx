"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileDrawer from "@/components/ProfileDrawer";
import FriendsDrawer from "@/components/FriendsDrawer";
import FriendRequestsDrawer from "@/components/FriendRequestsDrawer";
import SettingsDrawer from "@/components/SettingsDrawer";

export default function TestChatLayoutPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'features'>('chat');

  // Mock recent chats data
  const recentChats = [
    { id: "1", name: "John Doe", lastMessage: "Hey, how are you?", time: "2m ago", unread: 2 },
    { id: "2", name: "Jane Smith", lastMessage: "See you tomorrow!", time: "1h ago", unread: 0 },
    { id: "3", name: "Mike Johnson", lastMessage: "Thanks for the help", time: "3h ago", unread: 5 },
    { id: "4", name: "Sarah Williams", lastMessage: "Can we meet?", time: "Yesterday", unread: 0 },
  ];

  // Mock messages for selected chat
  const messages = selectedChat ? [
    { id: "1", text: "Hello!", sender: "other", time: "10:30 AM" },
    { id: "2", text: "Hi there! How can I help you?", sender: "me", time: "10:31 AM" },
    { id: "3", text: "I wanted to ask about the project", sender: "other", time: "10:32 AM" },
    { id: "4", text: "Sure, what would you like to know?", sender: "me", time: "10:33 AM" },
  ] : [];

  const filteredChats = recentChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChatData = recentChats.find(chat => chat.id === selectedChat);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
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

            {/* Navigation Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentView(currentView === 'chat' ? 'features' : 'chat')}
                className={`px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-sm`}
              >
                {currentView === 'chat' ? '📱 Features' : '💬 Messages'}
              </button>

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

      {/* Main Content Area - Two Columns or Features Grid */}
      {currentView === 'chat' ? (
        <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Recent Chats */}
        <div className={`w-full md:w-80 lg:w-96 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
          {/* Search Box */}
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-900'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Recent Chats List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length > 0 ? (
              <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className={`w-full px-4 py-3 text-left transition-colors ${
                      selectedChat === chat.id 
                        ? (darkMode ? 'bg-gray-700' : 'bg-blue-50')
                        : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                        {chat.name.charAt(0)}
                      </div>
                      
                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                            {chat.name}
                          </h3>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 ml-2`}>
                            {chat.time}
                          </span>
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} truncate`}>
                          {chat.lastMessage}
                        </p>
                      </div>

                      {/* Unread Badge */}
                      {chat.unread > 0 && (
                        <span className={`px-2 py-0.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs rounded-full flex-shrink-0`}>
                          {chat.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <div className="text-4xl mb-4">🔍</div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No chats found matching "{searchQuery}"
                </p>
              </div>
            ) : (
              // Empty State - Show (+) icon for new chat
              <div className="flex flex-col items-center justify-center h-full p-8">
                <button
                  onClick={() => setSelectedChat('new')}
                  className={`w-16 h-16 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-full flex items-center justify-center text-3xl hover:opacity-80 transition-opacity shadow-lg`}
                  title="Start new chat"
                >
                  +
                </button>
                <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  No recent chats. Click + to start a new chat.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Open Chat */}
        <div className={`flex-1 flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {selectedChat && selectedChatData ? (
            <>
              {/* Chat Header */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} flex items-center justify-center text-white font-bold`}>
                    {selectedChatData.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {selectedChatData.name}
                    </h3>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedChatData.name}@mlingua.com
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfile(true)}
                  className={`px-4 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}
                >
                  View Profile
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender === 'me'
                        ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                        : (darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-900')
                    }`}>
                      <p>{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'me'
                          ? 'text-blue-100'
                          : (darkMode ? 'text-gray-400' : 'text-gray-500')
                      }`}>
                        {message.time}
                      </p>
                    </div>
                    {message.sender === 'me' && (
                      <button
                        onClick={() => {
                          if (confirm('Delete this message?')) {
                            // Handle delete
                            console.log('Delete message:', message.id);
                          }
                        }}
                        className={`ml-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} hover:${darkMode ? 'text-red-400' : 'text-red-600'}`}
                        title="Delete message"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} p-4`}>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className={`flex-1 px-4 py-2 ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-900'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  <button
                    className={`px-6 py-2 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-lg hover:opacity-80 transition-opacity`}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty State - No chat selected
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Select a chat to start messaging
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Or click + to start a new chat
                </p>
              </div>
            </div>
          )}
        </div>
        </div>
      ) : (
        /* Features View - Main App Features */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page Title */}
            <div className="text-center mb-12">
              <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Speak. Sign. Hear. Understand.
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Universal communication for everyone, regardless of ability or language.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { id: "speech-to-text", title: "Speech to Text", description: "Convert spoken words into readable text instantly", icon: "🎤", href: "/home/speech-to-text" },
                { id: "text-to-speech", title: "Text to Speech", description: "Hear written text read aloud clearly", icon: "🔊", href: "/home/text-to-speech" },
                { id: "speech-to-sign", title: "Speech to Sign", description: "See spoken words translated to sign language", icon: "✋", href: "/home/speech-to-sign" },
                { id: "conversation-mode", title: "Conversation Mode", description: "Real-time communication between different users", icon: "💬", href: "/home/conversation-mode" },
                { id: "translation", title: "Translation", description: "Translate between multiple languages", icon: "🌍", href: "/home/translation" },
                { id: "text-to-sign", title: "Text to Sign", description: "Convert written text to sign language animation", icon: "✏️", href: "/home/text-to-sign" }
              ].map((feature) => (
                <Link
                  key={feature.id}
                  href={feature.href}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border rounded-lg p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer`}
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {feature.title}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {feature.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

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

            {/* Messages - Active when in chat view */}
            <button
              onClick={() => setCurrentView('chat')}
              className={`flex flex-col items-center gap-1 ${currentView === 'chat' ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-gray-300' : 'text-gray-600')} hover:opacity-80 transition-opacity`}
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

