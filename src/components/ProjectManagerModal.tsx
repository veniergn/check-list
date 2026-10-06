import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Users,
  UserPlus,
  Camera,
  Upload,
  Search,
  Filter,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckSquare,
  Square,
  ListTodo,
  TrendingUp,
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Paperclip,
  Percent
} from 'lucide-react';
import { Project, ProjectCalendarEvent, PMSubtask, PMTaskStatus, CalendarEventType, ContractorProfile, Milestone } from '../types';
import { getTodayString, getTaskAlarms, calculateProjectPMStats, formatPMDate, getDaysDiff } from '../utils/pmCalculations';
import { DEFAULT_CONTRACTORS, getContractorProfile, getProjectContractors } from '../utils/pmContractors';
import { PMGanttMatrix } from './PMGanttMatrix';
import { ContractorManagerModal } from './ContractorManagerModal';
import { ContractorAvatar } from './ContractorAvatar';

interface ProjectManagerModalProps {
  isOpen: boolean;
  project: Project | null;
  initialTab?: 'dashboard' | 'tasks' | 'calendar';
  initialDate?: string;
  selectedTaskId?: string;
  neonColor?: string;
  onClose: () => void;
  onSaveTask: (projectId: string, task: ProjectCalendarEvent) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
  onToggleTaskStatus?: (projectId: string, taskId: string, newStatus: PMTaskStatus) => void;
  onToggleSubtask?: (projectId: string, taskId: string, subtaskId: string) => void;
  onSaveContractors?: (projectId: string, contractors: ContractorProfile[]) => void;
  onOpenMilestonesConfig?: (projectId: string) => void;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS_ES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function ProjectManagerModal({
  isOpen,
  project,
  initialTab = 'dashboard',
  initialDate,
  selectedTaskId,
  neonColor = '#00f2fe',
  onClose,
  onSaveTask,
  onDeleteTask,
  onToggleTaskStatus,
  onToggleSubtask,
  onSaveContractors,
  onOpenMilestonesConfig,
  onSaveMilestone,
  onShowToast
}: ProjectManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tasks' | 'calendar'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'upcoming' | 'in_progress' | 'pending' | 'completed'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Contractor / Cuadrillas management state
  const [isContractorManagerOpen, setIsContractorManagerOpen] = useState(false);
  const [contractorList, setContractorList] = useState<ContractorProfile[]>(() => getProjectContractors(project));

  useEffect(() => {
    if (project) {
      setContractorList(getProjectContractors(project));
    }
  }, [project?.contractors, project?.id]);

  const handleSaveContractorsList = (updated: ContractorProfile[]) => {
    if (!project) return;
    setContractorList(updated);
    try {
      localStorage.setItem(`pm_contractors_${project.id}`, JSON.stringify(updated));
    } catch {}
    if (onSaveContractors) {
      onSaveContractors(project.id, updated);
    }
    onShowToast('Equipo y fotos de cuadrillas actualizadas', 'Users');
  };

  // Gantt Matrix navigation state
  const todayStr = useMemo(() => getTodayString(), []);
  const [ganttViewDate, setGanttViewDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [windowStartIndex, setWindowStartIndex] = useState<number>(0);

  // Quick Note in Executive Command Center
  const [quickNoteText, setQuickNoteText] = useState('');

  // Form Drawer / Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedRole, setAssignedRole] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<CalendarEventType>('task');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [status, setStatus] = useState<PMTaskStatus>('pending');
  const [progress, setProgress] = useState<number>(0);
  const [subtasks, setSubtasks] = useState<PMSubtask[]>([]);
  const [newSubtaskDraft, setNewSubtaskDraft] = useState('');

  // Calendar tab navigation
  const [calDate, setCalDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calSelectedDateStr, setCalSelectedDateStr] = useState<string>(initialDate || todayStr);

  // Stats calculation
  const stats = useMemo(() => {
    return calculateProjectPMStats(project?.calendarEvents || [], todayStr);
  }, [project?.calendarEvents, todayStr]);

  // Unique assignees in this project
  const availableAssignees = useMemo(() => {
    const set = new Set<string>();
    contractorList.forEach(c => set.add(c.name));
    (project?.calendarEvents || []).forEach(t => {
      if (t.assignedTo?.trim()) set.add(t.assignedTo.trim());
    });
    return Array.from(set);
  }, [project?.calendarEvents, contractorList]);

  // Sorted upcoming events for the "Future Events" column
  const upcomingEvents = useMemo(() => {
    const events = [...(project?.calendarEvents || [])];
    return events
      .filter(e => !e.completed && e.status !== 'completed')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 4);
  }, [project?.calendarEvents]);

  // Contractor cards for "Equipo y Cuadrillas" column
  const contractorTeamCards = useMemo(() => {
    const events = project?.calendarEvents || [];
    return contractorList.slice(0, 4).map(contractor => {
      const assigned = events.filter(e => e.assignedTo?.trim().toLowerCase() === contractor.name.toLowerCase());
      const done = assigned.filter(e => e.completed || e.status === 'completed');
      const total = assigned.length;
      const progressPct = total > 0 ? Math.round((done.length / total) * 100) : 0;
      return {
        contractor,
        doneCount: done.length,
        totalCount: total,
        progressPct
      };
    });
  }, [project?.calendarEvents, contractorList]);

  // Month navigation handlers for Gantt
  const handleGanttPrevMonth = () => {
    setGanttViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setWindowStartIndex(0);
  };

  const handleGanttNextMonth = () => {
    setGanttViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setWindowStartIndex(0);
  };

  const handleGanttToggleWindow = () => {
    setWindowStartIndex(prev => (prev === 0 ? 16 : 0));
  };

  // Open editor with prefilled data or reset
  const handleOpenNewTask = (presetDate?: string, presetAssignee?: string) => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    const defaultAssignee = presetAssignee || project?.director || DEFAULT_CONTRACTORS[0].name;
    const profile = getContractorProfile(defaultAssignee);
    setAssignedTo(defaultAssignee);
    setAssignedRole(profile.role);
    setStartDate(todayStr);
    setDeadlineDate(presetDate || todayStr);
    setTime('');
    setType('task');
    setPriority('medium');
    setStatus('pending');
    setProgress(0);
    setSubtasks([]);
    setNewSubtaskDraft('');
    setIsEditorOpen(true);
  };

