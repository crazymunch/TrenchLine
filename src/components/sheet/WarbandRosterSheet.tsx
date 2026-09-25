'use client';

/**
 * The official Warband Roster Sheet, in the app (FD-12 item 3).
 *
 * The owner's words for what NewRecruit never had: an evolving record of every
 * battle a warband has fought, and the paper tracker represented in full. The
 * three pages of `data-sources/rulebook/warband-roster-sheet.pdf`, filled in
 * from the roster and the campaign.
 *
 * **Two exports, and the split is a disclosure fix.** `RosterSheetView` renders
 * a `RosterSheetModel` and touches nothing else; `WarbandRosterSheet` projects a
 * `Warband` into one and renders it. SH-1's share page projects on the SERVER
 * and passes only the model, because a `'use client'` component's props are
 * serialised into the HTML — handing it a whole warband published the owner's
 * private notes, the ledger's admin entries and every model's lore to anybody
 * with the link, under a page that said otherwise (review round 1, finding A).
 * The builder's own route, where the reader IS the owner, uses the wrapper.
 *
 * **Every value comes from `rosterSheet`.** No arithmetic here, and no game
 * data: the twelve Threshold rows are the dataset's, the Experience circles are
 * the dataset's, and each Skill's provenance is the record's. This file decides
 * layout and nothing else.
 *
 * **Mobile-first.** On a phone it is a scrolling review page with no print
 * chrome — the sheet is read at the table, one-handed. The campaign table is
 * the one thing that cannot reflow (twelve rows of six columns), so below `sm:`
 * it becomes a stack of labelled rows rather than a table squeezed to 375px or
 * a sideways scroller that hides half the columns.
 *
 * **Print.** `.roster-sheet` in `globals.css` is this sheet's print stylesheet:
 * page 1 landscape, then two unit cards a page, in the sheet's order. The
 * "Print / PDF" button calls `window.print()` and the browser makes the PDF.
 */
import React from 'react';
import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';
import { rosterSheet, type RosterSheetModel, type SheetCard } from '@/rules/rosterSheet';
import { provenanceLabel } from '@/rules/provenance';
import { ExperienceTrackView } from '@/components/ExperienceTrack';

export interface WarbandRosterSheetProps {
  warband: Warband;
  dataset: Dataset | null | undefined;
  campaign?: { id?: string; name?: string; currentGame?: number; currentTurn?: number } | null;
  /** False on the public share page: a model's private notes are not shared. */
  includePrivate?: boolean;
}

const Blank: React.FC = () => <span className="text-theme-muted">—</span>;

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <span className="eyebrow block">{label}</span>
    <span className="block font-mono text-sm text-theme-text break-words">
      {value || <Blank />}
    </span>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="font-gothic text-lg text-theme-text border-b border-theme-border pb-1">
      {title}
    </h3>
    {children}
  </section>
);

