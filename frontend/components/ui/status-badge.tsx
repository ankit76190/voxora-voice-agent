import React from "react";
import { CallStatus } from "@/types";

interface StatusBadgeProps {
  status: CallStatus | "Active" | "Prospect" | "Inactive" | "CONNECTED" | "NOT CONNECTED" | "Positive" | "Neutral" | "Needs Review";
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  let badgeClasses = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border ";

  switch (status) {
    case "COMPLETED":
    case "Active":
    case "Positive":
      badgeClasses += "bg-sage/10 text-sage border-sage/30";
      break;

    case "IN_PROGRESS":
      badgeClasses += "bg-champagne/10 text-champagne border-champagne/40 animate-pulse";
      break;

    case "FAILED":
    case "Needs Review":
      badgeClasses += "bg-rose-950/40 text-rose-300 border-rose-900/60";
      break;

    case "BUSY":
    case "NO_ANSWER":
    case "Inactive":
      badgeClasses += "bg-charcoal-300 text-ivory-muted border-charcoal-border";
      break;

    case "Prospect":
    case "Neutral":
      badgeClasses += "bg-champagne/10 text-champagne border-champagne/30";
      break;

    case "CONNECTED":
      badgeClasses += "bg-sage/10 text-sage border-sage/40";
      break;

    case "NOT CONNECTED":
      badgeClasses += "bg-charcoal-300 text-ivory-muted/70 border-charcoal-border";
      break;

    default:
      badgeClasses += "bg-charcoal-300 text-ivory-muted border-charcoal-border";
  }

  const formatText = (text: string) => text.replace(/_/g, " ");

  return (
    <span className={`${badgeClasses} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {formatText(status)}
    </span>
  );
}

