const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/expertise.json'));
const tables = JSON.parse(fs.readFileSync('D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/string_tables.json'));

const validTrees = data.trees.filter(t => t.nodes.length > 0 && !t.key.includes('place_holder'));
for (const tree of validTrees) {
  console.log('\n=== ' + tree.key + ' ===');
  for (const node of tree.nodes) {
    const mods = [...new Set(node.ranks.flatMap(r => (r.skillMods||[]).map(m => tables.statNames[m.key]||m.key)))];
    const cmds = [...new Set(node.ranks.flatMap(r => (r.commands||[]).map(c => tables.cmdNames[c]||c)))];
    console.log('  T'+node.tier+'/G'+node.grid+' "'+node.displayName+'"');
    if (mods.length) console.log('    mods: '+mods.join(' | '));
    if (cmds.length) console.log('    cmds: '+cmds.join(' | '));
  }
}
