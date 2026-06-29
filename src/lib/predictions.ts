import {
    collection,
    onSnapshot,
    query,
    where, doc, setDoc, serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Prediction } from "@/types/Prediction";
import { Match } from "@/types/Match";
import { ResultsMap } from "./results";

export type SpecialPrediction = {
    userId: string;
    championTeamId?: string;
    runnerUpTeamId?: string;
    topScorerPlayerId?: string;
    bestPlayerId?: string;
    createdAt?: unknown;
    updatedAt?: unknown;
};

export type PredictionsMap = {
    [userId: string]: {
        [matchId: string]: Prediction;
    };
};



export type MatchPredictionsMap = Record<
    string,
    {
        userId: string;
        matchId: string;
        homeScore: number;
        awayScore: number;
    }[]
>;

export type SpecialPredictionsMap = {
    [userId: string]: SpecialPrediction;
};

type FirestorePrediction = Prediction & {
    userId: string;
    matchId: string;
};

export function subscribeToMyPredictions(
    partyId: string,
    userId: string,
    callback: (predictions: Record<string, Prediction>) => void
) {
    const predictionsRef = collection(db, "parties", partyId, "predictions");

    const q = query(predictionsRef, where("userId", "==", userId));

    return onSnapshot(q, (snapshot) => {
        const predictionsMap: Record<string, Prediction> = {};

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as FirestorePrediction;

            predictionsMap[data.matchId] = {
                homeScore: data.homeScore,
                awayScore: data.awayScore,
                jokerActivated: data.jokerActivated ?? false,
                qualifiedTeamId: data.qualifiedTeamId,
                penaltiesIfDraw: data.penaltiesIfDraw,
                modifiedDuringWindow: data.modifiedDuringWindow,
            };
        });

        callback(predictionsMap);
    });
}

export async function savePredictionToFirebase({
    partyId,
    userId,
    matchId,
    prediction,
}: {
    partyId: string;
    userId: string;
    matchId: string;
    prediction: Prediction;
}) {
    const predictionId = `${userId}_${matchId}`;

    const predictionRef = doc(
        db,
        "parties",
        partyId,
        "predictions",
        predictionId
    );

    const data: Record<string, unknown> = {
        userId,
        matchId,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        jokerActivated: prediction.jokerActivated ?? false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (prediction.qualifiedTeamId !== undefined) data.qualifiedTeamId = prediction.qualifiedTeamId;
    if (prediction.penaltiesIfDraw !== undefined) data.penaltiesIfDraw = prediction.penaltiesIfDraw;

    await setDoc(predictionRef, data, { merge: false });
}

export async function saveKnockoutWindowModification({
    partyId,
    userId,
    matchId,
    qualifiedTeamId,
    penaltiesIfDraw,
}: {
    partyId: string;
    userId: string;
    matchId: string;
    qualifiedTeamId: string;
    penaltiesIfDraw: boolean;
}) {
    const predictionId = `${userId}_${matchId}`;
    const predictionRef = doc(db, "parties", partyId, "predictions", predictionId);

    await setDoc(
        predictionRef,
        {
            qualifiedTeamId,
            penaltiesIfDraw,
            modifiedDuringWindow: true,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export function subscribeToPartySpecialPredictions(
    partyId: string,
    callback: (predictions: SpecialPredictionsMap) => void
) {
    const ref = collection(
        db,
        "parties",
        partyId,
        "specialPredictions"
    );

    return onSnapshot(ref, (snapshot) => {
        const predictionsMap: SpecialPredictionsMap = {};

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data() as SpecialPrediction;

            predictionsMap[data.userId] = data;
        });

        callback(predictionsMap);
    });
}

export async function saveSpecialPredictionField({
    partyId,
    userId,
    field,
    value,
    hasWorldCupStarted,
}: {
    partyId: string | null | undefined;
    userId: string;
    field:
    | "championTeamId"
    | "runnerUpTeamId"
    | "topScorerPlayerId"
    | "bestPlayerId";
    value: string;
    hasWorldCupStarted: boolean;
}) {

    if (!partyId) return;

    if (hasWorldCupStarted) {
        throw new Error("Los pronósticos especiales ya están bloqueados.");
    }

    const predictionRef = doc(
        db,
        "parties",
        partyId,
        "specialPredictions",
        userId
    );

    await setDoc(
        predictionRef,
        {
            userId,
            [field]: value,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
        },
        { merge: true }
    );
}

export type MatchStartedPrediction = {
    userId: string;
    matchId: string;
    homeScore: number;
    awayScore: number;
    jokerActivated?: boolean;
    qualifiedTeamId?: string;
    penaltiesIfDraw?: boolean;
};

export type StartedMatchPredictionsMap = Record<
    string,
    MatchStartedPrediction[]
>;

export function subscribeToStartedMatchPredictions(
    partyId: string,
    matchIds: string[],
    callback: (predictions: StartedMatchPredictionsMap) => void
) {
    if (matchIds.length === 0) {
        queueMicrotask(() => callback({}));
        return () => { };
    }

    const predictionsByMatch: StartedMatchPredictionsMap = {};

    const predictionsRef = collection(db, "parties", partyId, "predictions");

    const unsubscribes = matchIds.map((matchId) => {
        const q = query(predictionsRef, where("matchId", "==", matchId));

        return onSnapshot(q, (snapshot) => {
            predictionsByMatch[matchId] = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() as FirestorePrediction;

                return {
                    userId: data.userId,
                    matchId: data.matchId,
                    homeScore: data.homeScore,
                    awayScore: data.awayScore,
                    jokerActivated: data.jokerActivated ?? false,
                    qualifiedTeamId: data.qualifiedTeamId,
                    penaltiesIfDraw: data.penaltiesIfDraw,
                };
            });

            callback({ ...predictionsByMatch });
        });
    });

    return () => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
}

export function getStartedNotFinishedMatchIdsKey({
    matches,
    results,
    now,
}: {
    matches: Match[];
    results: ResultsMap;
    now: number;
}) {
    return matches
        .filter((match) => {
            const result = results[match.id];

            if (result?.status === "finished") {
                // Knockout matches awaiting qualifier are still "in progress"
                if (match.stage !== "group" && !result.qualifiedTeamId) return true;
                return false;
            }

            return now >= new Date(match.kickoff).getTime();
        })
        .map((match) => match.id)
        .sort()
        .join("|");
}