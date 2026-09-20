/**
 * The layer engine.
 *
 * A layer is an ordered set of declarative operations against the accumulated
 * dataset (docs/RULESET-MODEL.md §3). The same engine serves three jobs:
 *
 *   - dataset errata   (Trench Dispatch, the official 1.0.2 Changelog)
 *   - per-roster rules (Warband Variants)
 *   - per-model rules  (Strains, Vile Corpus, Goetic Powers, Glory Items)
 *
 * Every write stamps provenance onto the field it touched. A field with no
 * provenance fails the build — that is what makes an invented value impossible
 * to ship quietly.
 */

/** Stable key for a field's provenance entry. */
const provKey = (kind, id) => `${kind}:${id}`;

export function createProvenance() {
  return {
    /** { 'unit:abc': { 'stats.ranged': {layer, source, verified?} } } */
    map: {},
    stamp(kind, id, field, info) {
      const k = provKey(kind, id);
      (this.map[k] ??= {})[field] = info;
    },
    get(kind, id, field) {
      return this.map[provKey(kind, id)]?.[field];
    },
  };
}

const COLLECTIONS = {
  unit: 'units',
  weapon: 'weapons',
  faction: 'factions',
  keyword: 'keywords',
  /*
    A Warband Variant. Added because the Dispatch amends one directly — it
    rewrites the Stoßtruppen's `Masters of the Grenade` to add a penalty past
    8" — and with no way to address a variant that clause had nowhere to go.
    The app went on printing the benefit without its condition
    (docs/RULES-COVERAGE-AUDIT.md RC-13).
  */
  variant: 'variants',
};

function findTarget(dataset, ref) {
  const coll = dataset[COLLECTIONS[ref.kind]];
  if (!coll) return null;
  // Layers transcribed from a PDF address entries by name, since the source
  // has no ids. Catalogue-derived ops address them by id. Accept both.
  return (
    coll.find((e) => e.id === ref.id) ??
    coll.find((e) => e.name?.toLowerCase() === String(ref.id).toLowerCase()) ??
    null
  );
}

/**
 * Stamp provenance on every leaf of an entity, `stats.ranged` and all.
 *
 * Mirrors the recursion in `findMissingProvenance`: skip `id`, `sourceFile`
 * and anything underscore-prefixed, recurse into plain objects, and treat an
 * array as a leaf.
 */
function stampLeaves(provenance, kind, id, obj, info, prefix = '') {
  for (const [k, v] of Object.entries(obj ?? {})) {
    if (k === 'id' || k === 'sourceFile' || k.startsWith('_')) continue;
    const field = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      stampLeaves(provenance, kind, id, v, info, field);
      continue;
    }
    provenance.stamp(kind, id, field, info);
  }
}

/** Write `value` at a dotted path, creating intermediate objects. */
/** The value at a dotted path, or undefined. */
function getPath(obj, dotted) {
  return String(dotted).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] ??= {};
  cur[parts.at(-1)] = value;
}

/**
 * Apply one layer. Returns the ops that could not be applied, so a layer
 * referring to something that no longer exists is reported rather than
 * silently ignored — the usual way an errata transcription rots.
 *
 * `notes` collects ops that applied but are worth a human's attention — an
 * errata line the catalogues have since caught up with, say. Optional, so the
 * caller that does not care need not pass one.
 */
