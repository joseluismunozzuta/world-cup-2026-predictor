importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyDA3jszSTW8FEwZJK0QpeTR5_rlIJVbq4o",
    authDomain: "worldcup2026-7a39f.firebaseapp.com",
    projectId: "worldcup2026-7a39f",
    storageBucket: "worldcup2026-7a39f.firebasestorage.app",
    messagingSenderId: "845742606233",
    appId: "1:845742606233:web:d270c97ac159555aa4f508",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const { title, body } = payload.notification ?? {};
    self.registration.showNotification(title ?? "Mundial 2026", {
        body: body ?? "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
    });
});
