import React from 'react';
import { AlertCircle, Calendar, Flag, Sparkles } from 'lucide-react';
import { Milestone, Project } from '../types';

interface ExecutiveTimelineProps {
  startDate?: string;
  estimatedEndDate?: string;
  progress: number;
  delayMonths?: number;
  className?: string;
  milestones?: Milestone[];
  project?: Project;
}

export function ExecutiveTimeline({
  startDate,
  estimatedEndDate,
  progress,
  delayMonths = 3,
  className = '',
  milestones = [],
  project
}: ExecutiveTimelineProps) {
  // Format readable dates
  const formatShortDate = (isoStr?: string, fallback: string = '2025') => {
    if (!isoStr) return fallback;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return isoStr;
    }
  };

  const startLabel = startDate ? formatShortDate(startDate, 'Ene 2025') : 'Ene 2025';
  const endLabel = estimatedEndDate ? formatShortDate(estimatedEndDate, 'Oct 2026') : 'Oct 2026';
  const currentYear = new Date().getFullYear();

  // Position of 'Hoy' along the 0-100% axis
  const hoyPercent = 56;

  // Filter upcoming milestones (hitos por empezar / pendientes)
  const upcomingMilestones = (milestones.length > 0
    ? milestones.filter(m => !m.manualCompleted)
    : [
        { id: 'def_1', name: 'Muros y Tabiques', targetDate: '2026-09-22', linkType: 'item', linkedTradeId: 'albanileria', minPercentageRequired: 100 },
        { id: 'def_2', name: 'Cajas Eléctricas', targetDate: '2026-10-10', linkType: 'item', linkedTradeId: 'electricidad', minPercentageRequired: 100 }
      ]
  ) as Milestone[];

  // Compute positions for 1 or 2 milestone markers along the track between Hoy and Fin
  const markerPositions = [74, 88];

  return (
    <div className={`space-y-2 select-none ${className}`}>
      {/* Top Labels Row */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1">
        <span>Inicio</span>
        <span className="text-white flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          Hoy
        </span>
        <span>Fin Estimado</span>
      </div>

      {/* Horizontal Bar with Nodes */}
      <div className="relative pt-6 pb-2.5 flex items-center">
        {/* Base Track */}
        <div className="absolute inset-x-0 h-1 bg-slate-800 rounded-full" />

        {/* Progress Track (Inicio to Hoy) in Cyan/Emerald */}
        <div
          className="absolute left-0 h-1 bg-gradient-to-r from-emerald-500 to-[#00f2fe] rounded-full shadow-[0_0_8px_rgba(0,242,254,0.4)]"
          style={{ width: `${hoyPercent}%` }}
        />

        {/* Delay Track (Hoy to End) in Coral/Salmon */}
        <div
          className="absolute h-1 bg-[#f87171] rounded-full shadow-[0_0_8px_rgba(248,113,113,0.5)]"
          style={{ left: `${hoyPercent}%`, width: `${100 - hoyPercent}%` }}
        />

        {/* Node 1: Inicio (Cyan ring with inner point) */}
        <div className="absolute left-0 -translate-x-1/2 w-4 h-4 rounded-full bg-slate-950 border-2 border-[#00f2fe] shadow-[0_0_8px_rgba(0,242,254,0.5)] flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00f2fe]" />
        </div>

        {/* Node 2: Hoy with Floating Demora Speech Bubble above it */}
        <div
          className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
          style={{ left: `${hoyPercent}%` }}
        >
          {delayMonths > 0 && (
            <div className="absolute -top-6 flex flex-col items-center">
              <span className="bg-[#f87171] text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-black shadow-[0_0_10px_rgba(248,113,113,0.4)] whitespace-nowrap">
                DEMORA: +{delayMonths} meses
              </span>
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#f87171]" />
            </div>
          )}
          <div className="w-4 h-4 rounded-full bg-slate-950 border-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          </div>
        </div>

        {/* Milestone Nodes: Hitos por Empezar along the track */}
        {upcomingMilestones.slice(0, 2).map((m, idx) => {
          const pos = markerPositions[idx] || 78;
          return (
            <div
              key={m.id || idx}
              className="absolute -translate-x-1/2 flex flex-col items-center group/ms cursor-pointer"
              style={{ left: `${pos}%` }}
              title={`Hito por empezar: ${m.name} (${formatShortDate(m.targetDate)})`}
            >
              {/* Floating micro badge on hover */}
              <div className="absolute -top-5 hidden group-hover/ms:flex flex-col items-center pointer-events-none z-20">
                <span className="bg-[#162238] border border-[#00f2fe] text-[#00f2fe] px-1.5 py-0.2 rounded text-[8px] font-black whitespace-nowrap shadow-lg">
                  {m.name}
                </span>
              </div>
              {/* Diamond Node */}
              <div className="w-3 h-3 rotate-45 bg-[#0e1422] border-2 border-[#00f2fe] shadow-[0_0_8px_rgba(0,242,254,0.5)] flex items-center justify-center transition-transform group-hover/ms:scale-125">
                <div className="w-1 h-1 bg-[#00f2fe]" />
              </div>
            </div>
          );
        })}

        {/* Node 3: Fin Estimado (Amber Upward Triangle) */}
        <div className="absolute right-0 translate-x-1/2 flex items-center justify-center">
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-amber-400 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
        </div>
      </div>

      {/* Dates Row */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-0.5">
        <span>{startLabel}</span>
        <span className="text-slate-300 font-black">{currentYear}</span>
        <span>{endLabel}</span>
      </div>

      {/* Dedicated "Hitos por empezar" Capsule Row */}
      <div className="pt-2 border-t border-slate-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px]">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#00f2fe] shadow-[0_0_6px_rgba(0,242,254,0.8)] animate-pulse" />
          <span className="text-[#00f2fe] font-black uppercase tracking-wider text-[9.5px]">
            Hitos por Empezar:
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {upcomingMilestones.slice(0, 2).map((m, idx) => (
            <span
              key={m.id || idx}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#162238] border border-[#00f2fe]/40 text-slate-200 font-bold truncate max-w-[170px]"
              title={m.name}
            >
              <span className="text-[#00f2fe]">📌</span>
              <span className="truncate">{m.name}</span>
              {m.targetDate && (
                <span className="text-[9px] text-amber-400 font-mono font-bold">
                  ({formatShortDate(m.targetDate)})
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
