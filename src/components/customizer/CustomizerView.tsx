'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { UnitProfile, WeaponProfile, ArmourProfile, EquipmentItem } from '../../types/rules';
import { GitHubDiffModal } from './GitHubDiffModal';
import { fetchLatestRepoCommit } from '../../services/githubSync';
import { soundEffects } from '../../services/soundEffects';
import { 
  SlidersHorizontal, 
  GitBranch, 
  Trash2, 
  Save, 
  DownloadCloud, 
  Check, 
  FileCode,
  Sparkles,
  Layers,
  AlertCircle,
  Swords,
  Shield,
  Package,
  Plus
} from 'lucide-react';

export const CustomizerView: React.FC = () => {
  const { 
    units, 
    customUnits, 
    saveCustomUnit, 
    deleteCustomUnit, 
    weapons,
    customWeapons,
    saveCustomWeapon,
    deleteCustomWeapon,
    armour,
    customArmour,
    saveCustomArmour,
    deleteCustomArmour,
    equipment,
    customEquipment,
    saveCustomEquipment,
    deleteCustomEquipment,
    pendingDiffs, 
    setPendingDiffs 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'units' | 'weapons' | 'armour' | 'sync'>('units');

  // --- UNIT EDIT STATE ---
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0];
  const [editName, setEditName] = useState(selectedUnit?.name || '');
  const [editCost, setEditCost] = useState(selectedUnit?.baseCost || 0);
  const [editMov, setEditMov] = useState(selectedUnit?.stats.movement || '6"');
  const [editRng, setEditRng] = useState(selectedUnit?.stats.ranged || '+0');
  const [editMelee, setEditMelee] = useState(selectedUnit?.stats.melee || '+0');
  const [editArmour, setEditArmour] = useState(selectedUnit?.stats.armour || '+0');
  const [savedUnitSuccess, setSavedUnitSuccess] = useState(false);

  // --- WEAPON EDIT STATE ---
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(weapons[0]?.id || '');
  const selectedWeapon = weapons.find((w) => w.id === selectedWeaponId) || weapons[0];
  const [editWepName, setEditWepName] = useState(selectedWeapon?.name || '');
  const [editWepCost, setEditWepCost] = useState(selectedWeapon?.cost || 0);
  const [editWepType, setEditWepType] = useState(selectedWeapon?.type || 'Melee');
  const [editWepRange, setEditWepRange] = useState(selectedWeapon?.range || 'Melee');
  const [editWepMod, setEditWepMod] = useState(selectedWeapon?.modifiers || '+0');
  const [editWepDmg, setEditWepDmg] = useState(selectedWeapon?.damage || 'Standard');
  const [editWepHands, setEditWepHands] = useState<1 | 2>(selectedWeapon?.hands || 1);
  const [savedWepSuccess, setSavedWepSuccess] = useState(false);

  // --- ARMOUR EDIT STATE ---
  const [selectedArmourId, setSelectedArmourId] = useState<string>(armour[0]?.id || '');
  const selectedArmour = armour.find((a) => a.id === selectedArmourId) || armour[0];
  const [editArmName, setEditArmName] = useState(selectedArmour?.name || '');
  const [editArmCost, setEditArmCost] = useState(selectedArmour?.cost || 0);
  const [editArmMod, setEditArmMod] = useState(selectedArmour?.armourModifier || selectedArmour?.modifier || '-1 Injury Modifier');
  const [editArmDesc, setEditArmDesc] = useState(selectedArmour?.description || '');
  const [savedArmSuccess, setSavedArmSuccess] = useState(false);

  // Sync state
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  // Null until a real commit is fetched. This previously held an invented sha
  // and message that were rendered as though upstream had been checked.
  const [latestCommit, setLatestCommit] = useState<{ sha: string; message: string } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

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
    soundEffects.playCathedralBell();
    setSavedUnitSuccess(true);
    setTimeout(() => setSavedUnitSuccess(false), 2000);
  };

  const handleSelectWeapon = (wId: string) => {
    setSelectedWeaponId(wId);
    const w = weapons.find((item) => item.id === wId);
    if (w) {
      setEditWepName(w.name);
      setEditWepCost(w.cost);
      setEditWepType(w.type);
      setEditWepRange(w.range);
      setEditWepMod(w.modifiers);
      setEditWepDmg(w.damage || 'Standard');
      setEditWepHands((w.hands as any) || 1);
    }
  };

  const handleSaveWeapon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeapon) return;

    const updatedWeapon: WeaponProfile = {
      ...selectedWeapon,
      name: editWepName,
      cost: editWepCost,
      type: editWepType as any,
      range: editWepRange,
      modifiers: editWepMod,
      damage: editWepDmg,
      hands: editWepHands,
      isCustom: true
    };

    saveCustomWeapon(updatedWeapon);
    soundEffects.playGunfire();
    setSavedWepSuccess(true);
    setTimeout(() => setSavedWepSuccess(false), 2000);
  };

  const handleSelectArmour = (aId: string) => {
    setSelectedArmourId(aId);
    const a = armour.find((item) => item.id === aId);
    if (a) {
      setEditArmName(a.name);
      setEditArmCost(a.cost);
      setEditArmMod(a.armourModifier || a.modifier || '-1 Injury Modifier');
      setEditArmDesc(a.description || '');
    }
  };

  const handleSaveArmour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArmour) return;

    const updatedArmour: ArmourProfile = {
      ...selectedArmour,
      name: editArmName,
      cost: editArmCost,
      armourModifier: editArmMod,
      modifier: editArmMod,
      description: editArmDesc,
      isCustom: true
    };

    saveCustomArmour(updatedArmour);
    soundEffects.playCathedralBell();
    setSavedArmSuccess(true);
    setTimeout(() => setSavedArmSuccess(false), 2000);
  };

  const handleCheckSync = async () => {
    setIsCheckingSync(true);
    setSyncError(null);
    try {
      const commit = await fetchLatestRepoCommit();
      setLatestCommit(
        commit ? { sha: commit.sha, message: commit.commit.message } : null
      );
    } catch (err) {
      setLatestCommit(null);
      setSyncError(err instanceof Error ? err.message : 'Upstream check failed.');
    } finally {
      setIsCheckingSync(false);
    }

    // The diff itself is deliberately not run here.
    //
    // It used to build its "upstream" by hand-editing two local units
    // (na-shocktrooper -> 40 Ducats, na-sniper -> 60) and diffing against that,
    // presenting invented changes as a real upstream comparison. A diff is only
    // meaningful once upstream profiles are parsed from the BattleScribe
    // catalogues — that is Phase 1 of docs/RESTRUCTURE-PLAN.md, and
    // fetchAndParseAllRemoteCatalogs() in services/githubSync.ts is the
    // starting point. Until then this reports the upstream commit only.
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-24 font-mono text-xs">
      
      {/* Header Banner */}
      <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 shadow-xl space-y-3 bevel-container">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-6 h-6 text-theme-primary" />
              <h1 className="font-gothic font-bold text-2xl text-theme-text tracking-wide">
                MASTER RULES & WARGEAR CUSTOMIZER
              </h1>
            </div>
            <p className="text-xs text-theme-muted pt-1">
              Live statline editor and custom rule override engine. Adjust point costs, ranges, hands, and keywords without losing custom warband rosters.
            </p>
          </div>

          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={handleCheckSync}
              disabled={isCheckingSync}
              className="flex items-center space-x-2 px-4 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text border border-theme-border rounded font-bold uppercase transition-colors"
            >
              <GitBranch className={`w-3.5 h-3.5 ${isCheckingSync ? 'animate-spin text-theme-primary' : ''}`} />
              <span>{isCheckingSync ? 'Checking Commits...' : 'Check GitHub Updates'}</span>
            </button>
          </div>
        </div>

        {/* Upstream status. Reports what was actually read, or why it failed. */}
        {syncError && (
          <div className="flex items-start gap-2 p-3 rounded border border-theme-accent bg-theme-accent/15 text-status-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold uppercase">Upstream check failed</p>
              <p className="break-words opacity-90">{syncError}</p>
            </div>
          </div>
        )}

        {latestCommit && !syncError && (
          <div className="p-3 rounded border border-theme-border bg-theme-base space-y-1">
            <p className="uppercase font-bold text-theme-muted">
              Upstream head
              <span className="ml-2 text-theme-primary">{latestCommit.sha.slice(0, 8)}</span>
            </p>
            <p className="text-theme-text break-words">{latestCommit.message}</p>
            <p className="text-theme-muted opacity-80">
              Profile comparison is unavailable until upstream profiles are parsed
              from the BattleScribe catalogues (Phase 1). This reports the commit only.
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-t border-theme-border pt-4 gap-2 overflow-x-auto">
          {[
            { id: 'units', label: `Unit Profiles (${units.length})`, icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'weapons', label: `Weapons & Ballistics (${weapons.length})`, icon: <Swords className="w-3.5 h-3.5" /> },
            { id: 'armour', label: `Armour & Shields (${armour.length})`, icon: <Shield className="w-3.5 h-3.5" /> },
            { id: 'sync', label: 'GitHub Sync & XML Parser', icon: <FileCode className="w-3.5 h-3.5" /> }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded font-bold uppercase flex items-center space-x-1.5 transition-colors ${
                activeTab === t.id
                  ? 'bg-theme-primary text-black shadow'
                  : 'bg-theme-base text-theme-muted hover:text-theme-text border border-theme-border'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: UNIT PROFILES */}
      {activeTab === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unit Selector List */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2 bevel-container max-h-[600px] overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-theme-muted block pb-1 border-b border-theme-border">
              Select Unit to Modify:
            </span>
            <div className="space-y-1">
              {units.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUnit(u.id)}
                  className={`w-full p-2 rounded text-left flex items-center justify-between transition-colors ${
                    selectedUnit?.id === u.id
                      ? 'bg-theme-primary text-black font-bold shadow'
                      : 'hover:bg-theme-elevated text-theme-text'
                  }`}
                >
                  <span className="truncate">{u.name}</span>
                  <span className="text-[10px]">{u.baseCost} D</span>
                </button>
              ))}
            </div>
          </div>

          {/* Unit Edit Form */}
          <div className="lg:col-span-2 bg-theme-surface border border-theme-border rounded-md p-6 space-y-4 bevel-container">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div>
                <h2 className="font-gothic font-bold text-lg text-theme-text">{selectedUnit?.name}</h2>
                <span className="text-[10px] text-theme-muted">Faction: {selectedUnit?.factionId} • Category: {selectedUnit?.category}</span>
              </div>
              {selectedUnit?.isCustom && (
                <button
                  onClick={() => deleteCustomUnit(selectedUnit.id)}
                  className="px-3 py-1 bg-theme-accent/40 text-status-error hover:bg-theme-accent hover:text-white rounded border border-theme-accent text-xs font-bold uppercase flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revert</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Unit Name:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Base Cost (Ducats):</label>
                  <input
                    type="number"
                    value={editCost}
                    onChange={(e) => setEditCost(Number(e.target.value))}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Movement:</label>
                  <input
                    type="text"
                    value={editMov}
                    onChange={(e) => setEditMov(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Ranged:</label>
                  <input
                    type="text"
                    value={editRng}
                    onChange={(e) => setEditRng(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Melee:</label>
                  <input
                    type="text"
                    value={editMelee}
                    onChange={(e) => setEditMelee(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Armour Mod:</label>
                  <input
                    type="text"
                    value={editArmour}
                    onChange={(e) => setEditArmour(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded shadow flex items-center space-x-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savedUnitSuccess ? '✓ Profile Saved!' : 'Save Custom Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: WEAPONS & BALLISTICS */}
      {activeTab === 'weapons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weapon Selector List */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2 bevel-container max-h-[600px] overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-theme-muted block pb-1 border-b border-theme-border">
              Select Weapon to Modify:
            </span>
            <div className="space-y-1">
              {weapons.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleSelectWeapon(w.id)}
                  className={`w-full p-2 rounded text-left flex items-center justify-between transition-colors ${
                    selectedWeapon?.id === w.id
                      ? 'bg-theme-primary text-black font-bold shadow'
                      : 'hover:bg-theme-elevated text-theme-text'
                  }`}
                >
                  <span className="truncate">{w.name}</span>
                  <span className="text-[10px]">{w.cost} D</span>
                </button>
              ))}
            </div>
          </div>

          {/* Weapon Edit Form */}
          <div className="lg:col-span-2 bg-theme-surface border border-theme-border rounded-md p-6 space-y-4 bevel-container">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div>
                <h2 className="font-gothic font-bold text-lg text-theme-text">{selectedWeapon?.name}</h2>
                <span className="text-[10px] text-theme-muted">Type: {selectedWeapon?.type} • Faction: {selectedWeapon?.factionId || 'universal'}</span>
              </div>
              {selectedWeapon?.isCustom && (
                <button
                  onClick={() => deleteCustomWeapon(selectedWeapon.id)}
                  className="px-3 py-1 bg-theme-accent/40 text-status-error hover:bg-theme-accent hover:text-white rounded border border-theme-accent text-xs font-bold uppercase flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revert</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveWeapon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Weapon Name:</label>
                  <input
                    type="text"
                    value={editWepName}
                    onChange={(e) => setEditWepName(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Cost (Ducats):</label>
                  <input
                    type="number"
                    value={editWepCost}
                    onChange={(e) => setEditWepCost(Number(e.target.value))}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Type:</label>
                  <select
                    value={editWepType}
                    onChange={(e) => setEditWepType(e.target.value as any)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  >
                    <option value="Melee">Melee</option>
                    <option value="Ranged">Ranged</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Range:</label>
                  <input
                    type="text"
                    value={editWepRange}
                    onChange={(e) => setEditWepRange(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Modifiers:</label>
                  <input
                    type="text"
                    value={editWepMod}
                    onChange={(e) => setEditWepMod(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Hands Required:</label>
                  <select
                    value={editWepHands}
                    onChange={(e) => setEditWepHands(Number(e.target.value) as 1 | 2)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  >
                    <option value={1}>1-Handed</option>
                    <option value={2}>2-Handed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded shadow flex items-center space-x-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savedWepSuccess ? '✓ Weapon Saved!' : 'Save Custom Weapon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: ARMOUR & SHIELDS */}
      {activeTab === 'armour' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Armour Selector List */}
          <div className="bg-theme-surface border border-theme-border rounded-md p-4 space-y-2 bevel-container max-h-[600px] overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-theme-muted block pb-1 border-b border-theme-border">
              Select Armour to Modify:
            </span>
            <div className="space-y-1">
              {armour.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelectArmour(a.id)}
                  className={`w-full p-2 rounded text-left flex items-center justify-between transition-colors ${
                    selectedArmour?.id === a.id
                      ? 'bg-theme-primary text-black font-bold shadow'
                      : 'hover:bg-theme-elevated text-theme-text'
                  }`}
                >
                  <span className="truncate">{a.name}</span>
                  <span className="text-[10px]">{a.cost} D</span>
                </button>
              ))}
            </div>
          </div>

          {/* Armour Edit Form */}
          <div className="lg:col-span-2 bg-theme-surface border border-theme-border rounded-md p-6 space-y-4 bevel-container">
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div>
                <h2 className="font-gothic font-bold text-lg text-theme-text">{selectedArmour?.name}</h2>
                <span className="text-[10px] text-theme-muted">Category: {selectedArmour?.category} • Faction: {selectedArmour?.factionId || 'universal'}</span>
              </div>
              {selectedArmour?.isCustom && (
                <button
                  onClick={() => deleteCustomArmour(selectedArmour.id)}
                  className="px-3 py-1 bg-theme-accent/40 text-status-error hover:bg-theme-accent hover:text-white rounded border border-theme-accent text-xs font-bold uppercase flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Revert</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveArmour} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Armour Name:</label>
                  <input
                    type="text"
                    value={editArmName}
                    onChange={(e) => setEditArmName(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-theme-muted">Cost (Ducats):</label>
                  <input
                    type="number"
                    value={editArmCost}
                    onChange={(e) => setEditArmCost(Number(e.target.value))}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-theme-muted">Protection Modifier:</label>
                <input
                  type="text"
                  value={editArmMod}
                  onChange={(e) => setEditArmMod(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-theme-muted">Description & Rules:</label>
                <textarea
                  rows={3}
                  value={editArmDesc}
                  onChange={(e) => setEditArmDesc(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="flex items-center justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded shadow flex items-center space-x-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{savedArmSuccess ? '✓ Armour Saved!' : 'Save Custom Armour'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GitHub Diff Modal — only meaningful once a real commit has been read. */}
      {isDiffModalOpen && latestCommit && (
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
