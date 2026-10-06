import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  FileCheck,
  Calendar,
  FileText,
  MapPin,
  Zap,
  Droplets,
  Save,
  Plus,
  Trash2,
  Flame,
  ShieldAlert,
  Compass,
  Radio,
  Sparkles
} from 'lucide-react';
import { Project, ProjectCustomService } from '../types';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSaveProject: (updatedData: Partial<Project>) => void;
}

const SERVICE_PRESETS = [
  { name: 'Gas (Ecogas / Distribuidora)', icon: '⛽' },
  { name: 'Bomberos / Seguridad contra Incendio', icon: '🚒' },
  { name: 'Plano de Mensura / Catastro', icon: '📐' },
  { name: 'Telecomunicaciones / Fibra Óptica', icon: '📡' },
  { name: 'Estudio de Impacto Ambiental', icon: '🌿' },
  { name: 'Seguridad e Higiene Laboral', icon: '🛡️' }
];

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  onSaveProject
}: EditProjectModalProps) {
  const [name, setName] = useState(project.name || '');
  const [location, setLocation] = useState(project.location || '');
  const [expedienteMunicipal, setExpedienteMunicipal] = useState(project.expedienteMunicipal || '');
  const [expedienteEdemsa, setExpedienteEdemsa] = useState(project.expedienteEdemsa || '');
  const [expedienteAysam, setExpedienteAysam] = useState(project.expedienteAysam || '');
  const [startDate, setStartDate] = useState(project.startDate || project.createdAt?.split('T')[0] || '');
  const [estimatedEndDate, setEstimatedEndDate] = useState(project.estimatedEndDate || '');
  const [technicalNotes, setTechnicalNotes] = useState(project.technicalNotes || '');
  const [director, setDirector] = useState(project.director || 'Msc. Arq. Agustín Arrieta');
  const [computoSubtitle, setComputoSubtitle] = useState(project.computoSubtitle || 'Cómputo, Certificaciones y Rubros');

  // Dynamic additional custom services & expedientes
  const [customServices, setCustomServices] = useState<ProjectCustomService[]>(
    project.customServices || []
  );
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceNumber, setNewServiceNumber] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);

  useEffect(() => {
    setName(project.name || '');
    setLocation(project.location || '');
    setExpedienteMunicipal(project.expedienteMunicipal || '');
    setExpedienteEdemsa(project.expedienteEdemsa || '');
    setExpedienteAysam(project.expedienteAysam || '');
    setStartDate(project.startDate || project.createdAt?.split('T')[0] || '');
    setEstimatedEndDate(project.estimatedEndDate || '');
    setTechnicalNotes(project.technicalNotes || '');
    setDirector(project.director || 'Msc. Arq. Agustín Arrieta');
    setComputoSubtitle(project.computoSubtitle || 'Cómputo, Certificaciones y Rubros');
    setCustomServices(project.customServices || []);
  }, [project]);

  if (!isOpen) return null;

  const handleAddCustomService = (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProject({
      name: name.trim(),
      location: location.trim(),
      expedienteMunicipal: expedienteMunicipal.trim(),
      expedienteEdemsa: expedienteEdemsa.trim(),
      expedienteAysam: expedienteAysam.trim(),
      startDate: startDate || undefined,
      estimatedEndDate: estimatedEndDate || undefined,
      technicalNotes: technicalNotes.trim(),
      director: director.trim(),
      computoSubtitle: computoSubtitle.trim(),
      customServices
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 no-print animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl p-5 shadow-2xl border-t-4 border-amber-500 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                Ficha Técnica y Administrativa
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Edición de expedientes, suministros, servicios y memoria técnica
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
          {/* Nombre y Ubicación */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Nombre del Edificio / Complejo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Torre Los Ceibos II"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Ubicación o Dirección
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Av. San Martín 1540 • Ciudad"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>

          {/* Sección Destacada: Datos de Avance General (Presentación Ejecutiva) */}
          <div className="bg-[#131b2c] p-4 rounded-2xl border-2 border-amber-500/50 shadow-md space-y-3 text-white">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Datos de Avance General (Ficha Frontal)
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                Se muestran en la tarjeta de obra
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#00c2ff]" />
                Dirección Técnica / Arquitecto / Profesional (Msc. Arq.)
              </label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Ej: Msc. Arq. Agustín Arrieta"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0e1422] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-[#00c2ff]" />
                Línea 1: Memoria / Expediente / Documentación
              </label>
              <input
                type="text"
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                placeholder="Ej: Toda la información del Expediente"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0e1422] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#00c2ff]" />
                Línea 3: Especialidad / Cómputo y Certificaciones
              </label>
              <input
                type="text"
                value={computoSubtitle}
                onChange={(e) => setComputoSubtitle(e.target.value)}
                placeholder="Ej: Cómputo, Certificaciones y Rubros"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0e1422] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold placeholder-slate-500"
              />
            </div>
          </div>

          {/* Expedientes y Suministros Principales */}
          <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Expedientes y Suministros Base
            </span>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                Expediente Municipal / Permiso de Obra
              </label>
              <input
                type="text"
                value={expedienteMunicipal}
                onChange={(e) => setExpedienteMunicipal(e.target.value)}
                placeholder="Ej: Expte. Nº 14.892-O-2025 (Mun. Capital)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Suministro EDEMSA (Electricidad)
                </label>
                <input
                  type="text"
                  value={expedienteEdemsa}
                  onChange={(e) => setExpedienteEdemsa(e.target.value)}
                  placeholder="Cuenta / NIC 284910"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-500" />
                  Suministro AYSAM (Agua y Cloacas)
                </label>
                <input
                  type="text"
                  value={expedienteAysam}
                  onChange={(e) => setExpedienteAysam(e.target.value)}
                  placeholder="Cuenta 4910-2391"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Expedientes y Servicios Adicionales */}
          <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Más Expedientes y Servicios ({customServices.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAddingService(prev => !prev)}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 transition-all"
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
                  className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-amber-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  <span>{p.icon}</span>
                  <span>{p.name.split('(')[0].trim()}</span>
                </button>
              ))}
            </div>

            {/* Formulario para agregar nuevo servicio */}
            {isAddingService && (
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-800/60 space-y-2 animate-scale-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 mb-0.5">
                      Entidad / Nombre del Servicio
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Gas (Ecogas), Bomberos, Catastro..."
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
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
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
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
                    onClick={handleAddCustomService}
                    disabled={!newServiceName.trim() || !newServiceNumber.trim()}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black"
                  >
                    Confirmar Servicio
                  </button>
                </div>
              </div>
            )}

            {/* Listado de servicios agregados */}
            {customServices.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
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
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex-shrink-0"
                      title="Eliminar este expediente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                No hay servicios adicionales cargados. Puedes agregar Gas, Bomberos, Catastro, etc.
              </p>
            )}
          </div>

          {/* Plazos de Ejecución */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Fecha Fin Prevista
              </label>
              <input
                type="date"
                value={estimatedEndDate}
                onChange={(e) => setEstimatedEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Notas Técnicas / Memoria Descriptiva */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Notas Técnicas / Memoria Descriptiva
            </label>
            <textarea
              rows={3}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Especificaciones estructurales, contratistas principales, observaciones relevantes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs leading-relaxed"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md touch-target active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Ficha Técnica</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
