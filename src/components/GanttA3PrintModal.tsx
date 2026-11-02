import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  X,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  User,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { Project, ProjectCalendarEvent } from '../types';
import { getTodayString, getDaysDiff, formatPMDate, getTaskAlarms } from '../utils/pmCalculations';
import { getProjectContractors } from '../utils/pmContractors';

interface GanttA3PrintModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  directorName?: string;
}

export function GanttA3PrintModal({
  isOpen,
  project,
  onClose,
  directorName = 'Arq. Venier Gastón'
}: GanttA3PrintModalProps) {
  const todayStr = useMemo(() => getTodayString(), []);

  // Filter mode: 'from_today' (from current date to end of work) or 'full_history'
  const [filterMode, setFilterMode] = useState<'from_today' | 'full_history'>('from_today');
  const [selectedContractor, setSelectedContractor] = useState<string>('all');
  const [paperFormat, setPaperFormat] = useState<'a3' | 'a4'>('a3');

  // Prevent background scroll and add body print class
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('gantt-print-modal-open');
      return () => {
        document.body.classList.remove('gantt-print-modal-open');
      };
    }
  }, [isOpen]);

  const allEvents = project.calendarEvents || [];
  const contractors = getProjectContractors(project);

  // Filter tasks according to selected mode
  const filteredTasks = useMemo(() => {
    return allEvents.filter(t => {
      const sDate = (t.startDate || t.date || '').split('T')[0];
      const eDate = (t.date || t.startDate || '').split('T')[0];

      if (filterMode === 'from_today') {
        const isCompleted = Boolean(t.completed || t.status === 'completed' || (t.progress !== undefined && t.progress >= 100));
        // Keep if ends today or in the future, or if not completed
        if (eDate < todayStr && isCompleted) return false;
      }

      if (selectedContractor !== 'all') {
        const assigned = (t.assignedTo || '').trim().toLowerCase();
        if (assigned !== selectedContractor.trim().toLowerCase()) return false;
      }

      return true;
    }).sort((a, b) => {
      const aStart = (a.startDate || a.date || '').split('T')[0];
      const bStart = (b.startDate || b.date || '').split('T')[0];
      return aStart.localeCompare(bStart);
    });
  }, [allEvents, filterMode, selectedContractor, todayStr]);

  // Compute timeline boundaries
  const timelineDates = useMemo(() => {
    const dates: string[] = [todayStr];
    filteredTasks.forEach(t => {
      if (t.startDate) dates.push(t.startDate.split('T')[0]);
      if (t.date) dates.push(t.date.split('T')[0]);
    });

    dates.sort();
    let minDateStr = filterMode === 'from_today' ? todayStr : (dates[0] || todayStr);
    let maxDateStr = dates[dates.length - 1] || todayStr;

    // Minimum timeline span: at least 30 days
    const minD = new Date(minDateStr + 'T00:00:00');
    let maxD = new Date(maxDateStr + 'T00:00:00');
    const diffDays = Math.round((maxD.getTime() - minD.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 30) {
      maxD = new Date(minD.getTime() + 30 * 24 * 60 * 60 * 1000);
      maxDateStr = maxD.toISOString().split('T')[0];
    }

    // Generate weekly markers
    const totalDays = Math.max(1, Math.round((maxD.getTime() - minD.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const weeks: { weekNum: number; startDateStr: string; label: string; leftPct: number; widthPct: number }[] = [];

    let cur = new Date(minD);
    let weekCounter = 1;
    while (cur <= maxD) {
      const wStart = new Date(cur);
      const wEnd = new Date(cur.getTime() + 6 * 24 * 60 * 60 * 1000);
      const offsetDays = Math.round((wStart.getTime() - minD.getTime()) / (1000 * 60 * 60 * 24));
      const leftPct = (offsetDays / totalDays) * 100;
      const widthPct = (7 / totalDays) * 100;

      const mName = wStart.toLocaleDateString('es-ES', { month: 'short' });
      weeks.push({
        weekNum: weekCounter++,
        startDateStr: wStart.toISOString().split('T')[0],
        label: `${wStart.getDate()} ${mName}`,
        leftPct: Math.min(100, Math.max(0, leftPct)),
        widthPct: Math.min(100 - leftPct, widthPct)
      });
      cur.setDate(cur.getDate() + 7);
    }

    return {
      minDateStr,
      maxDateStr,
      minD,
      maxD,
      totalDays,
      weeks
    };
  }, [filteredTasks, filterMode, todayStr]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const completedCount = filteredTasks.filter(t => t.completed || t.status === 'completed' || (t.progress !== undefined && t.progress >= 100)).length;
  const criticalCount = filteredTasks.filter(t => {
    const dDiff = getDaysDiff(t.date || t.startDate, todayStr);
    const prog = t.progress !== undefined ? t.progress : 0;
    return (dDiff < 0 || (dDiff <= 5 && prog < 50)) && !t.completed && t.status !== 'completed';
  }).length;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex flex-col p-2 sm:p-4 overflow-y-auto gantt-print-backdrop"
      onClick={onClose}
    >
      {/* Controls Bar (Excluded from printing via no-print) */}
      <div
        className="no-print max-w-7xl w-full mx-auto bg-[#101D30] border border-[#29384C] rounded-2xl p-4 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">
              Planilla Gantt & Cronograma de Obra (Hoja Apaisada A3)
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Vista física extendida de tareas y cuadrillas técnicas para impresión y dirección de obra
            </p>
          </div>
        </div>

        {/* Filter Switch */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-[#081321] p-1 rounded-xl border border-[#29384C]">
            <button
              type="button"
              onClick={() => setFilterMode('from_today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                filterMode === 'from_today'
                  ? 'bg-cyan-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📅 Desde Hoy hasta Final de Obra
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('full_history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                filterMode === 'full_history'
                  ? 'bg-cyan-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Historial Completo
            </button>
          </div>

          {/* Paper Size selector */}
          <div className="inline-flex items-center bg-[#081321] p-1 rounded-xl border border-[#29384C]">
            <button
              type="button"
              onClick={() => setPaperFormat('a3')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                paperFormat === 'a3'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Formato óptimo para tableros y planos de obra"
            >
              Hoja A3 Apaisada
            </button>
            <button
              type="button"
              onClick={() => setPaperFormat('a4')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all ${
                paperFormat === 'a4'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              A4 Apaisada
            </button>
          </div>

          {/* Contractor filter */}
          <select
            value={selectedContractor}
            onChange={e => setSelectedContractor(e.target.value)}
            className="bg-[#081321] border border-[#29384C] rounded-xl px-3 py-1.5 text-xs text-white outline-none font-medium"
          >
            <option value="all">Todas las Cuadrillas ({contractors.length})</option>
            {contractors.map(c => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar en PDF ({paperFormat.toUpperCase()})</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#17263B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div
        className="gantt-print-dialog max-w-7xl w-full mx-auto bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-300 overflow-x-auto"
        onClick={e => e.stopPropagation()}
        style={{ minWidth: '950px' }}
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                Planilla Oficial de Obra
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                Formato {paperFormat.toUpperCase()} Apaisado
              </span>
              <span className="text-xs text-slate-500 font-bold">
                {filterMode === 'from_today' ? '• Desde Hoy hasta Finalización' : '• Cronograma Total'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs text-slate-600 font-semibold">
              Ubicación: {project.location || 'Obra en ejecución'} • Dirección Técnica: {directorName}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-mono font-bold text-slate-700">
              Fecha de Emisión: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Período Impreso: {formatPMDate(timelineDates.minDateStr)} — {formatPMDate(timelineDates.maxDateStr)} ({timelineDates.totalDays} días)
            </p>
            <div className="flex items-center justify-end gap-3 mt-1.5 text-xs font-bold">
              <span className="text-slate-700">{filteredTasks.length} tareas</span>
              <span className="text-emerald-700">{completedCount} listas</span>
              {criticalCount > 0 && (
                <span className="text-rose-700 font-black">¡{criticalCount} críticas / atrasadas!</span>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between gap-4 bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-xs mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-bold text-slate-700">Referencias:</span>
            <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 inline-block" />
              100% Completada
            </span>
            <span className="flex items-center gap-1.5 text-cyan-800 font-semibold">
              <span className="w-3.5 h-3.5 rounded bg-cyan-500 border border-cyan-600 inline-block" />
              En Curso al Día
            </span>
            <span className="flex items-center gap-1.5 text-amber-800 font-semibold">
              <span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500 inline-block" />
              Quedan ≤ 5d con avance
            </span>
            <span className="flex items-center gap-1.5 text-rose-800 font-black">
              <span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-700 inline-block" />
              ¡Crítica / Por Vencer sin avances!
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">
            Línea roja discontinua = Día de Hoy ({todayStr})
          </span>
        </div>

        {/* Timeline Matrix */}
        <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs mb-6">
          {/* Header Row: Weeks / Time Axis */}
          <div className="flex border-b border-slate-300 bg-slate-100 text-slate-800 text-[10px] font-black">
            <div className="w-64 p-2 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-700">
              Responsable & Labor
            </div>
            <div className="w-36 p-2 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-700 text-center">
              Plazo / Fechas
            </div>
            <div className="w-20 p-2 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-700 text-center">
              Avance
            </div>
            {/* Visual Timeline Header */}
            <div className="flex-1 relative h-8 flex items-center">
              {timelineDates.weeks.map(w => (
                <div
                  key={w.weekNum}
                  style={{ left: `${w.leftPct}%`, width: `${w.widthPct}%` }}
                  className="absolute top-0 bottom-0 border-r border-slate-300 px-1 py-1 text-center truncate text-[9px] font-mono text-slate-700 bg-slate-100/90"
                >
                  <span className="block font-black leading-none">Sem {w.weekNum}</span>
                  <span className="text-[7.5px] text-slate-500 leading-none">{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-slate-200">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hay tareas que coincidan con el filtro seleccionado.
              </div>
            ) : (
              filteredTasks.map(task => {
                const sDate = (task.startDate || task.date || todayStr).split('T')[0];
                const eDate = (task.date || task.startDate || todayStr).split('T')[0];
                const taskStart = sDate <= eDate ? sDate : eDate;
                const taskEnd = sDate <= eDate ? eDate : sDate;

                const startD = new Date(taskStart + 'T00:00:00');
                const endD = new Date(taskEnd + 'T00:00:00');

                const totalTimelineDays = timelineDates.totalDays;
                const minTimelineD = timelineDates.minD;

                const offsetStartDays = Math.max(0, Math.round((startD.getTime() - minTimelineD.getTime()) / (1000 * 60 * 60 * 24)));
                const taskSpanDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1);

                const leftPct = Math.min(100, Math.max(0, (offsetStartDays / totalTimelineDays) * 100));
                const widthPct = Math.min(100 - leftPct, Math.max(1.5, (taskSpanDays / totalTimelineDays) * 100));

                const taskProgress = task.progress !== undefined ? task.progress : (task.completed || task.status === 'completed' ? 100 : 0);
                const isDone = Boolean(task.completed || task.status === 'completed' || taskProgress >= 100);
                const daysDiff = getDaysDiff(taskEnd, todayStr);
                const isOverdue = daysDiff < 0 && !isDone;
                const isApproaching = daysDiff >= 0 && daysDiff <= 5;
                const isCriticalNoProgress = !isDone && (isOverdue || (isApproaching && taskProgress < 50) || task.type === 'alarm');

                let barColor = 'bg-cyan-500 text-slate-950 border-cyan-600';
                if (isDone) {
                  barColor = 'bg-emerald-500 text-white border-emerald-600';
                } else if (isCriticalNoProgress) {
                  barColor = 'bg-rose-600 text-white border-rose-700 font-black';
                } else if (isApproaching && taskProgress >= 50) {
                  barColor = 'bg-amber-400 text-slate-950 border-amber-500 font-bold';
                }

                return (
                  <div key={task.id} className="flex items-center hover:bg-slate-50 transition-colors text-xs">
                    {/* Contractor & Task name */}
                    <div className="w-64 p-2 border-r border-slate-200 shrink-0">
                      <p className="font-black text-slate-900 leading-tight truncate">
                        {task.title}
                      </p>
                      <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
                        <span className="font-bold text-slate-800">{task.assignedTo || 'Cuadrilla General'}</span>
                        {task.assignedRole && ` • ${task.assignedRole}`}
                      </p>
                    </div>

                    {/* Dates & duration */}
                    <div className="w-36 p-2 border-r border-slate-200 shrink-0 text-center font-mono text-[10px]">
                      <span className="block font-bold text-slate-800 leading-tight">
                        {formatPMDate(taskStart)} al {formatPMDate(taskEnd)}
                      </span>
                      <span className="text-slate-500 text-[9px]">
                        {taskSpanDays}d {daysDiff < 0 ? `(Atraso ${Math.abs(daysDiff)}d)` : `(${daysDiff}d rest.)`}
                      </span>
                    </div>

                    {/* Progress % */}
                    <div className="w-20 p-2 border-r border-slate-200 shrink-0 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isCriticalNoProgress
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                          : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                      }`}>
                        {taskProgress}%
                      </span>
                    </div>

                    {/* Visual Gantt Bar */}
                    <div className="flex-1 relative h-9 flex items-center px-1">
                      {/* Today vertical line */}
                      {timelineDates.minDateStr <= todayStr && todayStr <= timelineDates.maxDateStr && (
                        <div
                          style={{
                            left: `${((new Date(todayStr + 'T00:00:00').getTime() - timelineDates.minD.getTime()) / (timelineDates.totalDays * 24 * 60 * 60 * 1000)) * 100}%`
                          }}
                          className="absolute top-0 bottom-0 w-[2px] border-l-2 border-dashed border-rose-500 z-10 pointer-events-none"
                        />
                      )}

                      {/* Bar */}
                      <div
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`absolute h-5 rounded-md px-1.5 flex items-center justify-between text-[9px] font-black shadow-xs border truncate ${barColor}`}
                      >
                        <span className="truncate">{task.title}</span>
                        <span className="ml-1 opacity-90">{taskProgress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Technical Signatures Footer */}
        <div className="pt-6 border-t-2 border-slate-900 mt-6 grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 h-12 mb-2" />
            <p className="font-black text-slate-900">{directorName}</p>
            <p className="text-[10px] text-slate-600">Dirección Técnica / Jefatura de Obra</p>
          </div>
          <div>
            <div className="border-b border-slate-400 h-12 mb-2" />
            <p className="font-black text-slate-900">Capataz General de Obra</p>
            <p className="text-[10px] text-slate-600">Coordinación de Cuadrillas</p>
          </div>
          <div>
            <div className="border-b border-slate-400 h-12 mb-2" />
            <p className="font-black text-slate-900">Inspección Técnica / Auditoría</p>
            <p className="text-[10px] text-slate-600">Recepción de Tareas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
