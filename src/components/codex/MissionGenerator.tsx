'use client';

import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useScenarios } from '../../rules/useScenarios';
import { soundEffects } from '../../services/soundEffects';
import { parseUnforeseenEvents, rollUnforeseen } from '../../rules/unforeseen';
import { 
  Dice6, 
  CloudRain, 
  AlertTriangle, 
  RefreshCw, 
  Compass, 
  Edit3,
  Play
} from 'lucide-react';

/**
 * The battlefield-conditions roller.
 *
 * It used to roll three invented tables: six weather conditions, six
 * "complications" and six "Secret Secondary Agendas" with their own Glory and
 * Ducat rewards. None of the eighteen appears anywhere in the sources, and they
 * gave themselves away on vocabulary: they deal "Poison wounds" and "D3
 * wounds", fire "at the end of each battle round", impose "-1 Morale", and
 * reward "the player who wins priority in Turn 1". Trench Crusade has no
 * wounds, no battle rounds, no Morale characteristic and no priority — it has
 * BLOOD MARKERS, Turns, Morale Checks and the Initiative. A generator that
 * hands a table three rules the game does not contain is worse than no
 * generator, because the players will use them.
 *
 * What the game actually publishes is one table, and it belongs to one
 * scenario: UNFORESEEN EVENTS in Hunt for Heroes. That is what this rolls, read
 * from the scenario itself (▶ `rules/unforeseen.ts`). For the other eleven
 * scenarios it offers nothing, and says so.
 */

