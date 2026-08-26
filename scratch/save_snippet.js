const fs = require('fs');

const data = fs.readFileSync('scratch/resp__share_730f01a1af96_skid_df0fde43_c39d_4109_ab1d_eabe049c0bc0.txt', 'utf8');

// Print 5000 chars before and after 779064
const start = Math.max(0, 779064 - 1000);
const end = Math.min(data.length, 779064 + 10000);
fs.writeFileSync('scratch/snippet_779064.txt', data.substring(start, end));
console.log('Saved snippet, length:', end - start);
