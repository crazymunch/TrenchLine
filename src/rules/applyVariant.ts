import type { UnitProfile, WarbandVariant, Ability } from '@/types/catalogue';

/**
 * A unit profile as a particular Warband Variant fields it.
 *
 * A Variant's ops are the same vocabulary as an errata Layer's — `set`,
 * `addKeyword`, `addAbility`, `replaceAbility` — and `scripts/lib/layers.mjs`
 * has been applying that vocabulary since Phase 1. It applies it at BUILD time,
 * to the whole dataset, which is right for errata and wrong for a Variant: two
 * Warbands of the same faction take different Variants, so the same entry has
 * to read differently for each of them. Nothing applied a Variant's ops at
 * roster-build time at all.
 *
 * What happened instead is that four separate readers each reached into
 * `variant.ops` for one field apiece — `variantLimits` for constraints,
 * `variantForbids` and `variantReveals` for `hidden`, `variantRenames` for
 * `name` — and anything the ops said beyond those four was simply not read. So
 * the Knights of Saint Lazarus could rename the Lazarist Castigator to a
 * Leper-Knight and raise its limit, and could not give it the +2 Melee the
 * same paragraph grants it.
 *
 * This is that missing step, and it supersedes the ad-hoc readers rather than
 * joining them: one function, the whole op vocabulary, applied to one profile.
 *
 * Pure — the dataset's own profile is never mutated. A Variant is a lens on the
 * catalogue, not an edit to it, and a mutation here would leak one Warband's
 * Variant into every other Warband on the device.
 */

/** A Variant op, which is a `LayerOp` narrowed to what a Variant can say. */
type VariantOp = {
  op?: string;
  field?: string;
  value?: unknown;
  keyword?: string;
  ability?: Ability;
  name?: string;
  constraintBound?: 'min' | 'max';
  target?: { kind?: string; id?: string; name?: string };
};

/** `stats.melee` -> set that leaf. Mirrors `setPath` in the build's applier. */
function setPath(obj: Record<string, unknown>, dotted: string, value: unknown): void {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] ??= {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts.at(-1) as string] = value;
}

/** Whether an op is aimed at this profile. */
const hits = (op: VariantOp, profile: UnitProfile) =>
  !!op.target?.id && op.target.id === (profile.entryId || profile.id);

/**
 * Apply a Variant to one profile.
 *
 * Returns the profile unchanged — the identical object — when the Variant has
 * nothing to say about it, so React sees no new reference for the entries a
 * Variant does not touch, which is most of them.
 */
export function applyVariant(
  profile: UnitProfile,
  variant: WarbandVariant | undefined,
): UnitProfile {
  const ops = ((variant?.ops ?? []) as VariantOp[]).filter((op) => hits(op, profile));
  if (!ops.length) return profile;

  // One shallow clone, then deep-clone only the branches an op writes to.
  const next: UnitProfile = { ...profile };

  for (const op of ops) {
    switch (op.op) {
      case 'set': {
        const field = op.field ?? '';
        /*
          Constraints are read by `variantLimits`, which resolves them against
          the profile's own constraint list and the op's `constraintBound`.
          Writing them here as well would double-apply an increment.
        */
        if (field.startsWith('constraint:')) break;
        // `hidden` decides whether the entry is on the list at all, which is a
        // question about the LIST rather than about this profile.
        if (field === 'hidden') break;
        if (field.startsWith('stats.')) next.stats = { ...next.stats };
        setPath(next as unknown as Record<string, unknown>, field, op.value);
        break;
      }

      case 'addKeyword':
        if (op.keyword && !next.keywords.includes(op.keyword)) {
          next.keywords = [...next.keywords, op.keyword];
        }
        break;

      case 'setKeywords':
        next.keywords = [...((op as { keywords?: string[] }).keywords ?? [])];
        break;

      case 'addAbility':
        if (op.ability) {
          const at = next.abilities.findIndex(
            (a) => a.name.toLowerCase() === op.ability!.name.toLowerCase());
          next.abilities = [...next.abilities];
          // Replace in place where the catalogue already carries the name: two
          // abilities of one name is a duplicate, not a rule. The build's
          // applier makes the same call, for the same reason.
          if (at >= 0) next.abilities[at] = op.ability;
          else next.abilities.push(op.ability);
        }
        break;

      /*
        "…replace the Whip of God Ability with the Knightly Code Ability."

        An ability named in the op but absent from the profile is left alone
        rather than appended. The op describes an exchange, and performing half
        of one — granting the new ability without removing the old — hands the
        model a rule the book took away from it.
      */
      case 'replaceAbility': {
        if (!op.name || !op.ability) break;
        const at = next.abilities.findIndex(
          (a) => a.name.toLowerCase() === op.name!.toLowerCase());
        if (at < 0) break;
        next.abilities = [...next.abilities];
        next.abilities[at] = op.ability;
        break;
      }

      default:
        break;
    }
  }

  return next;
}
