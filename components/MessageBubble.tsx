"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Languages, Hand, Check, CheckCheck } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import SignLanguageAvatar from "@/app/home/SignLanguageAvatar";
import { translateText } from "@/lib/translation-service";

export interface MessageBubbleProps {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  currentUserId: string;
  timestamp: Date | string | Timestamp;
  read: boolean;
  senderAvatar?: string;
  senderName?: string;
}

/**
 * MessageBubble Component
 * 
 * A message bubble with:
 * - Layout: flex-row for incoming, flex-row-reverse for outgoing
 * - Rounded bubbles with tail effect
 * - Multi-modal toolbar (Translate, Sign) with 0.7 opacity
 * - Timestamp and read checkmark
 */
export default function MessageBubble({
  id,
  text,
  senderId,
  receiverId,
  currentUserId,
  timestamp,
  read,
  senderAvatar,
  senderName,
}: MessageBubbleProps) {
  const { darkMode } = useTheme();
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [signLanguageContainerId] = useState(`sign-avatar-${id}`);

  const isOutgoing = senderId === currentUserId;
  const isIncoming = !isOutgoing;

  // Format timestamp
  const formatTimestamp = (ts: Date | string | Timestamp): string => {
    // Handle Firestore Timestamp
    let date: Date;
    if (ts && typeof ts === 'object' && 'toDate' in ts) {
      // Firestore Timestamp
      date = (ts as Timestamp).toDate();
    } else if (typeof ts === "string") {
      date = new Date(ts);
    } else if (ts instanceof Date) {
      date = ts;
    } else {
      // Fallback
      date = new Date();
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) {
      return "now";
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Handle translate
  const handleTranslate = async () => {
    if (translatedText) {
      setShowTranslation(!showTranslation);
      return;
    }

    setIsTranslating(true);
    try {
      // Detect source language (assume English for now, can be enhanced)
      const result = await translateText(text, "en", "es"); // Default to Spanish
      setTranslatedText(result.translatedText);
      setShowTranslation(true);
    } catch (error) {
      console.error("Translation error:", error);
      alert("Failed to translate message. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle sign language
  const handleSignLanguage = () => {
    setShowSignLanguage(!showSignLanguage);
  };

  return (
    <div
      className={`flex items-end gap-2 mb-4 ${
        isOutgoing ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar (only for incoming messages) */}
      {isIncoming && (
        <div className="flex-shrink-0">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName || "User"}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                darkMode ? "bg-blue-600" : "bg-blue-500"
              }`}
            >
              {(senderName || "U").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[75%] ${isOutgoing ? "items-end" : "items-start"}`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isOutgoing
              ? "rounded-br-none bg-[#3B82F6] text-white"
              : "rounded-bl-none bg-[#F1F5F9] text-[#1E293B] dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {text}
          </p>

          {/* Translation Overlay */}
          {showTranslation && translatedText && (
            <div
              className={`mt-2 pt-2 border-t ${
                isOutgoing
                  ? "border-blue-400/30"
                  : "border-slate-300 dark:border-slate-600"
              }`}
            >
              <p
                className={`text-xs italic ${
                  isOutgoing
                    ? "text-blue-100"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {translatedText}
              </p>
            </div>
          )}

          {/* Sign Language Container */}
          {showSignLanguage && (
            <div
              className={`mt-2 pt-2 border-t ${
                isOutgoing
                  ? "border-blue-400/30"
                  : "border-slate-300 dark:border-slate-600"
              }`}
            >
              <div
                id={signLanguageContainerId}
                className="w-full h-32 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900"
              >
                <SignLanguageAvatar
                  text={text}
                  speed={1}
                  containerId={signLanguageContainerId}
                />
              </div>
            </div>
          )}
        </div>

        {/* Multi-modal Toolbar */}
        <div
          className={`flex items-center gap-2 mt-1 opacity-70 hover:opacity-100 transition-opacity ${
            isOutgoing ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <button
            type="button"
            onClick={handleTranslate}
            disabled={isTranslating}
            className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
              darkMode
                ? "text-slate-400 hover:text-blue-400 hover:bg-slate-700"
                : "text-slate-500 hover:text-blue-600 hover:bg-slate-100"
            }`}
            title="Translate message"
            aria-label="Translate message"
          >
            {isTranslating ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Languages className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleSignLanguage}
            className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              darkMode
                ? "text-slate-400 hover:text-purple-400 hover:bg-slate-700"
                : "text-slate-500 hover:text-purple-600 hover:bg-slate-100"
            }`}
            title="View in sign language"
            aria-label="View in sign language"
          >
            <Hand className="w-4 h-4" />
          </button>
        </div>

        {/* Timestamp and Read Status */}
        <div
          className={`flex items-center gap-1.5 mt-0.5 ${
            isOutgoing ? "flex-row-reverse" : "flex-row"
          }`}
        >
          <span
            className={`text-xs ${
              darkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {formatTimestamp(timestamp)}
          </span>
          {/* Read Checkmark (only for outgoing messages) */}
          {isOutgoing && (
            <div className="flex-shrink-0">
              {read ? (
                <CheckCheck
                  className={`w-3.5 h-3.5 ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                  strokeWidth={2.5}
                />
              ) : (
                <Check
                  className={`w-3.5 h-3.5 ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                  strokeWidth={2.5}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

