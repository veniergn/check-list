import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SiteMeeting } from '../types';

/**
 * Espera a que las imágenes dentro de un elemento se carguen, con timeout ultra seguro
 * para que NUNCA se quede pensando indefinidamente.
 */
async function waitForImagesToLoad(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  if (images.length === 0) return;

  const imagePromises = images.map(img => {
    // Si ya completó (con éxito o error), resolver inmediatamente
    if (img.complete) return Promise.resolve();

    return new Promise(resolve => {
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve(true);
        }
      };
      img.onload = done;
      img.onerror = done;
      // Timeout seguro individual de 350ms
      setTimeout(done, 350);
    });
  });

  // Timeout seguro global de 500ms
  await Promise.race([
    Promise.all(imagePromises),
    new Promise(resolve => setTimeout(resolve, 500))
  ]);
}

/**
 * Genera un archivo Blob PDF en formato A4 vertical con fotos completas a partir de las páginas HTML (.site-meeting-a4-page)
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

    let canvas: HTMLCanvasElement | null = null;
    try {
      // Capturar la hoja con scale: 1.5 para alta resolución veloz y sin trabas
      canvas = await html2canvas(pageEl, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794
      });
    } catch (corsErr) {
      console.warn('html2canvas CORS fallback:', corsErr);
      try {
        canvas = await html2canvas(pageEl, {
          scale: 1.2,
          useCORS: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });
      } catch (fbErr) {
        console.error('Error total en html2canvas para página ' + (i + 1), fbErr);
      }
    }

    if (canvas) {
      try {
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      } catch (dataErr) {
        console.warn('Error al exportar toDataURL (posible canvas tainted):', dataErr);
      }
    }
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
 */
export async function shareMeetingPdfViaWhatsApp(
  containerElement: HTMLElement,
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
