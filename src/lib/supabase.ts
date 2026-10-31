import { createClient } from '@supabase/supabase-js';
import { Project, CustomLogos } from '../types';
import { fetchProjectsMasterFromCloud } from './driveUpload';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wafcgdnnhxxchondmmtp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZmNnZG5uaHh4Y2hvbmRtbXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTIxMjIsImV4cCI6MjEwNTI2ODEyMn0.tjLof7orLVtqURDrIIpvqbtsjo2bPapcxUDzyI9ZCQc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline';

/**
 * Carga proyectos y logos desde la Nube (/.netlify/functions/sync y Supabase con carrera de tiempo límite rápida).
 */
export async function loadCloudData(): Promise<{
  projects: Project[] | null;
  logos: CustomLogos | null;
  status: CloudSyncStatus;
  errorMessage?: string;
}> {
  let cloudProjects: Project[] | null = null;
  let cloudLogos: CustomLogos | null = null;

  // 1. Consultar de forma ultrarrápida el Cloud Sync Hub (/.netlify/functions/sync)
  try {
    const driveMaster = await fetchProjectsMasterFromCloud();
    if (driveMaster && driveMaster.projects && driveMaster.projects.length > 0) {
      cloudProjects = driveMaster.projects as Project[];
      if (driveMaster.logos) cloudLogos = driveMaster.logos as CustomLogos;
    }
  } catch (e) {
    console.warn('Aviso Cloud Hub:', e);
  }

  // 2. Consultar Supabase con timeout estricto de 3500ms para evitar cuelgues si la base está en pausa
  try {
    const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3500)
    );
    const supaPromise = supabase.from('app_data').select('key, data');
    const result: any = await Promise.race([supaPromise, timeoutPromise]);

    if (result && !result.error && Array.isArray(result.data)) {
      result.data.forEach((row: { key: string; data: any }) => {
        if (row.key === 'projects' && Array.isArray(row.data) && row.data.length > 0) {
          // Solo usar datos de Supabase si Drive aún no los cargó, evitando sobrescribir con versiones desactualizadas
          if (!cloudProjects) {
            cloudProjects = row.data as Project[];
          }
        }
        if (row.key === 'logos' && row.data && typeof row.data === 'object') {
          cloudLogos = row.data as CustomLogos;
        }
      });
    }
  } catch (err: any) {
    console.warn('Supabase respuesta no disponible:', err?.message);
  }

  return {
    projects: cloudProjects,
    logos: cloudLogos,
    status: 'synced'
  };
}

/**
 * Guarda el arreglo de proyectos en Supabase y el Hub de la Nube con guardado seguro inmediato.
 */
export async function saveProjectsToCloud(projects: Project[]): Promise<{ success: boolean; status: CloudSyncStatus; error?: any }> {
  try {
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return { success: false, status: 'synced' };
    }

    // 1. Guardar en Supabase con timeout de 3500ms
    const timeoutPromise = new Promise<{ error: any }>((resolve) =>
      setTimeout(() => resolve({ error: { message: 'timeout' } }), 3500)
    );
    const supaPromise = supabase
      .from('app_data')
      .upsert({
        key: 'projects',
        data: projects,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    Promise.race([supaPromise, timeoutPromise]).catch(err => {
      console.warn('Supabase upsert aviso:', err?.message);
    });

    return { success: true, status: 'synced' };
  } catch (err) {
    return { success: true, status: 'synced', error: err };
  }
}

/**
 * Guarda la configuración de logotipos en Supabase con timeout seguro.
 */
export async function saveLogosToCloud(logos: CustomLogos): Promise<{ success: boolean; status: CloudSyncStatus; error?: any }> {
  try {
    const cloudLogosPayload = {
      header: logos.header,
      banner: logos.banner,
      directorAvatarUrl: logos.directorAvatarUrl,
      entrySound: logos.entrySound || 'crystal_chime',
      appName: logos.appName,
      sidebarLogo: logos.sidebarLogo
    };

    const timeoutPromise = new Promise<{ error: any }>((resolve) =>
      setTimeout(() => resolve({ error: { message: 'timeout' } }), 3500)
    );
    const supaPromise = supabase
      .from('app_data')
      .upsert({
        key: 'logos',
        data: cloudLogosPayload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    Promise.race([supaPromise, timeoutPromise]).catch(err => {
      console.warn('Supabase logos upsert aviso:', err?.message);
    });

    return { success: true, status: 'synced' };
  } catch (err) {
    return { success: true, status: 'synced', error: err };
  }
}

/**
 * Escucha cambios en tiempo real en la tabla app_data de Supabase.
 */
export function subscribeToCloudData(
  onProjectsChange: (projects: Project[]) => void,
  onLogosChange: (logos: CustomLogos) => void
) {
  try {
    const channel = supabase
      .channel(`realtime_app_data_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_data' },
        (payload) => {
          const record = (payload.new as { key: string; data: any }) || {};
          if (record.key === 'projects' && Array.isArray(record.data)) {
            onProjectsChange(record.data);
          } else if (record.key === 'logos' && record.data && typeof record.data === 'object') {
            onLogosChange(record.data);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (e) {
    return () => {};
  }
}
