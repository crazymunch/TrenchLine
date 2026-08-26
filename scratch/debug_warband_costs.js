const fs = require('fs');
const { importNewRecruitJson } = require('./src/services/newRecruitImporter');

// Let's find the imported user uploaded file
const files = fs.readdirSync('C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/');
console.log('User uploaded files:', files);

const jsonFile = files.find(f => f.endsWith('.json'));
if (jsonFile) {
  const content = fs.readFileSync('C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/' + jsonFile, 'utf8');
  const wb = importNewRecruitJson(content);
  console.log('\n=== IMPORTED WARBAND COST BREAKDOWN ===');
  console.log('Warband Name:', wb.name);
  console.log('Ducat Limit:', wb.ducatLimit);
  console.log('Glory Points:', wb.gloryPoints);
  let total = 0;
  wb.units.forEach((u, i) => {
    console.log(`${i + 1}. [${u.profileSnapshot.category}] ${u.customName} (${u.profileSnapshot.name}): ${u.totalCost} D`);
    console.log(`   Base: ${u.profileSnapshot.baseCost} D`);
    console.log(`   Weapons (${u.equippedWeapons.length}): ${u.equippedWeapons.map(w => `${w.name} (${w.cost}D)`).join(', ')}`);
    console.log(`   Armour (${u.equippedArmour.length}): ${u.equippedArmour.map(a => `${a.name} (${a.cost}D)`).join(', ')}`);
    console.log(`   Equipment (${u.equippedEquipment.length}): ${u.equippedEquipment.map(e => `${e.name} (${e.cost}D)`).join(', ')}`);
    total += u.totalCost;
  });
  console.log('\nCalculated Total in App:', total, 'D');
  console.log('Expected in NewRecruit:', 1320, 'D');
  console.log('Difference:', total - 1320, 'D');
}
