import { google } from 'googleapis';

const FALLBACK_CLIENT_EMAIL = 'drive-uploader@instant-icon-481213-n7.iam.gserviceaccount.com';
const FALLBACK_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC2rfetHHtxCNum\njfU0TXSWV4MdTYdfj/glIL0vcM5s5UdQNGwBTX9weQ01O1H5ZgfOfoCikkE/LDdu\nL7RJqXtLQptxzapfCKITl0VpuwB7Q7PUp89yeeMwWhg06g+Z9PqUpDWvKhhEeNcG\nnCggI2uGREzoY0RGwE+Tp3O0mok4YF4HyRXRfcrT9csLVCI+QjFeb2VmH/8l4dUl\njQF3Yk0rG/BERztq/dojxVGqPE+cJ9nPAD1zx0Kbq6nJz3q5YghIQ17WwuOs8O7r\nNYULvRyqRRVHE/ux4mozNCnDAYjvuH/2RSKwh2AAiRyLIRmRjTUNhNzWda1uP2Wc\nzCPBZhVZAgMBAAECggEABVtTFrCt3vnpRPhHLy4xQ8JTri2KkW8NkfskiQpYB0Hu\n5idvXldpLAFktYGkjPlks7WqbHn471MK2hCMixds7d9JYxwqiYhdhlEKgEfzQuoQ\nkSUNlHgGBTIzIQQXCobwPSEWkOkdVo6rkX5NP+oB+mkwzySwCRoVC0me/zYD3ZML\nG3rXVU7LKQPJFOEC5D6saI3BHB7LNtS08olDgLe2mlUA4gwd067Klngxgfb0SJzR\nZbDXi/OVwIhVxjV/YEVv/1Jv5DmIviOePitMPYIpgyAI4OuTC2aXc9OiUjGMbYxY\nT1ea6KLyqQK9Dlei4Eqty4noRJ5bxxOMjenMgl7sLQKBgQDsJLYIk+haxqAuOYDS\n6K/hSRHG45Px1RS7JuwVIQCUtd0IiIFhWcyfvyePBO4vmTk8NyWfgxQT4Jwal7XH\nffbAzZ31pUkc6W0Del7JfhYXWM1V1ylQ2IoQJKYtp6xpF7BjEGKsAAqy0etrwXAe\njB2QWucVARSR418u4iTMmCnGvQKBgQDGCmD45+ldj6f9xqgUdCsWI6oPn6InaJcM\nCqf6bVT9SgmgBoE7LA1TIr0igQKPkUnuWguKazzDabCjZ52JCOPVYb6GtiGgtWnT\nbKMgBVs4bu9FjeVG6Pq5LljyXziq3vSmR/kkkLwt1kbT2FoyevR6NRqPLoO5JA8v\n1yWzyZCwzQKBgCMp6E1osP3re+jGOU+uxJn4hoQmWV52i2q/BgKzcmGynyJpKVL0\ny0qybVKXulwuJd64m4qgOzomhThUhQYa1MarF61/ml6Kx+fvrfO1Kdb6K0FwE7/t\nLsnumyxLPpo7o9FsnDTeoLk2Fydpm6eA19oqHyT6jzSWNhNGK5KnyfjFAoGBAION\n+3L9I5GqT08OezLzJHgVgu/T/DSvjr9KCOIbZLzJRPGPwKMdFVDnn7pe9uOGARWb\nrVTq/bdV6yfxOb4BMM/bmWQFcvs956mx3f70b+9iCgIrS2Y6d+sxtZZz2MHxT5Vx\n9DftCYRtdild7DTiZqsTwavhm1EOeiQuiHYQ7NP1AoGAF4lZfRbHDj8vtN48TkQh\nNu2Xfa48r3DAwUXAYLZhrhK/uOC/MpU/xVxPupi5zE9Q+u6b9EDHId3j4arcO4QD\nHWFg6z66qVtXzCPKzUB/i4PVfWTnQ9mdkE3t3sVKXzFNB+lhfRw4IQdzRAl0XM45\nKKhn6PodnLLDK42yLgVqKhg=\n-----END PRIVATE KEY-----\n';
const FALLBACK_FOLDER_ID = '1gVLn_XCwQkr0Vq2bEtExIIpcGDgoVLXU';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx4EZXFIWDFZx72UjMV2xCaH0A66aV2wNyiD2m95yzQG6xKqT-pkvuxnKJjYD7Oh_4uDw/exec';

