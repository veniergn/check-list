import { ProjectCalendarEvent, ProjectManagerAlarms, PMTaskStatus } from '../types';

/**
 * Devuelve la fecha de hoy en formato 'YYYY-MM-DD' en la zona horaria local.
 */
export function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calcula la diferencia en días enteros entre dos fechas en formato 'YYYY-MM-DD' (dateA - dateB).
 */
export function getDaysDiff(dateA: string, dateB: string): number {
  try {
    const [yA, mA, dA] = dateA.split('-').map(Number);
    const [yB, mB, dB] = dateB.split('-').map(Number);
    const timeA = new Date(yA, mA - 1, dA).getTime();
    const timeB = new Date(yB, mB - 1, dB).getTime();
    return Math.round((timeA - timeB) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Evalúa el estado de alarmas inteligentes automáticas para una tarea dada:
 * 1. Retraso Crítico (Deadline superado e incompleta)
 * 2. Cierre Próximo (Vence dentro de 3 días)
 * 3. Inicio Vencido (Fecha de inicio pasada y sigue en pendiente)
 */
export function getTaskAlarms(task: ProjectCalendarEvent, referenceToday?: string): ProjectManagerAlarms {
  const today = referenceToday || getTodayString();
  const isDone = task.completed || task.status === 'completed';

  const defaultAlarms: ProjectManagerAlarms = {
    isOverdueStart: false,
    isUpcomingDeadline: false,
    isCriticalDelay: false,
    daysOverdue: 0,
    daysUntilDeadline: 0
  };

  if (isDone) {
    return defaultAlarms;
  }

  // 1. Evaluación de fecha límite (deadline / task.date)
  if (task.date) {
    const diff = getDaysDiff(task.date, today); // diff > 0 -> futuro, diff < 0 -> pasado, diff == 0 -> hoy
    if (diff < 0) {
      defaultAlarms.isCriticalDelay = true;
      defaultAlarms.daysOverdue = Math.abs(diff);
    } else if (diff <= 3) {
      defaultAlarms.isUpcomingDeadline = true;
      defaultAlarms.daysUntilDeadline = diff;
    }
  }

  // 2. Evaluación de inicio vencido
  if (task.startDate && (!task.status || task.status === 'pending')) {
    const startDiff = getDaysDiff(task.startDate, today);
    if (startDiff < 0) {
      defaultAlarms.isOverdueStart = true;
    }
  }

  return defaultAlarms;
}

export interface ProjectPMStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  criticalDelayCount: number;
  upcomingDeadlineCount: number;
  overdueStartCount: number;
  totalSubtasks: number;
  completedSubtasks: number;
  subtaskProgressPct: number;
  completionRatePct: number;
  byAssignee: Record<string, { total: number; completed: number; critical: number; inProgress: number; role?: string }>;
  criticalTasks: ProjectCalendarEvent[];
  upcomingTasks: ProjectCalendarEvent[];
}

/**
 * Genera el resumen ejecutivo global de Project Manager para una obra.
 */
export function calculateProjectPMStats(events: ProjectCalendarEvent[] = [], referenceToday?: string): ProjectPMStats {
  const today = referenceToday || getTodayString();

  let totalTasks = 0;
  let completedTasks = 0;
  let inProgressTasks = 0;
  let pendingTasks = 0;
  let blockedTasks = 0;

  let criticalDelayCount = 0;
  let upcomingDeadlineCount = 0;
  let overdueStartCount = 0;

  let totalSubtasks = 0;
  let completedSubtasks = 0;

  const byAssignee: Record<string, { total: number; completed: number; critical: number; inProgress: number; role?: string }> = {};
  const criticalTasks: ProjectCalendarEvent[] = [];
  const upcomingTasks: ProjectCalendarEvent[] = [];

  events.forEach(task => {
    totalTasks++;

    const isDone = task.completed || task.status === 'completed';
    const status: PMTaskStatus = task.status || (task.completed ? 'completed' : 'pending');

    if (isDone) {
      completedTasks++;
    } else if (status === 'in_progress') {
      inProgressTasks++;
    } else if (status === 'blocked') {
      blockedTasks++;
    } else {
      pendingTasks++;
    }

    // Subtareas
    if (task.subtasks && task.subtasks.length > 0) {
      task.subtasks.forEach(sub => {
        totalSubtasks++;
        if (sub.completed) completedSubtasks++;
      });
    }

    // Alarmas
    const alarms = getTaskAlarms(task, today);
    if (alarms.isCriticalDelay) {
      criticalDelayCount++;
      criticalTasks.push(task);
    } else if (alarms.isUpcomingDeadline) {
      upcomingDeadlineCount++;
      upcomingTasks.push(task);
    }

    if (alarms.isOverdueStart) {
      overdueStartCount++;
    }

    // Asignados
    const assigneeKey = task.assignedTo?.trim() || 'Sin asignar';
    if (!byAssignee[assigneeKey]) {
      byAssignee[assigneeKey] = {
        total: 0,
        completed: 0,
        critical: 0,
        inProgress: 0,
        role: task.assignedRole
      };
    }
    byAssignee[assigneeKey].total++;
    if (isDone) byAssignee[assigneeKey].completed++;
    if (status === 'in_progress') byAssignee[assigneeKey].inProgress++;
    if (alarms.isCriticalDelay) byAssignee[assigneeKey].critical++;
    if (task.assignedRole && !byAssignee[assigneeKey].role) {
      byAssignee[assigneeKey].role = task.assignedRole;
    }
  });

  const completionRatePct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const subtaskProgressPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  criticalTasks.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  upcomingTasks.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    blockedTasks,
    criticalDelayCount,
    upcomingDeadlineCount,
    overdueStartCount,
    totalSubtasks,
    completedSubtasks,
    subtaskProgressPct,
    completionRatePct,
    byAssignee,
    criticalTasks,
    upcomingTasks
  };
}

/**
 * Da formato amigable a una fecha (ej. 25 Sep 2026).
 */
export function formatPMDate(dateStr?: string): string {
  if (!dateStr) return 'Sin fecha';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d} ${months[m - 1]} ${y}`;
  } catch {
    return dateStr;
  }
}
