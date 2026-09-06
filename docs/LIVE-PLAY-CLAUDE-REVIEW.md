# Live Play: Claude's review of round 1

Reviewing [`LIVE-PLAY-ARCHITECTURE-BRIEF.md`](LIVE-PLAY-ARCHITECTURE-BRIEF.md)
(Codex, 6 September 2026). Design refinement only: nothing here approves
building, buying or deploying anything.

Section numbers refer to the brief.

**Where I agree, briefly, so the disagreements stand out.** The three-mode model
is right. One match engine with three authority adapters is right. The
correction that §2 makes about my own mirror — that it ignores `baseRevision`
and cannot survive a second writer — is correct, and I say more about it below.
The security requirements in §7 are the parts I would fight to keep if scope
gets cut.

I have five substantive disagreements. The first is a rules error that changes
the authority model, and the fourth is time-sensitive.

---

## D1. The authority table has Trench Crusade's core loop backwards

§3's table gives "activation and routine own-model bookkeeping" to the
controlling participant, and lists "spend opponent-model resource" as a separate
row needing an "explicit permitted command". That ordering assumes spending on
another player's model is the exception.

In this game it is the rule. From the dataset, derived from the rulebook p.19
(`markers` in the generated dataset, `spentBy: "opponent"`):

> Each time one of your models suffers a wound, place a BLOOD MARKER next to it.
> When you make a Success Roll for the model, **your opponent** may choose to
> spend one or more BLOOD MARKERS to add -1 DICE. In addition, each time your
> opponent makes an Injury Roll for the model, **they** may choose to spend one
> or more BLOOD MARKERS to add +1 INJURY DICE.

So BLOOD MARKERS sit on *your* model, are capped at 6 on *your* model, and are
spent by *your opponent* — both when you roll and when they roll. BLESSING
MARKERS are the mirror image (`spentBy: "controller"`, no published cap), which
is exactly why the two cannot share one permission rule.

The consequences for the design:

- **The cross-player write is the hot path, not the edge case.** It happens
  several times per activation, interleaved with the opponent's own actions, at
  the moment a roll is being made.
- **"Routine changes should not demand opponent confirmation" collides with
  itself.** The routine change *is* by the opponent. Whichever way that
  principle is written, it has to name whose routine.
- **The latency target in §7 is set against the wrong action.** p95 under one
  second is fine for advancing a round. It is not fine for a marker spend
  announced verbally between two people looking at each other across a table,
  which is the interaction that will decide whether the mode feels usable.

**Proposed replacement.** Do not model permission by *whose model it is*. Model
it by **which published rule grants the spend**, which the pipeline already
derives: `markers[].spentBy` is `opponent` or `controller`, per marker type,
with its cap. The authority row becomes "the participant the rule names may
spend it, up to the published cap" — and it is data, not a hand-written table
that will drift from the book the moment an errata lands.

This is the fourth time in a fortnight that a hand-kept table restating
published rules has drifted from the source (`GITHUB_CATALOG_FILES`,
`FEATURES.md` twice, the Papal States purse). §3's table should say what it
reads, not what it asserts.

---

## D2. The app is a ledger, not a referee — and the protocol should say so

§4 proposes commands with prerequisites, server-side validation, and rejection:
"checks relevant prerequisites against current state", "different content is
rejected", "competing spends of one remaining resource cannot both succeed".

That is the right architecture for a game the server adjudicates. This is not
one. §1 already establishes the product: physical miniatures, physical dice, two
people at one table. The authority is the two humans, and they resolve
disagreements by talking, in under a second, faster than any round trip.

A validating protocol imports the costs of authority without its benefit:

- **Rejection has no good UX mid-turn.** "Your opponent spent that marker first"
  arrives after both players have already agreed out loud what happened. The app
  is now arguing with the table.
- **It buys correctness the players did not need.** Gate 3 — "competing spends
  of one remaining resource cannot both succeed" — describes a race that
  practically cannot occur between two people who can see each other, and the
  machinery to prevent it is a large fraction of the protocol.
- **It makes the failure mode confusing rather than safe.** When the server is
  wrong about state (and it will be, because the physical table is the real
  state), a validating server blocks the correct action.

**Proposed replacement.** An **attributed, append-only, convergent log with
immediate local echo.** Every entry: actor, action, target, timestamp, client
sequence. The server orders and fans out; it does not adjudicate. Then:

- Local echo is instant. Nothing waits on the network to appear on the phone
  that tapped it.
- Conflicts are **surfaced, not prevented**: if two entries touch the same
  marker within a window, both are kept and the strip says "you and Alex both
  spent that marker — tap to fix". The humans resolve it, because they were
  always going to.
- Corrections are new entries that reference a prior entry, never mutations.
  This also answers Q6 for free.

Keep validation for the small set where the app genuinely knows better and the
cost of being wrong is a campaign-level consequence: **finalisation and reward
export**. That one path should be transactional, idempotent and validated
exactly as §4 describes. Everything inside a battle should not be.

