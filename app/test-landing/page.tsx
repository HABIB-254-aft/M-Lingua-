"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileDrawer from "@/components/ProfileDrawer";
import FriendsDrawer from "@/components/FriendsDrawer";
import FriendRequestsDrawer from "@/components/FriendRequestsDrawer";
import SettingsDrawer from "@/components/SettingsDrawer";

export default function TestLandingPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const communicationFeatures = [
    {
      id: "speech-to-text",
      title: "Speech to Text",
      description: "Convert spoken words into readable text instantly",
      icon: "🎤",
      href: "/home/speech-to-text"
    },
    {
      id: "text-to-speech",
      title: "Text to Speech",
      description: "Hear written text read aloud clearly",
      icon: "🔊",
      href: "/home/text-to-speech"
    },
    {
      id: "speech-to-sign",
      title: "Speech to Sign",
      description: "See spoken words translated to sign language",
      icon: "✋",
      href: "/home/speech-to-sign"
    },
    {
      id: "conversation-mode",
      title: "Conversation Mode",
      description: "Real-time communication between different users",
      icon: "💬",
      href: "/home/conversation-mode"
    },
    {
      id: "translation",
      title: "Translation",
      description: "Translate between multiple languages",
      icon: "🌍",
      href: "/home/translation"
    },
    {
      id: "text-to-sign",
      title: "Text to Sign",
      description: "Convert written text to sign language animation",
      icon: "✏️",
      href: "/home/text-to-sign"
    }
  ];

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

      {/* Main Content - Features Grid (Landing Page) */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              Speak. Sign. Hear. Understand.
            </h1>
            <p className={`text-lg md:text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Universal communication for everyone, regardless of ability or language.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <button
              onClick={() => router.push('/test-chat-layout')}
              className={`px-6 py-3 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white rounded-lg hover:opacity-80 transition-opacity font-medium flex items-center gap-2`}
            >
              💬 Messages
            </button>
            <button
              onClick={() => setShowFriends(true)}
              className={`px-6 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity font-medium flex items-center gap-2`}
            >
              👥 Friends
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communicationFeatures.map((feature) => (
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

          {/* Additional Info Section */}
          <div className={`mt-16 p-8 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'border-gray-700' : 'border-gray-200'} border`}>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Welcome to M-Lingua
            </h2>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
              M-Lingua is your all-in-one communication platform designed to break down barriers. 
              Whether you're deaf, blind, or speak a different language, we've got you covered.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="text-2xl mb-2">👂</div>
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>For the Deaf</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Real-time sign language translation and visual communication
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="text-2xl mb-2">👁️</div>
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>For the Blind</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Text-to-speech and voice navigation for seamless interaction
                </p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <div className="text-2xl mb-2">🌐</div>
                <h3 className={`font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Multilingual</h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Translate between 100+ languages instantly
                </p>
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

