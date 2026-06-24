import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();

// FIFA code → nombre en español (uppercase keys para hacer lookup)
const TEAM_NAMES: Record<string, string> = {
    MEX: "México", RSA: "Sudáfrica", KOR: "Corea del Sur", CZE: "República Checa",
    CAN: "Canadá", BIH: "Bosnia y Herz.", USA: "Estados Unidos", PAR: "Paraguay",
    QAT: "Catar", SUI: "Suiza", BRA: "Brasil", MAR: "Marruecos",
    HAI: "Haití", SCO: "Escocia", AUS: "Australia", TUR: "Turquía",
    GER: "Alemania", CUW: "Curazao", NED: "Países Bajos", JPN: "Japón",
    CIV: "Costa de Marfil", ECU: "Ecuador", SWE: "Suecia", TUN: "Túnez",
    ESP: "España", CPV: "Cabo Verde", BEL: "Bélgica", EGY: "Egipto",
    KSA: "Arabia Saudita", URU: "Uruguay", IRN: "Irán", NZL: "Nueva Zelanda",
    FRA: "Francia", SEN: "Senegal", IRQ: "Irak", NOR: "Noruega",
    ARG: "Argentina", ALG: "Argelia", AUT: "Austria", JOR: "Jordania",
    POR: "Portugal", COD: "R.D. Congo", ENG: "Inglaterra", CRO: "Croacia",
    GHA: "Ghana", PAN: "Panamá", COL: "Colombia", ROM: "Rumanía",
    NGR: "Nigeria", VEN: "Venezuela", CHL: "Chile", SRB: "Serbia",
    POL: "Polonia", CMR: "Camerún", DEN: "Dinamarca", SLV: "El Salvador",
    PER: "Perú", SVK: "Eslovaquia", MOR: "Marruecos", GRE: "Grecia",
    UKR: "Ucrania", HON: "Honduras", MLI: "Malí", BFA: "Burkina Faso",
    UGA: "Uganda", CRC: "Costa Rica", EQG: "Guinea Ec.", THA: "Tailandia",
};

// Todos los partidos con su kickoff ISO y los equipos
const MATCHES: { id: string; kickoff: string; home: string; away: string }[] = [
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
];

function teamName(code: string): string {
    return TEAM_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

export const notifyUpcomingMatches = onSchedule(
    { schedule: "every 1 minutes", timeZone: "America/Lima", region: "us-central1" },
    async () => {
        const now = Date.now();
        const windowStart = now + 14 * 60 * 1000; // 14 min desde ahora
        const windowEnd = now + 15 * 60 * 1000;   // 15 min desde ahora

        const upcoming = MATCHES.filter((m) => {
            const t = new Date(m.kickoff).getTime();
            return t >= windowStart && t < windowEnd;
        });

        if (upcoming.length === 0) return;

        // Obtener todos los tokens FCM de usuarios con partido activo
        const snapshot = await admin.firestore()
            .collection("users")
            .where("fcmToken", "!=", null)
            .get();

        const tokens = snapshot.docs
            .map((d) => d.get("fcmToken") as string)
            .filter(Boolean);

        if (tokens.length === 0) return;

        for (const match of upcoming) {
            const home = teamName(match.home);
            const away = teamName(match.away);

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
            console.log(
                `[${match.id}] Sent: ${response.successCount} ok, ${response.failureCount} fail`
            );
        }
    }
);
