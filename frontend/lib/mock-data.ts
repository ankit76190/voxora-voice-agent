import { CallRecord, Contact, VoiceOption, AgentConfig, IntegrationSetting } from "@/types";

export const DEMO_VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "voice_aura_solaris",
    name: "Solaris (Warm Executive)",
    gender: "Female",
    style: "Calm, consultative, authoritative",
    accent: "US Neutral",
  },
  {
    id: "voice_aura_orion",
    name: "Orion (Technical Advisor)",
    gender: "Male",
    style: "Precise, articulate, deliberate",
    accent: "US Mid-Atlantic",
  },
  {
    id: "voice_lyra_veritas",
    name: "Lyra (Client Concierge)",
    gender: "Female",
    style: "Empathetic, clear, conversational",
    accent: "UK Neutral",
  },
  {
    id: "voice_zephyr_crest",
    name: "Zephyr (Operations Dispatch)",
    gender: "Male",
    style: "Direct, prompt, professional",
    accent: "US Western",
  },
];

export const INITIAL_AGENT_CONFIG: AgentConfig = {
  name: "Voxora Enterprise Concierge",
  description: "Primary tier-1 triage assistant for customer inbound questions, appointment routing, and account verification.",
  language: "en-US",
  voiceId: "voice_aura_solaris",
  greeting: "Good morning. Thank you for calling Voxora operations. My name is Alex. How may I direct your call today?",
  instructions: `You are Alex, an elite voice assistant representing Voxora operations.
1. Greet callers courteously in a calm, professional tone.
2. Ask for the caller's full name and organization before proceeding.
3. If they inquire about billing or support escalations, capture their account ID and schedule a callback with senior support.
4. Keep spoken turns concise (under 2 sentences per turn) to respect natural speech cadence.
5. If the caller interrupts, stop speaking immediately and address their concern directly.`,
  temperature: 0.6,
  interruptionThreshold: 0.8,
  isActive: true,
};

export interface EnterprisePersonaPreset {
  id: string;
  badge: string;
  name: string;
  displayName: string;
  role: string;
  avatarSeed: string;
  description: string;
  greeting: string;
  custom_instructions: string;
  response_style: "concise" | "balanced" | "detailed";
  temperature: number;
  speech_rate: number;
  language: string;
  tags: string[];
}

export const ENTERPRISE_PERSONA_PRESETS: EnterprisePersonaPreset[] = [
  {
    id: "support_priya",
    badge: "Support & Care",
    name: "Priya Sharma",
    displayName: "Priya Sharma (Customer Support Specialist)",
    role: "Customer Support & Query Resolution",
    avatarSeed: "Priya",
    description: "Empathetic, calm, and structured problem-solver specializing in account inquiries, billing questions, and technical troubleshooting.",
    greeting: "Hello! Thank you for contacting Voxora Support. My name is Priya. How may I assist you with your account or service today?",
    custom_instructions: `You are Priya, a senior customer support specialist for Voxora.
- Listen attentively to user questions and acknowledge their situation politely.
- Provide step-by-step guidance that is easy to follow over audio.
- If a technical issue cannot be solved immediately, offer to create an escalated support ticket.
- Always remain warm, calm, and solution-focused.`,
    response_style: "balanced",
    temperature: 0.5,
    speech_rate: 1.0,
    language: "en-US",
    tags: ["Empathetic", "Tier-1 Support", "Problem Solver"],
  },
  {
    id: "sales_alex",
    badge: "Sales & Inbound",
    name: "Alex Vance",
    displayName: "Alex Vance (Enterprise Account Executive)",
    role: "Lead Qualification & Platform Overview",
    avatarSeed: "Alex",
    description: "High-energy, consultative sales executive skilled in identifying customer call volume bottlenecks and showcasing platform ROI.",
    greeting: "Hi there! This is Alex from Voxora. We empower modern teams to automate high-volume voice operations with conversational AI. Are you looking to streamline your customer calls?",
    custom_instructions: `You are Alex, an enterprise account executive representing Voxora.
- Ask insightful discovery questions about the caller's daily call volume, current telephony provider, and primary bottlenecks.
- Emphasize high-concurrency voice agents, sub-second latency, and seamless CRM integrations.
- Keep responses concise, confident, and consultative.
- Encourage booking a personalized architecture demonstration.`,
    response_style: "concise",
    temperature: 0.7,
    speech_rate: 1.05,
    language: "en-US",
    tags: ["Consultative", "High Energy", "Revenue Focused"],
  },
  {
    id: "booking_maya",
    badge: "Scheduling",
    name: "Maya Chen",
    displayName: "Maya Chen (Appointment Coordinator)",
    role: "Calendar Coordination & Meeting Booking",
    avatarSeed: "Maya",
    description: "Organized, polite, and detail-oriented coordinator focused on capturing dates, timezones, and attendee requirements without friction.",
    greeting: "Good day! My name is Maya, your scheduling coordinator. I would be delighted to arrange a consultation for you. Which day or time slot works best for your schedule?",
    custom_instructions: `You are Maya, an executive scheduling assistant for Voxora.
- Help callers reserve time on the operations calendar.
- Ask whether morning or afternoon works better, verify their timezone, and confirm contact email/phone.
- Restate the confirmed meeting details clearly before concluding the turn.
- Speak with pleasant, crystal-clear articulation.`,
    response_style: "concise",
    temperature: 0.4,
    speech_rate: 0.95,
    language: "en-US",
    tags: ["Structured", "Precision", "Time Conscious"],
  },
  {
    id: "triage_operations",
    badge: "Technical Ops",
    name: "Voxora Operations Core",
    displayName: "Voxora Infrastructure Concierge",
    role: "Technical Architecture & Telemetry Audit",
    avatarSeed: "Core",
    description: "Authoritative technical assistant capable of explaining database schemas, WebSocket frame pipelines, and carrier security guardrails.",
    greeting: "Systems nominal. Voxora Infrastructure Concierge active. Which telemetry stream, database metric, or carrier status would you like to inspect?",
    custom_instructions: `You are the Voxora Platform Technical Concierge.
- Provide technically accurate, deep answers about FastAPI, PostgreSQL asyncpg, Gemini Live API audio resampling, and Twilio PSTN trunks.
- Highlight security safeguards such as emergency call blocking and sliding-window rate limiting.
- Provide clear architectural context and technical precision.`,
    response_style: "detailed",
    temperature: 0.3,
    speech_rate: 1.0,
    language: "en-US",
    tags: ["Analytical", "Architectural", "Deep Technical"],
  },
];


