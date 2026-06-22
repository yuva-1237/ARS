"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { auth as firebaseAuth } from "@/utils/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { Sparkles, Shield, Mail, Lock, User, Briefcase, AlertCircle, CheckCircle, Sun, Moon } from "lucide-react";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, token, theme, toggleTheme } = useStore();
  const [mounted, setMounted] = useState(false);

  const [tab, setTab] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("recruiter");

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync tab state from URL params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "signup") {
      setTab("signup");
    } else if (tabParam === "login") {
      setTab("login");
    }
  }, [searchParams]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (tab === "login") {
        let userProfile = null;
        let tokenStr = "";

        // 1. Try local database authentication first (for seeded admin accounts)
        try {
          const response = await api.post("/auth/login/json", { email, password });
          userProfile = response.data.user;
          tokenStr = response.data.access_token;
        } catch (localErr) {
          // 2. Fallback to Firebase Authentication
          const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
          const firebaseUser = userCredential.user;
          tokenStr = await firebaseUser.getIdToken();
          
          // Hydrate profile from backend get_current_user (which auto-creates records if missing)
          const profileResponse = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${tokenStr}` }
          });
          userProfile = profileResponse.data;
        }

        setAuth(userProfile, tokenStr);
        setSuccess("Login successful! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 800);

      } else if (tab === "signup") {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
          throw new Error("All fields are required");
        }

        let userProfile = null;
        let tokenStr = "";

        try {
          // 1. Try Firebase Signup
          const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
          const firebaseUser = userCredential.user;
          tokenStr = await firebaseUser.getIdToken();

          // Mirror in local PostgreSQL database
          try {
            await api.post("/auth/signup", {
              email,
              password,
              full_name: fullName,
              role
            });
          } catch (dbErr) {}

          // Fetch local PostgreSQL profile details using the Firebase Token
          const profileResponse = await api.get("/auth/me", {
            headers: { Authorization: `Bearer ${tokenStr}` }
          });
          userProfile = profileResponse.data;

        } catch (firebaseErr) {
          // 2. Local Fallback Signup (if Firebase fails or is blocked)
          await api.post("/auth/signup", {
            email,
            password,
            full_name: fullName,
            role
          });
          
          // Log in locally immediately
          const loginResponse = await api.post("/auth/login/json", { email, password });
          userProfile = loginResponse.data.user;
          tokenStr = loginResponse.data.access_token;
        }

        // Hydrate state and redirect to dashboard immediately
        setAuth(userProfile, tokenStr);
        setSuccess("Registration successful! Logging you in...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 800);

      } else {
        // Forgot password - trigger Firebase reset email
        await sendPasswordResetEmail(firebaseAuth, email);
        // Call backend endpoint for logging/audit purposes
        try {
          await api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
        } catch {}
        setSuccess("Password reset instructions have been emailed to you.");
      }
    } catch (err: any) {
      let msg = err.message || "An unexpected error occurred. Please verify your credentials.";
      if (err.code === "auth/operation-not-allowed" || msg.includes("auth/operation-not-allowed")) {
        msg = "Firebase Email/Password Authentication is currently disabled. Please go to the Firebase Console (Authentication -> Sign-in method -> Email/Password) and toggle 'Enable' to activate logins.";
      }
      setError(err.response?.data?.detail || msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-4 overflow-hidden">
      
      {/* Dark Mode toggle */}
      {mounted && (
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 w-9 h-9 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-sm z-50"
          title="Toggle Theme"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      )}

      {/* Background glow spot */}
      <div className="glow-mesh top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              ARS<span className="text-indigo-400 font-normal">.ai</span>
            </span>
          </Link>
          <p className="text-muted-foreground text-sm">Recruitment Intelligence Platform</p>
        </div>

        {/* Card Frame */}
        <div className="glass rounded-2xl border border-border p-8 shadow-2xl">
          
          {/* Header tabs (only when not in forgot password mode) */}
          {tab !== "forgot" && (
            <div className="flex border-b border-border pb-4 mb-6">
              <button
                onClick={() => { setTab("login"); setError(null); setSuccess(null); }}
                className={`flex-1 text-center font-semibold text-sm pb-2 border-b-2 transition-all cursor-pointer ${
                  tab === "login" 
                    ? "border-indigo-500 text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab("signup"); setError(null); setSuccess(null); }}
                className={`flex-1 text-center font-semibold text-sm pb-2 border-b-2 transition-all cursor-pointer ${
                  tab === "signup" 
                    ? "border-indigo-500 text-foreground" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {tab === "forgot" && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Reset Password</h2>
              <p className="text-muted-foreground text-xs">Enter your email address and we will send you instructions.</p>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-500 text-sm mb-6">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-emerald-500 text-sm mb-6">
              <CheckCircle className="w-4.5 h-4.5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {tab !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={() => { setTab("forgot"); setError(null); setSuccess(null); }}
                      className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
            )}

            {tab === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Role Selection
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["recruiter", "hr_manager", "admin"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-2 px-3 border rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                        role === r 
                          ? "bg-indigo-600/15 border-indigo-500 text-indigo-650 dark:text-indigo-300 shadow shadow-indigo-500/10" 
                          : "bg-secondary/30 border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {r.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-lg text-sm transition-all shadow-lg hover:shadow-indigo-600/20 active:scale-[0.99] cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : tab === "login" ? (
                "Sign In"
              ) : tab === "signup" ? (
                "Create Account"
              ) : (
                "Send Reset Email"
              )}
            </button>
          </form>

          {/* Footer controls */}
          {tab === "forgot" && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setTab("login"); setError(null); setSuccess(null); }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {/* Demo Accounts Panel */}
        <div className="mt-6 p-4 rounded-xl border border-border bg-secondary/30 text-center">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-2.5">
            Demo Credentials (Database Seeded)
          </span>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
            <div>
              <span className="font-bold text-muted-foreground block">Admin</span>
              admin@ars.com<br />adminpass
            </div>
            <div>
              <span className="font-bold text-muted-foreground block">Recruiter</span>
              recruiter@ars.com<br />recruiterpass
            </div>
            <div>
              <span className="font-bold text-muted-foreground block">HR Manager</span>
              hr@ars.com<br />hrpass
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-secondary border-t-indigo-500 animate-spin" />
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}
