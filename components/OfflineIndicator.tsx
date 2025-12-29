"use client";

import { useEffect, useState } from "react";
import { offlineDetector, type OfflineStatus } from "@/lib/offline-detector";

export default function OfflineIndicator() {
  const [status, setStatus] = useState<OfflineStatus>({ isOnline: true, wasOffline: false });
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Subscribe to offline status changes
    const unsubscribe = offlineDetector.subscribe((newStatus) => {
      setStatus(newStatus);
      
      // Show indicator when going offline or coming back online
      if (!newStatus.isOnline || newStatus.wasOffline) {
        setShowIndicator(true);
        
        // Hide after 3 seconds if online
        if (newStatus.isOnline && newStatus.wasOffline) {
          setTimeout(() => {
            setShowIndicator(false);
          }, 3000);
        }
      }
    });

    // Check initial connection status
    offlineDetector.checkConnection().then((isOnline) => {
      if (!isOnline) {
        setShowIndicator(true);
      }
    });

    return unsubscribe;
  }, []);

  if (!showIndicator) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        status.isOnline && status.wasOffline
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      } ${showIndicator ? "translate-y-0" : "-translate-y-full"}`}
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
        {status.isOnline && status.wasOffline ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">Back online! Your changes will sync automatically.</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            <span className="font-medium">
              You're offline. Some features may be limited. Cached content is available.
            </span>
          </>
        )}
        <button
          onClick={() => setShowIndicator(false)}
          className="ml-auto hover:opacity-80 transition-opacity"
          aria-label="Dismiss notification"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