Idempotency by action ID is still needed — retries and reconnects are real. What
I am rejecting is *prerequisite checking*, not deduplication.

---

## D3. Transport is being chosen before the state model, and it is the cheap half

§5 compares six transports in detail. But the two decisions that are expensive
and hard to reverse are not in that table:

1. **Getting match state out of the roster.** `store/slices/match.ts` writes
   transient combat fields — `bloodMarkers`, `blessingMarkers`,
   `currentWounds`, `status`, `hasActedThisTurn` — *into the saved roster's
   units*. A match currently mutates the thing it is supposed to be a match of.
2. **The wire protocol.** Once two clients speak it, changing it is a migration.

Transport is the swappable part. And option E is not hypothetical: **it is
built, deployed and running today** — 2s polling, ETag/304, the mirror. It cost
one PR.

**Proposed sequencing:** do the aggregate extraction and the protocol first,
keep polling underneath, and defer the Cloudflare/Ably decision until there is a
real two-player match to measure. The spike in §8 then measures a real workload
instead of a synthetic one, and the decision gets made on evidence rather than
on published allowances.

This also de-risks the estimate: the aggregate extraction is the work that pays
off under *every* transport, including the one already shipped.

---

## D4. A new sub-processor is gated on SB-1b, which is open right now

§7 says to "expand privacy disclosures for Cloudflare's actual live-state
processing". That understates the sequencing constraint.

`trenchline.app` was flagged by Google Safe Browsing as a deceptive site. A
review has been **submitted and is still pending**. Part of the remediation
(`docs/LEGAL.md`) was a privacy policy naming a small, stable sub-processor list,
and a documented finding that the production pages carry no third-party script.

Routing live match state through a new company while that review is outstanding
means changing the sub-processor list and the data-flow description of a domain
under active reputation review. Cloudflare is already named — for **DNS and
email routing**, which is a materially narrower claim than processing live game
state, and `LEGAL.md` records that distinction deliberately.

**Proposed gate:** no new sub-processor, and no widening of Cloudflare's stated
role, until SB-1b resolves. This costs nothing under D3, because the sequencing
there does not need a transport decision yet.

---

## D5. The workload model is roughly an order of magnitude pessimistic, which changes §6's conclusion

§6 assumes **20 accepted actions per minute for three hours** → 3,600 commands,
~10,800 row writes per match, ~108,000 writes/day at ten matches — and concludes
the 100,000/day free write allowance is "already a reason to investigate".

Check that against the game. A battle is roughly 4–6 rounds. Each player fields
on the order of 8–12 models (Field Strength is 10 at game 1, rising to 22 by
game 12 — `campaign.thresholds` in the dataset). So a large game is around
5 rounds × 2 players × 10 models ≈ **100 activations**. At perhaps 5 recordable
events per activation — move, attack, a marker spend or two, an injury — that is
**~500 actions in three hours, near 3 per minute**, not 20.

The brief's own figure would mean an action every three seconds, sustained for
three hours, by two people also physically moving miniatures and rolling dice.

At ~3/minute the numbers become ~500 commands and ~1,500 logical writes per
match; ten matches a day is ~15,000 writes against a 100,000/day allowance.

**Consequence:** write cost stops being a discriminator between architectures,
and §6's hedging about needing Paid before club nights is probably unnecessary.
That removes one of the stated reasons to prefer a particular option, which
strengthens D3 — decide on measured latency and operational simplicity, not on
a projected bill that is 10× too high.

I would not treat my number as authoritative either. It is an estimate from the
published Field Strength table and an assumed events-per-activation rate. The
point is that the two estimates differ by 10×, so **neither should be load
bearing** until a real match is instrumented.

---

## Answers to §9

**1. Three modes, and what GM Mode needs beyond the mirror.** The model matches
my understanding, and §1's correction is fair: the mirror is a starting point,
not GM Mode. It carries one warband's board, no scenario, no scores, no
opponent, no handover.

State that must move into the shared aggregate — from `PlayModeView`:
`isMatchActive`, `matchWarbandIds`, `activePlayerIndex`, `playTurn`,
`selectedScenarioId`, `warbandScores`, `deployedUnitIds`,
`environmentalHazard`, `weatherRolls`, `activeWeather`. From
`store/slices/match.ts`, the per-model combat fields it currently writes into
roster units: `currentWounds`, `bloodMarkers`, `blessingMarkers`, `status`,
`hasActedThisTurn`.

State that must **stay local**: `filterStatus`, `isQuickSearchOpen`,
`isHudExpanded`, `isCardConsoleOpen`, `isMapLightboxOpen`,
`isObjectivesPanelOpen`, `isScoringHistoryOpen`, `isSquadSelectOpen`,
`attackingUnit`, `isAbortConfirmOpen`. Roughly half of `PlayModeView`'s ~20
`useState` calls are panel visibility, and shipping those to another device
would be actively wrong.

