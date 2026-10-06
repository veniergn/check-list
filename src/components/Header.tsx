import React, { useRef, useState, useEffect } from 'react';
import { FileText, ArrowLeft, Sun, Moon, Cloud, CloudOff, RefreshCw, Building2, MoreVertical, User } from 'lucide-react';
import { ViewMode, Project, Unit } from '../types';
import { compressImageFile } from '../utils/calculations';
import { CloudSyncStatus } from '../lib/supabase';
import { DEFAULT_LOGO_URL } from '../data/initialData';

interface HeaderProps {
  currentView: ViewMode;
  selectedProject: Project | null;
  selectedUnit: Unit | null;
  unitProgress: number;
  logoUrl: string;
  onNavigate: (view: ViewMode) => void;
  onBack: () => void;
  onOpenLogoEditor?: () => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit') => void;
  theme?: 'theme-original' | 'theme-glass' | 'light' | 'dark';
  onToggleTheme?: () => void;
  onLogoChange?: (newUrl: string) => void;
  cloudStatus?: CloudSyncStatus;
  onOpenCloudSetup?: () => void;
}

export function Header({
  currentView,
  selectedProject,
  selectedUnit,
  unitProgress,
  logoUrl,
  onNavigate,
  onBack,
  onOpenLogoEditor,
  onOpenReportModal,
  theme = 'theme-original',
  onToggleTheme,
  onLogoChange,
  cloudStatus,
  onOpenCloudSetup
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogoClick = () => {
    if (onOpenLogoEditor) {
      onOpenLogoEditor();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      if (onLogoChange) {
        onLogoChange(compressed);
      }
    } catch (err) {
      console.error('Error al procesar logotipo:', err);
    }
    e.target.value = '';
  };

  return (
    <>
      <header className="bg-[#0e1422] text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-lg no-print">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          {/* Left: 3-Dots Menu Dropdown + Interactive Logo + CONTROL DE AVANCE */}
          <div className="flex items-center space-x-2.5">
            {/* 3-Dots Menu Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-1.5 rounded-xl transition-all touch-target flex items-center justify-center ${
                  isMenuOpen
                    ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/50'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Opciones y Configuración"
                aria-label="Abrir menú de configuración y temas"
              >
                <MoreVertical className="w-5 h-5 stroke-[2.5]" />
              </button>

              {/* 3-Dots Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0f172a] border border-slate-700/80 shadow-2xl p-2 z-50 text-slate-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                      Menú & Opciones
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">Control Obra</span>
                  </div>

                  {/* 1. Perfil de Usuario & Tipografía */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenLogoEditor?.();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-white flex items-center gap-3 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-white">Perfil de Usuario</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Tipografía, negrita, fondos y logotipo
                      </div>
                    </div>
                  </button>

                  {/* 2. Cambiar Tema Visual */}
                  {onToggleTheme && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onToggleTheme();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-white flex items-center gap-3 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                        theme === 'theme-glass' || theme === 'light'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                      }`}>
                        {theme === 'theme-glass' || theme === 'light' ? (
                          <Moon className="w-4 h-4" />
                        ) : (
                          <Sun className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-white">Cambiar Tema Visual</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {theme === 'theme-glass' || theme === 'light'
                            ? 'Tema 2 Glassmorphism activo (Tocar para Original)'
                            : 'Tema 1 Original Oscuro activo (Tocar para Glass)'}
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        theme === 'theme-glass' || theme === 'light'
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-indigo-400/20 text-indigo-300'
                      }`}>
                        {theme === 'theme-glass' || theme === 'light' ? 'Glass' : 'Original'}
                      </span>
                    </button>
                  )}

                  {/* 3. Sincronización en la Nube Supabase */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenCloudSetup?.();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-white flex items-center gap-3 transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                      cloudStatus === 'synced'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : cloudStatus === 'syncing'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-700/40 text-slate-400'
                    }`}>
                      {cloudStatus === 'synced' ? (
                        <Cloud className="w-4 h-4" />
                      ) : cloudStatus === 'syncing' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CloudOff className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-white">Sincronización en la Nube</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {cloudStatus === 'synced'
                          ? 'Supabase: Conectado y Sincronizado'
                          : cloudStatus === 'syncing'
                          ? 'Supabase: Guardando cambios...'
                          : cloudStatus === 'needs_setup'
                          ? 'Tocar para configurar tabla en la nube'
                          : 'Modo local activo'}
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                      cloudStatus === 'synced'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : cloudStatus === 'syncing'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {cloudStatus === 'synced' ? 'Online' : cloudStatus === 'syncing' ? 'Sync' : 'Local'}
                    </span>
                  </button>

                  {/* 4. Inicio / Mis Obras */}
                  <div className="border-t border-slate-800/80 my-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800/80 text-white flex items-center gap-3 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-white">Panel de Obras</div>
                        <div className="text-[10px] text-slate-400">Volver a la vista general</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logo Touch Trigger */}
            <div
              className="relative group cursor-pointer select-none"
              onClick={handleLogoClick}
              onContextMenu={(e) => {
                if (onOpenLogoEditor) {
                  e.preventDefault();
                  onOpenLogoEditor();
                }
              }}
              title="Cargar o cambiar logotipo desde los archivos de tu dispositivo"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-950/80 p-0.5 border border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] flex-shrink-0 flex items-center justify-center hover:border-emerald-400 active:scale-95 transition-all">
                <img
                  src={logoUrl || DEFAULT_LOGO_URL}
                  alt="Control de Avance Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = DEFAULT_LOGO_URL;
                  }}
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Brand Title with Active Complex Name */}
            <div className="cursor-pointer select-none" onClick={() => onNavigate('dashboard')}>
              <h1 className="font-black tracking-wider text-sm sm:text-base leading-none text-white uppercase">
                CONTROL DE AVANCE
              </h1>
              {selectedProject && currentView !== 'dashboard' && (
                <div className="text-[11px] sm:text-xs font-bold text-[#00f2fe] truncate max-w-[200px] sm:max-w-[340px] flex items-center gap-1 mt-1">
                  <Building2 className="w-3 h-3 text-[#00f2fe] inline-block flex-shrink-0" />
                  <span className="truncate">{selectedProject.name}</span>
                  {currentView === 'checklist' && selectedUnit && (
                    <>
                      <span className="text-slate-400 font-normal">›</span>
                      <span className="text-white truncate font-extrabold">{selectedUnit.name}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center: View Title (Detalle del Proyecto) */}
          <div className="hidden md:flex items-center text-sm font-bold text-slate-300 tracking-wide">
            <span>
              {currentView === 'dashboard'
                ? 'Detalle del Proyecto'
                : selectedProject
                ? selectedProject.name
                : 'Detalle del Proyecto'}
            </span>
          </div>

          {/* Right: Espacio completamente despejado y limpio */}
          <div className="flex items-center gap-2" />
        </div>

        {/* Dynamic header contextual progress bar */}
        {currentView !== 'dashboard' && (
          <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 transition-all duration-300"
              style={{ width: `${unitProgress}%` }}
            />
          </div>
        )}
      </header>

      {/* Breadcrumb Sub-Header for internal navigation */}
      {currentView !== 'dashboard' && (
        <div className="bg-slate-950 border-b border-slate-800 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 text-xs text-slate-300 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center text-amber-400 font-bold touch-target py-1 hover:text-amber-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>{currentView === 'checklist' ? 'Departamentos' : 'Obras'}</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenReportModal(currentView === 'checklist' ? 'unit' : 'project')}
                className="text-[11px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40 font-bold flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-rose-400" /> Exportar PDF
              </button>
              <div className="font-extrabold text-white truncate max-w-[280px] sm:max-w-none text-right flex items-center gap-1.5">
                <span className="text-amber-400 font-bold truncate max-w-[140px] sm:max-w-[200px]">{selectedProject?.name}</span>
                {currentView === 'checklist' && selectedUnit && (
                  <>
                    <span className="text-slate-400 font-normal">›</span>
                    <span className="text-white font-black truncate max-w-[140px] sm:max-w-[200px]">{selectedUnit.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
