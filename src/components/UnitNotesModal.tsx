import React, { useState, useMemo } from 'react';
import {
  X,
  StickyNote,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Search,
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';
import { Unit, UnitNote } from '../types';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

interface UnitNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  unit: Unit;
  onSaveNote: (unitId: string, note: Omit<UnitNote, 'id' | 'createdAt'> & { id?: string }) => void;
  onDeleteNote: (unitId: string, noteId: string) => void;
  onToggleNote: (unitId: string, noteId: string) => void;
}

export function UnitNotesModal({
  isOpen,
  onClose,
  projectName,
  unit,
  onSaveNote,
  onDeleteNote,
  onToggleNote
}: UnitNotesModalProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [targetDate, setTargetDate] = useState('');

  // Transient feedback
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const notes = unit.notes || [];

  const pendingCount = useMemo(() => notes.filter(n => !n.completed).length, [notes]);
  const completedCount = useMemo(() => notes.filter(n => n.completed).length, [notes]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        if (filter === 'pending') return !n.completed;
        if (filter === 'completed') return n.completed;
        return true;
      })
      .filter(n => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        // Pending first
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;

        // Urgent first
        const priorityWeight = (p?: string) => (p === 'urgent' ? 3 : p === 'important' ? 2 : 1);
        const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (pDiff !== 0) return pDiff;

        // Newest first
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [notes, filter, searchTerm]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('normal');
    setTargetDate('');
    setEditingNoteId(null);
    setIsFormOpen(false);
  };

  const handleStartEdit = (note: UnitNote) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setDescription(note.description);
    setPriority(note.priority || 'normal');
    setTargetDate(note.targetDate || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveNote(unit.id, {
      id: editingNoteId || undefined,
      title: title.trim(),
      description: description.trim(),
      priority,
      targetDate: targetDate || undefined
    });

    resetForm();
  };

  const formatNoteDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' hs'
      );
    } catch {
      return isoStr;
    }
  };

  const buildSingleNoteWhatsAppText = (note: UnitNote) => {
    const priorityLabel =
      note.priority === 'urgent'
        ? '🔴 URGENTE'
        : note.priority === 'important'
        ? '🟠 IMPORTANTE'
        : '🔵 NORMAL';
    const statusLabel = note.completed ? '✅ Realizado' : '⏳ Pendiente';
    const dateFormatted = formatNoteDate(note.createdAt);

    return (
      `🏗️ *CONTROL DE AVANCE DE OBRA*\n` +
      `📋 *NOTA TÉCNICA - COSAS A REALIZAR*\n\n` +
      `🏢 *OBRA:* ${projectName}\n` +
      `📍 *DEPARTAMENTO:* ${unit.name}\n` +
      (dateFormatted ? `📅 *REGISTRO:* ${dateFormatted}\n` : '') +
      (note.targetDate ? `⏳ *FECHA OBJETIVO:* ${note.targetDate}\n` : '') +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 *ASUNTO:* ${note.title}\n\n` +
      `📝 *DETALLE / TAREAS A REALIZAR:*\n${note.description || '(Sin detalle adicional)'}\n\n` +
      `⚡ *ESTADO:* ${statusLabel}\n` +
      `⚠️ *PRIORIDAD:* ${priorityLabel}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Registro técnico - Control de Avance de Obras_`
    );
  };

  const handleSendWhatsAppSingle = (note: UnitNote) => {
    const text = buildSingleNoteWhatsAppText(note);
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
  };

  const handleCopyNoteText = (note: UnitNote) => {
    const text = buildSingleNoteWhatsAppText(note);
    navigator.clipboard.writeText(text);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2500);
  };

  const buildSummaryWhatsAppText = () => {
    const notesToInclude =
      filter === 'completed'
        ? notes.filter(n => n.completed)
        : notes.filter(n => !n.completed).length > 0
        ? notes.filter(n => !n.completed)
        : notes;

    const dateFormatted =
      new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' hs';

    let text =
      `🏗️ *CONTROL DE AVANCE DE OBRA*\n` +
      `📋 *RESUMEN DE NOTAS Y PENDIENTES*\n\n` +
      `🏢 *OBRA:* ${projectName}\n` +
      `📍 *DEPARTAMENTO:* ${unit.name}\n` +
      `📅 *FECHA DE EMISIÓN:* ${dateFormatted}\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 *LISTADO DE TAREAS (${notesToInclude.length}):*\n\n`;

    notesToInclude.forEach((n, idx) => {
      const pIcon = n.priority === 'urgent' ? '🔴' : n.priority === 'important' ? '🟠' : '🔵';
      const status = n.completed ? '✔ Realizado' : '⏳ Pendiente';
      text += `${idx + 1}. ${pIcon} *${n.title}* [${status}]\n`;
      if (n.description) {
        text += `   _${n.description.trim()}_\n`;
      }
      if (n.targetDate) {
        text += `   📅 Objetivo: ${n.targetDate}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n_Enviado desde Control de Avance de Obras_`;
    return text;
  };

  const handleSendWhatsAppSummary = () => {
    const text = buildSummaryWhatsAppText();
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text), '_blank');
  };

  const handleCopySummary = () => {
    const text = buildSummaryWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0c1424] border border-[#23354d] shadow-2xl overflow-hidden text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1c2c42] bg-[#101b2d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <StickyNote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide truncate">
                  Notas y Cosas a Realizar
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#17263b] text-[#00f2fe] border border-[#00f2fe]/30 font-mono">
                  {unit.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Obra: <strong className="text-slate-200">{projectName}</strong> • {notes.length}{' '}
                {notes.length === 1 ? 'nota' : 'notas'} ({pendingCount} pendientes)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notes.length > 0 && (
              <button
                type="button"
                onClick={handleSendWhatsAppSummary}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                title="Enviar resumen completo del departamento por WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 fill-emerald-400" />
                <span>Resumen WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar / Summary & Filters */}
        <div className="px-5 py-3 border-b border-[#1c2c42] bg-[#0e1726] flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#132034] p-1 rounded-xl border border-[#21354e]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'pending'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pendientes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Realizadas ({completedCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            {/* Search input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar en notas..."
                className="w-full bg-[#132034] text-xs text-white pl-8 pr-3 py-1.5 rounded-xl border border-[#21354e] focus:border-amber-400 focus:outline-none placeholder:text-slate-500"
              />
            </div>

            {/* Toggle form button */}
            {!isFormOpen && (
              <button
                type="button"
                onClick={() => {
                  setEditingNoteId(null);
                  setTitle('');
                  setDescription('');
                  setPriority('normal');
                  setTargetDate('');
                  setIsFormOpen(true);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nueva Nota</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* New / Edit Note Form Card */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#132238] border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3.5 animate-in slide-in-from-top-3 duration-200"
            >
              <div className="flex items-center justify-between border-b border-[#21354e] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    {editingNoteId ? 'Editar Nota' : 'Nueva Nota para este Departamento'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Título de la Nota / Cosa a Realizar *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Falta sellar zócalo de mesada, ajustar picaporte puerta balcón..."
                  className="w-full bg-[#0c1523] border border-[#253a55] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descripción o Detalle Técnico
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Anota aquí todo lo que hay que hacer para cuando llegue el momento recordarlo con claridad..."
                  className="w-full bg-[#0c1523] border border-[#253a55] rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Priority Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nivel de Prioridad
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPriority('normal')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        priority === 'normal'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                          : 'bg-[#0c1523] text-slate-400 border-[#253a55] hover:text-slate-200'
                      }`}
                    >
                      🔵 Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('important')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        priority === 'important'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-[#0c1523] text-slate-400 border-[#253a55] hover:text-slate-200'
                      }`}
                    >
                      🟠 Importante
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('urgent')}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                        priority === 'urgent'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                          : 'bg-[#0c1523] text-slate-400 border-[#253a55] hover:text-slate-200'
                      }`}
                    >
                      🔴 Urgente
                    </button>
                  </div>
                </div>

                {/* Optional Target Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Fecha Objetivo (Opcional)
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-[#0c1523] border border-[#253a55] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#21354e]">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{editingNoteId ? 'Actualizar Nota' : 'Guardar Nota'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Notes List */}
          {filteredNotes.length === 0 ? (
            <div className="py-12 px-4 text-center border-2 border-dashed border-[#1c2c42] rounded-3xl bg-[#0f192b]/40">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center text-amber-400 mb-3 shadow-inner">
                <StickyNote className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                {searchTerm
                  ? 'No se encontraron notas con esa búsqueda'
                  : filter === 'completed'
                  ? 'No hay notas realizadas aún'
                  : filter === 'pending'
                  ? 'No hay notas pendientes en este departamento'
                  : 'Aún no hay notas cargadas para este departamento'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 leading-relaxed">
                Anota aquí todas las cosas que tienes que hacer o verificar en{' '}
                <strong>{unit.name}</strong> para que cuando llegue el momento las recuerdes con
                facilidad y puedas compartirlas por WhatsApp.
              </p>
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Agregar Primera Nota</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map(note => {
                const isUrgent = note.priority === 'urgent';
                const isImportant = note.priority === 'important';
                const isCopied = copiedNoteId === note.id;

                const borderAccent = isUrgent
                  ? 'border-l-4 border-l-rose-500'
                  : isImportant
                  ? 'border-l-4 border-l-amber-500'
                  : 'border-l-4 border-l-cyan-500';

                return (
                  <div
                    key={note.id}
                    className={`rounded-2xl p-4 border transition-all relative group bg-[#111c2e] ${borderAccent} ${
                      note.completed
                        ? 'border-[#1b2b40] opacity-75 bg-[#0d1624]'
                        : 'border-[#22354c] hover:border-[#2f4969] shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Checkbox + Title */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onToggleNote(unit.id, note.id)}
                          className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                          title={
                            note.completed ? 'Marcar como pendiente' : 'Marcar como realizada'
                          }
                        >
                          {note.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500 hover:text-emerald-400" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-sm font-bold tracking-wide break-words ${
                                note.completed
                                  ? 'line-through text-slate-400'
                                  : 'text-white'
                              }`}
                            >
                              {note.title}
                            </h4>

                            {/* Priority Badge */}
                            {note.priority === 'urgent' && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                Urgente
                              </span>
                            )}
                            {note.priority === 'important' && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Importante
                              </span>
                            )}
                            {note.priority === 'normal' && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Normal
                              </span>
                            )}

                            {note.completed && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                ✔ Realizado
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {note.description && (
                            <p className="text-xs text-slate-300 mt-2 whitespace-pre-line leading-relaxed bg-[#0a121f]/60 p-2.5 rounded-xl border border-[#1b2b40]">
                              {note.description}
                            </p>
                          )}

                          {/* Meta: Dates */}
                          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatNoteDate(note.createdAt)}
                            </span>

                            {note.targetDate && (
                              <span className="flex items-center gap-1 text-amber-400/90 font-medium">
                                <Calendar className="w-3 h-3 text-amber-400" />
                                Objetivo: {note.targetDate}
                              </span>
                            )}

                            {note.completed && note.completedAt && (
                              <span className="text-emerald-400/90 font-mono text-[10px]">
                                Finalizado: {formatNoteDate(note.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {/* WhatsApp Button */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppSingle(note)}
                          className="p-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
                          title="Enviar esta nota por WhatsApp a quien quieras con registro de Obra y Depto"
                        >
                          <WhatsAppIcon className="w-4 h-4 fill-emerald-400" />
                          <span className="hidden sm:inline text-[11px]">WhatsApp</span>
                        </button>

                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyNoteText(note)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Copiar texto para WhatsApp u otras apps"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(note)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          title="Editar nota"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`¿Eliminar la nota "${note.title}"?`)) {
                              onDeleteNote(unit.id, note.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar nota"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#1c2c42] bg-[#0e1726] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Las notas quedan guardadas para <strong>{unit.name}</strong> y sincronizadas en la Nube.
            </span>
          </div>

          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 bg-[#17263b] hover:bg-[#1f324d] text-slate-300 border border-[#29384c] rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all"
                title="Copiar todas las notas como texto al portapapeles"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSummary ? '¡Copiado!' : 'Copiar Lista'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
