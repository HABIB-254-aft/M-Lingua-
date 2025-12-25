"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const spokenRef = useRef(false);

  // Focusable element refs
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const loginBtnRef = useRef<HTMLButtonElement | null>(null);

  // Recognition state
  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  // Typing state: pause recognition while typing; restart after idle
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  // Current voice stage: 'intent' (choose login/signup) or 'action' (submit/repeat)
  const stageRef = useRef<'intent' | 'action'>('intent');

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
      // reset timer
      clearTypingTimer();
      isTypingRef.current = true; // mark typing until timeout fires
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

    if (isSpeakingRef.current) return; // do not start while speaking
    if (isListeningRef.current) return; // already listening

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

          // Intent-based handling
          if (stageRef.current === 'intent') {
            if (text.includes("login")) {
              // Move to action stage: speak action instructions then listen for submit/repeat
              stageRef.current = 'action';
              const instr = "Login selected. Enter your email and password. Say 'submit' to log in. Say 'repeat' to hear these instructions again.";
              try {
                const synth = window.speechSynthesis;
                if (synth) {
                  try { synth.cancel(); } catch (_e) {}
                  isSpeakingRef.current = true;
                  const u = new SpeechSynthesisUtterance(instr);
                  u.lang = "en-US";
                  u.addEventListener("end", () => {
                    isSpeakingRef.current = false;
                    startRecognition(); // listen for submit/repeat
                  });
                  synth.speak(u);
                }
              } catch (_e) {
                // ignore
              }
              return;
            }

            if (text.includes("sign up") || text.includes("signup")) {
              // navigate to signup without speaking
              router.push("/signup");
              return;
            }

            if (text.includes("repeat")) {
              // replay intent message
              const message = "You are on the login page. Say 'login' to sign in to an existing account. Say 'sign up' to create a new account.";
              try {
                const synth = window.speechSynthesis;
                if (synth) {
                  try { synth.cancel(); } catch (_e) {}
                  isSpeakingRef.current = true;
                  const u = new SpeechSynthesisUtterance(message);
                  u.lang = "en-US";
                  u.addEventListener("end", () => {
                    isSpeakingRef.current = false;
                    startRecognition();
                  });
                  synth.speak(u);
                }
              } catch (_e) {}
              return;
            }

            return;
          }

          // Stage: action (submit/repeat)
          if (stageRef.current === 'action') {
            if (text.includes("submit")) {
              try {
                try { const synth = window.speechSynthesis; if (synth) { try { synth.cancel(); } catch (_e) {} } } catch (_e){}
                loginBtnRef.current?.click();
              } catch (_e) {
                // ignore
              }
              return;
            }

            if (text.includes("repeat")) {
              const instr = "Login selected. Enter your email and password. Say 'submit' to log in. Say 'repeat' to hear these instructions again.";
              try {
                const synth = window.speechSynthesis;
                if (synth) {
                  try { synth.cancel(); } catch (_e) {}
                  isSpeakingRef.current = true;
                  const u = new SpeechSynthesisUtterance(instr);
                  u.lang = "en-US";
                  u.addEventListener("end", () => {
                    isSpeakingRef.current = false;
                    startRecognition();
                  });
                  synth.speak(u);
                }
              } catch (_e) {}
              return;
            }
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
            // small delay to allow typing timer to clear if user is typing
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
    if (spokenRef.current) return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind") {
        const synth = window.speechSynthesis;
        if (!synth) return;

        try {
          const message =
            "You are on the login page. Say 'login' to sign in to an existing account. Say 'sign up' to create a new account.";
          const u = new SpeechSynthesisUtterance(message);
          u.lang = "en-US";
          try { synth.cancel(); } catch (_e) {}
          isSpeakingRef.current = true;
          u.addEventListener("end", () => {
            isSpeakingRef.current = false;
            stageRef.current = 'intent';
            // start listening for intent selection (login / sign up)
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
      spokenRef.current = true;
    }

    return () => {
      stopRecognition();
      try { clearTypingTimer(); } catch (_e) {}
      isTypingRef.current = false;
    };
  }, [startRecognition, stopRecognition, clearTypingTimer]);

  function handleSubmit(e: any) {
    e.preventDefault();
    // stop any recognition when submitting via keyboard/mouse
    try {
      stopRecognition();
    } catch (_e) {
      // ignore
    }

    try {
      const synth = (window as any).speechSynthesis;
      if (synth) {
        try {
          synth.cancel();
        } catch (_e) {
          // ignore
        }

        // If blind mode, announce success once but do not block navigation
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind") {
            try {
              const u = new SpeechSynthesisUtterance("Sign in successful.");
              u.lang = "en-US";
              // speak but do not wait — navigation proceeds immediately
              try { synth.speak(u); } catch (_e) {}
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

    // Proceed with navigation for this prototype
    try {
      const routerAny: any = router;
      routerAny.push("/home");
    } catch (_e) {
      // ignore
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-4">Login to M-Lingua</h1>

        <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="login-heading">
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
              autoComplete="current-password"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
            />
          </div>

          <div>
            <button
              ref={loginBtnRef}
              type="submit"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-indigo-600 text-white font-semibold rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Login
            </button>
          </div>
        </form>

        <p className="mt-4 text-sm text-slate-600">No authentication is implemented in this prototype.</p>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-700">
            Don't have an account?{' '}
            <Link
              href="/signup"
              id="signup-link"
              onClick={() => { try { const synth = (window as any).speechSynthesis; if (synth) try { synth.cancel(); } catch (_e) {} } catch (_e) {} try { stopRecognition(); } catch (_e) {} }}
              className="inline-block ml-1 text-indigo-600 font-semibold hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 rounded"
              aria-label="Sign up for an M-Lingua account"
            >
              Sign up
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
