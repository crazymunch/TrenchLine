const fs = require('fs');

const filePath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.system_generated/steps/1199/content.md';
const html = fs.readFileSync(filePath, 'utf8');

// Look for AF_initDataCallback
const regex = /AF_initDataCallback\s*\(\s*\{[\s\S]*?data\s*:\s*([\s\S]*?)\}\s*\)\s*;/g;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  count++;
  console.log(`Found AF_initDataCallback ${count}, length: ${match[1].length}`);
  fs.writeFileSync(`scratch/af_data_${count}.json`, match[1]);
  if (match[1].includes('Al-Qarn') || match[1].includes('Kasim') || match[1].includes('Living Engineer') || match[1].includes('Sultanate')) {
    console.log(`>>> Matched lore in AF_initDataCallback ${count}!`);
  }
}

// Also look for WIZ_global_data or JSON arrays
console.log('Total callbacks found:', count);
