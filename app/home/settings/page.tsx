"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsDrawer from "@/components/SettingsDrawer";
import { getCurrentUser } from "@/lib/firebase/auth";

/**
 * Settings Page
 * 
 * Full-page view of the settings functionality.
 * Uses the SettingsDrawer component but renders it as a full page.
 */
export default function SettingsPage() {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Render SettingsDrawer as full page - it will detect it's on /home/settings and render full width */}
      <SettingsDrawer 
        isOpen={true} 
        onClose={() => router.push("/home")} 
      />
    </div>
  );
}

