import React, { useRef, useState } from 'react';
import { X, Printer, Download, Building2, Calendar, Clock, Users, FileText, Share2, Loader2, Check } from 'lucide-react';
import { SiteMeeting } from '../types';
import { formatMeetingDate, sendMeetingWhatsApp } from '../utils/whatsappMeetings';
import { downloadMeetingPdf, shareMeetingPdfViaWhatsApp } from '../utils/generateMeetingPdf';

// WhatsApp icon SVG component
function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen || !meeting) return null;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Direct PDF Download Handler
  const handleDownloadPdf = async () => {
    if (!sheetRef.current) return;
    setIsProcessingPdf(true);
    setStatusMessage('Generando archivo PDF con fotos en alta calidad...');
    try {
      const filename = await downloadMeetingPdf(sheetRef.current, meeting);
      setStatusMessage(`¡Descargado con éxito: ${filename}!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      setStatusMessage('Error al generar el PDF. Puedes usar el botón Imprimir.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // WhatsApp with actual PDF Handler
  const handleSendPdfWhatsApp = async () => {
    if (!sheetRef.current) return;
    setIsProcessingPdf(true);
    setStatusMessage('Generando PDF oficial para WhatsApp...');
    try {
      const res = await shareMeetingPdfViaWhatsApp(sheetRef.current, meeting);
      if (res.method === 'native_share') {
        setStatusMessage('¡Archivo PDF compartido a WhatsApp!');
      } else {
        setStatusMessage('Archivo PDF descargado. Adjúntalo en el chat de WhatsApp que se acaba de abrir.');
      }
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Error al compartir PDF por WhatsApp:', err);
      // Fallback a texto si algo falla
      sendMeetingWhatsApp(meeting);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const formattedDate = formatMeetingDate(meeting.date);
  const now = new Date();
  const printDateStr =
    now.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) +
    ' - ' +
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    ' hs';

  return (
    <div className="site-meeting-modal-container fixed inset-0 z-60 bg-slate-950/90 overflow-y-auto flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:block">
      {/* Print stylesheet forcing strict A4 Portrait taking the whole sheet */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 6mm 6mm 6mm 6mm !important;
          }
          *, *:before, *:after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          }
          .no-print,
          header,
          nav,
          main,
          footer,
          #root > div > header,
          #root > div > main,
          #root > div > nav {
            display: none !important;
          }
          .site-meeting-modal-container {
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
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 6mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            display: flex !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Floating Action Bar (no-print) */}
      <div className="no-print w-full max-w-[210mm] mb-3 bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl sticky top-2 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <FileText className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
              Informe de Minuta en Obra (A4 Vertical)
            </h3>
            <p className="text-[11px] text-slate-400">
              Formato oficial completo con imágenes incrustadas para imprimir o enviar por WhatsApp
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón 1: Enviar archivo PDF a WhatsApp */}
          <button
            type="button"
            disabled={isProcessingPdf}
            onClick={handleSendPdfWhatsApp}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Enviar el archivo PDF completo con fotos por WhatsApp"
          >
            {isProcessingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <WhatsAppIcon className="w-4 h-4 fill-white" />
            )}
            <span>Enviar PDF por WhatsApp</span>
          </button>

          {/* Botón 2: Descargar archivo PDF directo */}
          <button
            type="button"
            disabled={isProcessingPdf}
            onClick={handleDownloadPdf}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Descargar el archivo PDF en tu teléfono o computadora"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descargar PDF</span>
          </button>

          {/* Botón 3: Imprimir / Guardar en PDF de navegador */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            title="Imprimir hoja completa o Guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            title="Cerrar vista previa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Status banner if processing */}
      {statusMessage && (
        <div className="no-print w-full max-w-[210mm] mb-3 p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-center gap-2 shadow-lg animate-in fade-in duration-200">
          {isProcessingPdf && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* A4 PORTRAIT SHEET CONTAINER (Takes full 210mm width and matches print) */}
      <div
        ref={sheetRef}
        id="site-meeting-a4-sheet"
        className="site-meeting-a4-sheet w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-sm p-6 sm:p-10 border border-slate-300 min-h-[297mm] flex flex-col justify-between box-border"
      >
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
                crossOrigin="anonymous"
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

          {/* Section: Acuerdos y Compromisos */}
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

              {/* Dynamic Photo Grid with crisp rendering */}
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
                        crossOrigin="anonymous"
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
