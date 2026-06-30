"use client";

import { forwardRef } from "react";

type PredictionRow = {
    userName: string;
    homeScore: number;
    awayScore: number;
    points: number;
    jokerActivated?: boolean;
    isCurrentUser?: boolean;
    qualifiedTeamName?: string;
    predictedMethod?: string;
    modifiedDuringWindow?: boolean;
};

type Props = {
    homeTeamName: string;
    awayTeamName: string;
    homeFlagDataUrl: string;
    awayFlagDataUrl: string;
    result: { homeScore: number; awayScore: number };
    predictions: PredictionRow[];
    knockoutResult?: { qualifiedTeamName: string; method: string };
};

const AVATAR_COLORS = [
    "#7c3aed", "#db2777", "#0891b2", "#059669",
    "#d97706", "#dc2626", "#0284c7", "#65a30d",
];

function getAvatarColor(name: string): string {
    const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
    return name.trim().charAt(0).toUpperCase();
}

function getFirstName(name: string): string {
    return name.trim().split(" ")[0];
}

const MEDALS = ["🥇", "🥈", "🥉"];

function getMedal(sorted: PredictionRow[], i: number): string {
    const pts = sorted[i].points;
    if (pts === 0) return "";
    if (sorted[i + 1]?.points === pts) return ""; // tied with next
    if (i > 0 && sorted[i - 1]?.points === pts) return ""; // tied with prev
    return MEDALS[i] ?? "";
}

export const PredictionGroupShareCard = forwardRef<HTMLDivElement, Props>(
    ({ homeTeamName, awayTeamName, homeFlagDataUrl, awayFlagDataUrl, result, predictions, knockoutResult }, ref) => {
        const sorted = [...predictions].sort((a, b) => b.points - a.points);

        return (
            <div
                ref={ref}
                style={{
                    width: 500,
                    background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
                    borderRadius: 24,
                    overflow: "hidden",
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                    color: "white",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "16px 24px 13px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}>
                    <span style={{ fontSize: 15 }}>⚽</span>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#94a3b8" }}>
                        POLLA MUNDIAL 2026
                    </span>
                </div>

                {/* Match + result — compact */}
                <div style={{ padding: "12px 20px 10px", textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
                        {homeFlagDataUrl && (
                            <img src={homeFlagDataUrl} alt={homeTeamName} style={{ width: 24, height: 16, borderRadius: 2, objectFit: "cover" }} />
                        )}
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", margin: 0 }}>
                            {homeTeamName} vs {awayTeamName}
                        </p>
                        {awayFlagDataUrl && (
                            <img src={awayFlagDataUrl} alt={awayTeamName} style={{ width: 24, height: 16, borderRadius: 2, objectFit: "cover" }} />
                        )}
                    </div>
                    <p style={{ fontSize: 36, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -1 }}>
                        {result.homeScore} — {result.awayScore}
                    </p>
                    <p style={{ fontSize: 8, fontWeight: 600, color: "#475569", letterSpacing: 1, margin: "4px 0 0" }}>
                        RESULTADO FINAL
                    </p>
                    {knockoutResult && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", margin: "4px 0 0" }}>
                            Clasificó: <span style={{ color: "#e2e8f0" }}>{knockoutResult.qualifiedTeamName}</span> · {knockoutResult.method}
                        </p>
                    )}
                </div>

                {/* Grid of avatars — 4 per row */}
                <div style={{
                    padding: "4px 12px 16px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    justifyContent: "center",
                }}>
                    {sorted.map((pred, i) => {
                        const color = getAvatarColor(pred.userName);
                        const medal = getMedal(sorted, i);
                        const label = pred.isCurrentUser ? "TÚ" : getFirstName(pred.userName);

                        return (
                            <div
                                key={pred.userName + i}
                                style={{
                                    width: 86,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 3,
                                    padding: "8px 4px",
                                    borderRadius: 12,
                                    background: pred.isCurrentUser
                                        ? "rgba(251,191,36,0.1)"
                                        : "rgba(255,255,255,0.04)",
                                    border: pred.isCurrentUser
                                        ? "1px solid rgba(251,191,36,0.3)"
                                        : "1px solid transparent",
                                }}
                            >
                                {/* Avatar */}
                                <div style={{ position: "relative" }}>
                                    <div style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: "50%",
                                        background: color,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 14,
                                        fontWeight: 900,
                                        color: "white",
                                        border: pred.isCurrentUser ? "2px solid #fbbf24" : "2px solid transparent",
                                    }}>
                                        {getInitial(pred.userName)}
                                    </div>
                                    {medal !== "" && (
                                        <span style={{ position: "absolute", top: -5, right: -5, fontSize: 11, lineHeight: 1 }}>
                                            {medal}
                                        </span>
                                    )}
                                </div>

                                {/* Name */}
                                <span style={{
                                    fontSize: 9,
                                    fontWeight: pred.isCurrentUser ? 800 : 600,
                                    color: pred.isCurrentUser ? "#fbbf24" : "#94a3b8",
                                    maxWidth: 80,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    textAlign: "center",
                                }}>
                                    {label}
                                </span>

                                {/* Score */}
                                <span style={{ fontSize: 12, fontWeight: 800, color: "white" }}>
                                    {pred.homeScore}-{pred.awayScore}
                                    {pred.jokerActivated && <span style={{ marginLeft: 2, fontSize: 10 }}>🃏</span>}
                                </span>

                                {/* Qualifier prediction */}
                                {pred.qualifiedTeamName && (
                                    <span style={{
                                        fontSize: 7.5,
                                        fontWeight: 700,
                                        color: pred.modifiedDuringWindow ? "#f59e0b" : "#64748b",
                                        textAlign: "center",
                                        lineHeight: 1.2,
                                        maxWidth: 80,
                                    }}>
                                        {pred.qualifiedTeamName}{pred.predictedMethod ? ` · ${pred.predictedMethod}` : ""}
                                        {pred.modifiedDuringWindow ? " ✏️" : ""}
                                    </span>
                                )}

                                {/* Points */}
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 900,
                                    color: pred.points > 0 ? "#4ade80" : "#f87171",
                                }}>
                                    +{pred.points}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    padding: "11px 24px",
                    display: "flex",
                    justifyContent: "flex-end",
                }}>
                    <p style={{ fontSize: 9, fontWeight: 600, color: "#475569", margin: 0, letterSpacing: 0.5 }}>
                        POLLA MUNDIAL 2026
                    </p>
                </div>
            </div>
        );
    }
);

PredictionGroupShareCard.displayName = "PredictionGroupShareCard";
