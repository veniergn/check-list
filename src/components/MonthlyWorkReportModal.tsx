import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  RotateCcw,
  Upload,
  Sparkles,
  FileCheck,
  Plus,
  Trash2,
  BarChart2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Users
} from 'lucide-react';
import { Project } from '../types';

interface MonthlyWorkReportModalProps {
  isOpen: boolean;
  project: Project | null;
  headerLogoUrl?: string;
  onClose: () => void;
  onUpdateProject?: (updatedProject: Project) => void;
}

type TemplateType = 'parque_agustin' | 'parque_andes';

// -------------------------------------------------------------
// COMPONENTE: AutoExpandingTextarea (Pantalla expande, Imprime nativo)
// -------------------------------------------------------------
interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChangeText?: (val: string) => void;
  printClassName?: string;
}

// Helper tipográfico adaptativo: si el texto pegado es extenso, calibra proporcionalmente
// para que el espacio se acomode de forma natural y visualmente elegante
function getResumenTypography(text: string) {
  const len = text ? text.length : 0;
  if (len > 1300) {
    return {
      screenClass: 'text-[8px] leading-[1.26] text-slate-200',
      printClass: 'text-[7.5px] leading-[1.2] text-slate-200',
    };
  }
  if (len > 900) {
    return {
      screenClass: 'text-[8.7px] leading-[1.32] text-slate-200',
      printClass: 'text-[8px] leading-[1.25] text-slate-200',
    };
  }
  if (len > 500) {
    return {
      screenClass: 'text-[9.2px] leading-[1.36] text-slate-200',
      printClass: 'text-[8.5px] leading-[1.28] text-slate-200',
    };
  }
  return {
    screenClass: 'text-[10px] leading-[1.4] text-slate-200',
    printClass: 'text-[9px] leading-[1.32] text-slate-200',
  };
}

function AutoExpandingTextarea({
  value,
  onChangeText,
  onChange,
  className = '',
  printClassName = '',
  rows = 1,
  ...props
}: AutoExpandingTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 24)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    const handleResize = () => adjustHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChangeText) {
      onChangeText(e.target.value);
    } else if (onChange) {
      onChange(e);
    }
    requestAnimationFrame(adjustHeight);
  };

  return (
    <>
      {/* Modo Pantalla: Textarea autoexpandible, sin scrollbar */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onInput={adjustHeight}
        rows={rows}
        className={`${className} overflow-hidden resize-none print:hidden`}
        {...props}
      />
      {/* Modo Impresión / PDF: Bloque semántico tipográfico nativo sin formularios ni cortes */}
      <div className={`hidden print:block whitespace-pre-wrap ${printClassName || className}`}>
        {value}
      </div>
    </>
  );
}

// -------------------------------------------------------------
// COMPONENTE: AgustinSummaryBar (Zócalo editable EN RESUMEN + Indicadores)
// -------------------------------------------------------------
interface AgustinSummaryBarProps {
  data: AgustinData;
  onChange: (patch: Partial<AgustinData>) => void;
}

