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

/** Write `value` at a dotted path, creating intermediate objects. */
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
export function applyLayer(dataset, layer, provenance, notes = []) {
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
      coll.push(op.entity);
      const kind = Object.keys(COLLECTIONS).find((k) => COLLECTIONS[k] === op.collection);
      for (const f of Object.keys(op.entity ?? {})) {
        provenance.stamp(kind, op.entity.id ?? op.entity.name, f, { layer: layer.id, source });
      }
      continue;
    }

    const target = findTarget(dataset, op.target);
    if (!target) { unresolved.push({ op, why: `target not found: ${op.target?.kind}/${op.target?.id}` }); continue; }

    switch (op.op) {
      case 'set':
        setPath(target, op.field, op.value);
        stamp(op.target, op.field, target);
        break;

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

      case 'replaceAbility': {
        target.abilities ??= [];
        const i = target.abilities.findIndex(
          (a) => a.name?.toLowerCase() === op.name.toLowerCase());
        if (i < 0) { unresolved.push({ op, why: `no ability named ${op.name}` }); break; }
        target.abilities[i] = op.ability;
        stamp(op.target, 'abilities', target);
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

      case 'setCost':
        target.cost ??= { ducats: 0, glory: 0 };
        target.cost[op.currency] = op.value;
        stamp(op.target, `cost.${op.currency}`, target);
        break;

      default:
        unresolved.push({ op, why: `unknown op ${op.op}` });
    }
  }

  return unresolved;
}

/** Apply an ordered list of layers, honouring the ruleset's beta preference. */
export function applyLayers(dataset, layers, provenance, { includeBeta = true } = {}) {
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
    const unresolved = applyLayer(dataset, layer, provenance, notes);
    report.push({ layer: layer.id, ops: layer.ops.length, unresolved, notes });
  }
  return report;
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
