import fs from 'node:fs';

/**
 * Per-model carrying allowances stated by a model's own entry.
 *
 * "Unless otherwise stated" is the first line of the Battlekit Limits, and
 * some entries state otherwise. Warbands of Trench Crusade, under Human Hands:
 *
 *   "If a Takwin Homunculus with Human hands also has an Additional Arm, then
 *    it can have three 1-Handed Melee Weapons or one 1-Handed Melee Weapon and
 *    one 2-Handed Melee Weapon, and it can have three 1-Handed Ranged Weapons
 *    or one 1-Handed Ranged Weapon and one 2-Handed Ranged Weapon. If it takes
 *    a Shield, then the Shield replaces one of the Melee Weapons it can have
 *    but the Shield Combo rule cannot be used for any of its weapons."
 *
 * That replaces the chapter's Shield restrictions for such a model, which is
 * why a Homunculus carrying a Shield and a 2-Handed RANGED weapon was being
 * told its Siege Jezzail was illegal: the Shield replaces a MELEE weapon.
 *
 * Read as a LIST OF COMBINATIONS rather than as an arithmetic of hand slots.
 * The book states alternatives — "three 1-Handed, or one 1-Handed and one
 * 2-Handed" — and they are not the same as three hands: another entry in the
 * same book allows "up to three 1-Handed Melee Weapons OR two 1-Handed and one
 * 2-Handed", which is three items in one branch and four hands in the other.
 * Any formula over a single capacity number gets one of those two wrong.
 *
 * ## Attribution
 *
 * This reader used to attribute an allowance only where the sentence named its
 * own condition, and REPORTED the rest — "each says 'it can have…' where 'it'
 * is the entry the paragraph sits under, which needs document structure this
 * reader does not have". It has that structure now: the book prints one
 * heading per model entry, `0-1 Desecrated Saint - Cost: 140 👑`, and an
 * allowance belongs to the entry whose heading it sits under.
 *
 * Structure alone is not trusted, because the extracted text carries page
 * furniture between entries and a paragraph can land in the wrong section.
 * So the attribution is CROSS-CHECKED against the prose: the paragraph must
 * name the model its heading names. Two independent things have to agree
 * before an allowance is attributed, and one that cannot clear both is
 * reported rather than guessed at.
 */

const COUNT = { one: 1, two: 2, three: 3, four: 4 };
const countOf = (w) => COUNT[String(w).trim().toLowerCase()] ?? Number(w);

/**
 * One item the entry names: `up to three 1-Handed Melee Weapons`.
 *
 * The combinations are built by reading the CONNECTORS between these rather
 * than by one regex spanning the whole list, because the book interposes
 * clauses inside a list — "up to three 1-Handed Melee Weapons **from The
 * Court's Armoury Tables** or two 1-Handed Melee Weapons and one 2-Handed
 * Melee Weapon". A single spanning pattern reads that as three unrelated
 * allowances and keeps the last, which is how the Desecrated Saint came out
 * as "one 2-Handed Melee Weapon" — an entry the book gives several arms.
 */
const ITEM =
  /(?:up to\s+)?(one|two|three|four|\d+)\s+(\d)-Handed\s+(Melee|Ranged)\s+Weapons?/gi;

/**
 * The condition a conditional allowance states about itself.
 *
 * Where a sentence names its own model and condition it is believed over the
 * heading it sits under: the sentence is the more specific statement, and the
 * Homunculus allowance is conditional on Formulae rather than on being a
 * Homunculus.
 */
