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
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentUtterance(null);
      } catch {
        // ignore
      }
    };
  }, []);


  // selected voice and speed
  const [selectedVoice, setSelectedVoice] = useState("microsoft-zira");
  const [speed, setSpeed] = useState("1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

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

  const speakText = () => {
    if (!text.trim() || typeof window === "undefined") return;

    const synth = window.speechSynthesis;
    if (!synth) {
      alert("Speech synthesis is not supported in your browser.");
      return;
    }

    // Cancel any ongoing speech
    synth.cancel();
    setIsPlaying(false);
    setIsPaused(false);

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(text.trim());
    
    // Map voice selection to actual voice
    const voices = synth.getVoices();
    const voiceMap: Record<string, string> = {
      "microsoft-david": "Microsoft David - English (United States)",
      "microsoft-mark": "Microsoft Mark - English (United States)",
      "microsoft-zira": "Microsoft Zira - English (United States)",
      "google-de": "Google Deutsch",
      "google-us": "Google US English",
      "google-uk-female": "Google UK English Female",
      "google-uk-male": "Google UK English Male",
      "google-es": "Google español",
      "google-es-us": "Google español de Estados Unidos",
      "google-fr": "Google français",
      "google-hi": "Google हिंदी",
      "google-id": "Google Bahasa Indonesia",
      "google-it": "Google italiano",
      "google-ja": "Google 日本語",
      "google-ko": "Google 한국어",
      "google-nl": "Google Nederlands",
      "google-pl": "Google polski",
      "google-pt-br": "Google português do Brasil",
      "google-ru": "Google русский",
      "google-zh-cn": "Google 普通话（中国大陆）",
      "google-zh-hk": "Google 粤語（香港）",
    };

    const voiceName = voiceMap[selectedVoice] || "Microsoft Zira - English (United States)";
    const selectedVoiceObj = voices.find(v => v.name.includes(voiceName.split(" - ")[0]));
    if (selectedVoiceObj) {
      utterance.voice = selectedVoiceObj;
    }

    utterance.rate = parseFloat(speed);
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentUtterance(null);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentUtterance(null);
    };

    setCurrentUtterance(utterance);
    synth.speak(utterance);
  };

  const pauseSpeech = () => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (synth && isPlaying && !isPaused) {
      synth.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeech = () => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (synth && isPaused) {
      synth.resume();
      setIsPaused(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentUtterance(null);
    }
  };

  const saveAudio = async () => {
    if (!text.trim()) {
      alert("No text to save as audio");
      return;
    }

    try {
      // Note: Browser TTS doesn't support direct audio file generation
      // This is a limitation - we'll save the text and settings instead
      const audioData = {
        text: text,
        voice: selectedVoice,
        speed: speed,
        timestamp: new Date().toLocaleString(),
      };

      const stored = localStorage.getItem("textToSpeechHistory");
      const history = stored ? JSON.parse(stored) : [];
      history.unshift(audioData);
      
      const limitedHistory = history.slice(0, 100);
      localStorage.setItem("textToSpeechHistory", JSON.stringify(limitedHistory));
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
      
      alert("Note: Direct audio file download is not supported by browser TTS. Text and settings have been saved. For audio files, consider using a server-side TTS service.");
    } catch (error) {
      console.error("Error saving audio data:", error);
      alert("Failed to save");
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-gray-900 pt-12 flex items-start justify-center">
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

        {/* Playback Controls */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {!isPlaying ? (
            <button
              type="button"
              onClick={speakText}
              disabled={!text.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              aria-label="Play text"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Play
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeSpeech}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 inline-flex items-center gap-2"
                  aria-label="Resume"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseSpeech}
                  className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 inline-flex items-center gap-2"
                  aria-label="Pause"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  Pause
                </button>
              )}
              <button
                type="button"
                onClick={stopSpeech}
                className="px-6 py-3 bg-red-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 inline-flex items-center gap-2"
                aria-label="Stop"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12"></rect>
                </svg>
                Stop
              </button>
            </>
          )}
          <button
            type="button"
            onClick={saveAudio}
            disabled={!text.trim()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Save audio"
          >
            Save
          </button>
        </div>
        {showSaveSuccess && (
          <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-sm px-4 py-2">
            <span className="text-green-700 dark:text-green-300 text-sm">Saved successfully!</span>
          </div>
        )}
        {isPlaying && (
          <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-sm px-4 py-2">
            <span className="text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              {isPaused ? "Paused" : "Playing..."}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
