"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function TranslationPage() {
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const translateBtnRef = useRef<HTMLButtonElement | null>(null);

  // Check for transcript from Speech to Text page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedText = sessionStorage.getItem("translationInput");
      if (storedText) {
        setInputText(storedText);
        // Clear it so it doesn't persist on refresh
        sessionStorage.removeItem("translationInput");
      }
    }
  }, []);

  const translate = async () => {
    console.log("Translate button clicked");
    const text = (inputText || "").trim();
    console.log("Input text:", text);
    
    if (!text) {
      alert("Please enter text to translate");
      return;
    }

    if (sourceLang === targetLang) {
      setOutputText(text);
      return;
    }

    setIsTranslating(true);
    setOutputText("");

    try {
      // Use MyMemory Translation API (free, no API key needed)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
      console.log("Translation URL:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Translation response:", data);
      
      if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
        const translatedText = data.responseData.translatedText;
        setOutputText(translatedText);
        console.log("Translation successful:", translatedText);

        // Save to history
        try {
          if (typeof window !== "undefined") {
            const historyItem = {
              id: Date.now().toString(),
              sourceText: text,
              translatedText: translatedText,
              sourceLang: sourceLang,
              targetLang: targetLang,
              timestamp: new Date().toLocaleString(),
            };

            const stored = localStorage.getItem("translationHistory");
            const history = stored ? JSON.parse(stored) : [];
            history.unshift(historyItem); // Add to beginning

            // Keep only last 100 items
            const limitedHistory = history.slice(0, 100);
            localStorage.setItem("translationHistory", JSON.stringify(limitedHistory));
          }
        } catch (error) {
          console.error("Error saving to history:", error);
        }
      } else {
        // Try to get error message
        const errorMsg = data.responseData?.error || data.responseDetails || "Translation failed";
        console.error("Translation failed:", errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error("Translation error:", error);
      // Show error to user
      const errorMessage = error.message || "Failed to translate. Please check your internet connection and try again.";
      setOutputText(`Error: ${errorMessage}`);
      alert(`Translation failed: ${errorMessage}`);
      // Clear error message after 5 seconds
      setTimeout(() => {
        setOutputText((prev) => prev.startsWith("Error:") ? "" : prev);
      }, 5000);
    } finally {
      setIsTranslating(false);
    }
  };

  const copyTranslation = () => {
    if (outputText) {
      navigator.clipboard.writeText(outputText).catch(() => {
        // ignore
      });
    }
  };

  const speakTranslation = () => {
    if (typeof window === "undefined") return;
    const t = (outputText || "").trim();
    if (!t) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = targetLang === "es" ? "es-ES" : targetLang === "fr" ? "fr-FR" : "en-US";
      synth.speak(u);
    } catch {
      // fail silently
    }
  };

  const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ru", label: "Russian" },
    { value: "zh", label: "Chinese" },
    { value: "ja", label: "Japanese" },
    { value: "ko", label: "Korean" },
    { value: "ar", label: "Arabic" },
    { value: "hi", label: "Hindi" },
  ];

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
    if (isTranslating) return; // Don't listen while translating

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

          if (textCmd.includes("translate")) {
            if (inputText.trim() && !isTranslating) {
              translateBtnRef.current?.click();
            }
            return;
          }

          if (textCmd.includes("back") || textCmd.includes("go back")) {
            router.push("/home");
            return;
          }

          if (textCmd.includes("help") || textCmd.includes("repeat")) {
            const message = "Translation page. Enter text and say 'translate' to translate it. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
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
          if (mode === "blind" && !isVoiceSpeakingRef.current && !isTranslating) {
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
  }, [router, stopVoiceRecognition, inputText, isTranslating]);

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
            const message = "Translation page. Enter text and say 'translate' to translate it. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
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

        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Translation</h1>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <label htmlFor="source-language" className="text-sm font-medium text-gray-900 dark:text-gray-100">From:</label>
            <select
              id="source-language"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-md text-sm h-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
              aria-label="Source language"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="target-language" className="text-sm font-medium text-gray-900 dark:text-gray-100">To:</label>
            <select
              id="target-language"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-md text-sm h-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
              aria-label="Target language"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <button
            ref={translateBtnRef}
            type="button"
            onClick={translate}
            disabled={isTranslating || !inputText.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Translate"
          >
            {isTranslating ? "Translating..." : "Translate"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="translation-input" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Enter text to translate:
            </label>
            <textarea
              id="translation-input"
              aria-label="Enter text to translate:"
              placeholder="Type or paste text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-60 px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize"
            />
          </div>

          <div>
            <label htmlFor="translation-output" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Translation:
            </label>
            <textarea
              id="translation-output"
              aria-label="Translation:"
              readOnly
              value={outputText}
              placeholder="Translation will appear here..."
              className="w-full h-60 px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={copyTranslation}
            disabled={!outputText}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Copy translation"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={speakTranslation}
            disabled={!outputText}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Read translation aloud"
          >
            Read Aloud
          </button>
          <button
            type="button"
            onClick={() => router.push("/home/translation-history")}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="View translation history"
          >
            History
          </button>
        </div>
      </div>
    </main>
  );
}

