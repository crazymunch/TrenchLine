'use client';

/**
 * The roster, on paper.
 *
 * `docs/EXPORT-ARCHITECTURE-BRIEF.md` §4.2 with Codex's `EXPORT-CODEX-REVIEW.md`
 * E6. Until now `window.print()` printed the screen: theme colours, an overlay,
 * a navigation bar, and page breaks wherever the browser landed. There was no
 * print stylesheet at all.
 *
 * Two modes, as asked:
 *
 *   Plain    one column, no ornament, the facts. A club photocopier.
 *   Pretty   sectioned, with statlines, Keywords, abilities and campaign
 *            history, and a ruled box per model for notes taken mid-game.
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
 * Not verified on paper. Everything here is stated in physical units for that
 * reason, but a printer has not been run — see `docs/EXPORT-ARCHITECTURE-BRIEF.md`.
 */
import React from 'react';
import { formatUnitCost } from '@/rules/savedGlory';
import type { PresentedModel, PresentedRoster } from '@/services/rosterPresentation';

export type PrintMode = 'plain' | 'pretty';

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

export const RosterPrintSheet: React.FC<{
  roster: PresentedRoster;
  mode: PrintMode;
}> = ({ roster, mode }) => {
  const t = roster.totals;
  return (
    <div className={`print-sheet ${mode === 'plain' ? 'print-plain' : 'print-pretty'}`}>
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
      {roster.models.map((m) => <Model key={m.id} model={m} mode={mode} />)}

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
