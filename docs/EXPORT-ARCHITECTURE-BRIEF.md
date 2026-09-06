# Roster export and print: architecture brief and review round 1

Status: proposal for Claude / Codex discussion; no implementation decision
approved.
Author: Claude. Date: 6 September 2026.
Repository baseline: `a486f2b` plus PR #43.
Related: [features](FEATURES.md), [ruleset model](RULESET-MODEL.md),
[mobile standards](MOBILE.md), [legal](LEGAL.md),
[campaign sync](CAMPAIGN-SYNC.md).

## 1. Scope and the one structural claim

The owner has asked for a roster **Export / Print** control offering, in their
words: export to TrenchLine, NewRecruit and plain text (plain text
"configurable about the level of detail"), and print in plain, pretty and
complex modes, "pretty" ideally comparable to PrettyScribe.

The structural claim this brief makes: **those six outputs are two different
products and should not share a pipeline.**

| | Interchange | Presentation |
|---|---|---|
| Outputs | TrenchLine, NewRecruit/BattleScribe | Plain text, print plain / pretty / complex |
| Read by | Software | People |
| Success test | Round-trip fidelity — export, import, identical roster | Legibility on the target medium |
| Lossy? | Never | Deliberately, and configurably |
| Fails by | Silently producing a file the other tool mis-reads | Looking bad |
| Versioning | Required, explicit, forever | None; regenerate at will |

They want different code, different tests, and different release gates.
Interchange gets property-based round-trip tests. Presentation gets snapshot and
print checks. A single "export engine" with a format enum would couple a
correctness problem to a taste problem, and the taste problem changes far more
often.

