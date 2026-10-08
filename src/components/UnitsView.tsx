import { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  DoorOpen,
  Plus,
  CircleCheck,
  Clock,
  Circle,
  FileText,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Wrench,
  BrickWall,
  Pipette,
  Zap,
  Maximize2,
  Pencil,
  Building2,
  Trash2,
  FileSpreadsheet,
  Compass,
  FileCheck,
  PenTool,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  Briefcase
} from 'lucide-react';
import { Project, Unit, StatusFilter, ProjectCalendarEvent } from '../types';
import { calculateUnitProgress, getUnitItemCounts, calculateProjectProgress, isUnitCommonArea, parseUnitFloor, hexToRgba } from '../utils/calculations';
import { MASTER_TRADES_TEMPLATE } from '../data/initialData';
import { ProjectGanttCard } from './ProjectGanttCard';
import { ErrorBoundary } from './ErrorBoundary';
import { AnimatedCircularProgress } from './AnimatedCircularProgress';
import { ExecutiveDonutChart } from './ExecutiveDonutChart';

interface UnitsViewProps {
  project: Project;
  presentationBg?: string;
  neonColor?: string;
  onSelectUnit: (unitId: string) => void;
  onOpenNewUnitModal: () => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit', projectId?: string, unitId?: string) => void;
  onEditUnit: (unit: Unit) => void;
  onRequestDeleteUnit?: (unitId: string, unitName: string) => void;
  onRequestDeleteProject?: (projectId: string, projectName: string) => void;
  onExportExcel?: (projectId: string, unitId?: string) => void;
  onOpenMilestonesConfig: (projectId: string) => void;
  onToggleManualMilestone: (projectId: string, milestoneId: string) => void;
  onUpdateMilestoneProgress?: (projectId: string, milestoneId: string, percentage: number) => void;
  onUpdateProjectDates?: (projectId: string, startDate: string, estimatedEndDate: string) => void;
  onEditProject?: (project: Project) => void;
  onOpenProjectManager?: (
    projectId: string,
    initialTab?: 'dashboard' | 'tasks' | 'calendar',
    initialDate?: string,
    selectedTaskId?: string
  ) => void;
  onSaveCalendarEvent?: (projectId: string, event: ProjectCalendarEvent) => void;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  onOpenUnitBlueprints?: (unit: Unit) => void;
  onAddTrade?: (tradeName: string, scope?: 'current_unit' | 'all_units') => void;
  onDeleteTrade?: (tradeId: string, tradeName: string, scope?: 'current_unit' | 'all_units') => void;
  onOpenCroquis?: (unitId?: string) => void;
  onOpenMonthlyReport?: (projectId: string) => void;
}

