import React from "react";
import { PhoneCall, ShieldCheck, Terminal } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-charcoal-border bg-charcoal-300/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded border border-champagne/40 bg-charcoal flex items-center justify-center">
            <span className="font-serif font-bold text-champagne text-base">V</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-wide text-ivory text-base">VOXORA</span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded border border-champagne/30 text-champagne bg-champagne-subtle">
                Phase 1 Foundation
              </span>
            </div>
            <p className="text-xs text-ivory-muted">Enterprise Voice AI Platform</p>
          </div>
        </div>

        <nav className="flex items-center space-x-6 text-sm text-ivory-muted">
          <span className="text-ivory font-medium border-b border-champagne pb-0.5">Overview</span>
          <span className="hover:text-ivory transition-colors cursor-not-allowed opacity-60">Agents (Phase 2)</span>
          <span className="hover:text-ivory transition-colors cursor-not-allowed opacity-60">Call Logs (Phase 2)</span>
          <span className="hover:text-ivory transition-colors cursor-not-allowed opacity-60">Telephony (Phase 3)</span>
        </nav>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-sage bg-sage-subtle border border-sage/30 px-2.5 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-sage inline-block animate-pulse"></span>
            <span>System Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}

