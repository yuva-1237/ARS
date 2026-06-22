"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  BarChart3, Download, Sparkles, PieChartIcon, 
  TrendingUp, Award, Users, FileSpreadsheet 
} from "lucide-react";

export default function AnalyticsPage() {
  const { selectedJobId, theme } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = selectedJobId ? `/analytics/?job_id=${selectedJobId}` : "/analytics/";
    api.get(url)
      .then((res) => setData(res.data))
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));
  }, [selectedJobId]);

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-48 bg-secondary rounded" />
          <div className="h-6 w-24 bg-secondary rounded" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-80 bg-card border border-border rounded-2xl p-6" />
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

  return (
    <div className="space-y-8">
      
      {/* Header and Export actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Hiring Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Review pipeline efficiency, skill gaps, and export Excel/CSV summaries.</p>
        </div>
        
        <a 
          href={`http://localhost:8000/api/v1/analytics/export${selectedJobId ? `?job_id=${selectedJobId}` : ''}`}
          download
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-card border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>Export CSV Report</span>
        </a>
      </div>

      {/* Analytics widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Candidate Base</span>
          </div>
          <span className="text-3xl font-extrabold text-foreground">{metrics.total_candidates}</span>
          <span className="text-xs text-muted-foreground block mt-2">Active applicants in screening</span>
        </div>
        
        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Average Alignment</span>
          </div>
          <span className="text-3xl font-extrabold text-foreground">{metrics.avg_match_score}%</span>
          <span className="text-xs text-muted-foreground block mt-2">Resume-to-job matching score</span>
        </div>

        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Award className="w-4 h-4 text-violet-500" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Screening Yield</span>
          </div>
          <span className="text-3xl font-extrabold text-foreground">{metrics.processing_rate}%</span>
          <span className="text-xs text-muted-foreground block mt-2">Candidate evaluation rate</span>
        </div>

        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Readiness Score</span>
          </div>
          <span className="text-3xl font-extrabold text-foreground">{metrics.interview_readiness_score}%</span>
          <span className="text-xs text-muted-foreground block mt-2">Interview-ready average match</span>
        </div>
      </div>

      {/* Detail Analytics Graphs split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Core Skill Distribution */}
        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground font-sans">Core Skill Distribution</h3>
              <p className="text-xs text-muted-foreground">Most frequent skills detected in processed resumes</p>
            </div>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.skill_distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} vertical={false} />
                <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                  itemStyle={{ color: tooltipLabel }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="count" name="Candidate Count" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Funnel Flow area chart */}
        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground font-sans">Hiring Funnel Analytics</h3>
              <p className="text-xs text-muted-foreground">Applicant conversions through review stages</p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.candidate_funnel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} vertical={false} />
                <XAxis dataKey="stage" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                  itemStyle={{ color: tooltipLabel }}
                />
                <Area type="monotone" dataKey="value" name="Candidates" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorFunnel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Graph 3: Contextual Secondary Charts */}
      <div className="grid grid-cols-1 gap-6">
        <div className="glass border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-foreground font-sans">
                {selectedJobId ? "Experience Distribution" : "Applications by Job Position"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedJobId 
                  ? "Experience level distribution of candidates screened for this position" 
                  : "Volume of candidate screening records mapped across active jobs"
                }
              </p>
            </div>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {selectedJobId ? (
                <AreaChart data={charts.experience_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} vertical={false} />
                  <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                    itemStyle={{ color: tooltipLabel }}
                  />
                  <Area type="monotone" dataKey="value" name="Candidates" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              ) : (
                <BarChart data={charts.applications_by_job} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} vertical={false} />
                  <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: "12px" }}
                    itemStyle={{ color: tooltipLabel }}
                  />
                  <Bar dataKey="count" name="Applications count" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
