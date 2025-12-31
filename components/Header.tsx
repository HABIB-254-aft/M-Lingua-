"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../contexts/ThemeContext";
import SettingsDrawer from "./SettingsDrawer";
import ProfileDrawer from "./ProfileDrawer";
import FriendsDrawer from "./FriendsDrawer";
import InstallButton from "./InstallButton";
import { onAuthStateChange, getCurrentUser } from "@/lib/firebase/auth";
import { getUserProfile, setUserPresence } from "@/lib/firebase/firestore";
import { offlineDetector } from "@/lib/offline-detector";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const pendingPresenceUpdateRef = useRef<'Online' | 'Offline' | null>(null);
  const { darkMode, toggleDarkMode } = useTheme();

  // Check authentication status and load user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Firebase auth first
        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          // Get user profile from Firestore
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setIsAuthenticated(true);
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: profile.displayName || firebaseUser.displayName,
              username: profile.username,
              photoURL: profile.photoURL || firebaseUser.photoURL,
            });
            return;
          }
        }
        
        // Fallback to localStorage for backward compatibility
        const authData = localStorage.getItem("mlingua_auth");
        if (authData) {
          const userData = JSON.parse(authData);
          setIsAuthenticated(true);
          setUser(userData);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch {
        // Fallback to localStorage
        try {
          const authData = localStorage.getItem("mlingua_auth");
          if (authData) {
            const userData = JSON.parse(authData);
            setIsAuthenticated(true);
            setUser(userData);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };

    checkAuth();
    
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        if (profile) {
          currentUserIdRef.current = firebaseUser.uid;
          setIsAuthenticated(true);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: profile.displayName || firebaseUser.displayName,
            username: profile.username,
            photoURL: profile.photoURL || firebaseUser.photoURL,
          });
          
          // Set user as online when authenticated (with retry on failure)
          const setPresence = async () => {
            try {
              const { setUserPresence } = await import("@/lib/firebase/firestore");
              const result = await setUserPresence(firebaseUser.uid, 'Online');
              if (result.success) {
                console.log('User presence set to Online');
              } else {
                console.warn('Failed to set user presence:', result.error);
                // Retry after a short delay
                setTimeout(setPresence, 1000);
              }
            } catch (error) {
              console.warn('Could not set user presence:', error);
              // Retry after a short delay
              setTimeout(setPresence, 1000);
            }
          };
          setPresence();
        }
      } else {
        // Get the user ID before clearing state
        const previousUserId = currentUserIdRef.current;
        currentUserIdRef.current = null;
        
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem("mlingua_auth");
        
        // Set user as offline when logged out
        if (previousUserId) {
          try {
            const { setUserPresence } = await import("@/lib/firebase/firestore");
            await setUserPresence(previousUserId, 'Offline');
          } catch (error) {
            console.warn('Could not set user presence to Offline:', error);
          }
        }
      }
    });
    
    // Listen for storage changes (e.g., when user logs in/out in another tab)
    window.addEventListener("storage", checkAuth);
    // Also check on focus (in case user logged in/out in same tab)
    window.addEventListener("focus", checkAuth);
    
    // Listen to online/offline status and update ONLY this user's presence
    // This does not affect other users - each user has independent presence
    const offlineUnsubscribe = offlineDetector.subscribe(async (status) => {
      const firebaseUser = getCurrentUser();
      if (firebaseUser && status.isOnline !== undefined) {
        const newStatus = status.isOnline ? 'Online' : 'Offline';
        console.log(`[${firebaseUser.uid}] Connection status changed: ${newStatus}. Updating ONLY this user's presence...`);
        
        // Store the desired status for retry if update fails
        pendingPresenceUpdateRef.current = newStatus;
        
        // Try to update presence
        const updatePresence = async () => {
          try {
            const result = await setUserPresence(firebaseUser.uid, newStatus);
            if (result.success) {
              console.log(`[${firebaseUser.uid}] Presence updated to ${newStatus} (this only affects this user's status)`);
              pendingPresenceUpdateRef.current = null; // Clear pending update
            } else {
              console.warn('Failed to update presence:', result.error);
              // If we're offline and the update failed, that's expected
              // The presence will be updated when we come back online
              if (!status.isOnline) {
                console.log('User is offline - presence update will be retried when connection is restored');
              }
            }
          } catch (error: any) {
            console.warn('Could not update user presence:', error);
            // If we're offline, this is expected - we'll retry when back online
            if (!status.isOnline) {
              console.log('User is offline - presence update will be retried when connection is restored');
            }
          }
        };
        
        // If we're online, try to update immediately
        // If we're offline, the update will fail but we'll retry when back online
        await updatePresence();
        
        // If we just came back online and there's a pending update, retry it
        if (status.isOnline && pendingPresenceUpdateRef.current) {
          console.log('Connection restored - retrying pending presence update...');
          setTimeout(async () => {
            if (pendingPresenceUpdateRef.current) {
              await updatePresence();
            }
          }, 1000); // Wait 1 second for connection to stabilize
        }
      }
    });
    
    // Also check connection status immediately on mount
    offlineDetector.checkConnection().then((isOnline) => {
      const firebaseUser = getCurrentUser();
      if (firebaseUser) {
        setUserPresence(firebaseUser.uid, isOnline ? 'Online' : 'Offline').catch((error) => {
          console.warn('Could not set initial presence:', error);
        });
      }
    });

    return () => {
      unsubscribe();
      offlineUnsubscribe();
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("focus", checkAuth);
    };
  }, []); // Only run on mount

  // Re-check auth when pathname changes (e.g., after login)
  useEffect(() => {
    try {
      const authData = localStorage.getItem("mlingua_auth");
      if (authData) {
        const userData = JSON.parse(authData);
        setIsAuthenticated(true);
        setUser(userData);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [pathname]);

  // Don't show header on welcome/login/signup/terms/privacy pages
  if (pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/terms" || pathname === "/privacy") {
    return null;
  }

  const handleProfileClick = () => {
    try {
      const authData = localStorage.getItem("mlingua_auth");
      if (authData) {
        setShowProfile(true);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  return (
    <>
      <header role="banner" className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Link
                href="/home"
                className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded"
                aria-label="M-Lingua Home"
              >
                <img
                  src="/Logo_2.png"
                  alt="M-Lingua logo"
                  className="h-8 w-8 md:h-10 md:w-10"
                />
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">M-Lingua</h1>
              </Link>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-2">
              {/* Install Button */}
              <InstallButton />

              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors hover:bg-blue-700"
                aria-label="Open Settings"
                title="Settings"
              >
                <span className="text-lg">⚙️</span>
              </button>

              {/* Login/User Auth Button */}
              <div className="relative">
                {isAuthenticated && user ? (
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    aria-label="Profile"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || user.username || "User"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(user.displayName || user.email || user.username || "U").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user.username || user.displayName || "Profile"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    aria-label="Login"
                  >
                    <span className="text-lg">👤</span>
                    <span className="hidden sm:inline text-sm font-medium">Login</span>
                  </button>
                )}
              </div>

              {/* Friends Button */}
              <button
                type="button"
                onClick={() => {
                  if (isAuthenticated) {
                    setShowFriends(true);
                  } else {
                    router.push("/login");
                  }
                }}
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Friends"
                title="Friends"
              >
                <span className="text-lg">👥</span>
              </button>

              {/* Dark Mode Toggle */}
              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors hover:bg-blue-700"
                aria-label="Toggle Dark Mode"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                suppressHydrationWarning
              >
                <span className="text-lg" suppressHydrationWarning>{darkMode ? "☀️" : "🌙"}</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <SettingsDrawer isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <ProfileDrawer isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <FriendsDrawer isOpen={showFriends} onClose={() => setShowFriends(false)} />
    </>
  );
}

