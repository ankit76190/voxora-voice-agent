"use client";

import React from "react";
import { VoiceSessionState } from "@/types";

interface WaveformProps {
  state: VoiceSessionState;
  className?: string;
}

export function Waveform({ state, className = "" }: WaveformProps) {
  // 16 bars for subtle enterprise visualization
  const barCount = 16;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const isProcessing = state === "processing";
  const isActive = isListening || isSpeaking || isProcessing;

  const getBarColor = () => {
    if (isSpeaking) return "bg-sage";
    if (isListening) return "bg-champagne";
    if (isProcessing) return "bg-champagne-light";
    return "bg-charcoal-border";
  };

  const getStateLabel = () => {
    switch (state) {
      case "requesting_permission":
        return "Requesting Microphone Authorization...";
      case "listening":
        return "Listening — Speak clearly into your microphone";
      case "processing":
        return "Processing Turn — Evaluating speech input";
      case "speaking":
        return "Speaking — Demo voice response active";
      case "stopped":
        return "Session Ended — Microphone released";
      case "error":
        return "Session Interrupted";
      default:
        return "Standby — Press Start Session to begin";
    }
  };

  return (
    <div
      className={`bg-charcoal-300 border border-charcoal-border rounded-lg p-5 flex flex-col items-center justify-center space-y-3 ${className}`}
      aria-live="polite"
    >
      {/* Waveform Bar Container */}
      <div
        className="flex items-center justify-center space-x-1.5 h-14 w-full px-4 overflow-hidden"
        aria-hidden="true"
      >
        {bars.map((bar) => {
          // Calculate varied base heights for realistic sound wave appearance
          const centerDist = Math.abs(bar - barCount / 2) / (barCount / 2);
          const baseHeight = Math.max(12, Math.round(48 * (1 - centerDist * 0.6)));

          return (
            <div
              key={bar}
              className={`w-1.5 rounded-full transition-all duration-150 ${getBarColor()}`}
              style={{
                height: isActive ? `${baseHeight}px` : "8px",
                opacity: isActive ? 0.9 : 0.3,
                animation:
                  isActive && !window?.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? `wavePulse ${0.8 + (bar % 4) * 0.2}s ease-in-out infinite alternate`
                    : "none",
                animationDelay: `${(bar % 5) * 0.12}s`,
              }}
            />
          );
        })}
      </div>

      {/* State Badge & Spoken Subtitle */}
      <div className="flex items-center space-x-2 text-xs font-mono">
        <span
          className={`w-2 h-2 rounded-full ${
            isListening
              ? "bg-champagne animate-ping"
              : isSpeaking
              ? "bg-sage animate-pulse"
              : isProcessing
              ? "bg-champagne animate-pulse"
              : state === "error"
              ? "bg-rose-400"
              : "bg-ivory-muted/40"
          }`}
        />
        <span
          className={`${
            isListening
              ? "text-champagne font-medium"
              : isSpeaking
              ? "text-sage font-medium"
              : isProcessing
              ? "text-champagne-light"
              : state === "error"
              ? "text-rose-300"
              : "text-ivory-muted"
          }`}
        >
          {getStateLabel()}
        </span>
      </div>

      {/* Style tag for CSS keyframe animation */}
      <style jsx>{`
        @keyframes wavePulse {
          0% {
            transform: scaleY(0.3);
          }
          100% {
            transform: scaleY(1.15);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .w-1\.5 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

