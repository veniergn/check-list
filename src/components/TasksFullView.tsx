import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  Plus,
  Check,
  CheckSquare,
  Clock,
  AlertTriangle,
  Flame,
  Building2,
  User,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  Trash2,
  ChevronDown
} from 'lucide-react';
import { Project, ProjectCalendarEvent, PMTaskStatus, CalendarEventType } from '../types';

interface TasksFullViewProps {
  projects: Project[];
  neonColor?: string;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onSaveCalendarEvent?: (projectId: string, event: ProjectCalendarEvent) => void;
  onDeleteCalendarEvent?: (projectId: string, eventId: string) => void;
  onToggleCalendarEvent?: (projectId: string, eventId: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const PROJECT_COLOR_BADGES = [
  'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
  'bg-blue-500/20 text-blue-300 border-blue-400/40',
  'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  'bg-purple-500/20 text-purple-300 border-purple-400/40',
  'bg-amber-500/20 text-amber-300 border-amber-400/40'
];

export function TasksFullView({
  projects,
  neonColor = '#00f2fe',
  selectedProjectId,
  onSelectProject,
  onSaveCalendarEvent,
  onDeleteCalendarEvent,
  onToggleCalendarEvent,
  onShowToast
}: TasksFullViewProps) {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [activeProjectTab, setActiveProjectTab] = useState<string>(selectedProjectId || 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick task modal state
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProjectId, setNewProjectId] = useState<string>(projects[0]?.id || '');
  const [newDate, setNewDate] = useState<string>(todayStr);
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [newAssignee, setNewAssignee] = useState('');

  // Project Color Map
  const projectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p, idx) => {
      map.set(p.id, PROJECT_COLOR_BADGES[idx % PROJECT_COLOR_BADGES.length]);
    });
    return map;
  }, [projects]);

  // Aggregate all events
  const allTasks = useMemo(() => {
    const list: Array<ProjectCalendarEvent & { projectName: string; isOverdue: boolean }> = [];
    projects.forEach(p => {
      (p.calendarEvents || []).forEach(evt => {
        const isOverdue = !evt.completed && evt.date < todayStr;
        list.push({
          ...evt,
          projectName: p.name,
          isOverdue
        });
      });
    });
    return list;
  }, [projects, todayStr]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (activeProjectTab !== 'all' && task.projectId !== activeProjectTab) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (statusFilter === 'pending' && (task.completed || task.status === 'in_progress')) return false;
      if (statusFilter === 'in_progress' && (task.completed || task.status !== 'in_progress')) return false;
      if (statusFilter === 'overdue' && !task.isOverdue) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchProj = task.projectName.toLowerCase().includes(q);
        const matchAssignee = (task.assignedTo || '').toLowerCase().includes(q);
        if (!matchTitle && !matchProj && !matchAssignee) return false;
      }
      return true;
    });
  }, [allTasks, activeProjectTab, statusFilter, priorityFilter, searchQuery]);

  // Statistics
  const totalCount = allTasks.length;
  const pendingCount = allTasks.filter(t => !t.completed && !t.isOverdue).length;
  const inProgressCount = allTasks.filter(t => t.status === 'in_progress' && !t.completed).length;
  const overdueCount = allTasks.filter(t => t.isOverdue).length;
  const completedCount = allTasks.filter(t => t.completed).length;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      onShowToast?.('Ingresa un título para la tarea', 'AlertCircle');
      return;
    }
    const targetPid = newProjectId || projects[0]?.id;
    if (!targetPid) return;

    const newEvt: ProjectCalendarEvent = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: targetPid,
      title: newTitle.trim(),
      date: newDate || todayStr,
      type: 'task',
      priority: newPriority,
      status: 'pending',
      completed: false,
      assignedTo: newAssignee.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveCalendarEvent?.(targetPid, newEvt);
    setNewTitle('');
    setNewAssignee('');
    setIsNewTaskOpen(false);
    onShowToast?.('Tarea técnica creada y sincronizada', 'Check');
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Gestión Integral de Tareas de Obra
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Control y seguimiento de actividades técnicas para todas las obras
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsNewTaskOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Metrics Row (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-white">{totalCount}</div>
            <div className="text-[10px] text-[#94A3B8]">Total Tareas</div>
          </div>
        </div>

        <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-cyan-300">{inProgressCount}</div>
            <div className="text-[10px] text-[#94A3B8]">En Proceso</div>
          </div>
        </div>

        <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-600/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-amber-300">{pendingCount}</div>
            <div className="text-[10px] text-[#94A3B8]">Pendientes</div>
          </div>
        </div>

        <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600/15 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-rose-400">{overdueCount}</div>
            <div className="text-[10px] text-[#94A3B8]">Vencidas</div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#101D30] border border-[#29384C] rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-black text-emerald-300">{completedCount}</div>
            <div className="text-[10px] text-[#94A3B8]">Completadas</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Obra Pills */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-3 sm:p-4 space-y-3">
        {/* Project Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-black uppercase text-[#94A3B8] px-1 flex items-center gap-1.5 whitespace-nowrap">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            Obra:
          </span>
          <button
            onClick={() => setActiveProjectTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeProjectTab === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#17263B] text-[#94A3B8] hover:text-white'
            }`}
          >
            Todas las Obras ({projects.length})
          </button>
          {projects.map(p => {
            const isSel = activeProjectTab === p.id;
            const pCount = (p.calendarEvents || []).length;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProjectTab(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                    : 'bg-[#17263B] text-[#94A3B8] hover:text-white'
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] opacity-75">({pCount})</span>
              </button>
            );
          })}
        </div>

        {/* Sub-toolbar: Status filter + Priority + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#29384C]/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusFilter === 'all' ? 'bg-[#081321] text-white border border-[#29384C]' : 'text-[#94A3B8] hover:text-white'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-[#94A3B8] hover:text-white'}`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusFilter === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-[#94A3B8] hover:text-white'}`}
            >
              En Proceso
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusFilter === 'overdue' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-[#94A3B8] hover:text-white'}`}
            >
              Vencidas
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusFilter === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-[#94A3B8] hover:text-white'}`}
            >
              Completadas
            </button>
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarea o responsable..."
              className="w-full bg-[#081321] border border-[#29384C] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tasks Table / Card List */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl overflow-hidden shadow-2xl">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-[#94A3B8] space-y-2">
            <ListTodo className="w-10 h-10 mx-auto text-slate-500" />
            <p className="text-sm font-bold">No se encontraron tareas con los filtros actuales</p>
            <p className="text-xs text-slate-500">Prueba ajustando los filtros de estado o programando una nueva tarea</p>
          </div>
        ) : (
          <div className="divide-y divide-[#29384C]/60">
            {filteredTasks.map(task => {
              const badgeClass = projectColorMap.get(task.projectId) || PROJECT_COLOR_BADGES[0];

              return (
                <div
                  key={task.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-[#081321]/30 opacity-70'
                      : task.isOverdue
                      ? 'bg-rose-950/20 hover:bg-rose-950/30'
                      : 'hover:bg-[#17263B]/60'
                  }`}
                >
                  {/* Left: Checkbox + Title + Description */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => onToggleCalendarEvent?.(task.projectId, task.id)}
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-400 text-white'
                          : 'border-[#29384C] hover:border-cyan-400 bg-[#081321]'
                      }`}
                      title={task.completed ? 'Marcar pendiente' : 'Marcar completada'}
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${badgeClass}`}>
                          {task.projectName}
                        </span>

                        {task.isOverdue && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-400" />
                            Vencida
                          </span>
                        )}

                        {task.priority === 'urgent' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Urgente
                          </span>
                        )}
                        {task.priority === 'high' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Alta
                          </span>
                        )}
                      </div>

                      <h3 className={`text-sm font-bold mt-1.5 leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-xs text-[#94A3B8] mt-0.5">{task.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Date + Assignee + Direct Actions */}
                  <div className="flex items-center gap-4 text-xs text-[#94A3B8] sm:self-center shrink-0 pl-9 sm:pl-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{task.date}</span>
                      </div>
                      {task.assignedTo && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 justify-end mt-0.5">
                          <User className="w-3 h-3 text-blue-400" />
                          <span>{task.assignedTo}</span>
                        </div>
                      )}
                    </div>

                    {onSelectProject && (
                      <button
                        onClick={() => onSelectProject(task.projectId)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#081321] hover:bg-[#17263B] text-blue-400 border border-[#29384C] text-[11px] font-bold flex items-center gap-1"
                      >
                        <span>Ver Obra</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {onDeleteCalendarEvent && (
                      <button
                        onClick={() => onDeleteCalendarEvent(task.projectId, task.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                        title="Eliminar tarea"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {isNewTaskOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#101D30] border border-[#29384C] rounded-3xl p-6 shadow-2xl space-y-4 text-white">
            <h3 className="text-base font-black">Programar Nueva Tarea</h3>
            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#94A3B8]">Título de la Tarea</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Prueba hidráulica de cañerías..."
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8]">Obra</label>
                <select
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#94A3B8]">Fecha Límite</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#94A3B8]">Prioridad</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1"
                  >
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#94A3B8]">Responsable Asignado</label>
                <input
                  type="text"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  placeholder="Ej: Edgar Romero (Constructor)..."
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white outline-none mt-1 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#29384C]">
                <button
                  type="button"
                  onClick={() => setIsNewTaskOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