const CONDITION =
  /If an?\s+([A-Z][\w' -]*?)\s+with\s+([A-Z][\w' -]*?)\s+also\s+has\s+an?\s+([A-Z][\w' -]*?)\s*,\s*then/i;

/**
 * A model entry's heading: `0-1 Desecrated Saint - Cost: 140 👑`,
 * `Takwin Homunculus - Cost: 40 👑`, `0-3 Mechanized Heavy Infantry - Cost:
 * 85 or 95 👑`. The recruitment limit is part of the heading, not the name.
 */
const ENTRY = /^(?:\d+-\d+\s+)?([A-Z][A-Za-z'’ -]*?)\s+-\s+Cost:\s/gm;

/** `the Shield replaces one of the Melee Weapons it can have` */
const SHIELD_REPLACES =
  /the Shield replaces one of the (Melee|Ranged) Weapons/i;
/** `the Shield Combo rule cannot be used for any of its weapons` */
const NO_SHIELD_COMBO = /Shield Combo rule cannot be used/i;
/** `It cannot have any other Battlekit.` — Desecrated Saint. */
const NO_OTHER_KIT = /cannot have any other Battlekit/i;

const SECTION_OF = { melee: 'Melee Weapons', ranged: 'Ranged Weapons' };

/**
 * What the entry does with the combinations it names.
 *
 * Three different things, and they are not interchangeable:
 *
 *   permitted  "It can have up to three 1-Handed Melee Weapons or…"
 *   required   "In addition, it must have either two 1-Handed Melee Weapons
 *               or one 2-Handed Melee Weapon."          (Scripture Guardian)
 *   innate     "An Anchorite Shrine is armed with two 1-Handed Melee Weapons
 *               (the Catherine Wheel and Bonebreaker Mace)."
 *
 * All three CAP what the model may carry, which is the part the validator
 * enforces. Only the first is purely a permission: the other two also state a
 * FLOOR, and recording them as permissions would have said a Scripture
 * Guardian carrying nothing at all was a legal model. The floor is recorded
 * and reported rather than enforced — see `docs/RULESET-MODEL.md` §7d.
 */
function modalityOf(paragraph) {
  if (/\bis armed with\b/i.test(paragraph)) return 'innate';
  if (/\bmust have\b/i.test(paragraph)) return 'required';
  return 'permitted';
}

/**
 * The entry sections of the book, in order, plus everything before the first
 * heading.
 *
 * That leading part is the chapter text — the Keyword Glossary among it — and
 * it belongs to no model. STRONG states a carrying rule there ("it can equip
 * and use one 2-Handed Melee Weapon as if it were a 1-Handed Melee Weapon");
 * that one is a Keyword, read by `parseKeywordCarryRules`, and reporting it
 * here as an unread allowance sends someone to look for a rule that is
 * already enforced.
 */
function sections(text) {
  const heads = [];
  ENTRY.lastIndex = 0;
  let m;
  while ((m = ENTRY.exec(text))) heads.push({ model: m[1].trim(), at: m.index });

  const out = [{ model: null, body: text.slice(0, heads[0]?.at ?? text.length) }];
  for (let i = 0; i < heads.length; i++) {
    out.push({
      model: heads[i].model,
      body: text.slice(heads[i].at, heads[i + 1]?.at ?? text.length),
    });
  }
  return out;
}

/**
 * Every statement that states a handedness allowance, with its context.
 *
 * The sentence before is kept as well. Both entries that state an allowance
 * without naming a condition open with a pronoun — "A Desecrated Saint has
 * several arms. It can have up to three…" — so the model's name is in the
 * sentence before, and that name is what the attribution is checked against.
 * The sentence after is kept where it qualifies the allowance: with a Shield
 * ("If it takes a Shield, then the Shield replaces one of the Melee Weapons")
 * or by closing the entry off ("It cannot have any other Battlekit").
 */
function statements(text) {
  const flat = text.replace(/\s+/g, ' ');
  const out = [];
  const re = /(?:[^.]*\.\s*)?[^.]*?\b(?:one|two|three|four) \d-Handed (?:Melee|Ranged) Weapons?[^.]*\.(?:[^.]*(?:Shield|other Battlekit)[^.]*\.)?/gi;
  let m;
  while ((m = re.exec(flat))) out.push(m[0].trim());
  return out;
}

/**
 * A Keyword Glossary entry, which states rules about a KEYWORD and not about
 * any one model: `STRONG (Effect): A model with this Keyword has…`.
 *
 * Detected by that shape rather than by where it falls in the book. Position
 * cannot tell it apart: Warbands of Trench Crusade prints two worked example
 * entries — a Chorister and Heretic Troopers, with their real entries again
 * hundreds of pages later — BEFORE the glossary, so the glossary sits inside
 * an entry section by position and belongs to none of it.
 *
 * STRONG is the one that matters here ("it can equip and use one 2-Handed
 * Melee Weapon as if it were a 1-Handed Melee Weapon"), and it is read by
 * `parseKeywordCarryRules`. Reporting it as an unattributed allowance sends
 * someone to look for a rule that is already enforced.
 */
const GLOSSARY = /\b[A-Z][A-Z ]{2,}\s*\((?:Effect|Tag|Special)\)\s*:/;

/**
 * The combinations a statement allows, per Armoury Table section.
 *
 * Built from the CONNECTOR between one named item and the next: `or` opens a
 * new combination, `and` adds to the one in hand. A change of kind opens a new
 * one too — the Homunculus sentence runs "…one 2-Handed Melee Weapon, **and**
 * it can have three 1-Handed Ranged Weapons…", where the `and` joins two
 * sentences rather than two halves of one combination.
 *
 * A sentence boundary between items also opens a new combination, so a second
 * sentence never extends the first one's allowance.
 */
function combinationsIn(statement) {
  const bySection = {};
  const items = [];
  ITEM.lastIndex = 0;
  let m;
  while ((m = ITEM.exec(statement))) {
    items.push({
      count: countOf(m[1]), hands: m[2], kind: m[3].toLowerCase(),
      at: m.index, end: m.index + m[0].length,
    });
  }

  let previous;
  for (const item of items) {
    const section = SECTION_OF[item.kind];
    if (!section) continue;
    const between = previous ? statement.slice(previous.end, item.at) : '';
    const joins = previous
      && previous.kind === item.kind
      && /\band\b/i.test(between)
      && !/\bor\b/i.test(between)
      && !/[.;]/.test(between);

    const combos = (bySection[section] ??= []);
    if (joins && combos.length) {
      const last = combos[combos.length - 1];
      last[item.hands] = (last[item.hands] ?? 0) + item.count;
    } else {
      combos.push({ [item.hands]: item.count });
    }
    previous = item;
  }
  return bySection;
}

/**
 * The sentence that carries the allowance, out of the statement's context.
 *
 * The modality is read from THIS and not from the whole statement, because
 * the statement deliberately keeps the sentence before it for the model's
 * name — and the sentence before the Homunculus's allowance ends "…if it is
 * armed with any Melee Weapons", which was enough to record a conditional
 * allowance as innate armament.
 *
 * The book's BULLET is a statement boundary as much as a full stop is, and
 * that sentence has no full stop after it: the extracted text reads
 * "…armed with any Melee Weapons * If a Takwin Homunculus with Human hands…".
 */
function allowanceSentence(statement) {
  const parts = statement.split(/(?<=\.)\s+|\s\*+\s/);
  return parts.find((p) => { ITEM.lastIndex = 0; return ITEM.test(p); }) ?? statement;
}

/** `Desecrated Saint` in `A Desecrated Saint has several arms.` */
function namesModel(paragraph, model) {
  if (!model) return false;
  const key = model.trim().toLowerCase();
  const text = paragraph.toLowerCase();
  /* The book pluralises a Troops entry's heading and its prose alike. */
  return text.includes(key) || text.includes(key.replace(/s$/, ''));
}

/**
 * The prose says there are alternatives; the parse must have found them.
 *
 * This is the shape of the bug that hid the Desecrated Saint, and it is
 * checked against the SENTENCE rather than against a list of entries this
 * reader keeps — a guard that consults the same thing the parse consults
 * cannot fail. "up to three 1-Handed Melee Weapons from The Court's Armoury
 * Tables **or** two 1-Handed Melee Weapons and one 2-Handed Melee Weapon" has
 * an `or` between two Melee items, so the Melee combinations must number more
 * than one. The reader that spanned the list with a single pattern produced
 * exactly one, and said the entry allowed a single 2-Handed weapon.
 */
function checkAlternatives(model, sentence, bySection) {
  for (const [section, combos] of Object.entries(bySection)) {
    const kind = section === 'Melee Weapons' ? 'Melee' : 'Ranged';
    const items = [...sentence.matchAll(
      new RegExp(String.raw`(\d)-Handed\s+${kind}\s+Weapons?`, 'gi'))];
    for (let i = 1; i < items.length; i++) {
      const between = sentence.slice(
        items[i - 1].index + items[i - 1][0].length, items[i].index);
      if (/\bor\b/i.test(between) && combos.length < 2) {
        throw new Error(
          `${model}: the entry states alternatives — "${sentence.trim()}" — `
          + `but ${combos.length} combination was read for ${section}. `
          + 'The list was parsed as one branch, so the model will be held to '
          + 'the wrong one.');
      }
    }
  }
}

export function parseCarryAllowances(src) {
  const text = fs.readFileSync(src, 'utf8');
  const allowances = [];
  /** Stated in an entry, and not attributable to the model it names. */
  const unattributed = [];
  /** Stated by the chapter rather than by any entry — Keywords. */
  const chapterLevel = [];

  for (const section of sections(text)) {
    for (const raw of statements(section.body)) {
      const cond = raw.match(CONDITION);

      const sentence = allowanceSentence(raw);
      const bySection = combinationsIn(sentence);
      if (!Object.keys(bySection).length) continue;

      /* A rule about a Keyword rather than about a model. Reported as that,
         not as an entry allowance nobody could place. */
      if (!cond && GLOSSARY.test(raw)) { chapterLevel.push(raw); continue; }

      /* Outside any entry: the chapter's own text. */
      if (!section.model && !cond) { chapterLevel.push(raw); continue; }

      /* A sentence that names its own model and condition is believed over
         the heading it sits under; otherwise the heading must be confirmed by
         the prose before it is used. */
      const model = cond ? cond[1].trim() : section.model;
      if (!cond && !namesModel(raw, section.model)) { unattributed.push(raw); continue; }

      checkAlternatives(model, sentence, bySection);

      const shield = raw.match(SHIELD_REPLACES);
      allowances.push({
        raw,
        model,
        /* Both named by the sentence itself, so nothing about which Formula
           grants what is written here. */
        requires: cond ? [cond[2].trim(), cond[3].trim()] : [],
        modality: modalityOf(sentence),
        bySection,
        shieldReplaces: shield ? SECTION_OF[shield[1].toLowerCase()] : undefined,
        shieldComboUsable: !NO_SHIELD_COMBO.test(raw),
        noOtherBattlekit: NO_OTHER_KIT.test(raw) || undefined,
      });
    }
  }

  return { allowances, unattributed, chapterLevel };
}
