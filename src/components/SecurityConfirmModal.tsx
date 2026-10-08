import React, { useState } from 'react';
import { X, ShieldAlert, Trash2, KeyRound } from 'lucide-react';

interface SecurityConfirmModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType: 'project' | 'unit';
  onClose: () => void;
  onConfirm: () => void;
}

const REQUIRED_PIN = '2600';

export function SecurityConfirmModal({
  isOpen,
  title,
  itemName,
  itemType,
  onClose,
  onConfirm
}: SecurityConfirmModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() !== REQUIRED_PIN) {
      setError('Clave de seguridad incorrecta. Debe ingresar 2600 para autorizar.');
      return;
    }
    setError('');
    setPin('');
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print animate-in fade-in duration-150">
      <div className="bg-[#101D30] text-[#F8FAFC] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[#29384C] border-t-4 border-t-rose-600 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-[#29384C]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-[#F8FAFC] text-base leading-tight">
                {title}
              </h3>
              <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                Confirmación con Clave 2600
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-[#94A3B8] hover:text-slate-600 p-1.5 touch-target rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Details */}
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-200 space-y-1">
          <p className="font-bold text-[13px] text-rose-200 break-words">
            ¿Eliminar {itemType === 'project' ? 'la obra' : 'la unidad / espacio'} &ldquo;{itemName}&rdquo;?
          </p>
          <p className="text-[11px] text-rose-300 leading-relaxed font-medium">
            Esta operación no se puede deshacer. Se borrarán permanentemente sus gremios, avances, fotos y notas técnicas asociadas.
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={handleConfirm} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" /> Ingrese Clave de Seguridad:
              </span>
              <span className="text-[10px] text-[#94A3B8] font-normal">Clave: 2600</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              maxLength={8}
              placeholder="Escriba 2600..."
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError('');
              }}
              className="w-full text-center tracking-widest font-mono text-xl py-2.5 px-3 rounded-xl border-2 border-[#29384C] focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-black text-white bg-[#17263B]"
            />
          </div>

          {error && (
            <div className="text-xs text-rose-600 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 text-center animate-shake">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#94A3B8] hover:text-white bg-[#17263B] hover:bg-[#20324c] border border-[#29384C] transition-colors touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-md flex items-center gap-1.5 touch-target"
            >
              <Trash2 className="w-4 h-4" />
              Confirmar Eliminación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
