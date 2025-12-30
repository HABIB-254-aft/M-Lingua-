"use client";

import { useState, useEffect } from "react";
import { useOutputPreferences } from "@/contexts/OutputPreferencesContext";

export interface AdaptiveUIConfig {
  // Panel visibility based on accessibility mode
  showSignPanel: boolean;
  showAudioPanel: boolean;
  showTranslationPanel: boolean;
  showTextPanel: boolean;
  
  // Layout optimizations
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Accessibility mode
  accessibilityMode: "blind" | "deaf" | "standard" | "multilingual" | null;
  
  // Sign animation sizing
  signAnimationHeight: string;
  signAnimationCompact: boolean;
}

/**
 * Hook for adaptive UI based on user preferences and accessibility mode
 */
export function useAdaptiveUI(): AdaptiveUIConfig {
  const { preferences } = useOutputPreferences();
  const [accessibilityMode, setAccessibilityMode] = useState<"blind" | "deaf" | "standard" | "multilingual" | null>(null);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Get accessibility mode from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const mode = localStorage.getItem("accessibilityMode");
        if (mode === "blind" || mode === "deaf" || mode === "standard" || mode === "multilingual") {
          setAccessibilityMode(mode);
        } else {
          setAccessibilityMode("standard");
        }
      } catch {
        setAccessibilityMode("standard");
      }
    }
  }, []);

  // Track window size
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const isMobile = windowSize.width < 640; // sm breakpoint
  const isTablet = windowSize.width >= 640 && windowSize.width < 1024; // md breakpoint
  const isDesktop = windowSize.width >= 1024;

  // Adaptive logic based on accessibility mode and preferences
  // Blind users: Hide sign language (visual), keep audio and text
  // Deaf users: Hide audio, keep sign language and text
  // Standard/Multilingual: Show all based on preferences
  const showSignPanel = preferences.showSign && accessibilityMode !== "blind";
  const showAudioPanel = preferences.showAudio && accessibilityMode !== "deaf";
  const showTranslationPanel = preferences.showTranslation;
  const showTextPanel = preferences.showText; // Always show text if enabled (accessible to all)

  // Sign animation sizing based on screen size and preferences
  const signAnimationHeight = isMobile 
    ? "h-24" 
    : isTablet 
    ? "h-32" 
    : "h-48";
  const signAnimationCompact = isMobile || !preferences.showSign;

  return {
    showSignPanel,
    showAudioPanel,
    showTranslationPanel,
    showTextPanel,
    isMobile,
    isTablet,
    isDesktop,
    accessibilityMode,
    signAnimationHeight,
    signAnimationCompact,
  };
}

