import { CalendarEventType } from '../types';

export interface CalendarTypeStyle {
  type: CalendarEventType;
  label: string;
  shortLabel: string;
  badgeClass: string;
  bgChip: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  activeBtnClass: string;
  inactiveBtnClass: string;
  hex: string;
  iconName: 'note' | 'task' | 'meeting' | 'alarm';
}

export function normalizeCalendarType(type?: string): CalendarEventType {
  if (!type) return 'task';
  const t = type.toLowerCase();
  if (t === 'nota' || t === 'note') return 'note';
  if (t === 'tarea' || t === 'task') return 'task';
  if (t === 'reunion' || t === 'reunión' || t === 'meeting' || t === 'event') return 'meeting';
  if (t === 'alarma' || t === 'alarm') return 'alarm';
  return 'task';
}

export function getCalendarTypeStyle(rawType?: string): CalendarTypeStyle {
  const normType = normalizeCalendarType(rawType);

  switch (normType) {
    case 'note':
      return {
        type: 'note',
        label: 'Nota',
        shortLabel: 'Nota',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        bgChip: 'bg-amber-500/25 text-amber-200 border-amber-400/60',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500',
        dotClass: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
        activeBtnClass: 'bg-amber-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)] border-amber-400 ring-2 ring-amber-400/40',
        inactiveBtnClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20',
        hex: '#eab308',
        iconName: 'note'
      };

    case 'task':
      return {
        type: 'task',
        label: 'Tarea',
        shortLabel: 'Tarea',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
        bgChip: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500',
        dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
        activeBtnClass: 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)] border-emerald-400 ring-2 ring-emerald-400/40',
        inactiveBtnClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
        hex: '#10b981',
        iconName: 'task'
      };

    case 'meeting':
    case 'event':
      return {
        type: 'meeting',
        label: 'Reunión',
        shortLabel: 'Reunión',
        badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
        bgChip: 'bg-blue-600/25 text-blue-200 border-blue-400/60',
        textClass: 'text-blue-400',
        borderClass: 'border-blue-500',
        dotClass: 'bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,0.6)]',
        activeBtnClass: 'bg-blue-600 text-white font-black shadow-[0_0_12px_rgba(59,130,246,0.5)] border-blue-400 ring-2 ring-blue-400/40',
        inactiveBtnClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
        hex: '#2563eb',
        iconName: 'meeting'
      };

    case 'alarm':
    default:
      return {
        type: 'alarm',
        label: 'Alarma',
        shortLabel: 'Alarma',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
        bgChip: 'bg-rose-500/25 text-rose-200 border-rose-400/60',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500',
        dotClass: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse',
        activeBtnClass: 'bg-rose-600 text-white font-black shadow-[0_0_12px_rgba(244,63,94,0.5)] border-rose-400 ring-2 ring-rose-400/40',
        inactiveBtnClass: 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20',
        hex: '#ef4444',
        iconName: 'alarm'
      };
  }
}
