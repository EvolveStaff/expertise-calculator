import fs from "node:fs";
import path from "node:path";

function readTab(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 3) {
    throw new Error(`Tab file too short: ${filePath}`);
  }

  const headers = lines[0].split("\t");
  const dataLines = lines.slice(2); // skip type row

  return dataLines.map((line, index) => {
    const cols = line.split("\t");
    const row = {};

    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = cols[i] ?? "";
    }

    row.__line = index + 3;
    return row;
  });
}

function parseIntSafe(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const n = parseInt(String(value), 10);
  return Number.isNaN(n) ? null : n;
}

function shouldSkipByName(name) {
  if (!name) return false;
  return String(name).toLowerCase().includes("placeholder");
}

function parseListField(value) {
  if (!value || !String(value).trim()) return [];
  return String(value)
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseSkillMods(value) {
  if (!value || !String(value).trim()) return [];

  return String(value)
    .split(/[;,]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const eqIndex = entry.indexOf("=");
      if (eqIndex === -1) {
        return { key: entry, value: null, raw: entry };
      }

      const key = entry.slice(0, eqIndex).trim();
      const rawValue = entry.slice(eqIndex + 1).trim();
      const numericValue = Number(rawValue);

      return {
        key,
        value: Number.isNaN(numericValue) ? rawValue : numericValue,
        raw: entry,
      };
    });
}

function deriveNodeId(name) {
  const match = String(name).match(/^(.*)_(\d+)$/);
  return match ? match[1] : String(name);
}

function deriveDisplayName(nodeId) {
  const cleaned = String(nodeId).replace(/^expertise_/, "");
  const parts = cleaned.split("_");

  const blacklist = new Set([
    "combat",
    "crafting",
    "social",
    "brawler",
    "commando",
    "rifleman",
    "carbine",
    "pistol",
    "officer",
    "smuggler",
    "spy",
    "medic",
    "jedi",
    "general",
  ]);

  const filtered = parts.filter((p) => !blacklist.has(p.toLowerCase()));
  const finalParts = filtered.length > 0 ? filtered : parts;

  return finalParts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      values
        .flat()
        .filter(Boolean)
        .map((v) => String(v).trim())
        .filter(Boolean)
    )
  );
}

const root = process.cwd();
const dataDir = path.join(root, "data");
const warnings = [];

const treeRows = readTab(path.join(dataDir, "expertise_trees.tab")).filter(
  (row) => !shouldSkipByName(row.expertise_tree_string_id)
);

const expertiseRows = readTab(path.join(dataDir, "expertise.tab")).filter(
  (row) => !shouldSkipByName(row.NAME)
);

const skillsRows = readTab(path.join(dataDir, "skills.tab")).filter(
  (row) => !shouldSkipByName(row.NAME)
);

const treesById = new Map();
for (const row of treeRows) {
  const id = parseIntSafe(row.expertise_tree_id);
  if (id === null) continue;

  treesById.set(id, {
    id,
    key: row.expertise_tree_string_id || "",
    uiBackgroundId: row.ui_background_id || "",
    nodes: [],
  });
}

const skillsByName = new Map();
for (const row of skillsRows) {
  skillsByName.set(row.NAME, row);
}

const rankedEntries = [];

