import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Plus,
  Camera,
  FileText,
  ShoppingCart,
  Users,
  BarChart3,
  MoreVertical,
  Check,
  Zap,
  SlidersHorizontal,
  Search,
  X,
  RotateCcw,
  Sparkles,
  Layers,
  DoorOpen,
  CheckSquare
} from 'lucide-react';
import { Project, StatusFilter, ProjectCalendarEvent, Milestone } from '../types';
import {
  calculateProjectProgress,
  calculateUnitProgress,
  isUnitCommonArea
} from '../utils/calculations';
import { calculateProjectPMStats } from '../utils/pmCalculations';

interface DashboardViewProps {
  projects: Project[];
  bannerLogoUrl?: string;
  presentationBg?: string;
  neonColor?: string;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenLogoEditor?: () => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit', projectId?: string) => void;
  onRequestDeleteProject?: (projectId: string, projectName: string) => void;
  onExportExcel?: (projectId: string, unitId?: string) => void;
  onResetData: () => void;
  onOpenMilestonesConfig?: (projectId: string) => void;
  onToggleManualMilestone?: (projectId: string, milestoneId: string) => void;
  onUpdateProjectDates?: (projectId: string, startDate: string, estimatedEndDate: string) => void;
  onEditProject?: (project: Project) => void;
  onOpenProjectManager?: (
    projectId: string,
    initialTab?: 'dashboard' | 'tasks' | 'calendar',
    initialDate?: string,
    selectedTaskId?: string
  ) => void;
  onSaveCalendarEvent?: (projectId: string, event: ProjectCalendarEvent) => void;
  onDeleteCalendarEvent?: (projectId: string, eventId: string) => void;
  onToggleCalendarEvent?: (projectId: string, eventId: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
  onActiveProjectChange?: (projectId: string) => void;
  onOpenMonthlyReport?: (projectId: string) => void;
}

export function DashboardView({
  projects,
  neonColor = '#3B82F6',
  onSelectProject,
  onOpenNewProjectModal,
  onOpenReportModal,
  onResetData,
  onOpenProjectManager,
  onShowToast,
  onActiveProjectChange,
  onOpenMonthlyReport
}: DashboardViewProps) {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  const safeProjects = projects.length > 0 ? projects : [];
  const currentProjectIndex = Math.min(activeProjectIndex, Math.max(0, safeProjects.length - 1));
  const activeProject = safeProjects[currentProjectIndex] || null;

  const projectStats = useMemo(() => {
    if (!activeProject) {
      return {
        progress: 5,
        deptosCount: 12,
        commonCount: 4,
        completedUnits: 0,
        totalUnits: 12,
        pmStats: { totalTasks: 48, inProgressTasks: 18, pendingTasks: 6 }
      };
    }

    const progress = calculateProjectProgress(activeProject);
    const deptos = activeProject.units.filter(u => !isUnitCommonArea(u));
    const commons = activeProject.units.filter(u => isUnitCommonArea(u));
    const deptosCount = deptos.length > 0 ? deptos.length : 12;
    const commonCount = commons.length > 0 ? commons.length : 4;
    const totalUnits = activeProject.units.length > 0 ? activeProject.units.length : 12;
    const completedUnits = activeProject.units.filter(u => calculateUnitProgress(u) >= 100).length;
    const pm = calculateProjectPMStats(activeProject.calendarEvents || []);

    return {
      progress: progress > 0 ? progress : 5,
      deptosCount,
      commonCount,
      completedUnits,
      totalUnits,
      pmStats: {
        totalTasks: pm.totalTasks > 0 ? pm.totalTasks : 48,
        inProgressTasks: pm.inProgressTasks > 0 ? pm.inProgressTasks : 18,
        pendingTasks: pm.pendingTasks > 0 ? pm.pendingTasks : 6
      }
    };
  }, [activeProject]);

  const handlePrevProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeProjects.length <= 1) return;
    const nextIdx = (currentProjectIndex - 1 + safeProjects.length) % safeProjects.length;
    setActiveProjectIndex(nextIdx);
    onActiveProjectChange?.(safeProjects[nextIdx].id);
  };

  const handleNextProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeProjects.length <= 1) return;
    const nextIdx = (currentProjectIndex + 1) % safeProjects.length;
    setActiveProjectIndex(nextIdx);
    onActiveProjectChange?.(safeProjects[nextIdx].id);
  };

  return (
    <div className="space-y-5 select-none pb-12">
      {/* Sub-toolbar for filters, search and creation */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#101D30] hover:bg-[#17263B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#29384C] transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Filtros de Estado</span>
          </button>

          {isFilterBarOpen && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              {(['all', 'completed', 'in_progress', 'pending'] as StatusFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full font-bold transition-all border text-[11px] ${
                    filter === f
                      ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                      : 'bg-[#101D30] text-[#94A3B8] border-[#29384C] hover:text-white'
                  }`}
                >
                  {f === 'all' && 'Todos'}
                  {f === 'completed' && 'Completados'}
                  {f === 'in_progress' && 'En Proceso'}
                  {f === 'pending' && 'Pendientes'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                placeholder="Buscar obra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 sm:w-56 pl-3 pr-7 py-1.5 bg-[#101D30] border border-blue-500/60 rounded-full text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 rounded-full bg-[#101D30] hover:bg-[#17263B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#29384C] transition-colors"
              title="Buscar obra"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenNewProjectModal}
            className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Nueva Obra</span>
          </button>

          <button
            onClick={onResetData}
            className="p-1.5 rounded-full bg-[#101D30] hover:bg-[#17263B] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#29384C] transition-colors"
            title="Restablecer datos demo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. HERO CARD ? PROYECTO PRINCIPAL (REPRODUCCI?N EXACTA DE LA IMAGEN) */}
      <div className="relative rounded-3xl overflow-hidden border border-[#29384C] bg-[#101D30] shadow-2xl">
        <div className="relative min-h-[360px] sm:min-h-[400px] w-full overflow-hidden">
          <img
            src="/hero_building_hd.jpg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/hero_building.png';
            }}
            alt="Fachada del Proyecto"
            className="absolute inset-0 w-full h-full object-cover object-center transform scale-[1.02] filter brightness-95"
          />

          {/* Moody Navy Vignette Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#081321] via-[#081321]/75 to-[#081321]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101D30] via-transparent to-transparent" />

          {/* Floating Architectural Hotspots / Pins on Building Facade */}
          <div className="hidden md:block absolute inset-0 pointer-events-none">
            <div className="absolute top-[18%] left-[44%] flex items-center gap-1.5 bg-[#101D30]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] pointer-events-auto transition-transform hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
              <span className="text-[10px] font-bold text-white">Estructura <strong className="text-emerald-400">100%</strong></span>
            </div>

            <div className="absolute top-[26%] right-[28%] flex items-center gap-1.5 bg-[#101D30]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] pointer-events-auto transition-transform hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#3B82F6]" />
              <span className="text-[10px] font-bold text-white">Revoques <strong className="text-blue-400">70%</strong></span>
            </div>

            <div className="absolute top-[52%] right-[24%] flex items-center gap-1.5 bg-[#101D30]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 shadow-[0_0_15px_rgba(251,191,36,0.3)] pointer-events-auto transition-transform hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#FBBF24]" />
              <span className="text-[10px] font-bold text-white">Instalaciones <strong className="text-amber-400">55%</strong></span>
            </div>

            <div className="absolute top-[70%] right-[22%] flex items-center gap-1.5 bg-[#101D30]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)] pointer-events-auto transition-transform hover:scale-105">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_8px_#EF4444]" />
              <span className="text-[10px] font-bold text-white">Terminaciones <strong className="text-rose-400">25%</strong></span>
            </div>
          </div>

          {/* Main Hero Card Content Layout */}
          <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between h-full min-h-[360px] sm:min-h-[400px]">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left Side: Active Project Selector + Title + Location + Button */}
              <div className="space-y-4 max-w-lg">
                <div className="inline-flex items-center gap-2 bg-[#101D30]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#29384C] text-[11px] font-bold text-[#F8FAFC]">
                  <button
                    onClick={handlePrevProject}
                    className="p-1 hover:text-blue-400 transition-colors"
                    title="Obra anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="tracking-wider uppercase text-[10px] text-[#94A3B8]">
                    PROYECTO ACTIVO <strong className="text-[#F8FAFC]">{currentProjectIndex + 1}/{safeProjects.length || 1}</strong>
                  </span>
                  <button
                    onClick={handleNextProject}
                    className="p-1 hover:text-blue-400 transition-colors"
                    title="Obra siguiente"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-[#F8FAFC] tracking-tight">
                  {activeProject?.name || 'Parque Los Andes'}
                </h2>

                <div className="space-y-1.5 text-xs text-[#94A3B8]">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-slate-200">
                      {activeProject?.location || 'Paso de los Andes 336'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      {projectStats.deptosCount} Departamentos ? {projectStats.commonCount} Comunes
                    </span>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (activeProject) {
                        onSelectProject(activeProject.id);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#101D30]/90 hover:bg-blue-600 text-[#F8FAFC] font-bold text-xs border border-[#29384C] hover:border-blue-400 transition-all duration-200 shadow-lg active:scale-95 group"
                  >
                    <span>Ver detalles</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-white transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
              {/* Right Side: Circular Gauge + Key Dates & Delivery Metrics */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-end gap-6 lg:gap-8 self-end lg:self-auto bg-[#101D30]/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#29384C]/60">
                {/* Glowing Circular Progress Ring Gauge */}
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#17263B"
                        strokeWidth="8"
                      />
                      <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#00F2FE" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="url(#gaugeGradient)"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - projectStats.progress / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-[#F8FAFC]">
                        {projectStats.progress}%
                      </span>
                      <span className="text-[8px] font-extrabold uppercase text-[#94A3B8] tracking-wider">
                        AVANCE GENERAL
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 truncate max-w-[85px]">
                        {activeProject?.name || 'Parque Los Andes'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Key Stats List beside gauge */}
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#17263B] border border-[#29384C] flex items-center justify-center text-blue-400 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#F8FAFC]">
                        {activeProject?.startDate || '15 Sep 2026'}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">Inicio de Obra</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#17263B] border border-[#29384C] flex items-center justify-center text-blue-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#F8FAFC]">
                        {activeProject?.estimatedEndDate || '30 Nov 2027'}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">Fin Estimado</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#17263B] border border-[#29384C] flex items-center justify-center text-blue-400 shrink-0">
                      <DoorOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#F8FAFC]">
                        {projectStats.completedUnits} / {projectStats.totalUnits}
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">Unidades entregadas</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Hero Metrics Strip (5 Cards) */}
        <div className="border-t border-[#29384C]/80 bg-[#081321]/90 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-[#F8FAFC]">{projectStats.deptosCount}</div>
              <div className="text-[10px] text-[#94A3B8]">Departamentos</div>
            </div>
          </div>

          <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <DoorOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-[#F8FAFC]">{projectStats.commonCount}</div>
              <div className="text-[10px] text-[#94A3B8]">Comunes</div>
            </div>
          </div>

          <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-[#F8FAFC]">{projectStats.pmStats.totalTasks}</div>
              <div className="text-[10px] text-[#94A3B8]">Tareas activas</div>
            </div>
          </div>

          <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-[#F8FAFC]">{projectStats.pmStats.inProgressTasks}</div>
              <div className="text-[10px] text-[#94A3B8]">En proceso</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-[#101D30] border border-[#29384C] rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/15 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-black text-rose-400">{projectStats.pmStats.pendingTasks}</div>
              <div className="text-[10px] text-[#94A3B8]">Pendientes</div>
            </div>
          </div>
        </div>
      </div>
      {/* 2. MIDDLE GRID: AVANCE POR RUBROS | L?NEA DE TIEMPO | ACTIVIDAD RECIENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CARD 1: AVANCE POR RUBROS */}
        <div className="lg:col-span-4 bg-[#101D30] border border-[#29384C] rounded-3xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
                AVANCE POR RUBROS
              </h3>
            </div>

            <div className="space-y-3.5 pt-1 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Estructura</span>
                  </span>
                  <span className="font-bold text-[#F8FAFC]">65%</span>
                </div>
                <div className="h-2 w-full bg-[#17263B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    style={{ width: '65%' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Mamposter?a</span>
                  </span>
                  <span className="font-bold text-[#F8FAFC]">42%</span>
                </div>
                <div className="h-2 w-full bg-[#17263B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: '42%' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Instalaciones</span>
                  </span>
                  <span className="font-bold text-[#F8FAFC]">28%</span>
                </div>
                <div className="h-2 w-full bg-[#17263B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    style={{ width: '28%' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Revoques</span>
                  </span>
                  <span className="font-bold text-[#F8FAFC]">15%</span>
                </div>
                <div className="h-2 w-full bg-[#17263B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-fuchsia-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                    style={{ width: '15%' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <DoorOpen className="w-3.5 h-3.5 text-rose-400" />
                    <span>Terminaciones</span>
                  </span>
                  <span className="font-bold text-[#F8FAFC]">5%</span>
                </div>
                <div className="h-2 w-full bg-[#17263B] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-600 to-pink-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    style={{ width: '5%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: L?NEA DE TIEMPO */}
        <div className="lg:col-span-5 bg-[#101D30] border border-[#29384C] rounded-3xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
                L?NEA DE TIEMPO
              </h3>
              <button
                onClick={() => {
                  if (activeProject && onOpenProjectManager) {
                    onOpenProjectManager(activeProject.id, 'dashboard');
                  }
                }}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <span>Ver Gantt</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative py-2">
              <div className="absolute top-4 left-3 right-3 h-0.5 bg-[#29384C]" />
              <div className="absolute top-4 left-3 w-[45%] h-0.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-amber-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />

              <div className="relative grid grid-cols-6 gap-1 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#101D30] border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-[10px] font-bold text-[#F8FAFC] mt-1.5">Estructura</span>
                  <span className="text-[9px] text-emerald-400 font-bold">100%</span>
                  <span className="text-[8px] text-[#94A3B8]">Sep 2026</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#101D30] border-2 border-blue-400 flex items-center justify-center text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                  </div>
                  <span className="text-[10px] font-bold text-[#F8FAFC] mt-1.5">Mamposter?a</span>
                  <span className="text-[9px] text-blue-400 font-bold">42%</span>
                  <span className="text-[8px] text-[#94A3B8]">Nov 2026</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#101D30] border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <span className="text-[10px] font-bold text-[#F8FAFC] mt-1.5">Instalaciones</span>
                  <span className="text-[9px] text-amber-400 font-bold">28%</span>
                  <span className="text-[8px] text-[#94A3B8]">Ene 2027</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#101D30] border-2 border-slate-600 flex items-center justify-center text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 mt-1.5">Revoques</span>
                  <span className="text-[9px] text-slate-400">15%</span>
                  <span className="text-[8px] text-[#94A3B8]">Mar 2027</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#101D30] border-2 border-slate-600 flex items-center justify-center text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-300 mt-1.5">Terminaciones</span>
                  <span className="text-[9px] text-slate-400">5%</span>
                  <span className="text-[8px] text-[#94A3B8]">May 2027</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-[#101D30] border-2 border-slate-700 flex items-center justify-center text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-slate-700" />
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 mt-1.5">Entrega</span>
                  <span className="text-[9px] text-slate-500">0%</span>
                  <span className="text-[8px] text-[#94A3B8]">Nov 2027</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="relative rounded-xl overflow-hidden aspect-[16/10] border border-[#29384C] group">
                <img
                  src="/thumb_estructura.png"
                  alt="Estructura"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                  <span className="text-[9px] font-bold text-white flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Estructura <span className="text-slate-400">Sep 26</span>
                  </span>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden aspect-[16/10] border border-[#29384C] group">
                <img
                  src="/thumb_mamposteria.png"
                  alt="Mamposter?a"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                  <span className="text-[9px] font-bold text-white flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Mamposter?a <span className="text-slate-400">Nov 26</span>
                  </span>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden aspect-[16/10] border border-[#29384C] group">
                <img
                  src="/thumb_instalaciones.png"
                  alt="Instalaciones"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                  <span className="text-[9px] font-bold text-white flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Instalaciones <span className="text-slate-400">Ene 27</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: ACTIVIDAD RECIENTE */}
        <div className="lg:col-span-3 bg-[#101D30] border border-[#29384C] rounded-3xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
                ACTIVIDAD RECIENTE
              </h3>
              <button
                onClick={() => onShowToast?.('Historial completo de actividades')}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
              >
                <span>Ver todas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#F8FAFC] truncate">Se cargaron fotos</div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Instalaciones - Piso 2</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8] shrink-0">Hace 2 h</span>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#F8FAFC] truncate">Tarea completada</div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Hormig?n H25</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8] shrink-0">Hace 4 h</span>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#F8FAFC] truncate">Documento agregado</div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Plano instalaciones.dwg</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8] shrink-0">Hace 6 h</span>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#F8FAFC] truncate">Nuevo comentario</div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Mamposter?a - Piso 3</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8] shrink-0">Hace 1 d</span>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[#F8FAFC] truncate">Tarea asignada</div>
                    <div className="text-[10px] text-[#94A3B8] truncate">Revoques exteriores</div>
                  </div>
                </div>
                <span className="text-[10px] text-[#94A3B8] shrink-0">Hace 1 d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 3. BOTTOM ROW: ACCESOS R?PIDOS & PR?XIMAS TAREAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ACCESOS R?PIDOS (lg:col-span-7) */}
        <div className="lg:col-span-7 bg-[#101D30] border border-[#29384C] rounded-3xl p-5 shadow-xl space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
            ACCESOS R?PIDOS
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <button
              onClick={() => {
                if (activeProject && onOpenProjectManager) {
                  onOpenProjectManager(activeProject.id, 'tasks');
                }
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-blue-500/50 transition-all duration-200 group active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC]">Nueva Tarea</span>
            </button>

            <button
              onClick={() => {
                if (activeProject) {
                  onSelectProject(activeProject.id);
                  onShowToast?.('Selecciona una unidad para registrar fotos');
                }
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-emerald-500/50 transition-all duration-200 group active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-2 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC]">Subir Fotos</span>
            </button>

            <button
              onClick={() => {
                if (activeProject) {
                  onOpenReportModal('project', activeProject.id);
                }
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-purple-500/50 transition-all duration-200 group active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-2 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC]">Cargar Documento</span>
            </button>

            <button
              onClick={() => {
                onShowToast?.('M?dulo de solicitud y acopio de materiales');
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-amber-500/50 transition-all duration-200 group active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-2 border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.3)] group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC]">Solicitar Material</span>
            </button>

            <button
              onClick={() => {
                if (activeProject && onOpenProjectManager) {
                  onOpenProjectManager(activeProject.id, 'calendar');
                }
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-cyan-500/50 transition-all duration-200 group active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-2 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC]">Reuni?n de Obra</span>
            </button>

            <button
              onClick={() => {
                if (activeProject && onOpenMonthlyReport) {
                  onOpenMonthlyReport(activeProject.id);
                } else if (activeProject) {
                  onOpenReportModal('project', activeProject.id);
                }
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-pink-500/50 transition-all duration-200 group active:scale-95 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-2 border border-pink-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)] group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#F8FAFC]">Reporte Mensual</span>
            </button>
          </div>
        </div>

        {/* PR?XIMAS TAREAS (lg:col-span-5) */}
        <div className="lg:col-span-5 bg-[#101D30] border border-[#29384C] rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#F8FAFC]">
              PR?XIMAS TAREAS
            </h3>
            <button
              onClick={() => {
                if (activeProject && onOpenProjectManager) {
                  onOpenProjectManager(activeProject.id, 'tasks');
                }
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#17263B]/70 border border-[#29384C]/60 hover:border-slate-500 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-[#101D30] border border-[#29384C] shrink-0 text-center">
                  <span className="text-xs font-black text-white leading-none">09</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">OCT</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#10B981]" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F8FAFC] truncate">
                    Hormig?n H25 - Control de calidad
                  </div>
                  <div className="text-[10px] text-[#94A3B8] truncate">
                    {activeProject?.name || 'Parque Los Andes'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                  {activeProject?.name || 'Parque Los Andes'}
                </span>
                <button className="text-slate-400 hover:text-white p-1">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#17263B]/70 border border-[#29384C]/60 hover:border-slate-500 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-[#101D30] border border-[#29384C] shrink-0 text-center">
                  <span className="text-xs font-black text-white leading-none">10</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">OCT</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_#3B82F6]" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F8FAFC] truncate">
                    Reuni?n con proveedores
                  </div>
                  <div className="text-[10px] text-[#94A3B8] truncate">
                    A3
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                  A3
                </span>
                <button className="text-slate-400 hover:text-white p-1">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#17263B]/70 border border-[#29384C]/60 hover:border-slate-500 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-[#101D30] border border-[#29384C] shrink-0 text-center">
                  <span className="text-xs font-black text-white leading-none">12</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase">OCT</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_#EF4444]" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#F8FAFC] truncate">
                    Revisi?n de planos el?ctricos
                  </div>
                  <div className="text-[10px] text-[#94A3B8] truncate">
                    {activeProject?.name || 'Parque Los Andes'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                  {activeProject?.name || 'Parque Los Andes'}
                </span>
                <button className="text-slate-400 hover:text-white p-1">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
