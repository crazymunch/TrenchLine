/**
 * The catalogue entry a model on a roster is an instance of.
 *
 * ID-1. Both modals resolved this with:
 *
 *     dataset.units.find((u) => u.name === snapshot.name || u.name === customName)
 *
 * and **six** entries in the shipped ruleset are called `Homunculus`. `find`
 * takes the first, which is the Court of the Seven-Headed Serpent's. So an
 * Iron Sultanate Takwin Homunculus was resolved to the Court's entry, and
 * every screen driven by that entry's options showed the Court's list:
 * **Additional Head** and **Regenerative** where the Sultanate's entry offers
 * **Two Heads** and **Regenerative Tissue**.
 *
 * That is not cosmetic. FORM-4 resolves a Formula's names against the entry
 * the model resolved to, so the Eye Options' *"without Two Heads"* was being
 * weighed against an entry that does not offer Two Heads at all.
 *
 * ## Id first, faction second, name last
 *
 * The same two-sided rule `rosterRos.catalogueEntryFor` documents, with the
 * faction added because the failure here was a name collision rather than a
 * missing id:
 *
 * 1. **`baseProfileId` against `id`.** What a warband built in the app holds.
 * 2. **`baseProfileId` against `entryId`.** What an IMPORTED warband holds:
 *    `newRecruitImporter` writes the BattleScribe entry id, and a roster
 *    file's `entryId` is `<link>::<shared entry>` — both of the fixture's
 *    Homunculi carry `2f82-e47f-c162-9152`, which is the Iron Sultanate
 *    entry's. The link before `::` chooses the PROVENANCE, not the entry:
 *    `Iron Sultanate.cat` L7368 is commented *"Golem From Book"* and L7389
 *    *"Wisdom One"*, and both target that same shared entry. The app records
 *    that difference as `grantedBy`, which is where it belongs.
 * 3. **Name, within the warband's own faction.** Hydration re-keys the
 *    catalogue, so a saved warband's `baseProfileId` can be the store's id
 *    and not the dataset's, and the name has to carry it. Restricting to the
 *    faction is what stops the Court's `Homunculus` answering for the
 *    Sultanate's.
 * 4. **Name alone.** A Mercenary is on a roster whose faction is not its own,
 *    and a model imported from somebody else's file may carry neither a
 *    resolvable id nor this warband's faction. Last, and only because a
 *    wrong-faction match beats no entry at all for a name that is unique
 *    anyway.
 */
import type { Dataset } from '../types/catalogue';
import { sameFaction } from './variants';

type CatalogueUnit = Dataset['units'][number];

interface RosterModel {
  baseProfileId?: string;
  customName?: string;
  profileSnapshot?: { name?: string; factionId?: string };
}

export function catalogueUnitFor(
  dataset: Dataset | null | undefined,
  unit: RosterModel | null | undefined,
  /** The warband's faction, which breaks a tie the name cannot. */
  factionId?: string,
): CatalogueUnit | undefined {
  const units = dataset?.units ?? [];
  if (!unit) return undefined;

  const id = unit.baseProfileId;
  if (id) {
    const byId = units.find((u) => u.id === id);
    if (byId) return byId;
    const byEntry = units.find((u) => u.entryId === id);
    if (byEntry) return byEntry;
  }

  const names = [unit.profileSnapshot?.name, unit.customName].filter(Boolean);
  if (!names.length) return undefined;
  const named = units.filter((u) => names.includes(u.name));
  if (named.length <= 1) return named[0];

  /* Its own faction first, then the warband's — a model imported from
     somebody else's roster carries the faction it was recruited into. */
  const own = unit.profileSnapshot?.factionId;
  return named.find((u) => own && sameFaction(u.factionId, own))
    ?? named.find((u) => factionId && sameFaction(u.factionId, factionId))
    ?? named[0];
}