The `match.ts` coupling is the one I would fix first regardless of what happens
to Live Play: a match writing into the saved roster is a bug waiting for its
first "my warband's wounds didn't reset" report.

**2. Cloudflare split vs Neon transaction plus outbox.** Neon-plus-outbox is
simpler *for this codebase*, and the failure paths say why.

- *Cloudflare:* room commits to SQLite; export job to Neon can fail. Failure
  path is a durable retry across a trust boundary between two stores that can
  disagree, plus reconciliation, plus the deletion-propagation problem §5 names
  (account deletion must reach both, and a delayed export must not resurrect
  deleted rows). That is real distributed-systems work.
- *Neon + outbox:* state and receipt commit in one transaction; publication can
  fail. Failure path is that clients see stale data until the next poll — which
  is the behaviour they already have today, and which the shipped mirror already
  handles.

The second failure mode degrades into the system we already run. The first
introduces a new consistency problem. For a hobby project maintained by one
person, that asymmetry matters more than latency.

**3. Wrong or missing permissions.** See D1 — the marker rows are inverted for
BLOOD MARKERS, and BLOOD and BLESSING cannot share a rule
(`spentBy: opponent` vs `controller`; cap 6 vs none). Also missing: the cap is
*per model*, so "validate resource availability" needs the target's current
count, not the actor's. Beyond markers, I would not write further permission
rows from memory — derive them from the pipeline, as D1 argues.

**4. Smallest complete two-player feature worth using.** Two phones showing
**one shared board with both forces on it**, where either player can change
their own models' wounds/status/activation and *either* player can spend BLOOD
MARKERS per the rule, with an attributed feed of what just changed and a turn
counter both can advance. No scenario, no scoring, no dice, no objectives. That
is worth carrying to a table because it removes the "what's your guy on again?"
question, which is the actual friction. Scores and objectives can stay on paper
for a first release.

**5. Offline queueing.** Safe to queue: anything attributed and additive to your
own models — wounds, status, activation, notes, and marker spends *you* are
entitled to. Must wait: round advance, finalisation, and anything that consumes
a shared or capped resource on a model the other player is also touching. Under
D2's log model the queue is just unsent entries, and the reconciliation on
reconnect is "show both, let them fix it" rather than a replay engine.

**6. Correction after a dependent action.** Corrections are new entries
referencing the prior one; nothing is mutated or replayed. If a later entry
depended on the corrected one, mark the dependent entry *disputed* and show
both to both players — do not attempt automatic cascade. Two people at a table
resolve this in seconds and will be annoyed by an app that tries.

**7. Schema/index choice that changes write cost.** Per D5 the estimate is ~10×
high, so this matters less than §6 implies. The one real lever: **do not write
one row per field change.** One append-only entry per player-visible action,
with the derived board materialised on read or in a periodic snapshot, turns
§6's "three logical writes per action" into one. Index on `(matchId, sequence)`
only; resist per-model indexes, which is where write amplification actually
comes from.

**8. What would falsify the Cloudflare recommendation.** Measured p95
confirmation over ~1s from Australian mobile networks after hibernation wake;
export reconciliation needing more than a trivial retry loop; or — most likely —
the discovery under D3 that polling is already good enough at real action rates,
which makes the second runtime unjustifiable rather than wrong.

**9. Effort credibility.** Specification and engine/protocol at 1–2 and 2–3
weeks look right. **Two-player alpha at 3–5 weeks is optimistic**, because it
silently contains the `match.ts` extraction: transient combat state currently
lives inside roster units, so pulling it out touches the store, `PlayModeView`,
and the tests around both — against a suite of 1,396 tests that will need
rewriting rather than merely passing. I would put that alone at 1–2 weeks
before any multiplayer work starts. Total 11–18 rather than 9–16, and I would
not present either range to anyone as a schedule.

**10. Doc changes.** `LIVE-MODE.md` line 3 still calls this "the last unbuilt
row" and frames stage one as unstarted — stale since #40, and §2 is right to
flag it. `FEATURES.md` is current as of #42 (the live row reads 🟡 with stage
one described). On a decision, `LIVE-MODE.md` becomes the GM Mode document and
this brief becomes the Live Play one; `LEGAL.md` changes only if D4's gate is
lifted; `ARCHITECTURE.md` needs the match aggregate once it exists.

---

## What I would do next

Nothing that requires choosing a vendor.

1. Extract the match aggregate out of the roster (D3, Q1, Q9). Pays off under
   every option including the one already shipped, and fixes a live bug.
2. Write the action log and permission model from the pipeline's marker data
   (D1, D2), still on polling.
3. Put GM Mode in front of the group at a real table and instrument it.
4. *Then* choose a transport, against measured numbers, once SB-1b has cleared
   (D4).

Round 2 should carry a decision table. My proposals above are numbered so they
can go in it as accepted, rejected or deferred.

**Unresolved and genuinely the owner's call**, adding to §9's list: whether the
app is a referee or a ledger (D2) is a product decision as much as a technical
one, and it should be settled before the protocol is written rather than
discovered afterwards.
