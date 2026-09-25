'use client';

/**
 * A reward the Warband held before the app did (FD-12 item 2).
 *
 * > The owner's answer on pre-app history was manual entry marked as such, so
 * > the unit card and the sheet gain "Add a skill / injury / reward recorded
 * > before the app", which writes `manual-pre-app` and the note.
 *
 * The Skill and injury halves live on the unit card, in the advancement sheet
 * where hand entry already happened. This is the reward half, on the Roster
 * Sheet's own route — the sheet is where the review of what a Warband holds is
 * read, so it is where a missing line is noticed.
 *
 * Two fields and no list to pick from, deliberately. An Exploration reward the
 * player already holds could be any of the thirty-odd Locations, a Patron's
 * entitlement, or something their group agreed — and offering a dropdown of the
 * dataset's Locations would make every OTHER case unrecordable while implying
 * the app had checked the one the player picked. So the player writes what
 * their sheet says, the text is theirs, and the record says it came from them.
 *
 * The name also joins `campaignRules`, because that list is what the rules
 * modules read to decide whether the Warband HAS a grant (`golemGrant` matches
 * the Book of Golems by the sentence its Exploration row prints). A reward
 * recorded by hand is evidence of the same kind as one the importer read.
 */
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Warband } from '@/types/warband';
import { useStore } from '@/store/useStore';
import { campaignGameOf } from '@/rules/campaign';
import { provenanceLabel } from '@/rules/provenance';
import { Sheet } from '../ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  warband: Warband;
}

export const PreAppRewardModal: React.FC<Props> = ({ open, onClose, warband }) => {
  const addWarbandReward = useStore((s) => s.addWarbandReward);
  const removeWarbandReward = useStore((s) => s.removeWarbandReward);
  const campaign = useStore((s) => s.campaign);

  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  /* The same two claims the advancement sheet distinguishes (review round 1,
     finding E): recorded by hand in the game the campaign is on, or recorded as
     predating the app holding this Warband. */
  const [beforeTheApp, setBeforeTheApp] = useState(false);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addWarbandReward(warband.id, {
      name: trimmed,
      ...(text.trim() ? { text: text.trim() } : {}),
      source: beforeTheApp
        ? { kind: 'manual-pre-app', ...(note.trim() ? { note: note.trim() } : {}) }
        : {
          kind: 'manual',
          game: campaignGameOf(warband, campaign),
          ...(note.trim() ? { note: note.trim() } : {}),
        },
    });
    setName('');
    setText('');
    setNote('');
  };

  const held = warband.rewards ?? [];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Rewards this Warband holds"
      subtitle={warband.name}
      size="lg"
    >
      <div className="p-4 space-y-4">

        <p className="font-mono text-xs text-theme-muted leading-relaxed">
          Exploration rewards, a Patron&rsquo;s entitlement, anything standing
          your Warband has earned. An import reads these out of the roster, and
          the Exploration Step records what it finds; anything else goes in
          here, marked as recorded by hand.
        </p>

        <div className="p-3 bg-theme-base border border-theme-border space-y-2">
          {/* 16px inputs: anything smaller makes iOS zoom the dialog. */}
          <div className="space-y-1">
            <label htmlFor="reward-name" className="eyebrow block">
              What it is
            </label>
            <input
              id="reward-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              /* No game data in a UI string (rule 1, review round 2 item 8).
                 The old placeholder was a Location's name typed into a
                 component — the sort of literal that stops matching the
                 catalogues the moment they are refetched, and reads as though
                 the app were suggesting a specific reward. */
              placeholder="the name as your sheet has it"
              className="w-full min-h-[44px] bg-theme-surface border border-theme-border px-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reward-text" className="eyebrow block">
              What it says, in the book&rsquo;s words
            </label>
            <textarea
              id="reward-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Copy the rule as printed, so the sheet can show it."
              className="w-full bg-theme-surface border border-theme-border px-2 py-1.5 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
            />
          </div>

          {/* The label is the hit area and clears the 44px floor. */}
          <label className="flex min-h-[44px] items-center gap-2 font-mono text-xs text-theme-text">
            <input
              type="checkbox"
              checked={beforeTheApp}
              onChange={(e) => setBeforeTheApp(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-current"
            />
            <span>This was held before the app held this Warband</span>
          </label>

          <div className="space-y-1">
            <label htmlFor="reward-note" className="eyebrow block">
              Your note — when and how you got it
            </label>
            <input
              id="reward-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. game 2 exploration, before we used the app"
              className="w-full min-h-[44px] bg-theme-surface border border-theme-border px-2 text-base sm:text-xs text-theme-text focus:outline-none focus:border-theme-primary"
            />
          </div>

          <button
            onClick={add}
            disabled={!name.trim()}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-widest disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Record it</span>
          </button>
        </div>

        <div className="space-y-2">
          <span className="eyebrow accent block">Held ({held.length})</span>
          {held.length === 0 ? (
            <p className="font-mono text-xs text-theme-muted">Nothing recorded.</p>
          ) : (
            held.map((r, i) => (
              <div key={`${r.name}-${i}`}
                className="p-3 bg-theme-base border border-theme-border flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <strong className="block font-mono text-xs text-theme-primary break-words">
                    {r.name}
                  </strong>
                  <span className="block font-mono text-xs sm:text-[10px] text-theme-muted">
                    {provenanceLabel(r, { audience: 'owner' })}
                    {r.group && ` · ${r.group}`}
                  </span>
                  {r.text && (
                    <p className="font-mono text-xs sm:text-[11px] text-theme-muted leading-relaxed break-words">
                      {r.text}
                    </p>
                  )}
                </div>
                {/* 44px (docs/MOBILE.md §3): `p-1` round a 16px icon is 24. */}
                <button
                  onClick={() => removeWarbandReward(warband.id, r.name)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-theme-muted hover:text-status-error"
                  title="Remove this reward"
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/*
          Names the import read that have no record beside them. They came from a
          Warband imported before `rewards` existed, and the sheet lists them as
          imports — saying so here is what stops a player re-typing one.
        */}
        {(warband.campaignRules ?? []).some(
          (n) => !held.some((r) => r.name.trim().toLowerCase() === n.trim().toLowerCase()),
        ) && (
          <div className="space-y-1">
            <span className="eyebrow block">Named by an import, with no text recorded</span>
            <p className="font-mono text-xs text-theme-muted leading-relaxed">
              {(warband.campaignRules ?? [])
                .filter((n) => !held.some(
                  (r) => r.name.trim().toLowerCase() === n.trim().toLowerCase()))
                .join(' · ')}
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
};
