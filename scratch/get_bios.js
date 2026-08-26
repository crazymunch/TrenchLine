const fs = require('fs');

const text = fs.readFileSync('scratch/clean_warband_lore.md', 'utf8');

// Let's search for character profiles in the text
function extractBios() {
  const bios = {};
  const names = [
    'Kasim bin Malik', 'Zayd bin Tariq', 'Al-Qahhar', 'Idris', 'Al-Masyukh',
    'Nasir', 'Rafiq', 'Dhi’b', 'Iron Needle', 'Al-Mudawwan', 'Jawhar'
  ];

  // Look for sections describing them
  console.log('Searching for biographies in text...');
  const lines = text.split('\n\n');
  lines.forEach((p, idx) => {
    names.forEach(n => {
      if (p.includes(n) && (p.includes('Background') || p.includes('Bio') || p.includes('Story') || p.includes('Role') || p.length > 200)) {
        if (!bios[n]) bios[n] = [];
        bios[n].push(p);
      }
    });
  });

  for (const [k, v] of Object.entries(bios)) {
    console.log(`\n=== BIO: ${k} (${v.length} entries) ===`);
    console.log(v.slice(0, 3).join('\n---\n'));
  }
}

extractBios();
