"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: string;
}

export default function TranslationHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredHistory = history.filter(
    (item) =>
      item.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.translatedText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadHistory = () => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("translationHistory");
        if (stored) {
          const parsed = JSON.parse(stored);
          setHistory(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all translation history?")) {
      try {
        if (typeof window !== "undefined") {
          localStorage.removeItem("translationHistory");
          setHistory([]);
        }
      } catch (error) {
        console.error("Error clearing history:", error);
      }
    }
  };

  const deleteItem = (id: string) => {
    try {
      if (typeof window !== "undefined") {
        const updated = history.filter((item) => item.id !== id);
        localStorage.setItem("translationHistory", JSON.stringify(updated));
        setHistory(updated);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const languageNames: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    ar: "Arabic",
    hi: "Hindi",
  };

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

        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Translation History</h1>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search translations..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800"
              aria-label="Search translation history"
            />
          </div>
          <button
            type="button"
            onClick={clearHistory}
            disabled={history.length === 0}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Clear all history"
          >
            Clear All
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
          {filteredHistory.length === 0 && history.length > 0
            ? `No results found. Showing ${history.length} total translations.`
            : filteredHistory.length === 0
            ? "No translations yet. Start translating to see your history here!"
            : `Showing ${filteredHistory.length} of ${history.length} translations.`}
        </div>

        <div className="space-y-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No translations found.</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="border-2 border-gray-200 dark:border-gray-700 rounded-sm p-4 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {languageNames[item.sourceLang] || item.sourceLang} → {languageNames[item.targetLang] || item.targetLang}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{item.timestamp}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus-visible:outline-none focus-visible:border-blue-500"
                    aria-label={`Delete translation from ${item.timestamp}`}
                  >
                    Delete
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Original:</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{item.sourceText}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Translation:</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">{item.translatedText}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(item.translatedText).catch(() => {
                        // ignore
                      });
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
                    aria-label="Copy translation"
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        const synth = window.speechSynthesis;
                        if (synth) {
                          try {
                            synth.cancel();
                            const u = new SpeechSynthesisUtterance(item.translatedText);
                            u.lang = item.targetLang === "es" ? "es-ES" : item.targetLang === "fr" ? "fr-FR" : "en-US";
                            synth.speak(u);
                          } catch {
                            // ignore
                          }
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
                    aria-label="Read translation aloud"
                  >
                    Read Aloud
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

