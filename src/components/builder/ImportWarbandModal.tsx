import React, { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { useStore } from '../../store/useStore';
import { importNewRecruitRoster } from '../../services/newRecruitImporter';
import { decodeRosterFile, warbandFromFile } from '../../services/rosterFile';
import { Warband } from '../../types/warband';
import { 
  UploadCloud, 
  AlertCircle 
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

export const ImportWarbandModal: React.FC<ImportWarbandModalProps> = ({ onClose }) => {
  // `units` already carries the dataset's profiles plus any custom ones. The
  // importer used to resolve against `defaultRules.ts` instead, which gave
  // every imported model a hand-written statline under a name that matched.
  const { units, factions, setActiveWarbandId } = useStore();

  /*
    The ruleset, for the rules that read a WHOLE roster rather than a line of
    it. Today that is the Book of Golems (GOLEM-1): which model the grant
    created is decided from the roster's campaign rules and every model's
    Formulae at once, so `knownUnits` alone cannot answer it.
  */
  const { dataset: importDataset } = useDataset(
    (typeof window !== 'undefined'
      && window.localStorage.getItem('trenchline_ruleset')) || DEFAULT_RULESET_ID);

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
      const { warband, unmatched, golem } = importNewRecruitRoster(
        inputText, units, importDataset ?? undefined);
      setUnmatched(unmatched);
      setFileNotes(golemNote(golem));
      if (warband.units.length === 0) {
        setErrorMsg('No units could be parsed from the input. Please check the export format.');
        setParsedWarband(null);
      } else {
        setParsedWarband(warband);
        setErrorMsg(null);
      }
    } catch (_err) {
      setErrorMsg('Failed to parse roster data. Ensure it is valid NewRecruit JSON, XML, or Text.');
      setParsedWarband(null);
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
        const { warband, unmatched, golem } = importNewRecruitRoster(
          content, units, importDataset ?? undefined);
        setParsedWarband(warband);
        setUnmatched(unmatched);
        setFileNotes(golemNote(golem));
        setErrorMsg(null);
      } catch (_err) {
        setErrorMsg('Error parsing uploaded file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!parsedWarband) return;

    useStore.setState((state) => {
      const updated = [...state.warbands, parsedWarband];
      setActiveWarbandId(parsedWarband.id);
      return { warbands: updated, activeWarbandId: parsedWarband.id };
    });

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
      subtitle="Paste a TrenchLine roster file, NewRecruit JSON, BattleScribe XML or plaintext roster"
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
