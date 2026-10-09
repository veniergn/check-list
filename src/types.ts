export interface InspectionPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
}

export interface InspectionItem {
  id: string;
  name: string;
  completed: boolean;
  progressPercentage?: number; // 0 to 100
  photos: InspectionPhoto[];
  comment?: string;
  severity?: 'low' | 'medium' | 'high'; // Leve | Medio | Crítico
}

export interface Trade {
  id: string;
  name: string;
  shortName?: string;
  icon: string;
  color: string;
  items: InspectionItem[];
}

export interface BlueprintDocument {
  id: string;
  name: string;
  type: 'pdf' | 'cad' | 'image' | 'link';
  url: string; // Base64 dataURL, blob, or web URL
  size?: number;
  uploadedAt: string;
  category?: 'arquitectura' | 'estructura' | 'sanitaria' | 'electrica' | 'gas' | 'otro';
  cadViewerUrl?: string; // Link to external CAD/BIM viewer like Autodesk Viewer, ShareCAD, etc.
}

export interface FloorConfig {
  floorNumber: number; // 0 for PB, 1 for Piso 1, etc.
  floorLabel: string; // "Planta Baja", "Piso 1", etc.
  unitsCount: number; // Number of units on this floor
}

export interface SketchDocument {
  id: string;
  title: string;
  dataUrl: string; // PNG Data URL of the croquis with technical header
  createdAt: string;
  unitId?: string;
  unitName?: string;
  projectId?: string;
  projectName?: string;
  notes?: string;
  tradeId?: string;
  tradeName?: string;
  itemId?: string;
  itemName?: string;
}

export interface Unit {
  id: string;
  name: string;
  trades: Trade[];
  type?: 'unit' | 'common_area';
  category?: string;
  floorNumber?: number;
  floorLabel?: string;
  blueprints?: BlueprintDocument[];
  signature?: string; // Base64 dataURL of digital signature
  signedBy?: string; // Signatory full name
  signRole?: string; // Signatory role/cargo
  signDni?: string; // ID / License
  signedAt?: string; // Timestamp
  isLocked?: boolean; // Frozen/locked state
  sketches?: SketchDocument[]; // Registered hand-drawn croquis
}

export interface Milestone {
  id: string;
  name: string;
  startDate?: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD (fecha límite o fin estimada)
  endDate?: string; // alias para compatibilidad
  buildingPart?: string; // e.g. 'Subsuelo', 'Planta Baja', 'Piso 1', 'Fachada', 'Estructura Global', etc.
  tradeCategory?: string; // e.g. 'Albañilería', 'Estructura', o nuevo rubro personalizado
  progressPercentage?: number; // 0 a 100: avance físico directo
  progress?: number; // alias para compatibilidad
  completed?: boolean; // estado completado
  linkType?: 'item' | 'trade' | 'direct';
  linkedTradeId?: string;
  linkedItemName?: string; // specific item title, or blank for all trade
  minPercentageRequired?: number; // default 100
  manualCompleted?: boolean;
  notes?: string;
  comments?: string; // comentarios u observaciones del hito
  photos?: string[]; // fotos y evidencias fotográficas del hito (base64 o URLs)
}

export interface ProjectCustomService {
  id: string;
  name: string;
  number: string;
}

export type CalendarEventType = 'task' | 'alarm' | 'event';
export type PMTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed';

export interface PMSubtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
}

export interface ProjectManagerAlarms {
  isOverdueStart: boolean; // Tarea que debía haber iniciado y sigue pendiente
  isUpcomingDeadline: boolean; // Cierre próximo (vence en 72 hs o menos)
  isCriticalDelay: boolean; // Superó la fecha límite y sigue incompleta
  daysOverdue: number; // Días de retraso (si vencida)
  daysUntilDeadline: number; // Días restantes hasta el cierre
}

export interface ProjectCalendarEvent {
  id: string;
  projectId: string; // Garantiza vinculación exclusiva a cada obra
  title: string;
  description?: string;
  date: string; // Formato YYYY-MM-DD (fecha límite o fecha de evento)
  startDate?: string; // Formato YYYY-MM-DD (fecha de inicio programada)
  time?: string; // Formato HH:mm
  type: CalendarEventType; // 'task' (Tarea técnica) | 'alarm' (Alarma / Vencimiento) | 'event' (Evento / Reunión)
  priority?: 'low' | 'medium' | 'high' | 'urgent'; // Baja, Media, Alta, Urgente
  status?: PMTaskStatus; // 'pending' | 'in_progress' | 'blocked' | 'completed'
  completed?: boolean;
  progress?: number; // Porcentaje de avance de la tarea (0 a 100)
  assignedTo?: string; // Responsable o encargado de la tarea
  assignedRole?: string; // Rol o especialidad del responsable (ej. "Director de Obra", "Capataz", "Instalador")
  subtasks?: PMSubtask[]; // Subtareas interactivas con checklist
  category?: string; // Rubro o especialidad
  color?: string;
  createdAt?: string;
  updatedAt?: string; // Timestamp ISO para sincronización multi-dispositivo determinista
}

export interface ContractorProfile {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  color: string;
  initials: string;
}

export type ProjectManagerTask = ProjectCalendarEvent;

export interface Project {
  id: string;
  name: string;
  location: string;
  createdAt: string;
  startDate?: string;
  estimatedEndDate?: string;
  expedienteMunicipal?: string;
  expedienteEdemsa?: string;
  expedienteAysam?: string;
  technicalNotes?: string;
  director?: string; // Msc. Arq. o Director de Obra
  computoSubtitle?: string; // Especialidad o Cómputo y Certificaciones
  floorsConfig?: FloorConfig[];
  customServices?: ProjectCustomService[];
  milestones?: Milestone[];
  calendarEvents?: ProjectCalendarEvent[]; // Tareas, eventos y alarmas independientes por obra
  contractors?: ContractorProfile[]; // Cuadrillas y responsables técnicos personalizados con fotos
  logoUrl?: string; // Logo específico del proyecto inmobiliario
  developerLogoUrl?: string; // Logo de la empresa desarrolladora
  developerName?: string; // Nombre comercial de la empresa desarrolladora
  coverImageUrl?: string; // Fotografía principal de portada de la obra
  coverImagePosition?: { x: number; y: number; zoom: number }; // Encuadre / posición
  units: Unit[];
}

export interface TradeTemplate {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  items: string[];
}

export interface CustomLogos {
  header: string;
  banner: string;
  appBackground?: string;
  presentationBackground?: string;
  sidebarLogo?: string;
  sidebarLogoSize?: number;
  sidebarLogoAlign?: 'left' | 'center';
  sidebarShowText?: boolean;
  appName?: string;
}

export interface LocalColors {
  appBackground: string;
  presentationBackground: string;
  neonColor?: string;
  secondaryColor?: string;
  cardBackground?: string;
  sidebarBackground?: string;
  headerTextColor?: string;
  bodyTextColor?: string;
  progressColor?: string;
  appBackgroundImage?: string;
  fontFamily?: string;
  fontSize?: 'compact' | 'standard' | 'large';
  visualDensity?: 'compact' | 'standard' | 'relaxed';
  isBoldText?: boolean;
}

export type ViewMode = 'dashboard' | 'units' | 'checklist' | 'tasks' | 'calendar' | 'gantt' | 'contractors' | 'settings';
export type StatusFilter = 'all' | 'completed' | 'in_progress' | 'pending';
export type TaskFilter = 'all' | 'pending' | 'completed';
export type AppTheme = 'theme-original' | 'theme-glass';
