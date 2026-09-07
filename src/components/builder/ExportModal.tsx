'use client';

/**
 * Export a roster: as text, as a file, or to a printer.
 *
 * `docs/EXPORT-ARCHITECTURE-BRIEF.md` §4.1 and Codex's `EXPORT-CODEX-REVIEW.md`
 * E5. This used to be an action bar over an empty panel — two hand-built
 * strings with no options at all, a `window.print()` with nothing under it, and
 * a JSON dump of the internal type.
 *
 * Three presets, one rendering toggle, one privacy toggle and two print modes.
 * None of the content is built here: the roster is projected once by
 * `services/rosterPresentation.ts` and read by the text renderer and the print
 * sheet alike, so the two cannot disagree on a total. The file comes from
 * `services/rosterFile.ts`. A preview, because a player choosing between three
 * levels of detail is choosing by looking.
 *
 * Nothing here decides what a preset contains or how anything is escaped.
 */
import React, { useMemo, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Warband } from '../../types/warband';
import { Faction } from '../../types/rules';
import { Printer, Copy, Download, Check, AlertCircle } from 'lucide-react';
import { renderPresented, type TextFlavour, type TextPreset } from '@/services/rosterText';
import { presentRoster } from '@/services/rosterPresentation';
import { RosterPrintSheet, type PrintMode } from './RosterPrintSheet';
import { encodeRosterFile } from '@/services/rosterFile';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';
import { APP_VERSION } from '@/services/appVersion';

interface ExportModalProps {
  warband: Warband;
  faction?: Faction;
  onClose: () => void;
}

const PRINT_LABEL: Record<PrintMode, string> = {
  plain: 'Plain',
  pretty: 'Pretty',
  cards: 'Cards',
};

const PRINT_HINT: Record<PrintMode, string> = {
  plain: 'One column, no ornament. Reads on a mono printer.',
  pretty: 'Statlines, Keywords, abilities and a ruled box for notes on each model.',
  cards: 'One model per card, four to a page, sized to fit A4 and Letter alike. '
       + 'Rules text moves to an appendix so the writing space stays put.',
};

const PRESETS: { id: TextPreset; label: string; hint: string }[] = [
  { id: 'summary', label: 'Summary', hint: 'One line per model. For a chat message.' },
  { id: 'roster', label: 'Roster', hint: 'Loadouts and costs. For a list check before a game.' },
  { id: 'full', label: 'Full', hint: 'Statlines, Keywords and everything the campaign wrote.' },
];

/**
 * A filename from a warband name.
 *
 * The name is text a player typed and this becomes a file on someone's disk,
 * so it is reduced to letters and digits rather than trusted.
 */
const fileNameFor = (name: string, extension: string) => {
  const safe = name.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || 'warband';
  return `${safe}.${extension}`;
};

