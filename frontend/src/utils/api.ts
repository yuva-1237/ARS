import axios from "axios";
import { useStore } from "@/store/useStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = useStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: only redirect to /auth on 401 (token expired or missing)
// 403 means insufficient role/permissions, NOT an auth failure — let pages handle those
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired — clear auth and redirect to login
      useStore.getState().clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  }
);

// Helper for multipart/form-data upload progress
export const uploadFiles = async (
  files: File[],
  jobIds: number[],
  onUploadProgress?: (progressEvent: any) => void
) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  
  if (jobIds.length > 0) {
    formData.append("job_ids", jobIds.join(","));
  }

  const token = useStore.getState().token;

  return axios.post(`${API_BASE_URL}/upload/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    onUploadProgress,
  });
};
