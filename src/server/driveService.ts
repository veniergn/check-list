import dns from 'node:dns';
import { Readable } from 'node:stream';
import { google } from 'googleapis';

// Configure DNS fallback if Google APIs fail to resolve on local network
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch {
  // Ignore in environments where setting DNS is restricted
}

export interface DriveUploadPayload {
  base64: string;
  filename?: string;
  mimeType?: string;
}

export interface DriveUploadResult {
  success: boolean;
  url?: string;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

export async function uploadToDrive(payload: DriveUploadPayload): Promise<DriveUploadResult> {
  const { base64, filename, mimeType } = payload;
  if (!base64) {
    return { success: false, error: 'No se recibieron datos de archivo (base64 requerido).' };
  }

  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_URL;

  // 1. If Google Apps Script Web App URL is configured, use it directly (best for personal @gmail.com accounts)
  if (appsScriptUrl && appsScriptUrl.trim().startsWith('http')) {
    try {
      const response = await fetch(appsScriptUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64,
          filename: filename || `archivo_${Date.now()}.jpg`,
          mimeType: mimeType || 'image/jpeg'
        })
      });

      const data = await response.json();
      if (data && data.success && data.url) {
        return {
          success: true,
          url: data.url,
          fileId: data.fileId,
          webViewLink: data.webViewLink
        };
      } else {
        return {
          success: false,
          error: data?.error || 'Error desconocido al subir mediante Google Apps Script.'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Fallo de conexión con Google Apps Script: ${err.message || String(err)}`
      };
    }
  }

  // 2. Otherwise, attempt upload using Google Service Account
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1gVLn_XCwQkr0Vq2bEtExIIpcGDgoVLXU';

  if (!clientEmail || !rawPrivateKey) {
    return {
      success: false,
      error: 'Credenciales de Google Drive no configuradas. Provee GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY o GOOGLE_APPS_SCRIPT_URL.'
    };
  }

  try {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // Clean base64 string
    const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(pureBase64, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const safeMime = mimeType || 'image/jpeg';
    const safeName = filename || `archivo_${Date.now()}.${safeMime.includes('png') ? 'png' : safeMime.includes('pdf') ? 'pdf' : 'jpg'}`;

    const createRes = await drive.files.create({
      requestBody: {
        name: safeName,
        parents: [folderId]
      },
      media: {
        mimeType: safeMime,
        body: stream
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true
    });

    const fileId = createRes.data.id;
    if (!fileId) {
      return { success: false, error: 'Google Drive no retornó un ID de archivo válido.' };
    }

    // Set public view permissions so anyone with link can view in app
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        },
        supportsAllDrives: true
      });
    } catch (permErr: any) {
      console.warn('Advertencia al asignar permisos públicos en Drive:', permErr.message);
    }

    const isPdf = safeMime.includes('pdf') || safeName.toLowerCase().endsWith('.pdf');
    const directUrl = isPdf
      ? `https://drive.google.com/file/d/${fileId}/preview`
      : `https://lh3.googleusercontent.com/d/${fileId}`;

    return {
      success: true,
      url: directUrl,
      fileId: fileId,
      webViewLink: createRes.data.webViewLink || undefined
    };
  } catch (apiErr: any) {
    const errMsg = apiErr.message || String(apiErr);
    if (errMsg.includes('Service Accounts do not have storage quota')) {
      return {
        success: false,
        error: 'Restricción de Google: Las Service Accounts no tienen cuota en cuentas @gmail.com personales. Por favor configura GOOGLE_APPS_SCRIPT_URL siguiendo las instrucciones del plan.'
      };
    }
    return {
      success: false,
      error: `Error de Google Drive API: ${errMsg}`
    };
  }
}
