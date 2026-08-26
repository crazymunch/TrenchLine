const fs = require('fs');

const jsonPath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/media_1787736834007.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Let's inspect the exact logic from newRecruitImporter.ts
const rawUnits = data.roster?.forces?.[0]?.selections || [];

function getSelectionCost(item) {
  let sum = 0;
  if (Array.isArray(item.costs)) {
    const dCost = item.costs.find(c => c.name === 'Ducats');
    if (dCost && typeof dCost.value === 'number') sum += dCost.value;
  }
  if (Array.isArray(item.selections)) {
    item.selections.forEach(sub => { sum += getSelectionCost(sub); });
  }
  return sum;
}

let grandTotal = 0;
rawUnits.forEach((sel, idx) => {
  const isConfig = sel.name.includes('Configuration') || sel.name.includes('Campaign Rules') || sel.name.includes('Warband Variant');
  const isPileOfStuff = sel.name.includes('Pile of Stuff');
  if (isConfig || isPileOfStuff) return;

  const totalUnitCost = getSelectionCost(sel);
  grandTotal += totalUnitCost;
  console.log(`${idx + 1}. ${sel.customName || sel.name} (${sel.name}) -> totalCost: ${totalUnitCost} D`);
});

console.log('Grand Total of imported units:', grandTotal);
