"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import {
  ENTERPRISE_PERSONA_PRESETS,
  EnterprisePersonaPreset,
  DEMO_VOICE_OPTIONS,
} from "@/lib/mock-data";
import { fetchSettings, updateSettings } from "@/lib/conversation-api";
import { SystemSettings } from "@/types";
import {
  Bot,
  Save,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Zap,
  Users,
  Calendar,
  Headphones,
  Sliders,
  Play,
  Square,
  Shield,
  Loader2,
} from "lucide-react";

export default function AgentConfigPage() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("support_priya");
  const [formData, setFormData] = useState<SystemSettings>({
    agent_name: "Priya Sharma",
    custom_instructions: "",
    language: "en-US",
    response_style: "balanced",
    greeting: "Hello! Thank you for contacting Voxora Support. My name is Priya. How may I assist you with your account or service today?",
    max_history_turns: 10,
    temperature: 0.5,
    voice_playback_enabled: true,
    speech_rate: 1.0,
    voice_id: null,
  });

  const [activeDbPersona, setActiveDbPersona] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch persisted settings from real PostgreSQL database on mount
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setIsLoading(true);
      const res = await fetchSettings();
      if (mounted && res) {
        setActiveDbPersona(res);
        setFormData(res);

        // Match active preset if possible
        const matched = ENTERPRISE_PERSONA_PRESETS.find(
          (p) => p.name.toLowerCase() === res.agent_name.toLowerCase() || p.displayName.toLowerCase().includes(res.agent_name.toLowerCase())
        );
        if (matched) {
          setSelectedPresetId(matched.id);
        }
      }
      if (mounted) setIsLoading(false);
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // When a preset card is clicked, populate the form
  const handleSelectPreset = (preset: EnterprisePersonaPreset) => {
    setSelectedPresetId(preset.id);
    setFormData((prev) => ({
      ...prev,
      agent_name: preset.name,
      greeting: preset.greeting,
      custom_instructions: preset.custom_instructions,
      response_style: preset.response_style,
      temperature: preset.temperature,
      speech_rate: preset.speech_rate,
      language: preset.language,
    }));
    setErrors({});
  };

  // Audition greeting using browser speech synthesis
  const handleAuditionGreeting = (text: string, rate: number = 1.0) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Validate form inputs
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.agent_name.trim()) {
      newErrors.agent_name = "Agent name is required.";
    } else if (formData.agent_name.trim().length < 2) {
      newErrors.agent_name = "Agent name must be at least 2 characters.";
    }

    if (!formData.greeting.trim()) {
      newErrors.greeting = "A starting greeting phrase is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save to persistent database
  const handleSaveToDatabase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setSaveSuccess(false);

    const updated = await updateSettings(formData);
    if (updated) {
      setActiveDbPersona(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    }
    setIsSaving(false);
  };

  const getPresetIcon = (id: string) => {
    switch (id) {
      case "support_priya":
        return <Headphones className="w-5 h-5 text-champagne" />;
      case "sales_alex":
        return <Zap className="w-5 h-5 text-champagne" />;
      case "booking_maya":
        return <Calendar className="w-5 h-5 text-champagne" />;
      case "triage_operations":
        return <Sliders className="w-5 h-5 text-champagne" />;
      default:
        return <Bot className="w-5 h-5 text-champagne" />;
    }
  };

  return (
    <AppShell title="AI Agent Personas & Multi-Agent Dispatch">
      {/* Success Notification */}
      {saveSuccess && (
        <div
          className="flex items-center justify-between p-4 rounded-lg bg-sage/10 border border-sage/40 text-sage text-sm font-medium animate-fadeIn"
          role="alert"
        >
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-sage" />
            <span>
              Persona <strong>&quot;{formData.agent_name}&quot;</strong> has been activated and saved to the live cloud database!
            </span>
          </div>
          <span className="text-xs font-mono uppercase bg-sage/20 px-2 py-0.5 rounded">
            Live Active
          </span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-champagne mb-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Multi-Agent Voice Ecosystem</span>
            </div>
            <h1 className="text-xl font-serif font-bold text-ivory">
              Specialized Enterprise Personas
            </h1>
            <p className="text-xs text-ivory-muted mt-1 max-w-2xl">
              Switch between pre-tuned conversational agents for Customer Support, Outbound Sales, and Appointment Scheduling with 1-click database activation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleAuditionGreeting(formData.greeting, formData.speech_rate)}
              className="px-4 py-2 rounded text-xs font-mono tracking-wider uppercase border border-champagne/40 bg-charcoal-300 text-champagne hover:bg-champagne/10 transition-colors flex items-center space-x-2"
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Audition Greeting</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSaveToDatabase()}
              disabled={isSaving}
              className="px-5 py-2 rounded text-xs font-mono tracking-wider uppercase font-semibold bg-champagne text-charcoal hover:bg-champagne-light transition-colors flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Activate Persona</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Preset Personas Selection Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-ivory-muted">
            1. Select Specialized Agent Preset
          </span>
          <span className="text-xs font-mono text-champagne">
            Active in Database: <strong>{activeDbPersona?.agent_name || "Loading..."}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ENTERPRISE_PERSONA_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const isLiveInDb = activeDbPersona?.agent_name.toLowerCase().includes(preset.name.toLowerCase());

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? "bg-charcoal-300 border-champagne shadow-md"
                    : "bg-charcoal-200 border-charcoal-border hover:border-ivory-muted/40"
                }`}
              >
                {isLiveInDb && (
                  <div className="absolute top-3 right-3 flex items-center space-x-1 text-[10px] font-mono uppercase text-sage bg-sage/20 border border-sage/40 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage animate-pulse" />
                    <span>Active Live</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-charcoal border border-charcoal-border flex items-center justify-center">
                      {getPresetIcon(preset.id)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-champagne block">
                        {preset.badge}
                      </span>
                      <h3 className="text-sm font-semibold text-ivory">{preset.name}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-ivory-muted leading-relaxed mb-3">
                    {preset.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {preset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-mono text-ivory-muted bg-charcoal px-2 py-0.5 rounded border border-charcoal-border"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-charcoal-border flex items-center justify-between text-[11px] font-mono">
                  <span className="text-ivory-muted capitalize">Style: {preset.response_style}</span>
                  <span className="text-champagne font-medium">
                    {isSelected ? "Selected ✓" : "Click to Load"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Persona Customization & Live Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveToDatabase}
            className="bg-charcoal-200 border border-charcoal-border rounded-lg p-6 space-y-5"
          >
            <div className="border-b border-charcoal-border pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-semibold text-ivory">
                  Tune & Deploy Active Persona
                </h2>
                <p className="text-xs text-ivory-muted">
                  Custom instructions and prompt directives are merged with server security controls.
                </p>
              </div>

              <span className="text-xs font-mono text-ivory-muted">
                Engine: <strong className="text-champagne">Gemini 2.5 Flash</strong>
              </span>
            </div>

            {/* Agent Name */}
            <div>
              <label
                htmlFor="agent-name"
                className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
              >
                Agent Name *
              </label>
              <input
                id="agent-name"
                type="text"
                value={formData.agent_name}
                onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                placeholder="e.g. Priya Sharma (Customer Support Specialist)"
                className={`w-full px-3.5 py-2.5 rounded bg-charcoal-300 border text-sm text-ivory focus:outline-none transition-colors ${
                  errors.agent_name
                    ? "border-rose-800 focus:border-rose-600"
                    : "border-charcoal-border focus:border-champagne"
                }`}
              />
              {errors.agent_name && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.agent_name}</span>
                </p>
              )}
            </div>

            {/* Response Style & Language Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="agent-style"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
                >
                  Speaking Cadence
                </label>
                <select
                  id="agent-style"
                  value={formData.response_style}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      response_style: e.target.value as "concise" | "balanced" | "detailed",
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded bg-charcoal-300 border border-charcoal-border text-sm text-ivory focus:outline-none focus:border-champagne transition-colors"
                >
                  <option value="concise">Concise (1-2 sentences)</option>
                  <option value="balanced">Balanced (2-3 sentences)</option>
                  <option value="detailed">Detailed (Thorough explain)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="agent-temp"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
                >
                  Temperature ({formData.temperature})
                </label>
                <input
                  id="agent-temp"
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={formData.temperature}
                  onChange={(e) =>
                    setFormData({ ...formData, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full h-9 accent-champagne cursor-pointer"
                />
              </div>

              <div>
                <label
                  htmlFor="agent-rate"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
                >
                  Speech Rate ({formData.speech_rate}x)
                </label>
                <input
                  id="agent-rate"
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={formData.speech_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, speech_rate: parseFloat(e.target.value) })
                  }
                  className="w-full h-9 accent-champagne cursor-pointer"
                />
              </div>
            </div>

            {/* Opening Greeting Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="agent-greeting"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted"
                >
                  Opening Greeting Phrase *
                </label>
                <button
                  type="button"
                  onClick={() => handleAuditionGreeting(formData.greeting, formData.speech_rate)}
                  className="text-xs font-mono text-champagne hover:underline flex items-center space-x-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Preview Audio</span>
                </button>
              </div>
              <textarea
                id="agent-greeting"
                rows={3}
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                placeholder="Spoken as soon as a telephone or web voice conversation initiates..."
                className={`w-full px-3.5 py-2.5 rounded bg-charcoal-300 border text-sm text-ivory focus:outline-none transition-colors ${
                  errors.greeting
                    ? "border-rose-800 focus:border-rose-600"
                    : "border-charcoal-border focus:border-champagne"
                }`}
              />
              {errors.greeting && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.greeting}</span>
                </p>
              )}
            </div>

            {/* Operational System Instructions Editor */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="agent-instructions"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted"
                >
                  Role Directives & Domain Knowledge
                </label>
                <span className="text-[11px] font-mono text-ivory-muted">
                  Guidance for Gemini
                </span>
              </div>
              <textarea
                id="agent-instructions"
                rows={6}
                value={formData.custom_instructions || ""}
                onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                placeholder="Specify precise behavior rules, turn-taking cadence, FAQ answers, or scheduling policy..."
                className="w-full px-3.5 py-2.5 rounded bg-charcoal-300 border border-charcoal-border text-sm text-ivory font-mono text-xs focus:outline-none focus:border-champagne transition-colors leading-relaxed"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-charcoal-border flex items-center justify-between">
              <span className="text-xs text-ivory-muted">
                Changes persist across Voice Playground and Outbound Calls.
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded text-xs font-mono tracking-wider uppercase font-semibold bg-champagne text-charcoal hover:bg-champagne-light transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-champagne disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Deploy Persona</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Active Persona Card */}
        <div className="space-y-6">
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-champagne" />
                <h3 className="text-xs uppercase font-mono tracking-wider text-ivory font-semibold">
                  Live Staged Persona
                </h3>
              </div>
              <span className="text-[10px] font-mono text-sage bg-sage-subtle border border-sage/30 px-2 py-0.5 rounded">
                PostgreSQL Synced
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-ivory-muted block">
                  Designated Persona
                </span>
                <span className="text-sm font-serif font-medium text-ivory">
                  {formData.agent_name || "Untitled Agent"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-ivory-muted block">
                  Response Style
                </span>
                <span className="text-ivory font-medium capitalize">
                  {formData.response_style} (Temp: {formData.temperature})
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-ivory-muted block">
                  Language Locale
                </span>
                <span className="text-ivory font-mono">{formData.language}</span>
              </div>

              <div className="pt-2 border-t border-charcoal-border">
                <span className="text-[11px] font-mono uppercase text-ivory-muted block mb-1">
                  Active Greeting Phrase
                </span>
                <div className="p-3 bg-charcoal-300 rounded border border-charcoal-border italic text-ivory leading-relaxed text-xs">
                  &ldquo;{formData.greeting}&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* Security Guardrail Directives */}
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-champagne">
              <Shield className="w-4 h-4" />
              <span className="font-semibold">Immutable Safety Guardrails</span>
            </div>
            <p className="text-xs text-ivory-muted leading-relaxed">
              Every persona automatically inherits platform safety rules: emergency calls are strictly blocked, prompt injection overrides are rejected, and transparency that this is an AI agent is permanently enforced.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
