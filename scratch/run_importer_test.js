const fs = require('fs');
const ts = require('typescript');

const importerCode = fs.readFileSync('src/services/newRecruitImporter.ts', 'utf8');
const defaultRulesCode = fs.readFileSync('src/data/defaultRules.ts', 'utf8');

const transpiledImporter = ts.transpileModule(importerCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const transpiledRules = ts.transpileModule(defaultRulesCode, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

const rulesModule = { exports: {} };
const rulesFunc = new Function('exports', 'module', 'require', transpiledRules);
rulesFunc(rulesModule.exports, rulesModule, require);

const importerModule = { exports: {} };
const customRequire = (id) => {
  if (id.includes('defaultRules')) return rulesModule.exports;
  return require(id);
};
const importerFunc = new Function('exports', 'module', 'require', transpiledImporter);
importerFunc(importerModule.exports, importerModule, customRequire);

const jsonContent = fs.readFileSync('C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/media_1787736834007.json', 'utf8');
const wb = importerModule.exports.importNewRecruitRoster(jsonContent);

console.log('\n=== IMPORTED WARBAND RESULTS ===');
console.log('Warband Name:', wb.name);
console.log('Ducat Limit:', wb.ducatLimit);
console.log('Glory Points:', wb.gloryPoints);
console.log('Armory Stash:', wb.armoryStash);

let sumTotalCost = 0;
wb.units.forEach((u, i) => {
  console.log(`${i+1}. [${u.profileSnapshot.category}] ${u.customName} (${u.profileSnapshot.name}) -> totalCost: ${u.totalCost} D`);
  console.log(`   Base: ${u.profileSnapshot.baseCost} D`);
  console.log(`   Weapons: ${u.equippedWeapons.map(w => `${w.name} (${w.cost}D)`).join(', ') || 'None'}`);
  console.log(`   Armour: ${u.equippedArmour.map(a => `${a.name} (${a.cost}D)`).join(', ') || 'None'}`);
  console.log(`   Equipment: ${u.equippedEquipment.map(e => `${e.name} (${e.cost}D)`).join(', ') || 'None'}`);
  sumTotalCost += u.totalCost;
});

console.log('\nTotal Cost Sum of Units:', sumTotalCost, 'D');