export function applyLayer(dataset, layer, provenance, notes = [], deferred = [], removals = []) {
  const unresolved = [];
  const source = `${layer.id}:${layer.sourceRef ?? ''}`;

  /*
    Stamp against the entity that was FOUND, not the reference the op used.

    A layer transcribed from a PDF addresses entries by name, because the
    source has no ids; a catalogue-derived op addresses them by id. This used
    to key the provenance entry on `ref.id` — whatever string the op happened
    to carry — so a name-addressed op stamped `unit:Witchburner` while the
    verifier looked for `unit:b5ac-1a57-c1d4-3f4c`.

    It went unnoticed because every field the Dispatch touched already had a
    base stamp from `stampBase`, so the check passed on the base entry and the
    layer's own stamp sat unread beside it. The first op to write a field that
    did NOT exist in the catalogues — `allowedFactions` — had no base stamp to
    hide behind, and the build correctly refused to emit: a value that cannot
    say where it came from is exactly what this system exists to stop.
  */
  const stamp = (ref, field, found) =>
    provenance.stamp(ref.kind, found?.id ?? ref.id, field, { layer: layer.id, source });

  for (const op of layer.ops) {
    if (op.op === 'add') {
      const coll = dataset[op.collection];
      if (!coll) { unresolved.push({ op, why: `no collection ${op.collection}` }); continue; }

      /*
        An `add` that duplicates something already in the collection is not an
        addition, it is a second copy — and a second copy in the recruit list
        is worse than a missing one, because a player picks one of the two and
        has no way to tell which.

        Carcass Front is why this exists: it REPRINTS the Combat Biologist,
        which the Warbands book and the catalogues already carry, so a
        faithful read of the book adds a Mercenary the dataset already has.
        Matched on name plus faction, so the Naval Raiders' Wretched and the
        Heretic Legion's Wretched — genuinely different models sharing a name —
        stay two entries.

        The op is noted, not dropped silently: a reprint is a second printing
        of the same entry, and the caller can cross-check the two.
      */
      const already = coll.find((e) =>
        e?.name?.toLowerCase() === op.entity?.name?.toLowerCase()
        && (e.factionId ?? null) === (op.entity?.factionId ?? null));
      if (already) {
        notes.push({
          op,
          why: `add ${op.collection}/${op.entity.name}`
             + `${op.entity.factionId ? ` (${op.entity.factionId})` : ''}: already in the `
             + 'dataset, so the layer is reprinting it rather than introducing it — '
             + 'skipped, and the existing entry stands',
          reprintOf: already,
        });
        continue;
      }

      coll.push(op.entity);
      const kind = Object.keys(COLLECTIONS).find((k) => COLLECTIONS[k] === op.collection);
      /*
        Stamp every leaf, not every top-level key.

        `findMissingProvenance` walks nested objects — `stats.ranged`,
        `cost.ducats` — so an entity added with a `stats` block and one stamp
        on `stats` still fails the build. The Dispatch's only `add` ops write
        flat scalars, so the shallow version was right until a whole faction
        arrived through the same door.
      */
      stampLeaves(provenance, kind, op.entity.id ?? op.entity.name, op.entity,
        { layer: layer.id, source });
      continue;
    }

    /*
      A row in a faction's Armoury Table is applied LATER.

      `dataset.armouries` does not exist yet at this point in the build — the
      armouries are assembled out of the catalogues after the layers have run,
      so an `addArmouryRow` applied here finds no armoury and reports itself
      unresolved, which is what it did.

      Deferred rather than skipped: `applyArmouryRowOps` runs once the
      armouries exist, and the caller checks that every op deferred here was
      accounted for there. A layer op that quietly disappears between two
      passes is a published rule the app does not have and nobody is told
      about.
    */
    if (op.op === 'addArmouryRow') { deferred.push({ op, layer: layer.id, source }); continue; }

    /*
      A Warband Variant is applied LATER, for the same reason.

      `dataset.variants` is assembled well after the layers run, so an op that
      amends one finds nothing here and reports itself unresolved — which is
      what the Dispatch's `Masters of the Grenade` rewrite did the first time
      it was written. Deferred to `applyVariantOps`, and the caller checks that
      everything deferred here was accounted for there.
    */
    if (op.target?.kind === 'variant') {
      deferred.push({ op, layer: layer.id, source });
      continue;
    }

    const target = findTarget(dataset, op.target);
    if (!target) { unresolved.push({ op, why: `target not found: ${op.target?.kind}/${op.target?.id}` }); continue; }

    switch (op.op) {
      case 'set': {
        /*
          A `set` that REMOVES a keyword is worth saying out loud.

          The Dispatch replaces the Amalgam's entry and its keyword row prints
          four where the catalogue carries five, so the layer correctly drops
          STRONG. The catalogue's `Strong-ish` ability survives, and its text
          is "Two of the arms of the Amalgam have the Keyword STRONG" — so the
          shipped entry both does and does not have the keyword.

          Reported rather than resolved: an ability that contradicts its own
          entry needs the printed page, and the alternative to reporting it is
          that nobody notices for another year. See `keywordRemovals` in the
          build.
        */
        const before = op.field === 'keywords' || op.field?.endsWith('.keywords')
          ? getPath(target, op.field) : undefined;
        setPath(target, op.field, op.value);
        if (Array.isArray(before)) {
          const now = new Set((op.value ?? []).map((k) => String(k).toUpperCase()));
          const gone = before
            .map((k) => String(k).toUpperCase())
            .filter((k) => !now.has(k));
          if (gone.length) removals.push({ target, entity: target.name, removed: gone, op });
        }
        stamp(op.target, op.field, target);
        /*
          A `set` whose value is a plain OBJECT needs every leaf stamped, not
          just the field it was written to.

          `findMissingProvenance` treats an array as a leaf and recurses into
          objects, so `optionGroups` (an array) is covered by the stamp above
          while `earnedRecruitment.spends.count` is not — and the build
          correctly refuses to emit a value that cannot say where it came from.
          Mirrors the recursion in `stampLeaves`, which is what an `add` uses.
        */
        if (op.value && typeof op.value === 'object' && !Array.isArray(op.value)) {
          stampLeaves(provenance, op.target.kind, target?.id ?? op.target.id,
                      op.value, { layer: layer.id, source }, op.field);
        }
        break;
      }

      case 'replace':
        for (const [k, v] of Object.entries(op.entity)) {
          target[k] = v;
          stamp(op.target, k, target);
        }
        break;

      case 'remove': {
        const coll = dataset[COLLECTIONS[op.target.kind]];
        const i = coll.indexOf(target);
        if (i >= 0) coll.splice(i, 1);
        break;
      }

      case 'addKeyword':
        target.keywords ??= [];
        if (!target.keywords.includes(op.keyword)) target.keywords.push(op.keyword);
        stamp(op.target, 'keywords', target);
        break;

      case 'setKeywords':
        target.keywords = [...op.keywords];
        stamp(op.target, 'keywords', target);
        break;

      case 'addAbility': {
        target.abilities ??= [];
        const i = target.abilities.findIndex(
          (a) => a.name?.toLowerCase() === op.ability?.name?.toLowerCase());
        if (i >= 0) {
          // The catalogues already carry an ability of this name, so the errata
          // line has been absorbed upstream. Replace in place: the layer's text
          // still wins, but two abilities of the same name on one profile is
          // not a rule, it is a duplicate — which is what shipped on the
          // Yüzbaşı Captain (Mubarizun, twice) before this check existed.
          target.abilities[i] = op.ability;
          notes.push({
            op,
            why: `addAbility '${op.ability.name}' on ${target.name}: the catalogues ` +
                 `already carry it, so the op superseded in place rather than appending`,
          });
        } else {
          target.abilities.push(op.ability);
        }
        stamp(op.target, 'abilities', target);
        break;
      }

      /*
        Take an ability off an entry.

        The counterpart to `addAbility`, and it exists because of one verified
        case rather than for symmetry. The Dispatch's Amalgam page was read at
        the printed page: it lists exactly five abilities and four Keywords,
        and the catalogue's `Six-armed Monstrosity` and `Strong-ish` are not
        among them. "Replace the … Warband Entries with the following" is
        literal.

        Keeping them was the conservative choice while the list could not be
        confirmed, and it produced an entry that contradicted itself — it
        cannot have any Battlekit but its Gluttonous Arsenal, while
        `Strong-ish` let it wield two HEAVY weapons and asserted a STRONG
        Keyword the same layer removes.

        Unresolved rather than silent when the ability is not there: an errata
        that removes something already gone has rotted, and that is worth
        knowing.
      */
      case 'removeAbility': {
        target.abilities ??= [];
        const i = target.abilities.findIndex(
          (a) => a.name?.toLowerCase() === op.name.toLowerCase());
        if (i < 0) { unresolved.push({ op, why: `no ability named ${op.name}` }); break; }
        target.abilities.splice(i, 1);
        stamp(op.target, 'abilities', target);
        break;
      }

      case 'replaceAbility': {
        target.abilities ??= [];
        const i = target.abilities.findIndex(
          (a) => a.name?.toLowerCase() === op.name.toLowerCase());
        if (i < 0) { unresolved.push({ op, why: `no ability named ${op.name}` }); break; }
        target.abilities[i] = op.ability;
        stamp(op.target, 'abilities', target);
        break;
      }

      /*
        A named rule in a faction's or variant's `specialRules` prose.

        `set` cannot reach these: they are an array of `{name, description}`
        and a dotted path has no way to say "the one called Masters of the
        Grenade". Two ops rather than one, because amending a rule that is not
        there and adding one that already exists are different mistakes and
        should fail differently.
      */
      case 'setSpecialRule': {
        const rules = target.specialRules;
        if (!Array.isArray(rules)) {
          unresolved.push({ op, why: `${target.name} has no specialRules to amend` });
          break;
        }
        const i = rules.findIndex(
          (r) => r.name?.toLowerCase() === op.name.toLowerCase());
        if (i < 0) {
          unresolved.push({ op, why: `no special rule named ${op.name} on ${target.name}` });
          break;
        }
        rules[i] = { ...rules[i], ...op.rule };
        stamp(op.target, 'specialRules', target);
        break;
      }

      case 'addSpecialRule': {
        target.specialRules ??= [];
        const i = target.specialRules.findIndex(
          (r) => r.name?.toLowerCase() === op.rule?.name?.toLowerCase());
        if (i >= 0) {
          /* Same reasoning as `addAbility`: the source has caught up, so the
             layer's text supersedes rather than appending a duplicate rule. */
          target.specialRules[i] = op.rule;
          notes.push({
            op,
            why: `addSpecialRule '${op.rule.name}' on ${target.name}: already `
               + 'present, so the op superseded in place rather than appending',
          });
        } else {
          target.specialRules.push(op.rule);
        }
        stamp(op.target, 'specialRules', target);
        break;
      }

      case 'addOption': {
        target.options ??= [];
        const i = target.options.findIndex(
          (o) => o.name?.toLowerCase() === op.option?.name?.toLowerCase());
        if (i >= 0) {
          // The catalogues have caught up with this errata line.
          target.options[i] = { ...target.options[i], ...op.option };
          notes.push({ op, why: `addOption '${op.option.name}' on ${target.name}: ` +
                                `already in the catalogues, superseded in place` });
        } else {
          target.options.push(op.option);
        }
        stamp(op.target, 'options', target);
        break;
      }

      case 'setCost': {
        /*
          A weapon price is set per Armoury Table, not once.

          The Dispatch says "Change the Cost of Incendiary Grenades to 10 in
          the following Armoury Tables: New Antioch, Trench Pilgrims, Iron
          Sultanate, Heretic Legions, The Court". This wrote `target.cost` on
          the single weapon profile the name resolved to first and touched no
          armoury row at all — and `priceOf` reads the ROW. So the published
          change reached nothing a player was charged: all seven rows still
          said 15, while one profile said 10, and which number you saw
          depended on which screen asked (DA-07 / FD-02).

          A weapon `setCost` must therefore name its factions, and is
          unresolved without them: setting one unnamed copy is the defect, not
          a lesser version of the fix. A UNIT `setCost` is unaffected — a unit
          is a single entry priced from `unit.cost`.
        */
        if (op.target?.kind === 'weapon') {
          if (!Array.isArray(op.factions) || op.factions.length === 0) {
            unresolved.push({
              op,
              why: 'weapon setCost without a `factions` list: a weapon is priced per '
                 + 'Armoury Table, and setting one unnamed copy is what this rule exists '
                 + 'to prevent',
            });
            break;
          }

          /*
            Profiles first, where any are faction-scoped. Not every listed
            faction has its own profile — most share a generic one — so a
            faction with no profile is not an error here. The armoury rows
            below are what the Dispatch actually names, and those must all
            exist.
          */
          for (const w of dataset.weapons ?? []) {
            if (w.name !== op.target.id) continue;
            if (!op.factions.some((f) => sameFaction(w.factionId, f))) continue;
            w.cost ??= { ducats: 0, glory: 0 };
            w.cost[op.currency] = op.value;
            stamp(op.target, `cost.${op.currency}`, w);
          }

          /* And the rows, once the armouries exist. */
          deferred.push({ op, layer: layer.id, source });
          break;
        }

        target.cost ??= { ducats: 0, glory: 0 };
        target.cost[op.currency] = op.value;
        stamp(op.target, `cost.${op.currency}`, target);
        break;
      }

      default:
        unresolved.push({ op, why: `unknown op ${op.op}` });
    }
  }

  return unresolved;
}

