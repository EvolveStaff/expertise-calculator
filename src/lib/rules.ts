import type { VisibleNode, TreeData } from "./types";

type SelectedRanks = Record<string, number>;
type SelectionsByTree = Record<number, Record<string, number>>;

export const MAX_EXPERTISE_POINTS = 135;

// Standard formula:  tier 2=4,  3=8,  4=12, 5=16, 6=20   → (tier-1)*4
// Advanced formula:  tier 2=4,  3=8,  4=18, 5=24, 6=30
//   (used for advanced combat trees AND all Jedi advanced trees)
//   T1 access in Jedi trees is gated by skillsRequired (FS Master prereq),
//   not by the tier-point formula.  Per-node cross-prereqs (e.g. Guardian
//   T4/G5 needing T4/G4 rank 4) are also handled by skillsRequired.
const ADVANCED_TIER_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 4, 3: 8, 4: 18, 5: 24, 6: 30,
};

export const ADVANCED_TREE_KEYS = new Set([
  "combat_teras_kasi",
  "combat_assassin",
  "combat_bountyhunter",
  "combat_smuggler",
  "combat_commando",
  "combat_grenadier",
  "science_doctor",
  "science_combatmedic",
  "outdoors_squadleader",
]);

// Jedi advanced trees use the same higher thresholds as advanced combat trees.
export const JEDI_ADVANCED_TREE_KEYS = new Set([
  "combat_battlemaster",
  "combat_guardian",
  "combat_mystic",
  "combat_sage",
  "jedi_forms",
]);

export const FORCE_SENSITIVE_TREE_KEY = "force_sensitive";

// Master nodes for each base melee combat tree (reaching these = "mastered" that tree)
export const MELEE_MASTER_NODES = new Set([
  "expertise_brawler_master",
  "expertise_fencer_master",
  "expertise_pikeman_master",
  "expertise_swordsman_master",
  "expertise_unarmed_master",
  "expertise_teras_kasi_master",
]);

// Master nodes for each base ranged combat tree
export const RANGED_MASTER_NODES = new Set([
  "expertise_marksman_master",
  "expertise_carbineer_master",
  "expertise_heavy_weapon_master",
  "expertise_pistoleer_master",
  "expertise_rifleman_master",
]);

type BranchGate = {
  requiresOneOf: string[];
  description: string;
};

// Trees that require mastery of a base combat skillset before any investment
export const TREE_BRANCH_GATES: Record<string, BranchGate> = {
  combat_assassin: {
    requiresOneOf: [...MELEE_MASTER_NODES, ...RANGED_MASTER_NODES],
    description: "Requires mastery of a Melee or Ranged combat tree",
  },
  combat_bountyhunter: {
    requiresOneOf: [...MELEE_MASTER_NODES, ...RANGED_MASTER_NODES],
    description: "Requires mastery of a Melee or Ranged combat tree",
  },
  combat_smuggler: {
    requiresOneOf: [...MELEE_MASTER_NODES, ...RANGED_MASTER_NODES],
    description: "Requires mastery of a Melee or Ranged combat tree",
  },
};

export function isBranchGateSatisfied(
  treeKey: string,
  globalSelectedRanks: SelectedRanks
): boolean {
  const gate = TREE_BRANCH_GATES[treeKey];
  if (!gate) return true;
  return gate.requiresOneOf.some((nodeId) => (globalSelectedRanks[nodeId] ?? 0) >= 1);
}

// Skill names in the source data use a _NN rank suffix (e.g. expertise_brawler_mdef_01).
// Strip the suffix to recover the nodeId and the minimum rank required.
// knownNodeIds: when a skill reference matches a known nodeId directly (e.g. a
// split-position node whose full name IS its nodeId), treat it as rank 1 of that node.
function parseSkillName(
  skillName: string,
  knownNodeIds?: Set<string>
): { nodeId: string; rank: number } {
  if (knownNodeIds?.has(skillName)) {
    return { nodeId: skillName, rank: 1 };
  }
  const match = skillName.match(/^(.+)_(\d+)$/);
  if (match) {
    return { nodeId: match[1], rank: parseInt(match[2], 10) };
  }
  return { nodeId: skillName, rank: 1 };
}

// Returns deduplicated cross-node requirements, filtering out self-referential
// rank-chain entries (each rank requiring the previous rank of the same node).
function getRequiredSkills(
  node: VisibleNode,
  allNodes: VisibleNode[]
): Array<{ nodeId: string; requiredRank: number }> {
  const knownNodeIds = new Set(allNodes.map((n) => n.nodeId));

  const rawReqs = [
    ...(Array.isArray(node.skillsRequired) ? node.skillsRequired : []),
    ...node.ranks.flatMap((r) =>
      Array.isArray(r.skillsRequired) ? r.skillsRequired : []
    ),
  ].filter(Boolean);

  const seen = new Set<string>();
  const result: Array<{ nodeId: string; requiredRank: number }> = [];

  for (const req of rawReqs) {
    if (seen.has(req)) continue;
    seen.add(req);

    const { nodeId, rank } = parseSkillName(req, knownNodeIds);
    if (nodeId === node.nodeId) continue; // skip self-referential rank chains

    result.push({ nodeId, requiredRank: rank });
  }

  return result;
}

