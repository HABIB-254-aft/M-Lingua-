"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import VoiceDropdown from "../VoiceDropdown";

export default function TextToSpeechPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  
  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);

  useEffect(() => {
    // Ensure voices are loaded (they load asynchronously)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const synth = window.speechSynthesis;
      // Trigger voice loading if needed
      if (synth.getVoices().length === 0) {
        synth.addEventListener("voiceschanged", () => {
          // Voices are now loaded
        }, { once: true });
      }
    }
    
    // Cleanup on unmount
    return () => {
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    };
  }, []);


  // selected voice and speed
  const [selectedVoice, setSelectedVoice] = useState("microsoft-zira");
  const [speed, setSpeed] = useState("1");

  // Voice navigation functions
  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch (_e) {
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
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const mode = localStorage.getItem("accessibilityMode");
        if (mode !== "blind") return;
      } else {
        return;
      }
    } catch (_e) {
      return;
    }

    if (isVoiceSpeakingRef.current) return;
    if (isVoiceListeningRef.current) return;

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
          const textCmd = transcript.trim().toLowerCase();
          if (!textCmd) return;

          stopVoiceRecognition();

          if (textCmd.includes("back") || textCmd.includes("go back")) {
            router.push("/home");
            return;
          }

          if (textCmd.includes("help") || textCmd.includes("repeat")) {
            const message = "Text to Speech page. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isVoiceSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(message);
                u.lang = "en-US";
                u.addEventListener("end", () => {
                  isVoiceSpeakingRef.current = false;
                  startVoiceRecognition();
                });
                synth.speak(u);
              }
            } catch (_e) {}
            return;
          }

          // If command not recognized
          const unrecognizedMessage = "Command not recognized. Say 'help' to hear the available commands again.";
          try {
            const synth = window.speechSynthesis;
            if (synth) {
              try { synth.cancel(); } catch (_e) {}
              isVoiceSpeakingRef.current = true;
              const u = new SpeechSynthesisUtterance(unrecognizedMessage);
              u.lang = "en-US";
              u.addEventListener("end", () => {
                isVoiceSpeakingRef.current = false;
                startVoiceRecognition();
              });
              synth.speak(u);
            }
          } catch (_e) {}
        } catch (_e) {
          // ignore
        }
      };

      r.onerror = () => {
        stopVoiceRecognition();
      };

      r.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            const mode = localStorage.getItem("accessibilityMode");
            if (mode === "blind" && !isVoiceSpeakingRef.current) {
              setTimeout(() => startVoiceRecognition(), 300);
            }
          }
        } catch (_e) {
          // ignore
        }
      };

      voiceRecognitionRef.current = r;
      try {
        r.start();
        isVoiceListeningRef.current = true;
      } catch (_err) {
        voiceRecognitionRef.current = null;
        isVoiceListeningRef.current = false;
      }
    } catch (_e) {
      // ignore
    }
  }, [router, stopVoiceRecognition]);

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
          if (typeof window !== "undefined" && window.localStorage) {
            const mode = localStorage.getItem("accessibilityMode");
            if (mode === "blind" && !spokenRef.current) {
              spokenRef.current = true;
              const message = "Text to Speech page. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
              try {
                const synth = window.speechSynthesis;
                if (synth) {
                  try { synth.cancel(); } catch (_e) {}
                  isVoiceSpeakingRef.current = true;
                  const u = new SpeechSynthesisUtterance(message);
                  u.lang = "en-US";
                  u.addEventListener("end", () => {
                    isVoiceSpeakingRef.current = false;
                    startVoiceRecognition();
                  });
                  synth.speak(u);
                }
              } catch (_e) {
                // fail silently
              }
            }
          }
        } catch (e) {
          // fail silently
        }
      }, 200);
    });

    return () => {
      if (frameId !== null && typeof window !== "undefined") {
        cancelAnimationFrame(frameId);
      }
      if (timer) {
        clearTimeout(timer);
      }
      stopVoiceRecognition();
      try {
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (_e) {
        // ignore
      }
    };
  }, [startVoiceRecognition, stopVoiceRecognition]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-12 flex items-start justify-center">
      <div className="w-full max-w-4xl mx-auto px-6 text-left">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="Go back"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Text to Speech</h1>

        <label htmlFor="tts-text" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Enter text to be read aloud:
        </label>

        <textarea
          id="tts-text"
          aria-label="Enter text to be read aloud:"
          placeholder="Type or paste text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-60 px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-8 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 sm:flex-none">
            <label htmlFor="voice-select" className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">Voice:</label>
            {/* Custom voice dropdown to reproduce options list visuals */}
            <div id="voice-select" className="flex-1 sm:flex-none">
              <VoiceDropdown
                id="voice-select"
                options={[
                  { value: "microsoft-david", label: "Microsoft David - English (United States) (en-US)" },
                  { value: "microsoft-mark", label: "Microsoft Mark - English (United States) (en-US)" },
                  { value: "microsoft-zira", label: "Microsoft Zira - English (United States) (en-US)" },
                  { value: "google-de", label: "Google Deutsch (de-DE)" },
                  { value: "google-us", label: "Google US English (en-US)" },
                  { value: "google-uk-female", label: "Google UK English Female (en-GB)" },
                  { value: "google-uk-male", label: "Google UK English Male (en-GB)" },
                  { value: "google-es", label: "Google español (es-ES)" },
                  { value: "google-es-us", label: "Google español de Estados Unidos (es-US)" },
                  { value: "google-fr", label: "Google français (fr-FR)" },
                  { value: "google-hi", label: "Google हिंदी (hi-IN)" },
                  { value: "google-id", label: "Google Bahasa Indonesia (id-ID)" },
                  { value: "google-it", label: "Google italiano (it-IT)" },
                  { value: "google-ja", label: "Google 日本語 (ja-JP)" },
                  { value: "google-ko", label: "Google 한국어 (ko-KR)" },
                  { value: "google-nl", label: "Google Nederlands (nl-NL)" },
                  { value: "google-pl", label: "Google polski (pl-PL)" },
                  { value: "google-pt-br", label: "Google português do Brasil (pt-BR)" },
                  { value: "google-ru", label: "Google русский (ru-RU)" },
                  { value: "google-zh-cn", label: "Google 普通话（中国大陆） (zh-CN)" },
                  { value: "google-zh-hk", label: "Google 粤語（香港） (zh-HK)" },
                ]}
                value={selectedVoice}
                onChange={(v: string) => setSelectedVoice(v)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label htmlFor="speed-select" className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">Speed:</label>
            <select
              id="speed-select"
              className="px-3 sm:px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-md text-xs sm:text-sm h-10 w-full sm:w-36 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
              aria-label="Speed selector"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
            >
              <option value="0.75">Slow</option>
              <option value="1">Normal</option>
              <option value="1.25">Fast</option>
            </select>
          </div>
        </div>
      </div>
    </main>
  );
}
