const fs = require('fs');

const jsonPath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/media_1787736834007.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Roster Name:', data.roster?.name || data.name);
console.log('Roster Cost in JSON:', data.roster?.cost || data.cost);
console.log('Roster Costs:', JSON.stringify(data.roster?.costs || data.costs, null, 2));

// Let's inspect each selection / unit in the json
const selections = data.roster?.selections || data.selections || [];

function inspectSelections(entries, depth = 0) {
  entries.forEach(e => {
    const indent = '  '.repeat(depth);
    const costs = e.costs || [];
    const costStr = costs.map(c => `${c.name}: ${c.value}`).join(', ');
    console.log(`${indent}- [${e.type || 'entry'}] ${e.name} (customName: ${e.customName || ''}) | Cost: [${costStr}]`);
    if (e.selections && e.selections.length > 0) {
      inspectSelections(e.selections, depth + 1);
    }
  });
}

inspectSelections(selections);
