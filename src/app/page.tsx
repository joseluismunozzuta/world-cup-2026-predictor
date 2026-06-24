"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { MatchCalendar } from "@/components/MatchCalendar";
import { MatchModal } from "@/components/MatchModal";
import { Match } from "@/types/Match";
import { AttendanceStatus } from "@/types/AttendanceStatus";
import { Prediction } from "@/types/Prediction";
import { calculateLeaderboard } from "@/utils/leaderboard";
import { LeaderboardTable } from "@/components/LeaderBoardTable";
import { getMatchStatus } from "@/utils/matchstatus";
import { AuthView } from "@/components/AuthView";
import { logout } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { LoadingScreen } from "@/components/LoadingScreen";
import { JoinPartyView } from "@/components/JoinPartyView";
import { savePredictionToFirebase, saveSpecialPredictionField, SpecialPredictionsMap, StartedMatchPredictionsMap, subscribeToMyPredictions, subscribeToPartySpecialPredictions, subscribeToStartedMatchPredictions } from "@/lib/predictions";
import { ResultsMap, saveResultToFirebase, subscribeToResults } from "@/lib/results";
import { AppUser, subscribeToUsers } from "@/lib/users";
import { clearAttendanceFromFirebase, AttendanceByMatchMap, saveAttendanceToFirebase, subscribeToMatchAttendance } from "@/lib/attendance";
import { Party, promoteUserToAdmin, removeUserFromAdmin, subscribeToParty } from "@/lib/parties";
import { subscribeToWatchPartyMatches, WatchPartyMatchesMap } from "@/lib/partyMatches";
import { AdminPanel } from "@/components/AdminPanel";
import { formatPeruDate, getPeruDateKey } from "@/utils/format";
import { MyPredictionsTab } from "@/components/MyPredictionsTab";
import { saveSpecialResultField, SpecialResultField, SpecialResults, subscribeToSpecialResults } from "@/lib/specialResults";
import { matchesData } from "@/data/matchesData";
import { Button } from "@base-ui/react";
import { backfillFinishedMatchPredictionSummaries, generateMatchPredictionSummary, MatchPredictionSummary, subscribeToMatchPredictionSummaries } from "@/utils/predictionSummary";
import { AttendanceSummaryMap, backfillAttendanceSummaries, subscribeToAttendanceSummaries } from "@/utils/attendanceSummary";
import { KnockoutTeamsMap, saveKnockoutTeamAssignment, subscribeToKnockoutTeams } from "@/lib/knockoutTeams";
import { saveKnockoutWindowModification } from "@/lib/predictions";
import { closeModificationWindow } from "@/lib/results";
import { initMessaging } from "@/lib/messaging";

