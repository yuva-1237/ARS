"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { uploadFiles, api } from "@/utils/api";
import { 
  UploadCloud, FileText, CheckCircle2, AlertTriangle, 
  X, Sparkles, RefreshCw, Briefcase, Plus 
} from "lucide-react";

interface UploadQueueItem {
  id: string; // Temp local ID
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "parsed" | "failed";
  error?: string;
  dbResumeId?: number;
}

export default function UploadPage() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch jobs to associate with uploads
  useEffect(() => {
    setJobsLoading(true);
    api.get("/jobs/")
      .then((res) => setJobs(res.data))
      .catch((err) => console.error("Error fetching jobs for upload:", err))
      .finally(() => setJobsLoading(false));
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems = acceptedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      file,
      progress: 0,
      status: "pending" as const
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/png": [".png"],
      "image/jpeg": [".jpeg", ".jpg"]
    }
  } as any);

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleJobSelect = (jobId: number) => {
    setSelectedJobIds((prev) => 
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const triggerUpload = async () => {
    if (queue.length === 0 || uploading) return;
    setUploading(true);
    
    // Set all pending items to uploading
    setQueue((prev) => 
      prev.map((item) => item.status === "pending" ? { ...item, status: "uploading" } : item)
    );

    const pendingItems = queue.filter((item) => item.status === "pending");
    const filesToUpload = pendingItems.map((item) => item.file);

    try {
      // Call multipart upload API
      const res = await uploadFiles(filesToUpload, selectedJobIds, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setQueue((prev) => 
          prev.map((item) => 
            item.status === "uploading" ? { ...item, progress: percentCompleted } : item
          )
        );
      });
      
      const createdResumes = res.data;
      
      // Map back database IDs and set status to processing
      setQueue((prev) => {
        let resumeIndex = 0;
        return prev.map((item) => {
          if (item.status === "uploading") {
            const dbResume = createdResumes[resumeIndex++];
            return {
              ...item,
              status: "processing",
              dbResumeId: dbResume?.id
            };
          }
          return item;
        });
      });

      // Poll status for processing items
      startStatusPolling();
      
    } catch (err: any) {
      console.error("Upload failed:", err);
      setQueue((prev) => 
        prev.map((item) => 
          item.status === "uploading" 
            ? { ...item, status: "failed", error: "Upload endpoint connection error" } 
            : item
        )
      );
    } finally {
      setUploading(false);
    }
  };

  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      setQueue((prev) => {
        const processingIds = prev
          .filter((item) => item.status === "processing" && item.dbResumeId)
          .map((item) => item.dbResumeId as number);
          
        if (processingIds.length === 0) {
          clearInterval(interval);
          return prev;
        }

        // Fetch updates from API for processing files
        processingIds.forEach(async (id) => {
          try {
            // Find single candidate status details
            const res = await api.get(`/candidates/`);
            // Check if candidates list has candidate matching resume_id
            // Or fetch candidate from resume status (better check resume list)
            // Let's assume we can fetch candidates list. To query specific resume:
            // Since we know status of candidate matches:
            const candidates = res.data.items || [];
            const matchedCand = candidates.find((c: any) => c.resume_id === id);
            
            if (matchedCand) {
              setQueue((curr) => 
                curr.map((item) => 
                  item.dbResumeId === id 
                    ? { ...item, status: "parsed" } 
                    : item
                )
              );
            }
          } catch (e) {
            // Ignore single fetch error
          }
        });
        
        return prev;
      });
    }, 3000);
  };

  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Resume Intake</h1>
        <p className="text-zinc-400 text-sm mt-1">Upload resumes in bulk. Scanned resumes are processed via Tesseract OCR.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Drag Drop zone & Job Select */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Target Job Selector */}
          <div className="glass border border-zinc-900 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-2.5 flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Link Uploads to Job Positions (Optional)</span>
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Select one or more active openings to calculate candidate matching scores immediately upon upload.
            </p>
            
            {jobsLoading ? (
              <div className="h-10 bg-zinc-900 rounded animate-pulse" />
            ) : jobs.length === 0 ? (
              <div className="text-xs text-zinc-650 italic">No active jobs found. Create jobs first.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {jobs.map((job) => {
                  const isSelected = selectedJobIds.includes(job.id);
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => handleJobSelect(job.id)}
                      className={`py-1.5 px-3 border rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? "bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow shadow-indigo-500/10"
                          : "bg-zinc-900/30 border-zinc-850 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {job.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dropzone */}
          <div 
            {...(getRootProps() as any)} 
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragActive 
                ? "border-indigo-500 bg-indigo-500/5" 
                : "border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-900/20"
            }`}
          >
            <input {...(getInputProps() as any)} />
            <UploadCloud className="w-12 h-12 text-zinc-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-bold text-white mb-1">Drag & Drop Resumes here</h3>
            <p className="text-zinc-500 text-xs max-w-sm mx-auto mb-2">
              Supports PDF, DOCX, TXT, PNG, JPG, or JPEG formats.
            </p>
            <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">or click to browse files</span>
          </div>

        </div>

        {/* Right: Upload Queue list */}
        <div className="glass border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between min-h-[400px]">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider">Upload Queue</span>
              <span className="text-[10px] text-zinc-500 font-bold">{queue.length} Files</span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="text-center text-xs text-zinc-600 py-12">Queue is empty. Drop files on the left to start.</div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl relative">
                    
                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="text-xs text-white truncate font-semibold pr-2">{item.file.name}</span>
                      </div>
                      
                      {item.status === "pending" && (
                        <button 
                          onClick={() => removeQueueItem(item.id)}
                          className="text-zinc-500 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="mt-3.5 flex justify-between items-center text-[10px] font-bold">
                      <span className={`uppercase tracking-wider ${
                        item.status === 'parsed' ? 'text-emerald-400' :
                        item.status === 'failed' ? 'text-rose-400' :
                        item.status === 'processing' ? 'text-indigo-400' : 'text-zinc-500'
                      }`}>
                        {item.status}
                      </span>
                      <span className="text-zinc-600">{(item.file.size / 1024).toFixed(0)} KB</span>
                    </div>

                    {item.status === "uploading" && (
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-2">
                        <div className="bg-indigo-500 h-1 transition-all duration-300" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    
                    {item.status === "processing" && (
                      <div className="w-full bg-indigo-500/10 h-1 rounded-full overflow-hidden mt-2 relative">
                        <div className="bg-indigo-500 h-1 w-[40%] rounded-full animate-ping absolute left-[30%]" />
                      </div>
                    )}

                    {item.error && (
                      <span className="text-[9px] text-rose-400 font-medium block mt-1">{item.error}</span>
                    )}

                  </div>
                ))
              )}
            </div>
          </div>

          {queue.length > 0 && (
            <button
              onClick={triggerUpload}
              disabled={uploading || queue.every(i => i.status !== 'pending')}
              className="w-full mt-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center space-x-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading files...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process Resume Queue</span>
                </>
              )}
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
