import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  PenTool,
  RotateCcw,
  Check,
  Lock,
  Unlock,
  ShieldCheck,
  Calendar,
  User,
  Building2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Unit, Project } from '../types';
import { calculateUnitProgress, getUnitItemCounts } from '../utils/calculations';

interface SignatureModalProps {
  isOpen: boolean;
  project: Project;
  unit: Unit;
  onClose: () => void;
  onSaveSignature: (
    unitId: string,
    signatureDataUrl: string,
    signedBy: string,
    signRole: string,
    signDni: string,
    isLocked: boolean
  ) => void;
  onUnlockUnit: (unitId: string) => void;
}

export function SignatureModal({
  isOpen,
  project,
  unit,
  onClose,
  onSaveSignature,
  onUnlockUnit
}: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signedBy, setSignedBy] = useState(unit.signedBy || 'Arq. M. Rossi');
  const [signRole, setSignRole] = useState(unit.signRole || 'Supervisor Técnico de Obra');
  const [signDni, setSignDni] = useState(unit.signDni || '');
  const [lockInspection, setLockInspection] = useState(unit.isLocked ?? true);

  const unitProgress = calculateUnitProgress(unit);
  const itemCounts = getUnitItemCounts(unit);

  // Setup canvas resolution and styling
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Clear with clean background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  useEffect(() => {
    if (isOpen) {
      setSignedBy(unit.signedBy || 'Arq. M. Rossi');
      setSignRole(unit.signRole || 'Supervisor Técnico de Obra');
      setSignDni(unit.signDni || '');
      setLockInspection(unit.isLocked ?? true);
      setHasDrawn(false);

      setTimeout(() => {
        initCanvas();
      }, 150);
    }
  }, [isOpen, unit]);

  if (!isOpen) return null;

  // Touch & Mouse Drawing Handlers
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (unit.isLocked && unit.signature) return; // Prevent drawing if already locked
    if ('touches' in e) {
      e.stopPropagation();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ('touches' in e) {
      e.stopPropagation();
      e.preventDefault(); // Prevents page scrolling on mobile touch screens
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let signatureData = unit.signature || '';
    if (hasDrawn) {
      signatureData = canvas.toDataURL('image/png');
    }

    if (!signatureData && !unit.signature) {
      alert('Por favor realiza la firma sobre el recuadro antes de guardar el acta.');
      return;
    }

    onSaveSignature(
      unit.id,
      signatureData,
      signedBy.trim() || 'Inspector Técnico',
      signRole,
      signDni.trim(),
      lockInspection
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[94vh] flex flex-col shadow-2xl border-t-4 border-amber-500 overflow-hidden my-auto">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white leading-tight">
                Acta de Conformidad y Recepción Técnica
              </h3>
              <p className="text-[11px] text-amber-400 font-medium">
                {project.name} • {unit.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Unit Status Banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">
                Estado Actual de la Unidad
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-black text-sm text-slate-900 font-mono">
                  {unitProgress}% Avance Global
                </span>
                <span className="text-[11px] text-slate-500">
                  ({itemCounts.completed}/{itemCounts.total} ítems listos)
                </span>
              </div>
            </div>

            {unit.isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                <Lock className="w-3.5 h-3.5" />
                Inspección Bloqueada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Inspección Abierta
              </span>
            )}
          </div>

          {/* Already Signed Badge if applicable */}
          {unit.signature && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-800 block">
                  Acta Firmada Anteriormente
                </span>
                <p className="font-bold text-slate-900 mt-0.5">
                  Firmado por {unit.signedBy || 'Inspector'} ({unit.signRole})
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Fecha: {unit.signedAt || 'Registrada'}
                </p>
              </div>

              {unit.isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Deseas desbloquear esta inspección para poder editar ítems y porcentajes?')) {
                      onUnlockUnit(unit.id);
                    }
                  }}
                  className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold rounded-lg text-xs flex items-center gap-1 shadow-2xs"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Desbloquear
                </button>
              )}
            </div>
          )}

          {/* Signatory Fields */}
          <div className="space-y-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nombre y Apellido del Firmante / Responsable:
              </label>
              <input
                type="text"
                value={signedBy}
                onChange={(e) => setSignedBy(e.target.value)}
                placeholder="Ej: Ing. Carlos Mendoza"
                className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rol / Cargo en Obra:
                </label>
                <select
                  value={signRole}
                  onChange={(e) => setSignRole(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Supervisor Técnico de Obra">Supervisor Técnico de Obra</option>
                  <option value="Jefe de Producción / Obra">Jefe de Producción / Obra</option>
                  <option value="Auditor de Calidad">Auditor de Calidad</option>
                  <option value="Director de Proyecto">Director de Proyecto</option>
                  <option value="Contratista Principal">Contratista Principal</option>
                  <option value="Propietario / Cliente">Propietario / Cliente</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  DNI / Matrícula Profesional:
                </label>
                <input
                  type="text"
                  value={signDni}
                  onChange={(e) => setSignDni(e.target.value)}
                  placeholder="Ej: Mat. 14.892 / DNI 28.432.110"
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Touch Signature Canvas Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-black text-slate-800 flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-amber-600" />
                Firma Digital en Pantalla (Dedo o Stylus)
              </label>

              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Limpiar trazo
              </button>
            </div>

            {/* Canvas Box */}
            <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner touch-none">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{ width: '100%', height: '170px', touchAction: 'none' }}
                className="cursor-crosshair block"
              />

              {!hasDrawn && !unit.signature && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400">
                  <PenTool className="w-6 h-6 mb-1 opacity-40 animate-pulse" />
                  <span className="text-[11px] font-medium">
                    Firma aquí directamente con el dedo
                  </span>
                </div>
              )}

              <div className="absolute bottom-1.5 right-2 pointer-events-none text-[9px] font-mono text-slate-400">
                Línea de firma técnica
              </div>
            </div>

            {unit.signature && !hasDrawn && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span>Firma anterior almacenada correctamente.</span>
                <span className="font-bold text-amber-700">Dibuja para actualizar trazo</span>
              </div>
            )}
          </div>

          {/* Lock Inspection Checkbox */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={lockInspection}
                onChange={(e) => setLockInspection(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <div className="text-xs">
                <span className="font-black text-slate-900 block flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  Bloquear inspección al guardar acta
                </span>
                <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                  Congela los porcentajes, checkboxes y controles para evitar alteraciones posteriores no autorizadas.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-950 text-white border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl touch-target transition-colors"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow flex items-center gap-1.5 touch-target active:scale-95 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Guardar y Emitir Acta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
