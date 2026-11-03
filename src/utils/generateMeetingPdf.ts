import jsPDF from 'jspdf';
import { SiteMeeting, SiteMeetingPhoto } from '../types';

export interface MeetingPageData {
  pageNumber: number;
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;

  showHeaderAndMeta?: boolean;
  showContinuationHeader?: boolean;

  topicParagraphs?: string[];
  showTopicsHeading?: boolean;
  isTopicsContinuation?: boolean;

  commitmentsText?: string;

  photos?: SiteMeetingPhoto[];
  showPhotosHeading?: boolean;

  showSignatures?: boolean;
}

/**
 * Paginación determinista oficial en hojas A4 verticales (210mm x 297mm).
 * Se utiliza tanto en la vista HTML como en la generación nativa de jsPDF,
 * garantizando que el PDF descargado y el enviado por WhatsApp sea un clon idéntico
 * de la vista de pantalla y de la impresión.
 */
export function paginateMeeting(meeting: SiteMeeting): MeetingPageData[] {
  const MAX_USABLE_HEIGHT = 261;
  const HEADER_AND_META_HEIGHT = 68;
  const CONTINUATION_HEADER_HEIGHT = 20;
  const SIGNATURES_HEIGHT = 38;
  const TOPICS_HEADING_HEIGHT = 12;
  const COMMITMENTS_BASE_HEIGHT = 18;
  const PHOTOS_HEADING_HEIGHT = 12;
  const PHOTO_ROW_HEIGHT = 65;

  const getParagraphHeight = (text: string): number => {
    if (!text || text.trim() === '') return 4;
    const lines = Math.max(1, Math.ceil(text.length / 85));
    return lines * 6.6 + 4;
  };

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

  const commitments = meeting.commitments ? meeting.commitments.trim() : '';
  const commitmentsHeight = commitments
    ? COMMITMENTS_BASE_HEIGHT + Math.max(1, Math.ceil(commitments.length / 85)) * 6.6
    : 0;

  const allPhotos = meeting.photos || [];
  const photoRows: SiteMeetingPhoto[][] = [];
  for (let i = 0; i < allPhotos.length; i += 2) {
    photoRows.push(allPhotos.slice(i, i + 2));
  }

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

  const pages: MeetingPageData[] = [];
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

  let currentHeight = HEADER_AND_META_HEIGHT + (refinedParagraphs.length > 0 ? TOPICS_HEADING_HEIGHT : 0);
  const PAGE_1_MAX_HEIGHT = 250;
  const OTHER_PAGES_MAX_HEIGHT = 250;

  for (const p of refinedParagraphs) {
    const pHeight = getParagraphHeight(p);
    const limit = currentPage.pageNumber === 1 ? PAGE_1_MAX_HEIGHT : OTHER_PAGES_MAX_HEIGHT;

    if (currentHeight + pHeight > limit && (currentPage.topicParagraphs?.length ?? 0) > 0) {
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

  const limitForSignatures = currentPage.pageNumber === 1 ? PAGE_1_MAX_HEIGHT : OTHER_PAGES_MAX_HEIGHT;
  if (currentHeight + SIGNATURES_HEIGHT > limitForSignatures) {
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

  const totalPages = pages.length;
  pages.forEach((p, idx) => {
    p.pageNumber = idx + 1;
    p.totalPages = totalPages;
    p.isLastPage = idx === totalPages - 1;
  });

  return pages;
}

/**
 * Genera el archivo Blob PDF con jsPDF mapeando 1 a 1 la paginación oficial:
 * Todas las páginas se crean completas, con texto 100% visible (cero texto blanco),
 * respetando el orden exacto de temas, compromisos, fotografías y firmas.
 */
export async function generateMeetingPdfBlob(
  _containerElement: HTMLElement | null,
  meeting: SiteMeeting
): Promise<{ blob: Blob; filename: string }> {
  const pages = paginateMeeting(meeting);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  const now = new Date();
  const printDateStr =
    now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' - ' +
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    ' hs';

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageData = pages[pageIdx];

    if (pageIdx > 0) {
      pdf.addPage('a4', 'portrait');
    }

    let y = 14;

    // 1. ENCABEZADO DE HOJA
    if (pageData.showHeaderAndMeta) {
      // Badge oficial
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.roundedRect(marginX, y, 68, 5, 1, 1, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text('INFORME TÉCNICO OFICIAL', marginX + 3, y + 3.6);

      pdf.setTextColor(71, 85, 105);
      pdf.text('CONTROL DE AVANCE DE OBRAS', marginX + 72, y + 3.6);

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('VENIER ARQUITECTURA', pageWidth - marginX, y + 3.6, { align: 'right' });
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text('Dirección Técnica de Obras', pageWidth - marginX, y + 7.5, { align: 'right' });

      y += 7;

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(17);
      pdf.text('MINUTA DE REUNIÓN EN OBRA', marginX, y + 6);
      y += 9;

      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.text('Supervisión técnica, acuerdos y registro fotográfico en terreno', marginX, y + 3);
      y += 6;

      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.8);
      pdf.line(marginX, y, pageWidth - marginX, y);
      y += 5;

      // Ficha de metadatos
      const metaBoxHeight = 34;
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(marginX, y, contentWidth, metaBoxHeight, 2, 2, 'FD');

      const col1X = marginX + 4;
      const col2X = marginX + contentWidth / 2 + 2;

      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.text('OBRA / PROYECTO', col1X, y + 5);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10.5);
      pdf.text(meeting.projectName || 'Obra General', col1X, y + 10);

      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7.5);
      pdf.text('FECHA Y HORA DE LA REUNIÓN', col2X, y + 5);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10);
      const timeStr = meeting.time ? ` • ${meeting.time} hs` : '';
      pdf.text(`${meeting.date}${timeStr}`, col2X, y + 10);

      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.2);
      pdf.line(col1X, y + 13, marginX + contentWidth - 4, y + 13);

      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7.5);
      pdf.text('CON QUIÉN FUE LA REUNIÓN (ASISTENTES)', col1X, y + 17);
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10);
      pdf.text(meeting.attendees || '-', col1X, y + 22);

      pdf.line(col1X, y + 24, marginX + contentWidth - 4, y + 24);

      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(7.5);
      pdf.text('MOTIVO / ASUNTO', col1X, y + 28);
      pdf.setTextColor(67, 56, 202);
      pdf.setFontSize(9.5);
      pdf.text(meeting.title || 'Reunión de coordinación', col1X, y + 32);

      y += metaBoxHeight + 6;
    } else if (pageData.showContinuationHeader) {
      // Banner oficial de continuación
      pdf.setFillColor(15, 23, 42);
      pdf.rect(marginX, 12, contentWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text(
        `CONTINUACIÓN | MINUTA DE REUNIÓN EN OBRA • ${(meeting.projectName || 'OBRA').toUpperCase()}`,
        marginX + 3,
        17.5
      );
      // REINICIO OBLIGATORIO DE COLOR A OSCURO (Soluciona texto invisible en hoja 2)
      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'normal');
      y = 25;
    }

    // 2. TEMAS TRATADOS EN ESTA HOJA
    if (pageData.topicParagraphs && pageData.topicParagraphs.length > 0) {
      if (pageData.showTopicsHeading) {
        pdf.setFillColor(67, 56, 202);
        pdf.rect(marginX, y, 3, 6, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.text('TEMAS TRATADOS EN LA REUNIÓN', marginX + 5, y + 4.8);
        y += 9;
      } else if (pageData.isTopicsContinuation) {
        pdf.setFillColor(99, 102, 241);
        pdf.rect(marginX, y, 2.5, 4.5, 'F');
        pdf.setTextColor(67, 56, 202);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        pdf.text('(Continuación de temas tratados)', marginX + 5, y + 3.8);
        y += 7;
      }

      pdf.setFontSize(11); // Tipografía 11pt legible
      pdf.setTextColor(30, 41, 59); // Asegurar color oscuro siempre

      for (const para of pageData.topicParagraphs) {
        if (!para.trim()) {
          y += 2.5;
          continue;
        }

        const isHeader = /^(\d+[\.\)]|[A-Z0-9\s]{4,}:)/.test(para.trim());
        if (isHeader) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(15, 23, 42);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(30, 41, 59);
        }

        const splitLines = pdf.splitTextToSize(para, contentWidth - 4);
        pdf.text(splitLines, marginX + 2, y + 4.2);
        y += splitLines.length * 5.6 + 2.5;
      }

      y += 2;
    }

    // 3. ACUERDOS Y COMPROMISOS (SI CORRESPONDEN A ESTA HOJA)
    if (pageData.commitmentsText) {
      pdf.setFillColor(217, 119, 6);
      pdf.rect(marginX, y, 3, 6, 'F');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10.5);
      pdf.text('ACUERDOS Y COMPROMISOS ACORDADOS', marginX + 5, y + 4.8);
      y += 8;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(120, 53, 15);

      const splitCommitments = pdf.splitTextToSize(pageData.commitmentsText, contentWidth - 8);
      const boxH = splitCommitments.length * 5.8 + 6;

      pdf.setFillColor(254, 243, 199);
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(marginX, y, contentWidth, boxH, 2, 2, 'FD');

      pdf.text(splitCommitments, marginX + 4, y + 5.5);
      y += boxH + 6;
    }

    // 4. REGISTRO FOTOGRÁFICO (SI CORRESPONDE A ESTA HOJA)
    if (pageData.photos && pageData.photos.length > 0) {
      if (pageData.showPhotosHeading) {
        pdf.setFillColor(14, 116, 144);
        pdf.rect(marginX, y, 3, 6, 'F');
        pdf.setTextColor(15, 23, 42);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.text(`REGISTRO FOTOGRÁFICO DE LA REUNIÓN (${(meeting.photos || []).length} FOTOGRAFÍAS)`, marginX + 5, y + 4.8);
        y += 9;
      }

      const photoW = 88;
      const photoH = 58;

      for (let pIdx = 0; pIdx < pageData.photos.length; pIdx += 2) {
        const p1 = pageData.photos[pIdx];
        const p2 = pageData.photos[pIdx + 1];

        if (p1 && (p1.dataUrl || p1.driveUrl)) {
          const src1 = p1.dataUrl || p1.driveUrl;
          if (src1.startsWith('data:')) {
            try {
              pdf.setFillColor(241, 245, 249);
              pdf.rect(marginX, y, photoW, photoH, 'F');
              pdf.addImage(src1, 'JPEG', marginX, y, photoW, photoH - 6);
            } catch (err) {
              console.warn('Error al incrustar foto 1 en PDF:', err);
            }
          }
          if (p1.caption) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.setTextColor(51, 65, 85);
            pdf.text(p1.caption, marginX + photoW / 2, y + photoH - 1.5, { align: 'center', maxWidth: photoW - 4 });
          }
          pdf.setDrawColor(203, 213, 225);
          pdf.rect(marginX, y, photoW, photoH, 'S');
        }

        if (p2 && (p2.dataUrl || p2.driveUrl)) {
          const x2 = marginX + photoW + 6;
          const src2 = p2.dataUrl || p2.driveUrl;
          if (src2.startsWith('data:')) {
            try {
              pdf.setFillColor(241, 245, 249);
              pdf.rect(x2, y, photoW, photoH, 'F');
              pdf.addImage(src2, 'JPEG', x2, y, photoW, photoH - 6);
            } catch (err) {
              console.warn('Error al incrustar foto 2 en PDF:', err);
            }
          }
          if (p2.caption) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.setTextColor(51, 65, 85);
            pdf.text(p2.caption, x2 + photoW / 2, y + photoH - 1.5, { align: 'center', maxWidth: photoW - 4 });
          }
          pdf.setDrawColor(203, 213, 225);
          pdf.rect(x2, y, photoW, photoH, 'S');
        }

        y += photoH + 6;
      }
    }

    // 5. FIRMAS (ÚLTIMA HOJA)
    if (pageData.showSignatures) {
      const sigY = pageHeight - 38;
      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.6);
      pdf.line(marginX, sigY - 2, pageWidth - marginX, sigY - 2);

      const sigCol1X = marginX + 35;
      const sigCol2X = pageWidth - marginX - 35;

      pdf.setDrawColor(148, 163, 184);
      pdf.setLineWidth(0.3);
      pdf.line(sigCol1X - 25, sigY + 8, sigCol1X + 25, sigY + 8);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text('Arq. Venier Gaston', sigCol1X, sigY + 12, { align: 'center' });
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text('Dirección Técnica / Inspección de Obra', sigCol1X, sigY + 16, { align: 'center' });

      pdf.line(sigCol2X - 25, sigY + 8, sigCol2X + 25, sigY + 8);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text('Firma / Aclaración Asistentes', sigCol2X, sigY + 12, { align: 'center' });
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text(meeting.attendees || 'Asistentes', sigCol2X, sigY + 16, { align: 'center', maxWidth: 60 });
    }

    // 6. PIE DE PÁGINA EN CADA HOJA
    const footerY = pageHeight - 8;
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(marginX, footerY - 3, pageWidth - marginX, footerY - 3);

    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.text('Control de Avance de Obras • Documento Oficial', marginX, footerY);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Página ${pageData.pageNumber} de ${pageData.totalPages}`, pageWidth / 2, footerY, { align: 'center' });

    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Generado: ${printDateStr}`, pageWidth - marginX, footerY, { align: 'right' });
  }

  const cleanProject = (meeting.projectName || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = (meeting.date || 'fecha').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Minuta_${cleanProject}_${cleanDate}.pdf`;

  const blob = pdf.output('blob');
  return { blob, filename };
}

/**
 * Descarga directamente el archivo PDF oficial en el dispositivo del usuario
 */
export async function downloadMeetingPdf(
  containerElement: HTMLElement | null,
  meeting: SiteMeeting
): Promise<string> {
  const { blob, filename } = await generateMeetingPdfBlob(containerElement, meeting);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}

/**
 * Comparte el archivo PDF oficial de la minuta por WhatsApp
 */
export async function shareMeetingPdfViaWhatsApp(
  containerElement: HTMLElement | null,
  meeting: SiteMeeting
): Promise<{ method: 'native_share' | 'download_and_whatsapp' }> {
  const { blob, filename } = await generateMeetingPdfBlob(containerElement, meeting);
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  // 1. Intento nativo con Web Share API (celulares y navegadores compatibles)
  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: `Minuta de Reunión - ${meeting.projectName}`,
        text: `Minuta oficial en A4: ${meeting.projectName} - ${meeting.title}`,
        files: [pdfFile]
      });
      return { method: 'native_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'native_share' };
      }
    }
  }

  // 2. Fallback inmediato: Descarga del archivo PDF + apertura de WhatsApp
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  const text =
    `*MINUTA DE REUNIÓN EN OBRA (DOCUMENTO PDF OFICIAL)*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*OBRA:* ${meeting.projectName || 'Obra'}\n` +
    `*FECHA:* ${meeting.date}\n` +
    `*CON QUIÉN FUE:* ${meeting.attendees}\n` +
    `*ASUNTO:* ${meeting.title}\n\n` +
    `📄 *Archivo PDF adjunto:* ${filename}\n` +
    `_Documento oficial en hoja A4 con fotos completas para imprimir o archivar._`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  return { method: 'download_and_whatsapp' };
}
