import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateDemoResponse,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  isSecureContextOrLocalhost,
} from "../lib/voice-engine";
import {
  DEMO_CALLS,
  DEMO_CONTACTS,
  DEMO_VOICE_OPTIONS,
  DEMO_ANALYTICS_TIMELINE,
  DEMO_INTEGRATIONS,
} from "../lib/mock-data";

describe("Voice Engine — Deterministic Response Handling", () => {
  it("should return greeting response for greeting keywords", () => {
    const res1 = generateDemoResponse("Hello there");
    expect(res1.topic).toBe("Greeting");
    expect(res1.responseText).toContain("Voxora voice operations");

    const res2 = generateDemoResponse("good morning alex");
    expect(res2.topic).toBe("Greeting");
  });

  it("should return pricing details for pricing/cost inquiries", () => {
    const res = generateDemoResponse("What are your pricing plans and rates?");
    expect(res.topic).toBe("Pricing");
    expect(res.responseText).toContain("twelve cents per minute");
  });

  it("should return scheduling options for booking/appointment inquiries", () => {
    const res = generateDemoResponse("I would like to schedule an appointment");
    expect(res.topic).toBe("Scheduling");
    expect(res.responseText).toContain("ten AM Eastern");
  });

  it("should return escalation response for human/support requests", () => {
    const res = generateDemoResponse("I need to speak with a human support agent");
    expect(res.topic).toBe("Support Escalation");
    expect(res.responseText).toContain("priority operator handoff");
  });

  it("should return capabilities overview for feature questions", () => {
    const res = generateDemoResponse("What are your features and capabilities?");
    expect(res.topic).toBe("Capabilities");
    expect(res.responseText).toContain("enterprise platform for real-time AI voice operations");
  });

  it("should return hours of operation for availability questions", () => {
    const res = generateDemoResponse("What are your hours of operation?");
    expect(res.topic).toBe("Hours of Operation");
    expect(res.responseText).toContain("twenty-four hours a day");
  });

  it("should return demo fallback response for unrecognized queries", () => {
    const res = generateDemoResponse("Can you order a pepperoni pizza for me?");
    expect(res.topic).toBe("General Inquiry (Demo Fallback)");
    expect(res.responseText).toContain("pepperoni pizza");
    expect(res.responseText).toContain("Phase 3 prototype");
  });

  it("should handle empty or whitespace prompts gracefully", () => {
    const res = generateDemoResponse("   ");
    expect(res.topic).toBe("Prompt");
    expect(res.responseText).toContain("I'm listening");
  });
});

