"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export default function HelpPage() {
  const router = useRouter();

  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);

  // Voice navigation functions
  const speakMessage = useCallback((message: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    try {
      synth.cancel();
      isVoiceSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "en-US";
      utterance.onend = () => {
        isVoiceSpeakingRef.current = false;
        if (isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      utterance.onerror = () => {
        isVoiceSpeakingRef.current = false;
        if (isVoiceListeningRef.current === false) {
          startVoiceRecognition();
        }
      };
      synth.speak(utterance);
    } catch {
      isVoiceSpeakingRef.current = false;
    }
  }, []);

  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch {
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
    if (isVoiceListeningRef.current) return;
    if (isVoiceSpeakingRef.current) return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) return;

      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        try {
          const transcript = (event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript) || "";
          const command = transcript.trim().toLowerCase();
          stopVoiceRecognition();

          if (command.includes("back") || command.includes("go back")) {
            speakMessage("Going back.");
            router.back();
          } else if (command.includes("repeat")) {
            speakMessage("Help page. Say back to go back, or repeat to hear options again.");
          } else {
            speakMessage("Command not recognized. Say back to go back, or repeat to hear options again.");
          }
        } catch {
          // ignore
        }
      };

      recognition.onerror = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
      };

      recognition.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        if (!isVoiceSpeakingRef.current) {
          setTimeout(() => {
            if (!isVoiceSpeakingRef.current) {
              startVoiceRecognition();
            }
          }, 500);
        }
      };

      voiceRecognitionRef.current = recognition;
      isVoiceListeningRef.current = true;
      recognition.start();
    } catch {
      isVoiceListeningRef.current = false;
      voiceRecognitionRef.current = null;
    }
  }, [router, stopVoiceRecognition, speakMessage]);

  // Announce page entry and start voice recognition if blind mode is enabled
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind" && !spokenRef.current) {
        spokenRef.current = true;
        speakMessage("Help page. Say back to go back, or repeat to hear options again.");
      }
    } catch {
      // ignore
    }

    return () => {
      stopVoiceRecognition();
      if (typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [speakMessage, stopVoiceRecognition]);

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

        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100 text-center">
          Help & Frequently Asked Questions
        </h1>

        {/* General Questions Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">General Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: What is M-Lingua?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: M-Lingua is a universal, AI-powered communication platform designed to remove barriers between people, regardless of their abilities or languages. It integrates speech-to-text, text-to-speech, sign language animation, and multilingual translation.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Is M-Lingua free to use?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes, M-Lingua offers a free tier with core features. Premium features and unlimited usage may be available with a subscription in the future.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: What devices does M-Lingua support?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: M-Lingua is a Progressive Web App (PWA), meaning it works on any modern web browser (Chrome, Firefox, Safari, Edge) across desktops, tablets, and mobile devices (iOS & Android). You can even install it like a native app!
              </div>
            </div>
          </div>
        </section>

        {/* Feature-Specific Questions Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Feature-Specific Questions</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How do I use Speech-to-Text?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Navigate to the "Speech to Text" section, click the microphone icon, and start speaking. Ensure your browser has microphone permissions enabled.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How many languages does M-Lingua translate?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: M-Lingua currently supports translation between over 40 languages.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How does the Sign Language Avatar work?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: In "Speech to Sign" or "Text to Sign" mode, our AI-powered avatar will animate spoken or typed words into sign language gestures. Our vocabulary is continuously expanding.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: What is Blind Mode?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Blind Mode provides a high-contrast user interface with enhanced screen reader support and audio guidance, making the app fully navigable for visually impaired users.
              </div>
            </div>
          </div>
        </section>

        {/* Account & Privacy Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Account & Privacy</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Is my data private?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes, M-Lingua is privacy-focused. Most of your data (preferences, history) is stored locally in your browser. We use secure authentication and anonymized analytics. Please refer to our{" "}
                <a href="/privacy" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                  Privacy Policy
                </a>{" "}
                for full details.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How do I delete my account?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: You can delete your account and associated data through your profile settings. If you need assistance, please contact us.
              </div>
            </div>
          </div>
        </section>

        {/* Troubleshooting Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Troubleshooting</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: My microphone isn't working. What should I do?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Ensure your browser has permission to access your microphone. Check your device's system settings. Try refreshing the page or restarting your browser. If the issue persists, please contact support at{" "}
                <a href="mailto:support@mlingua.com" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                  support@mlingua.com
                </a>.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: The app isn't working offline.</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: M-Lingua is a PWA and should work offline for core features once installed. Ensure your service worker is registered and the app is fully cached. Try clearing your browser cache and reinstalling the PWA.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: The translation feature is not responding.</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Translation requires an internet connection. Check your network connection and try again. If the problem persists, refresh the page.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How do I install M-Lingua as an app?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: On mobile devices, look for an "Add to Home Screen" or "Install App" prompt in your browser. On desktop, look for an install icon in your browser's address bar. Once installed, M-Lingua will work like a native app!
              </div>
            </div>
          </div>
        </section>

        {/* Contact & Support Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Contact & Support</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How can I provide feedback or report a bug?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: You can use the "Feedback" button in the footer of the app, or email us directly at{" "}
                <a href="mailto:support@mlingua.com" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                  support@mlingua.com
                </a>.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Who can I contact for further assistance?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: For any questions or support, please email us at{" "}
                <a href="mailto:support@mlingua.com" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                  support@mlingua.com
                </a>.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Do you offer technical support?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes! We provide technical support via email. For urgent issues, please include "URGENT" in your subject line.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

