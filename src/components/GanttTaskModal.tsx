import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Trash2,
  Plus,
  Percent,
  Check,
  FileText,
  ListTodo
} from 'lucide-react';
import { Project, ProjectCalendarEvent, PMTaskStatus, ContractorProfile } from '../types';
import { getProjectContractors } from '../utils/pmContractors';
import { getTodayString, getDaysDiff, formatPMDate } from '../utils/pmCalculations';

interface GanttTaskModalProps {
  isOpen: boolean;
  project: Project;
  task?: ProjectCalendarEvent | null; // null if creating a new task
  initialDate?: string;
  initialContractorName?: string;
  neonColor?: string;
  onClose: () => void;
  onSaveTask: (projectId: string, task: ProjectCalendarEvent) => void;
  onDeleteTask?: (projectId: string, taskId: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const STATUS_OPTIONS: { id: PMTaskStatus; label: string; color: string }[] = [
  { id: 'pending', label: 'Pendiente', color: 'bg-slate-500' },
  { id: 'in_progress', label: 'En Curso', color: 'bg-cyan-500' },
  { id: 'completed', label: 'Completada', color: 'bg-emerald-500' },
  { id: 'blocked', label: 'Bloqueada', color: 'bg-rose-500' }
];

const PRIORITY_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'Alta' },
  { id: 'critical', label: 'Crítica / Urgente' }
];

