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
import {
  campaignOutbox, newOpId, pushCampaignOps, serverCampaign, serverTerritory,
  type CampaignOp, type CampaignSyncState,
} from '../../services/campaignSync';

/* `Omit` over a union collapses it to the keys they share, which would lose
   `entityId` from the two territory operations. Distributed, it does not. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * An operation as a mutation states it: everything but which campaign.
 *
 * `queueOp` fills that in from `cloudId`, so a call site cannot name a
 * campaign the server has never heard of — the one case that would put an
 * un-acknowledgeable operation in the queue.
 */
type PendingOp = DistributiveOmit<CampaignOp, 'campaignId'>;

/**
 * Queue one operation for the cloud, and advance the local version it leaves
 * behind. Returns the campaign to save.
 *
 * A campaign with no `cloudId` is one the server has never heard of — `id` is
 * minted locally and is not something the API would recognise — and queueing
 * for it would fill the outbox with operations that can never be acknowledged,
 * so the queue would grow for the life of the install and never drain. Local
 * play is supported everywhere it was; it simply does not sync, so such a
 * campaign is handed straight back unchanged.
 *
 * The version stated is what this device believes the server holds — an
 * operation declares what it was made AGAINST, so the server can tell a stale
 * edit from a concurrent one rather than taking whichever arrived last.
 *
 * **Which is why the local version moves here and not on acknowledgement.**
 * An applied operation leaves the entity at exactly `baseVersion + 1`: that is
 * the update's own `where`, so it is not a guess. Two edits to one territory
 * made before either is pushed are two operations, and if both claimed the
 * same base the second would be a conflict against the first — this device
 * disagreeing with itself over an edit nobody else touched. Chaining them
 * costs nothing when the first applies, and when it does NOT apply the second
 * conflicts too, which is correct: it was made on top of something that never
 * happened, and `docs/CAMPAIGN-SYNC.md` has the app show conflicts rather than
 * resolve them.
 */
function queueOp(campaign: Campaign, op: PendingOp): Campaign {
  const campaignId = campaign.cloudId;
  if (!campaignId) return campaign;
  campaignOutbox.add({ ...op, campaignId } as CampaignOp);

  const next = op.baseVersion + 1;
  if (op.kind === 'campaign.settings') return { ...campaign, version: next };
  return {
    ...campaign,
    territories: campaign.territories.map((t) => (t.id === op.entityId ? { ...t, version: next } : t)),
  };
}

/**
 * What the indicator should say once an edit has been queued.
 *
 * An edit that is saved here and not yet in the cloud is `pending`, which is
 * not an error: editing a campaign at a table with no signal is the normal
 * case, and colouring it as a failure teaches people to ignore the indicator.
 *
 * A conflict or a failure already on screen is left alone. Both say WHY the
 * queue is not draining — a question the player has to answer, or a server
 * that could not be reached — and "2 to upload" in their place says the upload
 * is merely waiting when the app knows better. The operations behind them stay
 * queued and stay counted in any later push, so nothing is lost by leaving the
 * more specific message up.
 */
function queuedState(campaign: Campaign, current: CampaignSyncState): { campaignSync: CampaignSyncState } | Record<string, never> {
  if (!campaign.cloudId || current.kind === 'conflict' || current.kind === 'error') return {};
  const count = campaignOutbox.forCampaign(campaign.cloudId).length;
  return count ? { campaignSync: { kind: 'pending', count } } : {};
}

export type CampaignSlice = Pick<AppState, 'campaignSync' | 'syncCampaignWithCloud' | 'discardCampaignConflicts' | 'publishCampaignToCloud' | 'adoptCampaignFromCloud' | 'isPostBattleOpen' | 'setIsPostBattleOpen' | 'applyPostBattleResults' | 'campaign' | 'createCampaign' | 'claimTerritory' | 'setTerritoryPerk' | 'setCampaignHouseRule' | 'logCampaignMatch' | 'updateMatchNarrative'>;

