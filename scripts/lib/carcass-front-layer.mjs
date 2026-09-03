/**
 * The Carcass Front supplement, as a layer.
 *
 * Built from the parsed book rather than hand-written as a `.layer.json`. The
 * Dispatch layer is hand-written because it IS a list of errata sentences —
 * "Change the Cost of Incendiary Grenades to 10" — and transcribing those is
 * transcription. This is fifteen entries, ninety-odd armoury rows and fifteen
 * unique Battlekit items, and typing those out by hand is exactly the thing
 * that put 97% wrong statlines in the app to begin with (rule 1).
 *
 * So: `parse-carcass-front.mjs` reads the book, this turns what it read into
 * `add` ops, and the layer engine applies them with provenance pointing at the
 * PDF. Nothing in between is authored.
 *
 * Why a layer at all, rather than a ruleset of its own: `RESTRUCTURE-PLAN.md`
 * Phase 5 said a Carcass Front *preview* must be opt-in and never a layer on
 * `trenchline`, precisely because it would have been predicted rather than
 * published. §5.7 then says what to do on release — "delete the speculative
 * layer, replace with a PDF-primary layer" — which is this. It is official
 * content, and the app already offers every published faction.
 */
import { parseCarcassFront } from './parse-carcass-front.mjs';
import { variantOpsFromProse } from './parse-variant-ops.mjs';

export const LAYER_ID = 'carcass-front';

