/**
 * BattleScribe roster identity: the link path a `.ros` selection needs.
 *
 * The spike behind `docs/NEWRECRUIT-SPIKE.md`, and the answer to the question
 * Codex's `docs/EXPORT-CODEX-REVIEW.md` E3 left open — "I have not established
 * a formal minimal accepted XML schema; that remains an explicit spike
 * deliverable".
 *
 * A `.ros` selection does not carry a catalogue entry id. It carries a PATH:
 * every `entryLink` id traversed from the force root down to the entry, joined
 * with `::`, ending in the shared `selectionEntry`'s own id. From a real
 * NewRecruit export of a real warband:
 *
 *   7c17-5f75-6fd9-73cf
 *     Jabirean Alchemist, a `selectionEntry` sitting directly in the catalogue
 *
 *   c0f8-5012-5416-763a::30c8-c7d7-ccff-986e::e057-f711-7969-c551::daaa-b1ef-7908-82a7
 *     entryLink "Pile of Stuff" :: entryLink to group "Melee (One-Handed)" ::
 *     entryLink "Trench Knife" :: the Trench Knife entry itself, which lives in
 *     `Melee Weapons.cat` and not in the Sultanate catalogue at all
 *
 * So a weapon's roster identity **depends on the model carrying it and the
 * group it was taken from**. The same Trench Knife under a different model is a
 * different string. That is why the generated dataset cannot answer this on its
 * own: it flattens the tree into a global `weapons` list with one id each.
 *
 * This module rebuilds the tree. It is deliberately separate from
 * `parse-battlescribe.mjs`: that one normalises the catalogues into game data
 * and is right to throw the structure away, and this one keeps only the
 * structure and none of the game data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: false,
  isArray: (name) =>
    ['selectionEntry', 'selectionEntryGroup', 'entryLink', 'catalogueLink'].includes(name),
});

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const attr = (n, k) => (n ? n[`@_${k}`] : undefined);
const name = (n) => String(attr(n, 'name') ?? '').replace(/ /g, ' ').trim();

/**
 * Load every catalogue, indexed by the ids a link can target.
 *
 * One index across all files on purpose: a link in the Iron Sultanate catalogue
 * routinely targets an entry in `Melee Weapons.cat`, and following it is the
 * whole point.
 */
export function loadCatalogues(dir) {
  const files = fs.readdirSync(dir).filter((f) => /\.(cat|gst)$/.test(f));
  const entries = new Map();   // id -> selectionEntry node
  const groups = new Map();    // id -> selectionEntryGroup node
  const catalogues = [];       // { id, name, revision, gameSystemId, gameSystemRevision, roots }
  let system = null;

  for (const file of files) {
    const doc = parser.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const root = doc.catalogue ?? doc.gameSystem;
    if (!root) continue;

    if (doc.gameSystem) {
      system = {
        id: attr(root, 'id'),
        name: name(root),
        revision: Number(attr(root, 'revision')),
        battleScribeVersion: String(attr(root, 'battleScribeVersion')),
      };
    } else {
      catalogues.push({
        file,
        id: attr(root, 'id'),
        name: name(root),
        revision: Number(attr(root, 'revision')),
        gameSystemId: attr(root, 'gameSystemId'),
        gameSystemRevision: Number(attr(root, 'gameSystemRevision')),
        node: root,
      });
    }

    /* Index every entry and group anywhere in the file, shared or nested. */
    const index = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(index); return; }
      for (const e of arr(node.selectionEntry)) {
        if (attr(e, 'id')) entries.set(attr(e, 'id'), e);
      }
      for (const g of arr(node.selectionEntryGroup)) {
        if (attr(g, 'id')) groups.set(attr(g, 'id'), g);
      }
      for (const k of Object.keys(node)) index(node[k]);
    };
    index(root);
  }

  return { system, catalogues, entries, groups };
}

/**
 * Every selectable thing reachable under one node, with the path a roster
 * records for it.
 *
 * **Only `entryLink` ids accumulate.** An entry's own id appears once, as the
 * last segment of its own path, and contributes nothing to its children. That
 * is the whole rule, and it took three wrong guesses to find:
 *
 *   Jabirean Alchemist   `7c17`
 *     a `selectionEntry` written in the catalogue, so one segment
 *
 *   its Automatic Rifle  `85cf::246b::c39d::fed6::46cb`
 *     four `entryLink` ids — Weapons, Ranged Weapons, Ranged (Two-Handed), the
 *     rifle — then the shared entry. The Alchemist's own `7c17` is NOT in it,
 *     because an entry id is not a link.
 *
 *   Pile of Stuff        `c0f8::c0cb`   link, then target
 *   its "Armour Storage" `c0f8::b420`   the same link, then the child's own id
 *
 * Bounded by `maxDepth` and a visited set: catalogue links reach back up, and
 * an unbounded walk over a real one does not terminate. A walk that hit its
 * bound is reported rather than silently truncated.
 *
 * The bound is 8 because that is where the evidence stops moving: measured
 * against a real exported roster, 6 reproduces 96% of its paths, 8 reproduces
 * 97%, and 10 and 12 reproduce exactly what 8 does. The last three are not a
 * depth problem — see `docs/NEWRECRUIT-SPIKE.md`.
 */
