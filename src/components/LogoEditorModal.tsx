import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Upload, Link as LinkIcon, RotateCcw, Save, ShieldCheck, Palette, Check, Sparkles, Sun, Moon, Tablet, Maximize2, User, Trash2, Type, Bold } from 'lucide-react';
import { CustomLogos, LocalColors } from '../types';
import { DEFAULT_LOGO_URL } from '../data/initialData';
import { compressImageFile, hexToRgba } from '../utils/calculations';

export const FONT_FAMILY_PRESETS = [
  { label: 'Inter (Predeterminada)', value: 'Inter, sans-serif' },
  { label: 'Roboto (Google)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Arquitectura)', value: 'Montserrat, sans-serif' },
  { label: 'Poppins (Moderna)', value: 'Poppins, sans-serif' },
  { label: 'Plus Jakarta Sans (Ejecutiva)', value: '"Plus Jakarta Sans", sans-serif' },
  { label: 'Outfit (Minimalista Tech)', value: 'Outfit, sans-serif' },
  { label: 'Space Grotesk (Ingeniería)', value: '"Space Grotesk", sans-serif' },
  { label: 'Sistema / Estándar', value: 'system-ui, -apple-system, sans-serif' }
];

interface LogoEditorModalProps {
  isOpen: boolean;
  currentLogos: CustomLogos;
  localAppBackground?: string;
  localAppBackgroundImage?: string;
  localPresentationBackground?: string;
  localNeonColor?: string;
  localFontFamily?: string;
  localIsBoldText?: boolean;
  initialTarget?: 'header' | 'banner';
  theme?: 'theme-original' | 'theme-glass' | 'light' | 'dark';
  onToggleTheme?: (theme: 'theme-original' | 'theme-glass' | 'light' | 'dark') => void;
  onForceLandscape?: () => void;
  onClose: () => void;
  onUpdateLocalColors?: (
    colors: Partial<LocalColors>
  ) => void;
  onSaveLogos: (
    logos: CustomLogos,
    localColors?: LocalColors
  ) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export const WALLPAPER_PRESETS = [
  {
    label: 'Hormigón & Arquitectura',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1600&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=200&auto=format&fit=crop'
  },
  {
    label: 'Plano Blueprint Oscuro',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1600&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=200&auto=format&fit=crop'
  },
  {
    label: 'Estructura & Acero',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?q=80&w=1600&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?q=80&w=200&auto=format&fit=crop'
  },
  {
    label: 'Rascacielos & Noche',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1600&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop'
  },
  {
    label: 'Obra & Grúa al Atardecer',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1600&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop'
  },
  {
    label: 'Malla Aurora Cyber',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop',
    thumb: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=200&auto=format&fit=crop'
  }
];

export const NEON_COLOR_PRESETS = [
  { label: 'Cian Neón (Original)', value: '#00f2fe', colorClass: 'bg-[#00f2fe]' },
  { label: 'Verde Esmeralda', value: '#10b981', colorClass: 'bg-[#10b981]' },
  { label: 'Ámbar / Oro Eléctrico', value: '#f59e0b', colorClass: 'bg-[#f59e0b]' },
  { label: 'Azul Eléctrico', value: '#00c2ff', colorClass: 'bg-[#00c2ff]' },
  { label: 'Violeta Cyber', value: '#a855f7', colorClass: 'bg-[#a855f7]' },
  { label: 'Rojo Coral Neón', value: '#f43f5e', colorClass: 'bg-[#f43f5e]' },
  { label: 'Verde Flúor / Lima', value: '#84cc16', colorClass: 'bg-[#84cc16]' },
  { label: 'Fucsia Magenta', value: '#ec4899', colorClass: 'bg-[#ec4899]' }
];

const APP_BG_PRESETS = [
  { label: 'Original', value: '', colorClass: 'bg-[#101D30] border-[#29384C]' },
  { label: 'Pizarra Negra', value: '#020617', colorClass: 'bg-[#020617] border-[#29384C]' },
  { label: 'Carbón Obra', value: '#0f172a', colorClass: 'bg-[#101D30] border-[#29384C]' },
  { label: 'Noche Azul', value: '#09111e', colorClass: 'bg-[#09111e] border-[#29384C]' },
  { label: 'Verde Bosque', value: '#031a10', colorClass: 'bg-[#031a10] border-[#29384C]' },
  { label: 'Grafito Zinc', value: '#18181b', colorClass: 'bg-[#18181b] border-[#29384C]' },
  { label: 'Gris Claro', value: '#f1f5f9', colorClass: 'bg-[#f1f5f9] border-slate-300' },
  { label: 'Blanco Puro', value: '#ffffff', colorClass: 'bg-[#ffffff] border-slate-300' }
];

const PRESENTATION_BG_PRESETS = [
  {
    label: 'Original',
    value: '',
    previewStyle: { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)' }
  },
  {
    label: 'Esmeralda',
    value: 'linear-gradient(135deg, #06281e 0%, #0d3d2c 50%, #021a11 100%)',
    previewStyle: { background: 'linear-gradient(135deg, #06281e 0%, #0d3d2c 50%, #021a11 100%)' }
  },
  {
    label: 'Azul Acero',
    value: 'linear-gradient(135deg, #0f2b48 0%, #1e3a5f 50%, #0a192f 100%)',
    previewStyle: { background: 'linear-gradient(135deg, #0f2b48 0%, #1e3a5f 50%, #0a192f 100%)' }
  },
  {
    label: 'Ámbar Ocre',
    value: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #271104 100%)',
    previewStyle: { background: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #271104 100%)' }
  },
  {
    label: 'Cobalto 900',
    value: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)',
    previewStyle: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)' }
  },
  {
    label: 'Titanio',
    value: '#18181b',
    previewStyle: { backgroundColor: '#18181b' }
  },
  {
    label: 'Pizarra',
    value: '#020617',
    previewStyle: { backgroundColor: '#020617' }
  },
  {
    label: 'Carbón',
    value: '#0f172a',
    previewStyle: { backgroundColor: '#0f172a' }
  }
];

