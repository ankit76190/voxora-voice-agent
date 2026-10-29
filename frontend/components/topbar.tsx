"use client";

import React from "react";
import { Menu, Activity } from "lucide-react";

interface TopbarProps {
  title?: string;
  onOpenSidebar: () => void;
}

export function Topbar({ title, onOpenSidebar }: TopbarProps) {
  return (
    <header className="h-16 border-b border-charcoal-border bg-charcoal-200/70 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-ivory-muted hover:text-ivory rounded border border-charcoal-border hover:bg-charcoal-300 focus:outline-none focus:ring-1 focus:ring-champagne"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && (
          <h1 className="text-base sm:text-lg font-serif font-semibold text-ivory tracking-tight">
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Environment Status Badge */}
        <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono border border-champagne/30 bg-champagne-subtle text-champagne">
          <Activity className="w-3.5 h-3.5" />
          <span>Demo Data Mode</span>
        </div>

        {/* User Identity / Console status */}
        <div className="flex items-center space-x-2 pl-2 border-l border-charcoal-border">
          <div className="w-7 h-7 rounded-full bg-charcoal-300 border border-charcoal-border flex items-center justify-center text-xs font-serif text-champagne">
            OP
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-medium text-ivory leading-tight">Lead Operator</span>
            <span className="text-[10px] text-ivory-muted font-mono leading-tight">Admin Console</span>
          </div>
        </div>
      </div>
    </header>
  );
}

