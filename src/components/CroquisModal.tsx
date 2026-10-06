import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  PenTool,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Share2,
  Save,
  Check,
  Grid,
  Square,
  Circle,
  MoveRight,
  Minus,
  Type,
  Maximize2,
  Minimize2,
  Building2,
  DoorOpen,
  Calendar,
  Eraser,
  Pencil,
  Highlighter,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Camera,
  Upload,
  FileText,
  Compass,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Sparkles,
  MoreVertical,
  ZoomIn,
  ZoomOut,
  Hand,
  Plus,
  Tag,
  CheckSquare
} from 'lucide-react';
import { Project, Unit, SketchDocument, BlueprintDocument } from '../types';

interface CroquisModalProps {
  isOpen: boolean;
  projects: Project[];
  initialProjectId?: string;
  initialUnitId?: string;
  onClose: () => void;
  onSaveSketch: (projectId: string, unitId: string, sketch: SketchDocument) => void;
  onDeleteSketch?: (projectId: string, unitId: string, sketchId: string) => void;
}

type ToolType = 'pen' | 'highlighter' | 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'eraser';
type PaperType = 'white' | 'grid' | 'lines' | 'dark';

interface BackgroundDoc {
  dataUrl: string;
  name: string;
  type: 'camera' | 'image' | 'pdf';
  page?: number;
  totalPages?: number;
  fileBlob?: Blob;
  opacity: number;
}

function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const COLOR_PALETTE = [
  { label: 'Rojo Obra', value: '#dc2626' },
  { label: 'Negro Carbón', value: '#0f172a' },
  { label: 'Azul Técnico', value: '#2563eb' },
  { label: 'Verde Instalación', value: '#16a34a' },
  { label: 'Naranja / Cota', value: '#ea580c' },
  { label: 'Amarillo Resalte', value: '#eab308' },
  { label: 'Cian Neón', value: '#00f2fe' },
  { label: 'Violeta Cyber', value: '#a855f7' },
  { label: 'Blanco', value: '#ffffff' }
];

const STROKE_WIDTHS = [
  { label: 'Fino', value: 2 },
  { label: 'Medio', value: 4 },
  { label: 'Grueso', value: 8 },
  { label: 'Resaltador', value: 16 }
];

const PRESET_REFERENCES = [
  'Instalación Sanitaria',
  'Modificación de Tabique',
  'Instalación Eléctrica',
  'Pérdida / Fuga de Agua',
  'Detalle Constructivo',
  'Desagüe y Pendientes',
  'Alineación y Escuadra',
  'Medidas en Sitio'
];

/**
 * Loads a PDF page and renders it to a sharp PNG data URL using PDF.js CDN
 */
async function renderPdfPageToDataUrl(
  fileOrBlob: Blob,
  pageNumber = 1
): Promise<{ dataUrl: string; totalPages: number }> {
  if (!(window as any).pdfjsLib) {
    await new Promise((resolve, reject) => {
      const existing = document.getElementById('pdfjs-cdn-script');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', reject);
        return;
      }
      const script = document.createElement('script');
      script.id = 'pdfjs-cdn-script';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        try {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(true);
        } catch {
          resolve(true);
        }
      };
      script.onerror = () => reject(new Error('No se pudo cargar el motor PDF'));
      document.head.appendChild(script);
    });
  }

  const pdfjsLib = (window as any).pdfjsLib;
  const arrayBuffer = await fileOrBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const targetPage = Math.max(1, Math.min(pageNumber, totalPages));
  const page = await pdf.getPage(targetPage);

  // Render at 2.0 scale for sharp blueprint lines
  const viewport = page.getViewport({ scale: 2.0 });
  const offscreen = document.createElement('canvas');
  offscreen.width = viewport.width;
  offscreen.height = viewport.height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) throw new Error('No 2d context');

  await page.render({ canvasContext: ctx, viewport }).promise;
  return {
    dataUrl: offscreen.toDataURL('image/png', 0.95),
    totalPages
  };
}

