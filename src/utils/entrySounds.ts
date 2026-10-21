// Audio Engine for Check-List Entry Sounds
// In-memory PCM WAV synthesis + Web Audio API dual engine

export type EntrySoundId = 
  | 'crystal_chime' 
  | 'tech_pulse' 
  | 'zen_bell' 
  | 'executive_beep' 
  | 'cosmic_uplift';

export interface EntrySoundDefinition {
  id: EntrySoundId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  accentColor: string;
}

export const ENTRY_SOUNDS: EntrySoundDefinition[] = [
  {
    id: 'crystal_chime',
    name: 'Chime Cristal Armónico',
    subtitle: 'Ascendente original E5-A5-E6-E7',
    description: 'Sonido cristalino original, enérgico y luminoso. Ideal para inicio de jornada en obra.',
    badge: 'Original Predeterminado',
    accentColor: '#00f2fe'
  },
  {
    id: 'tech_pulse',
    name: 'Éxito Tecnológico',
    subtitle: 'Acorde cálido F5-A5-C6-F6 estilo Apple/Tesla',
    description: 'Tono armónico premium, sólido y elegante que transmite máxima precisión técnica.',
    badge: 'Premium Ejecutivo',
    accentColor: '#3b82f6'
  },
  {
    id: 'zen_bell',
    name: 'Campana Zen Resonante',
    subtitle: 'Campana acústica C5-G5 con cola armónica',
    description: 'Resonancia orgánica y cálida inspirada en cuencos tibetanos y percusión de madera noble.',
    badge: 'Acústico Relajante',
    accentColor: '#10b981'
  },
  {
    id: 'executive_beep',
    name: 'Doble Tono Ejecutivo',
    subtitle: 'Doble chirp de confirmación rápida G5-C6',
    description: 'Dos pulsos rápidos y definidos de aprobación. Eficiente, directo e infalible.',
    badge: 'Rápido & Dinámico',
    accentColor: '#f59e0b'
  },
  {
    id: 'cosmic_uplift',
    name: 'Despegue Cósmico Neón',
    subtitle: 'Glissando ascendente futurista con brillo',
    description: 'Efecto de sintetizador moderno con barrido espacial ascendente y brillo envolvente.',
    badge: 'Futurista Neón',
    accentColor: '#8b5cf6'
  }
];

export const DEFAULT_ENTRY_SOUND_ID: EntrySoundId = 'crystal_chime';
export const STORAGE_KEY_ENTRY_SOUND = 'check_list_entry_sound';

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Generate in-memory WAV Base64 URI for each sound
function createWavDataUri(id: EntrySoundId): string {
  try {
    const sampleRate = 22050;
    let duration = 0.55;
    if (id === 'tech_pulse') duration = 0.60;
    if (id === 'zen_bell') duration = 0.75;
    if (id === 'executive_beep') duration = 0.38;
    if (id === 'cosmic_uplift') duration = 0.70;

    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, numSamples * 2, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (id === 'crystal_chime') {
        const env = Math.exp(-t * 6.5);
        const v1 = Math.sin(2 * Math.PI * 659.25 * t) * 0.35;
        const v2 = t >= 0.05 ? Math.sin(2 * Math.PI * 880.0 * t) * 0.45 : 0;
        const v3 = t >= 0.1 ? Math.sin(2 * Math.PI * 1318.51 * t) * 0.35 : 0;
        const v4 = t >= 0.12 ? Math.sin(2 * Math.PI * 2637.0 * t) * 0.15 : 0;
        sample = (v1 + v2 + v3 + v4) * env;
      } else if (id === 'tech_pulse') {
        const env = Math.exp(-t * 5.2);
        const chord1 = Math.sin(2 * Math.PI * 698.46 * t) * 0.30; // F5
        const chord2 = Math.sin(2 * Math.PI * 880.00 * t) * 0.35; // A5
        const chord3 = Math.sin(2 * Math.PI * 1046.50 * t) * 0.40; // C6
        const chord4 = t >= 0.08 ? Math.sin(2 * Math.PI * 1396.91 * t) * 0.30 : 0; // F6
        sample = (chord1 + chord2 + chord3 + chord4) * env;
      } else if (id === 'zen_bell') {
        const env = Math.exp(-t * 4.0);
        const attack = Math.min(1, t / 0.015);
        const fund = Math.sin(2 * Math.PI * 523.25 * t) * 0.55; // C5
        const fifth = Math.sin(2 * Math.PI * 783.99 * t) * 0.35; // G5
        const oct = Math.sin(2 * Math.PI * 1046.50 * t) * 0.15 * Math.exp(-t * 9.0);
        sample = (fund + fifth + oct) * env * attack;
      } else if (id === 'executive_beep') {
        if (t < 0.08) {
          const env1 = Math.sin((t / 0.08) * Math.PI);
          sample = Math.sin(2 * Math.PI * 783.99 * t) * 0.55 * env1;
        } else if (t >= 0.12 && t < 0.28) {
          const t2 = t - 0.12;
          const env2 = Math.exp(-t2 * 10.0);
          sample = Math.sin(2 * Math.PI * 1046.50 * t2) * 0.70 * env2;
        }
      } else if (id === 'cosmic_uplift') {
        const env = Math.exp(-t * 3.8);
        const freqProgress = Math.min(1, t / 0.45);
        const curFreq = 440 + Math.pow(freqProgress, 2) * 1320; // 440Hz -> 1760Hz
        const shimmer = Math.sin(2 * Math.PI * (curFreq * 1.01) * t) * 0.35;
        const main = Math.sin(2 * Math.PI * curFreq * t) * 0.55;
        sample = (main + shimmer) * env;
      }

      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
  } catch {
    return '';
  }
}

