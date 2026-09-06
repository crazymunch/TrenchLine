'use client';

/**
 * Rules text with its Keywords tappable.
 *
 * The glossary has been in the dataset for months — 61 entries, derived from
 * the book rather than paraphrased — and nothing surfaced it. `KeywordPopover`
 * existed, was never imported anywhere, and nothing ever called
 * `setActiveKeyword`, so `activeKeyword` was permanently `null`. It also read
 * fields the pipeline does not ship (`category`, `summary`, `fullText` against
 * the dataset's `type` and `description`), which is the tell that it had never
 * been run against real data. `FEATURES.md` recorded the feature as working.
 *
 * This is the piece that was missing: one component every screen showing rules
 * text can use, so a player reading a Keyword on a unit card, in the Codex, or
 * mid-game on the battle screen can tap it and get the rule — without five
 * screens each inventing their own idea of what a Keyword looks like.
 *
 * Matching lives in `rules/keywordMatch.ts` and is not as simple as it sounds:
 * only 41 of the 89 Keyword strings the sources print are a glossary name
 * spelled exactly. See that file.
 *
 * Mobile: the tap target is the word itself, which is often narrower than the
 * 44px floor `MOBILE.md` sets. That floor is for controls a player hunts for —
 * a nav item, a button. This is an inline affordance inside a sentence, where
 * making the word 44px wide would break the line it sits in. It is padded
 * vertically to give the touch some height, underlined so it reads as tappable
 * rather than merely coloured, and every one of them is also reachable from the
 * Codex's own Keyword list, which does meet the floor.
 */
import React from 'react';

import { useStore } from '../../store/useStore';
import { useDataset } from '../../rules/useDataset';
import { DEFAULT_RULESET_ID } from '../../rules/rulesets';
import { compileGlossary, highlightKeywords, resolveKeyword } from '../../rules/keywordMatch';
import type { Keyword } from '../../types/catalogue';

/**
 * The glossary, fetched rather than passed down.
 *
 * Threading `keywords` through every screen that shows rules text would mean
 * touching five component trees to add one affordance, and would leave the
 * ones nobody remembered silently unlinked — which is how the popover came to
 * exist with nothing mounting it. `useDataset` caches per ruleset and
 * `compileGlossary` memoises on the array, so the cost is one Map lookup.
 *
 * `keywords` stays overridable for a caller that already has a dataset in hand.
 */
const useGlossary = (override?: Keyword[]): CompiledSet => {
  const rulesetId = typeof window !== 'undefined'
    ? window.localStorage.getItem('trenchline_ruleset') || DEFAULT_RULESET_ID
    : DEFAULT_RULESET_ID;
  const { dataset } = useDataset(rulesetId);
  const list = override ?? dataset?.keywords;
  return list?.length ? compileGlossary(list) : null;
};

type CompiledSet = ReturnType<typeof compileGlossary> | null;

interface KeywordTextProps {
  /** The rules text to render. Shown verbatim; only the markup around it changes. */
  children: string | null | undefined;
  /** Override the glossary. Normally omitted; it is fetched. */
  keywords?: Keyword[];
  className?: string;
  /**
   * Render as a `<span>` rather than a `<p>`, for text already inside a
   * paragraph or a table cell.
   */
  inline?: boolean;
}

export const KeywordText: React.FC<KeywordTextProps> = ({
  children, keywords, className, inline,
}) => {
  const setActiveKeyword = useStore((s) => s.setActiveKeyword);
  const compiled = useGlossary(keywords);

  const Tag = inline ? 'span' : 'p';
  const text = children ?? '';

  /* No glossary yet, or nothing to say: the text, unchanged. Never a spinner. */
  if (!compiled || !text) return <Tag className={className}>{text}</Tag>;

  const segments = highlightKeywords(text, compiled);

  return (
    <Tag className={className}>
      {segments.map((seg, i) => (seg.keyword ? (
        <button
          key={i}
          type="button"
          onClick={() => setActiveKeyword(seg.keyword ?? null)}
          /* `text-left` so a Keyword that wraps does not centre its second line. */
          className="inline py-0.5 text-left font-semibold text-theme-primary underline decoration-dotted underline-offset-2 transition-colors hover:text-theme-text"
          aria-label={`${seg.text}: show the Keyword rule`}
        >
          {seg.text}
        </button>
      ) : (
        <React.Fragment key={i}>{seg.text}</React.Fragment>
      )))}
    </Tag>
  );
};

/**
 * One Keyword on its own, as a chip.
 *
 * Separate from the prose path because the whole string is already known to be
 * a Keyword, so it resolves under the looser rule — `Held` and
 * `-3 Injury Modifier` link here and would not mid-sentence.
 *
 * A chip that resolves to nothing renders as a plain chip rather than
 * disappearing or linking to a nearest guess. Five real strings have no
 * glossary entry (`CLERGY`, `LIMITED POTENTIAL`, `MF`, and two that are not one
 * Keyword), and showing them unlinked is the honest answer.
 */
export const KeywordChip: React.FC<{
  name: string;
  keywords?: Keyword[];
  className?: string;
}> = ({ name, keywords, className }) => {
  const setActiveKeyword = useStore((s) => s.setActiveKeyword);
  const compiled = useGlossary(keywords);

  const base = className
    ?? 'rounded border border-theme-border bg-theme-elevated px-1.5 py-0.5 font-mono text-xs uppercase';

  /* The tested resolver, not a second copy of it: it canonicalises first. */
  const match = compiled ? resolveKeyword(name, compiled) : null;

  if (!match) return <span className={`${base} text-theme-muted`}>{name}</span>;

  return (
    <button
      type="button"
      onClick={() => setActiveKeyword(match)}
      className={`${base} min-h-[28px] text-theme-primary transition-colors hover:border-theme-primary hover:text-theme-text`}
      aria-label={`${name}: show the Keyword rule`}
    >
      {name}
    </button>
  );
};
