import React from 'react';
import {
  Bell,
  Sun,
  ArrowLeft,
  Cloud,
  CloudOff,
  RefreshCw,
  FileText,
  Menu
} from 'lucide-react';
import { ViewMode, Project, Unit } from '../types';
import { CloudSyncStatus } from '../lib/supabase';

interface TopHeaderProps {
  currentView: ViewMode;
  selectedProject: Project | null;
  selectedUnit: Unit | null;
  onBack: () => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit') => void;
  cloudStatus?: CloudSyncStatus;
  onOpenCloudSetup?: () => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export function TopHeader({
  currentView,
  selectedProject,
  selectedUnit,
  onBack,
  onOpenReportModal,
  cloudStatus,
  onOpenCloudSetup,
  onToggleMobileSidebar
}: TopHeaderProps) {
  // Format current date in Spanish, capitalizing day and month nicely
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
      // Capitalize first letter of day and month
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    } catch {
      return 'Martes 07 de Octubre 2026';
    }
  }, []);

  return (
    <header className="h-16 px-4 sm:px-8 border-b border-[#29384C]/80 bg-[#081321]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between select-none">
      {/* Left side: Mobile menu toggle + Context Breadcrumb when inside project/unit */}
      <div className="flex items-center gap-3">
        {/* Mobile menu hamburger */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30] transition-colors"
          title="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {currentView !== 'dashboard' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-[#F8FAFC] border border-[#29384C] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>Volver</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="text-[#94A3B8]">/</span>
              <span className="font-bold text-[#F8FAFC]">
                {selectedProject?.name || 'Obra'}
              </span>
              {selectedUnit && (
                <>
                  <span className="text-[#94A3B8]">/</span>
                  <span className="text-blue-400 font-bold">{selectedUnit.name}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden sm:block">
            <span className="text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
              Panel de Control General
            </span>
          </div>
        )}
      </div>

      {/* Right side: Cloud Sync + Report + Notification + Date + Weather (Matches Screenshot) */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Cloud sync indicator if present */}
        {cloudStatus && (
          <button
            onClick={onOpenCloudSetup}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#101D30] border border-[#29384C] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            title="Estado de sincronización en la nube"
          >
            {cloudStatus.isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : cloudStatus.isConnected ? (
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span className="hidden lg:inline">
              {cloudStatus.isSyncing ? 'Sincronizando' : cloudStatus.isConnected ? 'Conectado' : 'Sin conexión'}
            </span>
          </button>
        )}

        {/* Report Button when inside project */}
        {currentView !== 'dashboard' && (
          <button
            onClick={() => onOpenReportModal(currentView === 'checklist' ? 'unit' : 'project')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold transition-all"
            title="Generar reporte técnico"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reporte</span>
          </button>
        )}

        {/* Notification Bell with alert dot */}
        <button
          className="relative p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30] transition-colors"
          title="Notificaciones y avisos"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </button>

        {/* Date Display */}
        <div className="hidden sm:flex items-center text-xs font-medium text-[#F8FAFC]">
          <span>{formattedDate}</span>
        </div>

        {/* Weather Widget (Sun icon + 22°C Mendoza, AR) */}
        <div className="flex items-center gap-2 text-xs font-medium bg-[#101D30]/60 border border-[#29384C]/50 px-3 py-1.5 rounded-xl">
          <Sun className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1">
            <span className="font-bold text-[#F8FAFC]">22°C</span>
            <span className="text-[11px] text-[#94A3B8]">Mendoza, AR</span>
          </div>
        </div>
      </div>
    </header>
  );
}
