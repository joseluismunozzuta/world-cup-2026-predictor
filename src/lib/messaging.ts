import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { db } from "@/lib/firebase";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;

export async function initMessaging(uid: string): Promise<void> {
    try {
        const supported = await isSupported();
        if (!supported) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const app = getApps()[0] ?? initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return;

        await updateDoc(doc(db, "users", uid), { fcmToken: token });
    } catch (err) {
        console.warn("FCM init failed:", err);
    }
}
