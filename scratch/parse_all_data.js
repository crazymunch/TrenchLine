const fs = require('fs');

const coreRules = fs.readFileSync('scratch/core_rules_pages.txt', 'utf8');
const eqPages = fs.readFileSync('scratch/equipment_and_weapons_pages.txt', 'utf8');
const naPages = fs.readFileSync('scratch/new_antioch_pages.txt', 'utf8');
const tpPages = fs.readFileSync('scratch/trench_pilgrims_pages.txt', 'utf8');
const isPages = fs.readFileSync('scratch/iron_sultanate_pages.txt', 'utf8');
const hlPages = fs.readFileSync('scratch/heretic_legions_pages.txt', 'utf8');
const bgPages = fs.readFileSync('scratch/black_grail_pages.txt', 'utf8');
const ctPages = fs.readFileSync('scratch/court_pages.txt', 'utf8');
const mcPages = fs.readFileSync('scratch/mercenaries_pages.txt', 'utf8');

console.log('--- EXTRACTING WEAPONS FROM EQ PAGES ---');
const wepMatches = eqPages.match(/([A-Z][A-Za-z\s\-\/\(\)]+)\s+(Melee|Ranged|Both)\s+([0-9]”|Melee|Template|[0-9]+-[0-9]+”)\s+([^\n]+)/g);
if (wepMatches) {
  console.log('Found weapons:', wepMatches.length);
  console.log(wepMatches.slice(0, 10).join('\n'));
}

console.log('--- EXTRACTING UNITS FROM NA PAGES ---');
console.log(naPages.slice(0, 3000));
