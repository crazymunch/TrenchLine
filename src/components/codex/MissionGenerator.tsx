'use client';

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Scenario } from '../../types/rules';
import { soundEffects } from '../../services/soundEffects';
import { 
  Sparkles, 
  Dice6, 
  CloudRain, 
  AlertTriangle, 
  Target, 
  Map, 
  RefreshCw, 
  Compass, 
  Award, 
  ChevronRight, 
  Shield,
  Edit3,
  Play,
  Save,
  Layers,
  Copy
} from 'lucide-react';

const WEATHER_TABLE = [
  {
    name: 'Toxic Mustard Fog',
    effect: 'Models entering craters or trenches must pass an Action test or suffer 1 Poison wound.',
    badge: 'Chemical Hazard'
  },
  {
    name: 'Incessant Shrapnel Barrage',
    effect: 'Any model ending their activation in Open Ground suffers an immediate +0 Shrapnel strike.',
    badge: 'Artillery Hazard'
  },
  {
    name: 'Pitch Black Night & Signal Flares',
    effect: 'Maximum ranged visibility is capped at 16" unless firing at targets illuminated by previous attacks.',
    badge: 'Night Fighting'
  },
  {
    name: 'Ash Blizzard & Trench Frost',
    effect: 'Deep mud and freezing ice impose a -1" penalty to all Movement and Dash actions.',
    badge: 'Environmental'
  },
  {
    name: 'Distant Creeping Artillery Barrage',
    effect: 'At the end of each battle round, roll a D6. On a 1, a random battlefield quadrant is bombarded (Blast 3").',
    badge: 'High Hazard'
  },
  {
    name: 'Choking Smoke & Clear Sky',
    effect: 'Standard visibility conditions. Standard rules apply across the sector.',
    badge: 'Clear'
  }
];

const COMPLICATIONS_TABLE = [
  {
    name: 'Barbed Wire & Hidden Minefield',
    effect: 'The central 12" wasteland is strewn with mines. Any model Dashing rolls a D6; on a 1 they suffer D3 wounds.',
    type: 'Hazard'
  },
  {
    name: 'Desecrated Blood Well',
    effect: 'The central objective marker radiates demonic hum. Heretic models gain +1 Melee within 6", Crusaders suffer -1 Morale.',
    type: 'Occult'
  },
  {
    name: 'Downed Zeppelin Wreckage',
    effect: 'A massive iron airship sits broken in the center, granting +2 Heavy Trench Cover and blocking line of sight.',
    type: 'Terrain'
  },
  {
    name: 'Mutated No Man\'s Land Scavengers',
    effect: 'On Round 3, a neutral pack of starving mutant hounds arrives and charges the nearest wounded warrior.',
    type: 'Hostile Neutral'
  },
  {
    name: 'Cracked Underground Munitions Depot',
    effect: 'Models searching the central bunker can claim D6+15 Ducats or a Frag Grenade as a free Action.',
    type: 'Bonus Objective'
  },
  {
    name: 'Intercepted Field Radio Transmissions',
    effect: 'The player who wins priority in Turn 1 may redeploy up to 2 friendly Troopers anywhere in their zone.',
    type: 'Tactical Intel'
  }
];

const SECONDARY_AGENDAS = [
  {
    name: 'Decapitation Strike',
    description: 'Take the opposing enemy Leader Out of Action before the end of Turn 4.',
    reward: '+2 Campaign Glory & +15 Ducats'
  },
  {
    name: 'Consecrate / Desecrate the Fallen',
    description: 'Have a friendly warrior perform a 1-Action ritual over 2 fallen enemy casualties.',
    reward: '+1 Campaign Glory & +10 Ducats'
  },
  {
    name: 'Hold the High Redoubt',
    description: 'Control the highest terrain piece or bunker on the board at game end with at least 2 warriors.',
    reward: '+2 Campaign Glory'
  },
  {
    name: 'Blood Harvest',
    description: 'Inflict at least 3 enemy casualties without losing any friendly Elite or Leader units.',
    reward: '+2 Campaign Glory & +20 Ducats'
  },
  {
    name: 'Iron Wall Discipline',
    description: 'End the battle with zero friendly units fleeing, routed, or failing Morale checks.',
    reward: '+1 Campaign Glory'
  },
  {
    name: 'Scavenge Archeotech Ammo Caches',
    description: 'Search at least 2 separate craters or ruins with standard Trooper units.',
    reward: '+25 Bonus Ducats'
  }
];

