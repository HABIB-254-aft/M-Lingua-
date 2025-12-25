"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

export default function Home() {
  const router = useRouter();

  const speakThenNavigateBlind = useCallback(async () => {
    // Ensure running in browser; if not, just navigate
    if (typeof window === "undefined") {
      router.push("/login");
      return;
    }

    // Save selection to localStorage if possible (fail silently if blocked)
    try {
      localStorage.setItem("accessibilityMode", "blind");
    } catch (e) {
      // ignore
    }

    const synth = window.speechSynthesis;
    if (!synth) {
      router.push("/login");
      return;
    }

    try {
      // Cancel any existing speech to ensure immediate start; ignore cancel errors
      try {
        if (synth.speaking) synth.cancel();
      } catch (err) {
        // ignore cancel errors
      }

      const message = "Blind mode enabled. Welcome to M-Lingua.";
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "en-US";

      // Start speaking but do not wait for it to finish — redirect immediately
      synth.speak(utterance);
    } catch (e) {
      // Fail silently
    }

    // Redirect immediately after initiating speech
    router.push("/login");
  }, [router]);

  // handleStandard is declared later (after helpers) to avoid referencing stopSpeechAndSuppressRecognition before it is defined.

  const handleBlind = useCallback(() => speakThenNavigateBlind(), [speakThenNavigateBlind]);

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
      recognitionRetryRef.current = 0;
    }
  }, []);

  const startRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    if (suppressStartRecognitionRef.current) return; // suppressed by user action
    if (isSpeakingRef.current) return; // don't listen while speaking

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    if (isListeningRef.current) return;

    try {
      const r = new SpeechRec();
      r.lang = "en-US";
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;

      r.onresult = (ev: any) => {
        try {
          const transcript = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || "";
          handleVoiceCommand(transcript);
        } catch (_e) {
          // ignore
        }
      };

      r.onerror = (_e: any) => {
        isListeningRef.current = false;
        recognitionRef.current = null;
      };

      r.onend = () => {
        isListeningRef.current = false;
        recognitionRef.current = null;
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
  }, []);

  const stopSpeechAndSuppressRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    // Prevent any automatic restart of recognition after stopping/canceling speech
    suppressStartRecognitionRef.current = true;
    try {
      const synth = window.speechSynthesis;
      if (synth) {
        try { synth.cancel(); } catch (_e) { /* ignore */ }
      }
    } catch (_e) {
      // ignore
    } finally {
      isSpeakingRef.current = false;
      stopRecognition();
    }
  }, [stopRecognition]);

  const handleStandard = useCallback(() => {
    // Save standard mode and navigate silently, ensuring any speech or recognition is canceled immediately
    if (typeof window !== "undefined") {
      try {
        stopSpeechAndSuppressRecognition();
      } catch (_e) {
        // ignore
      }
      try {
        localStorage.setItem("accessibilityMode", "standard");
      } catch (e) {
        // ignore
      }
    }
    router.push("/login");
  }, [router, stopSpeechAndSuppressRecognition]);

  const speakInstruction = useCallback((instruction: string, onEnd?: () => void) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    stopRecognition();

    try {
      try { synth.cancel(); } catch (_e) {}
      isSpeakingRef.current = true;
      const u = new SpeechSynthesisUtterance(instruction);
      u.lang = "en-US";
      u.addEventListener("end", () => {
        isSpeakingRef.current = false;
        if (onEnd) {
          onEnd();
        } else if (!suppressStartRecognitionRef.current) {
          startRecognition();
          isListeningRef.current = true;
        } else {
          // suppressed - remain not listening
          isListeningRef.current = false;
        }
      });
      synth.speak(u);
    } catch (_e) {
      isSpeakingRef.current = false;
      if (!suppressStartRecognitionRef.current) {
        startRecognition();
        isListeningRef.current = true;
      } else {
        isListeningRef.current = false;
      }
    }
  }, [startRecognition, stopRecognition]);

  const handleVoiceCommand = useCallback((raw: string) => {
    const text = raw.trim().toLowerCase();
    if (!text) return;

    if (text.includes("enable blind")) {
      stopRecognition();
      try { localStorage.setItem("accessibilityMode", "blind"); } catch(e) {}
      try {
        const synth = window.speechSynthesis;
        if (synth) {
          try { synth.cancel(); } catch (_e) {}
          isSpeakingRef.current = true;
          const u = new SpeechSynthesisUtterance("Blind mode enabled. Welcome to M-Lingua.");
          u.lang = "en-US";
          u.addEventListener("end", () => { isSpeakingRef.current = false; });
          synth.speak(u);
        }
      } catch (_e) {}
      router.push("/login");
      return;
    }

    if (text.includes("disable") || text.includes("continue without")) {
      stopSpeechAndSuppressRecognition();
      try { localStorage.setItem("accessibilityMode", "standard"); } catch(e) {}
      router.push("/login");
      return;
    }

    if (text.includes("repeat")) {
      stopRecognition();
      const instruction = "Welcome to M-Lingua. Voice guidance is enabled. Say 'enable blind mode' to continue with blind mode. Say 'disable' to continue without blind mode. Say 'repeat' to hear these options again.";
      speakInstruction(instruction, () => { startRecognition(); isListeningRef.current = true; });
      return;
    }

    if (recognitionRetryRef.current < 1) { recognitionRetryRef.current++; setTimeout(() => startRecognition(), 500); } else { recognitionRetryRef.current = 0; }
  }, [router, speakInstruction, startRecognition, stopRecognition, stopSpeechAndSuppressRecognition]);

  // First-interaction audio unlock and keyboard shortcuts
  const unlockedRef = useRef(false);
  const instructionSpokenRef = useRef(false);

  // Voice state refs to avoid overlap between speaking and listening
  const recognitionRef = useRef<any | null>(null);
  const isSpeakingRef = useRef(false);
  const isListeningRef = useRef(false);
  const recognitionRetryRef = useRef(0);
  // If true, do not automatically restart recognition (set when user interrupts voice)
  const suppressStartRecognitionRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onFirstInteraction() {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      const instruction =
        "Welcome to M-Lingua. Voice guidance is enabled. Say 'enable blind mode' to continue with blind mode. Say 'disable' to continue without blind mode. Say 'repeat' to hear these options again.";

      // Use centralized speakInstruction helper which ensures recognition is stopped before speaking and restarts after finishing
      speakInstruction(instruction);
      instructionSpokenRef.current = true;

      // Add persistent keydown listener for B/S shortcuts after unlocking
      window.addEventListener("keydown", onKeyDown);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!unlockedRef.current) return;
      const key = e.key.toLowerCase();
      if (key === "b") {
        // Blind mode via keyboard
        stopRecognition();
        try {
          localStorage.setItem("accessibilityMode", "blind");
        } catch (err) {
          // ignore
        }

        try {
          const synth = window.speechSynthesis;
          if (synth) {
            try {
              synth.cancel();
            } catch {}
            isSpeakingRef.current = true;
            const u = new SpeechSynthesisUtterance("Blind mode enabled. Welcome to M-Lingua.");
            u.lang = "en-US";
            u.addEventListener("end", () => {
              isSpeakingRef.current = false;
            });
            synth.speak(u);
          }
        } catch (_e) {
          // ignore
        }

        router.push("/login");
      } else if (key === "s") {
        // Standard mode via keyboard - ensure speech/recognition stopped first
        stopSpeechAndSuppressRecognition();
        try {
          localStorage.setItem("accessibilityMode", "standard");
        } catch (err) {
          // ignore
        }
        router.push("/login");
      }
    }

    // Set up the first interaction handlers

    window.addEventListener("click", onFirstInteraction, { once: true });
    window.addEventListener("keydown", onFirstInteraction, { once: true });

    // cleanup
    return () => {
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("keydown", onKeyDown);
      stopRecognition();
    };
  }, [router, speakInstruction, startRecognition, stopRecognition, stopSpeechAndSuppressRecognition]);


  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-6 py-12 flex items-center justify-center">
      <section className="max-w-md w-full text-center">
        <div className="mx-auto mb-6">
          <div
            role="img"
            aria-label="M-Lingua logo"
            className="h-20 w-20 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl font-bold mx-auto"
          >
            ML
          </div>
        </div>

        <h1 className="text-3xl font-extrabold mb-4">Welcome to M-Lingua</h1>
        <p className="text-lg text-slate-700 mb-8">
          Would you like to enable blind mode for enhanced accessibility?
        </p>

        <div className="flex flex-col gap-4 items-center">
          <button
            type="button"
            onClick={handleBlind}
            className="w-full max-w-sm inline-flex items-center justify-center px-6 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-md border border-indigo-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            aria-label="Enable Blind Mode"
          >
            Enable Blind Mode
          </button>

          <button
            type="button"
            onClick={handleStandard}
            className="w-full max-w-sm inline-flex items-center justify-center px-6 py-4 bg-white text-indigo-700 text-lg font-semibold rounded-md border border-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-slate-50"
            aria-label="Continue Without Blind Mode"
          >
            Continue Without Blind Mode
          </button>
        </div>
      </section>
    </main>
  );
}
