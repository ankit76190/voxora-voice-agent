"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import {
  AnalyticsOverview,
  TrendDataPoint,
  OutcomeItem,
} from "@/types";
import {
  fetchAnalyticsOverview,
  fetchAnalyticsTrends,
  fetchAnalyticsOutcomes,
  downloadAnalyticsCsv,
} from "@/lib/conversation-api";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  PieChart as PieIcon,
  HelpCircle,
  TrendingUp,
  Inbox,
  FileSpreadsheet,
  X,
  Info,
} from "lucide-react";

type PresetKey = "7d" | "30d" | "90d" | "all";

export default function AnalyticsPage() {
  const [activePreset, setActivePreset] = useState<PresetKey>("7d");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analytics data state
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [outcomes, setOutcomes] = useState<OutcomeItem[]>([]);

  // Notifications
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Compute date strings from preset
  const getDateRange = useCallback((): {
    startDate?: string;
    endDate?: string;
  } => {
    if (activePreset === "all") return {};

    const now = new Date();
    const endStr = now.toISOString().split("T")[0];
    const days = activePreset === "7d" ? 7 : activePreset === "30d" ? 30 : 90;
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split("T")[0];

    return { startDate: startStr, endDate: endStr };
  }, [activePreset]);

  // Load analytics from backend API
  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { startDate, endDate } = getDateRange();

    try {
      const [overviewData, trendsData, outcomesData] = await Promise.all([
        fetchAnalyticsOverview({ startDate, endDate }),
        fetchAnalyticsTrends({ startDate, endDate }),
        fetchAnalyticsOutcomes({ startDate, endDate }),
      ]);

      if (!overviewData && !trendsData && !outcomesData) {
        setError(
          "Unable to load analytics from backend server. Please verify the API is running."
        );
      } else {
        setOverview(
          overviewData || {
            total_sessions: 0,
            completed_sessions: 0,
            failed_sessions: 0,
            incomplete_sessions: 0,
            completion_rate: 0,
            average_duration_seconds: 0,
          }
        );
        setTrends(trendsData?.trends || []);
        setOutcomes(outcomesData?.outcomes || []);
      }
    } catch (err: unknown) {
      setError(`Error fetching telemetry: ${String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Handle CSV Export
  const handleExportCsv = async () => {
    setIsExporting(true);
    const { startDate, endDate } = getDateRange();
    try {
      const result = await downloadAnalyticsCsv({ startDate, endDate });
      if (result.success) {
        showNotification(
          "success",
          `Export complete: Downloaded ${result.filename || "session records"}.`
        );
      } else {
        showNotification(
          "error",
          `Export failed: ${result.error || "Unable to generate file."}`
        );
      }
    } catch (err: unknown) {
      showNotification("error", `Export error: ${String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Format seconds into "Xm Ys" or "Xs"
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Outcome color mapping
  const getOutcomeColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "#DDE4D8"; // Muted sage
      case "FAILED":
        return "#BE123C"; // Crimson rose
      case "IN_PROGRESS":
        return "#C7A66A"; // Champagne gold
      case "BUSY":
        return "#70756B"; // Deep muted slate
      case "NO_ANSWER":
      default:
        return "#474D44"; // Charcoal dark accent
    }
  };

  const totalSessions = overview?.total_sessions || 0;

  return (
    <AppShell title="Session Analytics & Intelligence">
      {/* Scope Disclaimer Banner */}
      <DemoBanner message="PHASE 7: SESSION ANALYTICS & REPORTS — Calculated strictly from persisted browser voice session records. No fabricated data. PSTN telephony metrics remain decoupled." />

      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-charcoal-border pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ivory">
            Voice Intelligence & Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-ivory-muted mt-1">
            Statistical breakdown of speech duration, resolution rates, and operational session trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Preset Buttons */}
          <div className="flex items-center bg-charcoal-200 border border-charcoal-border p-1 rounded-md text-xs font-mono">
            <button
              onClick={() => setActivePreset("7d")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activePreset === "7d"
                  ? "bg-charcoal-300 text-champagne border border-champagne/30"
                  : "text-ivory-muted hover:text-ivory"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setActivePreset("30d")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activePreset === "30d"
                  ? "bg-charcoal-300 text-champagne border border-champagne/30"
                  : "text-ivory-muted hover:text-ivory"
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setActivePreset("90d")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activePreset === "90d"
                  ? "bg-charcoal-300 text-champagne border border-champagne/30"
                  : "text-ivory-muted hover:text-ivory"
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setActivePreset("all")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activePreset === "all"
                  ? "bg-charcoal-300 text-champagne border border-champagne/30"
                  : "text-ivory-muted hover:text-ivory"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => loadAnalytics()}
            disabled={isLoading}
            className="p-2 rounded bg-charcoal-200 border border-charcoal-border text-ivory-muted hover:text-ivory hover:border-champagne/40 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>

          {/* CSV Export Action */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
            className="px-3.5 py-1.5 rounded text-xs font-mono uppercase font-semibold bg-champagne text-charcoal hover:bg-champagne-light disabled:opacity-50 transition-colors flex items-center space-x-1.5"
            title="Download CSV session records"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg text-xs font-medium border animate-fadeIn ${
            notification.type === "success"
              ? "bg-sage/10 border-sage/40 text-sage"
              : notification.type === "error"
              ? "bg-rose-950/40 border-rose-900/60 text-rose-300"
              : "bg-charcoal-200 border-charcoal-border text-ivory"
          }`}
          role="alert"
        >
          <div className="flex items-center space-x-2.5">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Info className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadAnalytics()}
            className="underline hover:text-white font-mono uppercase text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sessions */}
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-ivory-muted">
            <span>Total Sessions</span>
            <Activity className="w-3.5 h-3.5 text-champagne" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">
            {isLoading ? "..." : overview?.total_sessions ?? 0}
          </div>
          <p className="text-[11px] text-ivory-muted font-mono">
            Saved browser voice sessions
          </p>
        </div>

        {/* Completed Sessions */}
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-ivory-muted">
            <span>Completed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sage" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory flex items-baseline gap-2">
            <span>{isLoading ? "..." : overview?.completed_sessions ?? 0}</span>
            {overview && overview.total_sessions > 0 && (
              <span className="text-xs font-mono text-sage font-normal">
                ({overview.completion_rate}%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-sage font-mono">
            Finished normally
          </p>
        </div>

        {/* Average Duration */}
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-ivory-muted">
            <span>Avg Completed Duration</span>
            <Clock className="w-3.5 h-3.5 text-champagne" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">
            {isLoading
              ? "..."
              : formatDuration(overview?.average_duration_seconds || 0)}
          </div>
          <p className="text-[11px] text-ivory-muted font-mono">
            {overview?.average_duration_seconds
              ? `${overview.average_duration_seconds}s per finished turn`
              : "No completed duration data"}
          </p>
        </div>

        {/* Failed Sessions */}
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-ivory-muted">
            <span>Failed / Error</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">
            {isLoading ? "..." : overview?.failed_sessions ?? 0}
          </div>
          <p className="text-[11px] text-rose-300 font-mono">
            Engine or network aborts
          </p>
        </div>

        {/* Incomplete / In-Progress */}
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-ivory-muted">
            <span>Incomplete / Dropped</span>
            <HelpCircle className="w-3.5 h-3.5 text-champagne/70" />
          </div>
          <div className="text-2xl font-serif font-semibold text-ivory">
            {isLoading ? "..." : overview?.incomplete_sessions ?? 0}
          </div>
          <p className="text-[11px] text-ivory-muted font-mono">
            Busy, active, or unfinished
          </p>
        </div>
      </div>

      {/* Main Charts & Visualizations */}
      {totalSessions === 0 && !isLoading ? (
        /* Empty State */
        <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-12 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-charcoal-300 border border-charcoal-border flex items-center justify-center text-ivory-muted">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-serif font-semibold text-ivory">
              No Voice Sessions in Selected Period
            </h3>
            <p className="text-xs text-ivory-muted leading-relaxed">
              No session records were logged for the selected time window. Conduct browser voice conversations in the Voice Playground to generate live telemetry.
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/voice"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-champagne text-charcoal hover:bg-champagne-light transition-colors"
            >
              <span>Open Voice Playground</span>
            </a>
          </div>
        </div>
      ) : (
        /* Populated Charts */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Daily Trends Chart */}
          <div className="lg:col-span-7 bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div>
                <h3 className="text-xs font-semibold text-ivory tracking-wide uppercase font-mono">
                  Daily Voice Session Volume
                </h3>
                <p className="text-xs text-ivory-muted">
                  Total vs Completed sessions across the active filter window
                </p>
              </div>
              <span className="text-[10px] font-mono text-champagne bg-champagne/10 px-2 py-0.5 rounded border border-champagne/30">
                Live DB Records
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#2A2E28"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#B8B2A5"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#B8B2A5"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1D201C",
                      borderColor: "#2A2E28",
                      color: "#F4F0E7",
                      fontSize: "12px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="total"
                    name="Total Sessions"
                    fill="#C7A66A"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed Normally"
                    fill="#DDE4D8"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="failed"
                    name="Failed / Errors"
                    fill="#BE123C"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outcome Distribution Donut */}
          <div className="lg:col-span-5 bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
                <div>
                  <h3 className="text-xs font-semibold text-ivory tracking-wide uppercase font-mono">
                    Outcome & Status Distribution
                  </h3>
                  <p className="text-xs text-ivory-muted">
                    Proportion of session resolution outcomes
                  </p>
                </div>
                <PieIcon className="w-4 h-4 text-champagne" />
              </div>

              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={outcomes}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {outcomes.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={getOutcomeColor(entry.status)}
                          stroke="#171916"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${val} sessions (${item.payload.percentage}%)`,
                        item.payload.label,
                      ]}
                      contentStyle={{
                        backgroundColor: "#1D201C",
                        borderColor: "#2A2E28",
                        color: "#F4F0E7",
                        fontSize: "12px",
                        fontFamily: "monospace",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Outcome Breakdown List */}
            <div className="space-y-2 pt-2 border-t border-charcoal-border">
              {outcomes.map((outcome) => (
                <div
                  key={outcome.status}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: getOutcomeColor(outcome.status),
                      }}
                    />
                    <span className="text-ivory-dark font-medium">
                      {outcome.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-ivory-muted text-[11px]">
                      {outcome.count} sessions
                    </span>
                    <span className="text-ivory font-medium">
                      {outcome.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSV Export & Audit Documentation Panel */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-ivory">
            <FileSpreadsheet className="w-4 h-4 text-champagne" />
            <h4 className="text-xs font-mono uppercase tracking-wider font-semibold">
              Data Quality & Audit Policy
            </h4>
          </div>
          <span className="text-[11px] font-mono text-ivory-muted">
            RFC 4180 Compliant Stream
          </span>
        </div>

        <p className="text-xs text-ivory-muted leading-relaxed">
          Voxora reports telemetry strictly from saved session events. Historical records can be exported at any time with exact date filtering. Audio transcripts are excluded from calculations to maintain strict enterprise caller privacy.
        </p>
      </div>
    </AppShell>
  );
}
