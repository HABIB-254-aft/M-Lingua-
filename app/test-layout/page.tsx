"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

export default function TestLayoutPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sidebarStyle, setSidebarStyle] = useState<'left-fixed' | 'right-fixed' | 'left-overlay' | 'icon-only'>('left-fixed');

  const communicationFeatures = [
    {
      id: "speech-to-text",
      title: "Speech to Text",
      description: "Convert spoken words into readable text instantly",
      icon: "🎤",
      color: "purple",
      href: "/home/speech-to-text"
    },
    {
      id: "text-to-speech",
      title: "Text to Speech",
      description: "Hear written text read aloud clearly",
      icon: "🔊",
      color: "blue",
      href: "/home/text-to-speech"
    },
    {
      id: "speech-to-sign",
      title: "Speech to Sign",
      description: "See spoken words translated to sign language",
      icon: "✋",
      color: "yellow",
      href: "/home/speech-to-sign"
    },
    {
      id: "conversation-mode",
      title: "Conversation Mode",
      description: "Real-time communication between different users",
      icon: "💬",
      color: "purple",
      href: "/home/conversation-mode"
    },
    {
      id: "translation",
      title: "Translation",
      description: "Translate between multiple languages",
      icon: "🌍",
      color: "green",
      href: "/home/translation"
    },
    {
      id: "text-to-sign",
      title: "Text to Sign",
      description: "Convert written text to sign language animation",
      icon: "✏️",
      color: "yellow",
      href: "/home/text-to-sign"
    }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors`}>
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
              {/* Sidebar Style Selector */}
              <select
                value={sidebarStyle}
                onChange={(e) => {
                  setSidebarStyle(e.target.value as any);
                  setSidebarOpen(true);
                }}
                className={`px-3 py-2 text-sm ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'} rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
              >
                <option value="left-fixed">Left Fixed</option>
                <option value="right-fixed">Right Fixed</option>
                <option value="left-overlay">Left Overlay</option>
                <option value="icon-only">Icon Only</option>
              </select>

              {/* Profile */}
              <button
                onClick={() => setActiveSection('profile')}
                className={`px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}
              >
                👤 Profile
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

      <div className="flex relative">
        {/* Sidebar Toggle Button (for overlay and icon-only styles) */}
        {sidebarStyle === 'left-overlay' && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`fixed left-4 top-20 z-50 w-12 h-12 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-full shadow-lg flex items-center justify-center hover:opacity-80 transition-opacity`}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        )}

        {/* Left Fixed Sidebar */}
        {sidebarStyle === 'left-fixed' && (
          <aside
            className={`${
              sidebarOpen ? 'w-64' : 'w-0'
            } ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 overflow-hidden fixed left-0 top-16 bottom-0 z-40`}
          >
            <div className="p-4 space-y-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`w-full mb-4 px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}
              >
                {sidebarOpen ? '← Collapse' : '→ Expand'}
              </button>
              {sidebarOpen && (
                <>
                  <button onClick={() => setActiveSection('friends')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                    <span className="text-xl">👥</span>
                    <span className="font-medium">Friends</span>
                    <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs rounded-full`}>3</span>
                  </button>
                  <button onClick={() => setActiveSection('requests')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                    <span className="text-xl">👥</span>
                    <span className="font-medium">Friend Requests</span>
                    <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-red-600' : 'bg-red-500'} text-white text-xs rounded-full`}>2</span>
                  </button>
                  <button onClick={() => setActiveSection('messages')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                    <span className="text-xl">💬</span>
                    <span className="font-medium">Messages</span>
                    <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-green-600' : 'bg-green-500'} text-white text-xs rounded-full`}>5</span>
                  </button>
                  <button onClick={() => setActiveSection('settings')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3 mt-4`}>
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium">Settings</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Right Fixed Sidebar */}
        {sidebarStyle === 'right-fixed' && (
          <aside
            className={`${
              sidebarOpen ? 'w-64' : 'w-0'
            } ${darkMode ? 'bg-gray-800' : 'bg-white'} border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 overflow-hidden fixed right-0 top-16 bottom-0 z-40`}
          >
            <div className="p-4 space-y-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`w-full mb-4 px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}
              >
                {sidebarOpen ? 'Collapse →' : '← Expand'}
              </button>
              {sidebarOpen && (
                <>
                  <button onClick={() => setActiveSection('friends')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                    <span className="text-xl">👥</span>
                    <span className="font-medium">Friends</span>
                    <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs rounded-full`}>3</span>
                  </button>
                  <button onClick={() => setActiveSection('requests')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                    <span className="text-xl">👥</span>
                    <span className="font-medium">Friend Requests</span>
                    <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-red-600' : 'bg-red-500'} text-white text-xs rounded-full`}>2</span>
                  </button>
                  <button onClick={() => setActiveSection('messages')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                    <span className="text-xl">💬</span>
                    <span className="font-medium">Messages</span>
                    <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-green-600' : 'bg-green-500'} text-white text-xs rounded-full`}>5</span>
                  </button>
                  <button onClick={() => setActiveSection('settings')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3 mt-4`}>
                    <span className="text-xl">⚙️</span>
                    <span className="font-medium">Settings</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Left Overlay Sidebar */}
        {sidebarStyle === 'left-overlay' && (
          <>
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <aside
              className={`${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              } w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-transform duration-300 overflow-hidden fixed left-0 top-16 bottom-0 z-50 shadow-2xl`}
            >
              <div className="p-4 space-y-2">
                <button onClick={() => setSidebarOpen(false)} className={`w-full mb-4 px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity`}>
                  ✕ Close
                </button>
                <button onClick={() => setActiveSection('friends')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                  <span className="text-xl">👥</span>
                  <span className="font-medium">Friends</span>
                  <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs rounded-full`}>3</span>
                </button>
                <button onClick={() => setActiveSection('requests')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                  <span className="text-xl">👥</span>
                  <span className="font-medium">Friend Requests</span>
                  <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-red-600' : 'bg-red-500'} text-white text-xs rounded-full`}>2</span>
                </button>
                <button onClick={() => setActiveSection('messages')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3`}>
                  <span className="text-xl">💬</span>
                  <span className="font-medium">Messages</span>
                  <span className={`ml-auto px-2 py-0.5 ${darkMode ? 'bg-green-600' : 'bg-green-500'} text-white text-xs rounded-full`}>5</span>
                </button>
                <button onClick={() => setActiveSection('settings')} className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-left flex items-center gap-3 mt-4`}>
                  <span className="text-xl">⚙️</span>
                  <span className="font-medium">Settings</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* Icon Only Sidebar */}
        {sidebarStyle === 'icon-only' && (
          <aside
            className={`${
              sidebarOpen ? 'w-16' : 'w-0'
            } ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-300 overflow-hidden fixed left-0 top-16 bottom-0 z-40`}
          >
            <div className="p-2 space-y-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`w-full mb-2 px-2 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity text-center`}
              >
                {sidebarOpen ? '←' : '→'}
              </button>
              {sidebarOpen && (
                <>
                  <button onClick={() => setActiveSection('friends')} className={`w-full px-2 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity flex flex-col items-center gap-1 relative`} title="Friends">
                    <span className="text-xl">👥</span>
                    <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 ${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white text-xs rounded-full`}>3</span>
                  </button>
                  <button onClick={() => setActiveSection('requests')} className={`w-full px-2 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity flex flex-col items-center gap-1 relative`} title="Friend Requests">
                    <span className="text-xl">👥</span>
                    <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 ${darkMode ? 'bg-red-600' : 'bg-red-500'} text-white text-xs rounded-full`}>2</span>
                  </button>
                  <button onClick={() => setActiveSection('messages')} className={`w-full px-2 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity flex flex-col items-center gap-1 relative`} title="Messages">
                    <span className="text-xl">💬</span>
                    <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 ${darkMode ? 'bg-green-600' : 'bg-green-500'} text-white text-xs rounded-full`}>5</span>
                  </button>
                  <button onClick={() => setActiveSection('settings')} className={`w-full px-2 py-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${darkMode ? 'text-gray-200' : 'text-gray-700'} rounded-lg hover:opacity-80 transition-opacity flex flex-col items-center gap-1 mt-4`} title="Settings">
                    <span className="text-xl">⚙️</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${
          sidebarStyle === 'left-fixed' && sidebarOpen ? 'ml-64' : 
          sidebarStyle === 'left-fixed' && !sidebarOpen ? 'ml-0' :
          sidebarStyle === 'right-fixed' && sidebarOpen ? 'mr-64' :
          sidebarStyle === 'right-fixed' && !sidebarOpen ? 'mr-0' :
          sidebarStyle === 'left-overlay' ? 'ml-0' :
          sidebarStyle === 'icon-only' && sidebarOpen ? 'ml-16' :
          sidebarStyle === 'icon-only' && !sidebarOpen ? 'ml-0' : 'ml-0'
        }`}>
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
              {communicationFeatures.map((feature) => (
                <Link
                  key={feature.id}
                  href={feature.href}
                  className={`${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  } ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  } border rounded-lg p-6 hover:shadow-lg transition-all hover:scale-105 cursor-pointer`}
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
        </main>
      </div>

      {/* Active Section Overlay (for testing) */}
      {activeSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-md w-full mx-4`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h2>
              <button
                onClick={() => setActiveSection(null)}
                className={`text-2xl ${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:opacity-70`}
              >
                ✕
              </button>
            </div>
            <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              This would open the {activeSection} drawer/modal in the actual implementation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

