'use client';

/**
 * Picking the Warband's Patron (FD-15).
 *
 * > Once they have recruited their Warband, they must pick a Patron for it.
 * >                            — the rulebook, extract lines 4753 to 4755
 *
 * > If a Patron Skill is rolled, use one of the Patron Skills for the Patron you
 * > picked for your Warband.
 * >                            — the Advancement Roll, extract line 6042
 *
 * So this is not a flavour field. Until now `warband.patron` was free text in
 * the Chronicle dossier, which meant a Patron Skill result had nothing to offer
 * — `patronSkillsFor` matches the typed string against the dataset's Patron
 * names, and a typo or a blank matched nothing.
 *
 * The eleven Patrons and their Skills come from the dataset (`dataset.patrons`,
 * derived from the rulebook and Carcass Front). Which of them this Warband may
 * take is read from each Patron's own printed restriction by
 * `patronEligibility` — never from a faction-to-Patron table written here.
 *
 * **Every Patron is listed, with its restriction.** The eligible ones are
 * offered; the rest are shown greyed with the sentence that excludes them, so a
 * player who believes their group plays it differently can see what the page
 * actually says. Hiding them would make the app the authority on a rule it only
 * read.
 */
import React, { useState } from 'react';
import { Check, Crown } from 'lucide-react';
import type { Dataset } from '@/types/catalogue';
import { patronsFor } from '@/rules/patrons';
import { Sheet } from '../ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  dataset: Dataset | null | undefined;
  factionId: string;
  factionName?: string;
  current?: string;
  onPick: (patronName: string) => void;
  /**
   * Why the picker opened, where something asked for it.
   *
   * The Promotions step opens this when a Patron Skill result lands with no
   * Patron set, and the player needs to know that is what happened rather than
   * wondering why a dialog appeared mid-roll.
   */
  reason?: string;
}

export const PatronPicker: React.FC<Props> = ({
  open, onClose, dataset, factionId, factionName, current, onPick, reason,
}) => {
  const offers = patronsFor(dataset, factionId);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Patron"
      subtitle={factionName ? `${factionName} — the book's own list` : undefined}
      size="lg"
    >
      <div className="p-4 space-y-4">

        {reason && (
          <div className="border border-status-warning/50 bg-status-warning/10 p-3">
            <p className="font-mono text-xs text-theme-muted leading-relaxed">{reason}</p>
          </div>
        )}

        <p className="font-mono text-xs text-theme-muted leading-relaxed">
          &ldquo;Once they have recruited their Warband, they must pick a Patron
          for it.&rdquo; The Patron decides which Skill you may take on a Patron
          Skill result, so a Warband with none recorded cannot answer that roll.
        </p>

        {!dataset && (
          <p className="font-mono text-xs text-status-error">
            The ruleset is not loaded, so the Patron list cannot be shown.
          </p>
        )}

        {dataset && offers.length === 0 && (
          <p className="font-mono text-xs text-status-error">
            This ruleset carries no Patrons. Nothing can be offered.
          </p>
        )}

        <ul className="space-y-2">
          {offers.map(({ patron, eligible, restriction }) => {
            const chosen = (current ?? '').trim().toLowerCase() === patron.name.trim().toLowerCase();
            const open6 = expanded === patron.id;
            return (
              <li key={patron.id} className="border border-theme-border">
                <button
                  onClick={() => onPick(patron.name)}
                  disabled={eligible === 'no' && !chosen}
                  className="w-full text-left p-3 min-h-[44px] flex items-start gap-2 hover:bg-theme-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Crown className="w-4 h-4 text-theme-primary flex-shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs font-bold uppercase tracking-wide text-theme-text break-words">
                      {patron.name}
                    </span>
                    <span className="block font-mono text-xs sm:text-[10px] text-theme-muted">
                      {restriction || 'No restriction printed.'}
                      {eligible === 'unknown'
                        && ' — this app could not read that sentence against your faction,'
                          + ' so it is offered and the rule is printed above.'}
                    </span>
                  </span>
                  {chosen && <Check className="w-4 h-4 text-status-legal flex-shrink-0 mt-0.5" />}
                </button>

                <button
                  onClick={() => setExpanded(open6 ? null : patron.id)}
                  className="flex w-full min-h-[44px] items-center px-3 pb-2 text-left eyebrow hover:text-theme-primary"
                  aria-expanded={open6}
                >
                  {open6 ? 'Hide the Skills' : `The ${patron.skills.length} Patron Skills`}
                </button>

                {open6 && (
                  <div className="px-3 pb-3 space-y-2">
                    {patron.lore && <p className="flavour text-xs">{patron.lore}</p>}
                    <ul className="space-y-1.5">
                      {patron.skills.map((sk) => (
                        <li key={sk.name} className="font-mono text-xs sm:text-[11px]">
                          <span className="text-theme-text font-bold break-words">{sk.name}</span>
                          <span className="block text-theme-muted leading-relaxed break-words">
                            {sk.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {patron.introduces.length > 0 && (
                      <ul className="space-y-1.5 border-t border-theme-border pt-2">
                        {patron.introduces.map((x) => (
                          <li key={x.name} className="font-mono text-xs sm:text-[11px]">
                            <span className="text-theme-text font-bold break-words">
                              {x.name}
                            </span>
                            <span className="text-theme-muted"> — {x.kind}, unlocked by {x.unlockedBy}</span>
                            <span className="block text-theme-muted leading-relaxed break-words">
                              {x.description}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
};
