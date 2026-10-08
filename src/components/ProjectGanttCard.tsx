import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Clock,
  CheckCircle2,
  MoveHorizontal,
  Plus,
  Layers,
  Flag,
  Pencil,
  Percent,
  Check,
  X,
  Camera,
  MessageSquare
} from 'lucide-react';
import { Project, ProjectCalendarEvent, ContractorProfile, Milestone } from '../types';
import { getTodayString, getTaskAlarms, formatPMDate, getDaysDiff } from '../utils/pmCalculations';
import { getContractorProfile, getProjectContractors } from '../utils/pmContractors';
import { ContractorAvatar } from './ContractorAvatar';
import { MilestoneDetailModal } from './MilestoneDetailModal';

interface ProjectGanttCardProps {
  project: Project;
  neonColor?: string;
  onOpenProjectManager?: (
    projectId: string,
    initialTab?: 'dashboard' | 'tasks' | 'calendar',
    initialDate?: string,
    selectedTaskId?: string
  ) => void;
  onOpenCalendarModal?: (projectId: string, initialDate?: string, selectedEventId?: string) => void;
  onOpenMilestonesConfig?: (projectId: string) => void;
  onSaveTask?: (projectId: string, task: ProjectCalendarEvent) => void;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  contractors?: ContractorProfile[];
  large?: boolean; // Para vista ampliada al entrar a la obra (UnitsView)
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function normalizeDateStr(d?: string): string {
  if (!d) return '';
  const clean = d.split('T')[0].trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const day = parts[2].padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return clean;
}

export type GanttTimeScale = 'week' | 'month' | 'year';

const STICKY_COL_WIDTH = 145; // Ancho de la columna izquierda de responsables

export function ProjectGanttCard({
  project,
  neonColor = '#00f2fe',
  onOpenProjectManager,
  onOpenCalendarModal,
  onOpenMilestonesConfig,
  onSaveTask,
  onSaveMilestone,
  contractors,
  large = false
}: ProjectGanttCardProps) {
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getTodayString(), []);

  // Hito seleccionado para ver o editar avance, comentarios y fotos directamente
  const [selectedMilestoneForDetail, setSelectedMilestoneForDetail] = useState<Milestone | null>(null);

  // Escala temporal: Semana (zoom in), Mes (estándar), Anual (macro overview)
  const [timeScale, setTimeScale] = useState<GanttTimeScale>(() => {
    try {
      const saved = localStorage.getItem('gantt_time_scale');
      if (saved === 'week' || saved === 'month' || saved === 'year') return saved;
    } catch (e) {
      // ignore
    }
    return 'month';
  });

  // Ancho dinámico en píxeles de cada columna de día según la escala seleccionada
  const dayWidth = useMemo(() => {
    switch (timeScale) {
      case 'week':
        return 50; // Gran detalle semanal con días anchos
      case 'year':
        return 10; // Vista panorámica anual compacta
      case 'month':
      default:
        return 28; // Vista estándar mensual equilibrada
    }
  }, [timeScale]);

  const [quickProgressTask, setQuickProgressTask] = useState<{ task: ProjectCalendarEvent; progress: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Generar rango continuo de meses y días para abarcar todas las tareas del proyecto
  const { monthsList, daysList, todayIndex, dateToIndex } = useMemo(() => {
    const allEvents = project.calendarEvents || [];

    // Recolectar fechas clave de tareas e hitos
    const dates: string[] = [todayStr];
    allEvents.forEach(e => {
      if (e.date) dates.push(normalizeDateStr(e.date));
      if (e.startDate) dates.push(normalizeDateStr(e.startDate));
    });
    (project.milestones || []).forEach(m => {
      if (m.targetDate) dates.push(normalizeDateStr(m.targetDate));
      if ((m as any).endDate) dates.push(normalizeDateStr((m as any).endDate));
    });

    // El cronograma siempre comienza estrictamente 2 meses antes del mes actual para ver semanas recientes
    // Nunca dejamos que una fecha antigua histórica (ej. 2023) desplace la vista 3 años atrás
    const startD = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Fin: al menos 10 meses hacia adelante desde hoy (o la fecha final si hay tareas futuras)
    let endD = new Date(now.getFullYear(), now.getMonth() + 10 + 1, 0);

    dates.forEach(d => {
      const parts = d.split('-').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const y = parts[0];
        const m = parts[1] - 1; // 0 a 11
        const taskEndDate = new Date(y, m + 1, 0);
        if (taskEndDate > endD) {
          endD = taskEndDate;
        }
      }
    });

    const mList: {
      year: number;
      monthIndex: number;
      name: string;
      daysCount: number;
      startDayIndex: number;
    }[] = [];

    const dList: {
      dayNum: number;
      dateStr: string;
      weekdayLetter: string;
      isWeekend: boolean;
      isToday: boolean;
      monthIndex: number;
      year: number;
    }[] = [];

    const dToIdx = new Map<string, number>();

    let cur = new Date(startD.getFullYear(), startD.getMonth(), 1);
    let globalDayCounter = 0;
    let iter = 0;

    // Permitir hasta 24 meses continuos con total fluidez
    while (cur <= endD && iter < 24) {
      iter++;
      const y = cur.getFullYear();
      const m = cur.getMonth();
      const daysInCurMonth = new Date(y, m + 1, 0).getDate();

      mList.push({
        year: y,
        monthIndex: m,
        name: MONTH_NAMES[m],
        daysCount: daysInCurMonth,
        startDayIndex: globalDayCounter
      });

      for (let day = 1; day <= daysInCurMonth; day++) {
        const dayDate = new Date(y, m, day);
        const dayOfWeek = dayDate.getDay();
        const dStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        dList.push({
          dayNum: day,
          dateStr: dStr,
          weekdayLetter: WEEKDAY_INITIALS[dayOfWeek],
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isToday: dStr === todayStr,
          monthIndex: m,
          year: y
        });

        dToIdx.set(dStr, globalDayCounter);
        globalDayCounter++;
      }

      cur = new Date(y, m + 1, 1);
    }

    const tIdx = dList.findIndex(d => d.isToday);

    return {
      monthsList: mList,
      daysList: dList,
      todayIndex: tIdx,
      dateToIndex: dToIdx
    };
  }, [project, todayStr, now]);

