import { createClient } from '@supabase/supabase-js';
import { Project, CustomLogos } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wafcgdnnhxxchondmmtp.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZmNnZG5uaHh4Y2hvbmRtbXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2OTIxMjIsImV4cCI6MjEwNTI2ODEyMn0.tjLof7orLVtqURDrIIpvqbtsjo2bPapcxUDzyI9ZCQc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'needs_setup';

/**
 * Loads both projects and custom logos from Supabase app_data table.
 */
export async function loadCloudData(): Promise<{
  projects: Project[] | null;
  logos: CustomLogos | null;
  status: CloudSyncStatus;
  errorMessage?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('key, data');

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.message?.includes('not find the table')) {
        return { projects: null, logos: null, status: 'needs_setup', errorMessage: 'Tabla app_data no creada aún en Supabase' };
      }
      return { projects: null, logos: null, status: 'offline', errorMessage: error.message };
    }

    if (!data || data.length === 0) {
      return { projects: null, logos: null, status: 'synced' };
    }

    let cloudProjects: Project[] | null = null;
    let cloudLogos: CustomLogos | null = null;

    data.forEach((row: { key: string; data: any }) => {
      if (row.key === 'projects' && Array.isArray(row.data)) {
        cloudProjects = row.data as Project[];
      }
      if (row.key === 'logos' && row.data && typeof row.data === 'object') {
        cloudLogos = row.data as CustomLogos;
      }
    });

    return { projects: cloudProjects, logos: cloudLogos, status: 'synced' };
  } catch (err: any) {
    return { projects: null, logos: null, status: 'offline', errorMessage: err?.message || 'Error de conexión con Supabase' };
  }
}

/**
 * Saves projects array to Supabase cloud.
 */
export async function saveProjectsToCloud(projects: Project[]): Promise<{ success: boolean; status: CloudSyncStatus; error?: any }> {
  try {
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      console.warn('saveProjectsToCloud: Intento de guardar arreglo de proyectos vacío bloqueado por seguridad.');
      return { success: false, status: 'synced' };
    }

    const { error } = await supabase
      .from('app_data')
      .upsert({
        key: 'projects',
        data: projects,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { success: false, status: 'needs_setup', error };
      }
      return { success: false, status: 'offline', error };
    }

    return { success: true, status: 'synced' };
  } catch (err) {
    return { success: false, status: 'offline', error: err };
  }
}

/**
 * Saves logos configuration to Supabase cloud.
 */
export async function saveLogosToCloud(logos: CustomLogos): Promise<{ success: boolean; status: CloudSyncStatus; error?: any }> {
  try {
    // Solo guardamos en la nube los logotipos corporativos (cabecera y portada).
    // Los fondos y estilos de color se conservan estrictamente locales en cada equipo.
    const cloudLogosPayload = {
      header: logos.header,
      banner: logos.banner
    };

    const { error } = await supabase
      .from('app_data')
      .upsert({
        key: 'logos',
        data: cloudLogosPayload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { success: false, status: 'needs_setup', error };
      }
      return { success: false, status: 'offline', error };
    }

    return { success: true, status: 'synced' };
  } catch (err) {
    return { success: false, status: 'offline', error: err };
  }
}

/**
 * Listens to realtime changes on Supabase app_data table.
 */
export function subscribeToCloudData(
  onProjectsChange: (projects: Project[]) => void,
  onLogosChange: (logos: CustomLogos) => void
) {
  const channel = supabase
    .channel('realtime_app_data')
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
    supabase.removeChannel(channel);
  };
}