export default function Home() {

  type ActiveTab =
    | "matches"
    | "leaderboard"
    | "watching_matches"
    | "admin"
    | "my_predictions";

  type TabItem = {
    id: ActiveTab;
    label: string;
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("matches");

  const [matchFilter, setMatchFilter] = useState<"all" | "today" | "scheduled" | "live" | "finished" | "missing_prediction">("scheduled");

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const { appUser, loadingAuth, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (appUser?.uid) initMessaging(appUser.uid);
  }, [appUser?.uid]);

  const primaryTabs: TabItem[] = [
    { id: "matches", label: "Partidos" },
    { id: "my_predictions", label: "Mis pronósticos" },
    { id: "leaderboard", label: "Tabla" }
  ];

  const secondaryTabs: TabItem[] = [
    { id: "watching_matches", label: "En grupo" },
  ];

  if (isAdmin) {
    secondaryTabs.push({
      id: "admin",
      label: "Admin",
    });
  }

  const [partyUsers, setPartyUsers] = useState<AppUser[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [watchPartyMatches, setWatchPartyMatches] = useState<WatchPartyMatchesMap>({});
  const [isSavingWatchParty, setIsSavingWatchParty] = useState(false);

  const [myPredictions, setMyPredictions] = useState<Record<string, Prediction>>({});
  //const [partyPredictions, setPartyPredictions] = useState<PredictionsMap>({});
  const [startedMatchPredictions, setStartedMatchPredictions] = useState<StartedMatchPredictionsMap>({});
  const [matchPredictionSummaries, setMatchPredictionSummaries] = useState<Record<string, MatchPredictionSummary>>({});
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);
  const [specialPredictions, setSpecialPredictions] = useState<SpecialPredictionsMap>({});
  const [specialResults, setSpecialResults] = useState<SpecialResults | null>(null);
  const [isSavingSpecialPrediction, setIsSavingSpecialPrediction] = useState(false);

  const [results, setResults] = useState<ResultsMap>({});
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [isSavingSpecialResult, setIsSavingSpecialResult] = useState(false);

  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummaryMap>({});
  const [matchAttendance, setMatchAttendance] = useState<AttendanceByMatchMap>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [knockoutTeams, setKnockoutTeams] = useState<KnockoutTeamsMap>({});

  useEffect(() => {
    const unsubscribe = subscribeToKnockoutTeams(setKnockoutTeams);
    return () => unsubscribe();
  }, []);

  const matches = useMemo(() => {
    return matchesData.map((match) => {
      const assignment = knockoutTeams[match.id];
      if (!assignment) return match;
      return {
        ...match,
        homeTeamId: assignment.homeTeamId,
        awayTeamId: assignment.awayTeamId,
      };
    });
  }, [knockoutTeams]);

  useEffect(() => {
    if (!appUser?.activePartyId) return;
    const usersSuscribe = subscribeToUsers(appUser?.activePartyId, setPartyUsers);
    return () => usersSuscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToParty(appUser.activePartyId, setParty);

    return () => unsubscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    if (!appUser?.activePartyId || !appUser.uid) return;

    const unsubscribe = subscribeToMyPredictions(
      appUser.activePartyId,
      appUser.uid,
      setMyPredictions
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId, appUser?.uid]);

  /*useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToPartyPredictions(
      appUser.activePartyId,
      setPartyPredictions
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId]);*/

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToMatchPredictionSummaries(
      appUser.activePartyId,
      setMatchPredictionSummaries
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToPartySpecialPredictions(
      appUser.activePartyId,
      setSpecialPredictions
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    const unsubscribe = subscribeToResults(setResults);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToSpecialResults(
      appUser.activePartyId,
      setSpecialResults
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToWatchPartyMatches(
      appUser?.activePartyId,
      setWatchPartyMatches
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const unsubscribe = subscribeToAttendanceSummaries(
      appUser.activePartyId,
      setAttendanceSummaries
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId]);

  useEffect(() => {
    if (!appUser?.activePartyId || !selectedMatch) return;

    const unsubscribe = subscribeToMatchAttendance(
      appUser.activePartyId,
      selectedMatch.id,
      setMatchAttendance
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId, selectedMatch, selectedMatch?.id]);

  const handleSavePrediction = async (
    matchId: string,
    prediction: Prediction
  ) => {
    if (!appUser?.activePartyId) return;

    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const currentStatus = getMatchStatus(
      match,
      results[matchId],
      now
    );

    if (currentStatus !== "scheduled") {
      alert("No se puede guardar predicción: el partido ya comenzó o terminó.");
      return;
    }

    try {
      setIsSavingPrediction(true);
      await savePredictionToFirebase({
        partyId: appUser.activePartyId,
        userId: appUser.uid,
        matchId,
        prediction,
      });
    } catch (error) {
      console.error("Error guardando predicción:", error);
    } finally {
      setIsSavingPrediction(false);
    }
  };

  const handleSaveSpecialResultField = async (
    field: SpecialResultField,
    value: string
  ) => {
    if (!appUser?.activePartyId) return;
    if (!appUser?.uid) return;
    if (!isAdmin) return;

    try {
      setIsSavingSpecialResult(true);
      await saveSpecialResultField({
        partyId: appUser.activePartyId,
        adminUserId: appUser.uid,
        field,
        value,
      });
    } catch (error) {
      console.error("Error guardando resultado final:", error);
    } finally {
      setIsSavingSpecialResult(false);
    }
  };

  const handleSaveResult = async (
    matchId: string,
    result: {
      homeScore: number;
      awayScore: number;
      qualifiedTeamId?: string;
      wentToPenalties?: boolean;
      openModificationWindowMinutes?: number;
    }
  ) => {
    if (!appUser) return;
    if (!isAdmin) return;

    const finishedResult = {
      matchId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      status: "finished" as const,
      ...(result.qualifiedTeamId !== undefined && { qualifiedTeamId: result.qualifiedTeamId }),
      ...(result.wentToPenalties !== undefined && { wentToPenalties: result.wentToPenalties }),
    };

    try {
      setIsSavingResult(true);

      await saveResultToFirebase({
        matchId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        updatedBy: appUser.uid,
        qualifiedTeamId: result.qualifiedTeamId,
        wentToPenalties: result.wentToPenalties,
        openModificationWindowMinutes: result.openModificationWindowMinutes,
      });

      await generateMatchPredictionSummary({
        partyId: appUser.activePartyId!,
        matchId,
        result: finishedResult,
        partyUsers,
      });

    } catch (error) {
      console.error("Error guardando resultado:", error);
      alert("Error al guardar el resultado. Revisa la consola.");
    } finally {
      setIsSavingResult(false);
    }
  };

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleAttendanceChange = async (
    matchId: string,
    status: AttendanceStatus
  ) => {
    if (!appUser?.activePartyId) return;

    try {
      setIsSavingAttendance(true);

      await saveAttendanceToFirebase({
        partyId: appUser.activePartyId,
        userId: appUser.uid,
        matchId,
        status,
      });
    } catch (error) {
      console.error("Error guardando asistencia:", error);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const clearAttendance = async (matchId: string) => {
    if (!appUser?.activePartyId) return;

    try {
      setIsSavingAttendance(true);

      await clearAttendanceFromFirebase({
        partyId: appUser.activePartyId,
        userId: appUser.uid,
        matchId,
      });
    } catch (error) {
      console.error("Error limpiando asistencia:", error);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handlePromoteUser = async (userId: string) => {
    if (!party) return;
    if (!isAdmin) return;

    try {
      setIsSavingAdmin(true);
      await promoteUserToAdmin(party.id, userId);
    } catch (error) {
      console.error("Error promoviendo usuario:", error);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDemoteUser = async (userId: string) => {
    if (!party) return;
    if (!isAdmin) return;

    try {
      setIsSavingAdmin(true);
      await removeUserFromAdmin(party.id, userId);
    } catch (error) {
      console.error("Error quitando admin:", error);
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const hasWorldCupStarted = matches.some((match) => {
    return new Date(match.kickoff).getTime() <= now;
  });

  const startedNotFinishedMatchIdsKey = useMemo(() => {
    return matches
      .filter((match) => {
        const result = results[match.id];

        if (result?.status === "finished") return false;

        return now >= new Date(match.kickoff).getTime();
      })
      .map((match) => match.id)
      .sort()
      .join("|");
  }, [matches, results, now]);

  useEffect(() => {
    if (!appUser?.activePartyId) return;

    const matchIds = startedNotFinishedMatchIdsKey
      ? startedNotFinishedMatchIdsKey.split("|")
      : [];

    const unsubscribe = subscribeToStartedMatchPredictions(
      appUser.activePartyId,
      matchIds,
      setStartedMatchPredictions
    );

    return () => unsubscribe();
  }, [appUser?.activePartyId, startedNotFinishedMatchIdsKey]);

  const handleSaveSpecialPredictionField = async (
    field:
      | "championTeamId"
      | "runnerUpTeamId"
      | "topScorerPlayerId"
      | "bestPlayerId",
    value: string
  ) => {
    if (!appUser?.activePartyId || !appUser?.uid) return;

    try {
      setIsSavingSpecialPrediction(true);

      await saveSpecialPredictionField({
        partyId: appUser.activePartyId,
        userId: appUser.uid,
        field,
        value,
        hasWorldCupStarted,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingSpecialPrediction(false);
    }
  };

  const handleBackfillAttendanceSummaries = async () => {
    if (!appUser?.activePartyId) return;
    await backfillAttendanceSummaries({ partyId: appUser.activePartyId });
  };

  const handleSaveKnockoutTeams = async (matchId: string, homeTeamId: string, awayTeamId: string) => {
    if (!appUser?.uid || !isAdmin) return;
    await saveKnockoutTeamAssignment({ matchId, homeTeamId, awayTeamId, updatedBy: appUser.uid });
  };

  const handleCloseModificationWindow = async (matchId: string) => {
    if (!isAdmin) return;
    await closeModificationWindow(matchId);
  };

  const handleSaveWindowModification = async (
    matchId: string,
    qualifiedTeamId: string,
    penaltiesIfDraw: boolean
  ) => {
    if (!appUser?.activePartyId || !appUser?.uid) return;
    await saveKnockoutWindowModification({
      partyId: appUser.activePartyId,
      userId: appUser.uid,
      matchId,
      qualifiedTeamId,
      penaltiesIfDraw,
    });
  };

  const leaderboard = calculateLeaderboard(
    partyUsers,
    matchPredictionSummaries,
    specialPredictions,
    specialResults,
    matches
  );

  const mySpecialPrediction = appUser
    ? specialPredictions[appUser.uid] ?? null
    : null;

  const selectedResult = selectedMatch
    ? results[selectedMatch.id]
    : undefined;

  const selectedStatus = getMatchStatus(
    selectedMatch,
    selectedResult,
    now
  );

  const selectedAttendanceStatus = selectedMatch && appUser
    ? matchAttendance[selectedMatch.id]?.[appUser.uid]
    : undefined;

  const selectedAttendees = selectedMatch
    ? partyUsers.filter(
      user => matchAttendance[selectedMatch.id]?.[user.uid] === "going"
    )
    : [];

  const selectedNotAttendees = selectedMatch
    ? partyUsers.filter(
      user => matchAttendance[selectedMatch.id]?.[user.uid] === "not_going"
    )
    : [];

  const watchPartyOnlyMatches = matches.filter(
    (match) => !!watchPartyMatches[match.id]
  );

  const selectedWatchParty = selectedMatch
    ? watchPartyMatches[selectedMatch.id]
    : undefined;

  const selectedIsWatchParty = !!selectedWatchParty;

  const upcomingWatchPartyMatches = watchPartyOnlyMatches.filter(
    (match) =>
      getMatchStatus(match, results[match.id], now) !== "finished"
  );

  const finishedWatchPartyMatches = watchPartyOnlyMatches.filter(
    (match) =>
      getMatchStatus(match, results[match.id], now) === "finished"
  );

  if (loadingAuth) {
    return <LoadingScreen />;
  }

  if (!appUser) {
    return <AuthView />;
  }

  const filteredMatches = matches.filter((match) => {
    const result = results[match.id];
    const status = getMatchStatus(match, result, now);
    const prediction = myPredictions?.[match.id];

    if (matchFilter === "today") {
      const today = new Date();
      const matchDate = new Date(match.kickoff);
      return (
        matchDate.getFullYear() === today.getFullYear() &&
        matchDate.getMonth() === today.getMonth() &&
        matchDate.getDate() === today.getDate()
      );
    }

    if (matchFilter === "scheduled") {
      return status === "scheduled";
    }

    if (matchFilter === "live") {
      return status === "live";
    }

    if (matchFilter === "finished") {
      return status === "finished";
    }

    if (matchFilter === "missing_prediction") {
      return status === "scheduled" && !prediction;
    }

    return true;
  });

  const matchesByDate = filteredMatches.reduce<
    Record<string, Match[]>
  >((acc, match) => {
    const dateKey = getPeruDateKey(match.kickoff);

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }

    acc[dateKey].push(match);

    return acc;
  }, {});

  const groupedMatches = Object.entries(matchesByDate).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  if (!appUser.activePartyId) {
    return <JoinPartyView appUser={appUser} />;
  }


  return (
    <main className="min-h-screen bg-background px-5 py-8 relative">

      {(isSavingPrediction || isSavingResult || isSavingAttendance || isSavingWatchParty
        || isSavingAdmin || isSavingSpecialPrediction || isSavingSpecialResult) &&
        <LoadingScreen />
      }

      <div className="absolute top-5 left-0 right-0 px-4">
        <div className="relative flex h-11 items-center">
          <p className="font-semibold dark:text-gray-100 pr-24 truncate">
            Hola, {appUser.name}
          </p>

          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="absolute right-14 flex h-11 w-11 items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {theme === "dark" ? (
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.166 17.834a.75.75 0 0 0-1.06 1.06l1.59 1.591a.75.75 0 1 0 1.061-1.06l-1.591-1.591ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.166 6.166a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.06-1.061L6.166 6.166Z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          <button
            onClick={logout}
            className="group absolute right-0 flex h-11 w-11 items-center justify-start overflow-hidden rounded-full bg-red-600 shadow-lg transition-all duration-200 hover:w-32 hover:rounded-lg active:translate-x-1 active:translate-y-1"
          >
            <div className="flex w-full items-center justify-center transition-all duration-300 group-hover:justify-start group-hover:px-3">
              <svg className="h-4 w-4" viewBox="0 0 512 512" fill="white">
                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
              </svg>
            </div>

            <div className="absolute right-5 translate-x-full text-xs font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
              Cerrar sesión
            </div>
          </button>
        </div>
      </div>

      <section className="mx-auto max-w-6xl my-10 lg:my-2">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-green-600">
            Mundial 2026
          </p>

          <h1 className="mt-2 text-3xl font-black text-gray-950 dark:text-gray-50 md:text-5xl">
            {party?.name}
          </h1>

          <p className="mt-3 max-w-2xl text-gray-600 dark:text-gray-400">
            Confirmen asistencia, propongan casa y vayan metiendo sus pronósticos ⚽
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 rounded-3xl bg-white dark:bg-gray-800 p-1 shadow-sm">
            {primaryTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-3 py-3 text-sm font-bold transition ${activeTab === tab.id
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "text-gray-500 dark:text-gray-400"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {secondaryTabs.length > 0 && (
            <div
              className={`grid rounded-3xl bg-white dark:bg-gray-800 p-1 shadow-sm ${secondaryTabs.length === 1
                ? "grid-cols-1"
                : "grid-cols-2"
                }`}
            >
              {secondaryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-2xl px-3 py-3 text-sm font-bold transition ${activeTab === tab.id
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === "matches" && (
          <section className="my-4 space-y-6">
            <div>
              <h2 className="text-xl font-black text-gray-950 dark:text-gray-50">
                Todos los partidos
              </h2>

              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Revisa el calendario completo y mete tus pronósticos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {[
                { key: "all", label: "Todos" },
                { key: "today", label: "Hoy" },
                { key: "scheduled", label: "Próximos" },
                { key: "live", label: "En vivo" },
                { key: "finished", label: "Terminados" },
                { key: "missing_prediction", label: "Por pronosticar" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setMatchFilter(filter.key as typeof matchFilter)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${matchFilter === filter.key
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 shadow-sm"
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {Object.entries(matchesByDate).length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 text-center shadow-sm">
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  No hay partidos para este filtro.
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Prueba seleccionando otra opción.
                </p>
              </div>
            ) : (
              groupedMatches.map(([date, dateMatches]) => (
                <div key={date} className="space-y-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    {formatPeruDate(dateMatches[0].kickoff)}
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dateMatches.map((match) => {
                      const watchParty = watchPartyMatches[match.id];
                      const isWatchParty = !!watchParty;

                      return (
                        <MatchCard
                          key={match.id}
                          match={match}
                          onSelect={setSelectedMatch}
                          attendanceCount={attendanceSummaries[match.id]?.goingCount ?? 0}
                          status={getMatchStatus(match, results[match.id], now)}
                          isWatchParty={isWatchParty}
                          watchParty={watchParty}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === "my_predictions" && appUser && (
          <MyPredictionsTab
            matches={matches}
            myPredictions={myPredictions}
            matchPredictionSummaries={matchPredictionSummaries}
            startedMatchPredictions={startedMatchPredictions}
            partyUsers={partyUsers}
            onSelect={setSelectedMatch}
            results={results}
            onGoToMatches={() => setActiveTab("matches")}
            specialPrediction={mySpecialPrediction}
            hasWorldCupStarted={hasWorldCupStarted}
            onSaveSpecialPredictionField={handleSaveSpecialPredictionField}
            now={now}
            currentUserId={appUser.uid}
          />
        )}

        {activeTab === "watching_matches" && (
          <>
            <p className="text-lg font-bold my-5">Veremos juntos</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingWatchPartyMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelect={setSelectedMatch}
                  attendanceCount={attendanceSummaries[match.id]?.goingCount ?? 0}
                  status={getMatchStatus(match, results[match.id], now)}
                  isWatchParty={true}
                  watchParty={watchPartyMatches[match.id]}
                />
              ))}
            </div>
            <p className="text-lg font-bold my-5">Vimos juntos</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {finishedWatchPartyMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelect={setSelectedMatch}
                  attendanceCount={attendanceSummaries[match.id]?.goingCount ?? 0}
                  status={getMatchStatus(match, results[match.id], now)}
                  isWatchParty={true}
                  watchParty={watchPartyMatches[match.id]}
                />
              ))}
            </div>
          </>
        )}

        <div className={activeTab === "leaderboard" ? "block" : "hidden"}>
          <LeaderboardTable leaderboard={leaderboard} />
        </div>

        {activeTab === "admin" && isAdmin && (
          <AdminPanel
            party={party}
            members={partyUsers}
            appUser={appUser}
            specialResults={specialResults}
            isSavingSpecialResult={isSavingSpecialResult}
            onPromoteUser={handlePromoteUser}
            onDemoteUser={handleDemoteUser}
            onSaveSpecialResultField={handleSaveSpecialResultField}
            onBackfillAttendanceSummaries={handleBackfillAttendanceSummaries}
            knockoutTeams={knockoutTeams}
            onSaveKnockoutTeams={handleSaveKnockoutTeams}
          />
        )}

      </section>
      <MatchModal
        key={selectedMatch?.id ?? "no-match"}
        match={selectedMatch}
        attendanceStatus={selectedAttendanceStatus}
        attendees={selectedAttendees}
        notAttendees={selectedNotAttendees}
        onSavePrediction={handleSavePrediction}
        onSaveResult={handleSaveResult}
        resultMatch={selectedMatch ? results[selectedMatch.id] : undefined}
        prediction={selectedMatch ? myPredictions?.[selectedMatch.id] : undefined}
        onAttendanceChange={handleAttendanceChange}
        onClearAttendance={clearAttendance}
        onClose={() => setSelectedMatch(null)}
        status={selectedStatus}
        appUser={appUser}
        isWatchParty={selectedIsWatchParty}
        watchParty={selectedWatchParty}
        members={partyUsers}
        onSavingWatchPartyChange={setIsSavingWatchParty}
        onSaveWindowModification={handleSaveWindowModification}
        onCloseModificationWindow={handleCloseModificationWindow}
        jokersUsed={Object.values(myPredictions).filter((p) => p.jokerActivated).length}
      />
    </main>
  );
}