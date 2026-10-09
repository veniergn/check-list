import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  ArrowRight,
  Building2,
  Check,
  CalendarDays
} from 'lucide-react';
import { Project, ProjectCalendarEvent } from '../types';
import { getTodayString, getDaysDiff, getTaskAlarms } from '../utils/pmCalculations';

interface GlobalCalendarCardProps {
  projects: Project[];
  neonColor?: string;
  onSelectProject: (projectId: string) => void;
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

export function GlobalCalendarCard({
  projects,
  neonColor = '#3B82F6',
  onSelectProject,
  onOpenProjectManager,
  onToggleCalendarEvent
}: GlobalCalendarCardProps) {
  const todayStr = useMemo(() => getTodayString(), []);
  const todayDate = useMemo(() => new Date(), []);

  // Filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'task' | 'milestone'>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  // Month navigation
  const [viewDate, setViewDate] = useState<Date>(() => {
    return new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  });

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

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
    setViewDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const startDayOffset = useMemo(() => {
    const day = new Date(currentYear, currentMonth, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [currentYear, currentMonth]);

  // Aggregate all events and milestones across all projects
  const allGlobalEvents = useMemo(() => {
    const list: (ProjectCalendarEvent & {
      projectId: string;
      projectName: string;
      projectLocation?: string;
      projectColor: string;
      isMilestone?: boolean;
    })[] = [];

    const PROJECT_COLORS = [
      { text: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', dot: 'bg-cyan-400' },
      { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
      { text: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', dot: 'bg-amber-400' },
      { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', dot: 'bg-purple-400' }
    ];

    projects.forEach((proj, idx) => {
      const colorScheme = PROJECT_COLORS[idx % PROJECT_COLORS.length];

      // Calendar events
      (proj.calendarEvents || []).forEach(evt => {
        list.push({
          ...evt,
          projectId: proj.id,
          projectName: proj.name,
          projectLocation: proj.location,
          projectColor: colorScheme.text
        });
      });

      // Milestones with target dates
      (proj.milestones || []).forEach(ms => {
        if (ms.targetDate) {
          list.push({
            id: `ms_${ms.id}`,
            projectId: proj.id,
            projectName: proj.name,
            projectLocation: proj.location,
            projectColor: colorScheme.text,
            title: `Hito: ${ms.name}`,
            description: ms.notes || `Hito técnico de ${proj.name}`,
            date: ms.targetDate,
            type: 'alarm',
            priority: 'urgent',
            completed: ms.manualCompleted || ms.progressPercentage === 100,
            isMilestone: true
          });
        }
      });
    });

    return list;
  }, [projects]);

  // Map events by date YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof allGlobalEvents>();
    allGlobalEvents.forEach(evt => {
      if (!evt.date) return;
      const cleanDate = evt.date.split('T')[0];
      const existing = map.get(cleanDate) || [];
      existing.push(evt);
      map.set(cleanDate, existing);
    });
    return map;
  }, [allGlobalEvents]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allGlobalEvents.filter(evt => {
      if (selectedProjectId !== 'all' && evt.projectId !== selectedProjectId) return false;
      if (selectedDateStr && evt.date && evt.date.split('T')[0] !== selectedDateStr) return false;

      if (priorityFilter === 'critical') {
        const alarms = getTaskAlarms(evt, todayStr);
        const isCritical = evt.priority === 'urgent' || alarms.isCriticalDelay || alarms.isUpcomingDeadline || evt.type === 'alarm';
        if (!isCritical || evt.completed) return false;
      } else if (priorityFilter === 'task') {
        if (evt.type !== 'task' && !evt.isMilestone) return false;
      } else if (priorityFilter === 'milestone') {
        if (!evt.isMilestone) return false;
      }

      return true;
    });
  }, [allGlobalEvents, selectedProjectId, selectedDateStr, priorityFilter, todayStr]);

  // Alarms and critical items across all projects
  const criticalAlarms = useMemo(() => {
    return allGlobalEvents.filter(evt => {
      if (evt.completed) return false;
      const alarms = getTaskAlarms(evt, todayStr);
      return alarms.isCriticalDelay || alarms.isUpcomingDeadline || evt.priority === 'urgent' || evt.type === 'alarm';
    }).sort((a, b) => {
      const diffA = getDaysDiff(a.date || '', todayStr);
      const diffB = getDaysDiff(b.date || '', todayStr);
      return diffA - diffB;
    });
  }, [allGlobalEvents, todayStr]);

  // Color helper for projects
  const getProjectBadgeClass = (projectName: string) => {
    if (projectName.toLowerCase().includes('portillo') || projectName.toLowerCase().includes('a3')) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    if (projectName.toLowerCase().includes('andes')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (projectName.toLowerCase().includes('agustín') || projectName.toLowerCase().includes('agustin')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  };

  return (
    <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
      {/* 1. Header with title, stats and project filter tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#29384C]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#F8FAFC] tracking-tight flex items-center gap-2 flex-wrap">
                <span>Calendario Unificado de Obras</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {allGlobalEvents.length} notas y tareas
                </span>
                {criticalAlarms.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                    <Flame className="w-3 h-3 text-rose-400" />
                    {criticalAlarms.length} críticas
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                Agenda técnica consolidada, notas de inspección y alarmas de todas las obras activas
              </p>
            </div>
          </div>
        </div>

        {/* Project Selector Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedProjectId('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedProjectId === 'all'
                ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-[#17263B] text-[#94A3B8] border-[#29384C] hover:text-white'
            }`}
          >
            Todas las Obras ({projects.length})
          </button>

          {projects.map((p) => {
            const count = allGlobalEvents.filter(e => e.projectId === p.id).length;
            const isSelected = selectedProjectId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                    : 'bg-[#17263B] text-[#94A3B8] border-[#29384C] hover:text-white'
                }`}
              >
                <Building2 className="w-3 h-3 text-blue-400" />
                <span>{p.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Content Grid: Left Calendar / Right Alarms & Events List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Month Calendar (5 cols) */}
        <div className="lg:col-span-5 bg-[#17263B]/60 border border-[#29384C] rounded-2xl p-4 flex flex-col justify-between space-y-4">
          {/* Month Stepper */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-[#F8FAFC]">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleResetToToday}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#101D30] hover:bg-blue-600 text-[#94A3B8] hover:text-white border border-[#29384C] transition-colors"
              >
                Hoy
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg bg-[#101D30] hover:bg-[#20324c] text-[#94A3B8] hover:text-white border border-[#29384C] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg bg-[#101D30] hover:bg-[#20324c] text-[#94A3B8] hover:text-white border border-[#29384C] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w, idx) => (
              <span key={idx} className="text-[10px] font-black text-[#94A3B8] uppercase py-1">
                {w}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDate.get(dStr) || [];
              const isToday = dStr === todayStr;
              const isSelected = dStr === selectedDateStr;
              const hasCritical = dayEvents.some(e => {
                if (e.completed) return false;
                const a = getTaskAlarms(e, todayStr);
                return a.isCriticalDelay || e.priority === 'urgent' || e.type === 'alarm';
              });

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateStr(selectedDateStr === dStr ? '' : dStr)}
                  className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-between text-xs font-bold transition-all relative group ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)] ring-2 ring-blue-400'
                      : isToday
                      ? 'bg-[#101D30] text-blue-400 border border-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.3)]'
                      : dayEvents.length > 0
                      ? 'bg-[#101D30] text-[#F8FAFC] hover:bg-[#1f324d] border border-[#29384C]'
                      : 'text-slate-400 hover:text-white hover:bg-[#101D30]/60'
                  }`}
                >
                  <span className="text-[11px] leading-none">{dayNum}</span>

                  {/* Dots indicator container */}
                  <div className="flex items-center gap-0.5 justify-center mt-auto">
                    {hasCritical ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_#EF4444]" />
                    ) : dayEvents.length > 0 ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    ) : null}
                    {dayEvents.length > 1 && (
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Clear Filter if day selected */}
          {selectedDateStr && (
            <div className="flex items-center justify-between pt-2 border-t border-[#29384C] text-xs">
              <span className="text-[#94A3B8]">
                Viendo: <strong className="text-[#F8FAFC]">{selectedDateStr}</strong>
              </span>
              <button
                onClick={() => setSelectedDateStr('')}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-bold"
              >
                Ver todo el mes
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Alarms, Notes & Tasks across all projects (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Sub-tabs for critical alarms vs tasks */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setPriorityFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  priorityFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#17263B] text-[#94A3B8] hover:text-white'
                }`}
              >
                Todos ({allGlobalEvents.length})
              </button>
              <button
                onClick={() => setPriorityFilter('critical')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  priorityFilter === 'critical'
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#17263B] text-rose-400 hover:bg-rose-950/40'
                }`}
              >
                <Flame className="w-3 h-3" />
                Alarmas ({criticalAlarms.length})
              </button>
              <button
                onClick={() => setPriorityFilter('task')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  priorityFilter === 'task'
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#17263B] text-[#94A3B8] hover:text-white'
                }`}
              >
                Tareas de Obra
              </button>
            </div>

            {selectedProjectId !== 'all' && (
              <span className="text-xs text-[#94A3B8] font-bold">
                Filtrado por: <span className="text-blue-400">{projects.find(p => p.id === selectedProjectId)?.name}</span>
              </span>
            )}
          </div>

          {/* List of items */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#17263B]/40 border border-[#29384C] text-[#94A3B8] space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto opacity-40 text-blue-400" />
                <p className="text-xs font-bold text-slate-300">No hay eventos o notas para este filtro</p>
                <p className="text-[11px]">Prueba seleccionando otro día o cambiando de obra</p>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const alarms = getTaskAlarms(evt, todayStr);
                const isOverdue = alarms.isCriticalDelay;
                const isUpcoming = alarms.isUpcomingDeadline;
                const isDone = evt.completed;

                return (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isDone
                        ? 'bg-[#17263B]/30 border-[#29384C]/60 opacity-60'
                        : isOverdue
                        ? 'bg-rose-950/30 border-rose-800/60 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                        : isUpcoming
                        ? 'bg-amber-950/20 border-amber-800/50'
                        : 'bg-[#17263B]/80 border-[#29384C] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => onToggleCalendarEvent?.(evt.projectId, evt.id)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black'
                            : 'border-slate-500 hover:border-blue-400 text-transparent'
                        }`}
                        title={isDone ? 'Marcar pendiente' : 'Marcar completada'}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {/* Project Tag */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${getProjectBadgeClass(evt.projectName)}`}>
                            {evt.projectName}
                          </span>

                          {/* Priority badge */}
                          {evt.priority === 'urgent' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                              Urgente
                            </span>
                          )}

                          {isOverdue && !isDone && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse">
                              ¡Atraso +{alarms.daysOverdue}d!
                            </span>
                          )}

                          {isUpcoming && !isDone && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-slate-950 font-bold">
                              Quedan {alarms.daysUntilDeadline}d
                            </span>
                          )}
                        </div>

                        <h4 className={`text-xs font-bold leading-tight ${isDone ? 'line-through text-slate-400' : 'text-[#F8FAFC]'}`}>
                          {evt.title}
                        </h4>

                        {evt.description && (
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 line-clamp-2 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right action: Date and Link to PM */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#29384C]">
                      <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        {evt.date || 'Sin fecha'}
                      </span>

                      <button
                        onClick={() => {
                          onSelectProject(evt.projectId);
                          onOpenProjectManager?.(evt.projectId, 'tasks', evt.date, evt.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#101D30] hover:bg-blue-600 text-[#94A3B8] hover:text-white border border-[#29384C] text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title="Abrir en el Gestor de esta Obra"
                      >
                        <span>Ver Obra</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
