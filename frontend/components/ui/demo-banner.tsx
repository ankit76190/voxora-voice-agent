import React from "react";
import { Info } from "lucide-react";

interface DemoBannerProps {
  message?: string;
  className?: string;
}

export function DemoBanner({
  message = "SIMULATED DEMO ENVIRONMENT — All metrics, call history records, and contacts shown are mock data for interface testing. No actual telephony or voice networks are connected in Phase 2.",
  className = "",
}: DemoBannerProps) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded border border-champagne/25 bg-champagne-subtle text-ivory text-xs font-mono ${className}`}
      role="status"
      aria-label="Demo notice"
    >
      <Info className="w-4 h-4 text-champagne shrink-0" />
      <span className="leading-relaxed text-ivory-dark">{message}</span>
    </div>
  );
}

