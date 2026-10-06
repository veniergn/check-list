import React, { useState } from 'react';
import { X, Database, Copy, Check, ExternalLink, Cloud } from 'lucide-react';

interface CloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetrySync: () => void;
}

export const SUPABASE_SQL_SETUP = `-- Script para crear la tabla de datos de Control de Avance
create table if not exists app_data (
  key text primary key,
  data jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar permisos de lectura y escritura
alter table app_data enable row level security;

create policy "Acceso publico app_data" on app_data 
  for all 
  using (true) 
  with check (true);
`;

export function CloudSetupModal({ isOpen, onClose, onRetrySync }: CloudSetupModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 no-print">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl p-5 shadow-2xl border-t-4 border-emerald-500 border-x border-b border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">
                Conectar con la Nube (Supabase)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guarda tus obras, checklists y fotos para verlas desde cualquier dispositivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="mt-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
          <p className="leading-relaxed">
            Las credenciales de Supabase ya están conectadas. Para que la base de datos comience a almacenar tu información, solo necesitas crear la tabla ejecutando este script una sola vez en tu panel de Supabase:
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>1. Abre el Editor SQL de Supabase:</span>
              <a
                href="https://supabase.com/dashboard/project/wafcgdnnhxxchondmmtp/sql"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 normal-case font-bold"
              >
                Abrir SQL Editor en Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Copia y pega este código en una nueva consulta:
            </div>

            <div className="relative bg-slate-950 text-slate-200 p-3 rounded-xl font-mono text-[11px] border border-slate-800 overflow-x-auto">
              <pre>{SUPABASE_SQL_SETUP}</pre>
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              3. Presiona el botón verde <strong className="text-emerald-600 dark:text-emerald-400 font-black">"Run"</strong> en Supabase.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl touch-target transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => {
              onRetrySync();
              onClose();
            }}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl touch-target shadow flex items-center justify-center gap-1.5 transition-all"
          >
            <Cloud className="w-4 h-4" />
            <span>Verificar y Sincronizar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
