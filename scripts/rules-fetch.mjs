#!/usr/bin/env node
/**
 * Fetch the BattleScribe catalogues that form the base layer of every ruleset.
 *
 *   node scripts/rules-fetch.mjs [--ref <sha|branch>]
 *
 * Writes into data-sources/battlescribe/ along with a MANIFEST.json recording
 * the ref, fetch time, and a checksum per file.
 *
 * This script NEVER falls back to placeholder data. If a file cannot be
 * fetched, it exits non-zero and the build fails. See docs/RULESET-MODEL.md §1.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const REPO = 'Fawkstrot11/TrenchCrusade';
const OUT_DIR = 'data-sources/battlescribe';

const FILES = [
  'Trench Crusade.gst',
  'New Antioch.cat',
  'Trench Pilgrims.cat',
  'Heretic Legion.cat',
  'Iron Sultanate.cat',
  'Black Grail.cat',
  'Court of the Seven-Headed Serpent.cat',
  'Mercenaries.cat',
  'Equipment.cat',
  'Melee Weapons.cat',
  'Ranged Weapons.cat',
];

const refArg = process.argv.indexOf('--ref');
const ref = refArg !== -1 ? process.argv[refArg + 1] : 'main';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * Resolve a branch name to the commit it points at, so the manifest records a
 * real pin rather than a moving target. `api.github.com` is not reachable from
 * every environment, but `git ls-remote` is. A ref that is already a full SHA
 * passes through untouched.
 */
function resolveCommit(r) {
  if (/^[0-9a-f]{40}$/i.test(r)) return r;
  try {
    const out = execFileSync(
      'git',
      ['ls-remote', `https://github.com/${REPO}.git`, `refs/heads/${r}`],
      { encoding: 'utf8' }
    );
    const sha = out.split(/\s+/)[0];
    if (/^[0-9a-f]{40}$/i.test(sha)) return sha;
  } catch {
    /* fall through */
  }
  return null;
}

const commit = resolveCommit(ref);
if (!commit) {
  console.warn(
    `warning: could not resolve ${REPO}@${ref} to a commit SHA. ` +
      `The manifest will not be a reproducible pin.`
  );
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = {
  repo: REPO,
  ref,
  commit,
  fetchedAt: new Date().toISOString(),
  files: {},
};

let failed = 0;

for (const name of FILES) {
  const url = `https://raw.githubusercontent.com/${REPO}/${commit ?? ref}/${encodeURIComponent(name)}`;
  process.stdout.write(`  ${name.padEnd(42)}`);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const body = Buffer.from(await res.arrayBuffer());
    if (body.length === 0) throw new Error('empty response');

    fs.writeFileSync(path.join(OUT_DIR, name), body);
    manifest.files[name] = { bytes: body.length, sha256: sha256(body) };
    console.log(`ok  ${String(body.length).padStart(8)} bytes`);
  } catch (err) {
    console.log(`FAILED  ${err.message}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(
    `\n${failed} file(s) could not be fetched. Not writing MANIFEST.json — ` +
      `a partial dataset must never be treated as complete.`
  );
  process.exit(1);
}

fs.writeFileSync(
  path.join(OUT_DIR, 'MANIFEST.json'),
  JSON.stringify(manifest, null, 2) + '\n'
);

console.log(`\nFetched ${FILES.length} files at ${REPO}@${commit ?? ref}`);
console.log(`Manifest: ${path.join(OUT_DIR, 'MANIFEST.json')}`);
