import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Flag,
  Calendar,
  Check,
  Camera,
  Trash2,
  Maximize2,
  MessageSquare,
  Percent,
  Sliders,
  Flame,
  CheckCircle2,
  Image as ImageIcon,
  ExternalLink,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Milestone } from '../types';
import { formatPMDate, getDaysDiff } from '../utils/pmCalculations';

export interface MilestoneDetailModalProps {
  isOpen: boolean;
  milestone: Milestone | null;
  projectId: string;
  projectName?: string;
  neonColor?: string;
  onClose: () => void;
  onSaveMilestone: (projectId: string, milestone: Milestone) => void;
  onOpenAdvancedConfig?: (projectId: string) => void;
  onShowToast?: (message: string, icon?: string) => void;
}

export function MilestoneDetailModal({
  isOpen,
  milestone,
  projectId,
  projectName,
  neonColor = '#00f2fe',
  onClose,
  onSaveMilestone,
  onOpenAdvancedConfig,
  onShowToast
}: MilestoneDetailModalProps) {
  const [progress, setProgress] = useState<number>(0);
  const [comments, setComments] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (milestone) {
      const initialProgress =
        milestone.progressPercentage !== undefined
          ? milestone.progressPercentage
          : milestone.progress !== undefined
          ? milestone.progress
          : milestone.manualCompleted || milestone.completed
          ? 100
          : 0;
      setProgress(initialProgress);
      setComments(milestone.comments || milestone.notes || '');
      setPhotos(milestone.photos || []);
      setPreviewImage(null);
    }
  }, [milestone]);

  if (!isOpen || !milestone) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const targetDate = milestone.targetDate || milestone.endDate || '';
  const daysDiff = targetDate ? getDaysDiff(targetDate, todayStr) : 0;
  const isCompleted = progress >= 100;
  const isOverdue = daysDiff < 0 && !isCompleted;
  const isApproaching = daysDiff >= 0 && daysDiff <= 3;
  const hasNoProgress = progress === 0;

  // Compresión de imagen en cliente con Canvas
  const processImageFile = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_DIM = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImage(true);
    try {
      const compressedList: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const compressed = await processImageFile(file);
          compressedList.push(compressed);
        }
      }

      setPhotos((prev) => [...prev, ...compressedList]);
      if (onShowToast) {
        onShowToast(`${compressedList.length} foto(s) agregada(s) al hito`, 'Camera');
      }
    } catch (err) {
      console.error('Error procesando fotos del hito:', err);
      if (onShowToast) {
        onShowToast('Error al procesar las fotos', 'AlertTriangle');
      }
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = () => {
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
    const updatedMilestone: Milestone = {
      ...milestone,
      progressPercentage: clampedProgress,
      progress: clampedProgress,
      manualCompleted: clampedProgress >= 100,
      completed: clampedProgress >= 100,
      comments: comments.trim() || undefined,
      notes: comments.trim() || milestone.notes,
      photos: photos.length > 0 ? photos : undefined
    };

    onSaveMilestone(projectId, updatedMilestone);
    if (onShowToast) {
      onShowToast(`Hito "${milestone.name}" actualizado con éxito`, 'Check');
    }
    onClose();
  };

  const modalContent = (
    <>
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
        style={{ zIndex: 99999 }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl bg-[#101D30] border border-[#29384C]/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] sm:max-h-[88vh] text-left animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. CABECERA: TÍTULO, ESTADO Y FECHAS */}
          <div className="p-3.5 sm:p-5 border-b border-[#29384C] bg-[#101D30] flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: isCompleted
                    ? 'rgba(16, 185, 129, 0.15)'
                    : isOverdue || (isApproaching && hasNoProgress)
                    ? 'rgba(244, 63, 94, 0.15)'
                    : 'rgba(6, 182, 212, 0.15)',
                  borderColor: isCompleted
                    ? 'rgba(16, 185, 129, 0.3)'
                    : isOverdue || (isApproaching && hasNoProgress)
                    ? 'rgba(244, 63, 94, 0.3)'
                    : 'rgba(6, 182, 212, 0.3)'
                }}
              >
                <Flag
                  className="w-5 h-5"
                  style={{
                    color: isCompleted
                      ? '#10b981'
                      : isOverdue || (isApproaching && hasNoProgress)
                      ? '#f43f5e'
                      : neonColor
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#17263B] text-cyan-300 border border-[#29384C]">
                    Hito de Obra
                  </span>
                  {milestone.buildingPart && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#17263B]/80 text-slate-300">
                      {milestone.buildingPart}
                    </span>
                  )}
                  {milestone.tradeCategory && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#17263B]/60 text-[#94A3B8]">
                      {milestone.tradeCategory}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug truncate">
                  {milestone.name}
                </h3>

                <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Límite: {targetDate ? formatPMDate(targetDate) : 'Sin fecha'}</span>
                  </span>

                  {targetDate && (
                    <span
                      className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isOverdue
                          ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                          : isApproaching
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-[#17263B] text-[#94A3B8]'
                      }`}
                    >
                      {isCompleted
                        ? 'Completado'
                        : isOverdue
                        ? `Atraso de ${Math.abs(daysDiff)} días`
                        : daysDiff === 0
                        ? '¡Vence Hoy!'
                        : `Quedan ${daysDiff} días`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors shrink-0"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2. CONTENIDO PRINCIPAL SCROLLEABLE */}
          <div className="p-3.5 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
            {/* SECCIÓN 1: PORCENTAJE DE AVANCE */}
            <div className="bg-[#17263B]/50 border border-[#29384C]/70 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Porcentaje de Avance
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all ${
                    isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : progress > 0
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-[#17263B] text-[#94A3B8] border-[#29384C]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Percent className="w-3.5 h-3.5" />
                  )}
                  <span>{progress}%</span>
                </div>
              </div>

              {/* Slider de Avance */}
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-2.5 bg-[#101D30] rounded-lg"
              />

              {/* Botones de Acceso Rápido */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {[0, 25, 50, 75, 90, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setProgress(pct)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                      progress === pct
                        ? 'bg-cyan-500 text-slate-950 shadow-md scale-105'
                        : 'bg-[#101D30]/80 text-slate-300 hover:text-white hover:bg-[#17263B] border border-[#29384C]/80'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Explicación de Color en el Gantt */}
              <div className="text-[11px] font-medium pt-1 text-[#94A3B8]">
                {isCompleted ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    ✓ Hito completado: Se visualiza en verde esmeralda en el Gantt.
                  </span>
                ) : progress > 0 ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    ⚡ {progress}% de avance registrado: Se verá activo en curso.
                  </span>
                ) : (
                  <span className="text-[#94A3B8] flex items-center gap-1">
                    ⚠️ 0% Sin avance: Si está cerca del vencimiento, titilará en rojo como alerta crítica.
                  </span>
                )}
              </div>
            </div>

            {/* SECCIÓN 2: COMENTARIOS Y OBSERVACIONES TÉCNICAS */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Comentarios y Observaciones Técnicas</span>
              </label>

              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Escribe aquí los comentarios, bitácora de inspección, justificaciones técnicas o detalles del hito..."
                className="w-full bg-slate-950/80 border border-[#29384C]/90 rounded-2xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
              />
            </div>

            {/* SECCIÓN 3: FOTOS Y EVIDENCIAS FOTOGRÁFICAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Fotos y Evidencias ({photos.length})</span>
                </label>

                {/* Botón para Cargar Fotos */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isProcessingImage ? 'Procesando...' : 'Tomar / Subir Fotos'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
              </div>

              {/* Galería de Fotos Subidas */}
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-[#29384C]/80 bg-slate-950 shadow-md cursor-pointer hover:border-cyan-400 transition-all"
                      onClick={() => setPreviewImage(photo)}
                    >
                      <img
                        src={photo}
                        alt={`Evidencia ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />

                      {/* Overlay con Botones de Acción */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(photo);
                          }}
                          className="p-1.5 rounded-lg bg-[#101D30]/80 text-white hover:text-cyan-400 transition-colors"
                          title="Ampliar foto"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(idx);
                          }}
                          className="p-1.5 rounded-lg bg-rose-900/80 text-rose-300 hover:text-rose-100 transition-colors"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#29384C]/80 rounded-2xl p-6 text-center cursor-pointer hover:border-cyan-500/60 hover:bg-[#17263B]/30 transition-all flex flex-col items-center justify-center gap-2 text-[#94A3B8]"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#17263B] flex items-center justify-center text-slate-500">
                    <Camera className="w-5 h-5 text-[#94A3B8]" />
                  </div>
                  <p className="text-xs font-bold text-slate-300">
                    No hay fotos adjuntas a este hito
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Haz clic aquí o en "Tomar / Subir Fotos" para adjuntar evidencia fotográfica de terreno
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. PIE DE ACCIONES: CANCELAR, CONFIGURACIÓN AVANZADA Y GUARDAR */}
          <div className="p-3.5 sm:p-4 border-t border-[#29384C] bg-[#101D30] flex items-center justify-between gap-2 shrink-0">
            <div>
              {onOpenAdvancedConfig && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAdvancedConfig(projectId);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-cyan-400 hover:bg-[#17263B] transition-colors flex items-center gap-1.5"
                  title="Abrir configuración general de hitos"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Configuración Completa</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-[#17263B] transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-black bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Hito</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LIGHTBOX PARA PREVISUALIZAR FOTO EN PANTALLA COMPLETA */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in"
          style={{ zIndex: 100000 }}
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="p-2.5 rounded-2xl bg-[#17263B] text-white hover:bg-[#1f324d] transition-colors shadow-lg"
              title="Cerrar vista completa"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-[#29384C]/80 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Vista completa de evidencia"
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