/**
 * Does this faction label name the same faction as this slug?
 *
 * The dataset spells a faction two ways. An armoury is keyed by slug
 * (`iron-sultanate`); a weapon profile carries `factionId` as the printed
 * name (`Iron Sultanate`), and some profiles are not faction-scoped at all
 * (`Ranged Weapons`, a section heading). A `factions` list written in slugs
 * and compared naively against profiles matches nothing — silently, which is
 * the same class of fault as the one this exists to fix.
 */
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sameFaction = (label, wanted) => slug(label) === slug(wanted);

/** Apply an ordered list of layers, honouring the ruleset's beta preference. */
export function applyLayers(dataset, layers, provenance, { includeBeta = true, deferred = [], removals = [] } = {}) {
  const report = [];
  for (const layer of layers) {
    if (!includeBeta && layer.status === 'public-beta') {
      report.push({ layer: layer.id, skipped: 'public-beta excluded by ruleset' });
      continue;
    }
    if (layer.status === 'speculative') {
      // Speculative layers never apply to a normal ruleset. They are opt-in
      // only, via their own ruleset. See docs/RULESET-MODEL.md.
      report.push({ layer: layer.id, skipped: 'speculative layers are opt-in only' });
      continue;
    }
    const notes = [];
    const unresolved = applyLayer(dataset, layer, provenance, notes, deferred, removals);
    report.push({ layer: layer.id, ops: layer.ops.length, unresolved, notes });
  }
  return report;
}

