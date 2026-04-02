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

// Hand-crafted display names for nodes whose IDs don't convey the real name,
// or where the auto-derived name is confusing / abbreviated.
const NODE_DISPLAY_OVERRIDES = {
  // ── Marksman T1 stat nodes (reuse expertise_bh_ prefixed nodes) ──
  "expertise_bh_stamina":      "Enhanced Stamina",
  "expertise_bh_precision":    "Enhanced Precision",
  "expertise_bh_agility":      "Enhanced Agility",
  "expertise_bh_constitution": "Enhanced Constitution",
  // ── Bounty Hunter named abilities ──
  "expertise_bh_stun":         "Pinning Shot",
  "expertise_bh_intimidate":   "Intimidating Strike",
  "expertise_bh_taunt":        "Antagonize",
  "expertise_bh_crit":         "Critical Chance",
  "expertise_bh_cover":        "Take Cover",
  "expertise_bh_relentless":   "Relentless Onslaught",
  "expertise_bh_amb_act":      "Ambush Efficiency",
  "expertise_bh_ass_act":      "Assault Efficiency",
  "expertise_bh_torse_shot":   "Torso Shot",
  "expertise_bh_tangle":       "Trapping",
  "expertise_bh_trap_dam":     "Lethality",
  "expertise_sp_noxious_traps":"Trap Enhancements",
  "expertise_bh_man_crit":     "Man Hunter",
  "expertise_bh_armor_duelist":"Duelist Stance",
  "expertise_bh_absorbtion":   "Absorption",
  // ── Brawler ──
  "expertise_brawler_1handmelee_acc": "One-Handed Efficiency",
  "expertise_brawler_1handmelee_sp":  "One-Handed Power",
  "expertise_brawler_2handmelee_acc": "Two-Handed Efficiency",
  "expertise_brawler_2handmelee_sp":  "Two-Handed Power",
  "expertise_brawler_unarmed_acc":    "Unarmed Efficiency",
  "expertise_brawler_unarmed_sp":     "Unarmed Power",
  "expertise_brawler_polearm_acc":    "Polearm Efficiency",
  "expertise_brawler_polearm_sp":     "Polearm Power",
  "expertise_brawler_master":         "Master Brawler",
  // ── Marksman ──
  "expertise_marksman_ability":      "Cripple",
  "expertise_marksman_rifle_acc":    "Rifle Action Cost Reduction",
  "expertise_marksman_rifle_sp":     "Rifle Damage",
  "expertise_marksman_carbine_acc":  "Carbine Action Cost Reduction",
  "expertise_marksman_carbine_sp":   "Carbine Damage",
  "expertise_marksman_pistol_acc":   "Pistol Action Cost Reduction",
  "expertise_marksman_pistol_sp":    "Pistol Damage",
  "expertise_marksman_hw_acr":       "Heavy Weapon Efficiency",
  "expertise_marksman_hw_dam":       "Heavy Weapon Damage",
  "expertise_marksman_ff":           "Focused Fire",
  "expertise_marksman_master":       "Master Marksman",
  // ── Pistoleer ──
  "expertise_pistoleer_attack":       "Fan Shot",
  "expertise_pistoleer_pistol_acc":   "Pistol Critical Chance",
  "expertise_pistoleer_pistol_acr":   "Pistol Action Cost Reduction",
  "expertise_pistoleer_pistol_cc":    "Strikethrough Chance",
  "expertise_pistoleer_pistol_dam":   "Pistol Damage",
  "expertise_pistoleer_pistol_def":   "Pistol Defense",
  "expertise_pistoleer_pistol_sp":    "Pistol Range Bonus",
  "expertise_pistoleer_master":       "Master Pistoleer",
  "expertise_pistoleer_novice":       "Novice Pistoleer",
  "expertise_of_sure_dam":            "Lethal Aim",
  // ── Carbineer ──
  "expertise_carbineer_attack":        "Concussion Shot",
  "expertise_concussion_damage":       "Concussion Shot Energized",
  "expertise_carbineer_carbine_acc":   "Deuterium Rounds",
  "expertise_carbineer_carbine_acr":   "Carbine Action Cost Reduction",
  "expertise_carbineer_carbine_cc":    "Carbine Critical Chance",
  "expertise_carbineer_carbine_dam":   "Carbine Damage",
  "expertise_carbineer_carbine_def":   "Carbine Defense",
  "expertise_carbineer_carbine_sp":    "Acid Dart",
  "expertise_carbineer_master":        "Master Carbineer",
  "expertise_carbineer_novice":        "Novice Carbineer",
  // ── Rifleman ──
  "expertise_rifleman_rifle_acc": "Strikethrough Chance",
  "expertise_rifleman_rifle_acr": "Rifle Action Cost Reduction",
  "expertise_rifleman_rifle_cc":  "Rifle Critical Chance",
  "expertise_rifleman_rifle_dam": "Rifle Damage",
  "expertise_rifleman_rifle_def": "Rifle Defense",
  "expertise_rifleman_rifle_sp":  "Armor Neglect",
  "expertise_rifleman_sniper":    "Sniper Shot",
  "expertise_rifleman_master":    "Master Rifleman",
  "expertise_rifleman_novice":    "Novice Rifleman",
  // ── Fencer ──
  "expertise_fencer_acc":    "Burning Blade",
  "expertise_fencer_sp":     "Corrosive Tip",
  "expertise_fencer_master": "Master Fencer",
  // ── Pikeman ──
  "expertise_pikeman_acc":    "AoE Damage",
  "expertise_pikeman_sp":     "AoE Damage Boost",
  "expertise_pikeman_master": "Master Pikeman",
  // ── Swordsman ──
  "expertise_swordsman_acc":    "Strikethrough Chance",
  "expertise_swordsman_sp":     "Armor Neglect",
  "expertise_swordsman_master": "Master Swordsman",
  "expertise_me_vital_damage":  "Vital Strike Damage",
  // ── Unarmed ──
  "expertise_unarmed_acc":                    "Parry Reduction",
  "expertise_unarmed_sp":                     "Glancing Blow Reduction",
  "expertise_unarmed_master":                 "Master Martial Artist",
  "expertise_unarmed_novice":                 "Novice Martial Artist",
  "expertise_unarmed_general_head_crack":     "Head Crack",
  "expertise_unarmed_general_one_two_pummel": "One-Two Pummel",
  "expertise_unarmed_general_switcheroo":     "Switcheroo",
  // ── Teras Kasi ──
  "teras_kasi_novice":               "Novice Teras Kasi Artist",
  "expertise_teras_kasi_master":     "Master Teras Kasi",
  "expertise_teras_kasi_armor_all":  "Innate Armor",
  "expertise_teras_kasi_adv_armor_all": "Advanced Innate Armor",
  "expertise_teras_kasi_armor_mgb":  "Melee Defense",
  "expertise_teras_kasi_dr":         "Damage Reduction",
  "expertise_tk_void_dance":         "Void Walk",
  "expertise_tk_chr":                "Critical Hit Reduction",
  "expertise_tk_thrill_dur":         "Thrill Duration",
  "expertise_tkm_taunt":             "Instigate",
  "expertise_tkm_ae_taunt":          "Area Instigate",
  // ── Heavy Weapon ──
  "expertise_heavy_weapon_master":    "Heavy Weapons Expert",
  "expertise_heavy_weapon_novice":    "Novice Heavy Weapon Specialist",
  "expertise_hw_acc":                 "Armor Shred",
  "expertise_hw_dot":                 "Heavy Dot Damage",
  "expertise_hw_crit":                "Heavy Weapon Critical Chance",
  "expertise_co_enhanced_fuel_cans":  "Enhanced Fuel Canisters",
  "expertise_co_focus_beam_damage":   "Focused Beam Overload",
  "expertise_co_lethal_beam_damage":  "Lethal Beam Overload",
  // ── Commando named abilities ──
  "expertise_co_hw_dot":            "It Burns!",
  "expertise_co_ae_hw_dot":         "Burn Down!",
  "expertise_co_taunt":             "Enrage",
  "expertise_co_ae_taunt":          "Area Enrage",
  "expertise_co_del_ae_cc_1":       "Concussion Grenade",
  "expertise_co_del_ae_cc_2":       "Cryoban Grenade",
  "expertise_co_del_ae_dm":         "Fragmentation Grenade",
  "expertise_co_fld_dm":            "Mines",
  "expertise_co_double_time":       "Double Down",
  "expertise_co_armor_cracker":     "Armor Shredder",
  "expertise_co_blow_em_away":      "Blow 'Em Away",
  "expertise_co_youll_regret_that": "You'll Regret That",
  "expertise_co_focus_beam":        "Focused Beam",
  "expertise_co_ae_dm":             "Sweeping Fire",
  // ── Assassin (Spy) ──
  "expertise_sp_dm":                "Assassinate",
  "expertise_sp_cc_dot":            "Arachne's Web",
  "expertise_sp_fld_debuff_ca":     "Flash Bang",
  "expertise_sp_improved_spys_fang":"Viper's Fang",
  "expertise_sp_hidden_daggers":    "Advanced Strikes",
  "expertise_sp_cloaked_attacks":   "Deceptive Attacks",
  "expertise_sp_assassins_blade":   "Assassin's Blade",
  "expertise_sp_assassins_mark":    "Assassin's Mark",
  "expertise_sp_master":            "Master Assassin",
  "expertise_sp_novice":            "Novice Assassin",
  // ── Smuggler ──
  "expertise_sm_path_pistol_whip":          "Pistol Whip",
  "expertise_sm_general_hammer_fanning":    "Hammer Fanning",
  "expertise_sm_general_break_the_deal":    "Break the Deal",
  "expertise_sm_general_end_of_the_line":   "End of the Line",
  "expertise_sm_general_off_the_cuff":      "Off the Cuff",
  "expertise_sm_general_spot_a_sucker":     "Spot a Sucker",
  "expertise_sm_general_one_two_pummel":    "One-Two Pummel",
  "expertise_sm_path_best_deal_ever":       "Best Deal Ever",
  "expertise_sm_path_blaster_at_your_side": "Blaster at Your Side",
  "expertise_sm_path_off_the_books":        "Off the Books",
  "expertise_sm_path_shoot_first":          "Shoot First",
  "expertise_sm_path_sleight_of_hand":      "Sleight of Hand",
  "expertise_sm_path_under_the_counter":    "Under the Counter",
  "expertise_sm_del_dm_cc":                 "Delayed Strike",
  "expertise_sm_buff_invis_ally":           "Camouflage Ally",
  // ── Officer ──
  "expertise_of_advanced_paint":  "Paint Target",
  "expertise_of_aggro_channel":   "Misdirected Anger",
  "expertise_of_del_ae_dm_dot":   "Core Bomb",
  "expertise_of_dioxis":          "Dioxis Grenade",
  "expertise_of_artillery":       "Artillery Strike",
  "expertise_of_charge":          "Charge!",
  "expertise_of_firepower":       "Superior Firepower",
  "expertise_of_firepower_cool":  "Primacy",
  "expertise_of_purge":           "Environmental Purge",
  "expertise_of_shock":           "Seismic Grenade",
  "expertise_of_stimulator":      "Synaptic Stimulator",
  "expertise_of_vortex":          "Crippling Vortex",
  "expertise_of_scatter":         "Scatter!",
  // ── Grenadier ──
  "expertise_gr_anti_evade":        "Powerful Offense",
  "expertise_gr_adv_acr":           "Grenade Efficiency",
  "expertise_of_aoe_act":           "Explosives Expert",
  "expertise_of_aoe_dam":           "High Explosives",
  "expertise_of_aoe_crit":          "Surgical Demolitions",
  // ── Doctor ──
  "expertise_me_me_bacta_ampule":   "Bacta Ampule",
  "expertise_doc_cleanse":          "Detox",
  "expertise_doc_reactive":         "Reactive Heal",
  "expertise_doc_reactive_adv":     "Advanced Reactive Heal",
  // ── Combat Medic / Medic ──
  "expertise_cm_damage":            "Medic Damage",
  "expertise_cm_dot_dam":           "DoT Damage",
  "expertise_cm_dot_dur":           "DoT Duration",
  "expertise_me_me_ae_heal":        "Area Heal",
  "expertise_me_me_dm_dot":         "Neurotoxin",
  "expertise_me_me_fld_dm_dot":     "Nerve Gas",
  "expertise_me_hot":               "Heal Over Time",
  "expertise_me_hot_duration":      "HoT Potency",
  "expertise_me_stasis":            "Stasis Field",
  "expertise_me_bacta_resistance":  "Bacta Corruption",
  "expertise_me_induce_insanity":   "Rheumatic Calamity",
  "expertise_me_blood_cleaners":    "Blood Cleansers",
  // ── Squad Leader ──
  "expertise_sl_dta":          "Damage to Action Cost",
  "expertise_sl_leadership":   "Experienced Leadership",
  "expertise_sl_innoculation": "Inoculation",
  // ── Force Sensitive ──
  "expertise_fs_dta":                   "Force Damage to Action",
  "expertise_fs_hit":                   "Force Hit",
  "expertise_fs_barrier_of_blades":     "Barrier of Blades",
  "expertise_fs_circle_of_shelter":     "Circle of Shelter",
  "expertise_fs_path_forsake_fear_cd":  "Forsake Fear Cooldown",
  "expertise_fs_saber_strike_adv":      "Advanced Saber Strike",
  "expertise_fs_saber_sweep_adv":       "Advanced Saber Sweep",
  "expertise_fs_heal_acr":              "Heal Efficiency",
  // ── Beastmaster ──
  "expertise_bm_master":                     "Master Beastmaster",
  "expertise_bm_novice":                     "Beast Master Novice",
  "expertise_bm_creature_knowledge_command": "Creature Knowledge",
  "expertise_bm_incubation_base":            "Incubation",
  "expertise_bm_loyalty_mod":                "Loyalty",
  "expertise_bm_abilility_aquisition_mod":   "Ability Acquisition",
  // ── Creature Handler ──
  "expertise_ch_follow":     "Creature Follow",
  "expertise_ch_group":      "Group Creatures",
  "expertise_ch_stay":       "Creature Stay",
  "expertise_ch_pet_trick":  "Creature Pet Trick",
  // ── Split nodes: same-base nodeId, different tier/grid positions ──
  // These get the full skill name as their nodeId to keep them distinct.
  "expertise_pistoleer_attack_3":   "Sure Shot",
  "expertise_carbineer_attack_3":   "Burst",
  "expertise_form":                 "Shii-Cho",
  "expertise_form_2":               "Makashi",
  "expertise_form_3":               "Soresu",
  "expertise_form_4":               "Ataru",
  "expertise_form_5":               "Shien",
  "expertise_form_6":               "Niman",
  "expertise_form_7":               "Juyo",
  // ── Misc ──
  "expertise_force_heal_aoe":              "Force Heal AoE",
  "expertise_fn_general_one_two_pummel":   "One-Two Pummel",
  "expertise_sw_general_one_two_pummel":   "One-Two Pummel",
  // ── Novice / Master nodes with proper tree names ──
  "combat_bountyhunter_novice":        "Novice Bounty Hunter",
  "combat_bountyhunter_master":        "Master Bounty Hunter",
  "combat_commando_novice":            "Novice Commando",
  "combat_commando_master":            "Master Commando",
  "combat_grenadier_novice":           "Novice Grenadier",
  "combat_grenadier_master":           "Master Grenadier",
  "combat_smuggler_novice":            "Novice Smuggler",
  "combat_smuggler_master":            "Master Smuggler",
  "crafting_architect_master":         "Master Architect",
  "crafting_armorsmith_master":        "Master Armorsmith",
  "crafting_artisan_master":           "Master Artisan",
  "crafting_chef_master":              "Master Chef",
  "crafting_cybernetics_master":       "Master Cybernetics",
  "crafting_droidengineer_master":     "Master Droid Engineer",
  "crafting_merchant_master":          "Master Merchant",
  "crafting_reverse_engineer_master":  "Master Reverse Engineer",
  "crafting_shipwright_master":        "Master Shipwright",
  "crafting_tailor_master":            "Master Tailor",
  "crafting_weaponsmith_master":       "Master Weaponsmith",
  "outdoors_bio_engineer_master":      "Master Bio-Engineer",
  "outdoors_bio_engineer_novice":      "Novice Bio-Engineer",
  "outdoors_bio_engineer_creature":    "Creature Genetics",
  "outdoors_bio_engineer_tissue":      "Tissue Engineering",
  "outdoors_creaturehandler_master":   "Master Creature Handler",
  "outdoors_squadleader_master":       "Master Squad Leader",
  "outdoors_squadleader_novice":       "Novice Squad Leader",
  "science_combatmedic_master":        "Master Combat Medic",
  "science_combatmedic_novice":        "Novice Combat Medic",
  "science_doctor_master":             "Master Doctor",
  "science_doctor_novice":             "Novice Doctor",
  "social_dancer_master":              "Master Dancer",
  "social_entertainer_master":         "Master Entertainer",
  "social_imagedesigner_master":       "Master Image Designer",
  "social_muse_master":                "Master Muse",
  "social_musician_master":            "Master Musician",
};

