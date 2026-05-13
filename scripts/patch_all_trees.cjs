// Comprehensive display name patch for all expertise trees
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../public/data/expertise.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Explicit nodeId -> new displayName overrides
const EXPLICIT = {

  // ── FENCER (combat_1hsword) ──────────────────────────────────────────────
  expertise_fencer_acr:                    'Fencer Efficiency',
  expertise_of_decapitate:                 'Decapitate',
  expertise_fencer_acc:                    'Fencer Accuracy',
  expertise_of_vortex:                     'Vortex',
  expertise_fn_general_switcheroo:         'Switcheroo',
  expertise_fencer_dam:                    'Fencer Damage',
  expertise_fn_general_head_crack:         'Head Crack',
  expertise_fencer_sp:                     'Fencer Power',
  expertise_fencer_def:                    'Fencer Defense',
  expertise_fencer_cc:                     'Fencer Critical Chance',
  expertise_fn_general_one_two_pummel:     'One-Two Pummel',

  // ── SWORDSMAN (combat_2hsword) ───────────────────────────────────────────
  expertise_swordsman_acr:                 'Swordsman Efficiency',
  expertise_swordsman_acc:                 'Swordsman Accuracy',
  expertise_carbineer_attack:              'Melee Strike',
  expertise_swordsman_dam:                 'Swordsman Damage',
  expertise_swordsman_sp:                  'Swordsman Power',
  expertise_me_vital_damage:               'Vital Damage',
  expertise_swordsman_def:                 'Swordsman Defense',
  expertise_swordsman_cc:                  'Swordsman Critical Chance',

  // ── PIKEMAN (combat_polearm) ─────────────────────────────────────────────
  expertise_pikeman_acr:                   'Pikeman Efficiency',
  expertise_pikeman_acc:                   'Pikeman Accuracy',
  expertise_sm_general_switcheroo:         'Switcheroo',
  expertise_pikeman_dam:                   'Pikeman Damage',
  expertise_sm_general_head_crack:         'Head Crack',
  expertise_pikeman_sp:                    'Pikeman Power',
  expertise_pikeman_def:                   'Pikeman Defense',
  expertise_pikeman_cc:                    'Pikeman Critical Chance',
  expertise_sm_general_one_two_pummel:     'One-Two Pummel',

  // ── MARTIAL ARTIST (combat_unarmed) ─────────────────────────────────────
  expertise_unarmed_acr:                   'Unarmed Efficiency',
  expertise_en_strike:                     'Strike',
  expertise_unarmed_acc:                   'Unarmed Accuracy',
  expertise_tk_spiral_kick:                'Spiral Kick',
  expertise_unarmed_dam:                   'Unarmed Damage',
  expertise_en_strike_damage:              'Strike Damage',
  expertise_unarmed_sp:                    'Unarmed Power',
  expertise_tk_uprising:                   'Uprising',
  expertise_unarmed_def:                   'Unarmed Defense',
  expertise_unarmed_cc:                    'Unarmed Critical Chance',

  // ── TERAS KASI (combat_teras_kasi) ──────────────────────────────────────
  teras_kasi_novice:                       'Teras Kasi Novice',
  expertise_teras_kasi_dam:                'Unarmed Damage',
  expertise_teras_kasi_acr:                'Unarmed Action Cost Reduction',
  expertise_teras_kasi_adv_armor_all:      'Advanced Innate Armor',
  expertise_teras_kasi_cc:                 'Unarmed Crit Chance',
  expertise_teras_kasi_dr:                 'Damage Reduction',
  expertise_teras_kasi_armor_mgb:          'Melee/Grenade/Blast Armor',
  expertise_teras_kasi_master:             'Teras Kasi Master',
  expertise_tk_unhealthy_fixation:         'Nerve Strike',
  expertise_tk_thrill:                     'Thrill',
  expertise_tk_project_will:               'Project Will',
  expertise_tk_allure:                     'Nerve Strike Duration',
  expertise_tk_thrill_dur:                 'To The Hilt',
  expertise_tk_void_dance:                 'Void Walk',
  expertise_tk_sweeping_pirouette:         'Sweeping Kick',
  expertise_tk_emotional_prescience:       'Emotional Prescience',
  expertise_tk_annulling:                  'Annulling',
  expertise_tk_chr:                        'Critical Hit Reduction',
  expertise_tk_controlled_spin:            'Controlled Spin',
  expertise_tkm_taunt:                     'Instigate',
  expertise_tkm_ae_taunt:                  'Area Instigate',

  // ── CARBINEER (combat_carbine) ───────────────────────────────────────────
  expertise_carbineer_carbine_acr:         'Carbine Efficiency',
  expertise_carbineer_carbine_acc:         'Carbine Accuracy',
  expertise_carbineer_carbine_def:         'Carbine Defense',
  expertise_carbineer_carbine_dam:         'Carbine Damage',
  expertise_bh_return_fire:                'Return Fire',
  expertise_carbineer_carbine_sp:          'Carbine Power',
  expertise_bh_ass_act:                    'Assassination Efficiency',
  expertise_bh_relentless:                 'Relentless Pursuit',
  expertise_carbineer_carbine_cc:          'Carbine Critical Chance',

  // ── PISTOLEER (combat_pistol) ────────────────────────────────────────────
  expertise_pistoleer_pistol_acr:          'Pistol Efficiency',
  expertise_pistoleer_pistol_acc:          'Pistol Accuracy',
  expertise_sm_general_hammer_fanning:     'Hammer Fanning',
  expertise_pistoleer_pistol_dam:          'Pistol Damage',
  expertise_sm_path_pistol_whip:           'Pistol Whip',
  expertise_sm_general_hair_trigger:       'Hair Trigger',
  expertise_pistoleer_pistol_sp:           'Pistol Power',
  expertise_of_sure_dam:                   'Sure Shot Damage',
  expertise_pistoleer_pistol_def:          'Pistol Defense',
  expertise_pistoleer_pistol_cc:           'Pistol Critical Chance',
  expertise_sm_path_beat_down:             'Beat Down',

  // ── RIFLEMAN (combat_rifleman) ───────────────────────────────────────────
  expertise_rifleman_rifle_acr:            'Rifle Efficiency',
  expertise_marksman_ff:                   'Focused Fire',
  expertise_rifleman_rifle_acc:            'Rifle Accuracy',
  expertise_bh_cover:                      'Take Cover',
  expertise_rifleman_rifle_dam:            'Rifle Damage',
  expertise_co_ae_dm:                      'Sweeping Fire',
  expertise_co_hose_down:                  'Hose Down',
  expertise_rifleman_rifle_sp:             'Rifle Power',
  expertise_bh_amb_act:                    'Ambush Efficiency',
  expertise_rifleman_rifle_def:            'Rifle Defense',
  expertise_rifleman_rifle_cc:             'Rifle Critical Chance',
  expertise_rifleman_master:               'Master Rifleman',

  // "expertise_marksman_ability" appears in carbine, rifleman, BH trees - shared ID
  // Handled via tree-specific logic below

  // ── HEAVY WEAPON (combat_heavy_weapon) ──────────────────────────────────
  expertise_co_enhanced_fuel_cans:         'Enhanced Fuel Cans',
  expertise_co_focus_beam:                 'Focus Beam',
  expertise_co_tibanna_gas:                'Tibanna Gas',
  expertise_co_lethal_beam:                'Lethal Beam',
  expertise_co_suppressing_fire:           'Suppressing Fire',
  expertise_hw_dot:                        'Heavy Weapon DoT',
  expertise_co_hw_dot:                     'Heavy Weapon Slow Burn',
  expertise_co_focus_beam_damage:          'Focus Beam Damage',
  expertise_hw_crit:                       'Critical Chance',
  expertise_co_lethal_beam_damage:         'Lethal Beam Damage',
  expertise_co_suppression_efficiency:     'Suppression Efficiency',
  expertise_hw_acc:                        'Accuracy',
  expertise_co_ae_hw_dot:                  'Area Heavy Weapon DoT',

  // ── ASSASSIN / SPY (combat_assassin) ────────────────────────────────────
  expertise_sp_novice:                     'Spy Novice',
  expertise_sp_hidden_daggers:             'Advanced Strikes',
  expertise_sp_puncturing_strikes:         'Puncturing Strikes',
  expertise_sp_cheap_strikes:              'Cheap Strikes',
  expertise_sp_decoy:                      'Decoy',
  expertise_sp_cloaked_attacks:            'Deceptive Attacks',
  expertise_sp_opportunity:                'Opportunity',
  expertise_sp_dm:                         'Assassinate',
  expertise_sp_close_quarters:             'Close Quarters',
  expertise_sp_diversion:                  'Diversion',
  expertise_sp_cloak_and_dagger:           'Cloak and Dagger',
  expertise_sp_jagged_edge:                'Jagged Edge',
  expertise_sp_action_regen:               'Action Regeneration',
  expertise_sp_run_its_course:             'Run Its Course',
  expertise_sp_assassins_blade:            "Assassin's Blade",
  expertise_sp_fld_debuff_ca:              'Flashbang',
  expertise_sp_initiative:                 'Initiative',
  expertise_sp_savagery:                   'Savagery',
  expertise_sp_assassins_mark:             "Assassin's Mark",
  expertise_sp_vibrogenerator:             'Vibrogenerator',
  expertise_sp_resonance:                  'Resonance',
  expertise_sp_master:                     'Master Assassin',
  expertise_sp_avoid_damage:               'Avoid Damage',
  expertise_sp_shifty_setup:               'Shifty Setup',

  // ── BOUNTY HUNTER (combat_bountyhunter) ─────────────────────────────────
  combat_bountyhunter_novice:              'Novice Bounty Hunter',
  expertise_bh_burn:                       'Burn',
  expertise_bh_torse_shot:                 'Torso Shot',
  expertise_bh_tangle:                     'Trapping',
  expertise_bh_trap_dam:                   'Lethality',
  expertise_bh_armor_duelist:              'Duelist Stance',
  expertise_bh_crit:                       'Critical Chance',
  expertise_bh_eye_shot:                   'Eye Shot',
  expertise_sp_noxious_traps:              'Trap Enhancements',
  expertise_bh_intimidate:                 'Intimidating Strike',
  expertise_bh_fumble:                     'Fumble',
  expertise_bh_man_crit:                   'Man Hunter',
  expertise_bh_confusion_shot:             'Confusion Shot',
  expertise_bh_taunt:                      'Antagonize',
  expertise_bh_dread_strike:               'Dread Strike',
  expertise_bh_prescience:                 'Prescience',
  expertise_bh_absorbtion:                 'Absorption',
  expertise_bh_critical_shot:              'Critical Shot',
  expertise_bh_stun:                       'Pinning Shot',
  expertise_bh_reveal:                     'Reveal Bounty',
  expertise_bh_shields:                    'Shields',
  combat_bountyhunter_master:              'Master Bounty Hunter',
  expertise_sp_preparation:               'Preparation',
  expertise_bh_underhand_shot:             'Underhand Shot',

  // ── COMMANDO (combat_commando) ───────────────────────────────────────────
  combat_commando_novice:                  'Novice Commando',
  expertise_co_powered_armor:              'Powered Armor',
  expertise_co_stim_armor:                 'Stim Armor',
  expertise_co_on_target:                  'On Target',
  expertise_co_pinpoint_shielding:         'Pinpoint Shielding',
  expertise_co_diagnostic_armor:           'Diagnostic Armor',
  expertise_co_cluster_bomb:               'Cluster Bomb',
  expertise_co_armor_splash:               'Armor Splash',
  expertise_co_double_time:                'Double Down',
  expertise_co_deflective_armor:           'Deflective Armor',
  expertise_co_stand_fast:                 'Stand Fast',
  expertise_co_blast_resistance:           'Blast Resistance',
  expertise_co_mirror_armor:               'Mirror Armor',
  expertise_co_blow_em_away:               "Blow 'Em Away",
  expertise_co_base_of_operations:         'Base of Operations',
  expertise_co_first_aid_training:         'First Aid Training',
  expertise_co_imp_stand_fast:             'Improved Stand Fast',
  expertise_co_youll_regret_that:          "You'll Regret That",
  expertise_co_imp_riddle_armor:           'Improved Riddle Armor',
  expertise_co_riddle_armor:               'Riddle Armor',
  expertise_co_armor_cracker:              'Armor Shredder',
  expertise_co_ae_taunt:                   'Area Enrage',
  expertise_co_taunt:                      'Enrage',
  combat_commando_master:                  'Master Commando',
  expertise_co_killing_spree:              'Killing Spree',
  expertise_co_killing_grimace:            'Killing Grimace',

  // ── SMUGGLER (combat_smuggler) ───────────────────────────────────────────
  combat_smuggler_novice:                  'Novice Smuggler',
  expertise_sm_general_spot_a_sucker:      'Spot a Sucker',
  expertise_sm_path_skullduggery:          'Skullduggery',
  expertise_sm_path_smooth_move:           'Smooth Move',
  expertise_sm_del_dm_cc:                  'Dirty Trick',
  expertise_sm_general_off_the_cuff:       'Off the Cuff',
  expertise_sm_general_meager_fortune:     'Meager Fortune',
  expertise_sm_path_eat_dirt:              'Eat Dirt',
  expertise_sm_path_scandal:               'Scandal',
  expertise_sm_path_inside_information:    'Inside Information',
  expertise_sm_general_double_deal:        'Double Deal',
  expertise_sm_general_wretched_fate:      'Wretched Fate',
  expertise_sm_path_blindside:             'Blindside',
  expertise_sm_path_off_the_books:         'Off the Books',
  expertise_sm_general_break_the_deal:     'Break the Deal',
  expertise_sm_general_end_of_the_line:    'End of the Line',
  expertise_sm_general_poor_prospect:      'Poor Prospect',
  expertise_sm_buff_invis_ally:            'Camouflage Ally',
  expertise_sm_path_blaster_at_your_side:  'Blaster at Your Side',
  expertise_sm_path_false_hope:            'False Hope',
  expertise_sm_general_nerf_herder:        'Nerf Herder',
  expertise_sm_path_card_up_your_sleeve:   'Card Up Your Sleeve',
  expertise_sm_path_feeling_lucky:         'Feeling Lucky',
  combat_smuggler_master:                  'Master Smuggler',
  expertise_sm_path_impossible_odds:       'Impossible Odds',
  expertise_sm_path_loaded_chance_dice:    'Loaded Chance Cubes',
  expertise_sm_path_sleight_of_hand:       'Sleight of Hand',

  // ── GRENADIER (combat_grenadier) ─────────────────────────────────────────
  expertise_co_remote_detonator:           'Remote Detonator',
  expertise_co_shock_tracer:               'Shock Tracer',
  expertise_of_aoe_act:                    'Explosives Expert',
  expertise_co_shock_grenade:              'Shock Grenade',
  expertise_co_blast_radius:               'Blast Radius',
  expertise_co_flashbang:                  'Flashbang',
  expertise_co_del_ae_cc_1:                'Concussion Grenade',
  expertise_of_aoe_dam:                    'High Explosives',
  expertise_of_dioxis:                     'Dioxis Grenade',
  expertise_gr_adv_acr:                    'Grenade Efficiency',
  expertise_co_timer_reset:                'Timer Reset',
  expertise_co_del_ae_cc_2:                'Cryoban Grenade',
  expertise_of_aoe_crit:                   'Surgical Demolitions',
  expertise_co_del_ae_dm:                  'Fragmentation Grenade',
  expertise_co_angled_shrapnel:            'Angled Shrapnel',
  expertise_co_fld_dm:                     'Mines',
  expertise_gr_anti_evade:                 'Powerful Offense',
  expertise_of_shock:                      'Seismic Grenade',
  expertise_of_del_ae_dm_dot:              'Core Bomb',
  expertise_gr_blast_resistance:           'Blast Resistance',
  expertise_of_artillery:                  'Artillery',
  expertise_of_firepower:                  'Superior Firepower',
  expertise_of_firepower_cool:             'Primacy',

  // ── COMBAT MEDIC (science_combatmedic) ───────────────────────────────────
  science_combatmedic_novice:              'Novice Combat Medic',
  expertise_me_me_dm_dot:                  'Neurotoxin',
  expertise_sp_cc_dot:                     "Arachne's Web",
  expertise_cm_damage:                     'Damage Increase',
  expertise_me_electrolyte_drain:          'Electrolyte Drain',
  expertise_me_me_fld_dm_dot:              'Nerve Gas',
  expertise_me_serotonin_purge:            'Serotonin Purge',
  expertise_cm_dot_dam:                    'DoT Damage',
  expertise_cm_crit:                       'Critical Chance',
  expertise_me_traumatize:                 'Traumatize',
  expertise_me_induce_insanity:            'Rheumatic Calamity',
  expertise_me_bacta_resistance:           'Bacta Corruption',
  expertise_cm_acr:                        'Action Efficiency',
  expertise_sp_improved_spys_fang:         "Improved Viper's Fang",
  expertise_me_thyroid_rupture:            'Thyroid Rupture',
  expertise_cm_dot_dur:                    'DoT Duration',
  science_combatmedic_master:              'Master Combat Medic',

  // ── DOCTOR (science_doctor) ──────────────────────────────────────────────
  science_doctor_novice:                   'Novice Doctor',
  expertise_me_hot:                        'Heal Over Time',
  expertise_doc_inner_peace:               'Inner Peace',
  expertise_doc_acr:                       'Doctor: Action Cost',
  expertise_me_me_bacta_ampule:            'Bacta Ampule',
  expertise_me_enhancement_specialist:     'Enhancement Specialist',
  expertise_me_hot_duration:               'Bacta Concentration',
  expertise_doc_cleanse:                   'Detox',
  expertise_doc_hp:                        'Doctor: Healing Potency',
  expertise_me_me_ae_heal:                 'Area Heal',
  expertise_me_agro_healing:               'Subtlety',
  expertise_me_serotonin_boost:            'Serotonin Boost',
  expertise_doc_reactive_adv:              'Advanced Reactive Heal',
  expertise_doc_reactive:                  'Reactive Heal',
  expertise_me_bacta_grenade:              'Bacta Grenade',
  expertise_doc_self_reflection:           'Self Reflection',
  expertise_me_cure_affliction:            'Cure Affliction',
  expertise_me_evasion:                    'Evasion',
  expertise_doc_rv:                        'Revive',
  expertise_me_bacta_bomb:                 'Bacta Bomb',
  expertise_me_blood_cleaners:             'Blood Cleaners',
  expertise_me_reckless_stimulation:       'Reckless Stimulation',
  expertise_doc_bacta_cloud:               'Bacta Cloud',
  science_doctor_master:                   'Master Doctor',
  expertise_me_stasis:                     'Stasis Field',
  expertise_me_kinetic_armor:              'Enhanced Armor',

  // ── SQUAD LEADER (outdoors_squadleader) ──────────────────────────────────
  outdoors_squadleader_novice:             'Novice Squad Leader',
  expertise_sl_dta:                        'Damage Absorption',
  expertise_of_paint_dam:                  'Identify Weakness',
  expertise_sl_acr:                        'High Efficiency Action Cost',
  expertise_of_paint_act:                  'Target Selection',
  expertise_of_armor_kin:                  'Kinetic Defense',
  expertise_sl_high_yield:                 'High Yield',
  expertise_sl_innoculation:               'Inoculation',
  expertise_sl_toughen:                    'Toughen',
  expertise_sl_adrenaline:                 'Adrenaline',
  expertise_sl_leadership:                 'Experienced Leadership',
  outdoors_squadleader_master:             'Master Squad Leader',
  expertise_sl_bacta_surge:                'Bacta Surge',
  expertise_sl_defibrillator:              'Defibrillator',
  expertise_of_advanced_paint:             'Advanced Paint Target',

  // ── ENTERTAINER (social_entertainer) ────────────────────────────────────
  social_entertainer_novice:               'Novice Entertainer',
  social_entertainer_dance:                'Dancing 1: Basic',
  social_entertainer_healing:              'Entertainer Item Use 1',
  social_entertainer_hairstyle:            'Image Design 1: Facial Hair & Trim',
  social_entertainer_music:                'Musicianship 1: Rock',

  // ── PERFORMER / MUSICIAN (social_musician) ──────────────────────────────
  social_musician_novice:                  'Novice Musician',
  social_dancer_novice:                    'Novice Dancer',
  social_dancer_knowledge:                 'Dancing Knowledge 1',
  social_dancer_shock:                     'Dancing Prop Use 1',
  social_dancer_ability:                   'Dancing Techniques',
  social_musician_knowledge:               'Musical Knowledge 1',
  social_musician_shock:                   'Instrument Use 1',
  social_musician_ability:                 'Musical Techniques',

  // ── IMAGE DESIGNER (social_imagedesigner) ───────────────────────────────
  social_imagedesigner_novice:             'Novice Image Designer',
  social_imagedesigner_hairstyle:          'Hairstyling 1: Barber',
  social_imagedesigner_exotic:             'Face 1: Facial Customization',
  social_imagedesigner_bodyform:           'Bodyform 1: Personal Training',
  social_imagedesigner_markings:           'Markings 1: Tattoos',

  // ── MUSE (social_muse) ───────────────────────────────────────────────────
  social_muse_novice:                      'Novice Muse',

  // ── BEAST MASTER (expertise_tree_beastmaster) ────────────────────────────
  expertise_bm_soothing_comfort:           'Soothing Comfort',
  expertise_bm_specialized_supplements:   'Specialized Supplements',
  expertise_bm_novice:                     'Beast Master Novice',
  expertise_bm_creature_knowledge_command: 'Creature Knowledge',
  expertise_bm_pet_recovery:               'Pet Recovery',
  expertise_bm_improved_healing:           'Improved Healing',
  expertise_bm_exceptional_nutrition:      'Exceptional Nutrition',
  expertise_bm_loyalty_mod:                'Loyalty',
  expertise_bm_abilility_aquisition_mod:   'Ability Acquisition',
  expertise_bm_evasion:                    'Evasion',
  expertise_bm_fortitude:                  'Fortitude',
  expertise_bm_dexterity_training:         'Dexterity Training',
  expertise_bm_savagery:                   'Savagery',
  expertise_bm_master:                     'Master Beast Master',

  // ── BIO-ENGINEER (outdoors_bio_engineer) ─────────────────────────────────
  outdoors_bio_engineer_novice:            'Bio-Engineer Novice',
  outdoors_bio_engineer_creature:          'Creature Genetics',
  outdoors_bio_engineer_tissue:            'Tissue Engineering',
  expertise_bm_incubation_base:            'Incubation',
  outdoors_bio_engineer_dna_harvesting:    'DNA Harvesting',
  outdoors_bio_engineer_production:        'Production',
  outdoors_bio_engineer_master:            'Bio-Engineer Master',

  // ── ASSASSIN / SPY novice ────────────────────────────────────────────────
  expertise_sp_novice:                     'Novice Assassin',

  // ── BATTLE MASTER / JEDI (combat_battlemaster) ───────────────────────────
  expertise_fs_battlemaster_novice:        'Novice Battlemaster',
  expertise_fs_battlemaster_master:        'Master Battlemaster',
  expertise_fs_guardian_novice:            'Novice Guardian',
  expertise_fs_guardian_master:            'Master Guardian',
  expertise_fs_mystic_novice:              'Novice Mystic',
  expertise_fs_mystic_master:              'Master Mystic',
  expertise_fs_sage_novice:               'Novice Sage',
  expertise_fs_sage_master:               'Master Sage',
  expertise_fs_dta:                        'Force Damage to Action',
  expertise_fs_acr:                        'Force Efficiency',
  expertise_fs_saber_strike_adv:           'Fs Advanced Saber Strike',
  expertise_fs_hit:                        'Fs Force Hit',
  expertise_fs_saber_sweep_adv:            'Fs Advanced Saber Sweep',

  // ── SAGE (combat_sage) ────────────────────────────────────────────────────
  expertise_fs_heal_acr:                   'Fs Heal Efficiency',
  expertise_force_heal_aoe:                'Force Heal AoE',
  expertise_fs_aoe_heal_increase:          'Fs AoE Heal Increase',
  expertise_fs_path_forsake_fear_cd:       'Fs Forsake Fear Cooldown',
  expertise_fs_aoe_revive:                 'Fs AoE Revive',
  expertise_fs_aoe_revive_duration:        'Fs AoE Revive Duration',
};

