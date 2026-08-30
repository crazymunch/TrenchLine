/**
 * The parser behind `RulesProse`.
 *
 * Split from the component because it is the part with rules in it — the
 * component only maps blocks to elements — and because the repo's vitest runs
 * in a node environment against `src/**\/*.test.ts`, with no renderer.
 *
 * The generated rules text carries the source document's light Markdown:
 * `###` headings, `- ` and `1. ` lists, `**bold**` for the terms the book
 * itself sets in bold, and lines that are nothing but bold as run-in headings.
 * Nothing else — no links, images, tables, code or raw HTML — which is why
 * this is 90 lines rather than a Markdown dependency.
 *
 * Anything it does not recognise is rendered as its own text. It never drops
 * input.
 */

export type Block =
  | { kind: 'h'; level: 2 | 3; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'p'; text: string };

export function parseRulesProse(source: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'p', text: para.join(' ') });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
      list = null;
    }
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  /**
   * True when the text so far stops mid-sentence.
   *
   * The extractor hard-wraps at the source PDF's column width and separates
   * the fragments with a blank line, so a single bullet arrives as
   *
   *     - Bloodletting: An attack made by a friendly model results in the sixth BLOOD
   *
   *     MARKER being placed beside an enemy model.
   *
   * Treating every blank line as a block break — which is what the view this
   * replaces did — printed that as a bullet and a stray orphan paragraph. A
   * fragment that ends without terminal punctuation is a wrapped line, not a
   * finished one, so the next non-construct line continues it. Nothing is
   * dropped either way; the only question is whether two pieces are joined.
   */
  const unfinished = (text: string) => !/[.!?:;"”'’)\]]$/.test(text.trim());

  for (const raw of source.split('\n')) {
    const line = raw.trim();

    if (!line) {
      /*
        A blank line never ends a list.

        The extractor puts one between every pair of bullets as well as inside
        a wrapped one, so a blank line carries no information about where the
        list stops — only the arrival of a different construct does. Closing
        the list here split the Glorious Deeds of every scenario into one
        single-item list per deed.

        It does end a paragraph, but only a paragraph that reads as finished:
        the same wrapping applies to prose.
      */
      if (para.length && !unfinished(para[para.length - 1])) flushPara();
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', level: heading[1].length <= 3 ? 2 : 3, text: heading[2] });
      continue;
    }

    // A line that is nothing but bold is a heading, not a sentence. The
    // scenarios use it that way throughout — `**Objective Markers**`,
    // `**The Dragon**` — because the rulebook sets those as run-in headings.
    const boldHeading = /^\*\*(.+)\*\*$/.exec(line);
    if (boldHeading) {
      flush();
      blocks.push({ kind: 'h', level: 3, text: boldHeading[1] });
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = !!numbered;
      const item = (bullet ?? numbered)![1];
      flushPara();
      // A change of list type starts a new list rather than mixing markers.
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(item);
      continue;
    }

    /*
      Plain text while a list is open.

      If the last item stops mid-sentence this line is the rest of it. If the
      item reads as finished, the list is over and this is the paragraph that
      follows it — the only signal available, since the blank line between
      them means nothing here.
    */
    if (list && list.items.length) {
      if (unfinished(list.items[list.items.length - 1])) {
        list.items[list.items.length - 1] += ` ${line}`;
        continue;
      }
      flushList();
    }

    para.push(line);
  }

  flush();
  return blocks;
}

/**
 * `source` accepts null because `sectionOf` returns null for a section a
 * scenario does not have — Dragon Hunt has THE DRAGON, most scenarios do not.
 * A missing section renders as nothing rather than as an empty frame, and the
 * absence is never filled in with stand-in prose.
 */
