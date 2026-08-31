#!/usr/bin/env node
/**
 * Extract the hand-written narrative content from a TrenchLine warband export,
 * so it can be re-attached after the game data is regenerated from source.
 *
 *   node scripts/extract-warband-lore.mjs <export.json> [-o bundle.json]
 *   node scripts/extract-warband-lore.mjs <export.json> --reattach <rebuilt.json>
 *
 * Why this exists: regenerating game data from `data-sources/` rebuilds every
 * derived field (statlines, costs, keywords). Lore is not derived — it was
 * written by hand and cannot be recovered from any source. It must survive the
 * rebuild untouched.
 *
 * The split is strict:
 *   PRESERVED  narrative the user wrote — copied verbatim, never regenerated
 *   REBUILT    game data — always taken from the regenerated dataset
 *
 * Units are matched on a stable identity (id, then customName) rather than on
 * array position, and anything unmatched is REPORTED rather than dropped.
 */
import fs from 'node:fs';

/** Warband-level fields the user authored. See src/types/warband.ts. */
const WARBAND_LORE = ['name', 'lore', 'motto', 'patron', 'chronicleLog', 'notes'];

/** Per-unit fields the user authored. */
const UNIT_LORE = [
  'customName', 'lore', 'quote', 'notes',
  'titles', 'titleRecords', 'deeds',
];

/** Campaign progression: earned, not authored, but equally unrecoverable. */
const UNIT_PROGRESS = ['xp', 'advancements', 'scars', 'skills', 'fireteam'];

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('-'));
const outIdx = args.indexOf('-o');
const reattachIdx = args.indexOf('--reattach');

if (!input) {
  console.error('usage: node scripts/extract-warband-lore.mjs <export.json> [-o bundle.json]');
  console.error('       node scripts/extract-warband-lore.mjs <bundle.json> --reattach <rebuilt.json>');
  process.exit(1);
}

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
};


/* ---------------- extract ---------------- */

if (reattachIdx === -1) {
  const wb = read(input);
  const warband = wb.warband ?? wb;
  const units = warband.units ?? [];

  const bundle = {
    _kind: 'trenchline-lore-bundle',
    _extractedAt: new Date().toISOString(),
    _sourceFile: input,
    warband: pick(warband, WARBAND_LORE),
    factionId: warband.factionId,
    // Not preserved as truth — recorded so the rebuild can flag a mismatch.
    _observed: {
      ducatLimit: warband.ducatLimit,
      gloryPoints: warband.gloryPoints,
      treasuryDucats: warband.treasuryDucats,
      unitCount: units.length,
    },
    units: units.map((u) => ({
      _match: { id: u.id ?? null, customName: u.customName ?? null,
                profileId: u.baseProfileId ?? u.profileSnapshot?.id ?? null },
      lore: pick(u, UNIT_LORE),
      progress: pick(u, UNIT_PROGRESS),
    })),
  };

  const dest = outIdx !== -1 ? args[outIdx + 1] : null;
  const json = JSON.stringify(bundle, null, 2) + '\n';
  if (dest) { fs.writeFileSync(dest, json); console.log(`wrote ${dest}`); }
  else console.log(json);

  const words = (s) => (typeof s === 'string' ? s.trim().split(/\s+/).filter(Boolean).length : 0);
  const loreWords =
    words(bundle.warband.lore) + words(bundle.warband.notes) +
    (bundle.warband.chronicleLog ?? []).reduce((n, e) => n + words(e), 0) +
    bundle.units.reduce((n, u) => n + words(u.lore.lore) + words(u.lore.quote) + words(u.lore.notes) +
      (u.lore.deeds ?? []).reduce((m, d) => m + words(d), 0), 0);

  console.error(`\nwarband:        ${bundle.warband.name ?? '(unnamed)'}`);
  console.error(`units:          ${bundle.units.length}`);
  console.error(`units w/ lore:  ${bundle.units.filter((u) => Object.keys(u.lore).length > 1).length}`);
  console.error(`titles:         ${bundle.units.reduce((n, u) => n + (u.lore.titles?.length ?? 0), 0)}`);
  console.error(`deeds:          ${bundle.units.reduce((n, u) => n + (u.lore.deeds?.length ?? 0), 0)}`);
  console.error(`chronicle:      ${(bundle.warband.chronicleLog ?? []).length} entries`);
  console.error(`narrative words:${loreWords}`);
  process.exit(0);
}

/* ---------------- reattach ---------------- */

const bundle = read(input);
if (bundle._kind !== 'trenchline-lore-bundle') {
  console.error('error: first argument must be a lore bundle produced by this script');
  process.exit(1);
}

const targetPath = args[reattachIdx + 1];
const target = read(targetPath);
const warband = target.warband ?? target;

Object.assign(warband, bundle.warband);

const byId = new Map();
const byName = new Map();
for (const u of warband.units ?? []) {
  if (u.id) byId.set(u.id, u);
  if (u.customName) byName.set(u.customName, u);
}

const unmatched = [];
let matched = 0;

for (const entry of bundle.units) {
  const target =
    (entry._match.id && byId.get(entry._match.id)) ||
    (entry._match.customName && byName.get(entry._match.customName));

  if (!target) { unmatched.push(entry._match.customName ?? entry._match.id ?? '(unknown)'); continue; }
  Object.assign(target, entry.lore, entry.progress);
  matched++;
}

fs.writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n');

console.log(`reattached to ${targetPath}`);
console.log(`  units matched:   ${matched}/${bundle.units.length}`);
if (unmatched.length) {
  console.log(`  UNMATCHED:       ${unmatched.length}`);
  unmatched.forEach((n) => console.log(`    - ${n}`));
  console.log('\nUnmatched lore was NOT discarded — it stays in the bundle. Resolve by');
  console.log('hand before considering the migration complete.');
  process.exit(2);
}
