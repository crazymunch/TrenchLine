import React from 'react';
import { parseRulesProse} from './rulesProse';

/**
 * Renders the rulebook prose the pipeline extracts.
 *
 * The generated rules text carries the source document's light Markdown —
 * `**Sub-heading**`, `-` and `1.` lists, and `**bold**` for the terms the book
 * itself sets in bold (keywords, roll bands, phase names); `#` headings too,
 * for a source that emits them. The Codex used to print that string through
 * `whitespace-pre-line`, so a player reading the Success Roll table saw
 *
 *     **Risky Success Rolls**
 *     - 2-6 — Failure. The roll is a Failure.
 *
 * asterisks and all. It is the app's single largest body of text and the one
 * a player opens mid-game precisely because they are unsure, so the syntax
 * being visible is not cosmetic — it is the reference view being harder to
 * read than the book it was transcribed from.
 *
 * This is deliberately NOT a Markdown library. The extractor emits five
 * constructs and nothing else — sub-headings, both kinds of list, bold, and
 * pipe tables (no links, images, code or raw HTML) — so a parser for exactly
 * those is smaller than the dependency, and — because it renders React
 * elements rather than a string of HTML — carries no `dangerouslySetInnerHTML`
 * and no sanitiser to get wrong.
 *
 * Anything it does not recognise is rendered as its own text, never dropped.
 */

/** `**bold**` -> <strong>. Everything else passes through as-is. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <strong key={`${keyPrefix}-b${m.index}`} className="font-bold text-theme-text">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export const RulesProse: React.FC<{ source: string | null | undefined; className?: string }> = ({
  source,
  className = '',
}) => {
  const blocks = React.useMemo(() => parseRulesProse(source ?? ''), [source]);

  if (!blocks.length) return null;

  return (
    <div className={`space-y-3 text-sm leading-relaxed text-theme-text ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === 'h') {
          return b.level === 2 ? (
            <h4 key={i} className="eyebrow accent font-bold pt-1">
              {b.text}
            </h4>
          ) : (
            <h5 key={i} className="eyebrow pt-1 text-theme-text">
              {b.text}
            </h5>
          );
        }

        if (b.kind === 'list') {
          const Tag = b.ordered ? 'ol' : 'ul';
          return (
            <Tag key={i} className={`space-y-1.5 ${b.ordered ? 'pl-7' : 'pl-4'}`}>
              {b.items.map((item, j) => (
                <li key={j} className="relative">
                  <span
                    className={`absolute text-theme-primary font-mono tabular-nums ${
                      b.ordered ? '-left-7' : '-left-4'
                    }`}
                    aria-hidden="true"
                  >
                    {b.ordered ? `${j + 1}.` : '▪'}
                  </span>
                  {inline(item, `${i}-${j}`)}
                </li>
              ))}
            </Tag>
          );
        }

        if (b.kind === 'table') {
          /*
            Roll tables, and the phone is where they are read.

            The scroller is the table's own — never the page's — because a
            2D6 table with a sentence in every Result cell is wider than
            375px whatever is done to it, and `overflow-x: hidden` on the
            body to hide that is the thing docs/MOBILE.md forbids. The roll
            column is `whitespace-nowrap` so `2-6` never wraps to two lines
            beside a five-line result.
          */
          return (
            <div key={i} className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[18rem] text-sm border-collapse">
                <thead>
                  <tr>
                    {b.header.map((h, j) => (
                      <th
                        key={j}
                        className={`text-left align-top py-1.5 px-2 eyebrow accent border-b border-theme-border ${
                          j === 0 ? 'whitespace-nowrap w-px' : ''
                        }`}
                      >
                        {inline(h, `${i}-h${j}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r} className="border-b border-theme-border/40 last:border-0">
                      {row.map((c, j) => (
                        <td
                          key={j}
                          className={`align-top py-1.5 px-2 leading-relaxed ${
                            j === 0
                              ? 'whitespace-nowrap w-px font-mono tabular-nums text-theme-primary'
                              : ''
                          }`}
                        >
                          {inline(c, `${i}-${r}-${j}`)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <p key={i}>{inline(b.text, String(i))}</p>
        );
      })}
    </div>
  );
};
