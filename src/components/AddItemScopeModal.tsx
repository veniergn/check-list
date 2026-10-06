import React, { useState } from 'react';
import {
  X,
  Layers,
  Building2,
  Check,
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Project, Unit } from '../types';
import { calculateProjectProgress } from '../utils/calculations';

interface AddItemScopeModalProps {
  isOpen: boolean;
  itemName: string;
  tradeId: string;
  tradeName: string;
  currentProject: Project;
  currentUnit: Unit;
  allProjects: Project[];
  onClose: () => void;
  onConfirm: (scope: 'current_unit' | 'selected_projects', targetProjectIds: string[]) => void;
}

export function AddItemScopeModal({
  isOpen,
  itemName,
  tradeId,
  tradeName,
  currentProject,
  currentUnit,
  allProjects,
  onClose,
  onConfirm
}: AddItemScopeModalProps) {
  // Scope selection: 'current_unit' vs 'selected_projects'
  const [scope, setScope] = useState<'current_unit' | 'selected_projects'>('current_unit');

  // Calculate progress of all projects to determine active vs 100% completed
  const projectsWithProgress = allProjects.map(proj => {
    const progress = calculateProjectProgress(proj);
    const isCompleted = progress >= 100;
    return {
      project: proj,
      progress,
      isCompleted
    };
  });

  // Separate active projects from finished (100%) ones
  const activeProjects = projectsWithProgress.filter(p => !p.isCompleted);
  const finishedProjects = projectsWithProgress.filter(p => p.isCompleted);

  // Selected project IDs (current project checked by default)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([currentProject.id]);

  if (!isOpen) return null;

  const toggleProject = (projId: string, isCompleted: boolean) => {
    if (isCompleted) return; // Finished projects are disabled
    setSelectedProjectIds(prev =>
      prev.includes(projId) ? prev.filter(id => id !== projId) : [...prev, projId]
    );
  };

  const handleSelectAllActive = () => {
    setSelectedProjectIds(activeProjects.map(p => p.project.id));
  };

  const handleDeselectAll = () => {
    setSelectedProjectIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scope === 'selected_projects' && selectedProjectIds.length === 0) {
      return;
    }
    onConfirm(scope, scope === 'current_unit' ? [currentProject.id] : selectedProjectIds);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] transition-colors"
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight leading-tight">
                ¿Dónde deseas incorporar este ítem?
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Selector inteligente de replicación en obra
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item & Trade Summary Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-black tracking-wider uppercase text-amber-600 dark:text-amber-400 block">
                Gremio: {tradeName}
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5" title={itemName}>
                "{itemName}"
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                Unidad Actual:
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentUnit.name}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Options Radios */}
          <div className="space-y-2.5">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide block">
              Alcance de la incorporación:
            </span>

            {/* Option A: Only current unit */}
            <label
              className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                scope === 'current_unit'
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 text-slate-900 dark:text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="item_scope"
                value="current_unit"
                checked={scope === 'current_unit'}
                onChange={() => setScope('current_unit')}
                className="mt-0.5 text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    Solo en esta unidad / departamento actual
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {currentUnit.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Se creará como una tarea exclusiva para {currentUnit.name} de {currentProject.name} con 0% de avance inicial.
                </p>
              </div>
            </label>

            {/* Option B: In selected projects */}
            <label
              className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-start gap-3 transition-all ${
                scope === 'selected_projects'
                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 text-slate-900 dark:text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              <input
                type="radio"
                name="item_scope"
                value="selected_projects"
                checked={scope === 'selected_projects'}
                onChange={() => setScope('selected_projects')}
                className="mt-0.5 text-amber-500 focus:ring-amber-400 w-4 h-4"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    En obras seleccionadas
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                    Replicar en todos sus departamentos
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Se incorporará automáticamente a cada departamento/espacio de las obras marcadas con 0% de avance (desmarcado).
                </p>
              </div>
            </label>
          </div>

          {/* Sub-panel for Selected Projects (only if Option B is active) */}
          {scope === 'selected_projects' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-150">
              {/* Toolbar: Select All / Deselect All */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-slate-200 dark:border-slate-700">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  Obras en curso ({selectedProjectIds.length} seleccionada{selectedProjectIds.length === 1 ? '' : 's'}):
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllActive}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline px-1.5 py-0.5"
                  >
                    Seleccionar todas las activas
                  </button>
                  <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5"
                  >
                    Deseleccionar todas
                  </button>
                </div>
              </div>

              {/* Active Projects List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {activeProjects.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">
                    No hay otras obras activas disponibles.
                  </p>
                ) : (
                  activeProjects.map(({ project: p, progress }) => {
                    const isSelected = selectedProjectIds.includes(p.id);
                    const isCurrent = p.id === currentProject.id;

                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProject(p.id, false)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-400 dark:border-amber-500 text-slate-900 dark:text-white'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            className="text-amber-500 flex-shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black truncate">
                                {p.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-900 dark:bg-slate-700 text-amber-400">
                                  Actual
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                              {p.units.length} departamentos / espacios
                            </span>
                          </div>
                        </div>

                        {/* Progress Badge */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="w-12 sm:w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300 min-w-8 text-right">
                            {progress}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Finished (100%) Projects - Disabled block */}
                {finishedProjects.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                      Obras Culminadas (100% - No seleccionables):
                    </span>
                    {finishedProjects.map(({ project: p }) => (
                      <div
                        key={p.id}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 opacity-60 flex items-center justify-between text-xs cursor-not-allowed mb-1"
                        title="Esta obra ya se encuentra finalizada al 100%"
                      >
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-500" />
                          <span className="font-bold text-slate-600 dark:text-slate-400 truncate">
                            {p.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          100% Culminada
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedProjectIds.length === 0 && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Debes seleccionar al menos una obra para aplicar la tarea.
                </p>
              )}
            </div>
          )}

          {/* Automatic Recalculation Notice */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-2.5 rounded-xl flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-300">
            <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="leading-tight">
              Al confirmar, el sistema recalculará de inmediato el <strong>denominador total de ítems</strong>, los porcentajes consolidados y el trayecto hacia la culminación de la Línea de Tiempo.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={scope === 'selected_projects' && selectedProjectIds.length === 0}
              className={`px-4 py-2 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-all ${
                scope === 'selected_projects' && selectedProjectIds.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Aplicar Incorporación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
