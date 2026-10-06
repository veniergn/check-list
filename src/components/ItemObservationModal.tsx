import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Trash2,
  Calendar,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Upload,
  MessageSquare,
  Sparkles,
  Check,
  ShieldAlert,
  Info,
  Download,
  Pencil
} from 'lucide-react';
import { InspectionItem } from '../types';
import { compressImageFile } from '../utils/calculations';

interface ItemObservationModalProps {
  isOpen: boolean;
  tradeId: string;
  tradeName: string;
  item: InspectionItem | null;
  onClose: () => void;
  onSaveObservation: (
    tradeId: string,
    itemId: string,
    comment: string,
    severity: 'low' | 'medium' | 'high' | undefined,
    isExplicitDelete?: boolean
  ) => void;
  onAddPhoto: (tradeId: string, itemId: string, dataUrl: string) => void;
  onDeletePhoto: (tradeId: string, itemId: string, photoId: string) => void;
  onEditItem?: (tradeId: string, itemId: string, newName: string) => void;
}

export function ItemObservationModal({
  isOpen,
  tradeId,
  tradeName,
  item,
  onClose,
  onSaveObservation,
  onAddPhoto,
  onDeletePhoto,
  onEditItem
}: ItemObservationModalProps) {
  const [commentDraft, setCommentDraft] = useState('');
  const [severityDraft, setSeverityDraft] = useState<'low' | 'medium' | 'high' | undefined>(undefined);
  const [isCompressing, setIsCompressing] = useState(false);
  const [activePhotoPreview, setActivePhotoPreview] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [currentName, setCurrentName] = useState(item?.name || '');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isMobileDevice = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));

  useEffect(() => {
    if (item) {
      setCommentDraft(item.comment || '');
      setSeverityDraft(item.severity);
      setCurrentName(item.name);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const photos = item.photos || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 800, 0.72);
        onAddPhoto(tradeId, item.id, compressedBase64);
      }
    } catch (err) {
      console.error('Error al procesar foto:', err);
    } finally {
      setIsCompressing(false);
      // Reset input value so same photo can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleDownloadPhoto = (dataUrl: string, index?: number) => {
    try {
      const cleanItemName = (item?.name || 'evidencia').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
      const suffix = index !== undefined ? `_${index + 1}` : '';
      const fileName = `Foto_${cleanItemName}${suffix}.jpg`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error al descargar imagen:', err);
    }
  };

  const handleSave = () => {
    const trimmed = commentDraft.trim();
    const origComment = (item.comment || '').trim();
    const origSeverity = item.severity;

    const hasChanged = trimmed !== origComment || severityDraft !== origSeverity;

    if (hasChanged) {
      onSaveObservation(tradeId, item.id, trimmed, severityDraft, false);
    }
    onClose();
  };

  const handleDeleteObservation = () => {
    setCommentDraft('');
    setSeverityDraft(undefined);
    onSaveObservation(tradeId, item.id, '', undefined, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print overflow-y-auto">
      <div className="bg-slate-900 text-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border-t-4 border-amber-500 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                {tradeName}
              </span>
              {severityDraft && (
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                    severityDraft === 'high'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : severityDraft === 'medium'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {severityDraft === 'high' && <Flame className="w-2.5 h-2.5" />}
                  {severityDraft === 'medium' && <AlertTriangle className="w-2.5 h-2.5" />}
                  {severityDraft === 'low' && <CheckCircle2 className="w-2.5 h-2.5" />}
                  Severidad: {severityDraft === 'high' ? 'Crítica' : severityDraft === 'medium' ? 'Media' : 'Leve'}
                </span>
              )}
            </div>
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = titleDraft.trim();
                      if (trimmed && onEditItem) {
                        onEditItem(tradeId, item.id, trimmed);
                        setCurrentName(trimmed);
                      }
                      setIsEditingTitle(false);
                    }
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="flex-1 bg-slate-950 border-2 border-[#00f2fe] rounded-lg px-2 py-0.5 text-xs text-white font-bold focus:outline-none shadow-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = titleDraft.trim();
                    if (trimmed && onEditItem) {
                      onEditItem(tradeId, item.id, trimmed);
                      setCurrentName(trimmed);
                    }
                    setIsEditingTitle(false);
                  }}
                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <h3 className="font-bold text-white text-sm truncate">
                  {currentName}
                </h3>
                {onEditItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleDraft(currentName);
                      setIsEditingTitle(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-[#00f2fe] hover:bg-slate-800 transition-colors"
                    title="Editar nombre de la tarea"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white border border-slate-700 transition-all touch-target shrink-0 z-20 flex items-center justify-center active:scale-95 shadow-xs"
            title="Cerrar ventana de observación"
            aria-label="Cerrar observación"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-slate-900">
          {/* Severity Selector */}
          <div>
            <label className="block text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Clasificación de Severidad
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverityDraft(severityDraft === 'low' ? undefined : 'low')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  severityDraft === 'low'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/50 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black">Leve</span>
                <span className="text-[9px] text-slate-400 leading-tight">Detalle estético</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityDraft(severityDraft === 'medium' ? undefined : 'medium')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  severityDraft === 'medium'
                    ? 'bg-amber-950/80 border-amber-400 text-amber-300 ring-2 ring-amber-500/50 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black">Medio</span>
                <span className="text-[9px] text-slate-400 leading-tight">Falta terminación</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityDraft(severityDraft === 'high' ? undefined : 'high')}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  severityDraft === 'high'
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 ring-2 ring-rose-500/60 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black">Crítico</span>
                <span className="text-[9px] text-slate-400 leading-tight">Riesgo o falla</span>
              </button>
            </div>
          </div>

          {/* Technical Note Textarea */}
          <div>
            <label className="block text-xs font-black text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="relative flex items-center">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  {Boolean(commentDraft && commentDraft.trim()) && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  )}
                </span>
                Detalle Técnico u Observación
              </span>
              {commentDraft && (
                <button
                  type="button"
                  onClick={() => setCommentDraft('')}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Limpiar texto
                </button>
              )}
            </label>
            <textarea
              rows={3}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Ej: Falta sellar zócalo perimetral, revoque con fisura en vértice o pendiente de pintura final..."
              className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed font-medium"
            />

            {/* Quick Suggestions Chips */}
            <div className="mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                Sugerencias rápidas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Falta sellar zócalo',
                  'Revoque con fisura',
                  'Revisar nivelación / plomo',
                  'Mancha de humedad / filtración',
                  'Falta pintura 2° mano',
                  'Listo para verificación'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCommentDraft(prev => (prev ? `${prev}. ${preset}` : preset));
                      if (!severityDraft && (preset.includes('fisura') || preset.includes('filtración'))) {
                        setSeverityDraft('high');
                      } else if (!severityDraft) {
                        setSeverityDraft('medium');
                      }
                    }}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 font-medium transition-colors select-none active:scale-95"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Photographic Evidence Section */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                Evidencia Fotográfica ({photos.length})
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Compresión automática en Base64
              </span>
            </div>

            {/* Hidden Inputs for Camera and Gallery */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture={isMobileDevice ? 'environment' : undefined}
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Camera / Upload Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isCompressing}
                onClick={() => cameraInputRef.current?.click()}
                className="p-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 touch-target"
              >
                <Camera className="w-4 h-4" />
                <span>{isCompressing ? 'Procesando...' : (isMobileDevice ? 'Tomar con Cámara' : 'Subir Foto')}</span>
              </button>

              <button
                type="button"
                disabled={isCompressing}
                onClick={() => galleryInputRef.current?.click()}
                className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95 touch-target"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>{isMobileDevice ? 'Subir de Galería' : 'Examinar Archivos'}</span>
              </button>
            </div>

            {/* Photos List Grid */}
            {photos.length === 0 ? (
              <div className="mt-3 p-4 bg-slate-950/60 rounded-xl border border-dashed border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Sin fotos registradas. Puedes capturar fallas o avances como evidencia visual.
                </p>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 group shadow-sm flex flex-col"
                  >
                    <div
                      onClick={() => setActivePhotoPreview(photo.dataUrl)}
                      className="cursor-pointer h-28 bg-black flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Evidencia ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    <div className="p-1.5 flex items-center justify-between bg-slate-950 text-[10px] text-slate-400 border-t border-slate-800/80">
                      <span className="font-mono truncate">{photo.timestamp || `#${index + 1}`}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPhoto(photo.dataUrl, index);
                          }}
                          className="text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-amber-950/50 transition-colors"
                          title="Descargar foto"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePhoto(tradeId, item.id, photo.id);
                          }}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/50 transition-colors"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          {item.comment ? (
            <button
              type="button"
              onClick={handleDeleteObservation}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-2 rounded-xl hover:bg-rose-950/40 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar Nota</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors touch-target"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow flex items-center gap-1.5 transition-all active:scale-95 touch-target"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Size Photo Preview Modal */}
      {activePhotoPreview && (
        <div
          onClick={() => setActivePhotoPreview(null)}
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-2 sm:p-6"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => handleDownloadPhoto(activePhotoPreview)}
              className="text-amber-400 hover:text-amber-300 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              title="Descargar esta fotografía"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setActivePhotoPreview(null)}
              className="text-white p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 shadow-lg active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={activePhotoPreview}
            alt="Vista ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
