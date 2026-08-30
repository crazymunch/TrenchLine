import React from 'react';
import { parseRulesProse, type Block } from './rulesProse';

/**
 * Renders the rulebook prose the pipeline extracts.
 *
 * The generated rules text carries the source document's light Markdown —
 * `###` chapter headings, `####` sub-headings, `-` and `1.` lists, and
 * `**bold**` for the terms the book itself sets in bold (keywords, roll
 * bands, phase names). The Codex used to print that string through
 * `whitespace-pre-line`, so a player reading the Success Roll table saw
 *
 *     #### Success Roll Table (2D6)
 *     - **1-6: Failure / Mishap** - The action fails.
 *
 * asterisks and all. It is the app's single largest body of text and the one
 * a player opens mid-game precisely because they are unsure, so the syntax
 * being visible is not cosmetic — it is the reference view being harder to
 * read than the book it was transcribed from.
 *
 * This is deliberately NOT a Markdown library. The extractor emits four
 * constructs and nothing else (no links, images, tables, code or raw HTML),
 * so a parser for exactly those four is smaller than the dependency, and —
 * because it renders React elements rather than a string of HTML — carries no
 * `dangerouslySetInnerHTML` and no sanitiser to get wrong.
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

        return (
          <p key={i}>{inline(b.text, String(i))}</p>
        );
      })}
    </div>
  );
};