function getPreclusionNodeIds(node: VisibleNode): string[] {
  const rawPrecs = [
    ...(Array.isArray(node.preclusionSkills) ? node.preclusionSkills : []),
    ...node.ranks.flatMap((r) =>
      Array.isArray(r.preclusionSkills) ? r.preclusionSkills : []
    ),
  ].filter(Boolean);

  // Only need the nodeId for preclusion — strip rank suffix and deduplicate.
  return Array.from(new Set(rawPrecs.map((p) => parseSkillName(p).nodeId)));
}

function areSkillRequirementsMet(
  node: VisibleNode,
  selectedRanks: SelectedRanks,
  allNodes: VisibleNode[] = []
): boolean {
  const reqs = getRequiredSkills(node, allNodes);
  if (reqs.length === 0) return true;

  const requiredCount =
    node.skillsRequiredCount && node.skillsRequiredCount > 0
      ? node.skillsRequiredCount
      : reqs.length;

  let metCount = 0;
  for (const { nodeId, requiredRank } of reqs) {
    if ((selectedRanks[nodeId] ?? 0) >= requiredRank) {
      metCount++;
    }
  }

  return metCount >= requiredCount;
}

function hasPreclusionConflict(
  node: VisibleNode,
  selectedRanks: SelectedRanks
): boolean {
  const preclusions = getPreclusionNodeIds(node);
  if (preclusions.length === 0) return false;

  return preclusions.some((precludedId) => (selectedRanks[precludedId] ?? 0) > 0);
}

export function getPointsSpentInTier(
  tier: number,
  nodes: VisibleNode[],
  selectedRanks: SelectedRanks
): number {
  return nodes
    .filter((node) => (node.tier ?? 0) === tier)
    .reduce((sum, node) => sum + (selectedRanks[node.nodeId] ?? 0), 0);
}

export function getPointsSpentBeforeTier(
  tier: number,
  nodes: VisibleNode[],
  selectedRanks: SelectedRanks
): number {
  return nodes
    .filter((node) => (node.tier ?? 0) < tier)
    .reduce((sum, node) => sum + (selectedRanks[node.nodeId] ?? 0), 0);
}

export function getTotalPointsSpent(selectionsByTree: SelectionsByTree): number {
  return Object.values(selectionsByTree).reduce((total, treeSelections) => {
    return total + Object.values(treeSelections).reduce((sum, rank) => sum + rank, 0);
  }, 0);
}

// Merge every tree's selections into one flat map for cross-tree prereq checking.
// Node IDs are globally unique so keys never collide.
function mergeAllSelections(selectionsByTree: SelectionsByTree): SelectedRanks {
  return Object.values(selectionsByTree).reduce<SelectedRanks>(
    (acc, treeSelections) => ({ ...acc, ...treeSelections }),
    {}
  );
}

export function tierUnlockThreshold(tier: number, treeKey?: string): number {
  if (
    treeKey &&
    (ADVANCED_TREE_KEYS.has(treeKey) || JEDI_ADVANCED_TREE_KEYS.has(treeKey))
  ) {
    return ADVANCED_TIER_THRESHOLDS[tier] ?? (tier - 1) * 4;
  }
  return (tier - 1) * 4;
}

export function isTierUnlocked(
  tier: number | null,
  nodes: VisibleNode[],
  selectedRanks: SelectedRanks,
  treeKey?: string
): boolean {
  const normalizedTier = tier ?? 1;
  if (normalizedTier <= 1) return true;

  const requiredPoints = tierUnlockThreshold(normalizedTier, treeKey);
  const spentBeforeTier = getPointsSpentBeforeTier(normalizedTier, nodes, selectedRanks);
  return spentBeforeTier >= requiredPoints;
}

function wouldBreakTierRequirementsIfRemoved(
  node: VisibleNode,
  nodes: VisibleNode[],
  selectedRanks: SelectedRanks,
  treeKey?: string
): boolean {
  const currentRank = selectedRanks[node.nodeId] ?? 0;
  if (currentRank <= 0) return false;

  const simulated: SelectedRanks = { ...selectedRanks };
  if (currentRank === 1) {
    delete simulated[node.nodeId];
  } else {
    simulated[node.nodeId] = currentRank - 1;
  }

  const selectedNodesAboveTier = nodes.filter((n) => {
    const selected = simulated[n.nodeId] ?? 0;
    return selected > 0 && (n.tier ?? 0) > (node.tier ?? 0);
  });

  for (const higherNode of selectedNodesAboveTier) {
    if (!isTierUnlocked(higherNode.tier, nodes, simulated, treeKey)) {
      return true;
    }
  }

  return false;
}

