import { useEffect, useMemo, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Effect = { param: string; value: number };
type PieceBonus = { count: number; effects: Effect[] };
type JewelrySet = { setType: string; setTypeLabel: string; requirement?: string; itemStats?: Effect[]; pieces: PieceBonus[] };
type ClassEntry = {
  classKey: string;
  className: string;
  requirement: string;
  charType: "normal" | "jedi" | "both";
  sets: JewelrySet[];
};

export type JewelryAbilityDesc = { name: string; description: string; grantedBy?: string };

interface Props {
  characterType: "normal" | "jedi";
  formatStat: (key: string) => string;
  abilityDescriptions: Record<string, JewelryAbilityDesc>;
  onAbilityClick?: (key: string) => void;
}

// ── Sidebar groups ────────────────────────────────────────────────────────────
type SidebarGroup = { label: string; keys: string[] };
const SIDEBAR_GROUPS: SidebarGroup[] = [
  { label: "Combat",     keys: ["bh","spy","medic","commando","smuggler","officer","pikeman","fencer","swordsman","tkm","pistoleer","rifleman","carbineer","grenadier","doctor"] },
  { label: "Jedi",       keys: ["jedi"] },
  { label: "Entertainer",keys: ["ent"] },
  { label: "Crafting",   keys: ["trader","reverse","chef","tailor","architect","armorsmith","weaponsmith","droid","cybernetic","shipwright","bio","miner"] },
  { label: "General",    keys: ["hero"] },
];

// ── Set type colors ───────────────────────────────────────────────────────────
const SET_COLORS: Record<string, string> = {
  dps:              "#c84040",
  utility_a:        "#4a88c8",
  utility_b:        "#8040c8",
  melee_utility_a:  "#c06030",
  heal:             "#40aa60",
  tank:             "#4ab3e8",
  shadow:           "#607080",
  general:          "#c8a040",
  aoe:              "#c87030",
  survey:           "#40a888",
};

const CLASS_ICONS: Record<string, string> = {
  bh:         "🎯",
  spy:        "🗡️",
  medic:      "💉",
  commando:   "💣",
  smuggler:   "🃏",
  officer:    "🎖️",
  pikeman:    "🗡️",
  fencer:     "⚔️",
  swordsman:  "🤺",
  tkm:        "👊",
  pistoleer:  "🔫",
  rifleman:   "🎯",
  carbineer:  "⚡",
  grenadier:  "💥",
  doctor:     "🩺",
  jedi:       "⚡",
  hero:       "🏆",
  trader:     "📦",
  ent:        "🎵",
  reverse:    "🔧",
  chef:       "🍳",
  tailor:     "🧵",
  architect:  "🏗️",
  armorsmith: "🛡️",
  weaponsmith:"⚒️",
  droid:      "🤖",
  cybernetic: "🦾",
  shipwright: "🚀",
  bio:        "🧬",
  miner:      "⛏️",
};

export default function HeroicJewelry({ characterType, formatStat, abilityDescriptions, onAbilityClick }: Props) {
  const [data, setData] = useState<ClassEntry[] | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [expandedSets, setExpandedSets] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/data/heroic_jewelry.json")
      .then((r) => r.json())
      .then((json: ClassEntry[]) => setData(json))
      .catch(() => {/* optional */});
  }, []);

  const visibleClasses = useMemo(() => {
    if (!data) return [];
    return data.filter(
      (c) => c.charType === "both" || c.charType === characterType
    );
  }, [data, characterType]);

  // Reset selection when character type changes
  useEffect(() => {
    setSelectedClass(null);
  }, [characterType]);

  const activeClass = useMemo(
    () => visibleClasses.find((c) => c.classKey === selectedClass) ?? null,
    [visibleClasses, selectedClass]
  );

  function toggleSet(setType: string) {
    setExpandedSets((prev) => {
      const next = new Set(prev);
      if (next.has(setType)) next.delete(setType);
      else next.add(setType);
      return next;
    });
  }

  if (!data) return null;

  return (
    <div
      style={{
        marginTop: 24,
        background: "linear-gradient(160deg, #060d16 0%, #080f1a 100%)",
        border: "1px solid #1a3050",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #1a3050",
          background: "rgba(8,18,32,0.95)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#4ab3e8",
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 600,
          }}
        >
          Heroic Jewelry Sets
        </div>
        <div style={{ fontSize: 11, color: "#2a5070" }}>
          — equip 1–3 matching pieces to unlock set bonuses
        </div>
      </div>

      <div style={{ display: "flex", minHeight: 200 }}>
        {/* Class sidebar */}
        <div
          style={{
            width: 170,
            borderRight: "1px solid #1a3050",
            padding: "8px 0",
            flexShrink: 0,
            overflowY: "auto",
            maxHeight: 520,
          }}
        >
          {SIDEBAR_GROUPS.map((group) => {
            const groupClasses = group.keys
              .map((k) => visibleClasses.find((c) => c.classKey === k))
              .filter((c): c is ClassEntry => !!c);
            if (groupClasses.length === 0) return null;
            return (
              <div key={group.label}>
                {/* Group header */}
                <div
                  style={{
                    padding: "5px 14px 3px",
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "#2a4a60",
                    fontFamily: "'Orbitron', sans-serif",
                    fontWeight: 600,
                    borderBottom: "1px solid #0d1f30",
                    marginBottom: 2,
                  }}
                >
                  {group.label}
                </div>
                {groupClasses.map((cls) => {
                  const isActive = cls.classKey === selectedClass;
                  return (
                    <button
                      key={cls.classKey}
                      onClick={() =>
                        setSelectedClass(isActive ? null : cls.classKey)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        width: "100%",
                        padding: "5px 14px",
                        background: isActive ? "rgba(74,179,232,0.1)" : "transparent",
                        border: "none",
                        borderLeft: isActive
                          ? "2px solid #4ab3e8"
                          : "2px solid transparent",
                        color: isActive ? "#c8dff0" : "#4a6a88",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 12,
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: isActive ? 700 : 400,
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1 }}>
                        {CLASS_ICONS[cls.classKey] ?? "◆"}
                      </span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {cls.className}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto", maxHeight: 520 }}>
          {!activeClass ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: 140,
                color: "#1a3a50",
                fontSize: 13,
                fontStyle: "italic",
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              Select a profession to view jewelry sets
            </div>
          ) : (
            <div>
              {/* Class header */}
              <div
                style={{
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      color: "#c8dff0",
                    }}
                  >
                    {CLASS_ICONS[activeClass.classKey] ?? "◆"}{" "}
                    {activeClass.className}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#2a6080",
                      marginTop: 2,
                      fontFamily: "'Orbitron', sans-serif",
                    }}
                  >
                    Requires:{" "}
                    <span style={{ color: "#4a88c8" }}>
                      {activeClass.requirement}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#1a3050",
                    textAlign: "right",
                    letterSpacing: "0.1em",
                  }}
                >
                  {activeClass.sets.length} set
                  {activeClass.sets.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Sets */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 10,
                }}
              >
                {activeClass.sets.map((set) => {
                  const color = SET_COLORS[set.setType] ?? "#4ab3e8";
                  const isOpen =
                    expandedSets.has(`${activeClass.classKey}:${set.setType}`);
                  const key = `${activeClass.classKey}:${set.setType}`;
                  return (
                    <div
                      key={set.setType}
                      style={{
                        border: `1px solid ${isOpen ? color + "55" : "#1a3050"}`,
                        borderRadius: 8,
                        overflow: "hidden",
                        transition: "border-color 0.2s",
                      }}
                    >
                      {/* Set header */}
                      <button
                        onClick={() => toggleSet(key)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          background: isOpen
                            ? `linear-gradient(135deg, ${color}18, ${color}08)`
                            : "rgba(6,14,24,0.8)",
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.2s",
                        }}
                      >
                        <div
                          style={{
                            width: 3,
                            height: 12,
                            borderRadius: 2,
                            background: color,
                            flexShrink: 0,
                            boxShadow: `0 0 6px ${color}88`,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            textAlign: "left",
                            fontSize: 12,
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            color: isOpen ? color : "#5a8aaa",
                            letterSpacing: "0.04em",
                            textTransform: "none",
                          }}
                        >
                          {set.setTypeLabel}
                        </span>
                        {set.pieces.length > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#1a3050",
                              fontFamily: "'Orbitron', sans-serif",
                            }}
                          >
                            {set.pieces.length}pc
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: 10,
                            color: isOpen ? color : "#2a4a60",
                            transition: "transform 0.2s",
                            display: "inline-block",
                            transform: isOpen ? "rotate(90deg)" : "none",
                          }}
                        >
                          ▶
                        </span>
                      </button>

                      {/* Piece cards */}
                      {isOpen && (
                        <div
                          style={{
                            padding: "8px 10px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            background: "rgba(4,10,18,0.6)",
                          }}
                        >
                          {/* Per-set requirement (e.g. Jedi sub-specs) */}
                          {set.requirement && (
                            <div style={{ fontSize: 10, color: "#4a88c8", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, marginBottom: 4 }}>
                              Requires: {set.requirement}
                            </div>
                          )}

                          {/* Per-piece skill mods */}
                          {set.itemStats && set.itemStats.length > 0 && (
                            <div style={{ marginBottom: 4 }}>
                              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#2a5060", fontFamily: "'Orbitron', sans-serif", marginBottom: 4 }}>
                                SKILL MODS (PER PIECE · ×5 TOTAL)
                              </div>
                              {set.itemStats.map((eff) => (
                                <div
                                  key={eff.param}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "baseline",
                                    borderBottom: "1px solid #0a1820",
                                    padding: "2px 0",
                                    fontSize: 13,
                                  }}
                                >
                                  <span style={{ color: "#4a7a8a", lineHeight: 1.5 }}>{formatStat(eff.param)}</span>
                                  <span style={{ color: "#3a8a60", fontFamily: "'Orbitron', sans-serif", fontSize: 12, marginLeft: 8 }}>
                                    +{eff.value}
                                    <span style={{ color: "#2a6a48", marginLeft: 5, fontSize: 11 }}>
                                      (={eff.value * 5})
                                    </span>
                                  </span>
                                </div>
                              ))}
                              <div style={{ borderBottom: "1px solid #1a3050", marginTop: 6, marginBottom: 2 }} />
                            </div>
                          )}
                          {set.pieces.length === 0 && (
                            <div style={{ fontSize: 11, color: "#1a3a50", fontStyle: "italic", padding: "4px 0" }}>
                              Bonus data not yet available
                            </div>
                          )}
                          {set.pieces.map((piece) => (
                            <div
                              key={piece.count}
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                              }}
                            >
                              {/* Piece count badge */}
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 6,
                                  border: `1px solid ${color}55`,
                                  background: `${color}18`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                  fontFamily: "'Orbitron', sans-serif",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: color,
                                }}
                              >
                                {piece.count}
                              </div>
                              {/* Effects */}
                              <div style={{ flex: 1, paddingTop: 2 }}>
                                {piece.effects.map((eff) => {
                                  if (eff.value === 0) {
                                    const aDesc = abilityDescriptions[eff.param];
                                    const abilityName = aDesc?.name ?? eff.param.replace(/_ability$/, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                                    return (
                                      <div key={eff.param} style={{ borderBottom: "1px solid #0a1820", padding: "4px 0" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <span style={{ color: "#5ab0d4", fontSize: 13, lineHeight: 1.4 }}>
                                            {abilityName}
                                          </span>
                                          <button
                                            onClick={() => onAbilityClick?.(eff.param)}
                                            style={{
                                              background: "none",
                                              border: "1px solid #1a4060",
                                              borderRadius: 3,
                                              cursor: onAbilityClick ? "pointer" : "default",
                                              color: "#4ab3e8",
                                              fontSize: 10,
                                              fontFamily: "'Orbitron', sans-serif",
                                              padding: "1px 6px",
                                              flexShrink: 0,
                                              marginLeft: 8,
                                              letterSpacing: "0.05em",
                                            }}
                                          >
                                            Unlocks {onAbilityClick ? "↗" : ""}
                                          </button>
                                        </div>
                                        {aDesc?.description && (
                                          <div style={{ fontSize: 11, color: "#4a7090", lineHeight: 1.4, marginTop: 3, paddingLeft: 6, borderLeft: "2px solid #1a4060" }}>
                                            {aDesc.description}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      key={eff.param}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "baseline",
                                        borderBottom: "1px solid #0a1820",
                                        padding: "2px 0",
                                        fontSize: 13,
                                      }}
                                    >
                                      <span style={{ color: "#6a9ab0", lineHeight: 1.5 }}>
                                        {formatStat(eff.param)}
                                      </span>
                                      <span
                                        style={{
                                          color: eff.value > 0 ? "#55bb33" : "#cc4444",
                                          fontFamily: "'Orbitron', sans-serif",
                                          fontSize: 12,
                                          flexShrink: 0,
                                          marginLeft: 8,
                                        }}
                                      >
                                        {eff.value > 0
                                          ? `+${eff.value % 1 === 0 ? eff.value : eff.value.toFixed(1)}`
                                          : `${eff.value}`}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
