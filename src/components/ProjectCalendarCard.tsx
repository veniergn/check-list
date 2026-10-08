import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Clock,
  Flag,
  Briefcase,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Project, ProjectCalendarEvent } from '../types';
import { hexToRgba } from '../utils/calculations';
import { calculateProjectPMStats, getTaskAlarms } from '../utils/pmCalculations';

interface ProjectCalendarCardProps {
  project: Project;
  neonColor?: string;
  onOpenCalendarModal: (projectId: string, initialDate?: string, selectedEventId?: string) => void;
  onOpenProjectManager?: (
    projectId: string,
    initialTab?: 'dashboard' | 'tasks' | 'calendar',
    initialDate?: string,
    selectedTaskId?: string
  ) => void;
  onToggleCalendarEvent?: (projectId: string, eventId: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function ProjectCalendarCard({
  project,
  neonColor = '#00f2fe',
  onOpenCalendarModal,
  onOpenProjectManager,
  onToggleCalendarEvent
}: ProjectCalendarCardProps) {
  // Current real date or project base date
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  // Project Manager stats calculation
  const pmStats = useMemo(() => {
    return calculateProjectPMStats(project.calendarEvents || [], todayStr);
  }, [project.calendarEvents, todayStr]);

  // Calendar month/year navigation state
  const [viewDate, setViewDate] = useState<Date>(() => {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Selected date inside calendar
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0 to 11

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleResetToToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Day of week for 1st day of month (Monday = 0, Sunday = 6)
  const startDayOffset = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentYear, currentMonth]);

  // Map of events by YYYY-MM-DD specifically for this project
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ProjectCalendarEvent[]>();
    (project.calendarEvents || []).forEach(evt => {
      const list = map.get(evt.date) || [];
      list.push(evt);
      map.set(evt.date, list);
    });
    return map;
  }, [project.calendarEvents]);

