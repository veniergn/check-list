import React from 'react';
import { X, Printer, Building2, Calendar, Clock, Users, FileText, CheckCircle2 } from 'lucide-react';
import { SiteMeeting } from '../types';
import { formatMeetingDate, sendMeetingWhatsApp } from '../utils/whatsappMeetings';

interface SiteMeetingPdfModalProps {
  isOpen: boolean;
  meeting: SiteMeeting | null;
  headerLogoUrl?: string;
  onClose: () => void;
}

export function SiteMeetingPdfModal({
  isOpen,
  meeting,
  headerLogoUrl,
  onClose
}: SiteMeetingPdfModalProps) {
  if (!isOpen || !meeting) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    sendMeetingWhatsApp(meeting);
  };

  const formattedDate = formatMeetingDate(meeting.date);
  const now = new Date();
  const printDateStr = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ' - ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';

  return (
    <div className="site-meeting-pdf-backdrop fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      {/* Print stylesheet forcing strict A4 Portrait taking the whole sheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 8mm 8mm 8mm 8mm !important;
          }
          html, body, #root, #root > div {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          header,
          nav,
          main,
          footer,
          .report-modal-backdrop,
          [class*="backdrop"] {
            display: none !important;
          }
          .site-meeting-pdf-backdrop {
            position: static !important;
            inset: auto !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .site-meeting-a4-sheet {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Floating Action Bar (no-print) */}
      <div className="no-print w-full max-w-[210mm] mb-3 bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl sticky top-2 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <FileText className="w-4 h-4 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
              Informe de Minuta en Obra (A4 Vertical)
            </h3>
            <p className="text-[11px] text-slate-400">
              Formato oficial completo para guardar en PDF, imprimir o enviar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Abrir diálogo de impresión o Guardar como PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Enviar minuta resumida por WhatsApp"
          >
            <span>WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Cerrar vista previa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* A4 PORTRAIT SHEET CONTAINER (Takes full 210mm width) */}
      <div className="site-meeting-a4-sheet w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-10 border border-slate-200 min-h-[297mm] flex flex-col justify-between box-border">
        {/* Document Header */}
        <div>
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-slate-900 text-white">
                  INFORME TÉCNICO OFICIAL
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  CONTROL DE AVANCE DE OBRAS
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">
                MINUTA DE REUNIÓN EN OBRA
              </h1>
              <p className="text-xs text-slate-600 mt-1 font-semibold">
                Supervisión técnica, acuerdos y registro fotográfico en terreno
              </p>
            </div>

            {headerLogoUrl ? (
              <img
                src={headerLogoUrl}
                alt="Logo"
                className="h-12 max-w-[140px] object-contain shrink-0"
              />
            ) : (
              <div className="text-right">
                <span className="text-xs font-black text-slate-900 uppercase tracking-widest block">
                  VENIER ARQUITECTURA
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Dirección Técnica de Obras
                </span>
              </div>
            )}
          </div>

          {/* Meeting Metadata Card */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                Obra / Proyecto
              </span>
              <span className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600 print:hidden" />
                {meeting.projectName}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                Fecha y Hora de la Reunión
              </span>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 print:hidden" />
                {formattedDate} {meeting.time ? `• ${meeting.time} hs` : ''}
              </span>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                Con quién fue la reunión (Asistentes)
              </span>
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600 print:hidden" />
                {meeting.attendees}
              </span>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
                Motivo / Asunto
              </span>
              <span className="text-xs font-bold text-indigo-950">
                {meeting.title}
              </span>
            </div>
          </div>

          {/* Section: Temas Tratados */}
          <div className="mb-5 page-break-inside-avoid">
            <div className="border-l-4 border-indigo-700 pl-2.5 mb-2">
              <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                TEMAS TRATADOS EN LA REUNIÓN
              </h2>
            </div>
            <div className="p-4 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {meeting.topics ? meeting.topics.trim() : '(Sin detalle registrado)'}
            </div>
          </div>

          {/* Section: Acuerdos y Compromisos (if present) */}
          {meeting.commitments && meeting.commitments.trim() && (
            <div className="mb-5 page-break-inside-avoid">
              <div className="border-l-4 border-amber-600 pl-2.5 mb-2">
                <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                  ACUERDOS Y COMPROMISOS ACORDADOS
                </h2>
              </div>
              <div className="p-3.5 bg-amber-50/60 border border-amber-300 rounded-xl text-xs text-amber-950 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                {meeting.commitments.trim()}
              </div>
            </div>
          )}

          {/* Section: Fotografías cargadas (imágenes reales en la hoja) */}
          {meeting.photos && meeting.photos.length > 0 && (
            <div className="mb-6 page-break-inside-avoid">
              <div className="border-l-4 border-cyan-700 pl-2.5 mb-2.5">
                <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                  REGISTRO FOTOGRÁFICO DE LA REUNIÓN ({meeting.photos.length} FOTOGRAFÍAS)
                </h2>
              </div>

              {/* Dynamic Photo Grid */}
              <div
                className={`grid gap-3 ${
                  meeting.photos.length === 1
                    ? 'grid-cols-1 max-w-md mx-auto'
                    : meeting.photos.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-2 sm:grid-cols-3'
                }`}
              >
                {meeting.photos.map((photo, idx) => (
                  <div
                    key={photo.id || idx}
                    className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 flex flex-col page-break-inside-avoid shadow-xs"
                  >
                    <div className="relative aspect-[4/3] w-full bg-slate-200 overflow-hidden">
                      <img
                        src={photo.dataUrl || photo.driveUrl}
                        alt={photo.caption || `Foto ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {photo.caption && (
                      <div className="p-1.5 text-[10px] font-semibold text-slate-700 bg-white border-t border-slate-200 text-center truncate">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Document Footer: Signatures & Verification */}
        <div className="mt-8 pt-4 border-t-2 border-slate-900 page-break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center text-xs mb-4">
            <div className="pt-8 border-t border-slate-400">
              <span className="font-black text-slate-900 block">
                Arq. Venier Gaston
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Dirección Técnica / Inspección de Obra
              </span>
            </div>

            <div className="pt-8 border-t border-slate-400">
              <span className="font-black text-slate-900 block">
                Firma / Aclaración Asistentes
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                {meeting.attendees}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-200">
            <span>Control de Avance de Obras • Documento Oficial</span>
            <span>Generado: {printDateStr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
