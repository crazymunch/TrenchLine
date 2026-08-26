const fs = require('fs');
const na = fs.readFileSync('scratch/new_antioch_pages.txt', 'utf8');
const pages = na.split('=== PAGE');

for (let i = 1; i <= 14; i++) {
  const p = pages[i];
  if (!p) continue;
  const match = p.match(/0-\d+\s+[A-Za-z\s]+-\s+Cost:\s+\d+\s+/i) || p.match(/[A-Za-z\s]+-\s+Cost:\s+\d+\s+/i) || p.match(/Cost:\s+\d+/i);
  console.log(`\n================== PAGE ${i + 22} ==================`);
  console.log('Match:', match ? match[0] : 'None');
  console.log(p.slice(0, 500));
}
