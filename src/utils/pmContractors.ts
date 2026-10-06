import { ContractorProfile, Project } from '../types';

export type { ContractorProfile };

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
];

export const PRESET_COLORS = [
  '#00f2fe',
  '#818cf8',
  '#38bdf8',
  '#34d399',
  '#10b981',
  '#fb7185',
  '#f43f5e',
  '#f59e0b',
  '#f97316',
  '#a855f7',
  '#ec4899',
  '#64748b'
];

export const DEFAULT_CONTRACTORS: ContractorProfile[] = [
  {
    id: 'c_arrieta',
    name: 'Msc. Arq. Agustín Arrieta',
    role: 'Director de Obra',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: '#00f2fe',
    initials: 'AA'
  },
  {
    id: 'c_carter',
    name: 'Liam Carter',
    role: 'Capataz General de Obra',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: '#818cf8',
    initials: 'LC'
  },
  {
    id: 'c_mitchell',
    name: 'Noah Mitchell',
    role: 'Instalaciones Sanitarias & Gas',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    color: '#38bdf8',
    initials: 'NM'
  },
  {
    id: 'c_thompson',
    name: 'Ava Thompson',
    role: 'Estructuras H°A° & Armaduras',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    color: '#34d399',
    initials: 'AT'
  },
  {
    id: 'c_robinson',
    name: 'Mia Robinson',
    role: 'Control de Calidad & QA',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    color: '#fb7185',
    initials: 'MR'
  },
  {
    id: 'c_morgan',
    name: 'Lucas Morgan',
    role: 'Electricidad & Acometidas',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    color: '#f59e0b',
    initials: 'LM'
  },
  {
    id: 'c_adams',
    name: 'Sophia Adams',
    role: 'Carpintería & Terminaciones',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    color: '#a855f7',
    initials: 'SA'
  },
  {
    id: 'c_crown',
    name: 'Justin Crown',
    role: 'Cómputo & Certificaciones',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    color: '#ec4899',
    initials: 'JC'
  }
];

/**
 * Obtiene la lista activa de responsables/cuadrillas para un proyecto específico.
 * Prioriza project.contractors, luego localStorage, luego DEFAULT_CONTRACTORS.
 */
export function getProjectContractors(project?: Project | null): ContractorProfile[] {
  if (project?.contractors && Array.isArray(project.contractors) && project.contractors.length > 0) {
    return project.contractors;
  }
  if (project?.id) {
    try {
      const stored = localStorage.getItem(`pm_contractors_${project.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
  }
  return DEFAULT_CONTRACTORS;
}

/**
 * Obtiene el perfil de un contratista/responsable a partir de su nombre.
 * Si se pasa una lista personalizada de contratistas (customList), la consulta primero.
 * Si no coincide con ninguno predefinido, genera un perfil dinámico consistente con iniciales.
 */
export function getContractorProfile(
  name?: string,
  fallbackRole?: string,
  customList?: ContractorProfile[]
): ContractorProfile {
  if (!name || !name.trim()) {
    return {
      id: 'c_default',
      name: 'Sin Asignar',
      role: fallbackRole || 'Responsable General',
      avatarUrl: '',
      color: '#94a3b8',
      initials: 'SA'
    };
  }

  const cleanName = name.trim().toLowerCase();

  // 1. Buscar en lista personalizada si está disponible
  if (customList && customList.length > 0) {
    const foundCustom = customList.find(c =>
      cleanName === c.name.toLowerCase() ||
      cleanName.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(cleanName)
    );
    if (foundCustom) {
      return {
        ...foundCustom,
        role: fallbackRole || foundCustom.role
      };
    }
  }

  // 2. Buscar en predeterminados
  const found = DEFAULT_CONTRACTORS.find(c =>
    cleanName.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(cleanName)
  );

  if (found) {
    return {
      ...found,
      role: fallbackRole || found.role
    };
  }

  // Generar iniciales
  const parts = name.trim().split(' ').filter(Boolean);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0]?.substring(0, 2) || 'OB').toUpperCase();

  // Generar color basado en hash del nombre
  const colors = PRESET_COLORS;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = colors[Math.abs(hash) % colors.length];

  // Avatares rotativos elegantes
  const fallbackAvatars = PRESET_AVATARS;
  const avatarUrl = fallbackAvatars[Math.abs(hash) % fallbackAvatars.length];

  return {
    id: `c_${Math.abs(hash)}`,
    name: name.trim(),
    role: fallbackRole || 'Técnico de Obra',
    avatarUrl,
    color,
    initials
  };
}