export function CroquisModal({
  isOpen,
  projects,
  initialProjectId,
  initialUnitId,
  onClose,
  onSaveSketch,
  onDeleteSketch
}: CroquisModalProps) {
  // Active selected project
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    if (initialProjectId && projects.some(p => p.id === initialProjectId)) {
      return initialProjectId;
    }
    return projects.length > 0 ? projects[0].id : '';
  });

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  // Active selected unit
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    const proj = (initialProjectId && projects.find(p => p.id === initialProjectId)) || projects[0];
    if (proj && Array.isArray(proj.units) && proj.units.length > 0) {
      if (initialUnitId && proj.units.some(u => u.id === initialUnitId)) {
        return initialUnitId;
      }
      return proj.units[0].id;
    }
    return '';
  });

  const [activeTab, setActiveTab] = useState<'draw' | 'history'>('history');
  const [galleryUnitFilter, setGalleryUnitFilter] = useState<string>(() => initialUnitId || 'all');
  const [previewSketchUrl, setPreviewSketchUrl] = useState<string | null>(null);
  const [previewSketchTitle, setPreviewSketchTitle] = useState<string>('');

  // Destination save modal state
  const [isSaveLocationModalOpen, setIsSaveLocationModalOpen] = useState<boolean>(false);
  const [saveDestinationType, setSaveDestinationType] = useState<'unit' | 'item'>('unit');
  const [saveTradeId, setSaveTradeId] = useState<string>('');
  const [saveItemId, setSaveItemId] = useState<string>('');
  const [pendingCompositeDataUrl, setPendingCompositeDataUrl] = useState<string | null>(null);

  const [sketchTitle, setSketchTitle] = useState<string>('Croquis en sitio');
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>('#dc2626'); // Red default for technical markups
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [paperType, setPaperType] = useState<PaperType>('grid');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Zoom & Pan State (Full-Screen Ergonomics)
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState<boolean>(false);
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');

  // Track if user has touched/started drawing so the empty-state welcome card fades away
  const [hasStartedDrawing, setHasStartedDrawing] = useState<boolean>(false);

  // The 3-Dots Menu Drawer State
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState<boolean>(false);

  // Background Document / Photo / PDF state
  const [bgDocument, setBgDocument] = useState<BackgroundDoc | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isBlueprintsDropdownOpen, setIsBlueprintsDropdownOpen] = useState(false);

  // File Inputs Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Canvas & Container Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const snapshotRef = useRef<ImageData | null>(null);

  // Pan dragging tracking
  const isDraggingPanRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Touch Pinch-to-Zoom tracking
  const touchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialMid: { x: number; y: number };
    initialPan: { x: number; y: number };
  } | null>(null);

  // Undo / Redo history stacks
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Current Unit Object (guaranteed safe)
  const currentUnit = activeProject?.units?.find(u => u.id === selectedUnitId) || activeProject?.units?.[0];
  const unitSketches = currentUnit?.sketches || [];
  const unitBlueprints = currentUnit?.blueprints || [];

  // All sketches for active project across all units
  const allProjectSketches = useMemo(() => {
    if (!activeProject || !Array.isArray(activeProject.units)) return [];
    const list: SketchDocument[] = [];
    activeProject.units.forEach(u => {
      (u.sketches || []).forEach(s => {
        list.push({
          ...s,
          unitId: s.unitId || u.id,
          unitName: s.unitName || u.name
        });
      });
    });
    return list;
  }, [activeProject]);

  // Filtered sketches to display in gallery
  const displayedSketches = useMemo(() => {
    if (galleryUnitFilter === 'all') {
      return allProjectSketches;
    }
    const targetUnit = activeProject?.units?.find(u => u.id === galleryUnitFilter);
    return targetUnit?.sketches || [];
  }, [galleryUnitFilter, allProjectSketches, activeProject]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync initialProjectId & initialUnitId when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('history'); // ALWAYS open gallery first as requested!
      setIsSaveLocationModalOpen(false);
      setPendingCompositeDataUrl(null);

      let targetProjId = selectedProjectId;
      if (initialProjectId && projects.some(p => p.id === initialProjectId)) {
        targetProjId = initialProjectId;
        setSelectedProjectId(initialProjectId);
      } else if (!targetProjId || !projects.some(p => p.id === targetProjId)) {
        targetProjId = projects[0]?.id || '';
        setSelectedProjectId(targetProjId);
      }

      const targetProj = projects.find(p => p.id === targetProjId);
      if (targetProj && Array.isArray(targetProj.units)) {
        if (initialUnitId && targetProj.units.some(u => u.id === initialUnitId)) {
          setSelectedUnitId(initialUnitId);
          setGalleryUnitFilter(initialUnitId);
        } else if (targetProj.units.length > 0 && (!selectedUnitId || !targetProj.units.some(u => u.id === selectedUnitId))) {
          setSelectedUnitId(targetProj.units[0].id);
          setGalleryUnitFilter(targetProj.units[0].id);
        }
      }
    }
  }, [isOpen, initialProjectId, initialUnitId, projects]);

  const handleSelectProject = (newProjId: string) => {
    setSelectedProjectId(newProjId);
    const proj = projects.find(p => p.id === newProjId);
    if (proj && Array.isArray(proj.units) && proj.units.length > 0) {
      setSelectedUnitId(proj.units[0].id);
      setGalleryUnitFilter('all');
    } else {
      setSelectedUnitId('');
      setGalleryUnitFilter('all');
    }
  };

  // Update history availability flags
  const updateHistoryState = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  // Save current canvas state to undo stack
  const pushUndoState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStackRef.current.push(imageData);
      if (undoStackRef.current.length > 25) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      updateHistoryState();
    } catch (err) {
      console.error('Error pushing undo state:', err);
    }
  };

  // High-precision Canvas Initialization & Resizing
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    // Save previous drawing content if canvas already had strokes
    let prevData: ImageData | null = null;
    try {
      if (canvas.width > 0 && canvas.height > 0) {
        prevData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // ignore
    }

    // Set physical buffer size
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // Set CSS displayed size explicitly matching container to ensure 1:1 screen mapping
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Scale context by devicePixelRatio
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (prevData) {
      try {
        ctx.putImageData(prevData, 0, 0);
      } catch {
        // ignore
      }
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    updateHistoryState();
  }, []);

  // ResizeObserver on the paper container to keep 1:1 precision at all times
  useEffect(() => {
    if (!isOpen || activeTab !== 'draw') return;

    const container = containerRef.current;
    if (!container) return;

    // Run after layout settle
    const initTimer = setTimeout(() => {
      initCanvas();
    }, 100);

    let resizeTimer: any = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initCanvas();
      }, 50);
    });

    observer.observe(container);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [isOpen, activeTab, initCanvas]);

  // Undo Handler
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current to redo
    const currentImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redoStackRef.current.push(currentImg);

    // Pop from undo
    const prevImg = undoStackRef.current.pop()!;
    ctx.putImageData(prevImg, 0, 0);
    updateHistoryState();
  };

  // Redo Handler
  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current to undo
    const currentImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStackRef.current.push(currentImg);

    // Pop from redo
    const nextImg = redoStackRef.current.pop()!;
    ctx.putImageData(nextImg, 0, 0);
    updateHistoryState();
  };

  // Clear Canvas
  const handleClear = () => {
    if (!confirm('¿Deseas limpiar todos los trazos dibujados sobre la hoja?')) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    pushUndoState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsToolsMenuOpen(false);
    setHasStartedDrawing(false);
  };

  // Zoom Controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(5.0, Number((prev + 0.25).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, Number((prev - 0.25).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setIsPanMode(false);
    showToast('Zoom restablecido al 100%');
  };

  const handleTogglePanMode = () => {
    setIsPanMode(prev => {
      const next = !prev;
      showToast(next ? 'Modo Mover activado: arrastra para desplazarte' : 'Modo Dibujo activado');
      return next;
    });
  };

  // Two-Finger Touch Pinch-to-Zoom & Pan Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        startPointRef.current = null;
        snapshotRef.current = null;
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const mid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      touchStateRef.current = {
        initialDist: dist,
        initialZoom: zoom,
        initialMid: mid,
        initialPan: { ...pan }
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStateRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const mid = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      const scaleRatio = dist / (touchStateRef.current.initialDist || 1);
      const newZoom = Math.min(5.0, Math.max(0.5, Number((touchStateRef.current.initialZoom * scaleRatio).toFixed(2))));
      setZoom(newZoom);

      const deltaX = mid.x - touchStateRef.current.initialMid.x;
      const deltaY = mid.y - touchStateRef.current.initialMid.y;
      setPan({
        x: Math.round(touchStateRef.current.initialPan.x + deltaX),
        y: Math.round(touchStateRef.current.initialPan.y + deltaY)
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchStateRef.current = null;
    }
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || isPanMode) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      setZoom(prev => Math.min(5.0, Math.max(0.5, Number((prev + delta).toFixed(2)))));
    }
  };

  /**
   * High-Precision Point Mapping:
   * Maps physical screen pointer (stylus/touch/mouse) directly to canvas logical coordinate space.
   * This completely eliminates any lateral offset (e.g. 7mm shift) by computing the true scale ratio.
   */
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Logical canvas dimensions expected by 2D context
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    // Absolute scale ratio between screen CSS pixels and context coordinates
    const scaleX = logicalWidth / (rect.width || 1);
    const scaleY = logicalHeight / (rect.height || 1);

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // S-Pen / Apple Pencil stylus pressure
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure };
  };

  // Context Styling Configuration
  const applyContextStyle = (ctx: CanvasRenderingContext2D, pressure = 0.5) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = strokeWidth * 4.0;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.globalAlpha = 1.0;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(14, strokeWidth * 2.8);
      ctx.globalAlpha = 0.38;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      // Stylus pressure dynamic modulation
      const effectiveWidth = Math.max(1, strokeWidth * (0.65 + pressure * 0.7));
      ctx.lineWidth = effectiveWidth;
      ctx.globalAlpha = 1.0;
    }
  };

  // Pointer Down (Pen / Touch / Mouse Start)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    // If Pan Mode is active and not drawing with a dedicated stylus pen, start panning
    if (isPanMode && e.pointerType !== 'pen') {
      isDraggingPanRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const { x, y, pressure } = getCanvasPoint(e);
    isDrawingRef.current = true;
    startPointRef.current = { x, y };
    setHasStartedDrawing(true);

    pushUndoState();

    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y);
      applyContextStyle(ctx, pressure);
      ctx.stroke();
    } else if (tool === 'text') {
      const text = prompt('Escribe el texto, cota o anotación para este punto:');
      if (text && text.trim()) {
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = color;
        ctx.fillText(text.trim(), x, y);
      }
      isDrawingRef.current = false;
    }
  };

  // Pointer Move (Pen / Touch / Mouse Drawing)
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If dragging pan
    if (isDraggingPanRef.current) {
      setPan({
        x: Math.round(e.clientX - panStartRef.current.x),
        y: Math.round(e.clientY - panStartRef.current.y)
      });
      return;
    }

    if (!isDrawingRef.current || !startPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y, pressure } = getCanvasPoint(e);

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      applyContextStyle(ctx, pressure);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      // Shape Preview: Restore snapshot before drawing preview
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }

      applyContextStyle(ctx, 0.5);
      const startX = startPointRef.current.x;
      const startY = startPointRef.current.y;

      if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        drawArrow(ctx, startX, startY, x, y, strokeWidth);
      } else if (tool === 'rect') {
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (tool === 'circle') {
        const radiusX = Math.abs(x - startX) / 2;
        const radiusY = Math.abs(y - startY) / 2;
        const centerX = Math.min(startX, x) + radiusX;
        const centerY = Math.min(startY, y) + radiusY;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingPanRef.current) {
      isDraggingPanRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    startPointRef.current = null;
    snapshotRef.current = null;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Helper: Draw Arrow with arrow head
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    width: number
  ) => {
    const headLen = Math.max(12, width * 3.2);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle - Math.PI / 6),
      toY - headLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLen * Math.cos(angle + Math.PI / 6),
      toY - headLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // Handling Image / PDF / Camera file selection
  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    try {
      if (isPdf) {
        showToast('Procesando archivo PDF...');
        const result = await renderPdfPageToDataUrl(file, 1);
        setBgDocument({
          dataUrl: result.dataUrl,
          name: file.name,
          type: 'pdf',
          page: 1,
          totalPages: result.totalPages,
          fileBlob: file,
          opacity: 0.95
        });
        if (sketchTitle === 'Croquis en sitio') {
          setSketchTitle(`Anotaciones: ${file.name.replace(/\.[^/.]+$/, '')}`);
        }
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setIsPanMode(false);
        setIsToolsMenuOpen(false);
        showToast(`Plano PDF cargado en pantalla completa (${result.totalPages} pág)`);
      } else {
        // Image or Live Camera Photo
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            setBgDocument({
              dataUrl,
              name: isCamera ? `Foto de Obra (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : file.name,
              type: isCamera ? 'camera' : 'image',
              opacity: 0.95
            });
            if (sketchTitle === 'Croquis en sitio') {
              setSketchTitle(isCamera ? 'Detalle fotográfico en sitio' : `Anotaciones: ${file.name.replace(/\.[^/.]+$/, '')}`);
            }
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setIsPanMode(false);
            setIsToolsMenuOpen(false);
            setHasStartedDrawing(true);
            showToast(isCamera ? 'Foto en pantalla completa lista para croquizar y hacer zoom' : 'Imagen a pantalla completa lista');
          }
          setIsLoadingFile(false);
        };
        reader.onerror = () => {
          setIsLoadingFile(false);
          showToast('Error al leer la imagen');
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err: any) {
      console.error('Error loading file onto croquis canvas:', err);
      showToast('No se pudo procesar el archivo');
    } finally {
      setIsLoadingFile(false);
      // Reset input value
      e.target.value = '';
    }
  };

  // Switching page of an existing PDF background document
  const handlePdfPageChange = async (newPage: number) => {
    if (!bgDocument || !bgDocument.fileBlob || bgDocument.type !== 'pdf') return;
    setIsLoadingFile(true);
    try {
      const result = await renderPdfPageToDataUrl(bgDocument.fileBlob, newPage);
      setBgDocument(prev => prev ? {
        ...prev,
        dataUrl: result.dataUrl,
        page: newPage
      } : null);
      showToast(`Página ${newPage} de ${result.totalPages} cargada`);
    } catch (err) {
      console.error('Error changing PDF page:', err);
      showToast('Error al cambiar de página');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Load an existing blueprint from the unit into the croquis background
  const handleLoadBlueprintAsBackground = async (bp: BlueprintDocument) => {
    setIsBlueprintsDropdownOpen(false);
    setIsLoadingFile(true);

    try {
      if (bp.type === 'image') {
        setBgDocument({
          dataUrl: bp.url,
          name: bp.name,
          type: 'image',
          opacity: 0.95
        });
        if (sketchTitle === 'Croquis en sitio') {
          setSketchTitle(`Sobre plano: ${bp.name}`);
        }
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setIsPanMode(false);
        setIsToolsMenuOpen(false);
        setHasStartedDrawing(true);
        showToast(`Plano "${bp.name}" cargado a pantalla completa`);
      } else if (bp.type === 'pdf') {
        showToast('Cargando plano PDF...');
        const res = await fetch(bp.url);
        const blob = await res.blob();
        const result = await renderPdfPageToDataUrl(blob, 1);
        setBgDocument({
          dataUrl: result.dataUrl,
          name: bp.name,
          type: 'pdf',
          page: 1,
          totalPages: result.totalPages,
          fileBlob: blob,
          opacity: 0.95
        });
        if (sketchTitle === 'Croquis en sitio') {
          setSketchTitle(`Sobre plano: ${bp.name}`);
        }
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setIsPanMode(false);
        setIsToolsMenuOpen(false);
        setHasStartedDrawing(true);
        showToast(`Plano PDF "${bp.name}" cargado`);
      }
    } catch (err) {
      console.error('Error loading blueprint as background:', err);
      showToast('No se pudo cargar el plano');
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Generate Composite High-Res Image with Official Technical Header & Background Image
  const generateCompositeSketchImage = async (): Promise<string | null> => {
    const drawingCanvas = canvasRef.current;
    if (!drawingCanvas) return null;

    const container = containerRef.current;
    const containerW = container ? container.clientWidth : 1200;
    const containerH = container ? container.clientHeight : 800;
    const containerRatio = containerW / (containerH || 1);

    const width = 1200;
    const headerHeight = 140;
    const bodyHeight = Math.min(1800, Math.max(600, Math.round(width / containerRatio)));
    const footerHeight = 40;
    const totalHeight = headerHeight + bodyHeight + footerHeight;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = totalHeight;

    const ctx = outCanvas.getContext('2d');
    if (!ctx) return null;

    // 1. Draw Technical Header (Membrete de Obra)
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, headerHeight);

    // Accent line in Amber
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, headerHeight - 4, width, 4);

    // Title
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('📐 CROQUIS TÉCNICO DE OBRA EN TERRENO', 30, 42);

    // Subheader: Obra & Depto
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(
      `OBRA: ${(activeProject?.name || 'Obra').toUpperCase()}   |   ESPACIO: ${(currentUnit?.name || 'Unidad').toUpperCase()}`,
      30,
      80
    );

    // Date & Reference
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const timestamp = `${dateStr}, ${timeStr} hs`;

    ctx.fillStyle = '#94a3b8'; // Slate 400
    ctx.font = '15px sans-serif';
    const bgInfo = bgDocument ? ` [Base: ${bgDocument.name}${bgDocument.page ? ` Pág ${bgDocument.page}` : ''}]` : '';
    ctx.fillText(`Fecha: ${timestamp}   |   Ref: ${sketchTitle || 'Relevamiento a mano alzada'}${bgInfo}`, 30, 115);

    // 2. Draw Paper Background or Document Underlay in Body
    const bodyY = headerHeight;

    if (bgDocument) {
      // White container background behind document
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, bodyY, width, bodyHeight);

      // Draw the background image fitted preserving aspect ratio
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const imgRatio = (img.naturalWidth || img.width) / (img.naturalHeight || img.height);
          const bodyRatio = width / bodyHeight;
          let drawW = width;
          let drawH = bodyHeight;
          let drawX = 0;
          let drawY = bodyY;

          if (imageFit === 'cover') {
            if (imgRatio > bodyRatio) {
              drawH = bodyHeight;
              drawW = bodyHeight * imgRatio;
              drawX = (width - drawW) / 2;
            } else {
              drawW = width;
              drawH = width / imgRatio;
              drawY = bodyY + (bodyHeight - drawH) / 2;
            }
          } else {
            // contain
            if (imgRatio > bodyRatio) {
              drawW = width;
              drawH = width / imgRatio;
              drawY = bodyY + (bodyHeight - drawH) / 2;
            } else {
              drawH = bodyHeight;
              drawW = bodyHeight * imgRatio;
              drawX = (width - drawW) / 2;
            }
          }

          ctx.save();
          ctx.globalAlpha = bgDocument.opacity;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = bgDocument.dataUrl;
      });
    } else {
      // Standard paper styling
      if (paperType === 'dark') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, bodyY, width, bodyHeight);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, bodyY, width, bodyHeight);

        if (paperType === 'grid') {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          const gridSize = 30;
          for (let gx = 0; gx <= width; gx += gridSize) {
            ctx.beginPath();
            ctx.moveTo(gx, bodyY);
            ctx.lineTo(gx, bodyY + bodyHeight);
            ctx.stroke();
          }
          for (let gy = bodyY; gy <= bodyY + bodyHeight; gy += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(width, gy);
            ctx.stroke();
          }
        } else if (paperType === 'lines') {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          const lineSpacing = 35;
          for (let ly = bodyY + lineSpacing; ly <= bodyY + bodyHeight; ly += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(30, ly);
            ctx.lineTo(width - 30, ly);
            ctx.stroke();
          }
        }
      }
    }

    // 3. Draw User's Annotations & Hand-Drawn Strokes scaled to body
    ctx.drawImage(drawingCanvas, 0, bodyY, width, bodyHeight);

    // 4. Footer Watermark
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, totalHeight - footerHeight, width, footerHeight);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('Control de Avance - Registro de Terreno y Auditoría Técnica', 30, totalHeight - 16);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('SUPERVISIÓN EN OBRA', width - 200, totalHeight - 16);

    return outCanvas.toDataURL('image/jpeg', 0.82);
  };

  // Open Destination Selection Modal
  const handleOpenSaveDialog = async () => {
    if (!currentUnit || !activeProject) {
      showToast('Selecciona un proyecto y departamento válido');
      return;
    }
    const finalDataUrl = await generateCompositeSketchImage();
    if (!finalDataUrl) {
      showToast('Error al generar la imagen del croquis');
      return;
    }
    setPendingCompositeDataUrl(finalDataUrl);

    // Initialize trade and item if available
    const trades = currentUnit.trades || [];
    if (trades.length > 0) {
      setSaveTradeId(trades[0].id);
      setSaveItemId(trades[0].items?.[0]?.id || '');
    }
    setSaveDestinationType('unit');
    setIsSaveLocationModalOpen(true);
  };

  // Confirm Save with Selected Destination
  const handleConfirmSave = () => {
    if (!pendingCompositeDataUrl || !currentUnit || !activeProject) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const timestamp = `${dateStr}, ${timeStr} hs`;

    const selectedTrade = currentUnit.trades?.find(t => t.id === saveTradeId);
    const selectedItem = selectedTrade?.items?.find(i => i.id === saveItemId);

    const isItemLinked = saveDestinationType === 'item' && selectedTrade && selectedItem;

    const newSketch: SketchDocument = {
      id: `sk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: sketchTitle.trim() || (isItemLinked ? `Croquis: ${selectedItem.name}` : 'Croquis en sitio'),
      dataUrl: pendingCompositeDataUrl,
      createdAt: timestamp,
      unitId: currentUnit.id,
      unitName: currentUnit.name,
      projectId: activeProject.id,
      projectName: activeProject.name,
      tradeId: isItemLinked ? selectedTrade.id : undefined,
      tradeName: isItemLinked ? selectedTrade.name : undefined,
      itemId: isItemLinked ? selectedItem.id : undefined,
      itemName: isItemLinked ? selectedItem.name : undefined
    };

    onSaveSketch(activeProject.id, currentUnit.id, newSketch);

    if (isItemLinked) {
      showToast(`Croquis vinculado a "${selectedItem.name}" y guardado ✔`);
    } else {
      showToast(`Croquis guardado en ${currentUnit.name} (${activeProject.name}) ✔`);
    }

    setIsSaveLocationModalOpen(false);
    setPendingCompositeDataUrl(null);
    setActiveTab('history'); // Directly view in gallery!
  };

  // Download Image
  const handleDownload = async (dataUrl?: string, title?: string) => {
    const targetUrl = dataUrl || (await generateCompositeSketchImage());
    if (!targetUrl) return;

    const projectName = activeProject?.name || 'Obra';
    const cleanProject = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const cleanUnit = (currentUnit?.name || 'Unidad').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Croquis_${cleanProject}_${cleanUnit}_${dateStr}.png`;

    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Imagen descargada en tu dispositivo');
  };

  // Share via WhatsApp (with file on mobile/tablet, web fallback on desktop)
  const handleShareWhatsApp = async (customDataUrl?: string, customTitle?: string) => {
    const targetUrl = customDataUrl || (await generateCompositeSketchImage());
    if (!targetUrl) return;

    const projectName = activeProject?.name || 'Obra';
    const unitName = currentUnit?.name || 'Unidad';
    const titleToShare = customTitle || sketchTitle || 'Relevamiento en terreno';

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const timestamp = `${dateStr}, ${timeStr} hs`;

    const messageText =
      `📐 *CROQUIS TÉCNICO DE OBRA*\n` +
      `🏢 *Obra:* ${projectName}\n` +
      `🚪 *Departamento / Espacio:* ${unitName}\n` +
      `📅 *Fecha:* ${timestamp}\n` +
      `📝 *Referencia:* ${titleToShare}\n\n` +
      `Adjunto registro gráfico a mano alzada realizado en sitio.`;

    try {
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `Croquis_${projectName.replace(/\s+/g, '_')}_${unitName.replace(/\s+/g, '_')}.png`,
        { type: 'image/png' }
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Croquis ${unitName} - ${projectName}`,
          text: messageText
        });
        showToast('Compartido con éxito');
        return;
      }
    } catch (err) {
      console.log('Web Share not supported or dismissed:', err);
    }

    // Fallback: Download image and open WhatsApp Web
    handleDownload(targetUrl, titleToShare);
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
    window.open(waUrl, '_blank');
    showToast('Se abrió WhatsApp y se descargó la imagen para adjuntarla');
  };

  // Load an existing sketch from history back into the canvas
  const handleLoadSketchToCanvas = (dataUrl: string, title: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      pushUndoState();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setSketchTitle(title);
      setActiveTab('draw');
      showToast('Croquis cargado en el lienzo para continuar');
    };
    img.src = dataUrl;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-full bg-slate-950 overflow-hidden select-none animate-in fade-in duration-150">
      {/* Hidden Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFilePicked(e, true)}
        className="hidden"
      />

      {/* Hidden File Picker Input (Images or PDFs) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        onChange={(e) => handleFilePicked(e, false)}
        className="hidden"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2 rounded-2xl shadow-2xl border border-amber-500/80 flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-2 backdrop-blur-md">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingFile && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black tracking-wide text-amber-400 uppercase">
            Cargando documento a pantalla completa...
          </p>
        </div>
      )}

      {/* TAB 1: DRAWING FULL SCREEN CANVAS */}
      {activeTab === 'draw' && (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-950 relative overflow-hidden">
          {/* HEADER BAR: HIGH-CONTRAST WITH DIRECT ACCESS TO CAMERA, IMAGES & 3-DOTS */}
          {/* HEADER BAR: PINNED LEFT (X) & RIGHT (3-DOTS) WITH TOUCH-SLIDING HORIZONTAL CENTER */}
          <div className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-30 shrink-0 select-none px-2 sm:px-3 overflow-hidden">
            {/* Left: PINNED Close & Obra/Depto Info - NEVER SHRUNK, ALWAYS VISIBLE */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-20 bg-slate-900 pr-1.5 border-r border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-slate-800 hover:bg-rose-600 text-white rounded-xl border border-slate-700 transition-all touch-target active:scale-95 shadow-xs shrink-0 flex items-center justify-center"
                title="Cerrar croquis"
                aria-label="Cerrar croquis"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>

              <div className="flex flex-col min-w-0 max-w-[70px] xs:max-w-[95px] sm:max-w-[150px] leading-tight">
                <span className="font-black text-white text-xs truncate">
                  {activeProject?.name || 'Obra'}
                </span>
                <span className="text-amber-400 font-bold text-[10px] truncate">
                  • {currentUnit?.name || 'Unidad'}
                </span>
              </div>
            </div>

            {/* Center: HORIZONTALLY SCROLLABLE TOOLBAR (Allows sliding smoothly with finger on mobile) */}
            <div
              className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 overflow-x-auto touch-pan-x scrollbar-none py-1 px-1.5 scroll-smooth"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {/* Active Background Photo Indicator Pill */}
              {bgDocument && (
                <button
                  type="button"
                  onClick={() => setBgDocument(null)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-rose-300 font-bold bg-emerald-950/80 hover:bg-rose-950/80 border border-emerald-600/50 hover:border-rose-600/50 px-2 py-1 rounded-xl transition-colors"
                  title="Foto en pantalla completa. Toca para quitar fondo."
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">Foto activa ✕</span>
                </button>
              )}

              {/* Direct Access: Camera */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="shrink-0 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all touch-target border border-emerald-500 whitespace-nowrap"
                title="Tomar foto con la cámara para croquizar encima a pantalla completa"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Foto</span>
              </button>

              {/* Direct Access: Image / PDF */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all touch-target border border-blue-500 whitespace-nowrap"
                title="Cargar foto o plano PDF desde tus archivos"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Imagen</span>
              </button>

              {/* If unit has blueprints */}
              {unitBlueprints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBlueprintsDropdownOpen(true)}
                  className="shrink-0 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-all touch-target whitespace-nowrap"
                  title="Cargar plano técnico de la unidad"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Planos ({unitBlueprints.length})</span>
                </button>
              )}

              {/* Quick Undo / Redo */}
              <div className="shrink-0 flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5">
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={handleUndo}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-25 transition-colors touch-target"
                  title="Deshacer trazo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  onClick={handleRedo}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-25 transition-colors touch-target"
                  title="Rehacer trazo"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Active Tool & Color Indicator Toggle */}
              <button
                type="button"
                onClick={() => {
                  if (tool === 'eraser') setTool('pen');
                  else setTool('eraser');
                }}
                className={`shrink-0 p-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all touch-target ${
                  tool === 'eraser'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title={tool === 'eraser' ? 'Borrador activo (toca para volver a dibujar)' : 'Alternar a borrador'}
              >
                {tool === 'eraser' ? (
                  <Eraser className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <div className="flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/40"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                )}
              </button>

              {/* Quick Zoom Pill */}
              <div className="shrink-0 flex items-center bg-slate-800 rounded-xl border border-slate-700 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors touch-target"
                  title="Alejar zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-1.5 py-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
                  title="Restablecer zoom al 100% y centrar"
                >
                  {Math.round(zoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors touch-target"
                  title="Acercar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                {/* Pan / Move Mode Toggle */}
                <button
                  type="button"
                  onClick={handleTogglePanMode}
                  className={`p-1.5 rounded-lg transition-all touch-target ${
                    isPanMode
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title={isPanMode ? 'Modo Mover activado: arrastra para desplazarte' : 'Activar modo mover / desplazar pantalla'}
                >
                  <Hand className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: PINNED Guardar + 3-DOTS (⋮) BUTTON - NEVER SHRUNK, ALWAYS VISIBLE */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 z-20 bg-slate-900 pl-1.5 border-l border-slate-800">
              {/* Quick Save */}
              <button
                type="button"
                onClick={handleOpenSaveDialog}
                className="p-2 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95 touch-target border border-emerald-500 flex items-center gap-1 shrink-0"
                title="Guardar croquis en la unidad o en un ítem"
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">Guardar</span>
              </button>

              {/* 3-DOTS MENU BUTTON (⋮) */}
              <button
                type="button"
                onClick={() => setIsToolsMenuOpen(true)}
                className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 touch-target border border-amber-400 shrink-0"
                title="Abrir menú de herramientas, colores, formas y ajustes de croquis"
              >
                <MoreVertical className="w-4 h-4 stroke-[3]" />
                <span className="text-xs font-black hidden xs:inline">Opciones</span>
              </button>
            </div>
          </div>

          {/* MAIN CANVAS AREA: OCCUPIES 100% OF REMAINING SCREEN */}
          <div
            className="flex-1 min-h-0 w-full relative overflow-hidden flex items-center justify-center bg-slate-950 p-1.5 sm:p-3"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div
              ref={containerRef}
              className={`w-full h-full relative overflow-hidden flex items-center justify-center touch-none select-none transition-all ${
                isPanMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
              } ${
                bgDocument
                  ? 'bg-slate-950'
                  : 'max-w-5xl rounded-2xl shadow-2xl border border-slate-700/60'
              }`}
              style={{
                backgroundColor: bgDocument
                  ? '#020617'
                  : paperType === 'dark'
                  ? '#0f172a'
                  : '#ffffff',
                backgroundImage:
                  !bgDocument && paperType === 'grid'
                    ? 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)'
                    : !bgDocument && paperType === 'lines'
                    ? 'linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)'
                    : undefined,
                backgroundSize:
                  !bgDocument && paperType === 'grid'
                    ? '24px 24px'
                    : !bgDocument && paperType === 'lines'
                    ? '100% 28px'
                    : undefined
              }}
            >
              {/* Transformed Content Wrapper (Synchronizes Zoom & Pan for both Photo and Canvas) */}
              <div
                className="w-full h-full relative flex items-center justify-center pointer-events-auto"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Background Document / Photo / PDF */}
                {bgDocument && (
                  <img
                    src={bgDocument.dataUrl}
                    alt={bgDocument.name}
                    style={{ opacity: bgDocument.opacity }}
                    className={`absolute inset-0 w-full h-full pointer-events-none select-none ${
                      imageFit === 'cover' ? 'object-cover' : 'object-contain'
                    }`}
                  />
                )}

                {/* Precision Drawing Canvas */}
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="block relative z-10 touch-none select-none"
                  style={{ touchAction: 'none' }}
                />
              </div>

              {/* Discreet Bottom Stamp on Sheet */}
              <div className="absolute bottom-2 left-3 pointer-events-none opacity-40 text-[10px] font-black uppercase tracking-wider text-slate-500 z-20">
                {activeProject?.name || 'Obra'} • {currentUnit?.name || 'Unidad'}
              </div>

              {/* Pan Mode Floating Indicator */}
              {isPanMode && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-xl flex items-center gap-1.5 animate-pulse">
                  <Hand className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Modo Mover: Arrastra la pantalla • Toca la mano para dibujar</span>
                </div>
              )}

              {/* EMPTY STATE WELCOME CARD: If no photo loaded and no drawing yet */}
              {!bgDocument && !hasStartedDrawing && undoStackRef.current.length === 0 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
                  <div className="bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded-3xl p-5 sm:p-7 max-w-sm sm:max-w-md w-full shadow-2xl text-center text-white pointer-events-auto space-y-4 animate-in fade-in zoom-in-95">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-lg">
                      <PenTool className="w-7 h-7 stroke-[2.5]" />
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                        Croquis de Obra en Sitio
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">
                        {activeProject?.name || 'Obra'} • {currentUnit?.name || 'Unidad'}
                      </p>
                      <p className="text-[11px] text-amber-400 font-bold mt-1">
                        Toma una foto de la obra para croquizar a pantalla completa, o dibuja sobre esta hoja:
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {/* Live Camera Button */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all touch-target border border-emerald-500"
                      >
                        <Camera className="w-5 h-5" />
                        <span>Tomar Foto de la Obra</span>
                      </button>

                      {/* File Upload Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all touch-target border border-blue-500"
                      >
                        <Upload className="w-5 h-5" />
                        <span>Cargar Imagen o PDF</span>
                      </button>

                      {/* Blueprints Button if available */}
                      {unitBlueprints.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsBlueprintsDropdownOpen(true)}
                          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all touch-target"
                        >
                          <Compass className="w-4 h-4" />
                          <span>Usar Plano de la Unidad ({unitBlueprints.length})</span>
                        </button>
                      )}

                      {/* Freehand Blank Sheet Button */}
                      <button
                        type="button"
                        onClick={() => setHasStartedDrawing(true)}
                        className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all touch-target border border-slate-700"
                      >
                        <Pencil className="w-4 h-4 text-amber-400" />
                        <span>Dibujar a mano alzada en blanco</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* UNIT BLUEPRINTS PICKER MODAL */}
          {isBlueprintsDropdownOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl text-white space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Planos de la Unidad</h3>
                      <p className="text-[11px] text-slate-400">{currentUnit?.name || 'Unidad'} • {activeProject?.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBlueprintsDropdownOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {unitBlueprints.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleLoadBlueprintAsBackground(bp)}
                      className="w-full text-left p-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-colors active:scale-95"
                    >
                      <span className="truncate">{bp.name}</span>
                      <span className="text-[10px] text-amber-400 font-mono uppercase bg-slate-900 px-2 py-0.5 rounded-md border border-slate-700">
                        {bp.type}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsBlueprintsDropdownOpen(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* THE 3-DOTS SETTINGS & TOOLS DRAWER / MODAL */}
          {isToolsMenuOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
              <div className="w-full sm:w-[420px] max-w-full h-full bg-slate-900 border-l border-slate-800 p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 shadow-2xl animate-in slide-in-from-right duration-200 text-white">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Ajustes del Croquis</h3>
                      <p className="text-[11px] text-amber-400 font-bold">Herramientas, colores y fotos</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsToolsMenuOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* SECTION 1: FORMAS Y HERRAMIENTAS DE DIBUJO */}
                <div className="space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-500" />
                    Herramienta de Trazo
                  </span>

                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setTool('pen');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'pen' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="text-[10px]">Lápiz</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('highlighter');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'highlighter' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <Highlighter className="w-4 h-4" />
                      <span className="text-[10px]">Resaltador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('line');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'line' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      <span className="text-[10px]">Línea</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('arrow');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'arrow' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <MoveRight className="w-4 h-4" />
                      <span className="text-[10px]">Flecha</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('rect');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'rect' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <Square className="w-4 h-4" />
                      <span className="text-[10px]">Rectángulo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('circle');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'circle' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <Circle className="w-4 h-4" />
                      <span className="text-[10px]">Círculo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('text');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'text' && !isPanMode
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span className="text-[10px]">Texto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTool('eraser');
                        setIsPanMode(false);
                      }}
                      className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all touch-target ${
                        tool === 'eraser' && !isPanMode
                          ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-755'
                      }`}
                    >
                      <Eraser className="w-4 h-4" />
                      <span className="text-[10px]">Goma</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors touch-target"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpiar todo el dibujo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPanMode(!isPanMode);
                        setIsToolsMenuOpen(false);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all touch-target ${
                        isPanMode
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                    >
                      <Hand className="w-3.5 h-3.5" />
                      <span>{isPanMode ? 'Mover activado' : 'Mover / Desplazar'}</span>
                    </button>
                  </div>
                </div>

                {/* SECTION 2: GROSOR DE TRAZO */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    Grosor del Trazo ({strokeWidth}px)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {STROKE_WIDTHS.map((sw) => (
                      <button
                        key={sw.value}
                        type="button"
                        onClick={() => setStrokeWidth(sw.value)}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1.5 border transition-all touch-target ${
                          strokeWidth === sw.value
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        <div
                          className="rounded-full bg-current"
                          style={{
                            width: `${Math.min(14, sw.value * 1.5 + 2)}px`,
                            height: `${Math.min(14, sw.value * 1.5 + 2)}px`
                          }}
                        />
                        <span className="text-[10px]">{sw.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECTION 3: PALETA DE COLORES */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Color de Trazo
                    </span>
                    <span className="text-[11px] font-mono text-amber-400">{color}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setColor(c.value);
                          if (tool === 'eraser') setTool('pen');
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform touch-target flex-shrink-0 ${
                          color === c.value && tool !== 'eraser'
                            ? 'scale-125 border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                            : 'border-slate-700'
                        }`}
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}

                    {/* Custom HTML Color Picker */}
                    <div className="relative flex items-center justify-center">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                          setColor(e.target.value);
                          if (tool === 'eraser') setTool('pen');
                        }}
                        className="w-8 h-8 p-0 border-0 rounded-full cursor-pointer bg-transparent"
                        title="Elegir otro color"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: FOTO / IMAGEN / PLANO DE FONDO */}
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    Fondo a Pantalla Completa (Foto / Imagen / PDF)
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        cameraInputRef.current?.click();
                        setIsToolsMenuOpen(false);
                      }}
                      className="p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-target shadow-xs active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Tomar Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setIsToolsMenuOpen(false);
                      }}
                      className="p-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all touch-target shadow-xs active:scale-95"
                    >
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>Cargar Imagen/PDF</span>
                    </button>
                  </div>

                  {/* If unit has blueprints */}
                  {unitBlueprints.length > 0 && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBlueprintsDropdownOpen(!isBlueprintsDropdownOpen)}
                        className="w-full p-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs flex items-center justify-between transition-all touch-target"
                      >
                        <span className="flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5" />
                          <span>Planos técnicos de la unidad ({unitBlueprints.length})</span>
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isBlueprintsDropdownOpen ? 'rotate-90' : ''}`} />
                      </button>

                      {isBlueprintsDropdownOpen && (
                        <div className="mt-1 bg-slate-800 rounded-xl border border-slate-700 p-1 space-y-1 max-h-40 overflow-y-auto">
                          {unitBlueprints.map((bp) => (
                            <button
                              key={bp.id}
                              type="button"
                              onClick={() => handleLoadBlueprintAsBackground(bp)}
                              className="w-full text-left p-2 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-200 flex items-center justify-between"
                            >
                              <span className="truncate">{bp.name}</span>
                              <span className="text-[10px] text-amber-400 font-mono uppercase">{bp.type}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Background Document Controls */}
                  {bgDocument ? (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-amber-500/30 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-400 truncate max-w-[200px]">
                          📷 {bgDocument.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBgDocument(null)}
                          className="px-2 py-0.5 bg-rose-600/40 hover:bg-rose-600 text-rose-200 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          Quitar fondo
                        </button>
                      </div>

                      {/* Opacity slider */}
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Opacidad: {Math.round(bgDocument.opacity * 100)}%</span>
                        <input
                          type="range"
                          min="0.2"
                          max="1"
                          step="0.05"
                          value={bgDocument.opacity}
                          onChange={(e) =>
                            setBgDocument((prev) =>
                              prev ? { ...prev, opacity: parseFloat(e.target.value) } : null
                            )
                          }
                          className="w-24 accent-amber-500 cursor-pointer"
                        />
                      </div>

                      {/* Fit Mode Toggle */}
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700">
                        <span>Ajuste de Pantalla:</span>
                        <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                          <button
                            type="button"
                            onClick={() => setImageFit('contain')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              imageFit === 'contain' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                            }`}
                          >
                            Ajustar
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageFit('cover')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              imageFit === 'cover' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                            }`}
                          >
                            Llenar
                          </button>
                        </div>
                      </div>

                      {/* PDF Multi-page navigation */}
                      {bgDocument.totalPages && bgDocument.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-xs">
                          <span>Página: {bgDocument.page} de {bgDocument.totalPages}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={bgDocument.page! <= 1}
                              onClick={() => handlePdfPageChange(bgDocument.page! - 1)}
                              className="p-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={bgDocument.page! >= bgDocument.totalPages!}
                              onClick={() => handlePdfPageChange(bgDocument.page! + 1)}
                              className="p-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Paper Type Selector when no photo/document is loaded
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Tipo de Papel (Sin foto):</span>
                      <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setPaperType('white')}
                          className={`p-2 rounded-xl border text-[11px] font-bold ${
                            paperType === 'white' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          Blanco
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaperType('grid')}
                          className={`p-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 ${
                            paperType === 'grid' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <Grid className="w-3 h-3" />
                          <span>Cuadrícula</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaperType('lines')}
                          className={`p-2 rounded-xl border text-[11px] font-bold ${
                            paperType === 'lines' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          Rayado
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaperType('dark')}
                          className={`p-2 rounded-xl border text-[11px] font-bold ${
                            paperType === 'dark' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          Oscuro
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 5: DATOS DE LA OBRA Y ESPACIO */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    Destino del Croquis
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Project select */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Obra:</label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => handleSelectProject(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 font-bold text-xs text-white outline-none cursor-pointer"
                      >
                        {projects.map((p) => (
                          <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unit select */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Depto / Espacio:</label>
                      <select
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 font-bold text-xs text-white outline-none cursor-pointer"
                      >
                        {(activeProject?.units || []).map((u) => (
                          <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                            {u.name} {u.type === 'common_area' ? '(Común)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Referencia / Título:</label>
                    <input
                      type="text"
                      value={sketchTitle}
                      onChange={(e) => setSketchTitle(e.target.value)}
                      placeholder="Ej: Modificación tabique baño"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 font-medium text-xs text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* SECTION 6: GUARDADO Y ACCIONES */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5 text-amber-500" />
                    Guardar y Compartir
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenSaveDialog();
                        setIsToolsMenuOpen(false);
                      }}
                      className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 touch-target"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar Croquis</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleShareWhatsApp();
                        setIsToolsMenuOpen(false);
                      }}
                      className="p-2.5 bg-green-700 hover:bg-green-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 touch-target"
                    >
                      <WhatsAppIcon className="w-4 h-4 fill-white" />
                      <span>Enviar WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleDownload();
                        setIsToolsMenuOpen(false);
                      }}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/40 rounded-xl flex items-center justify-center gap-1.5 transition-all touch-target"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Descargar PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('history');
                        setIsToolsMenuOpen(false);
                      }}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center justify-center gap-1.5 transition-all touch-target"
                    >
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>Ver Historial ({unitSketches.length})</span>
                    </button>
                  </div>
                </div>

                {/* BOTTOM CLOSE DRAWER BUTTON */}
                <div className="pt-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => setIsToolsMenuOpen(false)}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all touch-target"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Volver a Pantalla Completa</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SKETCHES HISTORY / GALLERY */}
      {activeTab === 'history' && (
        <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-slate-950 overflow-hidden">
          {/* Top Bar for Gallery */}
          <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white leading-tight">
                    Galería de Croquis y Anotaciones
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Planos, relevamientos y fotos técnicas registradas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('draw')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all touch-target"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Crear Nuevo Croquis</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
                  title="Cerrar modal"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter selectors toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
              {/* Project selector if multiple projects */}
              {projects.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1.5 rounded-xl">
                  <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      const newProjId = e.target.value;
                      setSelectedProjectId(newProjId);
                      const proj = projects.find(p => p.id === newProjId);
                      if (proj?.units?.[0]) {
                        setSelectedUnitId(proj.units[0].id);
                      }
                      setGalleryUnitFilter('all');
                    }}
                    className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[150px] truncate"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Unit Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-950/60 border border-slate-800 px-2.5 py-1.5 rounded-xl">
                <DoorOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={galleryUnitFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value;
                    setGalleryUnitFilter(newFilter);
                    if (newFilter !== 'all') {
                      setSelectedUnitId(newFilter);
                    }
                  }}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    Todas las unidades ({allProjectSketches.length})
                  </option>
                  {(activeProject?.units || []).map(u => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                      {u.name} ({u.sketches?.length || 0})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25 ml-auto">
                {displayedSketches.length} {displayedSketches.length === 1 ? 'croquis' : 'croquis'}
              </span>
            </div>
          </div>

          {/* Main Gallery Scroll Area */}
          <div className="flex-1 p-3 sm:p-5 overflow-y-auto">
            {displayedSketches.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-slate-900/60 rounded-3xl border border-slate-800/80 max-w-xl mx-auto my-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                  <PenTool className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">
                  No hay croquis guardados
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                  {galleryUnitFilter === 'all'
                    ? `Aún no se han guardado croquis en la obra ${activeProject?.name}.`
                    : `No hay croquis para la unidad ${currentUnit?.name || ''}.`}
                  {' '}Crea uno nuevo a mano alzada o anotando sobre una foto o plano.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('draw')}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all touch-target"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Abrir Lienzo en Blanco</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('draw');
                      setTimeout(() => cameraInputRef.current?.click(), 100);
                    }}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-2 active:scale-95 transition-all touch-target"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Tomar Foto con Cámara</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Quick Add Card */}
                <div
                  onClick={() => setActiveTab('draw')}
                  className="bg-slate-900/40 hover:bg-slate-900/80 border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center transition-all mb-3">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                    Crear Nuevo Croquis
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Dibujar o fotografiar detalle técnico
                  </p>
                </div>

                {/* Sketch Cards */}
                {displayedSketches.map((sketch) => (
                  <div
                    key={sketch.id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-lg flex flex-col hover:border-slate-700 transition-all"
                  >
                    {/* Thumbnail / Image container */}
                    <div
                      onClick={() => {
                        setPreviewSketchUrl(sketch.dataUrl);
                        setPreviewSketchTitle(sketch.title);
                      }}
                      className="relative aspect-[16/10] bg-slate-950 overflow-hidden border-b border-slate-800 cursor-pointer group"
                      title="Haz clic para ampliar"
                    >
                      <img
                        src={sketch.dataUrl}
                        alt={sketch.title}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="text-[10px] font-bold bg-slate-900/90 backdrop-blur-xs text-slate-200 px-2 py-0.5 rounded-lg border border-slate-700">
                          {sketch.unitName || currentUnit?.name}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="text-[10px] font-bold bg-slate-900/90 backdrop-blur-xs text-amber-400 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          {sketch.createdAt}
                        </span>
                      </div>
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-amber-500/30 shadow-lg">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver en grande</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div>
                        <h4 className="text-xs font-black text-white truncate" title={sketch.title}>
                          {sketch.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">
                          {sketch.unitName || currentUnit?.name} • {sketch.projectName || activeProject?.name}
                        </p>

                        {/* Linked Trade & Item Badge */}
                        {sketch.tradeName && sketch.itemName && (
                          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded-lg">
                            <Tag className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">
                              {sketch.tradeName} • {sketch.itemName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(sketch.dataUrl, sketch.title)}
                            className="p-1.5 text-emerald-400 hover:bg-emerald-950/40 rounded-lg transition-colors touch-target"
                            title="Compartir por WhatsApp"
                            aria-label="Compartir por WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4 fill-emerald-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(sketch.dataUrl, sketch.title)}
                            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors touch-target"
                            title="Descargar imagen"
                            aria-label="Descargar imagen"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadSketchToCanvas(sketch.dataUrl, sketch.title)}
                            className="px-2 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-950/40 rounded-lg transition-colors flex items-center gap-1 touch-target"
                            title="Abrir este croquis en el lienzo para seguir dibujando"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Continuar</span>
                          </button>
                        </div>

                        {onDeleteSketch && activeProject && (
                          <button
                            type="button"
                            onClick={() => {
                              const targetUId = sketch.unitId || currentUnit?.id;
                              if (targetUId) {
                                onDeleteSketch(activeProject.id, targetUId, sketch.id);
                                showToast('Croquis eliminado');
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-950/40 rounded-lg transition-colors touch-target"
                            title="Eliminar croquis"
                            aria-label="Eliminar croquis"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DESTINATION SELECTION MODAL (WHEN PRESSING SAVE ON CANVAS) */}
      {isSaveLocationModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Guardar Croquis de Obra
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeProject?.name} • {currentUnit?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveLocationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Thumbnail Preview */}
              {pendingCompositeDataUrl && (
                <div className="aspect-[16/9] w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={pendingCompositeDataUrl}
                    alt="Vista previa del croquis"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              {/* Title input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Título o Referencia del Croquis
                </label>
                <input
                  type="text"
                  value={sketchTitle}
                  onChange={(e) => setSketchTitle(e.target.value)}
                  placeholder="Ej: Relevamiento viga PB, Croquis cañería cocina..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Destination Radio Cards */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Destino de Guardado
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Option 1: General to Unit */}
                  <div
                    onClick={() => setSaveDestinationType('unit')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      saveDestinationType === 'unit'
                        ? 'bg-amber-500/10 border-amber-500/80 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      saveDestinationType === 'unit' ? 'border-amber-500 bg-amber-500' : 'border-slate-600'
                    }`}>
                      {saveDestinationType === 'unit' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <DoorOpen className="w-3.5 h-3.5 text-amber-400" />
                        <span>A nivel general del departamento</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Se guardará en la galería de {currentUnit?.name} y actualizará el contador de croquis general.
                      </p>
                    </div>
                  </div>

                  {/* Option 2: Associate to Checklist Item */}
                  <div
                    onClick={() => setSaveDestinationType('item')}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      saveDestinationType === 'item'
                        ? 'bg-amber-500/10 border-amber-500/80 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      saveDestinationType === 'item' ? 'border-amber-500 bg-amber-500' : 'border-slate-600'
                    }`}>
                      {saveDestinationType === 'item' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Asociar a un Ítem específico del Checklist</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Se vinculará a la tarea seleccionada y se añadirá automáticamente a sus fotos de inspección.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade & Item Dropdowns (If Option 2 Selected) */}
              {saveDestinationType === 'item' && (
                <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      1. Selecciona el Rubro
                    </label>
                    <select
                      value={saveTradeId}
                      onChange={(e) => {
                        const newTradeId = e.target.value;
                        setSaveTradeId(newTradeId);
                        const trade = currentUnit?.trades?.find(t => t.id === newTradeId);
                        setSaveItemId(trade?.items?.[0]?.id || '');
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {(currentUnit?.trades || []).map(trade => (
                        <option key={trade.id} value={trade.id} className="bg-slate-900 text-white">
                          {trade.name} ({trade.items?.length || 0} ítems)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      2. Selecciona el Ítem de Inspección
                    </label>
                    <select
                      value={saveItemId}
                      onChange={(e) => setSaveItemId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {(currentUnit?.trades?.find(t => t.id === saveTradeId)?.items || []).map(item => (
                        <option key={item.id} value={item.id} className="bg-slate-900 text-white">
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsSaveLocationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors touch-target"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all touch-target"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirmar y Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX / FULLSCREEN PREVIEW MODAL */}
      {previewSketchUrl && (
        <div className="fixed inset-0 z-[70] bg-slate-950/95 backdrop-blur-md flex flex-col animate-in fade-in duration-150">
          {/* Lightbox Header */}
          <div className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white truncate max-w-[260px] sm:max-w-md">
                {previewSketchTitle || 'Croquis'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(previewSketchUrl, previewSketchTitle)}
                className="p-2 text-emerald-400 hover:bg-emerald-950/40 rounded-xl transition-colors touch-target"
                title="Compartir por WhatsApp"
              >
                <WhatsAppIcon className="w-5 h-5 fill-emerald-400" />
              </button>

              <button
                type="button"
                onClick={() => handleDownload(previewSketchUrl, previewSketchTitle)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
                title="Descargar imagen"
              >
                <Download className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setPreviewSketchUrl(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors touch-target"
                title="Cerrar vista previa"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image View */}
          <div className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <img
              src={previewSketchUrl}
              alt={previewSketchTitle}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
