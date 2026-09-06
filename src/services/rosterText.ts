/**
 * A roster as text, at three levels of detail, in two renderings.
 *
 * `docs/EXPORT-ARCHITECTURE-BRIEF.md` §4.1, with Codex's `EXPORT-CODEX-REVIEW.md`
 * E5. The owner asked for "configurable about the level of detail", and
 * configuration is where this kind of feature rots into a matrix nobody reads —
 * so: three presets, one rendering toggle, and one sharing choice.
 *
 *   Summary   name, faction, totals, one line per model      pasting into chat
 *   Roster    the above plus loadouts and per-model cost     a list check
 *   Full      the above plus statlines, keywords, injuries   an archive
 *
 * Plain or Discord is a RENDERING of the same content, not a fourth level.
 *
 * The one thing that is not a detail level either is privacy — see
 * `rosterPresentation.ts`, which applies it, so a second renderer cannot forget.
 *
 * The content itself comes from that shared projection, so this file and the
 * print sheet cannot drift on a number (E1). What lives here is the shape of
 * the lines and the escaping.
 *
 * Two things this states that the old string-concatenation did not:
 *
 *   - It distinguishes what a roster COSTS from what its Warband HOLDS. The old
 *     header printed `Points: 640 / 1000 Ducats | Glory: 3`, where the Glory
 *     was the Strongbox balance sitting beside a list cost, in one sentence,
 *     with no label to tell them apart.
 *   - It escapes what the player wrote before putting it in Discord markdown. A
 *     warband called `**The Ninefold**` used to break the formatting of every
 *     line after it, and a model named `@everyone` used to be a mass ping.
 */
import type { Warband } from '../types/warband';
import { formatUnitCost } from '../rules/savedGlory';
import {
  presentRoster, type PresentationContext, type PresentedModel, type PresentedRoster,
  type PresentedTotals,
} from './rosterPresentation';

export type TextPreset = 'summary' | 'roster' | 'full';
export type TextFlavour = 'plain' | 'discord';

export interface TextOptions {
  preset: TextPreset;
  flavour: TextFlavour;
  /**
   * Lore, quotes and the player's notes.
   *
   * Off by default at every preset. Detail and disclosure are different axes,
   * and the Full preset asking for one should not silently give the other.
   */
  includePrivate?: boolean;
}

export type TextContext = PresentationContext;
export type RosterTotals = PresentedTotals;

/** The totals, for a caller that wants the numbers without the prose. */
export const rosterTotals = (warband: Warband): RosterTotals =>
  presentRoster(warband, {}).totals;

/* --------------------------------------------------------------- rendering */

/**
 * Neutralise what the player typed, for the rendering it is going into.
 *
 * Plain text needs nothing. Discord needs the characters that start a
 * formatting run escaped — a warband called `**The Ninefold**` otherwise turns
 * everything after it bold — and it needs `@everyone` and `@here` not to be a
 * mass ping in someone else's server. The zero-width space is what stops the
 * ping while leaving the text readable and copyable as written.
 */
