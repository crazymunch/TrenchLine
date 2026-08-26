const fs = require('fs');

const jsonPath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/media_1787736834007.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const units = (data.roster?.selections || []).filter(s => {
  const name = s.name || '';
  return !name.includes('Configuration') && !name.includes('Pile of Stuff') && !name.includes('Warband Variant');
});

console.log(`Found ${units.length} units in JSON:`);

function getEntryCost(entry) {
  let d = 0;
  let g = 0;
  (entry.costs || []).forEach(c => {
    if (c.name === 'Ducats') d += c.value;
    if (c.name === 'Glory Points') g += c.value;
  });
  return { d, g };
}

function sumRecursiveCost(entry) {
  let { d, g } = getEntryCost(entry);
  (entry.selections || []).forEach(sub => {
    const subCost = sumRecursiveCost(sub);
    d += subCost.d;
    g += subCost.g;
  });
  return { d, g };
}

units.forEach((u, i) => {
  const { d, g } = sumRecursiveCost(u);
  console.log(`\nUnit ${i+1}: ${u.customName || u.name} (${u.name}) -> JSON Total: ${d} D, ${g} Glory`);
  (u.selections || []).forEach(sub => {
    const subCost = sumRecursiveCost(sub);
    console.log(`  - Sub: ${sub.name} -> ${subCost.d} D, ${subCost.g} Glory`);
    (sub.selections || []).forEach(sub2 => {
      const sub2Cost = sumRecursiveCost(sub2);
      if (sub2Cost.d > 0 || sub2Cost.g > 0) {
        console.log(`      * ${sub2.name} -> ${sub2Cost.d} D, ${sub2Cost.g} Glory`);
      }
    });
  });
});
