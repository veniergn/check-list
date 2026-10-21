/**
 * High-Performance Resilient Google Drive File Uploader
 * Direct upload to user's Google Drive via Google Apps Script Web App (veniergn@gmail.com)
 * Automatically optimizes images, handles redirects, and provides direct CDN URLs.
 */

export const DEFAULT_GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4EZXFIWDFZx72UjMV2xCaH0A66aV2wNyiD2m95yzQG6xKqT-pkvuxnKJjYD7Oh_4uDw/exec';

export function getGoogleAppsScriptUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().startsWith('http')) {
    return envUrl.trim();
  }
  return DEFAULT_GOOGLE_APPS_SCRIPT_URL;
}

export interface UploadOptions {
  base64: string;
  filename?: string;
  mimeType?: string;
}

export interface UploadResponse {
  success: boolean;
  url: string;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

export function isDriveUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://lh3.googleusercontent.com') ||
         url.startsWith('https://drive.google.com') ||
         url.startsWith('https://docs.google.com');
}

/**
 * Optimizes base64 images client-side before transmission.
 * Reduces 10MB camera shots to ~150KB in milliseconds, saving bandwidth and preventing timeouts.
 */
export function compressBase64Image(base64: string, maxDim: number = 1400, quality: number = 0.76): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !base64 || !base64.startsWith('data:image')) {
      return resolve(base64);
    }
    // If already small (< 250KB), no need to re-compress
    if (base64.length < 250000) {
      return resolve(base64);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64);

        ctx.drawImage(img, 0, 0, width, height);
        const result = canvas.toDataURL('image/jpeg', quality);
        resolve(result);
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
}

/**
 * Uploads a file (photo, sketch, PDF or JSON backup) directly to Google Drive
 */
export async function uploadFileToDrive(options: UploadOptions): Promise<UploadResponse> {
  let { base64, filename, mimeType } = options;

  if (!base64) {
    return { success: false, url: '', error: 'No se proveyó contenido para el archivo.' };
  }

  // If already an online URL, return immediately
  if (isDriveUrl(base64) || base64.startsWith('http://') || base64.startsWith('https://')) {
    return { success: true, url: base64 };
  }

  // Pre-compress images to ultra-fast web size
  if (base64.startsWith('data:image')) {
    try {
      base64 = await compressBase64Image(base64, 1400, 0.76);
    } catch (e) {
      console.warn('Compresión previa omitida:', e);
    }
  }

  // 1. Direct client-side upload to Google Apps Script Web App
  const directAppsScriptUrl = getGoogleAppsScriptUrl();

  if (directAppsScriptUrl && directAppsScriptUrl.trim().startsWith('http')) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 35000) : null;

      const response = await fetch(directAppsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          base64,
          filename: filename || `archivo_${Date.now()}.jpg`,
          mimeType: mimeType || 'image/jpeg'
        }),
        signal: controller?.signal
      });

      if (timeoutId) clearTimeout(timeoutId);

      const resData = await response.json();
      if (resData && resData.success && (resData.url || resData.fileId)) {
        const fileId = resData.fileId;
        const directCdnUrl = fileId
          ? `https://lh3.googleusercontent.com/d/${fileId}`
          : (resData.url || '');

        return {
          success: true,
          url: directCdnUrl,
          fileId: fileId,
          webViewLink: resData.webViewLink
        };
      }
      if (resData && resData.error) {
        return { success: false, url: '', error: resData.error };
      }
    } catch (e: any) {
      console.warn('Aviso: Falló subida directa a Google Apps Script, intentando /api/upload...', e?.message || e);
    }
  }

  // 2. Fallback to /api/upload endpoint
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, filename, mimeType })
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
        error: `Servidor de subida (${res.status}): ${errText}`
      };
    }

    const data: UploadResponse = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      url: '',
      error: `No se pudo conectar con el servicio de subida: ${err.message || String(err)}`
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

