import React, { useRef, useState, useMemo } from 'react';
import { X, Printer, Download, Building2, Calendar, Clock, Users, FileText, Loader2, Check } from 'lucide-react';
import { SiteMeeting, SiteMeetingPhoto } from '../types';
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

/**
 * Representa el contenido asignado a una hoja A4 individual
 */
interface MeetingPageData {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;

  // Encabezados
  showHeaderAndMeta?: boolean;
  showContinuationHeader?: boolean;

  // Temas tratados en esta página
  topicParagraphs?: string[];
  showTopicsHeading?: boolean;
  isTopicsContinuation?: boolean;

  // Acuerdos y compromisos en esta página
  commitmentsText?: string;

  // Fotografías en esta página (máximo por página calculado para que no se corten)
  photos?: SiteMeetingPhoto[];
  showPhotosHeading?: boolean;

  // Firmas (solo en la última página del documento)
  showSignatures?: boolean;
}

/**
 * Función que divide inteligentemente el contenido de la reunión en hojas A4 individuales (210mm x 297mm)
 * garantizando que ninguna foto se corte y que el texto mantenga un tamaño legible (>= 11pt).
 */
function paginateMeeting(meeting: SiteMeeting): MeetingPageData[] {
  // Constantes de altura estimada en milímetros (hoja A4 = 297mm de alto)
  // Márgenes: top 12mm + bottom 12mm = 24mm. Footer: 12mm. Altura útil = 261mm.
  const MAX_USABLE_HEIGHT = 261;
  const HEADER_AND_META_HEIGHT = 68; // Encabezado principal oficial + caja de metadatos
  const CONTINUATION_HEADER_HEIGHT = 20; // Banner compacto de continuación
  const SIGNATURES_HEIGHT = 38; // Bloque de firmas Arq. Venier + Asistentes
  const TOPICS_HEADING_HEIGHT = 12; // Título "TEMAS TRATADOS EN LA REUNIÓN"
  const COMMITMENTS_BASE_HEIGHT = 18; // Título y márgenes de compromisos
  const PHOTOS_HEADING_HEIGHT = 12; // Título "REGISTRO FOTOGRÁFICO"
  const PHOTO_ROW_HEIGHT = 65; // Alto de una fila de 1 o 2 fotos completas

  // Helper para estimar altura de un párrafo a tipografía 11pt (~85 caracteres por línea)
  const getParagraphHeight = (text: string): number => {
    if (!text || text.trim() === '') return 4;
    const lines = Math.max(1, Math.ceil(text.length / 85));
    // 6.6mm por línea + 4mm de margen inferior
    return lines * 6.6 + 4;
  };

  // 1. Descomponer el texto de temas en bloques lógicos (párrafos, ítems numerados o viñetas)
  const rawTopics = meeting.topics ? meeting.topics.trim() : '';
  const paragraphs: string[] = [];
  if (rawTopics) {
    const rawLines = rawTopics.split(/\r?\n/);
    let buffer = '';
    for (const line of rawLines) {
      const isBulletOrSection = /^(\d+[\.\)]|•|\*|-|[A-Z0-9\s]{4,}:)/.test(line.trim());
      if (line.trim() === '') {
        if (buffer.trim()) {
          paragraphs.push(buffer);
          buffer = '';
        }
      } else if (isBulletOrSection && buffer.trim()) {
        paragraphs.push(buffer);
        buffer = line;
      } else {
        buffer = buffer ? buffer + '\n' + line : line;
      }
    }
    if (buffer.trim()) {
      paragraphs.push(buffer);
    }
  }

  // Dividir párrafos anormalmente largos (> 1200 chars) para permitir quiebres limpios si es necesario
  const refinedParagraphs: string[] = [];
  for (const p of paragraphs) {
    if (p.length > 1200) {
      const subLines = p.split('\n');
      let subBuffer = '';
      for (const sl of subLines) {
        if (subBuffer.length + sl.length > 900) {
          refinedParagraphs.push(subBuffer);
          subBuffer = sl;
        } else {
          subBuffer = subBuffer ? subBuffer + '\n' + sl : sl;
        }
      }
      if (subBuffer) refinedParagraphs.push(subBuffer);
    } else {
      refinedParagraphs.push(p);
    }
  }

  // 2. Calcular compromisos
  const commitments = meeting.commitments ? meeting.commitments.trim() : '';
  const commitmentsHeight = commitments
    ? COMMITMENTS_BASE_HEIGHT + Math.max(1, Math.ceil(commitments.length / 85)) * 6.6
    : 0;

  // 3. Agrupar fotos en filas de 2 fotos
  const allPhotos = meeting.photos || [];
  const photoRows: SiteMeetingPhoto[][] = [];
  for (let i = 0; i < allPhotos.length; i += 2) {
    photoRows.push(allPhotos.slice(i, i + 2));
  }

  // 4. VERIFICACIÓN: ¿Todo cabe en 1 SOLA HOJA A4?
  const totalTopicsHeight =
    (refinedParagraphs.length > 0 ? TOPICS_HEADING_HEIGHT : 0) +
    refinedParagraphs.reduce((sum, p) => sum + getParagraphHeight(p), 0);
  const totalPhotosHeight =
    photoRows.length > 0 ? PHOTOS_HEADING_HEIGHT + photoRows.length * PHOTO_ROW_HEIGHT : 0;

  const totalContentIfSinglePage =
    HEADER_AND_META_HEIGHT +
    totalTopicsHeight +
    commitmentsHeight +
    totalPhotosHeight +
    SIGNATURES_HEIGHT;

  if (totalContentIfSinglePage <= MAX_USABLE_HEIGHT) {
    // Cabe perfectamente en 1 hoja A4
    return [
      {
        pageNumber: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        showHeaderAndMeta: true,
        topicParagraphs: refinedParagraphs,
        showTopicsHeading: refinedParagraphs.length > 0,
        commitmentsText: commitments || undefined,
        photos: allPhotos,
        showPhotosHeading: allPhotos.length > 0,
        showSignatures: true
      }
    ];
  }

  // 5. DISTRIBUCIÓN MULTI-HOJA INTELIGENTE
  const pages: MeetingPageData[] = [];

  // Iniciar Página 1
  let currentPage: MeetingPageData = {
    pageNumber: 1,
    totalPages: 1,
    isFirstPage: true,
    isLastPage: false,
    showHeaderAndMeta: true,
    topicParagraphs: [],
    showTopicsHeading: refinedParagraphs.length > 0,
    photos: []
  };

  // Altura ocupada en Página 1
  let currentHeight = HEADER_AND_META_HEIGHT + (refinedParagraphs.length > 0 ? TOPICS_HEADING_HEIGHT : 0);
  const PAGE_1_MAX_HEIGHT = 250;
  const OTHER_PAGES_MAX_HEIGHT = 250;

  // A. Asignar párrafos de temas
  for (const p of refinedParagraphs) {
    const pHeight = getParagraphHeight(p);
    const limit = currentPage.pageNumber === 1 ? PAGE_1_MAX_HEIGHT : OTHER_PAGES_MAX_HEIGHT;

    if (currentHeight + pHeight > limit && (currentPage.topicParagraphs?.length ?? 0) > 0) {
      // Guardar página actual y crear nueva
      pages.push(currentPage);
      currentPage = {
        pageNumber: pages.length + 1,
        totalPages: 1,
        isFirstPage: false,
        isLastPage: false,
        showContinuationHeader: true,
        topicParagraphs: [p],
        isTopicsContinuation: true,
        photos: []
      };
      currentHeight = CONTINUATION_HEADER_HEIGHT + pHeight;
    } else {
      currentPage.topicParagraphs!.push(p);
      currentHeight += pHeight;
    }
  }

  // B. Asignar compromisos
  if (commitments) {
    const limit = currentPage.pageNumber === 1 ? PAGE_1_MAX_HEIGHT : OTHER_PAGES_MAX_HEIGHT;
    if (currentHeight + commitmentsHeight > limit) {
      pages.push(currentPage);
      currentPage = {
        pageNumber: pages.length + 1,
        totalPages: 1,
        isFirstPage: false,
        isLastPage: false,
        showContinuationHeader: true,
        commitmentsText: commitments,
        photos: []
      };
      currentHeight = CONTINUATION_HEADER_HEIGHT + commitmentsHeight;
    } else {
      currentPage.commitmentsText = commitments;
      currentHeight += commitmentsHeight;
    }
  }

  // C. Asignar fotos por filas de a 2 (Garantiza que salgan ENTERAS)
  let photosHeadingAdded = false;
  for (const row of photoRows) {
    const isFirstRowOfAll = !photosHeadingAdded;
    const rowHeightNeeded = PHOTO_ROW_HEIGHT + (isFirstRowOfAll ? PHOTOS_HEADING_HEIGHT : 0);
    const limit = currentPage.pageNumber === 1 ? PAGE_1_MAX_HEIGHT : OTHER_PAGES_MAX_HEIGHT;

    if (currentHeight + rowHeightNeeded > limit && (currentPage.photos?.length || currentPage.topicParagraphs?.length)) {
      pages.push(currentPage);
      currentPage = {
        pageNumber: pages.length + 1,
        totalPages: 1,
        isFirstPage: false,
        isLastPage: false,
        showContinuationHeader: true,
        photos: [...row],
        showPhotosHeading: isFirstRowOfAll
      };
      photosHeadingAdded = true;
      currentHeight = CONTINUATION_HEADER_HEIGHT + rowHeightNeeded;
    } else {
      if (isFirstRowOfAll) {
        currentPage.showPhotosHeading = true;
        photosHeadingAdded = true;
      }
      currentPage.photos = [...(currentPage.photos || []), ...row];
      currentHeight += rowHeightNeeded;
    }
  }

  // D. Asignar bloque de firmas
  const limitForSignatures = currentPage.pageNumber === 1 ? PAGE_1_MAX_HEIGHT : OTHER_PAGES_MAX_HEIGHT;
  if (currentHeight + SIGNATURES_HEIGHT > limitForSignatures) {
    // Si no entra la firma al fondo de la hoja actual, se agrega en una hoja final con su banner
    pages.push(currentPage);
    currentPage = {
      pageNumber: pages.length + 1,
      totalPages: 1,
      isFirstPage: false,
      isLastPage: true,
      showContinuationHeader: true,
      showSignatures: true
    };
  } else {
    currentPage.showSignatures = true;
  }

  pages.push(currentPage);

  // Actualizar metadatos de total de páginas
  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    p.pageNumber = idx + 1;
    p.totalPages = totalPages;
    p.isLastPage = idx === totalPages - 1;
  });

  return pages;
}

