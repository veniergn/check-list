import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SiteMeeting } from '../types';

/**
 * Espera a que todas las imágenes dentro de un elemento se carguen completamente
 */
async function waitForImagesToLoad(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    })
  );
}

/**
 * Genera un archivo Blob PDF en formato A4 vertical con fotos completas a partir de las páginas HTML (.site-meeting-a4-page)
 * Cada página se procesa independientemente para garantizar cero cortes de imágenes y diagramación perfecta.
 */
export async function generateMeetingPdfBlob(
  containerElement: HTMLElement,
  meeting: SiteMeeting
): Promise<{ blob: Blob; filename: string }> {
  // Buscar todas las páginas A4 individuales
  const pageElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>('.site-meeting-a4-page')
  );

  const targets = pageElements.length > 0 ? pageElements : [containerElement];

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < targets.length; i++) {
    const pageEl = targets[i];
    await waitForImagesToLoad(pageEl);

    // Capturar la hoja A4 a escala 2x para máxima nitidez de texto y fotografías
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794 // 210mm a 96 DPI
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Agregar la página completa de 0 a 297mm sin cortar nada
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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
  containerElement: HTMLElement,
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
 * - En celulares Android / iOS usa la API nativa compartiendo directamente el archivo .pdf
 * - En computadoras descarga el PDF y abre WhatsApp Web con el mensaje oficial preparado
 */
export async function shareMeetingPdfViaWhatsApp(
  containerElement: HTMLElement,
  meeting: SiteMeeting
): Promise<{ method: 'native_share' | 'download_and_whatsapp' }> {
  const { blob, filename } = await generateMeetingPdfBlob(containerElement, meeting);
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  // 1. Intento nativo con Web Share API (celulares y navegadores que admiten compartir archivos)
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
      // Si falla, continúa con fallback de descarga y apertura de chat
    }
  }

  // 2. Fallback: Descarga del archivo PDF + apertura de WhatsApp
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
    `_Documento oficial ajustado a hoja A4 con fotografías completas para imprimir o archivar._`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  return { method: 'download_and_whatsapp' };
}
