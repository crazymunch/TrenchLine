'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { matchesWarband, warbandCode, type Searchable } from '../../rules/warbandCode';

/**
 * Pick a warband by typing its name, its faction, or its five-character code.
 *
 * It replaces a bare `<select>` whose options were `name (factionId)`. Two
 * problems with that, and the second is the one you see first: a select is as
 * wide as its widest option, so a long warband name pushed it straight out of
 * the dashed box it sat in on the Match Designer. And with more than a handful
 * of rosters — a shared Directory has plenty — scrolling an alphabetical list
 * is the wrong way to find one you can name.
 *
 * Deliberately built rather than pulled in: the list is short, the behaviour is
 * type-filter-and-pick, and a combobox library is a lot of bundle for a phone
 * at a table.
 */

interface WarbandComboboxProps<T extends Searchable> {
  warbands: T[];
  onSelect: (warband: T) => void;
  placeholder?: string;
  /** Rendered under each row — deployed strength, rating, owner. */
  secondary?: (warband: T) => React.ReactNode;
  label: string;
  disabled?: boolean;
}

export function WarbandCombobox<T extends Searchable>({
  warbands,
  onSelect,
  placeholder = 'Search by name or code',
  secondary,
  label,
  disabled,
}: WarbandComboboxProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () => warbands.filter((w) => matchesWarband(w, query)).slice(0, 40),
    [warbands, query],
  );

  // Keep the highlighted row inside the list as it shrinks under typing.
  useEffect(() => { setActive(0); }, [query]);

  // A click anywhere else closes it. Pointerdown rather than click so the list
  // is gone before a tap on something underneath registers.
  useEffect(() => {
    if (!open) return;
    const onAway = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onAway);
    return () => document.removeEventListener('pointerdown', onAway);
  }, [open]);

  const choose = (w: T) => {
    onSelect(w);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    // `min-w-0` and a full-width input: the whole reason the select overflowed
    // its container was that it sized itself to its content.
    <div ref={root} className="relative w-full min-w-0">
      <div className="flex items-center gap-1.5 bg-theme-surface border border-theme-border rounded px-2 focus-within:border-theme-primary">
        <Search className="w-3.5 h-3.5 text-theme-muted flex-shrink-0" />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          /* 16px, so iOS does not zoom the page when it takes focus. */
          className="flex-1 min-w-0 bg-transparent py-2.5 text-base sm:text-xs text-theme-text placeholder:text-theme-muted focus:outline-none disabled:opacity-50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(true); }}
            className="p-1 text-theme-muted hover:text-theme-text flex-shrink-0"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          /*
            Absolute, so a long list does not push the layout around, and capped
            in height with its own scroll. `z-40` clears the sticky app header
            without covering a modal.
          */
          className="absolute left-0 right-0 top-full mt-1 z-40 max-h-64 overflow-y-auto bg-theme-surface border border-theme-primary rounded shadow-2xl"
        >
          {matches.length === 0 ? (
            <p className="px-3 py-3 text-xs text-theme-muted">
              Nothing matches “{query}”.
            </p>
          ) : (
            matches.map((w, i) => (
              <button
                key={w.id}
                role="option"
                aria-selected={i === active}
                onPointerDown={(e) => { e.preventDefault(); choose(w); }}
                onMouseEnter={() => setActive(i)}
                className={`w-full text-left px-3 py-2.5 border-b border-theme-border/60 last:border-b-0 min-h-[44px] ${
                  i === active ? 'bg-theme-elevated' : 'bg-transparent'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold text-theme-text truncate">{w.name}</span>
                  <span className="text-xs sm:text-[10px] font-mono text-theme-primary tracking-widest flex-shrink-0">
                    {warbandCode(w.id)}
                  </span>
                </div>
                {secondary && (
                  <div className="text-xs sm:text-[10px] font-mono text-theme-muted truncate">
                    {secondary(w)}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
