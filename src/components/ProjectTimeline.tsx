import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Flame,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  Building2,
  Wrench,
  X,
  MapPin,
  MoveHorizontal,
  Flag,
  Target,
  TrendingUp,
  TrendingDown,
  Milestone as MilestoneIcon,
  Pencil,
  Award
} from 'lucide-react';
import { Project, Milestone } from '../types';
import { calculateMilestoneProgress, MilestoneCalculationResult } from '../utils/milestones';
import { getProjectConsolidatedStats } from '../utils/calculations';

interface ProjectTimelineProps {
  project: Project;
  onOpenMilestonesConfig: (projectId: string) => void;
  onToggleManualMilestone?: (projectId: string, milestoneId: string) => void;
  onUpdateMilestoneProgress?: (projectId: string, milestoneId: string, percentage: number) => void;
  compact?: boolean;
  onSelectUnit?: (unitId: string) => void;
  onUpdateProjectDates?: (projectId: string, startDate: string, estimatedEndDate: string) => void;
}

export function ProjectTimeline({
  project,
  onOpenMilestonesConfig,
  onToggleManualMilestone,
  onUpdateMilestoneProgress,
  compact = false,
  onSelectUnit,
  onUpdateProjectDates
}: ProjectTimelineProps) {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showUnitsBreakdown, setShowUnitsBreakdown] = useState(false);
  const [isEditingDatesModalOpen, setIsEditingDatesModalOpen] = useState(false);
  const [timelineViewMode, setTimelineViewMode] = useState<'gantt' | 'nodes'>('gantt');

  // Form states for schedule dates editor
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const todayMilestoneMarkerRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // 1. CONSOLIDATED PHYSICAL PROGRESS CALCULATION
  // Formula: Avance Global (%) = (Suma de todos los porcentajes de ítems de todas las unidades) / (Total de ítems)
  // ==========================================
  const stats = getProjectConsolidatedStats(project);
  const physicalProgress = stats.globalPercentage;
  const remainingPercentage = stats.remainingPercentage;

  // ==========================================
  // 2. CALENDAR DATES & TIME ELAPSED ("HOY")
  // ==========================================
  const milestones: Milestone[] = project.milestones || [];

  const startDateStr = project.startDate || project.createdAt?.split('T')[0] || '2026-08-01';

  const getDerivedEndDate = (): string => {
    if (project.estimatedEndDate) return project.estimatedEndDate;
    if (milestones.length > 0) {
      const dates = milestones.map(m => m.targetDate).filter(Boolean).sort();
      if (dates.length > 0) return dates[dates.length - 1];
    }
    const d = new Date(startDateStr);
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  };

  const endDateStr = getDerivedEndDate();

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const totalDurationDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.round((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const timeElapsedPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDurationDays) * 100)));

  // Natural language duration helper
  const formatNaturalDuration = (days: number): string => {
    if (days <= 0) return '0 días';
    const months = Math.round(days / 30.4375);
    if (days < 30) return `${days} días`;
    if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    if (remMonths === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years} ${years === 1 ? 'año' : 'años'} y ${remMonths} ${remMonths === 1 ? 'mes' : 'meses'}`;
  };

  const naturalTotalDuration = formatNaturalDuration(totalDurationDays);
  const naturalElapsedDuration = formatNaturalDuration(daysElapsed);
  const naturalRemainingDuration = formatNaturalDuration(daysRemaining);

  // Progress diagnosis: Physical vs Calendar
  const progressDiff = physicalProgress - timeElapsedPercent;
  const isOptimal = progressDiff >= 0;
  const delayGap = Math.abs(progressDiff);

  // Format date helper
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'A definir';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Open date editor modal
  const handleOpenDatesModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditStartDate(startDateStr);
    setEditEndDate(endDateStr);
    setIsEditingDatesModalOpen(true);
  };

  const handleSaveDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProjectDates && editStartDate && editEndDate) {
      onUpdateProjectDates(project.id, editStartDate, editEndDate);
    }
    setIsEditingDatesModalOpen(false);
  };

  // Quick preset buttons for dates
  const handleSetEndPresetMonths = (monthsToAdd: number) => {
    const base = editStartDate ? new Date(editStartDate) : new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    setEditEndDate(base.toISOString().split('T')[0]);
  };

  // ==========================================
  // 3. MILESTONES & ALARMS CALCULATIONS
  // ==========================================
  const calculatedResults: MilestoneCalculationResult[] = milestones.map(m =>
    calculateMilestoneProgress(m, project)
  );

  calculatedResults.sort((a, b) => {
    const dateA = a.milestone.targetDate || '';
    const dateB = b.milestone.targetDate || '';
    return dateA.localeCompare(dateB);
  });

  const redAlarmsCount = calculatedResults.filter(r => r.status === 'alarm_red').length;
  const warningCount = calculatedResults.filter(r => r.status === 'warning_yellow').length;
  const completedCount = calculatedResults.filter(r => r.status === 'success_green').length;

  const activeResult = calculatedResults.find(r => r.milestone.id === selectedMilestoneId);

  // Gantt timeline bounds (start and end timestamps)
  const nowMs = Date.now();
  const allTimestamps: number[] = [
    isFinite(startDate.getTime()) ? startDate.getTime() : nowMs,
    isFinite(endDate.getTime()) ? endDate.getTime() : nowMs + 30 * 24 * 60 * 60 * 1000,
    nowMs
  ];

  milestones.forEach(m => {
    if (m.startDate) {
      const t = new Date(m.startDate).getTime();
      if (isFinite(t)) allTimestamps.push(t);
    }
    const targetStr = m.targetDate || m.endDate;
    if (targetStr) {
      const t = new Date(targetStr).getTime();
      if (isFinite(t)) allTimestamps.push(t);
    }
  });

  const validTimestamps = allTimestamps.filter(t => typeof t === 'number' && !isNaN(t) && isFinite(t));
  if (validTimestamps.length === 0) validTimestamps.push(nowMs);
  const rawGanttStartMs = Math.min(...validTimestamps);
  const rawGanttEndMs = Math.max(...validTimestamps);
  // Pad with 3 days before and 5 days after
  const ganttStartMs = rawGanttStartMs - (3 * 24 * 60 * 60 * 1000);
  const ganttEndMs = rawGanttEndMs + (5 * 24 * 60 * 60 * 1000);
  const ganttTotalDurationMs = Math.max(1, ganttEndMs - ganttStartMs);

  const rawTodayLeft = ((today.getTime() - ganttStartMs) / ganttTotalDurationMs) * 100;
  const ganttTodayLeft = isFinite(rawTodayLeft) ? Math.max(0, Math.min(100, rawTodayLeft)) : 50;

  // 5 scale markers for Gantt header
  const ganttScaleMarkers = [0, 0.25, 0.5, 0.75, 1].map(fraction => {
    const time = ganttStartMs + (fraction * ganttTotalDurationMs);
    const d = new Date(time);
    const dateFormatted = isFinite(d.getTime())
      ? d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      : '';
    return {
      leftPercent: fraction * 100,
      label: dateFormatted
    };
  });

  // Find closest milestone to today for auto-scroll
  const todayTime = new Date(todayStr).getTime();
  let closestIndex = 0;
  let minDiff = Infinity;
  calculatedResults.forEach((r, idx) => {
    const dTime = new Date(r.milestone.targetDate || todayStr).getTime();
    const diff = Math.abs(dTime - todayTime);
    if (diff < minDiff) {
      minDiff = diff;
      closestIndex = idx;
    }
  });

  // Auto-center scroll on today / active milestone
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const marker = todayMilestoneMarkerRef.current;
      if (marker) {
        const markerLeft = marker.offsetLeft;
        const markerWidth = marker.clientWidth;
        const containerWidth = container.clientWidth;
        const targetScroll = markerLeft - (containerWidth / 2) + (markerWidth / 2);

        setTimeout(() => {
          container.scrollTo({
            left: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        }, 120);
      }
    }
  }, [project.id, calculatedResults.length]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-2xl border transition-all ${
        !isOptimal || redAlarmsCount > 0
          ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
      } ${compact ? 'p-3 my-2' : 'p-4 my-3'}`}
    >
      {/* ========================================================= */}
      {/* SECCIÓN 1: CAMINO A LA CULMINACIÓN (BARRA FÍSICA VS HOY) */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {/* Header Bar with Diagnostic Status Pill */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <MilestoneIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Camino a la Culminación
            </span>

            {/* Quick Diagnostic Badge */}
            {isOptimal ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Ritmo Óptimo hacia la Culminación</span>
                {progressDiff > 0 && (
                  <span className="bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 px-1 py-0.2 rounded font-mono text-[10px]">
                    +{progressDiff}%
                  </span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 shadow-2xs animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Demorado para la Culminación</span>
                <span className="bg-rose-200/90 dark:bg-rose-900/90 text-rose-950 dark:text-rose-100 px-1.5 py-0.2 rounded font-mono text-[10px] font-black">
                  faltan {delayGap}% para igualar el cronograma
                </span>
              </span>
            )}
          </div>

          {/* Action buttons: Edit Dates & Manage Milestones */}
          <div className="flex items-center gap-1.5 ml-auto">
            {onUpdateProjectDates && (
              <button
                type="button"
                onClick={handleOpenDatesModal}
                className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="Ajustar fecha de inicio y fecha estimada de entrega"
              >
                <Pencil className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span className="hidden sm:inline">Ajustar Plazos</span>
                <span className="sm:hidden">Plazos</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMilestonesConfig(project.id);
              }}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
              title="Configurar hitos críticos y fechas límite"
            >
              <Sliders className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              <span className="hidden sm:inline">Gestionar Hitos</span>
              <span className="sm:hidden">Hitos</span>
            </button>
          </div>
        </div>

        {/* Visual Progress Track Highway (0% to 100%) */}
        <div className="bg-slate-900/95 text-white p-3.5 sm:p-4 rounded-2xl shadow-inner relative overflow-hidden border border-slate-800">
          {/* Top Dates & Scale Labels */}
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 mb-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="font-bold text-white">Inicio (0%)</span>
              <span className="text-slate-400 font-mono hidden sm:inline">• {formatDateLabel(startDateStr)}</span>
            </div>

            {/* Finish Goal Badge in Top-Right */}
            <div className="flex items-center gap-1.5">
              {physicalProgress >= 100 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500 text-white font-black text-xs shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                  ¡100% Culminada!
                </span>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                  <Flag className="w-3.5 h-3.5 text-slate-950" />
                  <span>Resta {remainingPercentage}% para entrega final</span>
                </div>
              )}
            </div>
          </div>

          {/* MAIN HORIZONTAL PROGRESS HIGHWAY */}
          <div className="relative pt-6 pb-6 my-1">
            {/* Background Track Channel */}
            <div className="w-full h-6 sm:h-7 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 relative shadow-inner">
              {/* FILLED PHYSICAL ADVANCE BAR */}
              <div
                style={{ width: `${Math.min(100, Math.max(1, physicalProgress))}%` }}
                className={`h-full rounded-full transition-all duration-700 ease-out relative flex items-center justify-end pr-2.5 ${
                  isOptimal
                    ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                    : 'bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 shadow-[0_0_16px_rgba(244,63,94,0.5)]'
                }`}
              >
                {/* Diagonal striped shimmer effect */}
                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-70" />

                {/* Percentage label inside bar if enough space */}
                {physicalProgress >= 12 && (
                  <span className="relative z-10 font-mono font-black text-[11px] text-white drop-shadow-md">
                    {physicalProgress}%
                  </span>
                )}
              </div>
            </div>

            {/* FLOATING PHYSICAL ADVANCE POINTER HEAD */}
            <div
              style={{ left: `${Math.min(98, Math.max(2, physicalProgress))}%` }}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none transition-all duration-700 ease-out"
            >
              <div
                className={`px-2 py-0.5 rounded-full font-mono font-black text-[10px] shadow-lg flex items-center gap-1 whitespace-nowrap ${
                  isOptimal
                    ? 'bg-emerald-500 text-white border border-emerald-300'
                    : 'bg-rose-500 text-white border border-rose-300'
                }`}
              >
                <Target className="w-2.5 h-2.5" />
                <span>Avance: {physicalProgress}%</span>
              </div>
              <div
                className={`w-1.5 h-1.5 rotate-45 -mt-1 ${
                  isOptimal ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>

            {/* "HOY" TIME ELAPSED NEEDLE / VERTICAL MARKER */}
            <div
              style={{ left: `${Math.min(99, Math.max(1, timeElapsedPercent))}%` }}
              className="absolute top-3 bottom-3 w-0.5 sm:w-1 bg-white z-20 pointer-events-none -translate-x-1/2 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            >
              {/* Bottom tag for "Hoy" */}
              <div className="absolute -bottom-6 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                <div className="w-1.5 h-1.5 rotate-45 bg-amber-400" />
                <div className="bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded font-mono shadow-md whitespace-nowrap flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 fill-slate-950" />
                  <span>HOY • {timeElapsedPercent}% plazo</span>
                </div>
              </div>
            </div>

            {/* 100% COMPLETION GOAL PIN AT FAR RIGHT */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 flex flex-col items-center z-30 pointer-events-none">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 ${
                  physicalProgress >= 100
                    ? 'bg-emerald-500 border-white text-white'
                    : 'bg-slate-800 border-amber-400 text-amber-400'
                }`}
              >
                <Flag className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Bottom Footnote: Natural Language Duration & Dates Details */}
          <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1.5 border-t border-slate-800/80 flex-wrap gap-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Plazo previsto:</span>
              <strong className="text-white font-mono">{naturalTotalDuration}</strong>
              <span className="text-slate-400 font-mono">({totalDurationDays} días)</span>
            </span>

            <span className="flex items-center gap-1">
              <span>Transcurrido:</span>
              <strong className="text-amber-300 font-mono">{naturalElapsedDuration}</strong>
              <span className="text-slate-400">({timeElapsedPercent}%)</span>
              <span className="text-slate-500">• Restan: {naturalRemainingDuration}</span>
            </span>

            <span className="flex items-center gap-1 font-bold ml-auto">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Entrega:</span>
              <span className="text-amber-300 font-mono">{formatDateLabel(endDateStr)}</span>
            </span>
          </div>

          {/* DYNAMIC COMPARISON BAR: AVANCE FÍSICO VS TIEMPO TRANSCURRIDO */}
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Comparativa: Obra Ejecutada vs Plazo Transcurrido
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isOptimal
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {isOptimal ? `Al día (+${progressDiff}% de margen)` : `Retraso de ${delayGap}% respecto al tiempo`}
              </span>
            </div>

            {/* Barra 1: Avance Físico */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span className="font-medium">Avance Físico Ejecutado</span>
                <span className="font-mono font-black text-emerald-400">{physicalProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, physicalProgress))}%` }}
                />
              </div>
            </div>

            {/* Barra 2: Tiempo Transcurrido */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span className="font-medium">Tiempo Transcurrido ({naturalElapsedDuration})</span>
                <span className="font-mono font-black text-amber-400">{timeElapsedPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, timeElapsedPercent))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4 SCANNABLE SUMMARY METRIC PILLS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
          {/* 1. Avance Físico Consolidado */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Avance Físico
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                {physicalProgress}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">global</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
              {stats.completedItems} de {stats.totalItems} ítems tildados
            </span>
          </div>

          {/* 2. Plazo Consumido */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Plazo Calendario
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                {timeElapsedPercent}%
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">transcurrido</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
              Día {daysElapsed} de {totalDurationDays}
            </span>
          </div>

          {/* 3. Diagnóstico de Ritmo */}
          <div
            className={`p-2 sm:p-2.5 rounded-xl border transition-colors ${
              isOptimal
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider block">
              Estado de Avance
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black truncate">
                {isOptimal ? 'Al día / Óptimo' : 'Demorado'}
              </span>
            </div>
            <span className="text-[10px] font-mono block mt-0.5 truncate">
              {isOptimal
                ? `+${progressDiff}% vs tiempo`
                : `-${delayGap}% por debajo`}
            </span>
          </div>

          {/* 4. Meta de Culminación Restante */}
          <div className="bg-amber-50/60 dark:bg-amber-950/30 p-2 sm:p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/80 transition-colors">
            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
              Meta de Entrega
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg sm:text-xl font-black font-mono text-amber-950 dark:text-amber-200">
                {remainingPercentage}%
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400">restante</span>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 block truncate mt-0.5">
              {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Fecha límite alcanzada'}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECCIÓN 2: CRONOGRAMA DE HITOS CRÍTICOS & ALARMAS ROJAS   */}
      {/* ========================================================= */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
        {milestones.length === 0 ? (
          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-left">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Hitos Críticos y Alarmas</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Añade hitos clave (instalaciones, revoques, entrega) para activar alarmas automáticas de demora.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMilestonesConfig(project.id);
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 shadow-xs transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Crear Hito</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header with Alarm Counts & View Mode Switcher */}
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  Hitos Intermedios ({milestones.length})
                </span>

                {redAlarmsCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs animate-pulse">
                    <Flame className="w-3 h-3" />
                    {redAlarmsCount} {redAlarmsCount === 1 ? 'Alarma Crítica' : 'Alarmas Críticas'}
                  </span>
                )}

                {warningCount > 0 && redAlarmsCount === 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <AlertTriangle className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                    {warningCount} en riesgo
                  </span>
                )}

                {completedCount === calculatedResults.length && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Todos cumplidos
                  </span>
                )}
              </div>

              {/* View Switcher & Actions */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('gantt')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${
                      timelineViewMode === 'gantt'
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Project Manager (Gantt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineViewMode('nodes')}
                    className={`px-2 py-0.5 text-[10px] font-black rounded-md transition-all ${
                      timelineViewMode === 'nodes'
                        ? 'bg-amber-500 text-slate-950 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    Nodos
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenMilestonesConfig(project.id)}
                  className="px-2 py-1 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-amber-700 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                  title="Gestionar o agregar hitos"
                >
                  <Sliders className="w-3 h-3 text-amber-500" />
                  <span className="hidden sm:inline">Gestionar Hitos</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE 1: PROJECT MANAGER GANTT TIMELINE             */}
            {/* ======================================================== */}
            {timelineViewMode === 'gantt' && (
              <div
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                className="no-scrollbar relative p-3 w-full rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 select-none transition-colors"
              >
                <div className="min-w-[760px] sm:min-w-[900px] relative space-y-3">
                  {/* Vertical "HOY" Marker Line running down all rows */}
                  <div
                    style={{ left: `${ganttTodayLeft}%` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20 pointer-events-none"
                  >
                    <div className="absolute -top-1 -translate-x-1/2 bg-slate-950 text-amber-400 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm border border-amber-500/80 flex items-center gap-0.5">
                      <MapPin className="w-2 h-2 text-amber-400 fill-amber-400" />
                      HOY
                    </div>
                  </div>

                  {/* Top Time Scale Axis */}
                  <div className="relative pb-2 border-b border-slate-200 dark:border-slate-700/80">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 px-1">
                      {ganttScaleMarkers.map((marker, i) => (
                        <span key={i} className="flex flex-col items-center">
                          <span className="h-1.5 w-0.5 bg-slate-300 dark:bg-slate-600 mb-0.5"></span>
                          <span>{marker.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Milestone Rows */}
                  <div className="space-y-2.5 pt-1">
                    {calculatedResults.map((result) => {
                      const { milestone, status, consolidatedProgress } = result;
                      const isSelected = selectedMilestoneId === milestone.id;
                      const isStartedOverdue = result.isStartedOverdue;
                      const isOverdue = result.isOverdue;

                      // Calculate bar left & width safely
                      const mStartMs = milestone.startDate && isFinite(new Date(milestone.startDate).getTime())
                        ? new Date(milestone.startDate).getTime()
                        : ganttStartMs;
                      const targetDateStr = milestone.targetDate || milestone.endDate;
                      const mEndMs = targetDateStr && isFinite(new Date(targetDateStr).getTime())
                        ? new Date(targetDateStr).getTime()
                        : (mStartMs + (30 * 24 * 60 * 60 * 1000));

                      const rawLeft = ((mStartMs - ganttStartMs) / ganttTotalDurationMs) * 100;
                      const rawWidth = ((mEndMs - mStartMs) / ganttTotalDurationMs) * 100;
                      const barLeftPercent = isFinite(rawLeft) ? Math.max(0, Math.min(95, rawLeft)) : 0;
                      const barWidthPercent = isFinite(rawWidth) ? Math.max(5, Math.min(100 - barLeftPercent, rawWidth)) : 20;

                      return (
                        <div
                          key={milestone.id}
                          onClick={() => {
                            setSelectedMilestoneId(isSelected ? null : milestone.id);
                            setShowUnitsBreakdown(false);
                          }}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/40 shadow-sm'
                              : status === 'alarm_red'
                              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                              : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {/* Row Header Information */}
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              {/* Sector Badge */}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5 text-amber-500" />
                                {milestone.buildingPart || 'Estructura Global'}
                              </span>

                              {/* Trade Badge */}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 flex items-center gap-1">
                                <Wrench className="w-2.5 h-2.5 text-amber-600" />
                                {milestone.tradeCategory || milestone.linkedTradeId || 'General'}
                              </span>

                              {/* Title */}
                              <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {milestone.name}
                              </span>

                              {/* Date span */}
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                ({result.startDateFormatted} ➔ {result.targetDateFormatted})
                              </span>
                            </div>

                            {/* Direct Quick Percentage Adjuster */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1"
                            >
                              {onUpdateMilestoneProgress && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateMilestoneProgress(project.id, milestone.id, Math.max(0, consolidatedProgress - 10))}
                                  className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center transition-colors"
                                  title="Disminuir 10%"
                                >
                                  -
                                </button>
                              )}
                              <span className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md border ${
                                status === 'alarm_red'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 animate-pulse'
                                  : status === 'success_green'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                              }`}>
                                {consolidatedProgress}%
                              </span>
                              {onUpdateMilestoneProgress && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateMilestoneProgress(project.id, milestone.id, Math.min(100, consolidatedProgress + 10))}
                                  className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center transition-colors"
                                  title="Aumentar 10%"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Horizontal Gantt Bar Track */}
                          <div className="relative w-full h-7 bg-slate-100 dark:bg-slate-800/80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/60">
                            {/* Gantt Bar positioned according to timeline span */}
                            <div
                              style={{
                                left: `${barLeftPercent}%`,
                                width: `${barWidthPercent}%`
                              }}
                              className={`absolute top-0.5 bottom-0.5 rounded-lg overflow-hidden flex items-center px-2 transition-all ${
                                status === 'alarm_red'
                                  ? 'bg-rose-950/80 border-2 border-rose-500 text-rose-100 shadow-sm shadow-rose-950 animate-pulse'
                                  : status === 'warning_yellow'
                                  ? 'bg-amber-950/80 border-2 border-amber-400 text-amber-100'
                                  : status === 'success_green'
                                  ? 'bg-emerald-950/80 border-2 border-emerald-500 text-emerald-100'
                                  : 'bg-blue-950/80 border border-blue-500 text-blue-100'
                              }`}
                            >
                              {/* Internal Progress Fill */}
                              <div
                                style={{ width: `${consolidatedProgress}%` }}
                                className={`absolute top-0 bottom-0 left-0 transition-all duration-300 opacity-80 ${
                                  status === 'alarm_red'
                                    ? 'bg-rose-600'
                                    : status === 'warning_yellow'
                                    ? 'bg-amber-500'
                                    : status === 'success_green'
                                    ? 'bg-emerald-600'
                                    : 'bg-blue-600'
                                }`}
                              />

                              {/* Label inside the Gantt Bar */}
                              <div className="relative z-10 flex items-center gap-1.5 text-[10px] font-black truncate drop-shadow-sm">
                                {isStartedOverdue ? (
                                  <>
                                    <Flame className="w-3 h-3 text-white shrink-0 animate-bounce" />
                                    <span>🚨 NO EMPEZÓ A TIEMPO (0%)</span>
                                  </>
                                ) : isOverdue ? (
                                  <>
                                    <Flame className="w-3 h-3 text-white shrink-0" />
                                    <span>🚨 VENCIDO SIN TERMINAR ({consolidatedProgress}%)</span>
                                  </>
                                ) : consolidatedProgress >= 100 ? (
                                  <>
                                    <Check className="w-3 h-3 text-white shrink-0" />
                                    <span>✅ CUMPLIDO (100%)</span>
                                  </>
                                ) : consolidatedProgress > 0 ? (
                                  <span>EN CURSO ({consolidatedProgress}%)</span>
                                ) : (
                                  <span>PROGRAMADO (0%)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* VIEW MODE 2: CLASSIC NODE TIMELINE TRACK                 */}
            {/* ======================================================== */}
            {timelineViewMode === 'nodes' && (
              <div
                ref={scrollContainerRef}
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                className="no-scrollbar relative pt-6 pb-3 px-3 w-full rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700/80 select-none transition-colors"
              >
                <div
                  style={{ minWidth: `${Math.max(560, calculatedResults.length * 135)}px` }}
                  className="relative flex items-start justify-between gap-4 px-6"
                >
                  {/* Continuous line */}
                  <div className="absolute top-8 left-8 right-8 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full z-0" />

                  {calculatedResults.map((result, idx) => {
                    const { milestone, status, isPulsing, consolidatedProgress, minRequired } = result;
                    const isSelected = selectedMilestoneId === milestone.id;
                    const isTodayMilestone = idx === closestIndex;

                    let nodeStyles = 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300';
                    let statusDot = 'bg-slate-400';

                    if (status === 'alarm_red') {
                      nodeStyles = 'bg-rose-600 border-rose-700 text-white shadow-md ring-4 ring-rose-300/80 dark:ring-rose-900/60';
                      statusDot = 'bg-rose-500';
                    } else if (status === 'warning_yellow') {
                      nodeStyles = 'bg-amber-400 border-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-200 dark:ring-amber-900/60';
                      statusDot = 'bg-amber-500';
                    } else if (status === 'success_green') {
                      nodeStyles = 'bg-emerald-600 border-emerald-700 text-white shadow-xs ring-2 ring-emerald-200 dark:ring-emerald-900/60';
                      statusDot = 'bg-emerald-500';
                    } else {
                      nodeStyles = 'bg-blue-600 border-blue-700 text-white shadow-xs ring-1 ring-blue-200 dark:ring-blue-900/60';
                      statusDot = 'bg-blue-500';
                    }

                    return (
                      <div
                        key={milestone.id}
                        ref={isTodayMilestone ? todayMilestoneMarkerRef : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMilestoneId(isSelected ? null : milestone.id);
                          setShowUnitsBreakdown(false);
                        }}
                        className="flex flex-col items-center cursor-pointer group w-28 flex-shrink-0 text-center transition-transform hover:scale-105 relative"
                      >
                        {/* Marker for today if closest */}
                        {isTodayMilestone && (
                          <div className="absolute -top-6 flex flex-col items-center z-20 pointer-events-none">
                            <span className="bg-slate-950 text-amber-400 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border border-amber-500/70 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                              HOY
                            </span>
                            <div className="w-0.5 h-2 bg-amber-500"></div>
                          </div>
                        )}

                        {/* Node circle */}
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-mono font-black text-xs transition-all relative ${nodeStyles} ${
                            isPulsing ? 'animate-pulse' : ''
                          } ${isSelected ? 'scale-115 ring-4 ring-slate-900 dark:ring-amber-400' : ''}`}
                          title={`${milestone.name} - ${result.statusLabel}`}
                        >
                          {status === 'success_green' ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : status === 'alarm_red' ? (
                            <Flame className="w-4 h-4 text-white" />
                          ) : status === 'warning_yellow' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-950" />
                          ) : (
                            <span className="text-[11px]">{idx + 1}</span>
                          )}

                          <span
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${statusDot} ${
                              isPulsing ? 'animate-ping' : ''
                            }`}
                          />
                        </div>

                        {/* Label & Progress */}
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 truncate max-w-full">
                          {result.targetDateFormatted}
                        </span>
                        <span
                          className={`text-[11px] font-black leading-tight line-clamp-1 group-hover:text-amber-500 transition-colors ${
                            status === 'alarm_red'
                              ? 'text-rose-700 dark:text-rose-400 font-black'
                              : status === 'success_green'
                              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                          title={milestone.name}
                        >
                          {milestone.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold mt-0.5 px-1.5 py-0.2 rounded transition-colors ${
                            consolidatedProgress >= minRequired
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800'
                              : status === 'alarm_red'
                              ? 'text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800'
                              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {consolidatedProgress}% / {minRequired}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SECCIÓN 3: POPOVER / DETALLE DEL HITO SELECCIONADO        */}
      {/* ========================================================= */}
      {activeResult && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 p-3.5 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-700 relative animate-fadeIn"
        >
          <button
            type="button"
            onClick={() => setSelectedMilestoneId(null)}
            className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start justify-between pr-6 gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    activeResult.status === 'alarm_red'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : activeResult.status === 'warning_yellow'
                      ? 'bg-amber-400 text-slate-950'
                      : activeResult.status === 'success_green'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {activeResult.status === 'alarm_red' && <Flame className="w-3 h-3" />}
                  {activeResult.status === 'warning_yellow' && <AlertTriangle className="w-3 h-3" />}
                  {activeResult.status === 'success_green' && <CheckCircle2 className="w-3 h-3" />}
                  {activeResult.statusLabel}
                </span>

                {/* Building Part & Trade badges */}
                {activeResult.milestone.buildingPart && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1">
                    <Building2 className="w-2.5 h-2.5 text-amber-400" />
                    {activeResult.milestone.buildingPart}
                  </span>
                )}

                {(activeResult.milestone.tradeCategory || activeResult.milestone.linkedTradeId) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                    <Wrench className="w-2.5 h-2.5 text-amber-400" />
                    {activeResult.milestone.tradeCategory || activeResult.milestone.linkedTradeId}
                  </span>
                )}

                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  Límite: <strong className="text-white">{activeResult.targetDateFormatted}</strong>
                </span>

                {activeResult.isOverdue ? (
                  <span className="text-[10px] text-rose-300 font-bold">
                    (Vencido hace {Math.abs(activeResult.daysRemaining)} días)
                  </span>
                ) : activeResult.daysRemaining === 0 ? (
                  <span className="text-[10px] text-amber-300 font-bold">
                    (¡Vence hoy!)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    (Faltan {activeResult.daysRemaining} días)
                  </span>
                )}
              </div>

              <h5 className="text-sm font-black text-white mt-1">
                {activeResult.milestone.name}
              </h5>

              {/* Start Date */}
              {activeResult.milestone.startDate && (
                <p className="text-xs text-slate-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  Fecha de inicio prevista: <strong className="text-white">{activeResult.startDateFormatted}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Alarm Warning Alert Banners */}
          {activeResult.isStartedOverdue && (
            <div className="mt-2.5 p-2 bg-rose-950/80 border border-rose-500 rounded-lg text-xs text-rose-200 flex items-start gap-2">
              <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="text-rose-100 block font-black">ALARMA: NO EMPEZÓ A TIEMPO</strong>
                <span>
                  Debía haber comenzado el {activeResult.startDateFormatted} y aún registra 0% de avance.
                  Ajusta el porcentaje abajo para indicar que ya se inició y apagar la alarma.
                </span>
              </div>
            </div>
          )}

          {activeResult.isOverdue && !activeResult.isStartedOverdue && (
            <div className="mt-2.5 p-2 bg-rose-950/80 border border-rose-500 rounded-lg text-xs text-rose-200 flex items-start gap-2">
              <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <strong className="text-rose-100 block font-black">ALARMA: VENCIDO SIN FINALIZAR</strong>
                <span>
                  La fecha límite ({activeResult.targetDateFormatted}) se cumplió y el hito aún no alcanza el 100% de culminación.
                </span>
              </div>
            </div>
          )}

          {/* Direct Percentage Adjuster inside the Popover */}
          {onUpdateMilestoneProgress && (
            <div className="mt-3 bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Ajustar Porcentaje de Avance Directo:
                </span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {activeResult.consolidatedProgress}%
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center justify-between gap-1 flex-wrap">
                {[0, 25, 50, 75, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onUpdateMilestoneProgress(project.id, activeResult.milestone.id, val)}
                    className={`px-2 py-1 rounded text-xs font-black transition-colors ${
                      activeResult.consolidatedProgress === val
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {val === 0 ? '0%' : val === 100 ? '100% OK' : `${val}%`}
                  </button>
                ))}

                {/* Step adjusters */}
                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => onUpdateMilestoneProgress(project.id, activeResult.milestone.id, Math.max(0, activeResult.consolidatedProgress - 10))}
                    className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-black"
                    title="-10%"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMilestoneProgress(project.id, activeResult.milestone.id, Math.min(100, activeResult.consolidatedProgress + 10))}
                    className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                    title="+10%"
                  >
                    +10%
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress comparison */}
          <div className="mt-2.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">
                Progreso Físico Consolidado:
              </span>
              <span className="text-amber-400 font-mono font-black text-sm">
                {activeResult.consolidatedProgress}%{' '}
                <span className="text-slate-400 text-xs font-normal">
                  (Meta: {activeResult.minRequired}%)
                </span>
              </span>
            </div>

            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-300 ${
                  activeResult.status === 'alarm_red'
                    ? 'bg-rose-500'
                    : activeResult.status === 'warning_yellow'
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${activeResult.consolidatedProgress}%` }}
              />
            </div>
          </div>

          {/* Action buttons inside card */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-700/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnitsBreakdown(prev => !prev)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 underline flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                {showUnitsBreakdown ? 'Ocultar unidades' : 'Ver detalle por unidad'}
              </button>

              <button
                type="button"
                onClick={() => onOpenMilestonesConfig(project.id)}
                className="text-xs font-bold text-slate-300 hover:text-white underline flex items-center gap-1 ml-2"
              >
                <Pencil className="w-3 h-3 text-amber-400" />
                Editar Hito Completo
              </button>
            </div>

            {onToggleManualMilestone && (
              <button
                type="button"
                onClick={() => onToggleManualMilestone(project.id, activeResult.milestone.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                  activeResult.milestone.manualCompleted
                    ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {activeResult.milestone.manualCompleted ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> Quitar cumplimiento manual
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Forzar 100% OK
                  </>
                )}
              </button>
            )}
          </div>

          {/* Units breakdown */}
          {showUnitsBreakdown && (
            <div className="mt-3 pt-2 border-t border-slate-700/80 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Estado por Departamento / Espacio:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {activeResult.unitsDetail.map(u => (
                  <div
                    key={u.unitId}
                    onClick={() => {
                      if (onSelectUnit) onSelectUnit(u.unitId);
                    }}
                    className={`p-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors ${
                      u.completed
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                        : u.percentage > 0
                        ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          u.completed ? 'bg-emerald-400' : u.percentage > 0 ? 'bg-amber-400' : 'bg-rose-400'
                        }`}
                      />
                      <span className="font-bold truncate">{u.unitName}</span>
                    </div>
                    <span className="font-mono font-black text-[11px] ml-2 flex-shrink-0">
                      {u.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SECCIÓN 4: MODAL DE EDICIÓN DE FECHAS DE CRONOGRAMA       */}
      {/* ========================================================= */}
      {isEditingDatesModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-700 dark:text-amber-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Cronograma de Obra</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{project.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingDatesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDates} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha de Inicio de Obra (0% de avance)
                </label>
                <input
                  type="date"
                  required
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha Estimada de Culminación / Entrega Final (100%)
                </label>
                <input
                  type="date"
                  required
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quick duration presets */}
              <div>
                <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  Extender o ajustar plazo rápido desde inicio:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSetEndPresetMonths(3)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    +3 Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetEndPresetMonths(6)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    +6 Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetEndPresetMonths(12)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    +1 Año
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingDatesModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs"
                >
                  Guardar Fechas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