// In-memory cache of generated URIs
const wavUriCache: Partial<Record<EntrySoundId, string>> = {};

export function getWavUriForSound(id: EntrySoundId): string {
  if (!wavUriCache[id]) {
    wavUriCache[id] = createWavDataUri(id);
  }
  return wavUriCache[id] || '';
}

export function getActiveEntrySoundId(): EntrySoundId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ENTRY_SOUND);
    if (stored && (ENTRY_SOUNDS.some(s => s.id === stored))) {
      return stored as EntrySoundId;
    }
  } catch {}
  return DEFAULT_ENTRY_SOUND_ID;
}

export function setActiveEntrySoundId(id: string): void {
  try {
    if (ENTRY_SOUNDS.some(s => s.id === id)) {
      localStorage.setItem(STORAGE_KEY_ENTRY_SOUND, id);
    }
  } catch {}
}

/**
 * Synthesize sound via Web Audio API for rich browser playback
 */
function playWebAudioSound(id: EntrySoundId) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const synthesize = () => {
      try {
        const now = ctx.currentTime;

        if (id === 'crystal_chime') {
          // Click mecánico
          const clickOsc = ctx.createOscillator();
          const clickGain = ctx.createGain();
          clickOsc.type = 'triangle';
          clickOsc.frequency.setValueAtTime(320, now);
          clickOsc.frequency.exponentialRampToValueAtTime(60, now + 0.035);
          clickGain.gain.setValueAtTime(0.25, now);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          clickOsc.connect(clickGain);
          clickGain.connect(ctx.destination);
          clickOsc.start(now);
          clickOsc.stop(now + 0.035);

          // E5 -> A5
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(659.25, now);
          osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1);
          gain1.gain.setValueAtTime(0.35, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.45);

          // E6
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(880, now + 0.06);
          osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.16);
          gain2.gain.setValueAtTime(0.001, now);
          gain2.gain.setValueAtTime(0.45, now + 0.06);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.06);
          osc2.stop(now + 0.55);

          // E7
          const osc3 = ctx.createOscillator();
          const gain3 = ctx.createGain();
          osc3.type = 'sine';
          osc3.frequency.setValueAtTime(2637, now + 0.08);
          gain3.gain.setValueAtTime(0.001, now);
          gain3.gain.setValueAtTime(0.2, now + 0.08);
          gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc3.connect(gain3);
          gain3.connect(ctx.destination);
          osc3.start(now + 0.08);
          osc3.stop(now + 0.35);

        } else if (id === 'tech_pulse') {
          // Warm chord F5 + A5 + C6 + F6
          const freqs = [698.46, 880.00, 1046.50, 1396.91];
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.025);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.025 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.025);
            osc.stop(now + 0.58);
          });

        } else if (id === 'zen_bell') {
          // Percussive strike
          const mallet = ctx.createOscillator();
          const malletGain = ctx.createGain();
          mallet.type = 'triangle';
          mallet.frequency.setValueAtTime(260, now);
          malletGain.gain.setValueAtTime(0.3, now);
          malletGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          mallet.connect(malletGain);
          malletGain.connect(ctx.destination);
          mallet.start(now);
          mallet.stop(now + 0.04);

          // C5 + G5 singing resonance
          [523.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            const peak = idx === 0 ? 0.45 : (idx === 1 ? 0.30 : 0.12);
            gain.gain.setValueAtTime(peak, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (idx === 2 ? 0.35 : 0.72));
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.75);
          });

        } else if (id === 'executive_beep') {
          // Tone 1: G5
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(783.99, now);
          gain1.gain.setValueAtTime(0.4, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.08);

          // Tone 2: C6 (higher affirmation)
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1046.50, now + 0.11);
          gain2.gain.setValueAtTime(0.001, now);
          gain2.gain.setValueAtTime(0.55, now + 0.11);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.11);
          osc2.stop(now + 0.33);

        } else if (id === 'cosmic_uplift') {
          const osc = ctx.createOscillator();
          const oscShimmer = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.35);

          oscShimmer.type = 'triangle';
          oscShimmer.frequency.setValueAtTime(444, now);
          oscShimmer.frequency.exponentialRampToValueAtTime(1776, now + 0.35);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

          osc.connect(gain);
          oscShimmer.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          oscShimmer.start(now);
          osc.stop(now + 0.68);
          oscShimmer.stop(now + 0.68);
        }
      } catch (err) {
        console.warn('Synthesis play error:', err);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(synthesize).catch(() => {});
    } else {
      synthesize();
    }
  } catch (err) {
    console.warn('Web Audio not available:', err);
  }
}

/**
 * Universal Entry & Checkmark Sound Player
 * Uses HTML5 Audio with in-memory PCM Data URI + Web Audio API synthesis
 */
export function playEntrySound(targetId?: string) {
  const soundId: EntrySoundId = (targetId && ENTRY_SOUNDS.some(s => s.id === targetId))
    ? (targetId as EntrySoundId)
    : getActiveEntrySoundId();

  // 1. HTML5 Audio (Data URI)
  try {
    const uri = getWavUriForSound(soundId);
    if (uri) {
      const audio = new Audio(uri);
      audio.volume = 0.95;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  } catch (e) {
    console.warn('HTML5 Audio notice:', e);
  }

  // 2. Web Audio API
  try {
    playWebAudioSound(soundId);
  } catch (e) {
    console.warn('Web Audio notice:', e);
  }
}

/**
 * Alias for backward compatibility with SplashScreen
 */
export const playCheckmarkSound = playEntrySound;
