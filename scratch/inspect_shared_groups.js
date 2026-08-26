const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => [
    'selectionEntry', 'selectionEntryGroup', 'entryLink', 'profile', 
    'characteristic', 'cost', 'rule', 'categoryLink', 'infoGroup', 'infoLink', 'modifier',
    'sharedSelectionEntryGroup', 'catalogueLink'
  ].includes(name)
});

const files = fs.readdirSync('scratch/trench_crusade_repo').filter(f => f.endsWith('.cat') || f.endsWith('.gst'));
files.forEach(f => {
  const parsed = parser.parse(fs.readFileSync('scratch/trench_crusade_repo/' + f, 'utf8'));
  const root = parsed.catalogue || parsed.gameSystem;
  console.log(`\n=== FILE: ${f} ===`);
  const sharedGroups = root.sharedSelectionEntryGroups?.selectionEntryGroup || [];
  sharedGroups.forEach(g => {
    console.log(`  SharedGroup: [${g['@_name']}]`);
    const links = (g.entryLinks?.entryLink || []).map(l => l['@_name']);
    const entries = (g.selectionEntries?.selectionEntry || []).map(e => e['@_name']);
    if (links.length > 0) console.log(`    Links: ${links.join(', ')}`);
    if (entries.length > 0) console.log(`    Entries: ${entries.join(', ')}`);
  });
});
