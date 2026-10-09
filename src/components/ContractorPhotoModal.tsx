import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  RotateCcw,
  Check,
  User,
  Sliders,
  ZoomIn
} from 'lucide-react';
import { ContractorProfile } from '../types';
import { compressImageFile } from '../utils/calculations';

interface ContractorPhotoModalProps {
  isOpen: boolean;
  contractor: ContractorProfile | null;
  onClose: () => void;
  onSavePhoto: (contractorId: string, avatarUrl: string) => void;
  onShowToast?: (msg: string, icon?: string) => void;
}

const DEFAULT_AVATARS_PRESET = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80'
];

export function ContractorPhotoModal({
  isOpen,
  contractor,
  onClose,
  onSavePhoto,
  onShowToast
}: ContractorPhotoModalProps) {
  if (!isOpen || !contractor) return null;

  const [previewUrl, setPreviewUrl] = useState<string>(contractor.avatarUrl || DEFAULT_AVATARS_PRESET[0]);
  const [zoom, setZoom] = useState<number>(100);
  const [panX, setPanX] = useState<number>(50);
  const [panY, setPanY] = useState<number>(50);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      onShowToast?.('Procesando fotografía...', 'Camera');
      const compressed = await compressImageFile(file, 400, 0.85);
      setPreviewUrl(compressed);
      setZoom(100);
      setPanX(50);
      setPanY(50);
      onShowToast?.('Fotografía lista para encuadre', 'Check');
    } catch (err) {
      console.error('Error al procesar foto de trabajador:', err);
      onShowToast?.('Error al procesar la imagen', 'AlertCircle');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleSave = () => {
    onSavePhoto(contractor.id, previewUrl);
    onShowToast?.(`Fotografía actualizada para ${contractor.name}`, 'Check');
    onClose();
  };

  const handleRestoreDefault = () => {
    const defaultAv = DEFAULT_AVATARS_PRESET[0];
    setPreviewUrl(defaultAv);
    setZoom(100);
    setPanX(50);
    setPanY(50);
    onShowToast?.('Avatar predeterminado restablecido en vista previa', 'RotateCcw');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#101D30] border border-[#29384C] rounded-3xl p-6 shadow-2xl space-y-5 text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                Fotografía del Trabajador
              </h3>
              <p className="text-[11px] text-[#94A3B8]">
                Actualiza únicamente la foto de perfil del trabajador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#17263B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Worker Info Read-only Header (Guarantees NO changes to name, role, permissions) */}
        <div className="p-3 rounded-2xl bg-[#081321] border border-[#29384C] flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-[#94A3B8] tracking-wider">
              Datos Laborales (Fijos)
            </span>
            <h4 className="text-xs font-bold text-white truncate">{contractor.name}</h4>
            <p className="text-[11px] text-blue-400 font-medium truncate">{contractor.role}</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#17263B] text-slate-400 border border-[#29384C]">
            ID: {contractor.id}
          </span>
        </div>

        {/* Circular Crop Live Preview */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative">
            {/* The circular crop viewport */}
            <div
              className="w-36 h-36 rounded-full overflow-hidden border-4 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] relative bg-[#081321]"
            >
              <div
                className="w-full h-full bg-cover bg-no-repeat transition-all"
                style={{
                  backgroundImage: `url(${previewUrl})`,
                  backgroundPosition: `${panX}% ${panY}%`,
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: `${panX}% ${panY}%`
                }}
              />
            </div>

            {/* Camera badge indicator */}
            <div className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-[#101D30] shadow-md">
              <Camera className="w-4 h-4" />
            </div>
          </div>

          <span className="text-[11px] text-slate-400 text-center">
            Recorte circular automático sin deformar proporciones
          </span>
        </div>

        {/* Upload Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
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
            capture="user"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2.5 rounded-xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] flex items-center justify-center gap-1.5 text-xs font-bold transition-all text-[#F8FAFC]"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Subir imagen</span>
          </button>

          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2.5 rounded-xl bg-[#17263B] hover:bg-[#1f324d] border border-[#29384C] flex items-center justify-center gap-1.5 text-xs font-bold transition-all text-[#F8FAFC]"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tomar foto</span>
          </button>
        </div>

        {/* Framing & Zoom Sliders */}
        <div className="bg-[#081321] p-3 rounded-xl border border-[#29384C] space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>Zoom</span>
            <span className="font-mono">{zoom}%</span>
          </div>
          <input
            type="range"
            min="100"
            max="180"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-[#17263B] rounded-lg cursor-pointer"
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <span className="text-[10px] text-[#94A3B8]">Eje Horizontal (X)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={panX}
                onChange={(e) => setPanX(Number(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-[#17263B] rounded cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[#94A3B8]">Eje Vertical (Y)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={panY}
                onChange={(e) => setPanY(Number(e.target.value))}
                className="w-full accent-blue-500 h-1 bg-[#17263B] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-[#29384C]">
          <button
            onClick={handleRestoreDefault}
            className="flex items-center gap-1 text-[11px] text-[#94A3B8] hover:text-white"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Predeterminado</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Guardar Fotografía</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
