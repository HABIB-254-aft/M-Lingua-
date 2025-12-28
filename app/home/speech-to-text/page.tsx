"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function SpeechToTextPage() {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [fileName, setFileName] = useState("No file chosen");
  const [showStoppedMessage, setShowStoppedMessage] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const recognitionRef = useRef<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRecordingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRecognitionRef = useRef<any | null>(null);
  const processedFinalCountRef = useRef<number>(0);
  const sessionIdRef = useRef<number>(0);
  
  // Voice navigation refs (separate from transcription recognition)
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);

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
      // Handle case where SpeechRecognition is not available
      return;
    }

    // Check microphone permission first (matching prototype)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      // Permission denied or error
      setIsRecording(false);
      return;
    }

    try {
      // Stop any existing recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      // Reset tracking when starting a new recording session
      processedFinalCountRef.current = 0;
      sessionIdRef.current = Date.now(); // Unique session ID
      setTranscript(""); // Clear transcript for new recording

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      // Store session ID on recognition object to detect restarts
      (recognition as any).sessionId = sessionIdRef.current;

      recognition.onresult = (event: any) => {
        console.log('onresult fired, results length:', event.results?.length);
        
        if (!event.results || event.results.length === 0) {
          console.log('No results, returning early');
          return; // No results yet
        }

        // Check if this is a new session (recognition was restarted)
        const currentSessionId = (recognition as any).sessionId;
        if (currentSessionId !== sessionIdRef.current) {
          // New session - reset everything
          sessionIdRef.current = currentSessionId;
          processedFinalCountRef.current = 0;
        }

        // Build transcript from ALL final results + latest interim (rebuild from scratch to prevent duplication)
        let finalTranscript = "";
        let currentInterimTranscript = "";

        // Build transcript from all FINAL results (these are stable and won't change)
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result.isFinal && result[0]) {
            const transcript = result[0].transcript?.trim() || "";
            if (transcript) {
              finalTranscript += transcript + " ";
            }
          }
        }

        // Find the last interim result (if any) - this shows what's being spoken right now
        for (let i = event.results.length - 1; i >= 0; i--) {
          const result = event.results[i];
          if (result && !result.isFinal && result[0]) {
            currentInterimTranscript = result[0].transcript?.trim() || "";
            break;
          }
        }

        // Set transcript: all final results + current interim (rebuild from scratch each time)
        // This prevents duplication because we're rebuilding, not appending
        const fullTranscript = finalTranscript.trim() + (currentInterimTranscript ? " " + currentInterimTranscript : "");
        setTranscript(fullTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        // Ignore 'no-speech' errors (common and not critical, matching prototype)
        if (event.error !== 'no-speech') {
          console.error('Recognition error:', event.error);
        }
        
        // Only stop on critical errors
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
        // If still recording, restart (matching prototype behavior)
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            // Create new session ID for the restart
            sessionIdRef.current = Date.now();
            (recognitionRef.current as any).sessionId = sessionIdRef.current;
            // Don't reset processedFinalCountRef - it will be reset in onresult if needed
            recognitionRef.current.start();
          } catch {
            // If restart fails, stop recording
            isRecordingRef.current = false;
            setIsRecording(false);
            recognitionRef.current = null;
            processedFinalCountRef.current = 0;
            setShowStoppedMessage(true);
            setTimeout(() => setShowStoppedMessage(false), 3000);
          }
        } else {
          isRecordingRef.current = false;
          setIsRecording(false);
          recognitionRef.current = null;
          processedFinalCountRef.current = 0;
          setShowStoppedMessage(true);
          setTimeout(() => setShowStoppedMessage(false), 3000);
        }
      };

      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      setShowStoppedMessage(false);
      
      // Start recognition
      try {
        recognition.start();
        console.log('Recognition started');
      } catch (error) {
        console.error('Error starting recognition:', error);
        setIsRecording(false);
        isRecordingRef.current = false;
        recognitionRef.current = null;
      }
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
      processedFinalCountRef.current = 0;
      setShowStoppedMessage(true);
      setTimeout(() => setShowStoppedMessage(false), 3000);
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

  const copyTranscript = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript).catch(() => {
        // ignore
      });
    }
  };

  const clearTranscript = () => {
    setTranscript("");
  };

  const handleTranslate = () => {
    if (!transcript.trim()) {
      return;
    }
    // Navigate to translation page with transcript pre-filled
    // Store transcript in sessionStorage so translation page can access it
    if (typeof window !== "undefined") {
      sessionStorage.setItem("translationInput", transcript);
      router.push("/home/translation");
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
    if (isRecordingRef.current) return; // Don't listen while recording

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

          stopVoiceRecognition();

          if (text.includes("start recording") || text.includes("start")) {
            if (!isRecordingRef.current) {
              startRecording();
            }
            return;
          }

          if (text.includes("stop recording") || text.includes("stop")) {
            if (isRecordingRef.current) {
              stopRecording();
            }
            return;
          }

          if (text.includes("back") || text.includes("go back")) {
            router.push("/home");
            return;
          }

          if (text.includes("help") || text.includes("repeat")) {
            const message = "Speech to Text page. Say 'start recording' to begin, 'stop recording' to stop, or 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
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
          if (mode === "blind" && !isVoiceSpeakingRef.current && !isRecordingRef.current) {
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
  }, [router, stopVoiceRecognition, startRecording, stopRecording]);

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
          console.log("Speech to Text - Blind mode check:", mode, "spokenRef:", spokenRef.current);
          if (mode === "blind" && !spokenRef.current) {
            spokenRef.current = true;
            const message = "Speech to Text page. Say 'start recording' to begin, 'stop recording' to stop, or 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            try {
              const synth = window.speechSynthesis;
              if (synth) {
                try { synth.cancel(); } catch (_e) {}
                isVoiceSpeakingRef.current = true;
                const u = new SpeechSynthesisUtterance(message);
                u.lang = "en-US";
                u.addEventListener("end", () => {
                  isVoiceSpeakingRef.current = false;
                  console.log("Speech to Text - Announcement ended, starting voice recognition");
                  startVoiceRecognition();
                });
                console.log("Speech to Text - Starting announcement");
                synth.speak(u);
              } else {
                console.warn("Speech to Text - Speech synthesis not available");
              }
            } catch (_e) {
              console.error("Speech to Text - Error in announcement:", _e);
            }
          } else {
            console.log("Speech to Text - Not in blind mode or already spoken");
          }
        } catch (e) {
          console.error("Speech to Text - Error in voice setup:", e);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Speech to Text</h1>
          <button
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

        <textarea
          id="stt-output"
          aria-label="Transcribed text will appear here:"
          readOnly
          value={transcript}
          placeholder="Transcribed text will appear here..."
          className="w-full h-60 px-4 py-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:italic resize"
        />

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={copyTranscript}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="Copy transcript"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={clearTranscript}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
            aria-label="Clear transcript"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleTranslate}
            disabled={!transcript.trim()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Translate"
          >
            Translate
          </button>
        </div>
      </div>
    </main>
  );
}