/**
 * The layer ops that had to wait for the armouries to exist.
 *
 * `applyLayers` runs before `dataset.armouries` is assembled, so a row cannot
 * be added there. This is the second pass, and it must be given the `deferred`
 * list the first one produced — the caller compares the two counts, so an op
 * cannot fall between the passes unnoticed.
 *
 * Armoury rows carry no provenance stamps (`findMissingProvenance` does not
 * walk `armouries`), so unlike `add` this does not stamp. The row's authority
 * is its layer's own `_src`.
 */
export function applyArmouryRowOps(dataset, deferred) {
  const unresolved = [];
  const notes = [];
  let applied = 0;

  for (const { op, layer: layerId } of deferred) {
    /* Variant ops share this pass; they are handled by `applyVariantOps`. */
    if (op.target?.kind === 'variant') continue;
    /*
      A weapon price the Dispatch set per Armoury Table.

      `priceOf` reads the armoury ROW, so this is the pass that decides what a
      player is charged. Deferred here because the armouries are assembled
      after the layers run — the same reason `addArmouryRow` is.

      Every faction the op names must stock the item: the Dispatch is naming
      tables it expects to find, and one that is missing means the row moved
      or the name changed, which is an errata pointing at something that is no
      longer there. A faction NOT named keeps its own price, which is why the
      Procession and the Naval Raiders still pay 15.
    */
    if (op.op === 'setCost' && op.target?.kind === 'weapon') {
      /*
        One op, one account. The caller reconciles deferred ops against
        applied + unresolved + notes, so an op that touches five rows must
        still count once — and a partly-applied op is a failure, not a
        success with a footnote: the Dispatch named five tables and five is
        what it means.
      */
      const missing = [];
      const rows = [];
      for (const factionId of op.factions ?? []) {
        const armoury = (dataset.armouries ?? []).find((a) => sameFaction(a.factionId, factionId));
        if (!armoury) { missing.push(`${factionId}: no armoury`); continue; }
        const row = (armoury.rows ?? []).find(
          (r) => r.name?.toLowerCase() === String(op.target.id).toLowerCase());
        if (!row) { missing.push(`${factionId}: does not stock ${op.target.id}`); continue; }
        rows.push(row);
      }

      if (missing.length) {
        unresolved.push({
          op,
          why: `setCost ${op.target.id}: the layer names Armoury Tables that do not `
             + `stock it — ${missing.join('; ')}. An errata pointing at a row that has `
             + 'moved is worse than one that fails.',
        });
        continue;
      }

      for (const row of rows) {
        row.cost ??= { ducats: 0, glory: 0 };
        row.cost[op.currency] = op.value;
        /* Rows carry no provenance of their own — `findMissingProvenance`
           does not walk them — so the layer that set the price says so on the
           row, and the audit can report "set by dispatch-01" rather than
           reporting it as drift from the catalogue. */
        if (layerId) row.source = layerId;
      }
      applied++;
      continue;
    }

    if (op.op !== 'addArmouryRow') {
      unresolved.push({ op, why: `deferred op ${op.op} has no second-pass handler` });
      continue;
    }
    const armoury = (dataset.armouries ?? []).find((a) => a.factionId === op.factionId);
    if (!armoury) {
      unresolved.push({ op, why: `no armoury for faction ${op.factionId}` });
      continue;
    }
    /* Same reasoning as `add`: a second row is worse than none, because the
       player picks one of two and cannot tell which is the real price. */
    const already = (armoury.rows ?? []).find(
      (r) => r.name?.toLowerCase() === op.row?.name?.toLowerCase()
          && r.section === op.row?.section);
    if (already) {
      notes.push({
        op,
        why: `addArmouryRow ${op.factionId}/${op.row.name}: already stocked, so the `
           + 'layer is reprinting the row rather than introducing it — skipped, '
           + 'and the existing row stands',
        reprintOf: already,
      });
      continue;
    }
    (armoury.rows ??= []).push(op.row);
    applied++;
  }

  return { applied, unresolved, notes };
}

