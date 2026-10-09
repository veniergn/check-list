import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Building2,
  User,
  Plus,
  Flame,
  Filter,
  ArrowRight,
  RotateCcw,
  Flag,
  Search,
  Check,
  CalendarDays,
  CalendarRange,
  ListTodo
} from 'lucide-react';
import { Project, ProjectCalendarEvent, PMTaskStatus, CalendarEventType } from '../types';
import { hexToRgba } from '../utils/calculations';

interface ExecutiveGlobalCalendarProps {
  projects: Project[];
  neonColor?: string;
  onSelectProject?: (projectId: string) => void;
  onSaveCalendarEvent?: (projectId: string, event: ProjectCalendarEvent) => void;
  onDeleteCalendarEvent?: (projectId: string, eventId: string) => void;
  onToggleCalendarEvent?: (projectId: string, eventId: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Color palette assigned per project for instant visual differentiation
const PROJECT_COLOR_PALETTES = [
  { border: 'border-cyan-400', bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400', badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' },
  { border: 'border-blue-400', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400', badge: 'bg-blue-500/20 text-blue-200 border-blue-400/40' },
  { border: 'border-emerald-400', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400', badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
  { border: 'border-purple-400', bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400', badge: 'bg-purple-500/20 text-purple-200 border-purple-400/40' },
  { border: 'border-amber-400', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400', badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40' }
];

export function ExecutiveGlobalCalendar({
  projects,
  neonColor = '#00f2fe',
  onSelectProject,
  onSaveCalendarEvent,
  onDeleteCalendarEvent,
  onToggleCalendarEvent,
  onShowToast
}: ExecutiveGlobalCalendarProps) {
  // Current real date
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  // View state: 'month' | 'week' | 'day'
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Currently focused date for navigation
  const [viewDate, setViewDate] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), 1));

  // Selected date for day activities sidebar/panel
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // Filters
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick task modal state
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState<string>(projects[0]?.id || '');
  const [quickDate, setQuickDate] = useState<string>(todayStr);
  const [quickType, setQuickType] = useState<CalendarEventType>('task');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [quickAssignee, setQuickAssignee] = useState('');

  // Editing existing task state
  const [editingEvent, setEditingEvent] = useState<{ projectId: string; event: ProjectCalendarEvent } | null>(null);

  // Map project ID to color palette index
  const projectColorMap = useMemo(() => {
    const map = new Map<string, typeof PROJECT_COLOR_PALETTES[0]>();
    projects.forEach((p, idx) => {
      map.set(p.id, PROJECT_COLOR_PALETTES[idx % PROJECT_COLOR_PALETTES.length]);
    });
    return map;
  }, [projects]);

  // Aggregate ALL events from ALL projects with unified metadata
  const allConsolidatedEvents = useMemo(() => {
    const list: Array<ProjectCalendarEvent & { projectName: string; isOverdue: boolean }> = [];

    projects.forEach(proj => {
      (proj.calendarEvents || []).forEach(evt => {
        const isOverdue = !evt.completed && evt.date < todayStr;
        list.push({
          ...evt,
          projectName: proj.name,
          isOverdue
        });
      });
    });

    return list;
  }, [projects, todayStr]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allConsolidatedEvents.filter(evt => {
      if (selectedProjectFilter !== 'all' && evt.projectId !== selectedProjectFilter) return false;
      if (priorityFilter !== 'all' && evt.priority !== priorityFilter) return false;
      if (statusFilter === 'completed' && !evt.completed) return false;
      if (statusFilter === 'pending' && (evt.completed || evt.status === 'in_progress')) return false;
      if (statusFilter === 'in_progress' && (evt.completed || evt.status !== 'in_progress')) return false;
      if (statusFilter === 'overdue' && !evt.isOverdue) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = evt.title.toLowerCase().includes(q);
        const matchProj = evt.projectName.toLowerCase().includes(q);
        const matchAssignee = (evt.assignedTo || '').toLowerCase().includes(q);
        if (!matchTitle && !matchProj && !matchAssignee) return false;
      }
      return true;
    });
  }, [allConsolidatedEvents, selectedProjectFilter, statusFilter, priorityFilter, searchQuery]);

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    filteredEvents.forEach(evt => {
      const arr = map.get(evt.date) || [];
      arr.push(evt);
      map.set(evt.date, arr);
    });
    return map;
  }, [filteredEvents]);

  // Calendar matrix calculation for Month view
  const monthCalendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as 0, Sunday as 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      events: typeof filteredEvents;
    }> = [];

    // Previous month padding
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        events: eventsByDate.get(dStr) || []
      });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        events: eventsByDate.get(dStr) || []
      });
    }

    // Next month padding to fill grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      const dStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNumber: nextDay,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        events: eventsByDate.get(dStr) || []
      });
    }

    return days;
  }, [viewDate, selectedDateStr, todayStr, eventsByDate]);

  // Week view calculation
  const weekDays = useMemo(() => {
    const selected = new Date(selectedDateStr + 'T12:00:00');
    let dayOfWeek = selected.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;

    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - dayOfWeek);

    const days: Array<{
      dateStr: string;
      dayName: string;
      dayNumber: number;
      isToday: boolean;
      isSelected: boolean;
      events: typeof filteredEvents;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayName: WEEKDAY_NAMES[i],
        dayNumber: d.getDate(),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
        events: eventsByDate.get(dStr) || []
      });
    }
    return days;
  }, [selectedDateStr, todayStr, eventsByDate]);

  // Events of the selected day
  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDateStr) || [];
  }, [selectedDateStr, eventsByDate]);

  // Overall counts for summary
  const totalTasksCount = allConsolidatedEvents.length;
  const overdueCount = allConsolidatedEvents.filter(e => e.isOverdue).length;
  const pendingCount = allConsolidatedEvents.filter(e => !e.completed).length;
  const completedCount = allConsolidatedEvents.filter(e => e.completed).length;

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDateStr(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDateStr(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() + 7);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDateStr(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setSelectedDateStr(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleGoToToday = () => {
    setSelectedDateStr(todayStr);
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Quick Create Task
  const handleSaveQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      onShowToast?.('Ingresa un título para la tarea', 'AlertCircle');
      return;
    }

    const targetPid = quickProjectId || projects[0]?.id;
    if (!targetPid) {
      onShowToast?.('Selecciona una obra primero', 'AlertCircle');
      return;
    }

    const newEvt: ProjectCalendarEvent = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: targetPid,
      title: quickTitle.trim(),
      date: quickDate || selectedDateStr,
      type: quickType,
      priority: quickPriority,
      status: 'pending',
      completed: false,
      assignedTo: quickAssignee.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveCalendarEvent?.(targetPid, newEvt);
    setQuickTitle('');
    setQuickAssignee('');
    setIsQuickCreateOpen(false);
    onShowToast?.('Tarea programada con éxito en Supabase', 'Check');
  };

  // Format readable title of active month
  const formattedMonthTitle = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  // Formatted date string for side panel header
  const formattedSelectedDateHeader = useMemo(() => {
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  return (
    <section className="bg-[#101D30] border border-[#29384C] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 select-none relative overflow-hidden">
      {/* Decorative ambient aura */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER: Title + Statistics Pills + View Mode Toggles + Navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#29384C]">
        {/* Left: Section Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
            <CalendarIcon className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#F8FAFC] tracking-tight">
                Calendario & Agenda General de Obras
              </h2>
              {overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                  <Flame className="w-3 h-3 text-rose-400" />
                  {overdueCount} vencidas
                </span>
              )}
            </div>
            <p className="text-xs text-[#94A3B8]">
              Centraliza todas las actividades, alarmas y fechas límite de todas las obras en ejecución
            </p>
          </div>
        </div>

        {/* Right: View Mode Toggle ('month' | 'week' | 'day') + Navigation + Nueva Tarea */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Buttons */}
          <div className="bg-[#081321] p-1 rounded-xl border border-[#29384C] flex items-center gap-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Día
            </button>
          </div>

          {/* Month/Week Navigation & "Hoy" */}
          <div className="flex items-center gap-1 bg-[#081321] px-2 py-1 rounded-xl border border-[#29384C]">
            <button
              onClick={handlePrev}
              className="p-1 hover:text-blue-400 text-[#94A3B8] transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToToday}
              className="px-2 py-0.5 rounded text-[11px] font-bold text-[#F8FAFC] hover:bg-[#17263B] transition-colors"
              title="Volver al día actual"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-1 hover:text-blue-400 text-[#94A3B8] transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-[#F8FAFC] px-2 capitalize">
              {formattedMonthTitle}
            </span>
          </div>

          {/* Nueva Tarea Direct Action */}
          <button
            onClick={() => {
              setQuickDate(selectedDateStr);
              setIsQuickCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Programar Tarea</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR: Obra pills + Estado + Prioridad + Búsqueda */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[#081321]/70 p-2.5 rounded-2xl border border-[#29384C]/80">
        {/* Project Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-black uppercase text-[#94A3B8] px-1 flex items-center gap-1 whitespace-nowrap">
            <Building2 className="w-3 h-3 text-blue-400" />
            Obra:
          </span>
          <button
            onClick={() => setSelectedProjectFilter('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedProjectFilter === 'all'
                ? 'bg-blue-600/30 text-cyan-300 border border-cyan-400/50 shadow-sm'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#17263B]'
            }`}
          >
            Todas ({projects.length})
          </button>
          {projects.map((p, idx) => {
            const isSelected = selectedProjectFilter === p.id;
            const pColor = PROJECT_COLOR_PALETTES[idx % PROJECT_COLOR_PALETTES.length];
            const pEvtsCount = (p.calendarEvents || []).length;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectFilter(p.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? `${pColor.bg} ${pColor.text} border ${pColor.border} shadow-sm`
                    : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#17263B]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${pColor.dot}`} />
                <span>{p.name}</span>
                <span className="text-[10px] opacity-75">({pEvtsCount})</span>
              </button>
            );
          })}
        </div>

        {/* Status & Priority Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                statusFilter === 'all' ? 'bg-[#17263B] text-white' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                statusFilter === 'overdue' ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Vencidas
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
                statusFilter === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Completadas
            </button>
          </div>
        </div>
      </div>

      {/* MAIN BODY: 2-Column Responsive Layout (Calendar Grid 8 Cols + Day Agenda 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: The Interactive Calendar View (Month / Week / Day) */}
        <div className="lg:col-span-8 bg-[#081321] border border-[#29384C] rounded-2xl p-3 sm:p-4 overflow-hidden">
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div>
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 gap-1 pb-2 border-b border-[#29384C]/60 text-center">
                {WEEKDAY_NAMES.map((d, i) => (
                  <div key={i} className="text-[11px] font-black uppercase text-[#94A3B8] tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 pt-2">
                {monthCalendarDays.map((dayItem, idx) => {
                  const evts = dayItem.events;
                  const hasOverdue = evts.some(e => e.isOverdue);
                  const hasAlarms = evts.some(e => e.type === 'alarm' || e.priority === 'urgent');

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDateStr(dayItem.dateStr)}
                      className={`min-h-[72px] sm:min-h-[88px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                        dayItem.isSelected
                          ? 'bg-[#17263B] border-cyan-400 ring-2 ring-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : dayItem.isToday
                          ? 'bg-[#17263B]/80 border-blue-500/80'
                          : dayItem.isCurrentMonth
                          ? 'bg-[#101D30]/60 border-[#29384C]/60 hover:border-slate-500 hover:bg-[#101D30]'
                          : 'bg-[#081321]/40 border-transparent opacity-40 hover:opacity-75'
                      }`}
                    >
                      {/* Top Day Number & Badges */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                            dayItem.isToday
                              ? 'bg-blue-600 text-white font-black shadow-sm'
                              : dayItem.isSelected
                              ? 'text-cyan-300'
                              : 'text-slate-300'
                          }`}
                        >
                          {dayItem.dayNumber}
                        </span>

                        {/* Indicators for tasks / alarms */}
                        <div className="flex items-center gap-1">
                          {hasOverdue && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Tareas vencidas" />
                          )}
                          {hasAlarms && (
                            <Flame className="w-3 h-3 text-rose-400" />
                          )}
                          {evts.length > 0 && (
                            <span className="text-[9px] font-mono font-bold text-slate-400 px-1 rounded bg-[#081321]">
                              {evts.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Event chips preview (up to 2 visible on desktop) */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {evts.slice(0, 2).map(evt => {
                          const pColor = projectColorMap.get(evt.projectId) || PROJECT_COLOR_PALETTES[0];
                          return (
                            <div
                              key={evt.id}
                              className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded flex items-center gap-1 border ${
                                evt.completed
                                  ? 'bg-slate-800/80 text-slate-400 border-slate-700 line-through'
                                  : evt.isOverdue
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                                  : `${pColor.bg} ${pColor.text} ${pColor.border}`
                              }`}
                              title={`${evt.projectName}: ${evt.title}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${pColor.dot} shrink-0`} />
                              <span className="truncate">{evt.title}</span>
                            </div>
                          );
                        })}
                        {evts.length > 2 && (
                          <div className="text-[9px] text-[#94A3B8] font-bold text-right px-1">
                            +{evts.length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((wd, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedDateStr(wd.dateStr)}
                    className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                      wd.isSelected
                        ? 'bg-[#17263B] border-cyan-400 ring-2 ring-cyan-400/30'
                        : wd.isToday
                        ? 'bg-[#101D30] border-blue-500'
                        : 'bg-[#101D30]/60 border-[#29384C] hover:bg-[#17263B]'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-[#94A3B8] uppercase">{wd.dayName}</div>
                    <div className="text-base font-black text-white">{wd.dayNumber}</div>
                    <div className="text-[10px] font-mono mt-1 text-cyan-400">
                      {wd.events.length} act.
                    </div>
                  </div>
                ))}
              </div>

              {/* Weekly events board */}
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 pt-2">
                {weekDays.map((wd, i) => (
                  <div key={i} className="min-h-[220px] bg-[#101D30]/40 rounded-xl p-2 border border-[#29384C]/50 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400 border-b border-[#29384C] pb-1">
                      {wd.dayName} {wd.dayNumber}
                    </div>
                    {wd.events.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic pt-2">Sin tareas</p>
                    ) : (
                      wd.events.map(evt => {
                        const pColor = projectColorMap.get(evt.projectId) || PROJECT_COLOR_PALETTES[0];
                        return (
                          <div
                            key={evt.id}
                            className={`p-1.5 rounded-lg border text-[11px] space-y-1 ${
                              evt.completed
                                ? 'bg-slate-800/60 text-slate-400 border-slate-700 line-through'
                                : `${pColor.bg} ${pColor.text} ${pColor.border}`
                            }`}
                          >
                            <div className="font-bold truncate">{evt.title}</div>
                            <div className="text-[9px] opacity-80 truncate">{evt.projectName}</div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#29384C]">
                <div>
                  <h3 className="text-base font-black text-white capitalize">
                    {formattedSelectedDateHeader}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    {selectedDayEvents.length} actividades programadas para este día
                  </p>
                </div>
                <button
                  onClick={() => {
                    setQuickDate(selectedDateStr);
                    setIsQuickCreateOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Tarea</span>
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="py-12 text-center text-[#94A3B8] space-y-2">
                  <CheckSquare className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs">No hay actividades programadas para esta fecha.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(evt => {
                    const pColor = projectColorMap.get(evt.projectId) || PROJECT_COLOR_PALETTES[0];
                    return (
                      <div
                        key={evt.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                          evt.completed
                            ? 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                            : evt.isOverdue
                            ? 'bg-rose-950/30 border-rose-800/60 text-[#F8FAFC]'
                            : 'bg-[#101D30] border-[#29384C] text-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            onClick={() => onToggleCalendarEvent?.(evt.projectId, evt.id)}
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                              evt.completed
                                ? 'bg-emerald-500 border-emerald-400 text-white'
                                : 'border-[#29384C] hover:border-blue-400 bg-[#081321]'
                            }`}
                          >
                            {evt.completed && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${pColor.badge}`}>
                                {evt.projectName}
                              </span>
                              {evt.isOverdue && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Vencida
                                </span>
                              )}
                            </div>
                            <h4 className={`text-sm font-bold mt-1 leading-snug ${evt.completed ? 'line-through text-slate-400' : ''}`}>
                              {evt.title}
                            </h4>
                            {evt.description && (
                              <p className="text-xs text-[#94A3B8] mt-0.5 truncate">{evt.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#94A3B8]">
                              {evt.time && <span>🕒 {evt.time} hs</span>}
                              {evt.assignedTo && <span>👤 {evt.assignedTo}</span>}
                            </div>
                          </div>
                        </div>

                        {onSelectProject && (
                          <button
                            onClick={() => onSelectProject(evt.projectId)}
                            className="p-2 rounded-xl bg-[#081321] hover:bg-[#17263B] text-blue-400 border border-[#29384C] transition-colors shrink-0"
                            title="Ir a la obra"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Day Activities Panel (Sticky on Desktop) */}
        <div className="lg:col-span-4 bg-[#081321] border border-[#29384C] rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">
                AGENDA DEL DÍA
              </span>
              <h3 className="text-sm font-black text-[#F8FAFC] capitalize leading-snug">
                {formattedSelectedDateHeader}
              </h3>
            </div>
            <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
              {selectedDayEvents.length} tareas
            </span>
          </div>

          {/* Quick Task input for selected date */}
          <form onSubmit={handleSaveQuickTask} className="space-y-2">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Nueva tarea para esta fecha..."
              className="w-full bg-[#101D30] border border-[#29384C] focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-slate-500 outline-none transition-colors"
            />
            <div className="flex items-center gap-2">
              <select
                value={quickProjectId}
                onChange={(e) => setQuickProjectId(e.target.value)}
                className="flex-1 bg-[#101D30] border border-[#29384C] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </form>

          {/* List of Tasks for this Day */}
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto no-scrollbar pt-1">
            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No hay actividades registradas en esta fecha.
              </div>
            ) : (
              selectedDayEvents.map(evt => {
                const pColor = projectColorMap.get(evt.projectId) || PROJECT_COLOR_PALETTES[0];
                return (
                  <div
                    key={evt.id}
                    className={`p-3 rounded-xl border transition-all space-y-2 ${
                      evt.completed
                        ? 'bg-[#101D30]/40 border-[#29384C]/50 opacity-75'
                        : evt.isOverdue
                        ? 'bg-rose-950/25 border-rose-800/60'
                        : 'bg-[#101D30] border-[#29384C]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${pColor.badge}`}>
                        {evt.projectName}
                      </span>
                      {evt.isOverdue && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          Vencida
                        </span>
                      )}
                    </div>

                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => onToggleCalendarEvent?.(evt.projectId, evt.id)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          evt.completed
                            ? 'bg-emerald-500 border-emerald-400 text-white'
                            : 'border-[#29384C] hover:border-blue-400 bg-[#081321]'
                        }`}
                        title="Marcar como completada"
                      >
                        {evt.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold leading-snug ${evt.completed ? 'line-through text-slate-400' : 'text-[#F8FAFC]'}`}>
                          {evt.title}
                        </p>
                        {evt.description && (
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">{evt.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#94A3B8]">
                          {evt.assignedTo && <span>👤 {evt.assignedTo}</span>}
                          {evt.time && <span>🕒 {evt.time} hs</span>}
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#29384C]/60 text-[11px]">
                      {onSelectProject && (
                        <button
                          onClick={() => onSelectProject(evt.projectId)}
                          className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                        >
                          <span>Ver obra</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteCalendarEvent && (
                        <button
                          onClick={() => onDeleteCalendarEvent(evt.projectId, evt.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors text-[10px]"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
