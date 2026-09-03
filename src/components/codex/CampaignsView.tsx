import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Map as MapIcon, Home, Trophy, Eye } from 'lucide-react';
import { RulesProse } from './RulesProse';
import type { CampaignDefinition, CampaignSection, VisionCard } from '@/types/catalogue';

/**
 * The two campaigns Carcass Front prints, and its sixteen Vision cards.
 *
 * Its own component rather than another branch in `CodexView`, which is
 * already the largest view in the app: this one carries two chapters of rules
 * and a card deck, and none of it shares state with the rest of the Codex.
 *
 * The chapters are long — 44 sections for the map campaign — so they are an
 * accordion rather than a page. A player opens this at a table, on a phone,
 * having just finished a game and wanting the one step they are on.
 */

/** A level-1 banner and the level-2 rules printed under it. */
interface Group {
  heading: string | null;
  section: CampaignSection | null;
  children: CampaignSection[];
}

/**
 * Group the sections under their ALL-CAPS banners.
 *
 * Both chapters open on level-2 sections before their first banner — `New
 * Players Read This`, `Campaign Overview`, `The Campaign Map` all come before
 * `RESOURCES` — so a leading group with no heading of its own holds those
 * rather than dropping them or hanging them off the wrong banner.
 */
function group(sections: CampaignSection[]): Group[] {
  const groups: Group[] = [];
  for (const s of sections) {
    if (s.level === 1 || !groups.length) {
      groups.push(
        s.level === 1
          ? { heading: s.heading, section: s, children: [] }
          : { heading: null, section: null, children: [s] },
      );
      if (s.level === 1) continue;
      continue;
    }
    groups[groups.length - 1].children.push(s);
  }
  return groups;
}

const Panel: React.FC<{
  title: React.ReactNode;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, subtitle, open, onToggle, children }) => (
  <div className="bg-theme-surface border border-theme-border rounded-md overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 p-3.5 text-left hover:bg-theme-elevated transition-colors"
    >
      <div className="min-w-0">
        <span className="font-gothic font-bold text-sm text-theme-primary block">{title}</span>
        {subtitle && (
          <span className="text-[11px] font-mono text-theme-muted block truncate">{subtitle}</span>
        )}
      </div>
      {open
        ? <ChevronUp className="w-4 h-4 text-theme-muted shrink-0" />
        : <ChevronDown className="w-4 h-4 text-theme-muted shrink-0" />}
    </button>
    {open && <div className="px-3.5 pb-4 border-t border-theme-border pt-3">{children}</div>}
  </div>
);