  const handleEditTask = (task: ProjectCalendarEvent) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setAssignedTo(task.assignedTo || '');
    setAssignedRole(task.assignedRole || '');
    setStartDate(task.startDate || '');
    setDeadlineDate(task.date || '');
    setTime(task.time || '');
    setType(task.type || 'task');
    setPriority(task.priority || 'medium');
    setStatus(task.status || (task.completed ? 'completed' : 'pending'));
    const initialProgress = task.progress !== undefined
      ? task.progress
      : (task.completed || task.status === 'completed' ? 100 : 0);
    setProgress(initialProgress);
    setSubtasks(task.subtasks ? [...task.subtasks] : []);
    setNewSubtaskDraft('');
    setIsEditorOpen(true);
  };


  // Synchronize tab and task selection whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (initialDate) {
        setCalSelectedDateStr(initialDate);
        const parts = initialDate.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m)) {
            setGanttViewDate(new Date(y, m - 1, 1));
            setCalDate(new Date(y, m - 1, 1));
            setWindowStartIndex(d > 16 ? 16 : 0);
          }
        }
      }
      if (selectedTaskId && project?.calendarEvents) {
        const found = project.calendarEvents.find(t => t.id === selectedTaskId);
        if (found) {
          handleEditTask(found);
        }
      }
    }
  }, [isOpen, initialTab, initialDate, selectedTaskId, project?.calendarEvents]);

  const handleAddSubtask = () => {
    const trimmed = newSubtaskDraft.trim();
    if (!trimmed) return;
    const newSub: PMSubtask = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: trimmed,
      completed: false
    };
    setSubtasks(prev => [...prev, newSub]);
    setNewSubtaskDraft('');
  };

  const handleRemoveSubtask = (subId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subId));
  };

  const handleToggleSubtaskInForm = (subId: string) => {
    setSubtasks(prev => prev.map(s => {
      if (s.id !== subId) return s;
      const nextCompleted = !s.completed;
      return {
        ...s,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined
      };
    }));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      onShowToast('Ingresa un título para la tarea', 'AlertCircle');
      return;
    }

    const isAllSubtasksDone = subtasks.length > 0 && subtasks.every(s => s.completed);
    let finalProgress = progress;
    if (isAllSubtasksDone && status !== 'completed' && finalProgress < 100) {
      finalProgress = 100;
    }
    const isCompleted = status === 'completed' || finalProgress >= 100;
    const finalStatus: PMTaskStatus = isCompleted ? 'completed' : (finalProgress > 0 ? 'in_progress' : status);

    const nowIso = new Date().toISOString();
    const existingTask = editingTaskId
      ? (project.calendarEvents || []).find(t => t.id === editingTaskId)
      : null;

    const taskPayload: ProjectCalendarEvent = {
      id: editingTaskId || `pmtask_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: project.id,
      title: cleanTitle,
      description: description.trim() || undefined,
      assignedTo: assignedTo.trim() || undefined,
      assignedRole: assignedRole.trim() || undefined,
      startDate: startDate || undefined,
      date: deadlineDate || todayStr,
      time: time || undefined,
      type,
      priority,
      status: finalStatus,
      completed: isCompleted,
      progress: isCompleted ? 100 : finalProgress,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      createdAt: existingTask?.createdAt || nowIso,
      updatedAt: nowIso
    };

    onSaveTask(project.id, taskPayload);
    setIsEditorOpen(false);
    onShowToast(
      editingTaskId
        ? 'Tarea actualizada en Nube y Google Drive'
        : '¡Tarea guardada en Project Manager y Drive!',
      'Check'
    );
  };

  const handleDelete = (task: ProjectCalendarEvent) => {
    if (!project) return;
    if (confirm(`¿Eliminar la tarea "${task.title}" del Project Manager?`)) {
      onDeleteTask(project.id, task.id);
      if (editingTaskId === task.id) {
        setIsEditorOpen(false);
      }
      onShowToast('Tarea eliminada', 'Trash2');
    }
  };

  // Quick note submit from Executive Command Center card
  const handleQuickNoteSubmit = () => {
    if (!project || !quickNoteText.trim()) return;
    const nowIso = new Date().toISOString();
    const newTask: ProjectCalendarEvent = {
      id: `pmtask_quick_${Date.now()}`,
      projectId: project.id,
      title: quickNoteText.trim(),
      description: 'Nota rápida creada desde el Centro de Control Ejecutivo',
      assignedTo: project.director || DEFAULT_CONTRACTORS[0].name,
      assignedRole: 'Dirección de Obra',
      startDate: todayStr,
      date: todayStr,
      type: 'task',
      priority: 'medium',
      status: 'pending',
      completed: false,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    onSaveTask(project.id, newTask);
    setQuickNoteText('');
    onShowToast('Nota rápida agregada al cronograma', 'Check');
  };

  // Filtered Tasks for "tasks" tab
  const filteredTasks = useMemo(() => {
    return (project?.calendarEvents || []).filter(task => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        const matchesAssignee = (task.assignedTo || '').toLowerCase().includes(q);
        const matchesSubtask = (task.subtasks || []).some(s => s.title.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesAssignee && !matchesSubtask) return false;
      }

      if (assigneeFilter !== 'all') {
        if ((task.assignedTo || '').trim() !== assigneeFilter) return false;
      }

      if (priorityFilter !== 'all') {
        if (task.priority !== priorityFilter) return false;
      }

      const alarms = getTaskAlarms(task, todayStr);
      const isDone = task.completed || task.status === 'completed';

      if (statusFilter === 'critical') return alarms.isCriticalDelay;
      if (statusFilter === 'upcoming') return alarms.isUpcomingDeadline;
      if (statusFilter === 'in_progress') return !isDone && (task.status === 'in_progress');
      if (statusFilter === 'pending') return !isDone && (!task.status || task.status === 'pending');
      if (statusFilter === 'completed') return isDone;

      return true;
    });
  }, [project?.calendarEvents, searchQuery, assigneeFilter, priorityFilter, statusFilter, todayStr]);

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#f8fafc] dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800/90 rounded-[36px] w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        
        {/* TOP DRIBBBLE-STYLE NAVBAR */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
          
          {/* LEFT: ICON & SEGMENTED TABS */}
          <div className="flex items-center gap-4">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-slate-950 shadow-md shrink-0"
              style={{ backgroundColor: neonColor }}
            >
              <Briefcase className="w-5 h-5" />
            </div>

            {/* Segmented Pill Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Gantt</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all relative ${
                  activeTab === 'tasks'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                <span>Tareas ({stats.totalTasks})</span>
                {stats.criticalDelayCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                  activeTab === 'calendar'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Calendario Mensual</span>
              </button>
            </div>
          </div>

          {/* RIGHT: TEAM AVATARS CLUSTER, + NUEVA TAREA & CLOSE */}
          <div className="flex items-center gap-3">
            
            {/* Team Avatars Cluster (Interactive) */}
            <div
              onClick={() => setIsContractorManagerOpen(true)}
              className="hidden md:flex items-center -space-x-2 pl-2 cursor-pointer hover:opacity-85 transition-opacity"
              title="Haz clic para gestionar cuadrillas y cambiar fotos del equipo"
            >
              {contractorList.slice(0, 4).map(c => (
                <ContractorAvatar
                  key={c.id}
                  avatarUrl={c.avatarUrl}
                  name={c.name}
                  color={c.color || neonColor}
                  sizeClassName="w-8 h-8"
                  ringClassName="ring-2 ring-white dark:ring-slate-900"
                  title={`${c.name} - ${c.role} (Clic para editar fotos)`}
                />
              ))}
              {contractorList.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-[10.5px] font-black text-slate-700 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center shadow-xs">
                  +{contractorList.length - 4}
                </div>
              )}
            </div>

            {/* Manage Contractors & Photos Button */}
            <button
              type="button"
              onClick={() => setIsContractorManagerOpen(true)}
              className="px-3 py-2 rounded-2xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
              title="Gestionar responsables y fotos de cuadrillas"
            >
              <Users className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">Equipo & Fotos</span>
            </button>

            {/* + Nueva Tarea Action Pill Button */}
            <button
              type="button"
              onClick={() => handleOpenNewTask()}
              className="px-4 py-2.5 rounded-2xl font-black text-xs text-slate-950 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all shrink-0"
              style={{ backgroundColor: neonColor }}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Tarea</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-2xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cerrar Project Manager"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* BODY CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          
          {/* TAB 1: EXECUTIVE DRIBBBLE DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TOP SECTION: GANTT MATRIX COMPONENT */}
              <PMGanttMatrix
                project={project}
                contractors={contractorList}
                neonColor={neonColor}
                viewDate={ganttViewDate}
                windowStartIndex={windowStartIndex}
                onPrevMonth={handleGanttPrevMonth}
                onNextMonth={handleGanttNextMonth}
                onToggleWindow={handleGanttToggleWindow}
                onSelectTask={handleEditTask}
                onQuickAddTask={(contractorName, dateStr) => handleOpenNewTask(dateStr, contractorName)}
                statusFilter={statusFilter}
                onStatusFilterChange={(val) => setStatusFilter(val as any)}
                onOpenContractorManager={() => setIsContractorManagerOpen(true)}
                onEditContractor={() => setIsContractorManagerOpen(true)}
                onOpenMilestonesConfig={onOpenMilestonesConfig}
                onSaveMilestone={onSaveMilestone}
              />

              {/* BOTTOM 3-COLUMN MODULAR SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1: FUTURE EVENTS / PRÓXIMOS HITOS (Matching reference image) */}
                <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/80 dark:border-slate-800/90 shadow-xl shadow-slate-200/40 dark:shadow-black/30 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-500" /> Próximos Hitos & Eventos
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                      >
                        Ver todos
                      </button>
                    </div>

                    {/* Featured Event Card (Golden / Amber styled card like in image) */}
                    {upcomingEvents.length > 0 && (
                      <div
                        onClick={() => handleEditTask(upcomingEvents[0])}
                        className="p-4 rounded-2xl bg-gradient-to-br from-amber-400/25 via-amber-500/20 to-orange-500/20 dark:from-amber-500/15 dark:to-orange-500/15 border border-amber-300/50 dark:border-amber-500/30 mb-3 cursor-pointer hover:scale-[1.01] transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Evento Destacado
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                            Prioritario
                          </span>
                        </div>
                        <h5 className="text-sm font-black text-slate-900 dark:text-white mb-1 line-clamp-1">
                          {upcomingEvents[0].title}
                        </h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3 line-clamp-1 font-medium">
                          {upcomingEvents[0].description || 'Coordinación en obra con la dirección técnica.'}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-amber-500/20 text-xs">
                          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{formatPMDate(upcomingEvents[0].date)}</span>
                            {upcomingEvents[0].time && <span>• {upcomingEvents[0].time} hs</span>}
                          </div>
                          {upcomingEvents[0].assignedTo && (
                            <ContractorAvatar
                              avatarUrl={getContractorProfile(upcomingEvents[0].assignedTo, undefined, contractorList).avatarUrl}
                              name={upcomingEvents[0].assignedTo}
                              color={getContractorProfile(upcomingEvents[0].assignedTo, undefined, contractorList).color}
                              sizeClassName="w-6 h-6"
                              ringClassName="ring-2 ring-white dark:ring-slate-900"
                              title={upcomingEvents[0].assignedTo}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Subsequent Regular Event Cards */}
                    <div className="space-y-2">
                      {upcomingEvents.slice(1, 3).map(evt => (
                        <div
                          key={evt.id}
                          onClick={() => handleEditTask(evt)}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h6 className="text-xs font-black text-slate-800 dark:text-white truncate">
                              {evt.title}
                            </h6>
                            <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-400 font-medium">
                              <span>{formatPMDate(evt.date)}</span>
                              {evt.time && <span>• {evt.time} hs</span>}
                            </div>
                          </div>

                          {evt.assignedTo && (
                            <ContractorAvatar
                              avatarUrl={getContractorProfile(evt.assignedTo, undefined, contractorList).avatarUrl}
                              name={evt.assignedTo}
                              color={getContractorProfile(evt.assignedTo, undefined, contractorList).color}
                              sizeClassName="w-7 h-7"
                              ringClassName="ring-1 ring-slate-200 dark:ring-slate-700"
                              className="shrink-0"
                              title={evt.assignedTo}
                            />
                          )}
                        </div>
                      ))}

                      {upcomingEvents.length === 0 && (
                        <p className="text-xs text-slate-400 py-6 text-center font-medium">
                          No hay eventos ni tareas programadas en esta obra.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{stats.upcomingDeadlineCount} tareas con vencimiento próximo</span>
                    <button
                      type="button"
                      onClick={() => handleOpenNewTask()}
                      className="font-black text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      + Agendar
                    </button>
                  </div>
                </div>

                {/* COLUMN 2: TEAM & CONTRACTORS / ONBOARDING (Matching 2x2 grid in reference) */}
                <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/80 dark:border-slate-800/90 shadow-xl shadow-slate-200/40 dark:shadow-black/30 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" /> Equipo & Cuadrillas
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsContractorManagerOpen(true)}
                        className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                        title="Editar integrantes y cambiar fotos"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar Equipo</span>
                      </button>
                    </div>

                    {/* 2x2 GRID OF CONTRACTORS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {contractorTeamCards.map(item => (
                        <div
                          key={item.contractor.id}
                          onClick={() => {
                            setAssigneeFilter(item.contractor.name);
                            setActiveTab('tasks');
                          }}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800 cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ContractorAvatar
                                avatarUrl={item.contractor.avatarUrl}
                                name={item.contractor.name}
                                color={item.contractor.color}
                                sizeClassName="w-9 h-9"
                                ringClassName="ring-2 shadow-xs"
                                className="shrink-0"
                              />
                              <div className="min-w-0">
                                <h6 className="text-xs font-black text-slate-800 dark:text-white truncate">
                                  {item.contractor.name}
                                </h6>
                                <p className="text-[10px] text-slate-400 truncate font-medium">
                                  {item.contractor.role}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsContractorManagerOpen(true);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Editar foto y rol"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                              <span>{item.doneCount}/{item.totalCount} tareas listas</span>
                              <span>{item.progressPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${item.progressPct}%`,
                                  backgroundColor: item.contractor.color
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>{stats.completedTasks} de {stats.totalTasks} tareas concluidas</span>
                    <span className="font-black text-slate-700 dark:text-slate-300">{stats.completionRatePct}% total</span>
                  </div>
                </div>

                {/* COLUMN 3: EXECUTIVE COMMAND CENTER WITH 3D GLASS ORB (Matching "Welcome Emily") */}
                <div className="bg-white dark:bg-[#0f172a] rounded-[28px] border border-slate-200/80 dark:border-slate-800/90 shadow-xl shadow-slate-200/40 dark:shadow-black/30 p-5 flex flex-col justify-between text-center">
                  <div>
                    {/* 3D Glassmorphic Orb Graphic */}
                    <div className="relative w-28 h-28 mx-auto my-2 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 to-cyan-400/30 blur-xl animate-pulse" />
                      <div className="relative w-22 h-22 rounded-full bg-gradient-to-br from-sky-300 via-blue-500 to-indigo-700 shadow-[inset_0_-8px_16px_rgba(0,0,0,0.4),0_12px_24px_rgba(2,132,199,0.35)] flex items-center justify-center overflow-hidden">
                        <div className="absolute top-2 left-3 w-8 h-4 rounded-full bg-white/70 blur-[1px] -rotate-45" />
                        <div className="absolute bottom-2 right-4 w-6 h-6 rounded-full bg-cyan-200/40 blur-[4px]" />
                        <Sparkles className="w-7 h-7 text-white/90 drop-shadow-md" />
                      </div>
                    </div>

                    <h4 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                      {project.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 max-w-xs mx-auto">
                      {stats.criticalDelayCount > 0
                        ? `Hay ${stats.criticalDelayCount} atraso(s) crítico(s) que requieren atención inmediata.`
                        : 'El cronograma de obra se encuentra al día y en sincronización activa.'}
                    </p>

                    {/* Quick Action Pill Buttons */}
                    <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => handleOpenNewTask()}
                        className="px-3 py-1.5 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all active:scale-95"
                      >
                        + Crear Tarea
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('calendar')}
                        className="px-3 py-1.5 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all active:scale-95"
                      >
                        Ver Calendario
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="px-3 py-1.5 rounded-full text-xs font-black bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all active:scale-95"
                      >
                        Subtareas ({stats.subtaskProgressPct}%)
                      </button>
                    </div>
                  </div>

                  {/* Quick Note Input Bar at Bottom (matching reference input) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700/60 focus-within:ring-2 focus-within:ring-cyan-500/30">
                      <input
                        type="text"
                        placeholder="Escribe una observación rápida..."
                        value={quickNoteText}
                        onChange={(e) => setQuickNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuickNoteSubmit();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenNewTask()}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Adjuntar archivo o crear tarea"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickNoteSubmit}
                        className="p-1.5 rounded-xl text-slate-950 font-black shadow-xs active:scale-95 transition-all"
                        style={{ backgroundColor: neonColor }}
                        title="Guardar nota"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: TASKS & SUBTASKS LIST */}
          {activeTab === 'tasks' && (
            <div className="space-y-4 animate-fade-in">
              {/* FILTERS & SEARCH BAR */}
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por título, gremio, responsable o subtarea..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="critical">🚨 Retraso Crítico</option>
                    <option value="upcoming">⏰ Cierre Próximo</option>
                    <option value="in_progress">⚡ En Curso</option>
                    <option value="pending">⏳ Pendientes</option>
                    <option value="completed">✅ Finalizadas</option>
                  </select>

                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="all">Todos los responsables</option>
                    {availableAssignees.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  >
                    <option value="all">Todas las prioridades</option>
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleOpenNewTask()}
                    className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-950 flex items-center gap-1.5 shadow-sm active:scale-95"
                    style={{ backgroundColor: neonColor }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear</span>
                  </button>
                </div>
              </div>

              {/* TASKS LIST */}
              <div className="space-y-3">
                {filteredTasks.map(task => {
                  const alarms = getTaskAlarms(task, todayStr);
                  const isDone = task.completed || task.status === 'completed';
                  const subtaskList = task.subtasks || [];
                  const subtasksDone = subtaskList.filter(s => s.completed).length;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-3xl bg-white dark:bg-slate-900 border transition-all hover:shadow-md ${
                        alarms.isCriticalDelay
                          ? 'border-rose-400 dark:border-rose-500/60 shadow-xs shadow-rose-950/20'
                          : alarms.isUpcomingDeadline
                          ? 'border-amber-300 dark:border-amber-500/50'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (onToggleTaskStatus) {
                                onToggleTaskStatus(project.id, task.id, isDone ? 'in_progress' : 'completed');
                              }
                            }}
                            className="mt-0.5 shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-400 hover:text-emerald-400 transition-colors" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-2 mb-1">
                              <h4 className={`text-sm font-black text-slate-900 dark:text-white truncate ${isDone ? 'line-through opacity-60' : ''}`}>
                                {task.title}
                              </h4>

                              {alarms.isCriticalDelay && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse flex items-center gap-1">
                                  <Flame className="w-3 h-3" /> Atraso Crítico (+{alarms.daysOverdue}d)
                                </span>
                              )}

                              {alarms.isUpcomingDeadline && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                                  Cierre en {alarms.daysUntilDeadline}d
                                </span>
                              )}

                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {task.priority?.toUpperCase() || 'MEDIA'}
                              </span>

                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                                (task.progress ?? (isDone ? 100 : 0)) >= 100
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  : (task.progress ?? 0) > 0
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
                              }`}>
                                {task.progress ?? (isDone ? 100 : 0)}% avance
                              </span>
                            </div>

                            {task.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                                <CalendarIcon className="w-3 h-3 text-cyan-500" />
                                {task.startDate ? `${formatPMDate(task.startDate)} al ` : 'Hasta: '}
                                {formatPMDate(task.date)}
                              </span>

                              {task.assignedTo && (
                                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                                  <ContractorAvatar
                                    avatarUrl={getContractorProfile(task.assignedTo, task.assignedRole, contractorList).avatarUrl}
                                    name={task.assignedTo}
                                    color={getContractorProfile(task.assignedTo, task.assignedRole, contractorList).color}
                                    sizeClassName="w-4 h-4"
                                    className="shrink-0"
                                  />
                                  <span>{task.assignedTo}</span>
                                  {task.assignedRole && <span className="text-slate-400">({task.assignedRole})</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Task Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {subtaskList.length > 0 && (
                            <span className="px-2 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {subtasksDone}/{subtaskList.length} subtareas
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEditTask(task)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Editar tarea"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(task)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Interactive Subtasks Accordion / Checklist */}
                      {subtaskList.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 pl-8 space-y-1.5">
                          {subtaskList.map(sub => (
                            <div
                              key={sub.id}
                              onClick={() => {
                                if (onToggleSubtask) {
                                  onToggleSubtask(project.id, task.id, sub.id);
                                }
                              }}
                              className="flex items-center gap-2 text-xs cursor-pointer text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                              {sub.completed ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span className={sub.completed ? 'line-through text-slate-400' : ''}>
                                {sub.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-slate-400">
                      No se encontraron tareas con los filtros seleccionados.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CALENDAR MONTHLY GRID */}
          {activeTab === 'calendar' && (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-cyan-500" /> Agenda Mensual Integrada
                </h3>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black px-2">
                    {MONTH_NAMES_ES[calDate.getMonth()]} {calDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {WEEKDAYS_ES.map((d, idx) => (
                  <div key={idx} className="text-[10px] font-black text-slate-400 uppercase py-1">
                    {d}
                  </div>
                ))}

                {(() => {
                  const year = calDate.getFullYear();
                  const month = calDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  let startDayIndex = firstDay.getDay() - 1;
                  if (startDayIndex === -1) startDayIndex = 6;
                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  const cells = [];
                  for (let i = 0; i < startDayIndex; i++) {
                    cells.push(<div key={`empty_${i}`} className="h-14 rounded-2xl bg-transparent" />);
                  }

                  for (let day = 1; day <= daysInMonth; day++) {
                    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayEvents = (project.calendarEvents || []).filter(e => e.date === dStr || (e.startDate && e.startDate <= dStr && e.date >= dStr));
                    const isSelected = calSelectedDateStr === dStr;
                    const isToday = todayStr === dStr;
                    const hasCritical = dayEvents.some(e => getTaskAlarms(e, todayStr).isCriticalDelay);

                    cells.push(
                      <div
                        key={`day_${day}`}
                        onClick={() => setCalSelectedDateStr(dStr)}
                        className={`h-14 p-1.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 font-black'
                            : 'border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[11px] font-bold ${isToday ? 'px-1.5 py-0.2 rounded-full bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {day}
                          </span>
                          {hasCritical && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          )}
                        </div>

                        <div className="flex items-center justify-center gap-1">
                          {dayEvents.slice(0, 3).map(e => (
                            <span
                              key={e.id}
                              className={`w-1.5 h-1.5 rounded-full ${
                                e.completed ? 'bg-emerald-500' : e.type === 'alarm' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return cells;
                })()}
              </div>

              {/* Daily Agenda Detail for Selected Day */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">
                    Tareas para el {formatPMDate(calSelectedDateStr)}
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleOpenNewTask(calSelectedDateStr)}
                    className="text-xs font-black text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    + Agregar en este día
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(project.calendarEvents || [])
                    .filter(e => e.date === calSelectedDateStr || (e.startDate && e.startDate <= calSelectedDateStr && e.date >= calSelectedDateStr))
                    .map(e => (
                      <div
                        key={e.id}
                        onClick={() => handleEditTask(e)}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${e.completed ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <span className="text-xs font-bold text-slate-800 dark:text-white">{e.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {e.assignedTo || 'Sin asignar'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* DRAWER / MODAL FOR CREATING AND EDITING TASKS */}
        {isEditorOpen && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-end animate-fade-in">
            <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-2xl overflow-y-auto custom-scrollbar">
              
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-slate-950 text-xs"
                      style={{ backgroundColor: neonColor }}
                    >
                      <Pencil className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {editingTaskId ? 'Editar Tarea' : 'Nueva Tarea de Obra'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveForm} className="space-y-4">
                  {/* Título */}
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Título de la Tarea / Evento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Llenado de Losa de Hormigón, Inspección AYSAM..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold placeholder-slate-400 focus:outline-none"
                    />
                  </div>

                  {/* Responsable y Rol */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Responsable / Cuadrilla
                      </label>
                      <select
                        value={assignedTo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignedTo(val);
                          const prof = getContractorProfile(val);
                          setAssignedRole(prof.role);
                        }}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      >
                        {availableAssignees.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Especialidad / Rol
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Capataz General, Estructura..."
                        value={assignedRole}
                        onChange={(e) => setAssignedRole(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Fechas: Inicio y Límite */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Fecha Límite (Deadline) *
                      </label>
                      <input
                        type="date"
                        required
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                  </div>

                  {/* Tipo, Prioridad y Estado */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Tipo
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as any)}
                        className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="task">Tarea Técnica</option>
                        <option value="alarm">Alarma</option>
                        <option value="event">Evento</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Prioridad
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="urgent">Urgente</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Estado
                      </label>
                      <select
                        value={status}
                        onChange={(e) => {
                          const newStatus = e.target.value as any;
                          setStatus(newStatus);
                          if (newStatus === 'completed') {
                            setProgress(100);
                          } else if (newStatus === 'pending' && progress === 100) {
                            setProgress(0);
                          } else if (newStatus === 'in_progress' && progress === 0) {
                            setProgress(25);
                          }
                        }}
                        className="w-full px-2.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in_progress">En Curso</option>
                        <option value="completed">Finalizada</option>
                      </select>
                    </div>
                  </div>

                  {/* SECTOR DE PORCENTAJE DE AVANCE (%) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Porcentaje de Avance en Gantt</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                          progress >= 100
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : progress >= 75
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : progress > 0
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                        }`}>
                          {progress}%
                        </span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={progress}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                            setProgress(val);
                            if (val >= 100) {
                              setStatus('completed');
                            } else if (val > 0) {
                              setStatus('in_progress');
                            } else if (status === 'completed') {
                              setStatus('pending');
                            }
                          }}
                          className="w-14 px-1.5 py-0.5 text-center text-xs font-black rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Barra deslizante (slider) de avance */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progress}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setProgress(val);
                          if (val >= 100) {
                            setStatus('completed');
                          } else if (val > 0) {
                            setStatus('in_progress');
                          } else if (status === 'completed') {
                            setStatus('pending');
                          }
                        }}
                        className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
                      />
                    </div>

                    {/* Botones de porcentaje rápido: 0%, 25%, 50%, 75%, 90%, 100% */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      {[0, 25, 50, 75, 90, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setProgress(pct);
                            if (pct >= 100) {
                              setStatus('completed');
                            } else if (pct > 0) {
                              setStatus('in_progress');
                            } else if (status === 'completed') {
                              setStatus('pending');
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                            progress === pct
                              ? 'bg-cyan-500 text-slate-950 shadow-md scale-105'
                              : 'bg-white dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>

                    {/* Rótulo explicativo del estado en el Diagrama de Gantt */}
                    <div className="text-[10px] font-medium pt-0.5">
                      {progress >= 100 ? (
                        <p className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
                          ✓ Finalizada (100%): Se proyectará en verde esmeralda en el Gantt.
                        </p>
                      ) : progress > 0 ? (
                        <p className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1">
                          ⚡ Con avance ({progress}%): Si quedan ≤ 3 días, se verá en naranja/ámbar como tarea bajo control sin titilar en rojo.
                        </p>
                      ) : (
                        <p className="text-rose-500 dark:text-rose-400 font-bold flex items-center gap-1">
                          ⚠️ 0% Sin avances: Si quedan ≤ 3 días o vence hoy, titilará en rojo como alarma crítica.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subtareas Checklist Manager */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                      Subtareas / Checklist ({subtasks.length})
                    </label>

                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Escribe una subtarea y presiona Enter..."
                        value={newSubtaskDraft}
                        onChange={(e) => setNewSubtaskDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtask();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold"
                      >
                        + Agregar
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {subtasks.map(sub => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleSubtaskInForm(sub.id)}
                            className="flex items-center gap-2 text-left min-w-0 flex-1"
                          >
                            {sub.completed ? (
                              <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className={`text-xs truncate ${sub.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                              {sub.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(sub.id)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Descripción / Notas */}
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Descripción o Instrucciones Técnicas
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre materiales, condiciones o especificaciones..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    {editingTaskId && (
                      <button
                        type="button"
                        onClick={() => {
                          const t = (project.calendarEvents || []).find(e => e.id === editingTaskId);
                          if (t) handleDelete(t);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        Eliminar Tarea
                      </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(false)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl text-xs font-black text-slate-950 shadow-md active:scale-95 transition-all"
                        style={{ backgroundColor: neonColor }}
                      >
                        {editingTaskId ? 'Guardar Cambios' : 'Crear Tarea'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* MODAL PARA GESTIÓN Y EDICIÓN DE CONTRATISTAS Y FOTOS */}
        {isContractorManagerOpen && (
          <ContractorManagerModal
            isOpen={isContractorManagerOpen}
            project={project}
            contractors={contractorList}
            neonColor={neonColor}
            onClose={() => setIsContractorManagerOpen(false)}
            onSaveContractors={handleSaveContractorsList}
            onShowToast={onShowToast}
          />
        )}

      </div>
    </div>
  );
}
