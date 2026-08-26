const fs = require('fs');

const warbands = fs.readFileSync('scratch/warbands_clean.txt', 'utf8');

// Split by page break
const pages = warbands.split('--- PAGE BREAK ---');
console.log('Total Warband pages:', pages.length);

// Search for pages containing specific unit entries
function inspectUnitPage(unitName) {
  console.log(`\n========================================`);
  console.log(`=== LOOKING FOR PAGE OF: ${unitName} ===`);
  console.log(`========================================`);
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p.toLowerCase().includes(unitName.toLowerCase()) && (p.includes('Movement') || p.includes('Ranged') || p.includes('Melee') || p.includes('Armour') || p.includes('DUC') || p.includes('pts') || p.includes('Base Cost') || p.includes('COST') || p.includes('Cost:'))) {
      console.log(`--- Page Index ${i + 1} ---`);
      console.log(p.trim());
    }
  }
}

inspectUnitPage('Lieutenant');
inspectUnitPage('Shocktroopers');
inspectUnitPage('Sniper Priest');
inspectUnitPage('Combat Medic');
