import React, { useState } from 'react';
import {
  Home,
  Building2,
  ListTodo,
  CalendarDays,
  GanttChartSquare,
  FileText,
  PenTool,
  Boxes,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Camera,
  X
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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onEditDirectorPhoto?: () => void;
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
  appName = 'CONTROL DE AVANCE',
  isMobileOpen = false,
  onCloseMobile,
  onEditDirectorPhoto
}: SidebarNavProps) {
  // Collapsible projects sub-list (collapsed by default as requested)
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(false);

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: Home, view: 'dashboard' },
    { id: 'proyectos', label: 'Proyectos', icon: Building2, view: 'units' },
    { id: 'tareas', label: 'Tareas', icon: ListTodo },
    { id: 'calendario', label: 'Calendario', icon: CalendarDays },
    { id: 'gantt', label: 'Gantt', icon: GanttChartSquare },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'croquis', label: 'Croquis', icon: PenTool },
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
    <>
      {/* Mobile Dark Backdrop (Closes drawer when tapping outside on phones) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar / Mobile Slide-over Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 bg-[#081321] border-r border-[#29384C]/80 flex flex-col justify-between transition-transform duration-300 select-none z-50 ${
          isMobileOpen
            ? 'translate-x-0 w-72 max-w-[85vw] shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-60'}`}
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

              {(!isCollapsed || isMobileOpen) && showAppName && (
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

            <div className="flex items-center gap-1">
              {/* Desktop Collapse Toggle */}
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#101D30] transition-colors shrink-0"
                title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={onCloseMobile}
                className="lg:hidden text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#101D30] transition-colors shrink-0"
                title="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto no-scrollbar" style={{ maxHeight: 'calc(100vh - 210px)' }}>
            {navItems.map((item) => {
              const active = isNavActive(item.id);
              const IconComponent = item.icon;
              const isProjectsItem = item.id === 'proyectos';

              return (
                <div key={item.id} className="space-y-1">
                  <div
                    onClick={() => {
                      if (isProjectsItem) {
                        onSelectNav(item.id);
                        setIsProjectsExpanded(!isProjectsExpanded);
                      } else {
                        onSelectNav(item.id);
                        onCloseMobile?.();
                      }
                    }}
                    title={isCollapsed && !isMobileOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative cursor-pointer ${
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
                    {(!isCollapsed || isMobileOpen) && (
                      <span className="truncate text-left flex-1 font-bold">{item.label}</span>
                    )}

                    {/* Collapsible toggle arrow and project count badge for Proyectos */}
                    {isProjectsItem && (!isCollapsed || isMobileOpen) && projects.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-black/40 text-cyan-300 border border-cyan-500/20">
                          {projects.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsProjectsExpanded(!isProjectsExpanded);
                          }}
                          className="p-1 hover:text-white text-slate-300 transition-transform"
                          title={isProjectsExpanded ? 'Ocultar lista de obras' : 'Desplegar todas las obras'}
                        >
                          {isProjectsExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-cyan-300" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    )}

                    {!isProjectsItem && active && (!isCollapsed || isMobileOpen) && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </div>

                  {/* Sub-list of All Projects: ONLY DISPLAYED IF USER EXPANDS PROYECTOS */}
                  {isProjectsItem && (!isCollapsed || isMobileOpen) && isProjectsExpanded && projects.length > 0 && (
                    <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-cyan-500/40 ml-5 my-1 animate-in fade-in duration-200">
                      {projects.map((p) => {
                        const isSelected = selectedProjectId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject?.(p.id);
                              onCloseMobile?.();
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between gap-1 transition-all ${
                              isSelected
                                ? 'bg-blue-600/30 text-cyan-300 border border-cyan-400/50 shadow-sm'
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
          {/* User Card with Editable Photo Button */}
          <div
            className={`flex items-center gap-3 p-2 rounded-xl bg-[#101D30]/60 border border-[#29384C]/40 ${
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            }`}
          >
            <div className="relative group/director shrink-0">
              <img
                src={avatarUrl}
                alt={directorName}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/40 shrink-0"
              />
              {onEditDirectorPhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditDirectorPhoto();
                  }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center border-2 border-[#081321] transition-transform hover:scale-110 cursor-pointer shadow-md"
                  title="Cambiar foto de perfil del profesional"
                >
                  <Camera className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {(!isCollapsed || isMobileOpen) && (
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
            onClick={() => {
              onOpenSettings();
              onCloseMobile?.();
            }}
            title={isCollapsed && !isMobileOpen ? 'Configuración' : undefined}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30] transition-colors ${
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Configuración</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
