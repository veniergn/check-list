import React, { useState } from 'react';
import { GanttChartSquare, Building2 } from 'lucide-react';
import { Project, ProjectCalendarEvent, Milestone } from '../types';
import { ProjectGanttCard } from './ProjectGanttCard';

interface GanttFullViewProps {
  projects: Project[];
  neonColor?: string;
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string) => void;
  onSaveTask?: (projectId: string, task: ProjectCalendarEvent) => void;
  onSaveMilestone?: (projectId: string, milestone: Milestone) => void;
  onOpenMilestonesConfig?: (projectId: string) => void;
}

export function GanttFullView({
  projects,
  neonColor = '#00f2fe',
  selectedProjectId,
  onSelectProject,
  onSaveTask,
  onSaveMilestone,
  onOpenMilestonesConfig
}: GanttFullViewProps) {
  const [activePid, setActivePid] = useState<string>(
    selectedProjectId || projects[0]?.id || ''
  );

  const activeProject = projects.find(p => p.id === activePid) || projects[0] || null;

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

        {/* Project Selector Tabs */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {projects.map(p => {
              const isSelected = p.id === activeProject?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActivePid(p.id);
                    onSelectProject?.(p.id);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
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

      {/* Main Gantt View */}
      {activeProject ? (
        <div className="overflow-x-auto">
          <ProjectGanttCard
            project={activeProject}
            neonColor={neonColor}
            onSaveTask={onSaveTask}
            onSaveMilestone={onSaveMilestone}
            onOpenMilestonesConfig={onOpenMilestonesConfig}
            large={true}
          />
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-[#101D30] rounded-3xl border border-[#29384C]">
          No hay obras seleccionadas para el cronograma Gantt.
        </div>
      )}
    </div>
  );
}
