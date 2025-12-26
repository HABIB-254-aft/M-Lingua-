"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ConversationMessage {
  text: string;
  mode: string;
  timestamp: string;
  isLocal: boolean;
}

export default function ConversationModePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<string>("standard");
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const isRecordingRef = useRef(false);
  
  // Voice navigation refs
  const voiceRecognitionRef = useRef<any | null>(null);
  const isVoiceListeningRef = useRef(false);
  const isVoiceSpeakingRef = useRef(false);
  const spokenRef = useRef(false);

  const createRoom = () => {
    // Generate a 6-character room code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCreatedRoomCode(code);
  };

  const joinRoom = () => {
    if (!roomCode || roomCode.length !== 6) {
      alert("Please enter a valid 6-character room code.");
      return;
    }
    setShowModeSelection(true);
  };

  const copyRoomCode = () => {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode).catch(() => {
        // ignore
      });
      alert("Room code copied to clipboard!");
    }
  };

  const startConversation = () => {
    if (!selectedMode) {
      alert("Please select a communication mode.");
      return;
    }
    setIsStarted(true);
    setConversationHistory([]);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const message: ConversationMessage = {
      text: text.trim(),
      mode: selectedMode,
      timestamp: new Date().toLocaleTimeString(),
      isLocal: true,
    };

    setConversationHistory((prev) => [...prev, message]);
    setInputText("");

    // Process based on mode
    if (selectedMode === "deaf") {
      // Sign language animation would go here
      console.log("Sign language for:", text);
    } else if (selectedMode === "blind") {
      // Text to speech
      if (typeof window !== "undefined") {
        const synth = window.speechSynthesis;
        if (synth) {
          try {
            synth.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = "en-US";
            synth.speak(u);
          } catch {
            // ignore
          }
        }
      }
    } else if (selectedMode === "multilingual") {
      // Translation would go here (simplified for v1)
      console.log("Translation for:", text);
    }
  };

  const startRecording = async () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error: any) {
      alert("Microphone access is required. Please allow access and try again.");
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
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSendMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Recognition error:", event.error);
        setIsRecording(false);
        isRecordingRef.current = false;
      };

      recognition.onend = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
      };

      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      setIsRecording(false);
      recognitionRef.current = null;
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsRecording(false);
    isRecordingRef.current = false;
  };

  const endConversation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsStarted(false);
    setConversationHistory([]);
    setInputText("");
    setIsRecording(false);
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

          // Commands for initial state (create/join room)
          if (!showModeSelection && !isStarted) {
            if (textCmd.includes("create") || textCmd.includes("create room")) {
              createRoom();
              return;
            }
            if (textCmd.includes("join") || textCmd.includes("join room")) {
              if (roomCode && roomCode.length === 6) {
                joinRoom();
              }
              return;
            }
          }

          // Commands for mode selection state
          if (showModeSelection && !isStarted) {
            if (textCmd.includes("deaf") || textCmd.includes("sign")) {
              setSelectedMode("deaf");
              return;
            }
            if (textCmd.includes("blind") || textCmd.includes("audio")) {
              setSelectedMode("blind");
              return;
            }
            if (textCmd.includes("multilingual") || textCmd.includes("translation")) {
              setSelectedMode("multilingual");
              return;
            }
            if (textCmd.includes("standard") || textCmd.includes("text")) {
              setSelectedMode("standard");
              return;
            }
            if (textCmd.includes("confirm") || textCmd.includes("start")) {
              startConversation();
              return;
            }
            if (textCmd.includes("back")) {
              setShowModeSelection(false);
              setCreatedRoomCode("");
              setRoomCode("");
              return;
            }
          }

          // Commands for active conversation state
          if (isStarted) {
            if (textCmd.includes("record") && !isRecording) {
              startRecording();
              return;
            }
            if (textCmd.includes("stop") && isRecording) {
              stopRecording();
              return;
            }
            if (textCmd.includes("end") || textCmd.includes("end conversation")) {
              endConversation();
              return;
            }
          }

          // Common commands
          if (textCmd.includes("back") || textCmd.includes("go back")) {
            if (isStarted) {
              endConversation();
            } else if (showModeSelection) {
              setShowModeSelection(false);
              setCreatedRoomCode("");
              setRoomCode("");
            } else {
              router.push("/home");
            }
            return;
          }

          if (textCmd.includes("help") || textCmd.includes("repeat")) {
            let message = "";
            if (!showModeSelection && !isStarted) {
              message = "Conversation Mode page. Say 'create room' to create a room, or 'join room' to join. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            } else if (showModeSelection && !isStarted) {
              message = "Select communication mode. Say 'deaf', 'blind', 'multilingual', or 'standard'. Then say 'confirm' to start. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            } else if (isStarted) {
              message = "Conversation active. Say 'record' to record a message, 'stop' to stop recording, or 'end' to end conversation. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            }
            try {
              const synth = window.speechSynthesis;
              if (synth && message) {
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
  }, [router, stopVoiceRecognition, isRecording, showModeSelection, isStarted, roomCode]);

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
            let message = "";
            if (!showModeSelection && !isStarted) {
              message = "Conversation Mode page. Say 'create room' to create a room, or 'join room' to join. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            } else if (showModeSelection && !isStarted) {
              message = "Select communication mode. Say 'deaf', 'blind', 'multilingual', or 'standard'. Then say 'confirm' to start. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            } else if (isStarted) {
              message = "Conversation active. Say 'record' to record a message, 'stop' to stop recording, or 'end' to end conversation. Say 'back' to go back. Say 'help' or 'repeat' to hear these options again.";
            }
            try {
              const synth = window.speechSynthesis;
              if (synth && message) {
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
  }, [startVoiceRecognition, stopVoiceRecognition, showModeSelection, isStarted]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

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

        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100">Conversation Mode</h1>

        {!showModeSelection && !isStarted && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Connect with Another Device</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Start or join a conversation room to communicate with someone on another device in real-time.</p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">ℹ️</span>
                <div>
                  <strong className="text-blue-900 dark:text-blue-300">Cross-Device Feature Notice</strong>
                  <p className="text-blue-800 dark:text-blue-300 text-sm mt-1">Cross-device conversation is currently under development. For best results, use the same device with different browser tabs.</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">Create Room (Host)</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Create a new conversation room and share the code with the other person.</p>
                {!createdRoomCode ? (
                  <button
                    type="button"
                    onClick={createRoom}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg focus-visible:outline-none focus-visible:border-blue-500 inline-flex items-center gap-2"
                    aria-label="Create new conversation room"
                  >
                    <span>➕</span> Create Room
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Room Created!</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">Share this code with the other person:</p>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-wider">{createdRoomCode}</span>
                        <button
                          type="button"
                          onClick={copyRoomCode}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
                          aria-label="Copy room code"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">You can start the conversation now, or wait for someone to join.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowModeSelection(true)}
                      className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg focus-visible:outline-none focus-visible:border-blue-500 inline-flex items-center gap-2"
                      aria-label="Start conversation"
                    >
                      <span>🚀</span> Start Conversation
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
                <span className="text-gray-500 dark:text-gray-400">or</span>
                <div className="flex-1 border-t border-gray-300 dark:border-gray-700"></div>
              </div>

              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">Join Room</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">Enter the 6-character room code to join an existing conversation.</p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">Note: Currently works best on the same device (different tabs). For cross-device, Firebase integration is needed.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="ENTER ROOM"
                    maxLength={6}
                    className="px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-lg text-center text-lg font-semibold tracking-wider uppercase focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800"
                    aria-label="Room code"
                  />
                  <button
                    type="button"
                    onClick={joinRoom}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg focus-visible:outline-none focus-visible:border-blue-500 inline-flex items-center gap-2"
                    aria-label="Join conversation room"
                  >
                    <span>🔗</span> Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showModeSelection && !isStarted && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Select Your Communication Mode</h2>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="userMode"
                  value="deaf"
                  checked={selectedMode === "deaf"}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-gray-100">Deaf User (Sign Language)</span>
              </label>
              <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="userMode"
                  value="blind"
                  checked={selectedMode === "blind"}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-gray-100">Blind User (Audio)</span>
              </label>
              <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="userMode"
                  value="multilingual"
                  checked={selectedMode === "multilingual"}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-gray-100">Multilingual User (Translation)</span>
              </label>
              <label className="flex items-center gap-3 p-4 border-2 border-gray-300 dark:border-gray-700 rounded-sm cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800">
                <input
                  type="radio"
                  name="userMode"
                  value="standard"
                  checked={selectedMode === "standard"}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900 dark:text-gray-100">Standard (Text & Speech)</span>
              </label>
            </div>
            <button
              type="button"
              onClick={startConversation}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg focus-visible:outline-none focus-visible:border-blue-500"
              aria-label="Confirm mode and start conversation"
            >
              Confirm & Start
            </button>
            <button
              type="button"
              onClick={() => {
                setShowModeSelection(false);
                setCreatedRoomCode("");
                setRoomCode("");
              }}
              className="ml-3 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
            >
              Back
            </button>
          </div>
        )}

        {isStarted && (
          <div className="mb-6">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                Mode: <strong>{selectedMode === "deaf" ? "Deaf User" : selectedMode === "blind" ? "Blind User" : selectedMode === "multilingual" ? "Multilingual" : "Standard"}</strong>
              </p>
            </div>

            <div className="border-2 border-gray-300 dark:border-gray-700 rounded-sm p-4 mb-4 h-96 overflow-y-auto bg-gray-50 dark:bg-gray-800">
              {conversationHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center mt-8">No messages yet. Start typing or recording to begin the conversation.</p>
              ) : (
                <div className="space-y-3">
                  {conversationHistory.map((msg, index) => (
                    <div key={index} className="p-3 bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">You</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">{msg.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputText);
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border-2 border-gray-300 dark:border-gray-700 rounded-sm focus-visible:outline-none focus-visible:border-blue-500 text-slate-900 dark:text-gray-100 dark:bg-gray-800"
                aria-label="Message input"
              />
              <button
                type="button"
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                Send
              </button>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500"
                  aria-label="Record message"
                >
                  🎤 Record
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 bg-gray-800 text-white font-semibold rounded-sm focus-visible:outline-none focus-visible:border-blue-500"
                  aria-label="Stop recording"
                >
                  ⏹️ Stop
                </button>
              )}
              <button
                type="button"
                onClick={endConversation}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-sm text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus-visible:outline-none focus-visible:border-blue-500"
                aria-label="End conversation"
              >
                End
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

