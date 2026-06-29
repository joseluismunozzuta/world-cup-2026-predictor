// components/MyPredictionsTab.tsx
import { PredictionsMap, SpecialPrediction, StartedMatchPredictionsMap } from "@/lib/predictions";
import { ScoreResultSection } from "@/components/ScoreResultSection";
import { Match } from "@/types/Match";
import { ResultsMap } from "@/lib/results";
import { calculatePredictionPoints } from "@/utils/scoring";
import { teamsById } from "@/data/Teams";
import { SpecialPredictionsSection } from "./SpecialPredictionsSection";
import { AppUser } from "@/lib/users";
import { PredictionGroup } from "./PredictionGroup";
import { MatchPredictionSummary } from "@/utils/predictionSummary";
import { Prediction } from "@/types/Prediction";

type Props = {
    matches: Match[];
    myPredictions: Record<string, Prediction>;
    matchPredictionSummaries: Record<string, MatchPredictionSummary>;
    startedMatchPredictions: StartedMatchPredictionsMap;
    partyUsers: AppUser[];
    results: ResultsMap;
    onSelect: (match: Match) => void;
    onGoToMatches: () => void;
    specialPrediction: SpecialPrediction | null;
    hasWorldCupStarted: boolean;
    onSaveSpecialPredictionField: (
        field: "championTeamId" | "runnerUpTeamId" | "topScorerPlayerId" | "bestPlayerId",
        value: string
    ) => Promise<void>;
    now: number;
    currentUserId: string;
};

export function MyPredictionsTab({
    matches,
    myPredictions,
    partyUsers,
    results,
    onGoToMatches,
    specialPrediction,
    hasWorldCupStarted,
    onSaveSpecialPredictionField,
    onSelect,
    now,
    matchPredictionSummaries,
    startedMatchPredictions,
    currentUserId,
}: Props) {

    const predictedMatches = matches
        .filter((match) => myPredictions[match.id])
        .sort((a, b) => {
            const kickoffDiff = new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime();
            return kickoffDiff !== 0 ? kickoffDiff : b.matchNumber - a.matchNumber;
        });

    const pendingPredictions = predictedMatches.filter(
        (match) => results[match.id]?.status !== "finished"
    );

    const finishedPredictions = predictedMatches.filter(
        (match) => results[match.id]?.status === "finished"
    );

    const totalPoints = finishedPredictions.reduce((total, match) => {
        const prediction = myPredictions[match.id];
        const result = results[match.id];

        if (!prediction || !result) return total;

        return total + calculatePredictionPoints(prediction, result).points;
    }, 0);

    const exactHits = finishedPredictions.filter((match) => {
        const prediction = myPredictions[match.id];
        const result = results[match.id];

        if (!prediction || !result) return false;

        return calculatePredictionPoints(prediction, result).points === 5;
    }).length;

    return (
        <>
            <section>
                <SpecialPredictionsSection
                    prediction={specialPrediction}
                    hasWorldCupStarted={hasWorldCupStarted}
                    onSaveField={onSaveSpecialPredictionField}
                />
            </section>

            {predictedMatches.length === 0 ?
                <section className="rounded-3xl bg-white dark:bg-gray-800 px-6 py-10 text-center shadow-sm my-5">

                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-4xl">
                        📝
                    </div>

                    <h2 className="text-xl font-black text-gray-900 dark:text-gray-50">
                        Mis pronósticos
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Todavía no hiciste ningún pronóstico.
                        <br />
                        Ve a la pestaña Partidos y registra tus marcadores antes de que
                        empiece cada encuentro.
                    </p>

                    <button
                        onClick={onGoToMatches}
                        className="mt-6 w-full rounded-2xl bg-gray-900 py-4 text-sm font-black text-white"
                    >
                        Ver partidos
                    </button>
                </section>
                : <section className="space-y-5 my-5">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-50">
                            Mis pronósticos
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Revisa los marcadores que ya registraste.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <SummaryCard label="Hechos" value={predictedMatches.length} />
                        <SummaryCard label="Puntos" value={totalPoints} />
                        <SummaryCard label="Exactos" value={exactHits} />
                    </div>


                    {pendingPredictions.length > 0 && (
                        <PredictionGroup
                            title="🟡 Pendientes"
                            matches={pendingPredictions}
                            myPredictions={myPredictions}
                            matchPredictionSummaries={matchPredictionSummaries}
                            startedMatchPredictions={startedMatchPredictions}
                            partyUsers={partyUsers}
                            results={results}
                            mode='pending'
                            onSelect={onSelect}
                            now={now}
                            currentUserId={currentUserId}
                        />
                    )}


                    {finishedPredictions.length > 0 && (
                        <PredictionGroup
                            title="🟢 Finalizados"
                            matches={finishedPredictions}
                            myPredictions={myPredictions}
                            matchPredictionSummaries={matchPredictionSummaries}
                            startedMatchPredictions={startedMatchPredictions}
                            results={results}
                            partyUsers={partyUsers}
                            mode="finished"
                            onSelect={onSelect}
                            now={now}
                            currentUserId={currentUserId}
                        />
                    )}
                </section>
            }
        </>

    );
}

function SummaryCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-3xl bg-white dark:bg-gray-800 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-gray-900 dark:text-gray-50">{value}</p>
            <p className="mt-1 text-xs font-bold text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
}

