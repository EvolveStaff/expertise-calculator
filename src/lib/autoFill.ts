import type { VisibleNode, TreeData } from "./types";
import {
  tierUnlockThreshold,
  getPointsSpentBeforeTier,
  getTotalPointsSpent,
  TREE_BRANCH_GATES,
  isBranchGateSatisfied,
  MAX_EXPERTISE_POINTS,
  getFrsVirtualRanks,
  FRS_TREE_KEY,
} from "./rules";

type SelectionsByTree = Record<number, Record<string, number>>;

export type AutoFillAddition = {
  nodeId: string;
  displayName: string;
  fromRank: number;
  toRank: number;
  tier: number;
};

export type AutoFillResult =
  | { ok: true; additions: AutoFillAddition[]; newTreeSelections: Record<string, number>; totalNewPoints: number }
  | { ok: false; reason: string };

function parseSkillRef(s: string, knownNodeIds: Set<string>): { nodeId: string; rank: number } {
  if (knownNodeIds.has(s)) return { nodeId: s, rank: 1 };
  const m = s.match(/^(.+)_(\d+)$/);
  return m ? { nodeId: m[1], rank: parseInt(m[2], 10) } : { nodeId: s, rank: 1 };
}

function getCrossNodeRequirements(
  node: VisibleNode,
  allNodes: VisibleNode[]
): Array<{ nodeId: string; requiredRank: number }> {
  const knownNodeIds = new Set(allNodes.map((n) => n.nodeId));
  const rawReqs = [
    ...(Array.isArray(node.skillsRequired) ? node.skillsRequired : []),
    ...node.ranks.flatMap((r) => (Array.isArray(r.skillsRequired) ? r.skillsRequired : [])),
  ].filter(Boolean);

  const seen = new Set<string>();
  const result: Array<{ nodeId: string; requiredRank: number }> = [];
  for (const req of rawReqs) {
    if (seen.has(req)) continue;
    seen.add(req);
    const { nodeId, rank } = parseSkillRef(req, knownNodeIds);
    if (nodeId === node.nodeId) continue; // skip self-referential rank chains
    result.push({ nodeId, requiredRank: rank });
  }
  return result;
}

