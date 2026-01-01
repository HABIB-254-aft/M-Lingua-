"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { signUp, signInWithGoogle } from "@/lib/firebase/auth";
import { getUserProfile, saveUserProfile, generateUniqueUsername } from "@/lib/firebase/firestore";

export default function Signup() {
  const spokeRef = useRef(false);
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState<string>("standard");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Focusable refs in order: fullName, email, birthday, gender, password, confirm password, consent, sign up button, login link
  const fullNameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const birthdayRef = useRef<HTMLInputElement | null>(null);
  const genderRef = useRef<HTMLSelectElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  const consentRef = useRef<HTMLInputElement | null>(null);
  const signupBtnRef = useRef<HTMLButtonElement | null>(null);

  // Recognition state
  const recognitionRef = useRef<any | null>(null);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  // Typing state and timer to resume recognition after idle
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

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

          if (text.includes("repeat") || text.includes("help")) {
            const instr = "Sign up page. Enter your full name, email, birthday, gender, password, and confirm password. Check the consent agreement checkbox. Say 'submit' to create your account. Say 'help' or 'repeat' to hear these instructions again.";
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
            "Sign up page. Enter your full name, email, birthday, gender, password, and confirm password. Check the consent agreement checkbox. Say 'submit' to create your account. Say 'help' or 'repeat' to hear these instructions again.";
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

  async function handleSubmit(e: any) {
    e.preventDefault();

    // stop recognition if active
    try { stopRecognition(); } catch (_e) {}

    const formData = new FormData(e.target);
    const fullName = (formData.get("fullName") as string)?.trim();
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    const birthday = formData.get("birthday") as string;
    const gender = formData.get("gender") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const consent = formData.get("consent") === "on";

    if (!fullName || !email || !birthday || !gender || !password || !confirmPassword) {
      alert("All fields are required");
      return;
    }

    if (!consent) {
      alert("You must agree to the terms and conditions to create an account");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      // Create user with Firebase Auth
      const { user, error } = await signUp(email, password, fullName);

      if (error) {
        // Handle specific Firebase errors
        if (error.includes("email-already-in-use")) {
          alert("An account with this email already exists");
        } else if (error.includes("weak-password")) {
          alert("Password is too weak. Please use a stronger password.");
        } else if (error.includes("invalid-email")) {
          alert("Invalid email address. Please check your email.");
        } else {
          alert(`Sign up failed: ${error}`);
        }
        return;
      }

      if (!user) {
        alert("Sign up failed. Please try again.");
        return;
      }

      // Generate unique username based on first name
      const firstName = fullName.split(" ")[0] || fullName;
      const username = await generateUniqueUsername(firstName, user.uid);

      // Save user profile to Firestore
      await saveUserProfile(user.uid, {
        uid: user.uid,
        email: email,
        displayName: fullName,
        username: username,
        birthday: birthday,
        gender: gender,
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Reload profile to get the saved data
      const savedProfile = await getUserProfile(user.uid);

      // Save auth state to localStorage for backward compatibility
      // Use profile data from Firestore to ensure consistency
      const userForSession = {
        id: user.uid,
        email: user.email,
        displayName: savedProfile?.displayName || fullName,
        username: savedProfile?.username || username,
        photoURL: savedProfile?.photoURL || user.photoURL,
      };
      localStorage.setItem("mlingua_auth", JSON.stringify(userForSession));

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
    } catch (error) {
      console.error("Signup error:", error);
      alert("Error creating account. Please try again.");
      return;
    }

    // Redirect to home
    router.push("/home");
  }

  const handleGoogleSignUp = async () => {
    try {
      // Sign in/up with Firebase Google Auth
      const { user, error } = await signInWithGoogle();

      if (error) {
        console.error("Google sign-up error:", error);
        
        if (error.includes("popup-closed-by-user") || error.includes("cancelled")) {
          // User closed the popup, don't show error
          return;
        }
        
        // Show more detailed error message
        if (error.includes("auth/operation-not-allowed")) {
          alert("Google Sign-In is not enabled. Please enable it in Firebase Console > Authentication > Sign-in method > Google");
        } else if (error.includes("auth/popup-blocked")) {
          alert("Popup was blocked by your browser. Please allow popups for this site and try again.");
        } else if (error.includes("auth/network-request-failed")) {
          alert("Network error. Please check your internet connection and try again.");
        } else {
          alert(`Google sign-up failed: ${error}`);
        }
        return;
      }

      if (!user) {
        console.error("No user returned from Google sign-in");
        alert("Google sign-up failed. Please try again.");
        return;
      }

      // Get or create user profile in Firestore
      let profile = await getUserProfile(user.uid);
      
      if (!profile) {
        // Create profile for new user
        const firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "user";
        let username = firstName.toLowerCase();
        
        // Save user profile to Firestore
        await saveUserProfile(user.uid, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || firstName,
          username: username,
          photoURL: user.photoURL || undefined,
          preferences: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        profile = await getUserProfile(user.uid);
      } else {
        // Only update photoURL if it's different (don't overwrite custom uploaded photos)
        // Only update if Google has a photo and Firestore doesn't
        if (user.photoURL && !profile.photoURL) {
          await saveUserProfile(user.uid, {
            photoURL: user.photoURL,
          });
        }
      }

      // Get the final profile for session
      const finalProfile = await getUserProfile(user.uid);

      // Save auth state to localStorage for backward compatibility
      // Use profile data from Firestore (which has the saved photoURL) instead of just Firebase Auth
      const userForSession = {
        id: user.uid,
        email: user.email,
        displayName: finalProfile?.displayName || user.displayName || user.email?.split("@")[0] || "user",
        username: finalProfile?.username || user.email?.split("@")[0] || "user",
        photoURL: finalProfile?.photoURL || user.photoURL, // Use Firestore photoURL first, then Firebase Auth
      };
      localStorage.setItem("mlingua_auth", JSON.stringify(userForSession));

      // Announce success for blind mode
      try {
        const mode = localStorage.getItem("accessibilityMode");
        if (mode === "blind") {
          const synth = window.speechSynthesis;
          if (synth) {
            const u = new SpeechSynthesisUtterance("Sign up successful.");
            u.lang = "en-US";
            synth.speak(u);
          }
        }
      } catch (_e) {
        // ignore
      }

      // Redirect to home
      router.push("/home");
    } catch (error) {
      console.error("Google Sign-Up error:", error);
      alert("Error signing up with Google. Please try again.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Icons */}
      <div className="absolute inset-0 pointer-events-none opacity-5 dark:opacity-3">
        {/* Speech Bubbles - Communication */}
        <div className="absolute top-10 left-10 text-6xl bg-icon-float">💬</div>
        <div className="absolute top-32 right-20 text-5xl bg-icon-float-reverse bg-icon-delay-1">💬</div>
        <div className="absolute bottom-40 left-16 text-4xl bg-icon-float bg-icon-delay-2">💬</div>
        
        {/* Sign Language Hands */}
        <div className="absolute top-20 right-32 text-5xl bg-icon-float-reverse">🙏</div>
        <div className="absolute bottom-32 right-12 text-6xl bg-icon-float bg-icon-delay-1">🙏</div>
        <div className="absolute top-60 left-24 text-4xl bg-icon-float-reverse bg-icon-delay-3">🙏</div>
        
        {/* Audio/Sound Waves */}
        <div className="absolute top-40 left-8 text-4xl bg-icon-float bg-icon-delay-2">🔊</div>
        <div className="absolute bottom-20 right-40 text-5xl bg-icon-float-reverse bg-icon-delay-1">🔊</div>
        <div className="absolute top-80 right-8 text-4xl bg-icon-float bg-icon-delay-3">🔊</div>
        
        {/* Globe/Translation */}
        <div className="absolute top-16 left-1/4 text-5xl bg-icon-float-reverse">🌐</div>
        <div className="absolute bottom-60 right-1/4 text-4xl bg-icon-float bg-icon-delay-2">🌐</div>
        <div className="absolute top-1/2 left-12 text-5xl bg-icon-float-reverse bg-icon-delay-1">🌐</div>
        
        {/* Accessibility Icons */}
        <div className="absolute bottom-16 left-1/3 text-4xl bg-icon-float bg-icon-delay-3">♿</div>
        <div className="absolute top-1/3 right-16 text-5xl bg-icon-float-reverse">♿</div>
        
        {/* Text/Speech Icons */}
        <div className="absolute bottom-80 left-40 text-4xl bg-icon-float-reverse bg-icon-delay-2">📝</div>
        <div className="absolute top-1/4 right-1/3 text-5xl bg-icon-float bg-icon-delay-1">📝</div>
      </div>
      
      <section className="w-full max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-slate-200 dark:border-gray-700 rounded-lg p-8 shadow-sm relative z-10">
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
        <h1 className="text-2xl font-bold mb-4">Create an account</h1>

        <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="signup-heading">
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              ref={fullNameRef}
              name="fullName"
              type="text"
              autoComplete="name"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Email <span className="text-red-500">*</span>
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
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="birthday" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Birthday <span className="text-red-500">*</span>
            </label>
            <input
              id="birthday"
              ref={birthdayRef}
              name="birthday"
              type="date"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              ref={genderRef}
              name="gender"
              required
              onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
              onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
              className="w-full px-4 py-3 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900 bg-white"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
                onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
                onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
                placeholder="Minimum 6 characters"
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
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                ref={confirmRef}
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                onFocus={() => { try { stopRecognition(); } catch (_e) {} isTypingRef.current = true; clearTypingTimer(); }}
                onBlur={() => { try { scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
                onInput={() => { try { isTypingRef.current = true; scheduleRecognitionRestartAfterIdle(); } catch (_e) {} }}
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 text-slate-900"
                placeholder="Re-enter your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
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

          <div className="flex items-start gap-2">
            <input
              id="consent"
              ref={consentRef}
              name="consent"
              type="checkbox"
              required
              className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-600"
            />
            <label htmlFor="consent" className="text-sm text-slate-700 dark:text-slate-200">
              I agree to the{" "}
              <Link
                href="/terms"
                onClick={(e) => {
                  e.stopPropagation();
                  try { stopRecognition(); } catch (_e) {}
                }}
                className="text-indigo-600 hover:text-indigo-700 underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 rounded"
              >
                Terms and Conditions
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                onClick={(e) => {
                  e.stopPropagation();
                  try { stopRecognition(); } catch (_e) {}
                }}
                className="text-indigo-600 hover:text-indigo-700 underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 rounded"
              >
                Privacy Policy
              </Link>
            </label>
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
            onClick={handleGoogleSignUp}
            className="mt-4 w-full inline-flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 font-semibold rounded-md hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
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
            <span>Sign up with Google</span>
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-700 dark:text-slate-200">
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
