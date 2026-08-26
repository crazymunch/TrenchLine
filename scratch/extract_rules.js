const fs = require('fs');
const PDFParser = require('pdf2json');

function extractPdf(filePath, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Parsing ${filePath}...`);
    const pdfParser = new PDFParser(this, 1);

    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
      const rawText = pdfParser.getRawTextContent();
      fs.writeFileSync(outputPath, rawText);
      console.log(`Successfully wrote ${outputPath} (${rawText.length} characters)`);
      resolve(rawText);
    });

    pdfParser.loadPDF(filePath);
  });
}

async function main() {
  const rulebookPath = 'H:\\My Drive\\Warhammer\\Trench Crusade\\Trench-Crusade-Digital-Rulebook.pdf';
  const warbandsPath = 'H:\\My Drive\\Warhammer\\Trench Crusade\\Warbands-of-Trench-Crusade.pdf';

  if (fs.existsSync(rulebookPath)) {
    await extractPdf(rulebookPath, 'scratch/rulebook_text.txt');
  }

  if (fs.existsSync(warbandsPath)) {
    await extractPdf(warbandsPath, 'scratch/warbands_text.txt');
  }
}

main().catch(console.error);
