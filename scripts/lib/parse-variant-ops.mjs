/**
 * Warband Variant rules, from the prose, as ops the engine can act on.
 *
 * The BattleScribe catalogues state a Variant's effects as machine-readable
 * modifiers, and `parse-battlescribe.mjs` lifts them straight out. A
 * supplement states the same things in English:
 *
 *   "A Knights of Saint Lazarus Warband must include 1-3 Leper-Knights. The
 *    Leper-Knights use the Lazarist Castigator Warband entry…"
 *
 * Read as prose that is documentation. Read as ops it is a recruitment limit
 * and a rename, and the difference is whether the app can offer the player the
 * model the book says the Warband must have 1-3 of.
 *
 * Four constructs, because four is what the five Carcass Front Variants use.
 * Nothing here guesses: a name that does not resolve to an entry in the
 * faction's own list is left alone and reported, because the same sentences
 * talk about wargear ("cannot have Automatic Pistols") in the same words they
 * talk about models ("cannot include Anchorite Shrines"). Resolving the name
 * against the roster IS the discriminator — the verb is not, since "can only
 * have 0-2 Stigmatic Nuns" uses `have` about a model.
 */

/** `Leper-Knights` -> `leper-knight`; the entry list is matched on this. */
const key = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A run of Title Case words, which is what an entry name looks like in the
 * prose. It stops at punctuation and at any lower-case connector, so
 * "1-3 Leper-Knights. The Leper-Knights use…" yields `Leper-Knights` and not
 * the sentence after it.
 */
const NAME = "(?:[A-Z][\\w'’]*(?:[-‑][A-Z][\\w'’]*)*\\s*)+";

/** `must include 1-3 Leper-Knights`, `can only have 0-2 Stigmatic Nuns`. */
const LIMIT = new RegExp(`(\\d+)\\s*[-–]\\s*(\\d+)\\s+(${NAME})`, 'g');

/** `cannot include Lazarist Communicants or Lazarist Castigators`. */
const EXCLUDES = /cannot (?:include|have|be accompanied by) (?:any )?([^.]+?)(?=\.|,? and\b|$)/g;

/** `The Leper-Knights use the Lazarist Castigator Warband entry`. */
const REPLACES = new RegExp(`The (${NAME})use the (${NAME})Warband entry`, 'g');

/**
 * Which of `must` / `may` / `can` governs a limit.
 *
 * Only `must` sets a MINIMUM. "may include 1-3" and "can include 0-4" state a
 * ceiling; reading either as a requirement would make the app demand a model
 * the book merely permits — which is the failure mode that told every Trench
 * Pilgrims warband it must include a Chieftain.
 */
function governingVerb(text, upTo) {
  const before = text.slice(0, upTo);
  const sentence = before.slice(before.lastIndexOf('.') + 1);
  const found = [...sentence.matchAll(/\b(must|may|can)\b/g)].pop();
  return found ? found[1] : 'can';
}

/**
 * Ops for one Variant.
 *
 * `entries` is the faction's own unit list — `[{ entryId, id, name }]`. An op
 * targets `entryId || id`, which is what `variantLimits`, `variantForbids` and
 * `variantRenames` all key on.
 */
export function variantOpsFromProse(specialRules, entries) {
  const byName = new Map();
  for (const e of entries) byName.set(key(e.name), e);

  /** Entry for a name as the book prints it, singularising if it has to. */
  const entryFor = (raw) => {
    const k = key(raw);
    return byName.get(k)
        ?? byName.get(k.replace(/ies$/, 'y'))
        ?? byName.get(k.replace(/s$/, ''))
        ?? undefined;
  };

  const ops = [];
  const unresolved = [];
  const target = (e) => ({ kind: 'unit', id: e.entryId || e.id, name: e.name });
  const text = specialRules.map((r) => r.description).join(' ');

  /*
    Replacements first, and the order is the whole subtlety.

    The Knights of Saint Lazarus "cannot include Lazarist Castigators" and yet
    "must include 1-3 Leper-Knights", which "use the Lazarist Castigator
    Warband entry". Those only contradict if the exclusion is applied to the
    entry the rename has already claimed. It has not been banned; it has become
    something else, and the exclusion is about the model it used to be.

    Reading them in the other order produces a Warband that cannot take the
    model the book says it must have 1-3 of.
  */
  const renamed = new Map();
  for (const [, printed, existing] of text.matchAll(REPLACES)) {
    const from = entryFor(existing);
    if (!from) { unresolved.push(`replaces: ${existing.trim()}`); continue; }
    const to = printed.trim().replace(/s$/, '');
    renamed.set(from.entryId || from.id, to);
    byName.set(key(to), from);
    ops.push({ op: 'set', target: target(from), field: 'name', value: to });
  }

  for (const m of text.matchAll(LIMIT)) {
    const [, lo, hi, raw] = m;
    const e = entryFor(raw);
    if (!e) { unresolved.push(`limit: ${lo}-${hi} ${raw.trim()}`); continue; }
    const id = e.entryId || e.id;
    ops.push({
      op: 'set', target: target(e),
      field: `constraint:${id}-max`, constraintBound: 'max', value: String(hi),
    });
    if (governingVerb(text, m.index) === 'must') {
      ops.push({
        op: 'set', target: target(e),
        field: `constraint:${id}-min`, constraintBound: 'min', value: String(lo),
      });
    }
  }

  for (const [, list] of text.matchAll(EXCLUDES)) {
    /*
      "cannot include any of the following models: Heretic Captain, Abyssal
      Commando, …" — the preamble runs into the first name, and splitting on
      commas alone left `of the following models: Heretic Captain`, which
      resolves to nothing. The Drowned Choir silently kept its Heretic Captain,
      a LEADER the book bans outright, while the other three were excluded
      correctly — the worst shape for a miss, because the output looked right.
    */
    const names = list.includes(':') ? list.slice(list.lastIndexOf(':') + 1) : list;
    for (const raw of names.split(/,| or /)) {
      if (!raw.trim()) continue;
      const e = entryFor(raw);
      // Wargear and Keywords share this sentence shape; only entries are ops.
      if (!e) continue;
      // Renamed above: banned as what it was, present as what it became.
      if (renamed.has(e.entryId || e.id)) continue;
      ops.push({ op: 'set', target: target(e), field: 'hidden', value: 'true' });
    }
  }

  return { ops, unresolved };
}
