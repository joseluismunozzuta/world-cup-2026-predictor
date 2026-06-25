import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();

const TEAM_NAMES: Record<string, string> = {
    MEX: "México", RSA: "Sudáfrica", KOR: "Corea del Sur", CZE: "Rep. Checa",
    CAN: "Canadá", BIH: "Bosnia y Herz.", USA: "EE.UU.", PAR: "Paraguay",
    QAT: "Catar", SUI: "Suiza", BRA: "Brasil", MAR: "Marruecos",
    HAI: "Haití", SCO: "Escocia", AUS: "Australia", TUR: "Turquía",
    GER: "Alemania", CUW: "Curazao", NED: "Países Bajos", JPN: "Japón",
    CIV: "Costa de Marfil", ECU: "Ecuador", SWE: "Suecia", TUN: "Túnez",
    ESP: "España", CPV: "Cabo Verde", BEL: "Bélgica", EGY: "Egipto",
    KSA: "Arabia Saudita", URU: "Uruguay", IRN: "Irán", NZL: "Nueva Zelanda",
    FRA: "Francia", SEN: "Senegal", IRQ: "Irak", NOR: "Noruega",
    ARG: "Argentina", ALG: "Argelia", AUT: "Austria", JOR: "Jordania",
    POR: "Portugal", COD: "R.D. Congo", ENG: "Inglaterra", CRO: "Croacia",
    GHA: "Ghana", PAN: "Panamá", UZB: "Uzbekistán", COL: "Colombia",
};

type MatchEntry = { id: string; kickoff: string; home: string; away: string }
    | { id: string; kickoff: string; homeLabel: string; awayLabel: string };

function getLabel(m: MatchEntry): { home: string; away: string } {
    if ("home" in m) {
        return {
            home: TEAM_NAMES[m.home.toUpperCase()] ?? m.home.toUpperCase(),
            away: TEAM_NAMES[m.away.toUpperCase()] ?? m.away.toUpperCase(),
        };
    }
    return { home: m.homeLabel, away: m.awayLabel };
}

