'use client';

import React from 'react';
import { HeartPulse } from 'lucide-react';

import { useStore } from '../../store/useStore';
import { formatCost } from '../../rules/costs';
import { campaignGameOf } from '../../rules/campaign';
import { recreationLapsed } from '../../rules/recreation';
import type { Warband } from '../../types/warband';
import type { Cost } from '../../types/catalogue';

/**
 * The Quartermaster Step's side of Re-creation.
 *
 * Two entries let a Warband pay rather than lose a model the post-battle
 * sequence killed, and both put the payment after that sequence:
 *
 * > **Re-creation:** If a Takwin Homunculus is killed in the post-battle
 * > sequence, you do not have to remove it from your roster. Instead, you can
 * > spend 40 👑 **in the following Quartermaster Step** to leave it on the
 * > Roster.  — Warbands of Trench Crusade L5324 to L5327
 *
 * The Golem's is the same offer with a different deadline — *"at any time
 * between battles"*. The Quartermaster Step in this app is the builder, so
 * this is where both are settled. `applyPostBattleResults` wrote the offer;
 * see `ActiveUnit.awaitingRecreation`.
 *
 * Above the roster rather than on the model's own card, because a model
 * awaiting Re-creation is not one of the warriors a player is browsing: it is
 * a decision owed before the next game, and it disappears the moment it is
 * made. A card would hide it behind whatever filter happened to be set.
 */
export const RecreationPanel: React.FC<{ warband: Warband }> = ({ warband }) => {
  const { campaign, recreateUnit, letUnitFall } = useStore();

  const game = campaignGameOf(warband, campaign);
  const waiting = warband.units.filter((u) => u.awaitingRecreation);
  if (!waiting.length) return null;

  const held: Cost = {
    ducats: warband.treasuryDucats ?? 0,
    glory: warband.gloryPoints ?? 0,
  };

  return (
    <div className="bg-theme-surface border border-theme-accent/60 rounded-md p-3 space-y-3 bevel-container">
      <div className="flex items-center gap-2">
        <HeartPulse className="w-4 h-4 text-theme-accent flex-shrink-0" />
        <span className="text-xs font-mono font-bold uppercase text-theme-accent">
          Re-creation — {waiting.length} decision{waiting.length === 1 ? '' : 's'} owed
        </span>
      </div>

      {waiting.map((u) => {
        const offer = u.awaitingRecreation!;
        const lapsed = recreationLapsed(offer, game);
        const short: Cost = {
          ducats: Math.max(0, offer.cost.ducats - held.ducats),
          glory: Math.max(0, offer.cost.glory - held.glory),
        };
        const affordable = !short.ducats && !short.glory;
        const price = formatCost(offer.cost);

        return (
          <div
            key={u.id}
            className="bg-theme-base border border-theme-border rounded p-2.5 space-y-2"
          >
            <div className="space-y-0.5">
              <strong className="text-sm text-theme-text block">{u.customName}</strong>
              <span className="text-xs text-theme-muted block">
                {lapsed
                  /* The Takwin's offer is for "the following Quartermaster
                     Step" and that step has passed. Said plainly rather than
                     the model vanishing on its own. */
                  ? `${offer.ability} was not taken before Game ${game}. The offer has passed.`
                  : offer.deadline === 'quartermaster'
                    ? `Killed in Game ${offer.sinceGame}. ${offer.ability} keeps it on the Roster for ${price}, in this Quartermaster Step only.`
                    : `Killed in Game ${offer.sinceGame}. ${offer.ability} keeps it on the Roster for ${price}, at any time between battles.`}
              </span>
            </div>

            {/* A column on a phone, a row from `sm:`. Both buttons hold the
                44px floor up to `lg:`, as the equip sheet's do. */}
            <div className="flex flex-col sm:flex-row gap-2">
              {!lapsed && (
                <button
                  onClick={() => recreateUnit(warband.id, u.id)}
                  disabled={!affordable}
                  title={affordable
                    ? undefined
                    : `The Strongbox holds ${formatCost(held)}, and this costs ${price}.`}
                  className={`flex-1 min-h-[44px] lg:min-h-[32px] px-3 rounded font-bold uppercase text-xs border transition-colors ${
                    affordable
                      ? 'bg-theme-base hover:bg-theme-primary hover:text-theme-base text-theme-primary border-theme-primary/50'
                      : 'bg-theme-base/50 text-theme-muted border-theme-border cursor-not-allowed'
                  }`}
                >
                  {affordable
                    ? `Re-create (${price})`
                    : `${price} — short ${formatCost(short)}`}
                </button>
              )}
              <button
                onClick={() => letUnitFall(warband.id, u.id)}
                className="flex-1 min-h-[44px] lg:min-h-[32px] px-3 rounded font-bold uppercase text-xs border border-theme-border bg-theme-elevated text-theme-text hover:bg-status-error hover:text-white transition-colors"
              >
                {lapsed ? 'Remove from the Roster' : 'Let it fall'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