  // Contratistas activos de la obra
  const activeContractors = useMemo(() => {
    if (contractors && contractors.length > 0) return contractors;
    return getProjectContractors(project);
  }, [contractors, project]);

  const allEvents = project.calendarEvents || [];
  const projectMilestones = project.milestones || [];
  const totalDays = daysList.length;
  const timelineStartStr = daysList[0]?.dateStr || '';
  const timelineEndStr = daysList[totalDays - 1]?.dateStr || '';

  // Agrupar filas por contratista con carriles automáticos (lanes) si hay solapamiento
  const contractorRows = useMemo(() => {
    const rawRows: {
      profile: ContractorProfile;
      tasks: ProjectCalendarEvent[];
    }[] = [];

    // 1. Contratistas oficiales
    activeContractors.forEach(c => {
      const cName = c.name.trim().toLowerCase();
      const assigned = allEvents.filter(
        e => (e.assignedTo || '').trim().toLowerCase() === cName
      );
      rawRows.push({
        profile: c,
        tasks: assigned
      });
    });

    // 2. Responsables presentes en tareas no incluidos en la lista oficial
    const assignedNames = new Set(activeContractors.map(c => c.name.trim().toLowerCase()));
    allEvents.forEach(e => {
      const aName = (e.assignedTo || '').trim().toLowerCase();
      if (aName && !assignedNames.has(aName)) {
        assignedNames.add(aName);
        const prof = getContractorProfile(e.assignedTo!.trim(), e.assignedRole, activeContractors);
        rawRows.push({
          profile: prof,
          tasks: allEvents.filter(t => (t.assignedTo || '').trim().toLowerCase() === aName)
        });
      }
    });

    // 3. Tareas generales sin asignar
    const unassignedTasks = allEvents.filter(e => !(e.assignedTo || '').trim());
    if (unassignedTasks.length > 0) {
      rawRows.unshift({
        profile: getContractorProfile('Cuadrilla General', 'Tareas Generales', activeContractors),
        tasks: unassignedTasks
      });
    }

    // Calcular posición y carril (lane) para cada tarea continua
    return rawRows.map(row => {
      const sorted = [...row.tasks].sort((a, b) => {
        const aStart = normalizeDateStr(a.startDate || a.date);
        const bStart = normalizeDateStr(b.startDate || b.date);
        return aStart.localeCompare(bStart);
      });

      const lanesEnd: number[] = [];
      const positionedTasks: {
        event: ProjectCalendarEvent;
        leftOffset: number;
        width: number;
        lane: number;
        taskStart: string;
        taskEnd: string;
        isDone: boolean;
        isCritical: boolean;
        isApproachingNoProgress: boolean;
        pillClasses: string;
        statusText: string;
        taskProgress: number;
      }[] = [];

      sorted.forEach(task => {
        const rawStart = normalizeDateStr(task.startDate || task.date);
        const rawEnd = normalizeDateStr(task.date || task.startDate);
        if (!rawStart && !rawEnd) return;

        // Invertir si startDate es posterior a date (ej. cargaron fecha inicio > fin por error)
        const taskStart = rawStart && rawEnd && rawStart > rawEnd ? rawEnd : (rawStart || rawEnd);
        const taskEnd = rawStart && rawEnd && rawStart > rawEnd ? rawStart : (rawEnd || rawStart);

        if (taskEnd < timelineStartStr || taskStart > timelineEndStr) return;

        let startIdx = 0;
        if (taskStart >= timelineStartStr) {
          startIdx = dateToIndex.get(taskStart) ?? 0;
        }

        let endIdx = totalDays - 1;
        if (taskEnd <= timelineEndStr) {
          endIdx = dateToIndex.get(taskEnd) ?? (totalDays - 1);
        }

        if (endIdx < startIdx) endIdx = startIdx;

        // Asignar primer carril disponible
        let assignedLane = -1;
        for (let l = 0; l < lanesEnd.length; l++) {
          if (lanesEnd[l] < startIdx) {
            assignedLane = l;
            lanesEnd[l] = endIdx;
            break;
          }
        }
        if (assignedLane === -1) {
          assignedLane = lanesEnd.length;
          lanesEnd.push(endIdx);
        }

        const spanDays = endIdx - startIdx + 1;
        const alarms = getTaskAlarms(task, todayStr);
        const daysDiff = getDaysDiff(taskEnd, todayStr);
        const taskProgress = task.progress !== undefined ? task.progress : (task.completed || task.status === 'completed' ? 100 : 0);
        const isDone = Boolean(task.completed || task.status === 'completed' || taskProgress >= 100);
        const isOverdue = daysDiff < 0 && !isDone;
        const isApproaching = daysDiff >= 0 && daysDiff <= 3;
        const hasNoProgress = taskProgress === 0;
        const hasSignificantProgress = taskProgress > 0;
        const isCriticalAlarm = task.type === 'alarm' || alarms.isCriticalDelay;
        const isApproachingNoProgress = isApproaching && hasNoProgress && !isDone;

        // Criterio de color y titilado en rojo:
        // "no es lo mismo que quede 3 dias para terminar sin avances a que tengamos un avance del 90% quedando 3 dias no estari aen rojo sino naranja, eso porcentaje se lo podria colocar si entro en la tarea ahi le puedo ir colocando porcentaje de avance."
        let pillClasses = 'bg-cyan-500 text-slate-950 border-cyan-400';
        let statusText = `${taskProgress}% • Pendiente`;

        if (isDone) {
          pillClasses = 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/25';
          statusText = '100% Listo';
        } else if (isOverdue || isCriticalAlarm || isApproachingNoProgress) {
          pillClasses = 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_14px_rgba(244,63,94,1)]';
          statusText = isOverdue
            ? `${taskProgress}% • Atraso +${Math.abs(daysDiff)}d`
            : daysDiff === 0
            ? `${taskProgress}% • ¡Vence Hoy sin avances!`
            : `${taskProgress}% • ¡Quedan ${daysDiff}d sin avances!`;
        } else if (isApproaching && hasSignificantProgress) {
          // Quedan <= 3 días pero con avance registrado (ej. 90%) -> NARANJA / ÁMBAR (No titila en rojo)
          pillClasses = 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.5)] font-bold';
          statusText = `${taskProgress}% • Quedan ${daysDiff}d`;
        } else if (taskProgress > 0 || task.status === 'in_progress') {
          // En curso al día con tiempo suficiente -> VERDE ESMERALDA ("si venimos bien")
          pillClasses = 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-600/25';
          statusText = `${taskProgress}% • En curso al día`;
        }

        positionedTasks.push({
          event: task,
          leftOffset: startIdx * dayWidth + 2,
          width: Math.max(dayWidth - 4, spanDays * dayWidth - 4),
          lane: assignedLane,
          taskStart,
          taskEnd,
          isDone,
          isCritical: isOverdue || isCriticalAlarm || isApproachingNoProgress,
          isApproachingNoProgress,
          pillClasses,
          statusText,
          taskProgress
        });
      });

      const totalLanes = Math.max(1, lanesEnd.length);
      const rowHeight = totalLanes === 1 ? 40 : totalLanes * 26 + 12;

      return {
        profile: row.profile,
        tasks: row.tasks,
        positionedTasks,
        rowHeight,
        totalLanes
      };
    });
  }, [activeContractors, allEvents, timelineStartStr, timelineEndStr, dateToIndex, totalDays, todayStr, dayWidth]);

  // Estadísticas globales del Gantt
  const stats = useMemo(() => {
    const total = allEvents.length;
    const completed = allEvents.filter(t => t.completed || t.status === 'completed' || (t.progress !== undefined && t.progress >= 100)).length;
    const critical = allEvents.filter(t => {
      const daysDiff = getDaysDiff(t.date, todayStr);
      const tProg = t.progress !== undefined ? t.progress : (t.completed || t.status === 'completed' ? 100 : 0);
      const isDone = Boolean(t.completed || t.status === 'completed' || tProg >= 100);
      const hasNoProg = tProg === 0;
      return !isDone && (daysDiff < 0 || (daysDiff <= 3 && hasNoProg) || t.type === 'alarm');
    }).length;
    const upcoming = allEvents.filter(t => getTaskAlarms(t, todayStr).isUpcomingDeadline).length;
    return { total, completed, critical, upcoming };
  }, [allEvents, todayStr]);

  // Función para centrar exactamente en el día de hoy
  const scrollToToday = (behavior: ScrollBehavior = 'smooth', overrideScale?: GanttTimeScale) => {
    if (!scrollRef.current || todayIndex < 0) return;
    const currentScale = overrideScale || timeScale;
    const currentDayWidth = currentScale === 'week' ? 50 : currentScale === 'year' ? 10 : 28;
    const containerW = scrollRef.current.clientWidth || 600;
    const targetX = Math.max(0, todayIndex * currentDayWidth - (containerW / 2) + (STICKY_COL_WIDTH / 2));
    scrollRef.current.scrollTo({ left: targetX, behavior });
  };

  // Centrar automáticamente en el día de hoy al cargar en múltiples frames para asegurar layout completo
  useEffect(() => {
    if (todayIndex >= 0) {
      scrollToToday('auto');
      const rAF = requestAnimationFrame(() => {
        scrollToToday('auto');
      });
      const timer = setTimeout(() => {
        scrollToToday('smooth');
      }, 150);
      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(timer);
      };
    }
  }, [todayIndex]);

  // Cambio de escala con persistencia y recentrado suave
  const handleScaleChange = (scale: GanttTimeScale) => {
    setTimeScale(scale);
    try {
      localStorage.setItem('gantt_time_scale', scale);
    } catch (e) {
      // ignore
    }
    // Re-centrar suavemente con la nueva escala
    setTimeout(() => {
      scrollToToday('smooth', scale);
    }, 40);
  };

  // Navegación rápida con botones
  const handleScrollToToday = () => {
    scrollToToday('smooth');
  };

  const handleScrollDelta = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const step = timeScale === 'week' ? (7 * 50) : timeScale === 'year' ? 800 : 500;
    const delta = dir === 'right' ? step : -step;
    scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Soporte bidireccional (2D) de arrastre con mouse además del toque táctil nativo
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, [data-interactive="true"]')) return;
    if (!scrollRef.current) return;
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.pageX;
    startYRef.current = e.pageY;
    scrollLeftRef.current = scrollRef.current.scrollLeft;
    scrollTopRef.current = scrollRef.current.scrollTop;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollRef.current) return;
    e.preventDefault();
    const walkX = (e.pageX - startXRef.current) * 1.3;
    const walkY = (e.pageY - startYRef.current) * 1.3;
    scrollRef.current.scrollLeft = scrollLeftRef.current - walkX;
    scrollRef.current.scrollTop = scrollTopRef.current - walkY;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleOpenPM = (taskId?: string, dateStr?: string) => {
    if (onOpenProjectManager) {
      onOpenProjectManager(project.id, taskId ? 'tasks' : 'dashboard', dateStr || todayStr, taskId);
    } else if (onOpenCalendarModal) {
      onOpenCalendarModal(project.id, dateStr || todayStr);
    }
  };

  const firstMonth = monthsList[0];
  const lastMonth = monthsList[monthsList.length - 1];

  const viewportMaxHeight = large ? 'max-h-[460px]' : 'max-h-[350px]';

  return (
    <div
      onClick={(e) => {
        // Evitar que hacer clic en el Gantt active la selección de la obra entera
        e.stopPropagation();
      }}
      className={`bg-[#101D30]/40 backdrop-blur-md rounded-2xl ${large ? 'p-3.5 sm:p-4' : 'p-2.5 sm:p-3'} border border-white/10 flex flex-col justify-between select-none shadow-inner min-w-0 overflow-hidden w-full`}
    >
      {/* 1. HEADER: Título Continuo, Controles de Desplazamiento y Acceso a PM */}
      <div>
        <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#29384C]/80 flex-wrap sm:flex-nowrap">
          {/* Título & Rango de Meses Continuos */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: neonColor }} />
            <span className="text-[11px] font-black uppercase tracking-wider text-white truncate">
              Gantt {large ? 'General de Obra' : 'Continuo'} • {firstMonth?.name} {firstMonth?.year} - {lastMonth?.name} {lastMonth?.year}
            </span>

            {/* Stepper Rápido de Meses y Botón Hoy */}
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={() => handleScrollDelta('left')}
                className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
                title="Deslizar meses anteriores"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleScrollToToday}
                className="px-2 py-0.5 rounded text-[9.5px] font-black text-cyan-300 hover:text-white bg-[#17263B] hover:bg-[#1f324d] transition-colors border border-cyan-500/30"
                title="Centrar en el día de hoy"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => handleScrollDelta('right')}
                className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
                title="Deslizar meses siguientes"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Selector de Escala Temporal: Semana / Mes / Anual */}
            <div className="inline-flex items-center rounded-lg bg-[#081321]/80 p-0.5 border border-[#29384C]/80 ml-1.5 shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => handleScaleChange('week')}
                className={`px-2 py-0.5 rounded text-[9px] sm:text-[9.5px] font-black tracking-wide transition-all ${
                  timeScale === 'week'
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]/80'
                }`}
                title="Vista Semanal (zoom en días con alto detalle)"
              >
                Semana
              </button>
              <button
                type="button"
                onClick={() => handleScaleChange('month')}
                className={`px-2 py-0.5 rounded text-[9px] sm:text-[9.5px] font-black tracking-wide transition-all ${
                  timeScale === 'month'
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]/80'
                }`}
                title="Vista Mensual estándar"
              >
                Mes
              </button>
              <button
                type="button"
                onClick={() => handleScaleChange('year')}
                className={`px-2 py-0.5 rounded text-[9px] sm:text-[9.5px] font-black tracking-wide transition-all ${
                  timeScale === 'year'
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#17263B]/80'
                }`}
                title="Vista Anual macro (panorama del año completo)"
              >
                Anual
              </button>
            </div>
          </div>

          {/* Badges de Resumen y Acceso a Project Manager */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 text-[9.5px]">
              {stats.critical > 0 && (
                <span
                  onClick={() => handleOpenPM()}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer font-black animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  title="Tareas o hitos con alerta crítica"
                >
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>{stats.critical} críticas / sin avances</span>
                </span>
              )}

              {stats.completed > 0 && (
                <span className="hidden sm:flex items-center gap-0.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{stats.completed} listas</span>
                </span>
              )}

              <span className="text-[#94A3B8] font-medium">
                <span className="text-white font-bold">{stats.total}</span> tareas
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPM()}
              className="px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 text-slate-950 shrink-0"
              style={{ backgroundColor: neonColor }}
              title="Abrir vista completa del Project Manager & Gantt"
            >
              <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Abrir PM</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MATRIZ 2D DE GANTT: CABECERA FIJA SUPERIOR Y COLUMNA FIJA DE RESPONSABLES */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`overflow-x-auto overflow-y-auto no-scrollbar scrollbar-none gantt-scroll-viewport flex-1 ${viewportMaxHeight} my-1 select-none border border-[#29384C]/80 rounded-xl bg-[#081321]/40 backdrop-blur-md ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <div
          className="relative text-left"
          style={{
            width: `${STICKY_COL_WIDTH + daysList.length * dayWidth}px`,
            minWidth: `${STICKY_COL_WIDTH + daysList.length * dayWidth}px`
          }}
        >
          {/* CABECERA FIJA SUPERIOR (STICKY TOP-0 Z-30) */}
          <div className="sticky top-0 z-30 bg-[#101D30]/80 backdrop-blur-md border-b border-[#29384C] shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
            <div className="flex items-stretch">
              {/* Esquina Superior Izquierda: Fija tanto en X como en Y (STICKY TOP-0 LEFT-0 Z-50) */}
              <div
                className="sticky left-0 z-50 bg-[#101D30]/90 backdrop-blur-md px-2.5 py-1.5 flex flex-col justify-center border-r border-[#29384C] shadow-[3px_0_8px_rgba(0,0,0,0.6)] shrink-0"
                style={{ width: `${STICKY_COL_WIDTH}px` }}
              >
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider block">
                  Responsable
                </span>
                <span className="text-[8.5px] text-slate-500 font-bold truncate">
                  {contractorRows.length} cuadrillas {projectMilestones.length > 0 ? '• Hitos' : ''}
                </span>
              </div>

              {/* Área de Meses y Días continuos */}
              <div className="flex flex-col flex-1">
                {/* Fila 1: Meses */}
                <div className="flex items-center border-b border-[#29384C]/80">
                  {monthsList.map(m => (
                    <div
                      key={`${m.year}-${m.monthIndex}`}
                      className="border-r border-[#29384C]/80 px-2 flex items-center justify-between shrink-0 bg-[#101D30]/60 h-6"
                      style={{ width: `${m.daysCount * dayWidth}px` }}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 truncate">
                        {m.name} {m.year}
                      </span>
                      <span className="text-[8.5px] text-slate-500 font-mono">
                        {m.daysCount}d
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fila 2: Días */}
                <div className="flex items-center h-6">
                  {daysList.map(d => (
                    <div
                      key={d.dateStr}
                      className={`flex flex-col items-center justify-center border-r border-[#29384C]/40 text-center shrink-0 ${
                        d.isToday
                          ? 'bg-cyan-500/20 text-cyan-300 font-black'
                          : d.isWeekend
                          ? 'bg-[#101D30]/60 text-slate-500'
                          : 'text-[#94A3B8]'
                      }`}
                      style={{ width: `${dayWidth}px`, height: '24px' }}
                      title={`${d.dayNum} - ${d.dateStr}`}
                    >
                      {timeScale === 'week' ? (
                        <>
                          <span className="text-[8px] font-bold leading-none text-[#94A3B8]">
                            {d.weekdayLetter}
                          </span>
                          <span className={`text-[10px] leading-tight rounded px-1 ${d.isToday ? 'bg-cyan-400 text-slate-950 font-black' : 'font-bold'}`}>
                            {d.dayNum}
                          </span>
                        </>
                      ) : timeScale === 'year' ? (
                        <div className="flex flex-col items-center justify-center w-full h-full">
                          {d.isToday ? (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,1)] animate-pulse" title="Hoy" />
                          ) : (d.dayNum === 1 || d.dayNum === 15) ? (
                            <span className="text-[7.5px] font-black text-slate-300 leading-none">
                              {d.dayNum}
                            </span>
                          ) : d.dayNum % 5 === 0 ? (
                            <span className="w-0.5 h-1.5 bg-slate-600 rounded-full" />
                          ) : (
                            <span className="w-px h-1 bg-[#17263B]" />
                          )}
                        </div>
                      ) : (
                        <>
                          <span className="text-[7.5px] leading-none text-slate-500">
                            {d.weekdayLetter}
                          </span>
                          <span className={`text-[9.5px] leading-tight rounded px-0.5 ${d.isToday ? 'bg-cyan-400 text-slate-950 font-black' : ''}`}>
                            {d.dayNum}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CUERPO: FILA DE HITOS Y FILAS DE CUADRILLAS */}
          <div className="relative divide-y divide-slate-800/50">
            {/* Línea vertical indicadora del día de hoy a lo largo de toda la matriz */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{
                  left: `${STICKY_COL_WIDTH + todayIndex * dayWidth + dayWidth / 2}px`,
                  width: '2px'
                }}
              >
                <div className="w-[2px] h-full border-l-2 border-dashed border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              </div>
            )}

            {/* FILA ESPECIAL DE HITOS DEL PROYECTO */}
            {projectMilestones.length > 0 && (
              <div
                className="flex items-center hover:bg-[#17263B]/40 transition-colors group relative border-b-2 border-[#29384C]/80 bg-[#101D30]/40"
                style={{ height: '42px' }}
              >
                {/* Columna Izquierda Fija: Rótulo de Hitos */}
                <div
                  onClick={() => onOpenMilestonesConfig && onOpenMilestonesConfig(project.id)}
                  className="sticky left-0 z-20 bg-[#101D30]/85 backdrop-blur-md px-2 flex items-center justify-between gap-1.5 border-r border-[#29384C] shadow-[3px_0_6px_rgba(0,0,0,0.6)] shrink-0 cursor-pointer hover:bg-[#17263B]"
                  style={{ width: `${STICKY_COL_WIDTH}px`, height: '42px' }}
                  title="Hitos clave de la obra (Clic para configurar)"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <Flag className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black text-amber-300 truncate leading-tight">
                        Hitos de Obra
                      </p>
                      <p className="text-[8px] text-[#94A3B8] font-bold truncate">
                        {projectMilestones.length} hitos
                      </p>
                    </div>
                  </div>
                  {onOpenMilestonesConfig && (
                    <Pencil className="w-3 h-3 text-slate-500 hover:text-amber-400 shrink-0" />
                  )}
                </div>

                {/* Track de Días con Hitos */}
                <div className="flex items-center relative h-full">
                  {daysList.map(d => (
                    <div
                      key={d.dateStr}
                      className={`h-full border-r border-[#29384C]/30 shrink-0 ${
                        d.isWeekend ? 'bg-[#101D30]/30' : ''
                      } ${d.isToday ? 'bg-cyan-500/10' : ''}`}
                      style={{ width: `${dayWidth}px` }}
                    />
                  ))}

                  {/* Píldoras de Hitos con color condicional, avance, fotos y comentarios */}
                  {projectMilestones.map(m => {
                    const mDate = normalizeDateStr(m.targetDate || (m as any).endDate);
                    if (!mDate || mDate < timelineStartStr || mDate > timelineEndStr) return null;

                    const mIdx = dateToIndex.get(mDate);
                    if (mIdx === undefined) return null;

                    const mProgress =
                      m.progressPercentage !== undefined
                        ? m.progressPercentage
                        : m.progress !== undefined
                        ? m.progress
                        : m.manualCompleted || m.completed
                        ? 100
                        : 0;

                    const daysDiff = getDaysDiff(mDate, todayStr);
                    const isDone = Boolean(m.completed || m.manualCompleted || mProgress >= 100);
                    const isOverdue = daysDiff < 0 && !isDone;
                    const isApproaching = daysDiff >= 0 && daysDiff <= 3;
                    const hasNoProgress = mProgress === 0;

                    let pillClass = 'bg-cyan-600 text-white border-cyan-400';
                    let statusLabel = `${mProgress}% • Hito`;

                    if (isDone) {
                      pillClass = 'bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30';
                      statusLabel = '100% Listo';
                    } else if (isOverdue || (isApproaching && hasNoProgress)) {
                      pillClass = 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-[0_0_14px_rgba(244,63,94,1)]';
                      statusLabel = isOverdue ? `Atraso +${Math.abs(daysDiff)}d` : daysDiff === 0 ? '¡Vence Hoy!' : `¡Faltan ${daysDiff}d sin avances!`;
                    } else if (mProgress > 0) {
                      pillClass = 'bg-amber-500 text-slate-950 border-amber-300 font-bold';
                      statusLabel = `${mProgress}% • En curso`;
                    }

                    const mLeft = Math.max(0, mIdx * dayWidth - (timeScale === 'year' ? 10 : 20));

                    return (
                      <div
                        key={m.id}
                        data-interactive="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMilestoneForDetail(m);
                        }}
                        className={`absolute top-1.5 h-6 rounded-xl text-[9px] font-black px-2 flex items-center gap-1 cursor-pointer transition-all shadow-lg hover:scale-105 active:scale-95 z-10 border ${pillClass}`}
                        style={{
                          left: `${mLeft}px`,
                          minWidth: '95px',
                          maxWidth: '220px'
                        }}
                        title={`Hito: ${m.name} (${formatPMDate(mDate)}) • ${statusLabel} • Clic para editar avance, comentarios y fotos`}
                      >
                        <Flag className="w-2.5 h-2.5 shrink-0" />

                        {/* Badge de porcentaje */}
                        <span className="px-1 py-0.2 rounded text-[7.5px] font-black bg-black/35 text-white shrink-0">
                          {mProgress}%
                        </span>

                        <span className="truncate flex-1 font-bold">{m.name}</span>

                        {/* Indicadores de fotos y comentarios */}
                        {m.photos && m.photos.length > 0 && (
                          <span className="flex items-center gap-0.5 text-cyan-100 shrink-0" title={`${m.photos.length} foto(s)`}>
                            <Camera className="w-2.5 h-2.5" />
                            <span className="text-[7.5px] font-mono">{m.photos.length}</span>
                          </span>
                        )}

                        {(m.comments || m.notes) && (
                          <MessageSquare className="w-2.5 h-2.5 shrink-0 opacity-90" title="Tiene comentarios u observaciones" />
                        )}

                        {isDone && <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />}
                        {(isOverdue || (isApproaching && hasNoProgress)) && (
                          <Flame className="w-2.5 h-2.5 shrink-0 text-white animate-bounce" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* FILAS DE CUADRILLAS / RESPONSABLES */}
            {contractorRows.map(row => (
              <div
                key={row.profile.id}
                className="flex items-center hover:bg-[#17263B]/30 transition-colors group relative"
                style={{ height: `${row.rowHeight}px` }}
              >
                {/* Columna Izquierda Fija: Avatar + Nombre + Cargo (STICKY LEFT-0 Z-20) */}
                <div
                  onClick={() => handleOpenPM(undefined, todayStr)}
                  className="sticky left-0 z-20 bg-[#101D30]/85 backdrop-blur-md px-2 flex items-center gap-2 border-r border-[#29384C] shadow-[3px_0_6px_rgba(0,0,0,0.6)] shrink-0 cursor-pointer group-hover:bg-[#101D30]"
                  style={{ width: `${STICKY_COL_WIDTH}px`, height: `${row.rowHeight}px` }}
                  title={`${row.profile.name} - ${row.profile.role} (Clic para abrir PM)`}
                >
                  <ContractorAvatar
                    avatarUrl={row.profile.avatarUrl}
                    name={row.profile.name}
                    color={row.profile.color || neonColor}
                    sizeClassName="w-6 h-6"
                    ringClassName="ring-1 shadow-xs"
                    showStatusDot
                    statusColor={row.profile.color || neonColor}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-200 group-hover:text-cyan-400 truncate leading-tight transition-colors">
                      {row.profile.name}
                    </p>
                    <p className="text-[8px] text-slate-500 truncate leading-tight font-medium">
                      {row.profile.role}
                    </p>
                  </div>
                </div>

                {/* Track de Días y Tareas Continuas */}
                <div className="flex items-center relative h-full">
                  {daysList.map(d => (
                    <div
                      key={d.dateStr}
                      className={`h-full border-r border-[#29384C]/30 shrink-0 ${
                        d.isWeekend ? 'bg-[#101D30]/30' : ''
                      } ${d.isToday ? 'bg-cyan-500/10' : ''}`}
                      style={{ width: `${dayWidth}px` }}
                    />
                  ))}

                  {/* Píldoras de Tareas Continuas (Multimes sin cortes) */}
                  {row.positionedTasks.map(({ event: task, leftOffset, width, lane, taskStart, taskEnd, isDone, isCritical, isApproachingNoProgress, pillClasses, statusText, taskProgress }) => {
                    return (
                      <div
                        key={task.id}
                        data-interactive="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPM(task.id, task.date);
                        }}
                        className={`absolute h-5 sm:h-5.5 rounded-lg text-[9px] font-black px-1.5 flex items-center justify-between gap-1 cursor-pointer transition-all shadow-md hover:scale-[1.02] active:scale-95 z-10 truncate border overflow-hidden ${pillClasses}`}
                        style={{
                          left: `${leftOffset}px`,
                          width: `${width}px`,
                          top: `${6 + lane * 26}px`
                        }}
                        title={`${task.title} • Avance: ${taskProgress}% (${formatPMDate(taskStart)} al ${formatPMDate(taskEnd)}) • ${statusText} • Clic para editar`}
                      >
                        {/* Relleno interno translúcido de progreso */}
                        {taskProgress > 0 && taskProgress < 100 && (
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-md pointer-events-none"
                            style={{ width: `${taskProgress}%` }}
                          />
                        )}

                        <span className="truncate flex-1 z-1 relative flex items-center gap-1 min-w-0">
                          {/* Badge de porcentaje con clic directo para ajuste rápido */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickProgressTask({
                                task,
                                progress: taskProgress
                              });
                            }}
                            className="px-1 py-0.2 rounded text-[7.5px] font-black bg-black/35 hover:bg-black/60 text-white shrink-0 transition-colors"
                            title={`Avance: ${taskProgress}%. Clic para cambiar rápido.`}
                          >
                            {taskProgress}%
                          </button>
                          <span className="truncate font-bold">{task.title}</span>
                        </span>

                        <div className="z-1 relative flex items-center gap-0.5 shrink-0">
                          {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {(isCritical || isApproachingNoProgress) && (
                            <Flame className="w-2.5 h-2.5 text-white animate-pulse" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {contractorRows.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500">
                No hay cuadrillas configuradas en esta obra.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. FOOTER: Indicador de Navegación 2D y Acción Rápida */}
      <div className="pt-2 border-t border-[#29384C]/80 flex items-center justify-between text-[10px] text-[#94A3B8]">
        <div className="flex items-center gap-1.5 text-cyan-400/90 font-medium">
          <MoveHorizontal className="w-3.5 h-3.5 animate-pulse" />
          <span>Desliza lateralmente para ver meses/semanas y hacia abajo para más cuadrillas</span>
        </div>

        <button
          type="button"
          onClick={() => handleOpenPM()}
          className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* MODAL / POPOVER FLOTANTE DE AJUSTE RÁPIDO DE AVANCE (%) */}
      {quickProgressTask && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          style={{ zIndex: 99999 }}
          onClick={() => setQuickProgressTask(null)}
        >
          <div
            className="w-full max-w-sm bg-[#101D30] border border-[#29384C]/90 rounded-3xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#29384C]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Avance de Tarea
                  </h4>
                  <p className="text-[11px] text-[#94A3B8] font-bold truncate">
                    {quickProgressTask.task.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickProgressTask(null)}
                className="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#17263B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8] font-bold">Porcentaje de Avance</span>
                <span className={`text-sm font-black px-2.5 py-0.5 rounded-xl border ${
                  quickProgressTask.progress >= 100
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : quickProgressTask.progress >= 75
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : quickProgressTask.progress > 0
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}>
                  {quickProgressTask.progress}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={quickProgressTask.progress}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setQuickProgressTask(prev => prev ? { ...prev, progress: val } : null);
                }}
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-[#17263B] rounded-lg"
              />

              {/* Botones rápidos */}
              <div className="flex items-center justify-between gap-1">
                {[0, 25, 50, 75, 90, 100].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setQuickProgressTask(prev => prev ? { ...prev, progress: pct } : null)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition-all ${
                      quickProgressTask.progress === pct
                        ? 'bg-cyan-500 text-slate-950 shadow-md scale-105'
                        : 'bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Explicación de impacto en Gantt */}
              <div className="text-[10px] font-medium p-2.5 rounded-xl bg-[#17263B]/60 border border-[#29384C]/60">
                {quickProgressTask.progress >= 100 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    ✓ 100% Finalizada (Se verá verde en Gantt)
                  </span>
                ) : quickProgressTask.progress > 0 ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    ⚡ {quickProgressTask.progress}% con avance: Si quedan ≤3 días, se verá en naranja/ámbar como tarea al día.
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    ⚠️ 0% Sin avances: Si quedan ≤3 días, titilará en rojo como alarma crítica.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#29384C]">
              <button
                type="button"
                onClick={() => setQuickProgressTask(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-[#17263B]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const updatedTask: ProjectCalendarEvent = {
                    ...quickProgressTask.task,
                    progress: quickProgressTask.progress,
                    completed: quickProgressTask.progress >= 100,
                    status: quickProgressTask.progress >= 100
                      ? 'completed'
                      : quickProgressTask.progress > 0
                      ? 'in_progress'
                      : 'pending',
                    updatedAt: new Date().toISOString()
                  };
                  if (onSaveTask) {
                    onSaveTask(project.id, updatedTask);
                  } else if (onOpenProjectManager) {
                    onOpenProjectManager(project.id, 'tasks', updatedTask.date, updatedTask.id);
                  }
                  setQuickProgressTask(null);
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-black bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Avance</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE EDICIÓN DE AVANCE, COMENTARIOS Y FOTOS DEL HITO */}
      {selectedMilestoneForDetail && (
        <MilestoneDetailModal
          isOpen={Boolean(selectedMilestoneForDetail)}
          milestone={selectedMilestoneForDetail}
          projectId={project.id}
          projectName={project.name}
          neonColor={neonColor}
          onClose={() => setSelectedMilestoneForDetail(null)}
          onSaveMilestone={(projId, updated) => {
            if (onSaveMilestone) {
              onSaveMilestone(projId, updated);
            }
            setSelectedMilestoneForDetail(null);
          }}
          onOpenAdvancedConfig={onOpenMilestonesConfig}
        />
      )}
    </div>
  );
}
