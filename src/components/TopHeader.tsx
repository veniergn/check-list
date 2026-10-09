import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Calendar,
  ArrowLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  FileText,
  Menu,
  Building2,
  ChevronDown,
  Check
} from 'lucide-react';
import { ViewMode, Project, Unit } from '../types';
import { CloudSyncStatus } from '../lib/supabase';

interface TopHeaderProps {
  currentView: ViewMode;
  projects?: Project[];
  selectedProject: Project | null;
  selectedUnit: Unit | null;
  onSelectProject?: (projectId: string) => void;
  onBack: () => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit') => void;
  cloudStatus?: CloudSyncStatus;
  onOpenCloudSetup?: () => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function TopHeader({
  currentView,
  projects = [],
  selectedProject,
  selectedUnit,
  onSelectProject,
  onBack,
  onOpenReportModal,
  cloudStatus,
  onOpenCloudSetup,
  onToggleMobileSidebar
}: TopHeaderProps) {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format current date in Spanish
  const formattedDate = React.useMemo(() => {
    try {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      };
      const raw = new Intl.DateTimeFormat('es-AR', options).format(now);
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    } catch {
      return 'Viernes 09 de Octubre 2026';
    }
  }, []);

  return (
    <header className="h-16 px-4 sm:px-8 border-b border-[#29384C]/80 bg-[#081321]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between select-none">
      {/* Left side: Mobile menu toggle + Context Breadcrumb + Project Switcher Dropdown */}
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30] transition-colors"
          title="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {currentView !== 'dashboard' && (
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-[#F8FAFC] border border-[#29384C] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Volver</span>
          </button>
        )}

        {/* Global Project Switcher Dropdown */}
        {projects.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-[#F8FAFC] border border-[#29384C] hover:border-blue-500/50 text-xs font-bold transition-all shadow-sm"
              title="Cambiar de obra"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span className="max-w-[140px] sm:max-w-[200px] truncate">
                {selectedProject?.name || 'Seleccionar Obra'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>

            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-[#101D30] border border-[#29384C] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="px-2.5 py-1.5 text-[10px] font-black uppercase text-[#94A3B8] tracking-wider border-b border-[#29384C]/60 flex items-center justify-between">
                  <span>Obras Disponibles ({projects.length})</span>
                  <span className="text-blue-400">Cambiar</span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pt-1">
                  {projects.map((p) => {
                    const isSelected = selectedProject?.id === p.id;
                    const unitsCount = p.units?.length || 0;

                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProject?.(p.id);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-blue-600/20 border border-blue-500/40 text-[#F8FAFC]'
                            : 'hover:bg-[#17263B] text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs truncate text-[#F8FAFC]">
                              {p.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                            {p.location || 'Sin dirección'} • {unitsCount} unidades
                          </p>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Unit breadcrumb if inside a unit */}
        {selectedUnit && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-[#94A3B8]">/</span>
            <span className="text-blue-400 font-bold">{selectedUnit.name}</span>
          </div>
        )}
      </div>

      {/* Right side: Cloud Sync + Report + Notification + Date + Weather */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Cloud sync indicator */}
        {cloudStatus && (
          <button
            onClick={onOpenCloudSetup}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#101D30] border border-[#29384C] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            title="Estado de sincronización en la nube"
          >
            {cloudStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : cloudStatus === 'synced' ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>
              {cloudStatus === 'syncing'
                ? 'Sincronizando...'
                : cloudStatus === 'synced'
                ? 'Nube Activa'
                : 'Sin Conexión'}
            </span>
          </button>
        )}

        {/* Generate Report Button */}
        <button
          onClick={() => onOpenReportModal(selectedProject ? 'project' : 'auto')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#29384C] text-xs font-bold transition-colors"
          title="Exportar informe técnico"
        >
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>Informe</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => onOpenReportModal('auto')}
          className="relative p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30] transition-colors"
          title="Notificaciones y Alertas"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]" />
        </button>

        {/* Clean Date Display (Weather completely removed as requested) */}
        <div className="hidden lg:flex flex-col items-end text-right border-l border-[#29384C]/60 pl-4">
          <div className="text-xs font-bold text-[#F8FAFC] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
