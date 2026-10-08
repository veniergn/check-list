import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  X,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  UserCheck,
  MessageSquare,
  Flag,
  Check
} from 'lucide-react';
import { Project, Unit } from '../types';
import { calculateUnitProgress, calculateProjectProgress, getUnitItemCounts } from '../utils/calculations';
import { formatPMDate, getTaskAlarms } from '../utils/pmCalculations';
import { MASTER_TRADES_TEMPLATE } from '../data/initialData';

interface ReportModalProps {
  isOpen: boolean;
  projects: Project[];
  defaultScope: string;
  headerLogoUrl: string;
  onClose: () => void;
  onExportJSON: () => void;
}

export function ReportModal({
  isOpen,
  projects,
  defaultScope,
  headerLogoUrl,
  onClose,
  onExportJSON
}: ReportModalProps) {
  const [selectedScope, setSelectedScope] = useState<string>(defaultScope);
  const [inspectorName, setInspectorName] = useState<string>('Arq. M. Rossi - Inspección Técnica');
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeComments, setIncludeComments] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeGantt, setIncludeGantt] = useState<boolean>(true);
  const [includeUnitsProgress, setIncludeUnitsProgress] = useState<boolean>(true);
  const [onlyGanttLandscape, setOnlyGanttLandscape] = useState<boolean>(false);
  const [ganttScale, setGanttScale] = useState<'weeks' | 'months'>('weeks');
  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');

  // Add report-modal-open class to body while modal is open for print isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('report-modal-open');
      return () => {
        document.body.classList.remove('report-modal-open');
      };
    }
  }, [isOpen]);

  // Synchronize scope with defaultScope on open or when defaultScope changes
  useEffect(() => {
    if (isOpen && defaultScope) {
      setSelectedScope(defaultScope);
    }
  }, [isOpen, defaultScope]);

  if (!isOpen || projects.length === 0) return null;

  // Resolve scope: "proj:<id>" or "unit:<pId>:<uId>"
  let targetProject: Project | null = null;
  let targetUnit: Unit | null = null;

  if (selectedScope.startsWith('unit:')) {
    const [, pId, uId] = selectedScope.split(':');
    targetProject = projects.find(p => p.id === pId) || null;
    if (targetProject) {
      targetUnit = targetProject.units.find(u => u.id === uId) || null;
    }
  } else if (selectedScope.startsWith('proj:')) {
    const [, pId] = selectedScope.split(':');
    targetProject = projects.find(p => p.id === pId) || null;
  }

  if (!targetProject) {
    targetProject = projects[0];
  }

  const projectUnits = targetProject?.units || [];
  const isUnitScope = !!targetUnit;
  const overallPct = isUnitScope && targetUnit
    ? calculateUnitProgress(targetUnit)
    : (targetProject ? calculateProjectProgress(targetProject) : 0);
  const unitsToReport = isUnitScope && targetUnit ? [targetUnit] : projectUnits;

  // Aggregate trade metrics for the report
  const tradeSummaries = MASTER_TRADES_TEMPLATE.map(tm => {
    let total = 0;
    let done = 0;
    const itemsDetailed: Array<{ unitName: string; item: any }> = [];

    unitsToReport.forEach(u => {
      const t = u.trades.find(x => x.id === tm.id);
      if (t) {
        t.items.forEach(i => {
          total++;
          if (i.completed) done++;
          itemsDetailed.push({ unitName: u.name, item: i });
        });
      }
    });

    return {
      id: tm.id,
      name: tm.name,
      shortName: tm.shortName,
      total,
      done,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
      items: itemsDetailed
    };
  });

  let totalPhotos = 0;
  let totalComments = 0;
  tradeSummaries.forEach(ts => {
    ts.items.forEach(it => {
      totalPhotos += (it.item.photos ? it.item.photos.length : 0);
      if (it.item.comment) totalComments++;
    });
  });

  // Executive Gantt Timeline for Target Project (Safely evaluated without conditional hook violation)
  const ganttData = (() => {
    if (!targetProject) return null;
    const tasks = targetProject.calendarEvents || [];
    const milestones = targetProject.milestones || [];

    if (tasks.length === 0 && milestones.length === 0) {
      return null;
    }

    const parseDate = (dStr?: string): Date | null => {
      if (!dStr || typeof dStr !== 'string') return null;
      try {
        const clean = dStr.split('T')[0].trim();
        const parts = clean.split('-').map(Number);
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
          return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        const d = new Date(dStr);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    // 1. Process tasks and calculate their realistic execution spans
    interface ProcessedTaskItem {
      task: any;
      dStart: Date;
      dEnd: Date;
      durationDays: number;
    }

    const processedTasks: ProcessedTaskItem[] = [];
    const activeDates: Date[] = [];

    tasks.forEach(t => {
      const dEndRaw = parseDate(t.date);
      let dStartRaw = parseDate(t.startDate);

      if (dEndRaw) {
        let dStart: Date;
        let dEnd = dEndRaw;

        if (!dStartRaw || dStartRaw.getTime() === dEndRaw.getTime()) {
          // If no start date or start equals deadline:
          // A task process in construction spans at least 6-7 days leading to deadline
          dStart = new Date(dEndRaw.getTime() - 6 * 24 * 60 * 60 * 1000);
        } else if (dStartRaw > dEndRaw) {
          dStart = dEndRaw;
          dEnd = dStartRaw;
        } else {
          dStart = dStartRaw;
        }

        const duration = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        processedTasks.push({
          task: t,
          dStart,
          dEnd,
          durationDays: duration
        });
        activeDates.push(dStart, dEnd);
      }
    });

    milestones.forEach(m => {
      const dTarget = parseDate(m.targetDate);
      const dStart = parseDate(m.startDate);
      if (dTarget) activeDates.push(dTarget);
      if (dStart) activeDates.push(dStart);
    });

    const now = new Date();
    if (activeDates.length === 0) {
      activeDates.push(now);
    }

    let minWorkTime = Math.min(...activeDates.map(d => d.getTime()));
    let maxWorkTime = Math.max(...activeDates.map(d => d.getTime()));

    // Constrain project schedule dates so ancient dates (e.g. 2025) never stretch current work
    const projStart = parseDate(targetProject.startDate);
    const projEnd = parseDate(targetProject.estimatedEndDate);

    if (projStart && projStart.getTime() <= minWorkTime) {
      const diff = Math.round((minWorkTime - projStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) {
        minWorkTime = projStart.getTime();
      }
    }

    if (projEnd && projEnd.getTime() >= maxWorkTime) {
      const diff = Math.round((projEnd.getTime() - maxWorkTime) / (1000 * 60 * 60 * 24));
      if (diff <= 45) {
        maxWorkTime = projEnd.getTime();
      }
    }

    let startDate: Date;
    let endDate: Date;

    const WEEKDAY_INITIALS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

    interface DayCol {
      date: Date;
      dateStr: string;
      dayNum: number;
      weekdayLetter: string;
      isWeekend: boolean;
      widthPct: number;
      monthName: string;
      year: number;
    }

    interface MonthGroup {
      name: string;
      year: number;
      widthPct: number;
      daysCount: number;
    }

    interface MonthCol {
      name: string;
      year: number;
      widthPct: number;
      daysCount: number;
    }

    const daysList: DayCol[] = [];
    const monthsGroup: MonthGroup[] = [];
    const monthsList: MonthCol[] = [];

    if (ganttScale === 'weeks') {
      const minD = new Date(minWorkTime);
      const startDayOfWeek = minD.getDay(); // 0 is Sun, 1 is Mon
      const mondayOffset = (startDayOfWeek === 0 ? -6 : 1) - startDayOfWeek;
      // Start 1 week prior on Monday for visual breathing room
      const wStart = new Date(minD.getFullYear(), minD.getMonth(), minD.getDate() + mondayOffset - 7);
      wStart.setHours(0, 0, 0, 0);

      const maxD = new Date(maxWorkTime);
      const endDayOfWeek = maxD.getDay();
      const sundayOffset = endDayOfWeek === 0 ? 0 : (7 - endDayOfWeek);
      // End 1 week after on Sunday
      let wEnd = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate() + sundayOffset + 7);
      wEnd.setHours(23, 59, 59, 999);

      // Ensure at least 4 weeks (28 days) and cap at 12 weeks
      let countDays = Math.round((wEnd.getTime() - wStart.getTime()) / (1000 * 60 * 60 * 24));
      if (countDays < 28) {
        wEnd = new Date(wStart.getTime() + 28 * 24 * 60 * 60 * 1000 - 1);
      }

      startDate = wStart;
      endDate = wEnd;

      const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Generate day columns with initial of the day (L, M, M, J, V, S, D)
      let curD = new Date(startDate.getTime());
      let dCounter = 0;
      while (curD <= endDate && dCounter < 84) {
        const dNum = curD.getDate();
        const wDay = curD.getDay();
        const mName = curD.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
        const y = curD.getFullYear();
        const m = curD.getMonth() + 1;
        const dStr = `${y}-${String(m).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;

        daysList.push({
          date: new Date(curD),
          dateStr: dStr,
          dayNum: dNum,
          weekdayLetter: WEEKDAY_INITIALS[wDay],
          isWeekend: wDay === 0 || wDay === 6,
          widthPct: 100 / totalDays,
          monthName: mName,
          year: y
        });

        curD = new Date(curD.getTime() + 24 * 60 * 60 * 1000);
        dCounter++;
      }

      // Group days into months for the top header row
      let currentMonth = '';
      let currentYear = 0;
      let countInMonth = 0;
      daysList.forEach((d, idx) => {
        if (d.monthName !== currentMonth || d.year !== currentYear) {
          if (currentMonth) {
            monthsGroup.push({
              name: currentMonth,
              year: currentYear,
              daysCount: countInMonth,
              widthPct: (countInMonth / daysList.length) * 100
            });
          }
          currentMonth = d.monthName;
          currentYear = d.year;
          countInMonth = 1;
        } else {
          countInMonth++;
        }
        if (idx === daysList.length - 1) {
          monthsGroup.push({
            name: currentMonth,
            year: currentYear,
            daysCount: countInMonth,
            widthPct: (countInMonth / daysList.length) * 100
          });
        }
      });
    } else {
      // Month scale
      const minD = new Date(minWorkTime);
      const startYear = minD.getFullYear();
      const startMonth = minD.getMonth();
      startDate = new Date(startYear, startMonth, 1);

      const maxD = new Date(maxWorkTime);
      let endYear = maxD.getFullYear();
      let endMonth = maxD.getMonth();
      const monthDiff = (endYear - startYear) * 12 + (endMonth - startMonth);
      if (monthDiff < 3) {
        endMonth += (3 - monthDiff);
        if (endMonth > 11) {
          endYear += Math.floor(endMonth / 12);
          endMonth = endMonth % 12;
        }
      }
      endDate = new Date(endYear, endMonth + 1, 0, 23, 59, 59);

      const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      let curM = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      let iter = 0;
      while (curM <= endDate && iter < 24) {
        iter++;
        const y = curM.getFullYear();
        const m = curM.getMonth();
        const segStart = Math.max(startDate.getTime(), new Date(y, m, 1).getTime());
        const segEnd = Math.min(endDate.getTime(), new Date(y, m + 1, 0, 23, 59, 59).getTime());
        const daysInM = Math.max(1, Math.round((segEnd - segStart) / (1000 * 60 * 60 * 24)));
        const mName = curM.toLocaleDateString('es-ES', { month: 'short' });
        monthsList.push({
          name: mName.toUpperCase(),
          year: y,
          daysCount: daysInM,
          widthPct: (daysInM / totalDays) * 100
        });
        curM = new Date(y, m + 1, 1);
      }
    }

    const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Positioning function for tasks and milestones
    const getPercentPosition = (dStart: Date, dEnd: Date) => {
      const sOffset = Math.round((dStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const eOffset = Math.round((dEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const clampedStart = Math.max(0, Math.min(totalDays, sOffset));
      const clampedEnd = Math.max(clampedStart + 1, Math.min(totalDays, eOffset));

      const leftPct = (clampedStart / totalDays) * 100;
      const widthPct = Math.max(3.5, ((clampedEnd - clampedStart) / totalDays) * 100);

      return {
        leftPct: Math.min(96.5, leftPct),
        widthPct: Math.min(100 - leftPct, widthPct)
      };
    };

    const getMilestonePosition = (dateStr?: string) => {
      const d = parseDate(dateStr);
      if (!d) return { leftPct: 50 };
      const offset = Math.round((d.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const leftPct = Math.max(1, Math.min(98, (offset / totalDays) * 100));
      return { leftPct };
    };

    const tasksWithPosition = processedTasks.map(item => {
      const pos = getPercentPosition(item.dStart, item.dEnd);
      return {
        ...item,
        pos
      };
    });

    return {
      startDate,
      endDate,
      totalDays,
      daysList,
      monthsGroup,
      monthsList,
      tasksWithPosition,
      milestones,
      getMilestonePosition
    };
  })();

  const now = new Date();
  const dateString = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="report-modal-backdrop fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-3 overflow-y-auto">
      <div className="report-modal-dialog bg-white w-full max-w-6xl rounded-t-2xl sm:rounded-2xl max-h-[96vh] flex flex-col shadow-2xl border-t-4 border-amber-500 overflow-hidden">
        {/* Non-Printable Header Bar */}
        <div className="px-4 py-3 bg-[#101D30] text-white flex items-center justify-between border-b border-[#29384C] no-print">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white leading-tight">
                Reporte Técnico de Inspección
              </h3>
              <p className="text-[10px] text-amber-400 font-bold">
                Exportación Oficial PDF / Hoja {paperSize.toUpperCase()} Apaisada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow touch-target active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#17263B] hover:bg-rose-600 text-white border border-[#29384C] transition-all touch-target shrink-0 z-20 flex items-center justify-center active:scale-95 shadow-xs"
              title="Cerrar informe"
              aria-label="Cerrar informe"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Non-Printable Controls Box */}
        <div className="p-3 bg-slate-100 border-b border-slate-200 no-print space-y-2.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                Alcance del Informe
              </label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white p-2 shadow-xs text-slate-800"
              >
                {projects.map(p => (
                  <optgroup key={p.id} label={`Obra: ${p.name}`}>
                    <option value={`proj:${p.id}`}>
                      📋 Obra Completa: {p.name} ({p.units.length} Deptos)
                    </option>
                    {p.units.map(u => (
                      <option key={u.id} value={`unit:${p.id}:${u.id}`}>
                        &nbsp;&nbsp;↳ Unidad: {u.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                Inspector / Supervisor Responsable
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 bg-white p-2 shadow-xs text-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-slate-700">
            {/* Botón / Switch Exclusivo: Solo Diagrama de Gantt en Hoja Apaisada */}
            <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all shadow-xs ${
              onlyGanttLandscape
                ? 'bg-amber-500 text-slate-950 border-amber-600 font-black ring-2 ring-amber-500/40 shadow-sm'
                : 'bg-white text-slate-800 border-slate-300 hover:border-amber-400 font-bold'
            }`}>
              <input
                type="checkbox"
                checked={onlyGanttLandscape}
                onChange={(e) => {
                  const val = e.target.checked;
                  setOnlyGanttLandscape(val);
                  if (val) {
                    setIncludeGantt(true);
                    setIncludeUnitsProgress(false);
                    setIncludePhotos(false);
                    setIncludeComments(false);
                  }
                }}
                className="rounded text-amber-500 w-4 h-4"
              />
              <span className="text-xs flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                Solo Diagrama de Gantt (Hoja Apaisada)
              </span>
            </label>

            {/* Escala Temporal: Por Semanas vs Por Meses */}
            <div className="inline-flex items-center rounded-xl bg-slate-200/90 p-0.5 border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setGanttScale('weeks')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  ganttScale === 'weeks'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="Ver cronograma desglosado por semanas de obra"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Por Semanas</span>
              </button>
              <button
                type="button"
                onClick={() => setGanttScale('months')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  ganttScale === 'months'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="Ver cronograma consolidado por meses"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Por Meses</span>
              </button>
            </div>

            {/* Selector de Papel: A4 vs A3 */}
            <div className="inline-flex items-center rounded-xl bg-slate-200/90 p-0.5 border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setPaperSize('a4')}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 ${
                  paperSize === 'a4'
                    ? 'bg-[#101D30] text-amber-400 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="Adaptar para imprimir en hoja A4 Apaisada"
              >
                <span>A4 Apaisada</span>
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('a3')}
                className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 ${
                  paperSize === 'a3'
                    ? 'bg-[#101D30] text-amber-400 shadow-xs'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
                title="Adaptar para imprimir en hoja A3 Apaisada (Formato Grande)"
              >
                <span>A3 Apaisada</span>
              </button>
            </div>

            {/* Botón directo para apagar / encender departamentos */}
            <button
              type="button"
              onClick={() => setIncludeUnitsProgress(!includeUnitsProgress)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                !includeUnitsProgress
                  ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title={includeUnitsProgress ? 'Apagar / ocultar todos los departamentos' : 'Encender departamentos'}
            >
              {!includeUnitsProgress ? '✕ Deptos Apagados' : 'Apagar todos los Deptos'}
            </button>

            <span className="font-bold text-[10px] uppercase text-slate-500 ml-1">Incluir:</span>

            {!onlyGanttLandscape && (
              <>
                <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-2xs hover:border-amber-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeGantt}
                    onChange={(e) => setIncludeGantt(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    Diagrama de Gantt
                  </span>
                </label>

                <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-2xs hover:border-amber-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeUnitsProgress}
                    onChange={(e) => setIncludeUnitsProgress(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-amber-600" />
                    Avance por Depto ({projectUnits.length})
                  </span>
                </label>

                <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-2xs hover:border-amber-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePhotos}
                    onChange={(e) => setIncludePhotos(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-800">
                    Evidencias ({totalPhotos})
                  </span>
                </label>

                <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-2xs hover:border-amber-400 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span className="text-[11px] font-semibold text-slate-800 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-amber-600" />
                    Notas ({totalComments})
                  </span>
                </label>
              </>
            )}

            <label className="inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer shadow-2xs hover:border-amber-400 transition-colors">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-amber-500"
              />
              <span className="text-[11px] font-semibold text-slate-800">
                Firmas
              </span>
            </label>
          </div>
        </div>

        {/* Printable Document Sheet - Panoramic Landscape Layout */}
        <div className="report-sheet-wrapper flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200/80">
          {/* Dynamic print stylesheet for landscape orientation */}
          <style>{`
            @media print {
              @page {
                size: ${paperSize === 'a3' ? 'A3 landscape' : 'A4 landscape'} !important;
                margin: 5mm !important;
              }
              html, body, #root, #root > div {
                background: #ffffff !important;
                background-color: #ffffff !important;
                background-image: none !important;
                color: #000000 !important;
                min-height: 0 !important;
                height: auto !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              header, nav, main, footer,
              #root > div > header,
              #root > div > main,
              #root > div > nav,
              .no-print,
              [class*="wallpaper"],
              [class*="luminous"],
              [class*="blur-"] {
                display: none !important;
              }
              .report-modal-backdrop {
                position: static !important;
                inset: auto !important;
                background: #ffffff !important;
                background-color: #ffffff !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                display: block !important;
              }
              .report-modal-dialog {
                position: static !important;
                max-width: 100% !important;
                width: 100% !important;
                max-height: none !important;
                height: auto !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              .report-sheet-wrapper {
                background: #ffffff !important;
                background-color: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              .printable-document-container {
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 auto !important;
                border: none !important;
                box-shadow: none !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>
          <div className={`bg-white shadow-xl ${onlyGanttLandscape ? 'max-w-6xl' : 'max-w-5xl'} w-full mx-auto rounded-lg p-5 sm:p-8 text-slate-900 border border-slate-300 printable-document-container`}>
            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-lg p-1 bg-white border border-slate-300 flex items-center justify-center flex-shrink-0">
                  <img
                    src={headerLogoUrl}
                    alt="Logo Obra"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-black tracking-widest uppercase bg-[#101D30] text-amber-400 px-2 py-0.5 rounded">
                    {onlyGanttLandscape ? 'Cronograma Técnico & Diagrama de Gantt' : 'Acta de Inspección Técnica'}
                  </span>
                  <h2 className="text-base font-black text-slate-900 uppercase mt-0.5">
                    {targetProject.name}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    {targetProject.location}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="inline-block px-3.5 py-1.5 bg-amber-50 border-2 border-amber-500 rounded-xl text-center shadow-xs">
                  <span className="text-xl sm:text-2xl font-black font-mono text-slate-950">
                    {overallPct}%
                  </span>
                  <span className="block text-[8px] sm:text-[9px] font-black text-amber-800 uppercase tracking-wider">
                    {onlyGanttLandscape ? 'Porcentaje Acumulado Total' : 'Avance Auditado'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs mb-4">
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">
                  {onlyGanttLandscape ? 'Proyecto / Obra' : 'Alcance'}
                </span>
                <span className="font-bold text-slate-800 truncate block">
                  {onlyGanttLandscape
                    ? `${targetProject.name} (Gantt Completo)`
                    : isUnitScope
                    ? targetUnit!.name
                    : `Toda la Obra (${targetProject.units.length} Deptos)`}
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Fecha de Emisión</span>
                <span className="font-bold text-slate-800">{dateString}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">
                  {onlyGanttLandscape && ganttData ? 'Período Cronograma' : 'Hora'}
                </span>
                <span className="font-bold text-slate-800 truncate block">
                  {onlyGanttLandscape && ganttData
                    ? `${ganttData.startDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} — ${ganttData.endDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`
                    : `${timeString} hs`}
                </span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500 uppercase font-bold">Inspector / Supervisor</span>
                <span className="font-bold text-slate-900 truncate block bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                  {inspectorName || 'No asignado'}
                </span>
              </div>
            </div>

            {/* Specialty Breakdown (Oculto en modo Solo Gantt) */}
            {!onlyGanttLandscape && (
              <div className="mb-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1">
                  1. Consolidado de Avance por Especialidad / Gremio
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {tradeSummaries.map(ts => (
                    <div
                      key={ts.id}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <span className="font-bold text-slate-800">{ts.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {ts.done}/{ts.total}
                        </span>
                        <span className={`font-mono font-bold ${ts.pct === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {ts.pct}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Executive Gantt Chart Section */}
            {includeGantt && ganttData && (
              <div className="mb-6 page-break-inside-avoid">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    {onlyGanttLandscape ? 'Diagrama de Gantt con Responsables y Cronograma Integral' : '2. Cronograma de Obra y Diagrama de Gantt'}
                  </h4>
                  <span className="text-[10px] font-bold text-slate-600 font-mono">
                    Período: {ganttData.startDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} — {ganttData.endDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {ganttScale === 'weeks' && ` • (${Math.round(ganttData.daysList.length / 7)} semanas / ${ganttData.daysList.length} días)`}
                  </span>
                </div>

                {/* Timeline Box */}
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50/50 shadow-2xs">
                  {/* Timeline Header */}
                  {ganttScale === 'weeks' ? (
                    <div className="border-b border-slate-300 bg-slate-100 text-slate-700">
                      {/* Sub-row 1: Meses agrupadores */}
                      <div className="flex border-b border-slate-200 bg-slate-200/90 text-[9px] font-black">
                        <div className="w-44 p-1 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-600 text-[8px] font-black flex items-center justify-between px-2">
                          <span>Responsable</span>
                          <span className="text-amber-800 font-mono">({Math.round(ganttData.daysList.length / 7)} sem)</span>
                        </div>
                        <div className="flex-1 flex relative">
                          {ganttData.monthsGroup.map((m, idx) => (
                            <div
                              key={idx}
                              style={{ width: `${m.widthPct}%` }}
                              className="p-0.5 text-center border-r border-slate-300 truncate text-[8px] font-black text-slate-800 tracking-wider bg-slate-200/90"
                            >
                              {m.name} {m.year}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sub-row 2: Cuadros con SOLO la inicial del día (L, M, M, J, V, S, D) y número de día */}
                      <div className="flex">
                        <div className="w-44 p-1 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-600 text-[8.5px] font-black flex items-center px-2">
                          Cuadrilla / Tarea
                        </div>
                        <div className="flex-1 flex relative">
                          {ganttData.daysList.map((d, idx) => (
                            <div
                              key={idx}
                              style={{ width: `${d.widthPct}%` }}
                              className={`py-0.5 text-center border-r border-slate-200/80 shrink-0 flex flex-col justify-center items-center ${
                                d.isWeekend ? 'bg-slate-200/60 text-[#94A3B8]' : 'bg-slate-50 text-slate-800'
                              }`}
                              title={`${d.weekdayLetter} ${d.dayNum} (${d.dateStr})`}
                            >
                              <span className="text-[7.5px] font-black leading-none text-slate-500">
                                {d.weekdayLetter}
                              </span>
                              <span className="text-[8.5px] font-black leading-none mt-0.5">
                                {d.dayNum}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Timeline Header (Months) */
                    <div className="border-b border-slate-300 bg-slate-100 text-slate-700">
                      {/* Fila 1: Meses */}
                      <div className="flex border-b border-slate-200 bg-slate-200/90 text-[10px] font-black">
                        <div className="w-44 p-1.5 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-600 text-[9px] font-black flex items-center px-2">
                          Responsable / Cuadrilla
                        </div>
                        <div className="flex-1 flex relative">
                          {ganttData.monthsList.map((m, idx) => (
                            <div
                              key={idx}
                              style={{ width: `${m.widthPct}%` }}
                              className="p-1 text-center border-r border-slate-300 truncate text-[9px] font-black text-slate-800 bg-slate-200/80"
                            >
                              {m.name} {m.year} ({m.daysCount}d)
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fila 2: Semanas dentro de cada mes */}
                      <div className="flex text-[8px] font-bold text-slate-500">
                        <div className="w-44 p-1 border-r border-slate-300 shrink-0 uppercase tracking-wider text-slate-500 text-[8px] font-bold flex items-center px-2">
                          Cuadrilla / Tarea
                        </div>
                        <div className="flex-1 flex relative">
                          {ganttData.monthsList.map((m, idx) => (
                            <div
                              key={idx}
                              style={{ width: `${m.widthPct}%` }}
                              className="flex border-r border-slate-300"
                            >
                              <div className="flex-1 text-center border-r border-slate-200/60 py-0.5 truncate text-[7.5px]">S1</div>
                              <div className="flex-1 text-center border-r border-slate-200/60 py-0.5 truncate text-[7.5px]">S2</div>
                              <div className="flex-1 text-center border-r border-slate-200/60 py-0.5 truncate text-[7.5px]">S3</div>
                              <div className="flex-1 text-center py-0.5 truncate text-[7.5px]">S4</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Milestones Track */}
                  {ganttData.milestones.length > 0 && (
                    <div className="flex items-center border-b border-slate-200 bg-amber-50/50 py-1.5">
                      <div className="w-44 px-2 text-[10px] font-black text-amber-900 shrink-0 flex items-center gap-1">
                        <Flag className="w-3 h-3 text-amber-600" />
                        <span>Hitos Clave ({ganttData.milestones.length})</span>
                      </div>
                      <div className="flex-1 relative h-6">
                        {/* Vertical guides */}
                        <div className="absolute inset-0 flex pointer-events-none opacity-30">
                          {ganttScale === 'weeks'
                            ? ganttData.daysList.map((d, cIdx) => (
                                <div
                                  key={cIdx}
                                  style={{ width: `${d.widthPct}%` }}
                                  className={`h-full shrink-0 ${
                                    d.weekdayLetter === 'D' ? 'border-r-2 border-amber-400' : 'border-r border-amber-200'
                                  }`}
                                />
                              ))
                            : ganttData.monthsList.map((m, cIdx) => (
                                <div
                                  key={cIdx}
                                  style={{ width: `${m.widthPct}%` }}
                                  className="border-r-2 border-amber-400 h-full shrink-0"
                                />
                              ))}
                        </div>
                        {ganttData.milestones.map((m, idx) => {
                          const pos = ganttData.getMilestonePosition(m.targetDate || m.startDate);
                          const isDone = m.manualCompleted || (m.progressPercentage !== undefined && m.progressPercentage >= 100);
                          return (
                            <div
                              key={m.id || idx}
                              style={{ left: `${pos.leftPct}%` }}
                              className={`absolute top-0.5 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black shadow-2xs whitespace-nowrap z-10 ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-500 text-slate-950'
                              }`}
                              title={`${m.name} (${m.targetDate})`}
                            >
                              <span>◆</span>
                              <span className="truncate max-w-[120px]">{m.name}</span>
                              <span className="opacity-90 font-mono text-[7px]">{formatPMDate(m.targetDate)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Task Rows */}
                  <div className="divide-y divide-slate-200 text-xs">
                    {ganttData.tasksWithPosition.length === 0 ? (
                      <div className="p-3 text-center text-slate-500 text-[11px] italic">
                        No hay tareas programadas para esta obra.
                      </div>
                    ) : (
                      ganttData.tasksWithPosition.map((item, idx) => {
                        const { task, pos, dStart, dEnd, durationDays } = item;
                        const progress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);
                        const isDone = task.completed || progress === 100;
                        const alarms = getTaskAlarms(task);
                        const isCritical = alarms.isCriticalDelay;

                        const barColor = isDone
                          ? 'bg-emerald-600'
                          : isCritical
                          ? 'bg-rose-600'
                          : 'bg-cyan-600';

                        const barBg = isDone
                          ? 'bg-emerald-100/90 border-emerald-400'
                          : isCritical
                          ? 'bg-rose-100/90 border-rose-400'
                          : 'bg-cyan-100/90 border-cyan-400';

                        const dStartFormatted = `${dStart.getDate().toString().padStart(2, '0')}/${(dStart.getMonth() + 1).toString().padStart(2, '0')}`;
                        const dEndFormatted = `${dEnd.getDate().toString().padStart(2, '0')}/${(dEnd.getMonth() + 1).toString().padStart(2, '0')}`;

                        return (
                          <div key={task.id || idx} className="flex items-center hover:bg-slate-50/80 transition-colors py-1.5 border-b border-slate-100">
                            <div className="w-44 px-2 shrink-0 truncate">
                              <span className="font-black text-[10px] text-slate-900 block truncate leading-tight">
                                {task.assignedTo || 'Cuadrilla General'}
                              </span>
                              <span className="text-[8.5px] text-slate-600 font-semibold truncate block">
                                {task.title}
                              </span>
                            </div>
                            <div className="flex-1 relative h-7 bg-slate-100/50 rounded overflow-hidden">
                              {/* Vertical column guides */}
                              <div className="absolute inset-0 flex pointer-events-none opacity-30">
                                {ganttScale === 'weeks'
                                  ? ganttData.daysList.map((d, cIdx) => (
                                      <div
                                        key={cIdx}
                                        style={{ width: `${d.widthPct}%` }}
                                        className={`h-full shrink-0 ${
                                          d.weekdayLetter === 'D' ? 'border-r-2 border-slate-400' : 'border-r border-slate-200'
                                        } ${d.isWeekend ? 'bg-slate-200/20' : ''}`}
                                      />
                                    ))
                                  : ganttData.monthsList.map((m, cIdx) => (
                                      <div
                                        key={cIdx}
                                        style={{ width: `${m.widthPct}%` }}
                                        className="border-r-2 border-slate-400 h-full shrink-0 flex"
                                      >
                                        <div className="flex-1 border-r border-slate-200 h-full" />
                                        <div className="flex-1 border-r border-slate-200 h-full" />
                                        <div className="flex-1 border-r border-slate-200 h-full" />
                                        <div className="flex-1 h-full" />
                                      </div>
                                    ))}
                              </div>

                              {/* Task Bar */}
                              <div
                                style={{
                                  left: `${pos.leftPct}%`,
                                  width: `${pos.widthPct}%`
                                }}
                                className={`absolute top-0.5 bottom-0.5 rounded-md border ${barBg} flex items-center px-1.5 overflow-hidden shadow-xs z-10 transition-all`}
                                title={`${task.title} | ${task.assignedTo || 'Cuadrilla'} | ${dStartFormatted} al ${dEndFormatted} (${durationDays} días) | ${progress}%`}
                              >
                                {/* Progress fill */}
                                <div
                                  style={{ width: `${progress}%` }}
                                  className={`absolute left-0 top-0 bottom-0 ${barColor} opacity-85 transition-all`}
                                />
                                <div className="relative z-10 flex items-center justify-between w-full gap-1.5 text-[9px] font-black text-slate-900 truncate">
                                  <span className="truncate flex items-center gap-1">
                                    {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-800 shrink-0 inline" />}
                                    <span className="truncate">{task.title}</span>
                                    <span className="text-[7.5px] text-slate-600 font-mono font-normal opacity-90 hidden sm:inline">
                                      ({dStartFormatted} - {dEndFormatted})
                                    </span>
                                  </span>
                                  <span className="font-mono text-[8px] bg-white/95 px-1 py-0.2 rounded shadow-2xs shrink-0 font-bold border border-slate-300">
                                    {progress}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Timeline Metrics Footer */}
                <div className="grid grid-cols-4 gap-2 mt-2 text-center text-xs">
                  <div className="bg-slate-100 p-1.5 rounded border border-slate-200">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase">Total Tareas</span>
                    <span className="font-mono font-black text-slate-800 text-xs">{ganttData.tasksWithPosition.length}</span>
                  </div>
                  <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
                    <span className="block text-[8px] font-bold text-emerald-700 uppercase">Completadas</span>
                    <span className="font-mono font-black text-emerald-800 text-xs">
                      {ganttData.tasksWithPosition.filter(t => t.task.completed || t.task.progress === 100).length}
                    </span>
                  </div>
                  <div className="bg-cyan-50 p-1.5 rounded border border-cyan-200">
                    <span className="block text-[8px] font-bold text-cyan-700 uppercase">En Curso</span>
                    <span className="font-mono font-black text-cyan-800 text-xs">
                      {ganttData.tasksWithPosition.filter(t => !t.task.completed && (t.task.progress || 0) > 0 && (t.task.progress || 0) < 100).length}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
                    <span className="block text-[8px] font-bold text-amber-700 uppercase">Hitos de Obra</span>
                    <span className="font-mono font-black text-amber-800 text-xs">{ganttData.milestones.length}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Department / Units Individual Progress Section */}
            {includeUnitsProgress && !onlyGanttLandscape && projectUnits.length > 0 && (
              <div className="mb-6 page-break-inside-avoid">
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1 mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    3. Porcentaje de Avance Individual por Departamento ({projectUnits.length} Unidades)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-600 font-mono">
                    Auditoría Sectorizada
                  </span>
                </div>

                {/* Units Summary Metrics */}
                {(() => {
                  const unitsStats = projectUnits.map(u => {
                    const pct = calculateUnitProgress(u);
                    const counts = getUnitItemCounts(u);
                    return { unit: u, pct, counts };
                  });
                  const totalUnits = unitsStats.length;
                  const completedUnits = unitsStats.filter(u => u.pct === 100).length;
                  const inProgressUnits = unitsStats.filter(u => u.pct > 0 && u.pct < 100).length;
                  const pendingUnits = unitsStats.filter(u => u.pct === 0).length;
                  const avgPct = totalUnits > 0
                    ? Math.round(unitsStats.reduce((acc, u) => acc + u.pct, 0) / totalUnits)
                    : 0;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                        <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase">Total Unidades</span>
                          <span className="font-mono font-black text-slate-800 text-sm">{totalUnits}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                          <span className="block text-[8px] font-bold text-emerald-700 uppercase">Finalizadas (100%)</span>
                          <span className="font-mono font-black text-emerald-800 text-sm">{completedUnits}</span>
                        </div>
                        <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                          <span className="block text-[8px] font-bold text-amber-700 uppercase">En Ejecución</span>
                          <span className="font-mono font-black text-amber-800 text-sm">{inProgressUnits}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase">Pendientes (0%)</span>
                          <span className="font-mono font-black text-slate-700 text-sm">{pendingUnits}</span>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200 col-span-2 sm:col-span-1">
                          <span className="block text-[8px] font-bold text-indigo-700 uppercase">Promedio Obra</span>
                          <span className="font-mono font-black text-indigo-800 text-sm">{avgPct}%</span>
                        </div>
                      </div>

                      {/* Panoramic 3-column Units Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        {unitsStats.map(({ unit, pct, counts }) => {
                          const isComplete = pct === 100;
                          const isPartial = pct > 0 && !isComplete;
                          const isTargetScope = targetUnit && targetUnit.id === unit.id;

                          return (
                            <div
                              key={unit.id}
                              className={`p-2.5 rounded-lg border transition-all ${
                                isTargetScope
                                  ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/40'
                                  : isComplete
                                  ? 'bg-emerald-50/50 border-emerald-300'
                                  : isPartial
                                  ? 'bg-white border-slate-200'
                                  : 'bg-slate-50/60 border-slate-200 opacity-80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1 mb-1.5">
                                <div>
                                  <h5 className="font-black text-xs text-slate-900 leading-tight">
                                    {unit.name}
                                  </h5>
                                  <span className="text-[9px] text-slate-500 font-medium">
                                    {unit.floorLabel || unit.category || (unit.type === 'common_area' ? 'Área Común' : 'Departamento')}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className={`font-mono font-black text-sm ${
                                    isComplete ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-[#94A3B8]'
                                  }`}>
                                    {pct}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1.5">
                                <div
                                  style={{ width: `${pct}%` }}
                                  className={`h-full rounded-full transition-all ${
                                    isComplete
                                      ? 'bg-emerald-600'
                                      : isPartial
                                      ? 'bg-amber-500'
                                      : 'bg-slate-400'
                                  }`}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                                <span>{counts.completed} de {counts.total} ítems</span>
                                {unit.signature ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3 stroke-[3]" /> Firmado
                                  </span>
                                ) : (
                                  <span className="text-[#94A3B8]">Sin firmar</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 4. Checklist Details and Photo Evidence */}
            {!onlyGanttLandscape && (
              <div className="mb-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-200 pb-1">
                  4. Detalle de Control y Evidencias Fotográficas ({totalPhotos} Fotos)
                </h4>

              {tradeSummaries.map(ts => (
                <div key={ts.id} className="mb-3 page-break-inside-avoid">
                  <div className="bg-[#17263B] text-white px-2.5 py-1 rounded-lg text-xs font-bold flex justify-between items-center mb-1.5">
                    <span>{ts.name}</span>
                    <span className="text-amber-400 font-mono">{ts.pct}%</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {ts.items.map((itObj, idx) => {
                      const item = itObj.item;
                      const hasPhotos = includePhotos && item.photos && item.photos.length > 0;

                      const itemPct = item.progressPercentage !== undefined ? item.progressPercentage : (item.completed ? 100 : 0);
                      const isComplete = item.completed || itemPct === 100;
                      const isPartial = !isComplete && itemPct > 0;

                      return (
                        <div
                          key={item.id || idx}
                          className={`p-2 border rounded-lg ${
                            isComplete
                              ? 'bg-emerald-50/40 border-emerald-300'
                              : isPartial
                              ? 'bg-amber-50/40 border-amber-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-black ${
                                isComplete 
                                  ? 'text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded' 
                                  : isPartial
                                  ? 'text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded'
                                  : 'text-[#94A3B8] bg-slate-100 px-1.5 py-0.5 rounded'
                              }`}>
                                {isComplete ? '✔ APROBADO (100%)' : isPartial ? `⏳ EN CURSO (${itemPct}%)` : '○ PENDIENTE (0%)'}
                              </span>
                              <span className={`font-bold ${isComplete ? 'text-emerald-800' : 'text-slate-900'}`}>
                                {item.name}
                              </span>
                              {!isUnitScope && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                  {itObj.unitName}
                                </span>
                              )}
                            </div>

                            {hasPhotos && (
                              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                {item.photos.length} Foto(s)
                              </span>
                            )}
                          </div>

                          {/* Technical Observation / Note */}
                          {includeComments && item.comment && (
                            <div className={`mt-1.5 text-[11px] rounded-md px-2.5 py-1.5 flex items-start gap-1.5 border ${
                              item.severity === 'high'
                                ? 'bg-rose-50 border-rose-300 text-rose-950'
                                : item.severity === 'medium'
                                ? 'bg-amber-50 border-amber-300 text-amber-950'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}>
                              <span className="font-bold flex-shrink-0 text-[10px] uppercase tracking-wide">
                                💬 Observación {item.severity === 'high' ? '• CRÍTICA' : item.severity === 'medium' ? '• MEDIA' : '• LEVE'}:
                              </span>
                              <span className="font-medium leading-snug">
                                {item.comment}
                              </span>
                            </div>
                          )}

                          {/* Photos Evidence Grid */}
                          {hasPhotos && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200">
                              {item.photos.map((ph: any, pIdx: number) => (
                                <div
                                  key={ph.id || pIdx}
                                  className="rounded-lg overflow-hidden border border-slate-300 bg-white p-1 shadow-2xs"
                                >
                                  <img
                                    src={ph.dataUrl}
                                    alt={`Evidencia ${pIdx + 1}`}
                                    className="w-full h-24 object-contain bg-slate-100 rounded"
                                  />
                                  <span className="block text-[8px] text-slate-500 mt-1 font-mono text-center truncate">
                                    {ph.timestamp || 'Inspección'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Signatures & Acceptance Certificate */}
            {includeSignatures && (
              <div className="mt-8 pt-4 border-t-2 border-slate-900 page-break-inside-avoid">
                <h4 className="text-xs font-black uppercase text-slate-800 mb-6 text-center">
                  {onlyGanttLandscape ? 'Validación y Firmas Técnicas de Cronograma' : '5. Firmas de Conformidad y Recepción Técnica'}
                </h4>

                {isUnitScope && targetUnit?.signature ? (
                  <div className="p-4 bg-slate-50 border-2 border-slate-900 rounded-xl mb-4">
                    <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                          ✔ Acta Digitalmente Firmada y Aprobada
                        </span>
                        <h5 className="font-bold text-slate-900 text-xs mt-1">
                          Recepción Técnica de: {targetUnit.name}
                        </h5>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 font-mono">
                        <span>Registrada: {targetUnit.signedAt || dateString}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 items-end text-xs">
                      {/* Captured Digital Signature Box */}
                      <div className="text-center">
                        <div className="h-16 flex items-center justify-center bg-white border border-dashed border-slate-300 rounded-lg p-1 mb-1 shadow-2xs">
                          <img
                            src={targetUnit.signature}
                            alt="Firma Digital"
                            className="max-h-14 max-w-full object-contain"
                          />
                        </div>
                        <p className="font-black text-slate-900 text-xs">{targetUnit.signedBy || inspectorName}</p>
                        <p className="text-[10px] text-slate-600 font-bold">{targetUnit.signRole || 'Supervisor Técnico de Obra'}</p>
                        {targetUnit.signDni && (
                          <p className="text-[9px] text-slate-500 font-mono">{targetUnit.signDni}</p>
                        )}
                      </div>

                      {/* Direction / Contractor Block */}
                      <div className="text-center">
                        <div className="border-b border-slate-900 h-16 mb-1 flex items-end justify-center pb-1">
                          <span className="text-[10px] text-[#94A3B8] italic">Sello / Rúbrica Dirección</span>
                        </div>
                        <p className="font-bold text-slate-900">Dirección de Obra / Ejecución</p>
                        <p className="text-[10px] text-slate-500">Constatación y Cierre de Tareas</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                      <div className="border-b border-slate-900 h-14 mb-1" />
                      <p className="font-bold text-slate-900">{inspectorName}</p>
                      <p className="text-[10px] text-slate-500">Supervisión e Inspección Técnica de Obra</p>
                    </div>

                    <div>
                      <div className="border-b border-slate-900 h-14 mb-1" />
                      <p className="font-bold text-slate-900">Dirección de Obra / Contratista</p>
                      <p className="text-[10px] text-slate-500">Responsable de Ejecución en Terreno</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Non-Printable Bottom Actions */}
        <div className="p-3 bg-[#101D30] border-t border-[#29384C] flex items-center justify-between no-print">
          <button
            onClick={onExportJSON}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 touch-target font-medium"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Respaldo JSON</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-[#17263B] text-slate-300 text-xs font-semibold touch-target"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow touch-target"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
