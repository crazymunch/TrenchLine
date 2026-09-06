'use client';

/**
 * The roster, on paper.
 *
 * `docs/EXPORT-ARCHITECTURE-BRIEF.md` §4.2 with Codex's `EXPORT-CODEX-REVIEW.md`
 * E6. Until now `window.print()` printed the screen: theme colours, an overlay,
 * a navigation bar, and page breaks wherever the browser landed. There was no
 * print stylesheet at all.
 *
 * Three modes, as asked:
 *
 *   Plain    one column, no ornament, the facts. A club photocopier.
 *   Pretty   sectioned, with statlines, Keywords, abilities and campaign
 *            history, and a ruled box per model for notes taken mid-game.
 *   Cards    one model per card at a stated physical size, four to a page,
 *            for the table itself.
 *
 * The content is the shared presentation projection, so this and the text
 * export cannot disagree on a number (E1) — "a beautiful sheet with the wrong
 * Glory total is a correctness bug".
 *
 * **Pagination is a table header, not `break-inside: avoid`.** Each model is a
 * `<table>` whose `<thead>` carries its name, because a browser repeats a table
 * header on every page the table continues onto. A model with long rules text
 * can exceed a page on its own, and `avoid` then either does nothing or emits a
 * blank one; this continues, with the model's name repeated at the top, no
 * clipping and no shrinking font. The rules for it are in `globals.css` under
 * PRINT, in millimetres and points.
 *
 * **A card's size comes from the paper, not the layout.** 91x124mm is two
 * columns and two rows of the area BOTH A4 and US Letter can print, so the
 * sheet is not wrong on half the printers in the world. It is a `min-height`:
 * a card with more in it grows rather than clipping, and the appendix keeps
 * that rare by printing each ability's text once for the whole warband instead
 * of once per model.
 *
 * Not verified on paper. Everything here is stated in physical units for that
 * reason, but a printer has not been run — see `docs/EXPORT-ARCHITECTURE-BRIEF.md`.
 */
import React from 'react';
import { formatUnitCost } from '@/rules/savedGlory';
import type { PresentedModel, PresentedRoster } from '@/services/rosterPresentation';

export type PrintMode = 'plain' | 'pretty' | 'cards';

const Row: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
  <tr>
    <td>
      {label && <span className="print-label">{label} </span>}
      {children}
    </td>
  </tr>
);

