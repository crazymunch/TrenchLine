/**
 * The campaign: enrolment, territories, match records, and the post-battle
 * sequence that turns a result into Ducats, Glory, injuries and advancements.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import { defaultFreshCampaign } from '../seed';
import type { Campaign, MatchRecord, CampaignMember } from '../../types/campaign';
import type { Warband, WarbandSnapshot, UnitTitleRecord } from '../../types/warband';
import type { InitialState } from '../init';
import { persistWarbands } from '../persist';
import { campaignOutbox, newOpId } from '../../services/campaignSync';

/**
 * Queue one operation for the cloud, if this campaign has a cloud identity.
 *
 * A local-only campaign has no `id` the server would recognise, and queueing
 * for it would fill the outbox with operations that can never be acknowledged.
 * Anonymous local use is supported everywhere it was; it simply does not sync.
 *
 * The version stated is the one this device last knew about — an operation
 * declares what it was made AGAINST, so the server can tell a stale edit from
 * a concurrent one rather than taking whichever arrived last.
 */
function queueOp(campaign: Campaign, op: Parameters<typeof campaignOutbox.add>[0]): void {
  if (!campaign.id) return;
  campaignOutbox.add(op);
}

export type CampaignSlice = Pick<AppState, 'isPostBattleOpen' | 'setIsPostBattleOpen' | 'applyPostBattleResults' | 'campaign' | 'createCampaign' | 'claimTerritory' | 'setTerritoryPerk' | 'setCampaignHouseRule' | 'logCampaignMatch' | 'updateMatchNarrative'>;