const download = (contents: string, filename: string, mime: string) => {
  const href = `data:${mime};charset=utf-8,${encodeURIComponent(contents)}`;
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export const ExportModal: React.FC<ExportModalProps> = ({ warband, faction, onClose }) => {
  const [preset, setPreset] = useState<TextPreset>('roster');
  const [flavour, setFlavour] = useState<TextFlavour>('plain');
  const [includePrivate, setIncludePrivate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [printMode, setPrintMode] = useState<PrintMode>('pretty');

  /*
    The ruleset this roster is being exported under, for the text's header and
    the file's manifest. Read here rather than threaded in, so an export cannot
    end up describing a different ruleset from the one the builder is using.
  */
  const { dataset } = useDataset(
    (typeof window !== 'undefined'
      && window.localStorage.getItem('trenchline_ruleset')) || DEFAULT_RULESET_ID);

  const variant = dataset?.variants?.find(
    (v) => v.id === warband.variantId || v.name === warband.variantId);

  /*
    One projection, two readers. The text below and the print sheet render from
    the same object, so they cannot disagree on a total — see
    `services/rosterPresentation.ts`.
  */
  const presented = useMemo(() => presentRoster(warband, {
    factionName: faction?.name,
    variantName: variant?.name,
    rulesetId: dataset?.meta?.rulesetId,
  }, { includePrivate }), [warband, faction, variant, dataset, includePrivate]);

  const text = useMemo(
    () => renderPresented(presented, { preset, flavour, includePrivate }),
    [presented, preset, flavour, includePrivate]);

  /**
   * Copy, and say so when it does not work.
   *
   * `navigator.clipboard` does not exist on an insecure origin and can be
   * refused by permission. The old version called it without awaiting and
   * showed "Copied!" either way — a player told their roster is on the
   * clipboard who then pastes nothing has been lied to, so a failure says so
   * and points at the file instead.
   */
  const handleCopy = async () => {
    setCopyFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      size="xl"
      title="EXPORT ROSTER"
      subtitle="Text to paste, a TrenchLine file to keep, or a printed sheet"
      footer={(
        <div className="flex w-full flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={handleCopy}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded border border-theme-border bg-theme-primary px-3 text-xs font-bold uppercase text-theme-base transition-colors hover:bg-theme-primary-hover"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied' : 'Copy text'}</span>
          </button>
          <button
            onClick={() => download(text, fileNameFor(warband.name, 'txt'), 'text/plain')}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded border border-theme-border bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-text transition-colors hover:bg-theme-border"
          >
            <Download className="h-4 w-4" />
            <span>Save text</span>
          </button>
          <button
            onClick={() => download(
              JSON.stringify(
                encodeRosterFile(warband, dataset, { exporterVersion: APP_VERSION }), null, 2),
              fileNameFor(warband.name, 'trenchline.json'),
              'application/json')}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded border border-theme-primary/50 bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-primary transition-colors hover:bg-theme-border"
          >
            <Download className="h-4 w-4" />
            <span>TrenchLine file</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded border border-theme-border bg-theme-elevated px-3 text-xs font-bold uppercase text-theme-text transition-colors hover:bg-theme-border"
          >
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </button>
        </div>
      )}
    >
      <div className="space-y-4 p-4 sm:p-6">
        {/* Detail. A row of `flex-1` buttons, so the bar takes any number of
            presets without naming a column count — MOBILE.md §5. */}
        <div className="space-y-1.5 print:hidden">
          <span className="eyebrow text-theme-muted">Detail</span>
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                aria-pressed={preset === p.id}
                className={`min-h-[44px] flex-1 rounded border px-2 text-xs font-bold uppercase transition-colors ${
                  preset === p.id
                    ? 'border-theme-primary bg-theme-primary text-theme-base'
                    : 'border-theme-border bg-theme-elevated text-theme-text'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-theme-muted">
            {PRESETS.find((p) => p.id === preset)!.hint}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start print:hidden">
          {/* Rendering, which is not a fourth detail level. */}
          <div className="flex-1 space-y-1.5">
            <span className="eyebrow text-theme-muted">Rendering</span>
            <div className="flex gap-2">
              {(['plain', 'discord'] as TextFlavour[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFlavour(f)}
                  aria-pressed={flavour === f}
                  className={`min-h-[44px] flex-1 rounded border px-2 text-xs font-bold uppercase transition-colors ${
                    flavour === f
                      ? 'border-theme-primary bg-theme-primary text-theme-base'
                      : 'border-theme-border bg-theme-elevated text-theme-text'
                  }`}
                >
                  {f === 'plain' ? 'Plain' : 'Discord'}
                </button>
              ))}
            </div>
          </div>

          {/*
            Disclosure, which is not a detail level either. Asking for full
            rules detail is not consent to paste a player's own writing into a
            public channel, so this is off until it is asked for.
          */}
          <div className="flex-1 space-y-1.5">
            <span className="eyebrow text-theme-muted">Personal writing</span>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded border border-theme-border bg-theme-elevated px-3">
              <input
                type="checkbox"
                checked={includePrivate}
                onChange={(e) => setIncludePrivate(e.target.checked)}
                className="h-5 w-5 rounded border-theme-border text-theme-primary focus:ring-0"
              />
              <span className="text-xs text-theme-text">Include lore, quotes and notes</span>
            </label>
          </div>
        </div>

        {/*
          Print, which is a different medium and so a different choice. Plain
          is one column for a photocopier; Pretty adds statlines, Keywords,
          abilities, the campaign's history and a ruled box per model for
          notes taken mid-game.
        */}
        <div className="space-y-1.5 print:hidden">
          <span className="eyebrow text-theme-muted">Printed sheet</span>
          <div className="flex gap-2">
            {(['plain', 'pretty', 'cards'] as PrintMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setPrintMode(m)}
                aria-pressed={printMode === m}
                className={`min-h-[44px] flex-1 rounded border px-2 text-xs font-bold uppercase transition-colors ${
                  printMode === m
                    ? 'border-theme-primary bg-theme-primary text-theme-base'
                    : 'border-theme-border bg-theme-elevated text-theme-text'
                }`}
              >
                {PRINT_LABEL[m]}
              </button>
            ))}
          </div>
          <p className="text-xs text-theme-muted">{PRINT_HINT[printMode]}</p>
        </div>

        {copyFailed && (
          <p className="flex items-start gap-2 rounded border border-status-warning bg-status-warning/10 p-3 text-xs text-theme-text">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              This browser would not let the page write to the clipboard. Use
              {' '}<strong>Save text</strong>, or select the roster below and copy it by hand.
            </span>
          </p>
        )}

        {/*
          The preview, and what Print currently puts on the page.

          A read-only textarea rather than a `<pre>`: on a phone, selecting text
          out of a block that scrolls both ways is unpleasant, and this gives
          select-all for free where the clipboard API is refused. `text-base`
          because iOS zooms a font under 16px on focus.
        */}
        <label className="sr-only" htmlFor="export-preview">Roster text</label>
        <textarea
          id="export-preview"
          readOnly
          value={text}
          rows={16}
          className="w-full resize-y rounded border border-theme-border bg-theme-base p-3 font-mono text-base leading-relaxed text-theme-text sm:text-xs print-hide"
        />
      </div>

      {/*
        What actually goes on the paper. Hidden on screen entirely — the
        builder already draws the roster, and a second, worse copy of it below
        the export controls would be noise.
      */}
      <RosterPrintSheet roster={presented} mode={printMode} />
    </Sheet>
  );
};
