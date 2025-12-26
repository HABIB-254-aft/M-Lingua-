"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import TextToSpeechCard from "./TextToSpeechCard";
import SpeechToTextCard from "./SpeechToTextCard";
import TranslationCard from "./TranslationCard";
import SpeechToSignCard from "./SpeechToSignCard";
import TextToSignCard from "./TextToSignCard";
import ConversationModeCard from "./ConversationModeCard";

export default function Home() {
  const router = useRouter();
  
  // Voice navigation refs
  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const spokenRef = useRef(false);
  const speakMessageRef = useRef<((message: string, onEnd?: () => void) => void) | null>(null);
  const startRecognitionRef = useRef<(() => void) | null>(null);

  const stopRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.stop();
        } catch (_e) {
          // ignore
        }
      }
    } finally {
      recognitionRef.current = null;
      isListeningRef.current = false;
    }
  }, []);

  const clearTypingTimer = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current as any);
        typingTimerRef.current = null;
      }
    } catch (_e) {}
  }, []);

  const scheduleRecognitionRestartAfterIdle = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      clearTypingTimer();
      isTypingRef.current = true;
      typingTimerRef.current = window.setTimeout(() => {
        isTypingRef.current = false;
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !isSpeakingRef.current) {
            startRecognition();
          }
        } catch (_e) {
          // ignore
        }
      }, 700) as unknown as number;
    } catch (_e) {
      // ignore
    }
  }, [clearTypingTimer]);

  const speakMessage = useCallback((message: string, onEnd?: () => void) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    stopRecognition();

    try {
      try { synth.cancel(); } catch (_e) {}
      isSpeakingRef.current = true;
      const u = new SpeechSynthesisUtterance(message);
      u.lang = "en-US";
      u.addEventListener("end", () => {
        isSpeakingRef.current = false;
        if (onEnd) {
          onEnd();
        } else if (!isTypingRef.current && startRecognitionRef.current) {
          startRecognitionRef.current();
        }
      });
      synth.speak(u);
    } catch (_e) {
      isSpeakingRef.current = false;
      if (!isTypingRef.current && startRecognitionRef.current) {
        startRecognitionRef.current();
      }
    }
  }, [stopRecognition]);


  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;
    } catch (_e) {
      return;
    }

    if (isSpeakingRef.current) return;
    if (isListeningRef.current) return;
    if (isTypingRef.current) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const r = new SpeechRec();
      r.lang = "en-US";
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;

      r.onresult = (ev: any) => {
        try {
          const transcript = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || "";
          const text = transcript.trim().toLowerCase();
          if (!text) return;

          stopRecognition();

          // Feature navigation with flexible matching and shortcuts
          // Check for "text to speech" or "text speech" first (text comes before speech)
          if (text.includes("text") && text.includes("speech")) {
            // Check word order: if "text" appears before "speech", it's "text to speech"
            const textIndex = text.indexOf("text");
            const speechIndex = text.indexOf("speech");
            if (textIndex < speechIndex) {
              router.push("/home/text-to-speech");
              return;
            } else {
              // "speech" comes before "text", so it's "speech to text"
              router.push("/home/speech-to-text");
              return;
            }
          }

          // Fallback to simple includes checks
          if (text.includes("speech text") || text === "speech text") {
            router.push("/home/speech-to-text");
            return;
          }

          if (text.includes("text speech") || text === "text speech") {
            router.push("/home/text-to-speech");
            return;
          }

          if (text.includes("translation") || text.includes("translate")) {
            router.push("/home/translation");
            return;
          }

          if ((text.includes("speech") && text.includes("sign")) || text.includes("speech sign") || text === "speech sign") {
            router.push("/home/speech-to-sign");
            return;
          }

          if ((text.includes("text") && text.includes("sign") && !text.includes("speech")) || text.includes("text sign") || text === "text sign") {
            router.push("/home/text-to-sign");
            return;
          }

          if (text.includes("conversation")) {
            router.push("/home/conversation-mode");
            return;
          }

          // Help commands
          if (text.includes("help") || text.includes("repeat")) {
            const welcomeMessage = "Welcome to M-Lingua home page. You have 6 features available: Speech to Text, Text to Speech, Translation, Speech to Sign, Text to Sign, and Conversation Mode. Say a feature name to open it, or say 'help' or 'repeat' to hear these options again.";
            if (speakMessageRef.current) {
              speakMessageRef.current(welcomeMessage, () => {
                if (startRecognitionRef.current) {
                  startRecognitionRef.current();
                }
              });
            }
            return;
          }

          // If command not recognized, notify user and offer help
          const unrecognizedMessage = "Command not recognized. Say 'help' to hear the available commands again.";
          if (speakMessageRef.current) {
            speakMessageRef.current(unrecognizedMessage, () => {
              if (startRecognitionRef.current) {
                startRecognitionRef.current();
              }
            });
          }
        } catch (_e) {
          // ignore
        }
      };

      r.onerror = () => {
        stopRecognition();
      };

      r.onend = () => {
        isListeningRef.current = false;
        recognitionRef.current = null;
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !isSpeakingRef.current && !isTypingRef.current && startRecognitionRef.current) {
            setTimeout(() => startRecognitionRef.current!(), 300);
          }
        } catch (_e) {
          // ignore
        }
      };

      recognitionRef.current = r;
      try {
        r.start();
        isListeningRef.current = true;
      } catch (_err) {
        recognitionRef.current = null;
        isListeningRef.current = false;
      }
    } catch (_e) {
      // ignore
    }
  }, [router, stopRecognition]);

  // Store refs to break circular dependency
  useEffect(() => {
    speakMessageRef.current = speakMessage;
  }, [speakMessage]);

  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  // Voice navigation setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Always reset spokenRef on mount to ensure it works on refresh
    spokenRef.current = false;

    let timer: NodeJS.Timeout | null = null;
    let frameId: number | null = null;

    // Use requestAnimationFrame to ensure DOM is ready
    frameId = requestAnimationFrame(() => {
      // Then use a small timeout to ensure speech synthesis is ready
      timer = setTimeout(() => {
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !spokenRef.current && speakMessageRef.current) {
            spokenRef.current = true;
            const welcomeMessage = "Welcome to M-Lingua home page. You have 6 features available: Speech to Text, Text to Speech, Translation, Speech to Sign, Text to Sign, and Conversation Mode. Say a feature name to open it, or say 'help' or 'repeat' to hear these options again.";
            speakMessageRef.current(welcomeMessage, () => {
              if (startRecognitionRef.current) {
                startRecognitionRef.current();
              }
            });
          }
        } catch (e) {
          // fail silently
        }
      }, 200);
    });

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      if (timer) {
        clearTimeout(timer);
      }
      stopRecognition();
      try { clearTypingTimer(); } catch (_e) {}
      isTypingRef.current = false;
    };
  }, [stopRecognition, clearTypingTimer]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <h1 className="text-2xl md:text-3xl font-semibold text-blue-600 dark:text-blue-400 text-center">Speak. Sign. Hear. Understand.</h1>
        <p className="text-base text-gray-600 dark:text-gray-300 mt-3 text-center">Universal communication for everyone, regardless of ability or language.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {/* Speech to Text — interactive card (preserves exact visuals) */}
          <SpeechToTextCard />

          {/* Text to Speech — interactive card (preserves exact visuals) */}
          <TextToSpeechCard />

          {/* Speech to Sign — interactive card (preserves exact visuals) */}
          <SpeechToSignCard />

          {/* Conversation Mode — interactive card (preserves exact visuals) */}
          <ConversationModeCard />

          {/* Translation — interactive card (preserves exact visuals) */}
          <TranslationCard />

          {/* Text to Sign — interactive card (preserves exact visuals) */}
          <TextToSignCard />
        </div>
      </div>
    </main>
  );
}