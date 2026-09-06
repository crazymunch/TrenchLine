/**
 * The NewRecruit compatibility spike, as a runnable measurement.
 *
 * `docs/EXPORT-CODEX-REVIEW.md` E3 gated a `.ros` exporter on evidence rather
 * than on an `entryId` count, and it was right to: the count says 105/105
 * units carry one, and a roster still cannot be built from them. This produces
 * the numbers behind `docs/NEWRECRUIT-SPIKE.md`.
 *
 *   npm run rules:newrecruit
 *
 * It changes nothing. It reads the catalogues and a real exported roster and
 * reports how much of that roster this repository could reconstruct.
 */
import fs from 'node:fs';
import { buildPathIndex, MAX_DEPTH } from './lib/newrecruit-paths.mjs';

const CAT = 'data-sources/battlescribe';
const FIXTURE = 'data-sources/fixtures/al-qarn-rihla/04-august-1320d-CURRENT.json';
const GENERATED = 'src/data/generated/trenchline.generated.ts';

const idx = buildPathIndex(CAT);

console.log('\n  GAME SYSTEM');
console.log(`    ${idx.system.name}  id ${idx.system.id}`);
console.log(`    revision ${idx.system.revision}, battleScribeVersion ${idx.system.battleScribeVersion}`);

console.log('\n  CATALOGUES');
for (const c of idx.catalogues) {
  const stale = c.gameSystemRevision !== idx.system.revision
    ? `  <- declares gameSystemRevision ${c.gameSystemRevision}, system is ${idx.system.revision}`
    : '';
  console.log(`    ${c.name.padEnd(34)} rev ${String(c.revision).padStart(3)}  ${c.id}${stale}`);
}

console.log('\n  LINK-PATH INDEX');
console.log(`    roots ${idx.roots.length}   distinct paths ${idx.paths.size}   maxDepth ${MAX_DEPTH}`);
const truncated = idx.roots.filter((r) => r.truncated > 0);
console.log(`    roots whose walk hit the depth bound: ${truncated.length}`);

/* The measurement that matters: a real roster, exported by NewRecruit. */
const roster = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).roster;
const sels = [];
const walk = (xs) => { for (const s of xs ?? []) { sels.push(s); walk(s.selections); } };
for (const f of roster.forces ?? []) walk(f.selections);

const missed = sels.filter((s) => !idx.paths.has(s.entryId));
const hit = sels.length - missed.length;
console.log('\n  REPRODUCING A REAL EXPORTED ROSTER');
console.log(`    ${FIXTURE}`);
console.log(`    selections ${sels.length}   paths reproduced ${hit}`
          + `  (${Math.round((100 * hit) / sels.length)}%)`);
for (const s of missed) console.log(`      unreproduced: ${s.type} | ${s.name} | ${s.entryId}`);

/* And the gap in the shipped dataset, which is the reason for all of it. */
const gen = fs.readFileSync(GENERATED, 'utf8');
const multi = (gen.match(/entryId: "[^"]*::/g) ?? []).length;
console.log('\n  THE SHIPPED DATASET');
console.log(`    entryId values containing a link path ("::"): ${multi}`);
console.log('    A roster needs a path for anything below the force root; the dataset');
console.log('    carries single ids, so gear cannot be addressed at all.');
