const fs = require('fs');

const text = fs.readFileSync('scratch/clean_warband_lore.md', 'utf8');

const otherNames = ['Zayd', 'Nasir', 'Rafiq', 'Iron Needle', 'Mudawwan', 'Dhi’b', 'Dhi\'b', 'Nafud', 'Book of Golems', 'Al-Qarn Rihla', 'Bayt al-Nahas'];

otherNames.forEach(name => {
  console.log(`\n================== ${name} ==================`);
  let pos = 0;
  let count = 0;
  while ((pos = text.indexOf(name, pos)) !== -1 && count < 4) {
    console.log(text.substring(Math.max(0, pos - 60), Math.min(text.length, pos + 500)));
    console.log('-------------------------------------------');
    pos += name.length + 50;
    count++;
  }
});
