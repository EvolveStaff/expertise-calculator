const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/expertise.json'));
const tables = JSON.parse(fs.readFileSync('D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/string_tables.json'));

const STANDARD_COMBAT = [
  'combat_1hsword','combat_2hsword','combat_polearm','combat_unarmed',
  'combat_carbine','combat_pistol','combat_rifleman','combat_heavy_weapon'
];

for (const tree of data.trees) {
  if (!STANDARD_COMBAT.includes(tree.key)) continue;
  console.log('\n=== ' + tree.key + ' ===');
  for (const node of tree.nodes) {
    const mods = node.ranks.flatMap(r => (r.skillMods||[]).map(m => (tables.statNames[m.key] || m.key) + ':' + (r.skillMods.find(x=>x.key===m.key)||{value:''}).value));
    const cmds = node.ranks.flatMap(r => (r.commands||[]).map(c => tables.cmdNames[c] || c));
    const uniqueMods = [...new Set(mods.map(m => m.split(':')[0]))].slice(0,3);
    const uniqueCmds = [...new Set(cmds)].slice(0,2);
    const line = '  T'+node.tier+'/G'+node.grid+' "'+node.displayName+'"';
    const details = [];
    if (uniqueMods.length) details.push('mods='+uniqueMods.join(' | '));
    if (uniqueCmds.length) details.push('cmds='+uniqueCmds.join(' | '));
    console.log(line);
    if (details.length) console.log('    '+details.join('  '));
  }
}
