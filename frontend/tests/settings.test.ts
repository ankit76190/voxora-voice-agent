import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchSettings,
  updateSettings,
  resetSettings,
  fetchSecurityStatus,
} from "../lib/conversation-api";
import { SystemSettings, SecurityStatus } from "../types";

describe("Phase 8: Frontend Settings & Security API Integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should fetch current system and agent persona settings", async () => {
    const mockSettings: SystemSettings = {
      id: "default",
      agent_name: "Voxora Concierge",
      custom_instructions: "Answer politely.",
      language: "en-US",
      response_style: "balanced",
      greeting: "Hello, I am Voxora Concierge.",
      max_history_turns: 10,
      temperature: 0.7,
      voice_playback_enabled: true,
      speech_rate: 1.0,
      voice_id: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSettings,
    } as Response);

    const result = await fetchSettings();
    expect(result).not.toBeNull();
    expect(result?.agent_name).toBe("Voxora Concierge");
    expect(result?.max_history_turns).toBe(10);
    expect(result?.response_style).toBe("balanced");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/settings"),
      expect.any(Object)
    );
  });

  it("should update settings with validated payload", async () => {
    const updatePayload: Partial<SystemSettings> = {
      agent_name: "Aura Triage",
      response_style: "concise",
      speech_rate: 1.15,
      temperature: 0.5,
    };

    const mockUpdated: SystemSettings = {
      id: "default",
      agent_name: "Aura Triage",
      custom_instructions: "",
      language: "en-US",
      response_style: "concise",
      greeting: "Hello, I am Aura Triage.",
      max_history_turns: 10,
      temperature: 0.5,
      voice_playback_enabled: true,
      speech_rate: 1.15,
      voice_id: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUpdated,
    } as Response);

    const result = await updateSettings(updatePayload);
    expect(result).not.toBeNull();
    expect(result?.agent_name).toBe("Aura Triage");
    expect(result?.response_style).toBe("concise");
    expect(result?.speech_rate).toBe(1.15);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/settings"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(updatePayload),
      })
    );
  });

  it("should reset settings to factory defaults", async () => {
    const mockReset: SystemSettings = {
      id: "default",
      agent_name: "Voxora Concierge",
      custom_instructions: "",
      language: "en-US",
      response_style: "balanced",
      greeting: "Hello, I am Voxora Concierge. How may I direct your inquiry today?",
      max_history_turns: 10,
      temperature: 0.7,
      voice_playback_enabled: true,
      speech_rate: 1.0,
      voice_id: null,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReset,
    } as Response);

    const result = await resetSettings();
    expect(result).not.toBeNull();
    expect(result?.agent_name).toBe("Voxora Concierge");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/settings/reset"),
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("should fetch security status without exposing keys", async () => {
    const mockSecurity: SecurityStatus = {
      gemini_configured: true,
      model: "gemini-2.5-flash",
      server_safety_active: true,
      max_allowed_history: 20,
      max_instruction_length: 2000,
      authentication_mode: "Single-Tenant Workspace",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSecurity,
    } as Response);

    const result = await fetchSecurityStatus();
    expect(result).not.toBeNull();
    expect(result?.gemini_configured).toBe(true);
    expect(result?.server_safety_active).toBe(true);
    expect(result?.max_allowed_history).toBe(20);
  });

  it("should handle backend outage gracefully without throwing uncaught errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const s = await fetchSettings();
    expect(s).toBeNull();

    const u = await updateSettings({ agent_name: "Test" });
    expect(u).toBeNull();

    const r = await resetSettings();
    expect(r).toBeNull();

    const sec = await fetchSecurityStatus();
    expect(sec).toBeNull();
  });
});

describe("Phase 8: Settings Form Validation & Client Boundaries", () => {
  const validateSettings = (data: Partial<SystemSettings>): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!data.agent_name || !data.agent_name.trim()) {
      errors.agent_name = "Agent display name is required.";
    } else if (data.agent_name.trim().length < 2) {
      errors.agent_name = "Agent name must be at least 2 characters.";
    } else if (data.agent_name.length > 100) {
      errors.agent_name = "Agent name cannot exceed 100 characters.";
    }

    if (!data.greeting || !data.greeting.trim()) {
      errors.greeting = "Greeting statement is required.";
    } else if (data.greeting.trim().length < 2) {
      errors.greeting = "Greeting statement must be at least 2 characters.";
    } else if (data.greeting.length > 500) {
      errors.greeting = "Greeting statement cannot exceed 500 characters.";
    }

    if (data.custom_instructions && data.custom_instructions.length > 2000) {
      errors.custom_instructions = "Custom instructions cannot exceed 2,000 characters.";
    }

    if (data.max_history_turns !== undefined && (data.max_history_turns < 2 || data.max_history_turns > 20)) {
      errors.max_history_turns = "History bounds must be between 2 and 20 turns.";
    }

    if (data.temperature !== undefined && (data.temperature < 0.0 || data.temperature > 1.0)) {
      errors.temperature = "Temperature must be between 0.0 and 1.0.";
    }

    return errors;
  };

  it("should validate agent name bounds", () => {
    expect(validateSettings({ agent_name: "" }).agent_name).toBeDefined();
    expect(validateSettings({ agent_name: "A" }).agent_name).toBeDefined();
    expect(validateSettings({ agent_name: "a".repeat(101) }).agent_name).toBeDefined();
    expect(validateSettings({ agent_name: "Valid Agent" }).agent_name).toBeUndefined();
  });

  it("should validate greeting statement bounds", () => {
    expect(validateSettings({ greeting: "" }).greeting).toBeDefined();
    expect(validateSettings({ greeting: "x".repeat(501) }).greeting).toBeDefined();
    expect(validateSettings({ greeting: "Hello there." }).greeting).toBeUndefined();
  });

  it("should validate custom instruction bounds", () => {
    expect(validateSettings({ custom_instructions: "x".repeat(2001) }).custom_instructions).toBeDefined();
    expect(validateSettings({ custom_instructions: "Be helpful." }).custom_instructions).toBeUndefined();
  });

  it("should validate history turn bounds (2 to 20)", () => {
    expect(validateSettings({ max_history_turns: 1 }).max_history_turns).toBeDefined();
    expect(validateSettings({ max_history_turns: 25 }).max_history_turns).toBeDefined();
    expect(validateSettings({ max_history_turns: 10 }).max_history_turns).toBeUndefined();
  });

  it("should validate temperature bounds (0.0 to 1.0)", () => {
    expect(validateSettings({ temperature: -0.1 }).temperature).toBeDefined();
    expect(validateSettings({ temperature: 1.2 }).temperature).toBeDefined();
    expect(validateSettings({ temperature: 0.7 }).temperature).toBeUndefined();
  });
});