Out of scope for a first release: campaign-level export (multiple warbands, a
season's results), and importing anything new. This is one roster, out.

## 2. What exists

`ExportModal.tsx`, 128 lines, opened from `WarbandBuilder`. It offers:

- plain text, hand-built by string concatenation;
- Discord markdown, likewise;
- `window.print()` against the modal, with one `print:hidden` on the action bar
  and no print stylesheet;
- a JSON download that is `JSON.stringify(warband)` — the internal shape,
  unversioned.

That JSON is the thing to be careful about. It is already in users' hands and is
already the de-facto "TrenchLine export", but it is a dump of an internal type.
Any refactor of `Warband` silently breaks every file anyone has saved, and
nothing declares a version to detect that.

## 3. Interchange

### 3.1 TrenchLine → TrenchLine

Proposal: a **versioned envelope**, not the internal type.

```
{ format: "trenchline.roster", version: 1,
  exportedAt, rulesetId, baseCommit,      // provenance, from dataset.meta
  warband: { … }                          // an explicit projection, not Warband
}
```

Three reasons the envelope earns its keep:

1. **`version` lets an importer refuse rather than guess.** Rule 2. A v2 file
   opened by a v1 build should say so, not partially load.
2. **`rulesetId` + `baseCommit` record what the roster was legal under.** The
   app already ships both (`dataset.meta`, and `meta.baseFiles` as of #43). A
   roster built against one ruleset and imported into another is a real
   situation — the app supports two rulesets today — and the importer should be
   able to say "this was built under 1.0.2; you are on 1.0.2TD" rather than
   silently revalidate.
3. **An explicit projection stops internal churn leaking.** Transient combat
   state should never be in an export: `currentWounds`, `bloodMarkers`,
   `blessingMarkers`, `status`, `hasActedThisTurn` live on roster units today
   (see `store/slices/match.ts` — this is a known defect, noted in
   `LIVE-PLAY-CLAUDE-REVIEW.md` D3) and would otherwise ship mid-battle wounds
   inside a roster file.

Gate: export → import → deep-equal on a property-generated roster, including
Glory-priced units, injuries, advancements, stash and lore fields. `SYNC-1`
already found six warband fields being dropped silently by a different
serialiser; that failure should not be repeated in a file format.

### 3.2 TrenchLine → NewRecruit / BattleScribe

**This is the risky one, and the risk is identity, not XML.**

A `.ros` selection references the catalogue's `selectionEntry` id. The dataset
carries those: `entryId` on 105/105 units and 652/654 weapons. So the mapping
exists.

But the roster does not reliably hold one. `ActiveUnit.baseProfileId` is
heterogeneous today:

- `profile.id` — the dataset's BattleScribe id (`5fad-8b9c-8d6a-a2f0`), which is
  the *profile* id and still needs resolving to `entryId`;
- a hand-written slug — `warbandLore.ts` uses `'unit-jabirean-alchemist'`;
- a **name-derived fallback** the importer invents when it cannot match:
  `baseProfileName.toLowerCase().replace(/[^a-z0-9]+/g, '-')`
  (`newRecruitImporter.ts:501`).

So for any given unit, export may resolve to a catalogue entry, or may not.

Proposed handling, and the point I most want reviewed: **a NewRecruit export
that cannot resolve every selection must refuse, naming what it could not
map** — not emit a file with the unmapped models dropped or guessed. A roster
file that is silently short two models is exactly the failure class this project
exists to avoid (`AUDIT.md` §1.8), and it is worse here than a fabricated stat,
because the person will not look at the file: they will open it in NewRecruit
and trust what appears.

Second-order questions I do not have answers to:

- Does NewRecruit accept `.ros` XML we generate, or only files its own exporter
  wrote? We have only ever *read* their format.
- Do the 2 weapons without `entryId` matter, and which are they?
- Are Glory-priced entries, third-party variants and Carcass Front content
  representable in a `.ros` at all, given those catalogues are community files
  of varying completeness?

Until those are answered I would treat NewRecruit export as **spike first,
commit later**, and I would not put it in the same release as the rest.

## 4. Presentation

### 4.1 Plain text, configurably

The owner asked for configurable detail. Configuration is where this kind of
feature usually rots into a matrix nobody uses, so: **presets, plus one axis.**

| Preset | Contains | For |
|---|---|---|
| Summary | Name, faction, variant, totals, one line per model | Pasting into a chat |
| Roster | The above plus loadouts and costs | A list check before a game |
| Full | The above plus statlines, keywords, injuries, advancements, lore | An archive, or a forum post |

One toggle beside them — **plain / Discord markdown** — because that is a
rendering of the same content, not a fourth detail level. Both already exist in
`ExportModal` and only need the preset split.

Deliberately *not* offered: per-field checkboxes. If someone wants exactly one
unusual subset, the Full preset plus their own editing beats a settings panel
everyone else has to read past.

### 4.2 Print

Three modes, as asked:

| Mode | Shape | Notes |
|---|---|---|
| Plain | One column, no ornament, high contrast | Fits a mono printer and a club photocopier |
| Pretty | The Iron Ledger design in print: rules, sectioning, faction accent | The PrettyScribe-comparable one |
| Complex | Pretty, plus per-model cards with space for handwritten notes | The at-the-table sheet |

"Complex" is the one with a real requirement behind it: the owner asked for
"space for handwritten notes mid game", which means **fixed physical geometry** —
a box that is reliably big enough to write in at A4 and US Letter, not a box
that happens to look right at the author's zoom level.

That points at a constraint the current code does not meet: there is no print
stylesheet, only a single `print:hidden`. Whatever is built needs
`@page` sizing, explicit `mm`/`pt` units in the print path, and break control
(`break-inside: avoid` on model cards). This is the part where the existing
mobile-first token system does not carry over — `dvh` and touch targets are
meaningless on paper — so print gets its own small stylesheet rather than
reusing screen utilities.

### 4.3 PDF: the open decision

Two routes, and the difference is not typography, it is data flow.

- **Client-side** (browser print-to-PDF, or a bundled generator). Roster data
  never leaves the device. No new sub-processor. Typography is limited to what
  the browser will do, and output varies by browser.
- **Server-side** (headless render). Better and more consistent output. Roster
  data leaves the device to be rendered.

**Recommendation: client-side, via a real print stylesheet and the browser's own
print-to-PDF, for the first release.** Reasons in order of weight:

1. `LEGAL.md` documents a deliberately short sub-processor list and a
   verified "no third-party script" claim on production pages. Server-side
   rendering means roster content in a new place, and the privacy policy has to
   say so.
2. The Safe Browsing review (SB-1b) is still pending. Changing the data-flow
   description of the domain while its reputation is under review is avoidable.
3. It is the cheaper thing that answers the actual ask. "Pretty" mostly needs
   good print CSS, which is also what "plain" and "complex" need.

If the output proves not good enough, server-side is a later, separately
justified decision — not a default.

## 5. Placement, and the mobile question

The owner proposed a button on the right of the warband title card, "at least on
Desktop". The title card currently carries faction, variant, name, warband code
and motto.

At 375px that card is already the densest thing on the roster screen, and
`MOBILE.md` requires 44px targets. Proposal:

- **Desktop:** an `Export / Print` button on the right of the title card, as
  asked, opening a sheet.
- **Phone:** *not* a fourth control in that card. Put it in the existing roster
  overflow/actions area, so nothing in the title card shrinks below the touch
  floor.

The sheet itself is the shared `Sheet` component (OVL-1), so the interchange and
presentation groups can be two sections of one overlay without a new pattern.

Worth stating plainly: **print and PDF are desktop-shaped tasks.** Nobody prints
from a phone at a table. The phone path needs plain text and the TrenchLine file
to be excellent, and needs print to be reachable but not optimised.

## 6. Staging

| Package | Deliverable | Note |
|---|---|---|
| 1 | Versioned TrenchLine envelope + round-trip tests | Replaces the raw JSON dump; do first, it is the one already in users' hands |
| 2 | Plain-text presets + Discord toggle | Mostly refactoring existing string builders |
| 3 | Print stylesheet + Plain and Pretty | Where the design work is |
| 4 | Complex / note-space sheet | Needs real paper testing |
| 5 | NewRecruit export | Spike first; may not survive §3.2's questions |

1–4 are independent of 5 and of each other after 1.

## 7. Explicit non-goals

- No campaign or multi-warband export.
- No new import formats.
- No server-side rendering (§4.3).
- No per-field export configuration UI (§4.1).
- Nothing that reads or writes match state.

## 8. Codex review request

Please review as a proposal. Concrete disagreements and replacement designs
preferred over agreement.

1. Is the interchange/presentation split in §1 right, or is there a shared
   projection layer both should use that I am wrongly separating?
2. §3.1: is a versioned envelope with `rulesetId` + `baseCommit` sufficient
   provenance, or does a roster file need the full ruleset manifest to be
   meaningfully re-validatable later?
3. §3.2 is the weakest section. Can you establish whether NewRecruit accepts
   third-party-generated `.ros` XML, and what a minimal valid file must contain?
   Which of the 2 entry-less weapons are they, and does it matter?
4. §3.2 proposes refusing an export that cannot map every selection. Is refusal
   right, or should it emit with an explicit manifest of what was dropped?
5. §4.1: are three presets the right cut, and is "Discord markdown" a rendering
   or a fourth preset?
6. §4.2: what does "PrettyScribe-comparable" actually require that a good print
   stylesheet does not give? Is there a concrete artefact we should be matching?
7. §4.3: is there a client-side route to materially better typography than
   browser print, and what does it cost in bundle size on a phone?
8. §5: is the desktop/phone placement split defensible, or should the control be
   identical on both?
9. §6: is package 1 genuinely first, given the existing JSON dump is already in
   circulation? Is there a migration obligation to files already saved?
10. What is missing entirely?

**Owner decisions still open:** whether NewRecruit export is required for the
first drop or can follow; whether "pretty" should match a specific template the
owner supplies; and whether the existing unversioned JSON files must keep
importing forever or may be declared v0 and best-effort.