const slug = (s) => String(s).toLowerCase()
  .replace(/[’']/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

/**
 * An id for a Carcass Front entity.
 *
 * The catalogues give every entry a BattleScribe GUID and the app addresses
 * entities by it. This book has none — it is a PDF — so ids are derived from
 * the name and prefixed, which keeps them stable across rebuilds and makes it
 * obvious in a roster where an entry came from.
 */
const id = (kind, ...parts) => `cf-${kind}-${parts.map(slug).join('-')}`;

/**
 * Typographic inches, as the rest of the dataset spells them.
 *
 * The catalogues write `6"/Infantry` and `24"`; this PDF sets a right curly
 * quote, `6”/Infantry`. Same measurement, different glyph — and one warband
 * list rendering its Movement differently from the other seven is a wart the
 * player sees. Only the quote character changes; no number does.
 */
const inches = (s) => String(s ?? '').replace(/[”″]/g, '"');

/** The book prints Movement as `6”/Infantry`; the model wants both halves. */
function splitMovement(raw) {
  const v = inches(raw).trim();
  const m = v.match(/^(\d+)\s*"\s*\/\s*(.+?)$/);
  return m
    ? { movement: v, movementInches: Number(m[1]), movementType: m[2] }
    : { movement: v, movementInches: null, movementType: '' };
}

/**
 * One `UnitProfile` per printed statline.
 *
 * An entry with two — a Leper-Pilgrim and the Martyr Penitent it can be
 * resurrected as — becomes two units rather than one unit with two statlines.
 * The roster holds a model with one Melee value, and the second profile is a
 * model the player fields, not a variant reading of the first.
 */
function unitsOf(entry, factionId) {
  return entry.profiles.map((p, i) => {
    const name = p.name || entry.name;
    const mv = splitMovement(p.movement);
    return {
      id: id('unit', factionId, name),
      entryId: id('entry', factionId, entry.name),
      name,
      factionId,
      roles: [entry.role].filter(Boolean),
      keywords: entry.keywords,
      stats: {
        movement: mv.movement,
        movementInches: mv.movementInches,
        movementType: mv.movementType,
        ranged: p.ranged || '-',
        melee: p.melee || '-',
        armour: p.armour || '0',
        base: p.base || '',
      },
      /*
        Only the first profile carries the entry's cost. A Martyr Penitent is
        not recruited at 30 Ducats — it is a Leper-Pilgrim resurrected for 45,
        and the ability says so. Pricing it as a recruit would let a player
        field an army of them for the Pilgrim's price.
      */
      cost: i === 0 ? entry.cost : { ducats: 0, glory: 0 },
      min: i === 0 ? entry.min : null,
      max: i === 0 ? entry.max : null,
      abilities: entry.abilities
        .filter((a) => a.name)
        .map((a) => ({ id: id('ability', factionId, name, a.name), ...a })),
      options: [],
      battlekit: [],
      constraints: [],
      modifiers: [],
      lore: entry.flavour || undefined,
      /*
        What the entry may take, in the book's own words. The entity model has
        no field that can express "the only Ranged Weapons they can have are
        Automatic Pistols and Pistols", and a paraphrase would be a rewrite —
        so it is carried as text and shown to the player.
      */
      battlekitNote: entry.battlekit || undefined,
      /** Not a recruitable profile of its own. See the cost note above. */
      secondaryProfile: i > 0 || undefined,
      sourceFile: 'carcass-front-book.pdf',
    };
  });
}

/** A faction's unique Battlekit becomes a weapon entry the armoury can price. */
function weaponOf(kit, factionId) {
  return {
    id: id('weapon', factionId, kit.name),
    entryId: id('weapon-entry', factionId, kit.name),
    name: kit.name,
    type: kit.type || '',
    range: inches(kit.range) || '',
    keywords: kit.keywords,
    rules: kit.rules.map((r) => (r.name ? `${r.name}: ${r.description}` : r.description))
      .join(' ') || undefined,
    cost: kit.cost,
    constraints: [],
    modifiers: [],
    restrictions: kit.restrictions,
    factionId,
    lore: kit.flavour || undefined,
    sourceFile: 'carcass-front-book.pdf',
  };
}

export function buildCarcassFrontLayer(parsed = parseCarcassFront()) {
  const ops = [];
  const armouries = [];
  const variants = [];
  /*
    Sentences that look like a recruitment rule but name something the faction's
    roster does not have. Reported rather than silently dropped: most are
    wargear ("cannot have Automatic Pistols") sharing a sentence shape with
    models, but a genuine miss hides here too, and a parser that says nothing
    cannot be checked.
  */
  const unresolvedProse = [];

  for (const f of parsed.factions) {
    const factionId = f.name;

    ops.push({
      op: 'add',
      collection: 'factions',
      entity: {
        id: slug(f.name),
        name: f.name,
        budget: f.budget ?? { ducats: 0, glory: 0 },
        specialRules: f.specialRules,
        noSpecialRules: false,
        /** 'Faithful' or 'Fallen' — the book states it in Warband Creation. */
        alignment: f.alignment,
        source: 'carcass-front',
      },
    });

    for (const entry of f.units) for (const u of unitsOf(entry, factionId)) {
      ops.push({ op: 'add', collection: 'units', entity: u });
    }

    for (const kit of f.uniqueBattlekit) {
      ops.push({ op: 'add', collection: 'weapons', entity: weaponOf(kit, factionId) });
    }

    /*
      Variants and armouries are handed back rather than pushed as ops.

      `rules-build.mjs` assigns `dataset.variants` and `dataset.armouries`
      wholesale AFTER the layers run — both are derived from the catalogues and
      the Armoury Tables, not layered onto them — so an `add` op against either
      collection is applied and then thrown away by the next assignment. The
      build merges these in at the point those collections exist.
    */
    /*
      The faction's own entries, which is what a Variant's prose names.

      Built here rather than from `parsed` directly because `unitsOf` is what
      decides an entry's id and its printed name, and an op has to target the
      same entry the app will look up.
    */
    const entries = f.units.flatMap((entry) => unitsOf(entry, factionId))
      .map((u) => ({ entryId: u.entryId, id: u.id, name: u.name }));

    for (const v of f.variants) {
      /*
        The Variant's rules, as ops rather than only as prose.

        `ops: []` used to be hard-coded here, and it meant every Carcass Front
        Variant was documentation: the app printed "must include 1-3
        Leper-Knights" and then offered no way to field one, because nothing
        renamed the Lazarist Castigator entry the Leper-Knight uses or raised
        its limit from 1. See `parse-variant-ops.mjs` for what is read and, more
        importantly, what is deliberately not.
      */
      const { ops: variantOps, unresolved } = variantOpsFromProse(v.specialRules, entries);
      if (unresolved.length) unresolvedProse.push({ variant: v.name, unresolved });

      variants.push({
        id: slug(v.name),
        entryId: id('variant', factionId, v.name),
        factionId,
        name: v.name,
        sources: ['carcass-front'],
        specialRules: v.specialRules,
        ops: variantOps,
      });
    }

    armouries.push({
      factionId: slug(f.name),
      faction: f.name,
      rows: f.armoury.map((r) => ({
        name: r.name,
        weaponId: null,
        section: r.section,
        cost: r.cost,
        restrictions: r.restrictions,
        /** Printed with a bullet: the rules are in this book, not the core one. */
        unique: r.unique || undefined,
      })),
    });
  }

  /*
    The Mercenary. `allowedFactions` comes from its own inclusion sentence —
    "A Combat Biologist is Faithful and can be recruited as a Mercenary by New
    Antioch and Iron Sultanate Warbands" — read off the entry rather than
    assumed, because the recruit list defaulting to "every faction" is what put
    the Mendelist Ammo Monk in front of a Court warband.
  */
  for (const entry of parsed.mercenaries) {
    for (const u of unitsOf(entry, 'Mercenaries')) {
      ops.push({
        op: 'add',
        collection: 'units',
        entity: { ...u, allowedFactions: hostsOf(entry) },
      });
    }
  }

  return {
    layer: {
      id: LAYER_ID,
      name: 'Carcass Front',
      sourceRef: 'data-sources/carcass-front/carcass-front-book.pdf',
      status: 'published',
      _note: [
        'Generated from the book by scripts/lib/carcass-front-layer.mjs, not',
        'hand-written. See the note at the top of that file for why this one is',
        'derived where the Dispatch layer is transcribed.',
      ],
      ops,
    },
    armouries,
    variants,
    unresolvedVariantProse: unresolvedProse,
  };
}

/**
 * Which Warbands may hire a Mercenary, from its own inclusion sentence.
 *
 * Returns undefined when the sentence names none, which means unrestricted and
 * is a real answer — not the same as "we could not read it". A sentence we
 * cannot parse leaves it undefined too, and the permissive default stands,
 * because hiding a hire a Warband is entitled to is the worse error.
 */
function hostsOf(entry) {
  const text = `${entry.flavour ?? ''}`;
  const m = text.match(/recruited as a Mercenary by\s+(.+?)\s+Warbands/i);
  if (!m) return undefined;
  return m[1].split(/\s*,\s*|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Compare an entry the supplement REPRINTS against the copy already shipped.
 *
 * A reprint is a free second reading of the same model, from a different book
 * and a different extraction. Where the two agree, the dataset has two
 * independent sources for the value. Where they disagree, one of the books is
 * wrong or one of the parsers is — and that is exactly the class of thing that
 * put 97% wrong statlines in the app, so it is reported rather than shrugged
 * at.
 *
 * The known disagreement is the Combat Biologist's currency: `Warbands of
 * Trench Crusade` prints `Cost: 3 ☼` (Glory, matching every other Mercenary
 * and the catalogues), Carcass Front prints `Cost: 3 👑`. The number agrees;
 * only the glyph differs. It is recorded in resolutions.json rather than
 * silently taking one side.
 *
 * @param reprints  the `notes` entries `applyLayer` produced for skipped adds
 * @returns {{agreed: string[], disagreed: {key,ours,book}[]}}
 */
export function crossCheckReprints(reprints) {
  const agreed = [], disagreed = [];

  const norm = (v) => String(v ?? '').toLowerCase()
    .replace(/[”″]/g, '"').replace(/\bdice\b/g, '').replace(/\s+/g, '')
    .replace(/^-$|^–$|^—$|^n\/a$/, '-');

  const FIELDS = [
    ['stats.movement', (e) => e.stats?.movement],
    ['stats.ranged', (e) => e.stats?.ranged],
    ['stats.melee', (e) => e.stats?.melee],
    ['stats.armour', (e) => e.stats?.armour],
    ['stats.base', (e) => e.stats?.base],
    ['cost.ducats', (e) => e.cost?.ducats],
    ['cost.glory', (e) => e.cost?.glory],
  ];

  for (const note of reprints) {
    const book = note.op?.entity;
    const ours = note.reprintOf;
    if (!book || !ours) continue;
    for (const [field, read] of FIELDS) {
      const key = `${book.name}.${field}`;
      if (norm(read(ours)) === norm(read(book))) { agreed.push(key); continue; }
      disagreed.push({ key, ours: read(ours), book: read(book) });
    }
  }

  return { agreed, disagreed };
}

/**
 * "…can use any Faithful Mercenaries that can be taken by Trench Pilgrim
 * Warbands."
 *
 * Both Carcass Front lists state their Mercenary pool by DELEGATION rather
 * than by listing hires: the Procession takes what Trench Pilgrims take, the
 * Naval Raiders take what Heretic Legions take. That sentence is the whole
 * rule, and without reading it the new Warbands are offered only the
 * Mercenaries whose entry names no host at all — so the Procession could hire
 * a Scripture Guardian but not the Witchburner its own rule entitles it to.
 *
 * Read off the faction's own special rule, never assumed: a Warband that does
 * not state a delegation gets none. The alignment word in the sentence is a
 * restatement of the host's — Trench Pilgrims are Faithful, so everything they
 * may hire is — and is not applied as a second filter, because the dataset
 * carries no alignment for a Mercenary and inventing one to filter on is the
 * failure this pipeline exists to prevent.
 *
 * Mutates `dataset.units` and returns what it changed, so the caller can stamp
 * provenance and report it.
 *
 * @returns {{unit: object, from: string, to: string, rule: string}[]}
 */
export function applyMercenaryDelegation(dataset) {
  const changed = [];
  const DELEGATES = /can use any (?:\w+ )?Mercenaries that can be taken by (.+?) Warbands/i;

  for (const faction of dataset.factions ?? []) {
    for (const rule of faction.specialRules ?? []) {
      const m = DELEGATES.exec(rule.description ?? '');
      if (!m) continue;
      const host = m[1].trim();

      for (const u of dataset.units) {
        // Only entries that name their hosts. One that names none is already
        // unrestricted, and adding to a list that does not exist would turn an
        // "anyone may hire this" into a four-name allowlist.
        if (!u.allowedFactions?.length) continue;
        if (!u.allowedFactions.some((f) => sameName(f, host))) continue;
        if (u.allowedFactions.some((f) => sameName(f, faction.name))) continue;
        u.allowedFactions = [...u.allowedFactions, faction.name];
        changed.push({ unit: u, from: host, to: faction.name, rule: rule.name });
      }
    }
  }
  return changed;
}

/**
 * Faction names across sources: the books print "Trench Pilgrim Warbands" and
 * "Heretic Legion", the catalogues store "Trench Pilgrims" and "Heretic
 * Legion". Compared on a singularised, punctuation-free key for that reason.
 */
const sameName = (a, b) => {
  const k = (s) => String(s ?? '').toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '').replace(/s\b/g, '').replace(/\s+/g, '');
  return k(a) !== '' && k(a) === k(b);
};
