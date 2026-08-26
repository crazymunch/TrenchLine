const fs = require('fs');

const rawLines = fs.readFileSync('scratch/body_text.txt', 'utf8').split('\n');

// Filter out generic UI elements (Sign in, Gemini, Try it, etc.)
const ignored = [
  'Sign in', 'Gemini', 'Created with', '3.7 Flash', 'Report issue', 
  'expand_more', 'content_copy', 'Google', 'Terms', 'Privacy', 
  'share', 'Published August', 'January 22', 'You said'
];

const cleaned = [];
let skip = false;

for (let i = 0; i < rawLines.length; i++) {
  const line = rawLines[i].trim();
  if (!line) continue;
  if (ignored.some(ig => line === ig || line.startsWith('https://share.gemini.google'))) continue;
  
  // Deduplicate consecutive identical lines
  if (cleaned.length > 0 && cleaned[cleaned.length - 1] === line) continue;

  cleaned.push(line);
}

const formatted = cleaned.join('\n\n');
fs.writeFileSync('scratch/clean_warband_lore.md', formatted);
console.log('Formatted lore saved to scratch/clean_warband_lore.md (length:', formatted.length, 'chars)');
