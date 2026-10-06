import { Check, Camera, Trash2, RotateCcw, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';

interface ToastProps {
  message: string | null;
  iconName?: string;
}

export function Toast({ message, iconName = 'Check' }: ToastProps) {
  if (!message) return null;

  const renderIcon = () => {
    switch (iconName) {
      case 'Camera': return <Camera className="w-4 h-4 text-amber-400" />;
      case 'Trash2': return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'RotateCcw': return <RotateCcw className="w-4 h-4 text-amber-400" />;
      case 'AlertCircle': return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'FileText': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'Image': return <ImageIcon className="w-4 h-4 text-amber-400" />;
      default: return <Check className="w-4 h-4 text-amber-400 stroke-[3]" />;
    }
  };

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl border border-amber-500 z-50 flex items-center gap-2 transition-all duration-300 pointer-events-none no-print">
      {renderIcon()}
      <span>{message}</span>
    </div>
  );
}
