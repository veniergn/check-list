import React from 'react';
import { CalendarDays } from 'lucide-react';
import { Project, ProjectCalendarEvent } from '../types';
import { ExecutiveGlobalCalendar } from './ExecutiveGlobalCalendar';

interface CalendarFullViewProps {
  projects: Project[];
  neonColor?: string;
  onSelectProject?: (projectId: string) => void;
  onSaveCalendarEvent?: (projectId: string, event: ProjectCalendarEvent) => void;
  onDeleteCalendarEvent?: (projectId: string, eventId: string) => void;
  onToggleCalendarEvent?: (projectId: string, eventId: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

export function CalendarFullView({
  projects,
  neonColor = '#00f2fe',
  onSelectProject,
  onSaveCalendarEvent,
  onDeleteCalendarEvent,
  onToggleCalendarEvent,
  onShowToast
}: CalendarFullViewProps) {
  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      <ExecutiveGlobalCalendar
        projects={projects}
        neonColor={neonColor}
        onSelectProject={onSelectProject}
        onSaveCalendarEvent={onSaveCalendarEvent}
        onDeleteCalendarEvent={onDeleteCalendarEvent}
        onToggleCalendarEvent={onToggleCalendarEvent}
        onShowToast={onShowToast}
      />
    </div>
  );
}
