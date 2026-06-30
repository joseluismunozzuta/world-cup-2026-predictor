import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    serverTimestamp,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";


import { AppUser } from "@/lib/users";
import { MatchResult } from "@/types/MatchResult";
import { calculatePredictionPoints } from "./scoring";



export type MatchPredictionSummary = {
    matchId: string;
    predictions: {
        userId: string;
        userName: string;
        photoURL?: string;
        homeScore: number;
        awayScore: number;
        points: number;
        exactScore?: boolean;
        correctResult?: boolean;
        jokerActivated?: boolean;
        qualifiedTeamId?: string;
        penaltiesIfDraw?: boolean;
        modifiedDuringWindow?: boolean;
    }[];
    createdAt?: unknown;
    updatedAt?: unknown;
};

export type StoredPrediction = {
    userId: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
    jokerActivated?: boolean;
    // Knockout only:
    qualifiedTeamId?: string;
    penaltiesIfDraw?: boolean;
    modifiedDuringWindow?: boolean;
    createdAt?: unknown;
    updatedAt?: unknown;
};

export async function generateMatchPredictionSummary({
    partyId,
    matchId,
    result,
    partyUsers,
}: {
    partyId: string;
    matchId: string;
    result: MatchResult;
    partyUsers: AppUser[];
}) {
    const predictionsRef = collection(db, "parties", partyId, "predictions");

    const q = query(predictionsRef, where("matchId", "==", matchId));
    const snapshot = await getDocs(q);

    const usersById = Object.fromEntries(
        partyUsers.map((user) => [user.uid, user])
    );

    const predictions = snapshot.docs.map((docSnap) => {
        const prediction = docSnap.data() as StoredPrediction;
        const user = usersById[prediction.userId];

        const scoreResult = calculatePredictionPoints(prediction, result);
        const base = {
            userId: prediction.userId,
            userName: user?.name ?? "Usuario",
            photoURL: user?.photoURL ?? "",
            homeScore: prediction.homeScore,
            awayScore: prediction.awayScore,
            points: scoreResult.points,
            exactScore: scoreResult.exactScore,
            correctResult: scoreResult.correctResult,
            jokerActivated: prediction.jokerActivated ?? false,
        };
        return Object.fromEntries(
            Object.entries({
                ...base,
                qualifiedTeamId: prediction.qualifiedTeamId,
                penaltiesIfDraw: prediction.penaltiesIfDraw,
                modifiedDuringWindow: prediction.modifiedDuringWindow,
            }).filter(([, v]) => v !== undefined)
        );
    });

    // Firestore rejects undefined values — strip them before saving
    const cleanResult = Object.fromEntries(
        Object.entries(result).filter(([, v]) => v !== undefined)
    );

    await setDoc(
        doc(db, "parties", partyId, "matchPredictionSummaries", matchId),
        {
            matchId,
            result: cleanResult,
            predictions,
            predictionsCount: predictions.length,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}
export async function backfillFinishedMatchPredictionSummaries({
    partyId,
    results,
    partyUsers,
}: {
    partyId: string;
    results: Record<string, MatchResult>;
    partyUsers: AppUser[];
}) {
    const finishedResults = Object.entries(results).filter(
        ([, result]) => result.status === "finished"
    );

    for (const [matchId, result] of finishedResults) {
        await generateMatchPredictionSummary({
            partyId,
            matchId,
            result,
            partyUsers,
        });
    }
}

export function subscribeToMatchPredictionSummaries(
    partyId: string,
    callback: (summaries: Record<string, MatchPredictionSummary>) => void
) {
    return onSnapshot(
        collection(db, "parties", partyId, "matchPredictionSummaries"),
        (snapshot) => {
            const summaries: Record<string, MatchPredictionSummary> = {};

            snapshot.forEach((doc) => {
                summaries[doc.id] = doc.data() as MatchPredictionSummary;
            });

            callback(summaries);
        }
    );
}