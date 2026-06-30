"use client";

import { LeaderboardRow } from "@/utils/leaderboard";
import { evaluateAchievements, TIER_STYLES } from "@/utils/achievements";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { SpecialPrediction } from "@/lib/predictions";
import { SpecialResults } from "@/lib/specialResults";
import { teamsByFifaCode, teamsById } from "@/data/Teams";

import { playersById } from "@/data/players";
import { CountryFlag } from "./CountryFlag";

type Props = {
    row: LeaderboardRow;
    rank: number;
    specialPrediction?: SpecialPrediction;
    specialResults: SpecialResults | null;
    onClose: () => void;
};

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
            <p className="text-2xl font-black text-gray-950 dark:text-gray-50">{value}</p>
            {sub && <p className="text-xs font-bold text-green-600 dark:text-green-400">{sub}</p>}
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</p>
        </div>
    );
}

export function PlayerProfileModal({ row, rank, specialPrediction, specialResults, onClose }: Props) {
    const achievements = evaluateAchievements(row);
    const unlocked = achievements.filter((a) => a.unlocked);
    const locked = achievements.filter((a) => !a.unlocked);

    const rankMedal = RANK_MEDAL[rank];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-gray-100 dark:bg-gray-900 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header con gradiente */}
                <div className="relative bg-linear-to-br from-gray-900 to-gray-700 rounded-t-3xl sm:rounded-t-3xl px-6 pt-8 pb-6">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white"
                    >
                        ✕
                    </button>

                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <Avatar className="h-20 w-20 ring-4 ring-violet-400/80">
                                <AvatarImage
                                    src={row.avatarUrl ?? row.photoURL ?? undefined}
                                    referrerPolicy="no-referrer"
                                />
                                <AvatarFallback className="text-2xl font-black bg-gray-600 text-white">
                                    {row.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {rankMedal && (
                                <span className="absolute -bottom-1 -right-1 text-2xl">{rankMedal}</span>
                            )}
                        </div>

                        <h2 className="mt-4 text-2xl font-black text-white">{row.name}</h2>

                        <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-300">
                                #{rank} en el ranking
                            </span>
                            {row.currentStreak >= 3 && (
                                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-black text-white">
                                    🔥 {row.currentStreak} racha
                                </span>
                            )}
                        </div>

                        {/* Puntos destacados */}
                        <div className="mt-5 flex items-end gap-1">
                            <span className="text-5xl font-black text-white">{row.points}</span>
                            <span className="mb-1 text-lg font-bold text-gray-300">pts</span>
                        </div>

                        {row.specialPoints > 0 && (
                            <p className="mt-1 text-xs text-gray-400">
                                {row.matchPoints} partidos + {row.specialPoints} especiales
                            </p>
                        )}
                    </div>
                </div>

                {/* Stats grid */}
                <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
                    <StatCard label="Exactos" value={row.exactScores} />
                    <StatCard label="Aciertos" value={row.correctResults} />
                    <StatCard label="Fallos" value={row.failed} />
                </div>

                <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
                    <StatCard
                        label="Precisión"
                        value={`${row.accuracy}%`}
                        sub={row.accuracy >= 70 ? "🎯 Alto" : row.accuracy >= 50 ? "📈 Medio" : undefined}
                    />
                    <StatCard label="Pts/partido" value={row.avgPoints} />
                    <StatCard label="Pronósticos" value={row.predictionsMade} />
                </div>

                {/* Pronósticos especiales */}
                {specialPrediction && (() => {
                    const championTeam = specialPrediction.championTeamId ? teamsById[specialPrediction.championTeamId] ?? null : null;
                    const runnerUpTeam = specialPrediction.runnerUpTeamId ? teamsById[specialPrediction.runnerUpTeamId] ?? null : null;
                    const topScorer = specialPrediction.topScorerPlayerId ? playersById[specialPrediction.topScorerPlayerId] ?? null : null;
                    const bestPlayer = specialPrediction.bestPlayerId ? playersById[specialPrediction.bestPlayerId] ?? null : null;
                    const topScorerTeam = topScorer ? teamsByFifaCode[topScorer.teamId] ?? null : null;
                    const bestPlayerTeam = bestPlayer ? teamsByFifaCode[bestPlayer.teamId] ?? null : null;

                    const items = [
                        { label: "🏆 Campeón", team: championTeam, resultId: specialResults?.championTeamId, predId: specialPrediction.championTeamId },
                        { label: "🥈 Subcampeón", team: runnerUpTeam, resultId: specialResults?.runnerUpTeamId, predId: specialPrediction.runnerUpTeamId },
                        { label: "⚽ Goleador", player: topScorer, flagTeam: topScorerTeam, resultId: specialResults?.topScorerPlayerId, predId: specialPrediction.topScorerPlayerId },
                        { label: "⭐ Mejor jugador", player: bestPlayer, flagTeam: bestPlayerTeam, resultId: specialResults?.bestPlayerId, predId: specialPrediction.bestPlayerId },
                    ];

                    return (
                        <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Pronósticos especiales</p>
                            <div className="grid grid-cols-2 gap-2">
                                {items.map(({ label, team, player, flagTeam, resultId, predId }) => {
                                    const hit = resultId && predId === resultId;
                                    const miss = resultId && predId !== resultId;
                                    const bgClass = hit
                                        ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                        : miss
                                        ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600";
                                    return (
                                        <div key={label} className={`rounded-xl border p-3 flex flex-col gap-2 ${bgClass}`}>
                                            <p className="text-[10px] text-center font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">{label}</p>
                                            {team ? (
                                                <>
                                                    <CountryFlag homeTeam={team} className="h-5 w-8 mx-auto flex justify-center rounded object-cover shadow-sm" />
                                                    <div className="flex items-center justify-between mx-auto">
                                                        <span className="text-sm font-black text-gray-800 dark:text-gray-100">{team.nameEs}</span>
                                                        {hit && <span className="text-base text-green-500">✓</span>}
                                                        {miss && <span className="text-base text-red-400">✗</span>}
                                                    </div>
                                                </>
                                            ) : player ? (
                                                <>
                                                    {flagTeam && <CountryFlag homeTeam={flagTeam} className="h-5 w-8 mx-auto flex rounded object-cover shadow-sm" />}
                                                    <div className="flex mx-auto items-center justify-between">
                                                        <span className="text-sm capitalize font-black text-gray-800 dark:text-gray-100 leading-tight">{player.shirtName.toLowerCase()}</span>
                                                        {hit && <span className="text-base text-green-500">✓</span>}
                                                        {miss && <span className="text-base text-red-400">✗</span>}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">Sin pronóstico</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {(() => {
                                const raw = specialPrediction.updatedAt ?? specialPrediction.createdAt;
                                const date =
                                    raw && typeof raw === "object" && "toDate" in raw && typeof (raw as { toDate: unknown }).toDate === "function"
                                        ? (raw as { toDate: () => Date }).toDate()
                                        : null;
                                if (!date) return null;
                                return (
                                    <p className="mt-3 text-center text-[10px] text-gray-400 dark:text-gray-500">
                                        Agregado el {date.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })} a las {date.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}
                                    </p>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* Rachas */}
                <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Rachas</p>
                    <div className="flex justify-around">
                        <div className="text-center">
                            <p className="text-3xl font-black text-gray-950 dark:text-gray-50">
                                {row.currentStreak > 0 ? `🔥 ${row.currentStreak}` : row.currentStreak}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Actual</p>
                        </div>
                        <div className="w-px bg-gray-100 dark:bg-gray-700" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-gray-950 dark:text-gray-50">
                                {row.bestStreak > 0 ? `⭐ ${row.bestStreak}` : row.bestStreak}
                            </p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Mejor racha</p>
                        </div>
                    </div>
                </div>

                {/* Jokers */}
                <div className="mx-4 mt-3 rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">Jokers 🃏</p>
                    <div className="flex justify-around">
                        <div className="text-center">
                            <p className="text-3xl font-black text-gray-950 dark:text-gray-50">{3 + row.jokersEarned - row.jokersUsed}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Disponibles</p>
                        </div>
                        <div className="w-px bg-gray-100 dark:bg-gray-700" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{row.jokersUsed}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Usados</p>
                        </div>
                        <div className="w-px bg-gray-100 dark:bg-gray-700" />
                        <div className="text-center">
                            <p className="text-3xl font-black text-green-600 dark:text-green-400">+{row.jokersEarned}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">Ganados</p>
                        </div>
                    </div>

                    {row.jokersEarnedBreakdown.length > 0 && (
                        <div className="mt-4 space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-3">
                            {row.jokersEarnedBreakdown.map((entry, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-sm">🃏</span>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        +1 por racha de{" "}
                                        {entry.reason === "exact_streak"
                                            ? <span className="font-black text-green-600 dark:text-green-400">{entry.streakCount} exactos</span>
                                            : <span className="font-black text-blue-600 dark:text-blue-400">{entry.streakCount} aciertos</span>
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Achievements */}
                <div className="mx-4 mt-3 mb-6">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-3">
                        Distintivos
                        {unlocked.length > 0 && (
                            <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-green-700 dark:text-green-400 normal-case">
                                {unlocked.length}/{achievements.length}
                            </span>
                        )}
                    </p>

                    {unlocked.length === 0 && (
                        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 text-center shadow-sm">
                            <p className="text-2xl">🏅</p>
                            <p className="mt-2 text-sm font-bold text-gray-500 dark:text-gray-400">
                                Todavía sin distintivos. ¡A pronosticar!
                            </p>
                        </div>
                    )}

                    {unlocked.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            {unlocked.map((a) => {
                                const style = TIER_STYLES[a.tier];
                                return (
                                    <div
                                        key={a.id}
                                        className={`rounded-2xl border p-3 ${style.bg} ${style.border}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{a.emoji}</span>
                                            <div>
                                                <p className={`text-sm font-black ${style.text}`}>{a.title}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bloqueados — mostrar más sutiles */}
                    {locked.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Por desbloquear</p>
                            <div className="grid grid-cols-2 gap-2">
                                {locked.map((a) => (
                                    <div
                                        key={a.id}
                                        className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 opacity-40"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl grayscale">{a.emoji}</span>
                                            <div>
                                                <p className="text-sm font-black text-gray-400 dark:text-gray-500">{a.title}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{a.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
