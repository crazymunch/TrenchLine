'use client';

/**
 * A keyword's rule, looked up mid-activation.
 *
 * On `Sheet` rather than its own `fixed inset-0`, which is where every overlay
 * in the app is going (docs/RESTRUCTURE-PLAN.md §3.1). What that buys here is
 * not layout — the old markup already used `dvh` and scrolled — but the three
 * things it had no way to do for itself: the page behind stops scrolling under
 * your finger, Escape closes it, and Tab cannot walk out into the board
 * underneath.
 *
 * That matters more here than in most sheets. This is the overlay a player
 * opens *during* a game, one-handed, with a phone propped against the terrain,
 * and the thing they want most is to get rid of it again.
 */
import React from 'react';
import { Tag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Sheet } from '../ui/Sheet';

export const KeywordPopover: React.FC = () => {
  const { activeKeyword, setActiveKeyword } = useStore();
  const close = () => setActiveKeyword(null);

  if (!activeKeyword) return null;

  return (
    <Sheet
      open
      onClose={close}
      size="sm"
      title={
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4 flex-shrink-0 text-theme-primary" />
          {activeKeyword.name}
        </span>
      }
      label={`${activeKeyword.name} keyword`}
      footer={
        <button
          onClick={close}
          className="ml-auto rounded bg-theme-elevated px-4 py-2 font-mono text-xs font-bold uppercase text-theme-text transition-colors hover:bg-theme-border"
        >
          Close
        </button>
      }
    >
      <div className="space-y-3">
        <span className="inline-block rounded border border-theme-border bg-theme-elevated px-2 py-0.5 font-mono text-xs font-bold uppercase text-theme-primary sm:text-[10px]">
          {activeKeyword.category} Keyword
        </span>
        <p className="font-mono text-xs font-semibold text-theme-text">{activeKeyword.summary}</p>
        <p className="rounded border border-theme-border bg-theme-base p-3 text-xs leading-relaxed text-theme-muted">
          {activeKeyword.fullText}
        </p>
      </div>
    </Sheet>
  );
};
