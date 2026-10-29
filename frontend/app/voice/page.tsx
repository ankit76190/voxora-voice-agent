"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import { Waveform } from "@/components/voice/waveform";
import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  isSecureContextOrLocalhost,
  formatTime,
} from "@/lib/voice-engine";
import {
  sendVoiceTurn,
  fetchBackendStatus,
  createCallSession,
  completeCallSession,
  BackendStatus,
  ConversationTurn,
} from "@/lib/conversation-api";
import {
  VoiceSessionState,
  MicPermissionState,
  TranscriptItem,
} from "@/types";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Info,
  Radio,
  Lock,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  Cpu,
  RefreshCw,
} from "lucide-react";

// SpeechRecognition type declarations for browsers that support it
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: {
        transcript: string;
        confidence: number;
      };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export default function VoicePlaygroundPage() {
  // Session States
  const [sessionState, setSessionState] = useState<VoiceSessionState>("idle");
  const [permissionState, setPermissionState] = useState<MicPermissionState>("prompt");
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [useLiveAI, setUseLiveAI] = useState(true);

  // Backend Telemetry
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    online: false,
    geminiConfigured: false,
    model: "Checking...",
  });

  // Runtime environment detection
  const [isSupported, setIsSupported] = useState(true);
  const [isSynthSupported, setIsSynthSupported] = useState(true);
  const [isSecure, setIsSecure] = useState(true);

  // Refs to manage recognition instance and avoid stale closures or restart loops
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const isSessionActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const useLiveAIRef = useRef(true);
  const transcriptsRef = useRef<TranscriptItem[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);

  // Sync refs with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    useLiveAIRef.current = useLiveAI;
  }, [useLiveAI]);

  useEffect(() => {
    transcriptsRef.current = transcripts;
  }, [transcripts]);

  // Check browser capabilities and query backend status on mount
  useEffect(() => {
    const speechRec = isSpeechRecognitionSupported();
    const synth = isSpeechSynthesisSupported();
    const secure = isSecureContextOrLocalhost();

    setIsSupported(speechRec);
    setIsSynthSupported(synth);
    setIsSecure(secure);

    if (!speechRec) {
      setPermissionState("unsupported");
    }

    // Probe backend status
    fetchBackendStatus().then((status) => {
      setBackendStatus(status);
    });
  }, []);

  // Auto-scroll transcript container
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts]);

  // Cleanup on unmount: stop speech synthesis and recognition
  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup abort
        }
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop session handler
  const handleEndSession = useCallback(async () => {
    isSessionActiveRef.current = false;
    setSessionState("stopped");

    // Cancel any active speech synthesis immediately
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Stop and release speech recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore already stopped
      }
      recognitionRef.current = null;
    }

    const callId = activeCallIdRef.current;
    const duration = sessionStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - sessionStartTimeRef.current) / 1000))
      : 0;

    const turnsToSave = transcriptsRef.current
      .filter((t) => t.role === "user" || t.role === "agent")
      .map((t, idx) => ({
        role: t.role as "user" | "agent",
        content: t.text,
        timestamp: t.timestamp,
        sequence: idx + 1,
      }));

    let saveNotice = "Voice session ended by operator. Microphone and audio playback released.";

    if (callId) {
      const saved = await completeCallSession(callId, {
        status: "COMPLETED",
        duration_seconds: duration,
        transcripts: turnsToSave,
      });

      if (saved) {
        saveNotice = `Voice session finalized & persisted to Call History (Record ID: ${callId.slice(0, 8)}...).`;
      } else {
        saveNotice = "Voice session ended. (Backend storage offline — session preserved in local UI).";
      }
      activeCallIdRef.current = null;
      sessionStartTimeRef.current = null;
    }

    // Add session end marker to transcript
    setTranscripts((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: "system",
        text: saveNotice,
        timestamp: formatTime(),
      },
    ]);
  }, []);

  // Process user speech and query backend conversation API
  const handleSpeechResult = useCallback(
    async (spokenText: string) => {
      const cleanText = spokenText.trim();
      if (!cleanText) return;

      const time = formatTime();

      // Add user transcript turn
      setTranscripts((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          role: "user",
          text: cleanText,
          timestamp: time,
        },
      ]);

      setSessionState("processing");

      // Extract bounded history turns for backend context
      const historyTurns: ConversationTurn[] = transcriptsRef.current
        .filter((t) => t.role === "user" || t.role === "agent")
        .slice(-8)
        .map((t) => ({
          role: t.role === "agent" ? "model" : "user",
          content: t.text,
        }));

      // Call backend conversation service
      const result = await sendVoiceTurn(
        {
          message: cleanText,
          history: historyTurns,
        },
        /* allowFallbackOnOffline */ true
      );

      // If user ended session while response was being processed, discard playback
      if (!isSessionActiveRef.current) {
        return;
      }

      // Add agent turn to transcripts
      setTranscripts((prev) => [
        ...prev,
        {
          id: `agt-${Date.now()}`,
          role: "agent",
          text: result.replyText,
          timestamp: formatTime(),
          source: result.source,
          modelName: result.modelName,
          topic: result.topic,
          error: result.error,
        },
      ]);

      if (result.error && result.source === "demo_fallback") {
        setErrorMessage(`Backend notice: ${result.error}`);
      }

      // Synthesize spoken audio if enabled and available
      if (
        !isMutedRef.current &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        setSessionState("speaking");
        const utterance = new SpeechSynthesisUtterance(result.replyText);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = "en-US";

        utterance.onend = () => {
          if (isSessionActiveRef.current) {
            setSessionState("listening");
          }
        };

        utterance.onerror = () => {
          if (isSessionActiveRef.current) {
            setSessionState("listening");
          }
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // If muted or synth unsupported, transition back to listening
        setSessionState("listening");
      }
    },
    []
  );

  // Start session handler
  const handleStartSession = async () => {
    if (!isSupported) {
      setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    setErrorMessage(null);
    setSessionState("requesting_permission");

    // Explicitly prompt for microphone authorization
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Close the stream tracks immediately — SpeechRecognition will manage audio pipeline
        stream.getTracks().forEach((track) => track.stop());
        setPermissionState("granted");
      }
    } catch (err: unknown) {
      const errObj = err as { name?: string; message?: string };
      setPermissionState("denied");
      setSessionState("error");
      if (errObj.name === "NotAllowedError" || errObj.name === "PermissionDeniedError") {
        setErrorMessage("Microphone permission was denied by browser settings. Please allow microphone access in your browser bar.");
      } else {
        setErrorMessage("Could not initialize microphone input hardware.");
      }
      return;
    }

    // Initialize browser SpeechRecognition
    const windowObj = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };

    const SpeechRecClass = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
    if (!SpeechRecClass) {
      setSessionState("error");
      setErrorMessage("Browser Speech Recognition constructor unavailable.");
      return;
    }

    try {
      const recognition = new SpeechRecClass();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        isSessionActiveRef.current = true;
        setSessionState("listening");
        setErrorMessage(null);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            handleSpeechResult(transcript);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        if (event.error === "no-speech") {
          return;
        }

        if (event.error === "not-allowed") {
          setPermissionState("denied");
          setErrorMessage("Microphone access denied or revoked by browser.");
          setSessionState("error");
          isSessionActiveRef.current = false;
          return;
        }

        setErrorMessage(`Speech recognition error: ${event.error}`);
        setSessionState("error");
        isSessionActiveRef.current = false;
      };

      recognition.onend = () => {
        // If session is still marked active by user, restart recognition safely
        if (isSessionActiveRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or restarting
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      // Initialize persistent call record in backend
      const newCall = await createCallSession({
        contact_name: "Web Operator",
        phone_number: "Browser Audio Session",
        direction: "BROWSER",
        agent_name: "Voxora Voice AI",
      });

      if (newCall) {
        activeCallIdRef.current = newCall.id;
      }
      sessionStartTimeRef.current = Date.now();

      // Add system announcement
      const callSessionMsg = newCall
        ? ` (Tracking ID: ${newCall.id.slice(0, 8)}...)`
        : "";

      setTranscripts((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "system",
          text: `Voice session started${callSessionMsg}. Conversational engine connected via FastAPI (${backendStatus.model}). Speak clearly into your microphone.`,
          timestamp: formatTime(),
        },
      ]);
    } catch {
      setSessionState("error");
      setErrorMessage("Failed to start speech recognition session.");
    }
  };

  // Toggle mute handler
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (nextMute && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      if (sessionState === "speaking") {
        setSessionState("listening");
      }
    }
  };

  // Clear conversation handler
  const handleClearTranscripts = () => {
    setTranscripts([]);
    activeCallIdRef.current = null;
    sessionStartTimeRef.current = null;
  };

  const isSessionActive =
    sessionState === "listening" ||
    sessionState === "processing" ||
    sessionState === "speaking" ||
    sessionState === "requesting_permission";

  return (
    <AppShell title="Browser Voice Playground">
      {/* Platform Banner */}
      <DemoBanner message="PHASE 4 AI INTEGRATION — User speech is transcribed in the browser, processed server-side via FastAPI and Gemini (gemini-2.5-flash), and spoken back via SpeechSynthesis. API keys remain strictly on the backend." />

      {/* Security Context Warning */}
      {!isSecure && (
        <div
          className="flex items-center space-x-2.5 p-3.5 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-mono"
          role="alert"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Notice: Microphones generally require a secure origin (HTTPS or localhost). If running on an external IP or HTTP domain, the browser may block audio capture.
          </span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div
          className="flex items-center justify-between p-4 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs font-mono animate-fadeIn"
          role="alert"
        >
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-ivory-muted hover:text-ivory uppercase text-[10px] underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Console & Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Voice Control Card */}
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-charcoal-border pb-4">
              <div>
                <h2 className="text-base font-serif font-semibold text-ivory">
                  Acoustic Audio Channel
                </h2>
                <p className="text-xs text-ivory-muted">
                  Interactive real-time microphone loopback
                </p>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSessionActive ? "bg-sage animate-pulse" : "bg-charcoal-border"
                  }`}
                />
                <span className="text-ivory-muted uppercase text-[10px]">
                  {isSessionActive ? "Active" : "Offline"}
                </span>
              </div>
            </div>

            {/* Audio Waveform Visualizer */}
            <Waveform state={sessionState} />

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                {/* Start Button */}
                <button
                  type="button"
                  onClick={handleStartSession}
                  disabled={isSessionActive || !isSupported}
                  className={`px-4 py-3 rounded text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${
                    isSessionActive || !isSupported
                      ? "bg-charcoal-300 text-ivory-muted border border-charcoal-border cursor-not-allowed opacity-60"
                      : "bg-champagne text-charcoal hover:bg-champagne-light focus:outline-none focus:ring-2 focus:ring-champagne"
                  }`}
                  aria-label="Start Voice Session"
                >
                  <Mic className="w-4 h-4" />
                  <span>Start Session</span>
                </button>

                {/* End Button */}
                <button
                  type="button"
                  onClick={handleEndSession}
                  disabled={!isSessionActive}
                  className={`px-4 py-3 rounded text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors ${
                    !isSessionActive
                      ? "bg-charcoal-300 text-ivory-muted border border-charcoal-border cursor-not-allowed opacity-60"
                      : "bg-rose-950/70 border border-rose-800 text-rose-200 hover:bg-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  }`}
                  aria-label="End Voice Session"
                >
                  <MicOff className="w-4 h-4" />
                  <span>End Session</span>
                </button>
              </div>

              {/* Secondary Controls: Mute and Clear */}
              <div className="flex items-center justify-between pt-2 border-t border-charcoal-border">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`px-3 py-1.5 rounded text-xs font-mono flex items-center space-x-2 border transition-colors ${
                    isMuted
                      ? "bg-rose-950/30 text-rose-300 border-rose-900/50"
                      : "bg-charcoal-300 text-ivory-muted border-charcoal-border hover:text-ivory"
                  }`}
                  aria-label={isMuted ? "Unmute spoken responses" : "Mute spoken responses"}
                >
                  {isMuted ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                      <span>Audio Muted</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-champagne" />
                      <span>Audio Enabled</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClearTranscripts}
                  disabled={transcripts.length === 0}
                  className="px-3 py-1.5 rounded text-xs font-mono text-ivory-muted hover:text-ivory border border-charcoal-border bg-charcoal-300 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Clear Conversation Transcript"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Conversation</span>
                </button>
              </div>
            </div>
          </div>

          {/* Backend AI Telemetry & Permissions Box */}
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-champagne" />
                <h3 className="text-xs uppercase font-mono tracking-wider text-ivory font-semibold">
                  AI Architecture Telemetry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  fetchBackendStatus().then(setBackendStatus);
                }}
                className="text-[10px] font-mono text-champagne hover:underline flex items-center space-x-1"
                aria-label="Refresh backend status"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Probe</span>
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 bg-charcoal-300 rounded border border-charcoal-border">
                <span className="text-ivory-muted">Backend Service (FastAPI):</span>
                <span className={backendStatus.online ? "text-sage" : "text-rose-400"}>
                  {backendStatus.online ? "ONLINE (:8000)" : "UNREACHABLE"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-charcoal-300 rounded border border-charcoal-border">
                <span className="text-ivory-muted">Gemini Server Key:</span>
                <span className={backendStatus.geminiConfigured ? "text-sage" : "text-champagne"}>
                  {backendStatus.geminiConfigured ? "CONFIGURED (SECURE)" : "PENDING SETUP (DEMO FALLBACK)"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-charcoal-300 rounded border border-charcoal-border">
                <span className="text-ivory-muted">Model Target:</span>
                <span className="text-ivory">{backendStatus.model}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-charcoal-300 rounded border border-charcoal-border">
                <span className="text-ivory-muted">Microphone Permission:</span>
                <span
                  className={
                    permissionState === "granted"
                      ? "text-sage"
                      : permissionState === "denied"
                      ? "text-rose-400"
                      : "text-champagne"
                  }
                >
                  {permissionState.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-charcoal-300 rounded border border-charcoal-border">
                <span className="text-ivory-muted">Speech Recognition:</span>
                <span className={isSupported ? "text-sage" : "text-rose-400"}>
                  {isSupported ? "AVAILABLE" : "UNSUPPORTED"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-ivory-muted leading-relaxed pt-1">
              Gemini API keys are read strictly from backend environment variables and are never surfaced in client bundles. If no key is set on the server, requests safely fallback to deterministic mock answers with an explanatory notice.
            </p>
          </div>
        </div>

        {/* Right Column: Live Conversation Transcript */}
        <div className="lg:col-span-7">
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg flex flex-col h-[580px]">
            {/* Transcript Header */}
            <div className="p-4 border-b border-charcoal-border flex items-center justify-between bg-charcoal-300/40">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-champagne" />
                <h3 className="text-xs uppercase font-mono tracking-wider text-ivory font-semibold">
                  Live Spoken Dialog Stream
                </h3>
              </div>
              <span className="text-[11px] font-mono text-ivory-muted">
                {transcripts.filter((t) => t.role !== "system").length} Spoken Turns
              </span>
            </div>

            {/* Transcript Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {transcripts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-charcoal-300 border border-charcoal-border flex items-center justify-center text-champagne">
                    <Mic className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-ivory font-serif">
                    Conversational Engine Ready
                  </h4>
                  <p className="text-xs text-ivory-muted max-w-sm leading-relaxed">
                    Click &ldquo;Start Session&rdquo; and speak naturally. Your speech is captured by the browser Web Speech API, forwarded to the FastAPI backend, and processed by Gemini.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left text-xs font-mono max-w-md w-full pt-1">
                    <div className="p-2.5 bg-charcoal-300 rounded border border-charcoal-border text-ivory-muted">
                      &bull; &ldquo;Hello, who are you?&rdquo;
                    </div>
                    <div className="p-2.5 bg-charcoal-300 rounded border border-charcoal-border text-ivory-muted">
                      &bull; &ldquo;What are your pricing plans?&rdquo;
                    </div>
                    <div className="p-2.5 bg-charcoal-300 rounded border border-charcoal-border text-ivory-muted">
                      &bull; &ldquo;Can you explain Voxora&apos;s capabilities?&rdquo;
                    </div>
                    <div className="p-2.5 bg-charcoal-300 rounded border border-charcoal-border text-ivory-muted">
                      &bull; &ldquo;How do you handle call escalations?&rdquo;
                    </div>
                  </div>
                </div>
              ) : (
                transcripts.map((turn) => {
                  if (turn.role === "system") {
                    return (
                      <div
                        key={turn.id}
                        className="flex items-center justify-center my-3"
                      >
                        <div className="px-3 py-1 rounded bg-charcoal-300 border border-charcoal-border text-[11px] font-mono text-ivory-muted flex items-center space-x-1.5">
                          <Info className="w-3 h-3 text-champagne" />
                          <span>{turn.text}</span>
                          <span className="text-[10px] text-ivory-muted/60 pl-1">{turn.timestamp}</span>
                        </div>
                      </div>
                    );
                  }

                  const isUser = turn.role === "user";

                  return (
                    <div
                      key={turn.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 px-1">
                        {isUser ? (
                          <>
                            <span className="text-[10px] font-mono text-ivory-muted">{turn.timestamp}</span>
                            <span className="text-[11px] font-mono uppercase text-champagne font-medium">User</span>
                            <User className="w-3 h-3 text-champagne" />
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-sage" />
                            <span className="text-[11px] font-mono uppercase text-sage font-medium">Voxora Agent</span>
                            {turn.source === "gemini" ? (
                              <span className="text-[10px] font-mono text-champagne bg-champagne-subtle px-1.5 py-0.2 rounded border border-champagne/30">
                                {turn.modelName || "Gemini 2.5 Flash"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-ivory-muted bg-charcoal-300 px-1.5 py-0.2 rounded border border-charcoal-border">
                                {turn.topic || "Demo Fallback"}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-ivory-muted">{turn.timestamp}</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-3 text-xs leading-relaxed ${
                          isUser
                            ? "bg-charcoal-300 text-ivory border border-champagne/30"
                            : turn.source === "gemini"
                            ? "bg-charcoal-100 text-ivory border border-sage/40 font-sans shadow-sm"
                            : "bg-charcoal-100 text-ivory-light border border-charcoal-border font-sans"
                        }`}
                      >
                        {turn.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Transcript Footer */}
            <div className="p-3 border-t border-charcoal-border bg-charcoal-300/40 flex items-center justify-between text-[11px] font-mono text-ivory-muted">
              <span>Status: {sessionState.toUpperCase()}</span>
              <span>
                Engine: {backendStatus.online ? `${backendStatus.model} (Server)` : "Offline (Local Demo)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
