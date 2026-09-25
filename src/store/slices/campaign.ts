/**
 * The campaign: enrolment, territories, match records, and the post-battle
 * sequence that turns a result into Ducats, Glory, injuries and advancements.
 */
import type { StateCreator } from 'zustand';
import type { AppState } from '../state';
import { storage } from '../../services/storage';
import { DEFAULT_WORLD_THEATERS } from '../seed';
import type { Campaign, MatchRecord, CampaignMember } from '../../types/campaign';
import type { Warband, WarbandSnapshot, UnitTitleRecord } from '../../types/warband';
import type { InitialState } from '../init';
import { persistWarbands } from '../persist';
import {
  campaignOutbox, newOpId, pushCampaignOps, serverCampaign, serverTerritory,
  type CampaignOp, type CampaignSyncState,
} from '../../services/campaignSync';
import { removeFromRoster } from '../../rules/fallen';
import { recreationOffer, recreationLapsed } from '../../rules/recreation';
import { bookAll, bookReinforcements, strongbox } from '../../rules/ledger';
import { campaignGameOf } from '../../rules/campaign';

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

export type CampaignSlice = Pick<AppState, 'campaignSync' | 'syncCampaignWithCloud' | 'discardCampaignConflicts' | 'publishCampaignToCloud' | 'adoptCampaignFromCloud' | 'isPostBattleOpen' | 'setIsPostBattleOpen' | 'applyPostBattleResults' | 'campaign' | 'createCampaign' | 'claimTerritory' | 'setTerritoryPerk' | 'setCampaignHouseRule' | 'advanceCampaignGame' | 'everyMemberPlayedThisGame' | 'logCampaignMatch' | 'updateMatchNarrative'>;

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
      skillsLearned,
      promotions,
      experience,
      tookReinforcements,
      narrative,
      narrativeReport,
      mvpUnitName,
      opponentWarbandName,
      notableMoments,
      battleId,
      exploration,
    ) => {
      const state = get();
      const activeWb = state.getActiveWarband();
      if (!activeWb) return;

      /*
        The campaign's game, resolved once and used by everything this step
        writes: the provenance on each Skill, injury and scar (FD-12 item 2),
        the snapshot's `campaignGame`, and the ledger entries that `reversible`
        releases as a turn.

        `campaignGameOf` is the one derivation of it — already used to resolve
        the Threshold — and a second rule here would be a second answer.
      */
      const postBattleGame = campaignGameOf(activeWb, get().campaign);

      const updatedUnits = activeWb.units.map((u) => {
        const cas = casualties.find((c) => c.unitId === u.id);
        const learned = skillsLearned.filter((a) => a.unitId === u.id);

        const newInjuries = [...u.injuries];
        /*
          The same injuries with where each came from (FD-12 item 2). Written
          alongside `injuries`, never instead of it — `injuries` is what every
          other reader and every roster file ever written uses.
        */
        const newInjuryRecords = [...(u.injuryRecords ?? [])];
        /* Battle Scars, which nothing in this slice used to write at all — so
           `unfitForDuty` counted only what a player had typed in by hand, and
           retirement at the third scar was unreachable through play. */
        const newScars = [...(u.scars ?? [])];
        let isDead = u.isDead;
        let currentRecords: UnitTitleRecord[] = u.titleRecords || (u.titles || []).map(t => ({
          title: t,
          source: 'user',
          active: true
        }));

        if (cas) {
          /*
            A Full Recovery writes nothing. Roll 12 Captured with the ransom
            paid says "treat this result as a Full Recovery", and recording it
            as an injury would mark the model permanently for something it
            recovered from — and, under the duplicate-injury rule, stop it ever
            being captured again (RC-04).
          */
          /*
            `records` is decided in the wizard from the Trauma row's own text.
            Absent on a match recorded before that existed, and those keep the
            old behaviour — write the injury, add no scar — rather than being
            reinterpreted now against a table that has since changed.
          */
          /*
            Where it came from: the Trauma Step of this game, and the D66 the
            wizard rolled (FD-12 item 2, and review round 1 finding C — nothing
            in the app wrote a provenance at all, so a scar the Trauma Step
            produced read as an import).

            The row's roll is absent on a match recorded before the wizard
            carried it, and on a row the build could not identify; the kind and
            the game are still true, and a roll that was not recorded stays
            unrecorded rather than being invented.
          */
          const traumaSource = {
            kind: 'trauma' as const,
            game: postBattleGame,
            ...(cas.records?.roll ? { roll: cas.records.roll } : {}),
          };
          const writesInjury = cas.records ? cas.records.injury : !cas.fullRecovery;
          if (writesInjury) {
            newInjuries.push(cas.outcome);
            newInjuryRecords.push({ name: cas.outcome, source: traumaSource });
          }
          if (cas.records?.scar) {
            newScars.push({ ...cas.records.scar, source: traumaSource });
          }
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
        /*
          A Skill learned from an Advancement Roll goes to `skills`, with the
          table and the 2D6 total that produced it. It used to go to
          `advancements` as the label of whichever of eight buttons the player
          pressed — four of which were characteristic advances the game does
          not have. `advancements` is left exactly as it is: the strings in it
          are the player's own record, and clearing them would be a data
          change rather than a fix.
        */
        const newSkills = [...(u.skills ?? [])];
        /*
          Experience goes to the models the rules entitle to it, not to everyone
          on the roster.

          This line was `const newXp = u.xp + 1;`. The book says "each ELITE
          model that took part in a game and survived will gain 1 Experience
          Point", and Head Wound (Trauma 22) says "This model can no longer gain
          Experience Points" — a sentence the wizard *displayed* on the very
          submission that added the point. Troops, absentees and the freshly
          dead all earned one too.

          Decided in `rules/trauma.ts` and passed in, because it is a rules
          question and this slice is a writer. A model absent from `experience`
          gains nothing: that is the answer for every Troop, and a warband of
          Troops correctly earns no Experience at all.
        */
        /*
          Promotions first, then Experience — the book's order, and it matters.

          "They begin with 0 Experience Points, but will gain at least 1 due to
          surviving the game after which they were Promoted." So a model
          promoted in this step has its Experience reset and THEN takes its
          point, which is one, not one on top of whatever it had as a Troop.
        */
        const justPromoted = promotions.unitIds.includes(u.id);
        const xpBefore = justPromoted ? 0 : u.xp;
        /*
          How many points, not whether any.

          A model that performed at least one Glorious Deed gains a second
          Experience Point (p.105); a model that rolled Bitter Lessons gains
          the D3 its Trauma row owes it; every other ELITE model gains +1 where
          the Warband holds War Stories and the player took it (FD-06d); and a
          LIMITED POTENTIAL model near its cap gains only what it has room for.
          All of them are decided in the wizard, where the match, the Trauma
          rolls and the cap are in hand, and arrive as one number on the award.
          A model absent from `experience` gains nothing, which is still the
          answer for every Troop.
        */
        const award = experience.find((x) => x.unitId === u.id && x.earns);
        const newXp = xpBefore + (award?.points ?? 0);
        for (const l of learned) {
          newSkills.push({
            name: l.name,
            category: l.table === 'patron' ? 'Patron' : l.table,
            /* The total the dice actually showed, so the roster can be checked
               against the table it came from. */
            roll: String(l.roll),
            effect: l.description,
            /*
              And where it came from: the Advancement Roll in THIS game, with
              the 2D6 total (FD-12 item 2). Without it a Skill rolled in the app
              read "Imported · rolled 9" — the one kind of entry the app knows
              the most about, reported as the one it knows the least about
              (review round 1, finding C).
            */
            source: { kind: 'advancement', game: postBattleGame, roll: String(l.roll) },
          });
        }

        /*
          Glorious Deeds only. "Match MVP" is not one (RR-24).

          This used to prepend `Match MVP: <scenario> (<result>)` to the
          chosen model's Deeds, so a mechanic the game does not have wrote a
          Deed the game does not have onto the roster, sitting beside the real
          ones that came off the scenario's own list. It also matched by a
          two-way substring on the name, so "Anselm" and "Brother Anselm"
          matched each other — and so did any two models whose names contained
          one another.

          The MVP is kept as what it always really was: a line in the battle
          report, on the MatchRecord, where a narrative note belongs. Nothing
          is written to the model.
        */
        const newDeeds = u.deeds ? [...u.deeds] : [];

        const activeTitles = currentRecords.filter(r => r.active).map(r => r.title);

        /*
          A model the sequence killed that may be paid for rather than lost.

          Warbands L5324 to L5327 gives the Takwin Homunculus *"Re-creation:
          If a Takwin Homunculus is killed in the post-battle sequence, you do
          not have to remove it from your roster. Instead, you can spend 40 👑
          in the following Quartermaster Step to leave it on the Roster."* The
          Book of Golems gives the Golem the same offer with a different
          deadline — *"at any time between battles"*.

          The payment is not this step's: the Quartermaster Step is the
          builder. So the model neither falls here nor walks away healthy —
          `isDead` stays false, which is what keeps it on the roster and out
          of `removeFromRoster` below, and the offer is written down for the
          builder to settle. Resolving it there either clears the field or
          sets `isDead` and lets the model fall.

          Only where the model's own profile states the offer. Everything else
          the sequence kills falls exactly as it did.
        */
        const offer = isDead && !u.awaitingRecreation ? recreationOffer(u) : null;

        return {
          ...u,
          injuries: newInjuries,
          ...(newInjuryRecords.length ? { injuryRecords: newInjuryRecords } : {}),
          scars: newScars,
          isDead: offer ? false : isDead,
          ...(offer
            ? {
              awaitingRecreation: {
                ability: offer.ability,
                cost: offer.cost,
                deadline: offer.deadline,
                sinceGame: campaignGameOf(activeWb, get().campaign),
              },
            }
            : {}),
          ...(justPromoted
            ? {
              /*
                The Keyword, and the section of the Roster it is written in:
                "Cross out their old entry on your Warband Roster and write a
                new one for them in the Elite Models section."
              */
              isElite: true,
              profileSnapshot: { ...u.profileSnapshot, category: 'Elite' as const, elite: true },
            }
            : {}),
          skills: newSkills,
          /* One per Skill learned, which is what `advancementRollsDue`
             subtracts from the thresholds the model's Experience has passed. */
          advancementRolls: (u.advancementRolls ?? 0) + learned.length,
          deeds: newDeeds,
          titleRecords: currentRecords,
          titles: activeTitles,
          xp: newXp,
          currentWounds: u.maxWounds,
          bloodMarkers: 0,
          status: (isDead && !offer) ? ('Out of Action' as const) : ('Active' as const),
          hasActedThisTurn: false
        };
      });

      /* Minted here rather than below, because the models removed a few lines
         down record which battle it was that removed them. */
      /*
        Unique, not merely usually-unique.

        This was `m-${Date.now()}`, and a millisecond is a real collision
        window now that ONE battle produces a match record per side and the
        next side's wizard is one click away (FD-09b / RR-27): two records
        sharing an id means the second side's post-battle overwrites the
        first's link, and the battle reads as resolved having recorded one.
        Same shape as `newOpId`, and for the same reason.
      */
      const matchId = `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      /*
        The dead leave the Roster, rather than staying on it behind a flag.

        "Remove the model and its Battlekit from your Warband Roster" (Trauma
        `11 Dead`), and the same for a capture whose ransom went unpaid. The
        app set `isDead` and left the model in `units`, where the builder
        summed its Ducats, `toRoster` offered it to the legality engine and
        Play Mode deployed it — three readers that did not think to check a
        flag, which is what a flag costs. See `rules/fallen.ts`.
      */
      const { units: survivingUnits, fallen: fallenAfter, removed: justFallen } =
        removeFromRoster(
          { units: updatedUnits, fallen: activeWb.fallen },
          updatedUnits.filter((u) => u.isDead).map((u) => u.id),
          { diedInMatchId: matchId },
        );

      const changesSummary: string[] = [
        `Match Result: ${outcome} in ${scenarioName} (+${gloryGained} Glory, +${ducatsGained} Ducats).`
      ];
      justFallen.forEach((u) => changesSummary.push(
        `Removed from the Roster: ${u.customName} and its Battlekit`));
      if (casualties.length > 0) {
        casualties.forEach((c) => changesSummary.push(`Casualty: ${c.unitName} - ${c.outcome}`));
      }
      if (promotions.unitIds.length > 0) {
        promotions.unitIds.forEach((id) => {
          const u = activeWb.units.find((item) => item.id === id);
          changesSummary.push(`Promotion: ${u?.customName || 'Warrior'} gains the ELITE Keyword`);
        });
      }
      if (skillsLearned.length > 0) {
        skillsLearned.forEach((a) => {
          const u = activeWb.units.find((item) => item.id === a.unitId);
          const where = a.table === 'patron' ? 'the Patron\'s list' : `${a.table} on ${a.roll}`;
          changesSummary.push(
            `Advancement Roll: ${u?.customName || 'Warrior'} learned ${a.name} (${where})`);
        });
      }
      if (mvpUnitName) {
        changesSummary.push(`Match MVP: ${mvpUnitName}`);
      }

      /*
        Calling for Reinforcements has a price, and the app never charged it.

        The book's sequence is six steps. This slice applied one — step 6, the
        forfeiture of Exploration and the Quartermaster, which the wizard
        enforces by hiding those controls — and silently skipped the five that
        take something away:

          1. "Discard any Battlekit that you have in the Arsenal … It is
             abandoned when you fall back."   The stash was kept.
          2. "Reduce the number of Ducats in your Strongbox to zero."
             The treasury was kept, and then the game's Ducats added to it.
          5. "Any Ducats you do not spend on reinforcements are lost, and you
             cannot add any Battlekit to your Warbands Arsenal (both will start
             the next game empty)."

        So the one option that is supposed to be a costly bail-out left the
        player strictly better off than not taking it. RULES-COVERAGE-AUDIT
        RC-09.

        Steps 3 and 4 — the recruiting allowance — are not applied here. They
        govern what may be SPENT in the Roster Step that follows, which is the
        builder, and the wizard shows the number rather than this slice
        enforcing it. Charging it here would double-count against the budget the
        builder already checks.
      */
      /*
        Ransoms, which leave the Strongbox for the opponent's.

        "If the ransom is paid, transfer the 👑 from your Strongbox to your
        opponent's" — one direction only; this app holds one player's warband
        and cannot credit the other side. Capped at what is actually there
        because a Strongbox cannot go negative; the wizard caps the input at
        the same number, so reaching the cap here means something else changed
        the treasury between the two.
      */
      const ransomsAgreed = casualties.reduce((n, c) => n + (c.ransomPaid ?? 0), 0);
      const ransomsPaid = Math.min(ransomsAgreed, activeWb.treasuryDucats);

      const reinforcementsTaken = tookReinforcements;

      /*
        The post-battle money, booked rather than assigned.

        Three movements out of one confirmation, in the order the step
        resolves them: the loot and Glory earned, the ransoms paid away, and
        — where Reinforcements were called — the Strongbox emptied to pay for
        the new recruits. All carry the same `game`, so `reversible` releases
        the turn as a unit rather than one entry at a time.

        This used to be a single expression whose Reinforcements branch was
        the literal `0`, which reached the right balance by a route that left
        no record: a player looking at where 140 Ducats went would find a
        total that had simply changed. Emptying the box is now a debit of
        what was in it.

        `book` ignores a movement of nothing, so a quiet battle — no loot, no
        Glory, no ransom — books nothing at all rather than three empty rows.
      */
      /* Resolved at the top of this step — see `postBattleGame`. It ties this
         turn's entries together for `reversible`. */
      const gameNumber = postBattleGame;

      const moneyAfter = bookAll(activeWb, [
        { reason: 'exploration', ducats: ducatsGained, glory: gloryGained,
          game: gameNumber, note: `Spoils of ${scenarioName}.` },
        { reason: 'ransom', ducats: -ransomsPaid,
          game: gameNumber, note: 'Ransom paid to the opponent.' },
      ]);
      const moneyFinal = reinforcementsTaken
        ? bookReinforcements(moneyAfter, { game: gameNumber })
        : moneyAfter;

      const strongboxAfter = strongbox(moneyFinal).ducats;
      const gloryAfter = strongbox(moneyFinal).glory;
      const stashAfter = reinforcementsTaken ? [] : activeWb.armoryStash;

      if (ransomsPaid > 0) {
        changesSummary.push(
          `Ransom paid: ${ransomsPaid} Ducats transferred from the Strongbox to the `
          + 'opponent’s.');
      }

      if (reinforcementsTaken) {
        changesSummary.push(
          `Called for Reinforcements: Arsenal discarded (${activeWb.armoryStash?.length ?? 0} `
          + `item(s)) and Strongbox reduced to zero (${activeWb.treasuryDucats} Ducats).`);
      }

      const matchSnapshot: WarbandSnapshot = {
        id: `snap-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Post-Battle: ${scenarioName} (${outcome})`,
        type: 'post_battle',
        matchId,
        /* Which game this was, so the campaign can tell whether everyone has
           played it (FD-09a / RR-17). */
        campaignGame: gameNumber,
        scenarioName,
        outcome,
        ducatCost: survivingUnits.reduce((s, u) => s + u.totalCost, 0),
        /*
          The snapshot records what the warband IS after the step, so a player
          reading their history sees the Arsenal and Strongbox they actually
          have. Computed below and referenced here.
        */
        treasuryDucats: strongboxAfter,
        gloryPoints: gloryAfter,
        /* The dead are out of `units` now, so this is a plain count. It used
           to filter, which is how the shape of the old bug looked from here. */
        unitCount: survivingUnits.length,
        units: JSON.parse(JSON.stringify(survivingUnits)),
        armoryStash: JSON.parse(JSON.stringify(stashAfter)),
        changesSummary,
        notes: narrativeReport || narrative
      };

      /*
        What the Exploration Step found, written down at last.

        `explorationDiscoveries` had a reader — this step's own Pillaged
        branch — and no writer, so "You can discover a Location only once
        during the campaign" never once fired and a Warband's finds were
        never recorded (FD-07 / RR-10). Appended and de-duplicated by name,
        because the list is what that rule is checked against.

        The Skills a Location grants are appended WITHOUT de-duplication, and
        that is the rule rather than an oversight: "You can have multiples of
        any of the Exploration Skills on this list" (page 115). Two Map &
        Document Bags is two Re-rolls.
      */
      const discoveredBefore = activeWb.explorationDiscoveries ?? [];
      const discoveries = exploration?.discovered
        && !discoveredBefore.some((n) => n.toLowerCase() === exploration.discovered!.toLowerCase())
        ? [...discoveredBefore, exploration.discovered]
        : discoveredBefore;
      const effectsAfter = exploration?.effects?.length
        ? [...(activeWb.explorationEffects ?? []), ...exploration.effects]
        : activeWb.explorationEffects;

      /*
        And the Location itself, onto the Warband's record of what it holds
        (FD-12 item 2, and review round 1 finding C).

        `explorationDiscoveries` is the list the once-per-campaign rule is
        checked against — names only, and that is all that rule needs.
        `rewards` is what the Roster Sheet prints: the rule as the book states
        it, and the Exploration result in THIS game that granted it. Without
        this, a reward the app watched a player earn appeared on the sheet as
        an import, or not at all.

        Only where the Location is new to this Warband. A Pillaged result is
        one it already holds, and a second record of it would say it was found
        twice.
      */
      const newFind = exploration?.discovered
        && !discoveredBefore.some((n) => n.toLowerCase() === exploration.discovered!.toLowerCase())
        ? exploration.discovered
        : null;
      const rewardsAfter = newFind
        ? [...(activeWb.rewards ?? []), {
          name: newFind,
          group: 'Exploration Rewards',
          ...(exploration?.text ? { text: exploration.text } : {}),
          source: {
            kind: 'exploration' as const,
            game: postBattleGame,
            location: newFind,
          },
        }]
        : activeWb.rewards;

      if (exploration?.discovered) {
        changesSummary.push(`Exploration: discovered ${exploration.discovered}.`);
      }
      for (const effect of exploration?.effects ?? []) {
        changesSummary.push(effect.lootBonus
          ? `Exploration: ${effect.source} adds ${effect.lootBonus} Ducats to every Exploration Step.`
          : `Exploration: gained the ${effect.name} Exploration Skill from ${effect.source}.`);
      }

      const existingSnapshots = activeWb.snapshots || [];
      const updatedWarband: Warband = {
        ...activeWb,
        explorationDiscoveries: discoveries,
        ...(effectsAfter ? { explorationEffects: effectsAfter } : {}),
        ...(rewardsAfter ? { rewards: rewardsAfter } : {}),
        /* Totals and ledger both come from the booking, so they agree by
           construction rather than by two expressions matching. */
        ledger: moneyFinal.ledger,
        gloryPoints: gloryAfter,
        treasuryDucats: strongboxAfter,
        armoryStash: stashAfter,
        /*
          The Promotion Dice miss count, kept on the Roster between games: five
          misses spread over three games still make the sixth die a 6. Only a
          Promotion clears it, which `rollPromotions` has already done — this
          writes back whatever it returned.
        */
        promotionMisses: promotions.misses || undefined,
        units: survivingUnits,
        ...(fallenAfter.length ? { fallen: fallenAfter } : {}),
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

      /*
        The game number is NOT moved here (FD-09a / RR-17).

        This added one, and so did `logCampaignMatch`, and the turn number is
        the ORGANISER'S — `docs/CAMPAIGN-SYNC.md`'s authority table says so,
        and every Threshold and Exploration band in the app reads it through
        `campaignGameOf`. So one member finishing their own post-battle moved
        a campaign-wide number for everybody; two members each committing
        game 1 left the counter reading 3; and neither writer queued a
        `campaign.settings` op, so the value never reached the cloud and the
        next adoption put it back. Three ways wrong, in one `+ 1`.

        `advanceCampaignGame` is the only writer now.
      */
      const updatedCampaign: Campaign = {
        ...state.campaign,
        members: updatedMembers,
        matches: [newMatch, ...state.campaign.matches],
        chronicleLogs: [newLog, ...state.campaign.chronicleLogs]
      };

      storage.saveCampaign(updatedCampaign);

      /*
        A campaign of ONE moves itself on.

        FD-09 asked for an `autoAdvance` setting, on by default for a campaign
        with one member. A stored setting cannot be had here: it would need a
        `Campaign` column and the settings op cannot carry a field the table
        does not have — which is the trap `currentGame` is already in (see the
        op in `advanceCampaignGame`). So the case it was specified to default
        to is DERIVED instead, and the multi-member case is the organiser's
        button in the Hub.

        Confined to one member on purpose, and not only for the setting: the
        op is the organiser's, and a member's device queueing one would have
        it refused by the server and left sitting in the outbox. With one
        member there is nobody else to be, and nobody else to wait for.
      */
      if (updatedCampaign.id && updatedCampaign.members.length === 1) {
        queueMicrotask(() => {
          if (get().everyMemberPlayedThisGame()) get().advanceCampaignGame();
        });
      }

      /*
        Join the two records of this one game.

        Play Mode writes a scored `BattleRecord` to the Chronicle and this
        writes a typed `MatchRecord` to the campaign; the Campaign Hub reads
        the second and the Chronicle the first, and neither knew the other
        existed. `BattleRecord.campaignMatchId` was built for exactly this —
        it is in the type, the sync payload, the API schema and
        `battleFromMatch`'s options — and no caller had ever set it (RR-23).

        Read back and rewritten rather than held in memory, because the battle
        was stored before this wizard opened and may have been pushed to the
        cloud in between; `addBattle` replaces by id, so this updates the one
        record rather than adding a second.
      */
      if (battleId) {
        const battle = storage.getBattles().find((b) => b.id === battleId);
        if (battle) {
          /*
            Keyed by SIDE (FD-09b / RR-27). `campaignMatchId` was one id for
            the whole battle, and a game has as many post-battles as it has
            rosters — so the second side's had nowhere to go, and nothing
            could tell whether it had been run at all.

            The old field is still written where it is empty, and reads as the
            primary side's, so a record already in the Chronicle or the cloud
            keeps its link.
          */
          storage.addBattle({
            ...battle,
            /* On the SIDE, so it reaches the cloud inside `sides` — which is
               a Json column — rather than needing one of its own. */
            sides: battle.sides.map((s) => (
              s.id === activeWb.id ? { ...s, campaignMatchId: matchId } : s)),
            /* The old whole-battle field is still written where it is empty,
               and reads as the primary side's, so a record already in the
               Chronicle or the cloud keeps its link. */
            ...(battle.campaignMatchId ? {} : { campaignMatchId: matchId }),
          });
        }
      }

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
          The framework supplies the map, and nothing else does.

          A Carcass Front campaign is played on its own 32 zones, which the
          view passes in from the dataset; the app's twelve world theatres are
          the `classic` map and mean nothing under those rules.

          This used to fall back to the theatres whenever the caller passed
          none, on the reasoning that a Carcass Front campaign with no map is
          worse than one with the wrong map. It is not: seating a Carcass Front
          campaign on the classic map is the app inventing part of someone's
          campaign, which is exactly what it must not do, and the hub already
          refuses to submit the form when the dataset has not loaded
          (`!cfTerritories.length`), so the fallback could only ever fire on
          the way to a wrong answer.
        */
        territories: territories?.length
          ? territories
          : (framework === 'carcass-front' ? [] : DEFAULT_WORLD_THEATERS),
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

    /*
      Move the campaign on to its next game. The ONE writer of that number.

      It had two — `applyPostBattleResults` and `logCampaignMatch`, each
      adding one — and the number belongs to the organiser
      (`docs/CAMPAIGN-SYNC.md`'s authority table). Every Threshold and
      Exploration band in the app reads it through `campaignGameOf`, so a
      member finishing their own post-battle moved everyone's campaign on, two
      members committing game 1 left it reading 3, and neither writer queued a
      `campaign.settings` op — so the value never reached the cloud and the
      next adoption put the server's back.

      Queued like `setTerritoryPerk` and `setCampaignHouseRule`: the client
      sends, and the SERVER refuses a non-organiser (`role !== 'admin'` is a
      403 in `/api/campaigns/sync`). The store is not a security boundary and
      does not pretend to be one.

      `currentTurn` and not `currentGame`: `currentTurn` is the column the
      database actually has, the field the authority table names, and the one
      `campaignGameOf` falls back to. See the op below.
    */
    advanceCampaignGame: () => {
      const campaign = get().campaign;
      if (!campaign?.id) return false;

      set((state) => {
        const next = Math.max(1, Math.floor(state.campaign.currentTurn || 1)) + 1;
        const updatedCampaign: Campaign = {
          ...state.campaign,
          currentTurn: next,
          chronicleLogs: [
            {
              id: `c-${Date.now()}`,
              timestamp: 'Just now',
              text: `Game ${next} begins. Thresholds and Exploration Dice move with it.`,
              category: 'territory' as const,
            },
            ...state.campaign.chronicleLogs,
          ],
        };

        const queued = queueOp(updatedCampaign, {
          kind: 'campaign.settings',
          opId: newOpId(),
          baseVersion: state.campaign.version ?? 1,
          data: { currentTurn: next },
        });

        /*
          A Re-creation offer that was never taken runs out here.

          The Takwin's is *"in the following Quartermaster Step"* — the one
          after the game it died in — so the moment the campaign moves past
          that game the offer is spent and the model is simply dead, which is
          what it was before anyone chose not to pay. Enforced at the instant
          the deadline passes rather than by a roster-door check, because that
          is the instant the book describes, and a model quietly carried on
          the roster for the rest of a campaign is the outcome nobody wants.

          The Golem's *"at any time between battles"* sets no limit, so
          `recreationLapsed` leaves it alone and it stays on offer.

          Each one is logged: a model leaving the Roster because a deadline
          passed is exactly the kind of change a player must be able to find
          again later.
        */
        const lapsedLog: string[] = [];
        const warbandsAfter = state.warbands.map((w) => {
          const lapsed = w.units.filter(
            (u) => recreationLapsed(u.awaitingRecreation, next));
          if (!lapsed.length) return w;

          const cleared = w.units.map((u) => {
            if (!recreationLapsed(u.awaitingRecreation, next)) return u;
            const { awaitingRecreation: _gone, ...rest } = u;
            return { ...rest, isDead: true };
          });
          const { units, fallen } = removeFromRoster(
            { units: cleared, fallen: w.fallen }, lapsed.map((u) => u.id));
          for (const u of lapsed) {
            lapsedLog.push(
              `${u.customName} was not re-created before Game ${next}, and leaves the Roster.`);
          }
          return { ...w, units, fallen, updatedAt: new Date().toISOString() };
        });

        const withLapses: Campaign = lapsedLog.length
          ? {
            ...queued,
            chronicleLogs: [
              ...lapsedLog.map((text, i) => ({
                id: `c-${Date.now()}-r${i}`,
                timestamp: 'Just now',
                text,
                category: 'territory' as const,
              })),
              ...queued.chronicleLogs,
            ],
          }
          : queued;

        storage.saveCampaign(withLapses);
        return {
          campaign: withLapses,
          warbands: lapsedLog.length
            ? persistWarbands(warbandsAfter, state.warbands)
            : state.warbands,
          ...queuedState(withLapses, state.campaignSync),
        };
      });
      return true;
    },

    /*
      Has everyone played the game the campaign is on?

      Read from each member's warband snapshots rather than from a counter, so
      a member who commits a post-battle twice does not count twice and one
      who commits none holds the campaign where it is. A member whose warband
      this device does not hold cannot be checked at all — which is why the
      automatic advance below is confined to the case where there is only one.
    */
    everyMemberPlayedThisGame: () => {
      const state = get();
      const campaign = state.campaign;
      if (!campaign?.id || !campaign.members.length) return false;
      const game = Math.max(1, Math.floor(campaign.currentTurn || 1));

      return campaign.members.every((m) => {
        const wb = state.warbands.find((w) => w.id === m.warbandId);
        if (!wb) return false;
        return (wb.snapshots ?? []).some((snap) =>
          snap.type === 'post_battle' && snap.campaignGame === game);
      });
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

        /* Not the game number's writer either — see `applyPostBattleResults`
           and `advanceCampaignGame` (FD-09a / RR-17). */
        const updatedCampaign: Campaign = {
          ...state.campaign,
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
