import { generateDemoResponse } from "./voice-engine";

const RAW_API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";
const API_BASE_URL = RAW_API_URL.replace(/\/+$/, "");

export interface ConversationTurn {
  role: "user" | "model" | "assistant";
  content: string;
}

export interface SendMessageOptions {
  message: string;
  history?: ConversationTurn[];
  systemInstruction?: string;
  temperature?: number;
}

export interface ConversationResult {
  replyText: string;
  source: "gemini" | "demo_fallback";
  modelName: string;
  topic?: string;
  error?: string;
}

export interface BackendStatus {
  online: boolean;
  geminiConfigured: boolean;
  model: string;
  error?: string;
}

/**
 * Checks backend health and Gemini configuration status.
 * Never exposes or receives secret credentials.
 */
export async function fetchBackendStatus(): Promise<BackendStatus> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/conversation/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return {
        online: true,
        geminiConfigured: false,
        model: "Unknown",
        error: `Server returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      online: true,
      geminiConfigured: Boolean(data.gemini_configured),
      model: data.model || "gemini-2.5-flash",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Connection failed";
    return {
      online: false,
      geminiConfigured: false,
      model: "Offline",
      error: errorMsg,
    };
  }
}

/**
 * Sends user speech turn to the backend FastAPI Gemini endpoint.
 * If backend returns 503 (no key configured) or is unreachable, provides clear diagnostic
 * and allows graceful fallback to deterministic demo response without crashing.
 */
export async function sendVoiceTurn(
  options: SendMessageOptions,
  allowFallbackOnOffline: boolean = true
): Promise<ConversationResult> {
  const trimmed = options.message.trim();
  if (!trimmed) {
    return {
      replyText: "I'm listening. Please speak whenever you're ready.",
      source: "demo_fallback",
      modelName: "Local Prompt",
      topic: "Prompt",
    };
  }

  // Cap bounded history turns to last 10 turns
  const boundedHistory = (options.history || []).slice(-10).map((h) => ({
    role: h.role === "assistant" ? "model" : h.role,
    content: h.content.slice(0, 1500),
  }));

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed.slice(0, 2000),
        history: boundedHistory,
        system_instruction: options.systemInstruction,
        temperature: options.temperature || 0.7,
      }),
      signal: AbortSignal.timeout(14000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        replyText: data.response,
        source: "gemini",
        modelName: data.model || "gemini-2.5-flash",
      };
    }

    // Handle non-200 responses
    const errorPayload = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    const errorDetail = errorPayload.detail || `Server returned HTTP ${res.status}`;

    if (allowFallbackOnOffline) {
      const fallback = generateDemoResponse(trimmed);
      return {
        replyText: fallback.responseText,
        source: "demo_fallback",
        modelName: "Deterministic Fallback",
        topic: fallback.topic,
        error: errorDetail,
      };
    }

    return {
      replyText: `Server Error: ${errorDetail}`,
      source: "demo_fallback",
      modelName: "Error",
      error: errorDetail,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Network error";

    if (allowFallbackOnOffline) {
      const fallback = generateDemoResponse(trimmed);
      return {
        replyText: fallback.responseText,
        source: "demo_fallback",
        modelName: "Deterministic Fallback",
        topic: fallback.topic,
        error: `Backend unreachable (${errMsg}). Showing demo response.`,
      };
    }

    return {
      replyText: `Connection to Voxora backend failed: ${errMsg}`,
      source: "demo_fallback",
      modelName: "Connection Error",
      error: errMsg,
    };
  }
}

import type { PersistedCallSession, PaginatedCallsResponse } from "@/types";

/**
 * Creates a new active call session in the backend store.
 */
export async function createCallSession(payload: {
  contact_name?: string;
  phone_number?: string;
  direction?: string;
  agent_name?: string;
}): Promise<PersistedCallSession | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_name: payload.contact_name || "Browser Operator",
        phone_number: payload.phone_number || "Browser Audio",
        direction: payload.direction || "BROWSER",
        agent_name: payload.agent_name || "Voxora Concierge",
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Finalizes an existing call session with status, duration, and transcripts.
 */
export async function completeCallSession(
  callId: string,
  payload: {
    status?: string;
    duration_seconds?: number;
    summary?: string | null;
    sentiment?: string;
    transcripts?: Array<{
      role: "user" | "agent" | "system";
      content: string;
      timestamp: string;
      sequence: number;
    }>;
  }
): Promise<PersistedCallSession | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/calls/${callId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Retrieves paginated call sessions with filters from backend.
 */
export async function fetchCallList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PaginatedCallsResponse | null> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.pageSize) query.set("page_size", params.pageSize.toString());
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "ALL") query.set("status", params.status);
    if (params.startDate) query.set("start_date", params.startDate);
    if (params.endDate) query.set("end_date", params.endDate);

    const res = await fetch(`${API_BASE_URL}/api/v1/calls?${query.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches a single call session by ID with its full transcript.
 */
export async function fetchCallDetail(callId: string): Promise<PersistedCallSession | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/calls/${callId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

import type { Contact, PaginatedContactsResponse } from "@/types";

/**
 * Retrieves paginated contacts with search and status filters.
 */
export async function fetchContactList(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}): Promise<PaginatedContactsResponse | null> {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.pageSize) query.set("page_size", params.pageSize.toString());
    if (params.search) query.set("search", params.search);
    if (params.status && params.status !== "ALL") query.set("status", params.status);

    const res = await fetch(`${API_BASE_URL}/api/v1/contacts?${query.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Retrieves a single contact profile along with their linked historical calls.
 */
export async function fetchContactDetail(contactId: string): Promise<Contact | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/contacts/${contactId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Creates a new contact record in the backend store.
 */
export async function createContact(payload: {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  status?: string;
  consent_status?: string;
}): Promise<Contact | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Updates an existing contact record.
 */
export async function updateContact(
  contactId: string,
  payload: Partial<Contact>
): Promise<Contact | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Safely deletes a contact. Associated historical calls remain preserved.
 */
export async function deleteContact(contactId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/contacts/${contactId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    return res.ok;
  } catch {
    return false;
  }
}


import type {
  AnalyticsOverview,
  AnalyticsTrendsResponse,
  AnalyticsOutcomesResponse,
} from "@/types";

/**
 * Retrieves aggregated session KPIs from the backend store.
 */
export async function fetchAnalyticsOverview(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsOverview | null> {
  try {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/overview${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Retrieves daily session trends from the backend store.
 */
export async function fetchAnalyticsTrends(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsTrendsResponse | null> {
  try {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/call-trends${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Retrieves session outcome distributions from the backend store.
 */
export async function fetchAnalyticsOutcomes(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsOutcomesResponse | null> {
  try {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/call-outcomes${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Triggers a direct browser download of the server-generated CSV export.
 */
export async function downloadAnalyticsCsv(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("start_date", params.startDate);
    if (params?.endDate) query.set("end_date", params.endDate);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/analytics/export${qs}`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { success: false, error: `Server returned status ${res.status}` };
    }

    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition");
    let filename = "voxora_analytics_export.csv";
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    // Trigger browser download anchor
    if (typeof window !== "undefined") {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }

    return { success: true, filename };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

import type { SystemSettings, SecurityStatus } from "@/types";

/**
 * Retrieves the persisted AI agent persona, voice, and guardrail settings.
 */
export async function fetchSettings(): Promise<SystemSettings | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Updates persisted settings with validated configuration parameters.
 */
export async function updateSettings(
  payload: Partial<SystemSettings>
): Promise<SystemSettings | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Resets settings back to defaults while preserving all call history and contacts.
 */
export async function resetSettings(): Promise<SystemSettings | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Audits platform security status and environment bounds without exposing secrets.
 */
export async function fetchSecurityStatus(): Promise<SecurityStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/settings/security-status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

import type {
  TelephonyCallRequest,
  TelephonyCallResponse,
  TelephonyConfig,
} from "@/types";

/**
 * Retrieves carrier provider configuration readiness, active simulation mode,
 * and regulatory restrictions.
 */
export async function fetchTelephonyConfig(): Promise<TelephonyConfig | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/telephony/config`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Initiates an authorized outbound test call.
 */
export async function initiateTelephonyCall(
  payload: TelephonyCallRequest
): Promise<{ success: boolean; data?: TelephonyCallResponse; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/telephony/calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.detail || `Server error (HTTP ${res.status})`,
      };
    }

    return { success: true, data };
  } catch (err: unknown) {
    return { success: false, error: String(err) };
  }
}

/**
 * Synchronizes and fetches status of an active telephony call.
 */
export async function fetchTelephonyCall(
  callId: string
): Promise<PersistedCallSession | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/telephony/calls/${callId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Terminates an in-progress telephone call via provider.
 */
export async function terminateTelephonyCall(
  callId: string
): Promise<PersistedCallSession | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/telephony/calls/${callId}/terminate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
