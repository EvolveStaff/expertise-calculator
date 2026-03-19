/**
 * Cleans up raw node display names that come from SWG skill data.
 *
 * The Force Sensitive / Jedi expertise trees use "Fs" and "Frs" prefixes
 * on virtually every node (e.g. "Fs Saber Strike Incr", "Frs Guardian Enhancements").
 * These are internal abbreviations for "Force Sensitive" and "Force Ranking System"
 * that were never meant to surface in the UI.
 *
 * This function:
 *  1. Strips leading "Fs " / "Frs " prefixes (case-insensitive)
 *  2. Expands "Forcesensitive" → "Force Sensitive"
 *  3. Expands common trailing abbreviations: Incr, Crit, Cd, Acr
 *  4. Trims any resulting double-spaces
 */
export function formatNodeName(displayName: string): string {
  let name = displayName.trim();

  // 1. Strip leading FS / FRS prefixes
  name = name.replace(/^Frs\s+/i, "");
  name = name.replace(/^Fs\s+/i, "");

  // 2. Fix "Forcesensitive" run-together word
  name = name.replace(/\bForcesensitive\b/gi, "Force Sensitive");

  // 3. Expand abbreviations at word boundaries
  name = name.replace(/\bIncr\b/gi, "Increase");
  name = name.replace(/\bCrit\b/gi, "Critical");
  // "Cd" as a standalone word (cooldown) — only at end to avoid false matches
  name = name.replace(/\bCd$/i, "Cooldown");
  // "Acr" as a standalone word (action cost reduction / efficiency)
  name = name.replace(/\bAcr\b/gi, "Efficiency");
  // "Adv" as a standalone word (advanced) — not already expanded
  name = name.replace(/\bAdv\b/gi, "Advanced");

  // 4. Clean up any leftover multiple spaces
  name = name.replace(/\s{2,}/g, " ").trim();

  return name;
}