// Tree-specific overrides: same nodeId appears in multiple trees with different
// intended display names. Format: "treeKey::nodeId" → display name.
const TREE_NODE_DISPLAY_OVERRIDES = {
  "combat_pistol::expertise_pistoleer_attack":   "Fast Draw",
  "combat_2hsword::expertise_carbineer_attack":  "Vital Strike",
  "combat_rifleman::expertise_marksman_ability": "Ambush",
  "combat_carbine::expertise_marksman_ability":  "Assault",
  "combat_carbine::expertise_carbineer_attack":  "Assault",
};

// Common abbreviation tokens → expanded form (fallback when no override exists)
const TOKEN_EXPANSIONS = {
  "mdef": "Melee Defense",
  "rdef": "Range Defense",
  "acr":  "Efficiency",
  "acc":  "Accuracy",
  "dam":  "Damage",
  "cc":   "Critical Chance",
  "def":  "Defense",
  "dta":  "Damage to Action",
  "dot":  "DoT",
  "hot":  "HoT",
  "ff":   "Focused Fire",
  "dr":   "Damage Reduction",
  "chr":  "Crit Hit Reduction",
  "adv":  "Advanced",
  "imp":  "Improved",
  "ae":   "Area",
  "aoe":  "Area",
  "hp":   "Health",
  "rv":   "Revive",
};

