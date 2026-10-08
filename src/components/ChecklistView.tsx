import React, { useState, useMemo } from 'react';
import {
  FileText,
  Check,
  X,
  Camera,
  Trash2,
  Plus,
  ChevronDown,
  Layers,
  Clock,
  CircleCheck,
  BrickWall,
  Pipette,
  Zap,
  DoorOpen,
  Maximize2,
  Wrench,
  ChevronsDown,
  ChevronsUp,
  Pencil,
  MessageSquare,
  MessageSquareText,
  FileSpreadsheet,
  Building2,
  Flame,
  AlertTriangle,
  PenTool,
  Lock,
  Unlock,
  FileCheck2,
  Compass,
  SlidersHorizontal
} from 'lucide-react';
import { Project, Unit, TaskFilter, InspectionItem, Trade } from '../types';
import { calculateUnitProgress, getUnitItemCounts, isUnitCommonArea, isTradeMatchingFilter, hexToRgba } from '../utils/calculations';
import { MASTER_TRADES_TEMPLATE } from '../data/initialData';
import { ItemObservationModal } from './ItemObservationModal';
import { AddItemScopeModal } from './AddItemScopeModal';
import { AnimatedCircularProgress } from './AnimatedCircularProgress';
import { ExecutiveDonutChart } from './ExecutiveDonutChart';

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

interface ChecklistViewProps {
  project: Project;
  unit: Unit;
  allProjects?: Project[];
  neonColor?: string;
  onToggleItem: (tradeId: string, itemId: string) => void;
  onUpdateItemProgress: (tradeId: string, itemId: string, percentage: number) => void;
  onDeleteItem: (tradeId: string, itemId: string) => void;
  onEditItem?: (tradeId: string, itemId: string, newName: string) => void;
  onAddItem: (tradeId: string, itemName: string, scopeTarget?: 'current_unit' | 'all_units') => void;
  onSaveComment: (tradeId: string, itemId: string, comment: string) => void;
  onSaveObservation?: (
    tradeId: string,
    itemId: string,
    comment: string,
    severity: 'low' | 'medium' | 'high' | undefined,
    isExplicitDelete?: boolean
  ) => void;
  onOpenPhotoViewer: (tradeId: string, itemId: string, tradeName?: string, itemName?: string) => void;
  onAddPhoto?: (tradeId: string, itemId: string, dataUrl: string) => void;
  onDeletePhoto?: (tradeId: string, itemId: string, photoId: string) => void;
  onOpenReportModal: (type?: 'auto' | 'project' | 'unit', projId?: string, unitId?: string) => void;
  onExportExcel?: (projectId: string, unitId: string) => void;
  onEditUnit: (unit: Unit) => void;
  onRequestDeleteUnit?: (unitId: string, unitName: string) => void;
  onAddTrade?: (tradeName: string, scope?: 'current_unit' | 'all_units') => void;
  onDeleteTrade?: (tradeId: string, tradeName: string, scope?: 'current_unit' | 'all_units') => void;
  onOpenSignatureModal?: (unitId: string) => void;
  onUnlockUnit?: (unitId: string) => void;
  onOpenBlueprints?: () => void;
  onOpenCroquis?: (unitId?: string) => void;
}