export const createCampaignSlice = (init: InitialState): StateCreator<AppState, [], [], CampaignSlice> =>
  (set, get) => ({
    isPostBattleOpen: false,
    setIsPostBattleOpen: (open) => set({ isPostBattleOpen: open }),
    applyPostBattleResults: (
      scenarioId,
      scenarioName,
      outcome,
      gloryGained,
      ducatsGained,
      casualties,
      advancements,
      narrative,
      narrativeReport,
      mvpUnitName,
      opponentWarbandName,
      notableMoments
    ) => {
      const state = get();
      const activeWb = state.getActiveWarband();
      if (!activeWb) return;

      const updatedUnits = activeWb.units.map((u) => {
        const cas = casualties.find((c) => c.unitId === u.id);
        const adv = advancements.find((a) => a.unitId === u.id);

        const newInjuries = [...u.injuries];
        let isDead = u.isDead;
        let currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
          title: t,
          source: 'user',
          active: true
        }));

        if (cas) {
          newInjuries.push(cas.outcome);
          if (cas.isDead) isDead = true;

          const norm = cas.outcome.toLowerCase();
          let earnedTitle: { title: string; origin: string } | null = null;
          if (norm.includes('prominent scar') || norm.includes('scarred')) {
            earnedTitle = { title: 'the Scarred', origin: 'Trauma: Prominent Scar' };
          } else if (norm.includes('lost arm') || norm.includes('crippled') || norm.includes('severed hand')) {
            earnedTitle = { title: 'the Crippled', origin: 'Trauma: Lost Arm' };
          } else if (norm.includes('leg wound') || norm.includes('lame') || norm.includes('limp')) {
            earnedTitle = { title: 'the Lame', origin: 'Trauma: Leg Wound' };
          } else if (norm.includes('lost an eye') || norm.includes('blind') || norm.includes('one-eyed')) {
            earnedTitle = { title: 'the One-Eyed', origin: 'Trauma: Lost an Eye' };
          } else if (norm.includes('chest wound') || norm.includes('iron-ribbed')) {
            earnedTitle = { title: 'the Iron-Ribbed', origin: 'Trauma: Chest Wound' };
          } else if (norm.includes('shell-shocked') || norm.includes('shell shock')) {
            earnedTitle = { title: 'the Shell-Shocked', origin: 'Trauma: Shell-shocked' };
          } else if (norm.includes('possessed')) {
            earnedTitle = { title: 'the Possessed', origin: 'Trauma: Possessed' };
          } else if (norm.includes('hardened') || norm.includes('fearless')) {
            earnedTitle = { title: 'the Fearless', origin: 'Trauma: Hardened' };
          }

          if (earnedTitle && !currentRecords.some(r => r.title.toLowerCase() === earnedTitle!.title.toLowerCase())) {
            currentRecords = [
              ...currentRecords,
              {
                title: earnedTitle.title,
                source: 'injury',
                origin: earnedTitle.origin,
                active: true
              }
            ];
          }
        }

        // Leader Exploration Rewards auto-title check
        if (u.profileSnapshot.category === 'Leader' && narrative) {
          const normN = narrative.toLowerCase();
          if (normN.includes('book of golems') || normN.includes('takwin')) {
            if (!currentRecords.some(r => r.title.toLowerCase() === 'weaver of flesh')) {
              currentRecords = [
                ...currentRecords,
                {
                  title: 'Weaver of Flesh',
                  source: 'exploration',
                  origin: 'Exploration: The Book of Golems',
                  active: true
                }
              ];
            }
          }
        }
        const newAdvancements = [...u.advancements];
        const newXp = u.xp + 1;
        if (adv) {
          newAdvancements.push(adv.advancement);
        }

        const newDeeds = u.deeds ? [...u.deeds] : [];
        if (mvpUnitName && (u.customName.toLowerCase().includes(mvpUnitName.toLowerCase()) || mvpUnitName.toLowerCase().includes(u.customName.toLowerCase()))) {
          newDeeds.unshift(`Match MVP: ${scenarioName} (${outcome})`);
        }

        const activeTitles = currentRecords.filter(r => r.active).map(r => r.title);

        return {
          ...u,
          injuries: newInjuries,
          isDead,
          advancements: newAdvancements,
          deeds: newDeeds,
          titleRecords: currentRecords,
          titles: activeTitles,
          xp: newXp,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          status: isDead ? ('Out of Action' as const) : ('Active' as const),
          hasActedThisTurn: false
        };
      });

      const changesSummary: string[] = [
        `Match Result: ${outcome} in ${scenarioName} (+${gloryGained} Glory, +${ducatsGained} Ducats).`
      ];
      if (casualties.length > 0) {
        casualties.forEach((c) => changesSummary.push(`Casualty: ${c.unitName} - ${c.outcome}`));
      }
      if (advancements.length > 0) {
        advancements.forEach((a) => {
          const u = activeWb.units.find((item) => item.id === a.unitId);
          changesSummary.push(`Advancement: ${u?.customName || 'Warrior'} learned ${a.advancement}`);
        });
      }
      if (mvpUnitName) {
        changesSummary.push(`Match MVP: ${mvpUnitName}`);
      }

      const matchId = `m-${Date.now()}`;
      const matchSnapshot: WarbandSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Post-Battle: ${scenarioName} (${outcome})`,
        type: 'post_battle',
        matchId,
        scenarioName,
        outcome,
        ducatCost: updatedUnits.reduce((s, u) => s + u.totalCost, 0),
        treasuryDucats: activeWb.treasuryDucats + ducatsGained,
        gloryPoints: activeWb.gloryPoints + gloryGained,
        unitCount: updatedUnits.filter((u) => !u.isDead).length,
        units: JSON.parse(JSON.stringify(updatedUnits)),
        armoryStash: JSON.parse(JSON.stringify(activeWb.armoryStash)),
        changesSummary,
        notes: narrativeReport || narrative
      };

      const existingSnapshots = activeWb.snapshots || [];
      const updatedWarband: Warband = {
        ...activeWb,
        gloryPoints: activeWb.gloryPoints + gloryGained,
        treasuryDucats: activeWb.treasuryDucats + ducatsGained,
        units: updatedUnits,
        snapshots: [...existingSnapshots, matchSnapshot]
      };

      // Through the choke point like every other write. This one is the post-
      // battle payout — Glory, Ducats and a snapshot — so a lost push here is
      // a lost game's worth of campaign progress.
      const updatedWarbands = persistWarbands(
        state.warbands.map((w) => (w.id === activeWb.id ? updatedWarband : w)),
        state.warbands,
      );

      // Create Match Record
      const newMatch: MatchRecord = {
        id: matchId,
        campaignId: state.campaign.id,
        date: new Date().toISOString().split('T')[0],
        scenarioId,
        scenarioName,
        narrativeLog: narrative || `Match completed with outcome: ${outcome}`,
        narrativeReport,
        mvpUnitName,
        opponentWarbandName,
        notableMoments,
        participants: [
          {
            warbandId: activeWb.id,
            warbandName: activeWb.name,
            playerName: 'Commander',
            result: outcome,
            gloryGained,
            ducatsGained,
            casualties
          }
        ]
      };

      // Update Campaign Leaderboard
      const updatedMembers: CampaignMember[] = state.campaign.members.map((m) => {
        if (m.warbandId === activeWb.id) {
          return {
            ...m,
            glory: m.glory + gloryGained,
            treasury: m.treasury + ducatsGained,
            wins: outcome === 'Victory' ? m.wins + 1 : m.wins,
            losses: outcome === 'Defeat' ? m.losses + 1 : m.losses,
            draws: outcome === 'Draw' ? m.draws + 1 : m.draws
          };
        }
        return m;
      });

      const newLog = {
        id: `c-${Date.now()}`,
        timestamp: 'Just now',
        text: `${activeWb.name} fought in ${scenarioName} (${outcome}). Gained ${gloryGained} Glory & ${ducatsGained} Ducats.`,
        category: 'battle' as const
      };

      const updatedCampaign: Campaign = {
        ...state.campaign,
        currentTurn: state.campaign.currentTurn + 1,
        members: updatedMembers,
        matches: [newMatch, ...state.campaign.matches],
        chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
      };

      storage.saveCampaign(updatedCampaign);
      storage.syncCampaignToCloud(updatedCampaign);

      set({
        warbands: updatedWarbands,
        campaign: updatedCampaign,
        isPostBattleOpen: false,
        playTurn: 1
      });
    },

    // Campaign Management
    campaign: init.campaign,
    createCampaign: (name, maxDucats, gloryThreshold, framework = 'classic', territories) => {
      const state = get();
      const activeWb = state.getActiveWarband();

      const newCampaign: Campaign = {
        id: `camp-${Date.now()}`,
        name,
        inviteCode: `TRENCH-${Math.floor(1000 + Math.random() * 9000)}`,
        adminName: 'Commander',
        status: 'active',
        /*
          Recorded on the campaign and never changed after. The two frameworks
          do not agree on what a territory is, what a turn is or how the
          campaign is won, so a switch mid-campaign would leave every game
          already logged meaning something other than what it meant when it
          was played.
        */
        framework,
        currentTurn: 1,
        maxWarbandDucats: maxDucats,
        gloryVictoryThreshold: gloryThreshold,
        members: activeWb
          ? [
              {
                userId: 'user-1',
                playerName: 'Commander',
                warbandId: activeWb.id,
                warbandName: activeWb.name,
                factionId: activeWb.factionId,
                glory: activeWb.gloryPoints,
                rating: activeWb.units.reduce((sum, u) => sum + u.totalCost, 0),
                wins: 0,
                losses: 0,
                draws: 0,
                treasury: activeWb.treasuryDucats
              }
            ]
          : [],
        /*
          A Carcass Front campaign is played on its own 32 zones, which the
          view passes in from the dataset. The app's twelve world theatres are
          the `classic` map and mean nothing under those rules.

          An empty list would be a Carcass Front campaign with no map at all,
          which is worse than the wrong one, so it falls back and the view says
          the dataset did not load rather than silently seating the player
          somewhere else.
        */
        territories: territories?.length ? territories : defaultFreshCampaign.territories,
        matches: [],
        chronicleLogs: [
          {
            id: `c-${Date.now()}`,
            timestamp: 'Just now',
            text: `Crusade campaign "${name}" established`
                + (framework === 'carcass-front' ? ' on the Carcass Front.' : '.'),
            category: 'territory'
          }
        ]
      };

      storage.saveCampaign(newCampaign);
      storage.syncCampaignToCloud(newCampaign);
      set({ campaign: newCampaign });
    },

    claimTerritory: (territoryId, warbandId, playerName) => {
      set((state) => {
        const updatedTerritories = state.campaign.territories.map((t) =>
          t.id === territoryId
            ? { ...t, controlledByWarbandId: warbandId, controlledByPlayerName: playerName }
            : t
        );

        const newLog = {
          id: `c-${Date.now()}`,
          timestamp: 'Just now',
          text: `${playerName} captured territory: ${
            state.campaign.territories.find((t) => t.id === territoryId)?.name
          }`,
          category: 'territory' as const
        };

        const updatedCampaign: Campaign = {
          ...state.campaign,
          territories: updatedTerritories,
          chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
        };

        /* `playerName` is not sent: the server reads it from the membership it
           has already verified, so a claim cannot be attributed to anyone. */
        queueOp(updatedCampaign, {
          kind: 'territory.claim',
          opId: newOpId(),
          campaignId: updatedCampaign.id,
          entityId: territoryId,
          baseVersion: state.campaign.territories.find((t) => t.id === territoryId)?.version ?? 1,
          data: { warbandId },
        });

        storage.saveCampaign(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    /*
      A house rule on a territory, written by the campaign's organiser.

      The app ships no perk of its own: sixteen invented ones ("+15 Ducats &
      +1 Alchemical Formula discount per match" and the like) were removed
      because they rendered under the same heading a derived rule would, so a
      player could not tell the app's invention from the book. This is the
      honest version of the same feature — the people playing write the rule,
      and it is stored and shown as theirs.

      A published perk is refused. The Carcass Front Special Zones carry the
      book's own Outpost Bonus verbatim, and letting a house rule overwrite one
      would put invented text back under a published label — the exact bug.
    */
    setTerritoryPerk: (territoryId, perk) => {
      const target = get().campaign.territories.find((t) => t.id === territoryId);
      if (!target || target.perkSource === 'published') return false;

      const text = perk.trim();
      set((state) => {
        const updatedTerritories = state.campaign.territories.map((t) =>
          t.id === territoryId
            ? {
                ...t,
                perk: text,
                // Cleared rather than left saying "campaign" over an empty
                // string, which would render as a house rule with no text.
                ...(text ? { perkSource: 'campaign' as const } : { perkSource: undefined }),
              }
            : t
        );

        const updatedCampaign: Campaign = {
          ...state.campaign,
          territories: updatedTerritories,
          chronicleLogs: [
            {
              id: `c-${Date.now()}`,
              timestamp: 'Just now',
              text: text
                ? `House rule set on ${target.name}: ${text}`
                : `House rule cleared on ${target.name}`,
              category: 'territory' as const,
            },
            ...state.campaign.chronicleLogs,
          ],
        };

        queueOp(updatedCampaign, {
          kind: 'territory.perk',
          opId: newOpId(),
          campaignId: updatedCampaign.id,
          entityId: territoryId,
          baseVersion: target.version ?? 1,
          data: { perk: text },
        });

        storage.saveCampaign(updatedCampaign);
        return { campaign: updatedCampaign };
      });
      return true;
    },

    /*
      A house rule the organiser has chosen.

      Written to the chronicle like a territory perk, and for the same reason:
      a group that changes a published rule mid-campaign should be able to see
      WHEN, and a player who is surprised by the app's behaviour should be able
      to find out why it behaves that way.
    */
    setCampaignHouseRule: (rule, value) => {
      const campaign = get().campaign;
      if (!campaign?.id) return false;

      const current = campaign.houseRules?.[rule];
      if (current === value) return true;

      set((state) => {
        const houseRules = { ...state.campaign.houseRules, [rule]: value };
        /* Dropped rather than left as `false`, so a campaign that turned a
           rule on and off again is indistinguishable from one that never
           touched it. */
        if (!value) delete houseRules[rule];

        const updatedCampaign: Campaign = {
          ...state.campaign,
          houseRules: Object.keys(houseRules).length ? houseRules : undefined,
          chronicleLogs: [
            {
              id: `c-${Date.now()}`,
              timestamp: 'Just now',
              text: value
                ? `House rule set: Reinforcements no longer costs this campaign its Exploration and Quartermaster Steps.`
                : `House rule cleared: Reinforcements costs its Exploration and Quartermaster Steps again, as printed.`,
              category: 'territory' as const,
            },
            ...state.campaign.chronicleLogs,
          ],
        };

        queueOp(updatedCampaign, {
          kind: 'campaign.settings',
          opId: newOpId(),
          campaignId: updatedCampaign.id,
          baseVersion: updatedCampaign.version ?? 1,
          data: { houseRules: updatedCampaign.houseRules ?? {} },
        });

        storage.saveCampaign(updatedCampaign);
        return { campaign: updatedCampaign };
      });
      return true;
    },

    logCampaignMatch: (
      p1WarbandId,
      p2WarbandId,
      scenarioName,
      outcome,
      p1Glory,
      p1Ducats,
      p2Glory,
      p2Ducats,
      narrative
    ) => {
      set((state) => {
        const m1 = state.campaign.members.find((m) => m.warbandId === p1WarbandId);
        const m2 = state.campaign.members.find((m) => m.warbandId === p2WarbandId);

        const updatedMembers = state.campaign.members.map((m) => {
          if (m.warbandId === p1WarbandId) {
            return {
              ...m,
              glory: m.glory + p1Glory,
              treasury: m.treasury + p1Ducats,
              wins: outcome === 'p1' ? m.wins + 1 : m.wins,
              losses: outcome === 'p2' ? m.losses + 1 : m.losses,
              draws: outcome === 'draw' ? m.draws + 1 : m.draws
            };
          }
          if (m.warbandId === p2WarbandId) {
            return {
              ...m,
              glory: m.glory + p2Glory,
              treasury: m.treasury + p2Ducats,
              wins: outcome === 'p2' ? m.wins + 1 : m.wins,
              losses: outcome === 'p1' ? m.losses + 1 : m.losses,
              draws: outcome === 'draw' ? m.draws + 1 : m.draws
            };
          }
          return m;
        });

        const newMatch: MatchRecord = {
          id: `m-${Date.now()}`,
          campaignId: state.campaign.id,
          date: new Date().toISOString().split('T')[0],
          scenarioId: 'custom-match',
          scenarioName,
          narrativeLog: narrative || `${m1?.warbandName || 'Warband 1'} vs ${m2?.warbandName || 'Warband 2'} in ${scenarioName}`,
          participants: [
            {
              warbandId: p1WarbandId,
              warbandName: m1?.warbandName || 'Warband 1',
              playerName: m1?.playerName || 'Player 1',
              result: outcome === 'p1' ? 'Victory' : outcome === 'p2' ? 'Defeat' : 'Draw',
              gloryGained: p1Glory,
              ducatsGained: p1Ducats,
              casualties: []
            },
            {
              warbandId: p2WarbandId,
              warbandName: m2?.warbandName || 'Warband 2',
              playerName: m2?.playerName || 'Player 2',
              result: outcome === 'p2' ? 'Victory' : outcome === 'p1' ? 'Defeat' : 'Draw',
              gloryGained: p2Glory,
              ducatsGained: p2Ducats,
              casualties: []
            }
          ]
        };

        const newLog = {
          id: `c-${Date.now()}`,
          timestamp: 'Just now',
          text: `Match logged: ${m1?.warbandName || 'P1'} vs ${m2?.warbandName || 'P2'} (${scenarioName}).`,
          category: 'battle' as const
        };

        const updatedCampaign: Campaign = {
          ...state.campaign,
          currentTurn: state.campaign.currentTurn + 1,
          members: updatedMembers,
          matches: [newMatch, ...state.campaign.matches],
          chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
        };

        storage.saveCampaign(updatedCampaign);
        storage.syncCampaignToCloud(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    updateMatchNarrative: (campaignId, matchId, narrativeReport, mvpUnitName, opponentName, notableMoments) => {
      set((state) => {
        const updatedMatches = state.campaign.matches.map((m) => {
          if (m.id !== matchId) return m;
          return {
            ...m,
            narrativeReport,
            mvpUnitName: mvpUnitName !== undefined ? mvpUnitName : m.mvpUnitName,
            opponentWarbandName: opponentName !== undefined ? opponentName : m.opponentWarbandName,
            notableMoments: notableMoments !== undefined ? notableMoments : m.notableMoments
          };
        });

        const updatedCampaign: Campaign = {
          ...state.campaign,
          matches: updatedMatches
        };

        storage.saveCampaign(updatedCampaign);
        storage.syncCampaignToCloud(updatedCampaign);
        return { campaign: updatedCampaign };
      });
    },

    // Customizer
});
