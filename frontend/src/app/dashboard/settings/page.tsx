"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { 
  Settings, Award, Cpu, ShieldCheck, CheckCircle2, 
  HelpCircle, RefreshCw, Sliders 
} from "lucide-react";

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("");
  
  // Weights (percentages, matching backend Pydantic float values 0-1)
  const [weights, setWeights] = useState({
    skill_weight: 0.25,
    experience_weight: 0.25,
    education_weight: 0.15,
    certification_weight: 0.10,
    project_weight: 0.10,
    keyword_weight: 0.05,
    semantic_weight: 0.10
  });

  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get("/settings/")
      .then((res) => {
        setOrgName(res.data.organization_name);
        if (res.data.scoring_weights) {
          setWeights(res.data.scoring_weights);
        }
        setGeminiConfigured(res.data.gemini_api_key_configured);
      })
      .catch((err) => console.error("Error loading settings:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: parseFloat(value.toFixed(2))
    }));
  };

  const calculateTotal = () => {
    return Object.values(weights).reduce((a, b) => a + b, 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate total weight sums to approximately 1.0 (100%)
    const total = calculateTotal();
    if (Math.abs(total - 1.0) > 0.01) {
      alert(`Scoring weights must sum to exactly 100%. Current sum: ${(total * 100).toFixed(0)}%`);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await api.put(`/settings/?org_name=${encodeURIComponent(orgName)}`, weights);
      setMessage("Settings updated successfully! AI engine scoring weights configured.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Error updating settings:", err);
      setMessage("Failed to update settings. Verify role permissions.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="h-40 bg-zinc-900 border border-zinc-800 rounded-2xl" />
        <div className="h-60 bg-zinc-900 border border-zinc-800 rounded-2xl" />
      </div>
    );
  }

  const totalPercentage = Math.round(calculateTotal() * 100);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Configure weights, organization branding, and check API states.</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Org Branding Card */}
        <div className="glass border border-zinc-900 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 mb-2 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>Organization Branding</span>
          </h3>
          <div>
            <label className="block text-[10px] font-bold text-zinc-550 uppercase tracking-wider mb-2">Company Name</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full max-w-md bg-zinc-950/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-white outline-none transition-all"
            />
          </div>
        </div>

        {/* AI Scoring Weights Card */}
        <div className="glass border border-zinc-900 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>AI Scoring Weights</span>
            </h3>
            <span className={`text-xs font-bold px-3 py-1 border rounded-full ${
              totalPercentage === 100 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-450" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-455"
            }`}>
              Total: {totalPercentage}%
            </span>
          </div>

          <p className="text-xs text-zinc-500 leading-normal">
            Adjust the slider parameters to calibrate what portions of a candidate's CV carry more weight during scoring calculations. 
            The parameters must sum to exactly 100%.
          </p>

          <div className="space-y-4">
            {[
              { label: "Technical Skills Alignment", key: "skill_weight" as const },
              { label: "Chronological Work Experience Match", key: "experience_weight" as const },
              { label: "Academic Education Adequacy", key: "education_weight" as const },
              { label: "Professional Certifications", key: "certification_weight" as const },
              { label: "Relevant Project Alignment", key: "project_weight" as const },
              { label: "Required Keyword Match Density", key: "keyword_weight" as const },
              { label: "Resume Semantic Core Alignment", key: "semantic_weight" as const }
            ].map((s) => (
              <div key={s.key} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center text-xs">
                <span className="font-semibold text-zinc-350 col-span-2">{s.label}</span>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={weights[s.key]}
                  onChange={(e) => handleWeightChange(s.key, parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="font-bold text-white text-right">
                  {Math.round(weights[s.key] * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security & System Info */}
        <div className="glass border border-zinc-900 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 mb-2 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>AI Environment Settings</span>
          </h3>

          <div className="flex items-center space-x-3 text-xs leading-normal">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              geminiConfigured 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-455"
            }`}>
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-bold text-white block">
                Google Gemini API Status: {geminiConfigured ? "Connected" : "Not Found"}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {geminiConfigured 
                  ? "Gemini model is active. Platform parsing is fully online." 
                  : "Using local in-memory fallback parsing. Set GEMINI_API_KEY environment variable to activate Gemini."
                }
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Save System Settings</span>
            )}
          </button>
        </div>

      </form>

    </div>
  );
}
