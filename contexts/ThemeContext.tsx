"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always initialize to false on both server and client to prevent hydration mismatch
  // The actual value will be set in useEffect after mount
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Sync with localStorage and DOM on mount
    try {
      const saved = localStorage.getItem("darkMode");
      const shouldBeDark = saved === "true";
      
      // Update state to match localStorage
      setDarkMode(shouldBeDark);
      
      // Ensure DOM matches state - use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const html = document.documentElement;
        if (shouldBeDark) {
          html.classList.add("dark");
        } else {
          html.classList.remove("dark");
        }
      });
    } catch {
      // If localStorage fails, ensure dark class is removed
      setDarkMode(false);
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("dark");
      });
    }
  }, []); // Only run on mount

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const newMode = !prev;
      try {
        localStorage.setItem("darkMode", newMode ? "true" : "false");
        // Use requestAnimationFrame to ensure DOM update happens
        requestAnimationFrame(() => {
          const html = document.documentElement;
          if (newMode) {
            html.classList.add("dark");
          } else {
            html.classList.remove("dark");
          }
        });
      } catch {
        // ignore
      }
      return newMode;
    });
  };

  // Always provide the context
  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