export const MissionGenerator: React.FC = () => {
  const { setCurrentView } = useStore();
  // The derived twelve plus the All Out War pack. Templates are seeded from
  // the book's own sections, so a custom mission starts from real rules.
  const { scenarios } = useScenarios();
  const [activeMode, setActiveMode] = useState<'designer' | 'procedural'>('designer');

  /*
    Which scenario's table to roll. Only Hunt for Heroes has one, so it is the
    default — but the picker stays, because a scenario gaining one is exactly
    the kind of change the pipeline is meant to carry through without a code
    edit, and because a player needs to see WHICH scenario a rule comes from.
  */
  const [eventScenarioId, setEventScenarioId] = useState<string>('');
  const [lastEvent, setLastEvent] = useState<ReturnType<typeof rollUnforeseen> | null>(null);
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
  const [customSavedSuccess] = useState<boolean>(false);

  // Load Template Scenario
  const handleLoadTemplate = (scenId: string) => {
    setSelectedTemplateId(scenId);
    if (!scenId) return;

    const template = scenarios.find((s) => s.id === scenId);
    if (template) {
      // Sections as the book prints them. Nothing is defaulted: a template
      // seeded with '48" x 48"' or '4 Turns' because the source did not say so
      // is a made-up rule the user then saves under their own name.
      const section = (h: string) =>
        template.entry?.sections.find((x) => x.heading === h)?.body ?? '';
      setCustomTitle(template.name);
      setCustomTagline(template.tagline);
      setCustomTableSize('');
      setCustomBattlefield(section('THE BATTLEFIELD'));
      setCustomDeployment(section('DEPLOYMENT'));
      setCustomGameLength(template.gameLength ?? '');
      setCustomVictory(section('VICTORY CONDITIONS'));
      setCustomGloriousDeeds(section('GLORIOUS DEEDS'));
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

  /** The scenarios that print an Unforeseen Events table. Today: one. */
  const withEvents = useMemo(
    () => scenarios
      .map((s) => ({
        scenario: s,
        events: parseUnforeseenEvents(
          s.entry?.sections.find((x) => x.heading === 'UNFORESEEN EVENTS')?.body),
      }))
      .filter((x) => x.events.length > 0),
    [scenarios],
  );

  const chosen = withEvents.find((x) => x.scenario.id === eventScenarioId) ?? withEvents[0];

  const handleGenerate = () => {
    if (!chosen) return;
    setIsGenerating(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const result = rollUnforeseen(chosen.events);
      setLastEvent(result);
      if (result.triggered) soundEffects.playTrenchWhistle();
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
                ? 'bg-theme-primary text-theme-base shadow'
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
                ? 'bg-theme-primary text-theme-base shadow'
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
              <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">
                Load Existing Scenario as Template:
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleLoadTemplate(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded p-2 text-xs text-theme-primary font-bold focus:outline-none focus:border-theme-primary"
              >
                <option value="">-- Start Blank from Scratch --</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
                <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Scenario Title:</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text font-bold focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Briefing / Tagline:</label>
                <input
                  type="text"
                  value={customTagline}
                  onChange={(e) => setCustomTagline(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-muted focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Table Size:</label>
                  <input
                    type="text"
                    value={customTableSize}
                    onChange={(e) => setCustomTableSize(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Game Length:</label>
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
                <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Battlefield Archetype & Terrain:</label>
                <textarea
                  rows={3}
                  value={customBattlefield}
                  onChange={(e) => setCustomBattlefield(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Deployment Rules:</label>
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
              <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Victory Conditions & Scoring:</label>
              <textarea
                rows={4}
                value={customVictory}
                onChange={(e) => setCustomVictory(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded p-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary"
              />
            </div>

            {/* Glorious Deeds */}
            <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-2">
              <label className="text-xs sm:text-[10px] text-theme-muted uppercase font-bold block">Glorious Deeds (Markdown list):</label>
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
                className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow-lg flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Launch in Tabletop Combat</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODE 2: UNFORESEEN EVENTS — the game's one published conditions table */}
      {activeMode === 'procedural' && (
        <div className="space-y-5 animate-fade-in font-mono text-xs">

          {withEvents.length === 0 ? (
            <div className="p-8 text-center bg-theme-base rounded border border-dashed border-theme-border space-y-2">
              <Dice6 className="w-8 h-8 text-theme-primary mx-auto opacity-60" />
              <h4 className="font-gothic font-bold text-base text-theme-text">No table to roll</h4>
              <p className="text-theme-muted">
                No scenario in this ruleset prints an Unforeseen Events table.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-theme-elevated rounded border border-theme-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <label className="uppercase font-bold text-theme-muted block">
                      Scenario
                    </label>
                    <select
                      value={chosen?.scenario.id ?? ''}
                      onChange={(e) => { setEventScenarioId(e.target.value); setLastEvent(null); }}
                      className="w-full bg-theme-base border border-theme-border rounded p-2 text-theme-text focus:outline-none focus:border-theme-primary"
                    >
                      {withEvents.map((x) => (
                        <option key={x.scenario.id} value={x.scenario.id}>
                          {x.scenario.number}. {x.scenario.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-base font-bold uppercase rounded shadow transition-all flex-shrink-0 min-h-[44px]"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Roll D6</span>
                  </button>
                </div>

                <p className="text-theme-muted leading-relaxed">
                  At the start of each Turn after the first, one player rolls a D6. On 1-4 nothing
                  happens; on a 5 or 6 an Unforeseen Event takes place, and you roll a D3 for which.
                  Do not roll again to see if a further event takes place.
                </p>
              </div>

              {lastEvent && (
                <div className={`p-4 rounded border space-y-2 ${
                  lastEvent.triggered
                    ? 'bg-theme-elevated border-theme-primary'
                    : 'bg-theme-base border-theme-border'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="uppercase text-theme-muted flex items-center gap-1.5">
                      <CloudRain className="w-3.5 h-3.5 text-theme-primary" />
                      <span>D6 {lastEvent.d6}{lastEvent.d3 ? ` · D3 ${lastEvent.d3}` : ''}</span>
                    </span>
                    {!lastEvent.triggered && (
                      <span className="uppercase bg-theme-surface text-theme-muted px-2 py-0.5 rounded border border-theme-border">
                        Nothing happens
                      </span>
                    )}
                  </div>

                  {lastEvent.event && (
                    <>
                      <h4 className="font-gothic font-bold text-base text-theme-text">
                        {lastEvent.event.name}
                      </h4>
                      <p className="text-theme-text bg-theme-base p-2.5 rounded border border-theme-border/60 leading-relaxed">
                        {lastEvent.event.effect}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* The whole table, so a player can read it rather than roll it. */}
              {chosen && (
                <div className="space-y-2">
                  <span className="uppercase font-bold text-theme-muted flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-status-error" />
                    <span>{chosen.scenario.name} — Unforeseen Events</span>
                  </span>
                  <div className="space-y-2">
                    {chosen.events.map((e) => (
                      <div key={e.roll} className="p-3 bg-theme-base rounded border border-theme-border flex gap-3">
                        <span className="font-bold text-theme-primary flex-shrink-0">{e.roll}</span>
                        <div className="min-w-0">
                          <strong className="block text-theme-text">{e.name}</strong>
                          <p className="text-theme-muted leading-relaxed pt-0.5">{e.effect}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};
