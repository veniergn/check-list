import React, { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone, Laptop, Check } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if user dismissed recently (wait 2 days before showing again)
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed, 10);
      if (diff < 1000 * 60 * 60 * 48) {
        return;
      }
    }

    // Listen for beforeinstallprompt on Chromium / Android / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, show prompt after a brief delay
    if (isIosDevice && !isInStandaloneMode) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 no-print">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border-2 border-amber-500/80 flex flex-col gap-3 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded-lg touch-target"
          aria-label="Cerrar aviso de instalación"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Header */}
        <div className="flex items-start space-x-3 pr-6">
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden shadow-md">
            <img src="/icon.png" alt="Check List Icon" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-400">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar Aplicación</span>
            </div>
            <h4 className="font-black text-sm text-white leading-snug mt-0.5">
              Control de Avance de Obra
            </h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              Descarga la app en tu celular o notebook para abrirla a pantalla completa y usarla sin conexión.
            </p>
          </div>
        </div>

        {/* Action button or iOS guide */}
        {isIOS ? (
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-[11px] text-slate-200 flex items-center gap-2">
            <Share className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              Toca el botón <strong className="text-white font-bold">Compartir</strong> abajo en Safari y elige <strong className="text-amber-400 font-bold">'Agregar a Inicio' ➕</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow flex items-center justify-center gap-1.5 transition-all touch-target"
            >
              <Download className="w-4 h-4" />
              <span>Instalar en el Dispositivo</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
