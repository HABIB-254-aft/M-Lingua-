"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface OutputPreferences {
  showText: boolean;
  showSign: boolean;
  showAudio: boolean;
  showTranslation: boolean;
}

const defaultPreferences: OutputPreferences = {
  showText: true,
  showSign: true,
  showAudio: true,
  showTranslation: true,
};

interface OutputPreferencesContextType {
  preferences: OutputPreferences;
  updatePreference: <K extends keyof OutputPreferences>(
    key: K,
    value: OutputPreferences[K]
  ) => void;
  resetPreferences: () => void;
}

const OutputPreferencesContext = createContext<OutputPreferencesContextType | undefined>(undefined);

export function OutputPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<OutputPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("outputPreferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle missing keys
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error("Error loading output preferences:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem("outputPreferences", JSON.stringify(preferences));
      } catch (error) {
        console.error("Error saving output preferences:", error);
      }
    }
  }, [preferences, isLoaded]);

  const updatePreference = <K extends keyof OutputPreferences>(
    key: K,
    value: OutputPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
  };

  return (
    <OutputPreferencesContext.Provider
      value={{ preferences, updatePreference, resetPreferences }}
    >
      {children}
    </OutputPreferencesContext.Provider>
  );
}

export function useOutputPreferences() {
  const context = useContext(OutputPreferencesContext);
  if (context === undefined) {
    throw new Error("useOutputPreferences must be used within an OutputPreferencesProvider");
  }
  return context;
}

