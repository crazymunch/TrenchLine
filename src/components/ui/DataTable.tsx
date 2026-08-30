'use client';

/**
 * Wide content that scrolls itself. Phase 3.1 of the plan.
 *
 * `globals.css` used to set `overflow-x: hidden` on `body`, which does not fix
 * a too-wide table — it hides the half of it you cannot reach (docs/MOBILE.md
 * §6). Phase 0 removed it, which means anything genuinely wider than a 375px
 * phone now has to own its own horizontal scroll, or it pushes the whole page
 * sideways.
 *
 * A statline is the case this exists for: seven columns that cannot usefully
 * wrap or shrink, read at a table on a phone. So it scrolls inside its own
 * container, with the first column pinned — scrolling a table of numbers is
 * useless if you lose track of which row you are on.
 */
import React from 'react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  /** Pin to the left while the rest scrolls. Use on the name column only. */
  sticky?: boolean;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: React.ReactNode;
  caption?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({ columns, rows, rowKey, empty, caption }: Props<T>) {
  if (!rows.length) {
    return (
      <p className="text-xs sm:text-[11px] font-mono text-[#8E95A5] py-3">
        {empty ?? 'Nothing to show.'}
      </p>
    );
  }

  return (
    // The scroll container, not the page. `overscroll-contain` stops a swipe
    // that runs off the end of the table from dragging the page behind it.
    <div className="-mx-4 sm:mx-0 overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-max border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-[#323846]">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`px-3 py-2 text-xs sm:text-[11px] font-mono font-bold uppercase
                            tracking-wider text-[#8E95A5] whitespace-nowrap
                            ${ALIGN[c.align ?? 'left']}
                            ${c.sticky ? 'sticky left-0 z-10 bg-[#161920]' : ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className="border-b border-[#323846]/50 last:border-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2.5 text-sm sm:text-xs text-[#ECEFF4] whitespace-nowrap
                              ${ALIGN[c.align ?? 'left']}
                              ${c.sticky ? 'sticky left-0 z-10 bg-[#161920]' : ''}`}
                >
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
