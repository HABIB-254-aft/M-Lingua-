"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import FooterItem from "./FooterItem";
import { Users, MessageSquare, Settings, Home as HomeIcon, Grid3x3 } from "lucide-react";
import { getCurrentUser } from "@/lib/firebase/auth";

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // Determine active state based on pathname
  const isHomeActive = pathname === '/home' || pathname === '/home/';
  const isFeaturesActive = pathname?.includes('/features');
  const isMessagesActive = pathname?.includes('/messages') || pathname?.includes('/chat') || pathname?.includes('/test-chat-layout');
  const isFriendsActive = pathname?.includes('/friends');
  const isSettingsActive = pathname?.includes('/settings');

  // Load unread messages count (placeholder - can be connected to Firebase/context later)
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          // TODO: Replace with actual Firebase query for unread messages
          // For now, using localStorage as placeholder
          const unreadData = localStorage.getItem(`mlingua_unread_messages_${firebaseUser.uid}`);
          if (unreadData) {
            const unread = JSON.parse(unreadData);
            setUnreadMessagesCount(unread.total || 0);
          } else {
            setUnreadMessagesCount(0);
          }
        }
      } catch (error) {
        console.warn('Error loading unread messages count:', error);
        setUnreadMessagesCount(0);
      }
    };

    loadUnreadCount();
    
    // Set up interval to check for updates (can be replaced with real-time listener)
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

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
        router.push("/home/friends");
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };


  return (
    <>
      <footer
        role="contentinfo"
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-800/50 fixed bottom-0 left-0 right-0 z-50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-around h-16">
            {/* Home Icon */}
            <FooterItem
              icon={HomeIcon}
              label="Home"
              href="/home"
              isActive={isHomeActive}
            />

            {/* Features Icon */}
            <FooterItem
              icon={Grid3x3}
              label="Features"
              href="/home/features"
              isActive={isFeaturesActive}
            />

            {/* Friends List Icon */}
            <FooterItem
              icon={Users}
              label="Friends"
              href="/home/friends"
              isActive={isFriendsActive}
            />

            {/* Messages/Chats Icon - with unread count badge */}
            <div data-tour="messages-footer">
              <FooterItem
                icon={MessageSquare}
                label="Messages"
                href="/home/messages"
                unreadCount={unreadMessagesCount}
                onClick={handleMessagesClick}
                isActive={isMessagesActive}
              />
            </div>

            {/* Settings Icon */}
            <FooterItem
              icon={Settings}
              label="Settings"
              href="/home/settings"
              isActive={isSettingsActive}
            />
          </div>
        </div>
      </footer>
    </>
  );
}

