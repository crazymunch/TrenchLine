const fs = require('fs');

const rulebook = fs.readFileSync('scratch/rulebook_text.txt', 'utf8');
const warbands = fs.readFileSync('scratch/warbands_text.txt', 'utf8');

function printSection(text, startKeyword, endKeyword, title) {
  console.log(`\n========================================`);
  console.log(`=== SECTION: ${title} ===`);
  console.log(`========================================`);
  const startIdx = text.toLowerCase().indexOf(startKeyword.toLowerCase());
  if (startIdx === -1) {
    console.log(`Could not find start keyword: ${startKeyword}`);
    return;
  }
  const endIdx = endKeyword ? text.toLowerCase().indexOf(endKeyword.toLowerCase(), startIdx + startKeyword.length) : startIdx + 2000;
  const snippet = text.slice(startIdx, endIdx === -1 ? startIdx + 2000 : endIdx);
  console.log(snippet.trim());
}

printSection(rulebook, 'INJURY TABLE', 'POST-BATTLE', 'INJURY TABLE & RESOLUTION');
printSection(rulebook, 'BLOOD MARKERS', 'ACTIONS', 'BLOOD MARKERS DETAILED RULES');
