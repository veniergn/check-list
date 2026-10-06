import React, { useState } from 'react';
import {
  X,
  Calendar,
  Plus,
  Trash2,
  Pencil,
  Check,
  RotateCcw,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Sliders,
  Building2,
  Wrench,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Project, Milestone } from '../types';
import { MASTER_TRADES_TEMPLATE } from '../data/initialData';
import { calculateMilestoneProgress } from '../utils/milestones';

interface MilestonesModalProps {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSaveMilestone: (projectId: string, milestone: Milestone) => void;
  onDeleteMilestone: (projectId: string, milestoneId: string) => void;
  onToggleManualMilestone: (projectId: string, milestoneId: string) => void;
  onUpdateMilestoneProgress?: (projectId: string, milestoneId: string, percentage: number) => void;
}

const DEFAULT_BUILDING_PARTS = [
  'Estructura Global',
  'Subsuelo / Cocheras',
  'Planta Baja',
  'Piso 1',
  'Piso 2',
  'Piso 3',
  'Piso 4',
  'Fachada y Exteriores',
  'Cubierta / Terraza',
  'Espacios Comunes'
];

export function MilestonesModal({
  isOpen,
  project,
  onClose,
  onSaveMilestone,
  onDeleteMilestone,
  onToggleManualMilestone,
  onUpdateMilestoneProgress
}: MilestonesModalProps) {
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [buildingPart, setBuildingPart] = useState('Estructura Global');
  const [customBuildingPart, setCustomBuildingPart] = useState('');
  const [isCustomPart, setIsCustomPart] = useState(false);

  // Trade selection / new trade creation
  const [tradeCategory, setTradeCategory] = useState('');
  const [isCreatingNewTrade, setIsCreatingNewTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState('');

  // Progress percentage
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  // Linkage to checklist
  const [linkType, setLinkType] = useState<'direct' | 'item' | 'trade'>('direct');
  const [linkedTradeId, setLinkedTradeId] = useState('');
  const [linkedItemName, setLinkedItemName] = useState('');
  const [minPercentageRequired, setMinPercentageRequired] = useState(100);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const milestones: Milestone[] = project.milestones || [];

  // Collect all available trades: template + project unit trades
  const tradeMap = new Map<string, string>();
  MASTER_TRADES_TEMPLATE.forEach(t => tradeMap.set(t.name, t.id));
  (project.units || []).forEach(u => {
    (u.trades || []).forEach(t => {
      if (t.name) tradeMap.set(t.name, t.id);
    });
  });
  milestones.forEach(m => {
    if (m.tradeCategory) tradeMap.set(m.tradeCategory, m.linkedTradeId || m.tradeCategory);
  });

  const availableTradeNames = Array.from(tradeMap.keys());

  // Building parts list including project floors
  const availableBuildingParts = Array.from(
    new Set([
      ...DEFAULT_BUILDING_PARTS,
      ...(project.floorsConfig?.map(f => f.label) || [])
    ])
  );

  const handleStartAdd = () => {
    setEditingId(null);
    setName('');
    const today = new Date().toISOString().split('T')[0];
    setStartDate(project.startDate || today);

    // Target date 30 days ahead by default
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setTargetDate(d.toISOString().split('T')[0]);

    setBuildingPart(availableBuildingParts[0] || 'Estructura Global');
    setIsCustomPart(false);
    setCustomBuildingPart('');

    const initialTrade = availableTradeNames[0] || 'Albañilería y Mampostería';
    setTradeCategory(initialTrade);
    setIsCreatingNewTrade(false);
    setNewTradeName('');

    setProgressPercentage(0);
    setLinkType('direct');
    setLinkedTradeId(tradeMap.get(initialTrade) || 'albanileria');
    setLinkedItemName('');
    setMinPercentageRequired(100);
    setNotes('');
    setIsAddingOrEditing(true);
  };

  const handleStartEdit = (m: Milestone) => {
    setEditingId(m.id);
    setName(m.name);
    setStartDate(m.startDate || project.startDate || new Date().toISOString().split('T')[0]);
    setTargetDate(m.targetDate || m.endDate || '');

    if (m.buildingPart && !availableBuildingParts.includes(m.buildingPart)) {
      setIsCustomPart(true);
      setCustomBuildingPart(m.buildingPart);
      setBuildingPart('__custom__');
    } else {
      setIsCustomPart(false);
      setCustomBuildingPart('');
      setBuildingPart(m.buildingPart || availableBuildingParts[0] || 'Estructura Global');
    }

    if (m.tradeCategory && !availableTradeNames.includes(m.tradeCategory)) {
      setIsCreatingNewTrade(true);
      setNewTradeName(m.tradeCategory);
      setTradeCategory('__new__');
    } else {
      setIsCreatingNewTrade(false);
      setNewTradeName('');
      setTradeCategory(m.tradeCategory || availableTradeNames[0] || '');
    }

    setProgressPercentage(m.progressPercentage !== undefined ? m.progressPercentage : (m.manualCompleted ? 100 : 0));
    setLinkType(m.linkType || 'direct');
    setLinkedTradeId(m.linkedTradeId || '');
    setLinkedItemName(m.linkedItemName || '');
    setMinPercentageRequired(m.minPercentageRequired ?? 100);
    setNotes(m.notes || '');
    setIsAddingOrEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetDate) return;

    // Resolve resolved building part
    const resolvedBuildingPart = isCustomPart ? customBuildingPart.trim() || 'Estructura Global' : buildingPart;

    // Resolve resolved trade
    const resolvedTrade = isCreatingNewTrade ? newTradeName.trim() || 'General' : tradeCategory;
    const resolvedTradeId = tradeMap.get(resolvedTrade) || resolvedTrade.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const clampedProgress = Math.max(0, Math.min(100, Math.round(progressPercentage)));

    const newMilestone: Milestone = {
      id: editingId || `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      startDate: startDate || undefined,
      targetDate: targetDate,
      endDate: targetDate,
      buildingPart: resolvedBuildingPart,
      tradeCategory: resolvedTrade,
      progressPercentage: clampedProgress,
      linkType: linkType,
      linkedTradeId: resolvedTradeId,
      linkedItemName: linkType === 'item' ? linkedItemName : undefined,
      minPercentageRequired: Math.min(100, Math.max(1, minPercentageRequired)),
      manualCompleted: clampedProgress === 100,
      notes: notes.trim() || undefined
    };

    onSaveMilestone(project.id, newMilestone);
    setIsAddingOrEditing(false);
    setEditingId(null);
  };

  const handleQuickPreset = (
    presetName: string,
    part: string,
    trade: string,
    tradeId: string,
    itemName: string,
    daysAhead: number,
    progress: number = 0
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const targetDateStr = d.toISOString().split('T')[0];

    const presetMilestone: Milestone = {
      id: `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: presetName,
      startDate: today,
      targetDate: targetDateStr,
      endDate: targetDateStr,
      buildingPart: part,
      tradeCategory: trade,
      progressPercentage: progress,
      linkType: 'item',
      linkedTradeId: tradeId,
      linkedItemName: itemName,
      minPercentageRequired: 100,
      manualCompleted: progress === 100
    };

    onSaveMilestone(project.id, presetMilestone);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-tight flex items-center gap-2">
                <span>Gestión de Hitos Críticos</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Project Manager
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {project.name} • Cronograma, Ubicaciones y Alarmas Rojas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Form to Add or Edit */}
          {isAddingOrEditing ? (
            <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  {editingId ? 'Editar Hito Crítico' : 'Nuevo Hito Crítico de Obra'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold"
                >
                  Cancelar
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre descriptivo del Hito *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Hormigonado de Losa, Finalización Cañerías, Revoque Fino..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Building Part & Trade in 2-column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Building Part (Ubicación en el Edificio) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>Parte del Edificio / Sector *</span>
                  </label>
                  <select
                    value={isCustomPart ? '__custom__' : buildingPart}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustomPart(true);
                      } else {
                        setIsCustomPart(false);
                        setBuildingPart(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {availableBuildingParts.map(part => (
                      <option key={part} value={part}>
                        {part}
                      </option>
                    ))}
                    <option value="__custom__">+ Escribir otro sector...</option>
                  </select>

                  {isCustomPart && (
                    <input
                      type="text"
                      required
                      placeholder="Escribe el sector (ej: Azotea, Cochera 2, etc.)"
                      value={customBuildingPart}
                      onChange={(e) => setCustomBuildingPart(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>

                {/* Trade Category (Rubro) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                    <span>Rubro / Gremio *</span>
                  </label>
                  <select
                    value={isCreatingNewTrade ? '__new__' : tradeCategory}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setIsCreatingNewTrade(true);
                      } else {
                        setIsCreatingNewTrade(false);
                        setTradeCategory(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {availableTradeNames.map(tr => (
                      <option key={tr} value={tr}>
                        {tr}
                      </option>
                    ))}
                    <option value="__new__">+ Agregar Nuevo Rubro...</option>
                  </select>

                  {isCreatingNewTrade && (
                    <input
                      type="text"
                      required
                      placeholder="Nombre del nuevo rubro (ej: Impermeabilización, Ascensores)"
                      value={newTradeName}
                      onChange={(e) => setNewTradeName(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 dark:border-amber-600 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>
              </div>

              {/* Start Date & Target/End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Fecha de Comienzo *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Si hoy pasa de esta fecha y el avance es 0%, saltará en <strong className="text-rose-500">ROJO</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-rose-500" />
                    <span>Fecha de Terminación (Límite) *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Si hoy supera esta fecha y no está al 100%, saltará en <strong className="text-rose-500">ROJO</strong>.
                  </p>
                </div>
              </div>

              {/* Progress Percentage Control */}
              <div className="bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>Porcentaje de Avance Actual:</span>
                  </label>
                  <span className={`text-sm font-mono font-black px-2 py-0.5 rounded-md ${
                    progressPercentage === 100
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : progressPercentage > 0
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {progressPercentage}%
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progressPercentage}
                  onChange={(e) => setProgressPercentage(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                {/* Quick Chips */}
                <div className="flex items-center justify-between gap-1 pt-1 flex-wrap">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProgressPercentage(val)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        progressPercentage === val
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {val === 0 ? '0% (No iniciado)' : val === 100 ? '100% (Finalizado)' : `${val}%`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Al poner más de 0%, el cronograma reflejará que este hito ya ha comenzado.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notas / Observaciones del Hito (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Coordinar entrega de áridos o prueba hidráulica"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddingOrEditing(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Guardar Cambios' : 'Crear y Guardar Hito'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Hitos Registrados ({milestones.length})</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Control de inicio, terminación, sector de edificio y alarmas en tiempo real.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStartAdd}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Hito</span>
              </button>
            </div>
          )}

          {/* List of Existing Milestones */}
          {milestones.length === 0 && !isAddingOrEditing ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No hay hitos críticos definidos
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Puedes crear un hito personalizado o agregar hitos rápidos recomendados:
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Instalación Sanitaria', 'Piso 1', 'Instalación Sanitaria', 'plomeria', 'Cañerías de agua', 15, 0)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  + Inst. Sanitaria (15 días)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Muros y Tabiques', 'Piso 2', 'Albañilería', 'albanileria', 'Muros y tabiques', 25, 0)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  + Muros Piso 2 (25 días)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Canalización Eléctrica', 'Planta Baja', 'Electricidad', 'electricidad', 'Canalizaciones', 30, 0)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  + Electricidad PB (30 días)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map(m => {
                const calc = calculateMilestoneProgress(m, project);
                const isOverdueAlarm = calc.isOverdue;
                const isNotStartedAlarm = calc.isStartedOverdue;
                const currentPct = calc.consolidatedProgress;

                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      calc.status === 'alarm_red'
                        ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-sm ring-1 ring-rose-400/40'
                        : calc.status === 'warning_yellow'
                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : calc.status === 'success_green'
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              calc.status === 'alarm_red'
                                ? 'bg-rose-600 text-white animate-pulse'
                                : calc.status === 'warning_yellow'
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : calc.status === 'success_green'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {calc.status === 'alarm_red' && <Flame className="w-3 h-3" />}
                            {calc.status === 'warning_yellow' && <AlertTriangle className="w-3 h-3" />}
                            {calc.status === 'success_green' && <CheckCircle2 className="w-3 h-3" />}
                            {calc.statusLabel}
                          </span>

                          {/* Sector badge */}
                          {m.buildingPart && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5 text-amber-500" />
                              {m.buildingPart}
                            </span>
                          )}

                          {/* Trade badge */}
                          {(m.tradeCategory || m.linkedTradeId) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                              <Wrench className="w-2.5 h-2.5 text-amber-600" />
                              {m.tradeCategory || m.linkedTradeId}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h5 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                          {m.name}
                        </h5>

                        {/* Dates timeline span */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Clock className="w-3 h-3 text-blue-500" />
                            {calc.startDateFormatted}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <Calendar className="w-3 h-3 text-rose-500" />
                            {calc.targetDateFormatted}
                          </span>
                          {isNotStartedAlarm && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black">
                              (No comenzó a tiempo)
                            </span>
                          )}
                          {isOverdueAlarm && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black">
                              (Vencido)
                            </span>
                          )}
                        </div>

                        {/* Progress Bar & Inline Adjuster */}
                        <div className="mt-2 space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-bold">
                              Avance del Hito:
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Quick step decrement button */}
                              {onUpdateMilestoneProgress && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateMilestoneProgress(project.id, m.id, Math.max(0, currentPct - 10))}
                                  className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center transition-colors"
                                  title="Restar 10%"
                                >
                                  -
                                </button>
                              )}
                              <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                                {currentPct}%
                              </span>
                              {/* Quick step increment button */}
                              {onUpdateMilestoneProgress && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateMilestoneProgress(project.id, m.id, Math.min(100, currentPct + 10))}
                                  className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center transition-colors"
                                  title="Sumar 10%"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                calc.status === 'alarm_red'
                                  ? 'bg-rose-500'
                                  : calc.status === 'warning_yellow'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${currentPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleManualMilestone(project.id, m.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                            m.manualCompleted || currentPct === 100
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                          title="Alternar cumplimiento manual"
                        >
                          {m.manualCompleted || currentPct === 100 ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> OK
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" /> Forzar OK
                            </>
                          )}
                        </button>

                        <div className="flex items-center gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Editar este hito"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteMilestone(project.id, m.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Eliminar este hito"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Sincronizado en tiempo real con Supabase Cloud.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
