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

export type CalendarEventType = 'note' | 'task' | 'meeting' | 'alarm' | 'event';
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

export interface ContractorExcelFile {
  fileName: string;
  fileSize?: number;
  uploadedAt: string; // ISO timestamp
  lastModifiedAt?: string; // ISO timestamp
  lastModifiedFormatted?: string; // "20/10/2026, 14:15 hs"
  lastModifiedBy?: string; // "veniergn@gmail.com"
  base64Data?: string; // Raw .xlsx base64 string
  sheetsData?: { [sheetName: string]: (string | number | null)[][] }; // 2D matrix of cells
  activeSheetName?: string;
  notes?: string;
}

export interface ContractorPdfSnapshot {
  id: string;
  title: string;
  period?: string;
  generatedAt: string;
  generatedFormatted: string;
  generatedBy: string; // "veniergn@gmail.com"
  notes?: string;
}

export interface ContractorProfile {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  color: string;
  initials: string;
  phone?: string;
  dniCuit?: string;
  excelFile?: ContractorExcelFile; // Archivo Excel cargado específicamente para este contratista
  pdfHistory?: ContractorPdfSnapshot[]; // Registro histórico de certificados/PDFs emitidos
}

export type ProjectManagerTask = ProjectCalendarEvent;

export interface SavedWorkReport {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string; // ISO timestamp
  formattedDate: string; // e.g. "14/10/2026, 14:50 hs"
  title: string; // e.g. "Informe Mayo 2026 - Parque Agustín"
  template: 'parque_agustin' | 'parque_andes' | string;
  summary?: string;
  data: any; // snapshot completo de agustinData o andesData
}


// ==========================================
// MÓDULO 1: GESTIÓN DE MATERIALES POR OBRA
// ==========================================
export type MaterialOrderStatus = 'pending' | 'in_transit' | 'received_complete' | 'received_incomplete';

export interface MaterialOrderItem {
  id: string;
  name: string;
  quantity: string | number;
  unit?: string; // bolsas, m3, barras, un, kg, rollos, etc.
  notes?: string;
}

export interface MaterialOrderAttachment {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  url: string; // Base64 dataUrl or public URL
  size?: number;
}

export interface MaterialOrder {
  id: string;
  projectId: string; // Aislamiento estricto por obra
  orderNumber?: number; // ej: #001
  title?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: string; // ISO timestamp
  createdAtFormatted: string; // "20/10/2026, 12:45 hs"
  requestedBy?: string; // Capataz, Encargado, Director
  supplier?: string; // Corralón / Proveedor
  items: MaterialOrderItem[];
  rawWhatsAppText?: string; // Texto original si provino de WhatsApp
  attachments?: MaterialOrderAttachment[]; // Imágenes o PDFs adjuntos
  status: MaterialOrderStatus;
  receivedNotes?: string; // Detalle específico de qué faltó si llegó incompleto
  receivedAt?: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string; // "veniergn@gmail.com"
}

// ==========================================
// MÓDULO 2: CERTIFICADOS DE CONTRATISTAS
// ==========================================
export interface ContractorPaymentItem {
  id: string;
  taskDescription: string; // Rubro / Tarea / Concepto certificado
  unit: string; // m2, ml, un, gl, bocas, kg
  contractedQuantity: number; // Cantidad total contratada
  unitPrice: number; // Precio unitario ($)
  previousProgressPercent: number; // % avance anterior
  currentProgressPercent: number; // % avance actual acumulado
}

export interface ContractorCertificate {
  id: string;
  projectId: string; // Aislamiento estricto por obra
  contractorId: string; // ID del contratista
  contractorName: string; // Nombre y apellido
  contractorRole: string; // Trabajo / Especialidad / Rubro
  contractorDniCuit?: string;
  contractorPhone?: string;
  period: string; // ej: "1ra Quincena Octubre 2026"
  startDate?: string;
  endDate?: string;
  items: ContractorPaymentItem[];
  advancePayment?: number; // Adelantos entregados ($)
  retentionPercent?: number; // Fondo de reparo (% ej: 5%)
  notes?: string;
  subtotalPeriod: number; // Suma montos de la quincena
  totalPayable: number; // Monto neto final a pagar
  status: 'draft' | 'approved' | 'paid';
  lastModifiedAt: string; // ISO timestamp
  lastModifiedFormatted: string; // "20/10/2026, 12:45 hs"
  lastModifiedBy: string; // "veniergn@gmail.com"
}

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
  materialOrders?: MaterialOrder[]; // Módulo 1: Gestión de pedidos de materiales por obra
  contractorCertificates?: ContractorCertificate[]; // Módulo 2: Certificados quincenales de contratistas
  savedReports?: SavedWorkReport[]; // Historial de informes anteriores guardados con fecha
  monthlyReportData?: {
    template?: 'parque_agustin' | 'parque_andes' | string;
    agustinData?: any;
    andesData?: any;
    updatedAt?: string;
  };
  logoUrl?: string; // Logo específico del proyecto inmobiliario
  developerLogoUrl?: string; // Logo de la empresa desarrolladora
  developerName?: string; // Nombre comercial de la empresa desarrolladora
  coverImageUrl?: string; // Fotografía principal de portada de la obra
  coverImagePosition?: { x: number; y: number; zoom: number }; // Encuadre / posición
  projectType?: 'building' | 'house'; // 'building' (edificio) o 'house' (casa unifamiliar)
  houseDetails?: {
    bedrooms?: number;
    bathrooms?: number;
    toilettes?: number;
    garageCars?: number;
    levels?: number;
    totalArea?: string;
  };
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
  directorAvatarUrl?: string; // Foto de perfil del profesional a cargo
  directorName?: string;
  directorRole?: string;
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

export type ViewMode = 'dashboard' | 'units' | 'checklist' | 'tasks' | 'calendar' | 'gantt' | 'contractors' | 'settings' | 'materials' | 'certificates';
export type StatusFilter = 'all' | 'completed' | 'in_progress' | 'pending';
export type TaskFilter = 'all' | 'pending' | 'completed';
export type AppTheme = 'theme-original' | 'theme-glass';
