"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { 
  Briefcase, Plus, MapPin, Sparkles, RefreshCw, Trash2, 
  CheckCircle, ChevronDown, ChevronUp, AlertCircle 
} from "lucide-react";

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // New Job states
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchJobs = () => {
    setLoading(true);
    api.get("/jobs/")
      .then((res) => setJobs(res.data))
      .catch((err) => console.error("Error fetching jobs:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/jobs/", {
        title,
        department: department || null,
        location: location || null,
        description
      });
      setMessage("Job posted! AI is currently parsing metadata and scoring candidates.");
      setTitle("");
      setDepartment("");
      setLocation("");
      setDescription("");
      setFormOpen(false);
      
      // Reload jobs list after a short delay to let backend start processing
      setTimeout(() => {
        fetchJobs();
      }, 1500);
    } catch (err: any) {
      console.error("Error creating job:", err);
      setMessage("Failed to create job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async (jobId: number) => {
    try {
      await api.post(`/jobs/${jobId}/recalculate`);
      setMessage("Triggered recalculation. Candidate scores will update shortly.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Error recalculating job scores:", err);
    }
  };

  const handleArchive = async (jobId: number) => {
    if (confirm("Are you sure you want to archive this job opening?")) {
      try {
        await api.delete(`/jobs/${jobId}`);
        fetchJobs();
      } catch (err) {
        console.error("Error archiving job:", err);
      }
    }
  };

  const toggleExpand = (jobId: number) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Active Jobs</h1>
          <p className="text-muted-foreground text-sm mt-1">Define requirements and coordinate AI screening weights.</p>
        </div>
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Job Opening</span>
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-bold px-3 py-1.5 rounded-full inline-flex">
          <Sparkles className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>{message}</span>
        </div>
      )}

      {/* New Job Form */}
      {formOpen && (
        <div className="glass border border-border rounded-2xl p-6 shadow-2xl animate-float">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-foreground">Create New Job Description</h3>
            <button onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
              Cancel
            </button>
          </div>
          
          <form onSubmit={handleCreateJob} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground placeholder-muted-foreground outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground placeholder-muted-foreground outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Location</label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco, CA (Hybrid)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground placeholder-muted-foreground outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Job Description</label>
              <textarea
                required
                rows={6}
                placeholder="Paste the raw text job description here. Our Gemini agent will automatically parse it to extract required skills, experience, education, responsibilities, and target search keywords."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg py-2.5 px-4 text-xs text-foreground placeholder-muted-foreground outline-none transition-all resize-none shadow-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Post & Run AI Engine</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs Board Listing */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="glass border border-border rounded-2xl p-12 text-center shadow-sm">
          <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-1">No jobs defined yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">Create a job opening to start matching candidates against specific parameters.</p>
          <button 
            onClick={() => setFormOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Create Your First Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            return (
              <div 
                key={job.id}
                className="glass border border-border rounded-2xl overflow-hidden transition-all hover:border-indigo-500/50 shadow-sm"
              >
                <div 
                  onClick={() => toggleExpand(job.id)}
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-secondary/40"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-indigo-500 shadow-sm">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">{job.title}</h3>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                        {job.department && <span>{job.department}</span>}
                        {job.location && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{job.location}</span>
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-emerald-500 capitalize px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                          {job.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRecalculate(job.id); }}
                      className="p-2 border border-border bg-card hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-sm"
                      title="Recalculate Candidate Matching Scores"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleArchive(job.id); }}
                      className="p-2 border border-border bg-card hover:bg-secondary rounded-lg text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer shadow-sm"
                      title="Archive Job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-border pt-6 bg-secondary/20 text-xs leading-relaxed space-y-6">
                    
                    {/* Grid of AI Extracted features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: Skills & Education */}
                      <div className="space-y-4">
                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Required Skills</span>
                          <div className="flex flex-wrap gap-1.5">
                            {job.required_skills?.length > 0 ? (
                              job.required_skills.map((s: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-indigo-500/5 border border-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded font-semibold shadow-sm">
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Pending AI extraction...</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Education Requirements</span>
                          <span className="text-foreground font-medium block">
                            {job.education_requirements || "Not specified"}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Key details & Keywords */}
                      <div className="space-y-4">
                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Experience (Years)</span>
                          <span className="text-foreground font-medium text-sm">
                            {job.experience_years ? `${job.experience_years}+ years` : "No experience cap specified"}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Search Keywords</span>
                          <div className="flex flex-wrap gap-1.5">
                            {job.keywords?.length > 0 ? (
                              job.keywords.map((k: string, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-card border border-border text-muted-foreground rounded shadow-sm">
                                  {k}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground">Pending...</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Responsibilities */}
                      <div>
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Responsibilities</span>
                        <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                          {job.responsibilities?.length > 0 ? (
                            job.responsibilities.slice(0, 4).map((r: string, idx: number) => (
                              <li key={idx} className="truncate">{r}</li>
                            ))
                          ) : (
                            <span className="text-muted-foreground">Pending...</span>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Original description */}
                    <div>
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Full Description</span>
                      <p className="text-muted-foreground whitespace-pre-line bg-secondary/20 border border-border p-4 rounded-xl max-h-48 overflow-y-auto">
                        {job.description}
                      </p>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