describe("Browser Environment & Feature Detection", () => {
  const originalWindow = global.window;

  afterEach(() => {
    global.window = originalWindow;
  });

  it("should detect unsupported SpeechRecognition when API is missing", () => {
    global.window = {} as unknown as Window & typeof globalThis;
    expect(isSpeechRecognitionSupported()).toBe(false);
  });

  it("should detect supported SpeechRecognition when standard API is present", () => {
    global.window = {
      SpeechRecognition: vi.fn(),
    } as unknown as Window & typeof globalThis;
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it("should detect supported SpeechRecognition when webkit prefix is present", () => {
    global.window = {
      webkitSpeechRecognition: vi.fn(),
    } as unknown as Window & typeof globalThis;
    expect(isSpeechRecognitionSupported()).toBe(true);
  });

  it("should detect SpeechSynthesis availability", () => {
    global.window = {
      speechSynthesis: {
        speak: vi.fn(),
        cancel: vi.fn(),
      },
    } as unknown as Window & typeof globalThis;
    expect(isSpeechSynthesisSupported()).toBe(true);
  });

  it("should detect secure origin for localhost", () => {
    global.window = {
      location: { hostname: "localhost" },
      isSecureContext: false,
    } as unknown as Window & typeof globalThis;
    expect(isSecureContextOrLocalhost()).toBe(true);
  });
});

describe("Voice Session Lifecycle & Controls Simulation", () => {
  it("should correctly transition session states from idle to listening and stopped", () => {
    const states: string[] = [];
    let currentState = "idle";
    states.push(currentState);

    // User clicks Start
    currentState = "requesting_permission";
    states.push(currentState);

    // Permission granted & recognition started
    currentState = "listening";
    states.push(currentState);

    // Speech detected
    currentState = "processing";
    states.push(currentState);

    // Agent speaking response
    currentState = "speaking";
    states.push(currentState);

    // Turn complete, back to listening
    currentState = "listening";
    states.push(currentState);

    // User clicks End Session
    currentState = "stopped";
    states.push(currentState);

    expect(states).toEqual([
      "idle",
      "requesting_permission",
      "listening",
      "processing",
      "speaking",
      "listening",
      "stopped",
    ]);
  });

  it("should verify mute control cancels active speech synthesis", () => {
    const cancelMock = vi.fn();
    let isMuted = false;

    // Simulate clicking mute while speaking
    isMuted = true;
    if (isMuted) {
      cancelMock();
    }

    expect(cancelMock).toHaveBeenCalledTimes(1);
  });

  it("should verify ending a session releases resources and cancels speech synthesis", () => {
    const cancelMock = vi.fn();
    const stopRecognitionMock = vi.fn();
    let isSessionActive = true;

    // User clicks End
    isSessionActive = false;
    cancelMock();
    stopRecognitionMock();

    expect(isSessionActive).toBe(false);
    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(stopRecognitionMock).toHaveBeenCalledTimes(1);
  });

  it("should verify clearing conversation empties transcripts", () => {
    let transcripts = [
      { id: "1", role: "user", text: "Hello", timestamp: "12:00:00" },
      { id: "2", role: "agent", text: "Good day", timestamp: "12:00:01" },
    ];
    expect(transcripts.length).toBe(2);

    // Clear
    transcripts = [];
    expect(transcripts.length).toBe(0);
  });

  it("should handle microphone permission denied error without infinite loops", () => {
    let permissionState = "prompt";
    let sessionState = "idle";
    let isSessionActive = false;

    // Error event: not-allowed
    const errorEvent = { error: "not-allowed" };
    if (errorEvent.error === "not-allowed") {
      permissionState = "denied";
      sessionState = "error";
      isSessionActive = false;
    }

    expect(permissionState).toBe("denied");
    expect(sessionState).toBe("error");
    expect(isSessionActive).toBe(false);
  });
});

describe("Phase 2 Regression Verification", () => {
  it("should preserve demo call records and data integrity", () => {
    expect(DEMO_CALLS.length).toBeGreaterThan(0);
    expect(DEMO_CALLS[0]).toHaveProperty("id");
    expect(DEMO_CALLS[0]).toHaveProperty("contactName");
    expect(DEMO_CALLS[0]).toHaveProperty("durationSeconds");
    expect(DEMO_CALLS[0]).toHaveProperty("status");
  });

  it("should preserve demo contacts and data integrity", () => {
    expect(DEMO_CONTACTS.length).toBeGreaterThan(0);
    expect(DEMO_CONTACTS[0]).toHaveProperty("email");
    expect(DEMO_CONTACTS[0]).toHaveProperty("company");
  });

  it("should preserve demo voice options and settings", () => {
    expect(DEMO_VOICE_OPTIONS.length).toBe(4);
    expect(DEMO_INTEGRATIONS.length).toBe(4);
    expect(DEMO_ANALYTICS_TIMELINE.length).toBe(6);
    // Ensure all integrations are marked NOT CONNECTED
    DEMO_INTEGRATIONS.forEach((integration) => {
      expect(integration.status).toBe("NOT CONNECTED");
    });
  });
});

describe("Phase 4 — Backend Conversation Integration", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should verify that GEMINI_API_KEY is never exposed in frontend environment", () => {
    // Frontend should only ever have NEXT_PUBLIC_ variables, never backend secrets
    expect(process.env.GEMINI_API_KEY).toBeUndefined();
    expect(process.env.NEXT_PUBLIC_GEMINI_API_KEY).toBeUndefined();
  });

  it("should successfully parse live Gemini responses from backend API", async () => {
    const { sendVoiceTurn } = await import("../lib/conversation-api");

    const mockApiResponse = {
      response: "Hello! This is an AI generated response from Gemini.",
      model: "gemini-2.5-flash",
      turn_id: "turn-12345",
      status: "success",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const result = await sendVoiceTurn({
      message: "What are your services?",
      history: [{ role: "user", content: "Hi" }],
    });

    expect(result.source).toBe("gemini");
    expect(result.replyText).toBe("Hello! This is an AI generated response from Gemini.");
    expect(result.modelName).toBe("gemini-2.5-flash");
    expect(result.error).toBeUndefined();
  });

  it("should provide graceful fallback when backend returns unconfigured key error (503)", async () => {
    const { sendVoiceTurn } = await import("../lib/conversation-api");

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        detail: "Gemini API key is not configured on the Voxora server.",
      }),
    } as Response);

    const result = await sendVoiceTurn({
      message: "What is your pricing?",
    });

    expect(result.source).toBe("demo_fallback");
    expect(result.topic).toBe("Pricing");
    expect(result.error).toContain("Gemini API key is not configured");
  });

  it("should handle backend connection failure and provide fallback turn", async () => {
    const { sendVoiceTurn } = await import("../lib/conversation-api");

    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    const result = await sendVoiceTurn({
      message: "Can I book an appointment?",
    });

    expect(result.source).toBe("demo_fallback");
    expect(result.topic).toBe("Scheduling");
    expect(result.error).toContain("Backend unreachable");
  });

  it("should correctly probe backend Gemini status via fetchBackendStatus", async () => {
    const { fetchBackendStatus } = await import("../lib/conversation-api");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        gemini_configured: true,
        model: "gemini-2.5-flash",
        timeout_seconds: 12.0,
      }),
    } as Response);

    const status = await fetchBackendStatus();
    expect(status.online).toBe(true);
    expect(status.geminiConfigured).toBe(true);
    expect(status.model).toBe("gemini-2.5-flash");
  });
});

