import { db } from "./firebase";
import { api } from "./api";
import { getToken } from "firebase/messaging";
import { messaging } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getNotificationUserId } from "@/app/dashboard/layout";

export const requestPushPermission = async (user: any, token: string | null): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission was denied.");
      return null;
    }

    const messagingInstance = await messaging;
    if (!messagingInstance) {
      console.warn("Firebase Messaging is not supported or initialized.");
      return null;
    }

    const fcmToken = await getToken(messagingInstance, {
      vapidKey: "BFt4j7hR8Xp056_Q84lV1z65wXl5e3m-hN-wKCe0d24J-V9e40xP0A_vO1lT1m5lHwB0S2H1Y4m20X1wKCe0d24"
    });

    if (fcmToken) {
      console.log("FCM Token acquired:", fcmToken);
      return fcmToken;
    }
    return null;
  } catch (err) {
    console.error("An error occurred while requesting notification permission:", err);
    return null;
  }
};

/**
 * Creates a notification entry for the current user.
 * First tries to write to Firebase Firestore (if configured).
 * Always syncs to the local SQL database via the REST API as backup.
 * Never throws — all errors are caught silently.
 */
export const createLocalNotification = async (
  user: any,
  token: string | null,
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'error' | 'system',
  actionUrl: string | null = null,
  metadata: any = {}
) => {
  if (!user) return;

  // 1. Try writing to Firestore (optional — no-throw)
  try {
    const uid = getNotificationUserId(user, token);
    if (uid) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const docRef = doc(db, "users", uid, "notifications", notifId);
      await setDoc(docRef, {
        id: notifId,
        userId: uid,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp(),
        actionUrl: actionUrl || null,
        metadata: metadata || {}
      });
    }
  } catch {
    // Firestore not configured or offline — silently skip
  }

  // 2. Always sync to local SQL database via POST /notifications/create
  // This endpoint is accessible to all authenticated users (not admin-only)
  try {
    await api.post("/notifications/create", {
      title,
      message,
      action_url: actionUrl,
      metadata
    });
  } catch {
    // Backend sync failed (e.g. token expired) — silently ignore
  }
};
