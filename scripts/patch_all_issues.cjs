const fs = require('fs');
const PATH = 'D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/expertise.json';
const data = JSON.parse(fs.readFileSync(PATH));

let count = 0;
function fix(treeKey, tier, grid, newName) {
  const tree = data.trees.find(t => t.key === treeKey);
  if (!tree) { console.log('MISSING TREE: ' + treeKey); return; }
  const node = tree.nodes.find(n => n.tier === tier && n.grid === grid);
  if (!node) { console.log('MISSING NODE: ' + treeKey + ' T' + tier + '/G' + grid); return; }
  if (node.displayName === newName) return; // already correct
  console.log('[' + treeKey + '] T' + tier + '/G' + grid + ': "' + node.displayName + '" -> "' + newName + '"');
  node.displayName = newName;
  count++;
}

// ── combat_brawler ──────────────────────────────────────────────────────────
fix('combat_brawler', 5, 1, 'Novice Martial Artist');  // inconsistent; others are "Novice Fencer" etc.

// ── combat_assassin ─────────────────────────────────────────────────────────
fix('combat_assassin', 3, 3, 'Assassinate');           // "Damage" → grants Assassinate 1
fix('combat_assassin', 4, 5, 'Flash Bang');            // "Field Debuff Chance" → grants Flash Bang

// ── science_combatmedic ─────────────────────────────────────────────────────
fix('science_combatmedic', 2, 2, 'Neurotoxin');        // "DoT Damage" → grants Neurotoxin Mark 1
fix('science_combatmedic', 4, 5, "Viper's Fang");      // "Spy's Fang" → grants Viper's Fang
fix('science_combatmedic', 6, 4, 'Master Combat Medic'); // "Combat Medic Master"

// ── combat_commando ─────────────────────────────────────────────────────────
fix('combat_commando', 5, 7, 'Armor Shredder');        // "Armor Cracker" → grants Armor Shredder
fix('combat_commando', 6, 1, 'Area Enrage');           // "Area Taunt" → grants Area Enrage
fix('combat_commando', 6, 2, 'Enrage');                // "Taunt" → grants Enrage
fix('combat_commando', 6, 4, 'Master Commando');       // "Commando Master"

// ── science_doctor ──────────────────────────────────────────────────────────
fix('science_doctor', 3, 2, 'HoT Potency');           // "HoT Duration" → grants Heal Over Time Potency
fix('science_doctor', 5, 6, 'Blood Cleansers');       // "Blood Cleaners" → typo, cmd is "Blood Cleansers"
fix('science_doctor', 6, 4, 'Master Doctor');         // "Doctor Master"

// ── combat_grenadier ────────────────────────────────────────────────────────
fix('combat_grenadier', 3, 3, 'Concussion Grenade');  // "Delayed Grenade I" → grants Concussion Grenade
fix('combat_grenadier', 3, 5, 'Dioxis Grenade');      // "Dioxis Cloud" → grants Dioxis Grenade
fix('combat_grenadier', 4, 3, 'Cryoban Grenade');     // "Delayed Grenade II" → grants Cryoban Grenade
fix('combat_grenadier', 4, 5, 'Fragmentation Grenade'); // "Delayed Damage" → grants Fragmentation Grenade
fix('combat_grenadier', 5, 3, 'E-Mag Mine');          // "Field Damage" → grants Mine 1: E-Mag Mine
fix('combat_grenadier', 5, 5, 'Seismic Grenade');     // "Shock" → grants Seismic Grenade
fix('combat_grenadier', 5, 6, 'Core Bomb');           // "Delayed Area DoT" → grants Core Bomb
fix('combat_grenadier', 6, 2, 'Artillery Strike');    // "Artillery" → grants Artillery Strike
fix('combat_grenadier', 6, 4, 'Master Grenadier');    // "Grenadier Master"

// ── combat_smuggler ─────────────────────────────────────────────────────────
fix('combat_smuggler', 5, 3, 'Camouflage Ally');      // "Invisibility Ally Buff" → grants Camouflage Ally

// ── combat_teras_kasi ───────────────────────────────────────────────────────
fix('combat_teras_kasi', 4, 6, 'Void Walk');          // "Void Dance" → grants Void Walk
fix('combat_teras_kasi', 6, 4, 'Master Teras Kasi'); // "Teras Kasi Master"
fix('combat_teras_kasi', 6, 6, 'Instigate');          // "Taunt" → grants Instigate
fix('combat_teras_kasi', 6, 7, 'Area Instigate');     // "Area Taunt" → grants Area Instigate

