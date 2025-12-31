"use client";

import { UserPlus } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface EmptyFriendsViewProps {
  onFindFriends: () => void;
}

/**
 * EmptyFriendsView Component
 * 
 * Empty state for when user has no friends.
 * Styling: Center-aligned, Lucide UserPlus icon, text, and Find Friends button
 */
export default function EmptyFriendsView({ onFindFriends }: EmptyFriendsViewProps) {
  const { darkMode } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className={`mb-6 w-20 h-20 flex items-center justify-center ${
          darkMode ? "text-slate-600" : "text-slate-300"
        }`}
        aria-hidden="true"
      >
        <UserPlus className="w-full h-full" strokeWidth={1.5} />
      </div>
      <h3
        className={`text-lg font-semibold mb-2 ${
          darkMode ? "text-slate-200" : "text-slate-900"
        }`}
        style={{ fontFamily: 'var(--font-lexend)' }}
      >
        Your circle is ready to grow
      </h3>
      <p
        className={`text-sm mb-6 ${
          darkMode ? "text-slate-400" : "text-slate-600"
        }`}
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        Connect with friends to start meaningful conversations
      </p>
      <button
        type="button"
        onClick={onFindFriends}
        className={`px-6 py-3 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          darkMode
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
        style={{ fontFamily: 'var(--font-inter)' }}
        aria-label="Find Friends"
      >
        Find Friends
      </button>
    </div>
  );
}

