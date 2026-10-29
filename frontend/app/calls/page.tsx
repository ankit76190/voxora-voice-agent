"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import { StatusBadge } from "@/components/ui/status-badge";
import { DEMO_CALLS } from "@/lib/mock-data";
import {
  fetchCallList,
  fetchCallDetail,
  fetchTelephonyConfig,
  initiateTelephonyCall,
  terminateTelephonyCall,
} from "@/lib/conversation-api";
import {
  PersistedCallSession,
  CallStatus,
  TelephonyConfig,
  TelephonyCallResponse,
} from "@/types";
import { formatDuration } from "@/lib/utils";
import {
  Search,
  Filter,
  PhoneCall,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  RefreshCw,
  AlertCircle,
  Database,
  Layers,
  Sparkles,
  User,
  Bot,
  Phone,
  PhoneOff,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface DisplayCallRecord {
  id: string;
  contactName: string;
  phoneNumber: string;
  direction: "INBOUND" | "OUTBOUND" | "BROWSER";
  status: CallStatus;
  durationSeconds: number;
  timestamp: string;
  outcome: string;
  agentName: string;
  sentiment: string;
  summary: string;
  isPersisted: boolean;
  transcripts?: Array<{
    id: string;
    role: "user" | "agent" | "system";
    content: string;
    timestamp: string;
    sequence: number;
  }>;
}

export default function CallHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | "PERSISTED" | "DEMO">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Backend state
  const [persistedCalls, setPersistedCalls] = useState<PersistedCallSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Inspection modal state
  const [selectedCall, setSelectedCall] = useState<DisplayCallRecord | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Telephony Test Call State (Phase 9)
  const [isTestCallModalOpen, setIsTestCallModalOpen] = useState(false);
  const [telephonyConfig, setTelephonyConfig] = useState<TelephonyConfig | null>(null);
  const [testNumber, setTestNumber] = useState("+1 (555) 234-5678");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [activeTelephonyCall, setActiveTelephonyCall] = useState<TelephonyCallResponse | null>(null);
  const [telephonyElapsed, setTelephonyElapsed] = useState(0);
  const [telephonyError, setTelephonyError] = useState<string | null>(null);
  const [isTerminatingCall, setIsTerminatingCall] = useState(false);

  const handleOpenTestCallModal = async () => {
    setIsTestCallModalOpen(true);
    setTelephonyError(null);
    const cfg = await fetchTelephonyConfig();
    if (cfg) setTelephonyConfig(cfg);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTelephonyCall) {
      interval = setInterval(() => {
        setTelephonyElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setTelephonyElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTelephonyCall]);

  const handleInitiateTestCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testNumber.trim()) {
      setTelephonyError("Please enter a valid destination phone number.");
      return;
    }
    if (!consentConfirmed) {
      setTelephonyError("Recipient consent must be explicitly confirmed before initiating a call.");
      return;
    }
    if (!authorizationConfirmed) {
      setTelephonyError("Operator authorization must be explicitly confirmed.");
      return;
    }

    setTelephonyError(null);
    setIsInitiatingCall(true);

    const res = await initiateTelephonyCall({
      to_number: testNumber.trim(),
      consent_confirmed: true,
      authorization_confirmed: true,
      agent_name: "Voxora Concierge",
    });

    setIsInitiatingCall(false);

    if (res.success && res.data) {
      setActiveTelephonyCall(res.data);
      loadPersistedCalls();
    } else {
      setTelephonyError(res.error || "Failed to initiate call.");
    }
  };

  const handleTerminateTestCall = async () => {
    if (!activeTelephonyCall) return;
    setIsTerminatingCall(true);
    await terminateTelephonyCall(activeTelephonyCall.call_id);
    setIsTerminatingCall(false);
    setActiveTelephonyCall(null);
    loadPersistedCalls();
  };

  // Fetch calls from backend API
  const loadPersistedCalls = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const result = await fetchCallList({ page: 1, pageSize: 50 });
    if (result) {
      setPersistedCalls(result.items || []);
    } else {
      setLoadError("Could not connect to FastAPI storage. Displaying offline records.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPersistedCalls();
  }, [loadPersistedCalls]);

  // Transform persisted backend sessions into unified display format
  const formattedPersistedCalls: DisplayCallRecord[] = useMemo(() => {
    return persistedCalls.map((item) => ({
      id: item.id,
      contactName: item.contact_name || "Web Client",
      phoneNumber: item.phone_number || "Browser Audio",
      direction: item.direction,
      status: item.status,
      durationSeconds: item.duration_seconds,
      timestamp: item.started_at
        ? new Date(item.started_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Recent",
      outcome: item.status === "COMPLETED" ? "Session Completed" : item.status,
      agentName: item.agent_name || "Voxora Voice AI",
      sentiment: item.sentiment || "Neutral",
      summary: item.summary || "Spoken turn session recorded via Voxora Web Speech API.",
      isPersisted: true,
      transcripts: item.transcripts,
    }));
  }, [persistedCalls]);

  // Formatted demo benchmark calls
  const formattedDemoCalls: DisplayCallRecord[] = useMemo(() => {
    return DEMO_CALLS.map((item) => ({
      id: item.id,
      contactName: item.contactName,
      phoneNumber: item.phoneNumber,
      direction: item.direction,
      status: item.status,
      durationSeconds: item.durationSeconds,
      timestamp: item.timestamp,
      outcome: item.outcome,
      agentName: item.agentName,
      sentiment: item.sentiment,
      summary: item.summary,
      isPersisted: false,
    }));
  }, []);

  // Merge and filter
  const allCalls = useMemo(() => {
    let combined: DisplayCallRecord[] = [];
    if (sourceFilter === "PERSISTED") {
      combined = formattedPersistedCalls;
    } else if (sourceFilter === "DEMO") {
      combined = formattedDemoCalls;
    } else {
      combined = [...formattedPersistedCalls, ...formattedDemoCalls];
    }

    return combined.filter((call) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        call.contactName.toLowerCase().includes(q) ||
        call.phoneNumber.includes(q) ||
        call.summary.toLowerCase().includes(q) ||
        call.outcome.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || call.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [formattedPersistedCalls, formattedDemoCalls, sourceFilter, searchTerm, statusFilter]);

  // Pagination slice
  const totalPages = Math.ceil(allCalls.length / pageSize) || 1;
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allCalls.slice(start, start + pageSize);
  }, [allCalls, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sourceFilter]);

  // Load detailed call session with transcript
  const handleOpenDetail = async (call: DisplayCallRecord) => {
    setSelectedCall(call);
    if (call.isPersisted) {
      setIsDetailLoading(true);
      const detail = await fetchCallDetail(call.id);
      if (detail && detail.transcripts) {
        setSelectedCall((prev) =>
          prev ? { ...prev, transcripts: detail.transcripts } : null
        );
      }
      setIsDetailLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setDateFilter("ALL");
    setSourceFilter("ALL");
    setCurrentPage(1);
  };

  return (
    <AppShell title="Call History & Transcripts">
      <DemoBanner message="CALL MANAGEMENT & CONVERSATION ARCHIVE — Real sessions recorded in the Voice Playground are saved to SQLite/PostgreSQL with speaker transcripts and durations. Synthetic benchmark calls are clearly badged." />

      {/* Header and Controls Card */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-serif font-semibold text-ivory">
                Session Telemetry Registry
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-sage/40 bg-sage-subtle text-sage">
                {formattedPersistedCalls.length} Persisted in DB
              </span>
            </div>
            <p className="text-xs text-ivory-muted mt-0.5">
              Review completed voice dialogs, inspection transcripts, and session durations.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleOpenTestCallModal}
              className="px-3.5 py-1.5 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-champagne text-charcoal hover:bg-champagne-light flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Open Telephony Dispatch Console"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Initiate Test Call</span>
            </button>

            <button
              type="button"
              onClick={loadPersistedCalls}
              disabled={isLoading}
              className="px-3 py-1.5 rounded text-xs font-mono text-champagne border border-champagne/30 bg-champagne-subtle hover:bg-champagne/20 flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              aria-label="Refresh call records from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-ivory-muted absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search contact, phone, summary, or outcome..."
              className="w-full pl-9 pr-8 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-ivory-muted hover:text-ivory"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="FAILED">Failed</option>
              <option value="BUSY">Line Busy</option>
              <option value="NO_ANSWER">No Answer</option>
            </select>
          </div>

          {/* Record Source Filter */}
          <div className="sm:col-span-4">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "ALL" | "PERSISTED" | "DEMO")}
              className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory focus:outline-none focus:border-champagne transition-colors"
            >
              <option value="ALL">All Sources (Persisted & Demo)</option>
              <option value="PERSISTED">Persisted Sessions (Database)</option>
              <option value="DEMO">Synthetic Benchmarks (Demo)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backend Connection Warning Notice if Offline */}
      {loadError && (
        <div
          className="flex items-center space-x-2.5 p-3 rounded bg-champagne-subtle border border-champagne/30 text-champagne text-xs font-mono"
          role="status"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Main Table or States */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg overflow-hidden">
        {isLoading && allCalls.length === 0 ? (
          /* Loading State */
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-champagne animate-spin mx-auto" />
            <p className="text-xs font-mono text-ivory-muted">Querying Voxora call persistence engine...</p>
          </div>
        ) : paginatedCalls.length > 0 ? (
          /* Populated Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-charcoal-border bg-charcoal-300/40 text-ivory-muted font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">Contact & Record ID</th>
                  <th className="py-3 px-4">Origin / Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-border">
                {paginatedCalls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => handleOpenDetail(call)}
                    className="hover:bg-charcoal-300/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-ivory">{call.contactName}</div>
                      <div className="text-[10px] font-mono text-ivory-muted truncate max-w-[140px]">
                        {call.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {call.isPersisted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-sage/40 bg-sage-subtle text-sage text-[10px]">
                          <Database className="w-3 h-3" />
                          <span>Persisted (DB)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-charcoal-border bg-charcoal-300 text-ivory-muted text-[10px]">
                          <Layers className="w-3 h-3" />
                          <span>Synthetic</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-ivory-muted">
                      {formatDuration(call.durationSeconds)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-ivory-muted text-[11px]">
                      {call.timestamp}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-ivory font-medium">{call.outcome}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(call);
                        }}
                        className="text-xs text-champagne hover:underline inline-flex items-center gap-1 font-mono"
                      >
                        <span>Transcript</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-charcoal-300 border border-charcoal-border flex items-center justify-center text-ivory-muted">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-ivory">No matching call records found</h3>
            <p className="text-xs text-ivory-muted max-w-sm mx-auto">
              Your filter criteria &ldquo;{searchTerm || statusFilter}&rdquo; matched 0 call sessions.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-3 py-1.5 rounded text-xs font-mono text-champagne border border-champagne/30 bg-champagne-subtle hover:bg-champagne/20 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Pagination Footer */}
        {allCalls.length > 0 && (
          <div className="p-3.5 border-t border-charcoal-border bg-charcoal-300/40 flex items-center justify-between text-xs font-mono text-ivory-muted">
            <span>
              Showing {Math.min(allCalls.length, (currentPage - 1) * pageSize + 1)}–
              {Math.min(allCalls.length, currentPage * pageSize)} of {allCalls.length} records
            </span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-charcoal-border bg-charcoal-300 hover:text-ivory disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-ivory px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-charcoal-border bg-charcoal-300 hover:text-ivory disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Details & Full Transcript Drawer / Modal */}
      {selectedCall && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setSelectedCall(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-charcoal-200 border border-charcoal-border rounded-lg max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-charcoal-border flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase text-champagne">
                    Session Log &bull; {selectedCall.id.slice(0, 8)}...
                  </span>
                  {selectedCall.isPersisted ? (
                    <span className="text-[9px] font-mono uppercase bg-sage-subtle text-sage border border-sage/40 px-1.5 py-0.2 rounded">
                      Database Record
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono uppercase bg-charcoal-300 text-ivory-muted border border-charcoal-border px-1.5 py-0.2 rounded">
                      Demo Benchmark
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-serif font-semibold text-ivory mt-0.5">
                  {selectedCall.contactName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCall(null)}
                className="p-1 text-ivory-muted hover:text-ivory rounded"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Metadata Grid */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-b border-charcoal-border bg-charcoal-300/30 text-xs font-mono">
              <div className="bg-charcoal-300 p-2 rounded border border-charcoal-border">
                <span className="text-[10px] text-ivory-muted block uppercase">Duration</span>
                <span className="text-ivory font-medium mt-0.5 block">
                  {formatDuration(selectedCall.durationSeconds)}
                </span>
              </div>
              <div className="bg-charcoal-300 p-2 rounded border border-charcoal-border">
                <span className="text-[10px] text-ivory-muted block uppercase">Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedCall.status} />
                </div>
              </div>
              <div className="bg-charcoal-300 p-2 rounded border border-charcoal-border">
                <span className="text-[10px] text-ivory-muted block uppercase">Transport</span>
                <span className="text-ivory font-medium mt-0.5 block">{selectedCall.direction}</span>
              </div>
              <div className="bg-charcoal-300 p-2 rounded border border-charcoal-border">
                <span className="text-[10px] text-ivory-muted block uppercase">Sentiment</span>
                <span className="text-sage font-medium mt-0.5 block">{selectedCall.sentiment}</span>
              </div>
            </div>

            {/* Summary Block */}
            <div className="px-5 py-3 border-b border-charcoal-border bg-charcoal-300/20 text-xs">
              <span className="text-[10px] font-mono text-ivory-muted block uppercase mb-1">
                Conversational Turn Summary
              </span>
              <p className="text-ivory leading-relaxed font-sans">{selectedCall.summary}</p>
            </div>

            {/* Dialog Transcript Scroll Area */}
            <div className="p-5 flex-1 overflow-y-auto space-y-3.5">
              <span className="text-[10px] font-mono text-ivory-muted block uppercase mb-2">
                Spoken Dialog Transcript Turns
              </span>

              {isDetailLoading ? (
                <div className="p-8 text-center text-xs font-mono text-ivory-muted">
                  <RefreshCw className="w-4 h-4 text-champagne animate-spin mx-auto mb-2" />
                  <span>Loading full conversation turns...</span>
                </div>
              ) : selectedCall.transcripts && selectedCall.transcripts.length > 0 ? (
                selectedCall.transcripts.map((turn, i) => {
                  const isUser = turn.role === "user";
                  return (
                    <div
                      key={turn.id || i}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 px-1 text-[10px] font-mono">
                        {isUser ? (
                          <>
                            <span className="text-ivory-muted">{turn.timestamp}</span>
                            <span className="uppercase text-champagne">User</span>
                            <User className="w-3 h-3 text-champagne" />
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-sage" />
                            <span className="uppercase text-sage">Voxora Agent</span>
                            <span className="text-ivory-muted">{turn.timestamp}</span>
                          </>
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] rounded px-3.5 py-2 text-xs leading-relaxed ${
                          isUser
                            ? "bg-charcoal-300 text-ivory border border-champagne/30"
                            : "bg-charcoal-100 text-ivory-light border border-sage/30 font-sans"
                        }`}
                      >
                        {turn.content}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-ivory-muted font-mono bg-charcoal-300/30 rounded border border-charcoal-border">
                  No individual transcript turns attached to this record.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-charcoal-border bg-charcoal-300/40 flex items-center justify-between text-xs font-mono text-ivory-muted">
              <span>Agent: {selectedCall.agentName}</span>
              <button
                type="button"
                onClick={() => setSelectedCall(null)}
                className="px-4 py-1.5 rounded bg-charcoal-300 border border-charcoal-border hover:bg-charcoal-100 text-ivory"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Telephony Dispatcher & Test Call Modal (Phase 9) */}
      {isTestCallModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => {
            if (!activeTelephonyCall) setIsTestCallModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-charcoal-200 border border-charcoal-border rounded-lg max-w-lg w-full p-6 space-y-5 shadow-2xl text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-champagne" />
                  <h3 className="text-base font-serif font-semibold text-ivory">
                    Telephony Test Call Dispatcher
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  {telephonyConfig?.active_mode === "live" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-sage/20 text-sage border border-sage/40">
                      Live Carrier Mode ({telephonyConfig.provider})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-champagne/10 text-champagne border border-champagne/30">
                      Simulated Safe Mock Mode (Zero Fees)
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-ivory-muted">
                    Caller ID: {telephonyConfig?.caller_id || "+1 (555) ***-1234"}
                  </span>
                </div>
              </div>

              {!activeTelephonyCall && (
                <button
                  type="button"
                  onClick={() => setIsTestCallModalOpen(false)}
                  className="p-1 text-ivory-muted hover:text-ivory rounded"
                  aria-label="Close test call modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Error Banner */}
            {telephonyError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{telephonyError}</span>
              </div>
            )}

            {activeTelephonyCall ? (
              /* Active In-Call Monitor View */
              <div className="p-5 rounded-lg bg-charcoal-300/60 border border-champagne/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-champagne animate-pulse" />
                    <span className="text-xs font-mono uppercase text-champagne font-semibold tracking-wider">
                      Call In Progress
                    </span>
                  </div>
                  <span className="font-mono text-xs text-ivory bg-charcoal-200 px-2.5 py-1 rounded border border-charcoal-border">
                    {telephonyElapsed}s
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[11px] text-ivory-muted block">Destination</span>
                    <span className="font-mono text-ivory font-medium">
                      {activeTelephonyCall.to_number}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-ivory-muted block">Carrier Provider</span>
                    <span className="font-mono text-champagne uppercase text-[11px]">
                      {activeTelephonyCall.provider} ({activeTelephonyCall.is_mock ? "Mock Mode" : "PSTN"})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-ivory-muted block">Provider Transaction SID</span>
                    <span className="font-mono text-[11px] text-ivory-muted truncate block">
                      {activeTelephonyCall.provider_call_id}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-charcoal-border flex items-center justify-between">
                  <p className="text-[11px] text-ivory-muted">
                    Session audio bridging active. Click below to hang up.
                  </p>
                  <button
                    type="button"
                    onClick={handleTerminateTestCall}
                    disabled={isTerminatingCall}
                    className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-rose-900 text-rose-100 hover:bg-rose-800 disabled:opacity-50 transition-colors flex items-center space-x-1.5"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>{isTerminatingCall ? "Ending..." : "End Call"}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Initiate Form */
              <form onSubmit={handleInitiateTestCall} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-ivory-muted mb-1">
                    Destination Telephone Number *
                  </label>
                  <input
                    type="text"
                    value={testNumber}
                    onChange={(e) => setTestNumber(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-xs text-ivory font-mono focus:outline-none focus:border-champagne"
                  />
                  <p className="text-[11px] text-ivory-muted mt-1">
                    Enter valid national or E.164 formatted number.
                  </p>
                </div>

                {/* Regulatory Notice Card */}
                <div className="p-3 rounded bg-charcoal-300/80 border border-charcoal-border text-[11px] text-ivory-muted space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-champagne font-mono uppercase text-[10px]">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>Regulatory & Security Notice</span>
                  </div>
                  <p className="leading-relaxed">
                    Under TRAI/DoT rules (India) and FCC regulations (US), VoIP interconnect bypass is restricted. Test calls default to zero-fee simulated mock mode unless a compliant DLT/carrier trunk is provisioned.
                  </p>
                </div>

                {/* Affirmative Checkboxes */}
                <div className="space-y-2.5 pt-1 text-xs">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={(e) => setConsentConfirmed(e.target.checked)}
                      className="mt-0.5 accent-champagne"
                    />
                    <span className="text-ivory text-[11px] leading-tight">
                      Recipient has explicitly consented to receive this automated voice test call.
                    </span>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authorizationConfirmed}
                      onChange={(e) => setAuthorizationConfirmed(e.target.checked)}
                      className="mt-0.5 accent-champagne"
                    />
                    <span className="text-ivory text-[11px] leading-tight">
                      Operator confirms this is an authorized test destination (emergency numbers 911/112/100/999 are strictly prohibited).
                    </span>
                  </label>
                </div>

                <div className="pt-3 border-t border-charcoal-border flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsTestCallModalOpen(false)}
                    className="px-4 py-2 rounded text-xs text-ivory-muted hover:text-ivory border border-charcoal-border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isInitiatingCall || !consentConfirmed || !authorizationConfirmed}
                    className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-champagne text-charcoal hover:bg-champagne-light disabled:opacity-40 transition-colors flex items-center space-x-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{isInitiatingCall ? "Initiating..." : "Place Test Call"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
