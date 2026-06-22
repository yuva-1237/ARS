"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  Users, Briefcase, Award, TrendingUp, Sparkles, 
  Clock, ArrowUpRight, BarChart3, PieChartIcon 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from "recharts";

export default function DashboardOverview() {
  const { selectedJobId } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

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

  // Load activity feed
  useEffect(() => {
    // Seed some activity logs
    const mockActivities = [
      { id: 1, action: "Resume parsed", detail: "John Connor - Senior Dev", time: "5 mins ago", type: "success" },
      { id: 2, action: "AI Job Extraction", detail: "Software Engineer role mapped", time: "1 hr ago", type: "info" },
      { id: 3, action: "Candidate matched", detail: "Sarah Connor scored 89% for Dev", time: "2 hrs ago", type: "match" },
      { id: 4, action: "Verification Alert", detail: "Keyword Stuffing flag on Candidate #3", time: "4 hrs ago", type: "warn" }
    ];
    setActivities(mockActivities);
  }, []);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-6 w-24 bg-zinc-800 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6" />
          <div className="h-80 bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6" />
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;
  const COLORS = ["#6366f1", "#818cf8", "#14b8a6", "#22d3ee", "#a78bfa", "#f43f5e"];

  // Metrics configurations
  const metricCards = [
    { 
      title: "Total Candidates", 
      value: metrics.total_candidates, 
      desc: `${metrics.resume_total} uploads total`, 
      icon: Users,
      color: "text-indigo-400"
    },
    { 
      title: "Active Jobs", 
      value: metrics.active_jobs, 
      desc: "Job boards active", 
      icon: Briefcase,
      color: "text-teal-400"
    },
    { 
      title: "Avg Match Score", 
      value: `${metrics.avg_match_score}%`, 
      desc: "Overall suitability", 
      icon: Award,
      color: "text-violet-400"
    },
    { 
      title: "Processing Rate", 
      value: `${metrics.processing_rate}%`, 
      desc: "Queue processing rate", 
      icon: TrendingUp,
      color: "text-cyan-400"
    }
  ];

  return (
    <div className="space-y-8">
      
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Recruitment Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Overview of candidate screening status and AI matching analytics.</p>
        </div>
        <div className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-3 py-1.5 rounded-full inline-flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Active</span>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="glass border border-zinc-900 rounded-2xl p-6 relative overflow-hidden transition-all hover:border-zinc-800">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{card.title}</span>
                  <span className="block text-3xl font-extrabold text-white mt-2 tracking-tight">{card.value}</span>
                </div>
                <div className={`p-2.5 bg-zinc-900 rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-zinc-400 mt-4 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Applications / Candidate funnel */}
        <div className="lg:col-span-2 glass border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Applications Funnel</h3>
                <p className="text-xs text-zinc-500">Pipeline progression stages</p>
              </div>
              <BarChart3 className="w-4 h-4 text-zinc-500" />
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.candidate_funnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="stage" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                    itemStyle={{ color: "#fafafa" }}
                    labelStyle={{ color: "#a1a1aa", fontSize: "11px", fontWeight: "bold" }}
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
        <div className="glass border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Top Core Skills</h3>
                <p className="text-xs text-zinc-500">Skills frequency distribution</p>
              </div>
              <PieChartIcon className="w-4 h-4 text-zinc-500" />
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
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                    itemStyle={{ color: "#fafafa" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-white">{charts.skill_distribution.length}</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Indexed</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-zinc-400">
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
        <div className="lg:col-span-2 glass border border-zinc-900 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Experience Distribution</h3>
              <p className="text-xs text-zinc-500">Candidate years of professional logs</p>
            </div>
            <BarChart3 className="w-4 h-4 text-zinc-500" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                  itemStyle={{ color: "#fafafa" }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-bold text-white">Activity Feed</h3>
                <p className="text-xs text-zinc-500">Real-time system events</p>
              </div>
              <Clock className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="space-y-4">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start space-x-3 text-xs leading-normal">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    act.type === 'success' ? 'bg-emerald-500' :
                    act.type === 'info' ? 'bg-sky-500' :
                    act.type === 'match' ? 'bg-indigo-500' : 'bg-amber-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-zinc-200 block">{act.action}</span>
                    <span className="text-zinc-500 block truncate mt-0.5">{act.detail}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-medium whitespace-nowrap">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
          
          <button className="w-full text-center py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold mt-6 transition-colors border border-zinc-850">
            View All Audit Logs
          </button>
        </div>

      </div>

    </div>
  );
}
