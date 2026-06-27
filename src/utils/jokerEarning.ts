import { MatchPredictionSummary } from "./predictionSummary";
import { Match } from "@/types/Match";

export type JokerEarnedEntry = {
    reason: "exact_streak" | "aciertos_streak";
    streakCount: number;
};

export type JokerEarningResult = {
    total: number;
    breakdown: JokerEarnedEntry[];
};

export function calculateEarnedJokers(
    userId: string,
    matchPredictionSummaries: Record<string, MatchPredictionSummary>,
    matchesByMatchId: Record<string, Match>,
    jokerEarningStartDate: Date | null
): JokerEarningResult {
    if (!jokerEarningStartDate) return { total: 0, breakdown: [] };

    const startTime = jokerEarningStartDate.getTime();

    const entries: { kickoff: number; exactScore: boolean; correctResult: boolean }[] = [];

    Object.values(matchPredictionSummaries).forEach((summary) => {
        const prediction = summary.predictions.find((p) => p.userId === userId);
        if (!prediction) return;

        const match = matchesByMatchId[summary.matchId];
        if (!match) return;

        const kickoff = new Date(match.kickoff).getTime();
        if (kickoff < startTime) return;

        entries.push({
            kickoff,
            exactScore: prediction.exactScore ?? false,
            correctResult: prediction.correctResult ?? false,
        });
    });

    entries.sort((a, b) => a.kickoff - b.kickoff);

    const breakdown: JokerEarnedEntry[] = [];
    let exactStreak = 0;
    let aciertosStreak = 0;

    for (const entry of entries) {
        if (entry.exactScore) {
            exactStreak++;
            if (exactStreak % 2 === 0) {
                breakdown.push({ reason: "exact_streak", streakCount: exactStreak });
            }
        } else {
            exactStreak = 0;
        }

        if (entry.exactScore || entry.correctResult) {
            aciertosStreak++;
            if (aciertosStreak % 6 === 0) {
                breakdown.push({ reason: "aciertos_streak", streakCount: aciertosStreak });
            }
        } else {
            aciertosStreak = 0;
        }
    }

    return { total: breakdown.length, breakdown };
}
