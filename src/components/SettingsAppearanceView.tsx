import React, { useState, useRef } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Type,
  Layout,
  Upload,
  Check,
  RotateCcw,
  Eye,
  Save,
  Sliders,
  Sparkles,
  Building2,
  Camera,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Volume2,
  Play,
  Music
} from 'lucide-react';
import {
  ENTRY_SOUNDS,
  EntrySoundId,
  playEntrySound,
  setActiveEntrySoundId
} from '../utils/entrySounds';
import { CustomLogos, LocalColors, Project, AppTheme } from '../types';
import { compressImageFile } from '../utils/calculations';

interface SettingsAppearanceViewProps {
  currentLogos: CustomLogos;
  localColors: LocalColors;
  theme?: AppTheme;
  projects?: Project[];
  onToggleTheme?: (theme: AppTheme) => void;
  onPreviewAppearance?: (logos: CustomLogos, colors: LocalColors) => void;
  onSaveAppearance: (logos: CustomLogos, colors: LocalColors) => void;
  onRestoreDefaults: () => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const FONT_PRESETS = [
  { label: 'Inter (Predeterminada)', value: 'Inter, sans-serif' },
  { label: 'Montserrat (Arquitectura & Diseño)', value: 'Montserrat, sans-serif' },
  { label: 'Roboto (Google Standard)', value: 'Roboto, sans-serif' },
  { label: 'Poppins (Moderna & Geométrica)', value: 'Poppins, sans-serif' },
  { label: 'Plus Jakarta Sans (Corporativa)', value: '"Plus Jakarta Sans", sans-serif' },
  { label: 'Outfit (Minimalista Tech)', value: 'Outfit, sans-serif' },
  { label: 'Space Grotesk (Ingeniería)', value: '"Space Grotesk", sans-serif' },
  { label: 'Sistema Nativo', value: 'system-ui, -apple-system, sans-serif' }
];

const NEON_PRESETS = [
  { label: 'Cian Neón (Original)', value: '#00f2fe' },
  { label: 'Azul Eléctrico', value: '#3b82f6' },
  { label: 'Verde Esmeralda', value: '#10b981' },
  { label: 'Ámbar / Oro Obra', value: '#f59e0b' },
  { label: 'Violeta Tecnológico', value: '#8b5cf6' },
  { label: 'Rojo Coral Alerta', value: '#f43f5e' },
  { label: 'Verde Lima Flúor', value: '#84cc16' },
  { label: 'Rosa Magenta', value: '#ec4899' }
];

const BACKGROUND_PRESETS = [
  { label: 'Azul Marino Oscuro (Predeterminado)', value: '#081321' },
  { label: 'Negro Pizarra Obra', value: '#020617' },
  { label: 'Noche Profunda', value: '#09111e' },
  { label: 'Carbón Grafito', value: '#121826' },
  { label: 'Zinc Técnico', value: '#18181b' },
  { label: 'Gris Claro Ejecutivo', value: '#f1f5f9' },
  { label: 'Blanco Puro', value: '#ffffff' }
];

export function SettingsAppearanceView({
  currentLogos,
  localColors,
  theme = 'theme-original',
  projects = [],
  onToggleTheme,
  onPreviewAppearance,
  onSaveAppearance,
  onRestoreDefaults,
  onShowToast
}: SettingsAppearanceViewProps) {
  // Active Tab: 'identity' | 'colors' | 'typography' | 'layout'
  const [activeTab, setActiveTab] = useState<'identity' | 'colors' | 'typography' | 'layout' | 'sound'>('identity');

  // Draft state for Logos & Identity
  const [draftLogos, setDraftLogos] = useState<CustomLogos>({
    header: currentLogos.header || '',
    banner: currentLogos.banner || '',
    sidebarLogo: currentLogos.sidebarLogo || '',
    sidebarLogoSize: currentLogos.sidebarLogoSize || 36,
    sidebarLogoAlign: currentLogos.sidebarLogoAlign || 'left',
    sidebarShowText: currentLogos.sidebarShowText ?? true,
    appName: currentLogos.appName || 'CONTROL DE AVANCE',
    directorAvatarUrl: currentLogos.directorAvatarUrl || '',
    directorName: currentLogos.directorName || 'Arq. Venier Gastón',
    directorRole: currentLogos.directorRole || 'Director Técnico',
    entrySound: currentLogos.entrySound || 'crystal_chime'
  });

  // Draft state for Colors & Theme
  const [draftColors, setDraftColors] = useState<LocalColors>({
    appBackground: localColors.appBackground || '#081321',
    presentationBackground: localColors.presentationBackground || '#101D30',
    neonColor: localColors.neonColor || '#00f2fe',
    secondaryColor: localColors.secondaryColor || '#3b82f6',
    cardBackground: localColors.cardBackground || '#101D30',
    sidebarBackground: localColors.sidebarBackground || '#081321',
    headerTextColor: localColors.headerTextColor || '#F8FAFC',
    bodyTextColor: localColors.bodyTextColor || '#94A3B8',
    progressColor: localColors.progressColor || '#10b981',
    fontFamily: localColors.fontFamily || 'Inter, sans-serif',
    fontSize: localColors.fontSize || 'standard',
    visualDensity: localColors.visualDensity || 'standard',
    isBoldText: localColors.isBoldText || false
  });

  const [draftTheme, setDraftTheme] = useState<AppTheme>(theme);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const directorAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleDirectorAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onShowToast?.('Cargando foto de perfil...', 'Sparkles');
      const compressed = await compressImageFile(file, 400, 0.85);
      setDraftLogos(prev => ({ ...prev, directorAvatarUrl: compressed }));
      onShowToast?.('Foto de perfil cargada en vista previa', 'Check');
    } catch (err) {
      console.error('Error cargando foto:', err);
      onShowToast?.('Error al procesar la imagen', 'AlertCircle');
    } finally {
      e.target.value = '';
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onShowToast?.('Cargando logotipo...', 'Sparkles');
      const compressed = await compressImageFile(file, 400, 0.9);
      setDraftLogos(prev => ({ ...prev, sidebarLogo: compressed, header: compressed }));
      onShowToast?.('Logotipo cargado en vista previa', 'Check');
    } catch (err) {
      console.error('Error cargando logo:', err);
      onShowToast?.('Error al procesar el archivo', 'AlertCircle');
    } finally {
      e.target.value = '';
    }
  };

  // Preview Changes
  const handleApplyPreview = () => {
    setActiveEntrySoundId(draftLogos.entrySound || 'crystal_chime');
    onPreviewAppearance?.(draftLogos, draftColors);
    if (onToggleTheme && draftTheme !== theme) {
      onToggleTheme(draftTheme);
    }
    onShowToast?.('Vista previa aplicada en pantalla (sin guardar todavía)', 'Eye');
  };

  // Save Changes
  const handleSave = () => {
    setActiveEntrySoundId(draftLogos.entrySound || 'crystal_chime');
    onSaveAppearance(draftLogos, draftColors);
    if (onToggleTheme && draftTheme !== theme) {
      onToggleTheme(draftTheme);
    }
    onShowToast?.('¡Configuración estética guardada con éxito en Supabase!', 'Check');
  };

  // Restore Defaults
  const handleRestore = () => {
    if (confirm('¿Restablecer toda la configuración visual a los valores predeterminados de fábrica?')) {
      onRestoreDefaults();
      setDraftLogos({
        header: '',
        banner: '',
        sidebarLogo: '',
        sidebarLogoSize: 36,
        sidebarLogoAlign: 'left',
        sidebarShowText: true,
        appName: 'CONTROL DE AVANCE',
        entrySound: 'crystal_chime'
      });
      setActiveEntrySoundId('crystal_chime');
      setDraftColors({
        appBackground: '#081321',
        presentationBackground: '#101D30',
        neonColor: '#00f2fe',
        secondaryColor: '#3b82f6',
        cardBackground: '#101D30',
        sidebarBackground: '#081321',
        headerTextColor: '#F8FAFC',
        bodyTextColor: '#94A3B8',
        progressColor: '#10b981',
        fontFamily: 'Inter, sans-serif',
        fontSize: 'standard',
        visualDensity: 'standard',
        isBoldText: false
      });
      setDraftTheme('theme-original');
      onShowToast?.('Valores originales restablecidos', 'RotateCcw');
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Header Card with Actions */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Configuración — Apariencia y Personalización
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Control integral de identidad visual, colores, tipografía y estilo de la aplicación
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleApplyPreview}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#17263B] hover:bg-[#20324c] text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all active:scale-95"
            title="Probar en pantalla sin guardar en base de datos"
          >
            <Eye className="w-4 h-4" />
            <span>Vista Previa</span>
          </button>

          <button
            onClick={handleRestore}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#17263B] hover:bg-[#20324c] text-[#94A3B8] hover:text-white border border-[#29384C] font-bold text-xs transition-all active:scale-95"
            title="Restaurar diseño oscuro original"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restaurar</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-[#101D30] border border-[#29384C] p-2 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'identity'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>A. Identidad Visual</span>
        </button>

        <button
          onClick={() => setActiveTab('colors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'colors'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>B. Colores</span>
        </button>

        <button
          onClick={() => setActiveTab('typography')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'typography'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>C. Tipografía</span>
        </button>

        <button
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'layout'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>D. Diseño & Tema</span>
        </button>

        <button
          onClick={() => setActiveTab('sound')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'sound'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]'
          }`}
        >
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>E. Sonido de Ingreso</span>
        </button>
      </div>

      {/* TAB CONTENT A: IDENTIDAD VISUAL */}
      {activeTab === 'identity' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-7 bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-black text-white">Logotipo Principal de la Aplicación</h2>
              <p className="text-xs text-[#94A3B8]">
                Se muestra en la parte superior del menú vertical y en toda la plataforma
              </p>
            </div>

            {/* Upload Button */}
            <div className="space-y-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Nuevo Logotipo</span>
                </button>

                {draftLogos.sidebarLogo && (
                  <button
                    type="button"
                    onClick={() => setDraftLogos(prev => ({ ...prev, sidebarLogo: '', header: '' }))}
                    className="px-3 py-2.5 rounded-xl bg-[#17263B] text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-[#29384C]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Restaurar Original</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Formatos compatibles: PNG, JPG, WebP o SVG seguro. Proporción protegida sin deformación.
              </p>
            </div>

            {/* Adjustments: Size, Alignment, Mode */}
            <div className="bg-[#081321] p-4 rounded-2xl border border-[#29384C] space-y-4">
              <h3 className="text-xs font-bold text-slate-300">Ajustes Visuales del Logotipo</h3>

              {/* Size Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Tamaño del Logotipo</span>
                  <span className="font-mono text-cyan-300">{draftLogos.sidebarLogoSize || 36}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="64"
                  value={draftLogos.sidebarLogoSize || 36}
                  onChange={(e) => setDraftLogos(prev => ({ ...prev, sidebarLogoSize: Number(e.target.value) }))}
                  className="w-full accent-cyan-400 h-1.5 bg-[#17263B] rounded-lg cursor-pointer"
                />
              </div>

              {/* Alignment */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8]">Alineación en Menú</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftLogos(prev => ({ ...prev, sidebarLogoAlign: 'left' }))}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      draftLogos.sidebarLogoAlign === 'left' ? 'bg-blue-600 text-white' : 'bg-[#17263B] text-[#94A3B8]'
                    }`}
                  >
                    Izquierda
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftLogos(prev => ({ ...prev, sidebarLogoAlign: 'center' }))}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      draftLogos.sidebarLogoAlign === 'center' ? 'bg-blue-600 text-white' : 'bg-[#17263B] text-[#94A3B8]'
                    }`}
                  >
                    Centrado
                  </button>
                </div>
              </div>

              {/* Show Text vs Logo Only */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-[#29384C]/60">
                <span className="text-[#94A3B8]">Modo de Visualización</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftLogos(prev => ({ ...prev, sidebarShowText: true }))}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      draftLogos.sidebarShowText ? 'bg-blue-600 text-white' : 'bg-[#17263B] text-[#94A3B8]'
                    }`}
                  >
                    Logo + Nombre
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftLogos(prev => ({ ...prev, sidebarShowText: false }))}
                    className={`px-3 py-1 rounded-lg font-bold text-xs ${
                      !draftLogos.sidebarShowText ? 'bg-blue-600 text-white' : 'bg-[#17263B] text-[#94A3B8]'
                    }`}
                  >
                    Solo Logo
                  </button>
                </div>
              </div>
            </div>

            {/* App Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#94A3B8]">Nombre Visible de la Aplicación</label>
              <input
                type="text"
                value={draftLogos.appName || 'CONTROL DE AVANCE'}
                onChange={(e) => setDraftLogos(prev => ({ ...prev, appName: e.target.value }))}
                className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* Perfil del Profesional a Cargo (Director Técnico) */}
            <div className="pt-4 border-t border-[#29384C] space-y-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span>Perfil del Profesional a Cargo</span>
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Fotografía y datos personales visibles en el pie del menú lateral
                </p>
              </div>

              {/* Avatar Uploader & Preview */}
              <div className="flex items-center gap-4 bg-[#081321] p-3.5 rounded-2xl border border-[#29384C]">
                <div className="relative group/avatar shrink-0">
                  <img
                    src={draftLogos.directorAvatarUrl || '/avatar_venier.png'}
                    alt="Perfil Profesional"
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500/50 shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Gaston+Venier&background=0284c7&color=fff';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => directorAvatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center border-2 border-[#081321] shadow-md transition-transform hover:scale-110 cursor-pointer"
                    title="Subir fotografía"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={directorAvatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDirectorAvatarUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => directorAvatarInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Foto</span>
                    </button>
                    {draftLogos.directorAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setDraftLogos(prev => ({ ...prev, directorAvatarUrl: '' }))}
                        className="px-2.5 py-1.5 rounded-xl bg-[#17263B] text-rose-400 hover:text-rose-300 font-bold text-xs flex items-center gap-1 border border-[#29384C] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Restaurar Predeterminada</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#94A3B8]">
                    Formatos JPG o PNG. Se comprime y optimiza automáticamente.
                  </p>
                </div>
              </div>

              {/* Name & Role Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Nombre del Profesional</label>
                  <input
                    type="text"
                    value={draftLogos.directorName || 'Arq. Venier Gastón'}
                    onChange={(e) => setDraftLogos(prev => ({ ...prev, directorName: e.target.value }))}
                    className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#94A3B8]">Cargo o Especialidad</label>
                  <input
                    type="text"
                    value={draftLogos.directorRole || 'Director Técnico'}
                    onChange={(e) => setDraftLogos(prev => ({ ...prev, directorRole: e.target.value }))}
                    className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Miniature Sidebar Preview */}
          <div className="lg:col-span-5 bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-4">
            <h2 className="text-xs font-black uppercase text-[#94A3B8] tracking-wider">
              Vista Previa en Menú Lateral
            </h2>

            <div className="bg-[#081321] border border-[#29384C] rounded-2xl p-4 space-y-4">
              {/* Header section in sidebar */}
              <div className={`flex items-center gap-3 pb-3 border-b border-[#29384C]/60 ${
                draftLogos.sidebarLogoAlign === 'center' ? 'justify-center text-center' : ''
              }`}>
                {draftLogos.sidebarLogo ? (
                  <img
                    src={draftLogos.sidebarLogo}
                    alt="Logo"
                    style={{ width: `${draftLogos.sidebarLogoSize || 36}px`, height: `${draftLogos.sidebarLogoSize || 36}px` }}
                    className="object-contain rounded-lg shrink-0"
                  />
                ) : (
                  <div
                    style={{ width: `${draftLogos.sidebarLogoSize || 36}px`, height: `${draftLogos.sidebarLogoSize || 36}px` }}
                    className="rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-300 shrink-0"
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                )}

                {draftLogos.sidebarShowText && (
                  <div className="min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white truncate">
                      {draftLogos.appName || 'CONTROL DE AVANCE'}
                    </h3>
                    <p className="text-[10px] text-[#94A3B8] font-medium truncate">
                      Gestión de Proyectos de Obras
                    </p>
                  </div>
                )}
              </div>

              {/* Sample Nav Item */}
              <div className="space-y-1.5 opacity-80 pointer-events-none">
                <div className="p-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-white/40" />
                  <span>Inicio (Activo)</span>
                </div>
                <div className="p-2 rounded-xl text-[#94A3B8] text-xs font-medium flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-600" />
                  <span>Proyectos</span>
                </div>
                <div className="p-2 rounded-xl text-[#94A3B8] text-xs font-medium flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-600" />
                  <span>Tareas</span>
                </div>
              </div>

              {/* Mini User Profile in Sidebar Preview */}
              <div className="pt-3 border-t border-[#29384C]/60 flex items-center gap-2.5 bg-[#101D30]/80 p-2 rounded-xl">
                <img
                  src={draftLogos.directorAvatarUrl || '/avatar_venier.png'}
                  alt="Director"
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-blue-500/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Gaston+Venier&background=0284c7&color=fff';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-white truncate">
                    {draftLogos.directorName || 'Arq. Venier Gastón'}
                  </div>
                  <div className="text-[9px] text-[#94A3B8] truncate">
                    {draftLogos.directorRole || 'Director Técnico'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT B: COLORES */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-black text-white">Paleta de Colores de la Aplicación</h2>
              <p className="text-xs text-[#94A3B8]">
                Personaliza los tonos principales, fondos de tarjetas y contrastes visuales
              </p>
            </div>

            {/* Primary Neon / Accent Color */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-white">Color Principal de Acento (Neón / Primario)</label>
                <span className="font-mono text-cyan-400">{draftColors.neonColor}</span>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                {NEON_PRESETS.map((np, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDraftColors(prev => ({ ...prev, neonColor: np.value }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      draftColors.neonColor === np.value
                        ? 'border-white shadow-[0_0_12px_rgba(255,255,255,0.4)] text-white'
                        : 'border-[#29384C] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: np.value }} />
                    <span>{np.label}</span>
                  </button>
                ))}
              </div>

              {/* Hex Custom Picker */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={draftColors.neonColor}
                  onChange={(e) => setDraftColors(prev => ({ ...prev, neonColor: e.target.value }))}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-[#94A3B8]">O selecciona un color personalizado con el selector</span>
              </div>
            </div>

            {/* App Background Color */}
            <div className="space-y-2.5 pt-4 border-t border-[#29384C]">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-white">Fondo General de la Aplicación</label>
                <span className="font-mono text-cyan-400">{draftColors.appBackground}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {BACKGROUND_PRESETS.map((bp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDraftColors(prev => ({ ...prev, appBackground: bp.value }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      draftColors.appBackground === bp.value
                        ? 'border-cyan-400 text-white'
                        : 'border-[#29384C] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: bp.value }} />
                    <span>{bp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Card & Panel Background */}
            <div className="space-y-2.5 pt-4 border-t border-[#29384C]">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-white">Fondo de Tarjetas y Paneles</label>
                <span className="font-mono text-cyan-400">{draftColors.cardBackground}</span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draftColors.cardBackground || '#101D30'}
                  onChange={(e) => setDraftColors(prev => ({ ...prev, cardBackground: e.target.value }))}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-[#94A3B8]">Personaliza el tono oscuro de las tarjetas contenedoras</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Card Preview */}
          <div className="lg:col-span-5 bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-4">
            <h2 className="text-xs font-black uppercase text-[#94A3B8] tracking-wider">
              Vista Previa de Componentes
            </h2>

            <div
              className="p-5 rounded-2xl border space-y-4 shadow-xl transition-colors"
              style={{
                backgroundColor: draftColors.cardBackground || '#101D30',
                borderColor: draftColors.neonColor || '#00f2fe'
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${draftColors.neonColor}25`,
                    color: draftColors.neonColor
                  }}
                >
                  Tarjeta de Prueba
                </span>
                <span className="text-xs font-mono font-bold text-white">75%</span>
              </div>

              <h3 className="text-base font-black text-white">
                Edificio Residencial Parque Agustín
              </h3>

              {/* Progress Bar with neon accent */}
              <div className="w-full h-2.5 rounded-full bg-[#081321] overflow-hidden border border-[#29384C]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: '75%',
                    backgroundColor: draftColors.neonColor
                  }}
                />
              </div>

              <button
                className="w-full py-2.5 rounded-xl font-bold text-xs text-black transition-all shadow-md"
                style={{ backgroundColor: draftColors.neonColor }}
              >
                Botón Principal de Acción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT C: TIPOGRAFÍA */}
      {activeTab === 'typography' && (
        <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-black text-white">Tipografía Profesional & Densidad Visual</h2>
            <p className="text-xs text-[#94A3B8]">
              Selecciona fuentes legibles de alta calidad para planos, certificaciones y control en obra
            </p>
          </div>

          {/* Font Presets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {FONT_PRESETS.map((f, idx) => {
              const isSelected = draftColors.fontFamily === f.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDraftColors(prev => ({ ...prev, fontFamily: f.value }))}
                  className={`p-4 rounded-2xl border text-left transition-all space-y-1.5 ${
                    isSelected
                      ? 'bg-blue-600/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                      : 'bg-[#17263B] border-[#29384C] hover:border-slate-500'
                  }`}
                  style={{ fontFamily: f.value }}
                >
                  <div className="text-sm font-bold text-white">{f.label}</div>
                  <div className="text-xs text-slate-300">Aa Bb Gg 123</div>
                </button>
              );
            })}
          </div>

          {/* Density & Font Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#29384C]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white">Tamaño General de Texto</label>
              <div className="flex items-center gap-2">
                {(['compact', 'standard', 'large'] as const).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setDraftColors(prev => ({ ...prev, fontSize: size }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                      draftColors.fontSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#17263B] text-[#94A3B8]'
                    }`}
                  >
                    {size === 'compact' ? 'Compacto (13px)' : size === 'standard' ? 'Estándar (14px)' : 'Grande (15px)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white">Densidad Visual de Interfaz</label>
              <div className="flex items-center gap-2">
                {(['compact', 'standard', 'relaxed'] as const).map(density => (
                  <button
                    key={density}
                    type="button"
                    onClick={() => setDraftColors(prev => ({ ...prev, visualDensity: density }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                      draftColors.visualDensity === density
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#17263B] text-[#94A3B8]'
                    }`}
                  >
                    {density === 'compact' ? 'Compacta' : density === 'standard' ? 'Estándar' : 'Relajada'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT D: DISEÑO & TEMA */}
      {activeTab === 'layout' && (
        <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-black text-white">Modo de Diseño y Tema</h2>
            <p className="text-xs text-[#94A3B8]">
              El modo Oscuro Arquitectónico es el predeterminado para máxima legibilidad y confort visual
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setDraftTheme('theme-original')}
              className={`p-5 rounded-2xl border text-left transition-all space-y-2 ${
                draftTheme === 'theme-original'
                  ? 'bg-blue-600/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                  : 'bg-[#17263B] border-[#29384C] hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Oscuro Arquitectónico</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Recomendado
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Fondo azul marino profundo con acentos cian, contrastes óptimos para planos y obra.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDraftTheme('theme-glass')}
              className={`p-5 rounded-2xl border text-left transition-all space-y-2 ${
                draftTheme === 'theme-glass'
                  ? 'bg-blue-600/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                  : 'bg-[#17263B] border-[#29384C] hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Glassmorphism Traslúcido</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#081321] text-slate-400">
                  Alternativo
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Tarjetas translúcidas con desenfoque de fondo y estilo moderno de interfaz.
              </p>
            </button>
          </div>
        </div>
      )}
      {/* TAB CONTENT E: SONIDO DE INGRESO */}
      {activeTab === 'sound' && (
        <div className="space-y-6">
          <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-black text-white">Sonido de Ingreso al Tocar el Tilde</h2>
                </div>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Elige entre 5 sonidos armónicos optimizados que se reproducirán al pulsar el tilde verde de bienvenida para ingresar a la aplicación.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Compatible con Tablets iPad y Android</span>
              </div>
            </div>

            {/* Sound Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ENTRY_SOUNDS.map(sound => {
                const isSelected = (draftLogos.entrySound || 'crystal_chime') === sound.id;
                return (
                  <div
                    key={sound.id}
                    onClick={() => {
                      setDraftLogos(prev => ({ ...prev, entrySound: sound.id }));
                      setActiveEntrySoundId(sound.id);
                      playEntrySound(sound.id);
                      onShowToast?.(`Sonido "${sound.name}" seleccionado`, 'Volume2');
                    }}
                    className={`relative group cursor-pointer p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                      isSelected
                        ? 'bg-blue-600/15 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/80'
                        : 'bg-[#17263B] border-[#29384C] hover:border-slate-500 hover:bg-[#1d2f47]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[10px] font-black uppercase px-2 py-0.5 rounded border"
                          style={{
                            borderColor: `${sound.accentColor}40`,
                            backgroundColor: `${sound.accentColor}15`,
                            color: sound.accentColor
                          }}
                        >
                          {sound.badge}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-black'
                              : 'border-slate-600 group-hover:border-slate-400'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {sound.name}
                      </h3>
                      <p className="text-[11px] font-mono text-cyan-400/90">
                        {sound.subtitle}
                      </p>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">
                        {sound.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#29384C]/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {isSelected ? '✓ Seleccionado' : 'Click para activar'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playEntrySound(sound.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20324c] hover:bg-emerald-600 hover:text-white text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
                        title="Escuchar muestra de audio"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Escuchar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Live Tilde Test Simulator */}
            <div className="mt-8 pt-6 border-t border-[#29384C] flex flex-col md:flex-row items-center justify-between gap-6 bg-[#0B1523] p-6 rounded-2xl border border-dashed border-[#29384C]">
              <div className="space-y-1.5 text-center md:text-left">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  <Sparkles className="w-4 h-4" />
                  <span>Simulador de Ingreso</span>
                </div>
                <h4 className="text-sm font-black text-white">
                  Prueba el Tilde Verde con el sonido seleccionado
                </h4>
                <p className="text-xs text-[#94A3B8] max-w-lg">
                  Toca el logo del tilde para reproducir el sonido configurado exactamente como lo experimentarás al abrir la aplicación.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const currentId = draftLogos.entrySound || 'crystal_chime';
                    playEntrySound(currentId);
                    onShowToast?.('¡Tilde pulsado! Sonido de ingreso reproducido', 'Sparkles');
                  }}
                  className="relative group p-4 rounded-3xl bg-black/60 border border-emerald-500/30 hover:border-emerald-400 shadow-[0_0_25px_rgba(34,197,94,0.3)] hover:shadow-[0_0_40px_rgba(34,197,94,0.6)] transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                  title="Pulsar tilde para probar sonido"
                >
                  <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/25 transition-all pointer-events-none" />
                  <img
                    src="/icon.png?v=5"
                    alt="Tilde Verde"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_15px_rgba(34,197,94,0.8)] pointer-events-none group-hover:scale-110 transition-transform"
                  />
                </button>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 animate-pulse font-bold">
                  Toca para probar
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
