// utils/soundEffects.ts
/**
 * Synthesizes subtle page-turn paper rustles and Ethiopian meditative
 * ambient drones (Krar-inspired harmonics) purely via Web Audio API.
 * No external audio files or downloads required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a gentle synthesized paper rustle sound effect
 */
export function playPageTurnSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const bufferSize = ctx.sampleRate * 0.12; // 120ms duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Filtered pink/white noise simulating paper friction
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      // Envelope decay
      data[i] *= Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 850;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

/**
 * Ethiopian Traditional Pentatonic Drone Controller (Tizita Minor Ambient)
 */
class EthiopianAmbientSoundscape {
  private oscillators: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;
  private isPlaying = false;

  public toggle(enabled: boolean, volume = 0.08): boolean {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (enabled && !this.isPlaying) {
      this.start(ctx, volume);
      this.isPlaying = true;
      return true;
    } else if (!enabled && this.isPlaying) {
      this.stop();
      this.isPlaying = false;
      return false;
    }
    return this.isPlaying;
  }

  private start(ctx: AudioContext, volume: number): void {
    this.stop();

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2); // 2s gentle fade in

    // Traditional Tizita modal frequencies (Root D = 146.83Hz, F = 174.61Hz, G = 196Hz, A = 220Hz, C = 261.63Hz)
    const frequencies = [146.83, 220.0, 293.66, 440.0];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // Subtle vibrato
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.2 + idx * 0.1;
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      filter.type = 'lowpass';
      filter.frequency.value = 600;

      oscGain.gain.value = 0.25 / frequencies.length;

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.masterGain!);

      osc.start();
      this.oscillators.push(osc);
    });

    this.masterGain.connect(ctx.destination);
  }

  public stop(): void {
    if (this.masterGain && audioCtx) {
      try {
        this.masterGain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 1);
        setTimeout(() => {
          this.oscillators.forEach((osc) => {
            try {
              osc.stop();
              osc.disconnect();
            } catch (e) {}
          });
          this.oscillators = [];
        }, 1000);
      } catch (e) {}
    }
  }

  public setVolume(vol: number): void {
    if (this.masterGain && audioCtx) {
      this.masterGain.gain.setValueAtTime(vol, audioCtx.currentTime);
    }
  }
}

export const ambientSoundscape = new EthiopianAmbientSoundscape();
