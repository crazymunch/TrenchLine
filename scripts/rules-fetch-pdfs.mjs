#!/usr/bin/env node
/**
 * Fetch the official PDFs listed in data-sources/rulebook/SOURCES.json.
 *
 *   npm run rules:pdfs            # fetch anything missing, verify digests
 *   npm run rules:pdfs -- --force # re-fetch everything
 *
 * The large books live as GitHub release assets rather than in git history:
 * 38 MB of binary that never changes has no business in every clone, and the
 * extracted text — which is what the pipeline actually reads — is committed.
 *
 * This repository is PRIVATE, so the public
 * `github.com/<owner>/<repo>/releases/download/...` URL returns 404. Release
 * assets must be fetched through the authenticated api.github.com endpoint with
 * `Accept: application/octet-stream`.
 *
 * Every download is checked against the sha256 recorded in SOURCES.json (taken
 * from the release asset digest). A mismatch is fatal — a source that is not
 * the source we verified against is worse than no source.
 *
 * Implementation note: this shells out to `curl` rather than using Node's
 * global fetch. In sandboxed environments the outbound proxy injects GitHub
 * credentials for curl but not for undici, so `fetch` gets 403 on a private
 * repo's release assets while curl gets 200. curl also honours CURL_CA_BUNDLE.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DIR = 'data-sources/rulebook';
const MANIFEST = path.join(DIR, 'SOURCES.json');
const force = process.argv.includes('--force');

if (!fs.existsSync(MANIFEST)) {
  console.error(`error: ${MANIFEST} not found`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const { repo } = manifest.release;
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

let failed = 0;
let fetched = 0;

for (const asset of manifest.assets) {
  const dest = path.join(DIR, asset.file);
  process.stdout.write(`  ${asset.file.padEnd(40)}`);

  if (fs.existsSync(dest) && !force) {
    const actual = sha256(fs.readFileSync(dest));
    if (actual === asset.sha256) { console.log('present, digest ok'); continue; }
    console.log('present but DIGEST MISMATCH — re-fetching');
  }

  const url = `https://api.github.com/repos/${repo}/releases/assets/${asset.assetId}`;
  const tmp = `${dest}.part`;

  try {
    const code = execFileSync('curl', [
      '-sSL', '-H', 'Accept: application/octet-stream',
      '-o', tmp, '-w', '%{http_code}', url,
    ], { encoding: 'utf8' }).trim();

    if (code !== '200') {
      throw new Error(
        code === '404'
          ? 'HTTP 404 — check the asset id, or the release was deleted'
          : code === '403'
            ? 'HTTP 403 — no credentials for this private repo'
            : `HTTP ${code}`
      );
    }

    const body = fs.readFileSync(tmp);
    const actual = sha256(body);

    if (actual !== asset.sha256) {
      throw new Error(`digest mismatch\n      expected ${asset.sha256}\n      got      ${actual}`);
    }

    fs.renameSync(tmp, dest);
    fetched++;
    console.log(`ok  ${String(body.length).padStart(9)} bytes, digest verified`);
  } catch (err) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    console.log(`FAILED  ${err.message}`);
    failed++;
  }
}

console.log();
if (failed) {
  console.error(
    `${failed} asset(s) could not be fetched. The pipeline will not run against a\n` +
      `partial or unverified source set.`
  );
  process.exit(1);
}
console.log(`${fetched} fetched, ${manifest.assets.length - fetched} already present.`);
console.log('Next: npm run rules:extract -- <pdf> <out.txt> for anything newly fetched.');
