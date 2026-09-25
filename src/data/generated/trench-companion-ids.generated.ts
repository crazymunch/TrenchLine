// GENERATED FILE — DO NOT EDIT.
// Produced by `npm run rules:build` from data-sources/trench-companion/id-name-equivalence.json.
//
// The app may not read `data-sources/` — `.vercelignore` keeps that
// directory out of every deployment, so an import of it builds in CI and
// fails on Vercel. Edit the source file; this is its shipped copy, and
// `trenchCompanionEquivalence.test.ts` asserts the two are identical.
// See docs/TRENCH-COMPANION-IMPORT.md and docs/DEPLOYMENT.md.

export const TRENCH_COMPANION_IDS: {
  ids: Record<string, { ours: string | null; theirs: string; why: string; cites: string }>;
  /** The prose keys the source file carries for a human reading it. */
  [note: string]: unknown;
} = {
  "_what": "Trench Companion ids whose id is NOT a slug of any name our dataset carries, and what each one refers to.",
  "_why": "Their ids are slugs of their published names, so the import resolves by name and needs no table for the overwhelming majority: md_brazenbull is the Brazen Bull, sk_standfirm is Stand Firm, up_alchemicalformulae_massive_size is Massive Size in the Alchemical Formulae group. This file is only what is left over — the handful where no rule of spelling reaches from their id to our name. Each entry cites their bundle so the claim can be checked against the source rather than believed.",
  "_not": "This is a name equivalence and nothing else. It never states a cost, a statline, a keyword or a constraint — those come from the generated dataset, as rule 1 requires. An entry whose `ours` is null says only that the thing has no counterpart here, and why; it resolves nothing.",
  "_shape": "Keys are their object_id exactly. `ours` is the name in our dataset, or null where there is none. `theirs` is the name THEIR bundle gives it — or, where their bundle gives it no name at all, their own id, with `why` saying so and citing what the bundle does carry. `why` says what no slug rule can reach.",
  "_guard": "trenchCompanionEquivalence.test.ts fails when an entry stops being needed — when the ordinary slug rules would now resolve it on their own — so this cannot quietly outlive the drift it records.",
  "ids": {
    "md_takwincreation": {
      "ours": "Homunculus",
      "theirs": "Takwin Homunculus",
      "why": "Their id is a slug of neither name. Our Iron Sultanate entry prints as 'Homunculus' and carries `entryName: \"Takwin Homunculus\"`, which is exactly what their bundle calls it — so the two agree on the model and disagree only on which of its two names the id was built from. 'takwincreation' is a slug of neither.",
      "cites": "Trench Companion bundle, model md_takwincreation, name \"Takwin Homunculus\". Ours: Iron Sultanate.cat entry 2f82-e47f-c162-9152, profile name \"Homunculus\", entry name \"Takwin Homunculus\"."
    },
    "up_meleemight": {
      "ours": "Studied Blade",
      "theirs": "Kavass",
      "why": "Their upgrade carries `upgrade_stat: melee +1` and the text 'The model increases their Melee characteristic by +1 DICE'. That is the PURCHASE the catalogue's Kavass rule describes, not the rename: 'You can change the Melee Characteristic of up to 3 Azebs in a House of Wisdom Warband from -1 DICE to +0 DICE at a cost of +5 ducats each.' Our dataset carries that purchase as the Azeb/Kavass entry's hidden option `Upgrades :: Studied Blade`, 5 Ducats. Their id is a slug of the melee effect and ours is a slug of the ability's name, so no slug rule reaches from one to the other.",
      "cites": "Trench Companion bundle, upgrade up_meleemight, name \"Kavass\", upgrade_stat melee +1. Ours: Iron Sultanate.cat:5847 (the Kavass ability text) and :5497 (selectionEntry name=\"Studied Blade\" hidden=\"true\", 5 Ducats), emitted as the entry option Upgrades/Studied Blade."
    },
    "el_snipersnest": {
      "ours": "Sniper’s Lair",
      "theirs": "el_snipersnest",
      "why": "Their bundle carries NO object under this id and no 'Sniper's Nest' name anywhere — an earlier version of this entry claimed one, and that was a name nobody's record states. What the bundle carries is one `el_snipersnest_<faction>` option per faction, each listing that faction's kit; the Iron Sultanate's lists a Siege Jezzail, Alchemical Ammunition and a Cloak of Alamut, which is exactly what our Common Locations roll-16 result prints for the Iron Sultanate under the name 'Sniper’s Lair'. A warband record references the Location as `el_snipersnest` and the option taken as `el_snipersnest_ironsultanate`. So the id resolves by what the option grants, not by a name: no rule of spelling reaches from `snipersnest` to `Sniper’s Lair`, and the book does print a 'Sniper's Nest' — at extract line 6259, as a Ranged Skill, which is the wrong kind of thing entirely.",
      "cites": "Trench Companion bundle: `el_snipersnest_<faction>` option ids and their kit lists (Iron Sultanate: Siege Jezzail, Alchemical Ammunition, Cloak of Alamut). Their warband record: `exploration.locations[].object_id = el_snipersnest` with `selection_ID = el_snipersnest_ironsultanate`, and the two Arsenal lines it carries for that kit are discounted to nothing (the committed fixture al-qarn-rihla-505410.json). Ours: rulebook extract line 6821, Common Locations, 'Sniper’s Lair', listing the same three for the Iron Sultanate. The unrelated Ranged Skill 'Sniper's Nest' is extract line 6259."
    }
  }
};

export default TRENCH_COMPANION_IDS;
