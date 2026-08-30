#!/usr/bin/env node
/**
 * Extract text from a PDF into a deterministic, page-delimited .txt file.
 *
 * Used to turn the official rulebooks and the Trench Dispatch into text that
 * `rules:verify` can cross-check against. Output is committed alongside the
 * source PDF so verification never depends on re-running extraction.
 *
 *   node scripts/extract-pdf.mjs <input.pdf> [output.txt]
 *
 * Note: the official rulebooks are multi-column, and extraction interleaves
 * columns and can reverse line order within a page. This is expected — see
 * docs/DATA-SOURCES.md. Verification treats the output as a fuzzy corpus to
 * search, not as a parseable document.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PDFParse } from 'pdf-parse';

const [input, output] = process.argv.slice(2);

if (!input) {
  console.error('usage: node scripts/extract-pdf.mjs <input.pdf> [output.txt]');
  process.exit(1);
}
if (!fs.existsSync(input)) {
  console.error(`error: no such file: ${input}`);
  process.exit(1);
}

const dest =
  output ?? path.join(path.dirname(input), path.basename(input, '.pdf') + '.txt');

const parser = new PDFParse({ data: fs.readFileSync(input) });

try {
  const result = await parser.getText();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, result.text, 'utf8');

  const pages = result.pages?.length ?? 'unknown';
  console.log(`${input} -> ${dest}`);
  console.log(`  pages: ${pages}  characters: ${result.text.length}`);

  if (result.text.trim().length < 500) {
    console.warn(
      '  WARNING: almost no text extracted. The PDF is probably image-only ' +
        'and needs OCR before it can be used for verification.'
    );
    process.exit(2);
  }
} finally {
  await parser.destroy();
}
