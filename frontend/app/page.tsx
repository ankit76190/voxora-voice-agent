"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { DEMO_CALLS, DEMO_ANALYTICS_TIMELINE } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import {
  PhoneCall,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Bot,
  Calendar,
  ExternalLink,
  Mic,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<"today" | "week" | "month">("today");

  // Filtered/scaled demo figures based on selected date range
  const metrics = {
    today: {
      totalCalls: "142",
      answered: "128 (90.1%)",
      avgDuration: "3m 42s",
      completionRate: "94.4%",
      multiplier: 1,
    },
    week: {
      totalCalls: "894",
      answered: "812 (90.8%)",
      avgDuration: "3m 38s",
      completionRate: "95.1%",
      multiplier: 6,
    },
    month: {
      totalCalls: "3,820",
      answered: "3,476 (91.0%)",
      avgDuration: "3m 35s",
      completionRate: "95.8%",
      multiplier: 25,
    },
  }[dateRange];

  // Adjust chart data based on date range
  const chartData = DEMO_ANALYTICS_TIMELINE.map((item) => ({
    ...item,
    calls: Math.round(item.calls * (dateRange === "today" ? 1 : dateRange === "week" ? 2.4 : 5.8)),
    completed: Math.round(item.completed * (dateRange === "today" ? 1 : dateRange === "week" ? 2.4 : 5.8)),
  }));

  const recentCalls = DEMO_CALLS.slice(0, 5);

  return (
    <AppShell title="Operations Dashboard">
      {/* Demo Warning Banner */}
      <DemoBanner message="MOCK OPERATIONS ENVIRONMENT — Displayed KPI metrics and call streams are simulated demonstration data for Phase 2." />

      {/* Overview Heading & Interactive Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-charcoal-border pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ivory">
            Voice Activity Overview
          </h2>
          <p className="text-sm text-ivory-muted mt-0.5">
            Real-time telemetry and call dispatch queue monitoring.
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-1 bg-charcoal-200 border border-charcoal-border p-1 rounded-md self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-champagne ml-2 mr-1" />
          <button
            onClick={() => setDateRange("today")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              dateRange === "today"
                ? "bg-charcoal-300 text-champagne border border-champagne/30"
                : "text-ivory-muted hover:text-ivory"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateRange("week")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              dateRange === "week"
                ? "bg-charcoal-300 text-champagne border border-champagne/30"
                : "text-ivory-muted hover:text-ivory"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setDateRange("month")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              dateRange === "month"
                ? "bg-charcoal-300 text-champagne border border-champagne/30"
                : "text-ivory-muted hover:text-ivory"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-ivory-muted font-mono">
              Total Calls
            </span>
            <PhoneCall className="w-4 h-4 text-champagne" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">{metrics.totalCalls}</div>
          <p className="text-xs text-ivory-muted mt-1 font-mono">Simulated inbound & outbound</p>
        </div>

        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-ivory-muted font-mono">
              Answered Calls
            </span>
            <CheckCircle2 className="w-4 h-4 text-sage" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">{metrics.answered}</div>
          <p className="text-xs text-ivory-muted mt-1 font-mono">Connected conversation rate</p>
        </div>

        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-ivory-muted font-mono">
              Avg. Duration
            </span>
            <Clock className="w-4 h-4 text-ivory-muted" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">{metrics.avgDuration}</div>
          <p className="text-xs text-ivory-muted mt-1 font-mono">Voice engagement benchmark</p>
        </div>

        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider text-ivory-muted font-mono">
              Completion Rate
            </span>
            <TrendingUp className="w-4 h-4 text-champagne" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">{metrics.completionRate}</div>
          <p className="text-xs text-ivory-muted mt-1 font-mono">Goal fulfilled without drop</p>
        </div>
      </div>

      {/* Main Charts & Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Activity Chart */}
        <div className="lg:col-span-2 bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ivory tracking-wide uppercase font-mono">
                Call Volume & Success Telemetry
              </h3>
              <p className="text-xs text-ivory-muted">Demo distribution over timeline</p>
            </div>
            <span className="text-[11px] font-mono text-champagne border border-champagne/30 bg-champagne-subtle px-2 py-0.5 rounded">
              Recharts Visualizer
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C7A66A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C7A66A" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="compGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DDE4D8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#DDE4D8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2A2E28" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" stroke="#B8B2A5" fontSize={11} tickLine={false} />
                <YAxis stroke="#B8B2A5" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1D201C",
                    borderColor: "#2A2E28",
                    color: "#F4F0E7",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  itemStyle={{ color: "#F4F0E7" }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="Total Calls"
                  stroke="#C7A66A"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#callGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#DDE4D8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#compGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links & Platform Staging */}
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-ivory tracking-wide uppercase font-mono border-b border-charcoal-border pb-3">
              Operator Quick Links
            </h3>
            <div className="space-y-3 mt-4">
              <Link
                href="/voice"
                className="flex items-start justify-between p-3 rounded bg-charcoal-300 border border-champagne/40 hover:border-champagne transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Mic className="w-5 h-5 text-champagne" />
                  <div>
                    <div className="text-xs font-semibold text-ivory group-hover:text-champagne transition-colors flex items-center space-x-1.5">
                      <span>Voice Playground</span>
                      <span className="text-[9px] font-mono uppercase bg-champagne text-charcoal px-1.5 py-0.2 rounded font-bold">New</span>
                    </div>
                    <div className="text-[11px] text-ivory-muted">
                      Test live browser microphone speech & synthesis
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-champagne group-hover:translate-x-0.5 transition-transform" />
              </Link>

              <Link
                href="/agent"
                className="flex items-start justify-between p-3 rounded bg-charcoal-300 border border-charcoal-border hover:border-champagne/40 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Bot className="w-5 h-5 text-champagne" />
                  <div>
                    <div className="text-xs font-medium text-ivory group-hover:text-champagne transition-colors">
                      Configure AI Agent
                    </div>
                    <div className="text-[11px] text-ivory-muted">
                      Set instructions, persona, and voice model
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ivory-muted group-hover:text-champagne transition-colors" />
              </Link>

              <Link
                href="/calls"
                className="flex items-start justify-between p-3 rounded bg-charcoal-300 border border-charcoal-border hover:border-champagne/40 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <PhoneCall className="w-5 h-5 text-sage" />
                  <div>
                    <div className="text-xs font-medium text-ivory group-hover:text-sage transition-colors">
                      Review Call History
                    </div>
                    <div className="text-[11px] text-ivory-muted">
                      Inspect transcripts, sentiment, and outcomes
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ivory-muted group-hover:text-sage transition-colors" />
              </Link>

              <Link
                href="/contacts"
                className="flex items-start justify-between p-3 rounded bg-charcoal-300 border border-charcoal-border hover:border-champagne/40 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <ExternalLink className="w-5 h-5 text-ivory-muted" />
                  <div>
                    <div className="text-xs font-medium text-ivory group-hover:text-ivory transition-colors">
                      Manage Contact Directory
                    </div>
                    <div className="text-[11px] text-ivory-muted">
                      Add, search, and verify outbound targets
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ivory-muted transition-colors" />
              </Link>
            </div>
          </div>

          <div className="p-3 bg-charcoal-100 rounded border border-charcoal-border text-[11px] text-ivory-muted font-mono">
            Status: Phase 2 UI Active &bull; No active telecom trunk
          </div>
        </div>
      </div>

      {/* Recent Calls Table */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ivory tracking-wide uppercase font-mono">
              Recent Call Activity (Demo Stream)
            </h3>
            <p className="text-xs text-ivory-muted">Latest calls logged across all channels</p>
          </div>
          <Link
            href="/calls"
            className="text-xs text-champagne hover:underline flex items-center space-x-1"
          >
            <span>View All Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-charcoal-border text-ivory-muted font-mono uppercase text-[11px]">
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-border font-sans">
              {recentCalls.map((call) => (
                <tr key={call.id} className="hover:bg-charcoal-300/60 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-medium text-ivory">{call.contactName}</div>
                    <div className="text-[11px] font-mono text-ivory-muted">{call.phoneNumber}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-[11px] text-ivory-dark bg-charcoal-300 px-2 py-0.5 rounded border border-charcoal-border">
                      {call.direction}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={call.status} />
                  </td>
                  <td className="py-3 px-3 font-mono text-ivory-muted">
                    {formatDuration(call.durationSeconds)}
                  </td>
                  <td className="py-3 px-3 text-ivory">{call.outcome}</td>
                  <td className="py-3 px-3 text-right font-mono text-ivory-muted">
                    {call.timestamp.split(" ")[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
