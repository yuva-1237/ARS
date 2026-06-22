"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, CheckCircle2, ChevronDown, Sparkles, Shield, 
  Cpu, Users, BarChart3, CloudLightning, MessageSquareText,
  Sun, Moon
} from "lucide-react";
import { useStore } from "@/store/useStore";

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { theme, toggleTheme } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const steps = [
    {
      num: "01",
      title: "Bulk Intake",
      desc: "Drag & drop candidates in PDF, DOCX, TXT, or scanned image resume formats.",
      icon: CloudLightning
    },
    {
      num: "02",
      title: "Gemini Parsing",
      desc: "Extract structured experience, skills, and projects with Generative AI.",
      icon: Cpu
    },
    {
      num: "03",
      title: "AI Semantic Matching",
      desc: "Rank candidates against job descriptions using custom-weighted scoring.",
      icon: Sparkles
    },
    {
      num: "04",
      title: "Recruiter Chat RAG",
      desc: "Interact with your candidate pool using our conversational AI copilot.",
      icon: MessageSquareText
    }
  ];

  const features = [
    {
      title: "Instant Structured Parsing",
      desc: "Convert chaotic resumes into consistent schemas (PostgreSQL) automatically. Extracts contacts, jobs, skills, education, and portfolio links.",
      icon: Users
    },
    {
      title: "AI Fraud & Hype Detection",
      desc: "Detect overlapping dates, keyword stuffing, suspicious experience logs, and embellished qualifications with detailed confidence scores.",
      icon: Shield
    },
    {
      title: "Structured Interview Prep",
      desc: "Generate personalized technical and situational interview questions with ideal guidelines based on candidate gaps.",
      icon: MessageSquareText
    },
    {
      title: "Interactive Analytics Dashboard",
      desc: "Monitor application funnels, visualize skill gap distributions, and export tabular reports instantly in CSV or Excel.",
      icon: BarChart3
    }
  ];

  const faqs = [
    {
      q: "How does the AI matching score work?",
      a: "The scoring engine computes candidate alignment across multiple parameters (Skills, Experience, Education, Projects, and Semantic Similarity). You can customize these weights under your dashboard settings."
    },
    {
      q: "Does it support scanned image resumes?",
      a: "Yes. ARS uses Tesseract OCR to extract text from images and documents before passing it to Gemini's parser."
    },
    {
      q: "Is candidate data kept secure?",
      a: "Absolutely. All resume parsing and embedding actions are run on secure Dockerized containers. Your files are isolated and protected by role-based authorization parameters."
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 selection:bg-indigo-500 selection:text-white font-sans overflow-hidden">
      
      {/* Background glowing effects */}
      <div className="glow-mesh top-[-100px] left-[-100px]"></div>
      <div className="glow-mesh-2 bottom-[-100px] right-[-100px]"></div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 w-full glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              ARS<span className="text-indigo-400 font-normal">.ai</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#faq" className="hover:text-white transition-colors">Documentation</a>
            <a href="#why-free" className="hover:text-white transition-colors">Community</a>
            <a href="mailto:support@ars.ai" className="hover:text-white transition-colors">Support</a>
            <a href="#why-free" className="hover:text-white transition-colors">About ARS</a>
          </nav>

          <div className="flex items-center space-x-4">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-lg border border-zinc-800/50 hover:border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Toggle Theme"
              >
                {theme === "light" ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
              </button>
            )}
            <Link href="/auth" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/auth?tab=signup" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20">
              Start Screening
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6 animate-pulse-slow">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Gen Recruitment Agent</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
            AI-Powered Resume Screening <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-teal-300 bg-clip-text text-transparent">
              for Modern Hiring Teams
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            Screen, rank, analyze, and hire candidates faster using Generative AI. 
            Automated structured parser, custom semantic matching weights, and a RAG-based recruitment copilot.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
            <Link href="/auth?tab=signup" className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-xl shadow-indigo-600/30 hover:scale-[1.02]">
              <span>Start Screening</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#why-free" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/80 font-semibold rounded-xl transition-colors">
              Why ARS is Free
            </a>
          </div>
        </motion.div>

        {/* Dashboard Mock Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative max-w-5xl mx-auto rounded-2xl border border-zinc-800 bg-zinc-950/80 p-2 shadow-2xl shadow-indigo-500/5 overflow-hidden"
        >
          <div className="w-full h-4 bg-zinc-900/50 rounded-t-lg flex items-center px-3 space-x-1.5 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <div className="aspect-[16/9] w-full rounded-b-xl bg-zinc-900 flex flex-col items-center justify-center relative overflow-hidden border border-zinc-800/30">
            {/* Mock Dashboard UI elements */}
            <div className="absolute inset-0 flex flex-col p-6 text-left">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4 mb-6">
                <div className="h-5 w-40 bg-zinc-800 rounded animate-pulse" />
                <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
              </div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="h-24 bg-zinc-800/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-between">
                  <div className="h-4 w-20 bg-zinc-800 rounded" />
                  <div className="h-8 w-12 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-24 bg-zinc-800/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-between">
                  <div className="h-4 w-24 bg-zinc-800 rounded" />
                  <div className="h-8 w-16 bg-zinc-700 rounded animate-pulse" />
                </div>
                <div className="h-24 bg-zinc-800/50 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-between">
                  <div className="h-4 w-28 bg-zinc-800 rounded" />
                  <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex-1 grid grid-cols-3 gap-6">
                <div className="col-span-2 bg-zinc-800/30 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-between">
                  <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
                  <div className="flex-1 flex items-end space-x-4">
                    <div className="h-[60%] w-full bg-indigo-500/20 rounded-t border-t border-indigo-500" />
                    <div className="h-[90%] w-full bg-indigo-500/40 rounded-t border-t border-indigo-500" />
                    <div className="h-[40%] w-full bg-indigo-500/20 rounded-t border-t border-indigo-500" />
                    <div className="h-[75%] w-full bg-indigo-500/30 rounded-t border-t border-indigo-500" />
                  </div>
                </div>
                <div className="bg-zinc-800/30 border border-zinc-800/50 rounded-xl p-4 flex flex-col justify-between">
                  <div className="h-4 w-20 bg-zinc-800 rounded mb-4" />
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-zinc-700 border-t-indigo-500 animate-spin" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent flex items-end justify-center pb-8">
              <span className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">Interactive Live Dashboard</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 border-t border-zinc-900 bg-zinc-950/30 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Four simple phases designed to turn manual candidate screening into automatic structured intelligence.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-4xl font-extrabold text-zinc-700">{step.num}</span>
                    <step.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 font-sans">Core Platform Capabilities</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              A comprehensive screening platform with advanced features outperforming traditional ATS packages.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feat, idx) => (
              <div key={idx} className="p-8 rounded-2xl border border-zinc-800 bg-zinc-900/30 flex space-x-6 hover:border-zinc-700 transition-colors duration-200">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <feat.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ARS is Free Section */}
      <section id="why-free" className="py-24 border-t border-zinc-900 bg-zinc-950/30 relative z-10">
        <div id="about" />
        <div id="community" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                Free Forever
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-bold uppercase tracking-wider">
                Community First
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-bold uppercase tracking-wider">
                Open Access
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Why ARS is Free</h2>
            <p className="text-indigo-400 font-bold text-lg max-w-xl mx-auto mb-4">
              ARS is completely free for everyone.
            </p>
            <p className="text-zinc-400 max-w-2xl mx-auto text-sm leading-relaxed">
              We believe powerful AI recruitment tools shouldn't be gated behind premium pricing tiers. ARS is built as a community-driven ecosystem to give equal access to state-of-the-art resume screening technology.
            </p>
          </div>

          {/* Grid of Reasons */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {[
              {
                title: "Accessible AI for everyone",
                desc: "Empowering talent teams, hiring managers, and candidates globally with premium AI matching without financial barriers.",
              },
              {
                title: "Education and innovation first",
                desc: "Removing high cost-of-entry hurdles to advance hiring tools, enabling modern, merit-based screening criteria.",
              },
              {
                title: "Community-driven platform",
                desc: "Continuously maintained and updated through open feedback loops, engineering guidelines, and recruiter insights.",
              },
              {
                title: "No hidden fees",
                desc: "No credit cards, no trial expiration dates, no sudden billing requests, and no hidden subscription costs.",
              },
              {
                title: "No subscription pressure",
                desc: "Focus purely on finding the right match, not on counting token usage limits or managing complex team licenses.",
              },
              {
                title: "Equal access for all users",
                desc: "Every single registered account receives full, unrestricted access to the entire capabilities suite of the platform.",
              }
            ].map((reason, idx) => (
              <div key={idx} className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-800 transition-all duration-200">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full mb-4" />
                <h3 className="text-base font-bold text-white mb-2">{reason.title}</h3>
                <p className="text-zinc-400 text-xs leading-normal">{reason.desc}</p>
              </div>
            ))}
          </div>

          {/* User Access Box */}
          <div className="max-w-4xl mx-auto rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-8 relative overflow-hidden shadow-xl shadow-indigo-500/5">
            <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <h3 className="text-lg font-bold text-white text-center mb-6 flex items-center justify-center space-x-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
              <span>Unrestricted Capabilities Access</span>
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold text-zinc-350 text-center mb-6">
              {[
                "OpenAI Models",
                "Claude Models",
                "Gemini Models",
                "Chat History",
                "Memory System",
                "Voice Assistant",
                "Image Analysis",
                "File Analysis",
                "Web Search",
                "Research Tools",
                "Future Features",
                "No Restrictions"
              ].map((access, idx) => (
                <div key={idx} className="py-2.5 px-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-center">
                  <span>{access}</span>
                </div>
              ))}
            </div>
            
            <div className="text-center border-t border-zinc-900 pt-5 mt-2">
              <p className="text-xs text-zinc-500">
                No active subscriptions. No hidden costs. Open access for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-zinc-400">Quick answers about our parsing pipeline, system integration, and free access model.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-zinc-800 bg-zinc-900/30 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-white hover:bg-zinc-800/20 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed border-t border-zinc-800/40 pt-4">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 relative z-10 bg-zinc-950/80">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-sm text-zinc-500">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-white">ARS<span className="text-indigo-400 font-normal">.ai</span></span>
          </div>
          
          <div className="flex space-x-8 mb-4 md:mb-0">
            <a href="#features" className="hover:text-zinc-300 transition-colors">Features</a>
            <a href="#faq" className="hover:text-zinc-300 transition-colors">Documentation</a>
            <a href="#why-free" className="hover:text-zinc-300 transition-colors">Community</a>
            <a href="mailto:support@ars.ai" className="hover:text-zinc-300 transition-colors">Support</a>
            <a href="#why-free" className="hover:text-zinc-300 transition-colors">About ARS</a>
          </div>

          <div>
            &copy; {new Date().getFullYear()} ARS AI Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
