import React, { useRef, useState } from 'react';
import { X, Camera, Trash2, Calendar, Plus, MessageSquare, Upload, Download } from 'lucide-react';
import { InspectionItem } from '../types';
import { compressImageFile } from '../utils/calculations';

interface PhotoViewerModalProps {
  isOpen: boolean;
  tradeName: string;
  item: InspectionItem | null;
  onClose: () => void;
  onTriggerCamera: () => void;
  onDeletePhoto: (photoId: string) => void;
  onAddPhoto?: (dataUrl: string) => void;
}

export function PhotoViewerModal({
  isOpen,
  tradeName,
  item,
  onClose,
  onTriggerCamera,
  onDeletePhoto,
  onAddPhoto
}: PhotoViewerModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isMobileDevice = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));

  if (!isOpen || !item) return null;

  const photos = item.photos || [];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBase64 = await compressImageFile(file, 800, 0.72);
        if (onAddPhoto) {
          onAddPhoto(compressedBase64);
        }
      }
    } catch (err) {
      console.error('Error al procesar foto:', err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleDownloadPhoto = (dataUrl: string, index: number) => {
    try {
      const cleanItemName = (item?.name || 'evidencia').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_');
      const fileName = `Foto_${cleanItemName}_${index + 1}.jpg`;
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

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      {/* Hidden file inputs for direct camera and gallery upload */}
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

      <div className="bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border-t-4 border-amber-500 overflow-hidden">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                {tradeName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'}
              </span>
            </div>
            <h3 className="font-bold text-white text-sm truncate mt-0.5">
              {item.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-white border border-slate-700 transition-all touch-target shrink-0 z-20 flex items-center justify-center active:scale-95 shadow-xs"
            title="Cerrar visor de fotos"
            aria-label="Cerrar fotos"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Scrollable Photo Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-slate-900">
          {/* Observation Note if exists */}
          {item.comment && (
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-2 shadow-xs">
              <div className="relative mt-0.5 flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Observación Técnica Registrada:
                </span>
                <p className="mt-0.5 text-slate-200 leading-relaxed font-medium">
                  {item.comment}
                </p>
              </div>
            </div>
          )}
          {photos.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-800/60 rounded-2xl border border-dashed border-slate-700">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 mb-3">
                <Camera className="w-7 h-7" />
              </div>
              <h4 className="text-white font-bold text-sm">Sin fotografías de registro</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Toma una foto en terreno con la cámara o sube desde la galería de tu celular o notebook para guardar evidencia en la nube.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4 max-w-xs mx-auto">
                <button
                  disabled={isProcessing}
                  onClick={() => cameraInputRef.current ? cameraInputRef.current.click() : onTriggerCamera()}
                  className="px-3 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 touch-target active:scale-95 shadow transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>{isProcessing ? 'Procesando...' : (isMobileDevice ? 'Cámara' : 'Subir Foto')}</span>
                </button>
                <button
                  disabled={isProcessing}
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 touch-target active:scale-95 transition-all"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{isMobileDevice ? 'Galería' : 'Examinar PC'}</span>
                </button>
              </div>
            </div>
          ) : (
            photos.map((photo, index) => (
              <div
                key={photo.id}
                className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-md flex flex-col"
              >
                <div className="relative bg-black flex items-center justify-center max-h-72 overflow-hidden group">
                  <img
                    src={photo.dataUrl}
                    alt={`Evidencia ${index + 1}`}
                    className="w-full object-contain max-h-72"
                  />
                  <span className="absolute top-2 left-2 bg-slate-950/80 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Foto {index + 1} de {photos.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDownloadPhoto(photo.dataUrl, index)}
                    className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-900 text-amber-400 border border-amber-500/40 p-1.5 rounded-full shadow-lg backdrop-blur-xs active:scale-95 transition-all"
                    title="Descargar esta foto"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-950 flex items-center justify-between border-t border-slate-800">
                  <div className="flex items-center text-slate-400 text-xs gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono text-[11px] text-slate-300">
                      {photo.timestamp || 'Fecha no registrada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPhoto(photo.dataUrl, index)}
                      className="text-amber-400 hover:text-amber-300 active:scale-90 text-xs font-bold flex items-center gap-1 touch-target px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                      title="Descargar imagen a tu dispositivo"
                    >
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePhoto(photo.id)}
                      className="text-rose-400 hover:text-rose-300 active:scale-90 text-xs font-bold flex items-center gap-1 touch-target px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-800/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2 items-center">
          <button
            disabled={isProcessing}
            onClick={() => cameraInputRef.current ? cameraInputRef.current.click() : onTriggerCamera()}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg touch-target transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>{isProcessing ? 'Procesando...' : (isMobileDevice ? 'Tomar Foto' : 'Subir Foto')}</span>
          </button>
          <button
            disabled={isProcessing}
            onClick={() => galleryInputRef.current?.click()}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 touch-target transition-all"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>{isMobileDevice ? 'Subir Galería' : 'Examinar PC'}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl touch-target"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
