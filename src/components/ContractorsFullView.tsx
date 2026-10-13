import React, { useState, useMemo } from 'react';
import {
  Users,
  Camera,
  Search,
  Building2,
  Briefcase,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  Phone
} from 'lucide-react';
import { Project, ContractorProfile } from '../types';
import { DEFAULT_CONTRACTORS } from '../utils/pmContractors';
import { ContractorAvatar } from './ContractorAvatar';
import { ContractorPhotoModal } from './ContractorPhotoModal';

interface ContractorsFullViewProps {
  projects: Project[];
  neonColor?: string;
  selectedProjectId?: string | null;
  onSaveContractorPhoto: (projectId: string, contractorId: string, avatarUrl: string) => void;
  onAddContractor?: (projectId: string, contractor: ContractorProfile) => void;
  onDeleteContractor?: (projectId: string, contractorId: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const ROLE_PRESETS = [
  'Jefe de Obra / Arquitecto',
  'Capataz General',
  'Instalador Sanitario / Gasista',
  'Electricista Matriculado',
  'Oficial Albañil / Estructura',
  'Yesero / Terminaciones',
  'Pintor Profesional',
  'Carpintero Metálico / Aluminio',
  'Herrero / Estructuras',
  'Contratista General'
];

const COLOR_PRESETS = [
  '#00f2fe', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f43f5e'
];

export function ContractorsFullView({
  projects,
  neonColor = '#00f2fe',
  selectedProjectId,
  onSaveContractorPhoto,
  onAddContractor,
  onDeleteContractor,
  onShowToast
}: ContractorsFullViewProps) {
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>(selectedProjectId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContractor, setEditingContractor] = useState<{
    projectId: string;
    contractor: ContractorProfile;
  } | null>(null);

  // Add Contractor Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTargetProjectId, setNewTargetProjectId] = useState<string>(
    selectedProjectId || (projects[0]?.id || '')
  );
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(ROLE_PRESETS[0]);
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0]);

  // Delete confirmation modal state
  const [contractorToDelete, setContractorToDelete] = useState<{
    projectId: string;
    contractor: ContractorProfile;
    projectName: string;
  } | null>(null);

  // Consolidated list of contractors with project metadata
  const contractorsList = useMemo(() => {
    const list: Array<{
      projectId: string;
      projectName: string;
      contractor: ContractorProfile;
      assignedTasksCount: number;
    }> = [];

    projects.forEach(proj => {
      const proContractors = (proj.contractors && proj.contractors.length > 0)
        ? proj.contractors
        : DEFAULT_CONTRACTORS;

      proContractors.forEach(c => {
        const assignedTasks = (proj.calendarEvents || []).filter(
          e => e.assignedTo?.toLowerCase().includes(c.name.toLowerCase()) ||
               c.name.toLowerCase().includes(e.assignedTo?.toLowerCase() || '')
        ).length;

        list.push({
          projectId: proj.id,
          projectName: proj.name,
          contractor: c,
          assignedTasksCount: assignedTasks
        });
      });
    });

    return list;
  }, [projects]);

  // Filtered
  const filteredContractors = useMemo(() => {
    return contractorsList.filter(item => {
      if (activeProjectFilter !== 'all' && item.projectId !== activeProjectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.contractor.name.toLowerCase().includes(q);
        const matchRole = item.contractor.role.toLowerCase().includes(q);
        const matchProj = item.projectName.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchProj) return false;
      }
      return true;
    });
  }, [contractorsList, activeProjectFilter, searchQuery]);

  const handleCreateContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTargetProjectId) return;

    const initials = newName
      .trim()
      .split(' ')
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');

    const newProfile: ContractorProfile = {
      id: `cont_${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim(),
      color: newColor,
      initials: initials || 'TR'
    };

    onAddContractor?.(newTargetProjectId, newProfile);
    setIsAddModalOpen(false);
    setNewName('');
    onShowToast?.(`Trabajador ${newProfile.name} agregado`, 'Check');
  };

  const handleConfirmDelete = () => {
    if (!contractorToDelete) return;
    onDeleteContractor?.(contractorToDelete.projectId, contractorToDelete.contractor.id);
    onShowToast?.(`${contractorToDelete.contractor.name} eliminado del equipo`, 'Trash2');
    setContractorToDelete(null);
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Equipo Técnico & Cuadrillas de Obra
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Gestión completa de trabajadores, roles, fotografías y asignaciones
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl">
            {filteredContractors.length} trabajadores registrados
          </span>

          <button
            onClick={() => {
              setNewTargetProjectId(
                activeProjectFilter !== 'all' ? activeProjectFilter : (projects[0]?.id || '')
              );
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Trabajador</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Project Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-black uppercase text-[#94A3B8] px-1 flex items-center gap-1 whitespace-nowrap">
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            Obra:
          </span>
          <button
            onClick={() => setActiveProjectFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeProjectFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#17263B] text-[#94A3B8] hover:text-white'
            }`}
          >
            Todas las Obras
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProjectFilter(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeProjectFilter === p.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                  : 'bg-[#17263B] text-[#94A3B8] hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o rol..."
            className="w-full bg-[#081321] border border-[#29384C] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredContractors.map((item, idx) => {
          const c = item.contractor;

          return (
            <div
              key={`${item.projectId}_${c.id}_${idx}`}
              className="bg-[#101D30] border border-[#29384C] hover:border-slate-500 rounded-3xl p-5 shadow-xl transition-all relative flex flex-col justify-between space-y-4 group"
            >
              {/* Project Badge and Delete Button */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#081321] text-cyan-300 border border-[#29384C]">
                  {item.projectName}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.assignedTasksCount} tareas
                  </span>
                  <button
                    onClick={() => setContractorToDelete({
                      projectId: item.projectId,
                      contractor: c,
                      projectName: item.projectName
                    })}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                    title="Eliminar trabajador del equipo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Avatar with Camera Button Overlay */}
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="relative group/avatar">
                  <ContractorAvatar
                    avatarUrl={c.avatarUrl}
                    name={c.name}
                    color={c.color || '#00f2fe'}
                    sizeClassName="w-20 h-20"
                    ringClassName="ring-4 ring-[#17263B] shadow-lg"
                  />

                  {/* Camera icon button to edit avatar */}
                  <button
                    onClick={() => setEditingContractor({
                      projectId: item.projectId,
                      contractor: c
                    })}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center border-2 border-[#101D30] shadow-md transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    title="Editar fotografía del trabajador"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-black text-white leading-snug">
                    {c.name}
                  </h3>
                  <p className="text-xs text-blue-400 font-semibold mt-0.5">
                    {c.role}
                  </p>
                </div>
              </div>

              {/* Action Strip */}
              <div className="pt-2 border-t border-[#29384C]/60 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Activo</span>
                </span>
                <button
                  onClick={() => setEditingContractor({
                    projectId: item.projectId,
                    contractor: c
                  })}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cambiar Foto</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Agregar Trabajador */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#29384C] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-white">Agregar Nuevo Trabajador</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContractor} className="space-y-4">
              {/* Project selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Obra Asignada
                </label>
                <select
                  value={newTargetProjectId}
                  onChange={(e) => setNewTargetProjectId(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mario González"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Especialidad / Rol en Obra
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  list="roles-list"
                  placeholder="Escribe o selecciona..."
                  className="w-full bg-[#081321] border border-[#29384C] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <datalist id="roles-list">
                  {ROLE_PRESETS.map((r, i) => (
                    <option key={i} value={r} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1 mt-2">
                  {ROLE_PRESETS.slice(0, 4).map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewRole(r)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#17263B] text-slate-300 hover:text-white hover:bg-blue-600/30 cursor-pointer"
                    >
                      {r.split('/')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Color Identificador
                </label>
                <div className="flex items-center gap-2">
                  {COLOR_PRESETS.map((color, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newColor === color ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-[#17263B] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer"
                >
                  Guardar Trabajador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Eliminar Trabajador */}
      {contractorToDelete && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#101D30] border border-rose-500/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">¿Eliminar Trabajador?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Se quitará a <strong className="text-white">{contractorToDelete.contractor.name}</strong> ({contractorToDelete.contractor.role}) de la obra <strong className="text-cyan-300">{contractorToDelete.projectName}</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContractorToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-[#17263B] hover:bg-[#20324c] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contractor Photo Modal */}
      {editingContractor && (
        <ContractorPhotoModal
          isOpen={!!editingContractor}
          contractor={editingContractor.contractor}
          onClose={() => setEditingContractor(null)}
          onSavePhoto={(contractorId, avatarUrl) => {
            onSaveContractorPhoto(editingContractor.projectId, contractorId, avatarUrl);
            setEditingContractor(null);
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
}
