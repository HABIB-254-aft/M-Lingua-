"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { translateText } from "@/lib/translation-service";
import { detectLanguage, SUPPORTED_LANGUAGES, getLanguageName } from "@/lib/language-detection";
import { useOutputPreferences } from "@/contexts/OutputPreferencesContext";
import OutputFormatToggles from "@/components/OutputFormatToggles";
import SignLanguageAvatar from "../SignLanguageAvatar";
import { useAdaptiveUI } from "@/hooks/useAdaptiveUI";
import CollapsibleSection from "@/components/CollapsibleSection";
import SkeletonText from "@/components/SkeletonText";

export default function TranslationPage() {
  const router = useRouter();
  const { preferences } = useOutputPreferences();
  const adaptiveUI = useAdaptiveUI();
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("es");
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(true);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const detectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
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

  // Auto-detect language when text changes
  useEffect(() => {
    if (!autoDetectEnabled || !inputText.trim() || inputText.trim().length < 3) {
      setDetectedLang(null);
      setDetectionConfidence(0);
      return;
    }

    // Clear previous timeout
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    // Debounce detection (wait 500ms after user stops typing)
    detectionTimeoutRef.current = setTimeout(async () => {
      setIsDetecting(true);
      try {
        const result = await detectLanguage(inputText);
        setDetectedLang(result.language);
        setDetectionConfidence(result.confidence);
        
        // Auto-update source language if confidence is high enough
        if (result.confidence >= 0.6 && result.language !== sourceLang) {
          setSourceLang(result.language);
        }
      } catch (error) {
        console.error("Language detection error:", error);
      } finally {
        setIsDetecting(false);
      }
    }, 500);

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [inputText, autoDetectEnabled, sourceLang]);

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
      // Use translation service with fallback chain (Google → DeepL → MyMemory)
      const result = await translateText(text, sourceLang, targetLang);
      
      console.log("Translation successful:", result.translatedText, "Provider:", result.provider);
      setOutputText(result.translatedText);

      // Save to history
      try {
        if (typeof window !== "undefined") {
          const historyItem = {
            id: Date.now().toString(),
            sourceText: text,
            translatedText: result.translatedText,
            sourceLang: sourceLang,
            targetLang: targetLang,
            provider: result.provider,
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
      // Show success feedback
      setShowSuccessFeedback(true);
      setTimeout(() => {
        setShowSuccessFeedback(false);
      }, 1000);
    }
  };

  const speakTranslation = () => {
    if (!preferences.showAudio || typeof window === "undefined") return;
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

  const saveToFavorites = () => {
    if (!outputText.trim() || outputText.startsWith("Error:")) return;

    try {
      const favorite = {
        id: Date.now().toString(),
        sourceText: inputText,
        translatedText: outputText,
        sourceLang: sourceLang,
        targetLang: targetLang,
        timestamp: new Date().toLocaleString(),
      };

      const stored = localStorage.getItem("translationFavorites");
      const favorites = stored ? JSON.parse(stored) : [];
      
      // Check if already favorited
      const exists = favorites.some((f: any) => 
        f.sourceText === inputText && f.translatedText === outputText
      );
      
      if (exists) {
        alert("This translation is already in your favorites");
        return;
      }

      favorites.unshift(favorite);
      const limitedFavorites = favorites.slice(0, 100);
      localStorage.setItem("translationFavorites", JSON.stringify(limitedFavorites));
      
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving to favorites:", error);
      alert("Failed to save to favorites");
    }
  };

  const exportTranslation = (format: "txt" | "json") => {
    if (!outputText.trim() || outputText.startsWith("Error:")) {
      alert("No translation to export");
      return;
    }

    try {
      if (format === "txt") {
        const content = `Translation\n\nSource (${sourceLang}):\n${inputText}\n\nTranslation (${targetLang}):\n${outputText}\n\nDate: ${new Date().toLocaleString()}`;
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `translation-${Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
      } else if (format === "json") {
        const data = {
          sourceText: inputText,
          translatedText: outputText,
          sourceLang: sourceLang,
          targetLang: targetLang,
          timestamp: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `translation-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting translation:", error);
      alert("Failed to export translation");
    }
  };

  // Auto-speak translation when it's generated (if audio is enabled)
  useEffect(() => {
    if (preferences.showAudio && outputText && !outputText.startsWith("Error:")) {
      const t = outputText.trim();
      if (!t || typeof window === "undefined") return;

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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputText, preferences.showAudio, targetLang]);

  const languages = SUPPORTED_LANGUAGES;

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

        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Translation</h1>

        {/* Status announcements for screen readers */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {isTranslating && "Translating text. Please wait."}
          {outputText && !outputText.startsWith("Error:") && !isTranslating && "Translation complete."}
          {outputText && outputText.startsWith("Error:") && outputText}
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <label htmlFor="source-language" className="text-sm font-medium text-gray-900 dark:text-gray-100">From:</label>
              <select
                id="source-language"
                value={sourceLang}
                onChange={(e) => {
                  setSourceLang(e.target.value);
                  setAutoDetectEnabled(false); // Disable auto-detect when manually changed
                }}
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
            
            {/* Detected Language Indicator */}
            {detectedLang && autoDetectEnabled && inputText.trim().length >= 3 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-xs">
                <span className="text-blue-600 dark:text-blue-400">🔍</span>
                <span className="text-blue-700 dark:text-blue-300 font-medium">
                  Detected: {getLanguageName(detectedLang)}
                </span>
                {detectionConfidence > 0 && (
                  <span className="text-blue-600 dark:text-blue-400">
                    ({Math.round(detectionConfidence * 100)}%)
                  </span>
                )}
                {isDetecting && (
                  <span className="text-blue-500 dark:text-blue-400 animate-pulse">Detecting...</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (detectedLang) {
                      setSourceLang(detectedLang);
                    }
                  }}
                  className="ml-2 px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Use detected language"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => setAutoDetectEnabled(false)}
                  className="px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 focus:outline-none"
                  title="Disable auto-detection"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Auto-detect toggle */}
            {!autoDetectEnabled && (
              <button
                type="button"
                onClick={() => setAutoDetectEnabled(true)}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Enable auto language detection"
              >
                🔍 Enable Auto-Detect
              </button>
            )}
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
        
        {/* Output Format Toggles */}
        <div className="mb-4">
          <OutputFormatToggles />
        </div>

        <div className={`grid ${adaptiveUI.isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 mb-4`}>
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
              className={`w-full ${adaptiveUI.isMobile ? 'h-40' : 'h-60'} px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize`}
            />
          </div>

          <div className="space-y-4">
            {/* Translation Text Output */}
            {adaptiveUI.showTextPanel && (
              <CollapsibleSection
                title="Translation"
                icon="🌐"
                defaultOpen={true}
              >
                <div className="relative">
                  {isTranslating ? (
                    <div className={`w-full ${adaptiveUI.isMobile ? 'h-40' : 'h-60'} px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 flex items-center`}>
                      <SkeletonText lines={5} className="w-full" />
                    </div>
                  ) : (
                    <textarea
                      id="translation-output"
                      aria-label="Translation:"
                      readOnly
                      value={outputText}
                      placeholder="Translation will appear here..."
                      className={`w-full ${adaptiveUI.isMobile ? 'h-40' : 'h-60'} px-4 py-4 border-2 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 resize transition-all duration-300 ${
                        showSuccessFeedback 
                          ? 'border-green-500 dark:border-green-400 ring-2 ring-green-500/20 dark:ring-green-400/20' 
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    />
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Sign Language Output */}
            {adaptiveUI.showSignPanel && outputText && !outputText.startsWith("Error:") && (
              <CollapsibleSection
                title="Sign Language"
                icon="🙏"
                defaultOpen={true}
              >
                <div className="border border-gray-200 dark:border-gray-700 rounded-sm overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                  <div 
                    id="translation-sign-avatar-container" 
                    className={`${adaptiveUI.isMobile ? 'h-32' : adaptiveUI.isTablet ? 'h-40' : 'h-60'} w-full animate-fade-in`}
                  >
                    {isTranslating ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <SkeletonText lines={3} className="w-3/4" />
                      </div>
                    ) : (
                      <SignLanguageAvatar text={outputText} speed={1} containerId="translation-sign-avatar-container" />
                    )}
                  </div>
                  <div className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 text-center">
                    Sign Language
                  </div>
                </div>
              </CollapsibleSection>
            )}
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

