import {
    collection, getDoc,
    doc,
    getDocs,
    limit,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where, arrayUnion, arrayRemove, onSnapshot, writeBatch
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppUser } from "@/lib/users";

export type Party = {
    id: string;
    name: string;
    code: string;
    ownerUserId: string;
    adminUserIds?: string[];
    jokerEarningStartDate?: string; // ISO string
};

export async function setJokerEarningStartDate(partyId: string, isoDate: string) {
    await updateDoc(doc(db, "parties", partyId), {
        jokerEarningStartDate: isoDate,
        updatedAt: serverTimestamp(),
    });
}

export async function promoteUserToAdmin(partyId: string, userId: string) {
    const batch = writeBatch(db);

    const partyRef = doc(db, "parties", partyId);
    const userRef = doc(db, "users", userId);

    batch.update(partyRef, {
        adminUserIds: arrayUnion(userId),
        updatedAt: serverTimestamp(),
    });

    batch.update(userRef, {
        role: "admin",
        updatedAt: serverTimestamp(),
    });

    await batch.commit();
}

export async function removeUserFromAdmin(partyId: string, userId: string) {
    const batch = writeBatch(db);

    const partyRef = doc(db, "parties", partyId);
    const userRef = doc(db, "users", userId);

    batch.update(partyRef, {
        adminUserIds: arrayRemove(userId),
        updatedAt: serverTimestamp(),
    });

    batch.update(userRef, {
        role: "player",
        updatedAt: serverTimestamp(),
    });

    await batch.commit();
}

export async function joinPartyByCode(code: string, user: AppUser) {
    const normalizedCode = code.trim().toUpperCase();

    const partiesRef = collection(db, "parties");
    const q = query(
        partiesRef,
        where("code", "==", normalizedCode),
        limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error("No existe una party con ese código.");
    }

    const partyDoc = snapshot.docs[0];
    const partyId = partyDoc.id;

    await setDoc(doc(db, "parties", partyId, "members", user.uid), {
        userId: user.uid,
        name: user.name,
        email: user.email,
        photoURL: user.avatarUrl ?? user.photoURL ?? null,
        role: "member",
        joinedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "users", user.uid), {
        activePartyId: partyId,
        updatedAt: serverTimestamp(),
    });

    return partyId;
}

export async function getPartyById(partyId: string): Promise<Party | null> {
    const partyRef = doc(db, "parties", partyId);
    const snapshot = await getDoc(partyRef);

    if (!snapshot.exists()) return null;

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as Party;
}

export function subscribeToParty(
    partyId: string,
    callback: (party: Party | null) => void
) {
    const partyRef = doc(db, "parties", partyId);

    return onSnapshot(partyRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(null);
            return;
        }

        callback({
            id: snapshot.id,
            ...snapshot.data(),
        } as Party);
    });
}