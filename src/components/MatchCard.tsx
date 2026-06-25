import { Match } from "@/types/Match";
import { formatDate, formatTime } from "@/utils/format";
import { teamsByFifaCode } from "@/data/Teams";
import { WatchPartyMatch } from "@/lib/partyMatches";
import { Badge } from "./ui/badge";
import { CountryFlag } from "./CountryFlag";


type Props = {
    match: Match;
    onSelect: (match: Match) => void;
    status: "scheduled" | "live" | "finished";
    attendanceCount: number;
    isWatchParty: boolean;
    watchParty: WatchPartyMatch;
};

export function MatchCard({ match, onSelect, status, attendanceCount, isWatchParty, watchParty }: Props) {

    const homeTeam = match.homeTeamId ? teamsByFifaCode[match.homeTeamId] : null;
    const awayTeam = match.awayTeamId ? teamsByFifaCode[match.awayTeamId] : null;


    return (
        <div
            onClick={() => {
                if (homeTeam && awayTeam) {
                    return onSelect(match)
                }
                else {
                    return null
                }
            }}
            className="cursor-pointer rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-lg transition hover:shadow-xl dark:shadow-gray-800 dark:shadow-md">
            <div className="mb-3 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 font-semibold">
                <span>{formatDate(match.date)}</span>
                {status === 'live' ?
                    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                        En Vivo
                    </Badge>
                    :
                    <span>{formatTime(match.time)}</span>}

            </div>

            <div className="grid min-h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                <div className="flex flex-col min-w-0 items-center justify-end gap-2">
                    {homeTeam ? (
                        <>
                            <CountryFlag homeTeam={homeTeam} />
                            <span className="min-w-0 text-center leading-tight line-clamp-2">
                                {homeTeam.nameEs}
                            </span>
                        </>
                    ) : (
                        <span className="min-w-0 text-center text-sm leading-tight line-clamp-2 text-gray-400 dark:text-gray-500 italic">
                            {match.homeLabel ?? "Por definir"}
                        </span>
                    )}
                </div>

                <span className="shrink-0 px-2 text-base font-semibold text-gray-500 dark:text-gray-400">
                    VS
                </span>

                <div className="flex flex-col min-w-0 items-center justify-start gap-2">
                    {awayTeam ? (
                        <>
                            <CountryFlag homeTeam={awayTeam} />
                            <span className="min-w-0 text-center leading-tight line-clamp-2">
                                {awayTeam.nameEs}
                            </span>
                        </>
                    ) : (
                        <span className="min-w-0 text-center text-sm leading-tight line-clamp-2 text-gray-400 dark:text-gray-500 italic">
                            {match.awayLabel ?? "Por definir"}
                        </span>
                    )}
                </div>
            </div>

            <div className="my-1 text-center">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 my-1">
                    📍 {match.city}, {match.country}
                </p>

                <p className="text-xs text-gray-700 dark:text-gray-400 font-bold truncate my-1">
                    🏟️ {match.venue}
                </p>
            </div>

            {isWatchParty && <>
                <p className="my-3 text-sm text-center font-semibold text-gray-800 dark:text-gray-200">
                    Se verá en {watchParty.houseName}
                </p>

                <div className="my-2 flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Asisten</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{attendanceCount}</span>
                </div>
            </>
            }


        </div>
    );

}