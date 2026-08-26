const fs = require('fs');

const data = fs.readFileSync('scratch/resp__share_730f01a1af96_skid_df0fde43_c39d_4109_ab1d_eabe049c0bc0.txt', 'utf8');

// Find all occurrences of "730f01a1af96" in the html
let pos = 0;
while ((pos = data.indexOf('730f01a1af96', pos)) !== null) {
  if (pos === -1) break;
  console.log(`Found 730f01a1af96 at pos ${pos}:`);
  console.log(data.substring(Math.max(0, pos - 100), pos + 200));
  pos += 12;
}

// Find all occurrence of "skid" or "df0fde43"
let pos2 = 0;
while ((pos2 = data.indexOf('df0fde43', pos2)) !== null) {
  if (pos2 === -1) break;
  console.log(`Found df0fde43 at pos ${pos2}:`);
  console.log(data.substring(Math.max(0, pos2 - 100), pos2 + 200));
  pos2 += 8;
}
