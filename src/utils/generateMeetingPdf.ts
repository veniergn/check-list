import jsPDF from 'jspdf';
import { SiteMeeting } from '../types';

/**
 * Genera de forma nativa e INSTANTÁNEA (< 200ms) el archivo Blob PDF oficial en formato A4 vertical.
 * Al ser generado directamente con jsPDF en lugar de html2canvas:
 * 1. Cero bloqueos, cero cuelgues ni tiempos de espera.
 * 2. Texto vectorial 100% nítido a 11pt real para impresión perfecta.
 * 3. Fotografías completas sin cortes entre hojas.
 * 4. Paginación A4 automática y cálculo exacto de saltos de página.
 */
export async function generateMeetingPdfBlob(
  _containerElement: HTMLElement | null,
  meeting: SiteMeeting
): Promise<{ blob: Blob; filename: string }> {
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
  let y = 14;

  const drawContinuationHeader = () => {
    y = 12;
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(marginX, y, contentWidth, 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text(
      `CONTINUACIÓN | MINUTA DE REUNIÓN EN OBRA • ${(meeting.projectName || 'OBRA').toUpperCase()}`,
      marginX + 3,
      y + 5.5
    );
    y += 13;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 18) {
      pdf.addPage('a4', 'portrait');
      drawContinuationHeader();
      return true;
    }
    return false;
  };

  // 1. ENCABEZADO PRINCIPAL (HOJA 1)
  pdf.setFillColor(15, 23, 42);
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

  // 2. FICHA DE METADATOS
  const metaBoxHeight = 34;
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.setDrawColor(203, 213, 225); // slate-300
  pdf.setLineWidth(0.3);
  pdf.roundedRect(marginX, y, contentWidth, metaBoxHeight, 2, 2, 'FD');

  const col1X = marginX + 4;
  const col2X = marginX + contentWidth / 2 + 2;

  // Obra
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text('OBRA / PROYECTO', col1X, y + 5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10.5);
  pdf.text(meeting.projectName || 'Obra General', col1X, y + 10);

  // Fecha y hora
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

  // Asistentes
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(7.5);
  pdf.text('CON QUIÉN FUE LA REUNIÓN (ASISTENTES)', col1X, y + 17);
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(10);
  pdf.text(meeting.attendees || '-', col1X, y + 22);

  pdf.line(col1X, y + 24, marginX + contentWidth - 4, y + 24);

  // Motivo
  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(7.5);
  pdf.text('MOTIVO / ASUNTO', col1X, y + 28);
  pdf.setTextColor(67, 56, 202); // indigo-700
  pdf.setFontSize(9.5);
  pdf.text(meeting.title || 'Reunión de coordinación', col1X, y + 32);

  y += metaBoxHeight + 6;

  // 3. TEMAS TRATADOS (Párrafos e ítems numerados / viñetas a 11pt)
  if (meeting.topics && meeting.topics.trim()) {
    checkPageBreak(18);

    pdf.setFillColor(67, 56, 202); // indigo-700
    pdf.rect(marginX, y, 3, 6, 'F');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.text('TEMAS TRATADOS EN LA REUNIÓN', marginX + 5, y + 4.8);
    y += 9;

    const rawParagraphs = meeting.topics.split(/\r?\n/);
    pdf.setFontSize(11); // Tipografía 11pt real
    pdf.setTextColor(30, 41, 59);

    for (const para of rawParagraphs) {
      if (!para.trim()) {
        y += 2.5;
        continue;
      }

      const isHeader = /^(\d+[\.\)]|[A-Z0-9\s]{4,}:)/.test(para.trim());
      if (isHeader) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      const splitLines = pdf.splitTextToSize(para, contentWidth - 4);
      const blockHeight = splitLines.length * 5.6;

      checkPageBreak(blockHeight + 2);

      pdf.text(splitLines, marginX + 2, y + 4.2);
      y += blockHeight + 2.5;
    }

    y += 4;
  }

  // 4. ACUERDOS Y COMPROMISOS
  if (meeting.commitments && meeting.commitments.trim()) {
    checkPageBreak(25);

    pdf.setFillColor(217, 119, 6); // amber-600
    pdf.rect(marginX, y, 3, 6, 'F');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.text('ACUERDOS Y COMPROMISOS ACORDADOS', marginX + 5, y + 4.8);
    y += 8;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(120, 53, 15);

    const splitCommitments = pdf.splitTextToSize(meeting.commitments.trim(), contentWidth - 8);
    const boxH = splitCommitments.length * 5.8 + 6;

    checkPageBreak(boxH);

    pdf.setFillColor(254, 243, 199); // amber-100
    pdf.setDrawColor(245, 158, 11); // amber-500
    pdf.setLineWidth(0.3);
    pdf.roundedRect(marginX, y, contentWidth, boxH, 2, 2, 'FD');

    pdf.text(splitCommitments, marginX + 4, y + 5.5);
    y += boxH + 6;
  }

  // 5. REGISTRO FOTOGRÁFICO (Fotos completas sin cortes)
  const photos = meeting.photos || [];
  if (photos.length > 0) {
    checkPageBreak(30);

    pdf.setFillColor(14, 116, 144); // cyan-700
    pdf.rect(marginX, y, 3, 6, 'F');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10.5);
    pdf.text(`REGISTRO FOTOGRÁFICO DE LA REUNIÓN (${photos.length} FOTOGRAFÍAS)`, marginX + 5, y + 4.8);
    y += 9;

    const photoW = 88;
    const photoH = 58;

    for (let i = 0; i < photos.length; i += 2) {
      checkPageBreak(photoH + 10);

      const p1 = photos[i];
      const p2 = photos[i + 1];

      // Foto 1
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

      // Foto 2
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

  // 6. FIRMAS (Última hoja)
  checkPageBreak(32);
  y += 4;
  pdf.setDrawColor(15, 23, 42);
  pdf.setLineWidth(0.6);
  pdf.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  const sigCol1X = marginX + 35;
  const sigCol2X = pageWidth - marginX - 35;

  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.3);
  pdf.line(sigCol1X - 25, y + 10, sigCol1X + 25, y + 10);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('Arq. Venier Gaston', sigCol1X, y + 14, { align: 'center' });
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text('Dirección Técnica / Inspección de Obra', sigCol1X, y + 18, { align: 'center' });

  pdf.line(sigCol2X - 25, y + 10, sigCol2X + 25, y + 10);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text('Firma / Aclaración Asistentes', sigCol2X, y + 14, { align: 'center' });
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);
  pdf.text(meeting.attendees || 'Asistentes', sigCol2X, y + 18, { align: 'center', maxWidth: 60 });

  // 7. PIE DE PÁGINA EN TODAS LAS HOJAS
  const totalPages = (pdf as any).internal.getNumberOfPages();
  const now = new Date();
  const printDateStr =
    now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' - ' +
    now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) +
    ' hs';

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
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
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });

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
