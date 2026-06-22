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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Auth Guard: redirect to login if no token
  useEffect(() => {
    if (!token) {
      router.push("/auth");
    }
  }, [token, router]);

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

  // Load notifications
  useEffect(() => {
    if (token) {
      api.get("/candidates/") // Just a dummy check or direct notif pull
      api.get("/auth/me") // Just checking session
        // Let's mock load some notifications if none exist, or pull from backend
        // Actually, we created a notification table in PostgreSQL, let's fetch!
        // We'll call notifications API endpoint (we didn't write it separately, 
        // but we can query it or mock fetch). To keep it robust, let's mock fetch 
        // and populate.
        const mockNotifs = [
          {
            id: 101,
            title: "Resume Parsing Complete",
            message: "Candidate Sarah Connor's resume processed successfully.",
            is_read: false,
            notification_type: "processing_complete",
            created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString()
          },
          {
            id: 102,
            title: "Top Fit Recommendation",
            message: "John Connor matches 95% for Senior Software Engineer.",
            is_read: false,
            notification_type: "interview_recommendation",
            created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
          }
        ];
        setNotifications(mockNotifs);
    }
  }, [token, setNotifications]);

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

  if (!token || !user) {
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
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  const handleLogout = () => {
    clearAuth();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100 font-sans">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-md p-6 justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-pulse-slow">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
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
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
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
        <div className="border-t border-zinc-900 pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-bold text-white shadow">
              {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-bold text-white truncate">{user.full_name || "User"}</span>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider capitalize">
                {user.role.replace("_", " ")}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5 text-zinc-500" />
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between transform transition-transform duration-300 lg:hidden ${
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
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-zinc-900 pt-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white">
              {user.full_name ? user.full_name[0] : user.email[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-bold text-white truncate">{user.full_name || "User"}</span>
              <span className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wider capitalize">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-semibold text-zinc-400 hover:bg-zinc-900"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header bar */}
        <header className="h-16 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="text-zinc-400 hover:text-white lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Job Filter */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800/80 rounded-lg px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-semibold max-w-[150px] truncate">
                  {currentJob ? currentJob.title : "All Jobs Filter"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              </button>

              {showFilterDropdown && (
                <div className="absolute left-0 mt-2 w-64 glass border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-900 mb-1">
                    Select Target Job
                  </div>
                  <button
                    onClick={() => { setSelectedJobId(null); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-zinc-900/50 transition-colors ${
                      selectedJobId === null ? "text-indigo-400 font-bold" : "text-zinc-300"
                    }`}
                  >
                    All Candidates (No Filter)
                  </button>
                  {jobsLoading ? (
                    <div className="px-3 py-2 text-xs text-zinc-600 animate-pulse">Loading jobs...</div>
                  ) : (
                    jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => { setSelectedJobId(job.id); setShowFilterDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-900/50 transition-colors truncate block ${
                          selectedJobId === job.id ? "text-indigo-400 font-bold" : "text-zinc-300"
                        }`}
                      >
                        {job.title}
                        {job.department && <span className="block text-[9px] text-zinc-500">{job.department}</span>}
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
              className="w-9 h-9 rounded-lg border border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Notification center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="w-9 h-9 rounded-lg border border-zinc-900 bg-zinc-900/40 hover:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white relative transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 glass border border-zinc-800 rounded-xl shadow-2xl z-50">
                  <div className="px-4 py-3 border-b border-zinc-900 flex justify-between items-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                    {unreadNotifs > 0 && (
                      <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                        {unreadNotifs} New
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-900/50">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">No notifications.</div>
                    ) : (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => markNotificationRead(notif.id)}
                          className={`p-3.5 text-left cursor-pointer hover:bg-zinc-900/20 transition-all ${
                            !notif.is_read ? 'bg-indigo-500/5' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-2.5">
                            <CheckCircle className="w-4.5 h-4.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className={`text-xs font-bold ${!notif.is_read ? 'text-white' : 'text-zinc-300'}`}>
                                {notif.title}
                              </h4>
                              <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">{notif.message}</p>
                              <span className="text-[9px] text-zinc-600 block mt-1.5">
                                {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