const MATCHES: MatchEntry[] = [
    // TEST — borrar después de probar
    { id: "test-match", kickoff: "2026-06-24T03:20:00-05:00", home: "BRA", away: "ARG" },
    // Fase de grupos
    { id: "m001-mex-rsa", kickoff: "2026-06-11T14:00:00-05:00", home: "MEX", away: "RSA" },
    { id: "m002-kor-cze", kickoff: "2026-06-11T21:00:00-05:00", home: "KOR", away: "CZE" },
    { id: "m003-can-bih", kickoff: "2026-06-12T14:00:00-05:00", home: "CAN", away: "BIH" },
    { id: "m004-usa-par", kickoff: "2026-06-12T20:00:00-05:00", home: "USA", away: "PAR" },
    { id: "m005-qat-sui", kickoff: "2026-06-13T14:00:00-05:00", home: "QAT", away: "SUI" },
    { id: "m006-bra-mar", kickoff: "2026-06-13T17:00:00-05:00", home: "BRA", away: "MAR" },
    { id: "m007-hai-sco", kickoff: "2026-06-13T20:00:00-05:00", home: "HAI", away: "SCO" },
    { id: "m008-aus-tur", kickoff: "2026-06-13T23:00:00-05:00", home: "AUS", away: "TUR" },
    { id: "m009-ger-cuw", kickoff: "2026-06-14T12:00:00-05:00", home: "GER", away: "CUW" },
    { id: "m010-ned-jpn", kickoff: "2026-06-14T15:00:00-05:00", home: "NED", away: "JPN" },
    { id: "m011-civ-ecu", kickoff: "2026-06-14T18:00:00-05:00", home: "CIV", away: "ECU" },
    { id: "m012-swe-tun", kickoff: "2026-06-14T21:00:00-05:00", home: "SWE", away: "TUN" },
    { id: "m013-esp-cpv", kickoff: "2026-06-15T11:00:00-05:00", home: "ESP", away: "CPV" },
    { id: "m014-bel-egy", kickoff: "2026-06-15T14:00:00-05:00", home: "BEL", away: "EGY" },
    { id: "m015-ksa-uru", kickoff: "2026-06-15T17:00:00-05:00", home: "KSA", away: "URU" },
    { id: "m016-irn-nzl", kickoff: "2026-06-15T20:00:00-05:00", home: "IRN", away: "NZL" },
    { id: "m017-fra-sen", kickoff: "2026-06-16T14:00:00-05:00", home: "FRA", away: "SEN" },
    { id: "m018-irq-nor", kickoff: "2026-06-16T17:00:00-05:00", home: "IRQ", away: "NOR" },
    { id: "m019-arg-alg", kickoff: "2026-06-16T20:00:00-05:00", home: "ARG", away: "ALG" },
    { id: "m020-aut-jor", kickoff: "2026-06-16T23:00:00-05:00", home: "AUT", away: "JOR" },
    { id: "m021-por-cod", kickoff: "2026-06-17T12:00:00-05:00", home: "POR", away: "COD" },
    { id: "m022-eng-cro", kickoff: "2026-06-17T15:00:00-05:00", home: "ENG", away: "CRO" },
    { id: "m023-gha-pan", kickoff: "2026-06-17T18:00:00-05:00", home: "GHA", away: "PAN" },
    { id: "m024-uzb-col", kickoff: "2026-06-17T21:00:00-05:00", home: "UZB", away: "COL" },
    { id: "m025-cze-rsa", kickoff: "2026-06-18T11:00:00-05:00", home: "CZE", away: "RSA" },
    { id: "m026-sui-bih", kickoff: "2026-06-18T14:00:00-05:00", home: "SUI", away: "BIH" },
    { id: "m027-can-qat", kickoff: "2026-06-18T17:00:00-05:00", home: "CAN", away: "QAT" },
    { id: "m028-mex-kor", kickoff: "2026-06-18T20:00:00-05:00", home: "MEX", away: "KOR" },
    { id: "m029-usa-aus", kickoff: "2026-06-19T14:00:00-05:00", home: "USA", away: "AUS" },
    { id: "m030-sco-mar", kickoff: "2026-06-19T17:00:00-05:00", home: "SCO", away: "MAR" },
    { id: "m031-bra-hai", kickoff: "2026-06-19T19:30:00-05:00", home: "BRA", away: "HAI" },
    { id: "m032-tur-par", kickoff: "2026-06-19T22:00:00-05:00", home: "TUR", away: "PAR" },
    { id: "m033-ned-swe", kickoff: "2026-06-20T12:00:00-05:00", home: "NED", away: "SWE" },
    { id: "m034-ger-civ", kickoff: "2026-06-20T15:00:00-05:00", home: "GER", away: "CIV" },
    { id: "m035-ecu-cuw", kickoff: "2026-06-20T19:00:00-05:00", home: "ECU", away: "CUW" },
    { id: "m036-tun-jpn", kickoff: "2026-06-20T23:00:00-05:00", home: "TUN", away: "JPN" },
    { id: "m037-esp-ksa", kickoff: "2026-06-21T11:00:00-05:00", home: "ESP", away: "KSA" },
    { id: "m038-bel-irn", kickoff: "2026-06-21T14:00:00-05:00", home: "BEL", away: "IRN" },
    { id: "m039-uru-cpv", kickoff: "2026-06-21T17:00:00-05:00", home: "URU", away: "CPV" },
    { id: "m040-nzl-egy", kickoff: "2026-06-21T20:00:00-05:00", home: "NZL", away: "EGY" },
    { id: "m041-arg-aut", kickoff: "2026-06-22T12:00:00-05:00", home: "ARG", away: "AUT" },
    { id: "m042-fra-irq", kickoff: "2026-06-22T16:00:00-05:00", home: "FRA", away: "IRQ" },
    { id: "m043-nor-sen", kickoff: "2026-06-22T19:00:00-05:00", home: "NOR", away: "SEN" },
    { id: "m044-jor-alg", kickoff: "2026-06-22T22:00:00-05:00", home: "JOR", away: "ALG" },
    { id: "m045-por-uzb", kickoff: "2026-06-23T12:00:00-05:00", home: "POR", away: "UZB" },
    { id: "m046-eng-gha", kickoff: "2026-06-23T15:00:00-05:00", home: "ENG", away: "GHA" },
    { id: "m047-pan-cro", kickoff: "2026-06-23T18:00:00-05:00", home: "PAN", away: "CRO" },
    { id: "m048-col-cod", kickoff: "2026-06-23T21:00:00-05:00", home: "COL", away: "COD" },
    { id: "m049-sui-can", kickoff: "2026-06-24T03:00:00-05:00", home: "SUI", away: "CAN" },
    { id: "m050-bih-qat", kickoff: "2026-06-24T14:00:00-05:00", home: "BIH", away: "QAT" },
    { id: "m051-mar-hai", kickoff: "2026-06-24T17:00:00-05:00", home: "MAR", away: "HAI" },
    { id: "m052-sco-bra", kickoff: "2026-06-24T17:00:00-05:00", home: "SCO", away: "BRA" },
    { id: "m053-rsa-kor", kickoff: "2026-06-24T20:00:00-05:00", home: "RSA", away: "KOR" },
    { id: "m054-cze-mex", kickoff: "2026-06-24T20:00:00-05:00", home: "CZE", away: "MEX" },
    { id: "m055-cuw-civ", kickoff: "2026-06-25T15:00:00-05:00", home: "CUW", away: "CIV" },
    { id: "m056-ecu-ger", kickoff: "2026-06-25T15:00:00-05:00", home: "ECU", away: "GER" },
    { id: "m057-tun-ned", kickoff: "2026-06-25T18:00:00-05:00", home: "TUN", away: "NED" },
    { id: "m058-jpn-swe", kickoff: "2026-06-25T18:00:00-05:00", home: "JPN", away: "SWE" },
    { id: "m059-tur-usa", kickoff: "2026-06-25T21:00:00-05:00", home: "TUR", away: "USA" },
    { id: "m060-par-aus", kickoff: "2026-06-25T21:00:00-05:00", home: "PAR", away: "AUS" },
    { id: "m061-nor-fra", kickoff: "2026-06-26T14:00:00-05:00", home: "NOR", away: "FRA" },
    { id: "m062-sen-irq", kickoff: "2026-06-26T14:00:00-05:00", home: "SEN", away: "IRQ" },
    { id: "m063-cpv-ksa", kickoff: "2026-06-26T19:00:00-05:00", home: "CPV", away: "KSA" },
    { id: "m064-uru-esp", kickoff: "2026-06-26T19:00:00-05:00", home: "URU", away: "ESP" },
    { id: "m065-nzl-bel", kickoff: "2026-06-26T22:00:00-05:00", home: "NZL", away: "BEL" },
    { id: "m066-egy-irn", kickoff: "2026-06-26T22:00:00-05:00", home: "EGY", away: "IRN" },
    { id: "m067-pan-eng", kickoff: "2026-06-27T16:00:00-05:00", home: "PAN", away: "ENG" },
    { id: "m068-cro-gha", kickoff: "2026-06-27T16:00:00-05:00", home: "CRO", away: "GHA" },
    { id: "m069-col-por", kickoff: "2026-06-27T18:30:00-05:00", home: "COL", away: "POR" },
    { id: "m070-cod-uzb", kickoff: "2026-06-27T18:30:00-05:00", home: "COD", away: "UZB" },
    { id: "m071-alg-aut", kickoff: "2026-06-27T21:00:00-05:00", home: "ALG", away: "AUT" },
    { id: "m072-jor-arg", kickoff: "2026-06-27T21:00:00-05:00", home: "JOR", away: "ARG" },
    // Round of 32
    { id: "m073-r32-2a-2b", kickoff: "2026-06-28T14:00:00-05:00", homeLabel: "2do Grupo A", awayLabel: "2do Grupo B" },
    { id: "m074-r32-1e-3abcdf", kickoff: "2026-06-29T15:30:00-05:00", homeLabel: "1ro Grupo E", awayLabel: "3ro A/B/C/D/F" },
    { id: "m075-r32-1f-2c", kickoff: "2026-06-29T20:00:00-05:00", homeLabel: "1ro Grupo F", awayLabel: "2do Grupo C" },
    { id: "m076-r32-1c-2f", kickoff: "2026-06-29T12:00:00-05:00", homeLabel: "1ro Grupo C", awayLabel: "2do Grupo F" },
    { id: "m077-r32-1i-3cdfgh", kickoff: "2026-06-30T16:00:00-05:00", homeLabel: "1ro Grupo I", awayLabel: "3ro C/D/F/G/H" },
    { id: "m078-r32-2e-2i", kickoff: "2026-06-30T12:00:00-05:00", homeLabel: "2do Grupo E", awayLabel: "2do Grupo I" },
    { id: "m079-r32-1a-3cefhi", kickoff: "2026-06-30T20:00:00-05:00", homeLabel: "1ro Grupo A", awayLabel: "3ro C/E/F/H/I" },
    { id: "m080-r32-1l-3ehijk", kickoff: "2026-07-01T11:00:00-05:00", homeLabel: "1ro Grupo L", awayLabel: "3ro E/H/I/J/K" },
    { id: "m081-r32-1d-3befij", kickoff: "2026-07-01T19:00:00-05:00", homeLabel: "1ro Grupo D", awayLabel: "3ro B/E/F/I/J" },
    { id: "m082-r32-1g-3aehij", kickoff: "2026-07-01T15:00:00-05:00", homeLabel: "1ro Grupo G", awayLabel: "3ro A/E/H/I/J" },
    { id: "m083-r32-2k-2l", kickoff: "2026-07-02T18:00:00-05:00", homeLabel: "2do Grupo K", awayLabel: "2do Grupo L" },
    { id: "m084-r32-1h-2j", kickoff: "2026-07-02T14:00:00-05:00", homeLabel: "1ro Grupo H", awayLabel: "2do Grupo J" },
    { id: "m085-r32-1b-3efgij", kickoff: "2026-07-02T22:00:00-05:00", homeLabel: "1ro Grupo B", awayLabel: "3ro E/F/G/I/J" },
    { id: "m086-r32-1j-2h", kickoff: "2026-07-03T17:00:00-05:00", homeLabel: "1ro Grupo J", awayLabel: "2do Grupo H" },
    { id: "m087-r32-1k-3deijl", kickoff: "2026-07-03T20:30:00-05:00", homeLabel: "1ro Grupo K", awayLabel: "3ro D/E/I/J/L" },
    { id: "m088-r32-2d-2g", kickoff: "2026-07-03T13:00:00-05:00", homeLabel: "2do Grupo D", awayLabel: "2do Grupo G" },
    // Round of 16
    { id: "m089-r16-w74-w77", kickoff: "2026-07-04T16:00:00-05:00", homeLabel: "Ganador M74", awayLabel: "Ganador M77" },
    { id: "m090-r16-w73-w75", kickoff: "2026-07-04T12:00:00-05:00", homeLabel: "Ganador M73", awayLabel: "Ganador M75" },
    { id: "m091-r16-w76-w78", kickoff: "2026-07-05T15:00:00-05:00", homeLabel: "Ganador M76", awayLabel: "Ganador M78" },
    { id: "m092-r16-w79-w80", kickoff: "2026-07-05T19:00:00-05:00", homeLabel: "Ganador M79", awayLabel: "Ganador M80" },
    { id: "m093-r16-w83-w84", kickoff: "2026-07-06T14:00:00-05:00", homeLabel: "Ganador M83", awayLabel: "Ganador M84" },
    { id: "m094-r16-w81-w82", kickoff: "2026-07-06T19:00:00-05:00", homeLabel: "Ganador M81", awayLabel: "Ganador M82" },
    { id: "m095-r16-w86-w88", kickoff: "2026-07-07T11:00:00-05:00", homeLabel: "Ganador M86", awayLabel: "Ganador M88" },
    { id: "m096-r16-w85-w87", kickoff: "2026-07-07T15:00:00-05:00", homeLabel: "Ganador M85", awayLabel: "Ganador M87" },
    // Cuartos de final
    { id: "m097-qf-w89-w90", kickoff: "2026-07-09T15:00:00-05:00", homeLabel: "Ganador M89", awayLabel: "Ganador M90" },
    { id: "m098-qf-w93-w94", kickoff: "2026-07-10T14:00:00-05:00", homeLabel: "Ganador M93", awayLabel: "Ganador M94" },
    { id: "m099-qf-w91-w92", kickoff: "2026-07-11T16:00:00-05:00", homeLabel: "Ganador M91", awayLabel: "Ganador M92" },
    { id: "m100-qf-w95-w96", kickoff: "2026-07-11T20:00:00-05:00", homeLabel: "Ganador M95", awayLabel: "Ganador M96" },
    // Semifinales
    { id: "m101-sf-w97-w98", kickoff: "2026-07-14T14:00:00-05:00", homeLabel: "Ganador M97", awayLabel: "Ganador M98" },
    { id: "m102-sf-w99-w100", kickoff: "2026-07-15T14:00:00-05:00", homeLabel: "Ganador M99", awayLabel: "Ganador M100" },
    // Tercer lugar y Final
    { id: "m103-third-place", kickoff: "2026-07-18T16:00:00-05:00", homeLabel: "Perdedor M101", awayLabel: "Perdedor M102" },
    { id: "m104-final", kickoff: "2026-07-19T14:00:00-05:00", homeLabel: "Ganador M101", awayLabel: "Ganador M102" },
];

export const notifyUpcomingMatches = onSchedule(
    { schedule: "every 1 minutes", timeZone: "America/Lima", region: "us-central1" },
    async () => {
        const now = Date.now();
        const windowStart = now + 14 * 60 * 1000;
        const windowEnd = now + 15 * 60 * 1000;

        const upcoming = MATCHES.filter((m) => {
            const t = new Date(m.kickoff).getTime();
            return t >= windowStart && t < windowEnd;
        });

        if (upcoming.length === 0) return;

        const snapshot = await admin.firestore()
            .collection("users")
            .where("fcmToken", "!=", null)
            .get();

        const tokens = snapshot.docs
            .map((d) => d.get("fcmToken") as string)
            .filter(Boolean);

        if (tokens.length === 0) return;

        for (const match of upcoming) {
            const { home, away } = getLabel(match);

            const message: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title: "⚽ ¡Partido en 15 minutos!",
                    body: `${home} vs ${away} — ¡Registra tu pronóstico antes de que empiece!`,
                },
                webpush: {
                    notification: {
                        icon: "/icon-192.png",
                        badge: "/icon-192.png",
                        requireInteraction: true,
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            console.log(`[${match.id}] ok=${response.successCount} fail=${response.failureCount}`);
        }
    }
);
