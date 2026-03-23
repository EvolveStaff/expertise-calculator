import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import type { VisibleNode } from "../lib/types";
import { formatNodeName } from "../lib/formatNodeName";

type Props = {
  nodes: VisibleNode[];
  selectedRanks: Record<string, number>;
  onIncrease: (nodeId: string) => void;
  onDecrease: (nodeId: string) => void;
  onSelectNode: (node: VisibleNode) => void;
  canIncrease: (node: VisibleNode) => boolean;
  canDecrease: (node: VisibleNode) => boolean;
  getNodeDisabledReason: (node: VisibleNode) => string;
  formatStat?: (key: string) => string;
  formatCmd?: (key: string) => string;
  nodeIcons?: Record<string, string>;
};

interface Connection {
  fromId: string;
  toId: string;
  requiredRank: number;
}

interface ArrowLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  elbowX?: number; // if set: H elbowX then V y2 (90° corner into top of destination)
  fulfilled: boolean;
}

interface TooltipState {
  node: VisibleNode;
  x: number;
  y: number;
}

function parseSkillName(s: string, knownNodeIds?: Set<string>): { nodeId: string; rank: number } {
  // If the full string is itself a known nodeId (e.g. split-position nodes like
  // expertise_pistoleer_attack_3), treat it as rank 1 of that node rather than
  // stripping the suffix and creating a bogus connection to a different node.
  if (knownNodeIds?.has(s)) return { nodeId: s, rank: 1 };
  const m = s.match(/^(.+)_(\d+)$/);
  return m ? { nodeId: m[1], rank: parseInt(m[2], 10) } : { nodeId: s, rank: 1 };
}

