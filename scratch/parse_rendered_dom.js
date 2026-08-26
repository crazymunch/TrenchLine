const fs = require('fs');

const html = fs.readFileSync('scratch/rendered_lore.html', 'utf8');

// Let's strip HTML tags or extract message bodies
// In Gemini, message text is inside <div class="model-response-text"> or <message-content> or markdown paragraphs
const messageBlocks = [];

// Look for <p>, <li>, <h1>, <h2>, <h3>, <h4>, <strong>, etc.
// Or match text inside markdown elements
const textMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>|<li[^>]*>([\s\S]*?)<\/li>|<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi) || [];

console.log('Total text elements matched:', textMatches.length);

const cleanText = textMatches.map(t => {
  return t
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}).filter(t => t.length > 0);

fs.writeFileSync('scratch/extracted_lore.txt', cleanText.join('\n\n'));
console.log('Saved extracted lore to scratch/extracted_lore.txt (length: ' + cleanText.join('\n\n').length + ' chars)');
