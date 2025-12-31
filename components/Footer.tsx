"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import SettingsDrawer from "./SettingsDrawer";
import FriendsDrawer from "./FriendsDrawer";
import { Users, MessageSquare, Settings } from "lucide-react";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  
  // Determine active state based on pathname or open drawers
  const isMessagesActive = pathname?.includes('/messages') || pathname?.includes('/chat');
  const isFriendsActive = showFriends;
  const isSettingsActive = showSettings;

  // Don't show footer on welcome/login/signup/terms/privacy pages
  if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/terms" || pathname === "/privacy") {
    return null;
  }

  const handleMessagesClick = () => {
    // Navigate to messages/chats page
    router.push("/home/messages");
  };

  const handleFriendsClick = () => {
    // Check if user is authenticated
    try {
      const authData = localStorage.getItem("mlingua_auth");
      if (authData) {
        setShowFriends(true);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  return (
    <>
      <footer
        role="contentinfo"
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 fixed bottom-0 left-0 right-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-around h-16">
            {/* Friends List Icon */}
            <button
              type="button"
              onClick={handleFriendsClick}
              className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isFriendsActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              aria-label="Friends"
              title="Friends"
            >
              <Users className={`w-6 h-6 ${isFriendsActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className={`text-xs font-medium ${isFriendsActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>Friends</span>
              {isFriendsActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              )}
            </button>

            {/* Messages/Chats Icon */}
            <button
              type="button"
              data-tour="messages-footer"
              onClick={handleMessagesClick}
              className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isMessagesActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              aria-label="Messages"
              title="Messages"
            >
              <MessageSquare className={`w-6 h-6 ${isMessagesActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className={`text-xs font-medium ${isMessagesActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>Messages</span>
              {isMessagesActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              )}
            </button>

            {/* Settings Icon */}
            <button
              type="button"
              onClick={handleSettingsClick}
              className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isSettingsActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
              }`}
              aria-label="Settings"
              title="Settings"
            >
              <Settings className={`w-6 h-6 ${isSettingsActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className={`text-xs font-medium ${isSettingsActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>Settings</span>
              {isSettingsActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      </footer>
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <FriendsDrawer isOpen={showFriends} onClose={() => setShowFriends(false)} />
    </>
  );
}