function AgustinSummaryBar({ data, onChange }: AgustinSummaryBarProps) {
  return (
    <div className="w-full bg-[#f4f7f9] border border-slate-200/90 rounded-2xl px-3 py-2 flex items-center justify-between shadow-xs">
      {/* 1. Título EN RESUMEN con Ícono BarChart */}
      <div className="flex flex-col items-center justify-center shrink-0 pr-3 border-r border-slate-200/90">
        <div className="w-8 h-8 rounded-full bg-[#0091cb] text-white flex items-center justify-center shadow-xs mb-1">
          <BarChart2 className="w-4 h-4 stroke-[2.5]" />
        </div>
        <input
          type="text"
          value={data.summaryTitle || 'EN RESUMEN'}
          onChange={(e) => onChange({ summaryTitle: e.target.value })}
          className="bg-transparent text-center font-black text-[10.5px] text-[#0a222e] tracking-wider uppercase focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-1 w-24 print:border-none print:shadow-none"
          title="Haz clic para editar título"
        />
        <div className="w-7 h-0.5 bg-[#0091cb] rounded-full mt-0.5" />
      </div>

      {/* 2. Stat 1: AVANCE GENERAL / 95% */}
      <div className="flex flex-col items-center justify-center flex-1 px-1.5 border-r border-slate-200/90">
        <div className="w-7 h-7 rounded-full bg-[#dcf0fa] text-[#0091cb] flex items-center justify-center mb-0.5">
          <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <input
          type="text"
          value={data.summaryStat1Label || 'AVANCE GENERAL'}
          onChange={(e) => onChange({ summaryStat1Label: e.target.value })}
          className="bg-transparent text-center font-bold text-[8.5px] text-slate-700 tracking-tight uppercase focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar etiqueta"
        />
        <input
          type="text"
          value={data.summaryStat1Value || '95%'}
          onChange={(e) => onChange({ summaryStat1Value: e.target.value })}
          className="bg-transparent text-center font-black text-[13px] text-[#0091cb] leading-tight focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar porcentaje"
        />
      </div>

      {/* 3. Stat 2: CALIDAD / GARANTIZADA */}
      <div className="flex flex-col items-center justify-center flex-1 px-1.5 border-r border-slate-200/90">
        <div className="w-7 h-7 rounded-full bg-[#dcf0fa] text-[#0091cb] flex items-center justify-center mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <input
          type="text"
          value={data.summaryStat2Label || 'CALIDAD'}
          onChange={(e) => onChange({ summaryStat2Label: e.target.value })}
          className="bg-transparent text-center font-bold text-[8.5px] text-slate-700 tracking-tight uppercase focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar etiqueta"
        />
        <input
          type="text"
          value={data.summaryStat2Value || 'GARANTIZADA'}
          onChange={(e) => onChange({ summaryStat2Value: e.target.value })}
          className="bg-transparent text-center font-extrabold text-[10.5px] text-[#0091cb] leading-tight focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar texto o porcentaje"
        />
      </div>

      {/* 4. Stat 3: EN TIEMPO / SEGÚN PLAN */}
      <div className="flex flex-col items-center justify-center flex-1 px-1.5 border-r border-slate-200/90">
        <div className="w-7 h-7 rounded-full bg-[#dcf0fa] text-[#0091cb] flex items-center justify-center mb-0.5">
          <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <input
          type="text"
          value={data.summaryStat3Label || 'EN TIEMPO'}
          onChange={(e) => onChange({ summaryStat3Label: e.target.value })}
          className="bg-transparent text-center font-bold text-[8.5px] text-slate-700 tracking-tight uppercase focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar etiqueta"
        />
        <input
          type="text"
          value={data.summaryStat3Value || 'SEGÚN PLAN'}
          onChange={(e) => onChange({ summaryStat3Value: e.target.value })}
          className="bg-transparent text-center font-extrabold text-[10.5px] text-[#0091cb] leading-tight focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar texto o porcentaje"
        />
      </div>

      {/* 5. Stat 4: COMPROMISO / CON VOS */}
      <div className="flex flex-col items-center justify-center flex-1 pl-1.5">
        <div className="w-7 h-7 rounded-full bg-[#dcf0fa] text-[#0091cb] flex items-center justify-center mb-0.5">
          <Users className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <input
          type="text"
          value={data.summaryStat4Label || 'COMPROMISO'}
          onChange={(e) => onChange({ summaryStat4Label: e.target.value })}
          className="bg-transparent text-center font-bold text-[8.5px] text-slate-700 tracking-tight uppercase focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar etiqueta"
        />
        <input
          type="text"
          value={data.summaryStat4Value || 'CON VOS'}
          onChange={(e) => onChange({ summaryStat4Value: e.target.value })}
          className="bg-transparent text-center font-extrabold text-[10.5px] text-[#0091cb] leading-tight focus:outline-none focus:bg-white/80 hover:border-slate-300 border border-transparent rounded px-0.5 w-full print:border-none print:shadow-none"
          title="Haz clic para editar texto o porcentaje"
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// DEFAULT DATA FOR PARQUE AGUSTÍN (2 PÁGINAS)
// -------------------------------------------------------------
interface AgustinData {
  year: string;
  tagline: string;
  month: string;
  bubble1Percent: string;
  bubble1Text: string;
  bubble2Percent: string;
  bubble2Text: string;
  bubble3Percent: string;
  bubble3Text: string;
  p1Facade1Photo: string;
  p1Facade2Photo: string;
  p1Item1Num: string;
  p1Item1Title: string;
  p1Item1Photo: string;
  p1Item2Num: string;
  p1Item2Title: string;
  p1Item2Photo: string;
  p1Item3Num: string;
  p1Item3Title: string;
  p1Item3Photo: string;

  // Page 2
  p2ResumenText: string;
  p2Photo1: string;
  p2Photo2: string;
  p2Photo3: string;
  p2Item4Num: string;
  p2Item4Title: string;
  p2Item4Photo: string;
  p2Item5Num: string;
  p2Item5Title: string;
  p2Item5Photo: string;
  p2Item6Num: string;
  p2Item6Title: string;
  p2Item6Photo: string;
  p2Item7Num: string;
  p2Item7Title: string;
  p2Item7Photo: string;

  // Zócalo Editable "EN RESUMEN" y Porcentajes
  summaryTitle: string;
  summaryStat1Label: string;
  summaryStat1Value: string;
  summaryStat2Label: string;
  summaryStat2Value: string;
  summaryStat3Label: string;
  summaryStat3Value: string;
  summaryStat4Label: string;
  summaryStat4Value: string;
}

const DEFAULT_AGUSTIN_DATA: AgustinData = {
  year: '2026',
  tagline: 'VA TOMANDO COLOR!!',
  month: 'MAYO',
  bubble1Percent: '98 %',
  bubble1Text: 'YESO HASTA EL 7 PISOS',
  bubble2Percent: '80 %',
  bubble2Text: 'INSTALACIONES COMPLETAS',
  bubble3Percent: '25 %',
  bubble3Text: 'ABERTURAS DE ALUMINIO DVH',
  p1Facade1Photo: '/report_assets/defaults/agustin_p1_facade_1.png',
  p1Facade2Photo: '/report_assets/defaults/agustin_p1_facade_2.png',
  p1Item1Num: '01',
  p1Item1Title: 'Mueble de cocinas 1° piso',
  p1Item1Photo: '/report_assets/defaults/agustin_p1_item_01.png',
  p1Item2Num: '02',
  p1Item2Title: 'Carpinteria vamos por el 2° piso',
  p1Item2Photo: '/report_assets/defaults/agustin_p1_item_02.png',
  p1Item3Num: '03',
  p1Item3Title: 'Porcelanato en Quincho + piscina',
  p1Item3Photo: '/report_assets/defaults/agustin_p1_item_03.png',

  // Page 2
  p2ResumenText: `La obra continúa avanzando de manera sostenida y conforme a la planificación establecida. Los trabajos de yesería se encuentran completados hasta el 7° piso, mientras que los revestimientos de baños y cocinas presentan un avance aproximado del 80 % en dicho nivel.

Se continúa con la colocación de porcelanato en balcones y la instalación de barandas metálicas, alcanzando actualmente un avance del 65 %, con tareas en ejecución.

En cuanto a las carpinterías exteriores, se inició la colocación de aberturas de aluminio con doble vidriado hermético (DVH), encontrándose completada la instalación hasta el 2° piso. A partir del 13 de julio se prevé continuar con los niveles superiores, avanzando progresivamente hasta la finalización total del edificio.

Asimismo, se dio inicio a la fabricación de mobiliario fijo, incluyendo muebles de cocina y frentes de placard, encontrándose actualmente en proceso de equipamiento una unidad del primer piso.

Respecto de las terminaciones exteriores, se completó el texturado de las fachadas laterales y actualmente se trabaja sobre la fachada principal, para posteriormente continuar con la fachada posterior.

En el sector quincho y piscina se están ejecutando los revestimientos, y durante las próximas semanas se iniciarán los trabajos de yesería en dicho sector.

Por otra parte, comenzaron las tareas de ejecución de carpetas en los estacionamientos, lo que implica la finalización de la totalidad de las instalaciones y trabajos subterráneos.

La obra mantiene un ritmo de avance firme y sostenido, ingresando progresivamente en las etapas finales de terminaciones y equipamiento.`,
  p2Photo1: '/report_assets/defaults/agustin_p2_photo_1.png',
  p2Photo2: '/report_assets/defaults/agustin_p2_photo_2.png',
  p2Photo3: '/report_assets/defaults/agustin_p2_photo_3.png',
  p2Item4Num: '04',
  p2Item4Title: 'Contrapisos en cocheras',
  p2Item4Photo: '/report_assets/defaults/agustin_p2_item_04.png',
  p2Item5Num: '05',
  p2Item5Title: 'Puertas principal 1° piso',
  p2Item5Photo: '/report_assets/defaults/agustin_p2_item_05.png',
  p2Item6Num: '06',
  p2Item6Title: 'Puertas internas 1° piso',
  p2Item6Photo: '/report_assets/defaults/agustin_p2_item_06.png',
  p2Item7Num: '06',
  p2Item7Title: 'Revestimiento de baños y cocinas hasta el 7° piso',
  p2Item7Photo: '/report_assets/defaults/agustin_p2_item_07.png',

  // Zócalo Editable "EN RESUMEN" y Porcentajes
  summaryTitle: 'EN RESUMEN',
  summaryStat1Label: 'AVANCE GENERAL',
  summaryStat1Value: '95%',
  summaryStat2Label: 'CALIDAD',
  summaryStat2Value: 'GARANTIZADA',
  summaryStat3Label: 'EN TIEMPO',
  summaryStat3Value: 'SEGÚN PLAN',
  summaryStat4Label: 'COMPROMISO',
  summaryStat4Value: 'CON VOS'
};

// -------------------------------------------------------------
// DEFAULT DATA FOR PARQUE DE LOS ANDES (GALERÍA DINÁMICA A4)
// -------------------------------------------------------------
export interface AndesGalleryItem {
  id: string;
  photo: string;
  title1: string;
  title2?: string;
}

interface AndesData {
  p1TopLeftTitle: string;
  p1TopRightDate: string;
  p1Subtitle: string;
  p1Photo1: string;
  p1Photo2: string;
  p1Stage1Pct: string;
  p1Stage1Label: string;
  p1Stage2Pct: string;
  p1Stage2Label: string;
  p1Stage3Pct: string;
  p1Stage3Label: string;
  p1Stage4Pct: string;
  p1Stage4Label: string;

  // Galería Dinámica (Páginas de Fachadas)
  p2TabTitle: string;
  p2Subtitle: string;
  galleryItems: AndesGalleryItem[];

  // Página de Informe Técnico
  p3TabTitle: string;
  p3DocTitle: string;
  p3Paragraph1: string;
  p3Paragraph2: string;
  p3Paragraph3: string;
  p3Paragraph4: string;
  p3Subheading: string;
  p3NextTasksIntro: string;
  p3NextTasksList: string;
  p3Conclusion: string;
}

const DEFAULT_ANDES_GALLERY: AndesGalleryItem[] = [
  {
    id: '1',
    photo: '/report_assets/defaults/andes_p2_photo_1.png',
    title1: 'Revoque fachadas internas',
    title2: 'Instalacion sanitaria'
  },
  {
    id: '2',
    photo: '/report_assets/defaults/andes_p2_photo_2.png',
    title1: 'Recuadros barandas balcón',
    title2: 'Instalacion sanitaria'
  },
  {
    id: '3',
    photo: '/report_assets/defaults/andes_p2_photo_3.png',
    title1: 'Instalacion sanitaria',
    title2: ''
  },
  {
    id: '4',
    photo: '/report_assets/defaults/andes_p2_photo_4.png',
    title1: 'Cubierta 4° piso',
    title2: ''
  }
];

const DEFAULT_ANDES_DATA: AndesData = {
  p1TopLeftTitle: '2026 RECUADROS EXTERIORES',
  p1TopRightDate: 'JULIO 2026',
  p1Subtitle: 'GRAN AVANCE EN SUS 4 FACHADAS',
  p1Photo1: '/report_assets/defaults/andes_p1_photo_1.png',
  p1Photo2: '/report_assets/defaults/andes_p1_photo_2.png',
  p1Stage1Pct: '100%',
  p1Stage1Label: 'CUBIERTA 4 PISO',
  p1Stage2Pct: '100%',
  p1Stage2Label: 'TABIQUE 5° TANQUE DE RESERVA',
  p1Stage3Pct: '50%',
  p1Stage3Label: 'PANELES EN DEPTOS',
  p1Stage4Pct: '50%',
  p1Stage4Label: 'INSTALACION SANITARIA Y ELECTRICA',

  // Galería Dinámica
  p2TabTitle: 'FACHADAS',
  p2Subtitle: 'Terminaciones exteriores',
  galleryItems: DEFAULT_ANDES_GALLERY,

  // Página de Informe Técnico
  p3TabTitle: 'INFORME',
  p3DocTitle: 'Informe de Avance de Obra – Parque Los Andes',
  p3Paragraph1: 'Durante el período informado, la obra mantuvo un ritmo sostenido de ejecución, concentrando los esfuerzos en tareas correspondientes a la envolvente exterior y en el avance de las instalaciones de los sectores de servicios.',
  p3Paragraph2: 'Se trabajó intensamente en la ejecución de los revoques exteriores de las cuatro fachadas del edificio, realizando las intervenciones necesarias incluso desde propiedades linderas, en coordinación con los vecinos, lo que permitió dar continuidad a los trabajos de terminación de la envolvente y mejorar significativamente el grado de avance de la imagen exterior del proyecto.',
  p3Paragraph3: 'En forma paralela, se avanzó en los depósitos internos, ejecutando las instalaciones sanitarias y eléctricas, dejando estos espacios preparados para las etapas posteriores de terminación.',
  p3Paragraph4: 'En el sector de cubierta, se completaron los trabajos correspondientes al área de los tanques de cisterna, finalizando las tareas previstas para este frente de obra y consolidando un importante hito dentro de la infraestructura general del edificio.',
  p3Subheading: 'Trabajos a continuar',
  p3NextTasksIntro: 'Durante el próximo período se prevé continuar con:',
  p3NextTasksList: `• Ejecución y terminación de los revoques exteriores en las distintas fachadas hasta su completa finalización.
• Avance en la materialización de las divisiones interiores de los departamentos correspondientes al 3.º y 4.º piso, permitiendo consolidar la distribución definitiva de las unidades y dar continuidad a las instalaciones y terminaciones posteriores.`,
  p3Conclusion: 'En términos generales, la obra mantiene una evolución acorde a la planificación establecida, consolidando avances significativos tanto en la envolvente del edificio como en la infraestructura de los sectores técnicos, permitiendo preparar los próximos frentes de trabajo para las etapas de mampostería interior y terminaciones.'
};

export function MonthlyWorkReportModal({
  isOpen,
  project,
  onClose
}: MonthlyWorkReportModalProps) {
  // Determine template based on project name
  const detectedTemplate: TemplateType = (() => {
    const name = (project?.name || '').toLowerCase();
    if (name.includes('agustin') || name.includes('alvarez') || name.includes('quinta')) {
      return 'parque_agustin';
    }
    if (name.includes('andes') || name.includes('paso')) {
      return 'parque_andes';
    }
    return 'parque_agustin';
  })();

  const [activeTemplate, setActiveTemplate] = useState<TemplateType>(detectedTemplate);

  // Sync detected template when project changes
  useEffect(() => {
    setActiveTemplate(detectedTemplate);
  }, [detectedTemplate]);

  // Storage keys for persistence per project
  const storageKeyAgustin = project ? `CONTROL_AVANCE_REPORT_AGUSTIN_${project.id}` : 'CONTROL_AVANCE_REPORT_AGUSTIN';
  const storageKeyAndes = project ? `CONTROL_AVANCE_REPORT_ANDES_${project.id}` : 'CONTROL_AVANCE_REPORT_ANDES';

  // State for Parque Agustín
  const [agustinData, setAgustinData] = useState<AgustinData>(() => {
    try {
      const saved = localStorage.getItem(storageKeyAgustin);
      if (saved) return { ...DEFAULT_AGUSTIN_DATA, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_AGUSTIN_DATA;
  });

  // State for Parque de los Andes (con migración para galería dinámica)
  const [andesData, setAndesData] = useState<AndesData>(() => {
    try {
      const saved = localStorage.getItem(storageKeyAndes);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.galleryItems || !Array.isArray(parsed.galleryItems) || parsed.galleryItems.length === 0) {
          parsed.galleryItems = [
            {
              id: '1',
              photo: parsed.p2Photo1 || DEFAULT_ANDES_GALLERY[0].photo,
              title1: parsed.p2Photo1Title1 || DEFAULT_ANDES_GALLERY[0].title1,
              title2: parsed.p2Photo1Title2 || DEFAULT_ANDES_GALLERY[0].title2
            },
            {
              id: '2',
              photo: parsed.p2Photo2 || DEFAULT_ANDES_GALLERY[1].photo,
              title1: parsed.p2Photo2Title1 || DEFAULT_ANDES_GALLERY[1].title1,
              title2: parsed.p2Photo2Title2 || DEFAULT_ANDES_GALLERY[1].title2
            },
            {
              id: '3',
              photo: parsed.p2Photo3 || DEFAULT_ANDES_GALLERY[2].photo,
              title1: parsed.p2Photo3Title || DEFAULT_ANDES_GALLERY[2].title1,
              title2: ''
            },
            {
              id: '4',
              photo: parsed.p2Photo4 || DEFAULT_ANDES_GALLERY[3].photo,
              title1: parsed.p2Photo4Title || DEFAULT_ANDES_GALLERY[3].title1,
              title2: ''
            }
          ];
        }
        return { ...DEFAULT_ANDES_DATA, ...parsed };
      }
    } catch {}
    return DEFAULT_ANDES_DATA;
  });

  // Save changes to localStorage
  const updateAgustinData = (updates: Partial<AgustinData>) => {
    setAgustinData(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(storageKeyAgustin, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateAndesData = (updates: Partial<AndesData>) => {
    setAndesData(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(storageKeyAndes, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Manejadores de galería dinámica de Parque de los Andes
  const handleAddGalleryItem = () => {
    const newItem: AndesGalleryItem = {
      id: Date.now().toString(),
      photo: '/report_assets/defaults/andes_p2_photo_1.png',
      title1: 'NUEVA FOTO DE AVANCE',
      title2: 'TERMINACIONES Y DETALLES'
    };
    setAndesData(prev => {
      const next = { ...prev, galleryItems: [...prev.galleryItems, newItem] };
      try {
        localStorage.setItem(storageKeyAndes, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRemoveGalleryItem = (id: string) => {
    if (andesData.galleryItems.length <= 1) return;
    setAndesData(prev => {
      const next = {
        ...prev,
        galleryItems: prev.galleryItems.filter(item => item.id !== id)
      };
      try {
        localStorage.setItem(storageKeyAndes, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleUpdateGalleryItem = (id: string, updates: Partial<AndesGalleryItem>) => {
    setAndesData(prev => {
      const next = {
        ...prev,
        galleryItems: prev.galleryItems.map(item => item.id === id ? { ...item, ...updates } : item)
      };
      try {
        localStorage.setItem(storageKeyAndes, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Reset to original PDF default template
  const handleResetTemplate = () => {
    if (activeTemplate === 'parque_agustin') {
      setAgustinData(DEFAULT_AGUSTIN_DATA);
      try { localStorage.removeItem(storageKeyAgustin); } catch {}
    } else {
      setAndesData(DEFAULT_ANDES_DATA);
      try { localStorage.removeItem(storageKeyAndes); } catch {}
    }
  };

  // Generic File Upload Trigger
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<string | null>(null);

  const triggerUpload = (targetKey: string) => {
    setActiveUploadTarget(targetKey);
    fileInputRef.current?.click();
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (!base64) return;

      if (activeUploadTarget.startsWith('gallery_')) {
        const itemId = activeUploadTarget.replace('gallery_', '');
        handleUpdateGalleryItem(itemId, { photo: base64 });
      } else if (activeTemplate === 'parque_agustin') {
        updateAgustinData({ [activeUploadTarget]: base64 });
      } else {
        updateAndesData({ [activeUploadTarget]: base64 });
      }
      setActiveUploadTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Print Handler (Strict Portrait A4)
  const handlePrint = () => {
    window.print();
  };

  // Paginación de la galería de Parque de los Andes en bloques de 4 fotos por hoja A4
  const andesGalleryChunks: AndesGalleryItem[][] = [];
  for (let i = 0; i < andesData.galleryItems.length; i += 4) {
    andesGalleryChunks.push(andesData.galleryItems.slice(i, i + 4));
  }

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white overflow-hidden animate-in fade-in duration-150 report-modal-backdrop">
      {/* Dynamic print stylesheet para salida 100% limpia en A4 Portrait */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 0 !important;
          }
          html, body {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          header,
          nav,
          footer,
          #root > div > header,
          #root > div > main,
          #root > div > nav,
          [class*="wallpaper"],
          [class*="luminous"],
          [class*="blur-"] {
            display: none !important;
          }
          .report-modal-backdrop {
            position: static !important;
            inset: auto !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .monthly-report-sheet-wrapper {
            background: #ffffff !important;
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .monthly-report-page {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            max-height: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            position: relative !important;
            background: #ffffff !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .monthly-report-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .monthly-report-page input,
          .monthly-report-page textarea {
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
        }
      `}</style>

      {/* Hidden File Input for Image Slots */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* TOP CONFIGURATION APP BAR (NO-PRINT) */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 no-print z-30 select-none shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
            <FileCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Plantilla de Informe de Obra</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                Logos Oficiales Protegidos
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-md">
              {project.name}
            </p>
          </div>
        </div>

        {/* Center: Template Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTemplate('parque_agustin')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTemplate === 'parque_agustin'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Parque Agustín (2 Págs)
          </button>
          <button
            type="button"
            onClick={() => setActiveTemplate('parque_andes')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              activeTemplate === 'parque_andes'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Parque de los Andes ({andesGalleryChunks.length + 2} Págs)
          </button>
        </div>

        {/* Actions: Reset, Print and Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetTemplate}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
            title="Restablecer textos e imágenes a la plantilla original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Restablecer Original</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all touch-target"
            title="Imprimir o guardar en PDF"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
            title="Cerrar modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* HELPER SUB-BAR (NO-PRINT) */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-6 py-2 flex items-center justify-between text-xs text-slate-300 no-print">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>
            <b>Edición Directa:</b> Haz clic en cualquier imagen para cambiarla/subirla y en los campos de texto para redactar el informe del mes sin scrollbars.
          </span>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Formato A4 vertical idéntico al PDF oficial
        </span>
      </div>

      {/* MAIN SCROLL CONTAINER: USA DIV (NO MAIN) PARA NO SER BLOQUEADO POR INDEX.CSS */}
      <div id="monthly-report-printable-area" className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-900/60 flex flex-col items-center gap-10 monthly-report-sheet-wrapper">
        {/* ========================================================================= */}
        {/* 1. PLANTILLA PARQUE AGUSTÍN (2 PÁGINAS A4 VERTICALES)                     */}
        {/* ========================================================================= */}
        {activeTemplate === 'parque_agustin' && (
          <>
            {/* PÁGINA 1: PARQUE AGUSTÍN */}
            <section className="monthly-report-page monthly-report-preview-sheet flex flex-col justify-between font-sans text-slate-900 bg-white shadow-2xl relative select-text">
              <div className="px-8 sm:px-10 pt-6 pb-2 flex-1 flex flex-col justify-between">
                {/* Upper Grid: Left Dark Petrol Card + Right Facade Photos */}
                <div className="grid grid-cols-12 gap-5 items-stretch h-[375px]">
                  {/* Left Column Dark Petrol Card */}
                  <div className="col-span-5 bg-[#0a222e] text-white rounded-none p-5 flex flex-col justify-between shadow-md relative overflow-hidden">
                    <div className="space-y-3">
                      {/* Year & Tagline */}
                      <div>
                        <input
                          type="text"
                          value={agustinData.year}
                          onChange={(e) => updateAgustinData({ year: e.target.value })}
                          className="bg-transparent text-xs font-bold text-slate-400 tracking-wider focus:outline-none w-20"
                        />
                        <input
                          type="text"
                          value={agustinData.tagline}
                          onChange={(e) => updateAgustinData({ tagline: e.target.value })}
                          className="bg-transparent text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wide block w-full focus:outline-none mt-0.5"
                        />
                      </div>

                      {/* Month Big Title */}
                      <div className="pt-1">
                        <input
                          type="text"
                          value={agustinData.month}
                          onChange={(e) => updateAgustinData({ month: e.target.value.toUpperCase() })}
                          className="bg-transparent text-3xl sm:text-4xl font-black text-white tracking-wider uppercase w-full focus:outline-none leading-none border-b-2 border-cyan-400/80 pb-1.5"
                        />
                      </div>

                      {/* 3 Circular Cyan Progress Badges */}
                      <div className="space-y-3 pt-1">
                        {/* Bubble 1 */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#0091cb] flex items-center justify-center shrink-0 shadow-md">
                            <input
                              type="text"
                              value={agustinData.bubble1Percent}
                              onChange={(e) => updateAgustinData({ bubble1Percent: e.target.value })}
                              className="bg-transparent text-white font-black text-xs text-center w-full focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={agustinData.bubble1Text}
                              onChange={(e) => updateAgustinData({ bubble1Text: e.target.value })}
                              className="bg-transparent text-[11px] font-bold text-slate-200 uppercase tracking-wide w-full focus:outline-none leading-tight"
                            />
                            <div className="h-1 bg-cyan-400 mt-1 w-full rounded-full" />
                          </div>
                        </div>

                        {/* Bubble 2 */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#0091cb] flex items-center justify-center shrink-0 shadow-md">
                            <input
                              type="text"
                              value={agustinData.bubble2Percent}
                              onChange={(e) => updateAgustinData({ bubble2Percent: e.target.value })}
                              className="bg-transparent text-white font-black text-xs text-center w-full focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={agustinData.bubble2Text}
                              onChange={(e) => updateAgustinData({ bubble2Text: e.target.value })}
                              className="bg-transparent text-[11px] font-bold text-slate-200 uppercase tracking-wide w-full focus:outline-none leading-tight"
                            />
                            <div className="h-1 bg-cyan-400 mt-1 w-full rounded-full" />
                          </div>
                        </div>

                        {/* Bubble 3 */}
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-[#0091cb] flex items-center justify-center shrink-0 shadow-md">
                            <input
                              type="text"
                              value={agustinData.bubble3Percent}
                              onChange={(e) => updateAgustinData({ bubble3Percent: e.target.value })}
                              className="bg-transparent text-white font-black text-xs text-center w-full focus:outline-none"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={agustinData.bubble3Text}
                              onChange={(e) => updateAgustinData({ bubble3Text: e.target.value })}
                              className="bg-transparent text-[11px] font-bold text-slate-200 uppercase tracking-wide w-full focus:outline-none leading-tight"
                            />
                            <div className="h-1 bg-cyan-400 mt-1 w-full rounded-full" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Zócalo de Tarjeta: Doble Marca Oficial con Protagonismo (Parque Agustín + Tierra Firme) */}
                    <div className="pt-3 border-t border-slate-700/80 mt-2 flex items-center justify-between gap-4 shrink-0">
                      <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm flex items-center justify-center">
                        <img
                          src="/report_assets/logo_parque_agustin_official.jpg"
                          alt="Parque Agustín"
                          className="h-10 sm:h-11 w-auto object-contain"
                        />
                      </div>
                      <img
                        src="/report_assets/logo_tierrafirme_white.png"
                        alt="Tierra Firme"
                        className="h-10 sm:h-11 max-w-[150px] object-contain drop-shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Right Upper Area: 2 Facade Photos Side-by-Side */}
                  <div className="col-span-7 grid grid-cols-2 gap-3 items-stretch h-full">
                    {/* Facade Photo 1 */}
                    <div
                      onClick={() => triggerUpload('p1Facade1Photo')}
                      className="group relative bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-sm h-full"
                      title="Haz clic para subir o cambiar foto"
                    >
                      <img
                        src={agustinData.p1Facade1Photo}
                        alt="Fachada 1"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="px-3 py-1.5 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Cambiar Foto</span>
                        </span>
                      </div>
                    </div>

                    {/* Facade Photo 2 */}
                    <div
                      onClick={() => triggerUpload('p1Facade2Photo')}
                      className="group relative bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-sm h-full"
                      title="Haz clic para subir o cambiar foto"
                    >
                      <img
                        src={agustinData.p1Facade2Photo}
                        alt="Fachada 2"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="px-3 py-1.5 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Cambiar Foto</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lower Section: 3 Numbered Columns (01, 02, 03) */}
                <div className="grid grid-cols-3 gap-5 my-auto pt-2">
                  {/* Item 01 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p1Item1Num}
                          onChange={(e) => updateAgustinData({ p1Item1Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p1Item1Title}
                        onChange={(e) => updateAgustinData({ p1Item1Title: e.target.value })}
                        className="text-xs font-bold text-slate-800 focus:outline-none w-full border-b border-transparent hover:border-slate-300 focus:border-cyan-500 leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p1Item1Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img
                        src={agustinData.p1Item1Photo}
                        alt="Item 01"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="px-2.5 py-1 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-md flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>Cambiar</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item 02 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p1Item2Num}
                          onChange={(e) => updateAgustinData({ p1Item2Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p1Item2Title}
                        onChange={(e) => updateAgustinData({ p1Item2Title: e.target.value })}
                        className="text-xs font-bold text-slate-800 focus:outline-none w-full border-b border-transparent hover:border-slate-300 focus:border-cyan-500 leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p1Item2Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img
                        src={agustinData.p1Item2Photo}
                        alt="Item 02"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="px-2.5 py-1 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-md flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>Cambiar</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item 03 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p1Item3Num}
                          onChange={(e) => updateAgustinData({ p1Item3Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p1Item3Title}
                        onChange={(e) => updateAgustinData({ p1Item3Title: e.target.value })}
                        className="text-xs font-bold text-slate-800 focus:outline-none w-full border-b border-transparent hover:border-slate-300 focus:border-cyan-500 leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p1Item3Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img
                        src={agustinData.p1Item3Photo}
                        alt="Item 03"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="px-2.5 py-1 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-md flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>Cambiar</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zócalo Inferior Oficial A4 (EN RESUMEN Editable + Logos Protagonistas) */}
              <div className="px-8 sm:px-10 pb-4 pt-1 shrink-0 space-y-2">
                <AgustinSummaryBar data={agustinData} onChange={updateAgustinData} />
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center">
                    <img
                      src="/report_assets/logo_parque_agustin_official.jpg"
                      alt="Parque Agustín Quinta Sección"
                      className="h-12 sm:h-14 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center">
                    <img
                      src="/report_assets/logo_tierrafirme_color.png"
                      alt="Tierra Firme"
                      className="h-11 sm:h-13 w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* PÁGINA 2: PARQUE AGUSTÍN */}
            <section className="monthly-report-page monthly-report-preview-sheet flex flex-col justify-between font-sans text-slate-900 bg-white shadow-2xl relative select-text">
              <div className="px-8 sm:px-10 pt-6 pb-2 flex-1 flex flex-col justify-between">
                {/* Upper Grid: Left Written Card with Logos + Right 3 Photos (Autoexpandible) */}
                <div className="grid grid-cols-12 gap-5 items-stretch min-h-[375px] h-auto">
                  {/* Left Column Dark Petrol Card (RESUMEN + LOGOS) - Autoacomodable sin cortes */}
                  <div className="col-span-6 bg-[#0a222e] text-white p-5 flex flex-col justify-between shadow-md h-auto min-h-full">
                    <div className="space-y-2 flex-1 flex flex-col justify-start">
                      <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-cyan-400/40 pb-1">
                        RESUMEN
                      </h3>
                      {(() => {
                        const typo = getResumenTypography(agustinData.p2ResumenText);
                        return (
                          <AutoExpandingTextarea
                            value={agustinData.p2ResumenText}
                            onChangeText={(val) => updateAgustinData({ p2ResumenText: val })}
                            className={`w-full bg-transparent ${typo.screenClass} focus:outline-none`}
                            printClassName={typo.printClass}
                          />
                        );
                      })()}
                    </div>

                    {/* Zócalo de Tarjeta: Doble Marca Oficial con Protagonismo (Parque Agustín + Tierra Firme) */}
                    <div className="pt-3 border-t border-slate-700/80 mt-3 flex items-center justify-between gap-4 shrink-0">
                      <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm flex items-center justify-center">
                        <img
                          src="/report_assets/logo_parque_agustin_official.jpg"
                          alt="Parque Agustín"
                          className="h-10 sm:h-11 w-auto object-contain"
                        />
                      </div>
                      <img
                        src="/report_assets/logo_tierrafirme_white.png"
                        alt="Tierra Firme"
                        className="h-10 sm:h-11 max-w-[150px] object-contain drop-shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Right Upper Area: 3 Photos Grid sincronizado en altura */}
                  <div className="col-span-6 flex flex-col gap-2.5 h-full">
                    {/* Fila Superior: Foto 1 y Foto 2 */}
                    <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-[185px]">
                      {/* Photo 1 (Vertical) */}
                      <div
                        onClick={() => triggerUpload('p2Photo1')}
                        className="group relative h-full min-h-[185px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                      >
                        <img
                          src={agustinData.p2Photo1}
                          alt="Foto 1"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                          <span className="px-2.5 py-1 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-md flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>Cambiar</span>
                          </span>
                        </div>
                      </div>

                      {/* Photo 2 (Angle Facade) */}
                      <div
                        onClick={() => triggerUpload('p2Photo2')}
                        className="group relative h-full min-h-[185px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                      >
                        <img
                          src={agustinData.p2Photo2}
                          alt="Foto 2"
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                          <span className="px-2.5 py-1 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-md flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>Cambiar</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fila Inferior: Foto 3 (Ancho completo) */}
                    <div
                      onClick={() => triggerUpload('p2Photo3')}
                      className="group relative flex-1 min-h-[160px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img
                        src={agustinData.p2Photo3}
                        alt="Foto 3"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="px-2.5 py-1 bg-slate-900/90 text-cyan-300 text-xs font-bold rounded-md flex items-center gap-1">
                          <Upload className="w-3 h-3" />
                          <span>Cambiar</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lower Section: 4 Numbered Columns (04, 05, 06, 06/07) */}
                <div className="grid grid-cols-4 gap-4 my-auto pt-2">
                  {/* Item 04 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p2Item4Num}
                          onChange={(e) => updateAgustinData({ p2Item4Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p2Item4Title}
                        onChange={(e) => updateAgustinData({ p2Item4Title: e.target.value })}
                        className="text-[11px] font-bold text-slate-800 focus:outline-none w-full leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p2Item4Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img src={agustinData.p2Item4Photo} alt="Item 04" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="p-1 bg-slate-900/90 text-cyan-300 rounded text-[10px] font-bold">Cambiar</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 05 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p2Item5Num}
                          onChange={(e) => updateAgustinData({ p2Item5Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p2Item5Title}
                        onChange={(e) => updateAgustinData({ p2Item5Title: e.target.value })}
                        className="text-[11px] font-bold text-slate-800 focus:outline-none w-full leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p2Item5Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img src={agustinData.p2Item5Photo} alt="Item 05" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="p-1 bg-slate-900/90 text-cyan-300 rounded text-[10px] font-bold">Cambiar</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 06 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p2Item6Num}
                          onChange={(e) => updateAgustinData({ p2Item6Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p2Item6Title}
                        onChange={(e) => updateAgustinData({ p2Item6Title: e.target.value })}
                        className="text-[11px] font-bold text-slate-800 focus:outline-none w-full leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p2Item6Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img src={agustinData.p2Item6Photo} alt="Item 06" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="p-1 bg-slate-900/90 text-cyan-300 rounded text-[10px] font-bold">Cambiar</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 07 */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#0091cb] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                        <input
                          type="text"
                          value={agustinData.p2Item7Num}
                          onChange={(e) => updateAgustinData({ p2Item7Num: e.target.value })}
                          className="bg-transparent text-center w-full focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={agustinData.p2Item7Title}
                        onChange={(e) => updateAgustinData({ p2Item7Title: e.target.value })}
                        className="text-[11px] font-bold text-slate-800 focus:outline-none w-full leading-tight"
                      />
                    </div>
                    <div
                      onClick={() => triggerUpload('p2Item7Photo')}
                      className="group relative h-[180px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                    >
                      <img src={agustinData.p2Item7Photo} alt="Item 07" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                        <span className="p-1 bg-slate-900/90 text-cyan-300 rounded text-[10px] font-bold">Cambiar</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zócalo Inferior Oficial A4 (EN RESUMEN Editable + Logos Protagonistas) */}
              <div className="px-8 sm:px-10 pb-4 pt-1 shrink-0 space-y-2">
                <AgustinSummaryBar data={agustinData} onChange={updateAgustinData} />
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center">
                    <img
                      src="/report_assets/logo_parque_agustin_official.jpg"
                      alt="Parque Agustín Quinta Sección"
                      className="h-12 sm:h-14 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center">
                    <img
                      src="/report_assets/logo_tierrafirme_color.png"
                      alt="Tierra Firme"
                      className="h-11 sm:h-13 w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* 2. PLANTILLA PARQUE DE LOS ANDES (3 PÁGINAS A4 VERTICALES)                */}
        {/* ========================================================================= */}
        {activeTemplate === 'parque_andes' && (
          <>
            {/* PÁGINA 1: PARQUE DE LOS ANDES (PORTADA) */}
            <section className="monthly-report-page monthly-report-preview-sheet flex flex-col justify-between font-sans text-slate-900 bg-white shadow-2xl relative select-text">
              {/* Top Gray Bar */}
              <div className="bg-[#777c80] text-white px-8 sm:px-10 py-3 flex items-center justify-between shrink-0">
                <input
                  type="text"
                  value={andesData.p1TopLeftTitle}
                  onChange={(e) => updateAndesData({ p1TopLeftTitle: e.target.value })}
                  className="bg-transparent text-sm sm:text-base font-bold tracking-wide uppercase focus:outline-none w-1/2"
                />
                <input
                  type="text"
                  value={andesData.p1TopRightDate}
                  onChange={(e) => updateAndesData({ p1TopRightDate: e.target.value })}
                  className="bg-transparent text-sm sm:text-base font-bold tracking-wider text-right uppercase focus:outline-none w-1/3"
                />
              </div>

              <div className="p-8 sm:p-10 flex-1 flex flex-col justify-between">
                {/* Subtitle */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={andesData.p1Subtitle}
                    onChange={(e) => updateAndesData({ p1Subtitle: e.target.value })}
                    className="text-base sm:text-lg font-black text-slate-700 uppercase tracking-wide w-full focus:outline-none"
                  />
                </div>

                {/* 2 Large Facade Photos Side-by-Side */}
                <div className="grid grid-cols-2 gap-4 flex-1 min-h-[380px] my-2">
                  <div
                    onClick={() => triggerUpload('p1Photo1')}
                    className="group relative bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200"
                  >
                    <img src={andesData.p1Photo1} alt="Fachada 1" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                      <span className="px-3 py-1.5 bg-slate-900/90 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1 shadow-md">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cambiar Foto</span>
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => triggerUpload('p1Photo2')}
                    className="group relative bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200"
                  >
                    <img src={andesData.p1Photo2} alt="Fachada 2" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                      <span className="px-3 py-1.5 bg-slate-900/90 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1 shadow-md">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cambiar Foto</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lower Section: Official Andes Logo (Left) + "Etapa de OBRA" Table (Right) */}
                <div className="grid grid-cols-12 gap-6 items-end pt-4">
                  {/* Left: Official Parque de los Andes Logo con Protagonismo */}
                  <div className="col-span-5 flex items-center justify-center p-2">
                    <img
                      src="/report_assets/logo_parque_de_los_andes.png"
                      alt="Edificio Parque de los Andes"
                      className="h-28 sm:h-32 max-w-[270px] w-auto object-contain drop-shadow-sm"
                    />
                  </div>

                  {/* Right: Etapa de OBRA Table */}
                  <div className="col-span-7 overflow-hidden rounded-none border border-slate-400">
                    <div className="bg-[#777c80] text-white font-black text-sm px-4 py-1.5 uppercase tracking-wider text-center">
                      Etapa de OBRA
                    </div>
                    <div className="divide-y divide-slate-300 bg-[#777c80] text-white text-xs">
                      {/* Row 1 */}
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={andesData.p1Stage1Pct}
                          onChange={(e) => updateAndesData({ p1Stage1Pct: e.target.value })}
                          className="w-16 px-2 py-1 bg-transparent text-right font-black border-r border-slate-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={andesData.p1Stage1Label}
                          onChange={(e) => updateAndesData({ p1Stage1Label: e.target.value })}
                          className="px-3 py-1 bg-transparent flex-1 font-bold focus:outline-none uppercase"
                        />
                      </div>
                      {/* Row 2 */}
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={andesData.p1Stage2Pct}
                          onChange={(e) => updateAndesData({ p1Stage2Pct: e.target.value })}
                          className="w-16 px-2 py-1 bg-transparent text-right font-black border-r border-slate-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={andesData.p1Stage2Label}
                          onChange={(e) => updateAndesData({ p1Stage2Label: e.target.value })}
                          className="px-3 py-1 bg-transparent flex-1 font-bold focus:outline-none uppercase"
                        />
                      </div>
                      {/* Row 3 */}
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={andesData.p1Stage3Pct}
                          onChange={(e) => updateAndesData({ p1Stage3Pct: e.target.value })}
                          className="w-16 px-2 py-1 bg-transparent text-right font-black border-r border-slate-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={andesData.p1Stage3Label}
                          onChange={(e) => updateAndesData({ p1Stage3Label: e.target.value })}
                          className="px-3 py-1 bg-transparent flex-1 font-bold focus:outline-none uppercase"
                        />
                      </div>
                      {/* Row 4 */}
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={andesData.p1Stage4Pct}
                          onChange={(e) => updateAndesData({ p1Stage4Pct: e.target.value })}
                          className="w-16 px-2 py-1 bg-transparent text-right font-black border-r border-slate-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={andesData.p1Stage4Label}
                          onChange={(e) => updateAndesData({ p1Stage4Label: e.target.value })}
                          className="px-3 py-1 bg-transparent flex-1 font-bold focus:outline-none uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Solid Corporate Banner: Official White Tierra Firme Logo con Protagonismo */}
              <div className="bg-[#777c80] text-white px-8 py-4 flex items-center justify-center shrink-0">
                <img
                  src="/report_assets/logo_tierrafirme_white.png"
                  alt="Tierra Firme"
                  className="h-16 sm:h-20 max-w-[340px] w-auto object-contain"
                />
              </div>
            </section>

            {/* PÁGINAS DE FACHADAS: PAGINACIÓN DINÁMICA DE A 4 FOTOS POR HOJA A4 */}
            {andesGalleryChunks.map((chunk, pageIdx) => (
              <React.Fragment key={`andes-gallery-chunk-${pageIdx}`}>
                <section className="monthly-report-page monthly-report-preview-sheet flex flex-col justify-between font-sans text-slate-900 bg-white shadow-2xl relative select-text">
                  {/* Right Margin Stripes (Red & Gray) */}
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#777c80] hidden sm:block" />
                  <div className="absolute right-3 top-0 bottom-0 w-1 bg-red-700 hidden sm:block" />

                  {/* Top Block Tab */}
                  <div className="pt-0 pr-8 sm:pr-12 flex justify-end">
                    <div className="bg-[#777c80] text-white font-black text-sm px-6 py-2 rounded-b-xl uppercase tracking-wider shadow-sm">
                      <input
                        type="text"
                        value={pageIdx === 0 ? andesData.p2TabTitle : `${andesData.p2TabTitle} (CONT. ${pageIdx + 1})`}
                        onChange={(e) => {
                          if (pageIdx === 0) updateAndesData({ p2TabTitle: e.target.value });
                        }}
                        className="bg-transparent text-center focus:outline-none w-36"
                      />
                    </div>
                  </div>

                  <div className="px-8 sm:px-10 pr-8 sm:pr-14 pt-2 pb-4 flex-1 flex flex-col justify-between">
                    <div>
                      <input
                        type="text"
                        value={andesData.p2Subtitle}
                        onChange={(e) => updateAndesData({ p2Subtitle: e.target.value })}
                        className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide focus:outline-none w-full border-b border-transparent hover:border-slate-300 pb-0.5 mb-2"
                      />
                    </div>

                    {/* Grilla 2x2 Calibrada: Máximo 4 fotos por hoja sin desbordar el A4 */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 my-auto">
                      {chunk.map((item) => (
                        <div key={item.id} className="flex flex-col space-y-1">
                          {/* Encabezado con Títulos Subrayados */}
                          <div className="border-b border-slate-700 pb-0.5 flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-2">
                              <input
                                type="text"
                                value={item.title1}
                                onChange={(e) => handleUpdateGalleryItem(item.id, { title1: e.target.value })}
                                className="text-[11px] font-bold text-slate-800 uppercase focus:outline-none w-full truncate"
                                placeholder="Título de la tarea o sector"
                              />
                              <input
                                type="text"
                                value={item.title2 || ''}
                                onChange={(e) => handleUpdateGalleryItem(item.id, { title2: e.target.value })}
                                className="text-[10px] text-slate-500 uppercase focus:outline-none w-full truncate"
                                placeholder="Detalle o rubro adicional"
                              />
                            </div>
                            {/* Botón Eliminar Foto (solo en pantalla, no en impresión) */}
                            {andesData.galleryItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveGalleryItem(item.id)}
                                className="no-print p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar esta foto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Recuadro de Foto con Altura Fija Calibrada (235px) */}
                          <div
                            onClick={() => triggerUpload(`gallery_${item.id}`)}
                            className="group relative h-[230px] sm:h-[235px] bg-slate-100 overflow-hidden cursor-pointer flex items-center justify-center border border-slate-200 shadow-xs"
                          >
                            <img src={item.photo} alt={item.title1} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity no-print">
                              <span className="p-1.5 bg-slate-900/90 text-amber-300 rounded text-xs font-bold flex items-center gap-1 shadow-md">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Cambiar Foto</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer con Doble Logo Oficial con Protagonismo */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                      <img
                        src="/report_assets/logo_parque_de_los_andes.png"
                        alt="Edificio Parque de los Andes"
                        className="h-13 sm:h-15 max-w-[210px] w-auto object-contain"
                      />
                      <img
                        src="/report_assets/logo_tierrafirme_color.png"
                        alt="Tierra Firme"
                        className="h-12 sm:h-14 max-w-[210px] w-auto object-contain"
                      />
                    </div>
                  </div>
                </section>
              </React.Fragment>
            ))}

            {/* BOTÓN FLOTANTE PARA AGREGAR MÁS FOTOS A LA GALERÍA (SOLO EN PANTALLA) */}
            <div className="w-full max-w-[210mm] flex justify-center sm:justify-end no-print -my-4 z-20">
              <button
                type="button"
                onClick={handleAddGalleryItem}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-xl active:scale-95 transition-all touch-target"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Agregar Otra Foto a la Galería (+1 Hoja A4 cada 4 fotos)</span>
              </button>
            </div>

            {/* PÁGINA DE INFORME TÉCNICO: TEXTOS FLUIDOS SIN SCROLLBARS */}
            <section className="monthly-report-page monthly-report-preview-sheet flex flex-col justify-between font-sans text-slate-900 bg-white shadow-2xl relative select-text">
              {/* Right Margin Stripes */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#777c80] hidden sm:block" />
              <div className="absolute right-3 top-0 bottom-0 w-1 bg-red-700 hidden sm:block" />

              {/* Top Block Tab */}
              <div className="pt-0 pr-8 sm:pr-12 flex justify-end">
                <div className="bg-[#777c80] text-white font-black text-sm px-6 py-2 rounded-b-xl uppercase tracking-wider shadow-sm">
                  <input
                    type="text"
                    value={andesData.p3TabTitle}
                    onChange={(e) => updateAndesData({ p3TabTitle: e.target.value })}
                    className="bg-transparent text-center focus:outline-none w-32"
                  />
                </div>
              </div>

              <div className="px-8 sm:px-10 pr-8 sm:pr-14 pt-2 pb-4 flex-1 flex flex-col justify-between">
                {/* Document Title */}
                <div className="mb-3">
                  <input
                    type="text"
                    value={andesData.p3DocTitle}
                    onChange={(e) => updateAndesData({ p3DocTitle: e.target.value })}
                    className="text-base sm:text-lg font-black text-slate-800 focus:outline-none w-full border-b border-slate-300 pb-1"
                  />
                </div>

                {/* Structured Text Paragraphs con AutoExpandingTextarea (Sin scrollbars) */}
                <div className="space-y-2.5 text-xs sm:text-[11.5px] leading-relaxed text-slate-800 flex-1 my-auto">
                  <AutoExpandingTextarea
                    value={andesData.p3Paragraph1}
                    onChangeText={(val) => updateAndesData({ p3Paragraph1: val })}
                    className="w-full bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200"
                    printClassName="text-slate-800 text-[11px] leading-relaxed"
                  />

                  <AutoExpandingTextarea
                    value={andesData.p3Paragraph2}
                    onChangeText={(val) => updateAndesData({ p3Paragraph2: val })}
                    className="w-full bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200"
                    printClassName="text-slate-800 text-[11px] leading-relaxed"
                  />

                  <AutoExpandingTextarea
                    value={andesData.p3Paragraph3}
                    onChangeText={(val) => updateAndesData({ p3Paragraph3: val })}
                    className="w-full bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200"
                    printClassName="text-slate-800 text-[11px] leading-relaxed"
                  />

                  <AutoExpandingTextarea
                    value={andesData.p3Paragraph4}
                    onChangeText={(val) => updateAndesData({ p3Paragraph4: val })}
                    className="w-full bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200"
                    printClassName="text-slate-800 text-[11px] leading-relaxed"
                  />

                  {/* Subheading & Next Tasks */}
                  <div className="pt-2">
                    <input
                      type="text"
                      value={andesData.p3Subheading}
                      onChange={(e) => updateAndesData({ p3Subheading: e.target.value })}
                      className="font-bold text-slate-900 focus:outline-none w-full mb-1"
                    />
                    <input
                      type="text"
                      value={andesData.p3NextTasksIntro}
                      onChange={(e) => updateAndesData({ p3NextTasksIntro: e.target.value })}
                      className="text-xs text-slate-700 italic focus:outline-none w-full mb-1"
                    />
                    <AutoExpandingTextarea
                      value={andesData.p3NextTasksList}
                      onChangeText={(val) => updateAndesData({ p3NextTasksList: val })}
                      className="w-full bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200 pl-2"
                      printClassName="text-slate-800 text-[11px] leading-relaxed pl-2"
                    />
                  </div>

                  <AutoExpandingTextarea
                    value={andesData.p3Conclusion}
                    onChangeText={(val) => updateAndesData({ p3Conclusion: val })}
                    className="w-full bg-transparent focus:outline-none border-b border-transparent hover:border-slate-200 pt-1"
                    printClassName="text-slate-800 text-[11px] leading-relaxed pt-1"
                  />
                </div>

                {/* Footer with Dual Official Logos con Protagonismo */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <img
                    src="/report_assets/logo_parque_de_los_andes.png"
                    alt="Edificio Parque de los Andes"
                    className="h-13 sm:h-15 max-w-[210px] w-auto object-contain"
                  />
                  <img
                    src="/report_assets/logo_tierrafirme_color.png"
                    alt="Tierra Firme"
                    className="h-12 sm:h-14 max-w-[210px] w-auto object-contain"
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
