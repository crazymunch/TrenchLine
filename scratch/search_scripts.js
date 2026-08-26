const fs = require('fs');

const data = fs.readFileSync('scratch/resp__share_730f01a1af96_skid_df0fde43_c39d_4109_ab1d_eabe049c0bc0.txt', 'utf8');

// Find all script tags
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m;
let sIdx = 0;
while ((m = scriptRegex.exec(data)) !== null) {
  sIdx++;
  const sContent = m[1];
  if (sContent.length > 50) {
    console.log(`Script ${sIdx}: length = ${sContent.length}`);
    if (sContent.includes('Al-Qarn') || sContent.includes('Kasim') || sContent.includes('Sultanate') || sContent.includes('Living Engineer') || sContent.includes('Warband') || sContent.includes('Alchemist')) {
      console.log(`>>> SCRIPT ${sIdx} CONTAINS LORE! <<<`);
      fs.writeFileSync(`scratch/lore_script_${sIdx}.js`, sContent);
    }
  }
}
