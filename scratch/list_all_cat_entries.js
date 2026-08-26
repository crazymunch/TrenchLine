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
  console.log(`CATALOGUE: ${cf}`);
  
  const allEntries = [
    ...(cat.catalogue?.selectionEntries?.selectionEntry || []),
    ...(cat.catalogue?.sharedSelectionEntries?.selectionEntry || [])
  ];

  allEntries.forEach(e => {
    const isModel = e['@_type'] === 'model' || e['@_type'] === 'unit' || (e.categoryLinks?.categoryLink || []).some(cl => cl['@_name'] === 'Model' || cl['@_name'] === 'Unit');
    const costs = (e.costs?.cost || []).map(c => `${c['@_value']} ${c['@_name']}`).join(', ');
    console.log(`  Entry: [${e['@_name']}] | Type: ${e['@_type']} | Cost: ${costs}`);
    (e.selectionEntryGroups?.selectionEntryGroup || []).forEach(g => {
      console.log(`    -> Group: ${g['@_name']}`);
    });
  });
});
