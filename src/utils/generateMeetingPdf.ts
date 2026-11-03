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
 * Genera un archivo Blob PDF en formato A4 vertical con fotos incrustadas a partir de la hoja HTML
 */
export async function generateMeetingPdfBlob(
  element: HTMLElement,
  meeting: SiteMeeting
): Promise<{ blob: Blob; filename: string }> {
  await waitForImagesToLoad(element);

  // Capturar el contenedor de la hoja con alta resolución (escala 2x para nitidez de texto y fotos)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = 210;
  const pdfHeight = 297;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Altura proporcional calculada en milímetros
  const imgHeightMm = (canvasHeight * pdfWidth) / canvasWidth;

  if (imgHeightMm <= pdfHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeightMm);
  } else {
    // Si la minuta se extiende a más de 1 página A4
    let heightLeft = imgHeightMm;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMm);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = -(imgHeightMm - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMm);
      heightLeft -= pdfHeight;
    }
  }

  const cleanProject = (meeting.projectName || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanDate = (meeting.date || 'fecha').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Minuta_${cleanProject}_${cleanDate}.pdf`;

  const blob = pdf.output('blob');
  return { blob, filename };
}

/**
 * Descarga directamente el archivo PDF en el dispositivo del usuario
 */
export async function downloadMeetingPdf(
  element: HTMLElement,
  meeting: SiteMeeting
): Promise<string> {
  const { blob, filename } = await generateMeetingPdfBlob(element, meeting);
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
 * Envía el archivo PDF de la minuta por WhatsApp (como archivo adjunto en móviles o con descarga en escritorio)
 */
export async function shareMeetingPdfViaWhatsApp(
  element: HTMLElement,
  meeting: SiteMeeting
): Promise<{ method: 'native_share' | 'download_and_whatsapp' }> {
  const { blob, filename } = await generateMeetingPdfBlob(element, meeting);
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });

  // 1. Intento con Web Share API (celulares Android / iOS y navegadores modernos compatibles con archivos)
  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: `Minuta de Reunión - ${meeting.projectName}`,
        text: `Minuta de Reunión en Obra: ${meeting.projectName} - ${meeting.title}`,
        files: [pdfFile]
      });
      return { method: 'native_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { method: 'native_share' };
      }
      // Si falla el share de archivos, continúa con el fallback
    }
  }

  // 2. Fallback: descarga inmediata del archivo PDF oficial + apertura de WhatsApp
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  const text =
    `*MINUTA DE REUNIÓN EN OBRA*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `*OBRA:* ${meeting.projectName || 'Obra'}\n` +
    `*FECHA:* ${meeting.date}\n` +
    `*CON QUIÉN FUE:* ${meeting.attendees}\n` +
    `*MOTIVO:* ${meeting.title}\n\n` +
    `📄 *Archivo PDF oficial adjunto:* ${filename}\n` +
    `_Contiene informe completo en A4 con fotografías incrustadas._`;

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, '_blank');

  return { method: 'download_and_whatsapp' };
}
