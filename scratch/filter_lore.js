const fs = require('fs');

const raw = fs.readFileSync('scratch/extracted_lore.txt', 'utf8');

// Let's inspect paragraphs that mention characters or lore
const lines = raw.split('\n\n');
console.log('Total paragraphs:', lines.length);

const loreParagraphs = lines.filter(p => {
  const l = p.toLowerCase();
  return l.includes('kasim') || l.includes('zayd') || l.includes('qahhar') || 
         l.includes('idris') || l.includes('masyukh') || l.includes('nasir') || 
         l.includes('rafiq') || l.includes('dhi') || l.includes('needle') || 
         l.includes('mudawwan') || l.includes('jawhar') || l.includes('al-qarn') ||
         l.includes('sultanate') || l.includes('house of wisdom') || l.includes('rihla');
});

console.log('Found lore paragraphs count:', loreParagraphs.length);
fs.writeFileSync('scratch/warband_lore_summary.txt', loreParagraphs.join('\n\n---\n\n'));
console.log('Saved to scratch/warband_lore_summary.txt');
