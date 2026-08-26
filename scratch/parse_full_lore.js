const fs = require('fs');

const raw = fs.readFileSync('scratch/clean_warband_lore.md', 'utf8');

// Let's search for character names and extract their specific lore blocks
const characters = [
  'Kasim bin Malik', 'Zayd bin Tariq', 'Al-Qahhar', 'Idris', 'Al-Masyukh',
  'Nasir', 'Rafiq', 'Dhi’b', 'Dhi\'b', 'Iron Needle', 'Al-Mudawwan', 'Jawhar',
  'Al-Qarn Rihla', 'House of Wisdom', 'Game 1', 'Game 2', 'Game 3', 'Match', 'Battle'
];

const lines = raw.split('\n\n');
console.log('Total blocks:', lines.length);

// Let's search through the file and dump sections
fs.writeFileSync('scratch/all_lore_dump.txt', raw);
console.log('Saved all_lore_dump.txt');
