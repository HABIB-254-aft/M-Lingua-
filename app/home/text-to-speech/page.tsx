"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import VoiceDropdown from "../VoiceDropdown";

export default function TextToSpeechPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const readAloudBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
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

  const speak = () => {
    if (typeof window === "undefined") return;
    const t = (text || "").trim();
    if (!t) return; // do nothing on empty

    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      // Cancel any previous speech to ensure immediate start
      try {
        synth.cancel();
      } catch {
        // ignore
      }

      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";

      u.addEventListener("end", () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      });

      u.addEventListener("error", () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      });

      utteranceRef.current = u;
      setIsSpeaking(true);
      synth.speak(u);
    } catch {
      // fail silently
      setIsSpeaking(false);
      utteranceRef.current = null;
    }
  };

  const stop = () => {
    if (typeof window === "undefined") return;
    try {
      const synth = window.speechSynthesis;
      if (synth) {
        try {
          synth.cancel();
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSpeaking(false);
      utteranceRef.current = null;
    }
  };

  // selected voice (visual only for now)
  const [selectedVoice, setSelectedVoice] = useState("microsoft-zira");

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
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;
    } catch (_e) {
      return;
    }

    if (isVoiceSpeakingRef.current) return;
    if (isVoiceListeningRef.current) return;
    if (isSpeaking) return; // Don't listen while speaking

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

          if (textCmd.includes("read") || textCmd.includes("read aloud")) {
            if (text.trim()) {
              readAloudBtnRef.current?.click();
            }
            return;
          }

          if (textCmd.includes("back") || textCmd.includes("go back")) {
            router.push("/home");
            return;
          }

          if (textCmd.includes("help") || textCmd.includes("repeat")) {
            const message = "Text to Speech page. Enter text and say 'read' or 'read aloud' to hear it. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
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
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !isVoiceSpeakingRef.current && !isSpeaking) {
            setTimeout(() => startVoiceRecognition(), 300);
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
  }, [router, stopVoiceRecognition, text, isSpeaking]);

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
          if (mode === "blind" && !spokenRef.current) {
            spokenRef.current = true;
            const message = "Text to Speech page. Enter text and say 'read' or 'read aloud' to hear it. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
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
      stopVoiceRecognition();
      try {
        if (typeof window !== "undefined") {
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

        <div className="flex items-center gap-8 mt-4">
          <div className="flex items-center gap-3">
            <label htmlFor="voice-select" className="text-sm font-medium text-gray-900 dark:text-gray-100">Voice:</label>
            {/* Custom voice dropdown to reproduce options list visuals */}
            <div id="voice-select">
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

          <div className="flex items-center gap-3">
            <label htmlFor="speed-select" className="text-sm font-medium text-gray-900 dark:text-gray-100">Speed:</label>
            <select
              id="speed-select"
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-md text-sm h-10 w-36 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
              aria-label="Speed selector"
              defaultValue="1"
            >
              <option value="0.75">Slow</option>
              <option value="1">Normal</option>
              <option value="1.25">Fast</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <button
            ref={readAloudBtnRef}
            type="button"
            onClick={speak}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="Read aloud"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
              <path d="M19 8a4 4 0 0 1 0 8"></path>
            </svg>
            Read Aloud
          </button>

          <button
            type="button"
            onClick={stop}
            disabled={!isSpeaking}
            className="hidden"
          >
            Stop
          </button>

          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
            {isSpeaking ? "Playing..." : ""}
          </div>
        </div>
      </div>
    </main>
  );
}
