import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  Upload,
  ExternalLink,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  Layers,
  Check,
  Building,
  Eye,
  Plus,
  Camera,
  CheckCircle2,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { BlueprintDocument } from '../types';
import { uploadFileToDrive } from '../lib/driveUpload';
import { compressImageFile } from '../utils/calculations';

interface BlueprintViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitName: string;
  projectName: string;
  blueprints: BlueprintDocument[];
  onAddBlueprint: (doc: Omit<BlueprintDocument, 'id' | 'uploadedAt'>) => void;
  onDeleteBlueprint: (docId: string) => void;
}

export function BlueprintViewerModal({
  isOpen,
  onClose,
  unitName,
  projectName,
  blueprints,
  onAddBlueprint,
  onDeleteBlueprint
}: BlueprintViewerModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Add Doc Form State
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<BlueprintDocument['category']>('arquitectura');
  const [newDocType, setNewDocType] = useState<'pdf' | 'cad' | 'image' | 'link'>('image');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Zoom and pan state for images
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));

  if (!isOpen) return null;

  const filteredDocs = blueprints.filter(doc => {
    if (activeCategory === 'todos') return true;
    return doc.category === activeCategory;
  });

  const activeDoc = blueprints.find(d => d.id === selectedDocId) || (filteredDocs.length > 0 ? filteredDocs[0] : null);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(3.5, prev + 0.25));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.25));
  const handleResetZoom = () => setZoomLevel(1);

  // 1. Capturar foto con la cámara (celular / tablet / webcam)
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatusText('Capturando y optimizando foto del plano...');

    try {
      // Comprimir manteniendo excelente resolución técnica (1600px, 0.80) para planos nítidos y subida inmediata
      const compressedDataUrl = await compressImageFile(file, 1600, 0.80);

      if (!newDocName.trim()) {
        const dateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
        const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        setNewDocName(`Foto Plano ${unitName} - ${dateStr} ${timeStr}`);
      }
      setNewDocType('image');

      setUploadStatusText('Subiendo plano a tu cuenta de Google Drive...');
      const cleanFileName = `Plano_${unitName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.jpg`;
      const uploadRes = await uploadFileToDrive({
        base64: compressedDataUrl,
        filename: cleanFileName,
        mimeType: 'image/jpeg'
      });

      if (uploadRes.success && uploadRes.url) {
        setNewDocUrl(uploadRes.url);
      } else {
        console.warn('Aviso Google Drive en captura:', uploadRes.error);
        setNewDocUrl(compressedDataUrl);
      }
    } catch (err) {
      console.error('Error al capturar foto de plano:', err);
      alert('Error al procesar la foto tomada de la cámara');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  // 2. Cargar archivo desde el dispositivo (PDF, JPG, PNG)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);

    if (!newDocName.trim()) {
      setNewDocName(file.name.replace(/\.[^/.]+$/, ''));
    }
    setNewDocType(isPdf ? 'pdf' : isImg ? 'image' : 'link');

    try {
      let finalDataUrl = '';
      if (isImg) {
        setUploadStatusText('Optimizando imagen...');
        finalDataUrl = await compressImageFile(file, 1600, 0.80);
      } else {
        setUploadStatusText('Leyendo archivo...');
        finalDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setUploadStatusText('Subiendo archivo a tu cuenta de Google Drive...');
      const uploadRes = await uploadFileToDrive({
        base64: finalDataUrl,
        filename: file.name,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg')
      });

      if (uploadRes.success && uploadRes.url) {
        setNewDocUrl(uploadRes.url);
      } else {
        console.warn('Aviso Google Drive en carga de archivo:', uploadRes.error);
        setNewDocUrl(finalDataUrl);
      }
    } catch (err) {
      console.error('Error al cargar archivo:', err);
      alert('Error al leer el archivo seleccionado');
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocUrl.trim()) return;

    onAddBlueprint({
      name: newDocName.trim(),
      category: newDocCategory,
      type: newDocType,
      url: newDocUrl.trim(),
      cadViewerUrl: newDocType === 'cad' ? newDocUrl.trim() : undefined
    });

    setNewDocName('');
    setNewDocUrl('');
    setUploadStatusText('');
    setIsAddingDoc(false);
    setZoomLevel(1);
  };

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'arquitectura', label: 'Arquitectura' },
    { id: 'estructura', label: 'Estructuras' },
    { id: 'sanitaria', label: 'Sanitaria' },
    { id: 'electrica', label: 'Eléctrica' },
    { id: 'gas', label: 'Gas' },
    { id: 'otro', label: 'Otros' }
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 no-print animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col h-[92vh] max-h-[95vh] overflow-hidden">
        {/* Header with PINNED [X] and flexible title */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-shrink-0 gap-2 select-none">
          <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                <h3 className="font-black text-white text-sm sm:text-base leading-tight truncate">
                  Planos y Documentación
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 truncate max-w-[120px] xs:max-w-[180px]">
                  {unitName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {projectName} • Cotejo de planos e instalaciones en terreno
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 z-20">
            <button
              onClick={() => setIsAddingDoc(prev => !prev)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 sm:gap-1.5 shadow-sm active:scale-95 transition-all touch-target shrink-0"
              title={isAddingDoc ? 'Ver Documentos' : 'Cargar nuevo plano'}
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">{isAddingDoc ? 'Ver Planos' : 'Agregar Plano'}</span>
              <span className="xs:hidden">{isAddingDoc ? 'Ver' : 'Plano'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white border border-slate-700 transition-all touch-target shrink-0 z-20 flex items-center justify-center active:scale-95 shadow-xs"
              title="Cerrar ventana de planos"
              aria-label="Cerrar planos"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Categories Bar: HORIZONTALLY SCROLLABLE WITH TOUCH (Allows finger sliding smoothly) */}
        <div
          className="px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-900/90 flex items-center gap-1.5 overflow-x-auto touch-pan-x scrollbar-none flex-shrink-0 scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
          <span className="ml-auto text-[11px] font-bold text-slate-500 flex-shrink-0 pl-2">
            {blueprints.length} {blueprints.length === 1 ? 'doc' : 'docs'}
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Viewer Area */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-3 overflow-hidden flex flex-col items-center justify-center relative">
            {isAddingDoc ? (
              /* Add Document Form Overlay */
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-scale-up max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-500" />
                    Cargar Nuevo Plano o Enlace CAD / 3D
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingDoc(false);
                      setNewDocUrl('');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* HIDDEN INPUTS FOR CAMERA AND DEVICE */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture={isTouchDevice ? 'environment' : undefined}
                  onChange={handleCameraCapture}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* SOURCE SELECTOR BUTTONS */}
                <div className="mb-4">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">
                    Selecciona cómo cargar el plano:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Botón 1: Sacar Foto Directa */}
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => cameraInputRef.current?.click()}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-target ${
                        newDocType === 'image' && newDocUrl
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-amber-500/60 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black leading-tight text-center">Sacar Foto</span>
                      <span className="text-[9px] text-slate-400 font-medium text-center">Cámara directa</span>
                    </button>

                    {/* Botón 2: Subir desde Dispositivo */}
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-target ${
                        newDocType === 'pdf' || (newDocType === 'image' && !newDocUrl)
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500 font-bold shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-cyan-500/60 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                        <Upload className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black leading-tight text-center">Dispositivo</span>
                      <span className="text-[9px] text-slate-400 font-medium text-center">PDF o Imagen</span>
                    </button>

                    {/* Botón 3: Enlace CAD / 3D */}
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setNewDocType('cad');
                      }}
                      className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 touch-target ${
                        newDocType === 'cad' || newDocType === 'link'
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500/60 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-black leading-tight text-center">Enlace CAD</span>
                      <span className="text-[9px] text-slate-400 font-medium text-center">3D / Web</span>
                    </button>
                  </div>
                </div>

                {/* UPLOADING PROGRESS STATE */}
                {isUploading && (
                  <div className="p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 animate-pulse">
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-amber-500">
                        {uploadStatusText || 'Procesando archivo...'}
                      </p>
                      <p className="text-[10px] text-slate-400">Optimizando legibilidad y sincronizando...</p>
                    </div>
                  </div>
                )}

                {/* PREVIEW OF CAPTURED PHOTO / LOADED FILE */}
                {!isUploading && newDocUrl && (newDocType === 'image' || newDocType === 'pdf') && (
                  <div className="mb-3.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                    {newDocType === 'image' ? (
                      <div className="w-14 h-14 rounded-lg bg-black/10 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 flex items-center justify-center">
                        <img src={newDocUrl} alt="Vista previa plano" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/30">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{newDocType === 'image' ? 'Foto de plano lista' : 'Documento cargado'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {newDocName || 'Documento listo para guardar'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 touch-target"
                        >
                          <Camera className="w-3 h-3" /> Tomar otra foto
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 touch-target"
                        >
                          <Upload className="w-3 h-3" /> Cambiar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Nombre o Identificador del Plano
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Plano Sanitario Depto 3B o Instalación Eléctrica"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Especialidad
                      </label>
                      <select
                        value={newDocCategory}
                        onChange={(e) => setNewDocCategory(e.target.value as any)}
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="arquitectura">Arquitectura</option>
                        <option value="estructura">Estructuras</option>
                        <option value="sanitaria">Sanitaria</option>
                        <option value="electrica">Eléctrica</option>
                        <option value="gas">Gas</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                        Tipo de Formato
                      </label>
                      <select
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value as any)}
                        className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="image">Foto / Imagen (Cámara, JPG, PNG)</option>
                        <option value="pdf">Archivo PDF</option>
                        <option value="cad">Enlace CAD 3D / DWG</option>
                        <option value="link">Enlace Web / Nube</option>
                      </select>
                    </div>
                  </div>

                  {newDocType === 'cad' || newDocType === 'link' ? (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300">
                        Enlace al Visor Web (Autodesk Viewer / ShareCAD / Drive)
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://viewer.autodesk.com/... o enlace compartido"
                        value={newDocUrl}
                        onChange={(e) => setNewDocUrl(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                      <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-slate-600 dark:text-slate-300">
                          ¿Prefieres tomar una foto del plano físico?
                        </span>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 inline-flex items-center gap-1 active:scale-95"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Sacar Foto</span>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingDoc(false);
                        setNewDocUrl('');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading || !newDocName.trim() || !newDocUrl.trim()}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Guardar Plano</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : activeDoc ? (
              /* Active Document Display */
              <div className="w-full h-full flex flex-col">
                {/* Floating controls for active doc */}
                <div
                  className="flex items-center justify-between gap-1.5 pb-2 overflow-x-auto touch-pan-x scrollbar-none flex-shrink-0"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                      {activeDoc.name}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {activeDoc.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {activeDoc.type === 'image' && (
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs mr-1 shrink-0">
                        <button
                          onClick={handleZoomIn}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:text-amber-500 touch-target"
                          title="Acercar (+)"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] font-mono font-bold px-1 text-slate-500">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          onClick={handleZoomOut}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:text-amber-500 touch-target"
                          title="Alejar (-)"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleResetZoom}
                          className="p-1 text-slate-600 dark:text-slate-300 hover:text-amber-500 touch-target"
                          title="Restablecer (100%)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <a
                      href={activeDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 hover:text-amber-500 shadow-xs shrink-0 touch-target"
                      title="Abrir en pantalla completa o visor externo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Abrir</span>
                    </a>

                    <button
                      onClick={() => onDeleteBlueprint(activeDoc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0 touch-target"
                      title="Eliminar este plano"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Viewer Canvas / Frame */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto flex items-center justify-center relative p-2">
                  {activeDoc.type === 'pdf' ? (
                    <iframe
                      src={activeDoc.url}
                      title={activeDoc.name}
                      className="w-full h-full rounded-lg border-0"
                    />
                  ) : activeDoc.type === 'image' ? (
                    <div className="w-full h-full overflow-auto flex items-center justify-center">
                      <img
                        src={activeDoc.url}
                        alt={activeDoc.name}
                        style={{
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: 'center center',
                          transition: 'transform 0.15s ease-out'
                        }}
                        className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing rounded shadow"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <Compass className="w-16 h-16 text-amber-500 mx-auto mb-3" />
                      <h5 className="font-black text-slate-900 dark:text-white text-base">
                        Modelo CAD / 3D Externo
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        Este archivo está configurado para visualizarse en la plataforma CAD 3D de alta precisión.
                      </p>
                      <a
                        href={activeDoc.cadViewerUrl || activeDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir en Visor CAD 3D (Autodesk / ShareCAD)</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center p-8">
                <Compass className="w-14 h-14 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h5 className="font-black text-slate-700 dark:text-slate-300 text-sm">
                  Sin planos registrados en esta sección
                </h5>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Puedes adjuntar planos en formato PDF, imágenes de planos o enlaces CAD 3D.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => {
                      setIsAddingDoc(true);
                      setTimeout(() => cameraInputRef.current?.click(), 120);
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Sacar Foto del Plano</span>
                  </button>
                  <button
                    onClick={() => setIsAddingDoc(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm border border-slate-700 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cargar Archivo / CAD</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lateral Document List / Thumbnails */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 max-h-44 md:max-h-none overflow-y-auto flex-shrink-0 touch-pan-y">
            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Índice de Planos ({filteredDocs.length})
            </h5>

            {filteredDocs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-600 italic">No hay planos para mostrar</p>
            ) : (
              <div className="space-y-2">
                {filteredDocs.map(doc => {
                  const isSelected = activeDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setIsAddingDoc(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-slate-900 dark:text-white shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                          {doc.type === 'pdf' ? (
                            <FileText className="w-4 h-4" />
                          ) : doc.type === 'image' ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <Compass className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-tight">
                            {doc.name}
                          </p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {doc.category || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
