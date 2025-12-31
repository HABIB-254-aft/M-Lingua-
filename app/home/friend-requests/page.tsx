"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FriendRequestsDrawer from "@/components/FriendRequestsDrawer";
import { getCurrentUser } from "@/lib/firebase/auth";

/**
 * Friend Requests Page
 * 
 * Full-page view of the friend requests functionality.
 * Uses the FriendRequestsDrawer component but renders it as a full page.
 */
export default function FriendRequestsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem("mlingua_auth");
        const firebaseUser = getCurrentUser();
        
        if (authData || firebaseUser) {
          setIsAuthenticated(true);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Render FriendRequestsDrawer as full page - it will detect it's on /home/friend-requests and render full width */}
      <FriendRequestsDrawer 
        isOpen={true} 
        onClose={() => router.push("/home")} 
      />
    </div>
  );
}

