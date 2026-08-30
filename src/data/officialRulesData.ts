/*
  This file has no exports left. It is kept deliberately.

  Everything that was here is now derived from `data-sources/` and reaches the
  app through the generated dataset. What remains is the record of what each
  deleted export was wrong about — and `npm run rules:audit:campaign` fails the
  build if any of their names reappears here, because a file that once held
  fabricated data is where fabricated data comes back.

  The original header read "Extracted from Official Digital Rulebooks with Zero
  Generative Filler". None of it was.
*/

/*
  The Trauma, Exploration and Skills tables used to live here and have been
  DELETED, not moved.

  `npm run rules:audit:campaign` found the three Exploration tables and the four
  Skills tables fabricated end to end — 46 invented entries whose roll mechanics
  were also wrong (AUDIT §1.13). The Trauma Table was sound but is now derived
  from `Campaign Rules.cat` along with the rest.

  All seven come from `dataset.campaign` now. They are deleted rather than left
  in place because a fabricated table that still compiles is one an import can
  quietly reach for again.
*/


/*
  OFFICIAL_SCENARIOS has been DELETED.

  Twelve scenarios built around a scaffold of real terminology, which is the
  hardest kind of wrong data to notice. Against the rulebook:

    - **The game length was wrong for all twelve.** The app said five or six
      Turns for every scenario. Claim No Man's Land lasts four.
    - **A deployment rule was inverted.** The app said Infiltrators in Claim No
      Man's Land "can deploy normally or by using their special deployment
      rules". The book says they "must deploy normally (they cannot use their
      special deployment rules)".
    - **32 of the 46 Glorious Deeds do not exist.** Iron Resolve, Overwhelming
      Force, Warlord Triumphant and 29 others appear nowhere in the rulebook or
      in All Out War. The real deeds for scenario I are Bloodletting, Cast Them
      Down, Hold Your Ground and Lord of War.
    - **Every map was broken.** `mapImage` pointed at /maps/scenario_N.webp for
      all twelve, and not one of those files exists. The real maps were already
      in public/maps/, named for the scenario.

  Two players using the app and the book were playing different games. The
  scenarios are now derived by `scripts/lib/parse-scenarios.mjs` and reach the
  app as `dataset.scenarios`, with each map path checked against public/maps/ at
  build time rather than assumed.
*/


// 2. OFFICIAL TRAUMA TABLE (D66, Pages 102-103)

// 3. OFFICIAL EXPLORATION TABLES (D66, Pages 116-122)


// 4. OFFICIAL CORE KEYWORDS GLOSSARY (Pages 45-66)
/*
  OFFICIAL_KEYWORDS has been DELETED.

  46 hand-written entries against the rulebook glossary's 59, and the gap was
  not just omissions:

    - HEAVY COVER and LIGHT COVER appear **nowhere** in the rulebook. They were
      invented, and they read entirely plausibly — which is the point.
    - The book states parameterised rules once: NEGATE [KEYWORD],
      IGNORE [MODIFIER], +/- DICE. The hand-written copy split them into
      instances (NEGATE FIRE, NEGATE GAS, NEGATE SHRAPNEL) and so never carried
      the general rule that governs the ones it had not thought of.
    - Thirty of the book's keywords were simply missing, ARMOUR PIERCING and
      AUTOMATIC (X) among them.

  The glossary is now derived by `scripts/lib/parse-keywords.mjs` and reaches
  the app as `dataset.keywords`, Tag/Effect distinction intact — the book draws
  it, and "a Keyword that confers an Effect also acts as a Tag" is itself a
  rule.

  A glossary is consulted exactly when a player cannot check it. That is what
  makes an invented entry there worse than most wrong data.
*/


// 5. OFFICIAL SKILLS TABLES (Pages 107-113)


// 6. OFFICIAL WEAPONS CODEX (Pages 70-79 + Warbands Books)
/*
  OFFICIAL_WEAPONS, OFFICIAL_ARMOUR and OFFICIAL_EQUIPMENT have been DELETED.

  Thirty-four wargear records, each with one `cost: number` and one `faction`
  string. Both fields were wrong by construction, not by transcription error:

    - Wargear is priced **per faction**. An Automatic Rifle is 40 Ducats in the
      New Antioch and Trench Pilgrims Armouries and 2 Glory, under a different
      limit, in the Heretic Legions'. One number on one shared record is right
      for two factions out of six and quietly wrong for the other four.
    - `faction: 'universal'`, which almost every record carried, is not a
      category the game has. What exists is six Armoury Tables, and an item is
      stocked by however many of them list it.

  The Armoury Tables are the pricing and legality authority (`src/rules/
  armoury.ts`, 213 rows), and the rulebook's Battlekit chapter carries the
  prose they do not print — descriptions and per-item special rules, derived by
  `scripts/lib/parse-battlekit.mjs`. `src/rules/arsenal.ts` joins the two, and
  that is what the Codex renders.

  Deleted rather than left in place for the reason the campaign tables were: a
  fabricated record that still compiles is one an import can quietly reach for
  again.
*/

