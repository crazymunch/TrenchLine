const fs = require('fs');

function cleanText(txt) {
  return txt
    .replace(/----------------Page \(\d+\) Break----------------/g, '\n--- PAGE BREAK ---\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/(\n\s*){3,}/g, '\n\n');
}

const rulebook = cleanText(fs.readFileSync('scratch/rulebook_text.txt', 'utf8'));
const warbands = cleanText(fs.readFileSync('scratch/warbands_text.txt', 'utf8'));

fs.writeFileSync('scratch/rulebook_clean.txt', rulebook);
fs.writeFileSync('scratch/warbands_clean.txt', warbands);

console.log('Saved clean text files.');
console.log('Rulebook clean length:', rulebook.length);
console.log('Warbands clean length:', warbands.length);

function searchClean(text, query, max = 2) {
  console.log(`\n=== QUERY: "${query}" ===`);
  let pos = 0;
  let found = 0;
  while ((pos = text.toLowerCase().indexOf(query.toLowerCase(), pos)) !== -1 && found < max) {
    console.log(`\n--- RESULT ${found + 1} ---`);
    console.log(text.slice(Math.max(0, pos - 50), Math.min(text.length, pos + 800)));
    pos += query.length;
    found++;
  }
}

searchClean(rulebook, 'INJURY TABLE', 2);
searchClean(rulebook, 'BLOOD MARKERS', 2);
searchClean(warbands, 'The Soldiery Of New Antioch', 1);
searchClean(warbands, 'Trench Pilgrims', 1);
