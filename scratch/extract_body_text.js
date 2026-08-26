const fs = require('fs');

const html = fs.readFileSync('scratch/rendered_lore.html', 'utf8');

// Find all visible text in body
const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
  const bodyText = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '')
                               .replace(/<style[\s\S]*?<\/style>/gi, '')
                               .replace(/<[^>]+>/g, '\n')
                               .split('\n')
                               .map(s => s.trim())
                               .filter(Boolean);
  console.log('Body text lines:', bodyText.length);
  fs.writeFileSync('scratch/body_text.txt', bodyText.join('\n'));
  console.log('Sample body text:\n', bodyText.slice(0, 50).join('\n'));
}
