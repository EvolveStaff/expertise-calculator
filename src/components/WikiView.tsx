import { useState, useMemo } from "react";
import type { ExpertisePayload, StringTables, TreeData, VisibleNode } from "../lib/types";
import { formatNodeName } from "../lib/formatNodeName";
import { STAT_MULTIPLIERS, CORE_STAT_COLORS, fmtDerived } from "../lib/statHelpers";

type TreeGroup = { label: string; keys: string[] };

type Props = {
  data: ExpertisePayload;
  stringTables: StringTables | null;
  nodeIcons: Record<string, string> | null;
  treeGroups: TreeGroup[];
  treeNames: Record<string, string>;
  cmdDescriptions: Record<string, string>;
};

function formatStatKey(key: string, tables: StringTables | null): string {
  if (tables?.statNames[key]) return tables.statNames[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCmdKey(key: string, tables: StringTables | null): string {
  if (tables?.cmdNames[key]) return tables.cmdNames[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Node detail panel (shared between wiki and calculator) ───────────────────

function NodeDetail({
  node,
  stringTables,
  cmdDescriptions,
}: {
  node: VisibleNode;
  stringTables: StringTables | null;
  cmdDescriptions: Record<string, string>;
}) {
  const sortedRanks = [...node.ranks].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const isSingle = node.maxRank === 1;
  const maxMods: Record<string, number> = {};
  for (const r of sortedRanks) {
    for (const mod of r.skillMods ?? []) {
      if (mod.key) maxMods[mod.key] = (maxMods[mod.key] ?? 0) + mod.value;
    }
  }
  const allCmds = [...new Set(sortedRanks.flatMap(r => [...r.commands, ...r.skillAbility]).filter(Boolean))];
  const rank1Mods = (sortedRanks[0]?.skillMods ?? []).filter(m => m.key);

  const modRow = (key: string, val: number, accent = false) => {
    const derived = STAT_MULTIPLIERS[key];
    const color = CORE_STAT_COLORS[key] ?? "#6a9ab0";
    return (
      <div key={key} style={{ marginBottom: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4, fontSize: 11 }}>
          <span style={{ color, lineHeight: 1.3, fontWeight: derived ? 600 : 400 }}>
            {formatStatKey(key, stringTables)}
          </span>
          <span style={{
            color: val > 0 ? (accent ? "#44cc77" : "#55bb33") : "#cc4444",
            fontFamily: "'Orbitron', sans-serif", fontSize: 10, flexShrink: 0,
            fontWeight: accent ? 700 : 400,
          }}>
            {val > 0 ? "+" : ""}{val}
          </span>
        </div>
        {derived && (
          <div style={{ paddingLeft: 8, borderLeft: `2px solid ${color}44`, marginLeft: 2 }}>
            {derived.map(e => (
              <div key={e.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a7090", lineHeight: 1.4 }}>
                <span>{e.label}</span>
                <span style={{ flexShrink: 0, marginLeft: 4, color: accent ? "#44aa66" : "#3a8a55" }}>{fmtDerived(val * e.mult, e)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const cmdRow = (cmd: string) => {
    const displayName = formatCmdKey(cmd, stringTables);
    const rawDesc = cmdDescriptions[cmd] ?? "";
    // Strip leading "AbilityName: " or "AbilityName\n" prefix
    let stripped = rawDesc.trim();
    const colonPrefix = displayName + ": ";
    if (stripped.toLowerCase().startsWith(colonPrefix.toLowerCase())) {
      stripped = stripped.slice(colonPrefix.length).trim();
    } else {
      const lines = stripped.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && lines[0].toLowerCase() === displayName.toLowerCase()) {
        stripped = lines.slice(1).join(" ").trim();
      } else {
        stripped = lines.join(" ").trim();
      }
    }
    const descText = stripped;
    return (
      <div key={cmd} style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: "#1a6080", marginBottom: 2 }}>Grants Ability</div>
        <div style={{ fontSize: 11, color: "#5ab0d4", lineHeight: 1.3 }}>{displayName}</div>
        {descText && (
          <div style={{ fontSize: 10, color: "#4a7090", lineHeight: 1.45, marginTop: 3, paddingLeft: 6, borderLeft: "2px solid #1a4060" }}>
            {descText}
          </div>
        )}
      </div>
    );
  };

  const isEmpty = rank1Mods.length === 0 && allCmds.length === 0;

  if (isSingle) {
    return (
      <div style={{ padding: "12px 16px" }}>
        {isEmpty
          ? <div style={{ color: "#152030", fontSize: 11, fontStyle: "italic", textAlign: "center" }}>—</div>
          : <>
              {rank1Mods.map(m => modRow(m.key, maxMods[m.key] ?? m.value, true))}
              {allCmds.map(cmd => cmdRow(cmd))}
            </>
        }
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a5070", marginBottom: 6, fontFamily: "'Orbitron', sans-serif", paddingBottom: 4, borderBottom: "1px solid #0d1e2e" }}>
          Per Rank
        </div>
        {isEmpty
          ? <div style={{ color: "#152030", fontSize: 11, fontStyle: "italic" }}>—</div>
          : <>{rank1Mods.map(m => modRow(m.key, m.value, false))}{allCmds.map(cmd => cmdRow(cmd))}</>
        }
      </div>
      <div>
        <div style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2a7a50", marginBottom: 6, fontFamily: "'Orbitron', sans-serif", paddingBottom: 4, borderBottom: "1px solid #0d2e1e" }}>
          Total at Max ({node.maxRank}/{node.maxRank})
        </div>
        {Object.entries(maxMods).map(([key, val]) => modRow(key, val, true))}
        {allCmds.map(cmd => cmdRow(cmd))}
      </div>
    </div>
  );
}

// ── Main WikiView ─────────────────────────────────────────────────────────────

export default function WikiView({ data, stringTables, nodeIcons, treeGroups, treeNames, cmdDescriptions }: Props) {
  const [search, setSearch] = useState("");
  const [selectedTreeId, setSelectedTreeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<VisibleNode | null>(null);

  const allTrees = useMemo(
    () => data.trees.filter(t => t.nodes.length > 0 && !t.key.includes("place_holder")),
    [data]
  );

  const treeById = useMemo(() => new Map(allTrees.map(t => [t.id, t])), [allTrees]);
  const selectedTree: TreeData | null = selectedTreeId != null ? (treeById.get(selectedTreeId) ?? null) : null;

  const searchLower = search.trim().toLowerCase();

  // Which tree IDs have nodes matching the search
  const matchingTreeIds = useMemo(() => {
    if (!searchLower) return null;
    const ids = new Set<number>();
    for (const tree of allTrees) {
      for (const node of tree.nodes) {
        const nameHit = formatNodeName(node.displayName).toLowerCase().includes(searchLower);
        const modHit = node.ranks.some(r => r.skillMods.some(m => formatStatKey(m.key, stringTables).toLowerCase().includes(searchLower)));
        const cmdHit = node.ranks.some(r => [...r.commands, ...r.skillAbility].some(c => formatCmdKey(c, stringTables).toLowerCase().includes(searchLower)));
        if (nameHit || modHit || cmdHit) { ids.add(tree.id); break; }
      }
    }
    return ids;
  }, [searchLower, allTrees, stringTables]);

  // Nodes in selected tree that match the search (null = all)
  const visibleNodes = useMemo(() => {
    if (!selectedTree) return [];
    if (!searchLower) return selectedTree.nodes;
    return selectedTree.nodes.filter(node => {
      const nameHit = formatNodeName(node.displayName).toLowerCase().includes(searchLower);
      const modHit = node.ranks.some(r => r.skillMods.some(m => formatStatKey(m.key, stringTables).toLowerCase().includes(searchLower)));
      const cmdHit = node.ranks.some(r => [...r.commands, ...r.skillAbility].some(c => formatCmdKey(c, stringTables).toLowerCase().includes(searchLower)));
      return nameHit || modHit || cmdHit;
    });
  }, [selectedTree, searchLower, stringTables]);

  // Tree name lookup
  const treeName = (key: string) => treeNames[key] ?? key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const labelStyle: React.CSSProperties = {
    fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
    color: "#2a4a60", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
    padding: "8px 12px 4px",
  };

  return (
    <div style={{ display: "flex", gap: 0, minHeight: 600 }}>

      {/* ── Left: tree browser ────────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: "linear-gradient(180deg, #070e18 0%, #080f1c 100%)",
        border: "1px solid #1a3050", borderRadius: "8px 0 0 8px",
        overflowY: "auto", display: "flex", flexDirection: "column",
      }}>
        {/* Search */}
        <div style={{ padding: "12px 10px 8px", borderBottom: "1px solid #0f2030" }}>
          <input
            type="text"
            placeholder="Search nodes, stats, abilities…"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedNode(null); }}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "#0a1520", border: "1px solid #1a3050",
              borderRadius: 6, color: "#a0c8e8", fontSize: 12,
              padding: "7px 10px", outline: "none",
              fontFamily: "'Rajdhani', sans-serif",
            }}
          />
        </div>

        {/* Tree groups */}
        {treeGroups.map(group => {
          const trees = group.keys
            .map(k => allTrees.find(t => t.key === k))
            .filter((t): t is TreeData => !!t)
            .filter(t => !matchingTreeIds || matchingTreeIds.has(t.id));
          if (trees.length === 0) return null;
          return (
            <div key={group.label}>
              <div style={labelStyle}>{group.label.replace(/^──\s*|\s*──$/g, "")}</div>
              {trees.map(tree => {
                const isActive = selectedTreeId === tree.id;
                return (
                  <button
                    key={tree.id}
                    onClick={() => { setSelectedTreeId(tree.id); setSelectedNode(null); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 14px", border: "none", cursor: "pointer",
                      background: isActive ? "linear-gradient(90deg, #0d2540, #0e2040)" : "transparent",
                      borderLeft: isActive ? "2px solid #4ab3e8" : "2px solid transparent",
                      color: isActive ? "#c8dff0" : "#4a7090",
                      fontSize: 13, fontFamily: "'Rajdhani', sans-serif",
                      transition: "color 0.15s, background 0.15s",
                    }}
                  >
                    {treeName(tree.key)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Main: node grid + detail ──────────────────────────────────────── */}
      <div style={{
        flex: 1, border: "1px solid #1a3050", borderLeft: "none",
        borderRadius: "0 8px 8px 0",
        background: "linear-gradient(160deg, #07111e 0%, #080f1a 100%)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {!selectedTree ? (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#1a3a55", fontSize: 14, fontStyle: "italic",
            fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.06em",
          }}>
            {searchLower && matchingTreeIds?.size === 0
              ? "No results found"
              : "Select a tree to browse"}
          </div>
        ) : (
          <>
            {/* Tree header */}
            <div style={{
              padding: "12px 18px", borderBottom: "1px solid #1a3050",
              background: "rgba(8,18,32,0.9)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 18, color: "#c8dff0", letterSpacing: "0.05em" }}>
                  {treeName(selectedTree.key)}
                </span>
                <span style={{ marginLeft: 12, fontSize: 11, color: "#2a5070" }}>
                  {visibleNodes.length} node{visibleNodes.length !== 1 ? "s" : ""}
                  {searchLower ? " matching" : ""}
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#1a3a55", fontFamily: "'Orbitron', sans-serif" }}>
                {selectedTree.key}
              </span>
            </div>

            {/* Node cards */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              {visibleNodes.length === 0 ? (
                <div style={{ color: "#1a3050", fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 40 }}>
                  No matching nodes in this tree
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {visibleNodes.map(node => {
                    const isSelected = selectedNode?.nodeId === node.nodeId;
                    const icon = nodeIcons?.[node.nodeId];
                    const allCmds = [...new Set(node.ranks.flatMap(r => [...r.commands, ...r.skillAbility]).filter(Boolean))];
                    const totalMods: Record<string, number> = {};
                    for (const r of node.ranks) for (const m of r.skillMods ?? []) if (m.key) totalMods[m.key] = (totalMods[m.key] ?? 0) + m.value;

                    return (
                      <div
                        key={node.nodeId}
                        onClick={() => setSelectedNode(isSelected ? null : node)}
                        style={{
                          border: `1px solid ${isSelected ? "#4ab3e8" : "#1a2e40"}`,
                          borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                          background: isSelected
                            ? "linear-gradient(135deg, #0d2040 0%, #102848 100%)"
                            : "linear-gradient(135deg, #0a1520 0%, #0c1828 100%)",
                          boxShadow: isSelected ? "0 0 10px rgba(74,179,232,0.25)" : "none",
                          transition: "border-color 0.2s, box-shadow 0.2s",
                        }}
                      >
                        {/* Card header: icon + name + rank badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          {icon ? (
                            <img src={icon} alt="" draggable={false} style={{ width: 28, height: 28, borderRadius: 4, imageRendering: "pixelated", flexShrink: 0, opacity: 0.9 }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: 4, background: "#0d1e30", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#2a5070" }}>
                              T{node.tier}
                            </div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, color: "#b0cce0", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {formatNodeName(node.displayName)}
                            </div>
                            <div style={{ fontSize: 10, color: "#2a5070", marginTop: 1 }}>
                              Tier {node.tier} · {node.maxRank} rank{node.maxRank !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>

                        {/* Summary: top 3 mods + abilities */}
                        <div style={{ fontSize: 11 }}>
                          {Object.entries(totalMods).slice(0, 3).map(([key, val]) => (
                            <div key={key} style={{ display: "flex", justifyContent: "space-between", color: "#4a7090", padding: "1px 0" }}>
                              <span style={{ color: "#3a6888" }}>{formatStatKey(key, stringTables)}</span>
                              <span style={{ color: val > 0 ? "#44aa55" : "#cc4444", fontFamily: "'Orbitron', sans-serif", fontSize: 10 }}>
                                {val > 0 ? "+" : ""}{val}
                              </span>
                            </div>
                          ))}
                          {allCmds.slice(0, 2).map(cmd => (
                            <div key={cmd} style={{ color: "#2a6888", fontSize: 11, padding: "1px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              <span style={{ color: "#1a4060", marginRight: 4 }}>▶</span>
                              {formatCmdKey(cmd, stringTables)}
                            </div>
                          ))}
                          {Object.keys(totalMods).length === 0 && allCmds.length === 0 && (
                            <div style={{ color: "#1a3050", fontStyle: "italic" }}>No modifiers</div>
                          )}
                          {(Object.keys(totalMods).length > 3 || allCmds.length > 2) && (
                            <div style={{ color: "#1a4060", fontSize: 10, marginTop: 2 }}>+more…</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Node detail panel */}
            {selectedNode && (
              <div style={{
                borderTop: "1px solid #1a3050",
                background: "linear-gradient(160deg, #060d16 0%, #080f1a 100%)",
                flexShrink: 0,
              }}>
                {/* Detail header */}
                <div style={{
                  padding: "10px 16px", borderBottom: "1px solid #1a3050",
                  background: "rgba(8, 18, 32, 0.9)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {nodeIcons?.[selectedNode.nodeId] && (
                      <img src={nodeIcons[selectedNode.nodeId]} alt="" draggable={false}
                        style={{ width: 32, height: 32, borderRadius: 5, imageRendering: "pixelated", filter: "drop-shadow(0 0 4px rgba(74,179,232,0.5))" }} />
                    )}
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16, color: "#c8dff0", letterSpacing: "0.05em" }}>
                      {formatNodeName(selectedNode.displayName)}
                    </span>
                    <div style={{ display: "flex", gap: 3 }}>
                      {Array.from({ length: selectedNode.maxRank }, (_, i) => (
                        <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: "#4ab3e8", boxShadow: "0 0 4px rgba(74,179,232,0.3)" }} />
                      ))}
                    </div>
                    <span style={{ color: "#2a6080", fontSize: 11, fontFamily: "'Orbitron', sans-serif" }}>
                      {selectedNode.maxRank} / {selectedNode.maxRank}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ color: "#1e3e5a", fontSize: 11 }}>
                      Tier {selectedNode.tier} · Grid {selectedNode.grid}
                    </span>
                    {/* Prerequisites */}
                    {selectedNode.skillsRequired.length > 0 && (
                      <span style={{ fontSize: 10, color: "#4a6888" }}>
                        Requires: {selectedNode.skillsRequired.filter(s => !s.includes(selectedNode.nodeId)).slice(0, 2).map(s => s.replace(/_\d+$/, "").replace(/_/g, " ")).join(", ")}
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedNode(null)}
                      style={{ background: "transparent", border: "1px solid #1a3050", borderRadius: 4, color: "#3a6080", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <NodeDetail node={selectedNode} stringTables={stringTables} cmdDescriptions={cmdDescriptions} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
