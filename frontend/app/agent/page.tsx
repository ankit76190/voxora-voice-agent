"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DemoBanner } from "@/components/ui/demo-banner";
import { DEMO_VOICE_OPTIONS, INITIAL_AGENT_CONFIG } from "@/lib/mock-data";
import { AgentConfig } from "@/types";
import {
  Bot,
  Save,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function AgentConfigPage() {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_AGENT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<AgentConfig>(INITIAL_AGENT_CONFIG);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);

  // Validate form inputs
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!config.name.trim()) {
      newErrors.name = "Agent name is required.";
    } else if (config.name.trim().length < 3) {
      newErrors.name = "Agent name must be at least 3 characters.";
    }

    if (!config.greeting.trim()) {
      newErrors.greeting = "A starting greeting phrase is required.";
    }

    if (!config.instructions.trim()) {
      newErrors.instructions = "Operational system instructions are required.";
    } else if (config.instructions.trim().length < 20) {
      newErrors.instructions = "Instructions must be descriptive (at least 20 characters).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setSaveSuccess(false);
      return;
    }

    // Persist to local state
    setSavedConfig({ ...config });
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  const handleReset = () => {
    setConfig({ ...INITIAL_AGENT_CONFIG });
    setErrors({});
    setSaveSuccess(false);
  };

  const selectedVoice =
    DEMO_VOICE_OPTIONS.find((v) => v.id === config.voiceId) || DEMO_VOICE_OPTIONS[0];

  const handleVoicePreview = (voiceId: string) => {
    setIsPlayingAudio(voiceId);
    setTimeout(() => {
      setIsPlayingAudio(null);
    }, 2000);
  };

  return (
    <AppShell title="Agent Persona Configuration">
      <DemoBanner message="DEMO CONFIGURATION CONSOLE — Changes are validated and stored in local component state. Voice models and live telephone binding will be activated in Phases 3 and 4." />

      {/* Success Notification */}
      {saveSuccess && (
        <div
          className="flex items-center justify-between p-4 rounded-lg bg-sage/10 border border-sage/40 text-sage text-sm font-medium animate-fadeIn"
          role="alert"
        >
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-sage" />
            <span>Agent configuration saved successfully to active local workspace!</span>
          </div>
          <span className="text-xs font-mono uppercase bg-sage/20 px-2 py-0.5 rounded">
            Updated
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-charcoal-200 border border-charcoal-border rounded-lg p-6 space-y-5"
          >
            <div className="border-b border-charcoal-border pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-semibold text-ivory">
                  Core Agent Persona
                </h2>
                <p className="text-xs text-ivory-muted">
                  Define how the AI agent identifies itself and speaks during calls.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded text-xs font-mono text-ivory-muted border border-charcoal-border hover:bg-charcoal-300 hover:text-ivory flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
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
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="e.g. Voxora Enterprise Concierge"
                className={`w-full px-3.5 py-2.5 rounded bg-charcoal-300 border text-sm text-ivory focus:outline-none transition-colors ${
                  errors.name
                    ? "border-rose-800 focus:border-rose-600"
                    : "border-charcoal-border focus:border-champagne"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="agent-desc"
                className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
              >
                Operational Purpose / Description
              </label>
              <input
                id="agent-desc"
                type="text"
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Brief internal summary of agent duties"
                className="w-full px-3.5 py-2.5 rounded bg-charcoal-300 border border-charcoal-border text-sm text-ivory focus:outline-none focus:border-champagne transition-colors"
              />
            </div>

            {/* Language & Voice Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="agent-language"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
                >
                  Primary Language
                </label>
                <select
                  id="agent-language"
                  value={config.language}
                  onChange={(e) => setConfig({ ...config, language: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded bg-charcoal-300 border border-charcoal-border text-sm text-ivory focus:outline-none focus:border-champagne transition-colors"
                >
                  <option value="en-US">English (United States)</option>
                  <option value="en-GB">English (United Kingdom)</option>
                  <option value="es-ES">Spanish (European)</option>
                  <option value="fr-FR">French (Standard)</option>
                  <option value="de-DE">German (Standard)</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="agent-voice"
                  className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-1.5"
                >
                  Acoustic Voice Model
                </label>
                <select
                  id="agent-voice"
                  value={config.voiceId}
                  onChange={(e) => setConfig({ ...config, voiceId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded bg-charcoal-300 border border-charcoal-border text-sm text-ivory focus:outline-none focus:border-champagne transition-colors"
                >
                  {DEMO_VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} — {voice.accent}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Voice Samples Selection Cards */}
            <div>
              <span className="block text-xs font-mono uppercase tracking-wider text-ivory-muted mb-2">
                Available Voice Profiles (Demo Preview)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {DEMO_VOICE_OPTIONS.map((v) => {
                  const isSelected = v.id === config.voiceId;
                  const isPlaying = isPlayingAudio === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setConfig({ ...config, voiceId: v.id })}
                      className={`p-3 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-charcoal-300 border-champagne text-ivory"
                          : "bg-charcoal-100 border-charcoal-border hover:border-ivory-muted/40 text-ivory-muted"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-ivory">{v.name}</span>
                          <span className="text-[10px] font-mono text-champagne bg-champagne-subtle px-1.5 py-0.5 rounded">
                            {v.accent}
                          </span>
                        </div>
                        <p className="text-[11px] text-ivory-muted mt-1 leading-snug">{v.style}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-charcoal-border flex items-center justify-between">
                        <span className="text-[10px] font-mono text-ivory-muted uppercase">
                          {v.gender}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoicePreview(v.id);
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-mono text-champagne hover:bg-charcoal-300 flex items-center space-x-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>{isPlaying ? "Simulating..." : "Audition"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                <span className="text-[11px] font-mono text-ivory-muted">
                  Spoken upon call connect
                </span>
              </div>
              <textarea
                id="agent-greeting"
                rows={3}
                value={config.greeting}
                onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                placeholder="Spoken as soon as telephony audio stream begins..."
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
                  Operational System Instructions (LLM Prompt) *
                </label>
                <span className="text-[11px] font-mono text-ivory-muted">
                  Cadence, escalation, policy rules
                </span>
              </div>
              <textarea
                id="agent-instructions"
                rows={7}
                value={config.instructions}
                onChange={(e) => setConfig({ ...config, instructions: e.target.value })}
                placeholder="Specify precise behavior rules, turn-taking cadence, and call completion standards..."
                className={`w-full px-3.5 py-2.5 rounded bg-charcoal-300 border text-sm text-ivory font-mono text-xs focus:outline-none transition-colors leading-relaxed ${
                  errors.instructions
                    ? "border-rose-800 focus:border-rose-600"
                    : "border-charcoal-border focus:border-champagne"
                }`}
              />
              {errors.instructions && (
                <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.instructions}</span>
                </p>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-charcoal-border flex items-center justify-end space-x-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded text-xs font-mono tracking-wider uppercase font-semibold bg-champagne text-charcoal hover:bg-champagne-light transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-champagne"
              >
                <Save className="w-4 h-4" />
                <span>Save Agent Settings</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Profile Staging Preview */}
        <div className="space-y-6">
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-charcoal-border pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-4 h-4 text-champagne" />
                <h3 className="text-xs uppercase font-mono tracking-wider text-ivory font-semibold">
                  Active Configuration Preview
                </h3>
              </div>
              <span className="text-[10px] font-mono text-sage bg-sage-subtle border border-sage/30 px-2 py-0.5 rounded">
                Verified Local State
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-mono uppercase text-ivory-muted block">
                  Designated Name
                </span>
                <span className="text-sm font-serif font-medium text-ivory">
                  {savedConfig.name || "Untitled Agent"}
                </span>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-ivory-muted block">
                  Acoustic Profile
                </span>
                <span className="text-ivory font-medium">
                  {selectedVoice.name} ({selectedVoice.accent})
                </span>
                <p className="text-[11px] text-ivory-muted mt-0.5">{selectedVoice.style}</p>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase text-ivory-muted block">
                  Language Model Locale
                </span>
                <span className="text-ivory font-mono">{savedConfig.language}</span>
              </div>

              <div className="pt-2 border-t border-charcoal-border">
                <span className="text-[11px] font-mono uppercase text-ivory-muted block mb-1">
                  Simulated Opening Line
                </span>
                <div className="p-3 bg-charcoal-300 rounded border border-charcoal-border italic text-ivory leading-relaxed text-xs">
                  &ldquo;{savedConfig.greeting}&rdquo;
                </div>
              </div>
            </div>
          </div>

          {/* Demo Call Sandbox Notice */}
          <div className="bg-charcoal-200 border border-charcoal-border rounded-lg p-5 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-champagne">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">Interactive Sandbox Preview</span>
            </div>
            <p className="text-xs text-ivory-muted leading-relaxed">
              Real-time Web Audio capture and live conversational speech-to-speech interaction will be hooked up to the Gemini Live API in Phase 3. Real telephone dispatching will occur in Phase 4.
            </p>
            <div className="p-3 rounded bg-charcoal-300 border border-charcoal-border text-[11px] font-mono text-ivory-muted">
              Live Phone Call Status: Standby (Not Initiated)
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

