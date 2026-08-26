const fs = require('fs');

const jsonPath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/media_1787736834007.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const selections = data.roster?.forces?.[0]?.selections || [];

function sumRecursiveCost(entry) {
  let d = 0;
  let g = 0;
  (entry.costs || []).forEach(c => {
    if (c.name === 'Ducats') d += c.value;
    if (c.name === 'Glory Points') g += c.value;
  });
  (entry.selections || []).forEach(sub => {
    const subCost = sumRecursiveCost(sub);
    d += subCost.d;
    g += subCost.g;
  });
  return { d, g };
}

console.log(`Total selections: ${selections.length}`);
let overallD = 0;
let overallG = 0;

selections.forEach((u, i) => {
  const { d, g } = sumRecursiveCost(u);
  console.log(`\n${i+1}. [${u.type}] ${u.customName ? `"${u.customName}"` : ''} ${u.name} => ${d} D, ${g} Glory`);
  overallD += d;
  overallG += g;
  (u.selections || []).forEach(sub => {
    const subCost = sumRecursiveCost(sub);
    if (subCost.d > 0 || subCost.g > 0 || sub.selections?.length > 0) {
      console.log(`   - ${sub.name}: ${subCost.d} D, ${subCost.g} Glory`);
      (sub.selections || []).forEach(sub2 => {
        const sub2Cost = sumRecursiveCost(sub2);
        if (sub2Cost.d > 0 || sub2Cost.g > 0) {
          console.log(`       * ${sub2.name}: ${sub2Cost.d} D, ${sub2Cost.g} Glory`);
        }
      });
    }
  });
});

console.log(`\n=============================`);
console.log(`Total Sum of Selections: ${overallD} Ducats, ${overallG} Glory`);