function deriveDisplayName(nodeId) {
  // Override takes full priority
  if (NODE_DISPLAY_OVERRIDES[nodeId]) return NODE_DISPLAY_OVERRIDES[nodeId];

  const cleaned = String(nodeId).replace(/^expertise_/, "");
  const parts = cleaned.split("_");

  // Words stripped from anywhere in the token list (tree/category names)
  const blacklist = new Set([
    "combat", "crafting", "social", "science", "outdoors",
    "brawler", "marksman", "commando", "rifleman", "carbineer",
    "pistoleer", "pistol", "officer", "smuggler",
    "carbine", "medic", "jedi", "general", "path",
    // Short tree-abbreviation prefixes — stripped only when leading
    // (handled separately below, not via global filter)
  ]);

  // Short tree abbreviations that are only valid as the LEADING token
  const leadingAbbrevs = new Set([
    "bh","bm","ch","cm","co","doc","en","fn","frs","fs",
    "gr","hw","me","mk","of","sl","sm","sp","sw","tk","tkm",
  ]);

  // 1. Strip long blacklisted words from anywhere
  let filtered = parts.filter((p) => !blacklist.has(p.toLowerCase()));

  // 2. Strip leading abbreviation prefix (only if it's at position 0 after step 1)
  if (filtered.length > 1 && leadingAbbrevs.has(filtered[0].toLowerCase())) {
    filtered = filtered.slice(1);
  }

  const finalParts = filtered.length > 0 ? filtered : parts;

  // 3. Expand abbreviation tokens, then title-case
  return finalParts
    .flatMap((p) => {
      const exp = TOKEN_EXPANSIONS[p.toLowerCase()];
      return exp ? exp.split(" ") : [p];
    })
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

// SKILLS_REQUIRED entries that exist in the source data but have been removed
// in SWG Evolve. Format: skillName -> Set of requirement strings to strip.
const SKILL_REQ_REMOVALS = new Map([
  // Guardian: Premonition does not require Anticipate Aggression in Evolve.
  ["expertise_fs_general_premonition_1", new Set(["expertise_fs_path_anticipate_aggression_4"])],
  // BH Lethality: Evolve requires only rank 1 of Cripple (not rank 2).
  ["expertise_bh_trap_dam_1", new Set(["expertise_marksman_ability_02"])],
  // BH Duelist Stance: does not require BH Novice in Evolve.
  ["expertise_bh_armor_duelist_1", new Set(["combat_bountyhunter_novice_4"])],
  // Commando Cluster Bomb / Double Time: do not require Commando Novice in Evolve.
  ["expertise_co_cluster_bomb", new Set(["combat_commando_novice"])],
  ["expertise_co_double_time",  new Set(["combat_commando_novice_4"])],
  // Carbineer T4/G2: Evolve requires only rank 1 of Concussion Shot (not rank 2).
  ["expertise_concussion_damage_1", new Set(["expertise_carbineer_attack_2"])],
  // Rifleman T4/G6 (Ambush Efficiency): Evolve requires only rank 1 of Ambush (not rank 3).
  ["expertise_bh_amb_act_1", new Set(["expertise_marksman_ability_03"])],
]);

// SKILLS_REQUIRED entries added by Evolve that are not in the source data.
// Format: skillName -> array of requirement strings to inject.
const SKILL_REQ_ADDITIONS = new Map([
  // BH Lethality: inject the rank-1 Cripple requirement Evolve uses instead.
  ["expertise_bh_trap_dam_1", ["expertise_marksman_ability_01"]],
  // Carbineer T4/G2: inject rank-1 Concussion Shot requirement Evolve uses.
  ["expertise_concussion_damage_1", ["expertise_carbineer_attack_1"]],
  // Guardian T5/G4 (Premonition): requires 4 points in T4/G4 (Anticipate Aggression).
  // The 24-point total is already enforced by the ADVANCED_TIER_THRESHOLDS tier gate.
  ["expertise_fs_general_premonition_1", ["expertise_fs_path_anticipate_aggression_4"]],
  // Rifleman T4/G6 (Ambush Efficiency): inject rank-1 Ambush requirement.
  ["expertise_bh_amb_act_1", ["expertise_marksman_ability_01"]],
]);

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

  const _nodeId = deriveNodeId(eRow.NAME);
  const _treeKey = treesById.get(parseIntSafe(eRow.TREE))?.key || "";
  const _treeOverrideKey = `${_treeKey}::${_nodeId}`;
  const _displayName =
    TREE_NODE_DISPLAY_OVERRIDES[_treeOverrideKey] || deriveDisplayName(_nodeId);

  rankedEntries.push({
    name: eRow.NAME,
    nodeId: _nodeId,
    displayName: _displayName,
    treeId: parseIntSafe(eRow.TREE),
    tier: parseIntSafe(eRow.TIER),
    grid: parseIntSafe(eRow.GRID),
    rank: parseIntSafe(eRow.RANK),
    reqProf: eRow.REQ_PROF || "",
    prereqLevel: parseIntSafe(eRow.PREREQ_LEVEL),

    parent: skillRow?.PARENT || "",
    skillsRequired: [
      ...parseListField(skillRow?.SKILLS_REQUIRED || "").filter(
        (r) => !SKILL_REQ_REMOVALS.get(eRow.NAME)?.has(r)
      ),
      ...(SKILL_REQ_ADDITIONS.get(eRow.NAME) ?? []),
    ],
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
  } else if (existing.tier !== entry.tier || existing.grid !== entry.grid) {
    // Different position — this is a SEPARATE node that reuses the same base name.
    // Key by full skill name to ensure a unique slot; nodeId = full skill name.
    const splitKey = `${entry.treeId}::split::${entry.name}`;
    const splitEntry = { ...entry, nodeId: entry.name };
    // Split nodes have unique full-name nodeIds — use global override / derive
    const splitDisplayName = deriveDisplayName(entry.name);
    const splitExisting = grouped.get(splitKey);
    if (!splitExisting) {
      grouped.set(splitKey, {
        nodeId: splitEntry.nodeId,
        treeId: splitEntry.treeId,
        tier: splitEntry.tier,
        grid: splitEntry.grid,
        displayName: splitDisplayName,
        maxRank: 0,
        skillsRequired: [...splitEntry.skillsRequired],
        skillsRequiredCount: splitEntry.skillsRequiredCount,
        preclusionSkills: [...splitEntry.preclusionSkills],
        reqProf: splitEntry.reqProf || "",
        prereqLevel: splitEntry.prereqLevel,
        ranks: [splitEntry],
      });
    } else {
      splitExisting.ranks.push(splitEntry);
      splitExisting.skillsRequired = uniqueStrings([splitExisting.skillsRequired, splitEntry.skillsRequired]);
      splitExisting.preclusionSkills = uniqueStrings([splitExisting.preclusionSkills, splitEntry.preclusionSkills]);
    }
  } else {
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

// ── Effect mapping ────────────────────────────────────────────────────────────
const effectMappingPath = path.join(dataDir, "effect_mapping.tab");
if (fs.existsSync(effectMappingPath)) {
  const effectRows = readTab(effectMappingPath);
  const effectMapping = {};
  for (const row of effectRows) {
    const name = String(row.NAME || "").trim();
    if (!name) continue;
    effectMapping[name] = {
      type: String(row.TYPE || "").trim(),
      subtype: String(row.SUBTYPE || "").trim(),
    };
  }
  fs.writeFileSync(
    path.join(outDir, "effect_mapping.json"),
    JSON.stringify(effectMapping),
    "utf8"
  );
  console.log(`Generated public/data/effect_mapping.json (${Object.keys(effectMapping).length} entries)`);
}