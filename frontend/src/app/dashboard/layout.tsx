"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  Sparkles, LayoutDashboard, Briefcase, UploadCloud, Users, 
  MessageSquare, BarChart3, Settings, LogOut, Sun, Moon, 
  Bell, ChevronDown, Menu, X, CheckCircle 
} from "lucide-react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from "firebase/firestore";
import { db } from "@/utils/firebase";

export const getNotificationUserId = (user: any, token: string | null) => {
  if (!user) return null;
  if (token && !token.startsWith("mock-token-") && token.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.sub && payload.iss && payload.iss.includes("securetoken.google.com")) {
        return payload.sub;
      }
    } catch (e) {
      console.error("Error parsing JWT for UID:", e);
    }
  }
  return `local-${user.id}`;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  const { 
    user, token, clearAuth, theme, toggleTheme,
    selectedJobId, setSelectedJobId,
    notifications, setNotifications, markNotificationRead
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth Guard: redirect to login if no token and component is mounted
  useEffect(() => {
    if (mounted && !token) {
      router.push("/auth");
    }
  }, [token, router, mounted]);

  // Load jobs for global filter
  useEffect(() => {
    if (token) {
      setJobsLoading(true);
      api.get("/jobs/")
        .then((res) => {
          setJobs(res.data);
        })
        .catch((err) => console.error("Error loading jobs for filter:", err))
        .finally(() => setJobsLoading(false));
    }
  }, [token]);

  // Load notifications: REST API first (always works), then upgrade to Firestore real-time if available
  useEffect(() => {
    if (!token || !user) return;

    // Helper to load from REST API (primary, always available)
    const loadFromRest = () => {
      api.get("/notifications/")
        .then((res) => {
          const formatted = res.data.map((n: any) => ({
            id: String(n.id),
            userId: `local-${n.user_id}`,
            title: n.title,
            message: n.message,
            type: n.notification_type || "info",
            read: n.is_read,
            createdAt: n.created_at,
            actionUrl: null,
            metadata: {}
          }));
          setNotifications(formatted);
        })
        .catch((err) => console.error("REST notifications load failed:", err));
    };

    // Always load from REST immediately for instant data
    loadFromRest();

    // Try to enhance with Firestore real-time listener (optional)
    const userId = getNotificationUserId(user, token);
    if (!userId) return;

    let unsubscribe: (() => void) | null = null;
    try {
      const q = query(
        collection(db, "users", userId, "notifications"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || "info",
            read: data.read || false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
            actionUrl: data.actionUrl || null,
            metadata: data.metadata || {}
          });
        });
        if (list.length > 0) {
          setNotifications(list);
        }
      }, (error) => {
        // Firestore listener error — already have REST data, just log quietly
        console.warn("Firestore real-time listener unavailable, using REST fallback:", error.code);
        loadFromRest();
      });
    } catch (e) {
      // Firestore setup threw synchronously (e.g. missing config) — REST already loaded
      console.warn("Firestore listener could not be initialized:", e);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [token, user, setNotifications]);

  const handleMarkAsRead = async (id: string) => {
    markNotificationRead(id);
    
    const sqlId = parseInt(id.replace("notif_", "").split("_")[0], 10) || parseInt(id, 10);
    if (!isNaN(sqlId)) {
      try {
        await api.post(`/notifications/${sqlId}/read`);
      } catch (err) {
        console.error("Failed to mark SQL notification as read:", err);
      }
    } else {
      try {
        await api.post(`/notifications/${id}/read`);
      } catch {}
    }

    if (token && user) {
      const userId = getNotificationUserId(user, token);
      if (userId) {
        try {
          const docRef = doc(db, "users", userId, "notifications", id);
          await updateDoc(docRef, { read: true });
        } catch (err) {
          console.error("Failed to update read status in Firestore:", err);
        }
      }
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted || !token || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  const navLinks = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
    { name: "Upload", href: "/dashboard/upload", icon: UploadCloud },
    { name: "Candidates", href: "/dashboard/candidates", icon: Users },
    { name: "Copilot Chat", href: "/dashboard/copilot", icon: MessageSquare },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const currentJob = jobs.find((j) => j.id === selectedJobId);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const handleLogout = () => {
    clearAuth();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/85 backdrop-blur-md p-6 justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse-slow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              ARS<span className="text-indigo-400 font-normal">.ai</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white shadow">
              {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-bold text-foreground truncate">{user.full_name || "User"}</span>
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider capitalize">
                {user.role.replace("_", " ")}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5 text-muted-foreground" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar - Mobile Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card p-6 flex flex-col justify-between transform transition-transform duration-300 lg:hidden ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">ARS.ai</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">
              {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-bold text-foreground truncate">{user.full_name || "User"}</span>
              <span className="block text-[10px] text-muted-foreground font-bold uppercase tracking-wider capitalize">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="h-16 border-b border-border bg-background/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Job Filter */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 bg-secondary/60 border border-border rounded-lg px-3.5 py-1.5 text-xs text-foreground hover:border-indigo-500/50 transition-colors cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                <span className="font-semibold max-w-[150px] truncate">
                  {currentJob ? currentJob.title : "All Jobs Filter"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {showFilterDropdown && (
                <div className="absolute left-0 mt-2 w-64 glass border border-border rounded-xl shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border mb-1">
                    Select Target Job
                  </div>
                  <button
                    onClick={() => { setSelectedJobId(null); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-secondary/50 transition-colors cursor-pointer ${
                      selectedJobId === null ? "text-indigo-500 font-bold" : "text-foreground"
                    }`}
                  >
                    All Candidates (No Filter)
                  </button>
                  {jobsLoading ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground animate-pulse">Loading jobs...</div>
                  ) : (
                    jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => { setSelectedJobId(job.id); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary/50 transition-colors truncate block cursor-pointer ${
                          selectedJobId === job.id ? "text-indigo-500 font-bold" : "text-foreground"
                        }`}
                      >
                        {job.title}
                        {job.department && <span className="block text-[9px] text-muted-foreground">{job.department}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            
            {/* Dark Mode toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-sm"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Notification center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="w-9 h-9 rounded-lg border border-border bg-card hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground relative transition-colors cursor-pointer shadow-sm"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse border-2 border-background" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 glass border border-border rounded-xl shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
                    {unreadNotifs > 0 && (
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                        {unreadNotifs} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">No notifications.</div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => handleMarkAsRead(notif.id)}
                          className={`p-3.5 text-left cursor-pointer hover:bg-secondary/40 transition-all ${
                            !notif.read ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              notif.type === 'success' ? 'bg-emerald-500' :
                              notif.type === 'info' ? 'bg-sky-500' :
                              notif.type === 'warning' ? 'bg-amber-500' :
                              notif.type === 'error' ? 'bg-rose-500' : 'bg-[#D4AF37]'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-bold ${!notif.read ? 'text-indigo-500 font-extrabold' : 'text-foreground'}`}>
                                {notif.title}
                              </h4>
                              <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">{notif.message}</p>
                              <span className="text-[9px] text-muted-foreground block mt-1.5">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-border text-center">
                    <Link 
                      href="/dashboard/notifications" 
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 block py-1.5"
                    >
                      View All Notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white text-xs">
              {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          {children}
        </main>
      </div>

    </div>
  );
}
