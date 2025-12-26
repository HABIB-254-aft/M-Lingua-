"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SignLanguageAvatar from "../SignLanguageAvatar";

export default function SpeechToSignPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [fileName, setFileName] = useState("No file chosen");
  const [showStoppedMessage, setShowStoppedMessage] = useState(false);
  const [signSpeed, setSignSpeed] = useState(1);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const recognitionRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRecognitionRef = useRef<any | null>(null);
  
  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);
  const startRecordingBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.stop();
          } catch {
            // ignore
          }
        }
        cleanup();
      } catch {
        // ignore
      } finally {
        recognitionRef.current = null;
        setIsRecording(false);
      }
    };
  }, []);

  const startRecording = async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return;
    }

    // Check microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      setIsRecording(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let allFinalTranscript = "";
        let currentInterimTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            allFinalTranscript += transcript + " ";
          }
        }

        for (let i = event.results.length - 1; i >= 0; i--) {
          if (!event.results[i].isFinal) {
            currentInterimTranscript = event.results[i][0].transcript;
            break;
          }
        }

        setTranscript((allFinalTranscript.trim() + (currentInterimTranscript ? " " + currentInterimTranscript : "")).trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.error('Recognition error:', event.error);
        }
        
        if (event.error === 'not-allowed' || event.error === 'aborted') {
          try {
            recognition.stop();
          } catch {
            // ignore
          }
          setIsRecording(false);
          recognitionRef.current = null;
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch {
            isRecordingRef.current = false;
            setIsRecording(false);
            recognitionRef.current = null;
            setShowStoppedMessage(true);
            setTimeout(() => setShowStoppedMessage(false), 3000);
          }
        } else {
          isRecordingRef.current = false;
          setIsRecording(false);
          recognitionRef.current = null;
          setShowStoppedMessage(true);
          setTimeout(() => setShowStoppedMessage(false), 3000);
        }
      };

      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      setShowStoppedMessage(false);
      recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsRecording(false);
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    if (typeof window === "undefined") return;
    isRecordingRef.current = false;
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    } finally {
      setIsRecording(false);
      recognitionRef.current = null;
      setShowStoppedMessage(true);
      setTimeout(() => setShowStoppedMessage(false), 3000);
    }
  };

  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }
    if (fileRecognitionRef.current) {
      try {
        fileRecognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      fileRecognitionRef.current = null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setFileError("Invalid file type. Please upload MP3, WAV, OGG, or M4A files.");
      setFileName("No file chosen");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (25MB max)
    const maxSize = 25 * 1024 * 1024; // 25MB in bytes
    if (file.size > maxSize) {
      setFileError("File size exceeds 25MB limit. Please choose a smaller file.");
      setFileName("No file chosen");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setFileError("");
    setFileName(file.name);
    setIsProcessingFile(true);
    setTranscript("");

    try {
      // Stop any ongoing recording
      if (isRecording) {
        stopRecording();
      }

      // Create audio element
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Wait for audio to load metadata
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = () => resolve(undefined);
        audio.onerror = () => reject(new Error("Failed to load audio file"));
        // If already loaded, resolve immediately
        if (audio.readyState >= 2) {
          resolve(undefined);
        }
      });

      // Set up Speech Recognition for file transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Speech recognition is not supported in your browser.");
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = "";
      let hasReceivedResults = false;

      recognition.onresult = (event: any) => {
        hasReceivedResults = true;
        let interimTranscript = "";
        let newFinalTranscript = "";

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            newFinalTranscript += result[0].transcript + " ";
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        finalTranscript = newFinalTranscript;
        setTranscript((finalTranscript + interimTranscript).trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          // This is normal when audio ends, ignore it
          return;
        }
        console.error("Recognition error:", event.error);
        setIsProcessingFile(false);
        setFileError("Error processing audio file. Please try again.");
        cleanup();
      };

      recognition.onend = () => {
        // If we didn't get any results, show a helpful message
        if (!hasReceivedResults) {
          setFileError("No speech detected. Please ensure your microphone is enabled and the audio file contains clear speech.");
        }
        setIsProcessingFile(false);
        cleanup();
      };

      fileRecognitionRef.current = recognition;

      // Start recognition first
      recognition.start();

      // Wait a moment for recognition to initialize, then play audio
      await new Promise(resolve => setTimeout(resolve, 500));

      // Play audio and transcribe
      await audio.play();

      // Stop recognition when audio ends
      audio.addEventListener('ended', () => {
        setTimeout(() => {
          if (fileRecognitionRef.current) {
            try {
              fileRecognitionRef.current.stop();
            } catch (e) {
              // ignore
            }
          }
        }, 2000); // Give it more time to capture final results
      });

    } catch (error: any) {
      console.error("Error processing file:", error);
      setIsProcessingFile(false);
      setFileError(error.message || "Error processing audio file. Please try again.");
      cleanup();
    }
  };

  // Voice navigation functions
  const stopVoiceRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (voiceRecognitionRef.current) {
        try {
          voiceRecognitionRef.current.onresult = null;
          voiceRecognitionRef.current.onend = null;
          voiceRecognitionRef.current.onerror = null;
          voiceRecognitionRef.current.stop();
        } catch (_e) {
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
    try {
      const mode = localStorage.getItem("accessibilityMode");
      if (mode !== "blind") return;
    } catch (_e) {
      return;
    }

    if (isVoiceSpeakingRef.current) return;
    if (isVoiceListeningRef.current) return;
    if (isRecording) return; // Don't listen while recording

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
          const textCmd = transcript.trim().toLowerCase();
          if (!textCmd) return;

          stopVoiceRecognition();

          if (textCmd.includes("start") && textCmd.includes("recording")) {
            if (!isRecording) {
              startRecordingBtnRef.current?.click();
            }
            return;
          }

          if (textCmd.includes("stop") && textCmd.includes("recording")) {
            if (isRecording) {
              startRecordingBtnRef.current?.click();
            }
            return;
          }

          if (textCmd.includes("back") || textCmd.includes("go back")) {
            router.push("/home");
            return;
          }

          if (textCmd.includes("help") || textCmd.includes("repeat")) {
            const message = "Speech to Sign page. Say 'start recording' to begin, or 'stop recording' to stop. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isVoiceSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(message);
                u.lang = "en-US";
                u.addEventListener("end", () => {
                  isVoiceSpeakingRef.current = false;
                  startVoiceRecognition();
                });
                synth.speak(u);
              }
            } catch (_e) {}
            return;
          }

          // If command not recognized
          const unrecognizedMessage = "Command not recognized. Say 'help' to hear the available commands again.";
          try {
            const synth = window.speechSynthesis;
            if (synth) {
              try { synth.cancel(); } catch (_e) {}
              isVoiceSpeakingRef.current = true;
              const u = new SpeechSynthesisUtterance(unrecognizedMessage);
              u.lang = "en-US";
              u.addEventListener("end", () => {
                isVoiceSpeakingRef.current = false;
                startVoiceRecognition();
              });
              synth.speak(u);
            }
          } catch (_e) {}
        } catch (_e) {
          // ignore
        }
      };

      r.onerror = () => {
        stopVoiceRecognition();
      };

      r.onend = () => {
        isVoiceListeningRef.current = false;
        voiceRecognitionRef.current = null;
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !isVoiceSpeakingRef.current && !isRecording) {
            setTimeout(() => startVoiceRecognition(), 300);
          }
        } catch (_e) {
          // ignore
        }
      };

      voiceRecognitionRef.current = r;
      try {
        r.start();
        isVoiceListeningRef.current = true;
      } catch (_err) {
        voiceRecognitionRef.current = null;
        isVoiceListeningRef.current = false;
      }
    } catch (_e) {
      // ignore
    }
  }, [router, stopVoiceRecognition, isRecording]);

  // Voice navigation setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Always reset spokenRef on mount to ensure it works on refresh
    spokenRef.current = false;

    let timer: NodeJS.Timeout | null = null;
    let frameId: number | null = null;

    // Use requestAnimationFrame to ensure DOM is ready
    frameId = requestAnimationFrame(() => {
      // Then use a small timeout to ensure speech synthesis is ready
      timer = setTimeout(() => {
        try {
          const mode = localStorage.getItem("accessibilityMode");
          if (mode === "blind" && !spokenRef.current) {
            spokenRef.current = true;
            const message = "Speech to Sign page. Say 'start recording' to begin, or 'stop recording' to stop. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isVoiceSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(message);
                u.lang = "en-US";
                u.addEventListener("end", () => {
                  isVoiceSpeakingRef.current = false;
                  startVoiceRecognition();
                });
                synth.speak(u);
              }
            } catch (_e) {
              // fail silently
            }
          }
        } catch (e) {
          // fail silently
        }
      }, 200);
    });

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
      if (timer) {
        clearTimeout(timer);
      }
      stopVoiceRecognition();
      try {
        if (typeof window !== "undefined") {
          window.speechSynthesis.cancel();
        }
      } catch (_e) {
        // ignore
      }
    };
  }, [startVoiceRecognition, stopVoiceRecognition]);

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

        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Speech to Sign Language</h1>
          <button
            ref={startRecordingBtnRef}
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 ${
              isRecording
                ? "bg-gray-800 text-white"
                : "bg-blue-600 text-white"
            }`}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
                <rect x="6" y="6" width="12" height="12"></rect>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            )}
            {isRecording ? "Stop Recording" : "Start Recording"}
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Or Upload Audio File</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <input
              ref={fileInputRef}
              type="file"
              id="audio-file"
              accept=".mp3,.wav,.ogg,.m4a"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile || isRecording}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose File
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">{fileName}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Supported formats: MP3, WAV, OGG, M4A (max 25MB)</p>
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-sm">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> Audio file transcription requires microphone access. The system will play your audio file and attempt to transcribe it through your microphone. For best results, ensure your microphone is enabled and use the "Start Recording" button for direct transcription.
            </p>
          </div>
          {fileError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{fileError}</p>
          )}
        </div>

        {isProcessingFile && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-sm px-6 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-700 dark:text-blue-300 font-medium">Processing audio file... Please wait.</span>
          </div>
        )}

        {isRecording && (
          <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-sm px-6 py-3 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-400 rounded-full bg-white dark:bg-gray-800"></div>
            <span className="text-orange-700 dark:text-orange-300 font-medium">Recording... Speak now.</span>
          </div>
        )}

        {showStoppedMessage && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-sm px-6 py-3">
            <span className="text-green-700 dark:text-green-300 font-medium">Recording stopped.</span>
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="sign-transcript" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Recognized Text:
          </label>
          <div className="border-2 border-blue-500 dark:border-blue-400 rounded-sm p-4 min-h-32 bg-white dark:bg-gray-800">
            {transcript ? (
              <p className="text-slate-900 dark:text-gray-100">{transcript}</p>
            ) : (
              <p className="text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
                Ready to listen... Click the microphone button to start.
              </p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="sign-avatar" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Sign Language Output:
          </label>
          <div
            id="sign-avatar"
            className="w-full h-96 border-2 border-gray-300 dark:border-gray-700 rounded-sm bg-white dark:bg-gray-800 overflow-hidden"
            role="img"
            aria-label="Sign language avatar"
          >
            <SignLanguageAvatar text={transcript} speed={signSpeed} containerId="sign-avatar" />
          </div>
          <div className="flex items-center gap-4 mt-3">
            <label htmlFor="sign-speed" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Signing Speed:
            </label>
            <input
              type="range"
              id="sign-speed"
              min="0.5"
              max="2"
              step="0.1"
              value={signSpeed}
              onChange={(e) => setSignSpeed(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              aria-label="Signing speed"
            />
            <span id="sign-speed-value" className="text-sm text-gray-700 dark:text-gray-300 w-8">{signSpeed}x</span>
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
              aria-label="Replay sign language"
            >
              Replay
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