export function SiteMeetingPdfModal({
  isOpen,
  meeting,
  headerLogoUrl,
  onClose
}: SiteMeetingPdfModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen || !meeting) return null;

  // Calcular las páginas distribuidas en A4
  const pages = useMemo(() => paginateMeeting(meeting), [meeting]);

  // Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!containerRef.current) return;
    setIsProcessingPdf(true);
    setStatusMessage('Generando archivo PDF en hojas A4 con fotos completas...');
    try {
      const filename = await downloadMeetingPdf(containerRef.current, meeting);
      setStatusMessage(`¡Descargado con éxito: ${filename}!`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      setStatusMessage('Error al generar el PDF. Puedes usar el botón Imprimir.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsProcessingPdf(false);
    }
  };

  const handleSendPdfWhatsApp = async () => {
    if (!containerRef.current) return;
    setIsProcessingPdf(true);
    setStatusMessage('Generando PDF oficial en hojas A4 para WhatsApp...');
    try {
      const res = await shareMeetingPdfViaWhatsApp(containerRef.current, meeting);
      if (res.method === 'native_share') {
        setStatusMessage('¡Archivo PDF compartido a WhatsApp!');
      } else {
        setStatusMessage('Archivo PDF descargado. Adjúntalo en el chat de WhatsApp que se acaba de abrir.');
      }
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err) {
      console.error('Error al compartir PDF por WhatsApp:', err);
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
      {/* Dynamic print stylesheet para salida 100% limpia en A4 Portrait */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 0 !important;
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
          #root > div > nav,
          [class*="wallpaper"],
          [class*="luminous"],
          [class*="blur-"] {
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
          .site-meeting-pages-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            gap: 0 !important;
          }
          .site-meeting-a4-page {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
            padding: 12mm 14mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            background: #ffffff !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .site-meeting-a4-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          /* Tipografía garantizada >= 11pt al imprimir */
          .site-meeting-a4-page p,
          .site-meeting-a4-page div.text-body,
          .site-meeting-a4-page li,
          .site-meeting-a4-page span.text-body {
            font-size: 11pt !important;
            line-height: 1.45 !important;
          }
        }
      `}</style>

      {/* Barra Superior Flotante de Acciones (no-print) */}
      <div className="no-print w-full max-w-[210mm] mb-3 bg-[#0f172a] border border-slate-800 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl sticky top-2 z-30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <FileText className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-white leading-tight">
                Informe de Minuta en Obra (A4 Vertical)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] border border-indigo-500/30">
                {pages.length} {pages.length === 1 ? 'Hoja A4' : 'Hojas A4'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ajustado a hoja A4 con fotografías enteras sin cortes y tipografía 11pt legible
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
            title="Enviar archivo PDF completo con fotos por WhatsApp"
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
            title="Imprimir hojas A4 completas o Guardar como PDF"
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

      {/* Status banner si está procesando */}
      {statusMessage && (
        <div className="no-print w-full max-w-[210mm] mb-3 p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-center gap-2 shadow-lg animate-in fade-in duration-200">
          {isProcessingPdf && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          <span className="font-semibold">{statusMessage}</span>
        </div>
      )}

      {/* CONTENEDOR DE TODAS LAS HOJAS A4 */}
      <div
        ref={containerRef}
        id="site-meeting-pages-container"
        className="site-meeting-pages-container w-full max-w-[210mm] flex flex-col items-center gap-8 mb-8"
      >
        {pages.map((pageData) => (
          <div
            key={pageData.pageNumber}
            className="site-meeting-a4-page w-full max-w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-8 sm:p-10 border border-slate-300 box-border flex flex-col justify-between overflow-hidden relative"
          >
            {/* Indicador sutil de hoja en pantalla (no-print) */}
            <div className="no-print absolute top-2 right-3 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded text-[9px] font-bold text-slate-600">
              Hoja {pageData.pageNumber} de {pageData.totalPages}
            </div>

            {/* SECCIÓN SUPERIOR DE LA HOJA */}
            <div>
              {/* ENCABEZADO PRINCIPAL (SÓLO HOJA 1) */}
              {pageData.showHeaderAndMeta && (
                <>
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
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

                  {/* Ficha de Metadatos de la Reunión */}
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
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
                </>
              )}

              {/* BANNER DE CONTINUACIÓN (HOJA 2 EN ADELANTE) */}
              {pageData.showContinuationHeader && (
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-slate-900 text-white">
                      CONTINUACIÓN
                    </span>
                    <span className="text-xs font-black text-slate-950 uppercase tracking-tight">
                      MINUTA DE REUNIÓN EN OBRA • {meeting.projectName}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600">
                    Fecha: {formattedDate} • Hoja {pageData.pageNumber} de {pageData.totalPages}
                  </span>
                </div>
              )}

              {/* TEMAS TRATADOS EN LA REUNIÓN (Párrafos asignados a esta hoja) */}
              {pageData.topicParagraphs && pageData.topicParagraphs.length > 0 && (
                <div className="mb-4">
                  {pageData.showTopicsHeading && (
                    <div className="border-l-4 border-indigo-700 pl-2.5 mb-2">
                      <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                        TEMAS TRATADOS EN LA REUNIÓN
                      </h2>
                    </div>
                  )}

                  {pageData.isTopicsContinuation && !pageData.showTopicsHeading && (
                    <div className="border-l-4 border-indigo-500 pl-2 mb-2">
                      <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider">
                        (Continuación de temas tratados)
                      </span>
                    </div>
                  )}

                  <div className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-2">
                    {pageData.topicParagraphs.map((para, pIdx) => (
                      <p
                        key={pIdx}
                        className="text-body text-[14px] sm:text-[14.5px] text-slate-900 leading-relaxed whitespace-pre-wrap font-sans font-normal"
                        style={{ fontSize: '11pt', lineHeight: 1.5 }}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* ACUERDOS Y COMPROMISOS (Si caen en esta hoja) */}
              {pageData.commitmentsText && (
                <div className="mb-4">
                  <div className="border-l-4 border-amber-600 pl-2.5 mb-1.5">
                    <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                      ACUERDOS Y COMPROMISOS ACORDADOS
                    </h2>
                  </div>
                  <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl">
                    <p
                      className="text-body text-[14px] sm:text-[14.5px] text-amber-950 leading-relaxed whitespace-pre-wrap font-sans font-semibold"
                      style={{ fontSize: '11pt', lineHeight: 1.5 }}
                    >
                      {pageData.commitmentsText}
                    </p>
                  </div>
                </div>
              )}

              {/* REGISTRO FOTOGRÁFICO (Fotos asignadas a esta hoja para que salgan 100% ENTERAS) */}
              {pageData.photos && pageData.photos.length > 0 && (
                <div className="mb-4">
                  {pageData.showPhotosHeading && (
                    <div className="border-l-4 border-cyan-700 pl-2.5 mb-2">
                      <h2 className="text-xs font-black text-slate-950 uppercase tracking-wider">
                        REGISTRO FOTOGRÁFICO DE LA REUNIÓN ({allPhotos.length} FOTOGRAFÍAS)
                      </h2>
                    </div>
                  )}

                  {/* Cuadrícula de fotos completas sin cortes */}
                  <div
                    className={`grid gap-3 ${
                      pageData.photos.length === 1
                        ? 'grid-cols-1 max-w-sm mx-auto'
                        : 'grid-cols-2'
                    }`}
                  >
                    {pageData.photos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50 flex flex-col shadow-xs"
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                      >
                        {/* Contenedor con altura y aspecto controlado para foto completa */}
                        <div className="relative aspect-[4/3] max-h-[62mm] w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          <img
                            src={photo.dataUrl || photo.driveUrl}
                            alt={photo.caption || `Foto ${idx + 1}`}
                            crossOrigin="anonymous"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {photo.caption && (
                          <div className="px-2 py-1 text-[11px] font-semibold text-slate-800 bg-white border-t border-slate-200 text-center truncate">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN INFERIOR DE LA HOJA: FIRMAS (SÓLO ÚLTIMA HOJA) Y PIE DE PÁGINA */}
            <div>
              {/* Bloque de Firmas y Validación (Sólo en la última hoja del documento) */}
              {pageData.showSignatures && (
                <div className="pt-3 border-t-2 border-slate-900 mb-3" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div className="grid grid-cols-2 gap-8 text-center text-xs">
                    <div className="pt-6 border-t border-slate-400">
                      <span className="font-black text-slate-900 block text-xs">
                        Arq. Venier Gaston
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block">
                        Dirección Técnica / Inspección de Obra
                      </span>
                    </div>

                    <div className="pt-6 border-t border-slate-400">
                      <span className="font-black text-slate-900 block text-xs">
                        Firma / Aclaración Asistentes
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium block truncate">
                        {meeting.attendees}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pie de Página Oficial en todas las hojas */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200">
                <span>Control de Avance de Obras • Documento Oficial</span>
                <span className="font-bold text-slate-600">
                  Página {pageData.pageNumber} de {pageData.totalPages}
                </span>
                <span>Generado: {printDateStr}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
