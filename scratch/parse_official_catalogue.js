const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => [
    'selectionEntry', 'selectionEntryGroup', 'entryLink', 'profile', 
    'characteristic', 'cost', 'rule', 'categoryLink', 'infoGroup', 'infoLink'
  ].includes(name)
});

// 1. Parse GST (Game System)
const gstContent = fs.readFileSync('scratch/trench_crusade_repo/Trench Crusade.gst', 'utf8');
const gst = parser.parse(gstContent);

console.log('--- SHARED PROFILES IN GST ---');
const sharedProfiles = gst.gameSystem?.sharedProfiles?.profile || [];
console.log('Total profiles in GST:', sharedProfiles.length);
const profileTypes = new Set(sharedProfiles.map(p => p['@_typeName']));
console.log('Profile types:', Array.from(profileTypes));

// 2. Parse Melee Weapons
const meleeCat = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/Melee Weapons.cat', 'utf8'));
const meleeEntries = meleeCat.catalogue?.sharedSelectionEntries?.selectionEntry || [];
console.log('\n--- MELEE WEAPONS ---');
meleeEntries.forEach(e => {
  const cost = e.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? e.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : 0;
  console.log(`- ${e['@_name']} (${cost} D)`);
});

// 3. Parse Ranged Weapons
const rangedCat = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/Ranged Weapons.cat', 'utf8'));
const rangedEntries = rangedCat.catalogue?.sharedSelectionEntries?.selectionEntry || [];
console.log('\n--- RANGED WEAPONS ---');
rangedEntries.forEach(e => {
  const cost = e.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? e.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : 0;
  console.log(`- ${e['@_name']} (${cost} D)`);
});

// 4. Parse Equipment
const equipCat = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/Equipment.cat', 'utf8'));
const equipEntries = equipCat.catalogue?.sharedSelectionEntries?.selectionEntry || [];
console.log('\n--- EQUIPMENT & ARMOUR ---');
equipEntries.forEach(e => {
  const cost = e.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? e.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : 0;
  console.log(`- ${e['@_name']} (${cost} D)`);
});
