import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { teamsByFifaCode } from "@/data/Teams";
import { calculatePredictionPoints } from "@/utils/scoring";
import { StartedMatchPredictionsMap } from "@/lib/predictions";
import { ResultsMap } from "@/lib/results";
import { AppUser } from "@/lib/users";
import { Match } from "@/types/Match";
import { ScoreResultSection } from "./ScoreResultSection";
import { useRef, useState } from "react";
import { getMatchStatus } from "@/utils/matchstatus";
import { MatchPredictionSummary } from "@/utils/predictionSummary";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { PredictionShareCard } from "./PredictionShareCard";
import { PredictionGroupShareCard } from "./PredictionGroupShareCard";
import { shareOrDownloadImage, fetchFlagDataUrl } from "@/utils/shareImage";

type ShareTarget = {
    homeTeamName: string;
    awayTeamName: string;
    homeFlagDataUrl: string;
    awayFlagDataUrl: string;
    prediction: { homeScore: number; awayScore: number; jokerActivated?: boolean };
    result: { homeScore: number; awayScore: number };
    points: number;
    userName: string;
};

type GroupShareTarget = {
    homeTeamName: string;
    awayTeamName: string;
    homeFlagDataUrl: string;
    awayFlagDataUrl: string;
    result: { homeScore: number; awayScore: number };
    predictions: { userName: string; homeScore: number; awayScore: number; points: number; jokerActivated?: boolean; isCurrentUser?: boolean }[];
};