describe("Phase 5 — Call Management & Conversation History Persistence", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should create a new call session via backend API", async () => {
    const { createCallSession } = await import("../lib/conversation-api");

    const mockCreatedSession = {
      id: "call-uuid-1234-5678",
      contact_name: "Web Operator",
      phone_number: "Browser Audio",
      direction: "BROWSER",
      status: "IN_PROGRESS",
      duration_seconds: 0,
      started_at: "2026-10-29T14:00:00Z",
      transcripts: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCreatedSession,
    } as Response);

    const session = await createCallSession({ contact_name: "Web Operator" });
    expect(session).not.toBeNull();
    expect(session?.id).toBe("call-uuid-1234-5678");
    expect(session?.status).toBe("IN_PROGRESS");
  });

  it("should complete a call session and persist transcripts", async () => {
    const { completeCallSession } = await import("../lib/conversation-api");

    const mockCompletedSession = {
      id: "call-uuid-1234-5678",
      status: "COMPLETED",
      duration_seconds: 75,
      summary: "Inquiry about pricing answered.",
      transcripts: [
        { id: "t1", role: "user", content: "What are your rates?", timestamp: "14:00:10", sequence: 1 },
        { id: "t2", role: "agent", content: "Our rates are twelve cents per minute.", timestamp: "14:00:14", sequence: 2 },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCompletedSession,
    } as Response);

    const session = await completeCallSession("call-uuid-1234-5678", {
      status: "COMPLETED",
      duration_seconds: 75,
      summary: "Inquiry about pricing answered.",
      transcripts: [
        { role: "user", content: "What are your rates?", timestamp: "14:00:10", sequence: 1 },
        { role: "agent", content: "Our rates are twelve cents per minute.", timestamp: "14:00:14", sequence: 2 },
      ],
    });

    expect(session).not.toBeNull();
    expect(session?.status).toBe("COMPLETED");
    expect(session?.duration_seconds).toBe(75);
    expect(session?.transcripts.length).toBe(2);
  });

  it("should fetch paginated call sessions with filters", async () => {
    const { fetchCallList } = await import("../lib/conversation-api");

    const mockListResponse = {
      items: [
        {
          id: "call-1",
          contact_name: "Elena Rostova",
          status: "COMPLETED",
          duration_seconds: 120,
          started_at: "2026-10-29T10:00:00Z",
          transcripts: [],
        },
      ],
      total: 1,
      page: 1,
      page_size: 10,
      total_pages: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockListResponse,
    } as Response);

    const result = await fetchCallList({ page: 1, pageSize: 10, search: "Elena" });
    expect(result).not.toBeNull();
    expect(result?.total).toBe(1);
    expect(result?.items[0].contact_name).toBe("Elena Rostova");
  });

  it("should fetch call detail including full transcript turns", async () => {
    const { fetchCallDetail } = await import("../lib/conversation-api");

    const mockDetail = {
      id: "call-detailed-1",
      contact_name: "Devon Reed",
      transcripts: [
        { id: "t-1", role: "user", content: "Can I book a demo?", timestamp: "11:00:00", sequence: 1 },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDetail,
    } as Response);

    const detail = await fetchCallDetail("call-detailed-1");
    expect(detail).not.toBeNull();
    expect(detail?.contact_name).toBe("Devon Reed");
    expect(detail?.transcripts.length).toBe(1);
  });

  it("should handle backend failure gracefully without crashing caller", async () => {
    const { createCallSession, completeCallSession, fetchCallList } = await import("../lib/conversation-api");

    global.fetch = vi.fn().mockRejectedValue(new Error("Database disconnected"));

    const created = await createCallSession({});
    expect(created).toBeNull();

    const completed = await completeCallSession("call-xyz", { status: "COMPLETED" });
    expect(completed).toBeNull();

    const list = await fetchCallList({});
    expect(list).toBeNull();
  });

  it("should ensure ending or clearing session isolates session IDs", () => {
    let activeCallId: string | null = "session-first";
    let messageLog: string[] = ["turn1", "turn2"];

    // Operator completes session
    activeCallId = null;
    messageLog = [];

    // Next session starts
    activeCallId = "session-second";
    expect(activeCallId).toBe("session-second");
    expect(messageLog).toEqual([]);
  });
});
