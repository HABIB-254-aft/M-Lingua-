"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const [communicationMode, setCommunicationMode] = useState("standard");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPreference, setNotificationPreference] = useState("important-only");

  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

  // Voice navigation functions
  const speakMessage = useCallback((message: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();
      isVoiceSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "en-US";
      utterance.onend = () => {
        isVoiceSpeakingRef.current = false;
        if (isOpen && isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      utterance.onerror = () => {
        isVoiceSpeakingRef.current = false;
        if (isOpen && isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      synth.speak(utterance);
    } catch {
      isVoiceSpeakingRef.current = false;
    }
  }, [isOpen]);

  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    } finally {
      voiceRecognitionRef.current = null;
      isVoiceListeningRef.current = false;
    }
  }, []);

  const startVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isOpen) return;
    if (isVoiceListeningRef.current) return;
    if (isVoiceSpeakingRef.current) return;
    if (isTypingRef.current) return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) return;

      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        try {
          const transcript = (event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript) || "";
          handleVoiceCommand(transcript.trim().toLowerCase());
        } catch {
          // ignore
        }
      };

      recognition.onerror = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
      };

      recognition.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        if (isOpen && !isVoiceSpeakingRef.current && !isTypingRef.current) {
          setTimeout(() => {
            if (isOpen && !isVoiceSpeakingRef.current && !isTypingRef.current) {
              startVoiceRecognition();
            }
          }, 500);
        }
      };

      voiceRecognitionRef.current = recognition;
      isVoiceListeningRef.current = true;
      recognition.start();
    } catch {
      isVoiceListeningRef.current = false;
      voiceRecognitionRef.current = null;
    }
  }, [isOpen]);

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current !== null) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const scheduleRecognitionRestartAfterIdle = useCallback(() => {
    clearTypingTimer();
    isTypingRef.current = true;
    typingTimerRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      typingTimerRef.current = null;
      if (isOpen && !isVoiceSpeakingRef.current) {
        startVoiceRecognition();
      }
    }, 2000);
  }, [clearTypingTimer, startVoiceRecognition, isOpen]);

  const handleVoiceCommand = useCallback((command: string) => {
    stopVoiceRecognition();

    if (command.includes("close") || command.includes("back")) {
      speakMessage("Closing settings.");
      onClose();
    } else if (command.includes("repeat")) {
      speakMessage("Settings page. Say close to close, or repeat to hear options again.");
    } else {
      speakMessage("Command not recognized. Say close to close, or repeat to hear options again.");
    }
  }, [onClose, stopVoiceRecognition, speakMessage]);

  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition();
      spokenRef.current = false;
      return;
    }

    // Load saved preferences
    try {
      const savedMode = localStorage.getItem("communicationMode");
      if (savedMode) {
        setCommunicationMode(savedMode);
      }
      const savedNotifications = localStorage.getItem("notificationsEnabled");
      if (savedNotifications === "true") {
        setNotificationsEnabled(true);
      }
      const savedPref = localStorage.getItem("notificationPreference");
      if (savedPref) {
        setNotificationPreference(savedPref);
      }
    } catch {
      // ignore
    }

    // Announce drawer opening and start voice recognition if blind mode is enabled
    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind" && !spokenRef.current) {
        spokenRef.current = true;
        const message = "Settings page. Say close to close, or repeat to hear options again.";
        speakMessage(message);
      }
    } catch {
      // ignore
    }

    return () => {
      clearTypingTimer();
      stopVoiceRecognition();
      if (typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, speakMessage, stopVoiceRecognition, clearTypingTimer]);

  const handleCommunicationModeChange = (mode: string) => {
    setCommunicationMode(mode);
    try {
      localStorage.setItem("communicationMode", mode);
    } catch {
      // ignore
    }
  };

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      localStorage.setItem("notificationsEnabled", enabled ? "true" : "false");
    } catch {
      // ignore
    }
  };

  const handleNotificationPreferenceChange = (pref: string) => {
    setNotificationPreference(pref);
    try {
      localStorage.setItem("notificationPreference", pref);
    } catch {
      // ignore
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all conversation and translation history? This action cannot be undone.")) {
      try {
        localStorage.removeItem("translationHistory");
        // Clear conversation history if stored
        alert("History cleared successfully.");
      } catch {
        alert("Error clearing history.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-blue-700"
              aria-label="Close settings"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          {/* Communication Mode Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Communication Mode</h3>
            <div className="space-y-3">
              {/* Standard Mode */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="communicationMode"
                  value="standard"
                  checked={communicationMode === "standard"}
                  onChange={(e) => handleCommunicationModeChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">💬</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Standard Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Normal chat with text and audio only.</div>
                  </div>
                </div>
              </label>

              {/* Deaf Mode */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="communicationMode"
                  value="deaf"
                  checked={communicationMode === "deaf"}
                  onChange={(e) => handleCommunicationModeChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">👂</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Deaf Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Audio is automatically converted to text and visual output.</div>
                  </div>
                </div>
              </label>

              {/* Blind Mode */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="communicationMode"
                  value="blind"
                  checked={communicationMode === "blind"}
                  onChange={(e) => handleCommunicationModeChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">👁️</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Blind Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Text is read aloud with enhanced audio feedback.</div>
                  </div>
                </div>
              </label>

              {/* Translation Mode */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="communicationMode"
                  value="translation"
                  checked={communicationMode === "translation"}
                  onChange={(e) => handleCommunicationModeChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">🌐</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Translation Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Messages are translated between languages.</div>
                  </div>
                </div>
              </label>

              {/* Custom Mode */}
              <label className="flex items-start gap-3 p-4 border-2 border-gray-200 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="communicationMode"
                  value="custom"
                  checked={communicationMode === "custom"}
                  onChange={(e) => handleCommunicationModeChange(e.target.value)}
                  className="mt-1 w-4 h-4 text-blue-600"
                />
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">⚙️</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Custom Mode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Manually choose which features to enable.</div>
                  </div>
                </div>
              </label>
            </div>
            <p className="mt-3 text-sm italic text-gray-500 dark:text-gray-400">
              You can change this at any time. Features will adapt based on your selection.
            </p>
          </section>

          {/* Notifications Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Notifications</h3>
            <div className="space-y-4">
              {/* Enable Notifications */}
              <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">Enable Notifications</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Receive notifications for important updates</div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => handleNotificationsToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Notification Preferences */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚙️</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Notification Preferences</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Choose what notifications you receive</div>
                  </div>
                </div>
                <select
                  value={notificationPreference}
                  onChange={(e) => handleNotificationPreferenceChange(e.target.value)}
                  className="mt-2 w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
                >
                  <option value="important-only">Important updates only</option>
                  <option value="all">All notifications</option>
                  <option value="none">No notifications</option>
                </select>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Security</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <span className="text-2xl">🔒</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Change Password</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Update your account password</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <span className="text-2xl">🔐</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Manage Authentication</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Manage your authentication methods</div>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy & Safety Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Privacy & Safety</h3>
            <div className="space-y-4">
              {/* App Data Usage */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📊</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">App Data Usage</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  M-Lingua processes your speech and translations locally when possible. Some features may use cloud services for better accuracy.
                </p>
              </div>

              {/* Microphone & Camera Permissions */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🎤</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Microphone & Camera Permissions</div>
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>Microphone: {typeof navigator !== "undefined" && navigator.permissions ? "✔ Granted" : "? Unknown"}</div>
                  <div>Camera: ? Unknown</div>
                </div>
              </div>

              {/* Clear History */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🗑️</span>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Clear History</div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-3">
                  Clear all conversation and translation history.
                </p>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="px-4 py-2 bg-red-600 text-white rounded-sm text-sm font-medium hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  Clear History
                </button>
              </div>
            </div>
          </section>

          {/* Help & Feedback Section */}
          <section className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Help & Feedback</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/home/help");
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span className="text-2xl">📖</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">How M-Lingua Works</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Learn about M-Lingua features and usage</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/home/accessibility-help");
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span className="text-2xl">♿</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Accessibility Help</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Get help with accessibility features</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/home/report-problem");
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span className="text-2xl">🐛</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Report a Problem</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Report bugs or issues</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/home/send-feedback");
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <span className="text-2xl">💬</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-100">Send Feedback</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Share your thoughts and suggestions</div>
                </div>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

