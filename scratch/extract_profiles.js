const fs = require('fs');

const warbands = fs.readFileSync('scratch/warbands_clean.txt', 'utf8');
const rulebook = fs.readFileSync('scratch/rulebook_clean.txt', 'utf8');

function extractBetween(text, startStr, endStr) {
  const s = text.indexOf(startStr);
  if (s === -1) return null;
  const e = text.indexOf(endStr, s + startStr.length);
  if (e === -1) return text.slice(s, s + 3000);
  return text.slice(s, e);
}

console.log('--- NEW ANTIOCH PROFILES ---');
console.log(extractBetween(warbands, 'The Officer Corps', 'The Sultanate of The Iron Wall') || 'Not found');
