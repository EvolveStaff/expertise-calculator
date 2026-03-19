// Patch display names for all 8 standard combat trees based on actual skill/mod grants
const fs = require('fs');
const PATH = 'D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/expertise.json';
const data = JSON.parse(fs.readFileSync(PATH));

// Helper: find a node in a specific tree by tier + grid
function fix(treeKey, tier, grid, newName) {
  const tree = data.trees.find(t => t.key === treeKey);
  if (!tree) { console.warn(`Tree not found: ${treeKey}`); return; }
  const node = tree.nodes.find(n => n.tier === tier && n.grid === grid);
  if (!node) { console.warn(`Node not found: ${treeKey} T${tier}/G${grid}`); return; }
  const old = node.displayName;
  node.displayName = newName;
  console.log(`[${treeKey}] T${tier}/G${grid}: "${old}" → "${newName}"`);
}

// ── combat_1hsword (Fencer) ─────────────────────────────────────────────────
fix('combat_1hsword', 1, 4, 'Fencer Action Cost Reduction');   // was "Fencer Efficiency"; grants One-Hand Melee Action Cost
fix('combat_1hsword', 2, 4, 'Burning Blade');                  // was "Fencer Accuracy"; grants Burning Blade mod
fix('combat_1hsword', 4, 4, 'Corrosive Tip');                  // was "Fencer Power"; grants Corrosive Tip mod

// ── combat_polearm (Pikeman) ────────────────────────────────────────────────
fix('combat_polearm', 1, 4, 'Pikeman Action Cost Reduction');  // was "Pikeman Efficiency"; grants Polearm Action Cost
fix('combat_polearm', 2, 4, 'AoE Damage');                     // was "Pikeman Accuracy"; grants AOE Damage Bonus
fix('combat_polearm', 4, 4, 'AoE Damage Boost');               // was "Pikeman Power"; grants AOE Damage Bonus (higher rank)

// ── combat_2hsword (Swordsman) ──────────────────────────────────────────────
fix('combat_2hsword', 1, 4, 'Swordsman Action Cost Reduction'); // was "Swordsman Efficiency"; grants Two-Hand Melee Action Cost
fix('combat_2hsword', 2, 4, 'Strikethrough Chance');            // was "Swordsman Accuracy"; grants Strikethrough Chance Increase
fix('combat_2hsword', 2, 6, 'Vital Strike');                    // was "Melee Strike" (wrong rename); cmds Vital Strike
fix('combat_2hsword', 3, 3, 'Switcheroo');                      // was "Sw Switcheroo"; strip prefix
fix('combat_2hsword', 3, 5, 'Head Crack');                      // was "Sw Head Crack"; strip prefix
fix('combat_2hsword', 4, 4, 'Armor Neglect');                   // was "Swordsman Power"; grants Armor Neglect mod
fix('combat_2hsword', 5, 5, 'One-Two Pummel');                  // was "Sw One Two Pummel"; strip prefix + add dash

// ── combat_unarmed (Martial Artist) ────────────────────────────────────────
fix('combat_unarmed', 1, 4, 'Unarmed Action Cost Reduction');  // was "Unarmed Efficiency"; grants Unarmed Action Cost
fix('combat_unarmed', 2, 4, 'Parry Reduction');                // was "Unarmed Accuracy"; grants Offensive Parry Reduction
fix('combat_unarmed', 3, 3, 'Switcheroo');                     // was "Unarmed Switcheroo"; strip prefix
fix('combat_unarmed', 3, 5, 'Head Crack');                     // was "Unarmed Head Crack"; strip prefix
fix('combat_unarmed', 4, 4, 'Glancing Blow Reduction');        // was "Unarmed Power"; grants Offensive Glancing Blow Reduction
fix('combat_unarmed', 5, 5, 'One-Two Pummel');                 // was "Unarmed One Two Pummel"; strip prefix + add dash

// ── combat_carbine (Carbineer) ──────────────────────────────────────────────
fix('combat_carbine', 1, 4, 'Carbine Action Cost Reduction');  // was "Carbine Efficiency"; grants Carbine Action Cost
fix('combat_carbine', 2, 2, 'Concussion Shot');                // was "Melee Strike" (wrong rename); cmds Concussion Shot
fix('combat_carbine', 2, 4, 'Deuterium Rounds');               // was "Carbine Accuracy"; grants Deuterium Rounds mod
fix('combat_carbine', 4, 4, 'Acid Dart');                      // was "Carbine Power"; grants Acid Dart mod

// ── combat_pistol (Pistoleer) ───────────────────────────────────────────────
fix('combat_pistol', 1, 4, 'Pistol Action Cost Reduction');    // was "Pistol Efficiency"; grants Pistol Action Cost
fix('combat_pistol', 2, 4, 'Pistol Critical Chance');          // was "Pistol Accuracy"; grants Ranged Critical Chance
fix('combat_pistol', 4, 4, 'Pistol Range Bonus');              // was "Pistol Power"; grants Pistol Range Bonus mod
fix('combat_pistol', 5, 4, 'Strikethrough Chance');            // was "Pistol Critical Chance" (wrong — grants Strikethrough!)

// ── combat_rifleman (Rifleman) ──────────────────────────────────────────────
fix('combat_rifleman', 1, 4, 'Rifle Action Cost Reduction');   // was "Rifle Efficiency"; grants Rifle Action Cost
fix('combat_rifleman', 2, 4, 'Strikethrough Chance');          // was "Rifle Accuracy"; grants Strikethrough Chance Increase
fix('combat_rifleman', 4, 4, 'Armor Neglect');                 // was "Rifle Power"; grants Armor Neglect mod

// ── combat_heavy_weapon (Heavy Weapon) ─────────────────────────────────────
fix('combat_heavy_weapon', 4, 4, 'Heavy Weapon Critical Chance'); // was "Critical Chance"; grants Ranged Critical Chance
fix('combat_heavy_weapon', 5, 4, 'Armor Neglect');                // was "Accuracy" (wrong!); grants Armor Neglect mod

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log('\nDone. expertise.json updated.');
