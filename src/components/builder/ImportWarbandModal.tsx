import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { importNewRecruitRoster } from '../../services/newRecruitImporter';
import {
  importTrenchCompanionWarband, priceDifferenceLine,
} from '../../services/trenchCompanionImporter';
import { decodeRosterFile, warbandFromFile } from '../../services/rosterFile';
import { Warband } from '../../types/warband';
import {
  UploadCloud,
  AlertCircle,
  Link2,
  Loader2,
} from 'lucide-react';
import { unitGlory, formatUnitCost } from '@/rules/savedGlory';
import { useDataset } from '@/rules/useDataset';
import { DEFAULT_RULESET_ID } from '@/rules/rulesets';

interface ImportWarbandModalProps {
  onClose: () => void;
}

/**
 * What the Book of Golems decided, as a note the player reads.
 *
 * Shown ONLY where it matters: a roster that does not hold the grant says
 * nothing, because every import would otherwise carry a line about a rule the
 * warband has never earned. Where the grant is held and the roster cannot say
 * which model it created, the reason is the note — and the model is marked by
 * hand on its card, never guessed at here.
 */
const golemNote = (
  golem: { markedIndex: number | null; reason: string } | undefined,
): string[] => {
  if (!golem) return [];
  /* "This ruleset carries no Book of Golems" and "This roster does not hold
     the Book of Golems" are both silence: nothing was earned, so there is
     nothing to report. */
  if (golem.markedIndex === null && /carries no|does not hold/i.test(golem.reason)) return [];
  return [golem.reason];
};

/**
 * The Skills the import did not count as an Advancement Roll, said out loud.
 *
 * Order 44 item 2: the importer computed this and the modal dropped it on the
 * floor, so a roster carrying a Patron's Skill with no bracketed roll came in
 * counted as no roll taken, correctly, and silently. A player looking at a model
 * with three Skills and one roll taken has no way to tell a correct reading from
 * a parse failure — which is the whole reason the importer reports it.
 *
 * One line per model, because the names are what a player checks against their
 * own sheet.
 */
const noRollNote = (
  entries: { model: string; skills: string[] }[] | undefined,
): string[] => {
  if (!entries?.length) return [];
  return [
    'These Skills carry no 2D6 total on the roster, so they count as no '
    + 'Advancement Roll taken — which is right for a Patron\'s Skill or a Glory '
    + 'Item\'s. If one of them WAS rolled for, add the total on the model\'s '
    + 'advancement sheet.',
    ...entries.map((e) => `${e.model}: ${e.skills.join(', ')}`),
  ];
};