export function LogoEditorModal({
  isOpen,
  currentLogos,
  localAppBackground = '',
  localAppBackgroundImage = '',
  localPresentationBackground = '',
  localNeonColor = '#00f2fe',
  localFontFamily = 'Inter, sans-serif',
  localIsBoldText = false,
  initialTarget = 'header',
  theme = 'dark',
  onToggleTheme,
  onForceLandscape,
  onClose,
  onUpdateLocalColors,
  onSaveLogos,
  onShowToast
}: LogoEditorModalProps) {
  const [target, setTarget] = useState<'header' | 'banner'>(initialTarget);
  const [tempPreview, setTempPreview] = useState<string>(
    initialTarget === 'header' ? currentLogos.header : currentLogos.banner
  );
  const [urlInput, setUrlInput] = useState<string>('');
  const [appBg, setAppBg] = useState<string>(localAppBackground);
  const [appBgImage, setAppBgImage] = useState<string>(localAppBackgroundImage || '');
  const [bgImageUrlInput, setBgImageUrlInput] = useState<string>('');
  const [presentationBg, setPresentationBg] = useState<string>(localPresentationBackground);
  const [neonColor, setNeonColor] = useState<string>(localNeonColor || '#00f2fe');
  const [fontFamily, setFontFamily] = useState<string>(localFontFamily || 'Inter, sans-serif');
  const [isBoldText, setIsBoldText] = useState<boolean>(Boolean(localIsBoldText));

  useEffect(() => {
    if (isOpen) {
      setAppBg(localAppBackground);
      setAppBgImage(localAppBackgroundImage || '');
      setPresentationBg(localPresentationBackground);
      setNeonColor(localNeonColor || '#00f2fe');
      setFontFamily(localFontFamily || 'Inter, sans-serif');
      setIsBoldText(Boolean(localIsBoldText));
      setTempPreview(initialTarget === 'header' ? currentLogos.header : currentLogos.banner);
    }
  }, [isOpen, localAppBackground, localAppBackgroundImage, localPresentationBackground, localNeonColor, localFontFamily, localIsBoldText, currentLogos, initialTarget]);

  if (!isOpen) return null;

  const handleTargetChange = (newTarget: 'header' | 'banner') => {
    setTarget(newTarget);
    setTempPreview(newTarget === 'header' ? currentLogos.header : currentLogos.banner);
    setUrlInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      setTempPreview(compressed);
      onShowToast('Imagen cargada en vista previa', 'Image');
    } catch (err) {
      onShowToast('Error al cargar la imagen', 'AlertCircle');
    }
  };

  const handleApplyUrl = () => {
    const val = urlInput.trim();
    if (!val) {
      onShowToast('Ingresa una URL válida', 'AlertCircle');
      return;
    }
    setTempPreview(val);
    onShowToast('URL cargada en vista previa', 'Image');
  };

  const handleBgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compresión optimizada para fondo de pantalla full HD liviano y persistente
      const compressed = await compressImageFile(file, 1280, 0.75);
      setAppBgImage(compressed);
      onUpdateLocalColors?.({ appBackgroundImage: compressed });
      onShowToast('Fondo de pantalla cargado en vista previa', 'Image');
    } catch (err) {
      onShowToast('Error al cargar imagen de fondo', 'AlertCircle');
    }
  };

  const handleApplyBgImageUrl = () => {
    const val = bgImageUrlInput.trim();
    if (!val) {
      onShowToast('Ingresa una URL válida de imagen', 'AlertCircle');
      return;
    }
    setAppBgImage(val);
    onUpdateLocalColors?.({ appBackgroundImage: val });
    setBgImageUrlInput('');
    onShowToast('Fondo aplicado en vista previa', 'Image');
  };

  const handleRemoveBgImage = () => {
    setAppBgImage('');
    onUpdateLocalColors?.({ appBackgroundImage: '' });
    onShowToast('Fondo de imagen eliminado (vuelve al fondo original)', 'RotateCcw');
  };

  const handleSave = () => {
    const updatedLogos: CustomLogos = {
      ...currentLogos,
      [target]: tempPreview
    };
    const localColors: LocalColors = {
      appBackground: appBg,
      presentationBackground: presentationBg,
      neonColor: neonColor || '#00f2fe',
      appBackgroundImage: appBgImage,
      fontFamily: fontFamily || 'Inter, sans-serif',
      isBoldText: isBoldText
    };
    onSaveLogos(updatedLogos, localColors);
    onClose();
    onShowToast('¡Configuración guardada en este equipo!', 'Check');
  };

  const handleResetColors = () => {
    setAppBg('');
    setAppBgImage('');
    setPresentationBg('');
    setNeonColor('#00f2fe');
    setFontFamily('Inter, sans-serif');
    setIsBoldText(false);
    onUpdateLocalColors?.({
      appBackground: '',
      appBackgroundImage: '',
      presentationBackground: '',
      neonColor: '#00f2fe',
      fontFamily: 'Inter, sans-serif',
      isBoldText: false
    });
    onShowToast('Colores, fondo, tipografía y neón restablecidos a los originales', 'RotateCcw');
  };

  const handleReset = () => {
    if (confirm('¿Restablecer logotipos, tipografía y colores al diseño original?')) {
      const resetLogos: CustomLogos = {
        header: DEFAULT_LOGO_URL,
        banner: DEFAULT_LOGO_URL
      };
      setTempPreview(DEFAULT_LOGO_URL);
      setAppBg('');
      setAppBgImage('');
      setPresentationBg('');
      setNeonColor('#00f2fe');
      setFontFamily('Inter, sans-serif');
      setIsBoldText(false);
      onUpdateLocalColors?.({
        appBackground: '',
        appBackgroundImage: '',
        presentationBackground: '',
        neonColor: '#00f2fe',
        fontFamily: 'Inter, sans-serif',
        isBoldText: false
      });
      onSaveLogos(resetLogos, {
        appBackground: '',
        presentationBackground: '',
        neonColor: '#00f2fe',
        appBackgroundImage: '',
        fontFamily: 'Inter, sans-serif',
        isBoldText: false
      });
      onClose();
      onShowToast('Logotipos, fondos, colores y tipografía restablecidos al original', 'RotateCcw');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      <div className="bg-[#101D30] text-[#F8FAFC] w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border border-[#29384C] border-t-4 border-t-amber-500 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-[#F8FAFC] text-base leading-none">
                Perfil de Usuario & Configuración
              </h3>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                Visualización, tema de pantalla y personalización
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-slate-600 p-2 touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sector 1: Modo de Visualización (Día / Noche) */}
        <div className="mt-4 p-3 bg-[#17263B] rounded-xl border border-[#29384C]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-[#F8FAFC] uppercase tracking-wide flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Selector de Tema / Apariencia</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-[#94A3B8] uppercase">
              {theme === 'theme-glass' || theme === 'light' ? 'Tema 2: Glassmorphism' : 'Tema 1: Original'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Botón Tema 1: Original Oscuro */}
            <button
              type="button"
              onClick={() => onToggleTheme && onToggleTheme('theme-original')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                theme === 'theme-original' || theme === 'dark'
                  ? 'bg-[#101D30] text-white border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-[#101D30] text-[#94A3B8] hover:text-white border-[#29384C]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="w-6 h-6 rounded-lg bg-indigo-950 flex items-center justify-center text-cyan-400">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                {(theme === 'theme-original' || theme === 'dark') && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Tema 1: Original</p>
                <p className={`text-[10px] mt-0.5 leading-snug ${theme === 'theme-original' || theme === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Industrial Oscuro
                </p>
              </div>
            </button>

            {/* Botón Tema 2: Minimalista Glassmorphism */}
            <button
              type="button"
              onClick={() => onToggleTheme && onToggleTheme('theme-glass')}
              className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                theme === 'theme-glass' || theme === 'light'
                  ? 'bg-amber-50/60 text-slate-900 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                  : 'bg-[#101D30] text-[#94A3B8] hover:text-white border-[#29384C]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <Sun className="w-3.5 h-3.5" />
                </div>
                {(theme === 'theme-glass' || theme === 'light') && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">Tema 2: Glass</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  Minimalista Translúcido
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Sector 2: Orientación para Tablet (Modo Apaisado) */}
        <div className="mt-3 p-3 bg-[#17263B] rounded-xl border border-[#29384C]">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-[#F8FAFC] uppercase tracking-wide flex items-center gap-1.5">
              <Tablet className="w-3.5 h-3.5 text-blue-600" />
              <span>Orientación Tablet (Apaisado)</span>
            </label>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Horizontal
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
            Si abres la app en una tablet y se muestra a lo alto (vertical), pulsa para fijar la pantalla a lo ancho horizontal como en una PC:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onForceLandscape}
              className="py-2 px-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fijar Apaisado</span>
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                  }
                  onShowToast('Giro de pantalla libre', 'RotateCcw');
                } catch (e) {
                  onShowToast('Rotación automática libre', 'RotateCcw');
                }
              }}
              className="py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Rotación Libre</span>
            </button>
          </div>
        </div>

        {/* Sector 3: Tipografía y Estilo de Letra (Negrita) */}
        <div className="mt-3 p-3 bg-[#17263B] rounded-xl border border-[#29384C]">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-[#F8FAFC] uppercase tracking-wide flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-amber-500" />
              <span>Tipografía y Estilo de Texto</span>
            </label>
            <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
              {isBoldText ? 'Negrita Activa' : 'Normal'}
            </span>
          </div>

          {/* Selector de Familia Tipográfica */}
          <div className="mb-2.5">
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Fuente para toda la aplicación:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {FONT_FAMILY_PRESETS.map((f) => {
                const isSelected = (fontFamily || 'Inter, sans-serif').toLowerCase() === f.value.toLowerCase();
                return (
                  <button
                    key={f.label}
                    type="button"
                    onClick={() => {
                      setFontFamily(f.value);
                      onUpdateLocalColors?.({ fontFamily: f.value });
                      document.documentElement.style.setProperty('--app-font-family', f.value);
                      document.documentElement.style.setProperty('--font-sans', f.value);
                      document.body.style.setProperty('--app-font-family', f.value);
                      document.body.style.setProperty('--font-sans', f.value);
                      document.documentElement.style.fontFamily = f.value;
                      document.body.style.fontFamily = f.value;
                    }}
                    style={{ fontFamily: f.value }}
                    className={`py-1.5 px-2 rounded-lg text-xs transition-all text-left flex items-center justify-between border ${
                      isSelected
                        ? 'border-amber-500 bg-white text-slate-950 ring-2 ring-amber-500/30 font-bold shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{f.label.split(' ')[0]}</span>
                    {isSelected && (
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle de Modo Negrita (Bold) */}
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isBoldText ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600 font-bold'
              }`}>
                <Bold className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  Texto en Negrita (Bold)
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Aumenta el grosor de todas las letras de la app
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextBold = !isBoldText;
                setIsBoldText(nextBold);
                onUpdateLocalColors?.({ isBoldText: nextBold });
                if (nextBold) {
                  document.documentElement.classList.add('font-bold-mode');
                  document.body.classList.add('font-bold-mode');
                } else {
                  document.documentElement.classList.remove('font-bold-mode');
                  document.body.classList.remove('font-bold-mode');
                }
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1 shadow-xs ${
                isBoldText
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-500/30'
                  : 'bg-[#101D30] text-[#94A3B8] border border-[#29384C] hover:bg-slate-300'
              }`}
            >
              {isBoldText ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Activada</span>
                </>
              ) : (
                <span>Desactivada</span>
              )}
            </button>
          </div>

          {/* Vista previa en vivo de texto */}
          <div
            className="mt-2 p-2 rounded-lg bg-[#101D30] text-white text-center border border-[#29384C]"
            style={{ fontFamily: fontFamily || 'Inter, sans-serif' }}
          >
            <p className={`text-xs ${isBoldText ? 'font-black text-amber-400' : 'font-normal text-slate-300'}`}>
              Vista previa: Control de Avance de Obra 2026
            </p>
            <p className={`text-[10px] mt-0.5 ${isBoldText ? 'font-bold text-white' : 'font-light text-[#94A3B8]'}`}>
              Tipografía: {FONT_FAMILY_PRESETS.find(f => f.value.toLowerCase() === (fontFamily || '').toLowerCase())?.label || 'Personalizada'} {isBoldText ? '• (Negrita Activa)' : ''}
            </p>
          </div>
        </div>

        {/* Target Tabs */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
            ¿Qué elemento deseas actualizar?
          </label>
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTargetChange('header')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                target === 'header'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Logo Header</span>
            </button>

            <button
              type="button"
              onClick={() => handleTargetChange('banner')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                target === 'banner'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Logo Portada</span>
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-4 bg-[#101D30] p-4 rounded-xl border border-[#29384C] flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2">
            Vista Previa
          </span>
          <div className="w-20 h-20 bg-slate-950 rounded-xl p-2 border-2 border-emerald-500 shadow-md shadow-emerald-950/50 flex items-center justify-center overflow-hidden">
            <img
              src={tempPreview || DEFAULT_LOGO_URL}
              alt="Vista previa logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL;
              }}
            />
          </div>
          <p className="text-[11px] text-slate-300 mt-2 text-center">
            {target === 'header' ? 'Logo en barra superior y PDF' : 'Logo en tarjeta principal de obra'}
          </p>
        </div>

        {/* Upload options */}
        <div className="mt-4 space-y-3">
          {/* File Upload */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5 text-amber-600" /> 1. Subir archivo desde tu dispositivo
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/40 rounded-xl p-3 cursor-pointer transition-colors text-center">
              <Upload className="w-5 h-5 text-amber-600 mb-1" />
              <span className="text-xs font-bold text-slate-800">Toca para elegir imagen</span>
              <span className="text-[10px] text-slate-500">PNG, JPG, SVG o WebP</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1 flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-amber-600" /> 2. O pegar URL de imagen
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://ejemplo.com/logo.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50 font-medium"
              />
              <button
                type="button"
                onClick={handleApplyUrl}
                className="bg-[#101D30] text-amber-400 px-3 py-2 rounded-xl text-xs font-bold touch-target active:scale-95 border border-amber-500/40"
              >
                Probar
              </button>
            </div>
          </div>
        </div>

        {/* Sector de Personalización de Fondos y Colores de la App y Obras */}
        <div className="mt-5 pt-4 border-t-2 border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-black text-[#F8FAFC] uppercase tracking-wider">
                Colores & Fondos (Este Dispositivo)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleResetColors}
              className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition-colors touch-target"
              title="Restaurar los colores originales en este dispositivo"
            >
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span>Restaurar colores originales</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-3.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 inline-block"></span>
            <span>Ajuste exclusivo para este equipo. No modifica los colores de otros celulares ni computadoras.</span>
          </p>

          {/* SECCIÓN DESTACADA: Imagen de Fondo de Pantalla (Wallpaper Personalizado) */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-amber-50/60 p-3.5 rounded-2xl border-2 border-indigo-200/80 mb-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-[#F8FAFC] uppercase tracking-wide flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>Imagen de Fondo de Pantalla (Wallpaper)</span>
              </label>
              {appBgImage ? (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Activo
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  Sin imagen
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
              Elige una imagen para el fondo general de la app. Gracias al efecto de vidrio esmerilado, la imagen se traslucirá con elegancia a través de todas las tarjetas de obra, el menú inferior y la barra superior.
            </p>

            {/* Vista previa de fondo activo */}
            {appBgImage ? (
              <div className="relative rounded-xl overflow-hidden mb-3 border border-indigo-300 shadow-sm group">
                <div
                  className="h-28 w-full bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url(${appBgImage})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    Vista previa del fondo seleccionado
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveBgImage}
                    className="px-2 py-1 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all"
                    title="Eliminar imagen y volver al fondo original"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar fondo</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Opciones de carga: Archivo propio y URL */}
            <div className="space-y-2.5 mb-3">
              {/* Opción A: Subir imagen desde el dispositivo */}
              <div>
                <label className="flex items-center justify-between border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white/80 hover:bg-indigo-50/50 rounded-xl p-2.5 cursor-pointer transition-all">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">Subir foto desde este dispositivo</p>
                      <p className="text-[10px] text-slate-500">Toca para buscar en tu galería o fotos de obra</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                    Examinar
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBgImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Opción B: Pegar URL */}
              <div>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="O pegar enlace web (https://...)"
                      value={bgImageUrlInput}
                      onChange={(e) => setBgImageUrlInput(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyBgImageUrl}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold touch-target active:scale-95 shadow-xs"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>

            {/* Opción C: Galería de Wallpapers de Obra y Arquitectura */}
            <div>
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>O elige un fondo temático de obra:</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {WALLPAPER_PRESETS.map((wp) => {
                  const isSelected = appBgImage === wp.url;
                  return (
                    <button
                      key={wp.label}
                      type="button"
                      onClick={() => {
                        setAppBgImage(wp.url);
                        onUpdateLocalColors?.({ appBackgroundImage: wp.url });
                        onShowToast(`Fondo "${wp.label}" seleccionado`, 'Image');
                      }}
                      className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all aspect-video flex flex-col justify-end p-1.5 ${
                        isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/40 shadow-md scale-102'
                          : 'border-slate-200 hover:border-indigo-300 opacity-90 hover:opacity-100'
                      }`}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundImage: `url(${wp.thumb || wp.url})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <span className="relative z-10 text-[9px] font-bold text-white line-clamp-1 leading-tight drop-shadow">
                        {wp.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 1. Fondo de la App */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <span>1. Color del Fondo de la App</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  {appBg ? appBg : 'Original'}
                </span>
                <label className="w-6 h-6 rounded-full border border-slate-300 shadow-xs cursor-pointer overflow-hidden flex items-center justify-center p-0 relative" title="Seleccionar color personalizado">
                  <input
                    type="color"
                    value={appBg || '#0f172a'}
                    onChange={(e) => {
                      setAppBg(e.target.value);
                      onUpdateLocalColors?.({ appBackground: e.target.value });
                    }}
                    className="w-8 h-8 cursor-pointer opacity-0 absolute"
                  />
                  <span
                    className="w-full h-full rounded-full border border-white"
                    style={{ backgroundColor: appBg || '#0f172a' }}
                  />
                </label>
              </div>
            </div>

            {/* Quick Palette Chips for App Background */}
            <div className="grid grid-cols-4 gap-1.5">
              {APP_BG_PRESETS.map((p) => {
                const isSelected = appBg === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setAppBg(p.value);
                      onUpdateLocalColors?.({ appBackground: p.value });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/40 bg-white text-slate-900 shadow-xs font-black'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 border border-slate-400/40 ${p.colorClass}`}
                      style={p.value ? { backgroundColor: p.value } : undefined}
                    />
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fondo de la Presentación de cada Obra */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <span>2. Fondos de Presentación de Obras</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase truncate max-w-[90px]">
                  {presentationBg ? 'Personalizado' : 'Original'}
                </span>
                <label className="w-6 h-6 rounded-full border border-slate-300 shadow-xs cursor-pointer overflow-hidden flex items-center justify-center p-0 relative" title="Seleccionar color sólido para obras">
                  <input
                    type="color"
                    value={presentationBg && !presentationBg.startsWith('linear') ? presentationBg : '#0f172a'}
                    onChange={(e) => {
                      setPresentationBg(e.target.value);
                      onUpdateLocalColors?.({ presentationBackground: e.target.value });
                    }}
                    className="w-8 h-8 cursor-pointer opacity-0 absolute"
                  />
                  <span
                    className="w-full h-full rounded-full border border-white"
                    style={presentationBg ? (presentationBg.startsWith('linear') ? { background: presentationBg } : { backgroundColor: presentationBg }) : { background: 'linear-gradient(135deg, #0f172a, #020617)' }}
                  />
                </label>
              </div>
            </div>

            {/* Quick Palette Chips for Presentation Background */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PRESENTATION_BG_PRESETS.map((p) => {
                const isSelected = presentationBg === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setPresentationBg(p.value);
                      onUpdateLocalColors?.({ presentationBackground: p.value });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/40 bg-white text-slate-900 shadow-xs font-black'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0 border border-slate-400/40 shadow-xs"
                      style={p.previewStyle}
                    />
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Color del Neón Ejecutivo */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Color del Neón (Líneas y Luces de Obras)</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  {neonColor ? neonColor : '#00F2FE'}
                </span>
                <label className="w-6 h-6 rounded-full border border-slate-300 shadow-xs cursor-pointer overflow-hidden flex items-center justify-center p-0 relative" title="Seleccionar color de neón libre">
                  <input
                    type="color"
                    value={neonColor || '#00f2fe'}
                    onChange={(e) => {
                      setNeonColor(e.target.value);
                      onUpdateLocalColors?.({ neonColor: e.target.value });
                    }}
                    className="w-8 h-8 cursor-pointer opacity-0 absolute"
                  />
                  <span
                    className="w-full h-full rounded-full border border-white"
                    style={{ backgroundColor: neonColor || '#00f2fe' }}
                  />
                </label>
              </div>
            </div>

            {/* Neon Live Preview Badge */}
            <div
              className="mb-2.5 p-2.5 rounded-xl bg-[#101D30] border-2 transition-all flex items-center justify-between shadow-md"
              style={{
                borderColor: neonColor || '#00f2fe',
                boxShadow: `0 0 16px ${hexToRgba(neonColor || '#00f2fe', 0.4)}`
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor: neonColor || '#00f2fe',
                    boxShadow: `0 0 8px ${neonColor || '#00f2fe'}`
                  }}
                />
                <span className="text-xs font-black text-white">Vista previa del borde neón</span>
              </div>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border"
                style={{
                  color: neonColor || '#00f2fe',
                  borderColor: hexToRgba(neonColor || '#00f2fe', 0.4),
                  backgroundColor: hexToRgba(neonColor || '#00f2fe', 0.15)
                }}
              >
                Iluminado
              </span>
            </div>

            {/* Quick Palette Chips for Neon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {NEON_COLOR_PRESETS.map((p) => {
                const isSelected = (neonColor || '#00f2fe').toLowerCase() === p.value.toLowerCase();
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setNeonColor(p.value);
                      onUpdateLocalColors?.({ neonColor: p.value });
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/40 bg-white text-slate-900 shadow-xs font-black'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 border border-slate-400/40 shadow-xs ${p.colorClass}`}
                      style={{
                        backgroundColor: p.value,
                        boxShadow: `0 0 8px ${hexToRgba(p.value, 0.6)}`
                      }}
                    />
                    <span className="truncate">{p.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-[#101D30] text-[#94A3B8] border border-[#29384C] text-xs font-bold rounded-xl touch-target flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Restablecer Original
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl touch-target shadow flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