// ── outdoors_squadleader ────────────────────────────────────────────────────
// Strip broken "Of " prefix fragments, use actual command names
fix('outdoors_squadleader', 2, 2, 'Advanced Tactics');     // "Of Advanced Tactics"
fix('outdoors_squadleader', 2, 6, 'Paint Target');         // "Of Advanced Paint"
fix('outdoors_squadleader', 3, 1, 'Drillmaster');          // "Of Drillmaster"
fix('outdoors_squadleader', 3, 2, 'Inspiration');          // "Of Inspiration"
fix('outdoors_squadleader', 3, 3, 'Focus Fire');           // "Of Focus Fire"
fix('outdoors_squadleader', 3, 6, 'Misdirected Anger');    // "Of Aggro Channel" → grants Misdirected Anger
fix('outdoors_squadleader', 4, 1, 'Scatter!');             // "Of Scatter"
fix('outdoors_squadleader', 4, 3, 'Charge!');              // "Of Charge"
fix('outdoors_squadleader', 4, 7, 'Reinforcements');       // "Of Reinforcements"
fix('outdoors_squadleader', 5, 1, 'Synaptic Stimulator'); // "Of Stimulator" → grants Synaptic Stimulator
fix('outdoors_squadleader', 5, 7, 'Environmental Purge'); // "Of Purge" → grants Environmental Purge
fix('outdoors_squadleader', 6, 1, 'Emergency Shield');    // "Of Emergency Shield"
fix('outdoors_squadleader', 6, 2, 'Experienced Leadership'); // "Leadership" → grants Experienced Leadership
fix('outdoors_squadleader', 6, 4, 'Master Squad Leader'); // "Master Squad Leader" (already ok, just confirm)

// ── outdoors_creaturehandler ────────────────────────────────────────────────
// Strip "Ch " prefix, use actual grant names
fix('outdoors_creaturehandler', 1, 2, 'Improved Healing');       // "Ch Improved Healing"
fix('outdoors_creaturehandler', 1, 6, 'Creature Follow');        // "Ch Follow" → grants Creature Follow
fix('outdoors_creaturehandler', 1, 7, 'Creature Stay');          // "Ch Stay" → grants Creature Stay
fix('outdoors_creaturehandler', 2, 3, 'Exceptional Nutrition');  // "Ch Exceptional Nutrition"
fix('outdoors_creaturehandler', 2, 4, 'Savagery');               // "Ch Savagery"
fix('outdoors_creaturehandler', 2, 5, 'Dexterity Training');     // "Ch Dexterity Training"
fix('outdoors_creaturehandler', 2, 7, 'Group Creatures');        // "Ch Group" → grants Group Creatures
fix('outdoors_creaturehandler', 3, 2, 'Specialized Supplements'); // "Ch Specialized Supplements"
fix('outdoors_creaturehandler', 3, 4, 'Creature Pet Trick');     // "Ch Pet Trick"
fix('outdoors_creaturehandler', 4, 3, 'Fortitude');              // "Ch Fortitude"
fix('outdoors_creaturehandler', 5, 4, 'Master Creature Handler'); // "Outdoors Creaturehandler Master"

// ── expertise_tree_beastmaster ──────────────────────────────────────────────
fix('expertise_tree_beastmaster', 5, 4, 'Master Beastmaster'); // "Master Beast Master" → remove redundancy

// ── social_entertainer ──────────────────────────────────────────────────────
fix('social_entertainer', 2, 7, 'Instruments & Props');  // "Entertainer Healing" → grants instruments/props, not healing
fix('social_entertainer', 3, 4, 'Master Entertainer');  // "Entertainer Master"

// ── social_musician ─────────────────────────────────────────────────────────
fix('social_musician', 3, 2, 'Master Musician');   // "Musician Master"
fix('social_musician', 3, 6, 'Master Dancer');     // "Dancer Master"

// ── social_imagedesigner ────────────────────────────────────────────────────
fix('social_imagedesigner', 3, 4, 'Master Image Designer'); // "Imagedesigner Master"

// ── social_muse ─────────────────────────────────────────────────────────────
fix('social_muse', 6, 4, 'Master Muse');           // "Muse Master"

// ── crafting masters ────────────────────────────────────────────────────────
fix('crafting_artisan',       5, 4, 'Master Artisan');
fix('crafting_artisan',       5, 5, 'Master Merchant');      // second master node in artisan tree
fix('crafting_architect',     5, 4, 'Master Architect');
fix('crafting_armorsmith',    6, 4, 'Master Armorsmith');
fix('outdoors_bio_engineer',  6, 4, 'Master Bio-Engineer');
fix('crafting_chef',          6, 4, 'Master Chef');
fix('crafting_cybernetics',   6, 4, 'Master Cybernetics');
fix('crafting_droidengineer', 6, 4, 'Master Droid Engineer');
fix('crafting_reverseengineer', 6, 4, 'Master Reverse Engineer');
fix('crafting_shipwright',    6, 4, 'Master Shipwright');
fix('crafting_tailor',        6, 4, 'Master Tailor');
fix('crafting_weaponsmith',   6, 4, 'Master Weaponsmith');
fix('crafting_merchant',      4, 4, 'Master Merchant');

fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
console.log('\nTotal fixes: ' + count);
