export type CallDirection = "INBOUND" | "OUTBOUND" | "BROWSER";

export type CallStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "FAILED"
  | "BUSY"
  | "NO_ANSWER";

export interface CallRecord {
  id: string;
  contactName: string;
  phoneNumber: string;
  direction: CallDirection;
  status: CallStatus;
  durationSeconds: number;
  timestamp: string;
  outcome: string;
  agentName: string;
  sentiment: "Positive" | "Neutral" | "Needs Review";
  summary: string;
}

export type ConsentStatus = "PENDING_VERIFICATION" | "CONSENT_CONFIRMED" | "CONSENT_REVOKED";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: "Active" | "Prospect" | "Inactive";
  consent_status?: ConsentStatus;
  lastCallDate?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  call_count?: number;
  calls?: PersistedCallSession[];
}

export interface DemoQueueItem {
  contactId: string;
  name: string;
  phone: string;
  company?: string;
  consentStatus: ConsentStatus | string;
  isValid: boolean;
  validationError?: string;
}

export interface PaginatedContactsResponse {
  items: Contact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: "Female" | "Male" | "Neutral";
  style: string;
  accent: string;
  sampleAudioUrl?: string;
}

export interface AgentConfig {
  name: string;
  description: string;
  language: string;
  voiceId: string;
  greeting: string;
  instructions: string;
  temperature: number;
  interruptionThreshold: number;
  isActive: boolean;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
}

export interface IntegrationSetting {
  id: string;
  name: string;
  category: "Telephony" | "AI Engine" | "Database" | "Webhooks";
  status: "CONNECTED" | "NOT CONNECTED";
  description: string;
}

export type VoiceSessionState =
  | "idle"
  | "requesting_permission"
  | "listening"
  | "processing"
  | "speaking"
  | "stopped"
  | "error";

export type MicPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

export interface TranscriptItem {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  timestamp: string;
  topic?: string;
  source?: "gemini" | "demo_fallback";
  modelName?: string;
  error?: string;
}

export interface TranscriptItemRecord {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  sequence: number;
}

export interface PersistedCallSession {
  id: string;
  contact_name: string | null;
  phone_number: string | null;
  direction: CallDirection;
  status: CallStatus;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  sentiment: string | null;
  agent_name: string;
  created_at: string;
  transcripts: TranscriptItemRecord[];
  isPersisted?: boolean;
  provider_call_id?: string | null;
  telephony_provider?: string | null;
}

export interface PaginatedCallsResponse {
  items: PersistedCallSession[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}


export interface AnalyticsOverview {
  total_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  incomplete_sessions: number;
  completion_rate: number;
  average_duration_seconds: number;
  start_date?: string;
  end_date?: string;
}

export interface TrendDataPoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
  incomplete: number;
}

export interface AnalyticsTrendsResponse {
  trends: TrendDataPoint[];
  total_period_sessions: number;
}

export interface OutcomeItem {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AnalyticsOutcomesResponse {
  outcomes: OutcomeItem[];
  total_sessions: number;
}

export interface SystemSettings {
  id?: string;
  agent_name: string;
  custom_instructions?: string;
  language: string;
  response_style: "concise" | "balanced" | "detailed";
  greeting: string;
  max_history_turns: number;
  temperature: number;
  voice_playback_enabled: boolean;
  speech_rate: number;
  voice_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SecurityStatus {
  gemini_configured: boolean;
  model: string;
  server_safety_active: boolean;
  max_allowed_history: number;
  max_instruction_length: number;
  authentication_mode: string;
}

export interface TelephonyCallRequest {
  to_number: string;
  contact_id?: string;
  consent_confirmed: boolean;
  authorization_confirmed: boolean;
  agent_name?: string;
}

export interface TelephonyCallResponse {
  call_id: string;
  provider_call_id: string;
  provider: string;
  status: string;
  to_number: string;
  from_number: string;
  is_mock: boolean;
  created_at: string;
}

export interface TelephonyConfig {
  provider: string;
  is_configured: boolean;
  active_mode: string;
  caller_id: string;
  real_calls_enabled: boolean;
  regulatory_restrictions: Record<string, string>;
  safety_guardrails: string[];
}
