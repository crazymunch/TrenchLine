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
 * The one thing that is not a detail level either is privacy. Lore, a model's
 * quote and the player's own notes are personal writing, and "I wanted the full
 * rules detail" is not consent to paste them into a public channel — so they
 * are their own opt-in, default off, at every preset (E5).
 *
 * Three things this states that the old string-concatenation did not:
 *
 *   - It distinguishes what a roster COSTS from what its Warband HOLDS. The old
 *     header printed `Points: 640 / 1000 Ducats | Glory: 3`, where the Glory
 *     was the Strongbox balance sitting beside a list cost, in one sentence,
 *     with no label to tell them apart.
 *   - It names the ruleset and the Variant. A roster's legality is meaningless
 *     without them and a pasted list is often read by someone else.
 *   - It escapes what the player wrote before putting it in Discord markdown. A
 *     warband called `**The Ninefold**` used to break the formatting of every
 *     line after it, and a model named `@everyone` used to be a mass ping.
 */
import type { ActiveUnit, Warband } from '../types/warband';
import { rosterGlory, unitGlory, formatUnitCost } from '../rules/savedGlory';

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

export interface TextContext {
  factionName?: string;
  variantName?: string;
  /** Which rules this roster was built under, so a reader can check it. */
  rulesetId?: string;
}

/* ------------------------------------------------------------- the numbers */

export interface RosterTotals {
  /** What the models and their gear cost — the list. */
  listDucats: number;
  listGlory: number;
  /** The budget the list is measured against. */
  ducatLimit: number;
  /** Ducats in the Strongbox. NOT part of the list cost. */
  strongbox: number;
  /** Glory the Warband holds. Also not part of the list cost. */
  gloryHeld: number;
  models: number;
  /** Models on the roster the campaign has killed. */
  dead: number;
}

export function rosterTotals(warband: Warband): RosterTotals {
  const units = warband.units ?? [];
  return {
    listDucats: units.reduce((n, u) => n + (u.totalCost ?? 0), 0),
    listGlory: rosterGlory(units),
    ducatLimit: warband.ducatLimit ?? 0,
    strongbox: warband.treasuryDucats ?? 0,
    gloryHeld: warband.gloryPoints ?? 0,
    models: units.filter((u) => !u.isDead).length,
    dead: units.filter((u) => u.isDead).length,
  };
}

/* --------------------------------------------------------------- rendering */

/**
 * Neutralise what the player typed, for the rendering it is going into.
 *
 * Plain text needs nothing. Discord needs the six characters that start a
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
  const { preset, flavour } = options;
  const esc = (s: string) => escapeFor(flavour, s);
  const t = rosterTotals(warband);
  const lines: Line[] = [];

  lines.push({ text: bold(flavour, esc(warband.name || 'Unnamed Warband')) });
  lines.push({
    text: [
      esc(context.factionName || warband.factionId || 'Unknown faction'),
      context.variantName ? esc(context.variantName) : null,
    ].filter(Boolean).join(' · '),
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
  if (context.rulesetId) lines.push({ text: `Rules: ${esc(context.rulesetId)}` });
  lines.push({ text: '' });

  for (const u of warband.units ?? []) {
    lines.push(...modelLines(u, options, esc, flavour));
  }

  const stash = warband.armoryStash ?? [];
  if (preset !== 'summary' && stash.length) {
    lines.push({ text: bold(flavour, 'Arsenal') });
    for (const s of stash) {
      lines.push({ text: `${esc(s.name)}${s.quantity > 1 ? ` ×${s.quantity}` : ''}`, indent: 1 });
    }
    lines.push({ text: '' });
  }

  if (options.includePrivate && warband.lore) {
    lines.push({ text: bold(flavour, 'Lore') });
    lines.push({ text: italic(flavour, esc(warband.lore)), indent: 1 });
    lines.push({ text: '' });
  }
  if (options.includePrivate && warband.notes) {
    lines.push({ text: bold(flavour, 'Notes') });
    lines.push({ text: esc(warband.notes), indent: 1 });
    lines.push({ text: '' });
  }

  return render(lines, flavour).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function modelLines(
  u: ActiveUnit,
  options: TextOptions,
  esc: (s: string) => string,
  flavour: TextFlavour,
): Line[] {
  const { preset } = options;
  const out: Line[] = [];
  const glory = unitGlory(u);
  const profile = u.profileSnapshot;

  const head = `${bold(flavour, esc(u.customName || profile?.name || 'Warrior'))}`
    + ` — ${esc(profile?.name ?? '')}`
    + (profile?.category ? ` (${esc(String(profile.category))})` : '')
    + ` · ${formatUnitCost(u.totalCost ?? 0, glory)}`
    + (u.isDead ? ' · dead' : '');
  out.push({ text: head });

  if (preset === 'summary') return out;

  const gear = [
    ...(u.equippedWeapons ?? []).map((w) => w.name),
    ...(u.equippedArmour ?? []).map((a) => a.name),
    ...(u.equippedEquipment ?? []).map((e) => e.name),
  ].filter(Boolean);
  if (gear.length) out.push({ text: gear.map((g) => esc(g)).join(', '), indent: 1 });

  if (preset === 'full') {
    const s = profile?.stats;
    if (s) {
      out.push({
        text: `MOV ${s.movement} · RNG ${s.ranged} · MELEE ${s.melee} · SAVE ${s.armour}`,
        indent: 1,
      });
    }
    /* The snapshot carries them on `stats`, which is where the recruit path
       records the catalogue's Keyword row. */
    const keywords: string[] = profile?.stats?.keywords ?? [];
    if (keywords.length) {
      out.push({ text: keywords.map((k) => esc(String(k))).join(', '), indent: 1 });
    }

    if (u.xp) out.push({ text: `${u.xp} XP`, indent: 1 });
    if (u.advancements?.length) {
      out.push({ text: `Advancements: ${u.advancements.map(esc).join('; ')}`, indent: 1 });
    }
    if (u.skills?.length) {
      out.push({ text: `Skills: ${u.skills.map((k) => esc(k.name)).join('; ')}`, indent: 1 });
    }
    if (u.injuries?.length) {
      out.push({ text: `Injuries: ${u.injuries.map(esc).join('; ')}`, indent: 1 });
    }
    if (u.scars?.length) {
      out.push({ text: `Battle Scars: ${u.scars.map((k) => esc(k.name ?? '')).join('; ')}`, indent: 1 });
    }
    if (options.includePrivate && u.lore) {
      out.push({ text: italic(flavour, esc(u.lore)), indent: 1 });
    }
    if (options.includePrivate && u.quote) {
      out.push({ text: italic(flavour, `“${esc(u.quote)}”`), indent: 1 });
    }
    if (options.includePrivate && u.notes) {
      out.push({ text: esc(u.notes), indent: 1 });
    }
  }

  out.push({ text: '' });
  return out;
}
