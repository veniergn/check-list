/**
 * Utility for uploading files (photos, plans, sketches) to Google Drive.
 * Communicates with the backend /api/upload endpoint (Vite dev server / Netlify function)
 * or directly with Google Apps Script Web App if configured in client env.
 */

export interface UploadOptions {
  base64: string;
  filename?: string;
  mimeType?: string;
}

export interface UploadResponse {
  success: boolean;
  url: string;
  fileId?: string;
  error?: string;
}

export function isDriveUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://lh3.googleusercontent.com') ||
         url.startsWith('https://drive.google.com') ||
         url.startsWith('https://docs.google.com');
}

export async function uploadFileToDrive(options: UploadOptions): Promise<UploadResponse> {
  const { base64, filename, mimeType } = options;

  if (!base64) {
    return { success: false, url: '', error: 'No se proveyó contenido para el archivo.' };
  }

  // 1. Check if direct client-side Google Apps Script URL is set
  const directAppsScriptUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;

  if (directAppsScriptUrl && directAppsScriptUrl.trim().startsWith('http')) {
    try {
      const response = await fetch(directAppsScriptUrl.trim(), {
        method: 'POST',
        // 'text/plain;charset=utf-8' prevents CORS preflight issues with Google Apps Script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          base64,
          filename: filename || `archivo_${Date.now()}.jpg`,
          mimeType: mimeType || 'image/jpeg'
        })
      });

      const resData = await response.json();
      if (resData && resData.success && resData.url) {
        return {
          success: true,
          url: resData.url,
          fileId: resData.fileId
        };
      }
      if (resData && resData.error) {
        return { success: false, url: '', error: resData.error };
      }
    } catch (e: any) {
      console.warn('Fallo intento directo con Google Apps Script, intentando /api/upload...', e);
    }
  }

  // 2. Call /api/upload endpoint (handled by Vite locally and Netlify Functions in production)
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        base64,
        filename,
        mimeType
      })
    });

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson.error || errJson.message || `Status ${res.status}`;
      } catch {
        errText = await res.text();
      }
      return {
        success: false,
        url: '',
        error: `Error del servidor (${res.status}): ${errText}`
      };
    }

    const data: UploadResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      url: '',
      error: `No se pudo conectar con el servidor de subida: ${err.message || String(err)}`
    };
  }
}

/**
 * Realiza un respaldo en formato JSON de la agenda, eventos y alarmas de una obra
 * y lo guarda directamente en Google Drive.
 */
export async function backupCalendarEventsToDrive(projectName: string, events: any[]): Promise<UploadResponse> {
  try {
    const payload = {
      project: projectName,
      backupDate: new Date().toISOString(),
      eventsCount: events.length,
      events: events
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const base64Data = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr).toString('base64');

    const cleanName = (projectName || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Agenda_${cleanName}_backup.json`;

    return await uploadFileToDrive({
      base64: `data:application/json;base64,${base64Data}`,
      filename,
      mimeType: 'application/json'
    });
  } catch (err: any) {
    console.warn('Aviso backup calendario a Google Drive:', err);
    return { success: false, url: '', error: err?.message };
  }
}

/**
 * Realiza un respaldo en formato JSON del estado completo de Project Manager y Agenda de una obra
 * y lo guarda directamente en Google Drive.
 */
export async function syncProjectManagerToDrive(projectName: string, tasks: any[]): Promise<UploadResponse> {
  try {
    const payload = {
      project: projectName,
      system: 'Project Manager & Calendar Engine',
      syncedAt: new Date().toISOString(),
      tasksCount: tasks.length,
      tasks: tasks
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const base64Data = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr).toString('base64');

    const cleanName = (projectName || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `PM_${cleanName}_backup.json`;

    return await uploadFileToDrive({
      base64: `data:application/json;base64,${base64Data}`,
      filename,
      mimeType: 'application/json'
    });
  } catch (err: any) {
    console.warn('Aviso sync PM a Google Drive:', err);
    return { success: false, url: '', error: err?.message };
  }
}


