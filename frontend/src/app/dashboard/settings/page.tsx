"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useStore } from "@/store/useStore";
import { 
  User, Eye, Cpu, Shield, Key, Database, Bell, 
  CheckCircle2, RefreshCw, Sliders, ShieldCheck 
} from "lucide-react";

export default function SettingsPage() {
  const { user, token, setAuth, theme, toggleTheme } = useStore();
  const [activeTab, setActiveTab] = useState<"account" | "appearance" | "models" | "privacy" | "security" | "memory" | "notifications">("account");

  // Account States
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [orgName, setOrgName] = useState("");

  // AI Models / Weights States
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

  // Appearance States
  const [density, setDensity] = useState<"standard" | "compact" | "spacious">("standard");

  // Privacy States
  const [logRetention, setLogRetention] = useState("90");
  const [shareDiagnostics, setShareDiagnostics] = useState(true);

  // Security States
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Memory States
  const [ragLimit, setRagLimit] = useState(5);
  const [systemInstruction, setSystemInstruction] = useState("Act as a helpful recruitment assistant.");

  // Notifications States
  const [emailDigests, setEmailDigests] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [errorAlerts, setErrorAlerts] = useState(true);

  // Global UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // Load existing settings
    api.get("/settings/")
      .then((res) => {
        setOrgName(res.data.organization_name);
        if (res.data.scoring_weights) {
          setWeights(res.data.scoring_weights);
        }
        setGeminiConfigured(res.data.gemini_api_key_configured);
      })
      .catch((err) => console.error("Error loading platform settings:", err))
      .finally(() => setLoading(false));

    // Load extra local preferences
    if (typeof window !== "undefined") {
      const storedDensity = localStorage.getItem("settings_density") as any;
      if (storedDensity) setDensity(storedDensity);

      const storedRetention = localStorage.getItem("settings_retention");
      if (storedRetention) setLogRetention(storedRetention);

      const storedDiag = localStorage.getItem("settings_diagnostics");
      if (storedDiag) setShareDiagnostics(storedDiag === "true");

      const storedRAG = localStorage.getItem("settings_rag_limit");
      if (storedRAG) setRagLimit(parseInt(storedRAG, 10));

      const storedInstruction = localStorage.getItem("settings_instruction");
      if (storedInstruction) setSystemInstruction(storedInstruction);

      const storedDigests = localStorage.getItem("settings_digests");
      if (storedDigests) setEmailDigests(storedDigests === "true");

      const storedPush = localStorage.getItem("settings_push");
      if (storedPush) setPushAlerts(storedPush === "true");

      const storedErrors = localStorage.getItem("settings_errors");
      if (storedErrors) setErrorAlerts(storedErrors === "true");
    }
  }, []);

  const calculateTotalWeights = () => {
    return Object.values(weights).reduce((a, b) => a + b, 0);
  };

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: parseFloat(value.toFixed(2))
    }));
  };

  const triggerToast = (text: string, isError = false) => {
    if (isError) {
      setErrorMessage(text);
      setTimeout(() => setErrorMessage(null), 3000);
    } else {
      setMessage(text);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      // Put to new PUT /auth/me endpoint
      const res = await api.put("/auth/me", {
        email,
        full_name: fullName
      });
      // Update global context
      setAuth(res.data, token);
      
      // Update org name as well via settings endpoint
      await api.put(`/settings/?org_name=${encodeURIComponent(orgName)}`, weights);
      
      triggerToast("Account settings updated successfully!");
      const { createLocalNotification } = await import("@/utils/notifications");
      createLocalNotification(
        res.data,
        token,
        "Profile Updated",
        "Your profile details have been successfully updated.",
        "success"
      );
    } catch (err: any) {
      console.error(err);
      triggerToast(err.response?.data?.detail || "Failed to update account credentials.", true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAIWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = calculateTotalWeights();
    if (Math.abs(total - 1.0) > 0.01) {
      alert(`Scoring weights must sum to exactly 100%. Current sum: ${(total * 100).toFixed(0)}%`);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/settings/?org_name=${encodeURIComponent(orgName)}`, weights);
      triggerToast("AI model settings and scoring weights saved!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update AI scoring weights.", true);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("settings_density", density);
    }
    triggerToast("Appearance settings saved locally!");
  };

  const handleSavePrivacy = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("settings_retention", logRetention);
      localStorage.setItem("settings_diagnostics", shareDiagnostics.toString());
    }
    triggerToast("Privacy settings successfully updated.");
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("New password and confirm password fields must match.");
      return;
    }
    setSaving(true);
    // Call user profile update to update password
    api.put("/auth/me", { password: newPassword })
      .then(async () => {
        triggerToast("Password updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        const { createLocalNotification } = await import("@/utils/notifications");
        createLocalNotification(
          user,
          token,
          "Password Changed",
          "Your account password was updated successfully.",
          "warning"
        );
      })
      .catch((err) => {
        console.error(err);
        triggerToast("Failed to change account password.", true);
      })
      .finally(() => setSaving(false));
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("settings_rag_limit", ragLimit.toString());
      localStorage.setItem("settings_instruction", systemInstruction);
    }
    triggerToast("Copilot memory system configurations updated.");
    const { createLocalNotification } = await import("@/utils/notifications");
    createLocalNotification(
      user,
      token,
      "Memory System Configured",
      `Copilot memory configuration updated: retrieval context set to ${ragLimit} documents.`,
      "success"
    );
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("settings_digests", emailDigests.toString());
      localStorage.setItem("settings_push", pushAlerts.toString());
      localStorage.setItem("settings_errors", errorAlerts.toString());
    }
    
    if (pushAlerts) {
      const { requestPushPermission } = await import("@/utils/notifications");
      const granted = await requestPushPermission(user, token);
      if (granted) {
        triggerToast("Push notifications enabled & preferences saved!");
        const { createLocalNotification } = await import("@/utils/notifications");
        createLocalNotification(
          user,
          token,
          "Security Alert: Push Subscribed",
          "This device is now registered to receive real-time push notifications.",
          "info"
        );
        return;
      }
    }
    triggerToast("Alert preferences saved!");
  };

  const clearAllCaches = () => {
    if (confirm("Are you sure you want to clear all local UI caches? This will reset your theme, notification toggles, and memory variables.")) {
      if (typeof window !== "undefined") {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-secondary rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-48 bg-card border border-border rounded-2xl md:col-span-1" />
          <div className="h-96 bg-card border border-border rounded-2xl md:col-span-3" />
        </div>
      </div>
    );
  }

  const totalPercentage = Math.round(calculateTotalWeights() * 100);

  const tabs = [
    { id: "account", label: "Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Eye },
    { id: "models", label: "AI Models", icon: Cpu },
    { id: "privacy", label: "Privacy", icon: Shield },
    { id: "security", label: "Security", icon: Key },
    { id: "memory", label: "Memory", icon: Database },
    { id: "notifications", label: "Notifications", icon: Bell }
  ] as const;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure profile configurations, LLM settings, weights, and alert options.</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3.5 text-emerald-300 text-xs animate-fade-in">
          <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3.5 text-rose-450 text-xs animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Badges bar to emphasize open state */}
      <div className="flex flex-wrap gap-2.5">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>Free Forever Badge</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          <span>Community First Badge</span>
        </span>
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span>Open Access Badge</span>
        </span>
      </div>

      {/* Tabbed Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Left Side Tab Navigation */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left ${
                  isSelected 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side Forms */}
        <div className="md:col-span-3">
          <div className="glass border border-border rounded-2xl p-8 space-y-6">
            
            {/* Account Panel */}
            {activeTab === "account" && (
              <form onSubmit={handleSaveAccount} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Account Profile</h3>
                  <p className="text-muted-foreground text-xs">Manage your personal data credentials and corporate organization values.</p>
                </div>
                <hr className="border-border" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">System Role</label>
                    <div className="w-full bg-secondary/40 border border-border rounded-lg py-2.5 px-4 text-xs text-muted-foreground capitalize font-semibold cursor-not-allowed">
                      {user?.role.replace("_", " ") || "Recruiter"} (System Gated)
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Organization Name</label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-secondary disabled:text-muted-foreground text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Account Details</span>
                  </button>
                </div>
              </form>
            )}

            {/* Appearance Panel */}
            {activeTab === "appearance" && (
              <form onSubmit={handleSaveAppearance} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Branding & Theme Settings</h3>
                  <p className="text-muted-foreground text-xs">Calibrate dark/light themes, screen sizing parameters, and visual alignments.</p>
                </div>
                <hr className="border-border" />
                
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Interface Theme Mode</label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="inline-flex items-center space-x-2.5 px-5 py-3 border border-border bg-background/50 text-foreground hover:text-foreground hover:bg-secondary rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <span>Toggle current theme mode</span>
                    </button>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
                      Active: {theme}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Interface Sizing Density</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "compact", label: "Compact density" },
                      { id: "standard", label: "Standard spacing" },
                      { id: "spacious", label: "Spacious layout" }
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDensity(d.id as any)}
                        className={`py-3 px-4 border rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${
                          density === d.id 
                            ? "bg-indigo-600/10 border-indigo-500 text-indigo-500 shadow" 
                            : "bg-background/20 border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <span>Save Layout State</span>
                  </button>
                </div>
              </form>
            )}

            {/* AI Models Panel */}
            {activeTab === "models" && (
              <form onSubmit={handleSaveAIWeights} className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-1">AI Scoring Calibration</h3>
                    <p className="text-muted-foreground text-xs">Calibrate what portions of candidate CV profiles carry more weight during matches.</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 border rounded-full ${
                    totalPercentage === 100 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  }`}>
                    Total: {totalPercentage}%
                  </span>
                </div>
                <hr className="border-border" />
                
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
                      <span className="font-semibold text-muted-foreground col-span-2">{s.label}</span>
                      <input
                        type="range"
                        min="0"
                        max="1.0"
                        step="0.05"
                        value={weights[s.key]}
                        onChange={(e) => handleWeightChange(s.key, parseFloat(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                      <span className="font-bold text-foreground text-right">
                        {Math.round(weights[s.key] * 100)}%
                      </span>
                    </div>
                  ))}
                </div>

                <hr className="border-border" />
                
                <div>
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">API Environment Configurations</h4>
                  <div className="flex items-center space-x-3 text-xs leading-normal">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      geminiConfigured 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}>
                      <ShieldCheck className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground block">
                        Google Gemini Integration Status: {geminiConfigured ? "Connected" : "Not Configured"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {geminiConfigured 
                          ? "API active. Resume analysis pipeline fully operating on Gemini Models." 
                          : "Set GEMINI_API_KEY environment variable to active cloud intelligence parser."
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-secondary disabled:text-muted-foreground text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Parameters</span>
                  </button>
                </div>
              </form>
            )}

            {/* Privacy Panel */}
            {activeTab === "privacy" && (
              <form onSubmit={handleSavePrivacy} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Privacy & Compliance</h3>
                  <p className="text-muted-foreground text-xs">Manage data storage policies, diagnostic sharing, and delete system storage details.</p>
                </div>
                <hr className="border-border" />

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Audit Logs Retention Period</label>
                    <select
                      value={logRetention}
                      onChange={(e) => setLogRetention(e.target.value)}
                      className="max-w-md w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none cursor-pointer"
                    >
                      <option value="30">30 Days</option>
                      <option value="90">90 Days</option>
                      <option value="365">1 Year</option>
                      <option value="0">Keep Indefinitely (Forever)</option>
                    </select>
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <input
                      type="checkbox"
                      id="diagnostics"
                      checked={shareDiagnostics}
                      onChange={(e) => setShareDiagnostics(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 mt-0.5 rounded border-border focus:ring-0 focus:ring-offset-0 bg-background cursor-pointer"
                    />
                    <div>
                      <label htmlFor="diagnostics" className="text-xs font-bold text-foreground block cursor-pointer">Share anonymized diagnostic data</label>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Help us trace errors and optimize processing latency logs. No candidates profiles are transmitted.</span>
                    </div>
                  </div>

                  <hr className="border-border" />

                  <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl space-y-3.5">
                    <h4 className="text-xs font-bold text-rose-500">Danger Zone</h4>
                    <p className="text-[10.5px] text-muted-foreground leading-normal">
                      Clearing the local cache will reset interface configs, preferences, and prompt settings. User DB information will remain intact.
                    </p>
                    <button
                      type="button"
                      onClick={clearAllCaches}
                      className="inline-flex items-center px-4 py-2 border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      <span>Clear browser settings cache</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <span>Save Compliance Rules</span>
                  </button>
                </div>
              </form>
            )}

            {/* Security Panel */}
            {activeTab === "security" && (
              <form onSubmit={handleSaveSecurity} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Security & Session Control</h3>
                  <p className="text-muted-foreground text-xs">Change password configurations, check login credentials, and review tokens.</p>
                </div>
                <hr className="border-border" />

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Current Password</label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-secondary disabled:text-muted-foreground text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update Account Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* Memory Panel */}
            {activeTab === "memory" && (
              <form onSubmit={handleSaveMemory} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Copilot RAG Memory</h3>
                  <p className="text-muted-foreground text-xs">Configure matching lookup limits, RAG instructions, and cache weights.</p>
                </div>
                <hr className="border-border" />

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Candidate Match context limit</label>
                      <span className="text-xs font-bold text-foreground">{ragLimit} Candidates</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      step="1"
                      value={ragLimit}
                      onChange={(e) => setRagLimit(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-500"
                    />
                    <span className="block text-[10px] text-muted-foreground mt-1.5">Max context matching candidates injected into Chat Copilot for answers.</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Copilot System Developer instructions</label>
                    <textarea
                      rows={4}
                      value={systemInstruction}
                      onChange={(e) => setSystemInstruction(e.target.value)}
                      className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground outline-none transition-all leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <span>Save Copilot Config</span>
                  </button>
                </div>
              </form>
            )}

            {/* Notifications Panel */}
            {activeTab === "notifications" && (
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Email & Telemetry Notifications</h3>
                  <p className="text-muted-foreground text-xs">Configure what actions trigger real-time updates and weekly digests.</p>
                </div>
                <hr className="border-border" />

                <div className="space-y-5">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="digests"
                      checked={emailDigests}
                      onChange={(e) => setEmailDigests(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 mt-0.5 rounded border-border focus:ring-0 focus:ring-offset-0 bg-background cursor-pointer"
                    />
                    <div>
                      <label htmlFor="digests" className="text-xs font-bold text-foreground block cursor-pointer">Send weekly candidate match digests</label>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Receive summary reports on job scoring updates and newly parsed applications.</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="push"
                      checked={pushAlerts}
                      onChange={(e) => setPushAlerts(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 mt-0.5 rounded border-border focus:ring-0 focus:ring-offset-0 bg-background cursor-pointer"
                    />
                    <div>
                      <label htmlFor="push" className="text-xs font-bold text-foreground block cursor-pointer">Real-time push alerts for high-ranking candidates</label>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Show web notification logs when candidates score above 85% match.</span>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="errors"
                      checked={errorAlerts}
                      onChange={(e) => setErrorAlerts(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 mt-0.5 rounded border-border focus:ring-0 focus:ring-offset-0 bg-background cursor-pointer"
                    />
                    <div>
                      <label htmlFor="errors" className="text-xs font-bold text-foreground block cursor-pointer">Email alerts on resume parsing errors</label>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">Alert if a PDF formatting issue or OCR issue causes parsing workflows to fail.</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    className="inline-flex items-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <span>Save Alert Preferences</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
