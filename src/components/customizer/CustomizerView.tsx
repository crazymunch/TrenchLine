import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitProfile, WeaponProfile } from '../../types/rules';
import { GitHubDiffModal } from './GitHubDiffModal';
import { fetchLatestRepoCommit, generateDiffs } from '../../services/githubSync';
import { parseBattleScribeXml } from '../../services/xmlParser';
import { 
  SlidersHorizontal, 
  GitBranch, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  Upload, 
  Check, 
  Sparkles,
  Coins,
  Shield,
  FileCode
} from 'lucide-react';

export const CustomizerView: React.FC = () => {
  const { 
    units, 
    weapons, 
    factions, 
    customUnits, 
    saveCustomUnit, 
    deleteCustomUnit, 
    pendingDiffs, 
    setPendingDiffs 
  } = useStore();

  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0];

  // Form edit states
  const [editName, setEditName] = useState(selectedUnit?.name || '');
  const [editCost, setEditCost] = useState(selectedUnit?.baseCost || 0);
  const [editMov, setEditMov] = useState(selectedUnit?.stats.movement || '6"');
  const [editRng, setEditRng] = useState(selectedUnit?.stats.ranged || '+0');
  const [editMelee, setEditMelee] = useState(selectedUnit?.stats.melee || '+0');
  const [editArmour, setEditArmour] = useState(selectedUnit?.stats.armour || '+0');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [latestCommit, setLatestCommit] = useState<{ sha: string; message: string }>({
    sha: '8e4f1a9c',
    message: 'Official Patch: Adjusted Shocktrooper base cost & Sniper profiles'
  });

  // XML Import state
  const [xmlText, setXmlText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSelectUnit = (uId: string) => {
    setSelectedUnitId(uId);
    const u = units.find((item) => item.id === uId);
    if (u) {
      setEditName(u.name);
      setEditCost(u.baseCost);
      setEditMov(u.stats.movement);
      setEditRng(u.stats.ranged);
      setEditMelee(u.stats.melee);
      setEditArmour(u.stats.armour);
    }
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnit) return;

    const updatedUnit: UnitProfile = {
      ...selectedUnit,
      name: editName,
      baseCost: editCost,
      stats: {
        ...selectedUnit.stats,
        movement: editMov,
        ranged: editRng,
        melee: editMelee,
        armour: editArmour
      },
      isCustom: true
    };

    saveCustomUnit(updatedUnit);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCheckSync = async () => {
    setIsCheckingSync(true);
    const commit = await fetchLatestRepoCommit();
    if (commit) {
      setLatestCommit({
        sha: commit.sha,
        message: commit.commit.message
      });
    }

    // Simulated upstream changes for demo diffing
    const upstreamUnits: UnitProfile[] = units.map((u) => {
      if (u.id === 'na-shocktrooper') {
        return { ...u, baseCost: 40, stats: { ...u.stats, melee: '+2' } };
      }
      if (u.id === 'na-sniper') {
        return { ...u, baseCost: 60 };
      }
      return u;
    });

    const diffs = generateDiffs(units, customUnits, upstreamUnits);
    setPendingDiffs(diffs);
    setIsCheckingSync(false);
    setIsDiffModalOpen(true);
  };

  const handleImportXml = () => {
    if (!xmlText.trim()) return;
    try {
      const parsed = parseBattleScribeXml(xmlText);
      parsed.units.forEach((u) => saveCustomUnit(u));
      setImportStatus(`Successfully imported ${parsed.units.length} units and ${parsed.weapons.length} weapons!`);
      setXmlText('');
    } catch (err) {
      setImportStatus('Error parsing BattleScribe XML. Please ensure valid .cat format.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24">
      
      {/* Header Banner */}
      <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-6 h-6 text-[#D4AF37]" />
            <h1 className="font-gothic font-bold text-2xl text-[#ECEFF4] tracking-wide">
              IN-APP RULE CUSTOMIZER & GITHUB SYNC
            </h1>
          </div>
          <p className="text-xs font-mono text-[#8E95A5]">
            Edit unit stats & costs in-app, import custom BattleScribe XML, and compare with upstream GitHub repos
          </p>
        </div>

        <button
          onClick={handleCheckSync}
          disabled={isCheckingSync}
          className="flex items-center space-x-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded transition-colors shadow"
        >
          <GitBranch className={`w-4 h-4 ${isCheckingSync ? 'animate-spin' : ''}`} />
          <span>{isCheckingSync ? 'Checking Repo...' : 'Sync GitHub Rules'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Unit List Selector */}
        <div className="bg-[#161920] border border-[#323846] rounded-md p-4 space-y-3">
          <h3 className="font-gothic font-bold text-base text-[#ECEFF4] border-b border-[#323846] pb-2">
            SELECT UNIT PROFILE TO EDIT
          </h3>

          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {units.map((u) => {
              const isSelected = u.id === selectedUnitId;
              return (
                <div
                  key={u.id}
                  onClick={() => handleSelectUnit(u.id)}
                  className={`p-2.5 rounded text-xs font-mono cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#20242E] text-[#D4AF37] border border-[#D4AF37]/60 font-bold'
                      : 'bg-[#0C0E12] text-[#8E95A5] hover:text-[#ECEFF4] hover:bg-[#161920]'
                  }`}
                >
                  <div className="truncate mr-2">
                    <span>{u.name}</span>
                    {u.isCustom && (
                      <span className="text-[9px] ml-2 px-1 py-0.2 rounded bg-[#D4AF37]/20 text-[#D4AF37]">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="text-[#ECEFF4] font-bold">{u.baseCost} D</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center/Right Column: Visual Stats Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#323846] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold">Profile Editor</span>
                <h3 className="font-gothic font-bold text-xl text-[#ECEFF4]">{selectedUnit?.name}</h3>
              </div>
              <div className="flex items-center space-x-2">
                {selectedUnit?.isCustom && (
                  <button
                    onClick={() => deleteCustomUnit(selectedUnit.id)}
                    className="p-1.5 text-[#8E95A5] hover:text-[#E53935] rounded transition-colors"
                    title="Reset to Baseline"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                    Unit Title / Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#ECEFF4] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-[#8E95A5] mb-1">
                    Base Ducats Cost
                  </label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs text-[#D4AF37] font-bold font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Statblock inputs */}
              <div className="grid grid-cols-4 gap-3 bg-[#0C0E12] p-4 rounded border border-[#323846]">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#8E95A5] mb-1">MOV</label>
                  <input
                    type="text"
                    value={editMov}
                    onChange={(e) => setEditMov(e.target.value)}
                    className="w-full bg-[#161920] border border-[#323846] rounded p-1.5 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#8E95A5] mb-1">RNG</label>
                  <input
                    type="text"
                    value={editRng}
                    onChange={(e) => setEditRng(e.target.value)}
                    className="w-full bg-[#161920] border border-[#323846] rounded p-1.5 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#8E95A5] mb-1">MELEE</label>
                  <input
                    type="text"
                    value={editMelee}
                    onChange={(e) => setEditMelee(e.target.value)}
                    className="w-full bg-[#161920] border border-[#323846] rounded p-1.5 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#8E95A5] mb-1">ARMOUR</label>
                  <input
                    type="text"
                    value={editArmour}
                    onChange={(e) => setEditArmour(e.target.value)}
                    className="w-full bg-[#161920] border border-[#323846] rounded p-1.5 text-center font-mono font-bold text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                {savedSuccess && (
                  <span className="text-xs font-mono text-[#4E9A6E] flex items-center space-x-1">
                    <Check className="w-4 h-4" />
                    <span>Unit Overrides Saved Locally!</span>
                  </span>
                )}
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 px-5 py-2 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Profile Overrides</span>
                </button>
              </div>
            </form>
          </div>

          {/* BattleScribe XML Raw Ingestion Box */}
          <div className="bg-[#161920] border border-[#323846] rounded-md p-6 space-y-3">
            <div className="flex items-center space-x-2">
              <FileCode className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-gothic font-bold text-base text-[#ECEFF4]">
                IMPORT BATTLESCRIBE / NEWRECRUIT XML (.CAT)
              </h3>
            </div>
            <p className="text-xs font-mono text-[#8E95A5]">
              Paste the raw contents of any `.cat` or `.gst` XML file to parse units and weapons directly into your local database.
            </p>

            <textarea
              value={xmlText}
              onChange={(e) => setXmlText(e.target.value)}
              placeholder="<catalogue id='...' name='...'> ... </catalogue>"
              className="w-full h-24 bg-[#0C0E12] border border-[#323846] rounded p-2 text-xs font-mono text-[#8E95A5] focus:outline-none focus:border-[#D4AF37]"
            />

            <div className="flex items-center justify-between">
              {importStatus && (
                <span className="text-xs font-mono text-[#D4AF37]">{importStatus}</span>
              )}
              <button
                onClick={handleImportXml}
                className="px-4 py-2 bg-[#20242E] hover:bg-[#323846] text-[#ECEFF4] font-mono text-xs font-bold uppercase rounded border border-[#323846] transition-colors ml-auto"
              >
                Parse & Induct XML
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* GitHub 3-Way Diff Modal */}
      {isDiffModalOpen && (
        <GitHubDiffModal
          diffs={pendingDiffs}
          commitSha={latestCommit.sha}
          commitMessage={latestCommit.message}
          onClose={() => setIsDiffModalOpen(false)}
        />
      )}

    </div>
  );
};
