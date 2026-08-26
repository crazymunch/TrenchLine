const fs = require('fs');

const data = fs.readFileSync('scratch/resp__share_730f01a1af96_skid_df0fde43_c39d_4109_ab1d_eabe049c0bc0.txt', 'utf8');

// Find all occurrences of "BardChatUi" or "/_/"
const rpcMatches = data.match(/\/_\/[a-zA-Z0-9_\/]+/g) || [];
console.log('Endpoints:', [...new Set(rpcMatches)]);

// Find all strings with 4 to 8 letters that look like RPC method names
const potentialRpcs = data.match(/\"([A-Za-z0-9]{6})\"/g) || [];
console.log('Potential 6-char RPCs count:', potentialRpcs.length);
console.log('Sample potential RPCs:', [...new Set(potentialRpcs)].slice(0, 30));
