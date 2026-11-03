import { SiteMeeting } from '../types';

/**
 * Formatea una fecha YYYY-MM-DD a formato legible en español argentino
 * ej: "Martes 03/11/2026"
 */
export function formatMeetingDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const dayName = d.toLocaleDateString('es-AR', { weekday: 'long' });
      const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return `${dayCapitalized} ${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
    }
  } catch {}
  return dateStr;
}

/**
 * Construye el texto completo estructurado y profesional para enviar por WhatsApp
 * a quienes no tienen la app instalada.
 */
export function formatMeetingForWhatsApp(meeting: SiteMeeting): string {
  const dateFormatted = formatMeetingDate(meeting.date);
  const timeFormatted = meeting.time ? `${meeting.time} hs` : '';

  let text = `🏗️ *MINUTA DE REUNIÓN EN OBRA*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🏢 *OBRA:* ${meeting.projectName || 'Obra'}\n`;
  if (dateFormatted) text += `📅 *FECHA:* ${dateFormatted}\n`;
  if (timeFormatted) text += `⏰ *HORA:* ${timeFormatted}\n`;
  text += `👥 *CON QUIÉN FUE LA REUNIÓN:*\n${meeting.attendees || 'Personal en obra'}\n\n`;
  text += `📌 *MOTIVO:* ${meeting.title || 'Reunión de coordinación'}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  text += `📝 *TEMAS TRATADOS EN LA REUNIÓN:*\n`;
  text += `${meeting.topics ? meeting.topics.trim() : '(Sin detalle registrado)'}\n\n`;

  if (meeting.commitments && meeting.commitments.trim()) {
    text += `🤝 *ACUERDOS Y COMPROMISOS:*\n`;
    text += `${meeting.commitments.trim()}\n\n`;
  }

  if (meeting.photos && meeting.photos.length > 0) {
    text += `📸 *FOTOGRAFÍAS ADJUNTAS (${meeting.photos.length}):*\n`;
    meeting.photos.forEach((photo, index) => {
      const caption = photo.caption ? ` - ${photo.caption}` : '';
      if (photo.driveUrl && photo.driveUrl.startsWith('http')) {
        text += `• Foto ${index + 1}${caption}: ${photo.driveUrl}\n`;
      } else if (photo.dataUrl && photo.dataUrl.startsWith('http')) {
        text += `• Foto ${index + 1}${caption}: ${photo.dataUrl}\n`;
      } else {
        text += `• Foto ${index + 1}${caption} (archivada en sistema)\n`;
      }
    });
    text += `\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Registro técnico - Control de Avance de Obras_`;

  return text;
}

/**
 * Abre WhatsApp directamente con el texto codificado
 */
export function sendMeetingWhatsApp(meeting: SiteMeeting, phone?: string): void {
  const text = formatMeetingForWhatsApp(meeting);
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/**
 * Convierte un DataURL (base64) a objeto File para Web Share API
 */
export function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

/**
 * Intenta compartir de manera nativa con fotos adjuntas en celulares
 */
export async function shareMeetingNative(meeting: SiteMeeting): Promise<boolean> {
  const text = formatMeetingForWhatsApp(meeting);
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    // Si hay fotos en base64, intentar armar array de Files
    const files: File[] = [];
    if (meeting.photos && meeting.photos.length > 0) {
      for (let i = 0; i < Math.min(meeting.photos.length, 5); i++) {
        const ph = meeting.photos[i];
        if (ph.dataUrl && ph.dataUrl.startsWith('data:image')) {
          const file = dataUrlToFile(ph.dataUrl, `foto_reunion_${i + 1}.jpg`);
          if (file) files.push(file);
        }
      }
    }

    if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({
        title: `Reunión ${meeting.projectName}: ${meeting.title}`,
        text,
        files
      });
      return true;
    }

    // Compartir solo texto si no soporta files
    await navigator.share({
      title: `Reunión ${meeting.projectName}: ${meeting.title}`,
      text
    });
    return true;
  } catch (e: any) {
    if (e.name === 'AbortError') return true; // El usuario canceló voluntariamente
    return false;
  }
}

/**
 * Copia el texto formateado al portapapeles del dispositivo
 */
export async function copyMeetingWhatsAppText(meeting: SiteMeeting): Promise<boolean> {
  const text = formatMeetingForWhatsApp(meeting);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback manual con textarea invisible
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}
