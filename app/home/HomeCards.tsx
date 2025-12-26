"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function HomeCards() {
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showComingSoon = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setNotice("This feature is coming soon.");
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    // Clear after 3s
    noticeTimerRef.current = window.setTimeout(() => setNotice(""), 3000);
  };

  return (
    <>
      {notice ? (
        <div
          className="max-w-4xl mx-auto mb-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm"
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      ) : null}

      <div className="max-w-4xl mx-auto mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Speech to Text (navigates) */}
        <article aria-labelledby="stt-title">
          <h3 id="stt-title" className="sr-only">
            Speech to Text
          </h3>
          <Link
            href="/home/speech-to-text"
            onKeyDown={(e) => {
              // Support Space to activate the link
              if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
                e.preventDefault();
                (e.currentTarget as HTMLAnchorElement).click();
              }
            }}
            className="w-full block text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            aria-describedby="stt-desc"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                  ST
                </span>
              </div>
              <div>
                <div className="text-xl font-semibold">Speech to Text</div>
                <p id="stt-desc" className="mt-1 text-sm text-slate-600">
                  Transcribe spoken words into readable text in real time.
                </p>
              </div>
            </div>
          </Link>
        </article>

        {/* Text to Speech (navigates) */}
        <article aria-labelledby="tts-title">
          <h3 id="tts-title" className="sr-only">
            Text to Speech
          </h3>

          <Link
            href="/home/text-to-speech"
            onKeyDown={(e) => {
              // Support Space to activate the link
              if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
                e.preventDefault();
                (e.currentTarget as HTMLAnchorElement).click();
              }
            }}
            className="w-full block text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            aria-describedby="tts-desc"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                  TS
                </span>
              </div>
              <div>
                <div className="text-xl font-semibold">Text to Speech</div>
                <p id="tts-desc" className="mt-1 text-sm text-slate-600">
                  Convert typed text into clear spoken audio.
                </p>
              </div>
            </div>
          </Link>
        </article>

        {/* Speech to Sign - Coming soon */}
        <article aria-labelledby="sts-title">
          <h3 id="sts-title" className="sr-only">
            Speech to Sign
          </h3>
          <button
            type="button"
            onClick={showComingSoon}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                showComingSoon(e);
              }
            }}
            aria-describedby="sts-desc sts-note"
            className="w-full text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm opacity-60 cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            title="Coming soon"
            aria-disabled="true"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-slate-100 text-slate-500 font-semibold">
                  SS
                </span>
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-700">Speech to Sign</div>
                <p id="sts-desc" className="mt-1 text-sm text-slate-600">
                  Translate spoken language into sign language notation and visuals. (Coming soon)
                </p>
                <p id="sts-note" className="mt-2 text-xs text-slate-500">Coming soon</p>
              </div>
            </div>
          </button>
        </article>

        {/* Conversation Mode - Coming soon */}
        <article aria-labelledby="conv-title">
          <h3 id="conv-title" className="sr-only">
            Conversation Mode
          </h3>
          <button
            type="button"
            onClick={showComingSoon}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                showComingSoon(e);
              }
            }}
            className="w-full text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm opacity-60 cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            title="Coming soon"
            aria-disabled="true"
            aria-describedby="conv-desc"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-slate-100 text-slate-500 font-semibold">
                  CM
                </span>
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-700">Conversation Mode</div>
                <p id="conv-desc" className="mt-1 text-sm text-slate-600">Multi-turn spoken conversations with context. (Coming soon)</p>
              </div>
            </div>
          </button>
        </article>

        {/* Translation (navigates) */}
        <article aria-labelledby="trans-title">
          <h3 id="trans-title" className="sr-only">
            Translation
          </h3>
          <Link
            href="/home/translation"
            onKeyDown={(e) => {
              // Support Space to activate the link
              if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
                e.preventDefault();
                (e.currentTarget as HTMLAnchorElement).click();
              }
            }}
            className="w-full block text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            aria-describedby="trans-desc"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-indigo-50 text-indigo-700 font-semibold">
                  TR
                </span>
              </div>
              <div>
                <div className="text-xl font-semibold">Translation</div>
                <p id="trans-desc" className="mt-1 text-sm text-slate-600">
                  Convert text or speech between languages.
                </p>
              </div>
            </div>
          </Link>
        </article>

        {/* Text to Sign - Coming soon */}
        <article aria-labelledby="tts2-title">
          <h3 id="tts2-title" className="sr-only">
            Text to Sign
          </h3>
          <button
            type="button"
            onClick={showComingSoon}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                showComingSoon(e);
              }
            }}
            className="w-full text-left bg-white border border-slate-200 rounded-lg p-6 shadow-sm opacity-60 cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            title="Coming soon"
            aria-disabled="true"
            aria-describedby="tts2-desc"
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-slate-100 text-slate-500 font-semibold">
                  TS
                </span>
              </div>
              <div>
                <div className="text-xl font-semibold text-slate-700">Text to Sign</div>
                <p id="tts2-desc" className="mt-1 text-sm text-slate-600">Convert typed text into sign language visuals. (Coming soon)</p>
              </div>
            </div>
          </button>
        </article>
      </div>
    </>
  );
}