export function GanttTaskModal({
  isOpen,
  project,
  task,
  initialDate,
  initialContractorName,
  neonColor = '#00f2fe',
  onClose,
  onSaveTask,
  onDeleteTask,
  onShowToast
}: GanttTaskModalProps) {
  const isEditing = Boolean(task && task.id);
  const todayStr = getTodayString();

  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<PMTaskStatus>('pending');
  const [priority, setPriority] = useState<string>('normal');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isCustomContractor, setIsCustomContractor] = useState(false);

  const availableContractors = getProjectContractors(project);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setAssignedTo(task.assignedTo || '');
      setAssignedRole(task.assignedRole || '');
      const sDate = (task.startDate || task.date || todayStr).split('T')[0];
      const eDate = (task.date || task.startDate || todayStr).split('T')[0];
      setStartDate(sDate);
      setEndDate(eDate);
      const prog = task.progress !== undefined ? task.progress : (task.completed || task.status === 'completed' ? 100 : 0);
      setProgress(prog);
      setStatus(task.status || (prog >= 100 ? 'completed' : 'pending'));
      setPriority(task.priority || (task.type === 'alarm' ? 'critical' : 'normal'));
      setNotes(task.notes || task.description || '');
      setSubtasks(task.subtasks || []);
      const existsInList = availableContractors.some(c => c.name.trim().toLowerCase() === (task.assignedTo || '').trim().toLowerCase());
      setIsCustomContractor(Boolean(task.assignedTo && !existsInList));
    } else {
      const defaultStart = initialDate || todayStr;
      const parts = defaultStart.split('-').map(Number);
      const dObj = new Date(parts[0], parts[1] - 1, parts[2] + 7);
      const defaultEnd = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;

      setTitle('');
      const defaultContractor = initialContractorName || availableContractors[0]?.name || '';
      setAssignedTo(defaultContractor);
      const matched = availableContractors.find(c => c.name.toLowerCase() === defaultContractor.toLowerCase());
      setAssignedRole(matched?.role || '');
      setStartDate(defaultStart);
      setEndDate(defaultEnd);
      setProgress(0);
      setStatus('pending');
      setPriority('normal');
      setNotes('');
      setSubtasks([]);
      setIsCustomContractor(false);
    }
  }, [task, isOpen, initialDate, initialContractorName, project]);

  if (!isOpen) return null;

  const durationDays = Math.max(1, getDaysDiff(endDate, startDate) + 1);
  const daysDiff = getDaysDiff(endDate, todayStr);
  const isOverdue = daysDiff < 0 && progress < 100 && status !== 'completed';
  const isApproaching = daysDiff >= 0 && daysDiff <= 5 && progress < 50 && status !== 'completed';

  const handleContractorChange = (val: string) => {
    if (val === '__custom__') {
      setIsCustomContractor(true);
      setAssignedTo('');
      setAssignedRole('Cuadrilla Externa');
    } else {
      setIsCustomContractor(false);
      setAssignedTo(val);
      const match = availableContractors.find(c => c.name === val);
      if (match) {
        setAssignedRole(match.role);
      }
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSt = {
      id: 'sub_' + Date.now(),
      title: newSubtaskTitle.trim(),
      completed: false
    };
    const updated = [...subtasks, newSt];
    setSubtasks(updated);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (stId: string) => {
    const updated = subtasks.map(st => st.id === stId ? { ...st, completed: !st.completed } : st);
    setSubtasks(updated);
    if (updated.length > 0) {
      const doneCount = updated.filter(s => s.completed).length;
      const calcPct = Math.round((doneCount / updated.length) * 100);
      setProgress(calcPct);
      if (calcPct === 100) setStatus('completed');
      else if (calcPct > 0 && status === 'pending') setStatus('in_progress');
    }
  };

  const handleDeleteSubtask = (stId: string) => {
    setSubtasks(subtasks.filter(st => st.id !== stId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Por favor ingresa un título para la tarea');
      return;
    }

    const sDate = startDate || todayStr;
    const eDate = endDate || startDate || todayStr;
    const isDone = progress >= 100 || status === 'completed';

    const finalTask: ProjectCalendarEvent = {
      ...(task || {}),
      id: task?.id || ('task_' + Date.now()),
      title: title.trim(),
      assignedTo: assignedTo.trim() || 'Cuadrilla General',
      assignedRole: assignedRole.trim() || 'Técnico de Obra',
      startDate: sDate <= eDate ? sDate : eDate,
      date: sDate <= eDate ? eDate : sDate,
      progress,
      status: isDone ? 'completed' : status,
      completed: isDone,
      priority: priority as any,
      type: priority === 'critical' ? 'alarm' : 'task',
      notes: notes.trim(),
      description: notes.trim(),
      subtasks,
      updatedAt: new Date().toISOString()
    };

    onSaveTask(project.id, finalTask);
    onShowToast?.(isEditing ? 'Tarea actualizada y sincronizada en la Nube y Drive' : 'Nueva tarea creada en el cronograma Gantt', 'Check');
    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    if (window.confirm(`¿Eliminar la tarea "${task.title}" del cronograma Gantt?`)) {
      onDeleteTask?.(project.id, task.id);
      onShowToast?.('Tarea eliminada del cronograma Gantt', 'Trash2');
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#101D30] border border-[#29384C] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#29384C] flex items-center justify-between bg-[#081321]/60">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-lg"
              style={{ backgroundColor: `${neonColor}20`, border: `1px solid ${neonColor}50`, color: neonColor }}
            >
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {isEditing ? 'Modificar Tarea en Gantt' : 'Nueva Tarea en Cronograma'}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Obra: <span className="text-white font-bold">{project.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#17263B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Alerta de urgencia / atraso */}
          {(isOverdue || isApproaching) && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center gap-2.5 text-xs font-bold animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]">
              <Flame className="w-5 h-5 text-rose-400 shrink-0" />
              <span>
                {isOverdue
                  ? `¡Tarea con atraso de ${Math.abs(daysDiff)} días! Requiere avance urgente.`
                  : `¡Quedan solo ${daysDiff} días y el avance es menor al 50%! Titilará en rojo en el Gantt.`}
              </span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Nombre / Labor de la Tarea <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej. Colocación de porcelanato en baños, Encofrado losa..."
              className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors font-medium"
            />
          </div>

          {/* Contractor / Responsable Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Responsable / Cuadrilla
              </label>
              {!isCustomContractor ? (
                <select
                  value={assignedTo}
                  onChange={e => handleContractorChange(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-medium"
                >
                  {availableContractors.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                  <option value="__custom__">+ Otro responsable personalizado...</option>
                </select>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    placeholder="Nombre del contratista..."
                    className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomContractor(false)}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    ← Elegir del equipo registrado
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Rol / Especialidad
              </label>
              <input
                type="text"
                value={assignedRole}
                onChange={e => setAssignedRole(e.target.value)}
                placeholder="Ej. Capataz, Yesero, Sanitarista..."
                className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#081321]/40 p-3 rounded-2xl border border-[#29384C]">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Fecha Inicio
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-[#101D30] border border-[#29384C] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Fecha Final
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-[#101D30] border border-[#29384C] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Duración Estimada
              </span>
              <span className="text-base font-black text-cyan-300">
                {durationDays} {durationDays === 1 ? 'día' : 'días'}
              </span>
              <span className="text-[10px] text-slate-500">
                {daysDiff < 0 ? `Atraso: ${Math.abs(daysDiff)}d` : `Plazo: ${daysDiff}d restantes`}
              </span>
            </div>
          </div>

          {/* Progress Slider and Fast Presets */}
          <div className="bg-[#081321]/50 p-3.5 rounded-2xl border border-[#29384C] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-cyan-400" />
                Porcentaje de Avance Físico
              </span>
              <span
                className="text-sm font-black px-2.5 py-0.5 rounded-lg"
                style={{
                  backgroundColor: progress >= 100 ? '#10b981' : progress > 0 ? '#f59e0b' : '#334155',
                  color: progress > 0 ? '#ffffff' : '#94a3b8'
                }}
              >
                {progress}%
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={e => {
                const val = Number(e.target.value);
                setProgress(val);
                if (val >= 100) setStatus('completed');
                else if (val > 0 && status === 'pending') setStatus('in_progress');
              }}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            <div className="flex items-center justify-between gap-1 pt-1">
              {[0, 25, 50, 75, 100].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setProgress(pct);
                    if (pct >= 100) setStatus('completed');
                    else if (pct > 0 && status === 'pending') setStatus('in_progress');
                  }}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all border ${
                    progress === pct
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                      : 'bg-[#101D30] text-slate-400 border-[#29384C] hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Estado Operativo
              </label>
              <select
                value={status}
                onChange={e => {
                  const val = e.target.value as PMTaskStatus;
                  setStatus(val);
                  if (val === 'completed' && progress < 100) setProgress(100);
                  if (val === 'pending' && progress === 100) setProgress(0);
                }}
                className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-medium"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 font-medium"
              >
                {PRIORITY_OPTIONS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks / Checklist */}
          <div className="bg-[#081321]/40 p-3.5 rounded-2xl border border-[#29384C] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ListTodo className="w-3.5 h-3.5 text-blue-400" />
                Tareas Secundarias / Checklist ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={e => setNewSubtaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Agregar sub-ítem o labor específica..."
                className="flex-1 bg-[#101D30] border border-[#29384C] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {subtasks.map(st => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[#101D30]/80 border border-[#29384C] text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded text-cyan-500 w-3.5 h-3.5"
                      />
                      <span className={`truncate ${st.completed ? 'line-through text-slate-500' : 'text-slate-200 font-medium'}`}>
                        {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(st.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Observaciones textarea */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Notas, Observaciones y Directivas Técnicas (Se respaldan en Google Drive)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalles sobre materiales requeridos, especificaciones de colocación, contratistas auxiliares..."
              className="w-full bg-[#081321] border border-[#29384C] rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-colors custom-scrollbar"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#29384C] flex items-center justify-between gap-3">
            {isEditing && onDeleteTask ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Eliminar Tarea</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#17263B] text-slate-300 hover:text-white font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isEditing ? 'Guardar Cambios' : 'Crear Tarea'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