export function UnitsView({
  project,
  presentationBg,
  neonColor = '#00f2fe',
  onSelectUnit,
  onOpenNewUnitModal,
  onOpenReportModal,
  onEditUnit,
  onRequestDeleteUnit,
  onRequestDeleteProject,
  onExportExcel,
  onOpenMilestonesConfig,
  onToggleManualMilestone,
  onUpdateMilestoneProgress,
  onUpdateProjectDates,
  onEditProject,
  onOpenProjectManager,
  onSaveCalendarEvent,
  onSaveMilestone,
  onOpenUnitBlueprints,
  onAddTrade,
  onDeleteTrade,
  onOpenCroquis,
  onOpenMonthlyReport
}: UnitsViewProps) {
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'unit' | 'common_area'>('all');
  const [tradeSectionTab, setTradeSectionTab] = useState<'filter' | 'manage'>('filter');
  const [newTradeNameDraft, setNewTradeNameDraft] = useState<string>('');
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [cardHoverTrigger, setCardHoverTrigger] = useState(0);
  const [selectedFloorKey, setSelectedFloorKey] = useState<string | null>(null);
  const [activeFloorCardKey, setActiveFloorCardKey] = useState<string | null>(null);

  // Reset selected floor whenever project changes
  useEffect(() => {
    setSelectedFloorKey(null);
  }, [project.id]);

  const overallProgress = calculateProjectProgress(project, tradeFilter);

  const availableTrades = (() => {
    const map = new Map<string, { id: string; name: string; shortName?: string; icon: string }>();
    project.units.forEach(u => {
      u.trades.forEach(t => {
        const key = t.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { id: t.id, name: t.name, shortName: t.shortName, icon: t.icon });
        }
      });
    });
    if (map.size === 0) {
      MASTER_TRADES_TEMPLATE.forEach(t => {
        const key = t.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, { id: t.id, name: t.name, shortName: t.shortName, icon: t.icon });
        }
      });
    }
    return Array.from(map.values());
  })();

  const activeTrade = availableTrades.find(t => t.id === tradeFilter || t.name.toLowerCase().trim() === tradeFilter.toLowerCase().trim()) || MASTER_TRADES_TEMPLATE.find(t => t.id === tradeFilter);

  // Global counts by space type
  const countDeptos = project.units.filter(u => !isUnitCommonArea(u)).length;
  const countCommon = project.units.filter(u => isUnitCommonArea(u)).length;
  const countAll = project.units.length;
  const totalProjectSketches = project.units.reduce((sum, u) => sum + (u.sketches?.length || 0), 0);

  // Group all units of the project by floor
  const floorGroups = useMemo(() => {
    const map = new Map<string, {
      key: string;
      floorNumber: number;
      label: string;
      isCommon: boolean;
      units: Unit[];
    }>();

    project.units.forEach(unit => {
      const { floorNumber, label, isCommon } = parseUnitFloor(unit);
      const key = isCommon ? 'comunes' : `piso_${floorNumber}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          floorNumber,
          label,
          isCommon,
          units: []
        });
      }
      map.get(key)!.units.push(unit);
    });

    const groups = Array.from(map.values()).map(grp => {
      let completedUnits = 0;
      let inProgressUnits = 0;
      let pendingUnits = 0;
      let totalPctSum = 0;

      grp.units.forEach(u => {
        const p = calculateUnitProgress(u, tradeFilter);
        totalPctSum += p;
        if (p >= 100) completedUnits++;
        else if (p > 0) inProgressUnits++;
        else pendingUnits++;
      });

      const totalUnits = grp.units.length;
      const progress = totalUnits > 0 ? Math.round(totalPctSum / totalUnits) : 0;

      return {
        ...grp,
        totalUnits,
        completedUnits,
        inProgressUnits,
        pendingUnits,
        progress
      };
    });

    // Sort floors: PB (0), Piso 1 (1), Piso 2 (2), ... then Espacios Comunes (9999)
    groups.sort((a, b) => a.floorNumber - b.floorNumber);
    return groups;
  }, [project.units, tradeFilter]);

  const activeFloorGroup = floorGroups.find(f => f.key === selectedFloorKey);
  const baseUnitsForDisplay = activeFloorGroup && selectedFloorKey !== 'all_units'
    ? activeFloorGroup.units
    : project.units;

  // Filter units matching active type filter (solapa: 'all' | 'unit' | 'common_area')
  const unitsMatchingType = baseUnitsForDisplay.filter(unit => {
    const isCommon = isUnitCommonArea(unit);
    if (typeFilter === 'unit') return !isCommon;
    if (typeFilter === 'common_area') return isCommon;
    return true;
  });

  // Calculate status for each unit in the active type filter
  const tabUnitsWithStatus = unitsMatchingType.map(unit => {
    const progress = calculateUnitProgress(unit, tradeFilter);
    let status: StatusFilter = 'pending';
    if (progress >= 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = 'in_progress';
    }
    return { unit, progress, status };
  });

  // Active tab progress (average of units in current tab)
  const tabProgress = calculateProjectProgress(project, tradeFilter, typeFilter);

  // Dynamic counts for status chips based on selected space tab (Deptos vs Comunes vs Todos)
  const tabTotalCount = tabUnitsWithStatus.length;
  const tabCompletedCount = tabUnitsWithStatus.filter(u => u.status === 'completed').length;
  const tabInProgressCount = tabUnitsWithStatus.filter(u => u.status === 'in_progress').length;
  const tabPendingCount = tabUnitsWithStatus.filter(u => u.status === 'pending').length;

  // Final filtered units applying the status filter chip ('all' | 'completed' | 'in_progress' | 'pending')
  const filteredUnits = tabUnitsWithStatus.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const getTradeIcon = (id: string) => {
    switch (id) {
      case 'albanileria': return <BrickWall className="w-3.5 h-3.5" />;
      case 'plomeria': return <Pipette className="w-3.5 h-3.5" />;
      case 'electricidad': return <Zap className="w-3.5 h-3.5" />;
      case 'carpinteria_madera': return <DoorOpen className="w-3.5 h-3.5" />;
      case 'carpinteria_aluminio': return <Maximize2 className="w-3.5 h-3.5" />;
      default: return <Wrench className="w-3.5 h-3.5" />;
    }
  };

  return (
    <section className="space-y-4">
      {/* Executive Project Summary Card */}
      <div
        onMouseEnter={() => setCardHoverTrigger(prev => prev + 1)}
        onTouchStart={() => setCardHoverTrigger(prev => prev + 1)}
        style={{
          borderColor: neonColor,
          boxShadow: `0 0 30px ${hexToRgba(neonColor, 0.28)}`
        }}
        className="rounded-3xl p-5 sm:p-6 border-2 bg-[#101D30] text-white transition-all relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0 pr-1">
            {/* Deptos & Comunes Tag */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#94A3B8]">
                {countDeptos} DEPTOS - {countCommon} COMUNES
              </span>
              <span className="text-[11px] font-bold" style={{ color: neonColor }}>
                Comunadas
              </span>
            </div>

            {/* Project Name */}
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight truncate">
              {project.name}
            </h2>

            {/* Location with Pin */}
            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: neonColor }} />
              <span>{project.location || 'Calle Agustín Alvarez 315'}</span>
              {typeFilter !== 'all' && (
                <span className="font-bold ml-1" style={{ color: neonColor }}>
                  • Viendo {typeFilter === 'unit' ? `${countDeptos} Deptos` : `${countCommon} Espacios Comunes`}
                </span>
              )}
            </p>

            {/* Separator */}
            <div className="w-full h-px bg-[#17263B] my-2" />

            {/* Avance General Technical Details */}
            <div className="pt-0.5 text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-wider">
                  Avance General
                </p>
                {onEditProject && (
                  <button
                    type="button"
                    onClick={() => onEditProject(project)}
                    className="px-1.5 py-0.5 -mr-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors flex items-center gap-1 text-[10px] font-bold border border-transparent hover:border-[#29384C]"
                    title="Editar datos de Avance General"
                  >
                    <Pencil className="w-3 h-3" style={{ color: neonColor }} />
                    <span>Editar</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 truncate text-slate-300">
                <FileCheck className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                <span className="truncate">{project.technicalNotes || 'Toda la información del Expediente'}</span>
              </div>
              <div className="flex items-center gap-2 truncate text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                <span className="truncate">{project.director || 'Msc. Arq. Agustín Arrieta'}</span>
              </div>
              <div className="flex items-center gap-2 truncate text-slate-300">
                <Zap className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                <span className="truncate">{project.computoSubtitle || 'Cómputo, Certificaciones y Rubros'}</span>
              </div>
              {project.expedienteMunicipal && (
                <div className="flex items-center gap-2 truncate text-[#94A3B8] text-[11px]">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Exp:</span>
                  <span className="truncate">{project.expedienteMunicipal}</span>
                </div>
              )}
            </div>
          </div>

          {/* Glowing Donut Chart */}
          <div className="flex-shrink-0 flex items-center justify-center pl-2">
            <ExecutiveDonutChart
              percentage={typeFilter === 'all' ? overallProgress : tabProgress}
              size={136}
              strokeWidth={13}
              glowColor={neonColor}
              animationTrigger={cardHoverTrigger}
            />
          </div>
        </div>

        {/* Action buttons inside project summary */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#29384C]">
          {onOpenProjectManager && (
            <button
              type="button"
              onClick={() => onOpenProjectManager(project.id)}
              className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] active:scale-95"
              title="Abrir módulo integral de Project Manager y Agenda de Obra"
            >
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project Manager</span>
              {project.calendarEvents && project.calendarEvents.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-500/30 text-cyan-200 text-[10px] rounded-full font-black">
                  {project.calendarEvents.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => onOpenReportModal('project', project.id)}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            title="Acta Técnica PDF de toda la obra"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Reporte PDF</span>
          </button>

          {onOpenMonthlyReport && (
            <button
              type="button"
              onClick={() => onOpenMonthlyReport(project.id)}
              className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95"
              title="Generar Informe Mensual Ejecutivo de Obra para Propietarios (PDF)"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Informe de Obra</span>
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={() => onExportExcel(project.id)}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              title="Descargar planilla completa en Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Planilla Excel</span>
            </button>
          )}

          {onOpenCroquis && (
            <button
              onClick={() => onOpenCroquis()}
              className="px-3 py-1.5 bg-[#00c2ff]/15 hover:bg-[#00c2ff]/25 text-[#00c2ff] border border-[#00c2ff]/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
              title="Abrir galería de croquis para este proyecto"
            >
              <PenTool className="w-3.5 h-3.5 text-[#00c2ff]" />
              <span>Croquis ({totalProjectSketches})</span>
            </button>
          )}

          {onEditProject && (
            <button
              type="button"
              onClick={() => onEditProject(project)}
              className="px-3 py-1.5 bg-[#17263B] hover:bg-[#1f324d] text-slate-300 border border-[#29384C] rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-[#00c2fe]" />
              <span>Editar Datos</span>
            </button>
          )}

          {onRequestDeleteProject && (
            <button
              onClick={() => onRequestDeleteProject(project.id, project.name)}
              className="ml-auto px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors"
              title="Eliminar esta obra"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Eliminar Obra</span>
            </button>
          )}
        </div>

        {/* Diagrama de Gantt Continuo e Hitos de la Obra (Vista Ampliada) */}
        <div className="mt-3.5 pt-2 border-t border-[#29384C]">
          <ErrorBoundary fallbackTitle="Error al visualizar el diagrama de Gantt">
            <ProjectGanttCard
              project={project}
              neonColor={neonColor}
              onOpenProjectManager={onOpenProjectManager}
              onOpenMilestonesConfig={onOpenMilestonesConfig}
              onSaveTask={onSaveCalendarEvent}
              onSaveMilestone={onSaveMilestone}
              large={true}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Specialty / Trade Filter & Management Bar */}
      <div className="bg-[#101D30] p-3 rounded-2xl border border-slate-200 dark:border-[#29384C] shadow-sm space-y-3 transition-colors">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#29384C] pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-[#17263B] rounded-xl">
            <button
              type="button"
              onClick={() => setTradeSectionTab('filter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all touch-target ${
                tradeSectionTab === 'filter'
                  ? 'bg-[#101D30] text-slate-900 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span>Filtrar Gremios</span>
            </button>

            <button
              type="button"
              onClick={() => setTradeSectionTab('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all touch-target ${
                tradeSectionTab === 'manage'
                  ? 'bg-[#101D30] text-slate-900 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
              <span>Agregar o Eliminar Gremios</span>
            </button>
          </div>

          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hidden sm:inline">
            {tradeSectionTab === 'filter'
              ? (tradeFilter === 'all' ? 'Todos los gremios' : activeTrade?.name)
              : `${availableTrades.length} Gremios en el complejo`}
          </span>
        </div>

        {/* TAB 1: FILTRAR GREMIOS */}
        {tradeSectionTab === 'filter' && (
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 text-xs">
              <button
                onClick={() => setTradeFilter('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                  tradeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 border-amber-500 shadow-sm ring-1 ring-amber-500'
                    : 'bg-slate-50 dark:bg-[#17263B] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-[#29384C] hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <span>Todos</span>
              </button>

              {availableTrades.map(trade => {
                const isActive = tradeFilter === trade.id;
                return (
                  <button
                    key={trade.id}
                    onClick={() => setTradeFilter(trade.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                      isActive
                        ? 'bg-slate-900 dark:bg-amber-500 text-amber-400 dark:text-slate-950 border-amber-500 shadow-sm ring-1 ring-amber-500'
                        : 'bg-slate-50 dark:bg-[#17263B] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-[#29384C] hover:border-slate-400 dark:hover:border-slate-600'
                    }`}
                  >
                    {getTradeIcon(trade.id)}
                    <span>{trade.shortName || trade.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AGREGAR O ELIMINAR GREMIOS */}
        {tradeSectionTab === 'manage' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* Form to Add New Trade */}
            <div className="p-3 bg-slate-50 dark:bg-[#17263B] rounded-xl border border-slate-200 dark:border-[#29384C] space-y-2.5">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-500 stroke-[3]" />
                Agregar Nuevo Gremio al Complejo ({project.name})
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newTradeNameDraft}
                  onChange={(e) => setNewTradeNameDraft(e.target.value)}
                  placeholder="Ej: Pintura, Instalación de Gas, Herrería..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-[#101D30] text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />

                <button
                  type="button"
                  disabled={!newTradeNameDraft.trim()}
                  onClick={() => {
                    if (onAddTrade && newTradeNameDraft.trim()) {
                      onAddTrade(newTradeNameDraft.trim(), 'all_units');
                      setNewTradeNameDraft('');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-target"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Agregar en Todas las Unidades</span>
                </button>
              </div>

              {/* Quick Preset Badges */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] font-bold uppercase tracking-wider block mb-1">
                  Sugerencias rápidas:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Pintura',
                    'Instalación de Gas',
                    'Herrería',
                    'Yesería y Durlock',
                    'Vidrios',
                    'Climatización / AA',
                    'Limpieza de Obra'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewTradeNameDraft(preset)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#101D30] hover:bg-slate-100 dark:hover:bg-[#1f324d] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#29384C] transition-colors active:scale-95"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Current Trades for Deletion / Management */}
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-2">
                Gremios del Complejo ({availableTrades.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableTrades.map(trade => (
                  <div
                    key={trade.id}
                    className="p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-[#29384C] flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        {getTradeIcon(trade.id)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {trade.name}
                        </p>
                      </div>
                    </div>

                    {onDeleteTrade && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteTrade(trade.id, trade.name, 'all_units');
                          if (tradeFilter === trade.id) {
                            setTradeFilter('all');
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/50 flex items-center gap-1 transition-colors active:scale-95 touch-target flex-shrink-0"
                        title={`Eliminar gremio ${trade.name} en todo el complejo`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: FLOOR CARDS (When no floor is selected) */}
      {selectedFloorKey === null ? (
        <div className="space-y-3 pt-1">
          {/* Section Header */}
          <div className="flex items-center justify-between select-none">
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00c2fe]" />
                Pisos de la Obra
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Selecciona un piso para ver sus departamentos ({floorGroups.filter(f => !f.isCommon).length} pisos • {countDeptos} deptos)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedFloorKey('all_units')}
                className="px-3 py-1.5 rounded-full bg-[#17263B] hover:bg-[#1f324d] text-slate-300 hover:text-white border border-[#29384C] text-xs font-bold transition-all touch-target"
                title="Ver todos los departamentos juntos"
              >
                Ver Todos ({countAll})
              </button>

              <button
                onClick={onOpenNewUnitModal}
                className="bg-[#00c2ff]/15 hover:bg-[#00c2ff]/25 text-[#00c2ff] border border-[#00c2ff]/40 px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 touch-target transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Agregar Espacio</span>
              </button>
            </div>
          </div>

          {/* Grid of Floor Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {floorGroups.map((grp) => {
              const isFloorActive = activeFloorCardKey === grp.key;
              return (
                <div
                  key={grp.key}
                  onMouseEnter={() => setActiveFloorCardKey(grp.key)}
                  onTouchStart={() => setActiveFloorCardKey(grp.key)}
                  onClick={() => setSelectedFloorKey(grp.key)}
                  style={isFloorActive ? {
                    borderColor: neonColor,
                    boxShadow: `0 0 30px ${hexToRgba(neonColor, 0.35)}`
                  } : undefined}
                  className={`rounded-3xl p-5 sm:p-6 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between group touch-target ${
                    isFloorActive
                      ? 'border-2 scale-[1.01] bg-[#17263B]'
                      : 'border border-[#29384C] hover:border-slate-500 bg-[#101D30]'
                  } text-white`}
                >
                  <div className="space-y-3.5">
                    {/* Header of Floor Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Floor Badge Icon */}
                        <div
                          className="w-12 h-12 rounded-2xl border flex items-center justify-center font-black text-lg flex-shrink-0"
                          style={{
                            backgroundColor: hexToRgba(neonColor, 0.15),
                            borderColor: hexToRgba(neonColor, 0.3),
                            color: neonColor,
                            boxShadow: `0 0 12px ${hexToRgba(neonColor, 0.2)}`
                          }}
                        >
                          {grp.isCommon ? (
                            <Building2 className="w-6 h-6" style={{ color: neonColor }} />
                          ) : grp.floorNumber === 0 ? (
                            'PB'
                          ) : (
                            `${grp.floorNumber}°`
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4
                            style={isFloorActive ? { color: neonColor } : undefined}
                            className="text-xl font-black tracking-tight text-white group-hover:text-slate-100 transition-colors truncate"
                          >
                            {grp.label}
                          </h4>
                          <p className="text-xs text-[#94A3B8] font-medium truncate mt-0.5">
                            {grp.totalUnits} {grp.isCommon ? 'espacios comunes' : 'departamentos'}
                          </p>
                        </div>
                      </div>

                      {/* Circular Progress */}
                      <div className="flex-shrink-0">
                        <AnimatedCircularProgress
                          percentage={grp.progress}
                          size={52}
                          strokeWidth={5}
                          color={grp.progress === 100 ? '#10b981' : neonColor}
                        />
                      </div>
                    </div>

                    {/* Department Preview Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {grp.units.slice(0, 6).map((u) => {
                        const uProgress = calculateUnitProgress(u, tradeFilter);
                        const uDone = uProgress >= 100;
                        const shortUnit = u.name.replace(/^(?:depto|departamento|unidad|dpto)\s*/i, '');
                        return (
                          <span
                            key={u.id}
                            className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border truncate max-w-[110px] ${
                              uDone
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-[#17263B] text-slate-300 border-[#29384C]'
                            }`}
                          >
                            {shortUnit}
                          </span>
                        );
                      })}
                      {grp.units.length > 6 && (
                        <span className="text-[10px] font-bold text-[#94A3B8] self-center">
                          +{grp.units.length - 6} más
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom of Floor Card */}
                  <div className="mt-5 pt-3.5 border-t border-[#29384C] space-y-2">
                    <div className="w-full bg-[#17263B] h-1.5 rounded-full overflow-hidden border border-[#29384C]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${grp.progress}%`,
                          background: `linear-gradient(to right, #34d399, ${neonColor})`
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#94A3B8] font-bold text-[11px]">
                        {grp.completedUnits} de {grp.totalUnits} terminados ({grp.progress}%)
                      </span>
                      <span
                        className="font-black text-xs flex items-center group-hover:translate-x-1 transition-transform"
                        style={{ color: neonColor }}
                      >
                        Entrar al Piso <ChevronRight className="w-4 h-4 ml-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SECTION 2: UNITS OF SELECTED FLOOR (OR ALL UNITS) */
        <div className="space-y-4 pt-1">
          {/* Floor Header with Back Button and Quick Switcher */}
          <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3 sm:p-4 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFloorKey(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#17263B] hover:bg-[#1f324d] text-slate-200 hover:text-white text-xs font-black flex items-center gap-1.5 border border-[#29384C] transition-all active:scale-95 shadow-xs touch-target"
                >
                  <ArrowLeft className="w-4 h-4 text-[#00c2fe]" />
                  <span>Volver a Pisos</span>
                </button>

                <div className="h-6 w-px bg-slate-700/80 hidden sm:block" />

                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span style={{ color: neonColor }}>
                      {selectedFloorKey === 'all_units' ? 'Todos los Departamentos' : activeFloorGroup?.label}
                    </span>
                    <span className="text-xs font-bold text-[#94A3B8]">
                      ({tabTotalCount} {typeFilter === 'unit' ? 'deptos' : typeFilter === 'common_area' ? 'comunes' : 'unidades'})
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    {tabCompletedCount} de {tabTotalCount} unidades terminadas ({tabTotalCount > 0 ? Math.round((tabCompletedCount / tabTotalCount) * 100) : 0}%)
                  </p>
                </div>
              </div>

              <button
                onClick={onOpenNewUnitModal}
                className="bg-[#00c2ff]/15 hover:bg-[#00c2ff]/25 text-[#00c2ff] border border-[#00c2ff]/40 px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 touch-target transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Agregar Espacio</span>
              </button>
            </div>

            {/* Quick Floor Switcher Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pt-1 text-xs border-t border-[#29384C]">
              <button
                type="button"
                onClick={() => setSelectedFloorKey(null)}
                className="px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 bg-[#17263B] text-slate-300 border border-[#29384C] hover:border-slate-500 touch-target"
              >
                <ArrowLeft className="w-3 h-3" style={{ color: neonColor }} />
                <span>Pisos</span>
              </button>

              {floorGroups.map((grp) => {
                const isSelected = selectedFloorKey === grp.key;
                return (
                  <button
                    key={grp.key}
                    type="button"
                    onClick={() => setSelectedFloorKey(grp.key)}
                    style={isSelected ? {
                      backgroundColor: neonColor,
                      borderColor: neonColor,
                      boxShadow: `0 0 12px ${hexToRgba(neonColor, 0.4)}`,
                      color: '#020617'
                    } : undefined}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border touch-target ${
                      isSelected
                        ? 'font-black'
                        : 'bg-[#17263B] text-slate-300 border-[#29384C] hover:border-slate-500'
                    }`}
                  >
                    <span>{grp.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-[#94A3B8]'
                    }`}>
                      {grp.totalUnits}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedFloorKey('all_units')}
                style={selectedFloorKey === 'all_units' ? {
                  backgroundColor: neonColor,
                  borderColor: neonColor,
                  boxShadow: `0 0 12px ${hexToRgba(neonColor, 0.4)}`,
                  color: '#020617'
                } : undefined}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 border touch-target ${
                  selectedFloorKey === 'all_units'
                    ? 'font-black'
                    : 'bg-[#17263B] text-slate-300 border-[#29384C] hover:border-slate-500'
                }`}
              >
                <span>Todos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedFloorKey === 'all_units' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-[#94A3B8]'
                }`}>
                  {countAll}
                </span>
              </button>
            </div>
          </div>

          {/* Space Category Filter Tabs only when viewing All Units */}
          {selectedFloorKey === 'all_units' && (
            <div className="flex items-center gap-1.5 bg-[#17263B]/90 border border-[#29384C] p-1.5 rounded-2xl text-xs transition-colors select-none">
              <button
                onClick={() => setTypeFilter('all')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition-all text-center ${
                  typeFilter === 'all'
                    ? 'bg-[#00c2ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,194,255,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Todos ({countAll})
              </button>
              <button
                onClick={() => setTypeFilter('unit')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  typeFilter === 'unit'
                    ? 'bg-[#00c2ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,194,255,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>Deptos ({countDeptos})</span>
              </button>
              <button
                onClick={() => setTypeFilter('common_area')}
                className={`flex-1 py-1.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  typeFilter === 'common_area'
                    ? 'bg-[#00c2ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,194,255,0.4)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Comunes ({countCommon})</span>
              </button>
            </div>
          )}

          {/* Status Filter Chips */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 overflow-x-auto no-scrollbar py-1 text-xs select-none">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                statusFilter === 'all'
                  ? 'bg-[#00c2ff] text-slate-950 border-[#00c2ff] shadow-[0_0_15px_rgba(0,194,255,0.45)]'
                  : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Todos</span>
              <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {tabTotalCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                  : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Completados</span>
              <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {tabCompletedCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                statusFilter === 'in_progress'
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.45)]'
                  : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>En Proceso</span>
              <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {tabInProgressCount}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                statusFilter === 'pending'
                  ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.45)]'
                  : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Pendientes</span>
              <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {tabPendingCount}
              </span>
            </button>
          </div>

          {/* Units Grid - Responsive with Interactive Neon Line on Cursor / Touch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
            {filteredUnits.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-[#101D30]/80 rounded-3xl border border-dashed border-[#29384C] p-4">
                <DoorOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Sin unidades con este criterio</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Prueba cambiando el filtro de estado o espacio arriba.</p>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="mt-3 px-4 py-2 bg-[#00c2ff] text-slate-950 font-bold rounded-xl text-xs hover:brightness-110 transition-all active:scale-95"
                >
                  Ver Todas las Unidades
                </button>
              </div>
            ) : (
              filteredUnits.map(({ unit, progress }) => {
                const counts = getUnitItemCounts(unit, tradeFilter);
                const isComplete = progress === 100;
                const isCommonArea = isUnitCommonArea(unit);
                const isUnitActive = activeUnitId === unit.id;

                return (
                  <div
                    key={unit.id}
                    onMouseEnter={() => setActiveUnitId(unit.id)}
                    onTouchStart={() => setActiveUnitId(unit.id)}
                    onClick={() => {
                      setActiveUnitId(unit.id);
                      onSelectUnit(unit.id);
                    }}
                    style={isUnitActive ? {
                      borderColor: neonColor,
                      boxShadow: `0 0 28px ${hexToRgba(neonColor, 0.38)}`
                    } : undefined}
                    className={`rounded-2xl p-4 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col justify-between touch-target group ${
                      isUnitActive
                        ? 'border-2 scale-[1.02] bg-[#17263B]'
                        : 'border border-[#29384C] hover:border-slate-500 bg-[#101D30]'
                    } text-white`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0"
                          style={isComplete ? undefined : isCommonArea ? {
                            backgroundColor: hexToRgba(neonColor, 0.15),
                            borderColor: hexToRgba(neonColor, 0.3),
                            color: neonColor
                          } : {
                            backgroundColor: '#1e293b',
                            borderColor: '#334155',
                            color: neonColor
                          }}
                        >
                          {isComplete ? (
                            <CircleCheck className="w-4 h-4 text-emerald-400" />
                          ) : isCommonArea ? (
                            <Building2 className="w-4 h-4" style={{ color: neonColor }} />
                          ) : (
                            <DoorOpen className="w-4 h-4" style={{ color: neonColor }} />
                          )}
                        </span>

                        {/* Animated Circular Progress on Unit Card */}
                        <AnimatedCircularProgress
                          percentage={progress}
                          size={46}
                          strokeWidth={4.5}
                          color={isUnitActive ? neonColor : isComplete ? '#10B981' : neonColor}
                        />
                      </div>

                      {/* Type & Status Badges */}
                      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: hexToRgba(neonColor, 0.15),
                            color: neonColor,
                            borderColor: hexToRgba(neonColor, 0.3)
                          }}
                        >
                          {isCommonArea ? 'Común' : 'Depto'}
                        </span>
                        {unit.floorLabel && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#17263B] text-slate-300 border border-[#29384C] truncate max-w-[90px]">
                            {unit.floorLabel}
                          </span>
                        )}
                        {unit.signature && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            ✔ Firmado
                          </span>
                        )}
                        {unit.isLocked && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            🔒 Bloqueado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <h4
                          style={isUnitActive ? { color: neonColor } : undefined}
                          className="text-base font-black tracking-tight leading-snug transition-colors truncate pr-1 text-white group-hover:text-slate-100"
                        >
                          {unit.name}
                        </h4>

                        {/* Edit & Delete Action icons */}
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditUnit(unit);
                            }}
                            className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
                            title="Editar denominación"
                          >
                            <Pencil className="w-3.5 h-3.5" style={{ color: neonColor }} />
                          </button>

                          {onRequestDeleteUnit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteUnit(unit.id, unit.name);
                              }}
                              className="p-1 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-[#17263B] transition-colors"
                              title="Eliminar este espacio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-[#94A3B8] mt-1">
                        {counts.completed}/{counts.total} {tradeFilter === 'all' ? 'ítems validados' : 'tareas'} ({progress}%)
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#29384C]">
                      {/* Horizontal Capsule Progress Bar */}
                      <div className="w-full bg-[#17263B] h-1.5 rounded-full overflow-hidden border border-[#29384C]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(to right, #34d399, ${neonColor})`
                          }}
                        />
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReportModal('unit', project.id, unit.id);
                            }}
                            className="text-rose-400 hover:text-rose-300 font-bold text-[10px] flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/30 transition-colors"
                            title="Acta Técnica PDF de esta unidad"
                          >
                            <FileText className="w-2.5 h-2.5" /> PDF
                          </button>

                          {onOpenUnitBlueprints && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenUnitBlueprints(unit);
                              }}
                              className="text-[#00f2fe] hover:text-cyan-300 font-bold text-[10px] flex items-center gap-1 bg-[#00f2fe]/10 px-2 py-0.5 rounded-md border border-[#00f2fe]/30 transition-colors"
                              title="Ver o adjuntar planos"
                            >
                              <Compass className="w-2.5 h-2.5" />
                              <span>Planos ({unit.blueprints?.length || 0})</span>
                            </button>
                          )}

                          {onExportExcel && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportExcel(project.id, unit.id);
                              }}
                              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold text-[10px] flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                              title="Descargar Planilla Excel con casillas para tildar a mano"
                            >
                              <FileSpreadsheet className="w-2.5 h-2.5" /> XLS
                            </button>
                          )}

                          {unit.sketches && unit.sketches.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenCroquis?.(unit.id);
                              }}
                              className="text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold text-[10px] flex items-center gap-0.5 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 transition-colors cursor-pointer"
                              title={`Ver ${unit.sketches.length} croquis guardados en este espacio`}
                            >
                              <PenTool className="w-2.5 h-2.5 text-amber-500" />
                              <span>Croquis ({unit.sketches.length})</span>
                            </button>
                          )}
                        </div>

                        <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform ml-auto">
                          Auditar <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
}
