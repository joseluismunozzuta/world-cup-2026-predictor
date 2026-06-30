"use client";

import { forwardRef } from "react";

type Props = {
    homeTeamName: string;
    awayTeamName: string;
    homeFlagDataUrl: string;
    awayFlagDataUrl: string;
    prediction: { homeScore: number; awayScore: number; jokerActivated?: boolean };
    result: { homeScore: number; awayScore: number };
    points: number;
    userName: string;
    knockoutInfo?: {
        predictedQualifierName?: string;
        predictedMethod?: string;
        actualQualifierName?: string;
        actualMethod?: string;
        modifiedDuringWindow?: boolean;
        pointsBreakdown?: { base: number; qualifier: number; penalties: number; conviction: number };
    };
};

export const PredictionShareCard = forwardRef<HTMLDivElement, Props>(
    ({ homeTeamName, awayTeamName, homeFlagDataUrl, awayFlagDataUrl, prediction, result, points, userName, knockoutInfo }, ref) => {
        const isExact =
            prediction.homeScore === result.homeScore &&
            prediction.awayScore === result.awayScore;

        const getOutcome = (h: number, a: number) =>
            h > a ? "home" : h < a ? "away" : "draw";

        const isCorrect =
            getOutcome(prediction.homeScore, prediction.awayScore) ===
            getOutcome(result.homeScore, result.awayScore);

        const label = isExact
            ? "🎯 Resultado exacto"
            : isCorrect
            ? "✅ Resultado correcto"
            : knockoutInfo && points > 0
            ? "🏆 Puntos por clasificado/penales"
            : "❌ Fallaste esta";

        const accent = points > 0 ? "#4ade80" : "#f87171";
        const accentBg = points > 0 ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)";

        return (
            <div
                ref={ref}
                style={{
                    width: 360,
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
                    padding: "18px 24px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}>
                    <span style={{ fontSize: 16 }}>⚽</span>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: "#94a3b8" }}>
                        POLLA MUNDIAL 2026
                    </span>
                </div>

                {/* Match title with flags */}
                <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    {homeFlagDataUrl && (
                        <img src={homeFlagDataUrl} alt={homeTeamName} style={{ width: 32, height: 22, borderRadius: 3, objectFit: "cover" }} />
                    )}
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", margin: 0, letterSpacing: 0.5 }}>
                        {homeTeamName} vs {awayTeamName}
                    </p>
                    {awayFlagDataUrl && (
                        <img src={awayFlagDataUrl} alt={awayTeamName} style={{ width: 32, height: 22, borderRadius: 3, objectFit: "cover" }} />
                    )}
                </div>

                {/* Prediction score */}
                <div style={{ padding: "12px 24px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: 1.5, margin: "0 0 6px" }}>
                        MI PRONÓSTICO{prediction.jokerActivated ? "  🃏" : ""}
                    </p>
                    <p style={{ fontSize: 64, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -2 }}>
                        {prediction.homeScore} — {prediction.awayScore}
                    </p>
                    {knockoutInfo?.predictedQualifierName && (
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Clasifica:</span>
                            <span style={{
                                fontSize: 11, fontWeight: 800, color: knockoutInfo.modifiedDuringWindow ? "#f59e0b" : "#e2e8f0",
                                padding: "3px 10px", borderRadius: 999,
                                background: knockoutInfo.modifiedDuringWindow ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.08)",
                            }}>
                                {knockoutInfo.predictedQualifierName} · {knockoutInfo.predictedMethod}
                                {knockoutInfo.modifiedDuringWindow && " ✏️"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Knockout points breakdown */}
                {knockoutInfo?.pointsBreakdown && (
                    <div style={{
                        margin: "0 20px 12px",
                        background: "rgba(255,255,255,0.04)",
                        borderRadius: 12,
                        padding: "10px 16px",
                        display: "flex",
                        justifyContent: "space-around",
                        gap: 4,
                    }}>
                        {[
                            { label: "Marcador", val: knockoutInfo.pointsBreakdown.base },
                            { label: "Clasificado", val: knockoutInfo.pointsBreakdown.qualifier },
                            { label: "Penales", val: knockoutInfo.pointsBreakdown.penalties },
                            ...(knockoutInfo.pointsBreakdown.conviction > 0
                                ? [{ label: "🏆 Convicción", val: knockoutInfo.pointsBreakdown.conviction }]
                                : []),
                        ].map(({ label, val }) => (
                            <div key={label} style={{ textAlign: "center" }}>
                                <p style={{ fontSize: 14, fontWeight: 900, margin: 0, color: val > 0 ? "#4ade80" : "#475569" }}>
                                    +{val}
                                </p>
                                <p style={{ fontSize: 8, fontWeight: 600, color: "#475569", margin: "2px 0 0", letterSpacing: 0.5 }}>
                                    {label.toUpperCase()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Result row */}
                <div style={{
                    margin: "0 20px 16px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <div>
                        <p style={{ fontSize: 9, color: "#64748b", fontWeight: 700, margin: "0 0 4px", letterSpacing: 1 }}>
                            RESULTADO REAL
                        </p>
                        <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>
                            {result.homeScore} — {result.awayScore}
                        </p>
                        {knockoutInfo?.actualQualifierName && (
                            <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, margin: "3px 0 0" }}>
                                Clasificó: {knockoutInfo.actualQualifierName} · {knockoutInfo.actualMethod}
                            </p>
                        )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 9, color: "#64748b", fontWeight: 700, margin: "0 0 4px", letterSpacing: 1 }}>
                            PUNTOS
                        </p>
                        <p style={{ fontSize: 32, fontWeight: 900, color: accent, margin: 0 }}>
                            +{points}
                        </p>
                    </div>
                </div>

                {/* Label badge */}
                <div style={{ padding: "0 24px 20px", textAlign: "center" }}>
                    <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "7px 18px",
                        borderRadius: 999,
                        background: accentBg,
                        color: accent,
                        border: `1px solid ${accent}33`,
                    }}>
                        {label}
                    </span>
                </div>

                {/* Footer */}
                <div style={{
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    padding: "12px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#e2e8f0" }}>{userName}</p>
                    <p style={{ fontSize: 9, fontWeight: 600, color: "#475569", margin: 0, letterSpacing: 0.5 }}>
                        POLLA MUNDIAL 2026
                    </p>
                </div>
            </div>
        );
    }
);

PredictionShareCard.displayName = "PredictionShareCard";
