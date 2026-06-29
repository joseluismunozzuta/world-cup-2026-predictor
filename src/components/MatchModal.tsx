import { AttendanceStatus } from "@/types/AttendanceStatus";
import { Match } from "@/types/Match";
import { formatDate, formatTime } from "@/utils/format";
import { teamsByFifaCode, teamsById } from "@/data/Teams";
import { Prediction } from "@/types/Prediction";
import { useState, useEffect } from "react";
import { calculatePredictionPoints } from "@/utils/scoring";
import { MatchModalHeader } from "./MatchModalHeader";
import { EditableAttendanceSelector } from "./EditableAttendanceSelector";
import { ScoreInput } from "./ScoreInput";
import { MatchResult } from "@/types/MatchResult";
import { ScoreResultSection } from "./ScoreResultSection";
import { MatchStatus } from "@/utils/matchstatus";
import { AppUser } from "@/lib/users";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { promoteMatchToWatchParty, removeMatchFromWatchParty, updateWatchPartyHost, WatchPartyMatch } from "@/lib/partyMatches";
import { deleteAttendanceByMatch } from "@/lib/attendance";

type Props = {
    match: Match | null;
    onClose: () => void;
    attendanceStatus: AttendanceStatus | undefined;
    onAttendanceChange: (matchId: string, status: AttendanceStatus) => void;
    onClearAttendance: (matchId: string) => void;
    onSavePrediction: (matchId: string, prediction: Prediction) => void;
    prediction?: Prediction;
    resultMatch?: MatchResult;
    onSaveResult: (matchId: string, result: {
        homeScore: number;
        awayScore: number;
        qualifiedTeamId?: string;
        wentToPenalties?: boolean;
        openModificationWindowMinutes?: number;
    }) => void;
    onSaveWindowModification: (matchId: string, qualifiedTeamId: string, penaltiesIfDraw: boolean) => void;
    onCloseModificationWindow: (matchId: string) => void;
    onSaveKnockoutScore?: (matchId: string, homeScore: number, awayScore: number) => Promise<void>;
    onSaveKnockoutQualifier?: (matchId: string, qualifiedTeamId: string, wentToPenalties: boolean) => Promise<void>;
    jokersUsed: number;
    jokersEarned: number;
    status: MatchStatus;
    attendees: AppUser[];
    notAttendees: AppUser[];
    appUser: AppUser;
    isWatchParty: boolean;
    watchParty: WatchPartyMatch | undefined;
    members: AppUser[];
    onSavingWatchPartyChange?: (isSaving: boolean) => void;
};

type AttendanceOption = {
    value: AttendanceStatus;
    label: string;
    emoji: string;
};

const finishedAttendanceOptions: AttendanceOption[] = [
    { value: "going", label: "Asististe", emoji: "✅" },
    { value: "not_going", label: "No fuiste", emoji: "❌" },
];

