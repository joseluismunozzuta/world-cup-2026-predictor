import { SpecialPrediction } from "@/lib/predictions";
import { SpecialResults } from "@/lib/specialResults";
import { MatchResult } from "@/types/MatchResult";
import { Prediction, ScoreResult } from "@/types/Prediction";

function getOutcome(homeScore: number, awayScore: number) {
    if (homeScore > awayScore) return "home";
    if (homeScore < awayScore) return "away";
    return "draw";
}

function calculateBasePoints(prediction: Prediction, result: MatchResult): { basePoints: number; reason: ScoreResult["reason"]; exactScore: boolean; correctResult: boolean } {
    const exactScore =
        prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;
    const predictedOutcome = getOutcome(prediction.homeScore, prediction.awayScore);
    const realOutcome = getOutcome(result.homeScore, result.awayScore);
    const correctResult = predictedOutcome === realOutcome;

    if (exactScore) return { basePoints: 5, reason: "exact_score", exactScore: true, correctResult: true };
    if (correctResult) return { basePoints: 3, reason: "correct_result", exactScore: false, correctResult: true };
    return { basePoints: 0, reason: "failed", exactScore: false, correctResult: false };
}

export function calculatePredictionPoints(
    prediction: Prediction,
    result: MatchResult
): ScoreResult {
    const { basePoints, reason, exactScore, correctResult } = calculateBasePoints(prediction, result);

    const isKnockoutResult = result.qualifiedTeamId !== undefined || result.wentToPenalties !== undefined;

    if (!isKnockoutResult) {
        const points = prediction.jokerActivated && basePoints > 0 ? basePoints * 2 : basePoints;
        return { points, reason, exactScore, correctResult };
    }

    // --- Knockout scoring ---

    // Qualifier points (+5): prediction.qualifiedTeamId is always set for knockout
    // (either manually for draw predictions, or auto-derived for non-draw before saving)
    let qualifierPoints = 0;
    if (result.qualifiedTeamId && prediction.qualifiedTeamId) {
        if (prediction.qualifiedTeamId === result.qualifiedTeamId) qualifierPoints = 5;
    }

    // Penalties points (+5): awarded for correctly predicting how the match was decided
    let penaltiesPoints = 0;
    const resultWasDraw = result.homeScore === result.awayScore;
    const predictedDraw = prediction.homeScore === prediction.awayScore;

    if (resultWasDraw && result.wentToPenalties !== undefined) {
        // Real draw: user must have engaged (predicted draw or modified during window)
        const userEngaged = predictedDraw || prediction.penaltiesIfDraw !== undefined;
        if (userEngaged) {
            const predictedPenalties = prediction.penaltiesIfDraw ?? false;
            if (predictedPenalties === result.wentToPenalties) penaltiesPoints = 5;
        }
    } else if (!resultWasDraw && !predictedDraw) {
        // Real direct win and user predicted a direct win → correctly predicted no extra time
        penaltiesPoints = 5;
    }

    // Conviction bonus (+10): predicted draw + didn't modify + all 3 correct
    let convictionBonus = 0;
    if (predictedDraw && resultWasDraw && !prediction.modifiedDuringWindow &&
        basePoints === 5 && qualifierPoints === 5 && penaltiesPoints === 5) {
        convictionBonus = 10;
    }

    const boostedBase = prediction.jokerActivated && basePoints > 0 ? basePoints * 2 : basePoints;
    const total = boostedBase + qualifierPoints + penaltiesPoints + convictionBonus;

    return {
        points: total,
        reason,
        exactScore,
        correctResult,
        basePoints,
        qualifierPoints,
        penaltiesPoints,
        convictionBonus,
    };
}

export function calculateSpecialPredictionPoints(
    userSpecialPrediction: SpecialPrediction | null,
    specialResults: SpecialResults | null
) {
    let points = 0;

    if (!userSpecialPrediction || !specialResults) return points;

    if (
        userSpecialPrediction.championTeamId &&
        userSpecialPrediction.championTeamId === specialResults.championTeamId
    ) {
        points += 20;
    }

    if (
        userSpecialPrediction.runnerUpTeamId &&
        userSpecialPrediction.runnerUpTeamId === specialResults.runnerUpTeamId
    ) {
        points += 10;
    }

    if (
        userSpecialPrediction.topScorerPlayerId &&
        userSpecialPrediction.topScorerPlayerId === specialResults.topScorerPlayerId
    ) {
        points += 10;
    }

    if (
        userSpecialPrediction.bestPlayerId &&
        userSpecialPrediction.bestPlayerId === specialResults.bestPlayerId
    ) {
        points += 10;
    }

    return points;
}