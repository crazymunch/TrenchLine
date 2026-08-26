const fs = require('fs');

const rulebook = fs.readFileSync('scratch/rulebook_clean.txt', 'utf8');
const pages = rulebook.split('--- PAGE BREAK ---');
console.log('Total Rulebook pages:', pages.length);

function getRulebookPages(startPage, endPage, filename) {
  let content = '';
  for (let i = startPage - 1; i < endPage && i < pages.length; i++) {
    content += `\n\n=== PAGE ${i + 1} ===\n\n` + pages[i].trim();
  }
  fs.writeFileSync(`scratch/${filename}`, content);
  console.log(`Saved scratch/${filename} (Pages ${startPage} - ${endPage})`);
}

getRulebookPages(14, 40, 'core_rules_pages.txt');
getRulebookPages(65, 90, 'equipment_and_weapons_pages.txt');
getRulebookPages(90, 120, 'scenarios_and_campaign_pages.txt');
