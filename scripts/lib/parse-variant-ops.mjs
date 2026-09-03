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
 * The constructs below are the ones the five Carcass Front Variants use, and
 * no more — see docs/RULESET-MODEL.md for the table.
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
 * `have a Melee Characteristic of +2 DICE`.
 *
 * The Characteristic names are the book's own and map onto `Statline`. Only
 * the four a Variant is ever seen to change are listed: inventing a mapping
 * for one the book has not used would be a guess sitting in a lookup table,
 * waiting to be believed.
 */
const CHARACTERISTIC = {
  melee: 'stats.melee',
  ranged: 'stats.ranged',
  armour: 'stats.armour',
  movement: 'stats.movement',
};
const STAT = new RegExp(
  `have an? (${Object.keys(CHARACTERISTIC).join('|')}) Characteristic of ([+-]?[\\w” ]+?)(?=[,.]|\\s+and\\b|$)`,
  'gi');

/** `replace the Whip of God Ability with the Knightly Code Ability`. */
const SWAP_ABILITY = new RegExp(
  `replace(?:s|d)? the (${NAME})Ability with the (${NAME})Ability`, 'gi');

/**
 * `must wear a suit of Armour`.
 *
 * Not a change to the profile — the model is identical either way — but a
 * condition its roster entry has to meet, so it is emitted as `requireGear`
 * and read by the validator rather than by `applyVariant`.
 *
 * The noun maps onto an Armoury Table SECTION, which is the catalogue's own
 * answer to "what counts as a suit of Armour": the Procession of the Sacred
 * Affliction stocks Holy Icon Armour, Ragged Vestments, Reinforced Armour and
 * Standard Armour under `Armour`, and its Shields under `Shield`. Matching on
 * the word instead would count Armour-Piercing Bullets and miss Ragged
 * Vestments — the section knows what the name cannot.
 */
const GEAR_SECTION = { armour: 'Armour' };
const REQUIRE_GEAR = new RegExp(
  `must wear an? (?:suit|set) of (${NAME})`, 'gi');

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

  /*
    Stat and ability changes, scoped to the SENTENCE that states them.

    Both of these are about one model, and which model is decided by the
    sentence rather than by the paragraph:

      "The Leper-Knights use the Lazarist Castigator Warband entry but …have a
       Melee Characteristic of +2 DICE, and replace the Whip of God Ability
       with the Knightly Code Ability."   -> the entry just renamed

      "Wretched models in a Drowned Choir cost 30 👑 and have a Melee
       Characteristic of +0 DICE."        -> the Wretched, named in place

    Scanning the whole paragraph instead would give the Leper-Knight the
    Wretched's statline whenever a Variant happened to mention both.
  */
  const abilityText = new Map(
    specialRules.map((r) => [key(r.name), r.description]));

  for (const sentence of text.split(/(?<=\.)\s+/)) {
    /*
      Whom the sentence is about. A replacement clause aims at the entry it
      renames — the changes come after "but", describing what the model becomes
      — and otherwise the subject is the first entry the sentence names.
    */
    const replaced = [...sentence.matchAll(REPLACES)][0];
    let subject = replaced ? entryFor(replaced[2]) : undefined;
    if (!subject) {
      for (const m of sentence.matchAll(new RegExp(NAME, 'g'))) {
        const found = entryFor(m[0]);
        if (found) { subject = found; break; }
      }
    }
    if (!subject) continue;

    for (const [, characteristic, rawValue] of sentence.matchAll(STAT)) {
      const field = CHARACTERISTIC[characteristic.toLowerCase()];
      const value = rawValue.trim();
      if (!field || !value) continue;
      ops.push({ op: 'set', target: target(subject), field, value });
    }

    for (const [, from, to] of sentence.matchAll(SWAP_ABILITY)) {
      const name = to.trim();
      const description = abilityText.get(key(name));
      /*
        The replacement's own rules text, which the book prints as a named
        special rule on the same Variant — "Knightly Code" sits directly beneath
        the rule that says to swap it in. Without it there is nothing to grant
        but a name, and a model carrying an ability with no rules is worse than
        one still carrying the ability it was supposed to lose.
      */
      if (!description) { unresolved.push(`ability text missing: ${name}`); continue; }
      ops.push({
        op: 'replaceAbility',
        target: target(subject),
        name: from.trim(),
        ability: { id: `variant-${key(name).replace(/\s+/g, '-')}`, name, description },
      });
    }

    for (const [, rawNoun] of sentence.matchAll(REQUIRE_GEAR)) {
      const noun = rawNoun.trim();
      const section = GEAR_SECTION[key(noun)];
      /*
        A noun with no section behind it is reported, never guessed. "Must wear
        a suit of Armour" is enforceable because `Armour` is a section every
        Armoury Table has; anything else the books go on to require would need
        its own answer to what satisfies it, and inventing one here would put a
        legality error in front of a player with nothing they could buy to
        clear it.
      */
      if (!section) { unresolved.push(`gear requirement: ${noun}`); continue; }
      ops.push({ op: 'requireGear', target: target(subject), section, noun });
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
