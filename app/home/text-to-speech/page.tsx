"use client";

import { useEffect, useRef, useState } from "react";
import VoiceDropdown from "../VoiceDropdown";

export default function TextToSpeechPage() {
  const [text, setText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

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

  return (
    <main className="min-h-screen bg-white pt-12 flex items-start justify-center">
      <div className="w-full max-w-4xl mx-auto px-6 text-left">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-sm text-sm text-gray-700 bg-white focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="Go back"
          >
            <span aria-hidden>←</span>
            <span>Back</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-3 text-gray-900">Text to Speech</h1>

        <label htmlFor="tts-text" className="block text-sm font-medium text-gray-900 mb-2">
          Enter text to be read aloud:
        </label>

        <textarea
          id="tts-text"
          aria-label="Enter text to be read aloud:"
          placeholder="Type or paste text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-60 px-4 py-4 border-2 border-gray-300 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 placeholder-gray-400 resize"
        />

        <div className="flex items-center gap-8 mt-4">
          <div className="flex items-center gap-3">
            <label htmlFor="voice-select" className="text-sm font-medium text-gray-900">Voice:</label>
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
            <label htmlFor="speed-select" className="text-sm font-medium text-gray-900">Speed:</label>
            <select
              id="speed-select"
              className="px-4 py-2 border-2 border-gray-300 rounded-md text-sm h-10 w-36 bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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

          <div className="mt-4 text-sm text-gray-600" aria-live="polite">
            {isSpeaking ? "Playing..." : ""}
          </div>
        </div>
      </div>
    </main>
  );
}
