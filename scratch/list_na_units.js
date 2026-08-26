const fs = require('fs');
const na = fs.readFileSync('scratch/new_antioch_pages.txt', 'utf8');

const pages = na.split('=== PAGE');
pages.forEach(p => {
  const lines = p.split('\n');
  const title = lines.find(l => l.includes('Cost:') || l.includes('0-1') || l.includes('0-2') || l.includes('0-3') || l.includes('Trooper') || l.includes('Elite') || l.includes('Leader'));
  console.log(`Page chunk: ${lines[0]} -> Title found: ${title || 'None'}`);
});