/**
 * Realiza un respaldo en formato JSON de todos los pedidos de materiales de una obra
 * y lo guarda directamente en Google Drive bajo la cuenta veniergn@gmail.com.
 */
export async function backupMaterialsToDrive(projectName: string, orders: any[]): Promise<UploadResponse> {
  try {
    const payload = {
      project: projectName,
      system: 'Gestión de Materiales por Obra',
      adminUser: 'veniergn@gmail.com',
      syncedAt: new Date().toISOString(),
      ordersCount: orders.length,
      orders: orders
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const base64Data = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr).toString('base64');

    const cleanName = (projectName || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Materiales_${cleanName}_backup.json`;

    return await uploadFileToDrive({
      base64: `data:application/json;base64,${base64Data}`,
      filename,
      mimeType: 'application/json'
    });
  } catch (err: any) {
    console.warn('Aviso backup materiales a Google Drive:', err);
    return { success: false, url: '', error: err?.message };
  }
}

/**
 * Realiza un respaldo en formato JSON de todas las planillas de certificados de contratistas
 * de una obra y lo guarda directamente en Google Drive bajo la cuenta veniergn@gmail.com.
 */
export async function backupCertificatesToDrive(projectName: string, certificates: any[]): Promise<UploadResponse> {
  try {
    const payload = {
      project: projectName,
      system: 'Certificados de Contratistas (Quincenales)',
      adminUser: 'veniergn@gmail.com',
      syncedAt: new Date().toISOString(),
      certificatesCount: certificates.length,
      certificates: certificates
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const base64Data = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr).toString('base64');

    const cleanName = (projectName || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Certificados_${cleanName}_backup.json`;

    return await uploadFileToDrive({
      base64: `data:application/json;base64,${base64Data}`,
      filename,
      mimeType: 'application/json'
    });
  } catch (err: any) {
    console.warn('Aviso backup certificados a Google Drive:', err);
    return { success: false, url: '', error: err?.message };
  }
}


/**
 * Guarda y actualiza la Base de Datos Maestra completa de Obras directamente en Google Drive (veniergn@gmail.com).
 * Esto garantiza que ninguna información dependa exclusivamente de Supabase y evita saturar la memoria.
 */
let isSyncingMaster = false;
let pendingMasterSync: any = null;

export async function syncProjectsMasterToDrive(projects: any[]): Promise<UploadResponse> {
  if (isSyncingMaster) {
    pendingMasterSync = projects;
    return { success: true, url: '' };
  }

  isSyncingMaster = true;
  try {
    const cleanProjects = projects.map(p => ({
      ...p,
      contractors: (p.contractors || []).map((c: any) => {
        if (c.excelFile?.base64Data && c.excelFile.driveFileId) {
          const { base64Data, ...rest } = c.excelFile;
          return { ...c, excelFile: rest };
        }
        return c;
      })
    }));

    const payload = {
      system: 'Control de Avance - Base de Datos Maestra',
      adminUser: 'veniergn@gmail.com',
      lastSyncedAt: new Date().toISOString(),
      projectsCount: cleanProjects.length,
      projects: cleanProjects
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const base64Data = typeof window !== 'undefined'
      ? btoa(unescape(encodeURIComponent(jsonStr)))
      : Buffer.from(jsonStr).toString('base64');

    const filename = 'Control_Avance_Master_Database.json';

    const res = await uploadFileToDrive({
      base64: `data:application/json;base64,${base64Data}`,
      filename,
      mimeType: 'application/json'
    });

    if (res.success && res.url) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('control_avance_drive_master_url', res.url);
        localStorage.setItem('control_avance_drive_master_synced_at', new Date().toISOString());
      }
    }

    return res;
  } catch (err: any) {
    console.warn('Aviso sincronización base maestra en Google Drive:', err);
    return { success: false, url: '', error: err?.message };
  } finally {
    isSyncingMaster = false;
    if (pendingMasterSync) {
      const next = pendingMasterSync;
      pendingMasterSync = null;
      syncProjectsMasterToDrive(next);
    }
  }
}
