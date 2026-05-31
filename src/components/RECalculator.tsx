import { useState, useMemo } from "react";
import { MODIFIERS, CATEGORY_COLORS, MAX_POWER_BIT, BAKE_IN_MAX, type Modifier } from "../lib/reModifiers";

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "#607080";
}

export default function RECalculator() {
  const [powerBit, setPowerBit] = useState(35);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(MODIFIERS.map(m => m.category))].sort(),
    []
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MODIFIERS.filter(m => {
      if (activeCategory && m.category !== activeCategory) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [search, activeCategory]);

  // Group filtered results by category for display
  const grouped = useMemo(() => {
    const map: Record<string, Modifier[]> = {};
    for (const m of filtered) {
      if (!map[m.category]) map[m.category] = [];
      map[m.category].push(m);
    }
    return map;
  }, [filtered]);

  const calc = (ratio: number) => Math.floor(powerBit / ratio);
  const maxCalc = (ratio: number) => Math.floor(MAX_POWER_BIT / ratio);
  const bakeInCalc = (ratio: number) => Math.floor(BAKE_IN_MAX / ratio);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 40px" }}>

      {/* ── Header ── */}
      <div style={{
        marginBottom: 20,
        padding: "14px 18px",
        background: "linear-gradient(160deg, #0c1520, #0d1825)",
        border: "1px solid #1a3050",
        borderRadius: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase",
            color: "#c8a040", fontFamily: "'Orbitron', sans-serif", fontWeight: 600,
          }}>
            Exotic Attachment Calculator
          </div>
          <div style={{
            fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
            color: "#7a5010", fontFamily: "'Orbitron', sans-serif",
            background: "#1a1000", border: "1px solid #3a2800",
            borderRadius: 4, padding: "2px 7px",
          }}>
            Exotic Attachments Only
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#4a7090", lineHeight: 1.6 }}>
          Calculates stat results for <span style={{ color: "#c8a040" }}>exotic power bits</span> applied to attachments.
          Exotic bits cap at <span style={{ color: "#66cc44", fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>+{MAX_POWER_BIT}</span>.
          Bake-in column shows the result when embedding directly into armor or weapons (capped at <span style={{ color: "#7a6030", fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>+{BAKE_IN_MAX}</span>).
          Formula: <span style={{ color: "#66cc44", fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>
            floor(power bit ÷ ratio)
          </span>
        </div>
      </div>

      {/* ── Power Bit Input ── */}
      <div style={{
        marginBottom: 16,
        padding: "14px 18px",
        background: "linear-gradient(160deg, #0c1520, #0d1825)",
        border: "1px solid #1a3050",
        borderRadius: 10,
        display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "#4a7090", fontFamily: "'Orbitron', sans-serif",
          }}>
            Power Bit
          </span>
          <input
            type="number"
            min={1}
            max={MAX_POWER_BIT}
            value={powerBit}
            onChange={e => setPowerBit(Math.max(1, Math.min(MAX_POWER_BIT, Number(e.target.value) || 1)))}
            style={{
              width: 64, padding: "5px 8px",
              background: "#0a1420", border: "1px solid #2a5070",
              borderRadius: 6, color: "#66cc44",
              fontFamily: "'Orbitron', sans-serif", fontSize: 16, fontWeight: 700,
              textAlign: "center",
            }}
          />
          <span style={{ fontSize: 11, color: "#3a6080" }}>/ {MAX_POWER_BIT} max (exotic)</span>
        </div>

        {/* Slider */}
        <div style={{ flex: 1, minWidth: 160, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#2a5070" }}>1</span>
          <input
            type="range"
            min={1}
            max={MAX_POWER_BIT}
            value={powerBit}
            onChange={e => setPowerBit(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#c8a040" }}
          />
          <span style={{ fontSize: 10, color: "#2a5070" }}>{MAX_POWER_BIT}</span>
        </div>

        {/* Power bar visual */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 100, height: 4, borderRadius: 2, background: "#0d1820", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(powerBit / MAX_POWER_BIT) * 100}%`,
              background: "linear-gradient(90deg, #8a6010, #c8a040)",
              borderRadius: 2, transition: "width 0.1s",
            }} />
          </div>
          <span style={{
            fontSize: 10, color: "#8a6010", letterSpacing: "0.1em",
            fontFamily: "'Orbitron', sans-serif",
          }}>
            {Math.round((powerBit / MAX_POWER_BIT) * 100)}%
          </span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Filter modifiers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: "1 1 200px", padding: "7px 12px",
            background: "#0a1420", border: "1px solid #1a3050",
            borderRadius: 6, color: "#c8dff0", fontSize: 13,
          }}
        />
        {/* Category chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={{
              padding: "4px 12px", borderRadius: 12, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
              background: activeCategory === null ? "#1a3050" : "transparent",
              color: activeCategory === null ? "#4ab3e8" : "#3a5a78",
              outline: activeCategory === null ? "1px solid #2a4060" : "1px solid #1a2a40",
            }}
          >
            All
          </button>
          {categories.map(cat => {
            const color = categoryColor(cat);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(isActive ? null : cat)}
                style={{
                  padding: "4px 12px", borderRadius: 12, border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
                  background: isActive ? `${color}22` : "transparent",
                  color: isActive ? color : "#3a5a78",
                  outline: isActive ? `1px solid ${color}66` : "1px solid #1a2a40",
                  transition: "all 0.1s",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Results table ── */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ color: "#2a5070", fontSize: 13, fontStyle: "italic", padding: "20px 0" }}>
          No modifiers match your filter.
        </div>
      ) : (
        Object.entries(grouped).sort().map(([cat, mods]) => {
          const color = categoryColor(cat);
          return (
            <div key={cat} style={{ marginBottom: 16 }}>
              {/* Category header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px",
                background: `${color}12`,
                border: `1px solid ${color}33`,
                borderRadius: "6px 6px 0 0",
                borderBottom: "none",
              }}>
                <div style={{ width: 4, height: 12, borderRadius: 2, background: color }} />
                <span style={{
                  fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase",
                  color, fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
                }}>
                  {cat}
                </span>
                <span style={{ fontSize: 10, color: `${color}88`, marginLeft: "auto" }}>
                  {mods.length} modifier{mods.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 60px 80px 80px 90px",
                padding: "4px 12px",
                background: "#060d16",
                border: `1px solid ${color}22`,
                borderBottom: "none",
              }}>
                {["Modifier", "Ratio", "Result", "Max (+40)", "Bake In (+16)"].map((h, i) => (
                  <span key={h} style={{
                    fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                    color: i === 4 ? "#5a4a20" : "#2a5070",
                    fontFamily: "'Orbitron', sans-serif",
                    textAlign: i > 0 ? "center" : "left",
                  }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div style={{
                border: `1px solid ${color}22`,
                borderRadius: "0 0 6px 6px",
                overflow: "hidden",
              }}>
                {mods.map((mod, i) => {
                  const result = calc(mod.ratio);
                  const max = maxCalc(mod.ratio);
                  const bakeIn = bakeInCalc(mod.ratio);
                  const isMax = result === max;
                  return (
                    <div
                      key={mod.name}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 60px 80px 80px 90px",
                        padding: "6px 12px",
                        borderBottom: i < mods.length - 1 ? "1px solid #0a1820" : "none",
                        background: i % 2 === 0 ? "#080f1a" : "#060c16",
                        alignItems: "center",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#0e1e30")}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? "#080f1a" : "#060c16")}
                    >
                      <span style={{ fontSize: 13, color: "#9ab8d0" }}>{mod.name}</span>
                      <span style={{
                        fontSize: 11, color: "#3a6080", textAlign: "center",
                        fontFamily: "'Orbitron', sans-serif",
                      }}>
                        {mod.ratio}:1
                      </span>
                      <span style={{
                        fontSize: 14, fontWeight: 700,
                        color: isMax ? "#66cc44" : "#c8a040",
                        fontFamily: "'Orbitron', sans-serif",
                        textAlign: "center",
                      }}>
                        {result > 0 ? `+${result}` : "0"}
                      </span>
                      <span style={{
                        fontSize: 11, color: "#3a6a44", textAlign: "center",
                        fontFamily: "'Orbitron', sans-serif",
                      }}>
                        +{max}
                      </span>
                      <span style={{
                        fontSize: 11, color: bakeIn > 0 ? "#7a6030" : "#2a2a2a", textAlign: "center",
                        fontFamily: "'Orbitron', sans-serif",
                      }}>
                        {bakeIn > 0 ? `+${bakeIn}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

    </div>
  );
}
