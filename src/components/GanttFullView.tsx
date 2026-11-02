import React, { useState } from 'react';
import {
  GanttChartSquare,
  Building2,
  Plus,
  Printer,
  Layers,
  Flag,
  FileSpreadsheet
} from 'lucide-react';
import { Project, ProjectCalendarEvent, Milestone } from '../types';
import { ProjectGanttCard } from './ProjectGanttCard';
import { GanttTaskModal } from './GanttTaskModal';
import { GanttA3PrintModal } from './GanttA3PrintModal';

interface GanttFullViewProps {
  projects: Project[];
  neonColor?: string;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onSaveTask?: (projectId: string, task: ProjectCalendarEvent) => void;
  onDeleteTask?: (projectId: string, taskId: string) => void;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  onOpenMilestonesConfig?: (projectId: string) => void;
  onOpenProjectManager?: (
    projectId: string,
    initialTab?: 'dashboard' | 'tasks' | 'calendar',
    initialDate?: string,
    selectedTaskId?: string
  ) => void;
  onShowToast?: (msg: string, icon?: string) => void;
  directorName?: string;
}

export function GanttFullView({
  projects,
  neonColor = '#00f2fe',
  selectedProjectId,
  onSelectProject,
  onSaveTask,
  onDeleteTask,
  onSaveMilestone,
  onOpenMilestonesConfig,
  onOpenProjectManager,
  onShowToast,
  directorName = 'Arq. Venier Gastón'
}: GanttFullViewProps) {
  const [activePid, setActivePid] = useState<string>(
    selectedProjectId || projects[0]?.id || ''
  );

  // Modal states for task creation / editing
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<ProjectCalendarEvent | null>(null);
  const [taskModalInitialDate, setTaskModalInitialDate] = useState<string | undefined>(undefined);
  const [taskModalInitialContractor, setTaskModalInitialContractor] = useState<string | undefined>(undefined);

  // Modal state for A3 Print / PDF export
  const [isA3PrintModalOpen, setIsA3PrintModalOpen] = useState(false);

  const activeProject = projects.find(p => p.id === activePid) || projects[0] || null;

  const handleOpenCreateTask = (contractorName?: string, dateStr?: string) => {
    setSelectedTaskForEdit(null);
    setTaskModalInitialContractor(contractorName);
    setTaskModalInitialDate(dateStr);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: ProjectCalendarEvent) => {
    setSelectedTaskForEdit(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* Header and Project Tabs */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <GanttChartSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cronograma & Matriz Gantt de Obra
            </h1>
            <p className="text-xs text-[#94A3B8]">
              Línea temporal de ejecución física, hitos contractuales y cuadrillas técnicas
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeProject && (
            <>
              {/* Button: Nueva Tarea */}
              <button
                type="button"
                onClick={() => handleOpenCreateTask()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Nueva Tarea</span>
              </button>

              {/* Button: Imprimir Planilla PDF (A3) */}
              <button
                type="button"
                onClick={() => setIsA3PrintModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#17263B] hover:bg-[#1f324d] text-amber-300 hover:text-white border border-amber-500/30 hover:border-amber-400 font-bold text-xs flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                title="Generar e imprimir planilla apaisada para hojas A3"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Imprimir PDF (A3)</span>
              </button>

              {/* Button: Hitos de Obra */}
              {onOpenMilestonesConfig && (
                <button
                  type="button"
                  onClick={() => onOpenMilestonesConfig(activeProject.id)}
                  className="px-3 py-2 rounded-xl bg-[#17263B] hover:bg-[#1f324d] text-slate-300 hover:text-white border border-[#29384C] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Configurar Hitos de la obra"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Hitos</span>
                </button>
              )}

              {/* Button: Gestión PM */}
              {onOpenProjectManager && (
                <button
                  type="button"
                  onClick={() => onOpenProjectManager(activeProject.id, 'tasks')}
                  className="px-3 py-2 rounded-xl bg-[#17263B] hover:bg-[#1f324d] text-slate-300 hover:text-white border border-[#29384C] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abrir panel integral de tareas y cuadrillas"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Gestión PM</span>
                </button>
              )}
            </>
          )}

          {/* Project Selector Tabs */}
          {projects.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pl-2 border-l border-[#29384C]">
              {projects.map(p => {
                const isSelected = p.id === activeProject?.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePid(p.id);
                      onSelectProject?.(p.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                        : 'bg-[#17263B] text-[#94A3B8] hover:text-white hover:bg-[#1f324d]'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Gantt View with Direct Click-to-Edit & Add Task */}
      {activeProject ? (
        <div className="overflow-x-auto">
          <ProjectGanttCard
            project={activeProject}
            neonColor={neonColor}
            onSaveTask={onSaveTask}
            onSaveMilestone={onSaveMilestone}
            onOpenMilestonesConfig={onOpenMilestonesConfig}
            onOpenProjectManager={onOpenProjectManager}
            onEditTask={handleOpenEditTask}
            onAddTask={handleOpenCreateTask}
            onOpenA3Print={() => setIsA3PrintModalOpen(true)}
            large={true}
          />
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-[#101D30] rounded-3xl border border-[#29384C]">
          No hay obras seleccionadas para el cronograma Gantt.
        </div>
      )}

      {/* Direct Task Editor / Creator Modal */}
      {activeProject && (
        <GanttTaskModal
          isOpen={isTaskModalOpen}
          project={activeProject}
          task={selectedTaskForEdit}
          initialDate={taskModalInitialDate}
          initialContractorName={taskModalInitialContractor}
          neonColor={neonColor}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTaskForEdit(null);
          }}
          onSaveTask={onSaveTask || (() => {})}
          onDeleteTask={onDeleteTask}
          onShowToast={onShowToast}
        />
      )}

      {/* A3 Landscape Print Modal */}
      {activeProject && (
        <GanttA3PrintModal
          isOpen={isA3PrintModalOpen}
          project={activeProject}
          directorName={directorName}
          onClose={() => setIsA3PrintModalOpen(false)}
        />
      )}
    </div>
  );
}
