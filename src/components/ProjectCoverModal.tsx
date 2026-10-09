import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Move,
  ZoomIn,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Project } from '../types';
import { compressImageFile } from '../utils/calculations';

interface ProjectCoverModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSaveCover: (
    projectId: string,
    coverUrl: string,
    position?: { x: number; y: number; zoom: number }
  ) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

// Preset high-fidelity architectural cover options
const ARCHITECTURAL_PRESET_COVERS = [
  {
    name: 'Edificio Residencial Moderno',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Fachada Vanguardista & Vidrio',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Estructura en Hormigón Visto',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Complejo Residencial & Luces',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Obra en Ejecución & Grúas',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&auto=format&fit=crop&q=80'
  },
  {
    name: 'Torre Contemporánea al Atardecer',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=1600&auto=format&fit=crop&q=80'
  }
];

export function ProjectCoverModal({
  isOpen,
  project,
  onClose,
  onSaveCover,
  onShowToast
}: ProjectCoverModalProps) {
  if (!isOpen || !project) return null;

  const currentCover = project.coverImageUrl || project.developerLogoUrl || ARCHITECTURAL_PRESET_COVERS[0].url;
  const currentPos = project.coverImagePosition || { x: 50, y: 50, zoom: 100 };

  const [previewUrl, setPreviewUrl] = useState<string>(currentCover);
  const [posX, setPosX] = useState<number>(currentPos.x);
  const [posY, setPosY] = useState<number>(currentPos.y);
  const [zoom, setZoom] = useState<number>(currentPos.zoom);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      onShowToast?.('Optimizando fotografía...', 'Camera');
      const compressed = await compressImageFile(file, 1600, 0.85);
      setPreviewUrl(compressed);
      setPosX(50);
      setPosY(50);
      setZoom(100);
      onShowToast?.('Fotografía cargada para encuadre', 'Check');
    } catch (err) {
      console.error('Error cargando imagen de portada:', err);
      onShowToast?.('Error al procesar la imagen', 'AlertCircle');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    onSaveCover(project.id, previewUrl, { x: posX, y: posY, zoom });
    onShowToast?.(`Imagen de portada guardada para "${project.name}"`, 'Check');
    onClose();
  };

  const handleRestoreDefault = () => {
    const defaultCover = ARCHITECTURAL_PRESET_COVERS[0].url;
    setPreviewUrl(defaultCover);
    setPosX(50);
    setPosY(50);
    setZoom(100);
    onShowToast?.('Valores predeterminados restaurados en vista previa', 'RotateCcw');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#101D30] border border-[#29384C] rounded-3xl p-6 shadow-2xl space-y-5 text-[#F8FAFC] max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                Imagen de Portada — {project.name}
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Reemplaza la fotografía principal de presentación y ajusta su encuadre
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Frame (Matching the Hero Banner Aspect Ratio) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span className="font-bold flex items-center gap-1.5 text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Vista Previa de Encuadre
            </span>
            <span className="text-[10px]">Relación 16:9 • Proporción adaptativa</span>
          </div>

          <div className="w-full h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-[#29384C] relative bg-[#081321] shadow-inner">
            <div
              className="w-full h-full bg-cover bg-no-repeat transition-all"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundPosition: `${posX}% ${posY}%`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: `${posX}% ${posY}%`
              }}
            />

            {/* Subtle architectural overlay badge */}
            <div className="absolute bottom-3 left-3 bg-[#101D30]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#29384C] flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-black text-white">{project.name}</span>
            </div>
          </div>
        </div>

        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-blue-500/50 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 text-[#F8FAFC]"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Subir desde dispositivo</span>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="p-3 rounded-2xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] hover:border-blue-500/50 flex items-center justify-center gap-2 text-xs font-bold transition-all active:scale-95 text-[#F8FAFC]"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Tomar foto con cámara</span>
          </button>
        </div>

        {/* Framing & Position Sliders */}
        <div className="bg-[#081321] p-4 rounded-2xl border border-[#29384C] space-y-3.5">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Ajustes de Encuadre y Zoom</span>
            <span className="text-[10px] text-slate-500">Sin deformación proporcional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Horizontal Position X */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Posición Horizontal (X)</span>
                <span className="font-mono">{posX}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={posX}
                onChange={(e) => setPosX(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-[#17263B] rounded-lg cursor-pointer"
              />
            </div>

            {/* Vertical Position Y */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Posición Vertical (Y)</span>
                <span className="font-mono">{posY}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={posY}
                onChange={(e) => setPosY(Number(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-[#17263B] rounded-lg cursor-pointer"
              />
            </div>

            {/* Zoom */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Escala / Zoom</span>
                <span className="font-mono">{zoom}%</span>
              </div>
              <input
                type="range"
                min="100"
                max="180"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-[#17263B] rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Architectural Presets Gallery */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#94A3B8]">
            O seleccionar de la galería arquitectónica:
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ARCHITECTURAL_PRESET_COVERS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPreviewUrl(preset.url);
                  setPosX(50);
                  setPosY(50);
                  setZoom(100);
                }}
                className={`h-16 rounded-xl overflow-hidden border-2 transition-all relative group ${
                  previewUrl === preset.url
                    ? 'border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400'
                    : 'border-[#29384C] hover:border-slate-400'
                }`}
                title={preset.name}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#29384C]">
          <button
            onClick={handleRestoreDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-white hover:bg-[#17263B] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Predeterminada</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Guardar Portada</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
