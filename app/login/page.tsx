"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

export default function Login() {
  const router = useRouter();
  const spokenRef = useRef(false);
  const [currentMode, setCurrentMode] = useState<string>("standard");
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  // Check current accessibility mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const mode = localStorage.getItem("accessibilityMode") || "standard";
        setCurrentMode(mode);
      } catch {
        setCurrentMode("standard");
      }
    }
  }, []);

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
              const instr = "Login selected. Enter your email and password. Say 'submit' to log in. Say 'help' or 'repeat' to hear these instructions again.";
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

            if (text.includes("repeat") || text.includes("help")) {
              // replay intent message
              const message = "You are on the login page. Say 'login' to sign in to an existing account. Say 'sign up' to create a new account. Say 'help' or 'repeat' to hear these options again.";
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

            // If command not recognized, notify user and offer help
            const unrecognizedMessage = "Command not recognized. Say 'help' to hear the available commands again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(unrecognizedMessage);
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

            if (text.includes("repeat") || text.includes("help")) {
              const instr = "Login selected. Enter your email and password. Say 'submit' to log in. Say 'help' or 'repeat' to hear these instructions again.";
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

            // If command not recognized, notify user and offer help
            const unrecognizedMessage = "Command not recognized. Say 'help' to hear the available commands again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(unrecognizedMessage);
                u.lang = "en-US";
                u.addEventListener("end", () => {
                  isSpeakingRef.current = false;
                  startRecognition();
                });
                synth.speak(u);
              }
            } catch (_e) {}
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
            "You are on the login page. Say 'login' to sign in to an existing account. Say 'sign up' to create a new account. Say 'help' or 'repeat' to hear these options again.";
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

    const formData = new FormData(e.target);
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const password = formData.get("password") as string;

    if (!email || !password) {
      alert("Email and password are required");
      return;
    }

    try {
      // Get users from localStorage
      const usersStr = localStorage.getItem("mlingua_users");
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      // Find user by email
      const user = users.find((u: any) => u.email === email);
      
      if (!user) {
        alert("Invalid email or password");
        return;
      }

      // For prototype: simple password check (in production, use hashed passwords)
      if (user.password !== password) {
        alert("Invalid email or password");
        return;
      }

      // Save current user to localStorage (without password)
      const userForSession = { ...user };
      delete userForSession.password;
      delete userForSession.passwordHash;
      localStorage.setItem("mlingua_auth", JSON.stringify(userForSession));

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
    } catch (error) {
      console.error("Login error:", error);
      alert("Error signing in. Please try again.");
      return;
    }

    // Navigate to home
    try {
      router.push("/home");
    } catch (_e) {
      // ignore
    }
  }

  const handleGoogleSignIn = async () => {
    if (typeof window === "undefined" || !(window as any).google) {
      alert("Google Sign-In is not available. Please refresh the page.");
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "") {
      alert(
        "Google Sign-In is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local file.\n\n" +
        "To set up Google Sign-In:\n" +
        "1. Go to https://console.cloud.google.com/\n" +
        "2. Create a project and enable Google+ API\n" +
        "3. Create OAuth 2.0 credentials\n" +
        "4. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id to .env.local"
      );
      return;
    }

    try {
      const google = (window as any).google;
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "email profile",
        callback: async (response: any) => {
          if (!response.access_token) {
            alert("Google Sign-In was cancelled or failed.");
            return;
          }

          try {
            // Get user info from Google
            const userInfoResponse = await fetch(
              `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${response.access_token}`
            );
            const userInfo = await userInfoResponse.json();

            if (!userInfo.email) {
              alert("Unable to get email from Google account.");
              return;
            }

            const email = userInfo.email.toLowerCase();
            const displayName = userInfo.name || userInfo.email.split("@")[0];
            const photoURL = userInfo.picture || null;
            const firstName = displayName.split(" ")[0];

            // Get users from localStorage
            const usersStr = localStorage.getItem("mlingua_users");
            const users = usersStr ? JSON.parse(usersStr) : [];

            // Check if user exists
            let user = users.find((u: any) => u.email === email);

            if (!user) {
              // Create new user
              let username = firstName.toLowerCase();
              let counter = 1;
              while (users.find((u: any) => u.username === username)) {
                username = `${firstName.toLowerCase()}${counter}`;
                counter++;
              }

              user = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                email: email,
                displayName: displayName,
                username: username,
                photoURL: photoURL,
                createdAt: new Date().toISOString(),
                preferences: {},
                history: [],
                googleId: userInfo.id,
              };

              users.push(user);
              localStorage.setItem("mlingua_users", JSON.stringify(users));
            } else {
              // Update existing user with Google info if needed
              if (photoURL && !user.photoURL) {
                user.photoURL = photoURL;
              }
              if (displayName && !user.displayName) {
                user.displayName = displayName;
              }
              user.googleId = userInfo.id;
              const userIndex = users.findIndex((u: any) => u.id === user.id);
              if (userIndex !== -1) {
                users[userIndex] = user;
                localStorage.setItem("mlingua_users", JSON.stringify(users));
              }
            }

            // Save current user (without password)
            const userForSession = { ...user };
            delete userForSession.password;
            delete userForSession.passwordHash;
            localStorage.setItem("mlingua_auth", JSON.stringify(userForSession));

            // Announce success for blind mode
            try {
              const mode = localStorage.getItem("accessibilityMode");
              if (mode === "blind") {
                const synth = window.speechSynthesis;
                if (synth) {
                  const u = new SpeechSynthesisUtterance("Sign in successful.");
                  u.lang = "en-US";
                  synth.speak(u);
                }
              }
            } catch (_e) {
              // ignore
            }

            // Navigate to home
            router.push("/home");
          } catch (error) {
            console.error("Google Sign-In error:", error);
            alert("Error signing in with Google. Please try again.");
          }
        },
      });

      client.requestAccessToken();
    } catch (error) {
      console.error("Google Sign-In setup error:", error);
      alert("Error setting up Google Sign-In. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => setIsGoogleLoaded(true)}
        strategy="lazyOnload"
      />
      <section className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8 shadow-sm">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              try {
                stopRecognition();
                // Stop all speech synthesis
                if (typeof window !== "undefined") {
                  const synth = window.speechSynthesis;
                  if (synth) {
                    try { synth.cancel(); } catch (_e) {}
                  }
                }
                isSpeakingRef.current = false;
                isListeningRef.current = false;
              } catch (_e) {
                // ignore
              }
              router.push("/");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm text-slate-700 bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label="Change accessibility mode"
          >
            <span>←</span>
            <span>Change Mode</span>
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Current mode: <span className="font-medium">{currentMode === "blind" ? "Blind Mode" : "Standard Mode"}</span>
          </p>
        </div>
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
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                onClick={() => { try { stopRecognition(); } catch (_e) {} }}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 rounded"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
                onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
                onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42l-3.29-3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
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

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={!isGoogleLoaded || !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
            className="mt-4 w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-md hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? "Google Sign-In not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local" : ""}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

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
