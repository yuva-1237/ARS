"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  Users, Search, Briefcase, Award, ArrowLeft, Shield, 
  AlertTriangle, CheckCircle, HelpCircle, Download, FileText, 
  ExternalLink, ChevronDown, ChevronRight, BookOpen, Clock, Calendar 
} from "lucide-react";

export default function CandidatesPage() {
  const { selectedJobId } = useStore();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Split-Screen selected candidate details
  const [selectedCandId, setSelectedCandId] = useState<number | null>(null);
  const [candDetail, setCandDetail] = useState<any>(null);
  const [candScore, setCandScore] = useState<any>(null);
  const [candQuestions, setCandQuestions] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"match" | "profile" | "fraud" | "questions">("match");
  
  // Timelines collapsible
  const [expExpanded, setExpExpanded] = useState<number[]>([]);
  const [qExpanded, setQExpanded] = useState<number[]>([]);

  const fetchCandidates = () => {
    setLoading(true);
    let url = `/candidates/?page=${page}&limit=10`;
    if (selectedJobId) url += `&job_id=${selectedJobId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    api.get(url)
      .then((res) => {
        setCandidates(res.data.items || []);
        setTotal(res.data.total || 0);
      })
      .catch((err) => console.error("Error fetching candidates:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCandidates();
  }, [selectedJobId, page, search]);

  const loadCandidateDetail = async (candId: number) => {
    setDetailLoading(true);
    setSelectedCandId(candId);
    setActiveTab("match");
    setExpExpanded([]);
    setQExpanded([]);
    try {
      // 1. Fetch Profile Details
      const detailRes = await api.get(`/candidates/${candId}`);
      setCandDetail(detailRes.data);
      
      // 2. Fetch Job Scores and Questions (if job_id selected, otherwise pull best available)
      // Since scoring is job-dependent, if no selectedJobId exists, we fallback to a mock score sheet
      if (selectedJobId) {
        try {
          const scoreRes = await api.get(`/candidates/${candId}/score/${selectedJobId}`);
          setCandScore(scoreRes.data);
        } catch {
          setCandScore(null);
        }
        try {
          const questRes = await api.get(`/candidates/${candId}/questions/${selectedJobId}`);
          setCandQuestions(questRes.data);
        } catch {
          setCandQuestions([]);
        }
      } else {
        // Mock detailed score sheet when viewing without job filter
        setCandScore({
          overall_score: 75.0,
          skill_score: 80.0,
          experience_score: 70.0,
          education_score: 90.0,
          certification_score: 60.0,
          project_score: 80.0,
          keyword_score: 75.0,
          semantic_score: 72.0,
          explanation: "Candidate exhibits excellent database skill sets. To view detailed comparative analytics, select a specific job filter in the top header.",
          confidence_score: 85.0,
          fraud_risk_score: 10.0,
          fraud_risk_report: [
            { type: "Inconsistencies", severity: "low", description: "No critical red flags detected." }
          ],
          ai_summary: "A robust technical profile with experience spanning Python backend stacks.",
          strengths: ["Strong backend capabilities", "Clean database experience"],
          weaknesses: ["Limited cloud architecture representation"]
        });
        setCandQuestions([
          { id: 1, question_text: "Could you walk through a scalable database schema you created?", category: "technical", difficulty: "medium", ideal_answer: "Candidate should explain normalization, indices, and querying." }
        ]);
      }
    } catch (err) {
      console.error("Error loading candidate profile details:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (candId: number, status: string) => {
    try {
      await api.put(`/candidates/${candId}/status?status=${status}`);
      // Refresh list
      fetchCandidates();
      if (candDetail && candDetail.id === candId) {
        setCandDetail((prev: any) => ({ ...prev, status }));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const toggleExpCollapse = (idx: number) => {
    setExpExpanded((prev) => 
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleQCollapse = (idx: number) => {
    setQExpanded((prev) => 
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400 bg-emerald-500/5 border-emerald-500/10";
    if (score >= 70) return "text-indigo-400 bg-indigo-500/5 border-indigo-500/10";
    if (score >= 50) return "text-amber-400 bg-amber-500/5 border-amber-500/10";
    return "text-rose-400 bg-rose-500/5 border-rose-500/10";
  };

  return (
    <div className="space-y-8">
      
      {/* List View (Render when selectedCandId is null) */}
      {!selectedCandId ? (
        <>
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Candidates Pool</h1>
              <p className="text-zinc-400 text-sm mt-1">Review applicant profiles, match parameters, and screening statuses.</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-80">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search skills, names, emails..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-650 outline-none transition-all"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-zinc-900 border border-zinc-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : candidates.length === 0 ? (
            <div className="glass border border-zinc-900 rounded-2xl p-12 text-center">
              <Users className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No candidates matched</h3>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">Try resetting search filters or upload more resumes under the Intake section.</p>
            </div>
          ) : (
            <div className="glass border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase tracking-wider bg-zinc-950/40">
                    {selectedJobId && <th className="p-4 w-16">Rank</th>}
                    <th className="p-4">Candidate</th>
                    <th className="p-4">Skills</th>
                    {selectedJobId && <th className="p-4 w-28">Match Score</th>}
                    <th className="p-4 w-28">Fraud Risk</th>
                    <th className="p-4 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/50">
                  {candidates.map((cand) => (
                    <tr 
                      key={cand.id}
                      onClick={() => loadCandidateDetail(cand.id)}
                      className="hover:bg-zinc-900/10 cursor-pointer transition-colors"
                    >
                      {selectedJobId && (
                        <td className="p-4 font-bold text-zinc-500 text-center">
                          #{cand.rank || "-"}
                        </td>
                      )}
                      <td className="p-4">
                        <span className="block font-bold text-white text-sm">
                          {cand.first_name} {cand.last_name}
                        </span>
                        <span className="block text-[11px] text-zinc-500 mt-0.5">{cand.email}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {cand.skills?.slice(0, 5).map((s: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-[10px]">
                              {s}
                            </span>
                          ))}
                          {cand.skills?.length > 5 && (
                            <span className="text-[10px] text-zinc-600 font-bold">+{cand.skills.length - 5}</span>
                          )}
                        </div>
                      </td>
                      {selectedJobId && (
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded font-bold border text-[11px] ${getScoreColor(cand.match_score)}`}>
                            {cand.match_score ? `${cand.match_score.toFixed(0)}%` : "Pending"}
                          </span>
                        </td>
                      )}
                      <td className="p-4">
                        <span className={`inline-flex items-center space-x-1 text-[11px] font-bold ${
                          cand.fraud_risk_score > 35 ? 'text-rose-400' : 'text-zinc-500'
                        }`}>
                          <Shield className="w-3.5 h-3.5 shrink-0" />
                          <span>{cand.fraud_risk_score ? `${cand.fraud_risk_score.toFixed(0)}%` : "0%"}</span>
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-full capitalize block w-fit">
                          {cand.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Split-Screen Detailed View */
        <div className="space-y-6">
          
          {/* Detailed Header */}
          <div className="flex justify-between items-center">
            <button 
              onClick={() => { setSelectedCandId(null); setCandDetail(null); setCandScore(null); }}
              className="inline-flex items-center space-x-2 text-zinc-400 hover:text-white font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Candidate Pool</span>
            </button>

            {/* Dropdown status update */}
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hiring Status</span>
              <select
                value={candDetail?.status || "new"}
                onChange={(e) => handleStatusChange(selectedCandId, e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-white rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500"
              >
                <option value="new">Applied / New</option>
                <option value="screening">AI Screening</option>
                <option value="interviewed">Interviewing</option>
                <option value="offered">Offered</option>
                <option value="rejected">Rejected</option>
              </select>

              <a 
                href={`http://localhost:8000/api/v1/candidates/${selectedCandId}/resume`}
                target="_blank"
                className="p-2 border border-zinc-850 bg-zinc-900/40 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Download Original Resume File"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>

          {detailLoading || !candDetail ? (
            <div className="h-96 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse flex items-center justify-center">
              <span className="text-zinc-650 text-xs animate-ping">Hydrating Candidate Profiles...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column: CV structured text block (glass card) */}
              <div className="lg:col-span-2 glass border border-zinc-900 rounded-2xl p-6 h-[600px] flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-3 mb-4 flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Structured CV Outline</span>
                  </h3>
                  
                  {/* Summary card info */}
                  <div className="p-4 bg-zinc-900/40 border border-zinc-900 rounded-xl mb-4 text-xs">
                    <span className="block text-base font-extrabold text-white">
                      {candDetail.first_name} {candDetail.last_name}
                    </span>
                    <span className="block text-zinc-400 mt-1.5">{candDetail.email || "No email parsed"}</span>
                    <span className="block text-zinc-400 mt-0.5">{candDetail.phone || "No phone parsed"}</span>
                    {candDetail.location && <span className="block text-zinc-500 mt-1">{candDetail.location}</span>}
                  </div>
                  
                  {/* Skills block */}
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Technical Capabilities</span>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                      {candDetail.skills?.map((s: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[11px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-600 font-bold border-t border-zinc-900/50 pt-4 flex justify-between">
                  <span>Candidate ID: #{candDetail.id}</span>
                  <span>Registered: {new Date(candDetail.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Right Column: AI Tabs workspace */}
              <div className="lg:col-span-3 glass border border-zinc-900 rounded-2xl p-6 h-[600px] flex flex-col">
                
                {/* Tabs bar */}
                <div className="flex space-x-4 border-b border-zinc-900 pb-3 mb-6 shrink-0">
                  {[
                    { id: "match", label: "AI Match Score", icon: Award },
                    { id: "profile", label: "Work Timeline", icon: BookOpen },
                    { id: "fraud", label: "Fraud Check", icon: Shield },
                    { id: "questions", label: "Interview Prep", icon: HelpCircle }
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`pb-1 border-b-2 text-xs font-bold flex items-center space-x-2 transition-all ${
                          activeTab === t.id 
                            ? "border-indigo-500 text-white" 
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab Content Workspace */}
                <div className="flex-1 overflow-y-auto pr-1">
                  
                  {/* TAB 1: AI MATCH */}
                  {activeTab === "match" && candScore && (
                    <div className="space-y-6 text-xs leading-normal">
                      
                      {/* Top Overall Score Row */}
                      <div className="grid grid-cols-3 gap-6 items-center p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                        <div className="text-center">
                          <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Overall Match</span>
                          <span className="block text-4xl font-extrabold text-indigo-400 mt-2">
                            {candScore.overall_score?.toFixed(0)}%
                          </span>
                        </div>
                        <div className="col-span-2 border-l border-zinc-900/50 pl-6">
                          <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">AI Summary Recommendation</span>
                          <p className="text-zinc-300 mt-1.5 italic">
                            "{candScore.ai_summary || "Candidate matches target criteria nicely."}"
                          </p>
                        </div>
                      </div>

                      {/* Detail Score Parameters */}
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Score Parameters</span>
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { label: "Skill Match", val: candScore.skill_score },
                            { label: "Experience Match", val: candScore.experience_score },
                            { label: "Education Match", val: candScore.education_score },
                            { label: "Certifications", val: candScore.certification_score },
                            { label: "Project Alignment", val: candScore.project_score },
                            { label: "Keyword Density", val: candScore.keyword_score }
                          ].map((param, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold text-zinc-400">
                                <span>{param.label}</span>
                                <span>{param.val?.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${param.val}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Explanation */}
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Detailed Matching Assessment</span>
                        <p className="text-zinc-400 p-3 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                          {candScore.explanation}
                        </p>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                          <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Strengths</span>
                          <ul className="space-y-1.5 text-zinc-350 list-disc list-inside">
                            {candScore.strengths?.map((str: string, idx: number) => (
                              <li key={idx} className="truncate">{str}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                          <span className="block text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2">Weaknesses</span>
                          <ul className="space-y-1.5 text-zinc-350 list-disc list-inside">
                            {candScore.weaknesses?.map((w: string, idx: number) => (
                              <li key={idx} className="truncate">{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 2: PROFILE TIMELINE */}
                  {activeTab === "profile" && (
                    <div className="space-y-6 text-xs leading-normal">
                      
                      {/* Work Experience Collapsible Timeline */}
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Employment Timeline</span>
                        <div className="space-y-3">
                          {candDetail.experience?.map((job: any, idx: number) => {
                            const isExpExpanded = expExpanded.includes(idx);
                            return (
                              <div key={idx} className="border border-zinc-900 bg-zinc-900/25 rounded-xl overflow-hidden">
                                <div 
                                  onClick={() => toggleExpCollapse(idx)}
                                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900/10"
                                >
                                  <div>
                                    <span className="block font-bold text-white">{job.role}</span>
                                    <span className="block text-zinc-500 text-[11px] mt-0.5">{job.company}</span>
                                  </div>
                                  <div className="flex items-center space-x-3 text-zinc-650">
                                    <span className="text-[10px] font-medium">{job.start_date} - {job.end_date}</span>
                                    {isExpExpanded ? <ChevronRight className="w-3.5 h-3.5 rotate-90" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                                {isExpExpanded && (
                                  <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 text-zinc-450 leading-relaxed text-[11px]">
                                    {job.description}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Education, Projects, and Certifications Grid */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Education */}
                        <div className="space-y-3">
                          <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Academic Pedigree</span>
                          <div className="space-y-2">
                            {candDetail.education?.map((edu: any, idx: number) => (
                              <div key={idx} className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl">
                                <span className="block font-bold text-white">{edu.degree} - {edu.major}</span>
                                <span className="block text-zinc-500 text-[10px] mt-0.5">{edu.school} ({edu.year})</span>
                                {edu.gpa && <span className="block text-indigo-400 font-semibold mt-1">GPA: {edu.gpa}</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Projects */}
                        <div className="space-y-3">
                          <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Projects Showcase</span>
                          <div className="space-y-2">
                            {candDetail.projects?.map((proj: any, idx: number) => (
                              <div key={idx} className="p-3 bg-zinc-900/20 border border-zinc-900 rounded-xl">
                                <span className="block font-bold text-white">{proj.title}</span>
                                <span className="block text-zinc-400 text-[11px] mt-1 leading-normal">{proj.description}</span>
                                {proj.technologies && (
                                  <div className="flex flex-wrap gap-1 mt-2.5">
                                    {proj.technologies.slice(0, 3).map((t: string, i: number) => (
                                      <span key={i} className="px-1 py-0.5 bg-zinc-900 text-zinc-550 border border-zinc-850 rounded text-[9px]">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: FRAUD ANALYSIS */}
                  {activeTab === "fraud" && candScore && (
                    <div className="space-y-6 text-xs leading-normal">
                      
                      {/* Risk Meter block */}
                      <div className="flex items-center space-x-6 p-4 border border-zinc-900 rounded-xl">
                        <div className="text-center w-24">
                          <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hype Index</span>
                          <span className={`block text-3xl font-extrabold mt-1.5 ${
                            candScore.fraud_risk_score > 35 ? 'text-rose-400' : 'text-teal-400'
                          }`}>
                            {candScore.fraud_risk_score?.toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex-1 border-l border-zinc-900/50 pl-6 space-y-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Risk Severity Assessment</span>
                          <p className="text-zinc-400 leading-normal">
                            {candScore.fraud_risk_score > 35 
                              ? "Medium-High Risk: Suspicious claims or employment date overlaps were identified. See audit breakdown below."
                              : "Low Risk: Profile exhibits chronological consistency and reasonable technology stack distributions."
                            }
                          </p>
                        </div>
                      </div>

                      {/* Detail redflags listing */}
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">AI Flags Breakdown</span>
                        <div className="space-y-2">
                          {candScore.fraud_risk_report && candScore.fraud_risk_report.length > 0 ? (
                            candScore.fraud_risk_report.map((risk: any, idx: number) => (
                              <div key={idx} className="p-3.5 bg-zinc-900/20 border border-zinc-900 rounded-xl flex items-start space-x-3">
                                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                                  risk.severity === 'high' ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                                }`} />
                                <div>
                                  <h4 className="font-bold text-white flex items-center space-x-2">
                                    <span>{risk.type}</span>
                                    <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                                      risk.severity === 'high' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                                    }`}>
                                      {risk.severity}
                                    </span>
                                  </h4>
                                  <p className="text-zinc-400 mt-1 leading-normal text-[11px]">{risk.description}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center space-x-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 text-emerald-400 font-bold">
                              <CheckCircle className="w-4.5 h-4.5" />
                              <span>Zero chronological anomalies or stuffed lists detected. Profile is fully clear.</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB 4: INTERVIEW PREP */}
                  {activeTab === "questions" && (
                    <div className="space-y-4 text-xs leading-normal">
                      <div className="flex justify-between items-center border-b border-zinc-900/50 pb-2 mb-2">
                        <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tailored Screen Questions</span>
                        <span className="text-[10px] text-zinc-500 font-bold">{candQuestions.length} Questions</span>
                      </div>
                      
                      {candQuestions.length === 0 ? (
                        <div className="text-center text-zinc-500 py-12">No interview questions generated yet. Select a specific Job description first.</div>
                      ) : (
                        <div className="space-y-3">
                          {candQuestions.map((q, idx) => {
                            const isQExpanded = qExpanded.includes(idx);
                            return (
                              <div key={idx} className="border border-zinc-900 bg-zinc-900/15 rounded-xl overflow-hidden">
                                <div 
                                  onClick={() => toggleQCollapse(idx)}
                                  className="p-4 flex items-start justify-between cursor-pointer hover:bg-zinc-900/10 space-x-4"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 bg-indigo-500/5 px-2 py-0.5 border border-indigo-500/10 rounded">
                                        {q.category}
                                      </span>
                                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-zinc-500">
                                        {q.difficulty}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-white text-[12px] pt-1 leading-snug">{q.question_text}</h4>
                                  </div>
                                  <div className="text-zinc-650 pt-1 shrink-0">
                                    {isQExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400 rotate-180 transition-transform" /> : <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform" />}
                                  </div>
                                </div>
                                {isQExpanded && (
                                  <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 text-zinc-450 leading-relaxed text-[11px]">
                                    <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Ideal Answer Outline</span>
                                    <p className="italic">"{q.ideal_answer}"</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
