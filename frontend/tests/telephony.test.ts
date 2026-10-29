import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchTelephonyConfig,
  initiateTelephonyCall,
  fetchTelephonyCall,
  terminateTelephonyCall,
} from "../lib/conversation-api";
import type { TelephonyCallRequest, TelephonyConfig, PersistedCallSession } from "../types";

describe("Phase 9: Telephony Integration & Safe Outbound Dispatch", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("fetchTelephonyConfig", () => {
    it("should retrieve carrier configuration without leaking auth tokens", async () => {
      const mockConfig: TelephonyConfig = {
        provider: "mock",
        is_configured: true,
        active_mode: "Mock / Sandbox Mode",
        caller_id: "+15550199",
        real_calls_enabled: false,
        regulatory_restrictions: {
          india_trai: "Domestic PSTN interconnect restricted; mock mode active.",
          us_fcc_10dlc: "A2P 10DLC registration and STIR/SHAKEN caller ID required.",
        },
        safety_guardrails: [
          "Emergency numbers (911, 112, 100, 999) are strictly blocked.",
          "Rate limit: Max 5 call initiations per minute.",
          "Mandatory recipient consent and operator test authorization required.",
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      } as Response);

      const result = await fetchTelephonyConfig();
      expect(result).not.toBeNull();
      expect(result?.provider).toBe("mock");
      expect(result?.is_configured).toBe(true);
      expect(result?.real_calls_enabled).toBe(false);
      expect(result?.safety_guardrails.length).toBe(3);
      expect(result?.regulatory_restrictions.india_trai).toBeDefined();
      // Ensure no auth credentials exist on config object
      expect((result as unknown as Record<string, unknown>).auth_token).toBeUndefined();
    });

    it("should return null gracefully when endpoint fails", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

      const result = await fetchTelephonyConfig();
      expect(result).toBeNull();
    });
  });

  describe("initiateTelephonyCall", () => {
    it("should initiate an authorized outbound call in mock mode", async () => {
      const payload: TelephonyCallRequest = {
        to_number: "+15551234567",
        consent_confirmed: true,
        authorization_confirmed: true,
        agent_name: "Voxora Enterprise Specialist",
      };

      const mockResponse = {
        call_id: "vox-call-9988",
        provider_call_id: "mock_call_abc123",
        provider: "mock",
        status: "in-progress",
        to_number: "+15551234567",
        from_number: "+15550199",
        is_mock: true,
        created_at: new Date().toISOString(),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await initiateTelephonyCall(payload);
      expect(result.success).toBe(true);
      expect(result.data?.call_id).toBe("vox-call-9988");
      expect(result.data?.provider_call_id).toBe("mock_call_abc123");
      expect(result.data?.is_mock).toBe(true);
    });

    it("should return error message when recipient consent is unconfirmed", async () => {
      const payload: TelephonyCallRequest = {
        to_number: "+15551234567",
        consent_confirmed: false,
        authorization_confirmed: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          detail: "Legal compliance check failed: Affirmative recipient consent is strictly required.",
        }),
      } as Response);

      const result = await initiateTelephonyCall(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Affirmative recipient consent");
    });

    it("should return error message when emergency number is targeted", async () => {
      const payload: TelephonyCallRequest = {
        to_number: "911",
        consent_confirmed: true,
        authorization_confirmed: true,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          detail: "Security check rejected destination: Emergency calling is strictly prohibited.",
        }),
      } as Response);

      const result = await initiateTelephonyCall(payload);
      expect(result.success).toBe(false);
      expect(result.error).toContain("Emergency calling is strictly prohibited");
    });

    it("should handle network exception safely", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Timeout contacting backend gateway"));

      const result = await initiateTelephonyCall({
        to_number: "+15551234567",
        consent_confirmed: true,
        authorization_confirmed: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Timeout contacting backend gateway");
    });
  });

  describe("fetchTelephonyCall & terminateTelephonyCall", () => {
    it("should fetch active call session by ID", async () => {
      const mockSession: PersistedCallSession = {
        id: "vox-call-9988",
        phone_number: "+15551234567",
        contact_name: "Elena Rostova",
        direction: "OUTBOUND",
        status: "IN_PROGRESS",
        duration_seconds: 14,
        started_at: new Date().toISOString(),
        ended_at: null,
        summary: null,
        sentiment: "Neutral",
        agent_name: "Voxora Specialist",
        created_at: new Date().toISOString(),
        transcripts: [],
        provider_call_id: "mock_call_abc123",
        telephony_provider: "mock",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSession,
      } as Response);

      const result = await fetchTelephonyCall("vox-call-9988");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("vox-call-9988");
      expect(result?.provider_call_id).toBe("mock_call_abc123");
      expect(result?.status).toBe("IN_PROGRESS");
    });

    it("should terminate in-progress call and return updated session", async () => {
      const mockTerminatedSession: PersistedCallSession = {
        id: "vox-call-9988",
        phone_number: "+15551234567",
        contact_name: "Elena Rostova",
        direction: "OUTBOUND",
        status: "COMPLETED",
        duration_seconds: 42,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        summary: "Call terminated by operator",
        sentiment: "Neutral",
        agent_name: "Voxora Specialist",
        created_at: new Date().toISOString(),
        transcripts: [],
        provider_call_id: "mock_call_abc123",
        telephony_provider: "mock",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTerminatedSession,
      } as Response);

      const result = await terminateTelephonyCall("vox-call-9988");
      expect(result).not.toBeNull();
      expect(result?.status).toBe("COMPLETED");
      expect(result?.duration_seconds).toBe(42);
    });

    it("should return null when terminating a nonexistent or invalid call", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ detail: "Call session not found" }),
      } as Response);

      const result = await terminateTelephonyCall("non-existent-id");
      expect(result).toBeNull();
    });
  });
});
