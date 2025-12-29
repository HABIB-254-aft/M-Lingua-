"use client";

import { useEffect } from "react";
import { initCacheManager } from "@/lib/cache-manager";

export default function CacheInitializer() {
  useEffect(() => {
    // Initialize cache manager on app load
    initCacheManager().catch((error) => {
      console.error("Failed to initialize cache manager:", error);
    });
  }, []);

  return null; // This component doesn't render anything
}

