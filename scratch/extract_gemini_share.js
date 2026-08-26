const fs = require('fs');

const filePath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.system_generated/steps/1189/content.md';
const content = fs.readFileSync(filePath, 'utf8');

// Search for data patterns in the html
console.log('File size:', content.length);

// Extract all script tags or JSON-like blocks
const matches = content.match(/data:\[\[[\s\S]*?\]\]/g) || [];
console.log('Matches count:', matches.length);

// Let's search for "Al-Qarn" or "Kasim" in content
const idx = content.indexOf('Al-Qarn');
console.log('Index of Al-Qarn:', idx);
if (idx !== -1) {
  console.log('Snippet around Al-Qarn:', content.substring(idx - 100, idx + 1000));
} else {
  // Let's search for "Jabirean" or "Sultanate"
  const idx2 = content.indexOf('Jabirean');
  console.log('Index of Jabirean:', idx2);
  if (idx2 !== -1) {
    console.log('Snippet around Jabirean:', content.substring(idx2 - 100, idx2 + 1000));
  }
}
