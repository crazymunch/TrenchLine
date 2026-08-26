const fs = require('fs');

const rulebook = fs.readFileSync('scratch/rulebook_text.txt', 'utf8');
const warbands = fs.readFileSync('scratch/warbands_text.txt', 'utf8');

console.log('Rulebook text length:', rulebook.length);
console.log('Warbands text length:', warbands.length);

function findMatches(text, keyword, maxCount = 3) {
  console.log(`\n=== SEARCHING FOR: ${keyword} ===`);
  let idx = 0;
  let count = 0;
  while ((idx = text.toLowerCase().indexOf(keyword.toLowerCase(), idx)) !== -1 && count < maxCount) {
    const start = Math.max(0, idx - 100);
    const end = Math.min(text.length, idx + 300);
    console.log(`--- Match ${count + 1} (pos ${idx}) ---`);
    console.log(text.slice(start, end));
    idx += keyword.length;
    count++;
  }
}

findMatches(rulebook, 'INJURY TABLE', 2);
findMatches(rulebook, 'BLOOD MARKER', 2);
findMatches(rulebook, 'FIRE', 2);
findMatches(warbands, 'NEW ANTIOCH', 2);
findMatches(warbands, 'TRENCH PILGRIM', 2);
findMatches(warbands, 'IRON SULTANATE', 2);
findMatches(warbands, 'HERETIC', 2);
