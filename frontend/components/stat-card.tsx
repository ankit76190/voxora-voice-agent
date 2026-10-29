import React from "react";

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  tag?: string;
}

export function StatCard({ label, value, subtitle, tag }: StatCardProps) {
  return (
    <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 flex flex-col justify-between hover:border-champagne/40 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-ivory-muted font-mono">{label}</span>
        {tag && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-charcoal-border text-ivory-muted bg-charcoal-300">
            {tag}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-tight text-ivory mb-1 font-serif">{value}</div>
        <p className="text-xs text-ivory-muted">{subtitle}</p>
      </div>
    </div>
  );
}

