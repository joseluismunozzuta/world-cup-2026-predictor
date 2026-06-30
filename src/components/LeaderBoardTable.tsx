"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeaderboardRow } from "@/utils/leaderboard";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PlayerProfileModal } from "./PlayerProfileModal";
import { evaluateAchievements } from "@/utils/achievements";
import { SpecialPredictionsMap } from "@/lib/predictions";
import { SpecialResults } from "@/lib/specialResults";

type Props = {
    leaderboard: LeaderboardRow[];
    specialPredictions: SpecialPredictionsMap;
    specialResults: SpecialResults | null;
};

const MEDALS: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

function getMedal(leaderboard: LeaderboardRow[], index: number): string | null {
    const pts = leaderboard[index].points;
    if (pts === 0) return null;
    if (leaderboard[index + 1]?.points === pts) return null; // tied with next
    if (index > 0 && leaderboard[index - 1]?.points === pts) return null; // tied with prev
    return MEDALS[index] ?? null;
}

export function LeaderboardTable({ leaderboard, specialPredictions, specialResults }: Props) {
    const [selectedRow, setSelectedRow] = useState<{ row: LeaderboardRow; rank: number } | null>(null);

    return (
        <>
            <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 my-4 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Jugador</TableHead>
                            <TableHead className="text-center">Pts</TableHead>
                            <TableHead className="text-center">🎯</TableHead>
                            <TableHead className="text-center">✅</TableHead>
                            <TableHead className="text-center">❌</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {leaderboard.map((row, index) => {
                            const rank = index + 1;
                            const medal = getMedal(leaderboard, index);
                            const unlockedCount = evaluateAchievements(row).filter((a) => a.unlocked).length;
                            const hasStreak = row.currentStreak >= 3;

                            return (
                                <TableRow
                                    key={row.userId}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors"
                                    onClick={() => setSelectedRow({ row, rank })}
                                >
                                    <TableCell className="font-bold text-gray-500 dark:text-gray-400">
                                        {medal ?? rank}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8 shrink-0">
                                                <AvatarImage
                                                    src={row.avatarUrl ?? row.photoURL ?? undefined}
                                                    referrerPolicy="no-referrer"
                                                />
                                                <AvatarFallback className="text-xs font-black">
                                                    {row.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
                                                        {row.name}
                                                    </span>
                                                    {hasStreak && (
                                                        <span className="text-xs">🔥</span>
                                                    )}
                                                </div>
                                                {unlockedCount > 0 && (
                                                    <p className="text-xs text-gray-400">
                                                        {unlockedCount} distintivo{unlockedCount !== 1 ? "s" : ""}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-center font-black text-gray-950 dark:text-gray-50">
                                        {row.points}
                                    </TableCell>

                                    <TableCell className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {row.exactScores}
                                    </TableCell>

                                    <TableCell className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {row.correctResults}
                                    </TableCell>

                                    <TableCell className="text-center text-sm font-semibold text-gray-400 dark:text-gray-500">
                                        {row.failed}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 -mt-2">
                Toca un jugador para ver su perfil completo
            </p>

            {selectedRow && (
                <PlayerProfileModal
                    row={selectedRow.row}
                    rank={selectedRow.rank}
                    specialPrediction={specialPredictions[selectedRow.row.userId]}
                    specialResults={specialResults}
                    onClose={() => setSelectedRow(null)}
                />
            )}
        </>
    );
}
