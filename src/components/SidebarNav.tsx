import React from 'react';
import {
  Home,
  Building2,
  ListTodo,
  CalendarDays,
  GanttChartSquare,
  FileText,
  Camera,
  Boxes,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ViewMode, Project } from '../types';

interface SidebarNavProps {
  currentView: ViewMode;
  projects?: Project[];
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  activeNavTab?: string;
  onSelectNav: (tab: string) => void;
  onOpenSettings: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  directorName?: string;
  directorRole?: string;
  avatarUrl?: string;
  customLogoUrl?: string;
  logoSize?: number;
  logoAlign?: 'left' | 'center';
  showAppName?: boolean;
  appName?: string;
}

export function SidebarNav({
  currentView,
  projects = [],
  selectedProjectId,
  onSelectProject,
  activeNavTab = 'inicio',
  onSelectNav,
  onOpenSettings,
  isCollapsed,
  onToggleCollapse,
  directorName = 'Arq. Venier Gastón',
  directorRole = 'Director Técnico',
  avatarUrl = '/avatar_venier.png',
  customLogoUrl,
  logoSize = 36,
  logoAlign = 'left',
  showAppName = true,
  appName = 'CONTROL DE AVANCE'
}: SidebarNavProps) {
  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home, view: 'dashboard' },
    { id: 'proyectos', label: 'Proyectos', icon: Building2, view: 'units' },
    { id: 'tareas', label: 'Tareas', icon: ListTodo },
    { id: 'calendario', label: 'Calendario', icon: CalendarDays },
    { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'fotos', label: 'Fotos / Videos', icon: Camera },
    { id: 'materiales', label: 'Materiales', icon: Boxes },
    { id: 'equipo', label: 'Equipo', icon: Users },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 }
  ];

  const isNavActive = (id: string) => {
    if (activeNavTab === id) return true;
    if (id === 'inicio' && currentView === 'dashboard') return true;
    if (id === 'proyectos' && currentView === 'units') return true;
    if (id === 'tareas' && currentView === 'tasks') return true;
    if (id === 'calendario' && currentView === 'calendar') return true;
    if (id === 'gantt' && currentView === 'gantt') return true;
    if (id === 'equipo' && currentView === 'contractors') return true;
    if (id === 'configuracion' && currentView === 'settings') return true;
    return false;
  };

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 bg-[#081321] border-r border-[#29384C]/80 flex flex-col justify-between transition-all duration-300 select-none ${
        isCollapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Top Header & Logo */}
      <div>
        <div className="p-4 flex items-center justify-between border-b border-[#29384C]/40">
          <div className={`flex items-center gap-3 overflow-hidden ${logoAlign === 'center' && !isCollapsed ? 'justify-center w-full' : ''}`}>
            {/* Custom or Architectural Twin Towers Logo */}
            {customLogoUrl ? (
              <img
                src={customLogoUrl}
                alt="Logo"
                style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                className="shrink-0 object-contain rounded-xl shadow-md"
              />
            ) : (
              <div
                style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                className="shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              >
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 26V9L15 4V26"
                    stroke="#60A5FA"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 26V11L24 7V26"
                    stroke="#38BDF8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line x1="6" y1="26" x2="26" y2="26" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {!isCollapsed && showAppName && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-xs font-black tracking-widest text-[#F8FAFC] uppercase truncate">
                  {appName || 'CONTROL DE AVANCE'}
                </h1>
                <p className="text-[10px] text-[#94A3B8] font-medium tracking-tight truncate">
                  Gestión de Proyectos de Obras
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#101D30] transition-colors shrink-0"
            title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100vh - 210px)' }}>
          {navItems.map((item) => {
            const active = isNavActive(item.id);
            const IconComponent = item.icon;

            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => onSelectNav(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                    active
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-[0_0_20px_rgba(59,130,246,0.45)]'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]'
                  }`}
                >
                  <IconComponent
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      active ? 'text-white scale-110' : 'text-[#94A3B8] group-hover:text-[#F8FAFC]'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                  {active && !isCollapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                  )}
                </button>

                {/* Sub-list of All Projects when looking at "Proyectos" */}
                {item.id === 'proyectos' && !isCollapsed && projects.length > 0 && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-[#29384C]/60 ml-5 my-1">
                    {projects.map((p) => {
                      const isSelected = selectedProjectId === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProject?.(p.id);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between gap-1 transition-all ${
                            isSelected
                              ? 'bg-blue-600/25 text-blue-300 border border-blue-500/40 shadow-sm'
                              : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-[9px] font-mono opacity-70">
                            {p.units?.length || 0}u
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Settings */}
      <div className="p-3 border-t border-[#29384C]/60 space-y-2 bg-[#081321]/80 backdrop-blur-sm">
        {/* User Card */}
        <div
          className={`flex items-center gap-3 p-2 rounded-xl bg-[#101D30]/60 border border-[#29384C]/40 ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <img
            src={avatarUrl}
            alt={directorName}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30 shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#F8FAFC] truncate">
                {directorName}
              </div>
              <div className="text-[10px] text-[#94A3B8] truncate">
                {directorRole}
              </div>
            </div>
          )}
        </div>

        {/* Configuration Button */}
        <button
          onClick={onOpenSettings}
          title={isCollapsed ? 'Configuración' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30] transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Configuración</span>}
        </button>
      </div>
    </aside>
  );
}
