import React, { useState } from 'react';
import { X, DoorOpen, Layers, Sparkles, Check, Building2, Flame, Zap, Shield, Warehouse, Compass } from 'lucide-react';

interface NewUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUnit: (unitName: string, unitType: 'unit' | 'common_area') => void;
}

const COMMON_AREA_PRESETS = [
  { label: 'Sector Quincho / SUM', icon: 'Flame' },
  { label: 'Sala Estación Transformadora (SET)', icon: 'Zap' },
  { label: 'Sala de Máquinas y Bombas', icon: 'Compass' },
  { label: 'Hall de Acceso Principal', icon: 'Building2' },
  { label: 'Terraza Común / Solárium', icon: 'Sparkles' },
  { label: 'Cocheras / Estacionamiento', icon: 'Warehouse' },
  { label: 'Palieres y Escaleras de Emergencia', icon: 'Layers' },
  { label: 'Portón y Fachada Exterior', icon: 'Shield' },
  { label: 'Lavadero y Tendedero Común', icon: 'DoorOpen' },
  { label: 'Sala de Tableros Eléctricos', icon: 'Zap' }
];

export function NewUnitModal({
  isOpen,
  onClose,
  onCreateUnit
}: NewUnitModalProps) {
  const [spaceType, setSpaceType] = useState<'unit' | 'common_area'>('unit');
  const [floor, setFloor] = useState<number>(1);
  const [unitNum, setUnitNum] = useState<number>(1);
  const [unitName, setUnitName] = useState('Depto 1-1');
  const [commonAreaName, setCommonAreaName] = useState('Sector Quincho / SUM');

  if (!isOpen) return null;

  const handleApplyFloor = (f: number, u: number) => {
    setFloor(f);
    setUnitNum(u);
    setUnitName(`Depto ${f}-${u}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spaceType === 'unit') {
      if (!unitName.trim()) return;
      onCreateUnit(unitName.trim(), 'unit');
    } else {
      if (!commonAreaName.trim()) return;
      onCreateUnit(commonAreaName.trim(), 'common_area');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border-t-4 border-slate-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-900 font-bold">
              {spaceType === 'unit' ? (
                <DoorOpen className="w-4 h-4 text-amber-600" />
              ) : (
                <Building2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Agregar al Complejo
              </h3>
              <p className="text-[11px] text-slate-500">
                Departamento o espacio común / de servicio
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Space Type Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSpaceType('unit')}
            className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              spaceType === 'unit'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DoorOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Departamento</span>
          </button>

          <button
            type="button"
            onClick={() => setSpaceType('common_area')}
            className={`py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              spaceType === 'common_area'
                ? 'bg-white text-slate-950 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Espacio Común</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {spaceType === 'unit' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre / Identificador de Unidad
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Depto 2-3"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-slate-50 font-bold text-slate-900"
                />
              </div>

              {/* Floor & Depto Selector Assistant */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Configurador Rápido por Pisos:
                  </span>
                  <span className="text-[11px] text-amber-700 font-mono font-bold">
                    Piso {floor} - Depto {unitNum}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Piso
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={floor}
                      onChange={(e) => {
                        const f = parseInt(e.target.value, 10) || 1;
                        handleApplyFloor(f, unitNum);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Número de Depto
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={unitNum}
                      onChange={(e) => {
                        const u = parseInt(e.target.value, 10) || 1;
                        handleApplyFloor(floor, u);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { f: 1, u: 1 },
                    { f: 1, u: 2 },
                    { f: 1, u: 3 },
                    { f: 1, u: 4 },
                    { f: 2, u: 1 },
                    { f: 2, u: 2 },
                    { f: 2, u: 3 },
                    { f: 2, u: 4 },
                    { f: 3, u: 1 },
                    { f: 3, u: 2 },
                    { f: 3, u: 3 },
                    { f: 3, u: 4 }
                  ].map(item => (
                    <button
                      key={`${item.f}-${item.u}`}
                      type="button"
                      onClick={() => handleApplyFloor(item.f, item.u)}
                      className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 rounded-md text-[10px] font-mono font-bold text-slate-700"
                    >
                      {item.f}-{item.u}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Common Area Configuration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Denominación del Espacio Común
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sector Quincho, Sala SET, Cocheras..."
                  value={commonAreaName}
                  onChange={(e) => setCommonAreaName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-slate-50 font-bold text-slate-900"
                />
              </div>

              {/* Common Area Quick Presets */}
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-2">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  Sugerencias Rápidas de Espacios Comunes:
                </span>
                <p className="text-[11px] text-emerald-800">
                  Toca una opción para asignarla o edítala libremente arriba:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {COMMON_AREA_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCommonAreaName(preset.label)}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        commonAreaName === preset.label
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white hover:bg-emerald-100/70 border-emerald-200 text-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 inline mr-1" />
            Se generará con la plantilla técnica completa de inspección y registro fotográfico.
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-sm shadow-md touch-target active:scale-95 transition-all border border-amber-500/50 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Guardar {spaceType === 'unit' ? 'Unidad' : 'Espacio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
