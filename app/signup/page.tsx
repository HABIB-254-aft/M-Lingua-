"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const spokeRef = useRef(false);
  const router = useRouter();

  // Focusable refs in order: email, password, confirm password, sign up button, login link
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  const signupBtnRef = useRef<HTMLButtonElement | null>(null);

  // Recognition state
  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  // Typing state and timer to resume recognition after idle
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

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

          // stop listening immediately when a command is detected
          stopRecognition();

          if (text.includes("submit")) {
            try { const synth = window.speechSynthesis; if (synth) try { synth.cancel(); } catch (_e) {} } catch (_e) {}
            signupBtnRef.current?.click();
            return;
          }

          if (text.includes("repeat")) {
            const instr = "Sign up selected. Enter your email, password, and confirm your password. Say 'submit' to create your account. Say 'repeat' to hear these instructions again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(instr);
                u.lang = "en-US";
                u.addEventListener("end", () => {
                  isSpeakingRef.current = false;
                  // restart recognition if still in blind mode
                  startRecognition();
                });
                synth.speak(u);
              }
            } catch (_e) {
              // ignore
            }
            return;
          }
        } catch (_e) {
          // ignore
        }
      }; 

      r.onerror = (_e: any) => {
        stopRecognition();
      };

      r.onend = () => {
        isListeningRef.current = false;
        recognitionRef.current = null;
        // If recognition ended unexpectedly, restart after typing has stopped and no speech is active
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind") {
            const restartIfIdle = () => {
              if (!isSpeakingRef.current && !isTypingRef.current) {
                startRecognition();
              }
            };
            setTimeout(restartIfIdle, 300);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (spokeRef.current) return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind") {
        const synth = window.speechSynthesis;
        if (!synth) return;

        try {
          const message =
            "Sign up selected. Enter your email, password, and confirm your password. Say 'submit' to create your account. Say 'repeat' to hear these instructions again.";
          const u = new SpeechSynthesisUtterance(message);
          u.lang = "en-US";
          try { synth.cancel(); } catch (_e) {}
          isSpeakingRef.current = true;
          u.addEventListener("end", () => {
            isSpeakingRef.current = false;
            // start recognition after the guidance finishes
            startRecognition();
          });
          synth.speak(u);
        } catch (e) {
          // fail silently
        }
      }
    } catch (e) {
      // fail silently
    } finally {
      spokeRef.current = true;
    }

    return () => {
      stopRecognition();
      try { clearTypingTimer(); } catch (_e) {}
      isTypingRef.current = false;
    };
  }, [startRecognition, stopRecognition, clearTypingTimer]);

  function handleSubmit(e: any) {
    e.preventDefault();

    // stop recognition if active
    try { stopRecognition(); } catch (_e) {}

    // Read accessibility mode and optionally announce a success message for blind users.
    if (typeof window !== "undefined") {
      try {
        const mode = localStorage.getItem("accessibilityMode");
        if (mode === "blind") {
          try {
            const synth = window.speechSynthesis;
            if (synth) {
              try {
                // Cancel any ongoing speech so the success message plays immediately
                synth.cancel();
              } catch (_e) {
                // ignore
              }

              try {
                const u = new SpeechSynthesisUtterance(
                  "Sign up successful."
                );
                u.lang = "en-US";
                synth.speak(u);
              } catch (_e) {
                // ignore
              }
            }
          } catch (_e) {
            // ignore
          }
        }
      } catch (_e) {
        // ignore
      }
    }

    // Redirect immediately to continue app flow (no backend yet)
    router.push("/home");
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Create an account</h1>

        <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="signup-heading">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              ref={emailRef}
              name="email"
              type="email"
              autoComplete="email"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="new-password"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1">
              Confirm password
            </label>
            <input
              id="confirm-password"
              ref={confirmRef}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
            />
          </div>

          <div>
            <button
              ref={signupBtnRef}
              type="submit"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Sign up
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-700">
            Already have an account?{' '}
            <Link href="/login" id="login-link" onClick={() => { try { const synth = (window as any).speechSynthesis; if (synth) try { synth.cancel(); } catch (_e) {} } catch (_e) {} try { stopRecognition(); } catch (_e) {} }} className="inline-block ml-1 text-indigo-600 font-semibold hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 rounded" aria-label="Log in to your M-Lingua account">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
