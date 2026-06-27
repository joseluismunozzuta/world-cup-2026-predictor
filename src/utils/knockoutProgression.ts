import { matchesData } from "@/data/matchesData";
import { Match } from "@/types/Match";

type Propagation = {
    targetMatchId: string;
    slot: "home" | "away";
    useLoser: boolean; // true for third-place match
};

// Build map: sourceMatchNumber → list of propagations
function buildProgressionMap(): Map<number, Propagation[]> {
    const map = new Map<number, Propagation[]>();

    const byNumber = new Map<number, Match>();
    for (const m of matchesData) {
        byNumber.set(m.matchNumber, m);
    }

    for (const match of matchesData) {
        if (match.stage === "group") continue;

        const slots: { label: string | null | undefined; slot: "home" | "away" }[] = [
            { label: match.homeLabel, slot: "home" },
            { label: match.awayLabel, slot: "away" },
        ];

        for (const { label, slot } of slots) {
            if (!label) continue;

            const winnerMatch = label.match(/^Winner Match (\d+)$/);
            const loserMatch = label.match(/^Loser Match (\d+)$/);

            const srcNumber = winnerMatch
                ? parseInt(winnerMatch[1])
                : loserMatch
                ? parseInt(loserMatch[1])
                : null;

            if (srcNumber === null) continue;

            const existing = map.get(srcNumber) ?? [];
            existing.push({ targetMatchId: match.id, slot, useLoser: !!loserMatch });
            map.set(srcNumber, existing);
        }
    }

    return map;
}

const progressionMap = buildProgressionMap();

export type KnockoutProgression = {
    targetMatchId: string;
    slot: "home" | "away";
    teamId: string; // the team to assign
};

/**
 * Given a finished knockout match and its result, returns the knockout team
 * assignments that should be propagated to subsequent matches.
 */
export function getKnockoutProgressions(
    match: Match,
    qualifiedTeamId: string | undefined, // winner
): KnockoutProgression[] {
    const propagations = progressionMap.get(match.matchNumber);
    if (!propagations || !qualifiedTeamId) return [];

    const loserId = qualifiedTeamId === match.homeTeamId
        ? match.awayTeamId
        : match.homeTeamId;

    const result: KnockoutProgression[] = [];

    for (const p of propagations) {
        const teamId = p.useLoser ? loserId : qualifiedTeamId;
        if (!teamId) continue;
        result.push({ targetMatchId: p.targetMatchId, slot: p.slot, teamId });
    }

    return result;
}
