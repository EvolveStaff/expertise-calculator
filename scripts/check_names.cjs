const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/Games/SWGEvolve/Evolve_Expertise_calc/public/data/expertise.json'));
const prefixPattern = /^(Sp |Bh |Co |Sm |Fn |Tk |Bm |Sl |Cm |Hw |Gr |En )/;
const abbrPattern = / (Acr|Dam|Def|Dta|Mgb|Chr)\b/;
const issues = [];
for (const tree of data.trees) {
  if (tree.key.includes('place_holder') || tree.nodes.length === 0) continue;
  for (const node of tree.nodes) {
    const n = node.displayName;
    if (!n || n.startsWith('Fs ')) continue;
    if (prefixPattern.test(n) || abbrPattern.test(n)) {
      issues.push('[' + tree.key + '] T' + node.tier + 'G' + node.grid + ' "' + n + '"');
    }
  }
}
console.log(issues.length === 0 ? 'All clean!' : issues.length + ' remaining:');
issues.forEach(i => console.log(i));
