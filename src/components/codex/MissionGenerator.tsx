'use client';

import React, { useState } from 'react';
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
  Shield
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
  const [mission, setMission] = useState<{
    weather: typeof WEATHER_TABLE[0];
    complication: typeof COMPLICATIONS_TABLE[0];
    secondaryA: typeof SECONDARY_AGENDAS[0];
    secondaryB: typeof SECONDARY_AGENDAS[0];
  } | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    soundEffects.playDiceRoll();

    setTimeout(() => {
      const weatherIdx = Math.floor(Math.random() * WEATHER_TABLE.length);
      const compIdx = Math.floor(Math.random() * COMPLICATIONS_TABLE.length);
      const secAIdx = Math.floor(Math.random() * SECONDARY_AGENDAS.length);
      let secBIdx = Math.floor(Math.random() * SECONDARY_AGENDAS.length);
      if (secBIdx === secAIdx) secBIdx = (secAIdx + 1) % SECONDARY_AGENDAS.length;

      setMission({
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
    <div className="bg-[#161920] border-2 border-[#323846] rounded-md p-6 space-y-6 shadow-xl bevel-container">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#323846] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="font-gothic font-bold text-lg text-[#ECEFF4]">
              PROCEDURAL TRENCH MISSION GENERATOR
            </h3>
          </div>
          <p className="text-xs font-mono text-[#8E95A5]">
            Generate dynamic weather conditions, battlefield complications, and secret secondary agendas for any skirmish.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center space-x-2 px-5 py-2.5 bg-[#D4AF37] hover:bg-[#E5C158] text-black font-mono text-xs font-bold uppercase rounded shadow-lg shadow-[#D4AF37]/20 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>Generate Tactical Brief</span>
        </button>
      </div>

      {/* Generated Mission Brief Display */}
      {mission ? (
        <div className="space-y-4 animate-fade-in">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Weather Condition */}
            <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#8E95A5] flex items-center space-x-1">
                  <CloudRain className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Atmospheric Weather</span>
                </span>
                <span className="text-[9px] font-mono uppercase bg-[#161920] text-[#D4AF37] px-2 py-0.5 rounded border border-[#323846]">
                  {mission.weather.badge}
                </span>
              </div>
              <h4 className="font-gothic font-bold text-base text-[#ECEFF4]">{mission.weather.name}</h4>
              <p className="text-xs font-mono text-[#ECEFF4] bg-[#0C0E12] p-2.5 rounded border border-[#323846]/60">
                {mission.weather.effect}
              </p>
            </div>

            {/* Battlefield Complication */}
            <div className="p-4 bg-[#20242E] rounded border border-[#323846] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#8E95A5] flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#E53935]" />
                  <span>Sector Hazard / Complication</span>
                </span>
                <span className="text-[9px] font-mono uppercase bg-[#161920] text-[#E53935] px-2 py-0.5 rounded border border-[#323846]">
                  {mission.complication.type}
                </span>
              </div>
              <h4 className="font-gothic font-bold text-base text-[#ECEFF4]">{mission.complication.name}</h4>
              <p className="text-xs font-mono text-[#ECEFF4] bg-[#0C0E12] p-2.5 rounded border border-[#323846]/60">
                {mission.complication.effect}
              </p>
            </div>

          </div>

          {/* Secondary Agendas */}
          <div className="p-4 bg-[#0C0E12] rounded border border-[#323846] space-y-3">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-[#4E9A6E]" />
              <span className="text-xs font-mono uppercase font-bold text-[#4E9A6E]">
                Secret Secondary Agendas (Choose 1 per Warband):
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              <div className="p-3 bg-[#161920] rounded border border-[#323846] space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <strong className="text-[#ECEFF4] font-gothic">{mission.secondaryA.name}</strong>
                  <span className="text-[#D4AF37] font-bold">{mission.secondaryA.reward}</span>
                </div>
                <p className="text-xs text-[#8E95A5]">{mission.secondaryA.description}</p>
              </div>

              <div className="p-3 bg-[#161920] rounded border border-[#323846] space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <strong className="text-[#ECEFF4] font-gothic">{mission.secondaryB.name}</strong>
                  <span className="text-[#D4AF37] font-bold">{mission.secondaryB.reward}</span>
                </div>
                <p className="text-xs text-[#8E95A5]">{mission.secondaryB.description}</p>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="p-8 text-center bg-[#0C0E12] rounded border border-dashed border-[#323846] space-y-2">
          <Dice6 className="w-8 h-8 text-[#D4AF37] mx-auto opacity-60" />
          <h4 className="font-gothic font-bold text-base text-[#ECEFF4]">NO ACTIVE MISSION BRIEF GENERATED</h4>
          <p className="text-xs font-mono text-[#8E95A5]">Click &quot;Generate Tactical Brief&quot; to roll random weather hazards, terrain traps, and secondary victory objectives.</p>
        </div>
      )}

    </div>
  );
};
