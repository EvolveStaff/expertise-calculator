import { useState, useMemo } from "react";
import { MODIFIERS, STANDARD_SEA_MODS, MAX_POWER_BIT, BAKE_IN_MAX } from "../lib/reModifiers";

// ── Types ─────────────────────────────────────────────────────────────────────

type SlotOption = { label: string; isArmor: boolean };

type SlotDef = {
  id: string;
  name: string;
  section: string;
  options: SlotOption[];  // length > 1 = armor/clothing toggle
  canBakeIn: boolean;
  seaCount: number;
  allowExotic: boolean;   // false = standard SEAs only
};

type SEAConfig = { type: "std" | "exotic"; mod: string; powerBit: number };

type SlotState = {
  enabled: boolean;
  optionIdx: number;
  bakeInMod: string;
  seas: SEAConfig[];
};

// ── Slot definitions ──────────────────────────────────────────────────────────

const SLOTS: SlotDef[] = [
  // Torso — shirt and chest are independent (both wearable simultaneously)
  { id: "chest",    name: "Chest Armor",  section: "Torso",       options: [{ label: "Chest Armor",  isArmor: true  }], canBakeIn: true,  seaCount: 3, allowExotic: true  },
  { id: "shirt",    name: "Shirt",        section: "Torso",       options: [{ label: "Shirt",        isArmor: false }], canBakeIn: false, seaCount: 3, allowExotic: true  },
  { id: "weapon",   name: "Weapon",       section: "Torso",       options: [{ label: "Weapon",       isArmor: false }], canBakeIn: true,  seaCount: 3, allowExotic: true  },
  // Head — armor OR clothing
  { id: "head",     name: "Head",         section: "Head",        options: [{ label: "Helmet", isArmor: true }, { label: "Hat", isArmor: false }], canBakeIn: false, seaCount: 3, allowExotic: false },
  // Arms — armor only
  { id: "bicep_r",  name: "Right Bicep",  section: "Arms",        options: [{ label: "Bicep Armor",  isArmor: true  }], canBakeIn: false, seaCount: 3, allowExotic: false },
  { id: "bicep_l",  name: "Left Bicep",   section: "Arms",        options: [{ label: "Bicep Armor",  isArmor: true  }], canBakeIn: false, seaCount: 3, allowExotic: false },
  { id: "bracer_r", name: "Right Bracer", section: "Arms",        options: [{ label: "Bracer Armor", isArmor: true  }], canBakeIn: false, seaCount: 3, allowExotic: false },
  { id: "bracer_l", name: "Left Bracer",  section: "Arms",        options: [{ label: "Bracer Armor", isArmor: true  }], canBakeIn: false, seaCount: 3, allowExotic: false },
  // Extremities — armor OR clothing
  { id: "hands",    name: "Hands",        section: "Extremities", options: [{ label: "Gloves", isArmor: true }, { label: "Gloves", isArmor: false }], canBakeIn: false, seaCount: 3, allowExotic: false },
  { id: "legs",     name: "Legs",         section: "Extremities", options: [{ label: "Pants",  isArmor: true }, { label: "Pants",  isArmor: false }], canBakeIn: false, seaCount: 3, allowExotic: false },
  { id: "feet",     name: "Feet",         section: "Extremities", options: [{ label: "Boots",  isArmor: true }, { label: "Boots",  isArmor: false }], canBakeIn: false, seaCount: 3, allowExotic: false },
  { id: "waist",    name: "Waist",        section: "Extremities", options: [{ label: "Bandolier", isArmor: false }], canBakeIn: false, seaCount: 3, allowExotic: false },
];

const SECTIONS = [...new Set(SLOTS.map(s => s.section))];

// ── Helpers ───────────────────────────────────────────────────────────────────

const mkSea = (): SEAConfig => ({ type: "exotic", mod: "", powerBit: MAX_POWER_BIT });

const mkDefault = (def: SlotDef): SlotState => ({
  enabled: false,
  optionIdx: 0,
  bakeInMod: "",
  seas: Array.from({ length: def.seaCount }, mkSea),
});