/**
 * Layer ops that amend a Warband Variant, once the variants exist.
 *
 * The Dispatch rewrites the Stoßtruppen's `Masters of the Grenade` to add a
 * penalty past 8", and until this existed there was nowhere to put it: the app
 * printed the benefit — "Add 4 inches to the Range of all Grenades" — on the
 * screen a player reads before choosing the Variant, without the sentence that
 * qualifies it. `docs/RULES-COVERAGE-AUDIT.md` RC-13.
 *
 * Kept apart from the armoury pass rather than folded into it, because the two
 * fail differently: an armoury row that is already stocked is a reprint and
 * fine, while a special rule that is not there is an errata pointing at
 * something that has moved, and that must be loud.
 */
export function applyVariantOps(dataset, deferred) {
  const unresolved = [];
  const notes = [];
  let applied = 0;

  for (const { op } of deferred) {
    if (op.target?.kind !== 'variant') continue;

    const variant = (dataset.variants ?? []).find(
      (v) => v.id === op.target.id
          || v.name?.toLowerCase() === String(op.target.id).toLowerCase());
    if (!variant) {
      unresolved.push({ op, why: `variant not found: ${op.target.id}` });
      continue;
    }

    if (op.op === 'setSpecialRule') {
      const rules = variant.specialRules;
      if (!Array.isArray(rules)) {
        unresolved.push({ op, why: `${variant.name} has no specialRules to amend` });
        continue;
      }
      const i = rules.findIndex((r) => r.name?.toLowerCase() === op.name.toLowerCase());
      if (i < 0) {
        unresolved.push({
          op,
          why: `no special rule named ${op.name} on ${variant.name}`,
        });
        continue;
      }
      rules[i] = { ...rules[i], ...op.rule };
      applied++;
      continue;
    }

    unresolved.push({ op, why: `variant op ${op.op} has no second-pass handler` });
  }

  return { applied, unresolved, notes };
}

/** Stamp every field of the freshly parsed base data. */
export function stampBase(dataset, provenance, { commit, fileOf }) {
  const walkEntity = (kind, e) => {
    const src = `battlescribe:${fileOf(e) ?? '?'}@${String(commit).slice(0, 7)}`;
    const rec = (obj, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        if (k === 'id' || k === 'sourceFile') continue;
        const field = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) rec(v, field);
        else provenance.stamp(kind, e.id, field, { layer: 'base', source: src });
      }
    };
    rec(e);
  };
  for (const u of dataset.units) walkEntity('unit', u);
  for (const w of dataset.weapons) walkEntity('weapon', w);
}
