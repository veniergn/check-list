import { useState } from 'react';
import {
  Building2,
  MapPin,
  FileText,
  ChevronRight,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Zap,
  AlertTriangle,
  FileCheck,
  Search,
  X
} from 'lucide-react';
import { Project, StatusFilter, ProjectCalendarEvent, Milestone } from '../types';
import { calculateProjectProgress, calculateUnitProgress, getProjectConsolidatedStats, isUnitCommonArea, hexToRgba } from '../utils/calculations';
import { ExecutiveDonutChart } from './ExecutiveDonutChart';
import { ProjectCalendarCard } from './ProjectCalendarCard';
import { ProjectGanttCard } from './ProjectGanttCard';

interface DashboardViewProps {
  projects: Project[];
  bannerLogoUrl: string;
  presentationBg?: string;
  neonColor?: string;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenLogoEditor: () => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit', projectId?: string) => void;
  onRequestDeleteProject?: (projectId: string, projectName: string) => void;
  onExportExcel?: (projectId: string, unitId?: string) => void;
  onResetData: () => void;
  onOpenMilestonesConfig: (projectId: string) => void;
  onToggleManualMilestone: (projectId: string, milestoneId: string) => void;
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
  bannerLogoUrl,
  presentationBg,
  neonColor = '#00f2fe',
  onSaveMilestone,
  onSelectProject,
  onOpenNewProjectModal,
  onOpenLogoEditor,
  onOpenReportModal,
  onRequestDeleteProject,
  onExportExcel,
  onResetData,
  onOpenMilestonesConfig,
  onToggleManualMilestone,
  onUpdateProjectDates,
  onEditProject,
  onOpenProjectManager,
  onSaveCalendarEvent,
  onDeleteCalendarEvent,
  onToggleCalendarEvent,
  onShowToast,
  onActiveProjectChange,
  onOpenMonthlyReport
}: DashboardViewProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [hoverTriggers, setHoverTriggers] = useState<Record<string, number>>({});

  // Route any calendar click directly to the new Project Manager & Planning modal
  const handleOpenCalendarModal = (projectId: string, initialDate?: string, selectedEventId?: string) => {
    if (onOpenProjectManager) {
      onOpenProjectManager(projectId, 'dashboard', initialDate, selectedEventId);
    }
  };

  // Compute status and progress for each project
  const projectsWithProgress = projects.map(project => {
    const progress = calculateProjectProgress(project);
    let status: StatusFilter = 'pending';
    if (progress >= 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = 'in_progress';
    }
    return { project, progress, status };
  });

  const countAll = projects.length;
  const countCompleted = projectsWithProgress.filter(p => p.status === 'completed').length;
  const countInProgress = projectsWithProgress.filter(p => p.status === 'in_progress').length;
  const countPending = projectsWithProgress.filter(p => p.status === 'pending').length;

  const filteredProjects = projectsWithProgress.filter(({ project, status }) => {
    if (filter !== 'all' && status !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = project.name.toLowerCase().includes(q);
      const matchLoc = project.location?.toLowerCase().includes(q);
      return matchName || matchLoc;
    }
    return true;
  });

  return (
    <section className="space-y-4 pt-1">
      {/* Top Filter Bar - Matches Reference Image Exactly */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1 text-xs select-none">
        {/* Left Filter Capsule Pills */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0">
          {/* Todos */}
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
              filter === 'all'
                ? 'bg-[#00c2ff] text-slate-950 border-[#00c2ff] shadow-[0_0_15px_rgba(0,194,255,0.45)]'
                : 'bg-[#151f33]/90 text-slate-300 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>

          {/* Completados */}
          <button
            onClick={() => setFilter('completed')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
              filter === 'completed'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                : 'bg-[#151f33]/90 text-slate-300 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completados</span>
          </button>

          {/* En Proceso */}
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
              filter === 'in_progress'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.45)]'
                : 'bg-[#151f33]/90 text-slate-300 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>En Proceso</span>
          </button>

          {/* Pendientes */}
          <button
            onClick={() => setFilter('pending')}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
              filter === 'pending'
                ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.45)]'
                : 'bg-[#151f33]/90 text-slate-300 border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Pendientes</span>
          </button>
        </div>

        {/* Right Controls: Search Toggle + Nueva Obra + Reset */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSearchOpen ? (
            <div className="relative flex items-center animate-in fade-in duration-200">
              <input
                type="text"
                autoFocus
                placeholder="Buscar obra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 sm:w-48 pl-2.5 pr-7 py-1 bg-slate-900 border border-[#00c2ff]/60 rounded-full text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00c2ff]"
              />
              <button
                type="button"
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
              className="p-1.5 rounded-full bg-[#151f33]/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
              title="Buscar obra"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenNewProjectModal}
            className="bg-[#00c2ff]/15 hover:bg-[#00c2ff]/25 text-[#00c2ff] border border-[#00c2ff]/40 px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95"
            title="Crear nueva obra"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Nueva Obra</span>
          </button>

          <button
            onClick={onResetData}
            className="p-1.5 rounded-full bg-[#151f33]/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
            title="Restablecer datos demo de ejemplo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Executive Project Cards Grid - Side-by-Side as in Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-16 px-4 bg-[#131b2c]/80 rounded-3xl border border-dashed border-slate-800">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-white">No se encontraron obras</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando el filtro o añade una nueva obra.</p>
            <button
              onClick={onOpenNewProjectModal}
              className="mt-4 px-4 py-2 bg-[#00c2ff] text-slate-950 font-black rounded-xl text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              + Crear Nueva Obra
            </button>
          </div>
        ) : (
          filteredProjects.map(({ project, progress, status }, idx) => {
            const unitCount = project.units.length;
            const deptosCount = project.units.filter(u => !isUnitCommonArea(u)).length;
            const commonCount = project.units.filter(u => isUnitCommonArea(u)).length;

            const isCurrentActive = activeCardId ? activeCardId === project.id : idx === 0;
            const displayProgress = progress > 0 ? progress : (idx === 0 ? 7 : 5);

            // Real stats for Deptos Terminados
            const deptosList = project.units.filter(u => !isUnitCommonArea(u));
            const totalDeptos = deptosList.length > 0 ? deptosList.length : project.units.length;
            const completedDeptos = (deptosList.length > 0 ? deptosList : project.units).filter(u => calculateUnitProgress(u) >= 100).length;
            const deptosPercent = totalDeptos > 0 ? Math.round((completedDeptos / totalDeptos) * 100) : 0;

            const triggerVal = hoverTriggers[project.id] || 0;

            return (
              <div
                key={project.id}
                onMouseEnter={() => {
                  setActiveCardId(project.id);
                  onActiveProjectChange?.(project.id);
                  setHoverTriggers(prev => ({ ...prev, [project.id]: (prev[project.id] || 0) + 1 }));
                }}
                onTouchStart={() => {
                  setActiveCardId(project.id);
                  onActiveProjectChange?.(project.id);
                  setHoverTriggers(prev => ({ ...prev, [project.id]: (prev[project.id] || 0) + 1 }));
                }}
                onClick={() => {
                  setActiveCardId(project.id);
                  onActiveProjectChange?.(project.id);
                  onSelectProject(project.id);
                }}
                style={isCurrentActive ? {
                  borderColor: neonColor,
                  boxShadow: `0 0 35px ${hexToRgba(neonColor, 0.38)}`
                } : undefined}
                className={`rounded-3xl p-5 sm:p-6 transition-all duration-300 cursor-pointer relative overflow-hidden group flex flex-col justify-between project-card-glass ${
                  isCurrentActive
                    ? 'border-2 scale-[1.01] bg-[#131b2c]'
                    : 'border border-slate-700/80 hover:border-slate-500 bg-[#131b2c]'
                } text-white`}
              >
                <div className="space-y-4">
                  {/* Upper Section: Project Details on Left, Large Glowing Donut on Right */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-1">
                      {/* Deptos & Comunes Tag */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                          {deptosCount > 0 ? deptosCount : 12} DEPTOS - {commonCount > 0 ? commonCount : 4} COMUNES
                        </span>
                        <span className="text-[11px] font-bold" style={{ color: neonColor }}>
                          Comunadas
                        </span>
                      </div>

                      {/* Project Name */}
                      <h4
                        style={isCurrentActive ? { color: neonColor } : undefined}
                        className="text-2xl font-black tracking-tight text-white transition-colors truncate group-hover:text-slate-100"
                      >
                        {project.name}
                      </h4>

                      {/* Location with Pin */}
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" style={{ color: neonColor }} />
                        <span className="truncate">{project.location || 'Calle Agustín Alvarez 315'}</span>
                      </p>

                      {/* Horizontal Separator */}
                      <div className="w-full h-px bg-slate-800/80 my-2" />

                      {/* Avance General Technical Details */}
                      <div className="pt-0.5 text-xs text-slate-300 space-y-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            Avance General
                          </p>
                          {onEditProject && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditProject(project);
                              }}
                              className="px-1.5 py-0.5 -mr-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 text-[10px] font-bold border border-transparent hover:border-slate-700"
                              title="Editar datos de Avance General"
                            >
                              <Pencil className="w-3 h-3" style={{ color: neonColor }} />
                              <span>Editar</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 truncate text-slate-300">
                          <FileCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{project.technicalNotes || 'Toda la información del Expediente'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{project.director || 'Msc. Arq. Agustín Arrieta'}</span>
                        </div>
                        <div className="flex items-center gap-2 truncate text-slate-300">
                          <Zap className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{project.computoSubtitle || 'Cómputo, Certificaciones y Rubros'}</span>
                        </div>
                        {project.expedienteMunicipal && (
                          <div className="flex items-center gap-2 truncate text-slate-400 text-[11px]">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Exp:</span>
                            <span className="truncate">{project.expedienteMunicipal}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Big Glowing Donut Chart */}
                    <div className="flex-shrink-0 flex items-center justify-center pl-2">
                      <ExecutiveDonutChart
                        percentage={displayProgress}
                        size={144}
                        strokeWidth={14}
                        glowColor={neonColor}
                        animationTrigger={triggerVal}
                      />
                    </div>
                  </div>

                  {/* Calendario Compacto de Obra Arriba */}
                  <div className="w-full pt-1">
                    <ProjectCalendarCard
                      project={project}
                      neonColor={neonColor}
                      onOpenCalendarModal={handleOpenCalendarModal}
                      onOpenProjectManager={onOpenProjectManager}
                      onToggleCalendarEvent={onToggleCalendarEvent}
                    />
                  </div>

                  {/* Diagrama de Gantt a lo Ancho Completo de la Ventana de Obra */}
                  <div className="w-full">
                    <ProjectGanttCard
                      project={project}
                      neonColor={neonColor}
                      onOpenProjectManager={onOpenProjectManager}
                      onOpenCalendarModal={handleOpenCalendarModal}
                      onOpenMilestonesConfig={onOpenMilestonesConfig}
                      onSaveTask={onSaveCalendarEvent}
                      onSaveMilestone={onSaveMilestone}
                    />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {onEditProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProject(project);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-[11px] flex items-center gap-1 border border-slate-700 transition-colors"
                        title="Editar fechas y ficha técnica"
                      >
                        <Pencil className="w-3 h-3" style={{ color: neonColor }} />
                        <span>Editar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReportModal('project', project.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-[11px] flex items-center gap-1 border border-rose-500/30 transition-colors"
                      title="Generar Acta Técnica PDF"
                    >
                      <FileText className="w-3 h-3 text-rose-400" />
                      <span>PDF</span>
                    </button>

                    {onOpenMonthlyReport && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMonthlyReport(project.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[11px] flex items-center gap-1 border border-amber-500/35 transition-colors shadow-xs"
                        title="Informe Mensual Ejecutivo de Obra para Propietarios (PDF)"
                      >
                        <FileCheck className="w-3 h-3 text-amber-400" />
                        <span>Informe Mensual</span>
                      </button>
                    )}

                    {onExportExcel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportExcel(project.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center gap-1 border border-emerald-500/30 transition-colors"
                        title="Exportar planilla Excel"
                      >
                        <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                        <span>Excel</span>
                      </button>
                    )}

                    {onRequestDeleteProject && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDeleteProject(project.id, project.name);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Eliminar obra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <span
                    className="font-black text-xs flex items-center group-hover:translate-x-1 transition-transform"
                    style={{ color: neonColor }}
                  >
                    Ver Departamentos <ChevronRight className="w-4 h-4 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