/** The sheet, from a model somebody else projected. Nothing else is read. */
export const RosterSheetView: React.FC<{ sheet: RosterSheetModel }> = ({ sheet }) => {
  const { header, strongbox, campaign: table } = sheet;

  return (
    <div className="roster-sheet space-y-6">

      {/* ------------------------------------------------------------ page 1 */}
      <div className="roster-sheet-page space-y-6">

        <header className="bg-theme-surface border border-theme-border p-4 sm:p-6 space-y-4 bevel-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Warband Name" value={header.warbandName} />
            <Field label="Player" value={header.player} />
            <Field label="Warband" value={header.warband} />
            {/*
              PATRON is a blank on the printed sheet and a REQUIRED field for a
              campaign Warband: "Once they have recruited their Warband, they
              must pick a Patron for it" (rulebook L4753–4755). An empty one is
              named as a gap rather than left looking optional — FD-15.
            */}
            <div className="min-w-0">
              <span className="eyebrow block">Patron</span>
              {header.patron ? (
                <span className="block font-mono text-sm text-theme-text break-words">
                  {header.patron}
                </span>
              ) : (
                <span className="block font-mono text-sm text-status-warning">
                  Not recorded — the book requires one
                </span>
              )}
            </div>
            <Field label="Campaign Battle" value={header.campaignBattle} />
            <Field label="Faction" value={header.faction} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* STRONGBOX — extract L5 to L7 */}
          <div className="bg-theme-surface border border-theme-border p-4 space-y-3 bevel-container">
            <h3 className="font-gothic text-lg text-theme-text">Strongbox</h3>
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="text-theme-muted">
                  <th className="text-left font-normal"><span className="eyebrow">&nbsp;</span></th>
                  <th className="text-right font-normal"><span className="eyebrow">Total</span></th>
                  <th className="text-right font-normal"><span className="eyebrow">Unspent</span></th>
                </tr>
              </thead>
              <tbody>
                {/*
                  TOTAL is blank without a ledger, never the balance (review
                  round 1, finding P). A Warband from before FD-05d has a
                  balance and no history, and printing that number under a
                  heading reading TOTAL states something nobody computed — the
                  same claim the "no ledger" note below then contradicts.
                */}
                <tr>
                  <td className="text-theme-muted">Ducats</td>
                  <td className="text-right text-theme-text">
                    {strongbox.fromLedger ? strongbox.ducatsTotal : <Blank />}
                  </td>
                  <td className="text-right text-theme-text font-bold">{strongbox.ducatsUnspent}</td>
                </tr>
                <tr>
                  <td className="text-theme-muted">Glory</td>
                  <td className="text-right text-theme-text">
                    {strongbox.fromLedger ? strongbox.gloryTotal : <Blank />}
                  </td>
                  <td className="text-right text-theme-text font-bold">{strongbox.gloryUnspent}</td>
                </tr>
              </tbody>
            </table>
            {!strongbox.fromLedger && (
              <p className="font-mono text-xs sm:text-[10px] text-status-warning leading-relaxed">
                No ledger on this roster, so there is no record of everything
                ever credited and TOTAL is left blank. UNSPENT is the balance
                the Warband carries.
              </p>
            )}
          </div>

          {/* HERALDRY — extract L9. The paper box is for a drawn device. */}
          <div className="bg-theme-surface border border-theme-border p-4 space-y-2 bevel-container">
            <h3 className="font-gothic text-lg text-theme-text">Heraldry</h3>
            {sheet.heraldry
              ? <p className="flavour text-sm">&ldquo;{sheet.heraldry}&rdquo;</p>
              : <p className="font-mono text-xs text-theme-muted">
                  A box for a drawn device on paper. Nothing recorded here.
                </p>}
          </div>

          {/* ARSENAL — extract L10 */}
          <div className="bg-theme-surface border border-theme-border p-4 space-y-2 bevel-container">
            <h3 className="font-gothic text-lg text-theme-text">Arsenal</h3>
            {sheet.arsenal.length === 0 ? (
              <p className="font-mono text-xs text-theme-muted">Empty.</p>
            ) : (
              <ul className="font-mono text-xs sm:text-[11px] space-y-1">
                {sheet.arsenal.map((item, i) => (
                  <li key={`${item.name}-${i}`} className="flex justify-between gap-2">
                    <span className="text-theme-text break-words">
                      {item.name}
                      {item.quantity > 1 && ` ×${item.quantity}`}
                    </span>
                    <span className="text-theme-muted flex-shrink-0">
                      {item.ducats > 0 && `${item.ducats}👑`}
                      {item.ducats > 0 && item.glory > 0 && ' '}
                      {item.glory > 0 && `${item.glory}☼`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* WARBAND BIO & EXPLORATION NOTES — extract L8 */}
        <div className="bg-theme-surface border border-theme-border p-4 sm:p-6 space-y-4 bevel-container">
          <Section title="Warband Bio & Exploration Notes">
            {sheet.bio
              ? <p className="flavour text-sm whitespace-pre-line">{sheet.bio}</p>
              : <p className="font-mono text-xs text-theme-muted">No bio recorded.</p>}
          </Section>

          {/*
            The review the owner asked for beside the sheet: everything at this
            Warband's disposal and how each of it was earned. `holdingsOf`
            decides what is in it; an entry with no record reads as an import,
            never as a roll that did not happen.
          */}
          <div className="space-y-2">
            <h4 className="eyebrow accent">What this Warband holds, and how</h4>
            {sheet.holdings.length === 0 ? (
              <p className="font-mono text-xs text-theme-muted">
                Nothing recorded: no rewards, Skills, injuries or scars.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {sheet.holdings.map((h, i) => (
                  <li key={`${h.kind}-${h.name}-${i}`}
                    className="font-mono text-xs sm:text-[11px] border-l-2 border-theme-border pl-2">
                    <span className="text-theme-text font-bold break-words">{h.name}</span>
                    {h.model && <span className="text-theme-muted"> · {h.model}</span>}
                    <span className="block text-theme-muted">
                      {/*
                        The group the SOURCE filed it under, where it stated one:
                        `Exploration Rewards`, `Patron Selection`. An import's
                        `Campaign Rules > Enabled` subtree also carries entries
                        with no group at all — NewRecruit's own Glory counter is
                        one — and those are labelled as stated rather than
                        presented as rewards the Warband earned.
                      */}
                      {h.group ?? (h.kind === 'reward' ? 'stated by the roster, ungrouped' : h.kind)}
                      {' · '}{provenanceLabel({ source: h.source })}
                    </span>
                    {h.text && (
                      <span className="block text-theme-muted leading-relaxed break-words">
                        {h.text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* The campaign table — extract L11 to L24 */}
        <div className="bg-theme-surface border border-theme-border p-4 sm:p-6 space-y-3 bevel-container">
          <Section title="Campaign">
            {/*
              Two renderings of the same rows, and the phone one is not a
              degraded table: six columns at 375px is either 40px of scenario
              name or a sideways scroller that hides the result. A stack per
              game is the layout that reads one-handed.
            */}
            <div className="sm:hidden space-y-2">
              {table.rows.map((r) => (
                <div key={r.game}
                  className="border border-theme-border p-2 font-mono text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="eyebrow accent">Game {r.game}</span>
                    <span className="text-theme-muted">
                      {r.threshold ?? '—'}👑 · {r.fieldStrength ?? '—'} models
                      {r.extrapolated && ' *'}
                    </span>
                  </div>
                  <div className="text-theme-text break-words">
                    {r.scenarioName || <Blank />}
                  </div>
                  <div className="flex justify-between text-theme-muted">
                    <span>{r.result ?? '—'}</span>
                    <span>{r.vps === null ? '—' : `${r.vps} VP`}</span>
                  </div>
                </div>
              ))}
            </div>

            <table className="hidden sm:table w-full font-mono text-xs sm:text-[11px]">
              <thead>
                <tr className="text-left">
                  <th className="pb-1"><span className="eyebrow">Game</span></th>
                  <th className="pb-1"><span className="eyebrow">Threshold</span></th>
                  <th className="pb-1"><span className="eyebrow">Field Strength</span></th>
                  <th className="pb-1"><span className="eyebrow">Scenario</span></th>
                  <th className="pb-1"><span className="eyebrow">Result</span></th>
                  <th className="pb-1 text-right"><span className="eyebrow">Campaign VPs</span></th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.game} className="border-t border-theme-border">
                    <td className="py-1 text-theme-text">{r.game}</td>
                    <td className="py-1 text-theme-muted">
                      {r.threshold ?? '—'}{r.extrapolated && ' *'}
                    </td>
                    <td className="py-1 text-theme-muted">{r.fieldStrength ?? '—'}</td>
                    <td className="py-1 text-theme-text break-words">
                      {r.scenarioName || <Blank />}
                    </td>
                    <td className="py-1 text-theme-text">{r.result ?? <Blank />}</td>
                    <td className="py-1 text-right text-theme-text">
                      {r.vps === null ? <Blank /> : r.vps}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-theme-primary">
                  <td colSpan={5} className="pt-1.5 eyebrow accent">
                    Total Campaign Victory Points
                  </td>
                  <td className="pt-1.5 text-right font-bold text-theme-text">
                    {table.total === null ? '—' : table.total}
                  </td>
                </tr>
              </tfoot>
            </table>

            <p className="font-mono text-xs sm:text-[10px] text-theme-muted leading-relaxed">
              {/*
                No game data typed into this string (rule 1, review round 1
                finding O). It used to name "16 Treasure of the Holies" and "23
                Patron's Visit" and quote what they score — two Exploration rows
                retyped into a paragraph, which is exactly how a value goes
                stale when the dataset changes under it. `rosterSheet` finds
                them by reading which Locations' own text names Campaign Victory
                Points, and the names below are theirs.
              */}
              {table.total === null
                ? 'This ruleset publishes no Campaign Victory Point scale, so no total is shown.'
                : table.outsideTheScale.length > 0
                  ? `The per-game total. These Exploration results move Campaign Victory `
                    + `Points outside the scale — ${table.outsideTheScale.join(', ')} — and none `
                    + `is derivable from a win/loss/draw record, so add those by hand.`
                  : 'The per-game total. Anything that moves Campaign Victory Points '
                    + 'outside the published scale is added by hand.'}
              {table.rows.some((r) => r.extrapolated)
                && ' * past the published table: the last row holds rather than being extrapolated.'}
            </p>
          </Section>
        </div>
      </div>

      {/* --------------------------------------------------- pages 2 and 3 */}
      <div className="space-y-4">
        {sheet.cards.length === 0 ? (
          <p className="font-mono text-xs text-theme-muted">No models on this roster.</p>
        ) : (
          sheet.cards.map((card) => (
            <UnitSheetCard key={card.model?.id ?? card.model?.name} card={card} />
          ))
        )}
      </div>

      {sheet.fallen.length > 0 && (
        <div className="bg-theme-surface border border-theme-border p-4 space-y-2 bevel-container">
          <h3 className="font-gothic text-lg text-theme-text">The Fallen</h3>
          <ul className="font-mono text-xs space-y-1">
            {sheet.fallen.map((f, i) => (
              <li key={`${f.name}-${i}`} className="text-theme-muted">
                <span className="text-theme-text">{f.name}</span>
                {f.profileName && f.profileName !== f.name && ` — ${f.profileName}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/**
 * One unit card, pages 2 and 3 of the sheet.
 *
 * The printed sheet has two large cards and four small ones; the app has as
 * many models as the roster has, so every card is the large one. The print
 * stylesheet puts two on a page, which is the sheet's own density.
 */
const UnitSheetCard: React.FC<{ card: SheetCard }> = ({ card }) => {
  const m = card.model;
  if (!m) return null;

  return (
    <div className="roster-sheet-card bg-theme-surface border border-theme-border p-4 space-y-3 bevel-container">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h3 className="font-gothic text-xl text-theme-text break-words">{m.name}</h3>
          <span className="eyebrow">{m.profileName}{m.category && ` · ${m.category}`}</span>
        </div>
        <span className="font-mono text-sm text-theme-primary flex-shrink-0">
          {m.ducats}👑{m.glory > 0 && ` ${m.glory}☼`}
        </span>
      </div>

      {/* The five characteristics, in the sheet's own order (extract L28). */}
      {m.stats ? (
        <div className="grid grid-cols-5 gap-1 text-center">
          {([
            ['Move', m.stats.movement],
            ['Ranged', m.stats.ranged],
            ['Melee', m.stats.melee],
            ['Armour', m.stats.armour],
            ['Base', m.stats.base],
          ] as const).map(([label, value]) => (
            <div key={label} className="border border-theme-border py-1 px-0.5 min-w-0">
              <span className="eyebrow block">{label}</span>
              {/*
                Broken at the slash, not truncated and not mid-word.

                Five cells across 375px is about 64px each, and Movement is
                printed as `6"/Infantry`, which fits none of them. Truncating
                hid the movement TYPE (`6"/Inf…`) and plain wrapping split the
                word itself (`Infant` / `ry`). The slash is already the seam:
                `Statline` carries `movementInches` and `movementType`
                separately precisely because they are two facts and a card has
                to show them as two.
              */}
              <span className="block font-mono text-xs sm:text-sm text-theme-text leading-tight">
                {value
                  ? value.split('/').map((part, i, all) => (
                    <span key={part + i} className="block">
                      {part}{i < all.length - 1 ? '/' : ''}
                    </span>
                  ))
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="font-mono text-xs text-status-warning">
          No statline on this model&rsquo;s snapshot.
        </p>
      )}

      {/* Already computed by `rosterSheet`, so the card needs neither the
          dataset nor the model it came from. */}
      <ExperienceTrackView track={card.track} />

      <div className="space-y-1">
        <span className="eyebrow accent block">Battlekit</span>
        {card.battlekit.length === 0
          ? <span className="font-mono text-xs text-theme-muted">None.</span>
          : <p className="font-mono text-xs sm:text-[11px] text-theme-text break-words">
              {card.battlekit.join(' · ')}
            </p>}
      </div>

      <div className="space-y-1">
        <span className="eyebrow accent block">Abilities, Skills &amp; Injuries</span>
        {card.abilitiesSkillsInjuries.length === 0
          ? <span className="font-mono text-xs text-theme-muted">None.</span>
          : <ul className="space-y-1">
              {card.abilitiesSkillsInjuries.map((a, i) => (
                <li key={`${a.name}-${i}`} className="font-mono text-xs sm:text-[11px]">
                  <span className="text-theme-text font-bold break-words">{a.name}</span>
                  {a.provenance && (
                    <span className="text-theme-muted"> — {a.provenance}</span>
                  )}
                  {a.detail && (
                    <span className="block text-theme-muted leading-relaxed break-words">
                      {a.detail}
                    </span>
                  )}
                </li>
              ))}
            </ul>}
      </div>

      <div className="space-y-1">
        <span className="eyebrow accent block">Keywords</span>
        <p className="font-mono text-xs sm:text-[11px] text-theme-text break-words">
          {card.keywords.length ? card.keywords.join(', ') : '—'}
        </p>
      </div>
    </div>
  );
};

/**
 * The same sheet, projected from a `Warband` here in the browser.
 *
 * For the builder's own route, where the reader is the owner and the warband is
 * already in their store. The share page must NOT use this: it would put the
 * whole roster into the page's serialised props.
 */
export const WarbandRosterSheet: React.FC<WarbandRosterSheetProps> = ({
  warband, dataset, campaign, includePrivate = false,
}) => (
  <RosterSheetView sheet={rosterSheet(warband, { dataset, campaign, includePrivate })} />
);
