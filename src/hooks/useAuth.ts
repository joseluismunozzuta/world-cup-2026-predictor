"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AppUser, getOrCreateUser } from "@/lib/users";

export function useAuth() {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setFirebaseUser(null);
                setAppUser(null);
                setLoadingAuth(false);
                return;
            }

            const createdOrExistingUser = await getOrCreateUser(user);

            // Batch both updates together to avoid intermediate renders
            // that would re-create Firestore subscriptions unnecessarily
            setFirebaseUser(user);
            setAppUser(createdOrExistingUser);
            setLoadingAuth(false);
        });

        return () => unsubscribe();
    }, []);

    return {
        firebaseUser,
        appUser,
        loadingAuth,
        isAuthenticated: !!firebaseUser,
        isAdmin: appUser?.role === "admin",
    };
}