export function computeAutoFill(
  targetNode: VisibleNode,
  tree: TreeData,
  allTrees: TreeData[],
  selectionsByTree: SelectionsByTree,
  treeKey: string
): AutoFillResult {
  const targetRank = targetNode.maxRank;
  const originalRank = (selectionsByTree[tree.id] ?? {})[targetNode.nodeId] ?? 0;

  if (originalRank >= targetRank) {
    return { ok: false, reason: "Node is already at maximum rank." };
  }

  // Working copy of this tree's selections only
  const workingSelections: Record<string, number> = { ...(selectionsByTree[tree.id] ?? {}) };
  const originalSelections: Record<string, number> = { ...workingSelections };

  // Build merged global view (other trees unchanged, this tree uses workingSelections)
  function getMerged(): Record<string, number> {
    const merged: Record<string, number> = {};
    for (const [tidStr, sels] of Object.entries(selectionsByTree)) {
      const tid = Number(tidStr);
      const src = tid === tree.id ? workingSelections : sels;
      for (const [k, v] of Object.entries(src)) merged[k] = v;
    }
    const frsTree = allTrees.find((t) => t.key === FRS_TREE_KEY);
    const frsPoints = frsTree
      ? Object.values(selectionsByTree[frsTree.id] ?? {}).reduce((s, r) => s + r, 0)
      : 0;
    return { ...merged, ...getFrsVirtualRanks(frsPoints) };
  }

  // Branch gate check — must already be satisfied; we don't auto-fill other trees
  if (!isBranchGateSatisfied(treeKey, getMerged())) {
    const gate = TREE_BRANCH_GATES[treeKey];
    return { ok: false, reason: gate?.description ?? "Branch gate requirement not met." };
  }

  // Preclusion check on the target node
  const knownNodeIds = new Set(tree.nodes.map((n) => n.nodeId));
  const precludedIds = [
    ...(Array.isArray(targetNode.preclusionSkills) ? targetNode.preclusionSkills : []),
    ...targetNode.ranks.flatMap((r) =>
      Array.isArray(r.preclusionSkills) ? r.preclusionSkills : []
    ),
  ]
    .filter(Boolean)
    .map((p) => parseSkillRef(p, knownNodeIds).nodeId);

  for (const pid of precludedIds) {
    if ((getMerged()[pid] ?? 0) > 0) {
      return { ok: false, reason: "Blocked by a preclusion with a skill you already have." };
    }
  }

  // ── Greedy tier-gap fill ─────────────────────────────────────────────────────
  // Fill enough points in tiers < targetTier to unlock targetTier.
  // Nodes are visited tier-ascending, grid-ascending.
  // Only fills a candidate if its own tier is already unlocked and its
  // skillsRequired are already satisfied (no deeper recursion in tier fill).
  function fillTierGap(targetTier: number | null): { ok: boolean; reason?: string } {
    const tier = targetTier ?? 1;
    if (tier <= 1) return { ok: true };

    const threshold = tierUnlockThreshold(tier, treeKey);
    const candidates = tree.nodes
      .filter((n) => (n.tier ?? 0) < tier)
      .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || (a.grid ?? 0) - (b.grid ?? 0));

    let progress = true;
    while (progress) {
      const current = getPointsSpentBeforeTier(tier, tree.nodes, workingSelections);
      if (current >= threshold) return { ok: true };
      progress = false;

      for (const candidate of candidates) {
        const cRank = workingSelections[candidate.nodeId] ?? 0;
        if (cRank >= candidate.maxRank) continue;

        // Candidate's own tier must be unlocked
        const cTier = candidate.tier ?? 1;
        if (cTier > 1) {
          const cThreshold = tierUnlockThreshold(cTier, treeKey);
          const cPoints = getPointsSpentBeforeTier(cTier, tree.nodes, workingSelections);
          if (cPoints < cThreshold) continue;
        }

        // Candidate's skillsRequired must be satisfied (shallow check — no recursive fill here)
        const reqs = getCrossNodeRequirements(candidate, tree.nodes);
        const merged = getMerged();
        const reqsMet = reqs.every(
          ({ nodeId: rid, requiredRank: rr }) => (merged[rid] ?? 0) >= rr
        );
        if (!reqsMet) continue;

        // Fill as many ranks of this candidate as needed to close the gap
        const remaining = threshold - getPointsSpentBeforeTier(tier, tree.nodes, workingSelections);
        const available = candidate.maxRank - cRank;
        const toFill = Math.min(available, remaining);
        workingSelections[candidate.nodeId] = cRank + toFill;
        progress = true;

        if (getPointsSpentBeforeTier(tier, tree.nodes, workingSelections) >= threshold) {
          return { ok: true };
        }
      }
    }

    const final = getPointsSpentBeforeTier(tier, tree.nodes, workingSelections);
    return final >= threshold
      ? { ok: true }
      : { ok: false, reason: `Cannot unlock Tier ${tier} — not enough investable nodes in earlier tiers.` };
  }

  // ── Recursive node fill ──────────────────────────────────────────────────────
  function fillNodeTo(
    nodeId: string,
    requiredRank: number,
    depth: number
  ): { ok: boolean; reason?: string } {
    if (depth > 30) return { ok: false, reason: "Dependency chain too deep — possible cycle." };

    const currentRank = workingSelections[nodeId] ?? 0;
    if (currentRank >= requiredRank) return { ok: true };

    const node = tree.nodes.find((n) => n.nodeId === nodeId);
    if (!node) {
      // Cross-tree node — we only check, never fill
      const globalRank = getMerged()[nodeId] ?? 0;
      if (globalRank >= requiredRank) return { ok: true };
      return { ok: false, reason: `Requires "${nodeId.replace(/_/g, " ")}" from another tree.` };
    }

    // Ensure the node's tier is unlocked
    const tierResult = fillTierGap(node.tier);
    if (!tierResult.ok) return tierResult;

    // Satisfy specific skillsRequired recursively
    const reqs = getCrossNodeRequirements(node, tree.nodes);
    for (const { nodeId: rid, requiredRank: rr } of reqs) {
      const r = fillNodeTo(rid, rr, depth + 1);
      if (!r.ok) return r;
    }

    // Now invest in this node
    workingSelections[nodeId] = requiredRank;
    return { ok: true };
  }

  // ── Run fill ─────────────────────────────────────────────────────────────────
  const fillResult = fillNodeTo(targetNode.nodeId, targetRank, 0);
  if (!fillResult.ok) return { ok: false, reason: fillResult.reason! };

  // ── Global cap check ─────────────────────────────────────────────────────────
  const frsTree = allTrees.find((t) => t.key === FRS_TREE_KEY);
  const excludeIds = frsTree ? new Set([frsTree.id]) : undefined;
  const existingTotal = getTotalPointsSpent(selectionsByTree, excludeIds);
  const thisTreeBefore = Object.values(selectionsByTree[tree.id] ?? {}).reduce((s, r) => s + r, 0);
  const thisTreeAfter = Object.values(workingSelections).reduce((s, r) => s + r, 0);
  const projectedTotal = existingTotal - thisTreeBefore + thisTreeAfter;

  if (projectedTotal > MAX_EXPERTISE_POINTS) {
    return {
      ok: false,
      reason: `Would exceed the ${MAX_EXPERTISE_POINTS}-point global cap (projected: ${projectedTotal}).`,
    };
  }

  // ── Build additions list ─────────────────────────────────────────────────────
  const additions: AutoFillAddition[] = [];
  let totalNewPoints = 0;

  for (const node of tree.nodes) {
    const before = originalSelections[node.nodeId] ?? 0;
    const after = workingSelections[node.nodeId] ?? 0;
    if (after > before) {
      additions.push({
        nodeId: node.nodeId,
        displayName: node.displayName,
        fromRank: before,
        toRank: after,
        tier: node.tier ?? 0,
      });
      totalNewPoints += after - before;
    }
  }

  // Shouldn't happen (we checked originalRank < targetRank above), but guard anyway
  if (additions.length === 0) {
    return { ok: false, reason: "No changes needed." };
  }

  return { ok: true, additions, newTreeSelections: workingSelections, totalNewPoints };
}