// Serverless in-memory cache
let cachedProjects: any = null;
let cachedLogos: any = null;
let cachedSyncedAt = '';
let lastCacheFetchTime = 0;

function getDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || FALLBACK_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY || FALLBACK_PRIVATE_KEY;
  const privateKey = rawKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  return google.drive({ version: 'v3', auth });
}

export const handler = async (event: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // 1. GET: Fetch latest cloud database
  if (event.httpMethod === 'GET') {
    try {
      const now = Date.now();
      // If we have fresh in-memory data (< 8 seconds), return immediately
      if (cachedProjects && (now - lastCacheFetchTime < 8000)) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            source: 'cache',
            projects: cachedProjects,
            logos: cachedLogos,
            lastSyncedAt: cachedSyncedAt
          })
        };
      }

      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || FALLBACK_FOLDER_ID;
      const drive = getDriveClient();

      const listRes = await drive.files.list({
        q: `'${folderId}' in parents and name = 'Control_Avance_Master_Database.json' and trashed = false`,
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 1,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      if (!listRes.data.files || listRes.data.files.length === 0) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            projects: cachedProjects || null,
            logos: cachedLogos || null,
            lastSyncedAt: cachedSyncedAt || ''
          })
        };
      }

      const latestFile = listRes.data.files[0];
      const dlRes = await drive.files.get({
        fileId: latestFile.id!,
        alt: 'media',
        supportsAllDrives: true
      });

      const fileData = typeof dlRes.data === 'string' ? JSON.parse(dlRes.data) : dlRes.data;

      if (fileData && fileData.projects) {
        cachedProjects = fileData.projects;
        cachedLogos = fileData.logos || cachedLogos;
        cachedSyncedAt = fileData.lastSyncedAt || latestFile.modifiedTime || new Date().toISOString();
        lastCacheFetchTime = Date.now();

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            source: 'drive',
            projects: cachedProjects,
            logos: cachedLogos,
            lastSyncedAt: cachedSyncedAt,
            fileId: latestFile.id
          })
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          projects: cachedProjects || null,
          logos: cachedLogos || null,
          lastSyncedAt: cachedSyncedAt
        })
      };
    } catch (err: any) {
      console.warn('Error fetching cloud sync from Drive:', err?.message);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: cachedProjects !== null,
          projects: cachedProjects || null,
          logos: cachedLogos || null,
          lastSyncedAt: cachedSyncedAt,
          error: err?.message
        })
      };
    }
  }

  // 2. POST: Save updated projects to cloud database
  if (event.httpMethod === 'POST') {
    try {
      if (!event.body) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Cuerpo de solicitud vacío' })
        };
      }

      const body = JSON.parse(event.body);
      const incomingProjects = body.projects;
      const incomingLogos = body.logos;

      if (!incomingProjects || !Array.isArray(incomingProjects) || incomingProjects.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Arreglo de proyectos no válido' })
        };
      }

      // Update in-memory cache instantly
      cachedProjects = incomingProjects;
      if (incomingLogos) cachedLogos = incomingLogos;
      cachedSyncedAt = new Date().toISOString();
      lastCacheFetchTime = Date.now();

      // Trigger background upload to Google Apps Script / Google Drive
      const payload = {
        system: 'Control de Avance - Base de Datos Maestra',
        adminUser: 'veniergn@gmail.com',
        lastSyncedAt: cachedSyncedAt,
        projectsCount: incomingProjects.length,
        projects: incomingProjects,
        logos: incomingLogos || cachedLogos
      };

      const jsonStr = JSON.stringify(payload);
      const base64Data = Buffer.from(jsonStr).toString('base64');
      const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || APPS_SCRIPT_URL;

      fetch(appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          base64: 'data:application/json;base64,' + base64Data,
          filename: 'Control_Avance_Master_Database.json',
          mimeType: 'application/json'
        })
      }).catch(uploadErr => {
        console.warn('Segundo plano Drive aviso:', uploadErr?.message);
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          lastSyncedAt: cachedSyncedAt
        })
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ success: false, error: err?.message || 'Error interno de sincronización' })
      };
    }
  }

  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Método no permitido' })
  };
};