  // Project milestones by date
  const milestonesByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    (project.milestones || []).forEach(ms => {
      const dateKey = ms.targetDate || ms.endDate;
      if (dateKey) {
        const list = map.get(dateKey) || [];
        list.push(ms);
        map.set(dateKey, list);
      }
    });
    return map;
  }, [project.milestones]);

  // Events count in the current visible month
  const monthStats = useMemo(() => {
    let taskCount = 0;
    let alarmCount = 0;
    let eventCount = 0;

    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    (project.calendarEvents || []).forEach(evt => {
      if (evt.date.startsWith(prefix)) {
        if (evt.type === 'alarm') alarmCount++;
        else if (evt.type === 'event') eventCount++;
        else taskCount++;
      }
    });

    return { taskCount, alarmCount, eventCount, total: taskCount + alarmCount + eventCount };
  }, [project.calendarEvents, currentYear, currentMonth]);

  // Events of the currently selected date
  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDateStr) || [];
  }, [eventsByDate, selectedDateStr]);

  const selectedDayMilestones = useMemo(() => {
    return milestonesByDate.get(selectedDateStr) || [];
  }, [milestonesByDate, selectedDateStr]);

  // If selected day has no events, find closest upcoming event in the month
  const nextUpcomingEvent = useMemo(() => {
    if (selectedDayEvents.length > 0) return null;
    const sorted = [...(project.calendarEvents || [])]
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    return sorted[0] || null;
  }, [project.calendarEvents, selectedDayEvents, todayStr]);

  const selectedDateParts = selectedDateStr.split('-');
  const selectedDayNum = selectedDateParts[2] || '';
  const selectedMonthNum = parseInt(selectedDateParts[1] || '1', 10) - 1;

  const handleOpenPM = (dateStr?: string, eventId?: string) => {
    if (onOpenProjectManager) {
      onOpenProjectManager(project.id, 'dashboard', dateStr || selectedDateStr, eventId);
    } else {
      onOpenCalendarModal(project.id, dateStr || selectedDateStr, eventId);
    }
  };

  return (
    <div
      onClick={(e) => {
        // Evitar que hacer clic dentro del calendario dispare la navegación a la obra
        e.stopPropagation();
      }}
      className="bg-[#101D30]/40 backdrop-blur-md rounded-2xl p-2.5 sm:p-3 border border-white/10 select-none shadow-inner w-full"
    >
      {/* 1. Cabecera Compacta: Navegación + Badges + Botón PM */}
      <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-[#29384C]/80 flex-wrap sm:flex-nowrap">
        {/* Título de Mes & Botones de Navegación */}
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: neonColor }} />
          <span className="text-[11px] font-black uppercase tracking-wider text-white truncate">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <div className="flex items-center gap-0.5 ml-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetToToday}
              className="px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-300 hover:text-white bg-[#17263B] hover:bg-[#1f324d] transition-colors"
              title="Ir a hoy"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Badges de Estado y Acceso Directo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[9.5px]">
            {pmStats.criticalDelayCount > 0 && (
              <span
                onClick={() => handleOpenPM()}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer font-black animate-pulse"
                title="Ver tareas con retraso crítico"
              >
                <Flame className="w-3 h-3 text-rose-400" />
                <span>{pmStats.criticalDelayCount}</span>
              </span>
            )}

            {pmStats.upcomingDeadlineCount > 0 && (
              <span className="hidden sm:flex items-center gap-0.5 text-amber-400 font-bold">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{pmStats.upcomingDeadlineCount} próx.</span>
              </span>
            )}

            <span className="text-[#94A3B8] font-medium">
              <span className="text-white font-bold">{monthStats.taskCount}</span> tareas
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenPM()}
            className="px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all shadow-md active:scale-95 text-slate-950 shrink-0"
            style={{ backgroundColor: neonColor }}
            title="Abrir Planificación & Gantt completo de esta obra"
          >
            <Briefcase className="w-3 h-3 stroke-[2.5]" />
            <span className="hidden sm:inline">Planificación</span>
          </button>
        </div>
      </div>

      {/* 2. Cuerpo Compacto: Grilla de Días a la izquierda + Panel de Día a la derecha */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 items-start">
        {/* Columna Izquierda (Grilla Mensual Súper Compacta) */}
        <div className="sm:col-span-7 lg:col-span-8">
          {/* Fila de Días de la Semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-[#94A3B8] mb-1">
            {WEEKDAYS.map((wd, i) => (
              <div key={i} className="py-0.2">
                {wd}
              </div>
            ))}
          </div>

          {/* Cuadrícula de Días */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Espaciadores de inicio de mes */}
            {Array.from({ length: startDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-5 sm:h-5.5 w-full" />
            ))}

            {/* Días del Mes */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDateStr;

              const dayEvts = eventsByDate.get(dateStr) || [];
              const dayMilestones = milestonesByDate.get(dateStr) || [];
              const hasCritical = dayEvts.some(e => getTaskAlarms(e, todayStr).isCriticalDelay);
              const hasAlarms = dayEvts.some(e => e.type === 'alarm');
              const hasTasks = dayEvts.some(e => e.type === 'task');
              const hasEvents = dayEvts.some(e => e.type === 'event');
              const hasMilestone = dayMilestones.length > 0;
              const hasAny = dayEvts.length > 0 || hasMilestone;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(dateStr)}
                  onDoubleClick={() => handleOpenPM(dateStr)}
                  className={`h-5 sm:h-5.5 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center relative transition-all duration-150 ${
                    isSelected
                      ? 'bg-slate-700/90 text-white ring-1 ring-amber-400 shadow-sm'
                      : isToday
                      ? 'bg-[#17263B]/90 text-white border border-slate-600 font-black'
                      : 'text-slate-300 hover:bg-[#17263B]/60 hover:text-white'
                  }`}
                  style={
                    isSelected
                      ? { borderColor: neonColor, boxShadow: `0 0 6px ${hexToRgba(neonColor, 0.4)}` }
                      : undefined
                  }
                  title={`${dayNum} de ${MONTH_NAMES[currentMonth]}: ${dayEvts.length} ítems (Doble clic para Planificación)`}
                >
                  <span className={`leading-none ${isToday ? 'font-black' : ''}`}>
                    {dayNum}
                  </span>

                  {/* Puntos Indicadores de Eventos */}
                  {hasAny && (
                    <div className="flex items-center justify-center gap-0.5 mt-0.5 leading-none">
                      {hasCritical ? (
                        <span className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,1)] animate-pulse" />
                      ) : hasAlarms ? (
                        <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                      ) : null}
                      {hasTasks && !hasAlarms && !hasCritical && (
                        <span className="w-1 h-1 rounded-full bg-cyan-400" />
                      )}
                      {hasEvents && !hasAlarms && !hasTasks && !hasCritical && (
                        <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      )}
                      {hasMilestone && (
                        <span className="w-1 h-1 rounded-full bg-purple-400" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha (Resumen del Día Seleccionado y Próximos Eventos) */}
        <div className="sm:col-span-5 lg:col-span-4 border-t sm:border-t-0 sm:border-l border-[#29384C]/80 pt-2 sm:pt-0 sm:pl-2.5 flex flex-col justify-between self-stretch min-h-[95px]">
          <div>
            {/* Cabecera del día */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-1">
              <span className="text-[#94A3B8] uppercase text-[9px] font-black truncate">
                Día {selectedDayNum} {MONTH_NAMES[selectedMonthNum]?.slice(0, 3)}
              </span>

              <button
                type="button"
                onClick={() => handleOpenPM(selectedDateStr)}
                className="text-[9px] text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-0.5 shrink-0"
              >
                <span>Ver día</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Listado de eventos del día o próximo evento */}
            {selectedDayEvents.length > 0 || selectedDayMilestones.length > 0 ? (
              <div className="space-y-1 max-h-16 overflow-y-auto no-scrollbar pr-0.5">
                {selectedDayEvents.slice(0, 2).map(evt => (
                  <div
                    key={evt.id}
                    onClick={() => handleOpenPM(selectedDateStr, evt.id)}
                    className="p-1 px-1.5 rounded-lg bg-[#081321]/70 hover:bg-[#17263B]/80 border border-[#29384C] hover:border-[#29384C] transition-all flex items-center justify-between gap-1 cursor-pointer group"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      {evt.type === 'alarm' ? (
                        <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                      ) : evt.type === 'event' ? (
                        <CalendarIcon className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : (
                        <CheckSquare className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      )}
                      <span className={`text-[9.5px] font-bold text-slate-200 truncate group-hover:text-white ${evt.completed ? 'line-through text-slate-500' : ''}`}>
                        {evt.title}
                      </span>
                    </div>

                    {evt.priority === 'urgent' && (
                      <span className="text-[7.5px] font-black uppercase px-0.5 rounded bg-rose-500/20 text-rose-400 shrink-0">
                        Urg.
                      </span>
                    )}
                  </div>
                ))}

                {selectedDayEvents.length > 2 && (
                  <p className="text-[8.5px] text-[#94A3B8] text-center font-medium">
                    +{selectedDayEvents.length - 2} tareas más
                  </p>
                )}

                {selectedDayMilestones.map(ms => (
                  <div
                    key={ms.id}
                    onClick={() => handleOpenPM(selectedDateStr)}
                    className="p-1 px-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/70 border border-purple-800/60 transition-all flex items-center justify-between gap-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <Flag className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                      <span className="text-[9.5px] font-bold text-purple-200 truncate">
                        {ms.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : nextUpcomingEvent ? (
              <div
                onClick={() => handleOpenPM(nextUpcomingEvent.date, nextUpcomingEvent.id)}
                className="p-1.5 rounded-lg bg-[#081321]/50 border border-[#29384C]/80 hover:border-[#29384C] transition-all flex items-center justify-between gap-1.5 cursor-pointer group"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[9.5px] text-[#94A3B8] truncate">
                    Próx: <span className="font-bold text-slate-200 group-hover:text-white">{nextUpcomingEvent.title}</span>
                  </span>
                </div>
                <span className="text-[8.5px] font-bold text-amber-400 shrink-0">
                  {nextUpcomingEvent.date.split('-')[2]}/{nextUpcomingEvent.date.split('-')[1]}
                </span>
              </div>
            ) : (
              <div className="py-1 text-center">
                <span className="text-[9px] text-slate-500 italic block">
                  Sin tareas en este día
                </span>
              </div>
            )}
          </div>

          {/* Botón inferior de acción rápida */}
          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => handleOpenPM(selectedDateStr)}
              className="text-[9px] text-[#94A3B8] hover:text-white font-bold bg-[#17263B]/80 hover:bg-[#1f324d] px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <span>+ Programar Tarea</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