function wouldBreakDependenciesIfRemoved(
  node: VisibleNode,
  selectedRanks: SelectedRanks,
  allTrees: TreeData[],
  selectionsByTree: SelectionsByTree
): boolean {
  const currentRank = selectedRanks[node.nodeId] ?? 0;
  if (currentRank <= 0) return false;

  // Simulate removing one rank from this node in the global prereq-resolution state.
  const simulated: SelectedRanks = { ...mergeAllSelections(selectionsByTree) };
  if (currentRank === 1) {
    delete simulated[node.nodeId];
  } else {
    simulated[node.nodeId] = currentRank - 1;
  }

  // Check every selected node across ALL trees — cross-tree prereqs can break too.
  // IMPORTANT: use each tree's own selection state to determine whether a node is
  // "selected" in that tree. Node IDs are not globally unique (35 collisions exist
  // across trees), so using the merged global rank for the "is it selected?" check
  // causes false positives: investing in tree A's node would make tree B's same-named
  // node appear selected even though the player never put points into tree B's version.
  for (const tree of allTrees) {
    const treeSelections = selectionsByTree[tree.id] ?? {};
    for (const otherNode of tree.nodes) {
      if (otherNode.nodeId === node.nodeId) continue;
      // Use the tree-specific selection to decide whether this node is actually invested.
      if ((treeSelections[otherNode.nodeId] ?? 0) <= 0) continue;
      if (!areSkillRequirementsMet(otherNode, simulated, tree.nodes)) return true;
    }
  }

  return false;
}

export function canIncreaseRank(
  node: VisibleNode,
  nodes: VisibleNode[],
  selectedRanks: SelectedRanks,
  allTrees: TreeData[],
  selectionsByTree: SelectionsByTree,
  treeKey?: string
): boolean {
  const currentRank = selectedRanks[node.nodeId] ?? 0;

  if (currentRank >= node.maxRank) return false;

  if (!isTierUnlocked(node.tier, nodes, selectedRanks, treeKey)) {
    return false;
  }

  // Skill prereqs and preclusions are checked against ALL trees (cross-tree prereqs exist).
  const globalSelectedRanks = mergeAllSelections(selectionsByTree);

  // Branch gate: Smuggler, BH, and Assassin require a mastered melee or ranged tree.
  const currentTreeKey = treeKey ?? allTrees.find((t) => t.id === node.treeId)?.key;
  if (currentTreeKey && !isBranchGateSatisfied(currentTreeKey, globalSelectedRanks)) return false;

  if (!areSkillRequirementsMet(node, globalSelectedRanks, nodes)) return false;
  if (hasPreclusionConflict(node, globalSelectedRanks)) return false;
  if (getTotalPointsSpent(selectionsByTree) >= MAX_EXPERTISE_POINTS) return false;

  return true;
}

export function canDecreaseRank(
  node: VisibleNode,
  _treeId: number,
  nodes: VisibleNode[],
  selectedRanks: SelectedRanks,
  allTrees: TreeData[],
  selectionsByTree: SelectionsByTree,
  treeKey?: string
): boolean {
  const currentRank = selectedRanks[node.nodeId] ?? 0;
  if (currentRank <= 0) return false;

  if (wouldBreakTierRequirementsIfRemoved(node, nodes, selectedRanks, treeKey)) {
    return false;
  }

  if (wouldBreakDependenciesIfRemoved(node, selectedRanks, allTrees, selectionsByTree)) {
    return false;
  }

  // Block removing a master node if it would un-satisfy the branch gate for any invested tree.
  if (MELEE_MASTER_NODES.has(node.nodeId) || RANGED_MASTER_NODES.has(node.nodeId)) {
    const currentRankForSim = selectedRanks[node.nodeId] ?? 0;
    const simulated = { ...mergeAllSelections(selectionsByTree) };
    if (currentRankForSim <= 1) {
      delete simulated[node.nodeId];
    } else {
      simulated[node.nodeId] = currentRankForSim - 1;
    }
    for (const tree of allTrees) {
      const treeSelections = selectionsByTree[tree.id] ?? {};
      const hasInvestment = Object.values(treeSelections).some((r) => r > 0);
      if (hasInvestment && !isBranchGateSatisfied(tree.key, simulated)) {
        return false;
      }
    }
  }

  return true;
}

export function getMissingRequirements(
  node: VisibleNode,
  selectedRanks: SelectedRanks,
  allNodes: VisibleNode[] = []
): string[] {
  return getRequiredSkills(node, allNodes)
    .filter(({ nodeId, requiredRank }) => (selectedRanks[nodeId] ?? 0) < requiredRank)
    .map(({ nodeId, requiredRank }) => `${nodeId} (rank ${requiredRank})`);
}
