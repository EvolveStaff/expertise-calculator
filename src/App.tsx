import { useEffect, useMemo, useState } from "react";
import ExpertiseTree from "./components/ExpertiseTree";
import AutoFillModal from "./components/AutoFillModal";
import { computeAutoFill } from "./lib/autoFill";
import type { AutoFillResult } from "./lib/autoFill";
import HeroicJewelry from "./components/HeroicJewelry";
import type { JewelryAbilityDesc } from "./components/HeroicJewelry";
import WikiView from "./components/WikiView";
import type { ExpertisePayload, StringTables, VisibleNode, TreeData } from "./lib/types";
import { STAT_MULTIPLIERS, CORE_STAT_LABELS, CORE_STAT_COLORS, fmtDerived } from "./lib/statHelpers";
import { formatNodeName } from "./lib/formatNodeName";
import {
  canDecreaseRank,
  canIncreaseRank,
  getTotalPointsSpent,
  isTierUnlocked,
  tierUnlockThreshold,
  getPointsSpentBeforeTier,
  getMissingRequirements,
  isBranchGateSatisfied,
  MAX_EXPERTISE_POINTS,
  MAX_FRS_RANK,
  FRS_TREE_KEY,
  getFrsVirtualRanks,
  TREE_BRANCH_GATES,
} from "./lib/rules";

type Totals = {
  mods: Record<string, number>;
  commands: string[];
};

type SelectionsByTree = Record<number, Record<string, number>>;


const STORAGE_KEY   = "swg-expertise-builds";
const TEMPLATES_KEY = "swg-expertise-templates";

type Template = {
  name: string;
  selections: SelectionsByTree;
  characterType: "normal" | "jedi";
};

const TREE_NAMES: Record<string, string> = {
  // Melee
  combat_brawler:        "Brawler",
  combat_1hsword:        "Fencer",
  combat_2hsword:        "Swordsman",
  combat_polearm:        "Pikeman",
  combat_unarmed:        "Martial Artist",
  combat_teras_kasi:     "Teras Kasi Artist",
  combat_battlemaster:   "Battle Master",
  // Ranged
  combat_marksman:       "Marksman",
  combat_pistol:         "Pistoleer",
  combat_carbine:        "Carbineer",
  combat_rifleman:       "Rifleman",
  combat_heavy_weapon:   "Heavy Weapon Specialist",
  // Special combat
  combat_assassin:       "Assassin",
  combat_bountyhunter:   "Bounty Hunter",
  combat_commando:       "Commando",
  combat_grenadier:      "Grenadier",
  combat_smuggler:       "Smuggler",
  outdoors_squadleader:  "Squad Leader",
  // Science
  science_combatmedic:   "Combat Medic",
  science_doctor:        "Doctor",
  // Outdoors
  outdoors_creaturehandler: "Creature Handler",
  outdoors_bio_engineer:    "Bio-Engineer",
  // Social
  social_entertainer:    "Entertainer",
  social_musician:       "Musician",
  social_imagedesigner:  "Image Designer",
  social_muse:           "Muse",
  // Crafting
  crafting_artisan:      "Artisan",
  crafting_architect:    "Architect",
  crafting_armorsmith:   "Armorsmith",
  crafting_chef:         "Chef",
  crafting_cybernetics:  "Cybernetics",
  crafting_droidengineer:   "Droid Engineer",
  crafting_reverseengineer: "Reverse Engineer",
  crafting_shipwright:   "Shipwright",
  crafting_tailor:       "Tailor",
  crafting_weaponsmith:  "Weaponsmith",
  crafting_merchant:     "Merchant",
  // Force / Jedi
  force_sensitive:           "Force Sensitive",
  expertise_tree_beastmaster:"Beast Master",
  combat_guardian:       "Guardian",
  combat_mystic:         "Mystic",
  combat_sage:           "Sage",
  jedi_forms:            "Jedi Forms",
  jedi_frs:              "Force Ranking System",
  crafting_jedi_artisan: "Jedi Artisan",
};

// Exclusively Jedi trees (not available to normal characters)
const JEDI_KEYS = new Set([
  "force_sensitive","combat_battlemaster","combat_guardian",
  "combat_mystic","combat_sage","jedi_forms","jedi_frs","crafting_jedi_artisan",
]);

// Available to both normal and Jedi characters
const SHARED_KEYS = new Set([
  "expertise_tree_beastmaster","outdoors_creaturehandler",
]);

const NORMAL_TREE_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Melee Skillsets",       keys: ["combat_brawler","combat_1hsword","combat_2hsword","combat_polearm","combat_unarmed"] },
  { label: "Ranged Skillsets",      keys: ["combat_marksman","combat_pistol","combat_carbine","combat_rifleman","combat_heavy_weapon"] },
  { label: "Combat Skillsets",      keys: ["combat_assassin","combat_bountyhunter","science_combatmedic","science_doctor","combat_commando","combat_grenadier","combat_smuggler","outdoors_squadleader","combat_teras_kasi","outdoors_creaturehandler","expertise_tree_beastmaster"] },
  { label: "Entertainer Skillsets", keys: ["social_entertainer","social_musician","social_imagedesigner","social_muse"] },
  { label: "Crafting Skillsets",    keys: ["crafting_artisan","crafting_architect","crafting_armorsmith","crafting_chef","crafting_cybernetics","crafting_droidengineer","crafting_reverseengineer","crafting_shipwright","crafting_tailor","crafting_weaponsmith","crafting_merchant","outdoors_bio_engineer"] },
];

const JEDI_TREE_GROUPS: { label: string; keys: string[] }[] = [
  { label: "── Force ──",    keys: ["force_sensitive"] },
  { label: "── Combat ──",   keys: ["combat_battlemaster","combat_guardian","combat_mystic","combat_sage"] },
  { label: "── Skills ──",   keys: ["jedi_forms","jedi_frs","crafting_jedi_artisan"] },
  { label: "── Outdoors ──", keys: ["outdoors_creaturehandler","expertise_tree_beastmaster"] },
];

