"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import { SystemSettings, SecurityStatus } from "@/types";
import {
  fetchSettings,
  updateSettings,
  resetSettings,
  fetchSecurityStatus,
} from "@/lib/conversation-api";
import {
  Shield,
  Bot,
  Volume2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Save,
  Lock,
  Layers,
  Sparkles,
  Info,
  X,
  AlertTriangle,
  Radio,
} from "lucide-react";

const DEFAULT_SETTINGS_STATE: SystemSettings = {
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

export default function SettingsPage() {
  const [formData, setFormData] = useState<SystemSettings>(DEFAULT_SETTINGS_STATE);
  const [initialData, setInitialData] = useState<SystemSettings>(DEFAULT_SETTINGS_STATE);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Errors and Notification
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    return (
      formData.agent_name !== initialData.agent_name ||
      formData.custom_instructions !== initialData.custom_instructions ||
      formData.language !== initialData.language ||
      formData.response_style !== initialData.response_style ||
      formData.greeting !== initialData.greeting ||
      formData.max_history_turns !== initialData.max_history_turns ||
      formData.temperature !== initialData.temperature ||
      formData.voice_playback_enabled !== initialData.voice_playback_enabled ||
      formData.speech_rate !== initialData.speech_rate ||
      formData.voice_id !== initialData.voice_id
    );
  }, [formData, initialData]);

  // Load browser speech voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    } else {
      setIsSpeechSupported(false);
    }
  }, []);

  // Fetch settings and security status on mount
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, secRes] = await Promise.all([
        fetchSettings(),
        fetchSecurityStatus(),
      ]);

      if (settingsRes) {
        setFormData(settingsRes);
        setInitialData(settingsRes);
      }
      if (secRes) {
        setSecurityStatus(secRes);
      }
    } catch {
      showNotification(
        "error",
        "Could not load settings from server. Running with cached values."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.agent_name.trim()) {
      errors.agent_name = "Agent display name is required.";
    } else if (formData.agent_name.trim().length < 2) {
      errors.agent_name = "Agent name must be at least 2 characters.";
    } else if (formData.agent_name.length > 100) {
      errors.agent_name = "Agent name cannot exceed 100 characters.";
    }

    if (!formData.greeting.trim()) {
      errors.greeting = "A starting greeting statement is required.";
    } else if (formData.greeting.trim().length < 2) {
      errors.greeting = "Greeting statement must be at least 2 characters.";
    } else if (formData.greeting.length > 500) {
      errors.greeting = "Greeting statement cannot exceed 500 characters.";
    }

    if (
      formData.custom_instructions &&
      formData.custom_instructions.length > 2000
    ) {
      errors.custom_instructions = "Custom instructions cannot exceed 2,000 characters.";
    }

    if (
      formData.max_history_turns < 2 ||
      formData.max_history_turns > 20
    ) {
      errors.max_history_turns = "History bounds must be between 2 and 20 turns.";
    }

    if (formData.temperature < 0.0 || formData.temperature > 1.0) {
      errors.temperature = "Temperature must be between 0.0 and 1.0.";
    }

    if (formData.speech_rate < 0.5 || formData.speech_rate > 2.0) {
      errors.speech_rate = "Speech rate must be between 0.5x and 2.0x.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const updated = await updateSettings({
        agent_name: formData.agent_name.trim(),
        custom_instructions: formData.custom_instructions?.trim() || "",
        language: formData.language,
        response_style: formData.response_style,
        greeting: formData.greeting.trim(),
        max_history_turns: formData.max_history_turns,
        temperature: formData.temperature,
        voice_playback_enabled: formData.voice_playback_enabled,
        speech_rate: formData.speech_rate,
        voice_id: formData.voice_id,
      });

      if (updated) {
        setFormData(updated);
        setInitialData(updated);
        showNotification(
          "success",
          "AI agent settings and voice preferences updated successfully!"
        );
      } else {
        showNotification(
          "error",
          "Server could not save settings. Please verify backend connectivity."
        );
      }
    } catch (err: unknown) {
      showNotification("error", `Failed to save settings: ${String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset to Defaults
  const handleReset = async () => {
    setIsResetting(true);
    try {
      const reset = await resetSettings();
      if (reset) {
        setFormData(reset);
        setInitialData(reset);
        setFormErrors({});
        showNotification(
          "success",
          "Agent persona restored to factory defaults. Call history remains preserved."
        );
      } else {
        showNotification("error", "Failed to reset settings.");
      }
    } catch (err: unknown) {
      showNotification("error", `Reset failed: ${String(err)}`);
    } finally {
      setIsResetting(false);
      setIsResetModalOpen(false);
    }
  };

  return (
    <AppShell title="System Settings & Persona Configuration">
      {/* Enterprise Phase 8 Notice */}
      <DemoBanner message="PHASE 8: AI AGENT CONFIGURATION & SECURITY — Database-persisted persona parameters, conversation history caps, and immutable server-enforced safety directives. Telephony carriers remain decoupled." />

      {/* Header & Unsaved Changes Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-charcoal-border pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-semibold text-ivory">
            Platform Settings & AI Persona
          </h2>
          <p className="text-xs sm:text-sm text-ivory-muted mt-1">
            Configure agent identity, voice parameters, conversation bounds, and security guardrails.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {isDirty && (
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono bg-champagne/10 text-champagne border border-champagne/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-champagne" />
              <span>Unsaved Changes</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider text-ivory-muted hover:text-ivory border border-charcoal-border hover:bg-charcoal-300 transition-colors flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg text-xs font-medium border animate-fadeIn ${notification.type === "success"
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

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Persona & Behavior */}
          <div className="lg:col-span-7 space-y-6">
            {/* General & Identity */}
            <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-charcoal-border pb-3">
                <Bot className="w-4 h-4 text-champagne" />
                <h3 className="text-sm font-semibold text-ivory font-mono uppercase tracking-wider">
                  Agent Identity & Greeting
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-mono uppercase text-ivory-muted mb-1">
                    Agent Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.agent_name}
                    onChange={(e) =>
                      setFormData({ ...formData, agent_name: e.target.value })
                    }
                    placeholder="e.g. Voxora Concierge"
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-ivory focus:outline-none transition-colors ${formErrors.agent_name
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                      }`}
                  />
                  {formErrors.agent_name && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      {formErrors.agent_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-mono uppercase text-ivory-muted mb-1">
                    Starting Session Greeting *
                  </label>
                  <textarea
                    rows={2}
                    value={formData.greeting}
                    onChange={(e) =>
                      setFormData({ ...formData, greeting: e.target.value })
                    }
                    placeholder="Phrase spoken when an operator initiates a voice session..."
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-ivory focus:outline-none transition-colors ${formErrors.greeting
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                      }`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-ivory-muted mt-1">
                    <span>{formErrors.greeting || "Spoken at the start of Voice Playground sessions."}</span>
                    <span className="font-mono">{formData.greeting.length}/500</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Engine & Response Behavior */}
            <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-charcoal-border pb-3">
                <Sliders className="w-4 h-4 text-champagne" />
                <h3 className="text-sm font-semibold text-ivory font-mono uppercase tracking-wider">
                  AI Model & Conversational Behavior
                </h3>
              </div>

              <div className="space-y-4 text-xs">
                {/* Response Style Radio */}
                <div>
                  <label className="block font-mono uppercase text-ivory-muted mb-2">
                    Spoken Response Verbosity Style *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        key: "concise",
                        title: "Concise",
                        desc: "1–2 sentences for rapid spoken exchanges",
                      },
                      {
                        key: "balanced",
                        title: "Balanced",
                        desc: "2–3 sentences with consultative natural tone",
                      },
                      {
                        key: "detailed",
                        title: "Detailed",
                        desc: "Comprehensive multi-point spoken explanations",
                      },
                    ].map((style) => (
                      <button
                        key={style.key}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            response_style: style.key as
                              | "concise"
                              | "balanced"
                              | "detailed",
                          })
                        }
                        className={`p-3 rounded-lg border text-left transition-colors ${formData.response_style === style.key
                            ? "bg-champagne/10 border-champagne/50 text-ivory"
                            : "bg-charcoal-300 border-charcoal-border text-ivory-muted hover:border-charcoal-border/80"
                          }`}
                      >
                        <div className="font-semibold text-champagne mb-0.5">
                          {style.title}
                        </div>
                        <p className="text-[11px] text-ivory-muted leading-tight">
                          {style.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* Preferred Language */}
                  <div>
                    <label className="block font-mono uppercase text-ivory-muted mb-1">
                      Interaction Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) =>
                        setFormData({ ...formData, language: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-ivory focus:outline-none focus:border-champagne font-mono"
                    >
                      <option value="en-US">English (United States)</option>
                      <option value="en-GB">English (United Kingdom)</option>
                      <option value="es-ES">Spanish (Español)</option>
                      <option value="fr-FR">French (Français)</option>
                      <option value="de-DE">German (Deutsch)</option>
                      <option value="ja-JP">Japanese (日本語)</option>
                    </select>
                  </div>

                  {/* Max History Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-mono uppercase text-ivory-muted">
                        Max Conversation Turns
                      </label>
                      <span className="font-mono text-champagne font-medium">
                        {formData.max_history_turns} turns
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={1}
                      value={formData.max_history_turns}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_history_turns: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-champagne cursor-pointer"
                    />
                    <p className="text-[11px] text-ivory-muted mt-1">
                      Bounds Gemini context to prevent prompt overflow.
                    </p>
                  </div>
                </div>

                {/* Temperature Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono uppercase text-ivory-muted">
                      Creativity / Temperature
                    </label>
                    <span className="font-mono text-champagne font-medium">
                      {formData.temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-champagne cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[11px] text-ivory-muted mt-1">
                    <span>Precise & Deterministic (0.0)</span>
                    <span>Creative & Conversational (1.0)</span>
                  </div>
                </div>

                {/* Custom System Instructions */}
                <div>
                  <label className="block font-mono uppercase text-ivory-muted mb-1">
                    Custom Operator Guidelines (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.custom_instructions || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        custom_instructions: e.target.value,
                      })
                    }
                    placeholder="Specific company policies, appointment rules, or consultative guidelines..."
                    className={`w-full px-3 py-2 rounded bg-charcoal-300 border text-ivory focus:outline-none transition-colors ${formErrors.custom_instructions
                        ? "border-rose-800"
                        : "border-charcoal-border focus:border-champagne"
                      }`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-ivory-muted mt-1">
                    <span>
                      {formErrors.custom_instructions ||
                        "Appended safely before server security directives."}
                    </span>
                    <span className="font-mono">
                      {(formData.custom_instructions || "").length}/2000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Voice Preferences & Security Guardrails */}
          <div className="lg:col-span-5 space-y-6">
            {/* Voice Preferences (Browser Speech API) */}
            <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-charcoal-border pb-3">
                <Volume2 className="w-4 h-4 text-champagne" />
                <h3 className="text-sm font-semibold text-ivory font-mono uppercase tracking-wider">
                  Browser Voice Preferences
                </h3>
              </div>

              {!isSpeechSupported && (
                <div className="p-3 rounded bg-champagne/10 border border-champagne/30 text-champagne text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <Info className="w-3.5 h-3.5" />
                    <span>Speech Synthesis Notice</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Your current browser environment does not support speech synthesis. Audio will default to text rendering.
                  </p>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Voice Playback Toggle */}
                <div className="flex items-center justify-between p-3 rounded bg-charcoal-300 border border-charcoal-border">
                  <div>
                    <span className="font-medium text-ivory block">
                      Voice Playback
                    </span>
                    <span className="text-[11px] text-ivory-muted">
                      Speak agent turns aloud via browser audio
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        voice_playback_enabled: !formData.voice_playback_enabled,
                      })
                    }
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${formData.voice_playback_enabled
                        ? "bg-sage justify-end"
                        : "bg-charcoal-border justify-start"
                      }`}
                  >
                    <span className="bg-charcoal w-4 h-4 rounded-full shadow-md" />
                  </button>
                </div>

                {/* Speech Rate Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-mono uppercase text-ivory-muted">
                      Speech Output Rate
                    </label>
                    <span className="font-mono text-champagne font-medium">
                      {formData.speech_rate.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.75}
                    max={1.5}
                    step={0.05}
                    value={formData.speech_rate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        speech_rate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-champagne cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[11px] text-ivory-muted mt-1">
                    <span>Deliberate (0.75x)</span>
                    <span>Standard (1.0x)</span>
                    <span>Brisk (1.5x)</span>
                  </div>
                </div>

                {/* Browser Speech Voice Selection */}
                {availableVoices.length > 0 && (
                  <div>
                    <label className="block font-mono uppercase text-ivory-muted mb-1">
                      Available Browser Speech Voice
                    </label>
                    <select
                      value={formData.voice_id || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          voice_id: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 rounded bg-charcoal-300 border border-charcoal-border text-ivory focus:outline-none focus:border-champagne text-xs"
                    >
                      <option value="">System Default Audio Voice</option>
                      {availableVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy & Platform Security Guardrails */}
            <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
              <div className="flex items-center space-x-2 border-b border-charcoal-border pb-3">
                <Shield className="w-4 h-4 text-champagne" />
                <h3 className="text-sm font-semibold text-ivory font-mono uppercase tracking-wider">
                  Security & Guardrails Audit
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* Gemini API Key Audit */}
                <div className="p-3 rounded bg-charcoal-300/70 border border-charcoal-border space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-ivory-muted uppercase text-[11px]">
                      Gemini API Server Key
                    </span>
                    {securityStatus?.gemini_configured ? (
                      <span className="text-sage text-[11px] flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Configured on Server</span>
                      </span>
                    ) : (
                      <span className="text-champagne text-[11px] flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Unconfigured (Demo Mode)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ivory-muted leading-relaxed">
                    Sourced exclusively from server environment variables (`GEMINI_API_KEY`). Never transmitted to browser JavaScript or client bundles.
                  </p>
                </div>

                {/* Server Safety Rules Status */}
                <div className="p-3 rounded bg-charcoal-300/70 border border-charcoal-border space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-ivory-muted uppercase text-[11px]">
                      Platform Safety Guardrails
                    </span>
                    <span className="text-sage text-[11px] flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Strictly Enforced</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-ivory-muted leading-relaxed">
                    Mandatory directives disallowing unauthorized phone calls, financial actions, and prompt injections are hardcoded into every upstream prompt and cannot be bypassed.
                  </p>
                </div>

                {/* Tenancy Mode */}
                <div className="p-3 rounded bg-charcoal-300/70 border border-charcoal-border space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-ivory-muted uppercase text-[11px]">
                      Deployment Tenancy
                    </span>
                    <span className="text-ivory text-[11px] font-mono">
                      {securityStatus?.authentication_mode || "Single-Tenant Workspace"}
                    </span>
                  </div>
                  <p className="text-[11px] text-ivory-muted leading-relaxed">
                    Settings persist across application sessions globally. Multi-user role-based authentication is staged for future architecture phases.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Action Strip */}
            <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 flex items-center justify-between">
              <div className="text-xs text-ivory-muted">
                {isDirty ? (
                  <span className="text-champagne">You have unsaved changes.</span>
                ) : (
                  <span>All settings up to date.</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="px-5 py-2 rounded text-xs font-mono font-semibold uppercase tracking-wider bg-champagne text-charcoal hover:bg-champagne-light disabled:opacity-50 transition-colors flex items-center space-x-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setIsResetModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-charcoal-200 border border-charcoal-border rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl text-ivory"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-champagne">
              <div className="w-9 h-9 rounded-full bg-champagne/10 border border-champagne/30 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-champagne" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-ivory">
                  Restore Factory Defaults
                </h3>
                <p className="text-xs text-ivory-muted">Reset agent configuration</p>
              </div>
            </div>

            <p className="text-xs text-ivory leading-relaxed">
              Are you sure you want to restore default AI agent persona, response style, and voice preferences?
            </p>

            <div className="p-3 rounded bg-charcoal-300/80 border border-charcoal-border text-[11px] text-ivory-muted space-y-1">
              <div className="flex items-center space-x-1.5 text-sage font-mono uppercase">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Call & Contact History Safeguard</span>
              </div>
              <p>
                Resetting agent settings will NOT modify or delete your historical call sessions, contact directories, or analytics logs.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded text-xs text-ivory-muted hover:text-ivory border border-charcoal-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="px-4 py-2 rounded text-xs font-mono uppercase tracking-wider font-semibold bg-champagne text-charcoal hover:bg-champagne-light disabled:opacity-50 transition-colors"
              >
                {isResetting ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