function bakeInResult(mod: string) {
  const m = MODIFIERS.find(x => x.name === mod);
  return m ? Math.floor(BAKE_IN_MAX / m.ratio) : 0;
}

function seaResult(sea: SEAConfig) {
  if (!sea.mod) return 0;
  if (sea.type === "std") return sea.powerBit;
  const m = MODIFIERS.find(x => x.name === sea.mod);
  return m ? Math.floor(sea.powerBit / m.ratio) : 0;
}

const ALL_MODS = [...MODIFIERS].sort((a, b) => a.name.localeCompare(b.name)).map(m => m.name);

// ── Shared styles ─────────────────────────────────────────────────────────────

const SEL: React.CSSProperties = {
  background: "#080f1a", border: "1px solid #1a3050", borderRadius: 4,
  color: "#9ab8d0", fontSize: 11, padding: "2px 5px", flex: 1, minWidth: 0,
};

const LABEL: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
  color: "#2a5070", fontFamily: "'Orbitron', sans-serif", flexShrink: 0,
  width: 42,
};

// ── SEA Row ───────────────────────────────────────────────────────────────────

function SeaRow({ sea, onChange, index, allowExotic }: {
  sea: SEAConfig;
  onChange: (patch: Partial<SEAConfig>) => void;
  index: number;
  allowExotic: boolean;
}) {
  // Force std when exotic not allowed
  const effectiveType = allowExotic ? sea.type : "std";
  const effectiveSea = { ...sea, type: effectiveType };
  const result = seaResult(effectiveSea);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
      <span style={{ ...LABEL, color: "#1e4060" }}>SEA {index + 1}</span>

      {/* Std / Exotic toggle — only shown when exotic is allowed */}
      {allowExotic ? (
        <div style={{ display: "flex", flexShrink: 0 }}>
          {(["std", "exotic"] as const).map(t => (
            <button key={t} onClick={() => {
              const mod = t === "std" && !STANDARD_SEA_MODS.includes(sea.mod) ? "" : sea.mod;
              onChange({ type: t, mod });
            }} style={{
              padding: "1px 5px", fontSize: 9, border: "none", cursor: "pointer",
              background: sea.type === t ? (t === "std" ? "#0e1e40" : "#1a0e3a") : "transparent",
              color: sea.type === t ? (t === "std" ? "#4a7ae8" : "#9060e0") : "#1e3a50",
              borderRadius: t === "std" ? "3px 0 0 3px" : "0 3px 3px 0",
              outline: sea.type === t ? `1px solid ${t === "std" ? "#2a4a80" : "#4a2a80"}` : "none",
            }}>
              {t === "std" ? "S" : "E"}
            </button>
          ))}
        </div>
      ) : (
        <span style={{
          fontSize: 8, padding: "1px 5px", borderRadius: 3,
          background: "#0e1e40", color: "#3a5a90",
          outline: "1px solid #1a3060", flexShrink: 0,
        }}>
          STD
        </span>
      )}

      {/* Modifier select */}
      <select
        value={sea.mod}
        onChange={e => onChange({ mod: e.target.value })}
        style={SEL}
      >
        <option value="">— none —</option>
        {(effectiveType === "std" ? STANDARD_SEA_MODS : ALL_MODS).map(n => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      {/* Power bit input */}
      {sea.mod && (
        <input
          type="number" min={1} max={MAX_POWER_BIT}
          value={sea.powerBit}
          onChange={e => onChange({ powerBit: Math.max(1, Math.min(MAX_POWER_BIT, Number(e.target.value) || 1)) })}
          style={{
            width: 32, padding: "2px 3px", textAlign: "center", fontSize: 10,
            background: "#080f1a", borderRadius: 4,
            border: `1px solid ${effectiveType === "std" ? "#1a3060" : "#2a1a5a"}`,
            color: effectiveType === "std" ? "#4a7ae8" : "#a060e0",
            flexShrink: 0,
          }}
        />
      )}

      <span style={{
        fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
        color: result > 0 ? "#66cc44" : "#1a3040",
        minWidth: 28, textAlign: "right", flexShrink: 0,
      }}>
        {result > 0 ? `+${result}` : "—"}
      </span>
    </div>
  );
}

// Standard-only slots that can be set uniformly
const UNIFORM_IDS = new Set(SLOTS.filter(s => !s.allowExotic).map(s => s.id));

// ── Main component ────────────────────────────────────────────────────────────

export default function SEABuilder() {
  const [slots, setSlots] = useState<Record<string, SlotState>>(
    () => Object.fromEntries(SLOTS.map(s => [s.id, mkDefault(s)]))
  );
  const [armorMode, setArmorMode] = useState<"uniform" | "individual">("individual");
  const [uniformSeas, setUniformSeas] = useState<SEAConfig[]>(Array.from({ length: 3 }, mkSea));

  const update = (id: string, patch: Partial<SlotState>) =>
    setSlots(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const updateSea = (id: string, i: number, patch: Partial<SEAConfig>) =>
    setSlots(prev => {
      const seas = [...prev[id].seas];
      seas[i] = { ...seas[i], ...patch };
      return { ...prev, [id]: { ...prev[id], seas } };
    });

  const updateUniformSea = (i: number, patch: Partial<SEAConfig>) =>
    setUniformSeas(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch }; return next; });

  // Switch to individual — copy uniform config into every standard slot
  const switchToIndividual = () => {
    setSlots(prev => {
      const next = { ...prev };
      for (const id of UNIFORM_IDS) {
        next[id] = { ...next[id], seas: uniformSeas.map(s => ({ ...s })) };
      }
      return next;
    });
    setArmorMode("individual");
  };

  // ── Compute totals ──
  const totals = useMemo(() => {
    const map: Record<string, { bakeIn: number; sea: number }> = {};
    const add = (name: string, key: "bakeIn" | "sea", val: number) => {
      if (!val || !name) return;
      if (!map[name]) map[name] = { bakeIn: 0, sea: 0 };
      map[name][key] += val;
    };
    for (const def of SLOTS) {
      const s = slots[def.id];
      if (!s.enabled) continue;
      if (def.canBakeIn && s.bakeInMod) add(s.bakeInMod, "bakeIn", bakeInResult(s.bakeInMod));
      // Use uniform config for standard slots when in uniform mode
      const seas = (armorMode === "uniform" && UNIFORM_IDS.has(def.id)) ? uniformSeas : s.seas;
      for (const sea of seas) {
        if (!sea.mod) continue;
        const effective = def.allowExotic ? sea : { ...sea, type: "std" as const };
        add(sea.mod, "sea", seaResult(effective));
      }
    }
    return map;
  }, [slots, armorMode, uniformSeas]);

  const totalEntries = useMemo(() =>
    Object.entries(totals)
      .map(([name, v]) => ({ name, bakeIn: v.bakeIn, sea: v.sea, total: v.bakeIn + v.sea }))
      .filter(e => e.total > 0)
      .sort((a, b) => b.total - a.total),
    [totals]
  );

  const enabledCount = SLOTS.filter(s => slots[s.id].enabled).length;

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: 14, padding: "8px 14px",
        background: "linear-gradient(160deg, #0c1520, #0d1825)",
        border: "1px solid #1a3050", borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: "#40c880", fontFamily: "'Orbitron', sans-serif", fontWeight: 600, marginBottom: 3 }}>
            Character SEA Builder
          </div>
          <div style={{ fontSize: 11, color: "#2a5060", lineHeight: 1.5 }}>
            Enable slots · configure bake-ins (chest &amp; weapon only) and up to 3 SEAs per piece.
            <span style={{ color: "#1a4050" }}> &nbsp;S = Standard (1:1 stat mods) &nbsp;E = Exotic</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Orbitron', sans-serif" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: enabledCount > 0 ? "#66cc44" : "#2a5070" }}>{enabledCount}</span>
          <span style={{ fontSize: 10, color: "#2a4060" }}> / {SLOTS.length} slots</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 14, alignItems: "start" }}>

        {/* ── Slot cards ── */}
        <div>

          {/* ── Armor mode toggle ── */}
          <div style={{
            marginBottom: 12, padding: "8px 12px",
            background: "#070d14", border: "1px solid #1a2a3a", borderRadius: 7,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2a5070", fontFamily: "'Orbitron', sans-serif" }}>
              Armor SEA Mode
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {([["uniform", "Same on All"], ["individual", "Individual"]] as const).map(([mode, label]) => (
                <button key={mode}
                  onClick={() => mode === "individual" ? switchToIndividual() : setArmorMode("uniform")}
                  style={{
                    padding: "4px 14px", fontSize: 11, border: "none", cursor: "pointer",
                    borderRadius: 5, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                    letterSpacing: "0.04em",
                    background: armorMode === mode ? "#1a3a50" : "transparent",
                    color: armorMode === mode ? "#4ab3e8" : "#2a4a60",
                    outline: armorMode === mode ? "1px solid #2a5070" : "1px solid #0f1e2a",
                  }}>
                  {label}
                </button>
              ))}
            </div>
            {armorMode === "uniform" && (
              <span style={{ fontSize: 10, color: "#1e4050", fontStyle: "italic" }}>
                Configuring one set of SEAs for all standard armor/clothing pieces · switch to Individual to edit separately
              </span>
            )}
          </div>

          {/* ── Uniform armor SEA panel ── */}
          {armorMode === "uniform" && (
            <div style={{ marginBottom: 14 }}>
              {/* Uniform SEA config */}
              <div style={{
                border: "1px solid #1a3a50", borderRadius: 7, overflow: "hidden",
                background: "#07101a", marginBottom: 10,
              }}>
                <div style={{
                  padding: "6px 10px", borderBottom: "1px solid #1a3050",
                  background: "rgba(30,80,120,0.12)", fontSize: 9, color: "#3a7090",
                  letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "'Orbitron', sans-serif",
                }}>
                  Shared SEA Config — All Standard Armor &amp; Clothing Pieces
                </div>
                <div style={{ padding: "8px 10px" }}>
                  {uniformSeas.map((sea, i) => (
                    <SeaRow key={i} sea={sea} index={i} allowExotic={false}
                      onChange={patch => updateUniformSea(i, patch)}
                    />
                  ))}
                </div>
              </div>

              {/* Per-slot enable toggles in uniform mode */}
              <div style={{
                border: "1px solid #111e2a", borderRadius: 7, overflow: "hidden",
                background: "#060c14",
              }}>
                <div style={{
                  padding: "5px 10px", borderBottom: "1px solid #0f1e2a",
                  fontSize: 9, color: "#2a4a60", letterSpacing: "0.18em",
                  textTransform: "uppercase", fontFamily: "'Orbitron', sans-serif",
                }}>
                  Slot Enable / Disable
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
                }}>
                  {SLOTS.filter(s => UNIFORM_IDS.has(s.id)).map(def => {
                    const s = slots[def.id];
                    return (
                      <div key={def.id}
                        onClick={() => update(def.id, { enabled: !s.enabled })}
                        style={{
                          display: "flex", alignItems: "center", gap: 7, padding: "6px 10px",
                          cursor: "pointer", borderBottom: "1px solid #0a1620",
                          background: s.enabled ? "rgba(32,140,80,0.07)" : "transparent",
                        }}
                      >
                        <div style={{
                          width: 20, height: 10, borderRadius: 5, flexShrink: 0,
                          background: s.enabled ? "#28a064" : "#0e2030",
                          border: `1px solid ${s.enabled ? "#40c880" : "#1a3040"}`,
                          position: "relative",
                        }}>
                          <div style={{
                            position: "absolute", top: 1, width: 6, height: 6, borderRadius: "50%",
                            left: s.enabled ? 12 : 2,
                            background: s.enabled ? "#a0ffc8" : "#2a4050",
                            transition: "left 0.1s",
                          }} />
                        </div>
                        <span style={{
                          fontSize: 11, color: s.enabled ? "#60e898" : "#2a4a60",
                          fontFamily: "'Rajdhani', sans-serif", fontWeight: 600,
                        }}>
                          {def.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {SECTIONS.map(section => {
            const sectionSlots = SLOTS.filter(s => s.section === section)
              .filter(s => armorMode === "individual" || !UNIFORM_IDS.has(s.id));
            if (sectionSlots.length === 0) return null;
            return (
              <div key={section} style={{ marginBottom: 14 }}>
                {/* Section label */}
                <div style={{
                  fontSize: 8, letterSpacing: "0.3em", textTransform: "uppercase",
                  color: "#2a4a60", fontFamily: "'Orbitron', sans-serif",
                  marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid #0f1e2a",
                }}>
                  {section}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {sectionSlots.map(def => {
                    const s = slots[def.id];
                    const opt = def.options[s.optionIdx];
                    const bakeVal = def.canBakeIn && s.bakeInMod ? bakeInResult(s.bakeInMod) : 0;
                    const seaTotal = s.seas.reduce((sum, sea) => sum + seaResult(sea), 0);
                    const slotTotal = bakeVal + seaTotal;

                    return (
                      <div key={def.id} style={{
                        border: `1px solid ${s.enabled ? "#1e4a32" : "#111e2a"}`,
                        borderRadius: 7, overflow: "hidden",
                        background: s.enabled ? "#07120e" : "#060c14",
                      }}>

                        {/* Header row */}
                        <div
                          onClick={() => update(def.id, { enabled: !s.enabled })}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "6px 9px", cursor: "pointer",
                            background: s.enabled ? "rgba(32,140,80,0.1)" : "rgba(0,0,0,0.2)",
                            borderBottom: s.enabled ? "1px solid #183828" : "1px solid #0a1820",
                          }}
                        >
                          {/* Toggle dot */}
                          <div style={{
                            width: 22, height: 12, borderRadius: 6, flexShrink: 0,
                            background: s.enabled ? "#28a064" : "#0e2030",
                            border: `1px solid ${s.enabled ? "#40c880" : "#1a3040"}`,
                            position: "relative", transition: "background 0.12s",
                          }}>
                            <div style={{
                              position: "absolute", top: 2, width: 6, height: 6, borderRadius: "50%",
                              left: s.enabled ? 12 : 2,
                              background: s.enabled ? "#a0ffc8" : "#2a4050",
                              transition: "left 0.12s",
                            }} />
                          </div>

                          <span style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                            color: s.enabled ? "#60e898" : "#2a4a60",
                            fontFamily: "'Rajdhani', sans-serif", textTransform: "uppercase", flex: 1,
                          }}>
                            {def.name}
                          </span>

                          {/* Armor/Clothing toggle — only if enabled and has both options */}
                          {s.enabled && def.options.length > 1 && (
                            <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                              {def.options.map((o, i) => (
                                <button key={i}
                                  onClick={() => update(def.id, { optionIdx: i, bakeInMod: "", seas: Array.from({ length: def.seaCount }, mkSea) })}
                                  style={{
                                    padding: "1px 5px", fontSize: 9, border: "none", cursor: "pointer",
                                    borderRadius: 3,
                                    background: s.optionIdx === i ? "#0e2a40" : "transparent",
                                    color: s.optionIdx === i ? "#4ab3e8" : "#1e3a50",
                                    outline: s.optionIdx === i ? "1px solid #1e4a70" : "none",
                                  }}>
                                  {o.isArmor ? "Armor" : "Cloth"}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Slot total badge */}
                          {s.enabled && slotTotal > 0 && (
                            <span style={{
                              fontSize: 10, fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
                              color: "#40c880", marginLeft: 2,
                            }}>
                              +{slotTotal}
                            </span>
                          )}

                          {/* Type label */}
                          {s.enabled && (
                            <span style={{
                              fontSize: 8, color: opt.isArmor ? "#3a6080" : "#5a3a80",
                              letterSpacing: "0.1em",
                            }}>
                              {opt.isArmor ? "ARM" : "CLO"}
                            </span>
                          )}
                        </div>

                        {/* Body */}
                        {s.enabled && (
                          <div style={{ padding: "7px 9px" }}>

                            {/* Bake-in row (only for applicable slots) */}
                            {def.canBakeIn && (
                              <div style={{
                                display: "flex", alignItems: "center", gap: 4,
                                marginBottom: def.seaCount > 0 ? 6 : 0,
                                paddingBottom: def.seaCount > 0 ? 6 : 0,
                                borderBottom: def.seaCount > 0 ? "1px solid #0a1e16" : "none",
                              }}>
                                <span style={{ ...LABEL, color: "#7a6020", width: 50 }}>Bake-in</span>
                                <select
                                  value={s.bakeInMod}
                                  onChange={e => update(def.id, { bakeInMod: e.target.value })}
                                  style={{ ...SEL, color: "#b89040" }}
                                >
                                  <option value="">— none —</option>
                                  {ALL_MODS.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <span style={{
                                  fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: 700,
                                  color: bakeVal > 0 ? "#c8a040" : "#2a2a20",
                                  minWidth: 28, textAlign: "right", flexShrink: 0,
                                }}>
                                  {bakeVal > 0 ? `+${bakeVal}` : "—"}
                                </span>
                              </div>
                            )}

                            {/* SEA rows */}
                            {s.seas.map((sea, i) => (
                              <SeaRow key={i} sea={sea} index={i}
                                allowExotic={def.allowExotic}
                                onChange={patch => updateSea(def.id, i, patch)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Totals panel ── */}
        <div style={{
          position: "sticky", top: 16,
          border: "1px solid #1a3050", borderRadius: 8, overflow: "hidden",
          background: "linear-gradient(160deg, #0c1520, #0d1825)",
        }}>
          <div style={{
            padding: "7px 12px", borderBottom: "1px solid #1a3050",
            background: "rgba(0,0,0,0.3)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{
              fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase",
              color: "#40c880", fontFamily: "'Orbitron', sans-serif", fontWeight: 600,
            }}>
              Total Bonuses
            </span>
            {totalEntries.length > 0 && (
              <div style={{ display: "flex", gap: 10, fontSize: 9 }}>
                <span style={{ color: "#7a6030" }}>Bake +{totalEntries.reduce((s, e) => s + e.bakeIn, 0)}</span>
                <span style={{ color: "#3a5a80" }}>SEA +{totalEntries.reduce((s, e) => s + e.sea, 0)}</span>
              </div>
            )}
          </div>

          {totalEntries.length === 0 ? (
            <div style={{ padding: "18px 12px", color: "#1e3a50", fontSize: 12, fontStyle: "italic" }}>
              Enable slots and add attachments to see totals.
            </div>
          ) : (
            <div>
              {totalEntries.map((e, i) => (
                <div key={e.name} style={{
                  padding: "5px 12px",
                  borderBottom: i < totalEntries.length - 1 ? "1px solid #0a1820" : "none",
                  background: i % 2 === 0 ? "#080f1a" : "#060c16",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, color: "#7a9ab8" }}>{e.name}</span>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 700, color: "#66cc44", marginLeft: 8 }}>
                      +{e.total}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, fontSize: 9, marginTop: 1 }}>
                    {e.bakeIn > 0 && <span style={{ color: "#7a6030" }}>Bake-in: +{e.bakeIn}</span>}
                    {e.sea > 0 && <span style={{ color: "#3a5a80" }}>SEA: +{e.sea}</span>}
                  </div>
                </div>
              ))}
              <div style={{
                padding: "6px 12px", borderTop: "1px solid #1a3050",
                background: "rgba(0,0,0,0.3)", fontSize: 9, color: "#2a4060",
              }}>
                {totalEntries.length} stat{totalEntries.length !== 1 ? "s" : ""} · {enabledCount} slot{enabledCount !== 1 ? "s" : ""} equipped
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
