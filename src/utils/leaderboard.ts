import { AppUser } from "@/lib/users";
import { calculateSpecialPredictionPoints } from "./scoring";
import { SpecialPredictionsMap } from "@/lib/predictions";
import { SpecialResults } from "@/lib/specialResults";
import { MatchPredictionSummary } from "./predictionSummary";
import { Match } from "@/types/Match";

type MatchPredictionSummariesMap = {
    [matchId: string]: MatchPredictionSummary;
};

export type LeaderboardRow = {
    userId: string;
    name: string;
    photoURL?: string;
    avatarUrl?: string;
    points: number;
    matchPoints: number;
    specialPoints: number;
    exactScores: number;
    correctResults: number;
    failed: number;
    predictionsMade: number;
    // Advanced stats:
    accuracy: number;       // 0-100
    avgPoints: number;
    currentStreak: number;
    bestStreak: number;
};

function calculateStreaks(
    userId: string,
    matchPredictionSummaries: MatchPredictionSummariesMap,
    matchesByMatchId: Record<string, Match>
): { currentStreak: number; bestStreak: number } {
    // Collect all predictions for this user that have a finished result
    const userPredictions: { kickoff: number; points: number }[] = [];

    Object.values(matchPredictionSummaries).forEach((summary) => {
        const prediction = summary.predictions.find((p) => p.userId === userId);
        if (!prediction) return;

        const match = matchesByMatchId[summary.matchId];
        if (!match) return;

        userPredictions.push({
            kickoff: new Date(match.kickoff).getTime(),
            points: prediction.points,
        });
    });

    // Sort chronologically
    userPredictions.sort((a, b) => a.kickoff - b.kickoff);

    let bestStreak = 0;
    let currentStreak = 0;
    let runningStreak = 0;

    for (let i = 0; i < userPredictions.length; i++) {
        if (userPredictions[i].points > 0) {
            runningStreak++;
            if (runningStreak > bestStreak) bestStreak = runningStreak;
        } else {
            runningStreak = 0;
        }
    }

    // currentStreak: count backwards from last prediction
    for (let i = userPredictions.length - 1; i >= 0; i--) {
        if (userPredictions[i].points > 0) {
            currentStreak++;
        } else {
            break;
        }
    }

    return { currentStreak, bestStreak };
}

export function calculateLeaderboard(
    users: AppUser[],
    matchPredictionSummaries: MatchPredictionSummariesMap,
    specialPredictions: SpecialPredictionsMap,
    specialResults: SpecialResults | null,
    matches: Match[] = []
): LeaderboardRow[] {
    const matchesByMatchId = Object.fromEntries(matches.map((m) => [m.id, m]));

    const leaderboard = users.map((user) => {
        const userSpecialPrediction = specialPredictions[user.uid] ?? null;

        let matchPoints = 0;
        let exactScores = 0;
        let correctResults = 0;
        let failed = 0;
        let predictionsMade = 0;

        Object.values(matchPredictionSummaries).forEach((summary) => {
            const prediction = summary.predictions.find(
                (p) => p.userId === user.uid
            );

            if (!prediction) return;

            predictionsMade++;
            matchPoints += prediction.points;

            if (prediction.exactScore) exactScores++;
            else if (prediction.correctResult) correctResults++;
            else if (prediction.points === 0) failed++;
            // Legacy summaries without exactScore/correctResult: fall back to points
            else if (prediction.exactScore === undefined) {
                if (prediction.points >= 5) exactScores++;
                else if (prediction.points > 0) correctResults++;
                else failed++;
            }
        });

        const specialPoints = calculateSpecialPredictionPoints(
            userSpecialPrediction,
            specialResults
        );

        const accuracy = predictionsMade > 0
            ? Math.round(((exactScores + correctResults) / predictionsMade) * 100)
            : 0;

        const avgPoints = predictionsMade > 0
            ? Math.round((matchPoints / predictionsMade) * 10) / 10
            : 0;

        const { currentStreak, bestStreak } = calculateStreaks(
            user.uid,
            matchPredictionSummaries,
            matchesByMatchId
        );

        return {
            userId: user.uid,
            name: user.name.split(" ")[0],
            avatarUrl: user.avatarUrl ?? undefined,
            points: matchPoints + specialPoints,
            matchPoints,
            specialPoints,
            exactScores,
            correctResults,
            failed,
            predictionsMade,
            accuracy,
            avgPoints,
            currentStreak,
            bestStreak,
        };
    });

    return leaderboard.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
        if (b.correctResults !== a.correctResults) return b.correctResults - a.correctResults;
        return a.name.localeCompare(b.name);
    });
}
