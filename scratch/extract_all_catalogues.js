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

// Load GST for base weapon/armour profiles
const gst = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/Trench Crusade.gst', 'utf8'));
const gstProfiles = gst.gameSystem?.sharedProfiles?.profile || [];
const profileMap = {};
gstProfiles.forEach(p => {
  profileMap[p['@_name']] = p;
});

console.log('GST Profile Map keys count:', Object.keys(profileMap).length);

const catFiles = [
  'New Antioch.cat',
  'Trench Pilgrims.cat',
  'Iron Sultanate.cat',
  'Heretic Legion.cat',
  'Black Grail.cat',
  'Court of the Seven-Headed Serpent.cat',
  'Mercenaries.cat'
];

catFiles.forEach(cf => {
  const cat = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/' + cf, 'utf8'));
  console.log(`\n========================================`);
  console.log(`CATALOGUE: ${cat.catalogue?.['@_name'] || cf}`);
  console.log(`========================================`);
  
  const entries = cat.catalogue?.sharedSelectionEntries?.selectionEntry || [];
  entries.forEach(e => {
    const name = e['@_name'];
    const type = e['@_type'];
    const costs = (e.costs?.cost || []).map(c => `${c['@_value']} ${c['@_name']}`).join(', ');
    const groups = (e.selectionEntryGroups?.selectionEntryGroup || []).map(g => g['@_name']);
    console.log(`\n* Unit/Entry: [${name}] (${costs}) [Type: ${type}]`);
    if (groups.length > 0) {
      console.log(`  Entry Groups: ${groups.join(' | ')}`);
    }

    // Inspect sub entry links inside entry groups
    (e.selectionEntryGroups?.selectionEntryGroup || []).forEach(g => {
      const gName = g['@_name'];
      const links = (g.entryLinks?.entryLink || []).map(l => {
        const linkCost = l.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? l.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : '0';
        return `${l['@_name']} (${linkCost}D)`;
      });
      const subEntries = (g.selectionEntries?.selectionEntry || []).map(se => {
        const seCost = se.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? se.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : '0';
        return `${se['@_name']} (${seCost}D)`;
      });
      console.log(`    - Group: ${gName}`);
      if (links.length > 0) console.log(`      Links: ${links.join(', ')}`);
      if (subEntries.length > 0) console.log(`      Entries: ${subEntries.join(', ')}`);
    });
  });
});