export const MissionGenerator: React.FC = () => {
  const { scenarios, setCurrentView } = useStore();
  const [activeMode, setActiveMode] = useState<'designer' | 'procedural'>('designer');

  // Procedural Generator State
  const [proceduralMission, setProceduralMission] = useState<{
    weather: typeof WEATHER_TABLE[0];
    complication: typeof COMPLICATIONS_TABLE[0];
    secondaryA: typeof SECONDARY_AGENDAS[0];
    secondaryB: typeof SECONDARY_AGENDAS[0];
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom Mission Designer State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('Custom Trench Skirmish');
  const [customTagline, setCustomTagline] = useState<string>('A vicious engagement in contested no man\'s land.');
  const [customTableSize, setCustomTableSize] = useState<string>('48" x 48"');
  const [customBattlefield, setCustomBattlefield] = useState<string>('Dense trenches, cratered ruins, and mud-choked barbed wire.');
  const [customDeployment, setCustomDeployment] = useState<string>('Standard opposing table edges, 6" from board edge.');
  const [customGameLength, setCustomGameLength] = useState<string>('This scenario lasts 4 Turns.');
  const [customVictory, setCustomVictory] = useState<string>('Control the central objective markers at the end of Turn 4 (2 VPs each). +1 VP per Glorious Deed.');
  const [customGloriousDeeds, setCustomGloriousDeeds] = useState<string>(`- **Lord of War**: Take 2 enemy models Out of Action in a single turn.
- **Sniper**: Take an enemy ELITE model Out of Action at Long Range in Cover.
- **Resist and Bite**: Take an enemy Out of Action after starting the activation Down.`);
  const [customSavedSuccess, setCustomSavedSuccess] = useState<boolean>(false);

  // Load Template Scenario
  const handleLoadTemplate = (scenId: string) => {
    setSelectedTemplateId(scenId);
    if (!scenId) return;

    const template = scenarios.find((s) => s.id === scenId);
    if (template) {
      setCustomTitle(template.name);
      setCustomTagline(template.tagline || template.flavor || '');
      setCustomTableSize(template.tableSize || '48" x 48"');
      setCustomBattlefield(template.battlefield || '');
      setCustomDeployment(template.deployment || '');
      setCustomGameLength(template.gameLength || '4 Turns');
      setCustomVictory(template.victoryConditions || '');
      setCustomGloriousDeeds(template.gloriousDeeds || '');
      soundEffects.playCathedralBell();
    }
  };

  const handleClearToBlank = () => {
    setSelectedTemplateId('');
    setCustomTitle('New Custom Mission');
    setCustomTagline('');
    setCustomTableSize('48" x 48"');
    setCustomBattlefield('');
    setCustomDeployment('');
    setCustomGameLength('4 Turns');
    setCustomVictory('');
    setCustomGloriousDeeds('');
  };

  const handleLaunchCombat = () => {
    soundEffects.playTrenchWhistle();
    setCurrentView('play');
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const weatherIdx = Math.floor(Math.random() * WEATHER_TABLE.length);
      const compIdx = Math.floor(Math.random() * COMPLICATIONS_TABLE.length);
      const secAIdx = Math.floor(Math.random() * SECONDARY_AGENDAS.length);
      let secBIdx = Math.floor(Math.random() * SECONDARY_AGENDAS.length);
      if (secBIdx === secAIdx) secBIdx = (secAIdx + 1) % SECONDARY_AGENDAS.length;

      setProceduralMission({
        weather: WEATHER_TABLE[weatherIdx],
        complication: COMPLICATIONS_TABLE[compIdx],
        secondaryA: SECONDARY_AGENDAS[secAIdx],
        secondaryB: SECONDARY_AGENDAS[secBIdx]
      });

      soundEffects.playTrenchWhistle();
      setIsGenerating(false);
    }, 250);
  };

  return (
    <div className="bg-theme-surface border-2 border-theme-border rounded-md p-6 space-y-6 shadow-xl bevel-container">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-theme-primary" />
            <h3 className="font-gothic font-bold text-lg text-theme-text">
              MISSION DESIGNER & TACTICAL GENERATOR
            </h3>
          </div>
          <p className="text-xs font-mono text-theme-muted">
            Design custom battle scenarios from scratch, modify official templates, or roll dynamic battlefield complications.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-theme-base p-1 rounded border border-theme-border text-xs font-mono">
          <button
            onClick={() => setActiveMode('designer')}
            className={`px-3.5 py-1.5 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${
              activeMode === 'designer'
                ? 'bg-theme-primary text-black shadow'
                : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Mission Designer</span>
          </button>

          <button
            onClick={() => setActiveMode('procedural')}
            className={`px-3.5 py-1.5 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${
              activeMode === 'procedural'
                ? 'bg-theme-primary text-black shadow'
                : 'text-theme-muted hover:text-theme-text'
            }`}
          >
            <Dice6 className="w-3.5 h-3.5" />
            <span>Hazard Roller</span>
          </button>
        </div>
      </div>

      {/* MODE 1: CUSTOM MISSION DESIGNER & TEMPLATE CUSTOMIZER */}
      {activeMode === 'designer' && (
        <div className="space-y-5 font-mono text-xs animate-fade-in">
          
          {/* Template Selector Bar */}
          <div className="p-4 bg-theme-base rounded border border-theme-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-theme-muted uppercase font-bold block">
                Load Existing Scenario as Template:
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleLoadTemplate(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-primary font-bold focus:outline-none focus:border-theme-primary"
              >
                <option value="">-- Start Blank from Scratch --</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.number ? `Scenario ${s.number}: ` : ''}{s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-2 md:pt-4">
              <button
                onClick={handleClearToBlank}
                className="px-3 py-2 bg-theme-elevated hover:bg-theme-border text-theme-text rounded border border-theme-border font-bold uppercase text-xs"
              >
                Reset Blank
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Title & Tagline */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-theme-muted uppercase font-bold block">Scenario Title:</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text font-bold focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-theme-muted uppercase font-bold block">Briefing / Tagline:</label>
                <input
                  type="text"
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-muted focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-theme-muted uppercase font-bold block">Table Size:</label>
                  <input
                    type="text"
                    value={customTableSize}
                    onChange={(e) => setCustomTableSize(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-theme-muted uppercase font-bold block">Game Length:</label>
                  <input
                    type="text"
                    value={customGameLength}
                    onChange={(e) => setCustomGameLength(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
              </div>
            </div>

            {/* Battlefield & Deployment */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-theme-muted uppercase font-bold block">Battlefield Archetype & Terrain:</label>
                <textarea
                  rows={3}
                  value={customBattlefield}
                  onChange={(e) => setCustomBattlefield(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-theme-muted uppercase font-bold block">Deployment Rules:</label>
                <textarea
                  rows={2}
                  value={customDeployment}
                  onChange={(e) => setCustomDeployment(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>
            </div>

            {/* Victory Conditions */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
              <label className="text-[10px] text-theme-muted uppercase font-bold block">Victory Conditions & Scoring:</label>
              <textarea
                rows={4}
                value={customVictory}
                onChange={(e) => setCustomVictory(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
              />
            </div>

            {/* Glorious Deeds */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
              <label className="text-[10px] text-theme-muted uppercase font-bold block">Glorious Deeds (Markdown list):</label>
              <textarea
                rows={4}
                value={customGloriousDeeds}
                onChange={(e) => setCustomGloriousDeeds(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
              />
            </div>

          </div>

          {/* Action CTAs */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {customSavedSuccess && (
                <span className="text-xs text-status-legal font-bold">✓ Mission saved to tactical planner!</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleLaunchCombat}
                className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-bold uppercase rounded shadow-lg flex items-center space-x-2"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Launch in Tabletop Combat</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODE 2: PROCEDURAL HAZARDS ROLLER */}
      {activeMode === 'procedural' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center space-x-2 px-5 py-2 bg-theme-primary hover:bg-theme-primary-hover text-black font-mono text-xs font-bold uppercase rounded shadow transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>Roll Random Battlefield Hazards</span>
            </button>
          </div>

          {proceduralMission ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                
                {/* Weather Condition */}
                <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-theme-muted flex items-center space-x-1">
                      <CloudRain className="w-3.5 h-3.5 text-theme-primary" />
                      <span>Atmospheric Weather</span>
                    </span>
                    <span className="text-[9px] uppercase bg-theme-surface text-theme-primary px-2 py-0.5 rounded border border-theme-border">
                      {proceduralMission.weather.badge}
                    </span>
                  </div>
                  <h4 className="font-gothic font-bold text-base text-theme-text">{proceduralMission.weather.name}</h4>
                  <p className="text-xs text-theme-text bg-theme-base p-2.5 rounded border border-theme-border/60">
                    {proceduralMission.weather.effect}
                  </p>
                </div>

                {/* Battlefield Complication */}
                <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-theme-muted flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-status-error" />
                      <span>Sector Hazard / Complication</span>
                    </span>
                    <span className="text-[9px] uppercase bg-theme-surface text-status-error px-2 py-0.5 rounded border border-theme-border">
                      {proceduralMission.complication.type}
                    </span>
                  </div>
                  <h4 className="font-gothic font-bold text-base text-theme-text">{proceduralMission.complication.name}</h4>
                  <p className="text-xs text-theme-text bg-theme-base p-2.5 rounded border border-theme-border/60">
                    {proceduralMission.complication.effect}
                  </p>
                </div>

              </div>

              {/* Secondary Agendas */}
              <div className="p-4 bg-theme-base rounded border border-theme-border space-y-3 font-mono text-xs">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-status-legal" />
                  <span className="uppercase font-bold text-status-legal">
                    Secret Secondary Agendas (Choose 1 per Warband):
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-theme-surface rounded border border-theme-border space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-theme-text font-gothic">{proceduralMission.secondaryA.name}</strong>
                      <span className="text-theme-primary font-bold">{proceduralMission.secondaryA.reward}</span>
                    </div>
                    <p className="text-xs text-theme-muted">{proceduralMission.secondaryA.description}</p>
                  </div>

                  <div className="p-3 bg-theme-surface rounded border border-theme-border space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-theme-text font-gothic">{proceduralMission.secondaryB.name}</strong>
                      <span className="text-theme-primary font-bold">{proceduralMission.secondaryB.reward}</span>
                    </div>
                    <p className="text-xs text-theme-muted">{proceduralMission.secondaryB.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-theme-base rounded border border-dashed border-theme-border space-y-2">
              <Dice6 className="w-8 h-8 text-theme-primary mx-auto opacity-60" />
              <h4 className="font-gothic font-bold text-base text-theme-text">NO ACTIVE HAZARD BRIEF GENERATED</h4>
              <p className="text-xs font-mono text-theme-muted">Click &quot;Roll Random Battlefield Hazards&quot; to roll dynamic weather conditions and secondary victory objectives.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
