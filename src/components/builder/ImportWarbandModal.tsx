import React, { useState } from 'react';
import { useOverlay } from '../ui/useOverlay';
import { useStore } from '../../store/useStore';
import { importNewRecruitRoster } from '../../services/newRecruitImporter';
import { Warband } from '../../types/warband';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Check, 
  AlertCircle, 
  Shield, 
  Coins, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';

interface ImportWarbandModalProps {
  onClose: () => void;
}

export const ImportWarbandModal: React.FC<ImportWarbandModalProps> = ({ onClose }) => {
  const { customUnits, warbands, factions, setActiveWarbandId } = useStore();

  // Scroll lock, focus trap and Escape (docs/MOBILE.md §7).
  const overlayRef = useOverlay(true, onClose);
  const [inputText, setInputText] = useState('');
  const [parsedWarband, setParsedWarband] = useState<Warband | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleParse = () => {
    if (!inputText.trim()) {
      setErrorMsg('Please paste NewRecruit export data or upload a roster file.');
      return;
    }

    try {
      const result = importNewRecruitRoster(inputText, customUnits);
      if (result.units.length === 0) {
        setErrorMsg('No units could be parsed from the input. Please check the export format.');
        setParsedWarband(null);
      } else {
        setParsedWarband(result);
        setErrorMsg(null);
      }
    } catch (err) {
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
      try {
        const result = importNewRecruitRoster(content, customUnits);
        setParsedWarband(result);
        setErrorMsg(null);
      } catch (err) {
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
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border-2 border-theme-primary w-full max-w-2xl max-h-[90dvh] rounded-md flex flex-col shadow-2xl overflow-hidden bevel-container">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-theme-base">
          <div className="flex items-center space-x-3">
            <UploadCloud className="w-6 h-6 text-theme-primary" />
            <div>
              <h2 className="font-gothic font-bold text-lg text-theme-text tracking-wide">
                IMPORT NEWRECRUIT WARBAND
              </h2>
              <p className="text-xs font-mono text-theme-muted">
                Paste NewRecruit JSON, BattleScribe XML, or Plaintext roster
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-theme-muted hover:text-white rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

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
              <span className="font-bold text-theme-text">Click to upload NewRecruit exported file</span>
              <span className="text-[10px] text-theme-muted">Supports .json, .ros, .rosz, .txt</span>
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
                  <span className="text-[10px] font-mono text-theme-primary uppercase font-bold">Parsed Warband Preview</span>
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
                    <span className="text-theme-primary">{u.totalCost} D</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border bg-theme-base flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text font-mono text-xs font-bold uppercase rounded"
          >
            Cancel
          </button>

          {parsedWarband && (
            <button
              onClick={handleConfirmImport}
              className="flex items-center space-x-1.5 px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-mono text-xs font-bold uppercase rounded shadow"
            >
              <Check className="w-4 h-4" />
              <span>Induct Warband into TrenchLine</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
