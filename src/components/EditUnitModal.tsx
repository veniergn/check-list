import React, { useState, useEffect } from 'react';
import { X, Pencil, Layers, DoorOpen, Check, Sparkles, Building2, Trash2 } from 'lucide-react';
import { Unit } from '../types';

interface EditUnitModalProps {
  isOpen: boolean;
  unit: Unit | null;
  onClose: () => void;
  onSave: (unitId: string, newName: string, newType?: 'unit' | 'common_area') => void;
  onRequestDelete?: (unitId: string, unitName: string) => void;
}

const COMMON_AREA_PRESETS = [
  'Sector Quincho / SUM',
  'Sala Estación Transformadora (SET)',
  'Sala de Máquinas y Bombas',
  'Hall de Acceso Principal',
  'Terraza Común / Solárium',
  'Cocheras / Estacionamiento',
  'Palieres y Escaleras',
  'Portón y Fachada Exterior'
];

export function EditUnitModal({
  isOpen,
  unit,
  onClose,
  onSave,
  onRequestDelete
}: EditUnitModalProps) {
  const [unitName, setUnitName] = useState('');
  const [spaceType, setSpaceType] = useState<'unit' | 'common_area'>('unit');
  const [floorNumber, setFloorNumber] = useState<number>(1);
  const [apartmentNumber, setApartmentNumber] = useState<number>(1);

  useEffect(() => {
    if (unit) {
      setUnitName(unit.name);
      setSpaceType(unit.type || (unit.name.toLowerCase().includes('depto') ? 'unit' : 'common_area'));
      // Try to parse floor and depto from existing name like "Depto 2-3" or "2-3"
      const match = unit.name.match(/(\d+)\s*[-_]\s*(\d+)/);
      if (match) {
        setFloorNumber(parseInt(match[1], 10) || 1);
        setApartmentNumber(parseInt(match[2], 10) || 1);
      }
    }
  }, [unit]);

  if (!isOpen || !unit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    onSave(unit.id, unitName.trim(), spaceType);
    onClose();
  };

  const applyFloorPattern = (floor: number, depto: number) => {
    setFloorNumber(floor);
    setApartmentNumber(depto);
    setUnitName(`Depto ${floor}-${depto}`);
    setSpaceType('unit');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border-t-4 border-amber-500 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base leading-tight">
                Editar Denominación
              </h3>
              <p className="text-[11px] text-slate-500">
                Departamento o espacio común en el complejo
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Space Type Selector */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSpaceType('unit')}
            className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
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
            className={`py-1.5 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
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
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nombre / Denominación
            </label>
            <input
              type="text"
              required
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-slate-50 font-bold text-slate-900"
            />
          </div>

          {spaceType === 'unit' ? (
            <>
              {/* Assistant for Floor and Unit Number: X-Y */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Asistente por Pisos:
                  </span>
                  <span className="text-[11px] text-amber-700 font-mono font-bold">
                    Piso-Depto ({floorNumber}-{apartmentNumber})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Número de Piso
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={floorNumber}
                      onChange={(e) => {
                        const f = parseInt(e.target.value, 10) || 1;
                        setFloorNumber(f);
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
                      value={apartmentNumber}
                      onChange={(e) => {
                        const d = parseInt(e.target.value, 10) || 1;
                        setApartmentNumber(d);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-center bg-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => applyFloorPattern(floorNumber, apartmentNumber)}
                  className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 border border-amber-500/50 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Aplicar: &ldquo;Depto {floorNumber}-{apartmentNumber}&rdquo;</span>
                </button>
              </div>

              {/* Quick presets */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Accesos rápidos comunes:
                </span>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { f: 1, d: 1 },
                    { f: 1, d: 2 },
                    { f: 1, d: 3 },
                    { f: 1, d: 4 },
                    { f: 2, d: 1 },
                    { f: 2, d: 2 },
                    { f: 2, d: 3 },
                    { f: 2, d: 4 },
                    { f: 3, d: 1 },
                    { f: 3, d: 2 }
                  ].map(({ f, d }) => (
                    <button
                      key={`${f}-${d}`}
                      type="button"
                      onClick={() => applyFloorPattern(f, d)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[11px] font-mono font-bold text-slate-800"
                    >
                      {f}-{d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Common Area suggestions */
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 space-y-2">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                Sugerencias de Espacios Comunes:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5">
                {COMMON_AREA_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setUnitName(preset);
                      setSpaceType('common_area');
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      unitName === preset
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white hover:bg-emerald-100/70 border-emerald-200 text-slate-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delete action button requiring PIN 2600 */}
          {onRequestDelete && (
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestDelete(unit.id, unit.name);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors touch-target"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Eliminar {spaceType === 'unit' ? 'este Departamento' : 'este Espacio'} (Requiere clave 2600)</span>
              </button>
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md touch-target active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
