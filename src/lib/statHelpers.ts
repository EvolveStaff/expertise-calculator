// ── Derived stat multiplier table (source: SWG_Evolve Stats.xlsx) ────────────
export type DerivedEntry = { label: string; mult: number; pct: boolean; decimals: number };

export const STAT_MULTIPLIERS: Record<string, DerivedEntry[]> = {
  agility_modified: [
    { label: "Dodge Chance",          mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Parry Chance",          mult: 0.005,   pct: true,  decimals: 2 },
    { label: "Evasion Chance",        mult: 0.01333, pct: true,  decimals: 2 },
    { label: "Evasion Value",         mult: 0.1,     pct: true,  decimals: 1 },
  ],
  constitution_modified: [
    { label: "Health",                mult: 8,       pct: false, decimals: 0 },
    { label: "Action",                mult: 2,       pct: false, decimals: 0 },
  ],
  luck_modified: [
    { label: "Guaranteed Hit",        mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Attack Freeshot",       mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Heal Freeshot",         mult: 0.02,    pct: true,  decimals: 2 },
    { label: "Instant Cooldown",      mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Lucky Dodge",           mult: 0.01,    pct: true,  decimals: 2 },
  ],
  precision_modified: [
    { label: "Parry Chance",          mult: 0.005,   pct: true,  decimals: 2 },
    { label: "Block Chance",          mult: 0.005,   pct: true,  decimals: 2 },
    { label: "Crit Chance",           mult: 0.015,   pct: true,  decimals: 2 },
    { label: "Hit Chance",            mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Dodge Reduction",       mult: 0.01,    pct: true,  decimals: 2 },
  ],
  stamina_modified: [
    { label: "Health",                mult: 2,       pct: false, decimals: 0 },
    { label: "Action",                mult: 8,       pct: false, decimals: 0 },
    { label: "Damage to Action",      mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Crit Hit Reduction",    mult: 0.005,   pct: true,  decimals: 2 },
    { label: "Action Cost Reduction", mult: 0.02,    pct: true,  decimals: 2 },
  ],
  strength_modified: [
    { label: "Block Chance",          mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Block Value",           mult: 0.25,    pct: false, decimals: 1 },
    { label: "Melee Damage Bonus",    mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Strikethrough Chance",  mult: 0.01,    pct: true,  decimals: 2 },
    { label: "Strikethrough Value",   mult: 0.1,     pct: true,  decimals: 1 },
    { label: "Parry Reduction",       mult: 0.01,    pct: true,  decimals: 2 },
  ],
};

export const CORE_STAT_LABELS: Record<string, string> = {
  agility_modified:      "Agility",
  constitution_modified: "Constitution",
  luck_modified:         "Luck",
  precision_modified:    "Precision",
  stamina_modified:      "Stamina",
  strength_modified:     "Strength",
};

export const CORE_STAT_COLORS: Record<string, string> = {
  agility_modified:      "#40b8c8",
  constitution_modified: "#c84040",
  luck_modified:         "#c8a040",
  precision_modified:    "#8040c8",
  stamina_modified:      "#40aa60",
  strength_modified:     "#c86030",
};

export function fmtDerived(val: number, e: DerivedEntry): string {
  return e.pct
    ? `${val.toFixed(e.decimals)}%`
    : e.decimals > 0 ? val.toFixed(e.decimals) : Math.round(val).toString();
}
