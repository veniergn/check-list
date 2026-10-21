import React, { useState, useEffect, useRef } from 'react';
import { playEntrySound, playCheckmarkSound, getWavUriForSound, getActiveEntrySoundId } from '../utils/entrySounds';

// Re-export for compatibility
export { playCheckmarkSound };

interface SplashScreenProps {
  onFinish: () => void;
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

    // Reproducir sonido de tilde seleccionado de forma segura
    try {
      playEntrySound();
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
          const activeSound = getActiveEntrySoundId();
          const uri = getWavUriForSound(activeSound);
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
