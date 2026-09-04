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
 */

const COUNT = { one: 1, two: 2, three: 3, four: 4 };
const countOf = (w) => COUNT[String(w).trim().toLowerCase()] ?? Number(w);

/**
 * `three 1-Handed Melee Weapons or one 1-Handed Melee Weapon and one 2-Handed
 * Melee Weapon` — one KIND, two alternative combinations.
 */
const ALLOWANCE = new RegExp(
  String.raw`(?:up to\s+)?(\w+)\s+(\d)-Handed\s+(Melee|Ranged)\s+Weapons?` +
  String.raw`(?:\s+or\s+(\w+)\s+(\d)-Handed\s+\3\s+Weapons?` +
  String.raw`(?:\s+and\s+(\w+)\s+(\d)-Handed\s+\3\s+Weapons?)?)?`,
  'gi');

/**
 * The condition a conditional allowance states about itself.
 *
 * Only self-describing sentences are read. The book states three more
 * allowances that say "It can have…", where "it" is the entry the paragraph
 * sits under — those need the document structure this reader does not have,
 * and are REPORTED rather than guessed at.
 */
const CONDITION =
  /If an?\s+([A-Z][\w' -]*?)\s+with\s+([A-Z][\w' -]*?)\s+also\s+has\s+an?\s+([A-Z][\w' -]*?)\s*,\s*then/i;

/** `the Shield replaces one of the Melee Weapons it can have` */
const SHIELD_REPLACES =
  /the Shield replaces one of the (Melee|Ranged) Weapons/i;
/** `the Shield Combo rule cannot be used for any of its weapons` */
const NO_SHIELD_COMBO = /Shield Combo rule cannot be used/i;

const SECTION_OF = { melee: 'Melee Weapons', ranged: 'Ranged Weapons' };

/** Every sentence that states a handedness allowance, with its context. */
function statements(text) {
  const flat = text.replace(/\s+/g, ' ');
  const out = [];
  /* A statement runs to the end of its sentence; the Shield clause that
     qualifies it is the sentence after, so both are kept together. */
  const re = /[^.]*?\b(?:one|two|three|four) \d-Handed (?:Melee|Ranged) Weapons?[^.]*\.(?:[^.]*Shield[^.]*\.)?/gi;
  let m;
  while ((m = re.exec(flat))) out.push(m[0].trim());
  return out;
}

export function parseCarryAllowances(src) {
  const text = fs.readFileSync(src, 'utf8');
  const allowances = [];
  /** Stated allowances this reader will not guess an owner for. */
  const unattributed = [];

  for (const raw of statements(text)) {
    const cond = raw.match(CONDITION);

    const bySection = {};
    ALLOWANCE.lastIndex = 0;
    let a;
    while ((a = ALLOWANCE.exec(raw))) {
      const [, n1, h1, kind, n2, h2, n3, h3] = a;
      const section = SECTION_OF[kind.toLowerCase()];
      if (!section) continue;

      /* Each branch of the "or" is one allowed combination: how many of each
         handedness the model may have under that branch. */
      const combos = [{ [h1]: countOf(n1) }];
      if (n2 && h2) {
        const second = { [h2]: countOf(n2) };
        if (n3 && h3) second[h3] = (second[h3] ?? 0) + countOf(n3);
        combos.push(second);
      }
      bySection[section] = combos;
    }
    if (!Object.keys(bySection).length) continue;

    if (!cond) { unattributed.push(raw); continue; }

    const shield = raw.match(SHIELD_REPLACES);
    allowances.push({
      raw,
      model: cond[1].trim(),
      /* Both named by the sentence itself, so nothing about which Formula
         grants what is written here. */
      requires: [cond[2].trim(), cond[3].trim()],
      bySection,
      shieldReplaces: shield ? SECTION_OF[shield[1].toLowerCase()] : undefined,
      shieldComboUsable: !NO_SHIELD_COMBO.test(raw),
    });
  }

  return { allowances, unattributed };
}
