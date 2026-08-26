const fs = require('fs');

const warbands = fs.readFileSync('scratch/warbands_clean.txt', 'utf8');

function findUnit(name) {
  console.log(`\n========================================`);
  console.log(`=== UNIT: ${name} ===`);
  console.log(`========================================`);
  let idx = warbands.indexOf(name);
  if (idx === -1) {
    console.log('Not found');
    return;
  }
  // Find where stats are described
  while (idx !== -1) {
    const chunk = warbands.slice(idx, idx + 1200);
    if (chunk.includes('DUC') || chunk.includes('Movement') || chunk.includes('Ranged') || chunk.includes('Melee') || chunk.includes('Armour') || chunk.includes('Base Cost') || chunk.includes('Cost')) {
      console.log(chunk);
      return;
    }
    idx = warbands.indexOf(name, idx + name.length);
  }
  console.log('No stat chunk found');
}

findUnit('Lieutenant');
findUnit('Sniper Priest');
findUnit('Trench Cleric');
findUnit('Mechanized Heavy Infantry');
findUnit('Shocktroopers');
findUnit('Yeomen');
findUnit('War Prophet');
findUnit('Castigator');
findUnit('Anchorite Shrine');
findUnit('Heretic Priest');
findUnit('Heretic Troopers');
findUnit('Brazen Bull');
findUnit('Janissaries');
