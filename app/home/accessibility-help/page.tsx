"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useCallback } from "react";

export default function AccessibilityHelpPage() {
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
            speakMessage("Accessibility Help page. Say back to go back, or repeat to hear options again.");
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
        speakMessage("Accessibility Help page. Say back to go back, or repeat to hear options again.");
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
          Accessibility Help
        </h1>

        {/* Blind Mode Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Blind Mode</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: What is Blind Mode?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Blind Mode is an accessibility feature that provides enhanced audio feedback and screen reader support, making M-Lingua fully navigable for visually impaired users. When enabled, the app will announce page content and available actions verbally.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: How do I enable Blind Mode?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: You can enable Blind Mode from the welcome page when you first visit M-Lingua, or through the Settings page. Once enabled, Blind Mode will be saved and automatically activated on future visits.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: What voice commands are available in Blind Mode?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: In Blind Mode, you can use voice commands such as "read", "back", "start recording", "stop recording", "translate", and "repeat" to navigate and interact with the app. The app will announce available commands when you enter a new page.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Can I use Blind Mode with a screen reader?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes! M-Lingua is designed to work seamlessly with screen readers like NVDA, JAWS, VoiceOver, and TalkBack. All interactive elements have proper ARIA labels and semantic HTML for optimal screen reader compatibility.
              </div>
            </div>
          </div>
        </section>

        {/* Keyboard Navigation Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Keyboard Navigation</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Can I navigate M-Lingua using only the keyboard?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes! M-Lingua is fully keyboard accessible. Use Tab to navigate between elements, Enter or Space to activate buttons and links, and Escape to close dialogs. All interactive elements are reachable via keyboard.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: What are the keyboard shortcuts?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Standard keyboard shortcuts apply: Tab (navigate forward), Shift+Tab (navigate backward), Enter/Space (activate), Escape (close/cancel), and Arrow keys (navigate within groups like radio buttons or dropdowns).
              </div>
            </div>
          </div>
        </section>

        {/* Screen Reader Support Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Screen Reader Support</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Which screen readers are supported?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: M-Lingua is compatible with all major screen readers including NVDA (Windows), JAWS (Windows), VoiceOver (macOS/iOS), TalkBack (Android), and Orca (Linux). The app uses semantic HTML and ARIA attributes for optimal compatibility.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Are form fields properly labeled?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes, all form fields, buttons, and interactive elements have proper labels and ARIA attributes. Screen readers will announce the purpose and state of each element clearly.
              </div>
            </div>
          </div>
        </section>

        {/* Visual Accessibility Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Visual Accessibility</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Does M-Lingua support high contrast mode?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: Yes, M-Lingua includes a dark mode option that provides better contrast. You can toggle dark mode using the moon/sun icon in the header. The app also respects your system's high contrast preferences when available.
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: Can I adjust text size?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: M-Lingua uses responsive text sizing. You can zoom in using your browser's zoom controls (Ctrl/Cmd + Plus) or your device's accessibility settings. The layout will adapt to maintain usability.
              </div>
            </div>
          </div>
        </section>

        {/* Getting Help Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mb-4">Getting Help</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-blue-600 p-4 rounded-sm">
              <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">Q: I'm having trouble with accessibility features. Where can I get help?</div>
              <div className="text-gray-700 dark:text-gray-300">
                A: If you're experiencing issues with accessibility features, please contact our support team at{" "}
                <a href="mailto:support@mlingua.com" className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300">
                  support@mlingua.com
                </a>
                {" "}with "Accessibility" in the subject line. We're committed to making M-Lingua accessible to everyone.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

