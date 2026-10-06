import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckSquare,
  Square,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Save,
  Check,
  Building2,
  Filter,
  Sparkles,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Project, ProjectCalendarEvent, CalendarEventType } from '../types';
import { hexToRgba } from '../utils/calculations';

interface ProjectCalendarModalProps {
  isOpen: boolean;
  project: Project | null;
  initialDate?: string;
  selectedEventId?: string;
  neonColor?: string;
  onClose: () => void;
  onSaveEvent: (projectId: string, event: ProjectCalendarEvent) => void;
  onDeleteEvent: (projectId: string, eventId: string) => void;
  onToggleEventCompleted: (projectId: string, eventId: string) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function ProjectCalendarModal({
  isOpen,
  project,
  initialDate,
  selectedEventId,
  neonColor = '#00f2fe',
  onClose,
  onSaveEvent,
  onDeleteEvent,
  onToggleEventCompleted,
  onShowToast
}: ProjectCalendarModalProps) {
  // Current active date
  const [filterDate, setFilterDate] = useState<string>(() => {
    if (initialDate) return initialDate;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  // Filter view mode: 'day' (only items of filterDate) or 'all' (all project items)
  const [viewScope, setViewScope] = useState<'day' | 'all'>('day');
  const [typeFilter, setTypeFilter] = useState<'all' | CalendarEventType>('all');

  // Form State for Adding / Editing
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(filterDate);
  const [time, setTime] = useState('');
  const [type, setType] = useState<CalendarEventType>('task');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  // Track open state transitions to only initialize when modal transitions to open
  const prevIsOpenRef = useRef(false);
  const prevSelectedEventIdRef = useRef<string | undefined>(undefined);

  // Sync state when modal opens or selected event changes
  useEffect(() => {
    if (isOpen) {
      const isJustOpened = !prevIsOpenRef.current;
      const isEventSelectionChanged = selectedEventId !== prevSelectedEventIdRef.current;

      if (isJustOpened || isEventSelectionChanged) {
        prevSelectedEventIdRef.current = selectedEventId;

        const activeDate = initialDate || (() => {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        })();

        if (isJustOpened) {
          setFilterDate(activeDate);
          setDate(activeDate);
          setViewScope('day');
          setTypeFilter('all');
        }

        if (selectedEventId && project) {
          const evt = (project.calendarEvents || []).find(e => e.id === selectedEventId);
          if (evt) {
            setEditingEventId(evt.id);
            setTitle(evt.title);
            setDescription(evt.description || '');
            setDate(evt.date);
            setTime(evt.time || '');
            setType(evt.type);
            setPriority(evt.priority || 'medium');
            setFilterDate(evt.date);
            return;
          }
        }

        if (isJustOpened) {
          // Reset form
          setEditingEventId(null);
          setTitle('');
          setDescription('');
          setTime('');
          setType('task');
          setPriority('medium');
        }
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialDate, selectedEventId, project]);

  if (!isOpen || !project) return null;

  // Filtered Events
  const events = project.calendarEvents || [];
  const filteredEvents = events.filter(evt => {
    if (viewScope === 'day' && evt.date !== filterDate) return false;
    if (typeFilter !== 'all' && evt.type !== typeFilter) return false;
    return true;
  });

  // Milestones matching current day
  const milestonesForDay = (project.milestones || []).filter(ms => {
    if (viewScope !== 'day') return false;
    const target = ms.targetDate || ms.endDate;
    return target === filterDate;
  });

  const handleEditClick = (evt: ProjectCalendarEvent) => {
    setEditingEventId(evt.id);
    setTitle(evt.title);
    setDescription(evt.description || '');
    setDate(evt.date);
    setTime(evt.time || '');
    setType(evt.type);
    setPriority(evt.priority || 'medium');
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setDate(filterDate);
    setTime('');
    setType('task');
    setPriority('medium');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      onShowToast('Por favor ingresa un título para la tarea o alarma', 'AlertCircle');
      return;
    }

    const targetDate = date || filterDate;

    const existingEvt = editingEventId ? events.find(e => e.id === editingEventId) : null;
    const payload: ProjectCalendarEvent = {
      id: editingEventId || `calevt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId: project.id,
      title: cleanTitle,
      description: description.trim() || undefined,
      date: targetDate,
      time: time || undefined,
      type,
      priority,
      completed: existingEvt ? existingEvt.completed : false,
      createdAt: existingEvt?.createdAt || new Date().toISOString()
    };

    onSaveEvent(project.id, payload);
    onShowToast(
      editingEventId ? '¡Elemento actualizado con éxito!' : '¡Nueva tarea/alarma guardada en la Nube y en Drive!',
      'Check'
    );

    // Keep viewing on the date of the saved event so user sees it right away!
    setFilterDate(targetDate);
    setDate(targetDate);
    setEditingEventId(null);
    setTitle('');
    setDescription('');
    setTime('');
  };

  const handleDelete = (eventId: string, eventTitle: string) => {
    if (confirm(`¿Eliminar "${eventTitle}" del calendario de esta obra?`)) {
      onDeleteEvent(project.id, eventId);
      if (editingEventId === eventId) {
        handleCancelEdit();
      }
      onShowToast('Elemento eliminado del calendario', 'Trash2');
    }
  };

  const formattedDateTitle = (() => {
    try {
      const parts = filterDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayNum = parts[2];
      const monthName = MONTH_NAMES_ES[parts[1] - 1];
      const year = parts[0];
      return `${dayNum} de ${monthName} de ${year}`;
    } catch {
      return filterDate;
    }
  })();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 no-print animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-slate-700/80 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#141d30] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: hexToRgba(neonColor, 0.15),
                border: `1px solid ${hexToRgba(neonColor, 0.4)}`
              }}
            >
              <CalendarIcon className="w-5 h-5" style={{ color: neonColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                  Agenda & Tareas de Obra
                </h3>
                <span
                  className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border"
                  style={{
                    color: neonColor,
                    borderColor: hexToRgba(neonColor, 0.4),
                    backgroundColor: hexToRgba(neonColor, 0.1)
                  }}
                >
                  Exclusivo de esta obra
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5 font-bold">
                <Building2 className="w-3.5 h-3.5" style={{ color: neonColor }} />
                <span className="text-white font-extrabold">{project.name}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400 font-normal">{project.location || 'Obra en ejecución'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Controls & Date Selector Bar */}
        <div className="p-3 sm:px-5 bg-[#0d1320] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
          {/* View Scope Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewScope('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewScope === 'day'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Día seleccionado ({filterDate.split('-')[2]}/{filterDate.split('-')[1]})
            </button>
            <button
              type="button"
              onClick={() => setViewScope('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewScope === 'all'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ver Todas ({events.length})
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 hidden sm:inline">Fecha:</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setDate(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                typeFilter === 'all' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('alarm')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                typeFilter === 'alarm' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Alarmas</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('task')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                typeFilter === 'task' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3 h-3 text-cyan-400" />
              <span>Tareas</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('event')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                typeFilter === 'event' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3 h-3 text-emerald-400" />
              <span>Eventos</span>
            </button>
          </div>
        </div>

        {/* 3. Modal Body: Split in 2 columns (Left: Items List, Right: Add/Edit Form) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Items List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <span>{viewScope === 'day' ? `Agenda del ${formattedDateTitle}` : 'Todas las Tareas y Alarmas de la Obra'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                  {filteredEvents.length + milestonesForDay.length}
                </span>
              </h4>

              {viewScope === 'day' && (
                <button
                  type="button"
                  onClick={() => {
                    setDate(filterDate);
                    setEditingEventId(null);
                    setTitle('');
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Cargar en este día</span>
                </button>
              )}
            </div>

            {/* Event List */}
            {filteredEvents.length === 0 && milestonesForDay.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-300">No hay tareas ni alarmas programadas</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {viewScope === 'day'
                    ? `No se han registrado ítems para el ${formattedDateTitle}. Utiliza el formulario a la derecha para agregar una.`
                    : 'Esta obra aún no tiene tareas en el calendario. ¡Agrega la primera!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Milestones of the day if any */}
                {milestonesForDay.map(ms => (
                  <div
                    key={`ms_${ms.id}`}
                    className="p-3 rounded-2xl bg-purple-950/30 border border-purple-800/50 flex items-start justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-purple-900/50 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-900/80 text-purple-200">
                            Hito de Obra
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {ms.targetDate || ms.endDate}
                          </span>
                        </div>
                        <p className="text-sm font-black text-white mt-1 leading-snug">
                          {ms.name}
                        </p>
                        {ms.notes && (
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            {ms.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Calendar Events */}
                {filteredEvents.map(evt => {
                  const isBeingEdited = editingEventId === evt.id;
                  const isAlarm = evt.type === 'alarm';
                  const isEvent = evt.type === 'event';

                  return (
                    <div
                      key={evt.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                        isBeingEdited
                          ? 'border-amber-400 bg-slate-800/90 shadow-md ring-2 ring-amber-400/20'
                          : evt.completed
                          ? 'border-slate-800/80 bg-slate-900/40 opacity-75'
                          : isAlarm
                          ? 'border-rose-500/40 bg-rose-950/20 hover:border-rose-500/70'
                          : isEvent
                          ? 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-500/70'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      {/* Checkbox & Content */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => onToggleEventCompleted(project.id, evt.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0 touch-target p-0.5"
                          title={evt.completed ? 'Marcar como pendiente' : 'Marcar como cumplido'}
                        >
                          {evt.completed ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Top Badges: Type, Priority, Date, Time */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isAlarm ? (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Alarma</span>
                              </span>
                            ) : isEvent ? (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                <span>Evento</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                                <CheckSquare className="w-3 h-3" />
                                <span>Tarea</span>
                              </span>
                            )}

                            {/* Priority Badge */}
                            {evt.priority === 'urgent' && (
                              <span className="text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-600 text-white">
                                Urgente
                              </span>
                            )}
                            {evt.priority === 'high' && (
                              <span className="text-[9.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Alta
                              </span>
                            )}

                            {/* Date & Time */}
                            <span className="text-[10.5px] font-mono text-slate-400 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {evt.date}
                            </span>
                            {evt.time && (
                              <span className="text-[10.5px] font-mono text-slate-400 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />
                                {evt.time} hs
                              </span>
                            )}
                          </div>

                          {/* Event Title */}
                          <p className={`text-sm font-bold leading-snug break-words ${evt.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                            {evt.title}
                          </p>

                          {/* Event Description */}
                          {evt.description && (
                            <p className="text-xs text-slate-300 leading-relaxed break-words bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                              {evt.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Item Actions: Edit & Delete */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(evt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Editar tarea o alarma"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(evt.id, evt.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          title="Eliminar del calendario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Add / Edit Form */}
          <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between">
            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{editingEventId ? 'Modificar Tarea / Alarma' : 'Nueva Tarea o Alarma'}</span>
                </h4>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {/* 1. Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                  Tipo de elemento
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setType('task')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      type === 'task'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 ring-2 ring-cyan-500/20 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-cyan-400" />
                    <span>Tarea</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('alarm')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      type === 'alarm'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500 ring-2 ring-rose-500/20 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Alarma</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('event')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      type === 'event'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    <CalendarIcon className="w-4 h-4 text-emerald-400" />
                    <span>Evento</span>
                  </button>
                </div>
              </div>

              {/* 2. Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Título <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    type === 'alarm'
                      ? 'Ej: Vencimiento seguro ART / Entrega de caños'
                      : type === 'event'
                      ? 'Ej: Reunión con electricista / Visita municipal'
                      : 'Ej: Hormigonado losa 2do piso'
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>

              {/* 3. Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Hora (opcional)
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 4. Priority */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Nivel de Prioridad
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
                    const label = p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : p === 'high' ? 'Alta' : 'Urgente';
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                          isSelected
                            ? p === 'urgent'
                              ? 'bg-rose-600 text-white border-rose-500 font-black'
                              : p === 'high'
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                              : 'bg-slate-700 text-white border-slate-500 font-black'
                            : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Description / Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Descripción o Detalles (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles técnicos, responsables, observaciones o instrucciones..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-medium resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingEventId ? 'Actualizar en Obra' : 'Guardar en el Calendario de la Obra'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 4. Footer */}
        <div className="p-3 sm:px-5 bg-[#141d30] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Gestión exclusiva para <strong>{project.name}</strong></span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