export function MatchModal({ match, onClose, attendanceStatus, onClearAttendance, onAttendanceChange,
    onSavePrediction, prediction, onSaveResult, resultMatch, status, attendees, notAttendees,
    appUser, isWatchParty, watchParty, members, onSavingWatchPartyChange,
    onSaveWindowModification, onCloseModificationWindow, onSaveKnockoutScore, onSaveKnockoutQualifier,
    jokersUsed, jokersEarned }: Props) {

    const [isPredicting, setIsPredicting] = useState(false);
    const [isSavingResult, setIsSavingResult] = useState(false);
    const [homeScore, setHomeScore] = useState("");
    const [realHomeScore, setRealHomeScore] = useState(resultMatch ? String(resultMatch.homeScore) : "");
    const [realAwayScore, setRealAwayScore] = useState(resultMatch ? String(resultMatch.awayScore) : "");
    const [awayScore, setAwayScore] = useState("");
    const [isPromotingWatchParty, setIsPromotingWatchParty] = useState(false);
    const [selectedHostUserId, setSelectedHostUserId] = useState(watchParty?.hostUserId ?? "");
    const [isSavingWatchParty, setIsSavingWatchParty] = useState(false);
    const [isEditingWatchParty, setIsEditingWatchParty] = useState(false);

    // Joker state — initialized from existing prediction when editing starts
    const [jokerActive, setJokerActive] = useState<boolean>(false);

    // Knockout prediction state
    const [knockoutQualified, setKnockoutQualified] = useState<string>("");
    const [knockoutPenalties, setKnockoutPenalties] = useState<boolean>(false);

    // Knockout result admin state (step 2: qualifier after window closes)
    const [resultQualified, setResultQualified] = useState<string>("");
    const [resultPenalties, setResultPenalties] = useState<boolean>(false);

    // Modification window state
    const [windowQualified, setWindowQualified] = useState<string>(prediction?.qualifiedTeamId ?? "");
    const [windowPenalties, setWindowPenalties] = useState<boolean>(prediction?.penaltiesIfDraw ?? false);
    const [isSavingWindow, setIsSavingWindow] = useState(false);

    // Countdown: seconds remaining in modification window
    const [windowSecondsLeft, setWindowSecondsLeft] = useState<number>(0);
    useEffect(() => {
        if (!resultMatch?.modificationWindowClosesAt || !resultMatch?.modificationWindowOpen) return;
        const closesAt = new Date(resultMatch.modificationWindowClosesAt).getTime();
        const update = () => {
            const secs = Math.max(0, Math.round((closesAt - Date.now()) / 1000));
            setWindowSecondsLeft(secs);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [resultMatch?.modificationWindowClosesAt, resultMatch?.modificationWindowOpen]);

    if (!match) return null;

    const isKnockout = match.stage !== "group";
    const isFinished = resultMatch?.status === "finished";
    const isLive = status === "live";
    const scoreResult = prediction && isFinished ? calculatePredictionPoints(prediction, resultMatch) : null;

    const homeTeam = match.homeTeamId ? teamsByFifaCode[match.homeTeamId] : null;
    const awayTeam = match.awayTeamId ? teamsByFifaCode[match.awayTeamId] : null;

    // Modification window helpers
    const windowClosesAt = resultMatch?.modificationWindowClosesAt
        ? new Date(resultMatch.modificationWindowClosesAt)
        : null;
    const windowIsOpen = resultMatch?.modificationWindowOpen === true &&
        windowSecondsLeft > 0;

    const formatCountdown = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    // For knockout draws: score saved but qualifier not yet set (window phase or after)
    const knockoutAwaitingQualifier = isKnockout && isFinished &&
        resultMatch?.homeScore !== undefined &&
        !resultMatch?.qualifiedTeamId;

    // Jokers: 3 max per World Cup. If current prediction already has joker, don't count it twice.
    const JOKERS_MAX = 3 + jokersEarned;
    const jokersUsedExcludingThis = prediction?.jokerActivated ? jokersUsed - 1 : jokersUsed;
    const jokersRemaining = JOKERS_MAX - jokersUsedExcludingThis;
    const canActivateJoker = jokerActive || jokersRemaining > 0;

    const canPredict = status === "scheduled";

    const predictedDraw = homeScore !== "" && awayScore !== "" && Number(homeScore) === Number(awayScore);
    const knockoutFieldsValid = !isKnockout || (
        knockoutQualified !== "" &&
        (!predictedDraw || true) // penaltiesIfDraw always has a value (defaults false)
    );

    const canSavePrediction = (
        homeScore !== "" &&
        awayScore !== "" &&
        Number(homeScore) >= 0 &&
        Number(awayScore) >= 0 &&
        knockoutFieldsValid
    ) && canPredict;

    const canSaveResult =
        realHomeScore !== "" &&
        realAwayScore !== "" &&
        Number(realHomeScore) >= 0 &&
        Number(realAwayScore) >= 0;

    const isAdmin = appUser.role === "admin";
    const activePartyId = appUser.activePartyId;
    const selectedHost = members.find(
        (member) => member.uid === selectedHostUserId
    );

    const selectedHouseName = selectedHost
        ? `Casa de ${selectedHost.name.split(" ")[0]}`
        : "";

    const handleUpdateWatchParty = async () => {
        if (!match) return;
        if (!activePartyId) return;
        if (!selectedHost) return;

        try {
            onSavingWatchPartyChange?.(true);

            await updateWatchPartyHost({
                partyId: activePartyId,
                matchId: match.id,
                hostUserId: selectedHost.uid,
                hostName: selectedHost.name,
                houseName: selectedHouseName,
            });

            setIsEditingWatchParty(false);
        } catch (error) {
            console.error(error);
        } finally {
            onSavingWatchPartyChange?.(false);
        }
    };

    const handlePromoteToWatchParty = async () => {
        if (!match) return;
        if (!activePartyId) return;
        if (!selectedHost) return;

        try {
            setIsSavingWatchParty(true);
            onSavingWatchPartyChange?.(true);

            await promoteMatchToWatchParty({
                partyId: activePartyId,
                matchId: match.id,
                houseName: selectedHouseName,
                hostUserId: selectedHost.uid,
                hostName: selectedHost.name,
            });

            setIsPromotingWatchParty(false);
            setSelectedHostUserId("");
        } catch (error) {
            console.error("Error promoviendo partido:", error);
        } finally {
            setIsSavingWatchParty(false);
            onSavingWatchPartyChange?.(false);
        }
    };

    const handleRemoveWatchParty = async () => {
        if (!match) return;
        if (!activePartyId) return;

        try {
            onSavingWatchPartyChange?.(true);

            await deleteAttendanceByMatch(activePartyId, match.id);
            await removeMatchFromWatchParty(activePartyId, match.id);
        } catch (error) {
            console.error("Error quitando watch party:", error);
        } finally {
            onSavingWatchPartyChange?.(false);
        }
    };

    //TODO: cuando termino el partido, mejorar lista de asistentes

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}>
            <div
                className="relative w-full max-w-md max-h-[80vh]
                overflow-y-auto rounded-3xl bg-white dark:bg-gray-800 px-6 shadow-xl"
                onClick={(event) => event.stopPropagation()}>

                <div className="bg-white dark:bg-gray-800 my-4 flex flex-col items-center justify-center gap-2">
                    <button
                        onClick={onClose}
                        className="absolute right-1 top-1 rounded-full bg-gray-200 dark:bg-gray-700 px-3 m-1 py-1 text-md font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
                        ×
                    </button>
                    {homeTeam && awayTeam && (
                        <MatchModalHeader homeTeam={homeTeam} awayTeam={awayTeam} />
                    )}
                </div>

                <div>
                    <div className="mt-6 rounded-3xl bg-gray-50 dark:bg-gray-700 p-5 space-y-3 shadow-lg">
                        <p className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-200">
                            <span>📅</span>
                            <span><strong>Fecha:</strong> {formatDate(match.date)}</span>
                        </p>

                        <p className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-200">
                            <span>🕗</span>
                            <span><strong>Hora:</strong> {formatTime(match.time)}</span>
                        </p>

                        {isWatchParty && (
                            <p className="flex items-center gap-3 text-base text-gray-700 dark:text-gray-200">
                                <span>🏠</span>
                                <span><strong>Se verá en:</strong> {`Casa de ${watchParty?.hostName.split(" ")[0]}`}</span>
                            </p>
                        )}
                    </div>

                    {!isFinished && isAdmin && isWatchParty && (
                        <details className="mt-4 rounded-3xl bg-gray-50 dark:bg-gray-700 p-5">
                            <summary className="cursor-pointer font-black text-gray-900 dark:text-gray-100">
                                Opciones de administrador
                            </summary>

                            <div className="mt-4 space-y-4">
                                {!isEditingWatchParty && (
                                    <section className="my-2 rounded-3xl bg-blue-50 px-6 py-2">

                                        <button
                                            onClick={() => setIsEditingWatchParty(true)}
                                            className="mt-5 w-full rounded-2xl bg-blue-600 py-4 text-base font-black text-white"
                                        >
                                            Cambiar casa
                                        </button>

                                        <p className="my-2 text-xs text-center font-medium text-gray-600">
                                            Actualmente se verá en {watchParty?.houseName}
                                        </p>

                                    </section>
                                )}
                                {isEditingWatchParty && (
                                    <section className="my-2 rounded-3xl bg-blue-50 p-6">

                                        <p className="text-lg font-black text-gray-950">
                                            Cambiar casa
                                        </p>

                                        <select
                                            value={selectedHostUserId}
                                            onChange={(e) => setSelectedHostUserId(e.target.value)}
                                            className="mt-4 w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 font-bold"
                                        >
                                            {members.map(member => (
                                                <option
                                                    key={member.uid}
                                                    value={member.uid}
                                                >
                                                    Casa de {member.name.split(" ")[0]}
                                                </option>
                                            ))}
                                        </select>

                                        <div className="mt-4 flex gap-3">

                                            <button
                                                onClick={() => {
                                                    setIsEditingWatchParty(false);
                                                    setSelectedHostUserId(
                                                        watchParty?.hostUserId ?? ""
                                                    );
                                                }}
                                                className="flex-1 rounded-2xl bg-white py-4 font-black"
                                            >
                                                Cancelar
                                            </button>

                                            <button
                                                onClick={handleUpdateWatchParty}
                                                className="flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white"
                                            >
                                                Guardar
                                            </button>

                                        </div>

                                    </section>
                                )}
                                <section className="my-2 rounded-3xl bg-red-50 px-6 py-2">
                                    <button
                                        onClick={() => {
                                            const confirmed = window.confirm(
                                                "¿Seguro que deseas quitar este watch party?"
                                            );
                                            if (!confirmed) return;
                                            handleRemoveWatchParty();
                                        }}
                                        className="mt-5 w-full rounded-2xl bg-red-600 py-4 text-base font-black text-white"
                                    >
                                        No se verá en grupo
                                    </button>

                                    <p className="my-2 text-xs text-center font-medium text-gray-600">
                                        Este partido dejará de aparecer en Veremos juntos y se ocultará la asistencia.
                                    </p>
                                </section>
                            </div>
                        </details>
                    )}

                    {isWatchParty && (<>
                        {!isFinished && <EditableAttendanceSelector
                            matchId={match.id}
                            attendanceStatus={attendanceStatus}
                            onAttendanceChange={onAttendanceChange}
                            onClearAttendance={onClearAttendance}
                        />}

                        {isFinished && <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-200">Tu asistencia</p>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                                {attendanceStatus
                                    ? finishedAttendanceOptions.find((option) => option.value === attendanceStatus)?.label
                                    : "Sin confirmar"}
                            </span>
                        </div>}

                        <div className="mt-6 rounded-2xl bg-gray-50 dark:bg-gray-700 p-4">

                            {((attendees.length === 0 && notAttendees.length === 0) && !isFinished) ? (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Todavía no hay asistentes registrados.
                                </p>
                            ) : (<>
                                {attendees.length != 0 && <div className="my-3 space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {!isFinished ? `Asistentes (${attendees.length})` : `Asistieron (${attendees.length})`}
                                    </p>
                                    {attendees.map((user) => (
                                        <div
                                            key={user.uid}
                                            className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-600 px-3 py-2"
                                        >
                                            <Avatar>
                                                <AvatarImage
                                                    src={user.avatarUrl ?? user.photoURL ?? undefined}
                                                    referrerPolicy="no-referrer"
                                                />
                                                <AvatarFallback>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {user.name.trim().split(/\s+/).slice(0, 2).join(" ")}
                                                    {user.uid === appUser?.uid && (
                                                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Tú)</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>}

                                {notAttendees.length != 0 && <div className="my-3 space-y-2">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {!isFinished ? `No irán (${notAttendees.length})` : `No fueron (${notAttendees.length})`}
                                    </p>
                                    {notAttendees.map((user) => (
                                        <div
                                            key={user.uid}
                                            className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-600 px-3 py-2"
                                        >
                                            <Avatar>
                                                <AvatarImage
                                                    src={user.avatarUrl ?? user.photoURL ?? undefined}
                                                    referrerPolicy="no-referrer"
                                                />
                                                <AvatarFallback>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>

                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {user.name.trim().split(/\s+/).slice(0, 2).join(" ")}
                                                    {user.uid === appUser?.uid && (
                                                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Tú)</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                            </>
                            )}
                        </div>
                    </>
                    )}

                    {!isFinished && !isLive && isAdmin && !isWatchParty && !isPromotingWatchParty && (
                        <div className="mt-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 p-6 shadow-lg">
                            <p className="text-lg font-black text-gray-950 dark:text-gray-50">
                                ¿Veremos este partido juntos?
                            </p>

                            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                                Elige una casa y activa la asistencia para este partido.
                            </p>

                            <button
                                onClick={() => setIsPromotingWatchParty(true)}
                                className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 text-base font-black text-white"
                            >
                                Proponer junte
                            </button>
                        </div>
                    )}

                    {!isFinished && !isLive && isAdmin && !isWatchParty && isPromotingWatchParty && (
                        <section className="mt-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 p-6 shadow-lg">
                            <p className="text-lg font-black text-gray-950 dark:text-gray-50">
                                Proponer junte
                            </p>

                            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                                Selecciona en qué casa se verá este partido.
                            </p>

                            <select
                                value={selectedHostUserId}
                                onChange={(e) => setSelectedHostUserId(e.target.value)}
                                className="mt-5 w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-4 py-4 text-base font-bold text-gray-900 outline-none"
                            >
                                <option value="">Seleccionar casa</option>

                                {members.map((member) => (
                                    <option key={member.uid} value={member.uid}>
                                        Casa de {member.name.split(" ")[0]}
                                    </option>
                                ))}
                            </select>

                            {selectedHost && (
                                <div className="mt-4 rounded-2xl bg-white dark:bg-gray-700 p-4">
                                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                                        Casa seleccionada
                                    </p>
                                    <p className="mt-1 text-base font-black text-gray-950 dark:text-gray-50">
                                        {selectedHouseName}
                                    </p>
                                </div>
                            )}

                            <div className="mt-5 flex gap-3">
                                <button
                                    onClick={() => {
                                        setIsPromotingWatchParty(false);
                                        setSelectedHostUserId("");
                                    }}
                                    className="flex-1 rounded-2xl bg-white dark:bg-gray-700 dark:text-gray-200 py-4 text-base font-black text-gray-700"
                                >
                                    Cancelar
                                </button>

                                <button
                                    disabled={!selectedHost || isSavingWatchParty}
                                    onClick={handlePromoteToWatchParty}
                                    className="flex-1 rounded-2xl bg-emerald-600 py-4 text-base font-black text-white disabled:opacity-50"
                                >
                                    {isSavingWatchParty ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </section>
                    )}

                    <div className="my-6 rounded-2xl bg-gray-50 dark:bg-gray-700 p-5 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-950 dark:text-gray-100">Pronóstico</p>
                                {/*{!prediction && !isFinished && canPredict && (<p className="mt-1 text-sm text-gray-500">
                                    Una vez guardado, no podrás cambiarlo.
                                </p>)}*/}
                            </div>

                            {/*{prediction && !isFinished && (
                                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                                    Bloqueado
                                </span>
                            )}*/}
                        </div>

                        {prediction && !isPredicting ? (<>
                            {isFinished && scoreResult && homeTeam && awayTeam ? (
                                <div className="my-2 overflow-hidden rounded-2xl shadow-sm">
                                    {/* Points banner */}
                                    <div className={`px-4 py-4 text-center ${
                                        scoreResult.points >= 5
                                            ? "bg-green-500"
                                            : scoreResult.points > 0
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                    }`}>
                                        <p className="text-3xl font-black text-white">+{scoreResult.points} pts</p>
                                        <p className="mt-0.5 text-xs font-semibold text-white/80">
                                            {scoreResult.points >= 5
                                                ? "¡Marcador exacto! 🎯"
                                                : scoreResult.points > 0
                                                ? "¡Resultado correcto! ✅"
                                                : "No acertaste ❌"}
                                        </p>
                                        {prediction.jokerActivated && (
                                            <p className="mt-1 text-xs font-black text-white/90">🃏 Joker · puntos x2</p>
                                        )}
                                    </div>

                                    {/* Comparison rows */}
                                    <div className="bg-white dark:bg-gray-600 divide-y divide-gray-100 dark:divide-gray-500">
                                        <div className="px-4 py-3">
                                            <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-400">Tu pronóstico</p>
                                            <ScoreResultSection
                                                homeTeam={homeTeam}
                                                awayTeam={awayTeam}
                                                result={{ matchId: match.id, ...prediction, status: "scheduled" }}
                                            />
                                        </div>
                                        <div className="px-4 py-3">
                                            <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-400">Resultado oficial</p>
                                            <ScoreResultSection
                                                homeTeam={homeTeam}
                                                awayTeam={awayTeam}
                                                result={resultMatch}
                                            />
                                            {isKnockout && resultMatch?.qualifiedTeamId && (
                                                <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
                                                    Clasificó: <span className="font-bold">{teamsByFifaCode[resultMatch.qualifiedTeamId]?.nameEs}</span>
                                                    {resultMatch.wentToPenalties && <span className="ml-1">· Con penales</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                            <div className="my-2 rounded-2xl bg-white dark:bg-gray-600 p-4 text-center shadow-sm">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Tu pronóstico</p>

                                {homeTeam && awayTeam && (
                                    <ScoreResultSection
                                        homeTeam={homeTeam}
                                        awayTeam={awayTeam}
                                        result={{ matchId: match.id, ...prediction, status: "scheduled" }}
                                    />
                                )}

                                {prediction.jokerActivated && (
                                    <div className="mt-2 flex justify-center">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 px-3 py-1 text-xs font-black text-purple-700 dark:text-purple-300">
                                            🃏 Joker activado · puntos x2
                                        </span>
                                    </div>
                                )}

                                {isKnockout && prediction.qualifiedTeamId && homeTeam && awayTeam && (() => {
                                    const qualTeam = teamsByFifaCode[prediction.qualifiedTeamId];
                                    const isDraw = prediction.homeScore === prediction.awayScore;
                                    return (
                                        <div className="mt-3 overflow-hidden rounded-2xl shadow-sm">
                                            <div className="bg-cyan-600 px-3 py-1.5 text-center">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">Clasifica</p>
                                            </div>
                                            <div className="bg-cyan-50 dark:bg-cyan-950/40 px-4 py-3 flex items-center justify-center gap-3">
                                                {qualTeam && (
                                                    <img
                                                        src={`https://flagcdn.com/w40/${qualTeam.iso2.toLowerCase()}.png`}
                                                        alt={qualTeam.nameEs}
                                                        className="h-6 w-auto rounded-sm shadow-sm"
                                                    />
                                                )}
                                                <span className="text-base font-black text-cyan-800 dark:text-cyan-200">
                                                    {qualTeam?.nameEs ?? prediction.qualifiedTeamId}
                                                </span>
                                                {isDraw && prediction.penaltiesIfDraw !== undefined && (
                                                    <span className="rounded-full bg-cyan-200 dark:bg-cyan-800 px-2.5 py-0.5 text-[10px] font-black text-cyan-700 dark:text-cyan-200 uppercase tracking-wide">
                                                        {prediction.penaltiesIfDraw ? "En penales" : "Tiempo extra"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {canPredict && !isFinished && (
                                    <button
                                        onClick={() => {
                                            setHomeScore(String(prediction.homeScore));
                                            setAwayScore(String(prediction.awayScore));
                                            setJokerActive(prediction.jokerActivated ?? false);
                                            setIsPredicting(true);
                                        }}
                                        className="mt-4 w-full rounded-2xl bg-yellow-200 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-400"
                                    >
                                        Cambiar pronóstico
                                    </button>
                                )}

                                {!canPredict && !isFinished && (
                                    <span className="text-center text-sm text-red-400 font-semibold">El partido ya empezó.</span>
                                )}
                            </div>
                            )}
                        </>)
                            : !isPredicting ? (
                                !isFinished ? (
                                    <>
                                        {canPredict && <button
                                            onClick={() => setIsPredicting(true)}
                                            className="mt-4 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
                                        >Pronosticar</button>}

                                        {!canPredict && <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Este partido ya comenzó y no se puede pronosticar.
                                        </p>}
                                    </>
                                ) : (<p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                    El partido ya terminó, no hiciste un pronóstico.
                                </p>)
                            ) : (!isFinished && <>
                                <div className="mt-4">
                                    {homeTeam && awayTeam && (
                                        <ScoreInput
                                            homeTeam={homeTeam}
                                            awayTeam={awayTeam}
                                            homeScore={homeScore}
                                            setHomeScore={(v) => {
                                                setHomeScore(v);
                                                if (isKnockout && v !== "" && awayScore !== "") {
                                                    const h = Number(v), a = Number(awayScore);
                                                    if (h > a) setKnockoutQualified(match.homeTeamId ?? "");
                                                    else if (h < a) setKnockoutQualified(match.awayTeamId ?? "");
                                                    else setKnockoutQualified("");
                                                }
                                            }}
                                            awayScore={awayScore}
                                            setAwayScore={(v) => {
                                                setAwayScore(v);
                                                if (isKnockout && homeScore !== "" && v !== "") {
                                                    const h = Number(homeScore), a = Number(v);
                                                    if (h > a) setKnockoutQualified(match.homeTeamId ?? "");
                                                    else if (h < a) setKnockoutQualified(match.awayTeamId ?? "");
                                                    else setKnockoutQualified("");
                                                }
                                            }}
                                        />
                                    )}

                                    {/* Knockout extra fields */}
                                    {isKnockout && homeScore !== "" && awayScore !== "" && homeTeam && awayTeam && (
                                        <div className="mt-4 rounded-2xl overflow-hidden border border-cyan-200 dark:border-cyan-700/50">
                                            {/* Header */}
                                            <div className="bg-cyan-600 px-4 py-2.5 flex items-center gap-2">
                                                <span className="text-base">🏆</span>
                                                <p className="text-xs font-black text-white uppercase tracking-wider">Fase eliminatoria</p>
                                            </div>

                                            <div className="bg-cyan-50 dark:bg-cyan-950/40 p-4 space-y-4">
                                                {/* ¿Quién clasifica? */}
                                                <div>
                                                    <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2">¿Quién clasifica?</p>
                                                    {predictedDraw ? (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setKnockoutQualified(match.homeTeamId ?? "")}
                                                                className={`flex-1 rounded-xl py-2.5 text-sm font-black border-2 transition-all ${knockoutQualified === match.homeTeamId
                                                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200 dark:shadow-cyan-900"
                                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-cyan-200 dark:border-cyan-700/50"}`}
                                                            >
                                                                {homeTeam.nameEs}
                                                            </button>
                                                            <button
                                                                onClick={() => setKnockoutQualified(match.awayTeamId ?? "")}
                                                                className={`flex-1 rounded-xl py-2.5 text-sm font-black border-2 transition-all ${knockoutQualified === match.awayTeamId
                                                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200 dark:shadow-cyan-900"
                                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-cyan-200 dark:border-cyan-700/50"}`}
                                                            >
                                                                {awayTeam.nameEs}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5">
                                                            <span className="text-white text-sm font-black flex-1">
                                                                {knockoutQualified === match.homeTeamId ? homeTeam.nameEs : knockoutQualified === match.awayTeamId ? awayTeam.nameEs : "—"}
                                                            </span>
                                                            <span className="text-cyan-200 text-xs font-medium">según tu marcador</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* ¿Hay penales? — solo si empate */}
                                                {predictedDraw && (
                                                    <div>
                                                        <p className="text-xs font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-wider mb-2">¿Hay penales?</p>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setKnockoutPenalties(false)}
                                                                className={`flex-1 rounded-xl py-2.5 text-sm font-black border-2 transition-all ${!knockoutPenalties
                                                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200 dark:shadow-cyan-900"
                                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-cyan-200 dark:border-cyan-700/50"}`}
                                                            >
                                                                No
                                                            </button>
                                                            <button
                                                                onClick={() => setKnockoutPenalties(true)}
                                                                className={`flex-1 rounded-xl py-2.5 text-sm font-black border-2 transition-all ${knockoutPenalties
                                                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-200 dark:shadow-cyan-900"
                                                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-cyan-200 dark:border-cyan-700/50"}`}
                                                            >
                                                                Sí
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Resumen siempre visible */}
                                                {knockoutQualified && (
                                                    <div className="rounded-xl bg-white dark:bg-gray-700/60 px-4 py-2.5 flex items-center justify-between gap-2">
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Tu predicción</span>
                                                        <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">
                                                            Clasifica {knockoutQualified === match.homeTeamId ? homeTeam.nameEs : awayTeam.nameEs}
                                                            {predictedDraw && <span className="ml-1 font-medium text-gray-500 dark:text-gray-400">· {knockoutPenalties ? "en penales" : "tiempo extra"}</span>}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Joker toggle */}
                                    <button
                                        disabled={!canActivateJoker}
                                        onClick={() => canActivateJoker && setJokerActive((v) => !v)}
                                        className={`mt-4 w-full rounded-2xl px-4 py-3 text-left transition ${
                                            jokerActive
                                                ? "bg-purple-600 text-white"
                                                : canActivateJoker
                                                ? "bg-purple-50 border border-purple-200 text-purple-900"
                                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">🃏</span>
                                                <div>
                                                    <p className="text-sm font-black">
                                                        {jokerActive ? "Joker activado" : "Activar Joker"}
                                                    </p>
                                                    <p className={`text-xs font-medium ${jokerActive ? "text-purple-200" : "text-purple-500"}`}>
                                                        {canActivateJoker
                                                            ? `Duplica tu puntaje si aciertas · ${jokersRemaining} restante${jokersRemaining !== 1 ? "s" : ""}`
                                                            : `Ya usaste tus ${JOKERS_MAX} jokers del Mundial`}
                                                    </p>
                                                </div>
                                            </div>
                                            {jokerActive && <span className="text-white font-black text-lg">✓</span>}
                                        </div>
                                    </button>

                                    <div className="mt-4 flex gap-2">
                                        <button
                                            onClick={() => {
                                                setIsPredicting(false);
                                                setHomeScore("");
                                                setAwayScore("");
                                                setKnockoutQualified("");
                                                setKnockoutPenalties(false);
                                                setJokerActive(false);
                                            }}
                                            className="flex-1 rounded-2xl bg-gray-200 dark:bg-gray-600 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            disabled={!canSavePrediction}
                                            onClick={() => {
                                                const confirmed = window.confirm("¿Confirmas tu pronóstico?");
                                                if (!confirmed) return;

                                                const isDraw = Number(homeScore) === Number(awayScore);
                                                onSavePrediction(match.id, {
                                                    homeScore: Number(homeScore),
                                                    awayScore: Number(awayScore),
                                                    jokerActivated: jokerActive,
                                                    ...(isKnockout && {
                                                        qualifiedTeamId: knockoutQualified || undefined,
                                                        penaltiesIfDraw: isDraw ? knockoutPenalties : undefined,
                                                    }),
                                                });

                                                setIsPredicting(false);
                                                setJokerActive(false);
                                            }}
                                            className="flex-1 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </>
                            )}
                    </div>

                    {/* Modification window — admin close button always visible regardless of prediction */}
                    {isFinished && windowIsOpen && isKnockout && isAdmin && (
                        <div className="mt-4 rounded-3xl bg-amber-50 border border-amber-200 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-base font-black text-amber-900">⏱ Tiempo Extra</p>
                                <div className="flex flex-col items-end">
                                    <span className="text-3xl font-black text-amber-700 tabular-nums leading-none">{formatCountdown(windowSecondsLeft)}</span>
                                    <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Tiempo restante</span>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-amber-700">
                                El partido terminó en empate. Los usuarios pueden modificar su pronóstico.
                            </p>
                            <button
                                onClick={() => onCloseModificationWindow(match.id)}
                                className="mt-3 w-full rounded-2xl bg-gray-200 py-2 text-xs font-bold text-gray-600"
                            >
                                Cerrar ventana (admin)
                            </button>
                        </div>
                    )}

                    {/* Modification window banner — only for users who already predicted */}
                    {isFinished && windowIsOpen && isKnockout && homeTeam && awayTeam && prediction && !isAdmin && (
                        <div className="mt-4 rounded-3xl bg-amber-50 border border-amber-200 p-5">
                            <div className="flex items-center justify-between">
                                <p className="text-base font-black text-amber-900">⏱ Tiempo Extra</p>
                                <div className="flex flex-col items-end">
                                    <span className="text-3xl font-black text-amber-700 tabular-nums leading-none">{formatCountdown(windowSecondsLeft)}</span>
                                    <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Tiempo restante</span>
                                </div>
                            </div>
                            <p className="mt-2 text-sm text-amber-700">
                                El partido terminó en empate. Puedes modificar tu pronóstico de clasificado y penales.
                            </p>

                            {prediction?.modifiedDuringWindow && (
                                <p className="mt-2 text-xs text-amber-600 font-semibold">✓ Ya modificaste esta apuesta.</p>
                            )}

                            <div className="mt-4 space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">¿Quién clasifica?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setWindowQualified(match.homeTeamId ?? "")}
                                            className={`flex-1 rounded-xl py-2 text-sm font-bold border ${windowQualified === match.homeTeamId ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}
                                        >
                                            {homeTeam.nameEs}
                                        </button>
                                        <button
                                            onClick={() => setWindowQualified(match.awayTeamId ?? "")}
                                            className={`flex-1 rounded-xl py-2 text-sm font-bold border ${windowQualified === match.awayTeamId ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}
                                        >
                                            {awayTeam.nameEs}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">¿Hay penales?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setWindowPenalties(false)} className={`flex-1 rounded-xl py-2 text-sm font-bold border ${!windowPenalties ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}>No</button>
                                        <button onClick={() => setWindowPenalties(true)} className={`flex-1 rounded-xl py-2 text-sm font-bold border ${windowPenalties ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200"}`}>Sí</button>
                                    </div>
                                </div>

                                <button
                                    disabled={!windowQualified || isSavingWindow}
                                    onClick={async () => {
                                        if (!windowQualified) return;
                                        setIsSavingWindow(true);
                                        await onSaveWindowModification(match.id, windowQualified, windowPenalties);
                                        setIsSavingWindow(false);
                                    }}
                                    className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-black text-white disabled:opacity-50"
                                >
                                    {isSavingWindow ? "Guardando..." : "Guardar modificación"}
                                </button>
                            </div>
                        </div>
                    )}

                    {isFinished && !prediction && <>
                        <div className="my-6 flex rounded-2xl justify-center gap-1 flex-col shadow-lg p-2">
                            <p className="text-xl text-center ps-1 font-bold text-gray-950 dark:text-gray-50">Resultado oficial</p>
                            {homeTeam && awayTeam && (
                                <ScoreResultSection homeTeam={homeTeam} awayTeam={awayTeam} result={resultMatch} />
                            )}
                            {isKnockout && resultMatch?.qualifiedTeamId && (
                                <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold">Clasificó: </span>
                                    {teamsByFifaCode[resultMatch.qualifiedTeamId]?.name ?? resultMatch.qualifiedTeamId}
                                    {resultMatch.wentToPenalties !== undefined && (
                                        <span className="ml-2 text-gray-400">
                                            {resultMatch.wentToPenalties ? "· Con penales" : "· Sin penales"}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                    }

                    {/* Admin: register qualifier after window closes (knockout draws only) */}
                    {isAdmin && knockoutAwaitingQualifier && !windowIsOpen && homeTeam && awayTeam && (
                        <div className="my-6 rounded-2xl bg-gray-50 dark:bg-gray-700 p-4">
                            <p className="text-sm mb-1 font-black text-gray-900 dark:text-gray-100">Registrar clasificado</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">La ventana cerró. Registra quién clasificó.</p>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">¿Quién clasificó?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setResultQualified(match.homeTeamId ?? "")} className={`flex-1 rounded-xl py-2 text-sm font-bold border ${resultQualified === match.homeTeamId ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-500"}`}>{homeTeam.nameEs}</button>
                                        <button onClick={() => setResultQualified(match.awayTeamId ?? "")} className={`flex-1 rounded-xl py-2 text-sm font-bold border ${resultQualified === match.awayTeamId ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-500"}`}>{awayTeam.nameEs}</button>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">¿Hubo penales?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setResultPenalties(false)} className={`flex-1 rounded-xl py-2 text-sm font-bold border ${!resultPenalties ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-500"}`}>No</button>
                                        <button onClick={() => setResultPenalties(true)} className={`flex-1 rounded-xl py-2 text-sm font-bold border ${resultPenalties ? "bg-gray-900 text-white border-gray-900" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-500"}`}>Sí</button>
                                    </div>
                                </div>
                                <button
                                    disabled={!resultQualified || isSavingResult}
                                    onClick={async () => {
                                        if (!resultQualified) return;
                                        const confirmed = window.confirm("¿Confirmas el clasificado? No se podrá cambiar.");
                                        if (!confirmed) return;
                                        setIsSavingResult(true);
                                        await onSaveKnockoutQualifier?.(match.id, resultQualified, resultPenalties);
                                        setIsSavingResult(false);
                                    }}
                                    className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
                                >
                                    {isSavingResult ? "Guardando..." : "Confirmar clasificado"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Admin: register result for unfinished matches */}
                    {!isFinished ? (
                        !isSavingResult ? (<>
                            <div className="my-6 rounded-2xl bg-gray-50 dark:bg-gray-700 p-5 shadow-lg">
                                <div className="flex items-center justify-start">
                                    <div>
                                        <p className="text-sm text-center font-bold text-gray-950 dark:text-gray-100">Resultado oficial</p>
                                    </div>
                                </div>

                                {appUser.role === "admin" ? <>
                                    <button
                                        onClick={() => setIsSavingResult(true)}
                                        className="mt-4 w-full rounded-2xl bg-violet-600 hover:bg-violet-700 px-4 py-3 text-sm font-bold text-white transition"
                                    >
                                        Registrar resultado
                                    </button>
                                </> : <>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        Aún no se ha registrado el resultado oficial.
                                    </p>
                                </>}
                            </div></>)
                            :
                            <div className="my-6 rounded-2xl bg-gray-50 dark:bg-gray-700 p-4">
                                <p className="text-sm mb-3 font-semibold text-gray-900 dark:text-gray-100">Registrar resultado</p>
                                {homeTeam && awayTeam && (
                                    <ScoreInput
                                        homeTeam={homeTeam}
                                        awayTeam={awayTeam}
                                        homeScore={realHomeScore}
                                        setHomeScore={setRealHomeScore}
                                        awayScore={realAwayScore}
                                        setAwayScore={setRealAwayScore}
                                    />
                                )}

                                {/* Knockout non-draw: auto-qualify winner */}
                                {isKnockout && realHomeScore !== "" && realAwayScore !== "" && homeTeam && awayTeam && Number(realHomeScore) !== Number(realAwayScore) && (
                                    <div className="mt-3 rounded-2xl bg-white dark:bg-gray-600 px-4 py-3 border border-gray-100 dark:border-gray-500">
                                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Clasifica</p>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                            {Number(realHomeScore) > Number(realAwayScore) ? homeTeam.nameEs : awayTeam.nameEs}
                                            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">(automático)</span>
                                        </p>
                                    </div>
                                )}

                                {/* Knockout draw: just save score, window opens automatically */}
                                {isKnockout && realHomeScore !== "" && realAwayScore !== "" && Number(realHomeScore) === Number(realAwayScore) && (
                                    <div className="mt-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border border-amber-200 dark:border-amber-700">
                                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Empate — Tiempo extra</p>
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Se abrirá una ventana de 10 minutos para que los usuarios modifiquen su pronóstico. Luego registrarás quién clasificó.</p>
                                    </div>
                                )}

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setIsSavingResult(false);
                                            setRealHomeScore("");
                                            setRealAwayScore("");
                                            setResultQualified("");
                                            setResultPenalties(false);
                                        }}
                                        className="flex-1 rounded-2xl bg-gray-200 dark:bg-gray-600 px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        disabled={!canSaveResult}
                                        onClick={async () => {
                                            const confirmed = window.confirm("¿Confirmas el resultado? Luego no podrás cambiarlo.");
                                            if (!confirmed) return;

                                            const isDraw = isKnockout && Number(realHomeScore) === Number(realAwayScore);

                                            if (isDraw && onSaveKnockoutScore) {
                                                // Step 1: save score only, auto-opens 10-min window
                                                setIsSavingResult(true);
                                                await onSaveKnockoutScore(match.id, Number(realHomeScore), Number(realAwayScore));
                                                setIsSavingResult(false);
                                            } else {
                                                const impliedQualified = isKnockout
                                                    ? (Number(realHomeScore) > Number(realAwayScore) ? match.homeTeamId ?? "" : match.awayTeamId ?? "")
                                                    : undefined;

                                                onSaveResult(match.id, {
                                                    homeScore: Number(realHomeScore),
                                                    awayScore: Number(realAwayScore),
                                                    ...(isKnockout && {
                                                        qualifiedTeamId: impliedQualified,
                                                        wentToPenalties: false,
                                                    }),
                                                });
                                            }

                                            setIsSavingResult(false);
                                        }}
                                        className="flex-1 rounded-2xl bg-violet-600 hover:bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-600"
                                    >
                                        {isKnockout && realHomeScore !== "" && realAwayScore !== "" && Number(realHomeScore) === Number(realAwayScore)
                                            ? "Guardar y abrir ventana"
                                            : "Registrar resultado"}
                                    </button>
                                </div>
                            </div>) : null}
                </div>
            </div>
        </div>
    );
}