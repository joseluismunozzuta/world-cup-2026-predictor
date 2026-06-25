import { favoriteTeamIds, Team, Teams } from "@/data/Teams";
import { useMemo, useState } from "react";
import { TeamPickerCard } from "./TeamPickerCard";

export function TeamPickerModal({
    title,
    disabledTeamId,
    isSaving,
    hideFavorites,
    onClose,
    onSelectTeam,
}: {
    title: string;
    disabledTeamId?: string;
    isSaving: boolean;
    hideFavorites?: boolean;
    onClose: () => void;
    onSelectTeam: (teamId: string) => void;
}) {
    const [search, setSearch] = useState("");

    const favoriteTeams = useMemo(() => {
        return favoriteTeamIds
            .map((teamId) => Teams.find((team) => team.id === teamId))
            .filter((team): team is Team => Boolean(team));
    }, []);

    const sortedTeams = [...Teams].sort((a, b) =>
        a.nameEs.localeCompare(b.nameEs)
    );

    const filteredTeams = sortedTeams.filter((team) => {
        const searchText = search.toLowerCase();

        return (
            team.nameEs.toLowerCase().includes(searchText) ||
            team.fifaCode.toLowerCase().includes(searchText)
        );
    });

    const showFavorites = search.trim().length === 0 && !hideFavorites;

    return (
        <div className="fixed inset-0 z-50 flex bg-black/60 px-4 justify-center items-center pb-4">
            <div className="max-h-[88vh] w-full overflow-hidden rounded-3xl bg-white dark:bg-gray-800 shadow-xl sm:max-w-lg">
                <div className="border-b border-gray-100 dark:border-gray-700 p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-50">
                                {title}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                Esta elección se guarda una sola vez.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 px-4 py-3 text-sm font-black text-gray-500 dark:text-gray-300 disabled:opacity-50"
                        >
                            X
                        </button>
                    </div>

                    <div className="mt-5">
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar selección..."
                            className="w-full rounded-2xl bg-gray-100 dark:bg-gray-700 px-4 py-4 text-sm font-bold text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        />
                    </div>
                </div>

                <div className="max-h-[62vh] overflow-y-auto p-4">
                    {showFavorites && (
                        <div className="mb-6">
                            <h4 className="mb-3 px-1 text-xs font-black uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                ⭐ Favoritos
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                {favoriteTeams.map((team) => (
                                    <TeamPickerCard
                                        key={team.id}
                                        team={team}
                                        isDisabled={team.id === disabledTeamId}
                                        isSaving={isSaving}
                                        onSelectTeam={onSelectTeam}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="mb-3 px-1 text-xs font-black uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            🌍 Todas las selecciones
                        </h4>

                        {filteredTeams.length === 0 ? (
                            <div className="rounded-3xl bg-gray-50 dark:bg-gray-700 p-8 text-center">
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    No encontramos esa selección.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {filteredTeams.map((team) => (
                                    <TeamPickerCard
                                        key={team.id}
                                        team={team}
                                        isDisabled={team.id === disabledTeamId}
                                        isSaving={isSaving}
                                        onSelectTeam={onSelectTeam}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}