function formatTreeName(key: string): string {
  return TREE_NAMES[key] ?? key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function aggregateTotals(
  selectedRanks: Record<string, number>,
  nodes: VisibleNode[]
): Totals {
  const mods: Record<string, number> = {};
  const commands = new Set<string>();

  for (const node of nodes) {
    const selected = selectedRanks[node.nodeId] ?? 0;
    if (selected <= 0) continue;

    for (const rankEntry of node.ranks) {
      const rank = rankEntry.rank ?? 0;
      if (rank <= 0 || rank > selected) continue;

      for (const mod of rankEntry.skillMods) {
        if (!mod.key) continue;
        const numericValue = typeof mod.value === "number" ? mod.value : 0;
        mods[mod.key] = (mods[mod.key] ?? 0) + numericValue;
      }

      for (const command of rankEntry.commands) {
        if (command) commands.add(command);
      }

      for (const ability of rankEntry.skillAbility) {
        if (ability) commands.add(ability);
      }
    }
  }

  return {
    mods,
    commands: Array.from(commands).sort(),
  };
}

function formatStatKey(key: string, tables: StringTables | null): string {
  if (tables?.statNames[key]) return tables.statNames[key];
  // Fallback: convert snake_case to Title Case
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCmdKey(key: string, tables: StringTables | null): string {
  if (tables?.cmdNames[key]) return tables.cmdNames[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}


// ── Build encode / decode ────────────────────────────────────────────────────
type BuildPayload = { v: number; characterType: "normal" | "jedi"; selections: SelectionsByTree };

// v2: compact [[treeId, [[nodeIdx, rank], ...]], ...] — much shorter than full nodeId strings
function encodeBuild(selections: SelectionsByTree, charType: "normal" | "jedi", allTrees: TreeData[]): string {
  const s: Array<[number, Array<[number, number]>]> = [];
  for (const [tid, ranks] of Object.entries(selections)) {
    const treeId = Number(tid);
    const tree = allTrees.find((t) => t.id === treeId);
    if (!tree) continue;
    const entries: Array<[number, number]> = [];
    for (const [nodeId, rank] of Object.entries(ranks)) {
      if (rank <= 0) continue;
      const idx = tree.nodes.findIndex((n) => n.nodeId === nodeId);
      if (idx >= 0) entries.push([idx, rank]);
    }
    if (entries.length > 0) s.push([treeId, entries]);
  }
  return btoa(JSON.stringify({ v: 2, t: charType === "jedi" ? "j" : "n", s }));
}

function decodeBuild(code: string, allTrees?: TreeData[]): BuildPayload | null {
  try {
    const obj = JSON.parse(atob(code.trim()));
    if (!obj || typeof obj !== "object") return null;
    if (obj.v === 2 && allTrees) {
      const charType: "normal" | "jedi" = obj.t === "j" ? "jedi" : "normal";
      const selections: SelectionsByTree = {};
      for (const [treeId, entries] of (obj.s ?? []) as Array<[number, Array<[number, number]>]>) {
        const tree = allTrees.find((t) => t.id === treeId);
        if (!tree) continue;
        const ranks: Record<string, number> = {};
        for (const [idx, rank] of entries) {
          const node = tree.nodes[idx];
          if (node && rank > 0) ranks[node.nodeId] = rank;
        }
        if (Object.keys(ranks).length > 0) selections[treeId] = ranks;
      }
      return { v: 2, characterType: charType, selections };
    }
    // v1 backward compatibility
    if (obj.selections) {
      return {
        v: 1,
        characterType: obj.characterType === "jedi" ? "jedi" : "normal",
        selections: (obj.selections as SelectionsByTree) ?? {},
      };
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const [data, setData] = useState<ExpertisePayload | null>(null);
  const [stringTables, setStringTables] = useState<StringTables | null>(null);
  const [treeId, setTreeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<VisibleNode | null>(null);
  const [autoFillModal, setAutoFillModal] = useState<{
    node: VisibleNode;
    result: AutoFillResult;
    treeId: number;
  } | null>(null);
  // Lazy-init from localStorage so the save effect never stomps the stored data
  const [selectionsByTree, setSelectionsByTree] = useState<SelectionsByTree>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as SelectionsByTree) : {};
    } catch { return {}; }
  });
  const [viewMode, setViewMode] = useState<"calculator" | "codex">("calculator");
  const [characterType, setCharacterType] = useState<"normal" | "jedi">("normal");
  const [panelOpen, setPanelOpen] = useState(true);
  const [templates, setTemplates] = useState<Record<string, Template>>(() => {
    try {
      const saved = localStorage.getItem(TEMPLATES_KEY);
      return saved ? (JSON.parse(saved) as Record<string, Template>) : {};
    } catch { return {}; }
  });
  const [buildName, setBuildName] = useState("");
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [importInput, setImportInput] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingUrlBuild, setPendingUrlBuild] = useState<string | null>(null);

  // Persist active build
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectionsByTree));
  }, [selectionsByTree]);

  // Persist saved templates
  useEffect(() => {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }, [templates]);

  // Persist FRS rank

  // On mount: store raw URL hash — decode lazily when data+allTrees are ready
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) setPendingUrlBuild(hash);
  }, []);

  useEffect(() => {
    fetch("/data/expertise.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load expertise.json: ${r.status}`);
        return r.json();
      })
      .then((json: ExpertisePayload) => {
        setData(json);
        const first = json.trees.find((t) => t.nodes.length > 0 && !t.key.includes("place_holder"));
        if (first) setTreeId(first.id);
      })
      .catch((err) => console.error("Error loading expertise data:", err));
  }, []);

  useEffect(() => {
    fetch("/data/string_tables.json")
      .then((r) => r.json())
      .then((json: StringTables) => setStringTables(json))
      .catch((err) => console.warn("Could not load string_tables.json:", err));
  }, []);

  const [nodeIcons, setNodeIcons] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    fetch("/data/node_icons.json")
      .then((r) => r.json())
      .then((json: Record<string, string>) => setNodeIcons(json))
      .catch(() => {/* icons optional */});
  }, []);

  const [cmdDescriptions, setCmdDescriptions] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/data/cmd_descriptions.json")
      .then((r) => r.json())
      .then((json: Record<string, string>) => setCmdDescriptions(json))
      .catch(() => {/* descriptions optional */});
  }, []);

  const [jewelryAbilityDescs, setJewelryAbilityDescs] = useState<Record<string, JewelryAbilityDesc>>({});
  useEffect(() => {
    fetch("/data/jewelry_ability_descriptions.json")
      .then((r) => r.json())
      .then((json: Record<string, JewelryAbilityDesc>) => setJewelryAbilityDescs(json))
      .catch(() => {});
  }, []);

  const [focusAbilityKey, setFocusAbilityKey] = useState<string | null>(null);

  const allTrees = useMemo(() => {
    if (!data) return [];
    return data.trees.filter((t) => t.nodes.length > 0 && !t.key.includes("place_holder"));
  }, [data]);

  // nodeIds that appear in more than one tree — cross-tree branches through these
  // are artifacts of nodeId collisions, not real profession gates.
  const collidingNodeIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tree of allTrees) {
      for (const node of tree.nodes) {
        counts.set(node.nodeId, (counts.get(node.nodeId) ?? 0) + 1);
      }
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
  }, [allTrees]);

  const availableTrees = useMemo(() => {
    return allTrees.filter((t) => {
      if (SHARED_KEYS.has(t.key)) return true;
      return characterType === "jedi" ? JEDI_KEYS.has(t.key) : !JEDI_KEYS.has(t.key);
    });
  }, [allTrees, characterType]);

  const activeTreeGroups = characterType === "jedi" ? JEDI_TREE_GROUPS : NORMAL_TREE_GROUPS;

  // Points spent in trees exclusive to the opposite type (shared trees don't count as a conflict)
  const oppositeTypePoints = useMemo(() => {
    return allTrees
      .filter((t) => {
        if (SHARED_KEYS.has(t.key)) return false;
        return characterType === "jedi" ? !JEDI_KEYS.has(t.key) : JEDI_KEYS.has(t.key);
      })
      .reduce((sum, t) => sum + Object.values(selectionsByTree[t.id] ?? {}).reduce((s, v) => s + v, 0), 0);
  }, [allTrees, characterType, selectionsByTree]);

  const currentTree = useMemo(() => {
    return availableTrees.find((t) => t.id === treeId) ?? null;
  }, [availableTrees, treeId]);

  const selectedRanks = useMemo(() => {
    if (!treeId) return {};
    return selectionsByTree[treeId] ?? {};
  }, [selectionsByTree, treeId]);

  const frsTreeId = useMemo(() => {
    return allTrees?.find(t => t.key === FRS_TREE_KEY)?.id;
  }, [allTrees]);

  const frsPointsSpent = useMemo(() => {
    if (frsTreeId === undefined) return 0;
    return Object.values(selectionsByTree[frsTreeId] ?? {}).reduce((s, r) => s + r, 0);
  }, [selectionsByTree, frsTreeId]);

  // FRS rank is simply how many FRS points have been spent.
  const frsRank = frsPointsSpent;

  const totalPointsSpent = useMemo(() => {
    const excludeIds = frsTreeId !== undefined ? new Set([frsTreeId]) : undefined;
    return getTotalPointsSpent(selectionsByTree, excludeIds);
  }, [selectionsByTree, frsTreeId]);

  const totals = useMemo(() => {
    if (!allTrees) return { mods: {}, commands: [] };
    // Aggregate across every tree so the panel always reflects all selections
    const mods: Record<string, number> = {};
    const commands = new Set<string>();
    for (const tree of allTrees) {
      const ranks = selectionsByTree[tree.id] ?? {};
      const partial = aggregateTotals(ranks, tree.nodes);
      for (const [k, v] of Object.entries(partial.mods)) mods[k] = (mods[k] ?? 0) + v;
      for (const c of partial.commands) commands.add(c);
    }
    return { mods, commands: [...commands] };
  }, [allTrees, selectionsByTree]);

  // For the current tree: nodeId → list of other tree keys that require it as a prerequisite
  const currentTreeBranches = useMemo(() => {
    if (!currentTree || !allTrees) return new Map<string, string[]>();
    const currentNodeIds = new Set(currentTree.nodes.map((n) => n.nodeId));
    const result = new Map<string, string[]>();

    for (const tree of allTrees) {
      if (tree.id === currentTree.id) continue;
      for (const node of tree.nodes) {
        const reqs = [
          ...(Array.isArray(node.skillsRequired) ? node.skillsRequired : []),
          ...node.ranks.flatMap((r) =>
            Array.isArray(r.skillsRequired) ? r.skillsRequired : []
          ),
        ].filter(Boolean);

        for (const req of reqs) {
          // Strip rank suffix: "fencer_novice_01" → "fencer_novice"
          const reqNodeId = req.match(/^(.+)_\d+$/)?.[1] ?? req;
          if (reqNodeId === node.nodeId) continue; // self-ref
          if (!currentNodeIds.has(reqNodeId)) continue;
          // Block nodeIds that appear in multiple trees — those are collisions, not real gates.
          // Unique nodeIds that are cross-tree prereqs (e.g. FS ability → Jedi tree) are valid.
          if (collidingNodeIds.has(reqNodeId)) continue;

          if (!result.has(reqNodeId)) result.set(reqNodeId, []);
          const targets = result.get(reqNodeId)!;
          if (!targets.includes(tree.key)) targets.push(tree.key);
        }
      }
    }
    return result;
  }, [currentTree, allTrees, collidingNodeIds]);

  function updateCurrentTreeSelections(updater: (prev: Record<string, number>) => Record<string, number>) {
    if (!treeId) return;

    setSelectionsByTree((prev) => {
      const current = prev[treeId] ?? {};
      return {
        ...prev,
        [treeId]: updater(current),
      };
    });
  }

 function increaseRank(nodeId: string) {
  if (!currentTree || !treeId || !data) return;

  const node = currentTree.nodes.find((n) => n.nodeId === nodeId);
  if (!node) return;

  const allowed = canIncreaseRank(
    node,
    currentTree.nodes,
    selectedRanks,
    data.trees,
    selectionsByTree,
    currentTree.key,
  );

  if (!allowed) return;

  updateCurrentTreeSelections((prev) => {
    const current = prev[nodeId] ?? 0;
    if (current >= node.maxRank) return prev;

    return {
      ...prev,
      [nodeId]: current + 1,
    };
  });
}

