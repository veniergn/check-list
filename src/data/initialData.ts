import { Project, TradeTemplate, Trade } from '../types';

export const MASTER_TRADES_TEMPLATE: TradeTemplate[] = [
  {
    id: 'albanileria',
    name: 'Albañilería',
    shortName: 'Albañilería',
    icon: 'BrickWall',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    items: [
      'Revoque fino/grueso',
      'Muros y tabiques',
      'Recuadro de aberturas',
      'Pintura base y terminación'
    ]
  },
  {
    id: 'plomeria',
    name: 'Plomería',
    shortName: 'Plomería',
    icon: 'Pipette',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    items: [
      'Cañerías de distribución de agua',
      'Instalación de calefacción',
      'Montaje de sanitarios',
      'Griferías y accesorios de baño'
    ]
  },
  {
    id: 'electricidad',
    name: 'Electricidad',
    shortName: 'Electricidad',
    icon: 'Zap',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    items: [
      'Canalizaciones y corrugados',
      'Cableado de circuitos y tomas',
      'Tablero seccional y térmicas',
      'Colocación de artefactos de iluminación'
    ]
  },
  {
    id: 'carpinteria_madera',
    name: 'Carpintería de Madera',
    shortName: 'Carp. Madera',
    icon: 'DoorOpen',
    color: 'text-amber-900 bg-amber-50 border-amber-300',
    items: [
      'Puerta de ingreso',
      'Puertas interiores',
      'Muebles bajo mesada y alacenas',
      'Frentes e interiores de placares'
    ]
  },
  {
    id: 'carpinteria_aluminio',
    name: 'Carpintería de Aluminio',
    shortName: 'Carp. Aluminio',
    icon: 'Maximize2',
    color: 'text-slate-600 bg-slate-50 border-slate-300',
    items: [
      'Ventanas principales',
      'Puerta-ventana a balcón',
      'Ventana de ventilación de baño',
      'Mamparas'
    ]
  }
];

export const DEFAULT_LOGO_URL = '/icon.png?v=5';

export const SAMPLE_PHOTO_REVOQUE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260"><rect width="400" height="260" fill="%23d6d3d1"/><rect x="20" y="20" width="360" height="220" fill="%23a8a29e" stroke="%2378716c" stroke-width="4"/><line x1="20" y1="85" x2="380" y2="85" stroke="%2357534e" stroke-width="3"/><line x1="20" y1="150" x2="380" y2="150" stroke="%2357534e" stroke-width="3"/><rect x="50" y="35" width="80" height="35" fill="%23e7e5e4"/><text x="200" y="130" font-family="sans-serif" font-size="16" font-weight="bold" fill="%231c1917" text-anchor="middle">REVOQUE GRUESO APROBADO</text><text x="200" y="160" font-family="sans-serif" font-size="11" fill="%23292524" text-anchor="middle">Sector Muro Este - Depto 1-1</text></svg>';

export const SAMPLE_PHOTO_PLOMERIA = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" width="400" height="260"><rect width="400" height="260" fill="%231e293b"/><path d="M50 220 L50 90 L180 90 L180 50 L230 50 L230 90 L350 90 L350 220" fill="none" stroke="%2338bdf8" stroke-width="14" stroke-linecap="round"/><circle cx="205" cy="70" r="14" fill="%23c59b27"/><text x="200" y="170" font-family="sans-serif" font-size="15" font-weight="bold" fill="%23ffffff" text-anchor="middle">PRUEBA DE PRESIÓN 3.5 BAR</text><text x="200" y="195" font-family="sans-serif" font-size="11" fill="%2394a3b8" text-anchor="middle">Circuito Distribución Agua - Depto 1-1</text></svg>';

