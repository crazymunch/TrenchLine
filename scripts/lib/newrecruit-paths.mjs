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
    ['selectionEntry', 'selectionEntryGroup', 'entryLink', 'catalogueLink',
     'forceEntry', 'costType'].includes(name),
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
        /*
          The force a roster hangs everything off, and the currencies it
          totals. Both live in the game system rather than in a catalogue, and
          a `.ros` cannot be written without either: the `<force>` element
          quotes the forceEntry id, and every `<cost>` quotes a costType id.
        */
        forces: arr(root.forceEntries?.forceEntry).map((f) => ({
          id: attr(f, 'id'), name: name(f),
        })),
        costTypes: arr(root.costTypes?.costType).map((c) => ({
          id: attr(c, 'id'), name: name(c),
        })),
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

export function reachableFrom(cat, node, linkPrefix, opts = {}) {
  const { maxDepth = MAX_DEPTH, trail: rootTrail = [] } = typeof opts === 'number'
    ? { maxDepth: opts } : opts;
  const found = [];
  const truncated = [];

  /* An `entryLink` node's own children, read with the link's own id withheld.
     Split out only so the two call sites read as the two halves of one rule. */
  const visitOwn = (l, prefix, groupTrail, depth, seen, trail) => {
    if (!l.selectionEntries && !l.selectionEntryGroups && !l.entryLinks) return;
    visit(l, prefix, groupTrail, depth, seen, trail);
  };

  const visit = (n, prefix, groupTrail, depth, seen, trail) => {
    if (depth > maxDepth) { truncated.push(prefix.join('::')); return; }

    /*
      Written inline: contributes a path, but no segment to its children.

      A GROUP is identified the same way an entry is — the prefix in force
      where it sits, plus its own id — because a roster records `entryGroupId`
      as a path too, not as a bare id. `groupTrail` therefore carries both: the
      names a roster writes in `group`, and the id path it writes in
      `entryGroupId`.
    */
    for (const g of arr(n.selectionEntryGroups?.selectionEntryGroup)) {
      visit(g, prefix, [...groupTrail, { name: name(g), path: [...prefix, attr(g, 'id')] }],
            depth + 1, seen, trail);
    }
    for (const e of arr(n.selectionEntries?.selectionEntry)) {
      const rec = {
        name: name(e), type: attr(e, 'type'), id: attr(e, 'id'),
        path: [...prefix, attr(e, 'id')].join('::'),
        /* What its OWN children inherit — its prefix unchanged, because an
           entry id is not a link. Reported so a caller can resume the walk
           from an entry it found rather than from a root. */
        childPrefix: prefix,
        /*
          The selections a roster nests this one INSIDE, outermost first.

          Not the same question as the path, and both are needed. `Mamluk
          Faris` is a `unit` entry whose only child is a link to the `model`
          that carries the profile, and NewRecruit writes both: the wrapper
          `95cf-…`, and the model `4314-…::22b8-…` nested in it. The model's
          path is complete and self-contained, and writing it at the force's
          top level would still be a file no importer reads back the same way.
        */
        parents: trail,
        group: groupTrail.map((g) => g.name).join('::') || null,
        /* The innermost group it was taken from — what a roster writes as
           `entryGroupId`. Null where it was taken from an entry directly. */
        groupPath: groupTrail.length ? groupTrail[groupTrail.length - 1].path.join('::') : null,
        from: groupTrail.length ? 'group' : 'entry',
      };
      found.push(rec);
      /*
        An EMPTY group trail, not this one.

        A group nests inside an entry and resets at every entry boundary: the
        options a model offers are in the model's own groups, never in the
        group the model itself was taken from. Carrying the trail down leaked
        the parent's group into every child — a real export writes the
        Alchemist's rifle as `Weapon Collections::New Antioch::…`, and the walk
        was producing `Variant Selection::Weapon Collections::New Antioch::…`.
      */
      visit(e, prefix, [], depth + 1, seen, [...trail, rec]);
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
        const asGroup = { name: name(l) || name(target), path: [...prefix, linkId, targetId] };
        visit(target, [...prefix, linkId], [...groupTrail, asGroup], depth + 1, next, trail);
        /* See below: what the link ITSELF writes keeps this prefix. */
        visitOwn(l, prefix, [...groupTrail, asGroup], depth + 1, next, trail);
      } else {
        const rec = {
          name: name(l) || name(target), type: attr(target, 'type'), id: targetId,
          path: [...prefix, linkId, targetId].join('::'),
          /* Reached BY a link, so that link prefixes everything below it —
             and the target's own id does not. */
          childPrefix: [...prefix, linkId],
          parents: trail,
          group: groupTrail.map((g) => g.name).join('::') || null,
          groupPath: groupTrail.length ? groupTrail[groupTrail.length - 1].path.join('::') : null,
          from: groupTrail.length ? 'group' : 'entry',
        };
        found.push(rec);
        visit(target, [...prefix, linkId], [], depth + 1, next, [...trail, rec]);
        /*
          And what the LINK ELEMENT itself writes — which is not the same
          thing, and this is the second half of the rule.

          A BattleScribe `entryLink` may carry its own `selectionEntries`:
          options that exist only at this placement. `Mamluk Faris` writes an
          `Assigned Sword` inside the link to the model, and the `Siege
          Jezzail` link writes its ammunition options inside itself. Those keep
          the prefix the link was reached at — the link's own id is NOT in
          their paths — because they are already unique to this placement and
          have nothing to disambiguate.

          Nested in the ROSTER under the link's target all the same, so the
          parent trail does gain it. Confirmed against a real NewRecruit
          export: `Assigned Sword` is `80f0-…` with no `4314-…`, and it is a
          child of the Mamluk Faris model selection.

          These three selections are what `docs/NEWRECRUIT-SPIKE.md` recorded
          as unreachable with the cause not established. This is the cause.
        */
        visitOwn(l, prefix, [], depth + 1, next, [...trail, rec]);
      }
    }
  };

  visit(node, linkPrefix, [], 0, new Set(), rootTrail);
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


