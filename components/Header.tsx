"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "../contexts/ThemeContext";
import InstallButton from "./InstallButton";
import { onAuthStateChange, getCurrentUser } from "@/lib/firebase/auth";
import { getUserProfile, setUserPresence, getFriendRequests } from "@/lib/firebase/firestore";
import { offlineDetector } from "@/lib/offline-detector";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
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
          
          // Set user as online when authenticated (with retry on failure, but limit retries)
          let retryCount = 0;
          const maxRetries = 3;
          const setPresence = async () => {
            if (retryCount >= maxRetries) {
              console.warn('Max retries reached for setting user presence');
              return;
            }
            try {
              const { setUserPresence } = await import("@/lib/firebase/firestore");
              const result = await setUserPresence(firebaseUser.uid, 'Online');
              if (result.success) {
                console.log('User presence set to Online');
              } else {
                console.warn('Failed to set user presence:', result.error);
                // Retry after a short delay, but limit retries
                retryCount++;
                if (retryCount < maxRetries) {
                  setTimeout(setPresence, 1000);
                }
              }
            } catch (error) {
              console.warn('Could not set user presence:', error);
              // Retry after a short delay, but limit retries
              retryCount++;
              if (retryCount < maxRetries) {
                setTimeout(setPresence, 1000);
              }
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
          const timeoutId = setTimeout(async () => {
            if (pendingPresenceUpdateRef.current) {
              await updatePresence();
            }
          }, 1000); // Wait 1 second for connection to stabilize
          // Store timeout ID for cleanup if needed (though this is in a subscription callback)
          // Note: This timeout will complete or be cleared when component unmounts
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

  // Load friend requests count
  useEffect(() => {
    const loadFriendRequestsCount = async () => {
      try {
        const firebaseUser = getCurrentUser();
        if (firebaseUser) {
          const { requests, error } = await getFriendRequests(firebaseUser.uid);
          if (!error) {
            setFriendRequestsCount(requests.length);
          }
        } else {
          // Fallback to localStorage
          const authData = localStorage.getItem("mlingua_auth");
          if (authData) {
            const userData = JSON.parse(authData);
            const requestsData = localStorage.getItem(`mlingua_friend_requests_${userData.id}`);
            const requests = requestsData ? JSON.parse(requestsData) : [];
            setFriendRequestsCount(requests.length);
          }
        }
      } catch (error) {
        console.error("Error loading friend requests count:", error);
      }
    };

    if (isAuthenticated) {
      loadFriendRequestsCount();
      // Refresh count every 30 seconds (but not too frequently to avoid memory issues)
      const interval = setInterval(() => {
        loadFriendRequestsCount();
      }, 30000);
      return () => {
        clearInterval(interval);
      };
    }
  }, [isAuthenticated]);

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
        router.push("/home/profile");
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    }
  };

  return (
    <>
            <header role="banner" className={`${darkMode ? 'bg-slate-900/80 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md'} border-b ${darkMode ? 'border-slate-800/50' : 'border-slate-200/50'} sticky top-0 z-50 shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Link
                href="/home"
                onClick={() => {
                  // Clear any active chat states when navigating to home
                  // This ensures the dashboard loads fresh
                  if (typeof window !== 'undefined') {
                    // Clear any conversation-related state from localStorage if needed
                    // The state will be reset naturally on navigation
                  }
                }}
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
            <div className="flex items-center gap-2" data-tour="profile-header">
              {/* Install Button */}
              <InstallButton />

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

              {/* Friend Requests Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (isAuthenticated) {
                      router.push("/home/friend-requests");
                    } else {
                      router.push("/login");
                    }
                  }}
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 relative"
                  aria-label="Friend Requests"
                  title="Friend Requests"
                >
                  <span className="text-lg">👥</span>
                  {friendRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {friendRequestsCount > 9 ? '9+' : friendRequestsCount}
                    </span>
                  )}
                </button>
              </div>

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
    </>
  );
}