function computeConnections(nodes: VisibleNode[]): Connection[] {
  const nodeIds = new Set(nodes.map((n) => n.nodeId));
  const seen = new Set<string>();
  const result: Connection[] = [];

  for (const node of nodes) {
    const allReqs = [
      ...(Array.isArray(node.skillsRequired) ? node.skillsRequired : []),
      ...node.ranks.flatMap((r) =>
        Array.isArray(r.skillsRequired) ? r.skillsRequired : []
      ),
    ].filter(Boolean);

    for (const req of allReqs) {
      const { nodeId: reqNodeId, rank: reqRank } = parseSkillName(req, nodeIds);
      if (reqNodeId === node.nodeId) continue;
      if (!nodeIds.has(reqNodeId)) continue;
      const key = `${reqNodeId}->${node.nodeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ fromId: reqNodeId, toId: node.nodeId, requiredRank: reqRank });
    }
  }

  return result;
}

// ── Rich Tooltip ──────────────────────────────────────────────────────────────

function NodeTooltip({
  tooltip,
  selectedRanks,
  disabledReason,
  formatStat,
  formatCmd,
}: {
  tooltip: TooltipState;
  selectedRanks: Record<string, number>;
  disabledReason: string;
  formatStat: (key: string) => string;
  formatCmd: (key: string) => string;
}) {
  const { node, x, y } = tooltip;
  const selected = selectedRanks[node.nodeId] ?? 0;
  const isMaxed = selected >= node.maxRank;

  // Decide left/right side based on cursor position
  const viewportWidth = window.innerWidth;
  const tipWidth = 260;
  const left = x + 18 + tipWidth > viewportWidth ? x - tipWidth - 10 : x + 18;
  const top = Math.max(8, Math.min(y - 10, window.innerHeight - 20));

  // Sort ranks ascending
  const sortedRanks = [...node.ranks].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: tipWidth,
        zIndex: 99999,
        pointerEvents: "none",
        background: "linear-gradient(160deg, #0c1828 0%, #0e1e30 100%)",
        border: `1px solid ${isMaxed && selected > 0 ? "#3a7aaa" : selected > 0 ? "#2a5535" : "#1a3050"}`,
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,80,160,0.15)",
        overflow: "hidden",
        fontSize: 12,
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "8px 10px 6px",
        background: "linear-gradient(135deg, #0d2040 0%, #102848 100%)",
        borderBottom: "1px solid #1a3050",
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 15,
          color: isMaxed && selected > 0 ? "#7ad4f8" : selected > 0 ? "#c8eaaa" : "#8aaac8",
          letterSpacing: "0.04em",
          lineHeight: 1.2,
          marginBottom: 3,
        }}>
          {formatNodeName(node.displayName)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#3a6080", fontSize: 11 }}>
            Tier {node.tier} · Grid {node.grid}
          </span>
          <span style={{
            color: isMaxed && selected > 0 ? "#4ab3e8" : selected > 0 ? "#88cc44" : "#3a6080",
            fontWeight: 700,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 11,
          }}>
            {selected}/{node.maxRank}
          </span>
        </div>
        {/* Mini pip bar */}
        <div style={{ display: "flex", gap: 2, marginTop: 5 }}>
          {Array.from({ length: node.maxRank }, (_, i) => (
            <div key={i} style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i < selected
                ? isMaxed ? "#4ab3e8" : "#66cc44"
                : "#1a2e40",
              transition: "background 0.2s",
            }} />
          ))}
        </div>
      </div>

      {/* Disabled reason */}
      {disabledReason && (
        <div style={{
          padding: "5px 10px",
          background: "rgba(80,20,20,0.5)",
          borderBottom: "1px solid #3a1a1a",
          color: "#ff9966",
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}>
          <span style={{ fontSize: 10 }}>⚠</span>
          {disabledReason}
        </div>
      )}

      {/* Rank details */}
      <div style={{ padding: "6px 0" }}>
        {sortedRanks.map((rankEntry) => {
          const rankNum = rankEntry.rank ?? 0;
          const isCurrent = rankNum === selected;
          const isInvested = rankNum <= selected;
          const isNext = rankNum === selected + 1;

          const mods = (rankEntry.skillMods ?? []).filter((m) => m.key && m.value !== 0);
          const abilities = [
            ...(Array.isArray(rankEntry.skillAbility) ? rankEntry.skillAbility : []),
            ...(Array.isArray(rankEntry.commands) ? rankEntry.commands : []),
          ].filter(Boolean);

          if (mods.length === 0 && abilities.length === 0) return null;

          return (
            <div
              key={rankNum}
              style={{
                padding: "4px 10px",
                borderLeft: isCurrent
                  ? `2px solid ${isMaxed ? "#4ab3e8" : "#66cc44"}`
                  : isNext
                  ? "2px solid #2a5070"
                  : "2px solid transparent",
                marginLeft: 2,
                opacity: isInvested ? 1 : isNext ? 0.75 : 0.4,
                background: isCurrent
                  ? "rgba(80,160,60,0.07)"
                  : isNext
                  ? "rgba(40,80,120,0.07)"
                  : "transparent",
              }}
            >
              {/* Rank label */}
              <div style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: isCurrent
                  ? isMaxed ? "#4ab3e8" : "#66cc44"
                  : isNext
                  ? "#4a7090"
                  : "#2a4a60",
                marginBottom: 2,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}>
                Rank {rankNum}
                {isCurrent && (
                  <span style={{
                    fontSize: 9,
                    background: isMaxed ? "rgba(74,179,232,0.2)" : "rgba(100,200,60,0.2)",
                    color: isMaxed ? "#4ab3e8" : "#66cc44",
                    borderRadius: 3,
                    padding: "1px 4px",
                    letterSpacing: "0.08em",
                  }}>
                    {isMaxed ? "MAXED" : "CURRENT"}
                  </span>
                )}
                {isNext && !isCurrent && (
                  <span style={{
                    fontSize: 9,
                    color: "#3a6888",
                    letterSpacing: "0.08em",
                  }}>
                    ← NEXT
                  </span>
                )}
              </div>

              {/* Stat mods */}
              {mods.map((mod) => (
                <div key={mod.key} style={{
                  color: mod.value > 0 ? "#88c878" : "#e08888",
                  fontSize: 12,
                  paddingLeft: 4,
                  lineHeight: 1.4,
                }}>
                  <span style={{ opacity: 0.6, marginRight: 3 }}>◆</span>
                  {mod.value > 0 ? "+" : ""}{mod.value} {formatStat(mod.key)}
                </div>
              ))}

              {/* Abilities / commands */}
              {abilities.map((cmd) => (
                <div key={cmd} style={{
                  color: "#6ac8f0",
                  fontSize: 12,
                  paddingLeft: 4,
                  lineHeight: 1.4,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <span style={{ color: "#2a6888", fontSize: 9 }}>▶</span>
                  {formatCmd(cmd)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Click hint */}
      <div style={{
        padding: "4px 10px 6px",
        borderTop: "1px solid #0f1e2c",
        color: "#1e3a50",
        fontSize: 10,
        letterSpacing: "0.08em",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>Left-click to invest</span>
        <span>Right-click to remove</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExpertiseTree({
  nodes,
  selectedRanks,
  onIncrease,
  onDecrease,
  onSelectNode,
  canIncrease,
  canDecrease: _canDecrease,
  getNodeDisabledReason,
  formatStat = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  formatCmd  = (k) => k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  nodeIcons,
}: Props) {
  const usedGrids = [...new Set(nodes.map((n) => n.grid ?? 0))].sort((a, b) => a - b);
  const usedTiers = [...new Set(nodes.map((n) => n.tier ?? 0))].sort((a, b) => a - b);

  const colIndex = (g: number) => usedGrids.indexOf(g) + 1;
  const rowIndex = (t: number) => usedTiers.indexOf(t) + 1;

  const connections = useMemo(() => computeConnections(nodes), [nodes]);

  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [arrows, setArrows] = useState<ArrowLine[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const recalcArrows = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    type NodeRect = { top: number; bottom: number; left: number; right: number; cx: number; cy: number };
    const rects: Record<string, NodeRect> = {};
    for (const [id, el] of Object.entries(nodeRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      rects[id] = {
        top:    r.top    - cRect.top,
        bottom: r.bottom - cRect.top,
        left:   r.left   - cRect.left,
        right:  r.right  - cRect.left,
        cx:     r.left   - cRect.left + r.width  / 2,
        cy:     r.top    - cRect.top  + r.height / 2,
      };
    }

    const lines: ArrowLine[] = [];
    for (const { fromId, toId, requiredRank } of connections) {
      const from = rects[fromId];
      const to   = rects[toId];
      if (!from || !to) continue;

      const fromRank = selectedRanks[fromId] ?? 0;
      const toRank   = selectedRanks[toId]   ?? 0;
      const fulfilled = fromRank >= requiredRank && toRank > 0;

      // Choose exit point based on horizontal offset between nodes.
      // Threshold: more than half a node width away → use the side, not the bottom.
      const dx        = to.cx - from.cx;
      const halfWidth = (from.right - from.left) * 0.55;

      const nodeHeight = from.bottom - from.top;
      const sameTier   = Math.abs(to.cy - from.cy) < nodeHeight * 0.6;

      if (sameTier) {
        // Same tier — pure horizontal side-to-side at mid-height
        if (dx > 0) lines.push({ x1: from.right, y1: from.cy, x2: to.left,  y2: to.cy, fulfilled });
        else        lines.push({ x1: from.left,  y1: from.cy, x2: to.right, y2: to.cy, fulfilled });
      } else if (dx < -halfWidth) {
        // Cross-tier, going left — 90° elbow: exit left side, horizontal to dest cx, drop to dest top
        lines.push({ x1: from.left, y1: from.cy, x2: to.cx, y2: to.top - 1, elbowX: to.cx, fulfilled });
      } else if (dx > halfWidth) {
        // Cross-tier, going right — 90° elbow: exit right side, horizontal to dest cx, drop to dest top
        lines.push({ x1: from.right, y1: from.cy, x2: to.cx, y2: to.top - 1, elbowX: to.cx, fulfilled });
      } else {
        // Same column, different tier — straight vertical: bottom-center → top-center
        lines.push({ x1: from.cx, y1: from.bottom + 2, x2: to.cx, y2: to.top - 1, fulfilled });
      }
    }
    setArrows(lines);
  }, [connections, selectedRanks]);

  useEffect(() => {
    recalcArrows();
    const ro = new ResizeObserver(recalcArrows);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recalcArrows]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* SVG arrow layer */}
      <svg
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          pointerEvents: "none", overflow: "visible", zIndex: 0,
        }}
      >
        <defs>
          {/* Arrowhead tip lands exactly at the line endpoint (refX = tip of triangle) */}
          <marker id="arr-on" viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#b8cc30" />
          </marker>
          <marker id="arr-off" viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#2e4422" />
          </marker>
          <filter id="linkGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {arrows.map((a, i) => {
          const markerPx = 5;
          let d: string;

          if (a.elbowX !== undefined) {
            // 90° elbow: horizontal to elbowX, then vertical down to dest top.
            // Shorten the final vertical segment so the arrowhead tip lands at y2.
            d = `M ${a.x1},${a.y1} H ${a.elbowX} V ${a.y2 - markerPx}`;
          } else {
            // Straight line — shorten by markerPx in the line direction.
            const ddx = a.x2 - a.x1;
            const ddy = a.y2 - a.y1;
            const len = Math.sqrt(ddx * ddx + ddy * ddy);
            const ex  = len > markerPx ? a.x2 - (ddx / len) * markerPx : a.x1;
            const ey  = len > markerPx ? a.y2 - (ddy / len) * markerPx : a.y1;
            d = `M ${a.x1},${a.y1} L ${ex},${ey}`;
          }

          return a.fulfilled ? (
            <path key={i} d={d} fill="none"
              stroke="#b8cc30" strokeWidth={1.5} opacity={0.85}
              markerEnd="url(#arr-on)" filter="url(#linkGlow)"
            />
          ) : (
            <path key={i} d={d} fill="none"
              stroke="#2e4422" strokeWidth={1} opacity={0.5}
              markerEnd="url(#arr-off)"
            />
          );
        })}
      </svg>

      {/* Node grid */}
      <div
        style={{
          position: "relative", zIndex: 1, display: "grid",
          gridTemplateColumns: `repeat(${usedGrids.length}, minmax(120px, 1fr))`,
          gridTemplateRows: `repeat(${usedTiers.length}, auto)`,
          gap: 8,
        }}
      >
        {nodes.map((node) => {
          const selected = selectedRanks[node.nodeId] ?? 0;
          const increaseAllowed = canIncrease(node);
          const tier = node.tier ?? 0;
          const grid = node.grid ?? 0;
          const isMaxed = selected >= node.maxRank;

          const borderColor = selected > 0
            ? isMaxed ? "#4ab3e8" : "#2a6030"
            : increaseAllowed ? "#1e3048" : "#161e28";
          const bgColor = selected > 0
            ? isMaxed
              ? "linear-gradient(135deg, #0d1e30 0%, #102540 100%)"
              : "linear-gradient(135deg, #0d1e14 0%, #102018 100%)"
            : "linear-gradient(135deg, #0d1117 0%, #101520 100%)";
          const glowStyle = isMaxed && selected > 0
            ? "0 0 10px rgba(74,179,232,0.35), inset 0 0 8px rgba(74,179,232,0.07)"
            : selected > 0 ? "0 0 6px rgba(100,200,80,0.2)" : "none";

          const pips = Array.from({ length: node.maxRank }, (_, i) => i < selected);

          return (
            <div
              key={node.nodeId}
              ref={(el) => { nodeRefs.current[node.nodeId] = el; }}
              onClick={() => { onIncrease(node.nodeId); onSelectNode(node); }}
              onContextMenu={(e) => { e.preventDefault(); onDecrease(node.nodeId); onSelectNode(node); }}
              onMouseEnter={(e) => setTooltip({ node, x: e.clientX, y: e.clientY })}
              onMouseMove={(e) => setTooltip((t) => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
              style={{
                gridColumn: colIndex(grid),
                gridRow: rowIndex(tier),
                minHeight: 90,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                padding: "7px 8px 6px",
                background: bgColor,
                boxShadow: glowStyle,
                opacity: selected > 0 || increaseAllowed ? 1 : 0.38,
                cursor: "pointer",
                userSelect: "none",
                transition: "border-color 0.2s, box-shadow 0.2s, opacity 0.2s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Top row: icon (or tier label) + rank fraction */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                {nodeIcons?.[node.nodeId] ? (
                  <img
                    src={nodeIcons[node.nodeId]}
                    alt=""
                    draggable={false}
                    style={{
                      width: 28, height: 28,
                      borderRadius: 4,
                      opacity: selected > 0 ? 1 : increaseAllowed ? 0.55 : 0.25,
                      filter: selected > 0
                        ? isMaxed ? "drop-shadow(0 0 3px rgba(74,179,232,0.7))" : "drop-shadow(0 0 2px rgba(80,200,80,0.5))"
                        : "none",
                      transition: "opacity 0.2s, filter 0.2s",
                      imageRendering: "pixelated",
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 10, color: "#2a5070", letterSpacing: "0.06em", fontFamily: "'Rajdhani', sans-serif" }}>
                    T{tier}
                  </div>
                )}
                <div style={{
                  fontSize: 11,
                  color: selected > 0 ? (isMaxed ? "#4ab3e8" : "#88cc55") : "#2a5070",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                }}>
                  {selected}/{node.maxRank}
                </div>
              </div>

              {/* Node name */}
              <div style={{
                fontWeight: 600,
                fontSize: 14,
                lineHeight: 1.25,
                color: selected > 0 ? "#d8eaf8" : increaseAllowed ? "#8aa8c0" : "#4a6070",
                margin: "4px 0",
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: "0.03em",
              }}>
                {formatNodeName(node.displayName)}
              </div>

              {/* Rank pip bar */}
              <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                {pips.map((filled, pi) => (
                  <div key={pi} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: filled ? (isMaxed ? "#4ab3e8" : "#66cc44") : "#1a2a35",
                    boxShadow: filled && isMaxed ? "0 0 4px rgba(74,179,232,0.6)" : "none",
                    transition: "background 0.2s",
                  }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rich tooltip — rendered into document.body via portal */}
      {tooltip && createPortal(
        <NodeTooltip
          tooltip={tooltip}
          selectedRanks={selectedRanks}
          disabledReason={getNodeDisabledReason(tooltip.node)}
          formatStat={formatStat}
          formatCmd={formatCmd}
        />,
        document.body
      )}
    </div>
  );
}