export function createInitialTrades(): Trade[] {
  return MASTER_TRADES_TEMPLATE.map(trade => ({
    id: trade.id,
    name: trade.name,
    shortName: trade.shortName,
    icon: trade.icon,
    color: trade.color,
    items: trade.items.map((itemText, idx) => ({
      id: `${trade.id}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      name: itemText,
      completed: false,
      photos: []
    }))
  }));
}

export function getInitialMockData(): Project[] {
  const p1Trades1 = createInitialTrades();
  // Set some completed items, comments and sample photos
  p1Trades1[0].items[0].completed = true; // Revoque
  p1Trades1[0].items[0].comment = 'Revoque grueso aplomado correctamente. Listo para aplicación de revoque fino.';
  p1Trades1[0].items[0].photos = [{
    id: 'ph_demo_1',
    dataUrl: SAMPLE_PHOTO_REVOQUE,
    timestamp: '14/03/2025, 10:30 hs'
  }];
  p1Trades1[0].items[1].completed = true; // Muros
  p1Trades1[1].items[0].completed = true; // Cañerías
  p1Trades1[1].items[0].comment = 'Prueba hidráulica efectuada a 3.5 bar durante 4 horas. Sin filtraciones.';
  p1Trades1[1].items[0].photos = [{
    id: 'ph_demo_2',
    dataUrl: SAMPLE_PHOTO_PLOMERIA,
    timestamp: '14/03/2025, 11:15 hs'
  }];
  p1Trades1[2].items[0].completed = true; // Electricidad canalizaciones

  const p1Trades2 = createInitialTrades();
  p1Trades2[0].items[0].completed = true;

  return [
    {
      id: 'proj_parque_los_andes',
      name: 'Parque Los Andes',
      location: 'Calle Agustín Alvarez 315',
      createdAt: '2025-01-10',
      startDate: '2026-08-01',
      estimatedEndDate: '2026-12-15',
      director: 'Msc. Arq. Agustín Arrieta',
      computoSubtitle: 'Cómputo, Certificaciones y Rubros',
      technicalNotes: 'Toda la información del Expediente',
      milestones: [
        {
          id: 'ms_1',
          name: 'Instalación Sanitaria / Distribución de Agua',
          targetDate: '2026-09-10',
          linkType: 'item',
          linkedTradeId: 'plomeria',
          linkedItemName: 'Cañerías de distribución de agua',
          minPercentageRequired: 100,
          notes: 'Prueba de presión y habilitación de montantes'
        },
        {
          id: 'ms_2',
          name: 'Muros y Tabiques Interiores',
          targetDate: '2026-09-22',
          linkType: 'item',
          linkedTradeId: 'albanileria',
          linkedItemName: 'Muros y tabiques',
          minPercentageRequired: 70,
          notes: 'Cierre de tabiquería para pase de instalaciones'
        },
        {
          id: 'ms_3',
          name: 'Canalizaciones y Cajas Eléctricas',
          targetDate: '2026-10-10',
          linkType: 'item',
          linkedTradeId: 'electricidad',
          linkedItemName: 'Canalizaciones y corrugados',
          minPercentageRequired: 80,
          notes: 'Tendido de corrugados previo al revoque fino'
        },
        {
          id: 'ms_4',
          name: 'Carpintería de Madera e Ingresos',
          targetDate: '2026-11-05',
          linkType: 'trade',
          linkedTradeId: 'carpinteria_madera',
          minPercentageRequired: 100,
          notes: 'Instalación de marcos y hojas principales'
        }
      ],
      calendarEvents: [
        {
          id: 'cal_pla_1',
          projectId: 'proj_parque_los_andes',
          title: 'Hormigonado de losa sobre 2do nivel',
          description: 'Colada de hormigón elaborado H-25 con bomba pluma. Verificar encofrados y armaduras previamente.',
          date: '2026-09-24',
          time: '09:30',
          type: 'task',
          priority: 'urgent',
          completed: false
        },
        {
          id: 'cal_pla_2',
          projectId: 'proj_parque_los_andes',
          title: 'Alarma: Acopio cañerías termofusión',
          description: 'Llegada de camión con cañerías y accesorios de plomería para montantes principales.',
          date: '2026-09-26',
          time: '14:00',
          type: 'alarm',
          priority: 'high',
          completed: false
        },
        {
          id: 'cal_pla_3',
          projectId: 'proj_parque_los_andes',
          title: 'Reunión de avance con Dirección de Obra',
          description: 'Revisión técnica de cómputo y verificación de certificaciones con Msc. Arq. Agustín Arrieta.',
          date: '2026-09-29',
          time: '15:30',
          type: 'event',
          priority: 'medium',
          completed: false
        }
      ],
      units: [
        { id: 'unit_101', name: 'Depto 1-1', type: 'unit', trades: p1Trades1 },
        { id: 'unit_102', name: 'Depto 1-2', type: 'unit', trades: p1Trades2 },
        { id: 'unit_201', name: 'Depto 2-1', type: 'unit', trades: createInitialTrades() },
        { id: 'unit_202', name: 'Depto 2-2', type: 'unit', trades: createInitialTrades() },
        { id: 'unit_quincho', name: 'Sector Quincho / SUM', type: 'common_area', category: 'Espacio Común', trades: createInitialTrades() },
        { id: 'unit_set', name: 'Sala Estación Transformadora (SET)', type: 'common_area', category: 'Espacio Técnico', trades: createInitialTrades() }
      ]
    },
    {
      id: 'proj_parque_agustin',
      name: 'Parque Agustín',
      location: 'Calle Agustín Alvarez 315',
      createdAt: '2025-02-01',
      startDate: '2026-08-15',
      estimatedEndDate: '2026-11-20',
      director: 'Msc. Arq. Agustín Arrieta',
      computoSubtitle: 'Cómputo, Certificaciones y Rubros',
      technicalNotes: 'Toda la información del Expediente',
      milestones: [
        {
          id: 'ms_p1',
          name: 'Revoques y Alisados',
          targetDate: '2026-09-12',
          linkType: 'item',
          linkedTradeId: 'albanileria',
          linkedItemName: 'Revoque fino/grueso',
          minPercentageRequired: 100,
          notes: 'Revoques interiores'
        },
        {
          id: 'ms_p2',
          name: 'Montaje de Sanitarios',
          targetDate: '2026-10-05',
          linkType: 'item',
          linkedTradeId: 'plomeria',
          linkedItemName: 'Montaje de sanitarios',
          minPercentageRequired: 60,
          notes: 'Prueba de desagües cloacales'
        }
      ],
      calendarEvents: [
        {
          id: 'cal_pa_1',
          projectId: 'proj_parque_agustin',
          title: 'Alarma: Inspección de cañerías con AYSAM',
          description: 'Prueba hidráulica reglamentaria y firma de acta para habilitación de acometida.',
          date: '2026-09-24',
          time: '11:00',
          type: 'alarm',
          priority: 'urgent',
          completed: false
        },
        {
          id: 'cal_pa_2',
          projectId: 'proj_parque_agustin',
          title: 'Colocación de premarcos de aluminio',
          description: 'Instalación de marcos en vanos exteriores de Depto 1-1 y 1-2.',
          date: '2026-09-27',
          time: '08:30',
          type: 'task',
          priority: 'high',
          completed: false
        },
        {
          id: 'cal_pa_3',
          projectId: 'proj_parque_agustin',
          title: 'Inspección estructural municipal',
          description: 'Verificación en terreno del inspector municipal de obras privadas.',
          date: '2026-09-30',
          time: '14:00',
          type: 'event',
          priority: 'medium',
          completed: false
        }
      ],
      units: [
        { id: 'unit_a1', name: 'Depto 1-1', trades: createInitialTrades() },
        { id: 'unit_a2', name: 'Depto 1-2', trades: createInitialTrades() },
        { id: 'unit_b1', name: 'Depto 2-1', trades: createInitialTrades() }
      ]
    }
  ];
}