/**
 * Every root a force can hold, walked once, with the root seeded into each
 * result's parent trail.
 *
 * Two kinds of root and both are real: a `selectionEntry` written in the
 * catalogue, whose path is its own id and whose children descend with an EMPTY
 * prefix; and an `entryLink`, whose path is the link then its target and whose
 * children inherit the link.
 */
export function walkRoots(cat) {
  const out = [];
  for (const c of cat.catalogues) {
    const meta = { catalogueId: c.id, catalogueName: c.name };

    for (const e of arr(c.node.selectionEntries?.selectionEntry)) {
      const self = {
        id: attr(e, 'id'), name: name(e), type: attr(e, 'type'),
        path: attr(e, 'id'), childPrefix: [], parents: [],
        group: null, groupPath: null, from: 'entry',
      };
      out.push({ ...meta, root: self, found: [self, ...reachableFrom(cat, e, [], { trail: [self] }).found] });
    }

    for (const l of arr(c.node.entryLinks?.entryLink)) {
      const linkId = attr(l, 'id');
      const targetId = attr(l, 'targetId');
      const isGroup = attr(l, 'type') === 'selectionEntryGroup';
      const target = isGroup ? cat.groups.get(targetId) : cat.entries.get(targetId);
      if (!target) continue;
      const self = {
        id: isGroup ? linkId : targetId, name: name(l) || name(target),
        type: isGroup ? 'group' : attr(target, 'type'),
        path: isGroup ? linkId : `${linkId}::${targetId}`,
        childPrefix: [linkId], parents: [],
        group: null, groupPath: null, from: 'entry',
      };
      const trail = isGroup ? [] : [self];
      const { found } = reachableFrom(cat, target, [linkId], { trail });
      /* What the root link element itself writes keeps the empty prefix — the
         same second half of the rule the walk applies further down. */
      const own = reachableFrom(cat, { entryLinks: { entryLink: [l] } }, [], { trail: [] }).found
        .filter((f) => f.path !== self.path);
      out.push({ ...meta, root: self, found: isGroup ? [...found, ...own] : [self, ...found, ...own] });
    }
  }
  return out;
}

/**
 * The roster-path layer the dataset ships: one identity per model, and one per
 * thing that model can carry.
 *
 * `units` is the dataset's own unit list; `carryable` is the dataset's own
 * vocabulary of what a model can be given — `{ ids, names }`. This module
 * contributes structure and nothing else, so what counts as an item is decided
 * by the data, not here.
 *
 * Matching is by catalogue entry id first and by name only where the dataset
 * has no id to offer. Name matching alone was measurably worse: against the
 * exported fixture it left every Alchemical Formula, every Homunculus body
 * part and every campaign advancement without a path, because the dataset
 * holds those as `unit.options` rather than as weapons.
 *
 * **Ownership is decided by the parent trail, not by re-walking from the model
 * entry.** A link may write options that exist only at that placement — the
 * `Mamluk Faris` link writes an `Assigned Sword`, the `Siege Jezzail` link
 * writes its ammunition — and those are children of the link element, not of
 * the entry it points at. A walk resumed from the entry cannot see them. A
 * walk that keeps the trail places them exactly where the roster does.
 *
 * Emitted alongside the dataset rather than inside it. It is a fifth of the
 * dataset again and only an exporter or an importer ever reads it; folding it
 * in would put it in every phone's bundle for a feature almost nobody uses at
 * the table.
 *
 * A unit with no occurrence is REPORTED, not dropped and not invented.
 */
