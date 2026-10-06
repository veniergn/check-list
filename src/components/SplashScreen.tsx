import React, { useState, useEffect, useRef } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Genera en memoria un archivo WAV PCM nativo con un chime armónico ascendente
 * (E5 -> A5 -> E6 -> E7). Es 100% compatible con Tablets iPad y Android,
 * atravesando políticas de autoplay y ringer switches sin requerir archivos externos.
 */
function createChimeWavUri(): string {
  try {
    const sampleRate = 22050;
    const duration = 0.55;
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
      const env = Math.exp(-t * 6.5);
      const val1 = Math.sin(2 * Math.PI * 659.25 * t) * 0.35;
      const val2 = t >= 0.05 ? Math.sin(2 * Math.PI * 880.0 * t) * 0.45 : 0;
      const val3 = t >= 0.1 ? Math.sin(2 * Math.PI * 1318.51 * t) * 0.35 : 0;
      const val4 = t >= 0.12 ? Math.sin(2 * Math.PI * 2637.0 * t) * 0.15 : 0;
      const sample = Math.max(-1, Math.min(1, (val1 + val2 + val3 + val4) * env));
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

let cachedChimeUri: string | null = null;
function getChimeUri(): string {
  if (!cachedChimeUri) {
    cachedChimeUri = createChimeWavUri();
  }
  return cachedChimeUri;
}

/**
 * Reproduce el sonido de confirmación / ingreso utilizando doble motor:
 * 1. Elemento HTML5 Audio nativo (Infalible en iPads y tablets Android con canal multimedia activo)
 * 2. Web Audio API nativo con manejo asíncrono de resume para navegadores modernos
 */
export function playCheckmarkSound() {
  // 1. Motor HTML5 Audio con Data URI WAV
  try {
    const uri = getChimeUri();
    if (uri) {
      const audio = new Audio(uri);
      audio.volume = 0.95;
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    }
  } catch (err) {
    console.warn('HTML5 Audio notice:', err);
  }

  // 2. Motor Web Audio API nativo con resume asíncrono
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const startSynthesis = () => {
      try {
        const now = ctx.currentTime;

        // Pop mecánico inicial
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

        // Chime ascendente armónico
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
      } catch (e) {
        console.warn('Synthesis play error:', e);
      }
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(startSynthesis).catch(() => {});
    } else {
      startSynthesis();
    }
  } catch (err) {
    console.warn('Web Audio no disponible:', err);
  }
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false);
  const triggeredRef = useRef(false);

  useEffect(() => {
    // Permitir ingreso con teclado (Barra espaciadora o Enter)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerEnter();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Failsafe: Si por alguna razón no se detecta el toque o el usuario espera, ingresar automáticamente
    const failsafeTimer = setTimeout(() => {
      triggerEnter();
    }, 4500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(failsafeTimer);
    };
  }, []);

  const triggerEnter = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (triggeredRef.current) return;
    triggeredRef.current = true;

    // Reproducir sonido de tilde de forma segura (sin bloquear el ingreso si falla el audio)
    try {
      playCheckmarkSound();
    } catch (err) {
      console.warn('Audio play notice:', err);
    }

    // En tablets, orientar de forma apaisada (landscape) durante el gesto táctil del usuario
    try {
      const minSide = Math.min(window.screen.width, window.screen.height);
      const isTablet = minSide >= 500 || /tablet|ipad|playbook|silk/i.test(navigator.userAgent);
      if (isTablet && window.screen.orientation && window.screen.orientation.lock) {
        window.screen.orientation.lock('landscape').catch(() => {});
      }
    } catch {}

    // Iniciar efecto expansivo
    setIsExiting(true);

    // Concluir transición y pasar a la pantalla principal
    setTimeout(() => {
      onFinish();
    }, 600);
  };

  return (
    <div
      onClick={triggerEnter}
      onPointerUp={triggerEnter}
      onPointerDown={() => {
        // En tablets, el primer toque desbloquea el canal de audio del navegador de inmediato
        try {
          const uri = getChimeUri();
          if (uri) {
            const a = new Audio(uri);
            a.volume = 0.001;
            a.play().then(() => {
              a.pause();
              a.currentTime = 0;
            }).catch(() => {});
          }
        } catch {}
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        triggerEnter(e);
      }}
      className={`fixed inset-0 z-[99999] bg-black select-none overflow-hidden flex flex-col items-center justify-between py-10 px-6 cursor-pointer transition-opacity duration-700 pointer-events-auto ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #061e12 0%, #020b06 45%, #000000 100%)',
        touchAction: 'manipulation'
      }}
      role="button"
      tabIndex={0}
      aria-label="Toca o haz clic para ingresar a Control de Avance"
    >
      {/* Top subtle badge */}
      <div className={`transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-80'}`}>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wider uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          Control de Avance
        </span>
      </div>

      {/* Central Checkmark with dramatic expansion effect */}
      <div className="relative flex items-center justify-center my-auto">
        {/* Glow ambient circle */}
        <div
          className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none transition-all duration-700 ${
            isExiting ? 'scale-[6] opacity-0' : 'scale-100 opacity-100 animate-pulse'
          }`}
        />

        {/* Green Checkmark Image */}
        <div
          className={`relative z-10 transition-all duration-700 ease-in will-change-transform ${
            isExiting
              ? 'scale-[20] opacity-0 filter brightness-150 drop-shadow-[0_0_100px_rgba(34,197,94,1)]'
              : 'scale-100 opacity-100 filter drop-shadow-[0_0_35px_rgba(34,197,94,0.6)] hover:scale-105 active:scale-95'
          }`}
        >
          <img
            src="/icon.png?v=5"
            alt="Tilde Verde"
            className="w-56 h-56 sm:w-72 sm:h-72 md:w-88 md:h-88 object-contain pointer-events-none"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>

      {/* Clean Minimalist Bottom - Clutter button removed */}
      <div
        className={`flex flex-col items-center gap-2 text-center transition-all duration-300 ${
          isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400 font-mono animate-pulse">
          Toca la pantalla para ingresar
        </p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-500/50 font-mono">
          Sistema de Inspección en Obra
        </p>
      </div>
    </div>
  );
}