for (const eRow of expertiseRows) {
  const skillRow = skillsByName.get(eRow.NAME);

  if (!skillRow) {
    warnings.push(`Missing skills.tab row for ${eRow.NAME}`);
  }

  rankedEntries.push({
    name: eRow.NAME,
    nodeId: deriveNodeId(eRow.NAME),
    displayName: deriveDisplayName(deriveNodeId(eRow.NAME)),
    treeId: parseIntSafe(eRow.TREE),
    tier: parseIntSafe(eRow.TIER),
    grid: parseIntSafe(eRow.GRID),
    rank: parseIntSafe(eRow.RANK),
    reqProf: eRow.REQ_PROF || "",
    prereqLevel: parseIntSafe(eRow.PREREQ_LEVEL),

    parent: skillRow?.PARENT || "",
    skillsRequired: parseListField(skillRow?.SKILLS_REQUIRED || ""),
    skillsRequiredCount: parseIntSafe(skillRow?.SKILLS_REQUIRED_COUNT),
    preclusionSkills: parseListField(skillRow?.PRECLUSION_SKILLS || ""),
    xpType: skillRow?.XP_TYPE || "",
    xpCost: parseIntSafe(skillRow?.XP_COST),
    skillAbility: parseListField(skillRow?.SKILL_ABILITY || ""),
    commands: parseListField(skillRow?.COMMANDS || ""),
    skillMods: parseSkillMods(skillRow?.SKILL_MODS || ""),
  });
}

const grouped = new Map();

for (const entry of rankedEntries) {
  if (entry.treeId === null) {
    warnings.push(`Missing treeId for ${entry.name}`);
    continue;
  }

  const key = `${entry.treeId}::${entry.nodeId}`;
  const existing = grouped.get(key);

  if (!existing) {
    grouped.set(key, {
      nodeId: entry.nodeId,
      treeId: entry.treeId,
      tier: entry.tier,
      grid: entry.grid,
      displayName: entry.displayName,
      maxRank: 0,

      // NEW: node-level rolled up prereq fields
      skillsRequired: [...entry.skillsRequired],
      skillsRequiredCount: entry.skillsRequiredCount,
      preclusionSkills: [...entry.preclusionSkills],
      reqProf: entry.reqProf || "",
      prereqLevel: entry.prereqLevel,

      ranks: [entry],
    });
  } else {
    if (existing.tier !== entry.tier || existing.grid !== entry.grid) {
      warnings.push(
        `Grouped node has inconsistent position: ${entry.nodeId} (${entry.name})`
      );
    }

    existing.ranks.push(entry);

    // NEW: merge prereqs across all ranks so the node has a usable top-level field
    existing.skillsRequired = uniqueStrings([
      existing.skillsRequired,
      entry.skillsRequired,
    ]);

    existing.preclusionSkills = uniqueStrings([
      existing.preclusionSkills,
      entry.preclusionSkills,
    ]);

    if (
      existing.skillsRequiredCount === null &&
      entry.skillsRequiredCount !== null
    ) {
      existing.skillsRequiredCount = entry.skillsRequiredCount;
    }

    if (!existing.reqProf && entry.reqProf) {
      existing.reqProf = entry.reqProf;
    }

    if (existing.prereqLevel === null && entry.prereqLevel !== null) {
      existing.prereqLevel = entry.prereqLevel;
    }
  }
}

for (const node of grouped.values()) {
  node.ranks.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  node.maxRank = node.ranks.length;

  const tree = treesById.get(node.treeId);
  if (!tree) {
    warnings.push(`Node references missing treeId ${node.treeId}: ${node.nodeId}`);
    continue;
  }

  tree.nodes.push(node);
}

const trees = Array.from(treesById.values())
  .sort((a, b) => a.id - b.id)
  .map((tree) => {
    tree.nodes.sort((a, b) => {
      if ((a.tier ?? 0) !== (b.tier ?? 0)) return (a.tier ?? 0) - (b.tier ?? 0);
      if ((a.grid ?? 0) !== (b.grid ?? 0)) return (a.grid ?? 0) - (b.grid ?? 0);
      return a.nodeId.localeCompare(b.nodeId);
    });
    return tree;
  });

const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    sourceFiles: ["expertise_trees.tab", "expertise.tab", "skills.tab"],
    warningCount: warnings.length,
  },
  trees,
  warnings,
};

const outDir = path.join(root, "public", "data");
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
  path.join(outDir, "expertise.json"),
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log("Generated public/data/expertise.json");
console.log(`Trees: ${trees.length}`);
console.log(`Warnings: ${warnings.length}`);