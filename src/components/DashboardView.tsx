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
  CheckSquare,
  CalendarDays,
  Flame,
  Pencil
} from 'lucide-react';
import { Project, StatusFilter, ProjectCalendarEvent, Milestone } from '../types';
import {
  calculateProjectProgress,
  calculateUnitProgress,
  isUnitCommonArea
} from '../utils/calculations';
import { calculateProjectPMStats } from '../utils/pmCalculations';
import { ExecutiveGlobalCalendar } from './ExecutiveGlobalCalendar';
import { ProjectCoverModal } from './ProjectCoverModal';

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
  onSaveProjectCover?: (projectId: string, coverUrl: string, position?: { x: number; y: number; zoom: number }) => void;
  onShowToast?: (msg: string, icon?: string) => void;
  onActiveProjectChange?: (projectId: string) => void;
  onOpenMonthlyReport?: (projectId: string) => void;
}

export function DashboardView({
  projects,
  neonColor = '#00f2fe',
  onSelectProject,
  onOpenNewProjectModal,
  onOpenReportModal,
  onResetData,
  onOpenProjectManager,
  onSaveCalendarEvent,
  onDeleteCalendarEvent,
  onToggleCalendarEvent,
  onSaveProjectCover,
  onShowToast,
  onActiveProjectChange,
  onOpenMonthlyReport
}: DashboardViewProps) {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [editingCoverProject, setEditingCoverProject] = useState<Project | null>(null);

  const safeProjects = projects.length > 0 ? projects : [];
  const currentProjectIndex = Math.min(activeProjectIndex, Math.max(0, safeProjects.length - 1));
  const activeProject = safeProjects[currentProjectIndex] || null;

  const projectStats = useMemo(() => {
    if (!activeProject) {
      return {
        progress: 0,
        deptosCount: 0,
        commonCount: 0,
        completedUnits: 0,
        totalUnits: 0,
        pmStats: { totalTasks: 0, inProgressTasks: 0, pendingTasks: 0 }
      };
    }

    const progress = calculateProjectProgress(activeProject);
    const deptos = activeProject.units.filter(u => !isUnitCommonArea(u));
    const commons = activeProject.units.filter(u => isUnitCommonArea(u));
    const deptosCount = deptos.length;
    const commonCount = commons.length;
    const totalUnits = activeProject.units.length;
    const completedUnits = activeProject.units.filter(u => calculateUnitProgress(u) >= 100).length;
    const pm = calculateProjectPMStats(activeProject.calendarEvents || []);

    return {
      progress,
      deptosCount,
      commonCount,
      completedUnits,
      totalUnits,
      pmStats: {
        totalTasks: pm.totalTasks,
        inProgressTasks: pm.inProgressTasks,
        pendingTasks: pm.pendingTasks
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

  const coverImageSrc = activeProject?.coverImageUrl || '/hero_building_hd.jpg';
  const coverPos = activeProject?.coverImagePosition || { x: 50, y: 50, zoom: 100 };

  return (
    <div className="space-y-6 select-none pb-12 animate-in fade-in duration-200">
      {/* 1. ELEMENTO PRINCIPAL DE INICIO: CALENDARIO & AGENDA GENERAL DE TODAS LAS OBRAS (SECTION 1) */}
      <ExecutiveGlobalCalendar
        projects={projects}
        neonColor={neonColor}
        onSelectProject={onSelectProject}
        onSaveCalendarEvent={onSaveCalendarEvent}
        onDeleteCalendarEvent={onDeleteCalendarEvent}
        onToggleCalendarEvent={onToggleCalendarEvent}
        onShowToast={onShowToast}
      />

      {/* 2. NUESTRAS OBRAS REGISTRADAS — ACCESO DIRECTO A TODAS LAS OBRAS (A3, Parque Los Andes, Parque Agustín) */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#F8FAFC] tracking-tight">
                Nuestras Obras Registradas ({projects.length})
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Selecciona cualquier obra para ingresar directamente a sus unidades y checklist técnico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewProjectModal}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Obra</span>
            </button>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 hidden sm:inline-block">
              {projects.length} en curso
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {projects.map((p, idx) => {
            const progress = calculateProjectProgress(p);
            const unitsTotal = p.units?.length || 0;
            const completedUnits = (p.units || []).filter(u => calculateUnitProgress(u) >= 100).length;
            const isHeroActive = activeProject?.id === p.id;
            const pCover = p.coverImageUrl || '/hero_building_hd.jpg';

            return (
              <div
                key={p.id}
                onClick={() => {
                  setActiveProjectIndex(idx);
                  onActiveProjectChange?.(p.id);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3.5 relative ${
                  isHeroActive
                    ? 'bg-[#17263B] border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/40'
                    : 'bg-[#17263B]/50 border-[#29384C] hover:border-slate-500 hover:bg-[#17263B]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      Obra #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCoverProject(p);
                        }}
                        className="p-1 rounded-lg bg-[#101D30] hover:bg-[#20324c] text-cyan-400 border border-[#29384C] transition-colors"
                        title="Cambiar foto de portada de esta obra"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-black text-[#F8FAFC] bg-[#101D30] px-2 py-0.5 rounded-lg border border-[#29384C]">
                        {progress}%
                      </span>
                    </div>
                  </div>

                  <h4 className="text-base font-black text-[#F8FAFC] leading-snug truncate">
                    {p.name}
                  </h4>

                  <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{p.location || 'Mendoza'}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                    <span>Unidades ({unitsTotal})</span>
                    <span className="font-bold text-white">{completedUnits} listas</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#101D30] overflow-hidden border border-[#29384C]">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2 border-t border-[#29384C]/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProject(p.id);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <span>Abrir Obra</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCoverProject(p);
                    }}
                    className="p-2 rounded-xl bg-[#101D30] hover:bg-[#20324c] text-cyan-400 border border-[#29384C] transition-colors"
                    title="Editar foto de presentación"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. HERO CARD — PROYECTO SELECCIONADO CON FOTOGRAFÍA EDITABLE (SECTION 3) */}
      <div className="relative rounded-3xl overflow-hidden border border-[#29384C] bg-[#101D30] shadow-2xl">
        <div className="relative min-h-[360px] sm:min-h-[400px] w-full overflow-hidden">
          <img
            src={coverImageSrc}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/hero_building_hd.jpg';
            }}
            alt="Fachada del Proyecto"
            style={{
              objectPosition: `${coverPos.x}% ${coverPos.y}%`,
              transform: `scale(${coverPos.zoom / 100})`,
              transformOrigin: `${coverPos.x}% ${coverPos.y}%`
            }}
            className="absolute inset-0 w-full h-full object-cover filter brightness-95 transition-all duration-300"
          />

          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#081321] via-[#081321]/75 to-[#081321]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#101D30] via-transparent to-transparent" />

          {/* EDIT COVER PHOTO BUTTON ON HERO BANNER (SECTION 3) */}
          {activeProject && (
            <button
              onClick={() => setEditingCoverProject(activeProject)}
              className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-[#101D30]/85 hover:bg-[#17263B] text-white border border-[#29384C] text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              title="Cambiar la fotografía de presentación de esta obra"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Editar Portada</span>
            </button>
          )}

          {/* Main Hero Card Content Layout */}
          <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between h-full min-h-[360px] sm:min-h-[400px]">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
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
                    OBRA SELECCIONADA <strong className="text-[#F8FAFC]">{currentProjectIndex + 1}/{safeProjects.length || 1}</strong>
                  </span>
                  <button
                    onClick={handleNextProject}
                    className="p-1 hover:text-blue-400 transition-colors"
                    title="Obra siguiente"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl font-black text-[#F8FAFC] tracking-tight">
                    {activeProject?.name || 'Obra Sin Nombre'}
                  </h2>
                  <p className="text-xs text-blue-400 font-bold mt-1">
                    {activeProject?.director || 'Director Técnico Designado'}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-[#94A3B8]">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="text-slate-200">
                      {activeProject?.location || 'Mendoza, Argentina'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      {projectStats.deptosCount} Departamentos • {projectStats.commonCount} Espacios Comunes ({projectStats.totalUnits} totales)
                    </span>
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (activeProject) {
                        onSelectProject(activeProject.id);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 group"
                  >
                    <span>Ver Unidades & Checklist</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Gauge */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-end gap-6 lg:gap-8 self-end lg:self-auto bg-[#101D30]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-[#29384C]/60 shadow-xl">
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#17263B" strokeWidth="8" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#00f2fe"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 * (1 - projectStats.progress / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-[#F8FAFC]">
                        {projectStats.progress}%
                      </span>
                      <span className="text-[8px] font-extrabold uppercase text-[#94A3B8] tracking-wider">
                        AVANCE
                      </span>
                    </div>
                  </div>
                </div>

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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Cover Modal */}
      {editingCoverProject && (
        <ProjectCoverModal
          isOpen={!!editingCoverProject}
          project={editingCoverProject}
          onClose={() => setEditingCoverProject(null)}
          onSaveCover={(pid, coverUrl, pos) => {
            onSaveProjectCover?.(pid, coverUrl, pos);
            setEditingCoverProject(null);
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
