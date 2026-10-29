/**
 * Voxora Browser Voice Engine — Phase 3 Local Prototype
 * 
 * NOTE: This is a client-side prototype utilizing the browser's Web Speech API
 * with deterministic response handlers. It is NOT connected to Gemini Live or real telephony.
 * Architecture is designed to be swapped cleanly with the Gemini Live WebSocket bridge in Phase 4.
 */

export interface DemoResponseResult {
  responseText: string;
  topic: string;
}

/**
 * Deterministic Demo Response Handler
 * Matches input against business topics and returns structured synthetic responses.
 */
export function generateDemoResponse(userInput: string): DemoResponseResult {
  const normalized = userInput.trim().toLowerCase();

  if (!normalized) {
    return {
      responseText: "I'm listening. Please speak whenever you're ready, or ask about our services, pricing, or appointment scheduling.",
      topic: "Prompt",
    };
  }

  // 1. Greetings
  if (
    normalized.includes("hello") ||
    normalized.includes("hi") ||
    normalized.includes("hey") ||
    normalized.includes("good morning") ||
    normalized.includes("good afternoon")
  ) {
    return {
      responseText: "Good day. Welcome to Voxora voice operations. I am your automated concierge assistant. How may I direct your call today?",
      topic: "Greeting",
    };
  }

  // 2. Pricing & Cost
  if (
    normalized.includes("pricing") ||
    normalized.includes("cost") ||
    normalized.includes("price") ||
    normalized.includes("rate") ||
    normalized.includes("tier") ||
    normalized.includes("subscription")
  ) {
    return {
      responseText: "Voxora enterprise tiers include Standard Inbound at twelve cents per minute, and High-Throughput Dispatch at eighteen cents per minute, including custom voice models and SOC-two compliant transcript storage.",
      topic: "Pricing",
    };
  }

  // 3. Scheduling & Appointments
  if (
    normalized.includes("schedule") ||
    normalized.includes("appointment") ||
    normalized.includes("book") ||
    normalized.includes("meeting") ||
    normalized.includes("calendar") ||
    normalized.includes("call back")
  ) {
    return {
      responseText: "I would be glad to arrange that for you. Our executive dispatch team has availability tomorrow at ten AM Eastern or two PM Eastern. Which time window suits your schedule best?",
      topic: "Scheduling",
    };
  }

  // 4. Support & Escalations
  if (
    normalized.includes("support") ||
    normalized.includes("help") ||
    normalized.includes("issue") ||
    normalized.includes("problem") ||
    normalized.includes("human") ||
    normalized.includes("agent") ||
    normalized.includes("representative") ||
    normalized.includes("operator")
  ) {
    return {
      responseText: "Understood. I am flagging this session for priority operator handoff. In a production deployment, this immediately bridges your call to a tier-two support specialist with full conversational context.",
      topic: "Support Escalation",
    };
  }

  // 5. Capabilities & System Overview
  if (
    normalized.includes("what can you do") ||
    normalized.includes("features") ||
    normalized.includes("capabilities") ||
    normalized.includes("who are you") ||
    normalized.includes("what is voxora")
  ) {
    return {
      responseText: "Voxora is an enterprise platform for real-time AI voice operations. I can triage incoming calls, verify account credentials, book appointments, and route complex escalations with sub-second response times.",
      topic: "Capabilities",
    };
  }

  // 6. Hours & Availability
  if (
    normalized.includes("hours") ||
    normalized.includes("open") ||
    normalized.includes("availability") ||
    normalized.includes("time")
  ) {
    return {
      responseText: "Voxora automated dispatch systems operate continuously twenty-four hours a day, seven days a week, with regional telecom trunking across North America and Europe.",
      topic: "Hours of Operation",
    };
  }

  // Fallback Deterministic Response
  return {
    responseText: `I received your inquiry regarding "${userInput.trim()}". In this Phase 3 prototype, I am operating on deterministic demo logic. In Phase 4, your prompt will stream directly to the Gemini Live speech-to-speech model.`,
    topic: "General Inquiry (Demo Fallback)",
  };
}

/**
 * Checks if SpeechRecognition is available in the current browser runtime.
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

/**
 * Checks if SpeechSynthesis is available in the current browser runtime.
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window && typeof window.speechSynthesis.speak === "function";
}

/**
 * Checks whether the current context is considered secure (HTTPS or localhost).
 * Microphones generally require a secure origin.
 */
export function isSecureContextOrLocalhost(): boolean {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Formats current local time as HH:MM:SS
 */
export function formatTime(): string {
  const now = new Date();
  return now.toTimeString().split(" ")[0];
}