export function ChecklistView({
  project,
  unit,
  allProjects,
  onToggleItem,
  onUpdateItemProgress,
  onDeleteItem,
  onEditItem,
  onAddItem,
  onSaveComment,
  onOpenPhotoViewer,
  onTriggerQuickPhoto,
  onOpenReportModal,
  onEditUnit,
  onRequestDeleteUnit,
  onExportExcel,
  onOpenSignatureModal,
  onSaveObservation,
  onAddPhoto,
  onDeletePhoto,
  onUnlockUnit,
  onOpenBlueprints,
  onAddTrade,
  onDeleteTrade,
  onOpenCroquis,
  neonColor = '#00f2fe'
}: ChecklistViewProps) {
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [selectedTradeFilter, setSelectedTradeFilter] = useState<string>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<TaskFilter>('all');
  const [tradeSectionTab, setTradeSectionTab] = useState<'filter' | 'manage'>('filter');
  const [newTradeNameDraft, setNewTradeNameDraft] = useState<string>('');
  const [newTradeScope, setNewTradeScope] = useState<'current_unit' | 'all_units'>('current_unit');
  const [collapsedTrades, setCollapsedTrades] = useState<Record<string, boolean>>({});
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [unitCardHoverTrigger, setUnitCardHoverTrigger] = useState(0);
  const [editingCommentItemId, setEditingCommentItemId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>('');
  const [observationModalItem, setObservationModalItem] = useState<{
    tradeId: string;
    tradeName: string;
    item: InspectionItem;
  } | null>(null);
  const [pendingItemToAdd, setPendingItemToAdd] = useState<{
    tradeId: string;
    tradeName: string;
    itemName: string;
  } | null>(null);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemNameDraft, setEditingItemNameDraft] = useState<string>('');

  const handleStartEditItem = (item: InspectionItem) => {
    setEditingItemId(item.id);
    setEditingItemNameDraft(item.name);
  };

  const handleSaveEditItem = (tradeId: string, itemId: string) => {
    const trimmed = editingItemNameDraft.trim();
    if (trimmed && onEditItem) {
      onEditItem(tradeId, itemId, trimmed);
    }
    setEditingItemId(null);
  };

  const unitTradesList = useMemo(() => {
    const map = new Map<string, Trade>();
    unit.trades.forEach(t => {
      const key = t.name.toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, { ...t, items: [...(t.items || [])] });
      } else {
        const existing = map.get(key)!;
        const existingItemIds = new Set(existing.items.map(i => i.id));
        (t.items || []).forEach(item => {
          if (!existingItemIds.has(item.id)) {
            existing.items.push(item);
            existingItemIds.add(item.id);
          }
        });
      }
    });
    return Array.from(map.values());
  }, [unit.trades]);

  const unitPct = calculateUnitProgress(unit, selectedTradeFilter);
  const globalUnitPct = calculateUnitProgress(unit, 'all');
  const counts = getUnitItemCounts(unit, selectedTradeFilter);
  const activeTradeObj = unitTradesList.find(t => isTradeMatchingFilter(t, selectedTradeFilter)) || MASTER_TRADES_TEMPLATE.find(t => isTradeMatchingFilter(t, selectedTradeFilter));

  const toggleTrade = (tradeId: string) => {
    setCollapsedTrades(prev => ({ ...prev, [tradeId]: !prev[tradeId] }));
  };

  const toggleAll = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    unitTradesList.forEach(t => {
      nextState[t.id] = !expand;
    });
    setCollapsedTrades(nextState);
  };

  const handleAddTaskSubmit = (e: React.FormEvent, tradeId: string, tradeName: string) => {
    e.preventDefault();
    const name = newTaskNames[tradeId]?.trim();
    if (!name) return;
    setPendingItemToAdd({ tradeId, tradeName, itemName: name });
  };

  const handleConfirmAddItem = (scope: 'current_unit' | 'selected_projects', targetProjectIds: string[]) => {
    if (!pendingItemToAdd) return;
    onAddItem(pendingItemToAdd.tradeId, pendingItemToAdd.itemName, scope, targetProjectIds);
    setNewTaskNames(prev => ({ ...prev, [pendingItemToAdd.tradeId]: '' }));
    setPendingItemToAdd(null);
  };

  const handleShareWhatsAppTrade = (e: React.MouseEvent, trade: Trade, tradePct: number) => {
    e.stopPropagation();

    const pendingTasks = trade.items.filter(item => {
      const p = item.progressPercentage !== undefined ? item.progressPercentage : (item.completed ? 100 : 0);
      return !item.completed && p < 100;
    });

    let mensaje = `*CONTROL DE AVANCE*\n`;
    mensaje += `*Obra:* ${project.name}\n`;
    mensaje += `*Departamento:* ${unit.name}\n`;
    mensaje += `*Gremio:* ${trade.name}\n`;
    mensaje += `*Estado:* ${tradePct}% de avance\n\n`;

    if (tradePct >= 100 || pendingTasks.length === 0) {
      mensaje += `Todas las tareas completadas y verificadas al 100%`;
    } else {
      mensaje += `*Tareas Pendientes:*\n`;
      pendingTasks.forEach(item => {
        const comment = item.comment && item.comment.trim() ? ` (${item.comment.trim().replace(/\r?\n/g, ' ')})` : '';
        mensaje += `• ${item.name}${comment}\n`;
      });
    }

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const getTradeIcon = (id: string) => {
    switch (id) {
      case 'albanileria': return <BrickWall className="w-3.5 h-3.5" />;
      case 'plomeria': return <Pipette className="w-3.5 h-3.5" />;
      case 'electricidad': return <Zap className="w-3.5 h-3.5" />;
      case 'carpinteria_madera': return <DoorOpen className="w-3.5 h-3.5" />;
      case 'carpinteria_aluminio': return <Maximize2 className="w-3.5 h-3.5" />;
      default: return <Wrench className="w-3.5 h-3.5" />;
    }
  };

  return (
    <section className="space-y-4 relative z-10">
      {/* Executive Unit Status Card with Glowing Cyan Donut Chart */}
      <div
        onMouseEnter={() => setUnitCardHoverTrigger(prev => prev + 1)}
        onTouchStart={() => setUnitCardHoverTrigger(prev => prev + 1)}
        style={{
          borderColor: neonColor,
          boxShadow: `0 0 30px ${hexToRgba(neonColor, 0.28)}`
        }}
        className="rounded-3xl p-5 sm:p-6 border-2 bg-[#101D30] project-card-glass text-white relative overflow-hidden"
      >
        {/* Subtle background ambient light */}
        <div
          className="absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: hexToRgba(neonColor, 0.1) }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-0.5 border text-[10px] font-black rounded-lg uppercase tracking-wider"
                style={{
                  backgroundColor: hexToRgba(neonColor, 0.15),
                  color: neonColor,
                  borderColor: hexToRgba(neonColor, 0.3)
                }}
              >
                {isUnitCommonArea(unit) ? 'Espacio Común' : 'Departamento'}
              </span>
              <span className="text-xs text-[#94A3B8] font-bold truncate flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" style={{ color: neonColor }} />
                {project.name}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                {unit.name}
              </h2>
              <button
                onClick={() => onEditUnit(unit)}
                className="p-1.5 rounded-xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] transition-colors"
                style={{ color: neonColor }}
                title="Editar denominación"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {onRequestDeleteUnit && (
                <button
                  onClick={() => onRequestDeleteUnit(unit.id, unit.name)}
                  className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 hover:border-rose-500 transition-colors"
                  title="Eliminar este espacio/depto (Requiere clave 2600)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
              {counts.completed} de {counts.total} ítems validados ({unitPct}%)
              {selectedTradeFilter !== 'all' && (
                <span className="text-[#00f2fe] font-bold ml-1">
                  • Global: {globalUnitPct}%
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#29384C]">
              <button
                onClick={() => onOpenReportModal('unit', project.id, unit.id)}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Reporte PDF</span>
              </button>

              {onExportExcel && (
                <button
                  onClick={() => onExportExcel(project.id, unit.id)}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                  title="Descargar planilla en Excel con casillas para tildar a mano"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Planilla Excel</span>
                </button>
              )}

              {onOpenCroquis && (
                <button
                  onClick={() => onOpenCroquis(unit.id)}
                  className="px-3 py-1.5 bg-[#00c2ff]/15 hover:bg-[#00c2ff]/25 text-[#00c2ff] border border-[#00c2ff]/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                  title="Abrir hoja de croquis a mano alzada para este depto"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#00c2ff]" />
                  <span>Croquis ({unit.sketches?.length || 0})</span>
                </button>
              )}

              {onOpenBlueprints && (
                <button
                  onClick={onOpenBlueprints}
                  className="px-3 py-1.5 bg-[#17263B] hover:bg-[#1f324d] text-[#00c2ff] border border-[#29384C] hover:border-[#00c2ff]/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95"
                  title="Abrir y verificar planos técnicos de esta unidad"
                >
                  <Compass className="w-3.5 h-3.5 text-[#00c2ff]" />
                  <span>Planos ({unit.blueprints?.length || 0})</span>
                </button>
              )}

              {onOpenSignatureModal && (
                <button
                  onClick={() => onOpenSignatureModal(unit.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 border ${
                    unit.signature
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border-emerald-500/40'
                      : 'bg-[#17263B] hover:bg-[#1f324d] text-amber-400 border-amber-500/40'
                  }`}
                  title={unit.signature ? `Firmado por ${unit.signedBy || 'Responsable'}` : 'Firmar acta digitalmente'}
                >
                  {unit.signature ? <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" /> : <PenTool className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{unit.signature ? 'Acta Firmada ✔' : 'Firmar Acta'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Glowing Cyan Donut Chart */}
          <div className="flex-shrink-0 flex items-center justify-center md:pl-4">
            <ExecutiveDonutChart
              percentage={unitPct}
              size={136}
              strokeWidth={13}
              glowColor={neonColor}
              animationTrigger={unitCardHoverTrigger}
            />
          </div>
        </div>
      </div>

      {/* Lock Notice Banner if unit is locked */}
      {unit.isLocked && (
        <div className="bg-rose-50 border-2 border-rose-300 p-3 rounded-2xl flex items-center justify-between text-xs text-rose-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-black text-rose-950 text-xs leading-tight">
                Inspección Bloqueada por Acta de Recepción
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Firmada por <span className="font-bold text-rose-900">{unit.signedBy || 'Supervisor'}</span> ({unit.signedAt || 'Registrada'}). Las tareas están protegidas contra cambios.
              </p>
            </div>
          </div>
          {onUnlockUnit && (
            <button
              onClick={() => onUnlockUnit(unit.id)}
              className="px-2.5 py-1.5 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors flex-shrink-0 ml-2"
              title="Desbloquear para permitir ajustes en los ítems"
            >
              <Unlock className="w-3.5 h-3.5 text-rose-600" />
              <span>Desbloquear</span>
            </button>
          )}
        </div>
      )}

      {/* Trade Filter & Management Section */}
      <div className="bg-[#101D30] project-card-glass p-3 rounded-2xl border border-[#29384C] shadow-md space-y-3 transition-colors relative z-10">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-[#29384C] pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-[#17263B]/90 border border-[#29384C] rounded-xl">
            <button
              type="button"
              onClick={() => setTradeSectionTab('filter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all touch-target ${
                tradeSectionTab === 'filter'
                  ? 'bg-[#00c2ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,194,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Filtrar Gremios</span>
            </button>

            <button
              type="button"
              onClick={() => setTradeSectionTab('manage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all touch-target ${
                tradeSectionTab === 'manage'
                  ? 'bg-[#00c2ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,194,255,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
              <span>Agregar o Eliminar Gremios</span>
            </button>
          </div>

          <span className="text-[11px] text-[#00f2fe] font-bold hidden sm:inline">
            {tradeSectionTab === 'filter'
              ? (selectedTradeFilter === 'all' ? 'Todos los gremios' : activeTradeObj?.name)
              : `${unitTradesList.length} Gremios en esta unidad`}
          </span>
        </div>

        {/* TAB 1: FILTRAR GREMIOS */}
        {tradeSectionTab === 'filter' && (
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 text-xs">
              <button
                onClick={() => setSelectedTradeFilter('all')}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                  selectedTradeFilter === 'all'
                    ? 'bg-[#00c2ff] text-slate-950 border-[#00c2ff] shadow-[0_0_15px_rgba(0,194,255,0.45)]'
                    : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
                }`}
              >
                <span>Todos</span>
              </button>

              {unitTradesList.map(trade => {
                const isActive = isTradeMatchingFilter(trade, selectedTradeFilter) && selectedTradeFilter !== 'all';
                return (
                  <button
                    key={trade.id}
                    onClick={() => setSelectedTradeFilter(isActive ? 'all' : trade.id)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full font-bold transition-all border text-xs flex items-center gap-1.5 touch-target ${
                      isActive
                        ? 'bg-[#00c2ff] text-slate-950 border-[#00c2ff] shadow-[0_0_15px_rgba(0,194,255,0.45)]'
                        : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
                    }`}
                  >
                    {getTradeIcon(trade.id)}
                    <span>{trade.shortName || trade.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AGREGAR O ELIMINAR GREMIOS */}
        {tradeSectionTab === 'manage' && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-200">
            {/* Form to Add New Trade */}
            <div className="p-3 bg-[#17263B] rounded-xl border border-[#29384C] space-y-2.5">
              <label className="block text-xs font-black text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                Agregar Nuevo Gremio a la Inspección
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newTradeNameDraft}
                  onChange={(e) => setNewTradeNameDraft(e.target.value)}
                  placeholder="Ej: Pintura, Instalación de Gas, Herrería..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#29384C] bg-[#0e1422] text-slate-100 font-medium placeholder-slate-500 focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe]"
                />

                <select
                  value={newTradeScope}
                  onChange={(e) => setNewTradeScope(e.target.value as 'current_unit' | 'all_units')}
                  className="px-3 py-2 text-xs rounded-xl border border-[#29384C] bg-[#0e1422] text-slate-100 font-bold focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe]"
                >
                  <option value="current_unit">Solo en este depto ({unit.name})</option>
                  <option value="all_units">En todo el complejo ({project.name})</option>
                </select>

                <button
                  type="button"
                  disabled={!newTradeNameDraft.trim()}
                  onClick={() => {
                    if (onAddTrade && newTradeNameDraft.trim()) {
                      onAddTrade(newTradeNameDraft.trim(), newTradeScope);
                      setNewTradeNameDraft('');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-target"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Agregar Gremio</span>
                </button>
              </div>

              {/* Quick Preset Badges */}
              <div className="pt-1">
                <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider block mb-1">
                  Sugerencias rápidas de gremios:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Pintura',
                    'Instalación de Gas',
                    'Herrería',
                    'Yesería y Durlock',
                    'Vidrios',
                    'Climatización / AA',
                    'Limpieza de Obra'
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewTradeNameDraft(preset)}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#17263B] hover:bg-[#1c2d4a] text-slate-300 hover:text-white border border-[#29384C] hover:border-[#00f2fe]/40 transition-colors active:scale-95"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of Current Trades for Deletion / Management */}
            <div>
              <span className="text-xs font-black text-slate-200 block mb-2">
                Gremios Actuales ({unitTradesList.length}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {unitTradesList.map(trade => (
                  <div
                    key={trade.id}
                    className="p-2.5 bg-[#17263B] rounded-xl border border-[#29384C] flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-[#00f2fe]/15 text-[#00f2fe] flex items-center justify-center flex-shrink-0">
                        {getTradeIcon(trade.id)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-100 truncate">
                          {trade.name}
                        </p>
                        <p className="text-[10px] text-[#94A3B8]">
                          {trade.items.length} {trade.items.length === 1 ? 'tarea' : 'tareas'}
                        </p>
                      </div>
                    </div>

                    {onDeleteTrade && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteTrade(trade.id, trade.name, newTradeScope);
                          if (selectedTradeFilter === trade.id) {
                            setSelectedTradeFilter('all');
                          }
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-950/50 rounded-lg border border-rose-900/50 flex items-center gap-1 transition-colors active:scale-95 touch-target flex-shrink-0"
                        title={`Eliminar gremio ${trade.name}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Status Filters - Executive Capsule Pills */}
      <div className="bg-[#101D30] project-card-glass p-2.5 rounded-2xl border border-[#29384C] shadow-md space-y-2 transition-colors select-none relative z-10">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
            Estado de Tareas:
          </span>
          <span className="text-[10px] text-[#94A3B8] font-medium">
            {taskStatusFilter === 'all' ? 'Todas las tareas' : (taskStatusFilter === 'pending' ? 'Solo pendientes' : 'Solo completadas')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => setTaskStatusFilter('all')}
            className={`py-1.5 px-3 rounded-full font-bold border transition-all flex items-center justify-center gap-1.5 touch-target ${
              taskStatusFilter === 'all'
                ? 'bg-[#00c2ff] text-slate-950 border-[#00c2ff] shadow-[0_0_15px_rgba(0,194,255,0.45)]'
                : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Todos</span>
            <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {counts.total}
            </span>
          </button>

          <button
            onClick={() => setTaskStatusFilter('completed')}
            className={`py-1.5 px-3 rounded-full font-bold border transition-all flex items-center justify-center gap-1.5 touch-target ${
              taskStatusFilter === 'completed'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.45)]'
                : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
            }`}
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completados</span>
            <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {counts.completed}
            </span>
          </button>

          <button
            onClick={() => setTaskStatusFilter('pending')}
            className={`py-1.5 px-3 rounded-full font-bold border transition-all flex items-center justify-center gap-1.5 touch-target ${
              taskStatusFilter === 'pending'
                ? 'bg-rose-500 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.45)]'
                : 'bg-[#17263B]/90 text-slate-300 border-[#29384C] hover:border-slate-500'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span>Pendientes</span>
            <span className="bg-slate-950/20 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {counts.total - counts.completed}
            </span>
          </button>
        </div>
      </div>

      {/* Expand / Collapse Controls */}
      <div className="flex gap-2 select-none relative z-10">
        <button
          onClick={() => toggleAll(true)}
          className="flex-1 bg-[#101D30] project-card-glass border border-[#29384C] text-slate-300 hover:text-white hover:border-[#00f2fe]/60 py-2 rounded-xl text-xs font-bold touch-target flex items-center justify-center gap-1.5 shadow-2xs transition-all"
        >
          <ChevronsDown className="w-3.5 h-3.5 text-[#00f2fe]" /> Expandir Todo
        </button>
        <button
          onClick={() => toggleAll(false)}
          className="flex-1 bg-[#101D30] project-card-glass border border-[#29384C] text-slate-300 hover:text-white hover:border-[#00f2fe]/60 py-2 rounded-xl text-xs font-bold touch-target flex items-center justify-center gap-1.5 shadow-2xs transition-all"
        >
          <ChevronsUp className="w-3.5 h-3.5 text-[#00f2fe]" /> Colapsar
        </button>
      </div>

      {/* Trades Accordion */}
      <div className="space-y-3 relative z-10">
        {unitTradesList.map(trade => {
          if (!isTradeMatchingFilter(trade, selectedTradeFilter)) {
            return null;
          }

          const filteredItems = trade.items.filter(item => {
            const currentPct = item.progressPercentage !== undefined ? item.progressPercentage : (item.completed ? 100 : 0);
            const isComplete = item.completed || currentPct === 100;
            if (taskStatusFilter === 'completed') return isComplete;
            if (taskStatusFilter === 'pending') return !isComplete;
            return true;
          });

          const totalTradeItems = trade.items.length;
          const completedTradeItems = trade.items.filter(i => i.completed || (i.progressPercentage === 100)).length;
          const totalTradeProgress = trade.items.reduce((sum, it) => {
            const p = it.progressPercentage !== undefined ? it.progressPercentage : (it.completed ? 100 : 0);
            return sum + p;
          }, 0);
          const tradePct = totalTradeItems === 0 ? 0 : Math.round(totalTradeProgress / totalTradeItems);
          const isCollapsed = collapsedTrades[trade.id] === true;
          const isTradeActive = activeTradeId === trade.id;

          // If filtering by status and no tasks match in this trade (when showing all trades)
          if (taskStatusFilter !== 'all' && filteredItems.length === 0 && selectedTradeFilter === 'all') {
            return null;
          }

          return (
            <div
              key={trade.id}
              onMouseEnter={() => setActiveTradeId(trade.id)}
              onTouchStart={() => setActiveTradeId(trade.id)}
              style={isTradeActive ? {
                borderColor: neonColor,
                boxShadow: `0 0 24px ${hexToRgba(neonColor, 0.32)}`
              } : undefined}
              className={`rounded-2xl shadow-md overflow-hidden transition-all duration-300 relative z-10 project-card-glass ${
                isTradeActive
                  ? 'border-2 bg-[#101D30]'
                  : 'border border-[#29384C] hover:border-slate-500 bg-[#101D30]'
              }`}
            >
              {/* Accordion Header */}
              <div
                onClick={() => toggleTrade(trade.id)}
                className="px-4 py-3.5 bg-[#17263B] border-b border-[#29384C] flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className="w-8 h-8 rounded-xl bg-[#0e1422] border border-[#29384C] shadow-xs flex items-center justify-center text-sm flex-shrink-0"
                    style={{ color: neonColor }}
                  >
                    {getTradeIcon(trade.id)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white leading-tight">
                      {trade.name}
                    </h4>
                    <p className="text-[11px] text-[#94A3B8]">
                      {completedTradeItems}/{totalTradeItems} verificados •{' '}
                      <span className="font-bold font-mono" style={{ color: neonColor }}>{tradePct}%</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* Botón táctil WhatsApp (color verde esmeralda) */}
                  <button
                    type="button"
                    onClick={(e) => handleShareWhatsAppTrade(e, trade, tradePct)}
                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-90 text-white shadow-xs transition-all flex items-center gap-1.5 touch-target cursor-pointer border border-emerald-500/60"
                    title={`Enviar tareas pendientes de ${trade.name} por WhatsApp`}
                    aria-label={`Enviar tareas pendientes de ${trade.name} por WhatsApp`}
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 fill-white flex-shrink-0" />
                    <span className="text-[11px] font-bold hidden sm:inline">WhatsApp</span>
                  </button>

                  <div className="w-14 bg-[#17263B] h-2 rounded-full overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${tradePct}%`,
                        backgroundColor: neonColor,
                        boxShadow: `0 0 8px ${hexToRgba(neonColor, 0.5)}`
                      }}
                    />
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Accordion Content */}
              {!isCollapsed && (
                <div className="p-3 space-y-2.5 bg-[#101D30] transition-colors">
                  {filteredItems.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic py-2 text-center">
                      No hay tareas con este criterio en {trade.name}
                    </p>
                  ) : (
                    filteredItems.map(item => {
                      const photoList = item.photos || [];
                      const photoCount = photoList.length;
                      const currentPct = item.progressPercentage !== undefined ? item.progressPercentage : (item.completed ? 100 : 0);
                      const isComplete = item.completed || currentPct === 100;
                      const isPartial = !isComplete && currentPct > 0;
                      const isItemActive = activeItemId === item.id;
                      const hasComment = Boolean(item.comment && item.comment.trim());

                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => setActiveItemId(item.id)}
                          onTouchStart={() => setActiveItemId(item.id)}
                          className={`p-3 rounded-xl transition-all duration-200 ${
                            isItemActive
                              ? 'border-2 border-[#00f2fe] shadow-[0_0_18px_rgba(0,242,254,0.32)] bg-[#19263e]'
                              : isComplete
                              ? 'bg-emerald-950/20 border border-emerald-500/40 text-white'
                              : isPartial
                              ? 'bg-cyan-950/20 border border-[#00c2ff]/40 text-white'
                              : 'bg-[#17263B] border border-[#29384C] text-white hover:border-[#00f2fe]/60'
                          }`}
                        >
                          {/* Fila Horizontal Principal */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              width: '100%'
                            }}
                          >
                            {/* [Izquierda - Contenido principal] */}
                            <div className="flex-1 min-w-0 pr-1 text-left">
                              {editingItemId === item.id ? (
                                <div
                                  className="flex items-center gap-1.5 w-full my-1 py-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={editingItemNameDraft}
                                    onChange={(e) => setEditingItemNameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditItem(trade.id, item.id);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                    className="flex-1 min-w-0 bg-[#0e1422] border-2 border-[#00f2fe] rounded-lg px-2.5 py-1 text-xs sm:text-sm text-white font-bold focus:outline-none shadow-[0_0_10px_rgba(0,242,254,0.25)]"
                                    placeholder="Nombre de la tarea..."
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditItem(trade.id, item.id)}
                                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm shrink-0"
                                    title="Guardar nombre"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    <span className="hidden xs:inline">Guardar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-all shrink-0"
                                    title="Cancelar"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    onDoubleClick={() => !unit.isLocked && onEditItem && handleStartEditItem(item)}
                                    style={{ whiteSpace: 'normal', wordBreak: 'normal' }}
                                    className={`text-xs sm:text-sm font-bold leading-snug text-left ${
                                      isComplete
                                        ? 'text-emerald-300'
                                        : isPartial
                                        ? 'text-white'
                                        : 'text-slate-200'
                                    }`}
                                    title={!unit.isLocked && onEditItem ? "Tocar lápiz o doble clic para editar" : undefined}
                                  >
                                    {item.name}
                                  </span>

                                  {/* Severity Badges */}
                                  {item.severity === 'high' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-950/60 text-rose-300 border border-rose-800 animate-pulse">
                                      <Flame className="w-2.5 h-2.5 text-rose-400" />
                                      Crítico
                                    </span>
                                  )}
                                  {item.severity === 'medium' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-950/60 text-amber-300 border border-amber-800">
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                      Medio
                                    </span>
                                  )}
                                  {item.severity === 'low' && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                                      Leve
                                    </span>
                                  )}

                                  {/* Insignia verde si tiene nota/comentario */}
                                  {hasComment && (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setObservationModalItem({ tradeId: trade.id, tradeName: trade.name, item });
                                      }}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/80 cursor-pointer hover:bg-emerald-900/80 transition-colors shadow-2xs"
                                      title={`Nota guardada: "${item.comment}"`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                                      <span>Nota</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Si tiene notas u observaciones */}
                              {hasComment && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setObservationModalItem({ tradeId: trade.id, tradeName: trade.name, item });
                                  }}
                                  style={{ whiteSpace: 'normal', wordBreak: 'normal' }}
                                  className="mt-1 flex items-start gap-1.5 text-[11px] text-slate-300 hover:text-emerald-300 cursor-pointer group/note"
                                  title="Tocar para editar nota, severidad o fotos"
                                >
                                  <div className="relative mt-0.5 flex-shrink-0">
                                    <MessageSquareText className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]" />
                                  </div>
                                  <span className="text-slate-300 group-hover/note:text-white leading-tight">
                                    {item.comment}
                                  </span>
                                </div>
                              )}

                              {/* Barra de avance en curso */}
                              {isPartial && (
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <div className="w-16 sm:w-24 bg-[#17263B] h-1.5 rounded-full overflow-hidden flex-shrink-0">
                                    <div
                                      className="h-full bg-[#00c2ff] rounded-full transition-all duration-200"
                                      style={{ width: `${currentPct}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono font-bold text-[#00f2fe]">
                                    {currentPct}% en curso
                                  </span>
                                </div>
                              )}
                              {isComplete && (
                                <div className="mt-0.5">
                                  <span className="text-[10px] font-bold text-emerald-400">
                                    ✓ 100% completado
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* [Derecha - Acciones y Controles] */}
                            <div
                              style={{ flexShrink: 0 }}
                              className="flex items-center gap-1.5 sm:gap-2"
                            >
                              {/* Botón de nota/comentario y severidad con puntito verde */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setObservationModalItem({ tradeId: trade.id, tradeName: trade.name, item });
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 flex-shrink-0 relative ${
                                  hasComment
                                    ? 'bg-[#122438] text-emerald-400 border border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                    : item.severity
                                    ? 'bg-[#1a2942] text-[#00f2fe] border border-[#00f2fe]/60 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
                                    : 'bg-[#17263B] text-[#94A3B8] hover:text-white border border-[#29384C] hover:border-slate-500'
                                }`}
                                title={hasComment ? `Nota guardada: "${item.comment}"` : 'Agregar observación o foto'}
                              >
                                <div className="relative flex items-center justify-center">
                                  <MessageSquare
                                    className={`w-3.5 h-3.5 ${
                                      hasComment ? 'text-emerald-400' : (item.severity ? 'text-[#00f2fe]' : 'text-[#94A3B8]')
                                    }`}
                                  />
                                </div>

                                {/* Puntito verde visible que indica que hay una nota */}
                                {hasComment && (
                                  <span
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#131b2c] shadow-[0_0_8px_rgba(52,211,153,1)]"
                                    title="Hay una nota registrada en este ítem"
                                  />
                                )}
                              </button>

                              {/* Control de porcentaje: Cuadro numérico compacto */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`flex items-center rounded-lg border h-8 px-1 transition-all shadow-2xs flex-shrink-0 ${
                                  unit.isLocked ? 'opacity-40 cursor-not-allowed bg-[#17263B] border-[#29384C]' :
                                  isComplete
                                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                                    : isPartial
                                    ? 'bg-[#1a2942] border-[#00c2ff]/60 text-[#00f2fe] ring-1 ring-[#00c2ff]/30'
                                    : 'bg-[#17263B] border-[#29384C] text-slate-300 hover:border-slate-500'
                                }`}
                                title={unit.isLocked ? "Inspección bloqueada por acta" : "Porcentaje de avance del ítem (0% a 100%)"}
                              >
                                <button
                                  type="button"
                                  disabled={unit.isLocked}
                                  onClick={() => onUpdateItemProgress(trade.id, item.id, Math.max(0, currentPct - 10))}
                                  className={`w-4 h-6 text-[#94A3B8] hover:text-white font-black text-xs flex items-center justify-center select-none active:scale-90 ${unit.isLocked ? 'cursor-not-allowed' : ''}`}
                                  title="Restar 10%"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  disabled={unit.isLocked}
                                  value={currentPct}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                                    onUpdateItemProgress(trade.id, item.id, val);
                                  }}
                                  className={`w-7 text-center font-mono font-black text-xs bg-transparent focus:outline-none p-0 ${
                                    isComplete ? 'text-emerald-400' : isPartial ? 'text-[#00f2fe]' : 'text-slate-200'
                                  } ${unit.isLocked ? 'cursor-not-allowed' : ''}`}
                                />
                                <span className="text-[10px] font-black text-slate-500 select-none mr-0.5">%</span>
                                <button
                                  type="button"
                                  disabled={unit.isLocked}
                                  onClick={() => onUpdateItemProgress(trade.id, item.id, Math.min(100, currentPct + 10))}
                                  className={`w-4 h-6 text-[#94A3B8] hover:text-white font-black text-xs flex items-center justify-center select-none active:scale-90 ${unit.isLocked ? 'cursor-not-allowed' : ''}`}
                                  title="Sumar 10%"
                                >
                                  +
                                </button>
                              </div>

                              {/* Checkbox/Tilde de completado */}
                              <button
                                type="button"
                                disabled={unit.isLocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleItem(trade.id, item.id);
                                }}
                                className={`w-8 h-8 min-w-[28px] min-h-[28px] rounded-lg border-2 flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${
                                  unit.isLocked
                                    ? 'opacity-40 cursor-not-allowed bg-[#17263B] border-[#29384C]'
                                    : isComplete
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer'
                                    : isPartial
                                    ? 'border-[#00c2ff] bg-[#17263B] text-[#00c2ff] hover:border-[#00f2fe] cursor-pointer'
                                    : 'border-slate-600 bg-[#17263B] hover:border-[#00f2fe] cursor-pointer'
                                }`}
                                title={
                                  unit.isLocked
                                    ? 'Inspección bloqueada'
                                    : isComplete
                                    ? 'Completado (100%) - Tocar para desmarcar (0%)'
                                    : 'Marcar completado (100%)'
                                }
                              >
                                {isComplete && <Check className="w-5 h-5 stroke-[3]" />}
                              </button>

                              {/* Ícono de cámara/foto */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setObservationModalItem({ tradeId: trade.id, tradeName: trade.name, item });
                                }}
                                className={`h-8 px-2 rounded-lg flex items-center gap-1 text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${
                                  photoCount > 0
                                    ? 'bg-[#0e1422] text-[#00f2fe] border border-[#00f2fe]/60 shadow-[0_0_8px_rgba(0,242,254,0.3)]'
                                    : 'bg-[#17263B] text-[#94A3B8] hover:text-white border border-[#29384C] hover:border-slate-500'
                                }`}
                                title={photoCount > 0 ? `${photoCount} foto(s) registrada(s)` : 'Tomar o adjuntar foto'}
                              >
                                <Camera className={`w-3.5 h-3.5 ${photoCount > 0 ? 'text-[#00f2fe]' : 'text-[#94A3B8]'}`} />
                                {photoCount > 0 && (
                                  <span className="text-[11px] font-mono font-black">{photoCount}</span>
                                )}
                              </button>

                              {/* Botón para editar nombre de la tarea / ítem */}
                              {!unit.isLocked && onEditItem && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditItem(item);
                                  }}
                                  className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-[#00f2fe] hover:bg-[#00f2fe]/10 flex items-center justify-center flex-shrink-0 active:scale-90 transition-colors"
                                  title="Editar nombre de la tarea"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Tacho de basura para eliminar el ítem */}
                              {!unit.isLocked && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteItem(trade.id, item.id);
                                  }}
                                  className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-rose-400 hover:bg-rose-950/40 flex items-center justify-center flex-shrink-0 active:scale-90 transition-colors"
                                  title="Eliminar tarea"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Inline Comment Editor Form */}
                          {editingCommentItemId === item.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="mt-2.5 p-3 rounded-xl bg-[#17263B] border-2 border-[#00f2fe]/40 shadow-sm space-y-2 animate-in fade-in duration-150"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-white flex items-center gap-1.5">
                                  <span className="relative flex items-center">
                                    <MessageSquare className={`w-3.5 h-3.5 ${hasComment ? 'text-emerald-400' : 'text-[#00f2fe]'}`} />
                                    {hasComment && (
                                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                                    )}
                                  </span>
                                  {item.comment ? 'Editar Observación' : 'Nueva Observación / Comentario'}
                                </span>
                                {item.comment && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSaveComment(trade.id, item.id, '');
                                      setEditingCommentItemId(null);
                                      setCommentDraft('');
                                    }}
                                    className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Borrar
                                  </button>
                                )}
                              </div>

                              <textarea
                                autoFocus
                                rows={2}
                                value={commentDraft}
                                onChange={(e) => setCommentDraft(e.target.value)}
                                placeholder="Escribe detalles, tareas pendientes o notas técnicas..."
                                className="w-full text-xs p-2.5 rounded-lg border border-[#29384C] focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] bg-[#0e1422] text-white font-medium leading-relaxed shadow-2xs placeholder-slate-500"
                              />

                              {/* Quick suggestion chips */}
                              <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                <span className="text-[10px] font-bold text-[#94A3B8] uppercase mr-0.5">Sugerencias:</span>
                                {[
                                  'Falta terminación',
                                  'Pendiente de material',
                                  'Revisar nivelación / plomo',
                                  'Reparar detalle menor',
                                  'Listo para verificación'
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      setCommentDraft(prev => prev ? `${prev}. ${preset}` : preset);
                                    }}
                                    className="text-[10px] px-2 py-0.5 bg-[#101D30] hover:bg-[#1c2d4a] border border-[#29384C] hover:border-[#00f2fe]/40 text-slate-300 rounded-md font-semibold transition-colors shadow-2xs"
                                  >
                                    + {preset}
                                  </button>
                                ))}
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentItemId(null);
                                    setCommentDraft('');
                                  }}
                                  className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-[#17263B] border border-[#29384C] rounded-lg touch-target"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSaveComment(trade.id, item.id, commentDraft);
                                    setEditingCommentItemId(null);
                                    setCommentDraft('');
                                  }}
                                  className="px-3.5 py-1.5 text-xs font-black text-slate-950 bg-[#00c2ff] hover:brightness-110 rounded-lg shadow-sm flex items-center gap-1.5 touch-target active:scale-95 transition-all"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  Guardar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Photo Evidence Thumbnails Strip */}
                          {photoCount > 0 && (
                            <div className="mt-2 pt-2 border-t border-[#29384C] flex items-center gap-2 overflow-x-auto no-scrollbar">
                              {photoList.map((photo, pIdx) => (
                                <div
                                  key={photo.id}
                                  onClick={() => onOpenPhotoViewer(trade.id, item.id, trade.name, item.name)}
                                  className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#00f2fe]/40 flex-shrink-0 cursor-pointer shadow-xs active:scale-95 bg-[#0e1422] group hover:border-[#00f2fe]"
                                  title={`Ver foto ${pIdx + 1}`}
                                >
                                  <img
                                    src={photo.dataUrl}
                                    alt={`Evidencia ${pIdx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] text-center font-mono py-0.2">
                                    #{pIdx + 1}
                                  </span>
                                </div>
                              ))}

                              {/* Quick button to capture or add another photo */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setObservationModalItem({ tradeId: trade.id, tradeName: trade.name, item });
                                }}
                                className="w-11 h-11 rounded-lg border border-dashed border-[#00f2fe]/60 text-[#00f2fe] bg-[#00f2fe]/10 flex flex-col items-center justify-center flex-shrink-0 hover:bg-[#00f2fe]/20 active:scale-95 text-[10px] font-bold"
                                title="Agregar o tomar foto"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-[8px] leading-none mt-0.5">Foto</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Add New Task Form in this Trade */}
                  <form
                    onSubmit={(e) => handleAddTaskSubmit(e, trade.id, trade.name)}
                    className="mt-3 pt-2.5 border-t border-[#29384C] flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`+ Añadir tarea a ${trade.name}...`}
                      value={newTaskNames[trade.id] || ''}
                      onChange={(e) => setNewTaskNames(prev => ({ ...prev, [trade.id]: e.target.value }))}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#29384C] focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] bg-[#17263B] font-medium text-white placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      className="bg-[#00c2ff] hover:bg-[#00b0e8] text-slate-950 font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-sm touch-target active:scale-95 flex-shrink-0 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" /> Añadir
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Smart Scope Modal: Selector Inteligente de Obras al Agregar un Ítem */}
      {pendingItemToAdd && (
        <AddItemScopeModal
          isOpen={!!pendingItemToAdd}
          itemName={pendingItemToAdd.itemName}
          tradeId={pendingItemToAdd.tradeId}
          tradeName={pendingItemToAdd.tradeName}
          currentProject={project}
          currentUnit={unit}
          allProjects={allProjects || [project]}
          onClose={() => setPendingItemToAdd(null)}
          onConfirm={handleConfirmAddItem}
        />
      )}

      {/* Unified Technical Observation, Severity and Photo Evidence Modal */}
      {observationModalItem && (
        <ItemObservationModal
          isOpen={!!observationModalItem}
          tradeId={observationModalItem.tradeId}
          tradeName={observationModalItem.tradeName}
          item={
            unitTradesList
              .find(t => isTradeMatchingFilter(t, observationModalItem.tradeId))
              ?.items.find(i => i.id === observationModalItem.item.id) || observationModalItem.item
          }
          onClose={() => setObservationModalItem(null)}
          onSaveObservation={(tradeId, itemId, comment, severity, isExplicitDelete) => {
            if (onSaveObservation) {
              onSaveObservation(tradeId, itemId, comment, severity, isExplicitDelete);
            } else {
              onSaveComment(tradeId, itemId, comment);
            }
          }}
          onAddPhoto={(tradeId, itemId, dataUrl) => {
            if (onAddPhoto) {
              onAddPhoto(tradeId, itemId, dataUrl);
            }
          }}
          onDeletePhoto={(tradeId, itemId, photoId) => {
            if (onDeletePhoto) {
              onDeletePhoto(tradeId, itemId, photoId);
            }
          }}
          onEditItem={onEditItem}
        />
      )}
      {/* Floating Blueprint Quick-Access Action Button */}
      {onOpenBlueprints && (
        <div className="fixed bottom-20 right-4 sm:right-8 z-30 no-print">
          <button
            type="button"
            onClick={onOpenBlueprints}
            style={{
              borderColor: neonColor,
              boxShadow: `0 0 20px ${hexToRgba(neonColor, 0.35)}`,
              color: neonColor
            }}
            className="px-4 py-2.5 rounded-full bg-[#101D30] font-black text-xs flex items-center gap-2 shadow-2xl border-2 active:scale-95 hover:scale-105 transition-all touch-target"
            title="Cotejar tareas contra el plano técnico"
          >
            <Compass className="w-4 h-4" style={{ color: neonColor }} />
            <span>📐 Ver Planos ({unit.blueprints?.length || 0})</span>
          </button>
        </div>
      )}
    </section>
  );
}
