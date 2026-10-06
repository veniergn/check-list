import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Layers,
  Sparkles,
  Hash,
  Check,
  Plus,
  Trash2,
  Sliders,
  ChevronDown,
  Building,
  Zap,
  Droplets,
  FileCheck
} from 'lucide-react';
import { FloorConfig, ProjectCustomService } from '../types';

export interface GeneratedUnitConfig {
  name: string;
  type?: 'unit' | 'common_area';
  floorNumber?: number;
  floorLabel?: string;
  category?: string;
}

export interface NewProjectPayload {
  name: string;
  location: string;
  director?: string;
  computoSubtitle?: string;
  technicalNotes?: string;
  expedienteMunicipal?: string;
  expedienteEdemsa?: string;
  expedienteAysam?: string;
  customServices?: ProjectCustomService[];
  startDate?: string;
  estimatedEndDate?: string;
  floorsConfig?: FloorConfig[];
  units: GeneratedUnitConfig[];
}

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (payload: NewProjectPayload) => void;
}

const SERVICE_PRESETS = [
  { name: 'Gas (Ecogas / Distribuidora)', icon: '⛽' },
  { name: 'Bomberos / Seguridad contra Incendio', icon: '🚒' },
  { name: 'Plano de Mensura / Catastro', icon: '📐' },
  { name: 'Telecomunicaciones / Fibra Óptica', icon: '📡' },
  { name: 'Estudio de Impacto Ambiental', icon: '🌿' },
  { name: 'Seguridad e Higiene Laboral', icon: '🛡️' }
];

const PRESET_AMENITIES = [
  { id: 'hall', label: 'Hall de Acceso', icon: '🏢' },
  { id: 'quincho', label: 'Quincho / SUM', icon: '🍖' },
  { id: 'terraza', label: 'Terraza / Solarium', icon: '🏊' },
  { id: 'cocheras', label: 'Cocheras / Subsuelo', icon: '🚗' },
  { id: 'bauleras', label: 'Bauleras / Depósito', icon: '📦' }
];