export const ImportWarbandModal: React.FC<ImportWarbandModalProps> = ({ onClose }) => {
  // `units` already carries the dataset's profiles plus any custom ones. The
  // importer used to resolve against `defaultRules.ts` instead, which gave
  // every imported model a hand-written statline under a name that matched.
  const { units, factions, importWarband } = useStore();

  /*
    The ruleset, for the rules that read a WHOLE roster rather than a line of
    it. Today that is the Book of Golems (GOLEM-1): which model the grant
    created is decided from the roster's campaign rules and every model's
    Formulae at once, so `knownUnits` alone cannot answer it.
  */
  const rulesetId = (typeof window !== 'undefined'
    && window.localStorage.getItem('trenchline_ruleset')) || DEFAULT_RULESET_ID;
  const { dataset: importDataset } = useDataset(rulesetId);

  /**
   * Record which ruleset the import resolved against (RV-1).
   *
   * An imported warband was the one kind that could never be converted: the
   * conversion report has to know what it is converting FROM, and an import
   * that did not say left the warband with no answer for the rest of its life.
   */
  const withRuleset = (w: Warband): Warband => ({ ...w, rulesetId });

  const [inputText, setInputText] = useState('');
  const [parsedWarband, setParsedWarband] = useState<Warband | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  /*
    Roster lines the catalogues have no profile for.

    They are shown, not silently dropped and not silently invented. The import
    used to give an unmatched line a made-up 35-Ducat Trooper with a made-up
    statline, so a roster with one name spelled differently imported "cleanly"
    and was wrong from that line on.
  */
  const [unmatched, setUnmatched] = useState<string[]>([]);
  /*
    What a TrenchLine roster file could not tell us.

    A v0 file — the raw dump the app used to write — records no ruleset at all,
    and a v1 file can carry fields a build does not know. Both are shown rather
    than swallowed: see `services/rosterFile.ts`.
  */
  const [fileNotes, setFileNotes] = useState<string[]>([]);
  /*
    The Trench Companion field, beside the NewRecruit upload.

    Its own state rather than a second use of `inputText`: one is a link that
    is fetched and the other is a file that is parsed, and sharing a box would
    mean guessing which the player meant. A link in the paste box would be
    handed to the roster parsers, which would answer "not valid NewRecruit
    JSON" to something that is not a roster at all.
  */
  const [tcRef, setTcRef] = useState('');
  const [tcBusy, setTcBusy] = useState(false);
  /* The whole of the import's report, shown before the player confirms. */
  const [notes, setNotes] = useState<string[]>([]);
  const [prices, setPrices] = useState<string[]>([]);

  /**
   * Read one pasted or uploaded blob.
   *
   * A TrenchLine file first, because it is unambiguous — it names its own
   * format — and because falling through to the NewRecruit parser would answer
   * "Failed to parse roster data. Ensure it is valid NewRecruit JSON" to a
   * file this app wrote itself.
   *
   * A TrenchLine file that is recognised but REFUSED (a newer schema version,
   * a hostile shape) reports its own reason and stops there. Retrying it as a
   * NewRecruit roster would replace an exact answer with a wrong one.
   */
  const readRoster = (content: string) => {
    const looksLikeOurs = content.includes('trenchline.roster');
    const decoded = decodeRosterFile(content);
    if (decoded.ok) {
      setParsedWarband(warbandFromFile(decoded.file, 'clone'));
      setFileNotes(decoded.warnings);
      setUnmatched([]);
      setNotes([]);
      setPrices([]);
      setErrorMsg(null);
      return true;
    }
    if (looksLikeOurs) {
      setParsedWarband(null);
      setFileNotes([]);
      setErrorMsg(decoded.reason);
      return true;
    }
    return false;
  };

  const handleParse = () => {
    if (!inputText.trim()) {
      setErrorMsg('Please paste NewRecruit export data or upload a roster file.');
      return;
    }

    if (readRoster(inputText)) return;

    try {
      const { warband, unmatched, golem, skillsWithNoRoll } = importNewRecruitRoster(
        inputText, units, importDataset ?? undefined);
      setUnmatched(unmatched);
      setFileNotes(golemNote(golem));
      setNotes(noRollNote(skillsWithNoRoll));
      setPrices([]);
      if (warband.units.length === 0) {
        setErrorMsg('No units could be parsed from the input. Please check the export format.');
        setParsedWarband(null);
      } else {
        setParsedWarband(withRuleset(warband));
        setErrorMsg(null);
      }
    } catch (_err) {
      setErrorMsg('Failed to parse roster data. Ensure it is valid NewRecruit JSON, XML, or Text.');
      setParsedWarband(null);
    }
  };

  /**
   * Fetch a Trench Companion warband and read it.
   *
   * The fetch is a POST to our own route, which is the only thing that talks
   * to their host — see `src/app/api/import/trench-companion/route.ts` for
   * why, and for the etiquette. Every failure is shown with whatever the
   * route said about it, including the upstream status: there is no cached
   * copy and no partial warband to fall back on (rule 2).
   */
  const handleTrenchCompanion = async () => {
    if (!tcRef.trim()) {
      setErrorMsg('Paste a Trench Companion share link, or the warband id on its own.');
      return;
    }
    if (!importDataset) {
      setErrorMsg('The ruleset is still loading. Try again in a moment.');
      return;
    }

    setTcBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/import/trench-companion', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ref: tcRef.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        /* The route explains itself and names the upstream status. Pass it
           through rather than replacing it with a sentence of our own. */
        setErrorMsg(body?.error ?? `That import failed (HTTP ${res.status}).`);
        setParsedWarband(null);
        return;
      }

      const report = importTrenchCompanionWarband(body, importDataset);
      setParsedWarband(withRuleset(report.warband));
      setUnmatched(report.unmatched);
      setNotes([...report.warnings, ...report.unmapped]);
      setPrices(report.priceDifferences.map(priceDifferenceLine));
      setFileNotes([]);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message
        : 'That warband could not be read. Nothing was imported.');
      setParsedWarband(null);
    } finally {
      setTcBusy(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setInputText(content);
      if (readRoster(content)) return;
      try {
        const { warband, unmatched, golem, skillsWithNoRoll } = importNewRecruitRoster(
          content, units, importDataset ?? undefined);
        setParsedWarband(withRuleset(warband));
        setUnmatched(unmatched);
        setFileNotes(golemNote(golem));
        setNotes(noRollNote(skillsWithNoRoll));
        setPrices([]);
        setErrorMsg(null);
      } catch (_err) {
        setErrorMsg('Error parsing uploaded file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!parsedWarband) return;

    /*
      Through the store's own door, not `useStore.setState`.

      The direct write it used to make wrote the warband into memory and
      NOWHERE ELSE: `persistWarbands` is what saves to this device and queues
      the push, and skipping it meant an imported roster survived exactly
      until the tab was reloaded. It also skipped the founding snapshot, so
      the History screen opened on an imported warband with nothing in it.
      Found while wiring the Trench Companion import (CI-1), which lands in
      the same place.
    */
    importWarband(parsedWarband);
    onClose();
  };

  const faction = factions.find((f) => f.id === parsedWarband?.factionId);
  const totalCost = parsedWarband?.units.reduce((sum, u) => sum + u.totalCost, 0) || 0;

  return (
    <Sheet
      open
      onClose={onClose}
      size="lg"
      title="Import a warband"
      subtitle="A TrenchLine roster file, a NewRecruit or BattleScribe export, or a Trench Companion share link"
      /*
        The import had no way to finish.

        `handleConfirmImport` existed and was wired to nothing: you could paste
        a roster, watch it parse, read the preview of every warrior and their
        cost — and then only close the dialog. The whole feature was
        unreachable, and it looked like it worked right up to the last step.
        Found by turning the linter on (4.4); it was the only call site
        `no-unused-vars` flagged that was a bug rather than a leftover.
      */
      footer={parsedWarband ? (
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow truncate">
            {parsedWarband.units.length} warriors &middot; {totalCost} Ducats
          </span>
          <button
            onClick={handleConfirmImport}
            className="px-4 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-mono text-xs font-bold uppercase tracking-wider transition-colors flex-shrink-0"
          >
            Import {parsedWarband.name}
          </button>
        </div>
      ) : undefined}
    >
      {/* Content */}
      <div className="p-6 overflow-y-auto space-y-4 flex-1">
  
        {/* File Upload Zone */}
        <div className="border-2 border-dashed border-theme-border hover:border-theme-primary/50 rounded-md p-4 text-center space-y-2 bg-theme-base">
          <input
            type="file"
            id="roster-file"
            accept=".json,.xml,.ros,.rosz,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label
            htmlFor="roster-file"
            className="cursor-pointer flex flex-col items-center space-y-1 text-xs font-mono text-theme-muted hover:text-theme-text"
          >
            <UploadCloud className="w-8 h-8 text-theme-primary mb-1" />
            <span className="font-bold text-theme-text">Click to upload a TrenchLine or NewRecruit file</span>
            <span className="text-xs sm:text-[10px] text-theme-muted">Supports .json, .ros, .rosz, .txt</span>
          </label>
        </div>

        {/*
          Trench Companion, beside the NewRecruit upload.

          A link or a bare id, fetched by our own route on this click and
          never by the browser — see the route for the etiquette. Its own
          field and its own button, because it is a different act from
          parsing a file: this one leaves the machine.
        */}
        <div className="space-y-1.5">
          <label
            htmlFor="tc-ref"
            className="block text-xs font-mono uppercase text-theme-muted"
          >
            Or import from Trench Companion:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="tc-ref"
              type="text"
              inputMode="url"
              value={tcRef}
              onChange={(e) => setTcRef(e.target.value)}
              placeholder="trench-companion.com/warband/detail/225201"
              className="flex-1 min-h-[44px] bg-theme-base border border-theme-border rounded px-3 text-base sm:text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
            />
            <button
              type="button"
              onClick={handleTrenchCompanion}
              disabled={tcBusy}
              className="min-h-[44px] px-4 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/40 rounded font-mono text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {tcBusy
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Link2 className="w-4 h-4" />}
              {tcBusy ? 'Fetching' : 'Fetch'}
            </button>
          </div>
          <p className="text-xs text-theme-muted leading-relaxed">
            Your own share link, read once, when you press Fetch. Nothing is stored and nothing
            is sent but the warband id. Prices and statlines come from this app&rsquo;s ruleset,
            and anything Trench Companion has that this ruleset does not is listed rather than
            guessed at.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-mono uppercase text-theme-muted">
            Or Paste Raw Export Data:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste JSON, BattleScribe XML, or plaintext army list here..."
            className="w-full h-32 bg-theme-base border border-theme-border rounded p-3 text-xs font-mono text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary"
          />
          <button
            onClick={handleParse}
            className="px-4 py-1.5 bg-theme-elevated hover:bg-theme-border text-theme-primary border border-theme-primary/40 rounded font-mono text-xs font-bold uppercase transition-colors"
          >
            Parse Roster Data
          </button>
        </div>

        {/*
          Lines we could not resolve.

          Shown above the preview, not below it, because the preview is what a
          player checks before pressing Import — and a warrior that is missing
          from it is the thing they most need to know about. Each name is
          printed as written in their export, so they can see which spelling
          the catalogues do not have.
        */}
        {unmatched.length > 0 && (
          <div className="border border-status-warning bg-status-warning/10 p-3 space-y-1.5">
            <span className="eyebrow text-status-warning flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {unmatched.length} {unmatched.length === 1 ? 'entry' : 'entries'} not imported
            </span>
            <p className="text-xs text-theme-text leading-relaxed">
              These lines have no profile in the catalogues, so they were left out rather
              than given invented statlines. Check the spelling against the Codex, or add
              them by hand after importing.
            </p>
            <ul className="font-mono text-xs text-theme-muted space-y-0.5 pl-4">
              {unmatched.map((n, i) => (
                <li key={i} className="list-disc">{n}</li>
              ))}
            </ul>
          </div>
        )}

        {/*
          What a TrenchLine file could not tell us.

          Above the preview for the same reason the unmatched list is: "this
          file records no ruleset" changes what a player should check before
          importing, and a file from an older build says exactly that.
        */}
        {fileNotes.length > 0 && (
          <div className="border border-theme-border bg-theme-base p-3 space-y-1.5">
            <span className="eyebrow text-theme-muted flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              About this file
            </span>
            <ul className="text-xs text-theme-muted space-y-1 pl-4">
              {fileNotes.map((n, i) => <li key={i} className="list-disc">{n}</li>)}
            </ul>
          </div>
        )}

        {/*
          Where their price and ours differ.

          Its own block rather than a line in the notes, because it is the one
          part of the report that changes what the roster is WORTH: a model
          5 Ducats cheaper here is a warband that may now be legal where it was
          not, or the other way round. The roster is priced from this app's
          ruleset either way — rule 1 — and this says where that moved.
        */}
        {prices.length > 0 && (
          <div className="border border-theme-border bg-theme-base p-3 space-y-1.5">
            <span className="eyebrow text-theme-muted flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {prices.length} {prices.length === 1 ? 'price differs' : 'prices differ'}
            </span>
            <p className="text-xs text-theme-text leading-relaxed">
              These are priced here from this app&rsquo;s ruleset, which is where every cost in
              TrenchLine comes from. Their figures are shown so you can see what moved.
            </p>
            <ul className="font-mono text-xs text-theme-muted space-y-0.5 pl-4">
              {prices.map((n, i) => <li key={i} className="list-disc">{n}</li>)}
            </ul>
          </div>
        )}

        {/*
          Everything else the import wants to say: their Preview rules, a debt
          this app has no home for, a field that is not mapped yet. Above the
          preview with the rest, because all of it changes what a player should
          check before pressing Import.
        */}
        {notes.length > 0 && (
          <div className="border border-theme-border bg-theme-base p-3 space-y-1.5">
            <span className="eyebrow text-theme-muted flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              About this import
            </span>
            <ul className="text-xs text-theme-muted space-y-1 pl-4">
              {notes.map((n, i) => <li key={i} className="list-disc leading-relaxed">{n}</li>)}
            </ul>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 bg-theme-accent/20 border border-theme-accent rounded text-xs font-mono text-status-error flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Preview */}
        {parsedWarband && (
          <div className="p-4 bg-theme-elevated border-2 border-theme-primary rounded-md space-y-3 shadow-lg">
            <div className="flex items-center justify-between border-b border-theme-border pb-2">
              <div>
                <span className="text-xs sm:text-[10px] font-mono text-theme-primary uppercase font-bold">Parsed Warband Preview</span>
                <h3 className="font-gothic font-bold text-lg text-theme-text">{parsedWarband.name}</h3>
                <span className="text-xs font-mono text-theme-muted">
                  Faction: {faction?.name || parsedWarband.factionId}
                </span>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-theme-primary">{totalCost} / {parsedWarband.ducatLimit} Ducats</div>
                <div className="text-theme-muted">{parsedWarband.units.length} Warriors</div>
              </div>
            </div>

            {/* Units List */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {parsedWarband.units.map((u, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-mono bg-theme-surface px-2.5 py-1 rounded border border-theme-border">
                  <span className="text-theme-text font-semibold">{u.customName}</span>
                  <span className="text-theme-primary whitespace-nowrap">{formatUnitCost(u.totalCost, unitGlory(u))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Sheet>
  );
};
