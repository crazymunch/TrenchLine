const fs = require('fs');

const text = fs.readFileSync('scratch/all_lore_dump.txt', 'utf8');

const sections = text.split(/\n\n(?=[A-Z0-9#•\*\-][\s\S]{0,30}\n)/);
console.log('Total split sections:', sections.length);

const output = [];

function findMentions(name) {
  console.log(`\n================== ${name} ==================`);
  let found = 0;
  let pos = 0;
  while ((pos = text.indexOf(name, pos)) !== -1) {
    const chunk = text.substring(Math.max(0, pos - 80), Math.min(text.length, pos + 800));
    console.log(chunk);
    console.log('-------------------------------------------');
    output.push(`### ${name}\n\n${chunk}\n\n`);
    pos += name.length + 100;
    found++;
    if (found > 8) break;
  }
}

const names = [
  'Al-Qarn Rihla',
  'Kasim bin Malik',
  'Zayd bin Tariq',
  'Al-Qahhar',
  'Idris',
  'Al-Masyukh',
  'Nasir',
  'Rafiq',
  'Dhi’b',
  'Iron Needle',
  'Al-Mudawwan',
  'Jawhar',
  'House of Wisdom',
  'Battle',
  'Game'
];

names.forEach(n => findMentions(n));

fs.writeFileSync('scratch/all_lore_extracted_characters.md', output.join('\n\n'));
console.log('Saved character extractions');
