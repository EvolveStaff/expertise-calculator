import { createPortal } from "react-dom";
import type { AutoFillAddition, AutoFillResult } from "../lib/autoFill";
import { formatNodeName } from "../lib/formatNodeName";
import { MAX_EXPERTISE_POINTS } from "../lib/rules";

interface Props {
  targetName: string;
  result: AutoFillResult;
  currentTotal: number;
  onApply: () => void;
  onCancel: () => void;
}

export default function AutoFillModal({ targetName, result, currentTotal, onApply, onCancel }: Props) {
  const newTotal = result.ok ? currentTotal + result.totalNewPoints : currentTotal;

  // Group additions by tier
  const byTier = result.ok
    ? result.additions.reduce<Record<number, AutoFillAddition[]>>((acc, a) => {
        (acc[a.tier] ??= []).push(a);
        return acc;
      }, {})
    : {};

  return createPortal(
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        background: "rgba(0,0,0,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "linear-gradient(160deg, #080f1a 0%, #0a1220 100%)",
          border: "1px solid #1e3a5a",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(74,179,232,0.1)",
          fontFamily: "'Rajdhani', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg, #0d1e30 0%, #102840 100%)",
          borderBottom: "1px solid #1a3050",
        }}>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", color: "#4ab3e8", fontFamily: "'Orbitron', sans-serif", marginBottom: 5 }}>
            AUTO-FILL PREVIEW
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#c8dff0", letterSpacing: "0.04em" }}>
            {formatNodeName(targetName)}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 18px", maxHeight: 420, overflowY: "auto" }}>
          {!result.ok ? (
            <div style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              background: "rgba(180,40,40,0.12)", border: "1px solid #5a2020",
              borderRadius: 8, padding: "12px 14px",
            }}>
              <span style={{ color: "#ff7777", fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠</span>
              <div>
                <div style={{ color: "#ff8888", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>
                  Cannot auto-fill
                </div>
                <div style={{ color: "#cc6666", fontSize: 13, lineHeight: 1.5 }}>
                  {result.reason}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "#4a7090", marginBottom: 12 }}>
                The following points will be invested to unlock this node:
              </div>

              {/* Tier groups */}
              {Object.entries(byTier)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([tier, additions]) => (
                  <div key={tier} style={{ marginBottom: 10 }}>
                    <div style={{
                      fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase",
                      color: "#2a5070", fontFamily: "'Orbitron', sans-serif",
                      borderBottom: "1px solid #0f2030", paddingBottom: 4, marginBottom: 6,
                    }}>
                      Tier {tier}
                    </div>
                    {additions.map((a) => (
                      <div key={a.nodeId} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "3px 0", borderBottom: "1px solid #0a1a28",
                      }}>
                        <span style={{ fontSize: 13, color: "#8ab8d4" }}>
                          {formatNodeName(a.displayName)}
                        </span>
                        <span style={{ fontSize: 12, fontFamily: "'Orbitron', sans-serif", color: "#55bb33", flexShrink: 0, marginLeft: 8 }}>
                          {a.fromRank > 0 ? `${a.fromRank}→${a.toRank}` : `+${a.toRank}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}

              {/* Point summary */}
              <div style={{
                marginTop: 14, padding: "10px 12px",
                background: "rgba(10,20,35,0.8)", borderRadius: 6,
                border: "1px solid #1a3050",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#4a7090" }}>Points invested</span>
                  <span style={{ fontSize: 13, color: "#55bb33", fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>
                    +{result.totalNewPoints}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#4a7090" }}>Global pool</span>
                  <span style={{ fontSize: 13, fontFamily: "'Orbitron', sans-serif", color: newTotal > MAX_EXPERTISE_POINTS * 0.9 ? "#e8b040" : "#4ab3e8" }}>
                    {currentTotal} → {newTotal}
                    <span style={{ color: "#2a5070", marginLeft: 3 }}>/ {MAX_EXPERTISE_POINTS}</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid #1a3050",
          display: "flex", justifyContent: "flex-end", gap: 10,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "7px 20px", borderRadius: 6, cursor: "pointer",
              background: "transparent", border: "1px solid #2a4a60",
              color: "#5a8aaa", fontSize: 13, fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600, letterSpacing: "0.05em",
            }}
          >
            Cancel
          </button>
          {result.ok && (
            <button
              onClick={onApply}
              style={{
                padding: "7px 24px", borderRadius: 6, cursor: "pointer",
                background: "linear-gradient(135deg, #1a4a28 0%, #1e5830 100%)",
                border: "1px solid #3a8a50",
                color: "#66cc88", fontSize: 13, fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700, letterSpacing: "0.08em",
                boxShadow: "0 0 10px rgba(60,160,80,0.2)",
              }}
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
