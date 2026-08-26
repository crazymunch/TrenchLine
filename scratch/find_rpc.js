const fs = require('fs');

const html = fs.readFileSync('C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.system_generated/steps/1199/content.md', 'utf8');

// Find all 6-letter or similar RPC IDs in quotes
const rpcMatches = html.match(/\["([a-zA-Z0-9_-]{5,8})"/g) || [];
console.log('RPC matches:', rpcMatches.slice(0, 30));

// Find any share related strings
const shareMatches = html.match(/share[a-zA-Z0-9_]*/gi) || [];
console.log('Share matches:', [...new Set(shareMatches)].slice(0, 20));
