"use client";

import { useState, useEffect, useRef } from "react";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  MessageSquare, Send, Sparkles, RefreshCw, Trash2, 
  HelpCircle, User, Cpu, ArrowRight, CheckCircle2,
  Share2, Mic
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  suggested_candidates?: any[];
}

export default function CopilotPage() {
  const { selectedJobId, user, token } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setRecognizing(true);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setRecognizing(false);
    };

    recognition.onend = () => {
      setRecognizing(false);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      
      const { createLocalNotification } = await import("@/utils/notifications");
      createLocalNotification(
        user,
        token,
        "Voice Transcription Completed",
        `Voice query successfully transcribed: "${transcript.substring(0, 40)}..."`,
        "success"
      );
    };

    recognition.start();
  };

  const handleShareChat = async () => {
    try {
      const shareUrl = `${window.location.origin}/dashboard/copilot?session=${sessionId}`;
      await navigator.clipboard.writeText(shareUrl);
      alert("Chat session link copied to clipboard!");
      
      const { createLocalNotification } = await import("@/utils/notifications");
      createLocalNotification(
        user,
        token,
        "Chat Shared",
        "Chat session link copied to clipboard successfully.",
        "info"
      );
    } catch (e) {
      console.error("Failed to copy link:", e);
    }
  };

  // Generate or fetch session ID on mount
  useEffect(() => {
    let sessId = localStorage.getItem("ars_chat_session");
    if (!sessId) {
      sessId = `session-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("ars_chat_session", sessId);
    }
    setSessionId(sessId);
    
    // Load historical logs
    api.get(`/copilot/history/${sessId}`)
      .then((res) => {
        const history = res.data.map((m: any) => ({
          role: m.role,
          content: m.message_text
        }));
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Welcome message
          setMessages([
            {
              role: "assistant",
              content: "Welcome to the ARS Recruiting Intelligence Copilot! I can help you search, compare, and analyze candidates in your database. What can I help you find today?"
            }
          ]);
        }
      })
      .catch((err) => console.error("Error loading chat history:", err));
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;
    
    if (!textToSend) setInput("");
    
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post("/copilot/chat", {
        session_id: sessionId,
        message: text,
        job_id: selectedJobId || null
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: res.data.answer,
        suggested_candidates: res.data.suggested_candidates
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an issue retrieving matches. Ensure your FastAPI server and ChromaDB are online."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Clear all copilot conversation logs for this session?")) {
      try {
        await api.delete(`/copilot/history/${sessionId}`);
        setMessages([
          {
            role: "assistant",
            content: "Conversation history cleared. Let me know how I can assist with screening."
          }
        ]);
      } catch (err) {
        console.error("Error clearing history:", err);
      }
    }
  };

  const sampleQuestions = [
    "Who is the best candidate?",
    "Which candidates know Python?",
    "Show candidates with AWS experience.",
    "Who has 5+ years experience?",
    "Compare the top two candidates."
  ];

  return (
    <div className="space-y-8 h-[calc(100vh-140px)] flex flex-col justify-between">
      
      {/* Title Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">AI Recruiter Copilot</h1>
          <p className="text-muted-foreground text-sm mt-1">Ask questions about candidates, compare logs, and review strengths.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleShareChat}
            className="inline-flex items-center space-x-2 px-3 py-1.5 border border-border bg-card hover:bg-secondary hover:text-indigo-500 text-xs text-muted-foreground rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Share Chat Session"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Chat</span>
          </button>
          <button
            onClick={handleClearHistory}
            className="inline-flex items-center space-x-2 px-3 py-1.5 border border-border bg-card hover:bg-secondary hover:text-rose-500 text-xs text-muted-foreground rounded-lg transition-colors shadow-sm cursor-pointer"
            title="Clear Conversation History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Main Work Area split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 mb-4">
        
        {/* Left Side: Suggested Questions Panel */}
        <div className="hidden lg:block glass rounded-2xl p-6 overflow-y-auto">
          <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center space-x-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Suggested Prompts</span>
          </span>
          <div className="space-y-2">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="w-full text-left p-3 border border-border bg-card/50 hover:bg-secondary hover:border-indigo-500/30 rounded-xl text-xs text-muted-foreground hover:text-foreground transition-all text-ellipsis overflow-hidden shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Center/Right: Chat Screen */}
        <div className="lg:col-span-3 glass rounded-2xl flex flex-col justify-between overflow-hidden">
          
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex space-x-4 max-w-3xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar Icon */}
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 border ${
                  msg.role === 'user'
                    ? 'bg-card border-border text-foreground shadow-sm'
                    : 'bg-indigo-600/15 border-indigo-500/20 text-indigo-500 shadow shadow-indigo-500/5'
                }`}>
                  {msg.role === 'user' ? <User className="w-4.5 h-4.5" /> : <Cpu className="w-4.5 h-4.5 animate-pulse-slow" />}
                </div>

                {/* Message Body bubble */}
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/5 border-indigo-500/10 text-foreground'
                      : 'bg-card border-border text-foreground shadow-sm'
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>

                  {/* Candidate recommendations attachments */}
                  {msg.suggested_candidates && msg.suggested_candidates.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                      {msg.suggested_candidates.map((c: any) => (
                        <div 
                          key={c.id}
                          className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex justify-between items-center text-xs hover:border-indigo-500 transition-colors"
                        >
                          <div>
                            <span className="font-bold text-foreground block truncate max-w-[120px]">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5 truncate max-w-[150px]">
                              {c.skills?.slice(0, 3).join(", ") || "No skills listed"}
                            </span>
                          </div>
                          <a 
                            href={`/dashboard/candidates`}
                            className="p-1.5 bg-card hover:bg-secondary border border-border rounded-lg text-indigo-500 hover:text-indigo-600 shadow-sm transition-colors"
                            title="Go to candidate details page"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex space-x-4 max-w-lg">
                <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                  <Cpu className="w-4.5 h-4.5 animate-spin" />
                </div>
                <div className="p-4 bg-card border border-border rounded-2xl text-xs text-muted-foreground animate-pulse flex items-center space-x-2 shadow-sm">
                  <span>Recruiter agent scanning database...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Text Input Row */}
          <div className="p-4 border-t border-border bg-secondary/30">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center space-x-3 bg-card border border-border focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 rounded-xl p-1.5 transition-all shadow-sm"
            >
              <input
                type="text"
                placeholder="Query candidate databases (e.g. 'Show candidates with python & 5 years experience')"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs text-foreground placeholder-muted-foreground outline-none px-3"
              />
              <button
                type="button"
                onClick={startSpeechRecognition}
                className={`p-2.5 rounded-lg border border-border transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                  recognizing ? "bg-red-500/20 border-red-500 text-red-500 animate-pulse" : "bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
                }`}
                title="Voice Search Query"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-secondary disabled:text-muted-foreground text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