export function buildRosterPaths(dir, { units, variants = [], carryable }) {
  const cat = loadCatalogues(dir);
  const ids = new Set(carryable.ids ?? []);
  const names = new Set(carryable.names ?? []);
  const unitIds = new Set(units.map((u) => u.entryId).filter(Boolean));
  const variantIds = new Set(variants.map((v) => v.entryId).filter(Boolean));

  const segments = [];
  const segmentIndex = new Map();
  const intern = (id) => {
    let i = segmentIndex.get(id);
    if (i === undefined) { i = segments.push(id) - 1; segmentIndex.set(id, i); }
    return i;
  };
  const asPath = (p) => String(p).split('::').map(intern);

  /* Group NAMES are their own table: a roster writes them verbatim in the
     `group` attribute, and `Weapons::Melee Weapons::Melee (One-Handed)`
     repeats across most of the warband. */
  const groupNames = [];
  const groupNameIndex = new Map();
  const internGroup = (g) => {
    if (g == null) return undefined;
    let i = groupNameIndex.get(g);
    if (i === undefined) { i = groupNames.push(g) - 1; groupNameIndex.set(g, i); }
    return i;
  };

  /*
    Everything a roster needs to write one selection except its quantity and
    its cost: where it is (`path`), which group it was taken from (`groupPath`
    and `group`, absent when taken from an entry directly), and what kind of
    selection it is.
  */
  const asSelection = (f) => ({
    path: asPath(f.path),
    ...(f.groupPath ? { groupPath: asPath(f.groupPath), group: internGroup(f.group) } : {}),
    ...(f.type && f.type !== 'upgrade' ? { type: f.type } : {}),
  });

  /* path -> the placement object it belongs to, so the second pass can attach
     an item to the model that carries it without searching. */
  const placements = new Map();
  const containers = new Map();
  /* A roster records the Warband Variant as a selection of its own, and it is
     what decides which models are legal — so it needs an identity too. */
  const variantPaths = new Map();

  const place = (into, key, meta) => {
    if (into.has(key)) return into.get(key);
    const p = { ...meta, carries: {} };
    into.set(key, p);
    return p;
  };

  for (const { catalogueId, root, found } of walkRoots(cat)) {
    for (const f of found) {
      if (variantIds.has(f.id)) {
        /*
          Prefer an occurrence that names its group.

          A roster records the Warband Variant as `from="group"` inside
          `Variant Selection`, and a Variant is reachable both there and — for
          some catalogues — directly. First-wins picked the ungrouped route and
          emitted a Variant a generator would have written as `from="entry"`,
          which is not what the file says.
        */
        const held = variantPaths.get(f.id);
        if (!held || (held.groupPath === undefined && f.groupPath)) {
          variantPaths.set(f.id, { catalogueId, ...asSelection(f) });
        }
      }
      if (!unitIds.has(f.id)) continue;
      place(placements, f.path, {
        entryId: f.id,
        catalogueId,
        ...asSelection(f),
        parents: (f.parents ?? []).map((q) => ({ ...asSelection(q), name: q.name })),
      });
    }

    for (const f of found) {
      if (!ids.has(f.id) && !names.has(f.name)) continue;
      /* The innermost model or unit this hangs under. Where there is none the
         item belongs to the force itself — the warband's Arsenal, which a
         roster keeps under a container such as `Pile of Stuff`. */
      const owner = [...(f.parents ?? [])].reverse().find((q) => placements.has(q.path));
      const into = owner
        ? placements.get(owner.path)
        : place(containers, root.path, {
          name: root.name, catalogueId, ...asSelection(root),
        });
      const sel = asSelection(f);
      const key = sel.path.join(',');
      const list = into.carries[f.name] ?? (into.carries[f.name] = []);
      if (!list.some((x) => x.path.join(',') === key)) list.push(sel);
    }
  }

  const byEntry = new Map();
  for (const p of placements.values()) {
    const { entryId, ...rest } = p;
    (byEntry.get(entryId) ?? byEntry.set(entryId, []).get(entryId)).push(rest);
  }

  const emitted = [];
  const unmapped = [];
  /* Derived from the id itself, not assumed: a layer-minted id was never a
     catalogue id, and an unreachable catalogue id is a different finding that
     deserves a different word — and a different response from the build. */
  const noIdentity = (kind, x) => unmapped.push({
    kind,
    entryId: x.entryId,
    name: x.name,
    factionId: x.factionId,
    why: /^cf-/.test(String(x.entryId ?? ''))
      ? 'id minted by a supplement layer — no BattleScribe catalogue carries this entry'
      : 'catalogue id not reachable from any root in data-sources/battlescribe',
  });

  for (const u of units) {
    const places = byEntry.get(u.entryId);
    if (!places) { noIdentity('unit', u); continue; }
    emitted.push({ entryId: u.entryId, name: u.name, factionId: u.factionId, placements: places });
  }
  for (const v of variants) {
    if (!variantPaths.has(v.entryId)) noIdentity('variant', v);
  }

  return {
    version: 1,
    system: cat.system,
    catalogues: cat.catalogues.map((c) => ({
      id: c.id, name: c.name, revision: c.revision,
      gameSystemId: c.gameSystemId, gameSystemRevision: c.gameSystemRevision,
    })),
    segments,
    groupNames,
    units: emitted,
    containers: [...containers.values()],
    variants: variants
      .filter((v) => variantPaths.has(v.entryId))
      .map((v) => ({ id: v.id, entryId: v.entryId, name: v.name, ...variantPaths.get(v.entryId) })),
    unmapped,
  };
}
