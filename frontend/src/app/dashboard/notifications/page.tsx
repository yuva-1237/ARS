"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { api } from "@/utils/api";
import { 
  Bell, CheckSquare, Trash2, Search, SlidersHorizontal, 
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, 
  CheckCircle, Info, Star, Inbox
} from "lucide-react";
import { db } from "@/utils/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getNotificationUserId } from "../layout";

export default function NotificationsCenterPage() {
  const { user, token, notifications, markNotificationRead, setNotifications } = useStore();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Mark all as read helper
  const handleMarkAllRead = async () => {
    if (!user || !token) return;
    const userId = getNotificationUserId(user, token);
    
    // Call backend to mark all as read
    try {
      await api.post("/notifications/mark-all-read");
    } catch (err) {
      console.error("Failed to mark all notifications as read in backend:", err);
    }

    // Update in Firestore
    if (userId) {
      const unread = notifications.filter(n => !n.read);
      for (const notif of unread) {
        try {
          const docRef = doc(db, "users", userId, "notifications", notif.id);
          await updateDoc(docRef, { read: true });
        } catch (e) {
          console.error("Error marking read in Firestore:", e);
        }
      }
    }
  };

  // Delete notification helper
  const handleDeleteNotif = async (id: string) => {
    if (!user || !token) return;
    const userId = getNotificationUserId(user, token);

    // Call backend
    const sqlId = parseInt(id.replace("notif_", "").split("_")[0], 10) || parseInt(id, 10);
    if (!isNaN(sqlId)) {
      try {
        await api.delete(`/notifications/${sqlId}`);
      } catch (err) {
        console.error("Failed to delete SQL notification:", err);
      }
    } else {
      try {
        await api.delete(`/notifications/${id}`);
      } catch {}
    }

    // Update in Firestore
    if (userId) {
      try {
        const docRef = doc(db, "users", userId, "notifications", id);
        await deleteDoc(docRef);
      } catch (e) {
        console.error("Error deleting from Firestore:", e);
      }
    }

    // Update Zustand local state
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleMarkAsRead = async (id: string) => {
    markNotificationRead(id);
    
    const sqlId = parseInt(id.replace("notif_", "").split("_")[0], 10) || parseInt(id, 10);
    if (!isNaN(sqlId)) {
      try {
        await api.post(`/notifications/${sqlId}/read`);
      } catch (err) {
        console.error("Failed to mark SQL notification as read:", err);
      }
    } else {
      try {
        await api.post(`/notifications/${id}/read`);
      } catch {}
    }

    if (token && user) {
      const userId = getNotificationUserId(user, token);
      if (userId) {
        try {
          const docRef = doc(db, "users", userId, "notifications", id);
          await updateDoc(docRef, { read: true });
        } catch (err) {
          console.error("Failed to update read status in Firestore:", err);
        }
      }
    }
  };

  // Filter and search
  const filteredNotifs = notifications.filter((notif) => {
    const matchesSearch = notif.title.toLowerCase().includes(search.toLowerCase()) || 
                          notif.message.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === "all" || notif.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNotifs.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentNotifs = filteredNotifs.slice(indexOfFirstItem, indexOfLastItem);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "info":
        return <Info className="w-4 h-4 text-sky-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case "system":
        return <Star className="w-4 h-4 text-[#D4AF37]" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getNotifColor = (type: string) => {
    switch (type) {
      case "success": return "border-emerald-500/20 bg-emerald-500/5";
      case "info": return "border-sky-500/20 bg-sky-500/5";
      case "warning": return "border-amber-500/20 bg-amber-500/5";
      case "error": return "border-rose-500/20 bg-rose-500/5";
      case "system": return "border-[#D4AF37]/20 bg-[#D4AF37]/5";
      default: return "border-border bg-card";
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Notification Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Review, filter, and manage real-time alerts across application events.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter(n => !n.read).length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 border border-border bg-card hover:bg-secondary disabled:opacity-50 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass border border-border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full bg-background/50 border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-10 pr-4 text-xs text-foreground outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="bg-background border border-border focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 px-4 text-xs text-foreground outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="success">Success Alerts</option>
            <option value="info">Info Logs</option>
            <option value="warning">Warnings</option>
            <option value="error">Errors</option>
            <option value="system">System Announcements</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3.5">
        {currentNotifs.length === 0 ? (
          <div className="glass border border-border rounded-2xl p-12 text-center shadow-sm">
            <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">No notifications found</p>
            <p className="text-xs text-muted-foreground mt-1">There are no alerts matching your search criteria.</p>
          </div>
        ) : (
          currentNotifs.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => !notif.read && handleMarkAsRead(notif.id)}
              className={`p-4 border rounded-xl flex items-start justify-between gap-4 transition-all hover:border-indigo-500/30 ${
                !notif.read ? 'border-indigo-500/35 bg-indigo-500/5 shadow-sm' : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className={`p-2 rounded-lg border ${getNotifColor(notif.type)} shrink-0`}>
                  {getNotifIcon(notif.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className={`text-xs font-bold text-foreground ${!notif.read ? 'font-extrabold text-indigo-500' : ''}`}>
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded-full shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">{notif.message}</p>
                  <span className="text-[10px] text-muted-foreground block mt-2">
                    {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteNotif(notif.id); }}
                className="p-1.5 hover:bg-secondary hover:text-rose-500 text-muted-foreground rounded-lg transition-colors cursor-pointer shrink-0"
                title="Delete Notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-4">
          <span className="text-xs text-muted-foreground">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredNotifs.length)} of {filteredNotifs.length}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border hover:bg-secondary disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-foreground px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 border border-border hover:bg-secondary disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
