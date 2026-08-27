// Browser Web Audio API procedural sound synthesizer for grimdark tabletop immersion

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 1. Dice Roll Clatter
  public playDiceRoll() {
    if (this.isMuted) return;
    const ctx = this.init();
    if (!ctx) return;

    const now = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120 + Math.random() * 200, now + i * 0.04);
      osc.frequency.exponentialRampToValueAtTime(40, now + i * 0.04 + 0.06);

      gain.gain.setValueAtTime(0.3, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.07);
    }
  }

  // 2. Brass Trench Command Whistle (Disabled per user request)
  public playTrenchWhistle() {
    // Disabled
  }

  // 3. Heavy Gunfire / Explosion (Disabled per user request)
  public playGunfire() {
    // Disabled
  }

  // 4. Melee Blade Clang (Disabled per user request)
  public playBladeClang() {
    // Disabled
  }

  // 5. Heavy Iron Church Bell / Relic Chime (Disabled per user request)
  public playCathedralBell() {
    // Disabled
  }
}

export const soundEffects = new SoundEngine();
