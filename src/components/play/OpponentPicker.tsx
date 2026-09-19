'use client';

/**
 * Pick, or create, an opponent whose warband is not in this app.
 *
 * The case this exists for: you turn up, the other player has their list on
 * paper or in another app, and you still want the match scored and the result
 * recorded against somebody. A placeholder is the smallest thing that makes
 * that work — who they are and what they field, and nothing else.
 *
 * Saved ones come back, because the same three people turn up every week. They
 * live in their own list and never in `warbands`: a placeholder in the roster
 * picker would be a roster with no models that the builder and the validator
 * would both try to reason about.
 *
 * Mobile-first, per `docs/MOBILE.md`: every control clears the 44px floor and
 * the faction list is a wrapping row of chips rather than a `<select>`, which
 * on a phone opens a full-screen wheel for what is a six-way choice.
 */
import React, { useState } from 'react';
import { Plus, Trash2, UserPlus, X } from 'lucide-react';

import { useStore } from '@/store/useStore';
import { opponentLabel, type PlaceholderOpponent } from '@/types/opponent';

interface Props {
  /** Ids already in the match, so an opponent cannot be added to it twice. */
  usedIds: string[];
  onSelect: (id: string) => void;
}

export const OpponentPicker: React.FC<Props> = ({ usedIds, onSelect }) => {
  const { opponents, factions, saveOpponent, deleteOpponent } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [factionId, setFactionId] = useState(factions[0]?.id ?? '');
  const [fieldStrength, setFieldStrength] = useState('');

  const factionName = (id: string) => factions.find((f) => f.id === id)?.name;
  const available = opponents.filter((o) => !usedIds.includes(o.id));

  const reset = () => {
    setName('');
    setFactionId(factions[0]?.id ?? '');
    setFieldStrength('');
    setIsCreating(false);
  };

  const create = () => {
    if (!factionId) return;
    /*
      The id is minted by the store, not here: `opp-` is what tells a
      placeholder side from a warband when a match resolves its ids, and a
      caller inventing one in the wrong shape would produce a side that
      silently resolves to nothing.
    */
    const parsed = Number.parseInt(fieldStrength, 10);
    saveOpponent({
      name,
      factionId,
      // Blank stays blank. "They did not say" is not "they field none".
      ...(Number.isFinite(parsed) && parsed > 0 ? { fieldStrength: parsed } : {}),
    });
    reset();
  };

  const pick = (o: PlaceholderOpponent) => {
    onSelect(o.id);
    reset();
  };

  if (!isCreating) {
    return (
      <div className="space-y-2">
        {available.length > 0 && (
          <ul className="space-y-1.5">
            {available.map((o) => (
              <li key={o.id} className="flex items-stretch gap-1.5">
                <button
                  onClick={() => pick(o)}
                  className="flex min-h-[44px] flex-1 items-center justify-between gap-2 rounded border border-theme-border bg-theme-base px-3 text-left transition-colors hover:border-theme-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-theme-text">
                      {opponentLabel(o, factionName)}
                    </span>
                    <span className="block truncate text-[10px] uppercase text-theme-muted">
                      {factionName(o.factionId) ?? o.factionId}
                      {/* Only where it was given — never "0 models" for an
                          opponent who simply did not say. */}
                      {o.fieldStrength ? ` · ${o.fieldStrength} models` : ''}
                    </span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0 text-theme-primary" />
                </button>
                <button
                  onClick={() => deleteOpponent(o.id)}
                  aria-label={`Forget ${opponentLabel(o, factionName)}`}
                  className="flex min-h-[44px] w-11 shrink-0 items-center justify-center rounded border border-theme-border text-theme-muted transition-colors hover:border-status-error hover:text-status-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setIsCreating(true)}
          className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded border border-dashed border-theme-border px-3 text-xs font-bold uppercase text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
        >
          <UserPlus className="h-4 w-4" />
          <span>Opponent without a warband</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded border border-theme-primary/50 bg-theme-base p-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-theme-primary">New opponent</span>
        <button
          onClick={reset}
          aria-label="Cancel"
          className="flex h-11 w-11 items-center justify-center text-theme-muted hover:text-theme-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1">
        <label htmlFor="opp-name" className="block text-[10px] uppercase text-theme-muted">
          Name — the player, or their warband
        </label>
        <input
          id="opp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional — falls back to the faction"
          /* 16px minimum, or iOS zooms the page on focus — docs/MOBILE.md. */
          className="min-h-[44px] w-full rounded border border-theme-border bg-theme-surface px-3 text-base text-theme-text placeholder-theme-muted focus:border-theme-primary focus:outline-none sm:text-xs"
        />
      </div>

      <div className="space-y-1">
        <span className="block text-[10px] uppercase text-theme-muted">Faction</span>
        {/*
          Chips, not a `<select>`. A native select on a phone opens a
          full-screen wheel, which is a lot of ceremony for a six-way choice
          you can see all of at once.
        */}
        <div className="flex flex-wrap gap-1.5">
          {factions.map((f) => (
            <button
              key={f.id}
              onClick={() => setFactionId(f.id)}
              aria-pressed={factionId === f.id}
              className={`min-h-[44px] rounded border px-3 text-xs font-bold transition-colors ${
                factionId === f.id
                  ? 'border-theme-primary bg-theme-primary/15 text-theme-primary'
                  : 'border-theme-border text-theme-muted hover:text-theme-text'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="opp-strength" className="block text-[10px] uppercase text-theme-muted">
          Models they field — optional
        </label>
        <input
          id="opp-strength"
          type="number"
          inputMode="numeric"
          min={1}
          value={fieldStrength}
          onChange={(e) => setFieldStrength(e.target.value)}
          placeholder="Leave blank if they did not say"
          className="min-h-[44px] w-full rounded border border-theme-border bg-theme-surface px-3 text-base text-theme-text placeholder-theme-muted focus:border-theme-primary focus:outline-none sm:text-xs"
        />
      </div>

      <button
        onClick={create}
        disabled={!factionId}
        className="min-h-[44px] w-full rounded border border-theme-primary/50 bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-primary transition-colors hover:bg-theme-border disabled:opacity-40"
      >
        Save opponent
      </button>
    </div>
  );
};
