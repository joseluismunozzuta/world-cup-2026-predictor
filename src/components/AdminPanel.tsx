import { Party } from "@/lib/parties";
import { SpecialResultField, SpecialResults } from "@/lib/specialResults";
import { AppUser } from "@/lib/users";
import { useState } from "react";
import { AdminSpecialResultsSection } from "./AdminSpecialResultsSection";
import { KnockoutTeamsMap } from "@/lib/knockoutTeams";
import { matchesData } from "@/data/matchesData";
import { teamsByFifaCode, teamsById } from "@/data/Teams";
import { TeamPickerModal } from "./TeamPickerModal";
import { CountryFlag } from "./CountryFlag";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

type Props = {
    party: Party | null;
    members: AppUser[];
    appUser: AppUser;
    specialResults: SpecialResults | null;
    isSavingSpecialResult: boolean;
    onPromoteUser: (userId: string) => Promise<void>;
    onDemoteUser: (userId: string) => Promise<void>;
    onSaveSpecialResultField: (
        field: SpecialResultField,
        value: string
    ) => Promise<void>;
    onBackfillAttendanceSummaries: () => Promise<void>;
    onBackfillPredictionSummaries: () => Promise<void>;
    knockoutTeams: KnockoutTeamsMap;
    onSaveKnockoutTeams: (matchId: string, slot: "home" | "away", teamId: string) => Promise<void>;
};

type AdminAction =
    | {
        type: "promote";
        user: AppUser;
    }
    | {
        type: "demote";
        user: AppUser;
    }
    | null;

type AdminTab = "settings" | "final_results" | "knockout_teams";

