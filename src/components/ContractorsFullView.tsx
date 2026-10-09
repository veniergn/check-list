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
  Plus
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
  onShowToast?: (msg: string, icon?: string) => void;
}

export function ContractorsFullView({
  projects,
  neonColor = '#00f2fe',
  selectedProjectId,
  onSaveContractorPhoto,
  onShowToast
}: ContractorsFullViewProps) {
  const [activeProjectFilter, setActiveProjectFilter] = useState<string>(selectedProjectId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContractor, setEditingContractor] = useState<{
    projectId: string;
    contractor: ContractorProfile;
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
              Perfiles profesionales y actualización directa de fotografías de trabajadores
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full">
            {filteredContractors.length} trabajadores registrados
          </span>
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
              {/* Project Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#081321] text-cyan-300 border border-[#29384C]">
                  {item.projectName}
                </span>

                <span className="text-[10px] font-mono text-slate-400">
                  {item.assignedTasksCount} tareas
                </span>
              </div>

              {/* Avatar with Camera Button Overlay (Section 8) */}
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
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center border-2 border-[#101D30] shadow-md transition-transform hover:scale-110 active:scale-95"
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

              {/* Read-only Data Strip */}
              <div className="pt-2 border-t border-[#29384C]/60 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Perfil Activo</span>
                </span>
                <button
                  onClick={() => setEditingContractor({
                    projectId: item.projectId,
                    contractor: c
                  })}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cambiar Foto</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

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
