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
  ListTodo,
  FileText,
  Tag,
  Pencil,
  Trash2,
  X,
  Bell
} from 'lucide-react';
import { Project, ProjectCalendarEvent, PMTaskStatus, CalendarEventType } from '../types';
import { hexToRgba } from '../utils/calculations';
import { getCalendarTypeStyle, normalizeCalendarType } from '../utils/calendarTypes';

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
  const [typeFilter, setTypeFilter] = useState<string>('all'); // 'all' | 'note' | 'task' | 'meeting' | 'alarm'
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick form in right panel state (defaults strictly to todayStr initially, then updates on click)
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState<string>(projects[0]?.id || '');
  const [quickDate, setQuickDate] = useState<string>(todayStr);
  const [quickTime, setQuickTime] = useState<string>('');
  const [quickType, setQuickType] = useState<CalendarEventType>('note');
  const [quickPriority, setQuickPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Full Modal for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalProjectId, setModalProjectId] = useState<string>(projects[0]?.id || '');
  const [modalDate, setModalDate] = useState<string>(todayStr);
  const [modalTime, setModalTime] = useState<string>('');
  const [modalType, setModalType] = useState<CalendarEventType>('note');
  const [modalPriority, setModalPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [modalAssignee, setModalAssignee] = useState('');
  const [modalCompleted, setModalCompleted] = useState(false);

  // Handler to select date anywhere in calendar: updates both selectedDateStr AND quickDate
  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setQuickDate(dateStr);
  };

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
      if (typeFilter !== 'all') {
        const normEvtType = normalizeCalendarType(evt.type);
        if (normEvtType !== typeFilter) return false;
      }
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
  }, [allConsolidatedEvents, selectedProjectFilter, statusFilter, priorityFilter, typeFilter, searchQuery]);

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
    const evts = eventsByDate.get(selectedDateStr) || [];
    // Sort by time if available
    return [...evts].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [selectedDateStr, eventsByDate]);

  // Overall counts for summary
  const overdueCount = allConsolidatedEvents.filter(e => e.isOverdue).length;

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() - 7);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      handleSelectDate(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      handleSelectDate(newDStr);
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
      handleSelectDate(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const newDStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      handleSelectDate(newDStr);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const handleGoToToday = () => {
    handleSelectDate(todayStr);
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Quick Create Task: strictly saves to the chosen date!
  const handleSaveQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = quickTitle.trim();
    if (!cleanTitle) {
      const typeStyle = getCalendarTypeStyle(quickType);
      onShowToast?.(`Por favor ingresa un título para la ${typeStyle.label.toLowerCase()}`, 'AlertCircle');
      return;
    }

    const targetPid = quickProjectId || projects[0]?.id;
    if (!targetPid) {
      onShowToast?.('Selecciona una obra primero', 'AlertCircle');
      return;
    }

    // STRICT DATE FIX: Use quickDate if set, otherwise selectedDateStr
    const targetDate = quickDate || selectedDateStr;

    const newEvt: ProjectCalendarEvent = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: targetPid,
      title: cleanTitle,
      date: targetDate, // Saved on chosen date!
      time: quickTime.trim() || undefined,
      type: quickType,
      priority: quickPriority,
      status: 'pending',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveCalendarEvent?.(targetPid, newEvt);
    setQuickTitle('');
    setQuickTime('');
    // Keep quickDate matching targetDate
    setSelectedDateStr(targetDate);
    setQuickDate(targetDate);

    const typeStyle = getCalendarTypeStyle(quickType);
    onShowToast?.(`¡${typeStyle.label} guardada para el ${targetDate}!`, 'Check');
  };

  // Modal Open Handlers
  const handleOpenCreateModal = (presetDate?: string) => {
    const targetDate = presetDate || quickDate || selectedDateStr;
    setEditingEventId(null);
    setModalTitle('');
    setModalDescription('');
    setModalProjectId(quickProjectId || projects[0]?.id || '');
    setModalDate(targetDate);
    setModalTime(quickTime || '');
    setModalType(quickType || 'note');
    setModalPriority('medium');
    setModalAssignee('');
    setModalCompleted(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (evt: ProjectCalendarEvent) => {
    setEditingEventId(evt.id);
    setModalTitle(evt.title);
    setModalDescription(evt.description || '');
    setModalProjectId(evt.projectId);
    setModalDate(evt.date);
    setModalTime(evt.time || '');
    setModalType(normalizeCalendarType(evt.type));
    setModalPriority(evt.priority || 'medium');
    setModalAssignee(evt.assignedTo || '');
    setModalCompleted(!!evt.completed);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = modalTitle.trim();
    if (!cleanTitle) {
      const typeStyle = getCalendarTypeStyle(modalType);
      onShowToast?.(`Por favor ingresa un título para la ${typeStyle.label.toLowerCase()}`, 'AlertCircle');
      return;
    }

    const targetPid = modalProjectId || projects[0]?.id;
    if (!targetPid) {
      onShowToast?.('Selecciona una obra primero', 'AlertCircle');
      return;
    }

    const targetDate = modalDate || selectedDateStr;

    const eventPayload: ProjectCalendarEvent = {
      id: editingEventId || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: targetPid,
      title: cleanTitle,
      description: modalDescription.trim() || undefined,
      date: targetDate, // Modified date strictly respected!
      time: modalTime.trim() || undefined,
      type: modalType,
      priority: modalPriority,
      status: modalCompleted ? 'completed' : 'pending',
      completed: modalCompleted,
      assignedTo: modalAssignee.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveCalendarEvent?.(targetPid, eventPayload);
    setIsModalOpen(false);
    setSelectedDateStr(targetDate);
    setQuickDate(targetDate);

    const typeStyle = getCalendarTypeStyle(modalType);
    onShowToast?.(
      editingEventId
        ? `¡${typeStyle.label} actualizada con éxito!`
        : `¡${typeStyle.label} guardada para el ${targetDate}!`,
      'Check'
    );
  };

  const handleDeleteFromModal = () => {
    if (!editingEventId) return;
    if (confirm('¿Eliminar esta actividad del calendario?')) {
      onDeleteCalendarEvent?.(modalProjectId, editingEventId);
      setIsModalOpen(false);
      onShowToast?.('Actividad eliminada del calendario', 'Trash2');
    }
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

      {/* TOP HEADER: Title + Statistics Pills + View Mode Toggles + Navigation + Botón Crear */}
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
              Notas, tareas, reuniones y alarmas con control de fecha, hora y obra
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

          {/* Nueva Actividad Modal Trigger */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.35)] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Programar Actividad</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR: Obra pills + Tipo de Evento (Nota, Tarea, Reunión, Alarma) + Estado */}
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

        {/* Filters by Type (Nota, Tarea, Reunión, Alarma) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] font-black uppercase text-[#94A3B8] px-1 flex items-center gap-1 whitespace-nowrap">
            <Filter className="w-3 h-3 text-cyan-400" />
            Tipo:
          </span>
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] ${
              typeFilter === 'all' ? 'bg-[#17263B] text-white border border-slate-600' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setTypeFilter('note')}
            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${
              typeFilter === 'note' ? 'bg-amber-500/25 text-amber-300 border-amber-400' : 'text-amber-400/70 border-transparent hover:text-amber-300'
            }`}
          >
            🟨 Notas
          </button>
          <button
            onClick={() => setTypeFilter('task')}
            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${
              typeFilter === 'task' ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400' : 'text-emerald-400/70 border-transparent hover:text-emerald-300'
            }`}
          >
            🟩 Tareas
          </button>
          <button
            onClick={() => setTypeFilter('meeting')}
            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${
              typeFilter === 'meeting' ? 'bg-blue-600/30 text-blue-300 border-blue-400' : 'text-blue-400/70 border-transparent hover:text-blue-300'
            }`}
          >
            🟦 Reuniones
          </button>
          <button
            onClick={() => setTypeFilter('alarm')}
            className={`px-2 py-0.5 rounded-lg font-bold text-[11px] border ${
              typeFilter === 'alarm' ? 'bg-rose-500/25 text-rose-300 border-rose-400' : 'text-rose-400/70 border-transparent hover:text-rose-300'
            }`}
          >
            🟥 Alarmas
          </button>
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
                  const hasAlarms = evts.some(e => normalizeCalendarType(e.type) === 'alarm' || e.priority === 'urgent');

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectDate(dayItem.dateStr)}
                      onDoubleClick={() => handleOpenCreateModal(dayItem.dateStr)}
                      className={`min-h-[78px] sm:min-h-[92px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
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
                              ? 'text-cyan-300 font-black'
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

                      {/* Event chips preview with Dedicated Type Colors (Nota=Amarillo, Tarea=Verde, Reunión=Azul, Alarma=Rojo) */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {evts.slice(0, 2).map(evt => {
                          const typeStyle = getCalendarTypeStyle(evt.type);
                          return (
                            <div
                              key={evt.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(evt);
                              }}
                              className={`text-[9.5px] font-bold truncate px-1.5 py-0.5 rounded flex items-center justify-between gap-1 border transition-all hover:scale-[1.02] cursor-pointer ${
                                evt.completed
                                  ? 'bg-slate-800/80 text-slate-400 border-slate-700 line-through opacity-60'
                                  : `${typeStyle.bgChip}`
                              }`}
                              title={`${typeStyle.label} (${evt.projectName}): ${evt.title}${evt.time ? ` · ${evt.time} hs` : ''}`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dotClass} shrink-0`} />
                                <span className="truncate">{evt.title}</span>
                              </div>
                              {evt.time && (
                                <span className="text-[8px] font-mono opacity-80 shrink-0">
                                  {evt.time}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {evts.length > 2 && (
                          <div className="text-[9px] text-cyan-400 font-bold text-right px-1">
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
                    onClick={() => handleSelectDate(wd.dateStr)}
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
                    <div className="text-[11px] font-bold text-slate-400 border-b border-[#29384C] pb-1 flex items-center justify-between">
                      <span>{wd.dayName} {wd.dayNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenCreateModal(wd.dateStr)}
                        className="text-cyan-400 hover:text-cyan-300 font-bold"
                        title="Agregar en este día"
                      >
                        +
                      </button>
                    </div>
                    {wd.events.length === 0 ? (
                      <p className="text-[10px] text-slate-500 italic pt-2 text-center">Sin tareas</p>
                    ) : (
                      wd.events.map(evt => {
                        const typeStyle = getCalendarTypeStyle(evt.type);
                        return (
                          <div
                            key={evt.id}
                            onClick={() => handleOpenEditModal(evt)}
                            className={`p-1.5 rounded-lg border text-[11px] space-y-1 cursor-pointer hover:scale-[1.02] transition-all ${
                              evt.completed
                                ? 'bg-slate-800/60 text-slate-400 border-slate-700 line-through'
                                : `${typeStyle.bgChip}`
                            }`}
                          >
                            <div className="font-bold truncate flex items-center justify-between">
                              <span>{evt.title}</span>
                              {evt.time && <span className="text-[9px] font-mono">{evt.time}</span>}
                            </div>
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
                  onClick={() => handleOpenCreateModal(selectedDateStr)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Actividad</span>
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="py-12 text-center text-[#94A3B8] space-y-2">
                  <CheckSquare className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs">No hay actividades programadas para esta fecha.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
                  {selectedDayEvents.map(evt => {
                    const typeStyle = getCalendarTypeStyle(evt.type);
                    const pColor = projectColorMap.get(evt.projectId) || PROJECT_COLOR_PALETTES[0];
                    return (
                      <div
                        key={evt.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          evt.completed
                            ? 'bg-[#101D30]/40 border-[#29384C]/50 opacity-75'
                            : evt.isOverdue
                            ? 'bg-rose-950/25 border-rose-800/60'
                            : 'bg-[#101D30] border-[#29384C]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${typeStyle.badgeClass} flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dotClass}`} />
                              <span>{typeStyle.label}</span>
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${pColor.badge}`}>
                              {evt.projectName}
                            </span>
                          </div>

                          {evt.time && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-400" />
                              <span>{evt.time} hs</span>
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
                          >
                            {evt.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold ${evt.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                              {evt.title}
                            </p>
                            {evt.description && (
                              <p className="text-[11px] text-[#94A3B8] mt-0.5">{evt.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#29384C]/60 text-xs">
                          <button
                            onClick={() => handleOpenEditModal(evt)}
                            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[11px]"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Editar</span>
                          </button>
                          {onDeleteCalendarEvent && (
                            <button
                              onClick={() => onDeleteCalendarEvent(evt.projectId, evt.id)}
                              className="text-slate-500 hover:text-rose-400 text-[11px]"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
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
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'actividad' : 'actividades'}
            </span>
          </div>

          {/* Quick Task input with Nota (Amarillo), Tarea (Verde), Reunión (Azul), Alarma (Rojo), Fecha, Hora y Obra */}
          <form onSubmit={handleSaveQuickTask} className="space-y-2.5 p-3 rounded-2xl bg-[#101D30]/90 border border-[#29384C]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Agregar en este día</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {quickDate}
              </span>
            </div>

            {/* 4 Type Selector Buttons with Dedicated Colors */}
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setQuickType('note')}
                className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all text-center ${
                  quickType === 'note'
                    ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                🟨 Nota
              </button>
              <button
                type="button"
                onClick={() => setQuickType('task')}
                className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all text-center ${
                  quickType === 'task'
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                }`}
              >
                🟩 Tarea
              </button>
              <button
                type="button"
                onClick={() => setQuickType('meeting')}
                className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all text-center ${
                  quickType === 'meeting'
                    ? 'bg-blue-600 text-white font-black border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                    : 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                }`}
              >
                🟦 Reunión
              </button>
              <button
                type="button"
                onClick={() => setQuickType('alarm')}
                className={`py-1.5 px-1 rounded-xl text-[10.5px] font-bold border transition-all text-center ${
                  quickType === 'alarm'
                    ? 'bg-rose-600 text-white font-black border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                }`}
              >
                🟥 Alarma
              </button>
            </div>

            {/* Title Input */}
            <div>
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder={
                  quickType === 'note' ? 'Escribe la nota...' :
                  quickType === 'task' ? 'Nombre de la tarea...' :
                  quickType === 'meeting' ? 'Motivo de reunión / con quién...' :
                  'Motivo de alarma o vencimiento...'
                }
                className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-slate-500 outline-none transition-colors font-medium"
              />
            </div>

            {/* Date & Time Row - FREELY MODIFY DATE & HOUR */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9.5px] font-bold text-slate-400 block mb-1">
                  Fecha:
                </label>
                <input
                  type="date"
                  value={quickDate}
                  onChange={(e) => {
                    setQuickDate(e.target.value);
                    setSelectedDateStr(e.target.value);
                  }}
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none font-bold"
                />
              </div>

              <div>
                <label className="text-[9.5px] font-bold text-slate-400 block mb-1">
                  Hora (opcional):
                </label>
                <input
                  type="time"
                  value={quickTime}
                  onChange={(e) => setQuickTime(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none font-bold"
                />
              </div>
            </div>

            {/* Obra selector & Submit button */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <select
                  value={quickProjectId}
                  onChange={(e) => setQuickProjectId(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none font-bold"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>🏗️ {p.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)] active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Guardar</span>
              </button>
            </div>
          </form>

          {/* List of Tasks for this Day */}
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto no-scrollbar pt-1">
            {selectedDayEvents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs italic">
                No hay actividades registradas en esta fecha.
              </div>
            ) : (
              selectedDayEvents.map(evt => {
                const typeStyle = getCalendarTypeStyle(evt.type);
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Type badge with designated color */}
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${typeStyle.badgeClass} flex items-center gap-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dotClass}`} />
                          <span>{typeStyle.label}</span>
                        </span>

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${pColor.badge}`}>
                          {evt.projectName}
                        </span>
                      </div>

                      {evt.time && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{evt.time} hs</span>
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
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[#29384C]/60 text-[11px]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(evt)}
                          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[10px]"
                          title="Modificar fecha, hora, tipo u obra"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Modificar</span>
                        </button>
                        {onSelectProject && (
                          <button
                            onClick={() => onSelectProject(evt.projectId)}
                            className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 text-[10px]"
                          >
                            <span>Ir a Obra</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>

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

      {/* FULL MODAL DIALOG: PROGRAMAR O MODIFICAR ACTIVIDAD / ALARMA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-cyan-300">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingEventId ? 'Modificar Actividad / Alarma' : 'Programar Actividad / Alarma'}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    Personaliza título, fecha, hora, obra y categoría
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#081321] text-slate-400 hover:text-white flex items-center justify-center border border-[#29384C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* 1. Selector de Tipo: Nota, Tarea, Reunión, Alarma con sus colores */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1.5">
                  Tipo de Actividad / Título:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalType('note')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      modalType === 'note'
                        ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-400/40'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                  >
                    <span className="text-sm">🟨</span>
                    <span>Nota</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType('task')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      modalType === 'task'
                        ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/40'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    <span className="text-sm">🟩</span>
                    <span>Tarea</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType('meeting')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      modalType === 'meeting'
                        ? 'bg-blue-600 text-white font-black border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)] ring-2 ring-blue-400/40'
                        : 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20'
                    }`}
                  >
                    <span className="text-sm">🟦</span>
                    <span>Reunión</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalType('alarm')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      modalType === 'alarm'
                        ? 'bg-rose-600 text-white font-black border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)] ring-2 ring-rose-400/40'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                  >
                    <span className="text-sm">🟥</span>
                    <span>Alarma</span>
                  </button>
                </div>
              </div>

              {/* 2. Título */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                  Título <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder={
                    modalType === 'note' ? 'Ej: Nota sobre verificación de cañerías' :
                    modalType === 'task' ? 'Ej: Hormigonado de losa 3er piso' :
                    modalType === 'meeting' ? 'Ej: Reunión con electricista y director' :
                    'Ej: Alarma: Vencimiento de seguro ART / Acopio materiales'
                  }
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl px-3.5 py-2.5 text-xs text-white font-bold outline-none"
                />
              </div>

              {/* 3. Selección de Obra */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                  Obra Destino <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={modalProjectId}
                  onChange={(e) => setModalProjectId(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl px-3.5 py-2.5 text-xs text-white font-bold outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>🏗️ {p.name} ({p.location || 'Mendoza'})</option>
                  ))}
                </select>
              </div>

              {/* 4. Fecha y Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                    Fecha <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl px-3 py-2 text-xs text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                    Hora (opcional)
                  </label>
                  <input
                    type="time"
                    value={modalTime}
                    onChange={(e) => setModalTime(e.target.value)}
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl px-3 py-2 text-xs text-white font-bold outline-none"
                  />
                </div>
              </div>

              {/* 5. Observaciones / Detalles */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                  Descripción o Detalles (opcional)
                </label>
                <textarea
                  rows={2}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  placeholder="Detalles adicionales, recordatorio o instrucciones..."
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl p-3 text-xs text-slate-200 outline-none resize-none"
                />
              </div>

              {/* 6. Responsable y Prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                    Responsable (opcional)
                  </label>
                  <input
                    type="text"
                    value={modalAssignee}
                    onChange={(e) => setModalAssignee(e.target.value)}
                    placeholder="Ej: Ing. Pérez / Contratista"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as any)}
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-2xl px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[#29384C] gap-2">
                <div>
                  {editingEventId && (
                    <button
                      type="button"
                      onClick={handleDeleteFromModal}
                      className="px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#081321] hover:bg-[#17263B] text-slate-300 font-bold text-xs border border-[#29384C]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                  >
                    {editingEventId ? 'Actualizar' : 'Guardar en Calendario'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
