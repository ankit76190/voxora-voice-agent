"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  PhoneCall,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  X,
  ShieldCheck,
  Mic,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Voice Playground", href: "/voice", icon: Mic },
  { name: "AI Agent", href: "/agent", icon: Bot },
  { name: "Call History", href: "/calls", icon: PhoneCall },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-charcoal-200 border-r border-charcoal-border flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand & Top */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-charcoal-border">
            <Link
              href="/"
              onClick={handleLinkClick}
              className="flex items-center space-x-3 focus:outline-none focus:ring-1 focus:ring-champagne rounded"
            >
              <div className="w-8 h-8 rounded border border-champagne/40 bg-charcoal flex items-center justify-center">
                <span className="font-serif font-bold text-champagne text-base">V</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold tracking-wider text-ivory text-sm">VOXORA</span>
                <span className="text-[10px] text-ivory-muted tracking-tight">Voice Operations</span>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-ivory-muted hover:text-ivory rounded focus:outline-none focus:ring-1 focus:ring-champagne"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "bg-charcoal-300 text-ivory border border-champagne/30"
                      : "text-ivory-muted hover:text-ivory hover:bg-charcoal-100"
                    }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${isActive ? "text-champagne" : "text-ivory-muted"
                        }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / System Status Card */}
        <div className="p-4 border-t border-charcoal-border">
          <div className="bg-charcoal-300 border border-charcoal-border rounded-md p-3 space-y-2">
            <div className="flex items-center space-x-2 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-sage" />
              <span className="font-mono text-sage text-[11px]">Phase 3 Voice Prototype</span>
            </div>
            <p className="text-[11px] text-ivory-muted leading-tight">
              Local Web Speech API active. Real-time Gemini Live WebSocket bridge staged for Phase 4.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

