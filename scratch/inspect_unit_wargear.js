const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => [
    'selectionEntry', 'selectionEntryGroup', 'entryLink', 'profile', 
    'characteristic', 'cost', 'rule', 'categoryLink', 'infoGroup', 'infoLink', 'modifier'
  ].includes(name)
});

// Let's inspect a few units from New Antioch and Iron Sultanate
const na = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/New Antioch.cat', 'utf8'));
const is = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/Iron Sultanate.cat', 'utf8'));

function inspectUnitWargear(cat, unitName) {
  const allEntries = [
    ...(cat.catalogue?.selectionEntries?.selectionEntry || []),
    ...(cat.catalogue?.sharedSelectionEntries?.selectionEntry || [])
  ];
  const u = allEntries.find(e => e['@_name'] === unitName);
  if (!u) {
    console.log(`Unit ${unitName} not found in catalogue`);
    return;
  }
  console.log(`\n=== UNIT: ${u['@_name']} ===`);
  const groups = u.selectionEntryGroups?.selectionEntryGroup || [];
  groups.forEach(g => {
    console.log(`  Group: [${g['@_name']}] (type: ${g['@_type']})`);
    const links = (g.entryLinks?.entryLink || []).map(l => l['@_name']);
    const entries = (g.selectionEntries?.selectionEntry || []).map(e => e['@_name']);
    if (links.length > 0) console.log(`    Links: ${links.join(', ')}`);
    if (entries.length > 0) console.log(`    Entries: ${entries.join(', ')}`);

    // Nested groups
    (g.selectionEntryGroups?.selectionEntryGroup || []).forEach(ng => {
      console.log(`    SubGroup: [${ng['@_name']}]`);
      const subLinks = (ng.entryLinks?.entryLink || []).map(l => l['@_name']);
      const subEntries = (ng.selectionEntries?.selectionEntry || []).map(e => e['@_name']);
      if (subLinks.length > 0) console.log(`      SubLinks: ${subLinks.join(', ')}`);
      if (subEntries.length > 0) console.log(`      SubEntries: ${subEntries.join(', ')}`);
    });
  });
}

inspectUnitWargear(na, 'Combat Medic');
inspectUnitWargear(na, 'Sniper Priest');
inspectUnitWargear(na, 'Mechanized Heavy Infantry');
inspectUnitWargear(is, 'Jabirean Alchemist');
inspectUnitWargear(is, 'Brazen Bull');
inspectUnitWargear(is, 'Sultanate Sapper');
