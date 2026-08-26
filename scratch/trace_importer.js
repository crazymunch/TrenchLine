const fs = require('fs');

const jsonPath = 'C:/Users/Nick/.gemini/antigravity/brain/6b203bd8-a331-4506-8f21-bdb295428b2d/.user_uploaded/media_1787736834007.json';
const jsonContent = fs.readFileSync(jsonPath, 'utf8');

// Let's inspect newRecruitImporter.ts implementation
const importerFile = fs.readFileSync('src/services/newRecruitImporter.ts', 'utf8');
console.log('Importer file loaded');

// Let's parse and trace
const data = JSON.parse(jsonContent);
const rawUnits = data.roster?.forces?.[0]?.selections || [];

console.log('Raw units count:', rawUnits.length);