// Tree-specific overrides for nodeIds that exist in multiple trees
// (e.g. expertise_marksman_ability appears in carbine, rifleman, BH with different meaning)
const TREE_SPECIFIC = {
  combat_carbine:      { expertise_marksman_ability: 'Assassinate', expertise_carbineer_attack: 'Concussion Shot', expertise_bh_relentless: 'Relentless Onslaught' },
  combat_rifleman:     { expertise_marksman_ability: 'Ambush' },
  combat_bountyhunter: { expertise_marksman_ability: 'Cripple' },
  combat_2hsword:      { expertise_carbineer_attack: 'Vital Strike' },
  combat_teras_kasi:   { expertise_teras_kasi_armor_mgb: 'Melee Defense', expertise_tk_emotional_prescience: 'Alacrity' },
};

// Apply patches
let changed = 0;
for (const tree of data.trees) {
  const treeSpecific = TREE_SPECIFIC[tree.key] || {};
  for (const node of tree.nodes) {
    const override = treeSpecific[node.nodeId] ?? EXPLICIT[node.nodeId];
    if (override && node.displayName !== override) {
      console.log(`[${tree.key}] T${node.tier}G${node.grid} "${node.displayName}" → "${override}"`);
      node.displayName = override;
      changed++;
    }
  }
}

console.log(`\nTotal changes: ${changed}`);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Written expertise.json');