export const createCampaignSlice = (init: InitialState): StateCreator<AppState, [], [], CampaignSlice> =>
  (set, get) => ({
    campaignSync: { kind: 'local-only' },

    /**
     * Reconcile the campaign with the cloud.
     *
     * Fetch first, and if the fetch fails, STOP — the same order the warband
     * sync uses and for the same reason: a device that pushes without having
     * read overwrites a newer copy with an older one, and a fetch that cannot
     * be made is not permission to write.
     *
     * Then push what the outbox holds. Applied and skipped both clear it —
     * `skipped` is the server saying it already had that operation, which is
     * the retry working. Conflicts stay queued and are handed to the player:
     * `docs/CAMPAIGN-SYNC.md`'s rule is that merging two people's edits
     * without asking is a wrong answer nobody sees.
     */
    syncCampaignWithCloud: async () => {
      const campaignId = get().campaign.cloudId;
      /* Not a failure. A campaign the server has never heard of is a campaign
         played on this device, which is a supported way to play — and saying
         so beats a spinner that never resolves. */
      if (!campaignId) {
        set({ campaignSync: { kind: 'local-only' } });
        return;
      }

      const pendingNow = () => campaignOutbox.forCampaign(campaignId).length;
      set({ campaignSync: { kind: 'syncing' } });

      const fetched = await storage.fetchCampaignFromCloud(campaignId);
      if (!fetched.ok) {
        set({ campaignSync: { kind: 'error', reason: fetched.reason, detail: fetched.detail, pending: pendingNow() } });
        return;
      }

      const res = await pushCampaignOps(campaignId, { fetched: true });
      if (!res.ok) {
        set({
          campaignSync: {
            kind: 'error',
            /* The push says `auth`; the indicator, shared in wording with the
               warband one, says `unauthenticated`. One name for it. */
            reason: res.reason === 'auth' ? 'unauthenticated' : res.reason,
            detail: res.detail,
            pending: pendingNow(),
          },
        });
        return;
      }

      const pending = pendingNow();
      if (res.conflicts.length) {
        set({ campaignSync: { kind: 'conflict', conflicts: res.conflicts, pending } });
        return;
      }
      /* Queued while this request was in flight, or left over from a batch the
         server only partly answered. Either way it is work still to do. */
      if (pending) {
        set({ campaignSync: { kind: 'pending', count: pending } });
        return;
      }
      set({ campaignSync: { kind: 'synced', at: new Date().toISOString() } });
    },

    /**
     * Resolve conflicts by taking the campaign's copy.
     *
     * Two things have to happen together, and doing only one is a bug either
     * way: the operation leaves the queue, AND this device adopts the value
     * the server showed it. Dropping the operation alone would leave the
     * player looking at their own text with nothing queued to send it — a
     * silent divergence, which is the failure mode this whole protocol exists
     * to remove.
     *
     * A payload this version cannot read resolves nothing. It stays queued and
     * stays in the conflict list, because clearing it would drop the edit
     * without adopting anything in its place.
     */
    discardCampaignConflicts: () => {
      const state = get();
      const cloudId = state.campaign.cloudId;
      if (state.campaignSync.kind !== 'conflict' || !cloudId) return;

      const queuedOps = new Map(campaignOutbox.forCampaign(cloudId).map((o) => [o.opId, o]));
      const resolved: string[] = [];
      const unresolved: typeof state.campaignSync.conflicts = [];
      let campaign = state.campaign;

      for (const conflict of state.campaignSync.conflicts) {
        const op = queuedOps.get(conflict.opId);
        /* Already gone — a second device, or a push that landed between the
           conflict and this click. Nothing to adopt and nothing to clear. */
        if (!op) { resolved.push(conflict.opId); continue; }

        if (op.kind === 'campaign.settings') {
          const theirs = serverCampaign(conflict.server);
          if (!theirs) { unresolved.push(conflict); continue; }
          campaign = {
            ...campaign,
            version: theirs.version,
            name: theirs.name,
            currentTurn: theirs.currentTurn,
            houseRules: theirs.houseRules ?? undefined,
          };
        } else {
          const theirs = serverTerritory(conflict.server);
          if (!theirs) { unresolved.push(conflict); continue; }
          campaign = {
            ...campaign,
            territories: campaign.territories.map((t) => (t.id === op.entityId ? {
              ...t,
              version: theirs.version,
              perk: theirs.perk,
              perkSource: theirs.perkSource ?? undefined,
              controlledByWarbandId: theirs.controlledByWarbandId ?? undefined,
              controlledByPlayerName: theirs.controlledByPlayerName ?? undefined,
            } : t)),
          };
        }
        resolved.push(conflict.opId);
      }

      campaignOutbox.clear(resolved);
      storage.saveCampaign(campaign);

      const pending = campaignOutbox.forCampaign(cloudId).length;
      set({
        campaign,
        campaignSync: unresolved.length
          ? { kind: 'conflict', conflicts: unresolved, pending }
          : pending
            ? { kind: 'pending', count: pending }
            : { kind: 'synced', at: new Date().toISOString() },
      });
    },

    /**
     * Give this campaign a cloud identity.
     *
     * The one call that turns a local campaign into one the server has heard
     * of. Everything after it is an operation against that id.
     *
     * **The id is minted and SAVED before the request goes out.** If the
     * response is lost — the tab closes, the signal drops after the write
     * lands — the next attempt names the same campaign and the server answers
     * `alreadyPublished` rather than creating a second one. Minting it after a
     * successful response would make every failure ambiguous: the client would
     * have no way to ask "did that land?", only to try again and hope.
     *
     * Saving an unconfirmed `cloudId` has a cost, and it is the smaller one:
     * until the publish succeeds the outbox may queue operations against an id
     * the server has not got yet, and they will fail as `server` errors and
     * stay queued — which is what the outbox is for. The alternative is a
     * duplicate campaign, which nothing can repair.
     */
    publishCampaignToCloud: async () => {
      const campaign = get().campaign;
      if (campaign.cloudId) {
        /* Already has one. Not an error and not a no-op: push whatever the
           outbox is holding, which is what the caller wanted. */
        await get().syncCampaignWithCloud();
        return;
      }

      /*
        `crypto.randomUUID` needs a secure context, which every browser this
        app runs in has — and the failure is loud rather than a weaker id: a
        campaign published under something guessable is a campaign whose row
        another client can aim at.
      */
      if (typeof crypto?.randomUUID !== 'function') {
        set({ campaignSync: {
          kind: 'error', reason: 'server',
          detail: 'This browser cannot mint a secure campaign id.',
          pending: 0,
        } });
        return;
      }

      const cloudId = crypto.randomUUID();
      set({ campaignSync: { kind: 'publishing' } });

      // Saved BEFORE the request — see above.
      const claimed = { ...campaign, cloudId };
      storage.saveCampaign(claimed);
      set({ campaign: claimed });

      const result = await storage.publishCampaignToCloud(campaign, cloudId);

      if (!result.ok) {
        /*
          The `cloudId` STAYS. It is this device's claim on that row, and
          dropping it on a failure is what would let a retry mint a second
          campaign. The publish is retried by pressing again; `syncCampaign`
          also reaches the same endpoint once an id exists.
        */
        set({ campaignSync: {
          kind: 'error', reason: result.reason, detail: result.detail, pending: 0,
        } });
        return;
      }

      /*
        The invite code is the server's to issue — see the authority table in
        docs/CAMPAIGN-SYNC.md — so it is taken from the response rather than
        kept from whatever the local campaign had.
      */
      const published = { ...claimed, cloudId: result.data.id, inviteCode: result.data.inviteCode };
      storage.saveCampaign(published);
      set({
        campaign: published,
        campaignSync: { kind: 'synced', at: new Date().toISOString() },
      });
    },

    /**
     * Replace this device's campaign with one the server holds.
     *
     * SYNC-5. Sync has been push-only, so a player who spent an invite code
     * (SYNC-4) got a real membership and a device that never showed them the
     * campaign. This is the other direction.
     *
     * ## It replaces, and the caller has to mean it
     *
     * The store holds ONE campaign, so adopting is destructive by
     * construction: whatever was here is gone. That is why this is not called
     * automatically after a join. `JoinCampaignModal` asks first, and the
     * question it asks names what would be lost — a campaign with unpushed
     * edits in the outbox is somebody's evening of play, and "we downloaded
     * over it" is not something to discover afterwards.
     *
     * ## The outbox is not carried over
     *
     * Operations queued against the OLD campaign are dropped, because they
     * name a campaign this device no longer holds. Pushing them later would
     * apply an edit made against one campaign to whichever one happened to be
     * loaded — the outbox is keyed by cloud id precisely so that cannot
     * happen, and this keeps it true.
     */
    adoptCampaignFromCloud: async (cloudId: string) => {
      set({ campaignSync: { kind: 'syncing' } });

      const pulled = await storage.pullCampaignFromCloud(cloudId);
      if (!pulled.ok) {
        /*
          Nothing is replaced on a failure. A half-adopted campaign — the id
          swapped and the map still the old one — is the state that would be
          hardest to notice and hardest to undo.
        */
        set({ campaignSync: {
          kind: 'error', reason: pulled.reason, detail: pulled.detail, pending: 0,
        } });
        return false;
      }

      const previous = get().campaign.cloudId;
      if (previous && previous !== cloudId) {
        // `clear` takes op ids, so the queue for that campaign is read first.
        campaignOutbox.clear(campaignOutbox.forCampaign(previous).map((o) => o.opId));
      }

      storage.saveCampaign(pulled.data);
      set({
        campaign: pulled.data,
        campaignSync: { kind: 'synced', at: new Date().toISOString() },
      });
      return true;
    },

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
        const queued = queueOp(updatedCampaign, {
          kind: 'territory.claim',
          opId: newOpId(),
          entityId: territoryId,
          baseVersion: state.campaign.territories.find((t) => t.id === territoryId)?.version ?? 1,
          data: { warbandId },
        });

        storage.saveCampaign(queued);
        return { campaign: queued, ...queuedState(queued, state.campaignSync) };
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

        const queued = queueOp(updatedCampaign, {
          kind: 'territory.perk',
          opId: newOpId(),
          entityId: territoryId,
          /* The territory's own version, not the campaign's: they move
             independently, and using the wrong one makes every edit a
             conflict. Re-read from state rather than from the `target`
             captured above, which is a copy from before this mutation. */
          baseVersion: state.campaign.territories.find((t) => t.id === territoryId)?.version ?? 1,
          data: { perk: text },
        });

        storage.saveCampaign(queued);
        return { campaign: queued, ...queuedState(queued, state.campaignSync) };
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

        const queued = queueOp(updatedCampaign, {
          kind: 'campaign.settings',
          opId: newOpId(),
          baseVersion: state.campaign.version ?? 1,
          data: { houseRules: updatedCampaign.houseRules ?? {} },
        });

        storage.saveCampaign(queued);
        return { campaign: queued, ...queuedState(queued, state.campaignSync) };
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
        return { campaign: updatedCampaign };
      });
    },

    // Customizer
});