export const DEMO_CALLS: CallRecord[] = [
  {
    id: "call-9481",
    contactName: "Elena Rostova",
    phoneNumber: "+1 (415) 890-2341",
    direction: "INBOUND",
    status: "COMPLETED",
    durationSeconds: 248,
    timestamp: "2026-10-29 16:42",
    outcome: "Meeting Scheduled",
    agentName: "Voxora Concierge",
    sentiment: "Positive",
    summary: "Inquired about enterprise SLA terms. Scheduled follow-up demonstration for Nov 3.",
  },
  {
    id: "call-9480",
    contactName: "Marcus Vance",
    phoneNumber: "+1 (212) 555-0199",
    direction: "OUTBOUND",
    status: "COMPLETED",
    durationSeconds: 182,
    timestamp: "2026-10-29 15:18",
    outcome: "Order Verified",
    agentName: "Voxora Concierge",
    sentiment: "Positive",
    summary: "Confirmed shipment dispatch window for batch VX-4091 to regional hub.",
  },
  {
    id: "call-9479",
    contactName: "Devon Reed",
    phoneNumber: "+1 (312) 441-8890",
    direction: "INBOUND",
    status: "BUSY",
    durationSeconds: 0,
    timestamp: "2026-10-29 14:05",
    outcome: "Line Busy",
    agentName: "Voxora Concierge",
    sentiment: "Neutral",
    summary: "System dialed registered contact. Line returned busy signal; retry queued.",
  },
  {
    id: "call-9478",
    contactName: "Sophia Lin",
    phoneNumber: "+1 (650) 332-9011",
    direction: "BROWSER",
    status: "COMPLETED",
    durationSeconds: 310,
    timestamp: "2026-10-29 13:22",
    outcome: "Test Pass",
    agentName: "Voxora Concierge",
    sentiment: "Positive",
    summary: "Internal operator prompt evaluation session. Latency and speech clarity verified.",
  },
  {
    id: "call-9477",
    contactName: "Arthur Pendelton",
    phoneNumber: "+1 (704) 912-3401",
    direction: "INBOUND",
    status: "FAILED",
    durationSeconds: 12,
    timestamp: "2026-10-29 11:47",
    outcome: "Carrier Drop",
    agentName: "Voxora Concierge",
    sentiment: "Needs Review",
    summary: "Inbound SIP packet disruption from regional carrier trunk after 12 seconds.",
  },
  {
    id: "call-9476",
    contactName: "Kavita Rao",
    phoneNumber: "+1 (206) 880-1123",
    direction: "OUTBOUND",
    status: "COMPLETED",
    durationSeconds: 195,
    timestamp: "2026-10-29 10:14",
    outcome: "Resolved Query",
    agentName: "Voxora Concierge",
    sentiment: "Positive",
    summary: "Answered account migration questions and confirmed single sign-on cutover time.",
  },
  {
    id: "call-9475",
    contactName: "Julian Thorne",
    phoneNumber: "+1 (305) 609-4451",
    direction: "INBOUND",
    status: "NO_ANSWER",
    durationSeconds: 0,
    timestamp: "2026-10-29 09:30",
    outcome: "No Answer",
    agentName: "Voxora Concierge",
    sentiment: "Neutral",
    summary: "Automated verification retry timed out after 30 seconds of ringing.",
  },
  {
    id: "call-9474",
    contactName: "Claire Beaumont",
    phoneNumber: "+1 (415) 762-9900",
    direction: "INBOUND",
    status: "COMPLETED",
    durationSeconds: 275,
    timestamp: "2026-10-28 17:05",
    outcome: "Escalated to Human",
    agentName: "Voxora Concierge",
    sentiment: "Needs Review",
    summary: "Caller requested custom pricing revision exceeding agent threshold. Transferred to account manager.",
  },
];

