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
  
  const entryLinks = cat.catalogue?.entryLinks?.entryLink || [];
  entryLinks.forEach(el => {
    const name = el['@_name'];
    const type = el['@_type'];
    const costs = (el.costs?.cost || []).map(c => `${c['@_value']} ${c['@_name']}`).join(', ');
    console.log(`\n* Unit EntryLink: [${name}] (${costs}) [Type: ${type}]`);
    
    // Check nested entry groups or links
    (el.selectionEntryGroups?.selectionEntryGroup || []).forEach(g => {
      console.log(`    - Group: ${g['@_name']}`);
      (g.entryLinks?.entryLink || []).forEach(l => {
        const linkCost = l.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? l.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : '0';
        console.log(`        Link: ${l['@_name']} (${linkCost}D)`);
      });
      (g.selectionEntries?.selectionEntry || []).forEach(se => {
        const seCost = se.costs?.cost?.find(c => c['@_name'] === 'Ducats') ? se.costs.cost.find(c => c['@_name'] === 'Ducats')['@_value'] : '0';
        console.log(`        Entry: ${se['@_name']} (${seCost}D)`);
      });
    });
  });
});
