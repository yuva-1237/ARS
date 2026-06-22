"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  Users, Briefcase, Award, TrendingUp, Sparkles, 
  Clock, ArrowUpRight, BarChart3, PieChartIcon 
} from "lucide-react";

const getFriendlyTime = (dateStr: string) => {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return "";
  }
};
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";

export default function DashboardOverview() {
  const { selectedJobId, theme, notifications } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch telemetry analytics
  useEffect(() => {
    setLoading(true);
    // Add optional job_id query parameter
    const url = selectedJobId ? `/analytics/?job_id=${selectedJobId}` : "/analytics/";
    api.get(url)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));
  }, [selectedJobId]);

  // Load activity feed from store notifications
  const activities = notifications.slice(0, 5).map((n) => ({
    id: n.id,
    action: n.title,
    detail: n.message,
    time: getFriendlyTime(n.createdAt),
    type: n.type
  }));

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-secondary rounded" />
          <div className="h-6 w-24 bg-secondary rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-2xl p-6" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-card border border-border rounded-2xl p-6" />
          <div className="h-80 bg-card border border-border rounded-2xl p-6" />
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;
  const COLORS = ["#6366f1", "#818cf8", "#14b8a6", "#22d3ee", "#a78bfa", "#f43f5e"];

  // Responsive chart theme configurations
  const isDark = theme !== "light";
  const strokeColor = isDark ? "#222222" : "#e5e7eb";
  const textColor = isDark ? "#a1a1aa" : "#6b7280";
  const tooltipBg = isDark ? "#111111" : "#ffffff";
  const tooltipBorder = isDark ? "#222222" : "#e5e7eb";
  const tooltipLabel = isDark ? "#ffffff" : "#111827";

  // Metrics configurations
  const metricCards = [
    { 
      title: "Total Candidates", 
      value: metrics.total_candidates, 
      desc: `${metrics.resume_total} uploads total`, 
      icon: Users,
      color: "text-indigo-500"
    },
    { 
      title: "Active Jobs", 
      value: metrics.active_jobs, 
      desc: "Job boards active", 
      icon: Briefcase,
      color: "text-teal-500"
    },
    { 
      title: "Avg Match Score", 
      value: `${metrics.avg_match_score}%`, 
      desc: "Overall suitability", 
      icon: Award,
      color: "text-violet-500"
    },
    { 
      title: "Processing Rate", 
      value: `${metrics.processing_rate}%`, 
      desc: "Queue processing rate", 
      icon: TrendingUp,
      color: "text-cyan-500"
    }
  ];

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Recruitment Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Overview of candidate screening status and AI matching analytics.</p>
        </div>
        <div className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-bold px-3 py-1.5 rounded-full inline-flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Active</span>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass border border-border rounded-2xl p-6 relative overflow-hidden transition-all hover:border-indigo-500/50 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{card.title}</span>
                  <span className="block text-3xl font-extrabold text-foreground mt-2 tracking-tight">{card.value}</span>
                </div>
                <div className={`p-2.5 bg-secondary rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-4 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Applications / Candidate funnel */}
        <div className="lg:col-span-2 glass border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Applications Funnel</h3>
                <p className="text-xs text-muted-foreground">Pipeline progression stages</p>
              </div>
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.candidate_funnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} vertical={false} />
                  <XAxis dataKey="stage" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                    itemStyle={{ color: tooltipLabel }}
                    labelStyle={{ color: textColor, fontSize: "11px", fontWeight: "bold" }}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {charts.candidate_funnel.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Skill Gap Analysis */}
        <div className="glass border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Top Core Skills</h3>
                <p className="text-xs text-muted-foreground">Skills frequency distribution</p>
              </div>
              <PieChartIcon className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="h-48 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.skill_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {charts.skill_distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                    itemStyle={{ color: tooltipLabel }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-foreground">{charts.skill_distribution.length}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Indexed</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-muted-foreground">
              {charts.skill_distribution.slice(0, 4).map((skill: any, idx: number) => (
                <div key={idx} className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="truncate">{skill.name} ({skill.count})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Experience Breakdown Chart */}
        <div className="lg:col-span-2 glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground">Experience Distribution</h3>
              <p className="text-xs text-muted-foreground">Candidate years of professional logs</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>
          
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.experience_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                  itemStyle={{ color: tooltipLabel }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass border border-border rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-foreground">Activity Feed</h3>
                <p className="text-xs text-muted-foreground">Real-time system events</p>
              </div>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">No recent events.</div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start space-x-3 text-xs leading-normal">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      act.type === 'success' ? 'bg-emerald-500' :
                      act.type === 'info' ? 'bg-sky-500' :
                      act.type === 'warning' ? 'bg-amber-500' :
                      act.type === 'error' ? 'bg-rose-500' : 'bg-[#D4AF37]'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-foreground block">{act.action}</span>
                      <span className="text-muted-foreground block truncate mt-0.5">{act.detail}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">{act.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <Link 
            href="/dashboard/notifications"
            className="w-full text-center py-2 bg-card hover:bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold mt-6 transition-colors border border-border cursor-pointer shadow-sm block"
          >
            View All Notifications
          </Link>
        </div>

      </div>

    </div>
  );
}