const Model: React.FC<{ model: PresentedModel; mode: PrintMode }> = ({ model, mode }) => (
  <table className="print-model">
    {/*
      The name in a `thead` is what repeats on a continuation page. It is not
      styling: it is the only mechanism CSS gives for "this heading again at
      the top of the next page".
    */}
    <thead>
      <tr>
        <th>
          {model.name}
          {model.profileName && model.profileName !== model.name
            ? ` — ${model.profileName}` : ''}
          {model.category ? ` (${model.category})` : ''}
          {' · '}
          {formatUnitCost(model.ducats, model.glory)}
          {model.dead ? ' · dead' : ''}
          {model.grantedFree ? ` · granted by ${model.grantedFree}` : ''}
        </th>
      </tr>
    </thead>
    <tbody>
      {mode === 'pretty' && model.stats && (
        <Row>
          <span className="print-stats">
            MOV {model.stats.movement} · RNG {model.stats.ranged}
            {' · '}MELEE {model.stats.melee} · SAVE {model.stats.armour}
          </span>
        </Row>
      )}

      {model.gear.length > 0 && <Row label="Kit">{model.gear.join(', ')}</Row>}

      {mode === 'pretty' && model.keywords.length > 0 && (
        <Row label="Keywords">{model.keywords.join(', ')}</Row>
      )}

      {mode === 'pretty' && model.abilities.map((a) => (
        <tr key={a.name}>
          <td>
            <span className="print-label">{a.name} </span>
            {a.description}
          </td>
        </tr>
      ))}

      {mode === 'pretty' && model.xp > 0 && <Row label="XP">{model.xp}</Row>}
      {mode === 'pretty' && model.advancements.length > 0 && (
        <Row label="Advancements">{model.advancements.join('; ')}</Row>
      )}
      {mode === 'pretty' && model.skills.length > 0 && (
        <Row label="Skills">{model.skills.join('; ')}</Row>
      )}
      {model.injuries.length > 0 && <Row label="Injuries">{model.injuries.join('; ')}</Row>}
      {model.scars.length > 0 && <Row label="Battle Scars">{model.scars.join('; ')}</Row>}

      {mode === 'pretty' && model.lore && <Row>{model.lore}</Row>}
      {mode === 'pretty' && model.quote && <Row>“{model.quote}”</Row>}
      {mode === 'pretty' && model.notes && <Row label="Notes">{model.notes}</Row>}

      {/*
        Room to write, at a stated physical size rather than whatever the
        layout leaves over. The owner's ask was "space for handwritten notes
        mid game", which is a measurement.
      */}
      {mode === 'pretty' && !model.dead && (
        <tr>
          <td>
            <div className="print-notes" aria-hidden="true" />
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

/**
 * One model, on a card you can hold.
 *
 * Everything a player needs to reach for mid-game, and nothing that would push
 * the writing area off it: identity, cost, statline, kit, Keywords, and what
 * the campaign has done to this model. Abilities are NAMED here and their text
 * is in the appendix — see `abilityIndex` below.
 *
 * A dead model still gets a card, because a roster printed for a game is also
 * a record, but it gets no notes box: there is nothing left to note.
 */
const Card: React.FC<{ model: PresentedModel }> = ({ model }) => (
  <div className="print-card">
    <h3>
      {model.name}
      {model.dead ? ' · dead' : ''}
    </h3>
    <p>
      {model.profileName}
      {model.category ? ` (${model.category})` : ''}
      {' · '}
      {formatUnitCost(model.ducats, model.glory)}
      {model.grantedFree ? ` · granted by ${model.grantedFree}` : ''}
    </p>

    {model.stats && (
      <p className="print-stats">
        MOV {model.stats.movement} · RNG {model.stats.ranged}
        {' · '}MELEE {model.stats.melee} · SAVE {model.stats.armour}
      </p>
    )}

    {model.gear.length > 0 && (
      <p><span className="print-label">Kit </span>{model.gear.join(', ')}</p>
    )}
    {model.keywords.length > 0 && (
      <p><span className="print-label">Keywords </span>{model.keywords.join(', ')}</p>
    )}
    {model.abilities.length > 0 && (
      <p>
        <span className="print-label">Abilities </span>
        {model.abilities.map((a) => a.name).join(', ')}
      </p>
    )}
    {model.injuries.length > 0 && (
      <p><span className="print-label">Injuries </span>{model.injuries.join('; ')}</p>
    )}
    {model.scars.length > 0 && (
      <p><span className="print-label">Scars </span>{model.scars.join('; ')}</p>
    )}

    {!model.dead && <div className="print-notes" aria-hidden="true" />}
  </div>
);

/**
 * Every ability on the roster, once.
 *
 * The overflow policy, and the reason a card can have a stated size at all. A
 * Black Grail warband with twelve Grail Thralls carries Overwhelming Horde
 * twelve times; printing it twelve times would cost three pages to say one
 * thing. Keyed by name — two abilities that share a name share their text, and
 * where they somehow do not, the first is printed and that is a data bug worth
 * seeing rather than papering over.
 */
export function abilityIndex(roster: PresentedRoster): { name: string; description: string }[] {
  const seen = new Map<string, string>();
  for (const m of roster.models) {
    for (const a of m.abilities) if (!seen.has(a.name)) seen.set(a.name, a.description);
  }
  return [...seen].map(([name, description]) => ({ name, description }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const RosterPrintSheet: React.FC<{
  roster: PresentedRoster;
  mode: PrintMode;
}> = ({ roster, mode }) => {
  const t = roster.totals;
  return (
    <div className={`print-sheet print-${mode}`}>
      <h1 className="print-title">{roster.name}</h1>
      <p className="print-sub">
        {roster.faction}
        {roster.variant ? ` · ${roster.variant}` : ''}
        {roster.ruleset ? ` · ${roster.ruleset}` : ''}
      </p>
      {/*
        Two numbers that are not the same number, on two lines. The screen
        header and the text export make the same distinction, from the same
        projection.
      */}
      <p className="print-sub">
        List {t.listDucats} / {t.ducatLimit} Ducats
        {t.listGlory ? ` · ${t.listGlory} Glory` : ''}
        {' · '}
        Strongbox {t.strongbox} Ducats · {t.gloryHeld} Glory held
      </p>
      <p className="print-sub">
        {t.models} model{t.models === 1 ? '' : 's'}
        {t.dead ? ` · ${t.dead} lost to the campaign` : ''}
      </p>

      <h2 className="print-section">Warband</h2>
      {mode === 'cards'
        ? roster.models.map((m) => <Card key={m.id} model={m} />)
        : roster.models.map((m) => <Model key={m.id} model={m} mode={mode} />)}

      {roster.stash.length > 0 && (
        <>
          <h2 className="print-section">Arsenal</h2>
          <table className="print-model">
            <tbody>
              {roster.stash.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}{s.quantity > 1 ? ` ×${s.quantity}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/*
        The rules the cards refer to, printed once each. Starts a new page: the
        cards are what goes on the table and the appendix is what sits beside
        it, and a page that is half card and half prose is neither.
      */}
      {mode === 'cards' && abilityIndex(roster).length > 0 && (
        <div className="print-appendix">
          <h2 className="print-section">Rules named on the cards</h2>
          <dl>
            {abilityIndex(roster).map((a) => (
              <React.Fragment key={a.name}>
                <dt>{a.name}</dt>
                <dd>{a.description}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}

      {mode === 'pretty' && roster.lore && (
        <>
          <h2 className="print-section">Lore</h2>
          <p>{roster.lore}</p>
        </>
      )}
      {mode === 'pretty' && roster.notes && (
        <>
          <h2 className="print-section">Notes</h2>
          <p>{roster.notes}</p>
        </>
      )}
    </div>
  );
};
