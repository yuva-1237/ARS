importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD4hTh4JJn3k-qewKCr_-pg74BhZhcMeYU",
  authDomain: "arss-123.firebaseapp.com",
  projectId: "arss-123",
  storageBucket: "arss-123.firebasestorage.app",
  messagingSenderId: "697355475702",
  appId: "1:697355475702:web:a5e69435dc206dad04aad7",
  measurementId: "G-57JG6PK05Y"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || "ARS Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: '/globe.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