export const CampaignsView: React.FC<{
  campaigns: CampaignDefinition[];
  visionCards: VisionCard[];
  error?: string | null;
}> = ({ campaigns, visionCards, error }) => {
  const [activeId, setActiveId] = useState(campaigns[0]?.id ?? '');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const campaign = campaigns.find((c) => c.id === activeId) ?? campaigns[0];
  const groups = useMemo(() => (campaign ? group(campaign.sections) : []), [campaign]);

  if (!campaigns.length) {
    return (
      <p className="text-xs font-mono text-status-error leading-relaxed">
        {error
          ? `The campaigns could not be loaded: ${error}.`
          : 'This ruleset has no Carcass Front campaign.'}
      </p>
    );
  }

  const toggle = (key: string) => setOpenKey((k) => (k === key ? null : key));

  return (
    <div className="space-y-3">
      {/* Which campaign. Two, and they are different games. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {campaigns.map((c) => (
          <button
            key={c.id}
            onClick={() => { setActiveId(c.id); setOpenKey(null); }}
            className={`px-3 py-2 rounded font-bold uppercase text-xs transition-all ${
              c.id === campaign.id
                ? 'bg-theme-primary text-theme-base shadow'
                : 'bg-theme-elevated text-theme-muted hover:text-theme-text border border-theme-border'
            }`}
          >
            <span className="block truncate">{c.name}</span>
            <span className="block text-[10px] font-mono normal-case opacity-80">
              {c.players} players
            </span>
          </button>
        ))}
      </div>

      {/*
        The fold-out map is not in the PDF, and neither is anything printed on
        it: the zone board, the Carcass Front Zones table (which zone offers
        which Resources and which scenario is played there), the Special Zones
        table, and the generator charts. Said here rather than leaving a player
        to work out why the rules below keep pointing at a table that is not in
        the app.
      */}
      {campaign.requiresMap && (
        <div className="p-3.5 bg-theme-base rounded border border-theme-accent/50 flex gap-2.5">
          <MapIcon className="w-4 h-4 text-theme-accent shrink-0 mt-0.5" />
          <p className="text-[11px] font-mono text-theme-text leading-relaxed">
            This campaign is played on the <strong>fold-out map from the box</strong>. The zone
            board, the Carcass Front Zones table, the Special Zones table and the generator
            charts are printed there and appear in no PDF, so they are not in the app — the
            rules below say what to do with them.
          </p>
        </div>
      )}

      {campaign.intro && (
        <div className="p-3.5 bg-theme-surface border border-theme-border rounded-md">
          <RulesProse source={campaign.intro} />
        </div>
      )}

      {/* The twelve Camp building tiers, which stack. */}
      {campaign.buildings.length > 0 && (
        <Panel
          title={<span className="flex items-center gap-2"><Home className="w-4 h-4" />Camp Buildings</span>}
          subtitle={`${campaign.buildings.length} buildings, 3 stacking tiers each`}
          open={openKey === 'buildings'}
          onToggle={() => toggle('buildings')}
        >
          <div className="space-y-3">
            {campaign.buildings.map((b) => (
              <div key={b.id} className="p-3 bg-theme-base rounded border border-theme-border space-y-2">
                <div>
                  <span className="font-gothic font-bold text-xs text-theme-primary">
                    {b.glyph} {b.name}
                  </span>
                  <p className="text-[11px] font-mono text-theme-muted">{b.flavour}</p>
                </div>
                {b.tiers.map((t) => (
                  <p key={t.tier} className="text-[11px] font-mono text-theme-text leading-relaxed">
                    <strong className="text-theme-text">Tier {t.tier}:</strong> {t.effect}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {campaign.trackerRewards.length > 0 && (
        <Panel
          title="Campaign Tracker Rewards"
          subtitle={`${campaign.trackerRewards.length} rewards`}
          open={openKey === 'rewards'}
          onToggle={() => toggle('rewards')}
        >
          {/* A lookup table, so it scrolls inside its own container and never
              the page — see docs/MOBILE.md. */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] font-mono border-collapse">
              <tbody>
                {campaign.trackerRewards.map((r) => (
                  <tr key={r.symbol} className="border-b border-theme-border last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap font-bold text-theme-primary align-top">
                      {r.symbol}
                    </td>
                    <td className="py-2 text-theme-text leading-relaxed">{r.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {campaign.sharedObjectives.length > 0 && (
        <Panel
          title={<span className="flex items-center gap-2"><Trophy className="w-4 h-4" />Shared Campaign Objectives</span>}
          subtitle="Scored at the end, and split between players who tie"
          open={openKey === 'shared'}
          onToggle={() => toggle('shared')}
        >
          <div className="space-y-2">
            {campaign.sharedObjectives.map((o) => (
              <div key={o.id} className="p-3 bg-theme-base rounded border border-theme-border">
                <span className="font-gothic font-bold text-xs text-theme-primary">
                  {o.name} — {o.points} 🏅
                </span>
                <p className="text-[11px] font-mono text-theme-text leading-relaxed pt-1">
                  {o.description}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/*
        The three ways the Path to Leviathan ends. Two facts decide the whole
        campaign: whether Leviathan was summoned in Scenario V, and whether the
        summoner also holds the railway cannon from Scenario IV.
      */}
      {campaign.conclusions.length > 0 && (
        <Panel
          title={<span className="flex items-center gap-2"><Trophy className="w-4 h-4" />Campaign Conclusions</span>}
          subtitle="How the narrative campaign is won"
          open={openKey === 'conclusions'}
          onToggle={() => toggle('conclusions')}
        >
          <div className="space-y-2">
            {campaign.conclusions.map((c) => (
              <div key={c.id} className="p-3 bg-theme-base rounded border border-theme-border">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="font-gothic font-bold text-xs text-theme-primary">{c.name}</span>
                  <span className="px-2 py-0.5 rounded bg-theme-surface text-theme-accent font-mono text-[10px] font-bold border border-theme-border">
                    {c.result}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-theme-text leading-relaxed pt-1">
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/*
        The Vision cards, shown with the campaign they belong to. A player
        keeps theirs secret until the end but works towards it from the first
        game and has to keep evidence as they go.
      */}
      {campaign.id === 'carcass-front' && visionCards.length > 0 && (
        <Panel
          title={<span className="flex items-center gap-2"><Eye className="w-4 h-4" />Vision Cards</span>}
          subtitle={`${visionCards.length} cards · ${visionCards[0].maxPoints} 🏅 each if fully achieved`}
          open={openKey === 'visions'}
          onToggle={() => toggle('visions')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visionCards.map((v) => (
              <div key={v.id} className="p-3 bg-theme-base rounded border border-theme-border space-y-1.5">
                <span className="font-gothic font-bold text-xs text-theme-primary block">
                  {v.title}
                </span>
                {v.tiers.map((t) => (
                  <p key={t.points} className="text-[11px] font-mono text-theme-text leading-relaxed">
                    <span className="text-theme-accent font-bold">{t.points} 🏅</span> — {t.text}
                  </p>
                ))}
                {v.note && (
                  <p className="text-[10px] font-mono text-theme-muted leading-relaxed pt-0.5">
                    {v.note}
                  </p>
                )}
                {v.flavour && (
                  <p className="text-[10px] font-mono text-theme-muted italic leading-relaxed pt-0.5">
                    {v.flavour}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* The chapter itself, banner by banner. */}
      {groups.map((g, i) => {
        const key = `sec-${g.heading ?? i}`;
        return (
          <Panel
            key={key}
            title={g.heading ?? 'Before you start'}
            subtitle={g.children.length ? `${g.children.length} rules` : undefined}
            open={openKey === key}
            onToggle={() => toggle(key)}
          >
            <div className="space-y-4">
              {g.section?.markdown && <RulesProse source={g.section.markdown} />}
              {g.children.map((c) => (
                <div key={c.id} className="space-y-1.5">
                  <span className="font-gothic font-bold text-xs text-theme-accent block">
                    {c.heading}
                  </span>
                  <RulesProse source={c.markdown} />
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
};