export function escapeFor(flavour: TextFlavour, text: string): string {
  if (flavour !== 'discord') return text;
  return text
    .replace(/([\\*_~`|>])/g, '\\$1')
    .replace(/@(everyone|here)\b/gi, '@​$1');
}

interface Line { text: string; indent?: number }

const render = (lines: Line[], flavour: TextFlavour): string =>
  lines.map((l) => (flavour === 'discord'
    ? `${'  '.repeat(l.indent ?? 0)}${l.text}`
    : `${'    '.repeat(l.indent ?? 0)}${l.text}`)).join('\n');

const bold = (flavour: TextFlavour, s: string) =>
  flavour === 'discord' ? `**${s}**` : s.toUpperCase();

const italic = (flavour: TextFlavour, s: string) =>
  flavour === 'discord' ? `*${s}*` : s;

/* ------------------------------------------------------------------ output */

export function renderRosterText(
  warband: Warband,
  context: TextContext,
  options: TextOptions,
): string {
  const roster = presentRoster(warband, context, { includePrivate: options.includePrivate });
  return renderPresented(roster, options);
}

/** The same, from an already-built projection. */
export function renderPresented(roster: PresentedRoster, options: TextOptions): string {
  const { preset, flavour } = options;
  const esc = (s: string) => escapeFor(flavour, s);
  const t = roster.totals;
  const lines: Line[] = [];

  lines.push({ text: bold(flavour, esc(roster.name)) });
  lines.push({
    text: [esc(roster.faction), roster.variant ? esc(roster.variant) : null]
      .filter(Boolean).join(' · '),
  });

  /*
    Three separate facts, separately labelled. The old header ran the list cost
    and the Strongbox balance together in one line with one `|` between them.
  */
  lines.push({ text: `List: ${t.listDucats} / ${t.ducatLimit} Ducats`
    + (t.listGlory ? ` · ${t.listGlory} Glory` : '') });
  lines.push({ text: `Strongbox: ${t.strongbox} Ducats · ${t.gloryHeld} Glory held` });
  lines.push({
    text: `${t.models} model${t.models === 1 ? '' : 's'}`
      + (t.dead ? ` · ${t.dead} lost to the campaign` : ''),
  });
  if (roster.ruleset) lines.push({ text: `Rules: ${esc(roster.ruleset)}` });
  lines.push({ text: '' });

  for (const m of roster.models) lines.push(...modelLines(m, options, esc, flavour));

  if (preset !== 'summary' && roster.stash.length) {
    lines.push({ text: bold(flavour, 'Arsenal') });
    for (const s of roster.stash) {
      lines.push({ text: `${esc(s.name)}${s.quantity > 1 ? ` ×${s.quantity}` : ''}`, indent: 1 });
    }
    lines.push({ text: '' });
  }

  if (roster.lore) {
    lines.push({ text: bold(flavour, 'Lore') });
    lines.push({ text: italic(flavour, esc(roster.lore)), indent: 1 });
    lines.push({ text: '' });
  }
  if (roster.notes) {
    lines.push({ text: bold(flavour, 'Notes') });
    lines.push({ text: esc(roster.notes), indent: 1 });
    lines.push({ text: '' });
  }

  return render(lines, flavour).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function modelLines(
  m: PresentedModel,
  options: TextOptions,
  esc: (s: string) => string,
  flavour: TextFlavour,
): Line[] {
  const { preset } = options;
  const out: Line[] = [];

  out.push({
    text: `${bold(flavour, esc(m.name))} — ${esc(m.profileName)}`
      + (m.category ? ` (${esc(m.category)})` : '')
      + ` · ${formatUnitCost(m.ducats, m.glory)}`
      + (m.dead ? ' · dead' : ''),
  });

  if (preset === 'summary') return out;

  if (m.gear.length) out.push({ text: m.gear.map(esc).join(', '), indent: 1 });

  if (preset === 'full') {
    if (m.stats) {
      out.push({
        text: `MOV ${m.stats.movement} · RNG ${m.stats.ranged}`
            + ` · MELEE ${m.stats.melee} · SAVE ${m.stats.armour}`,
        indent: 1,
      });
    }
    if (m.keywords.length) out.push({ text: m.keywords.map(esc).join(', '), indent: 1 });
    if (m.xp) out.push({ text: `${m.xp} XP`, indent: 1 });
    if (m.advancements.length) {
      out.push({ text: `Advancements: ${m.advancements.map(esc).join('; ')}`, indent: 1 });
    }
    if (m.skills.length) out.push({ text: `Skills: ${m.skills.map(esc).join('; ')}`, indent: 1 });
    if (m.injuries.length) {
      out.push({ text: `Injuries: ${m.injuries.map(esc).join('; ')}`, indent: 1 });
    }
    if (m.scars.length) {
      out.push({ text: `Battle Scars: ${m.scars.map(esc).join('; ')}`, indent: 1 });
    }
    if (m.lore) out.push({ text: italic(flavour, esc(m.lore)), indent: 1 });
    if (m.quote) out.push({ text: italic(flavour, `“${esc(m.quote)}”`), indent: 1 });
    if (m.notes) out.push({ text: esc(m.notes), indent: 1 });
  }

  out.push({ text: '' });
  return out;
}