function handleAutoFill(node: VisibleNode) {
  if (!currentTree || !treeId || !data) return;
  const result = computeAutoFill(node, currentTree, data.trees, selectionsByTree, currentTree.key);
  setAutoFillModal({ node, result, treeId });
}

function applyAutoFill() {
  if (!autoFillModal || !autoFillModal.result.ok) return;
  const { treeId: tid, result } = autoFillModal;
  setSelectionsByTree((prev) => ({ ...prev, [tid]: result.newTreeSelections }));
  setAutoFillModal(null);
}

function decreaseRank(nodeId: string) {
  if (!currentTree || !treeId || !data) return;

  const node = currentTree.nodes.find((n) => n.nodeId === nodeId);
  if (!node) return;

  const allowed = canDecreaseRank(
    node,
    treeId,
    currentTree.nodes,
    selectedRanks,
    data.trees,
    selectionsByTree,
    currentTree.key,
  );

  if (!allowed) return;

  updateCurrentTreeSelections((prev) => {
    const current = prev[nodeId] ?? 0;
    if (current <= 0) return prev;

    const next = current - 1;

    if (next === 0) {
      const copy = { ...prev };
      delete copy[nodeId];
      return copy;
    }

    return {
      ...prev,
      [nodeId]: next,
    };
  });
}