export function PredictionGroup({
    title,
    matches,
    myPredictions,
    results,
    mode,
    matchPredictionSummaries,
    partyUsers,
    onSelect, now, startedMatchPredictions,
    currentUserId,
}: {
    title: string;
    matches: Match[];
    matchPredictionSummaries: Record<string, MatchPredictionSummary>;
    partyUsers: AppUser[];
    myPredictions: Record<
        string,
        {
            homeScore: number;
            awayScore: number;
        }
    >;
    results: ResultsMap;
    startedMatchPredictions: StartedMatchPredictionsMap;
    mode: string;
    onSelect: (match: Match) => void;
    now: number;
    currentUserId?: string;
}) {
    const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
    const [groupShareTarget, setGroupShareTarget] = useState<GroupShareTarget | null>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [loadingShareMatchId, setLoadingShareMatchId] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const groupCardRef = useRef<HTMLDivElement>(null);

    const handleShare = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
        if (!ref.current) return;
        setIsSharing(true);
        try {
            await shareOrDownloadImage(ref.current, filename);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <>
        {/* Individual share overlay */}
        {shareTarget && (
            <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 px-6"
                onClick={() => setShareTarget(null)}
            >
                <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-5">
                    <PredictionShareCard ref={cardRef} {...shareTarget} />
                    <div className="flex gap-3 w-full" style={{ maxWidth: 360 }}>
                        <button
                            onClick={() => setShareTarget(null)}
                            className="flex-1 rounded-2xl bg-white/10 py-3 text-sm font-bold text-white"
                        >
                            Cerrar
                        </button>
                        <button
                            disabled={isSharing}
                            onClick={() => handleShare(cardRef, "mi-pronostico")}
                            className="flex-1 rounded-2xl bg-white py-3 text-sm font-black text-gray-900 disabled:opacity-60"
                        >
                            {isSharing ? "Generando..." : "Compartir ↗"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Group share overlay */}
        {groupShareTarget && (
            <div
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 px-6"
                onClick={() => setGroupShareTarget(null)}
            >
                <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-5">
                    <PredictionGroupShareCard ref={groupCardRef} {...groupShareTarget} />
                    <div className="flex gap-3 w-full" style={{ maxWidth: 360 }}>
                        <button
                            onClick={() => setGroupShareTarget(null)}
                            className="flex-1 rounded-2xl bg-white/10 py-3 text-sm font-bold text-white"
                        >
                            Cerrar
                        </button>
                        <button
                            disabled={isSharing}
                            onClick={() => handleShare(groupCardRef, "polla-partido")}
                            className="flex-1 rounded-2xl bg-white py-3 text-sm font-black text-gray-900 disabled:opacity-60"
                        >
                            {isSharing ? "Generando..." : "Compartir ↗"}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 xl:grid-cols-3">
            <h3 className="px-1 text-base font-black text-gray-900 dark:text-gray-50">
                {title}
            </h3>

            {matches.map((match) => {
                const status = getMatchStatus(match, results[match.id], now);
                const matchStarted = status !== "scheduled";
                const homeTeam = match.homeTeamId ? teamsByFifaCode[match.homeTeamId] : null;
                const awayTeam = match.awayTeamId ? teamsByFifaCode[match.awayTeamId] : null;
                const prediction = myPredictions[match.id];
                const result = results[match.id];

                if (!homeTeam || !awayTeam || !prediction) return null;

                const points =
                    result?.status === "finished"
                        ? calculatePredictionPoints(prediction, result).points
                        : null;

                return (
                    <article
                        key={match.id}
                        onClick={() => onSelect(match)}
                        className={`cursor-pointer rounded-3xl p-4 shadow-lg ${mode === "finished" ? "bg-teal-50 dark:bg-teal-950/40 dark:shadow-emerald-950 dark:shadow-sm" : "bg-pink-50 dark:bg-pink-950/40 dark:shadow-pink-950 dark:shadow-sm"
                            }`}
                    >
                        <div className="my-1 flex items-center justify-between gap-3">

                            {result?.status !== "finished" &&
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                    {formatMatchDate(match.kickoff)}
                                </p>
                            }

                            {points !== null && (
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-black ${points > 0
                                        ? "bg-green-600 text-white"
                                        : "bg-red-100 text-gray-600"
                                        }`}
                                >
                                    +{points} pts
                                </span>
                            )}
                        </div>

                        <div className="flex flex-row items-center justify-between">
                            <p className="text-center w-20 shrink-0 text-[9px] font-light capitalize leading-tight tracking-wide text-gray-500 dark:text-gray-400">
                                Tu pronóstico
                            </p>
                            <div className="w-full">
                                <ScoreResultSection
                                    homeTeam={homeTeam}
                                    awayTeam={awayTeam}
                                    result={{
                                        matchId: match.id,
                                        homeScore: prediction.homeScore,
                                        awayScore: prediction.awayScore,
                                        status: "scheduled",
                                    }}
                                />
                            </div>
                        </div>

                        {"jokerActivated" in prediction && (prediction as { jokerActivated?: boolean }).jokerActivated && (
                            <div className="flex justify-center mt-1 mb-1">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-[10px] font-black text-purple-700">
                                    🃏 Joker activado · x2
                                </span>
                            </div>
                        )}

                        {result?.status === "finished" && (
                            <div className="flex flex-row items-center justify-between">
                                <p className="text-center w-20 shrink-0 text-[11px] font-semibold capitalize leading-tight tracking-wide text-gray-900 dark:text-gray-100">
                                    Resultado
                                </p>
                                <div className="w-full">
                                    <ScoreResultSection
                                        homeTeam={homeTeam}
                                        awayTeam={awayTeam}
                                        result={result}
                                    />
                                </div>

                            </div>
                        )}

                        {matchStarted && (
                            <Accordion
                                className="mt-4 rounded-2xl bg-white/70 dark:bg-white/10 px-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <AccordionItem value="details" className="border-none">
                                    <AccordionTrigger className="py-3 text-sm font-black text-gray-700 dark:text-gray-200 hover:no-underline">
                                        Ver pronósticos de todos
                                    </AccordionTrigger>

                                    <AccordionContent className="py-0.5">
                                        <div>
                                            {(() => {
                                                const isFinished = result?.status === "finished";

                                                const predictionsToShow = isFinished
                                                    ? matchPredictionSummaries[match.id]?.predictions ?? []
                                                    : startedMatchPredictions[match.id] ?? [];

                                                if (predictionsToShow.length === 0) {
                                                    return (
                                                        <p className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
                                                            Todavía no hay pronósticos para mostrar.
                                                        </p>
                                                    );
                                                }

                                                const predictionsByUserId = Object.fromEntries(
                                                    predictionsToShow.map((prediction) => [
                                                        prediction.userId,
                                                        prediction,
                                                    ])
                                                );

                                                const sortedUsers = [...partyUsers].sort((a, b) => {
                                                    const pA = predictionsByUserId[a.uid];
                                                    const pB = predictionsByUserId[b.uid];
                                                    // Users without prediction go last
                                                    if (!pA && !pB) return 0;
                                                    if (!pA) return 1;
                                                    if (!pB) return -1;
                                                    if (!isFinished) return 0;
                                                    const pointsA = "points" in pA ? (pA.points as number) : -1;
                                                    const pointsB = "points" in pB ? (pB.points as number) : -1;
                                                    return pointsB - pointsA;
                                                });

                                                return (
                                                    <div className="rounded-2xl bg-gray-50 dark:bg-white/10 divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
                                                        {sortedUsers.map((user) => {
                                                            const userPrediction = predictionsByUserId[user.uid];

                                                            if (!userPrediction) {
                                                                return (
                                                                    <div key={user.uid} className="flex items-center gap-2 px-3 py-1.5">
                                                                        <Avatar className="h-6 w-6 shrink-0">
                                                                            <AvatarImage src={user.avatarUrl ?? user.photoURL ?? undefined} referrerPolicy="no-referrer" />
                                                                            <AvatarFallback className="text-[9px]">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                                                                        </Avatar>
                                                                        <span className="flex-1 truncate text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                                                                            {user.name}
                                                                        </span>
                                                                        <span className="text-[9px] font-black uppercase tracking-wide text-gray-300 dark:text-gray-600">
                                                                            No pronosticó
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }

                                                            const points =
                                                                isFinished && "points" in userPrediction
                                                                    ? userPrediction.points
                                                                    : null;

                                                            const isKnockout = match.stage !== "group";
                                                            const qualifiedTeamId = "qualifiedTeamId" in userPrediction ? userPrediction.qualifiedTeamId : undefined;
                                                            const penaltiesIfDraw = "penaltiesIfDraw" in userPrediction ? userPrediction.penaltiesIfDraw : undefined;
                                                            const qualifiedTeam = qualifiedTeamId ? teamsByFifaCode[qualifiedTeamId] : null;
                                                            const isDraw = userPrediction.homeScore === userPrediction.awayScore;

                                                            const isMyRow = isFinished && currentUserId && user.uid === currentUserId && homeTeam && awayTeam && result;

                                                            return (
                                                                <div key={user.uid} className="px-3 py-1.5 text-sm space-y-0.5">
                                                                    <div className="flex items-center gap-1">
                                                                        <div className={`${isMyRow ? "w-[50%]" : "w-[62%]"} flex items-center gap-2 min-w-0`}>
                                                                            <Avatar className="h-6 w-6 shrink-0">
                                                                                <AvatarImage
                                                                                    src={user.avatarUrl ?? user.photoURL ?? undefined}
                                                                                    referrerPolicy="no-referrer"
                                                                                />
                                                                                <AvatarFallback className="text-[9px]">
                                                                                    {user.name.charAt(0).toUpperCase()}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="truncate font-semibold text-gray-800 dark:text-gray-100 text-[11px]">
                                                                                {"userName" in userPrediction ? userPrediction.userName : user.name}
                                                                            </span>
                                                                        </div>

                                                                        <div className={`${isMyRow ? "w-[15%]" : "w-[18%]"} text-sm text-gray-700 dark:text-gray-200 font-bold text-center flex items-center justify-center gap-1`}>
                                                                            {userPrediction.homeScore}-{userPrediction.awayScore}
                                                                            {"jokerActivated" in userPrediction && userPrediction.jokerActivated && (
                                                                                <span title="Joker activado">🃏</span>
                                                                            )}
                                                                        </div>

                                                                        {points !== null && (
                                                                            <span
                                                                                className={`${isMyRow ? "w-[22%]" : "w-[20%]"} rounded-full px-2 py-0.5 text-xs font-black text-center ${points > 0
                                                                                        ? "bg-green-100 text-green-700"
                                                                                        : "bg-red-200 text-red-500"
                                                                                    }`}
                                                                            >
                                                                                +{points}
                                                                            </span>
                                                                        )}

                                                                        {isMyRow && (
                                                                            <div className="w-[13%] flex justify-end flex-shrink-0">
                                                                                <button
                                                                                    disabled={loadingShareMatchId === match.id}
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        setLoadingShareMatchId(match.id);
                                                                                        const [homeFlagDataUrl, awayFlagDataUrl] = await Promise.all([
                                                                                            fetchFlagDataUrl(homeTeam.iso2),
                                                                                            fetchFlagDataUrl(awayTeam.iso2),
                                                                                        ]);
                                                                                        setLoadingShareMatchId(null);
                                                                                        setShareTarget({
                                                                                            homeTeamName: homeTeam.name,
                                                                                            awayTeamName: awayTeam.name,
                                                                                            homeFlagDataUrl,
                                                                                            awayFlagDataUrl,
                                                                                            prediction: {
                                                                                                homeScore: userPrediction.homeScore,
                                                                                                awayScore: userPrediction.awayScore,
                                                                                                jokerActivated: "jokerActivated" in userPrediction ? (userPrediction.jokerActivated as boolean) : false,
                                                                                            },
                                                                                            result: { homeScore: result.homeScore, awayScore: result.awayScore },
                                                                                            points: points ?? 0,
                                                                                            userName: user.name,
                                                                                        });
                                                                                    }}
                                                                                    className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-md hover:scale-105 transition-transform disabled:opacity-50"
                                                                                    title="Compartir mi pronóstico"
                                                                                >
                                                                                    {loadingShareMatchId === match.id
                                                                                        ? <span className="text-[9px]">...</span>
                                                                                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                                                                                    }
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {isKnockout && qualifiedTeam && (
                                                                        <div className="flex items-center gap-2 pl-8 text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                                                            <span>Clasifica:</span>
                                                                            <span className="font-bold text-gray-700 dark:text-gray-200">{qualifiedTeam.name}</span>
                                                                            {isDraw && penaltiesIfDraw !== undefined && (
                                                                                <>
                                                                                    <span className="text-gray-300">·</span>
                                                                                    <span>Penales: <span className="font-bold text-gray-700">{penaltiesIfDraw ? "Sí" : "No"}</span></span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Group share button — only for finished matches */}
                                        {result?.status === "finished" && homeTeam && awayTeam && (
                                            <button
                                                disabled={loadingShareMatchId === `group-${match.id}`}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setLoadingShareMatchId(`group-${match.id}`);
                                                    const allPredictions = matchPredictionSummaries[match.id]?.predictions ?? [];
                                                    const [homeFlagDataUrl, awayFlagDataUrl] = await Promise.all([
                                                        fetchFlagDataUrl(homeTeam.iso2),
                                                        fetchFlagDataUrl(awayTeam.iso2),
                                                    ]);
                                                    setLoadingShareMatchId(null);
                                                    setGroupShareTarget({
                                                        homeTeamName: homeTeam.name,
                                                        awayTeamName: awayTeam.name,
                                                        homeFlagDataUrl,
                                                        awayFlagDataUrl,
                                                        result: { homeScore: result.homeScore, awayScore: result.awayScore },
                                                        predictions: allPredictions.map(p => ({
                                                            userName: p.userName,
                                                            homeScore: p.homeScore,
                                                            awayScore: p.awayScore,
                                                            points: p.points,
                                                            jokerActivated: p.jokerActivated,
                                                            isCurrentUser: p.userId === currentUserId,
                                                        })),
                                                    });
                                                }}
                                                className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 py-2.5 text-xs font-black text-white shadow-md hover:opacity-90 transition disabled:opacity-50"
                                            >
                                                {loadingShareMatchId === `group-${match.id}`
                                                    ? "Generando..."
                                                    : <>
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                                                        Compartir tabla del partido
                                                    </>
                                                }
                                            </button>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        )}


                    </article>
                );
            })}
        </div>
        </>
    );
}

function formatMatchDate(kickoff: string) {
    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Lima",
    }).format(new Date(kickoff));
}
