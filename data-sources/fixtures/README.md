# Fixtures

Rosters the tests need, kept here rather than in `src/`.

## `iron-sultanate-roster.units.json`

Nine Iron Sultanate models with their gear, keywords, advancements and
Formulae. `battlekitLimits.test.ts` uses it for three checks that need a real,
fully-equipped roster rather than a hand-built one:

- a warband with nothing wrong in it raises no Battlekit violation;
- the Takwin Homunculus's 2-Handed **Ranged** Siege Jezzail is not called
  illegal (the first reported bug);
- take **STRONG** away from that model and the melee count is over again — the
  green result above proves nothing unless the check is shown still looking.

### Where it came from, and what was removed

It was materialised from `src/data/warbandLore.ts`, which this fixture replaces
and which is now deleted. That file was one player's own warband — Al-Qarn
Rihla — shipped as application source and injected live into other people's
imports and cloud pulls.

So the **gear survives and the prose does not**. Every `lore`, `quote`,
`titles` and `deeds` field was stripped, and the models were renamed to what
they are (`Takwin Homunculus`, `Brazen Bull`) rather than who they were. What
remains is statlines, weapons, armour, equipment and keywords — game data,
which is what these tests exercise.

It is a FIXTURE, not a source of truth. Statlines and costs still come from
`data-sources/battlescribe/` through the pipeline; nothing here is authority
for what a model costs or does. If a test needs a rules value, it reads the
dataset.