export function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject
}: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState<'floors' | 'manual'>('floors');

  // Floors configuration
  const [floorsCount, setFloorsCount] = useState<number>(3);
  const [includeGroundFloor, setIncludeGroundFloor] = useState<boolean>(true);
  const [bulkUnitsInput, setBulkUnitsInput] = useState<number>(4);
  const [floorBreakdown, setFloorBreakdown] = useState<FloorConfig[]>([]);
  const [prefix, setPrefix] = useState('Depto');

  // Amenities / Common areas
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(['hall', 'quincho']);
  const [customAmenities, setCustomAmenities] = useState<string[]>([]);
  const [newCustomAmenity, setNewCustomAmenity] = useState('');

  // Administrative & Avance General (optional)
  const [showAdminFields, setShowAdminFields] = useState(false);
  const [director, setDirector] = useState('Msc. Arq. Agustín Arrieta');
  const [computoSubtitle, setComputoSubtitle] = useState('Cómputo, Certificaciones y Rubros');
  const [technicalNotes, setTechnicalNotes] = useState('Toda la información del Expediente');
  const [expedienteMunicipal, setExpedienteMunicipal] = useState('');
  const [expedienteEdemsa, setExpedienteEdemsa] = useState('');
  const [expedienteAysam, setExpedienteAysam] = useState('');

  // Dynamic additional custom services & expedientes
  const [customServices, setCustomServices] = useState<ProjectCustomService[]>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceNumber, setNewServiceNumber] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);

  // Simple count fallback
  const [manualCount, setManualCount] = useState<number>(6);

  // Initialize or re-generate floorBreakdown when floorsCount or includeGroundFloor changes
  useEffect(() => {
    const list: FloorConfig[] = [];
    const count = Math.max(1, Math.min(40, floorsCount));

    if (includeGroundFloor) {
      list.push({
        floorNumber: 0,
        floorLabel: 'Planta Baja (PB)',
        unitsCount: bulkUnitsInput
      });
      for (let i = 1; i <= count; i++) {
        list.push({
          floorNumber: i,
          floorLabel: `Piso ${i}`,
          unitsCount: bulkUnitsInput
        });
      }
    } else {
      for (let i = 1; i <= count; i++) {
        list.push({
          floorNumber: i,
          floorLabel: `Piso ${i}`,
          unitsCount: bulkUnitsInput
        });
      }
    }

    setFloorBreakdown(list);
  }, [floorsCount, includeGroundFloor]);

  if (!isOpen) return null;

  // Handle "Aplicar a todos" bulk setter
  const handleApplyToAll = () => {
    const qty = Math.max(1, Math.min(30, bulkUnitsInput));
    setFloorBreakdown(prev => prev.map(f => ({ ...f, unitsCount: qty })));
  };

  // Update a single floor units count
  const handleUpdateFloorCount = (index: number, count: number) => {
    const qty = Math.max(0, Math.min(30, count));
    setFloorBreakdown(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], unitsCount: qty };
      }
      return copy;
    });
  };

  // Toggle amenities
  const handleToggleAmenity = (id: string) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleAddCustomAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomAmenity.trim()) return;
    setCustomAmenities(prev => [...prev, newCustomAmenity.trim()]);
    setNewCustomAmenity('');
  };

  const handleRemoveCustomAmenity = (index: number) => {
    setCustomAmenities(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomService = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newServiceName.trim() || !newServiceNumber.trim()) return;

    const newEntry: ProjectCustomService = {
      id: `srv_${Date.now()}`,
      name: newServiceName.trim(),
      number: newServiceNumber.trim()
    };

    setCustomServices(prev => [...prev, newEntry]);
    setNewServiceName('');
    setNewServiceNumber('');
    setIsAddingService(false);
  };

  const handleRemoveCustomService = (id: string) => {
    setCustomServices(prev => prev.filter(s => s.id !== id));
  };

  const handlePresetClick = (presetName: string) => {
    setNewServiceName(presetName);
    setIsAddingService(true);
  };

  // Generate complete units payload
  const generateUnits = (): GeneratedUnitConfig[] => {
    const units: GeneratedUnitConfig[] = [];
    const pref = prefix.trim() ? `${prefix.trim()} ` : '';

    if (mode === 'floors') {
      floorBreakdown.forEach(floor => {
        const floorPrefix = floor.floorNumber === 0 ? 'PB' : `${floor.floorNumber}`;
        for (let u = 1; u <= floor.unitsCount; u++) {
          units.push({
            name: `${pref}${floorPrefix}-${u}`,
            type: 'unit',
            floorNumber: floor.floorNumber,
            floorLabel: floor.floorLabel,
            category: 'Departamento'
          });
        }
      });
    } else {
      const count = Math.max(1, Math.min(100, manualCount));
      for (let i = 1; i <= count; i++) {
        const floor = Math.ceil(i / 2);
        const unit = i % 2 === 1 ? 1 : 2;
        units.push({
          name: `${pref}${floor}-${unit}`,
          type: 'unit',
          floorNumber: floor,
          floorLabel: `Piso ${floor}`,
          category: 'Departamento'
        });
      }
    }

    // Common areas / Amenities
    selectedAmenities.forEach(amenityId => {
      const item = PRESET_AMENITIES.find(a => a.id === amenityId);
      if (item) {
        units.push({
          name: `${item.icon} ${item.label}`,
          type: 'common_area',
          floorLabel: 'Áreas Comunes',
          category: 'Espacio Común'
        });
      }
    });

    customAmenities.forEach(nameStr => {
      units.push({
        name: `🏢 ${nameStr}`,
        type: 'common_area',
        floorLabel: 'Áreas Comunes',
        category: 'Espacio Común'
      });
    });

    return units;
  };

  const previewUnits = generateUnits();
  const totalDeptos = previewUnits.filter(u => u.type !== 'common_area').length;
  const totalCommon = previewUnits.filter(u => u.type === 'common_area').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const units = generateUnits();

    onCreateProject({
      name: name.trim(),
      location: location.trim(),
      director: director.trim() || undefined,
      computoSubtitle: computoSubtitle.trim() || undefined,
      technicalNotes: technicalNotes.trim() || undefined,
      expedienteMunicipal: expedienteMunicipal.trim() || undefined,
      expedienteEdemsa: expedienteEdemsa.trim() || undefined,
      expedienteAysam: expedienteAysam.trim() || undefined,
      customServices: customServices.length > 0 ? customServices : undefined,
      floorsConfig: mode === 'floors' ? floorBreakdown : undefined,
      units
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl border-t-4 border-amber-500 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                Crear Nueva Obra / Complejo
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configuración flexible por pisos, unidades y amenities comunes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Obra y Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nombre del Edificio / Obra *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Torre Los Ceibos II"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Ubicación o Dirección
              </label>
              <input
                type="text"
                placeholder="Ej: Av. San Martín 1540 • Ciudad"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>

          {/* Mode Selector */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Estructura de Unidades y Pisos</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-black uppercase">
                {totalDeptos} Deptos + {totalCommon} Comunes = {previewUnits.length} Total
              </span>
            </label>

            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('floors')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'floors'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Desglose por Pisos</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  mode === 'manual'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Cantidad Simple</span>
              </button>
            </div>
          </div>

          {/* Desglose dinámico por pisos */}
          {mode === 'floors' ? (
            <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              {/* Controles maestros: Pisos y PB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Cantidad de Pisos Altos
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={floorsCount}
                    onChange={(e) => setFloorsCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black text-center text-sm"
                  />
                </div>

                <div className="pt-2 sm:pt-4 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeGroundFloor}
                      onChange={(e) => setIncludeGroundFloor(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Incluir Planta Baja (PB)
                    </span>
                  </label>
                </div>
              </div>

              {/* Herramienta "Aplicar a todos" */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    Deptos base por piso:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={bulkUnitsInput}
                    onChange={(e) => setBulkUnitsInput(parseInt(e.target.value, 10) || 1)}
                    className="w-14 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-amber-300 dark:border-amber-800 text-center font-black text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyToAll}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow-xs active:scale-95 transition-all"
                >
                  ⚡ Aplicar a todos los pisos
                </button>
              </div>

              {/* Lista dinámica de niveles */}
              <div>
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                  Ajuste Individual por Nivel:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {floorBreakdown.map((floor, idx) => (
                    <div
                      key={floor.floorNumber}
                      className="flex items-center justify-between bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {floor.floorLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateFloorCount(idx, floor.unitsCount - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black text-xs"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="25"
                          value={floor.unitsCount}
                          onChange={(e) => handleUpdateFloorCount(idx, parseInt(e.target.value, 10) || 0)}
                          className="w-12 px-1 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-center font-black text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateFloorCount(idx, floor.unitsCount + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black text-xs"
                        >
                          +
                        </button>
                        <span className="text-[11px] font-medium text-slate-500 ml-1">deptos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prefijo */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Prefijo:</span>
                <div className="flex gap-1">
                  {['Depto', 'Unidad', ''].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrefix(p)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        prefix === p
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {p === '' ? 'Sin prefijo (1-1)' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Cantidad Total de Departamentos
              </label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={manualCount}
                onChange={(e) => setManualCount(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center"
              />
            </div>
          )}

          {/* Espacios Comunes & Amenities */}
          <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Amenities y Espacios Comunes a Inspeccionar:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMENITIES.map(amenity => {
                const isSelected = selectedAmenities.includes(amenity.id);
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => handleToggleAmenity(amenity.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span>{amenity.icon}</span>
                    <span>{amenity.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom amenities */}
            {customAmenities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {customAmenities.map((custom, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold"
                  >
                    <span>{custom}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomAmenity(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom amenity */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Otro espacio común (ej: Gimnasio, Laundry...)"
                value={newCustomAmenity}
                onChange={(e) => setNewCustomAmenity(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddCustomAmenity}
                className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {/* Expedientes / Datos Administrativos Opcionales */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
            <button
              type="button"
              onClick={() => setShowAdminFields(prev => !prev)}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-amber-600 flex items-center gap-1"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdminFields ? 'rotate-180' : ''}`} />
              <span>{showAdminFields ? 'Ocultar' : 'Agregar'} Datos de Expedientes y Servicios ({customServices.length > 0 ? `${customServices.length + 3} servicios` : 'Municipal, EDEMSA, AYSAM, Gas...'})</span>
            </button>

            {showAdminFields && (
              <div className="mt-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
                {/* Datos de Avance General / Dirección de Obra */}
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block">
                    Ficha de Avance General (Presentación)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-0.5">
                        Dirección Técnica / Profesional (Msc. Arq.)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Msc. Arq. Agustín Arrieta"
                        value={director}
                        onChange={(e) => setDirector(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-0.5">
                        Subtítulo / Especialidad
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Cómputo, Certificaciones y Rubros"
                        value={computoSubtitle}
                        onChange={(e) => setComputoSubtitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-0.5">
                      Memoria / Expediente de Obra
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Toda la información del Expediente"
                      value={technicalNotes}
                      onChange={(e) => setTechnicalNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-blue-500" />
                      Expte. Municipal
                    </label>
                    <input
                      type="text"
                      placeholder="Exp. 14238/2025"
                      value={expedienteMunicipal}
                      onChange={(e) => setExpedienteMunicipal(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      EDEMSA (Electricidad)
                    </label>
                    <input
                      type="text"
                      placeholder="Cuenta / NIC"
                      value={expedienteEdemsa}
                      onChange={(e) => setExpedienteEdemsa(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-sky-500" />
                      AYSAM (Agua)
                    </label>
                    <input
                      type="text"
                      placeholder="Cuenta Suministro"
                      value={expedienteAysam}
                      onChange={(e) => setExpedienteAysam(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Expedientes y Servicios Adicionales */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Más Servicios y Expedientes ({customServices.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingService(prev => !prev)}
                      className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Agregar Servicio</span>
                    </button>
                  </div>

                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-1">
                    {SERVICE_PRESETS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetClick(p.name)}
                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <span>{p.icon}</span>
                        <span>{p.name.split('(')[0].trim()}</span>
                      </button>
                    ))}
                  </div>

                  {/* Formulario para agregar nuevo servicio */}
                  {isAddingService && (
                    <div className="p-2.5 bg-white dark:bg-slate-850 rounded-xl border border-amber-300 dark:border-amber-700/60 space-y-2 animate-scale-up">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-0.5">
                            Entidad / Servicio
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Gas, Bomberos, Catastro..."
                            value={newServiceName}
                            onChange={(e) => setNewServiceName(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-0.5">
                            Nº Expediente / Cuenta / Suministro
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Cuenta 29401 / Exp. 4910-B"
                            value={newServiceNumber}
                            onChange={(e) => setNewServiceNumber(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingService(false)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCustomService()}
                          disabled={!newServiceName.trim() || !newServiceNumber.trim()}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black"
                        >
                          Confirmar Servicio
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Listado de servicios agregados */}
                  {customServices.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {customServices.map((srv) => (
                        <div
                          key={srv.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {srv.name}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                              {srv.number}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomService(srv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                            title="Eliminar servicio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vista previa de unidades generadas */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Vista previa ({previewUnits.length} espacios a crear):
            </span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto no-scrollbar">
              {previewUnits.slice(0, 24).map((u, i) => (
                <span
                  key={i}
                  className={`px-2 py-0.5 border rounded-md text-[10px] font-mono font-bold shadow-2xs ${
                    u.type === 'common_area'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {u.name}
                </span>
              ))}
              {previewUnits.length > 24 && (
                <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-[10px] font-bold">
                  +{previewUnits.length - 24} más...
                </span>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-md touch-target active:scale-95 transition-all"
            >
              Crear Obra ({previewUnits.length} Espacios)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
