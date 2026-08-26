const fs = require('fs');

const warbands = fs.readFileSync('scratch/warbands_clean.txt', 'utf8');
const pages = warbands.split('--- PAGE BREAK ---');

function getPages(startPage, endPage, filename) {
  let content = '';
  for (let i = startPage - 1; i < endPage && i < pages.length; i++) {
    content += `\n\n=== PAGE ${i + 1} ===\n\n` + pages[i].trim();
  }
  fs.writeFileSync(`scratch/${filename}`, content);
  console.log(`Saved scratch/${filename} (Pages ${startPage} - ${endPage})`);
}

getPages(23, 45, 'new_antioch_pages.txt');
getPages(47, 68, 'trench_pilgrims_pages.txt');
getPages(71, 95, 'iron_sultanate_pages.txt');
getPages(103, 125, 'heretic_legions_pages.txt');
getPages(125, 145, 'black_grail_pages.txt');
getPages(145, 170, 'court_pages.txt');
getPages(170, 190, 'mercenaries_pages.txt');
