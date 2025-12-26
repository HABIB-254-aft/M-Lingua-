"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function ReportProblemPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    problemType: "",
    description: "",
    stepsToReproduce: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);

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
    if (isTypingRef.current) return;

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
          } else if (command.includes("submit")) {
            if (!submitted && !isSubmitting) {
              const form = document.querySelector("form");
              if (form) {
                form.requestSubmit();
              }
            }
          } else if (command.includes("repeat")) {
            speakMessage("Report a Problem page. Fill out the form and say submit to submit, or say back to go back.");
          } else {
            speakMessage("Command not recognized. Say submit to submit, back to go back, or repeat to hear options again.");
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
        if (!isVoiceSpeakingRef.current && !isTypingRef.current) {
          setTimeout(() => {
            if (!isVoiceSpeakingRef.current && !isTypingRef.current) {
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
  }, [router, stopVoiceRecognition, speakMessage, submitted, isSubmitting]);

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current !== null) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  const scheduleRecognitionRestartAfterIdle = useCallback(() => {
    clearTypingTimer();
    isTypingRef.current = true;
    typingTimerRef.current = window.setTimeout(() => {
      isTypingRef.current = false;
      typingTimerRef.current = null;
      if (!isVoiceSpeakingRef.current) {
        startVoiceRecognition();
      }
    }, 2000);
  }, [clearTypingTimer, startVoiceRecognition]);

  // Announce page entry and start voice recognition if blind mode is enabled
  useEffect(() => {
    if (submitted) return;
    if (typeof window === "undefined") return;

    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode === "blind" && !spokenRef.current) {
        spokenRef.current = true;
        speakMessage("Report a Problem page. Fill out the form and say submit to submit, or say back to go back.");
      }
    } catch {
      // ignore
    }

    return () => {
      clearTypingTimer();
      stopVoiceRecognition();
      if (typeof window !== "undefined") {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [speakMessage, stopVoiceRecognition, clearTypingTimer, submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission (in a real app, this would send to a backend)
    try {
      // Save to localStorage as a simple solution
      const reports = JSON.parse(localStorage.getItem("problemReports") || "[]");
      reports.push({
        ...formData,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("problemReports", JSON.stringify(reports));

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitted(true);
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (error) {
      alert("Error submitting report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900 pt-12 flex items-start justify-center">
        <div className="w-full max-w-2xl mx-auto px-6 text-left">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-sm p-6 text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-300 mb-2">Report Submitted</h2>
            <p className="text-green-700 dark:text-green-300">
              Thank you for reporting the problem. We'll review it and get back to you if needed.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-12 flex items-start justify-center">
      <div className="w-full max-w-2xl mx-auto px-6 text-left">
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
          Report a Problem
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="problemType" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Problem Type <span className="text-red-500">*</span>
            </label>
            <select
              id="problemType"
              name="problemType"
              value={formData.problemType}
              onChange={handleChange}
              onFocus={() => {
                try {
                  stopVoiceRecognition();
                } catch {
                  // ignore
                }
                isTypingRef.current = true;
                clearTypingTimer();
              }}
              onBlur={() => {
                try {
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              required
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
            >
              <option value="">Select a problem type...</option>
              <option value="bug">Bug / Error</option>
              <option value="feature">Feature not working</option>
              <option value="performance">Performance issue</option>
              <option value="accessibility">Accessibility issue</option>
              <option value="ui">UI / Design issue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              onFocus={() => {
                try {
                  stopVoiceRecognition();
                } catch {
                  // ignore
                }
                isTypingRef.current = true;
                clearTypingTimer();
              }}
              onBlur={() => {
                try {
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              onInput={() => {
                try {
                  isTypingRef.current = true;
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              required
              rows={5}
              placeholder="Please describe the problem in detail..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600 resize"
            />
          </div>

          <div>
            <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Steps to Reproduce
            </label>
            <textarea
              id="stepsToReproduce"
              name="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={handleChange}
              onFocus={() => {
                try {
                  stopVoiceRecognition();
                } catch {
                  // ignore
                }
                isTypingRef.current = true;
                clearTypingTimer();
              }}
              onBlur={() => {
                try {
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              onInput={() => {
                try {
                  isTypingRef.current = true;
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              rows={4}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600 resize"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onFocus={() => {
                try {
                  stopVoiceRecognition();
                } catch {
                  // ignore
                }
                isTypingRef.current = true;
                clearTypingTimer();
              }}
              onBlur={() => {
                try {
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              onInput={() => {
                try {
                  isTypingRef.current = true;
                  scheduleRecognitionRestartAfterIdle();
                } catch {
                  // ignore
                }
              }}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-2 focus:outline-blue-600 focus:outline-offset-2 focus:border-blue-600"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Provide your email if you'd like us to follow up on this issue.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