export function AdminPanel({
    party,
    members,
    appUser,
    specialResults,
    isSavingSpecialResult,
    onPromoteUser,
    onDemoteUser,
    onSaveSpecialResultField,
    onBackfillAttendanceSummaries,
    onBackfillPredictionSummaries,
    knockoutTeams,
    onSaveKnockoutTeams,
}: Props) {

    const [pendingAction, setPendingAction] = useState<AdminAction>(null);
    const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("settings");
    const [backfillState, setBackfillState] = useState<"idle" | "loading" | "done">("idle");

    // Knockout team assignment state: { [matchId]: { home, away } } — stores fifaCode (lowercase)
    const [knockoutDraft, setKnockoutDraft] = useState<Record<string, { home: string; away: string }>>({});
    const [savingKnockout, setSavingKnockout] = useState<{ matchId: string; slot: "home" | "away" } | null>(null);
    // Which match + slot is currently picking: { matchId, slot: "home" | "away" }
    const [activePicker, setActivePicker] = useState<{ matchId: string; slot: "home" | "away" } | null>(null);

    const knockoutMatches = matchesData.filter((m) => m.stage !== "group");

    // Convert team.id (e.g. "mexico") → fifaCode lowercase (e.g. "mex") used in matchesData
    const teamIdToFifaCode = (teamId: string): string => {
        const team = teamsById[teamId];
        return team ? team.fifaCode.toLowerCase() : teamId;
    };

    // Convert fifaCode lowercase (e.g. "mex") → team.id (e.g. "mexico") for TeamPickerModal
    const fifaCodeToTeamId = (fifaCode: string): string | undefined => {
        return teamsByFifaCode[fifaCode]?.id;
    };

    if (!party) return null;

    const closeModal = () => {
        setPendingAction(null);
    };

    const handleConfirm = async () => {
        if (!pendingAction) return;

        if (pendingAction.type === "promote") {
            await onPromoteUser(pendingAction.user.uid);
        }

        if (pendingAction.type === "demote") {
            await onDemoteUser(pendingAction.user.uid);
        }

        closeModal();
    };

    return (
        <>
            <div className="grid grid-cols-3 rounded-3xl bg-gray-100 dark:bg-gray-800 p-1 shadow-sm my-4">
                <button
                    onClick={() => setActiveAdminTab("settings")}
                    className={`rounded-2xl px-3 py-3 text-sm font-black transition ${activeAdminTab === "settings" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-gray-500 dark:text-gray-400"}`}
                >
                    Ajustes
                </button>

                <button
                    onClick={() => setActiveAdminTab("knockout_teams")}
                    className={`rounded-2xl px-3 py-3 text-sm font-black transition ${activeAdminTab === "knockout_teams" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-gray-500 dark:text-gray-400"}`}
                >
                    Eliminatorias
                </button>

                <button
                    onClick={() => setActiveAdminTab("final_results")}
                    className={`rounded-2xl px-3 py-3 text-sm font-black transition ${activeAdminTab === "final_results" ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900" : "text-gray-500 dark:text-gray-400"}`}
                >
                    Especiales
                </button>
            </div>


            {activeAdminTab === "settings" && (
                <>
                    <section className="space-y-5 my-4">
                        <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                            <p className="text-sm font-bold uppercase tracking-widest text-green-600">
                                Administración
                            </p>

                            <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-gray-50">
                                Ajustes de la party
                            </h2>

                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Gestiona miembros y permisos generales de esta party.
                            </p>
                        </div>

                        <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                            <h3 className="text-lg font-black text-gray-950 dark:text-gray-50">
                                👥 Miembros
                            </h3>

                            <div className="mt-4 space-y-3">
                                {members.map((member) => {
                                    const isOwner = party.ownerUserId === member.uid;
                                    const memberIsAdmin =
                                        isOwner || party.adminUserIds?.includes(member.uid);

                                    return (
                                        <div
                                            key={member.uid}
                                            className="flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-700 p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 shrink-0">
                                                    <AvatarImage
                                                        src={member.avatarUrl ?? member.photoURL ?? undefined}
                                                        referrerPolicy="no-referrer"
                                                    />
                                                    <AvatarFallback className="text-sm font-bold">
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div>
                                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                                    {member.name}
                                                </p>

                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {isOwner
                                                        ? "Owner"
                                                        : memberIsAdmin
                                                            ? "Admin"
                                                            : "Miembro"}
                                                </p>
                                            </div>
                                            </div>

                                            {!isOwner && member.uid !== appUser.uid && (
                                                <>
                                                    {memberIsAdmin ? (
                                                        <button
                                                            onClick={() =>
                                                                setPendingAction({
                                                                    type: "demote",
                                                                    user: member,
                                                                })
                                                            }
                                                            className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600"
                                                        >
                                                            Quitar admin
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                setPendingAction({
                                                                    type: "promote",
                                                                    user: member,
                                                                })
                                                            }
                                                            className="rounded-xl bg-green-600 px-3 py-2 text-sm font-bold text-white"
                                                        >
                                                            Hacer admin
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                            <h3 className="text-lg font-black text-gray-950 dark:text-gray-50">
                                🔐 Código de party
                            </h3>

                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Comparte este código para que otros se unan.
                            </p>

                            <div className="mt-4 rounded-2xl bg-gray-100 dark:bg-gray-700 px-4 py-3 text-center text-xl font-black tracking-widest dark:text-gray-50">
                                {party.code}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white p-5 shadow-sm">
                            <h3 className="text-lg font-black text-gray-950">
                                🛠️ Utilidades
                            </h3>

                            <p className="mt-2 text-sm text-gray-600">
                                Herramientas de mantenimiento de datos.
                            </p>

                            <button
                                onClick={onBackfillAttendanceSummaries}
                                className="mt-4 w-full rounded-2xl bg-gray-900 py-3 text-sm font-black text-white"
                            >
                                Regenerar resúmenes de asistencia
                            </button>

                            <button
                                disabled={backfillState === "loading"}
                                onClick={async () => {
                                    setBackfillState("loading");
                                    await onBackfillPredictionSummaries();
                                    setBackfillState("done");
                                    setTimeout(() => setBackfillState("idle"), 4000);
                                }}
                                className="mt-3 w-full rounded-2xl bg-gray-900 py-3 text-sm font-black text-white disabled:opacity-50"
                            >
                                {backfillState === "loading"
                                    ? "Regenerando..."
                                    : backfillState === "done"
                                    ? "✓ Resúmenes actualizados"
                                    : "Regenerar resúmenes de pronósticos"}
                            </button>
                        </div>

                        {pendingAction && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
                                <div className="w-full max-w-md rounded-3xl bg-white dark:bg-gray-800 p-6 shadow-xl">
                                    <h2 className="text-xl font-black text-gray-950 dark:text-gray-50">
                                        {pendingAction.type === "promote"
                                            ? "Hacer administrador"
                                            : "Quitar administrador"}
                                    </h2>

                                    {pendingAction.type === "promote" ? (
                                        <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                                            <p>
                                                ¿Deseas convertir a{" "}
                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                    {pendingAction.user.name}
                                                </span>{" "}
                                                en administrador?
                                            </p>

                                            <div className="rounded-2xl bg-gray-50 dark:bg-gray-700 p-4">
                                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                                    Este usuario podrá:
                                                </p>

                                                <ul className="mt-2 space-y-1">
                                                    <li>✓ Registrar resultados</li>
                                                    <li>✓ Crear y editar watch parties</li>
                                                    <li>✓ Cambiar la casa de partidos en grupo</li>
                                                    <li>✓ Promover o quitar administradores</li>
                                                </ul>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                                            <p>
                                                ¿Deseas quitarle permisos de administrador a{" "}
                                                <span className="font-bold text-gray-900 dark:text-gray-100">
                                                    {pendingAction.user.name}
                                                </span>
                                                ?
                                            </p>

                                            <div className="rounded-2xl bg-red-50 p-4 text-red-700">
                                                Ya no podrá registrar resultados ni gestionar watch parties.
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-6 flex gap-3">
                                        <button
                                            onClick={closeModal}
                                            className="flex-1 rounded-2xl bg-gray-100 dark:bg-gray-700 py-3 text-sm font-black text-gray-700 dark:text-gray-200"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            onClick={handleConfirm}
                                            className={`flex-1 rounded-2xl py-3 text-sm font-black text-white ${pendingAction.type === "promote"
                                                ? "bg-green-600"
                                                : "bg-red-600"
                                                }`}
                                        >
                                            {pendingAction.type === "promote"
                                                ? "Hacer admin"
                                                : "Quitar admin"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </>)}

            {activeAdminTab === "knockout_teams" && (
                <section className="space-y-4 my-4">
                    <div className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                        <p className="text-sm font-bold uppercase tracking-widest text-green-600">Eliminatorias</p>
                        <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-gray-50">Equipos por partido</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Asigna los equipos cuando se conozcan los clasificados de cada llave.
                        </p>
                    </div>

                    {knockoutMatches.map((match) => {
                        const saved = knockoutTeams[match.id];
                        const draft = knockoutDraft[match.id] ?? {
                            home: saved?.homeTeamId ?? "",
                            away: saved?.awayTeamId ?? "",
                        };

                        const homeTeam = draft.home ? teamsByFifaCode[draft.home] : null;
                        const awayTeam = draft.away ? teamsByFifaCode[draft.away] : null;

                        const stageLabel: Record<string, string> = {
                            round_of_32: "Ronda de 32",
                            round_of_16: "Octavos",
                            quarter_final: "Cuartos",
                            semi_final: "Semis",
                            third_place: "3er puesto",
                            final: "Final",
                        };

                        return (
                            <div key={match.id} className="rounded-3xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                    {stageLabel[match.stage] ?? match.stage} · M{match.matchNumber}
                                </p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {match.homeLabel} vs {match.awayLabel}
                                </p>

                                {saved && (
                                    <p className="mt-1 text-xs text-green-600 font-semibold">
                                        ✓ {teamsByFifaCode[saved.homeTeamId]?.nameEs} vs {teamsByFifaCode[saved.awayTeamId]?.nameEs}
                                    </p>
                                )}

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Local</p>
                                        <button
                                            onClick={() => setActivePicker({ matchId: match.id, slot: "home" })}
                                            className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-3 text-sm font-bold text-left flex items-center gap-2 dark:text-gray-100"
                                        >
                                            {homeTeam ? <><CountryFlag homeTeam={homeTeam} />{homeTeam.nameEs}</> : "Seleccionar"}
                                        </button>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Visitante</p>
                                        <button
                                            onClick={() => setActivePicker({ matchId: match.id, slot: "away" })}
                                            className="w-full rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-3 text-sm font-bold text-left flex items-center gap-2 dark:text-gray-100"
                                        >
                                            {awayTeam ? <><CountryFlag homeTeam={awayTeam} />{awayTeam.nameEs}</> : "Seleccionar"}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    {(["home", "away"] as const).map((slot) => {
                                        const teamId = slot === "home" ? draft.home : draft.away;
                                        const isSaving = savingKnockout?.matchId === match.id && savingKnockout?.slot === slot;
                                        const savedTeamId = slot === "home" ? saved?.homeTeamId : saved?.awayTeamId;
                                        const alreadySaved = savedTeamId === teamId && !!teamId;
                                        return (
                                            <button
                                                key={slot}
                                                disabled={!teamId || isSaving || alreadySaved}
                                                onClick={async () => {
                                                    setSavingKnockout({ matchId: match.id, slot });
                                                    await onSaveKnockoutTeams(match.id, slot, teamId);
                                                    setSavingKnockout(null);
                                                }}
                                                className="rounded-2xl bg-gray-900 dark:bg-gray-100 dark:text-gray-900 py-3 text-sm font-black text-white disabled:opacity-40"
                                            >
                                                {isSaving ? "Guardando..." : alreadySaved ? "✓ Guardado" : `Guardar ${slot === "home" ? "local" : "visitante"}`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* TeamPickerModal — mounts when a slot is being picked */}
                    {activePicker && (() => {
                        const { matchId, slot } = activePicker;
                        const draft = knockoutDraft[matchId] ?? {
                            home: knockoutTeams[matchId]?.homeTeamId ?? "",
                            away: knockoutTeams[matchId]?.awayTeamId ?? "",
                        };
                        const oppositeSlot = slot === "home" ? "away" : "home";
                        const disabledFifaCode = draft[oppositeSlot] || knockoutTeams[matchId]?.[oppositeSlot === "home" ? "homeTeamId" : "awayTeamId"] || "";
                        const disabledTeamId = disabledFifaCode ? fifaCodeToTeamId(disabledFifaCode) : undefined;

                        return (
                            <TeamPickerModal
                                title={slot === "home" ? "Seleccionar local" : "Seleccionar visitante"}
                                disabledTeamId={disabledTeamId}
                                hideFavorites
                                isSaving={false}
                                onClose={() => setActivePicker(null)}
                                onSelectTeam={(teamId) => {
                                    const fifaCode = teamIdToFifaCode(teamId);
                                    setKnockoutDraft((prev) => ({
                                        ...prev,
                                        [matchId]: {
                                            ...draft,
                                            [slot]: fifaCode,
                                        },
                                    }));
                                    setActivePicker(null);
                                }}
                            />
                        );
                    })()}
                </section>
            )}

            {activeAdminTab === "final_results" && (
                <AdminSpecialResultsSection
                    specialResults={specialResults}
                    isSaving={isSavingSpecialResult}
                    onSaveField={onSaveSpecialResultField}
                />
            )}
        </>
    );
}