function getNodeDisabledReason(node: VisibleNode): string {
  if (!currentTree || !data) return "";

  const current = selectedRanks[node.nodeId] ?? 0;
  if (current >= node.maxRank) return "Max rank reached";

  // Branch gate: e.g. Smuggler/BH/Assassin need a mastered melee or ranged tree
  const mergedRanks = Object.values(selectionsByTree).reduce<Record<string, number>>(
    (acc, sel) => ({ ...acc, ...sel }), {}
  );
  if (!isBranchGateSatisfied(currentTree.key, mergedRanks)) {
    return TREE_BRANCH_GATES[currentTree.key]?.description ?? "Branch prerequisite not met";
  }

  if (!isTierUnlocked(node.tier, currentTree.nodes, selectedRanks, currentTree.key)) {
    const needed = tierUnlockThreshold(node.tier ?? 1, currentTree.key);
    const spent = getPointsSpentBeforeTier(node.tier ?? 1, currentTree.nodes, selectedRanks);
    const treeName = formatTreeName(currentTree.key).split(": ")[1] ?? formatTreeName(currentTree.key);
    return `Requires ${needed} pts in ${treeName} (have ${spent})`;
  }

  if (currentTree.key !== FRS_TREE_KEY && totalPointsSpent >= MAX_EXPERTISE_POINTS) {
    return `No points remaining (${MAX_EXPERTISE_POINTS}/${MAX_EXPERTISE_POINTS})`;
  }

  // Check specific skill prereqs using merged global selections + FRS virtual ranks
  const globalRanks: Record<string, number> = {
    ...getFrsVirtualRanks(frsRank),
  };
  for (const [, treeSelections] of Object.entries(selectionsByTree)) {
    for (const [nodeId, rank] of Object.entries(treeSelections as Record<string, number>)) {
      globalRanks[nodeId] = rank;
    }
  }
  const missing = getMissingRequirements(node, globalRanks);
  if (missing.length > 0) {
    const formatted = missing.map((req) => {
      // req format: "some_node_id (rank N)"
      const match = req.match(/^(.+) \(rank (\d+)\)$/);
      if (!match) return req;
      const rawId = match[1];
      // force_rank virtual IDs → "FRS Rank N" messages
      // force_rank_novice and force_rank_master use full name; force_rank_01..04
      // are parsed by parseSkillName as nodeId="force_rank" with rank N.
      if (rawId === "force_rank_novice") return "FRS Rank 1";
      if (rawId === "force_rank_master") return "FRS Rank 6";
      if (rawId === "force_rank") {
        const rank = parseInt(match[2], 10);
        return `FRS Rank ${rank + 1}`;
      }
      const displayId = rawId
        .replace(/^expertise_fs_/, "")
        .replace(/^expertise_/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return `${displayId} Rank ${match[2]}`;
    });
    return `Requires: ${formatted.join(", ")}`;
  }

  return "";
}

  function applyBuild(payload: BuildPayload) {
    setSelectionsByTree(payload.selections);
    setCharacterType(payload.characterType);
    setSelectedNode(null);
    const firstTree = allTrees.find((tr) =>
      payload.characterType === "jedi" ? JEDI_KEYS.has(tr.key) : !JEDI_KEYS.has(tr.key)
    );
    setTreeId(firstTree?.id ?? null);
  }

  function saveBuild() {
    const name = buildName.trim();
    if (!name) return;
    setTemplates((prev) => ({
      ...prev,
      [name]: { name, selections: selectionsByTree, characterType },
    }));
    setBuildName("");
  }

  function loadBuild(name: string) {
    const t = templates[name];
    if (!t) return;
    applyBuild({ v: 1, characterType: t.characterType, selections: t.selections });
  }

  function deleteBuild(name: string) {
    setTemplates((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  }

  function exportBuild() {
    const code = encodeBuild(selectionsByTree, characterType, allTrees);
    setShareCode(code);
    setShareCopied(false);
    window.history.replaceState(null, "", "#" + code);
  }

  function copyShareCode() {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }).catch(() => {
      // Fallback: select the input text
      const el = document.getElementById("share-code-input") as HTMLInputElement | null;
      el?.select();
    });
  }

  function importBuild() {
    const decoded = decodeBuild(importInput, allTrees);
    if (!decoded) {
      setImportError("Invalid build code — please check and try again.");
      return;
    }
    applyBuild(decoded);
    setImportInput("");
    setImportError(null);
    setShareCode(null);
    // Clear URL hash so it reflects the now-active build
    window.history.replaceState(null, "", window.location.pathname);
  }

  function clearCurrentTree() {
    if (!treeId) return;
    setSelectionsByTree((prev) => {
      const copy = { ...prev };
      delete copy[treeId];
      return copy;
    });
    setSelectedNode(null);
  }

  function clearAllTrees() {
    setSelectionsByTree({});
    setSelectedNode(null);
  }

  const hasAnyPoints = Object.values(selectionsByTree).some(
    (tree) => Object.values(tree).some((v) => v > 0)
  );

  if (!data) {
    return <div style={{ padding: 20 }}>Loading expertise data...</div>;
  }

  return (
    <div
      style={{
        fontFamily: "'Inter', 'Rajdhani', system-ui, sans-serif",
        background: "linear-gradient(180deg, #05090f 0%, #080c14 40%, #0a0e18 100%)",
        color: "#e8edf5",
        minHeight: "100vh",
      }}
    >
      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid #1a3050",
          background: "linear-gradient(180deg, #020408 0%, #060c16 60%, #0a1220 100%)",
          boxShadow: "0 4px 40px rgba(0,140,255,0.12)",
        }}
      >
        {/* Subtle star-field dots */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: `radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 60%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 20%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 75%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 40%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 92% 15%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 8% 80%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 48% 90%, rgba(255,255,255,0.3) 0%, transparent 100%)`,
        }} />

        {/* Glow halo behind logo */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 500, height: 200,
          background: "radial-gradient(ellipse, rgba(40,120,220,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "18px 24px 14px",
          position: "relative",
          zIndex: 1,
        }}>
          {/* Logo */}
          <img
            src="/evolve-logo.png"
            alt="Star Wars Galaxies: Evolve"
            style={{
              height: 150,
              width: "auto",
              objectFit: "contain",
              mixBlendMode: "screen",
              filter: "drop-shadow(0 0 22px rgba(50,150,255,0.55)) drop-shadow(0 0 8px rgba(0,200,255,0.4)) brightness(1.05)",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
          {/* Sub-title */}
          <div style={{
            marginTop: 6,
            fontSize: 11,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#4ab3e8",
            fontFamily: "'Orbitron', 'Rajdhani', sans-serif",
            fontWeight: 600,
            opacity: 0.9,
            textShadow: "0 0 12px rgba(74,179,232,0.6)",
          }}>
            Expertise Calculator
          </div>
        </div>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 20px" }}>

      {/* Top-level tabs: Calculator modes + Codex */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 0,
        marginBottom: 20,
        borderBottom: "1px solid #1a3050",
      }}>
        {(["normal", "jedi"] as const).map((type) => {
          const isActive = viewMode === "calculator" && characterType === type;
          return (
            <button
              key={type}
              onClick={() => {
                setViewMode("calculator");
                if (type === characterType) return;
                setCharacterType(type);
                setSelectedNode(null);
                const firstTree = allTrees.find((t) =>
                  type === "jedi" ? JEDI_KEYS.has(t.key) : !JEDI_KEYS.has(t.key)
                );
                setTreeId(firstTree?.id ?? null);
              }}
              style={{
                padding: "10px 30px",
                border: "none",
                borderBottom: isActive ? "3px solid #4ab3e8" : "3px solid transparent",
                marginBottom: -1,
                background: isActive ? "rgba(74,179,232,0.07)" : "transparent",
                color: isActive ? "#7dd4f8" : "#5a7a98",
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "'Rajdhani', sans-serif",
                transition: "color 0.2s, background 0.2s",
                borderRadius: "6px 6px 0 0",
              }}
            >
              {type === "normal" ? "⚔  Adventurer" : "⚡  Force Sensitive"}
            </button>
          );
        })}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Codex tab — larger, distinct style */}
        <button
          onClick={() => {
            if (viewMode === "codex") { setViewMode("calculator"); }
            else { setViewMode("codex"); setFocusAbilityKey(null); }
          }}
          style={{
            padding: "11px 36px",
            border: viewMode === "codex" ? "1px solid #c8a04088" : "1px solid #1a3050",
            borderBottom: viewMode === "codex" ? "3px solid #c8a040" : "3px solid transparent",
            marginBottom: -1,
            background: viewMode === "codex"
              ? "linear-gradient(180deg, rgba(200,160,64,0.12) 0%, rgba(200,160,64,0.05) 100%)"
              : "rgba(255,255,255,0.02)",
            color: viewMode === "codex" ? "#e8c060" : "#6a8aaa",
            fontWeight: viewMode === "codex" ? 700 : 500,
            fontSize: 15,
            cursor: "pointer",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontFamily: "'Orbitron', sans-serif",
            transition: "color 0.2s, background 0.2s, border-color 0.2s",
            borderRadius: "6px 6px 0 0",
            boxShadow: viewMode === "codex" ? "0 0 12px rgba(200,160,64,0.2)" : "none",
          }}
        >
          ◈  Codex
        </button>
      </div>

      {/* Codex view */}
      {viewMode === "codex" && data && (
        <WikiView
          data={data}
          stringTables={stringTables}
          nodeIcons={nodeIcons}
          treeGroups={[...NORMAL_TREE_GROUPS, ...JEDI_TREE_GROUPS]}
          treeNames={TREE_NAMES}
          cmdDescriptions={cmdDescriptions}
          abilityDescriptions={jewelryAbilityDescs}
          focusAbilityKey={focusAbilityKey}
        />
      )}

      {/* ── Calculator view ─────────────────────────────────────────────── */}
      {viewMode === "calculator" && (<>

      {/* Shared build detected in URL */}
      {pendingUrlBuild && (
        <div style={{
          marginBottom: 16,
          padding: "10px 14px",
          borderRadius: 8,
          background: "#1a2a3a",
          border: "1px solid #446688",
          color: "#aad4ff",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}>
          🔗 A shared build was found in the URL.
          <button
            onClick={() => {
              const decoded = decodeBuild(pendingUrlBuild!, allTrees);
              if (decoded) applyBuild(decoded);
              setPendingUrlBuild(null);
            }}
            style={{ background: "#1d3050", border: "1px solid #446688", borderRadius: 6, color: "#aad4ff", cursor: "pointer", fontSize: 13, padding: "3px 12px" }}
          >
            Load it
          </button>
          <button
            onClick={() => { setPendingUrlBuild(null); window.history.replaceState(null, "", window.location.pathname); }}
            style={{ background: "transparent", border: "1px solid #334", borderRadius: 6, color: "#667", cursor: "pointer", fontSize: 13, padding: "3px 10px" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {oppositeTypePoints > 0 && (
        <div style={{
          marginBottom: 16,
          padding: "8px 14px",
          borderRadius: 8,
          background: "#2a1a00",
          border: "1px solid #886622",
          color: "#ffcc66",
          fontSize: 13,
        }}>
          ⚠️ You have <strong>{oppositeTypePoints} point{oppositeTypePoints !== 1 ? "s" : ""}</strong> allocated in{" "}
          {characterType === "jedi" ? "Adventurer" : "Force Sensitive"} trees. Force Sensitive and Adventurer characters are mutually exclusive in-game.
        </div>
      )}

      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>

        <button
          onClick={clearCurrentTree}
          disabled={!treeId || Object.keys(selectionsByTree[treeId] ?? {}).length === 0}
          title="Remove all points from the current tree"
          style={{
            background: "transparent",
            border: `1px solid ${treeId && Object.keys(selectionsByTree[treeId] ?? {}).length > 0 ? "#883333" : "#333"}`,
            borderRadius: 6,
            color: treeId && Object.keys(selectionsByTree[treeId] ?? {}).length > 0 ? "#ff7777" : "#444",
            cursor: treeId && Object.keys(selectionsByTree[treeId] ?? {}).length > 0 ? "pointer" : "default",
            fontSize: 13,
            padding: "4px 12px",
          }}
        >
          ✕ Reset Tree
        </button>

        <button
          onClick={clearAllTrees}
          disabled={!hasAnyPoints}
          title="Remove all points from every tree"
          style={{
            background: hasAnyPoints ? "rgba(120, 30, 30, 0.25)" : "transparent",
            border: `1px solid ${hasAnyPoints ? "#aa3333" : "#333"}`,
            borderRadius: 6,
            color: hasAnyPoints ? "#ff9999" : "#444",
            cursor: hasAnyPoints ? "pointer" : "default",
            fontSize: 13,
            padding: "4px 12px",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (hasAnyPoints) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(160, 40, 40, 0.45)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#cc4444";
            }
          }}
          onMouseLeave={(e) => {
            if (hasAnyPoints) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(120, 30, 30, 0.25)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#aa3333";
            }
          }}
        >
          ✕ Reset All
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {availableTrees
            .filter((t) => (Object.values(selectionsByTree[t.id] ?? {}).reduce((s, v) => s + v, 0)) > 0)
            .map((t) => {
              const pts = Object.values(selectionsByTree[t.id] ?? {}).reduce((s, v) => s + v, 0);
              const isActive = t.id === treeId;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTreeId(t.id); setSelectedNode(null); }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: isActive ? "1px solid #88ff88" : "1px solid #555",
                    background: isActive ? "#1d2a1d" : "#222",
                    color: isActive ? "#88ff88" : "#ccc",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {formatTreeName(t.key)}: {pts}
                </button>
              );
            })}
        </div>
      </div>

      {/* ── Builds toolbar ─────────────────────────────────────────── */}
      <div
        style={{
          marginBottom: 16,
          padding: "10px 14px",
          borderRadius: 10,
          background: "#181818",
          border: "1px solid #2a2a2a",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* Save row */}
        <input
          type="text"
          placeholder="Build name…"
          value={buildName}
          onChange={(e) => setBuildName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") saveBuild(); }}
          style={{
            background: "#222",
            border: "1px solid #444",
            borderRadius: 6,
            color: "#eee",
            fontSize: 13,
            padding: "4px 10px",
            width: 180,
            outline: "none",
          }}
        />
        <button
          onClick={saveBuild}
          disabled={!buildName.trim()}
          style={{
            background: buildName.trim() ? "#1d2a1d" : "#1a1a1a",
            border: "1px solid #446644",
            borderRadius: 6,
            color: buildName.trim() ? "#88ff88" : "#555",
            cursor: buildName.trim() ? "pointer" : "default",
            fontSize: 13,
            padding: "4px 14px",
          }}
        >
          💾 Save
        </button>

        {/* Separator if there are saved builds */}
        {Object.keys(templates).length > 0 && (
          <span style={{ color: "#333", fontSize: 18, userSelect: "none" }}>|</span>
        )}

        {/* Saved build chips */}
        {Object.values(templates).map((tpl) => (
          <div
            key={tpl.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              borderRadius: 6,
              border: "1px solid #446",
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => loadBuild(tpl.name)}
              title={`Load "${tpl.name}" (${tpl.characterType})`}
              style={{
                background: "#1a1a2a",
                border: "none",
                color: "#aad4ff",
                cursor: "pointer",
                fontSize: 13,
                padding: "4px 10px",
              }}
            >
              {tpl.characterType === "jedi" ? "⚡ " : ""}{tpl.name}
            </button>
            <button
              onClick={() => deleteBuild(tpl.name)}
              title={`Delete "${tpl.name}"`}
              style={{
                background: "#1a1a2a",
                border: "none",
                borderLeft: "1px solid #333",
                color: "#664",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 7px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        ))}

        {Object.keys(templates).length === 0 && (
          <span style={{ color: "#444", fontSize: 12 }}>No saved builds yet</span>
        )}

        {/* ── Export / Import separator ── */}
        <span style={{ color: "#333", fontSize: 18, userSelect: "none" }}>|</span>

        {/* Export */}
        <button
          onClick={exportBuild}
          title="Encode your current build to a shareable code"
          style={{
            background: "#1a2030",
            border: "1px solid #446",
            borderRadius: 6,
            color: "#aad4ff",
            cursor: "pointer",
            fontSize: 13,
            padding: "4px 12px",
          }}
        >
          📤 Share
        </button>

        {/* Show the share code with a one-click copy button */}
        {shareCode && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <code style={{
              background: "#111",
              border: "1px solid #446",
              borderRadius: 6,
              color: "#aad4ff",
              fontSize: 11,
              fontFamily: "monospace",
              padding: "4px 8px",
              maxWidth: 160,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}>
              {shareCode}
            </code>
            <button
              onClick={copyShareCode}
              title="Copy to clipboard"
              style={{
                background: shareCopied ? "#1a3a1a" : "#1a2030",
                border: `1px solid ${shareCopied ? "#44aa44" : "#446"}`,
                borderRadius: 6,
                color: shareCopied ? "#88ee88" : "#aad4ff",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 10px",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {shareCopied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        )}

        {/* Import */}
        <input
          type="text"
          placeholder="Paste build code…"
          value={importInput}
          onChange={(e) => { setImportInput(e.target.value); setImportError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") importBuild(); }}
          style={{
            background: importError ? "#2a1a1a" : "#222",
            border: `1px solid ${importError ? "#883333" : "#444"}`,
            borderRadius: 6,
            color: importError ? "#ff7777" : "#eee",
            fontSize: 13,
            padding: "4px 10px",
            width: 200,
            outline: "none",
          }}
        />
        <button
          onClick={importBuild}
          disabled={!importInput.trim()}
          style={{
            background: importInput.trim() ? "#1a2030" : "#1a1a1a",
            border: "1px solid #446",
            borderRadius: 6,
            color: importInput.trim() ? "#aad4ff" : "#555",
            cursor: importInput.trim() ? "pointer" : "default",
            fontSize: 13,
            padding: "4px 12px",
          }}
        >
          📥 Import
        </button>
        {importError && (
          <span style={{ color: "#ff7777", fontSize: 12 }}>{importError}</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: panelOpen ? "180px 2fr 1fr" : "180px 1fr", gap: 20 }}>

        {/* ── Tree sidebar (all character types) ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          background: "#0e0e0e",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          padding: "8px 0",
          alignSelf: "start",
          maxHeight: "80vh",
          overflowY: "auto",
        }}>
          {activeTreeGroups.map((group) => {
              const groupTrees = group.keys
                .map((key) => availableTrees.find((t) => t.key === key))
                .filter(Boolean) as typeof availableTrees;
              if (groupTrees.length === 0) return null;
              return (
                <div key={group.label}>
                  <div style={{
                    padding: "6px 12px 3px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#7a5c22",
                    borderTop: "1px solid #1e1e1e",
                    marginTop: 2,
                  }}>
                    {group.label}
                  </div>
                  {groupTrees.map((tree) => {
                    const pts = Object.values(selectionsByTree[tree.id] ?? {}).reduce((s, v) => s + v, 0);
                    const isActive = tree.id === treeId;
                    return (
                      <button
                        key={tree.id}
                        onClick={() => { setTreeId(tree.id); setSelectedNode(null); }}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                          padding: "5px 12px",
                          background: isActive ? "#1a2e10" : "transparent",
                          border: "none",
                          borderLeft: `3px solid ${isActive ? "#66bb33" : "transparent"}`,
                          color: isActive ? "#aaee66" : pts > 0 ? "#ccaa55" : "#666",
                          cursor: "pointer",
                          fontSize: 12,
                          textAlign: "left",
                          transition: "background 0.1s, color 0.1s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#181818";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        <span>{TREE_NAMES[tree.key] ?? formatTreeName(tree.key)}</span>
                        {pts > 0 && (
                          <span style={{
                            fontSize: 10,
                            background: isActive ? "#2a4a18" : "#2a2a18",
                            color: isActive ? "#aaee66" : "#998833",
                            borderRadius: 8,
                            padding: "1px 5px",
                            marginLeft: 4,
                          }}>
                            {pts}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

        <div>
          {currentTree && (() => {
            // Build branch chips: gateway nodeId → [target tree key, ...]
            type BranchChip = {
              gatewayNodeId: string;
              gatewayName: string;
              targetKey: string;
              isActive: boolean;
            };
            const chips: BranchChip[] = [];
            for (const [gatewayNodeId, targetKeys] of currentTreeBranches.entries()) {
              const gatewayNode = currentTree.nodes.find((n) => n.nodeId === gatewayNodeId);
              const isActive = (selectedRanks[gatewayNodeId] ?? 0) > 0;
              for (const targetKey of targetKeys) {
                chips.push({
                  gatewayNodeId,
                  gatewayName: formatNodeName(gatewayNode?.displayName ?? gatewayNodeId),
                  targetKey,
                  isActive,
                });
              }
            }
            // Deduplicate by target tree — only the first (most prominent) gateway per tree
            const seenTargets = new Set<string>();
            const uniqueChips = chips.filter((c) => {
              if (seenTargets.has(c.targetKey)) return false;
              seenTargets.add(c.targetKey);
              return true;
            });
            // Sort: active (invested) first, then alphabetically by target name
            uniqueChips.sort((a, b) => {
              if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
              return formatTreeName(a.targetKey).localeCompare(formatTreeName(b.targetKey));
            });

            return (
              <>
                {uniqueChips.length > 0 && (
                  <div style={{
                    marginBottom: 10,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "linear-gradient(135deg, #0a1520 0%, #0c1a28 100%)",
                    borderRadius: 8,
                    border: "1px solid #1a3050",
                  }}>
                    <span style={{
                      fontSize: 10,
                      color: "#2a5070",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      fontFamily: "'Orbitron', sans-serif",
                      flexShrink: 0,
                      marginRight: 2,
                    }}>
                      Branch To:
                    </span>
                    {uniqueChips.map(({ gatewayNodeId, gatewayName, targetKey, isActive }) => {
                      const targetTree = availableTrees.find((t) => t.key === targetKey)
                        ?? allTrees.find((t) => t.key === targetKey);
                      return (
                        <button
                          key={`${gatewayNodeId}-${targetKey}`}
                          onClick={() => {
                            if (!targetTree || !isActive) return;
                            setTreeId(targetTree.id);
                            setSelectedNode(null);
                          }}
                          title={
                            isActive
                              ? `Go to ${formatTreeName(targetKey)} — unlocked via ${gatewayName}`
                              : `Invest in "${gatewayName}" to unlock ${formatTreeName(targetKey)}`
                          }
                          style={{
                            padding: "4px 11px",
                            borderRadius: 6,
                            border: isActive
                              ? "1px solid #2a7040"
                              : "1px solid #1a2a38",
                            background: isActive
                              ? treeId === targetTree?.id ? "#0d2a18" : "#0d1e14"
                              : "#0a1520",
                            color: isActive
                              ? treeId === targetTree?.id ? "#88ffaa" : "#55cc77"
                              : "#253a48",
                            cursor: isActive && targetTree ? "pointer" : "default",
                            fontSize: 12,
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 600,
                            letterSpacing: "0.04em",
                            opacity: isActive ? 1 : 0.45,
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "all 0.15s",
                            boxShadow: isActive && treeId === targetTree?.id
                              ? "0 0 8px rgba(80,200,100,0.25)"
                              : "none",
                          }}
                        >
                          <span style={{ fontSize: 10, opacity: 0.8 }}>⇒</span>
                          {formatTreeName(targetKey)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <ExpertiseTree
                  nodes={currentTree.nodes}
                  selectedRanks={selectedRanks}
                  onIncrease={increaseRank}
                  onDecrease={decreaseRank}
                  onSelectNode={setSelectedNode}
                  canIncrease={(node) =>
                    canIncreaseRank(
                      node,
                      currentTree.nodes,
                      selectedRanks,
                      data.trees,
                      selectionsByTree,
                      currentTree.key,
                    )
                  }
                  canDecrease={(node) =>
                    canDecreaseRank(
                      node,
                      treeId!,
                      currentTree.nodes,
                      selectedRanks,
                      data.trees,
                      selectionsByTree,
                      currentTree.key,
                    )
                  }
                  getNodeDisabledReason={getNodeDisabledReason}
                  formatStat={(key) => formatStatKey(key, stringTables)}
                  formatCmd={(key) => formatCmdKey(key, stringTables)}
                  nodeIcons={nodeIcons ?? undefined}
                  treeKey={currentTree.key}
                  onAutoFill={handleAutoFill}
                />

                {/* ── Node Detail Panel ─────────────────────────────── */}
                <div style={{
                  marginTop: 14,
                  background: "linear-gradient(160deg, #060d16 0%, #080f1a 100%)",
                  border: "1px solid #1a3050",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  {!selectedNode ? (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      height: 110, color: "#1a3a50", fontSize: 13, fontStyle: "italic",
                      fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.05em",
                    }}>
                      Select a node to view rank details
                    </div>
                  ) : (() => {
                    const invested = selectedRanks[selectedNode.nodeId] ?? 0;
                    const sortedRanks = selectedNode.ranks
                      .slice()
                      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

                    return (
                      <>
                        {/* Header */}
                        <div style={{
                          padding: "10px 16px",
                          borderBottom: "1px solid #1a3050",
                          background: "rgba(8, 18, 32, 0.9)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{
                              fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                              fontSize: 16, color: "#c8dff0", letterSpacing: "0.05em",
                            }}>
                              {formatNodeName(selectedNode.displayName)}
                            </span>
                            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                              {Array.from({ length: selectedNode.maxRank }, (_, i) => (
                                <div key={i} style={{
                                  width: 9, height: 9, borderRadius: 2,
                                  background: i < invested
                                    ? invested === selectedNode.maxRank ? "#4ab3e8" : "#2a8050"
                                    : "#1a2e40",
                                  boxShadow: i < invested ? "0 0 4px rgba(74,179,232,0.3)" : "none",
                                  transition: "background 0.2s",
                                }} />
                              ))}
                            </div>
                            <span style={{
                              color: "#2a6080", fontSize: 11,
                              fontFamily: "'Orbitron', sans-serif",
                            }}>
                              {invested} / {selectedNode.maxRank}
                            </span>
                          </div>
                          <div style={{ color: "#1e3e5a", fontSize: 11, textAlign: "right" }}>
                            Tier {selectedNode.tier} · Grid {selectedNode.grid}
                            {sortedRanks[0]?.xpCost
                              ? <span style={{ marginLeft: 8 }}>
                                  {sortedRanks[0].xpCost.toLocaleString()} XP / rank
                                </span>
                              : null}
                          </div>
                        </div>

                        {/* Ability description + cumulative panel */}
                        {(() => {
                          const isSingleRank = selectedNode.maxRank === 1;
                          const rank1Entry = sortedRanks[0];
                          const perRankMods = (rank1Entry?.skillMods ?? []).filter(m => m.key);
                          const allCmds = [...new Set(
                            sortedRanks.flatMap(r => [...r.commands, ...r.skillAbility]).filter(Boolean)
                          )];

                          // Cumulative totals across all invested ranks
                          const investedEntries = sortedRanks.filter(r => (r.rank ?? 0) <= invested);
                          const cumulativeMods: Record<string, number> = {};
                          for (const r of investedEntries) {
                            for (const mod of r.skillMods ?? []) {
                              if (mod.key) cumulativeMods[mod.key] = (cumulativeMods[mod.key] ?? 0) + mod.value;
                            }
                          }
                          const investedCmds = [...new Set(
                            investedEntries.flatMap(r => [...r.commands, ...r.skillAbility]).filter(Boolean)
                          )];

                          const modRow = (key: string, val: number, isCumulative: boolean) => {
                            const derivedEntries = STAT_MULTIPLIERS[key];
                            const accentColor = CORE_STAT_COLORS[key];
                            return (
                              <div key={key} style={{ marginBottom: 4 }}>
                                <div style={{
                                  display: "flex", justifyContent: "space-between",
                                  alignItems: "baseline", gap: 4, fontSize: 11,
                                  marginBottom: derivedEntries ? 2 : 0,
                                }}>
                                  <span style={{ color: accentColor ?? "#6a9ab0", lineHeight: 1.3, fontWeight: derivedEntries ? 600 : 400 }}>
                                    {formatStatKey(key, stringTables)}
                                  </span>
                                  <span style={{
                                    color: val > 0 ? (isCumulative ? "#44cc77" : "#55bb33") : "#cc4444",
                                    fontFamily: "'Orbitron', sans-serif", fontSize: 10, flexShrink: 0,
                                    fontWeight: isCumulative ? 700 : 400,
                                  }}>
                                    {val > 0 ? "+" : ""}{val}
                                  </span>
                                </div>
                                {derivedEntries && (
                                  <div style={{ paddingLeft: 8, borderLeft: `2px solid ${accentColor ?? "#2a5070"}44`, marginLeft: 2 }}>
                                    {derivedEntries.map(entry => {
                                      const derived = val * entry.mult;
                                      return (
                                        <div key={entry.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#4a7090", lineHeight: 1.4 }}>
                                          <span>{entry.label}</span>
                                          <span style={{ flexShrink: 0, marginLeft: 4, color: isCumulative ? "#44aa66" : "#3a8a55" }}>
                                            {fmtDerived(derived, entry)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          };

                          const cmdRow = (cmd: string, unlocked: boolean) => {
                            const rawDesc = cmdDescriptions[cmd] ?? "";
                            const displayName = formatCmdKey(cmd, stringTables);
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
                                <div style={{ fontSize: 8, letterSpacing: "0.15em", textTransform: "uppercase", color: unlocked ? "#1a8060" : "#1a6080", marginBottom: 2 }}>
                                  {unlocked ? "✓ Unlocked" : "Grants Ability"}
                                </div>
                                <div style={{ fontSize: 11, color: unlocked ? "#44cc88" : "#5ab0d4", lineHeight: 1.3 }}>
                                  {displayName}
                                </div>
                                {descText && (
                                  <div style={{ fontSize: 10, color: "#4a7090", lineHeight: 1.45, marginTop: 3, paddingLeft: 6, borderLeft: "2px solid #1a4060" }}>
                                    {descText}
                                  </div>
                                )}
                              </div>
                            );
                          };

                          const isEmpty = perRankMods.length === 0 && allCmds.length === 0;

                          // Single-rank: clean single-column layout
                          if (isSingleRank) {
                            return (
                              <div style={{ padding: "12px 16px" }}>
                                {isEmpty ? (
                                  <div style={{ color: "#152030", fontSize: 11, fontStyle: "italic", textAlign: "center" }}>—</div>
                                ) : (
                                  <>
                                    {perRankMods.map(mod => modRow(mod.key, invested > 0 ? (cumulativeMods[mod.key] ?? mod.value) : mod.value, invested > 0))}
                                    {allCmds.map(cmd => cmdRow(cmd, invested > 0 && investedCmds.includes(cmd)))}
                                  </>
                                )}
                              </div>
                            );
                          }

                          // Multi-rank: two-column (Per Rank | Total at X/Y)
                          return (
                            <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                              {/* Left: Per Rank */}
                              <div>
                                <div style={{
                                  fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                                  color: "#2a5070", marginBottom: 6, fontFamily: "'Orbitron', sans-serif",
                                  paddingBottom: 4, borderBottom: "1px solid #0d1e2e",
                                }}>
                                  Per Rank
                                </div>
                                {isEmpty ? (
                                  <div style={{ color: "#152030", fontSize: 11, fontStyle: "italic" }}>—</div>
                                ) : (
                                  <>
                                    {perRankMods.map(mod => modRow(mod.key, mod.value, false))}
                                    {allCmds.map(cmd => cmdRow(cmd, false))}
                                  </>
                                )}
                              </div>

                              {/* Right: Cumulative total */}
                              <div>
                                <div style={{
                                  fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase",
                                  color: invested > 0 ? "#2a7a50" : "#1a3050", marginBottom: 6,
                                  fontFamily: "'Orbitron', sans-serif",
                                  paddingBottom: 4, borderBottom: `1px solid ${invested > 0 ? "#0d2e1e" : "#0d1e2e"}`,
                                }}>
                                  Total · {invested}/{selectedNode.maxRank}
                                </div>
                                {invested === 0 ? (
                                  <div style={{ color: "#1a3050", fontSize: 11, fontStyle: "italic" }}>No points invested</div>
                                ) : (
                                  <>
                                    {Object.entries(cumulativeMods).map(([key, val]) => modRow(key, val, true))}
                                    {investedCmds.map(cmd => cmdRow(cmd, true))}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </>
                    );
                  })()}
                </div>
                {/* ── /Node Detail Panel ────────────────────────────── */}

              </>
            );
          })()}

          {/* ── Heroic Jewelry Sets ────────────────────────────── */}
          <HeroicJewelry
            characterType={characterType}
            formatStat={(key) => formatStatKey(key, stringTables)}
            abilityDescriptions={jewelryAbilityDescs}
            onAbilityClick={(key) => { setViewMode("codex"); setFocusAbilityKey(key); }}
          />
        </div>

        {panelOpen ? (
          <div
            style={{
              border: "1px solid #1a3050",
              borderRadius: 12,
              padding: 16,
              background: "linear-gradient(160deg, #0c1520 0%, #0d1825 100%)",
              position: "relative",
              boxShadow: "0 2px 20px rgba(0,80,160,0.15)",
            }}
          >
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "#4ab3e8",
                fontFamily: "'Orbitron', sans-serif",
                fontWeight: 600,
              }}>
                Build Summary
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                title="Collapse panel"
                style={{
                  background: "transparent",
                  border: "1px solid #1e3048",
                  borderRadius: 6,
                  color: "#4a7090",
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: "3px 8px",
                  transition: "border-color 0.2s, color 0.2s",
                }}
              >
                ▶
              </button>
            </div>

            {/* Points bar */}
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                background: totalPointsSpent >= MAX_EXPERTISE_POINTS
                  ? "linear-gradient(135deg, #200a0a, #2a1010)"
                  : "linear-gradient(135deg, #0a1a0a, #0d2010)",
                border: `1px solid ${totalPointsSpent >= MAX_EXPERTISE_POINTS ? "#6a2020" : "#1a4020"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#4a7090", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Expertise Points
                </span>
                <span style={{
                  color: totalPointsSpent >= MAX_EXPERTISE_POINTS ? "#ff6060" : "#66cc44",
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: "'Orbitron', sans-serif",
                }}>
                  {totalPointsSpent}<span style={{ fontSize: 11, opacity: 0.6 }}> / {MAX_EXPERTISE_POINTS}</span>
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, borderRadius: 2, background: "#0d1e10", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  width: `${Math.min(100, (totalPointsSpent / MAX_EXPERTISE_POINTS) * 100)}%`,
                  background: totalPointsSpent >= MAX_EXPERTISE_POINTS
                    ? "linear-gradient(90deg, #cc3333, #ff5555)"
                    : "linear-gradient(90deg, #336633, #66cc44)",
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                  boxShadow: totalPointsSpent >= MAX_EXPERTISE_POINTS
                    ? "0 0 6px rgba(200,60,60,0.6)"
                    : "0 0 6px rgba(100,200,60,0.5)",
                }} />
              </div>
              {totalPointsSpent >= MAX_EXPERTISE_POINTS && (
                <div style={{ marginTop: 4, fontSize: 10, color: "#ff9966", letterSpacing: "0.1em" }}>
                  ● POOL FULL
                </div>
              )}
            </div>

            {/* FRS display — Jedi only */}
            {characterType === "jedi" && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #0d0a1a, #170d2a)",
                  border: `1px solid ${frsRank >= MAX_FRS_RANK ? "#7a40c8" : "#3a1a60"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9060d0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    FRS Rank
                  </span>
                  <span style={{
                    color: frsRank >= MAX_FRS_RANK ? "#cc99ff" : "#aa80ff",
                    fontWeight: 700, fontSize: 16,
                    fontFamily: "'Orbitron', sans-serif",
                  }}>
                    {frsRank}<span style={{ fontSize: 11, opacity: 0.6 }}> / {MAX_FRS_RANK}</span>
                  </span>
                </div>
                {/* FRS points bar */}
                <div style={{ height: 4, borderRadius: 2, background: "#0d0820", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, (frsRank / MAX_FRS_RANK) * 100)}%`,
                    background: frsRank >= MAX_FRS_RANK
                      ? "linear-gradient(90deg, #7733cc, #cc66ff)"
                      : "linear-gradient(90deg, #4a1a90, #9955dd)",
                    borderRadius: 2,
                    transition: "width 0.3s ease",
                    boxShadow: "0 0 6px rgba(160,80,255,0.5)",
                  }} />
                </div>
                {frsRank >= MAX_FRS_RANK && (
                  <div style={{ marginTop: 4, fontSize: 10, color: "#cc99ff", letterSpacing: "0.1em" }}>
                    ● FRS RANK MAX
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#4ab3e8",
                fontFamily: "'Orbitron', sans-serif",
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: "1px solid #1a3050",
              }}>
                Bonuses
              </div>
              {Object.keys(totals.mods).length === 0 ? (
                <div style={{ color: "#2a5070", fontSize: 12, fontStyle: "italic" }}>No bonuses selected</div>
              ) : (() => {
                // ── Category definitions (matched against formatted display name) ──
                const CATS = [
                  { id: "damage",   label: "Damage",        color: "#c84040", test: (s: string) => /damage increase/i.test(s) },
                  { id: "defense",  label: "Defense",       color: "#4a88c8", test: (s: string) => /defens|block chance|dodge|parry|evasion|mitigation|armor|resist|damage taken/i.test(s) },
                  { id: "action",   label: "Action Cost",   color: "#c8a040", test: (s: string) => /action cost/i.test(s) },
                  { id: "cooldown", label: "Cooldown",      color: "#8040c8", test: (s: string) => /cooldown/i.test(s) },
                  { id: "dot",      label: "DoT Effects",   color: "#c06030", test: (s: string) => /\bdot\b/i.test(s) },
                  { id: "healing",  label: "Healing",       color: "#40aa60", test: (s: string) => /heal/i.test(s) },
                  { id: "speed",    label: "Speed",         color: "#40b8c8", test: (s: string) => /speed|movement/i.test(s) },
                  { id: "other",    label: "Other",         color: "#607080", test: () => true },
                ] as const;

                // Bucket each stat into the first matching category
                const grouped: Record<string, Array<[string, number]>> = {};
                for (const cat of CATS) grouped[cat.id] = [];
                for (const [key, value] of Object.entries(totals.mods)) {
                  const display = formatStatKey(key, stringTables);
                  const match = CATS.find((c) => c.test(display));
                  grouped[(match ?? CATS[CATS.length - 1]).id].push([key, value]);
                }
                // Sort alphabetically within each group
                for (const cat of CATS) {
                  grouped[cat.id].sort(([a], [b]) =>
                    formatStatKey(a, stringTables).localeCompare(formatStatKey(b, stringTables))
                  );
                }

                const activeGroups = CATS.filter((c) => grouped[c.id].length > 0);

                return (
                  <div>
                    {activeGroups.map((cat, gi) => (
                      <div key={cat.id} style={{ marginBottom: gi < activeGroups.length - 1 ? 6 : 0 }}>
                        {/* Category header */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: gi > 0 ? 8 : 0,
                          marginBottom: 2,
                        }}>
                          <div style={{
                            width: 3, height: 10, borderRadius: 2,
                            background: cat.color, flexShrink: 0,
                            boxShadow: `0 0 4px ${cat.color}88`,
                          }} />
                          <span style={{
                            fontSize: 9,
                            letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: cat.color,
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            opacity: 0.85,
                          }}>
                            {cat.label}
                          </span>
                        </div>
                        {/* Entries */}
                        {grouped[cat.id].map(([key, value]) => {
                          const displayName = formatStatKey(key, stringTables);
                          // Strip trailing category keyword from display name for compactness
                          // e.g. "Cripple Damage Increase" under Damage → "Cripple"
                          // "Fencer Action Cost Reduction" under Action Cost → "Fencer"
                          const SUFFIXES: Record<string, RegExp> = {
                            damage:   / Damage Increase$/i,
                            action:   / Action Cost Reduction$/i,
                            cooldown: / Cooldown Reduction$/i,
                            dot:      / (Damage Increase|Duration Increase)$/i,
                            healing:  / (Potency|Hate Reduction|Reduction)$/i,
                          };
                          const suffix = SUFFIXES[cat.id];
                          const shortName = suffix ? displayName.replace(suffix, "") : displayName;
                          const wasShortened = shortName !== displayName;
                          return (
                            <div key={key} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "baseline",
                              padding: "2px 0 2px 9px",
                              borderBottom: "1px solid #0a1820",
                              fontSize: 12,
                            }}>
                              <span style={{ color: "#7a9ab8", lineHeight: 1.3 }}>
                                {shortName}
                                {wasShortened && (
                                  <span style={{ color: "#2a4a60", fontSize: 10, marginLeft: 3 }}>
                                    {/* invisible — just note the suffix was stripped */}
                                  </span>
                                )}
                              </span>
                              <span style={{
                                color: value > 0 ? "#66cc44" : "#ff6666",
                                fontWeight: 700, marginLeft: 8, flexShrink: 0,
                                fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                              }}>
                                {value > 0 ? "+" : ""}{value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* ── Combat Stats from Core Attributes ─────────────────── */}
            {(() => {
              const coreKeys = Object.keys(STAT_MULTIPLIERS);
              const active = coreKeys.filter(k => (totals.mods[k] ?? 0) !== 0);
              if (active.length === 0) return null;
              return (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase",
                    color: "#4ab3e8", fontFamily: "'Orbitron', sans-serif",
                    marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1a3050",
                  }}>
                    Combat Stats
                  </div>
                  {active.map((statKey, gi) => {
                    const statVal = totals.mods[statKey] ?? 0;
                    const accentColor = CORE_STAT_COLORS[statKey] ?? "#4ab3e8";
                    return (
                      <div key={statKey} style={{ marginBottom: gi < active.length - 1 ? 8 : 0 }}>
                        {/* Stat label */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          marginBottom: 2,
                        }}>
                          <div style={{
                            width: 3, height: 10, borderRadius: 2,
                            background: accentColor, flexShrink: 0,
                            boxShadow: `0 0 4px ${accentColor}88`,
                          }} />
                          <span style={{
                            fontSize: 9, letterSpacing: "0.2em",
                            textTransform: "uppercase",
                            color: accentColor,
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700, opacity: 0.9,
                          }}>
                            {CORE_STAT_LABELS[statKey]}&nbsp;
                            <span style={{ opacity: 0.6 }}>
                              ({statVal > 0 ? "+" : ""}{statVal} pts)
                            </span>
                          </span>
                        </div>
                        {STAT_MULTIPLIERS[statKey].map(entry => {
                          const derived = statVal * entry.mult;
                          return (
                            <div key={entry.label} style={{
                              display: "flex", justifyContent: "space-between",
                              alignItems: "baseline",
                              padding: "2px 0 2px 9px",
                              borderBottom: "1px solid #0a1820",
                              fontSize: 12,
                            }}>
                              <span style={{ color: "#7a9ab8" }}>{entry.label}</span>
                              <span style={{
                                color: "#66cc44",
                                fontWeight: 700, marginLeft: 8, flexShrink: 0,
                                fontFamily: "'Orbitron', sans-serif", fontSize: 11,
                              }}>
                                {fmtDerived(derived, entry)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase",
                color: "#4ab3e8", fontFamily: "'Orbitron', sans-serif",
                marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1a3050",
              }}>
                Commands &amp; Abilities
              </div>
              {totals.commands.length === 0 ? (
                <div style={{ color: "#2a5070", fontSize: 12, fontStyle: "italic" }}>None unlocked</div>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {totals.commands.map((cmd) => (
                    <li key={cmd} style={{
                      padding: "3px 0", borderBottom: "1px solid #0f2030",
                      color: "#4ab3e8", fontSize: 12,
                      display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ color: "#1e4060", fontSize: 8 }}>◆</span>
                      {formatCmdKey(cmd, stringTables)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div style={{
                fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase",
                color: "#4ab3e8", fontFamily: "'Orbitron', sans-serif",
                marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #1a3050",
              }}>
                Selected Node
              </div>
              {!selectedNode ? (
                <div style={{ color: "#2a5070", fontSize: 12, fontStyle: "italic" }}>Click a node to inspect</div>
              ) : (
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: "#c8dff0", fontSize: 14, marginBottom: 6, fontFamily: "'Rajdhani', sans-serif" }}>
                    {formatNodeName(selectedNode.displayName)}
                  </div>
                  <div style={{ color: "#4a7090", marginBottom: 2 }}>
                    Tier {selectedNode.tier} · Grid {selectedNode.grid}
                  </div>
                  <div style={{ color: "#4a7090" }}>
                    Rank{" "}
                    <span style={{ color: "#66cc44", fontWeight: 700 }}>
                      {selectedRanks[selectedNode.nodeId] ?? 0}
                    </span>
                    {" / "}{selectedNode.maxRank}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed strip */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              border: "1px solid #1a3050",
              borderRadius: 12,
              padding: "12px 6px",
              background: "linear-gradient(160deg, #0c1520, #0d1825)",
              width: 36,
              justifySelf: "end",
            }}
          >
            <button
              onClick={() => setPanelOpen(true)}
              title="Expand panel"
              style={{
                background: "transparent",
                border: "1px solid #1e3048",
                borderRadius: 6,
                color: "#4a7090",
                cursor: "pointer",
                fontSize: 13,
                lineHeight: 1,
                padding: "3px 6px",
              }}
            >
              ◀
            </button>
            <div
              style={{
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                fontSize: 10,
                color: totalPointsSpent >= MAX_EXPERTISE_POINTS ? "#ff6060" : "#66cc44",
                fontWeight: 700,
                marginTop: 4,
                fontFamily: "'Orbitron', sans-serif",
              }}
            >
              {totalPointsSpent}/{MAX_EXPERTISE_POINTS}
            </div>
          </div>
        )}
      </div>
      </>)} {/* end calculator view */}
    </div> {/* end page body */}

    {/* Auto-fill modal — rendered via portal into document.body */}
    {autoFillModal && (
      <AutoFillModal
        targetName={autoFillModal.node.displayName}
        result={autoFillModal.result}
        currentTotal={totalPointsSpent}
        onApply={applyAutoFill}
        onCancel={() => setAutoFillModal(null)}
      />
    )}
    </div>
  );
}