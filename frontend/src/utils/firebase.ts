import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD4hTh4JJn3k-qewKCr_-pg74BhZhcMeYU",
  authDomain: "arss-123.firebaseapp.com",
  projectId: "arss-123",
  storageBucket: "arss-123.firebasestorage.app",
  messagingSenderId: "697355475702",
  appId: "1:697355475702:web:a5e69435dc206dad04aad7",
  measurementId: "G-57JG6PK05Y"
};

// Initialize Firebase app for Next.js SSR and client hot-reloading
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Messaging is resolved dynamically to prevent errors in unsupported environments (SSR or specific browsers)
export const messaging = typeof window !== "undefined"
  ? isSupported().then(supported => supported ? getMessaging(app) : null).catch(() => null)
  : Promise.resolve(null);

