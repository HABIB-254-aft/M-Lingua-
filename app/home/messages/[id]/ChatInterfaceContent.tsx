"use client";

import { useParams } from "next/navigation";
import { getCurrentUser, onAuthStateChange } from "@/lib/firebase/auth";
import { useState, useEffect } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import { useRouter } from "next/navigation";

/**
 * Chat Interface Content
 * 
 * Gets conversation ID from URL params and renders ChatInterface
 */
export default function ChatInterfaceContent() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let hasChecked = false;
    let timeoutId: NodeJS.Timeout | null = null;

    // Wait for Firebase auth to initialize before checking
    // This prevents redirects on page refresh when auth hasn't loaded yet
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (hasChecked) return; // Prevent multiple checks
      
      if (firebaseUser) {
        setCurrentUserId(firebaseUser.uid);
        setIsLoading(false);
        setAuthChecked(true);
        hasChecked = true;
        if (timeoutId) clearTimeout(timeoutId);
      } else {
        // Wait a bit for auth to fully initialize before redirecting
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (hasChecked) return;
          const currentUser = getCurrentUser();
          if (currentUser) {
            setCurrentUserId(currentUser.uid);
            setIsLoading(false);
            setAuthChecked(true);
            hasChecked = true;
          } else {
            // Auth has initialized but no user - redirect to login
            setAuthChecked(true);
            setIsLoading(false);
            hasChecked = true;
            router.push("/login");
          }
        }, 1000); // Give Firebase auth 1 second to initialize
      }
    });

    // Also check immediately in case auth is already initialized
    const currentUser = getCurrentUser();
    if (currentUser) {
      setCurrentUserId(currentUser.uid);
      setIsLoading(false);
      setAuthChecked(true);
      hasChecked = true;
    }

    return () => {
      unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router]); // Remove authChecked from dependencies to prevent loops

  if (isLoading || !currentUserId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-200">
            Invalid conversation
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Conversation ID is missing from the URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatInterface conversationId={conversationId} currentUserId={currentUserId} />
    </div>
  );
}

