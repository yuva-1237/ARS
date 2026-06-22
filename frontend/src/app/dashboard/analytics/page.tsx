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
  const { selectedJobId } = useStore();
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
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-6 w-24 bg-zinc-800 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-80 bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6" />
          <div className="h-80 bg-zinc-900 border border-zinc-800/50 rounded-2xl p-6" />
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;
  const COLORS = ["#6366f1", "#818cf8", "#14b8a6", "#22d3ee", "#a78bfa", "#f43f5e"];

  // Mock data for skill gap comparison
  const skillGapData = [
    { name: "Python", candidateHave: 8, jobRequire: 10 },
    { name: "React", candidateHave: 5, jobRequire: 9 },
    { name: "AWS", candidateHave: 3, jobRequire: 7 },
    { name: "Docker", candidateHave: 6, jobRequire: 8 },
    { name: "FastAPI", candidateHave: 7, jobRequire: 6 },
    { name: "Next.js", candidateHave: 4, jobRequire: 7 }
  ];

  return (
    <div className="space-y-8">
      
      {/* Header and Export actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Hiring Analytics</h1>
          <p className="text-zinc-400 text-sm mt-1">Review pipeline efficiency, skill gaps, and export Excel/CSV summaries.</p>
        </div>
        
        <a 
          href={`http://localhost:8000/api/v1/analytics/export${selectedJobId ? `?job_id=${selectedJobId}` : ''}`}
          download
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-zinc-350 hover:text-white text-xs font-bold rounded-lg transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Export CSV Report</span>
        </a>
      </div>

      {/* Analytics widgets row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass border border-zinc-900 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Candidate Base</span>
          </div>
          <span className="text-3xl font-extrabold text-white">{metrics.total_candidates}</span>
          <span className="text-xs text-zinc-550 block mt-2">Active applicants in screening</span>
        </div>
        
        <div className="glass border border-zinc-900 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Average Alignment</span>
          </div>
          <span className="text-3xl font-extrabold text-white">{metrics.avg_match_score}%</span>
          <span className="text-xs text-zinc-550 block mt-2">Resume-to-job matching score</span>
        </div>

        <div className="glass border border-zinc-900 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-2">
            <Award className="w-4 h-4 text-violet-400" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Screening Yield</span>
          </div>
          <span className="text-3xl font-extrabold text-white">{metrics.processing_rate}%</span>
          <span className="text-xs text-zinc-550 block mt-2">Candidate evaluation rate</span>
        </div>
      </div>

      {/* Detail Analytics Graphs split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Skill Gap overlay */}
        <div className="glass border border-zinc-900 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white font-sans">Skill Gap Analysis</h3>
              <p className="text-xs text-zinc-500">Skills present in candidate base vs job requirement densities</p>
            </div>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillGapData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                  itemStyle={{ color: "#fafafa" }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px", fontWeight: "bold" }} />
                <Bar dataKey="candidateHave" name="Candidate Availability" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="jobRequire" name="Job Requirements" fill="#14b8a6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Funnel Flow area chart */}
        <div className="glass border border-zinc-900 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white font-sans">Hiring Funnel Analytics</h3>
              <p className="text-xs text-zinc-500">Applicant conversions through review stages</p>
            </div>
            <BarChart3 className="w-4 h-4 text-zinc-500" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="stage" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "12px" }}
                  itemStyle={{ color: "#fafafa" }}
                />
                <Area type="monotone" dataKey="value" name="Candidates" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorFunnel)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
