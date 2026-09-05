/**
 * What a model's role looks like.
 *
 * The Leader has always been marked — a filled header in `theme-primary`, a
 * crown, and the card's border in the same colour — and nothing else was. So a
 * roster of nine read as one important model and eight identical ones, when
 * three of the eight were an Elite and a pair of Mercenaries with quite
 * different jobs.
 *
 * The other two roles now get the same treatment one step quieter: a tinted
 * header rather than a filled one, a matching left border on it, and an icon
 * beside the role word where the Leader has its crown. A Trooper is the
 * baseline and stays unmarked, which is what makes the other three read.
 *
 * The two role colours are FIXED across all six themes, and globals.css says
 * at length why: inside `.sheet` both `--color-primary` and `--color-accent`
 * resolve to the same faction accent, so a role drawn from either would be the
 * Leader's own colour. `--role-mercenary` is an alias of `--status-legal`,
 * which is what `AddUnitModal` has marked a Mercenary entry with since the
 * recruit sheet was written — two screens disagreeing about what colour a
 * Mercenary is would be worse than neither marking one.
 *
 * **Every class string here is written out in full.** A `bg-${token}/15` would
 * not survive Tailwind's compile — see docs/MOBILE.md §5, and the `MobileNav`
 * bug that rule was written for.
 */
import { Crown, ChevronsUp, Coins, type LucideIcon } from 'lucide-react';
import type { UnitCategory } from '../../types/rules';

export interface RoleStyle {
  /** The card's own border. */
  card: string;
  /** The header strip: ground, text and the left rule. */
  header: string;
  /** The role word in the card's header. */
  label: string;
  icon?: LucideIcon;
  /**
   * The icon's colour where it is shown OFF the card — in the role menu,
   * against the menu's own ground rather than the header's tint.
   *
   * Its own field rather than picked out of `label`: a class read out of
   * another class string by `split(' ')[0]` is a dynamic class name in all but
   * name, and it breaks silently the day someone reorders the string.
   */
  iconOffCard: string;
  /** True where the header is a filled block, so its contents invert. */
  filled: boolean;
}

export const ROLE_STYLES: Record<UnitCategory, RoleStyle> = {
  Leader: {
    card: 'border-theme-primary',
    header: 'bg-theme-primary text-theme-base',
    label: 'text-theme-base font-semibold',
    icon: Crown,
    iconOffCard: 'text-theme-primary',
    filled: true,
  },
  Elite: {
    card: 'border-theme-border hover:border-role-elite',
    header: 'bg-role-elite/15 border-b border-theme-border border-l-2 border-l-role-elite',
    label: 'text-role-elite font-semibold hover:text-theme-text',
    icon: ChevronsUp,
    iconOffCard: 'text-role-elite',
    filled: false,
  },
  Mercenary: {
    card: 'border-theme-border hover:border-role-mercenary',
    header: 'bg-role-mercenary/15 border-b border-theme-border border-l-2 border-l-role-mercenary',
    label: 'text-role-mercenary font-semibold hover:text-theme-text',
    icon: Coins,
    iconOffCard: 'text-role-mercenary',
    filled: false,
  },
  Trooper: {
    card: 'border-theme-border hover:border-theme-muted',
    header: 'bg-theme-elevated border-b border-theme-border',
    label: 'text-theme-muted hover:text-theme-text',
    iconOffCard: 'text-theme-muted',
    filled: false,
  },
};

/**
 * The style for a category.
 *
 * `category` is typed but reaches this from a saved snapshot, and a warband
 * written by an older build — or by an import — can carry a word that is no
 * longer one of the four. Falling back to the Trooper's baseline is the honest
 * answer: it marks the model as nothing in particular, which is exactly what
 * is known about it. It never affects legality, cost or what the model may
 * carry; those are decided elsewhere, from the catalogue.
 */
export const roleStyle = (category: string): RoleStyle =>
  ROLE_STYLES[category as UnitCategory] ?? ROLE_STYLES.Trooper;

/**
 * The order a roster reads in: Leader, Elite, Trooper, Mercenary.
 *
 * The same order the recruit sheet already groups its entries in, and the
 * order the books list a warband's models in — the Leader is the model
 * everything else is built around, and a Mercenary is hired rather than
 * mustered. A roster in recruit order put the Leader wherever it happened to
 * be added and moved nothing when a model was promoted.
 */
const RANK: Record<UnitCategory, number> = {
  Leader: 0,
  Elite: 1,
  Trooper: 2,
  Mercenary: 3,
};

/**
 * Sort models by rank, keeping recruit order within each.
 *
 * A NEW ARRAY: `Array.prototype.sort` is in place, and sorting the store's own
 * `units` would reorder the saved roster as a side effect of rendering it.
 *
 * `Array.prototype.sort` is stable, which is the half of this that matters as
 * much as the ranking: two Troopers keep the order they were recruited in, so
 * promoting one model moves that model and nothing else. An unstable sort
 * would reshuffle the whole roster on every render and there would be no way
 * to tell it apart from a bug.
 *
 * A category outside the four sorts last rather than throwing — see
 * `roleStyle` for why one can arrive at all.
 */
export const byRank = <T extends { profileSnapshot?: { category?: string } }>(units: T[]): T[] =>
  [...units].sort((a, b) => rankOf(a) - rankOf(b));

const rankOf = (u: { profileSnapshot?: { category?: string } }) =>
  RANK[u.profileSnapshot?.category as UnitCategory] ?? Object.keys(RANK).length;