export const MAX_DEPTH = 8;

export function reachableFrom(cat, node, linkPrefix, maxDepth = MAX_DEPTH) {
  const found = [];
  const truncated = [];

  const visit = (n, prefix, groupTrail, depth, seen) => {
    if (depth > maxDepth) { truncated.push(prefix.join('::')); return; }

    /* Written inline: contributes a path, but no segment to its children. */
    for (const g of arr(n.selectionEntryGroups?.selectionEntryGroup)) {
      visit(g, prefix, [...groupTrail, name(g)], depth + 1, seen);
    }
    for (const e of arr(n.selectionEntries?.selectionEntry)) {
      found.push({
        name: name(e), type: attr(e, 'type'),
        path: [...prefix, attr(e, 'id')].join('::'),
        group: groupTrail.join('::') || null,
      });
      visit(e, prefix, groupTrail, depth + 1, seen);
    }

    /* Links: the only thing that lengthens a path. */
    for (const l of arr(n.entryLinks?.entryLink)) {
      const linkId = attr(l, 'id');
      const targetId = attr(l, 'targetId');
      if (!linkId || !targetId || seen.has(linkId)) continue;
      const isGroup = attr(l, 'type') === 'selectionEntryGroup';
      const target = isGroup ? cat.groups.get(targetId) : cat.entries.get(targetId);
      if (!target) continue;

      const next = new Set([...seen, linkId]);
      if (isGroup) {
        visit(target, [...prefix, linkId], [...groupTrail, name(l)], depth + 1, next);
      } else {
        found.push({
          name: name(l) || name(target), type: attr(target, 'type'),
          path: [...prefix, linkId, targetId].join('::'),
          group: groupTrail.join('::') || null,
        });
        visit(target, [...prefix, linkId], groupTrail, depth + 1, next);
      }
    }
  };

  visit(node, linkPrefix, [], 0, new Set());
  return { found, truncated };
}

/**
 * Every path a roster could record, from every root a force can hold.
 *
 * Rooted at the CATALOGUE, not at models, and that distinction cost an hour.
 * A force's children are whatever the catalogue exposes at its top level, and
 * the models are only some of them: rooting the walk at models reproduced 9%
 * of a real roster's paths, because most of what a roster contains hangs off
 * something else — the campaign rules, the Warband Variant, the "Pile of
 * Stuff" that holds the Arsenal.
 *
 * Two kinds of root, and both are real:
 *
 *   a `selectionEntry` written in the catalogue     one segment, its own id
 *   an `entryLink` written in the catalogue         two, the link then its target
 */
export function buildPathIndex(dir) {
  const cat = loadCatalogues(dir);
  const roots = [];
  const paths = new Map();   // path -> { name, type, catalogue, group }

  const record = (p, meta) => { if (!paths.has(p)) paths.set(p, meta); };

  for (const c of cat.catalogues) {
    const from = (rootNode, prefix, rootPath, label, type) => {
      record(rootPath.join('::'), { name: label, type, catalogue: c.name, group: null });
      const { found, truncated } = reachableFrom(cat, rootNode, prefix);
      for (const f of found) record(f.path, { ...f, catalogue: c.name });
      roots.push({
        catalogue: c.name,
        catalogueId: c.id,
        catalogueRevision: c.revision,
        name: label,
        type,
        path: rootPath.join('::'),
        reachable: found.length,
        truncated: truncated.length,
      });
    };

    /* A root `selectionEntry`: its own path is its id, and it lends nothing
       to its children — so the walk descends with an EMPTY prefix. */
    for (const e of arr(c.node.selectionEntries?.selectionEntry)) {
      from(e, [], [attr(e, 'id')], name(e), attr(e, 'type'));
    }
    for (const l of arr(c.node.entryLinks?.entryLink)) {
      const target = attr(l, 'type') === 'selectionEntryGroup'
        ? cat.groups.get(attr(l, 'targetId')) : cat.entries.get(attr(l, 'targetId'));
      if (!target) continue;
      /* A root `entryLink`: the link id is the prefix its children inherit,
         and its own path is that link plus its target. */
      from(target, [attr(l, 'id')], [attr(l, 'id'), attr(l, 'targetId')],
           name(l) || name(target), attr(target, 'type'));
    }
  }

  const models = roots.filter((r) => r.type === 'model' || r.type === 'unit');
  return { ...cat, roots, models, paths };
}
