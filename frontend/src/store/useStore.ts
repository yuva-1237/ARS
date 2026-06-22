import { create } from "zustand";

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: any;
  actionUrl: string | null;
  metadata?: any;
}

interface ARSState {
  user: User | null;
  token: string | null;
  selectedJobId: number | null;
  theme: "light" | "dark";
  notifications: Notification[];
  
  // Actions
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setSelectedJobId: (jobId: number | null) => void;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setNotifications: (notifs: Notification[]) => void;
  addNotification: (notif: Notification) => void;
  markNotificationRead: (id: string) => void;
}

export const useStore = create<ARSState>((set) => {
  // Safe window checks for Next.js SSR
  const initialToken = typeof window !== "undefined" ? localStorage.getItem("ars_token") : null;
  const initialUser = typeof window !== "undefined" ? (() => {
    try {
      const u = localStorage.getItem("ars_user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })() : null;
  const initialTheme = typeof window !== "undefined" ? 
    (localStorage.getItem("ars_theme") as "light" | "dark" || "dark") : "dark";

  // Sync initial theme class
  if (typeof window !== "undefined") {
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return {
    user: initialUser,
    token: initialToken,
    selectedJobId: null,
    theme: initialTheme,
    notifications: [],

    setAuth: (user, token) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("ars_token", token);
        localStorage.setItem("ars_user", JSON.stringify(user));
      }
      set({ user, token });
    },

    clearAuth: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("ars_token");
        localStorage.removeItem("ars_user");
      }
      set({ user: null, token: null, selectedJobId: null });
    },

    setSelectedJobId: (selectedJobId) => set({ selectedJobId }),

    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("ars_theme", nextTheme);
        if (nextTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return { theme: nextTheme };
    }),

    setTheme: (theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("ars_theme", theme);
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      set({ theme });
    },

    setNotifications: (notifications) => set({ notifications }),
    
    addNotification: (notif) => set((state) => ({
      notifications: [notif, ...state.notifications]
    })),

    markNotificationRead: (id) => set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    }))
  };
});