export const DEMO_CONTACTS: Contact[] = [
  {
    id: "cnt-1",
    name: "Elena Rostova",
    phone: "+1 (415) 890-2341",
    email: "elena.rostova@meridianlogistics.com",
    company: "Meridian Logistics Group",
    status: "Active",
    lastCallDate: "2026-10-29 16:42",
    notes: "VP Operations. Interested in high-volume outbound notification tier.",
  },
  {
    id: "cnt-2",
    name: "Marcus Vance",
    phone: "+1 (212) 555-0199",
    email: "m.vance@apexcapital.co",
    company: "Apex Capital Partners",
    status: "Active",
    lastCallDate: "2026-10-29 15:18",
    notes: "Requires dedicated telephone numbers for London and New York offices.",
  },
  {
    id: "cnt-3",
    name: "Devon Reed",
    phone: "+1 (312) 441-8890",
    email: "devon@luminamedical.io",
    company: "Lumina Health Systems",
    status: "Prospect",
    lastCallDate: "2026-10-29 14:05",
    notes: "Evaluates patient scheduling and HIPAA-compliant transcript redaction.",
  },
  {
    id: "cnt-4",
    name: "Sophia Lin",
    phone: "+1 (650) 332-9011",
    email: "slin@vanguarddefense.org",
    company: "Vanguard Tech Labs",
    status: "Active",
    lastCallDate: "2026-10-29 13:22",
    notes: "Internal testing partner. Evaluates audio latency and interruption handling.",
  },
  {
    id: "cnt-5",
    name: "Arthur Pendelton",
    phone: "+1 (704) 912-3401",
    email: "arthur.p@carolinatrust.bank",
    company: "Carolina Trust Bancorp",
    status: "Inactive",
    lastCallDate: "2026-10-29 11:47",
    notes: "Account paused pending regulatory audit of voice authentication models.",
  },
  {
    id: "cnt-6",
    name: "Kavita Rao",
    phone: "+1 (206) 880-1123",
    email: "kavita.rao@hyperioncloud.net",
    company: "Hyperion Infrastructure",
    status: "Active",
    lastCallDate: "2026-10-29 10:14",
    notes: "Completed cloud migration review; requested weekly status voice digests.",
  },
];

export const DEMO_ANALYTICS_TIMELINE = [
  { time: "08:00", calls: 12, completed: 11, avgLatency: 280 },
  { time: "10:00", calls: 38, completed: 35, avgLatency: 295 },
  { time: "12:00", calls: 54, completed: 49, avgLatency: 310 },
  { time: "14:00", calls: 62, completed: 58, avgLatency: 285 },
  { time: "16:00", calls: 47, completed: 44, avgLatency: 290 },
  { time: "18:00", calls: 24, completed: 22, avgLatency: 275 },
];

export const DEMO_OUTCOMES_BREAKDOWN = [
  { name: "Resolved by AI", value: 68, color: "#C7A66A" },
  { name: "Escalated to Operator", value: 18, color: "#DDE4D8" },
  { name: "Scheduled Callback", value: 9, color: "#B8B2A5" },
  { name: "Unreachable / Busy", value: 5, color: "#2A2E28" },
];

export const DEMO_INTEGRATIONS: IntegrationSetting[] = [
  {
    id: "int-gemini",
    name: "Gemini Live Speech Engine",
    category: "AI Engine",
    status: "NOT CONNECTED",
    description: "Low-latency bidirectional native speech-to-speech multimodal API integration.",
  },
  {
    id: "int-telephony",
    name: "Telephony Carrier Gateway (Twilio / Telnyx)",
    category: "Telephony",
    status: "NOT CONNECTED",
    description: "PSTN telephone trunking, E.164 number provisioning, and bi-directional media streams.",
  },
  {
    id: "int-postgres",
    name: "PostgreSQL Production Store",
    category: "Database",
    status: "NOT CONNECTED",
    description: "Relational persistence for call session metadata, agent versions, and audit trails.",
  },
  {
    id: "int-webhooks",
    name: "Outbound Dispatch Webhooks",
    category: "Webhooks",
    status: "NOT CONNECTED",
    description: "Real-time HTTP events delivered to CRM or customer support systems upon call completion.",
  },
];

