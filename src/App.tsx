import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Building2, DoorOpen, Image as ImageIcon, FileText, Download, ShieldCheck, PenTool } from 'lucide-react';
import { Project, Unit, ViewMode, CustomLogos, Milestone, Trade, SketchDocument, LocalColors, ProjectCalendarEvent, PMTaskStatus, ProjectManagerTask, BlueprintDocument, ContractorProfile, AppTheme, InspectionPhoto } from './types';
import { getInitialMockData, DEFAULT_LOGO_URL, createInitialTrades, MASTER_TRADES_TEMPLATE } from './data/initialData';
import { compressImageFile, calculateUnitProgress, hexToRgba } from './utils/calculations';
import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { UnitsView } from './components/UnitsView';
import { ChecklistView } from './components/ChecklistView';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { ReportModal } from './components/ReportModal';
import { MonthlyWorkReportModal } from './components/MonthlyWorkReportModal';
import { LogoEditorModal } from './components/LogoEditorModal';
import { EditProjectModal } from './components/EditProjectModal';
import { BlueprintViewerModal } from './components/BlueprintViewerModal';
import { NewProjectModal, NewProjectPayload } from './components/NewProjectModal';
import { NewUnitModal } from './components/NewUnitModal';
import { EditUnitModal } from './components/EditUnitModal';
import { SecurityConfirmModal } from './components/SecurityConfirmModal';
import { MilestonesModal } from './components/MilestonesModal';
import { CroquisModal } from './components/CroquisModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { exportInspectionPlanillaToExcel } from './utils/excelExport';
import { Toast } from './components/Toast';
import { loadCloudData, saveProjectsToCloud, saveLogosToCloud, subscribeToCloudData, CloudSyncStatus } from './lib/supabase';
import { CloudSetupModal } from './components/CloudSetupModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { SplashScreen } from './components/SplashScreen';
import { uploadFileToDrive, isDriveUrl, backupCalendarEventsToDrive, syncProjectManagerToDrive } from './lib/driveUpload';

const STORAGE_KEY_PROJECTS = 'CONTROL_AVANCE_OBRA_V3';
const STORAGE_KEY_LOGOS = 'CONTROL_AVANCE_LOGOS_V4';
const STORAGE_KEY_THEME = 'theme_preference';
const STORAGE_KEY_LOCAL_COLORS = 'CONTROL_AVANCE_LOCAL_COLORS_V1';

const normalizeLogo = (url?: string): string => {
  if (!url || typeof url !== 'string' || url.startsWith('data:image/jpeg') || url === '/icon.png') {
    return DEFAULT_LOGO_URL;
  }
  return url;
};

const isDarkColor = (color?: string): boolean => {
  if (!color) return false;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  return false;
};

const normalizeCustomLogos = (raw?: CustomLogos | null): CustomLogos => ({
  header: normalizeLogo(raw?.header),
  banner: normalizeLogo(raw?.banner)
});

/**
 * Genera una versión ligera de proyectos para localStorage excluyendo los blobs pesados de fotos.
 * Todas las fotos completas en alta resolución se guardan y leen directamente desde la nube de Supabase.
 */
const createLightweightProjectsForLocal = (projs: Project[]): any[] => {
  return projs.map(p => ({
    ...p,
    units: p.units?.map(u => ({
      ...u,
      sketches: u.sketches?.map(s => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        unitId: s.unitId,
        unitName: s.unitName,
        projectId: s.projectId,
        projectName: s.projectName,
        dataUrl: s.dataUrl?.startsWith('http') ? s.dataUrl : ''
      })) || [],
      blueprints: u.blueprints?.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category,
        type: b.type,
        uploadedAt: b.uploadedAt,
        url: b.url?.startsWith('data:') ? '' : b.url,
        cadViewerUrl: b.cadViewerUrl
      })) || [],
      trades: u.trades?.map(t => ({
        ...t,
        items: t.items?.map(i => ({
          ...i,
          photos: i.photos?.map(ph => ({
            id: ph.id,
            timestamp: ph.timestamp,
            dataUrl: ph.dataUrl?.startsWith('http') ? ph.dataUrl : ''
          })) || []
        }))
      }))
    }))
  }));
};

export function normalizeTradeId(tradeName: string): string {
  const clean = tradeName
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean ? `trade_${clean}` : `trade_${Date.now()}`;
}

export function sanitizeProjectTrades(project: Project): Project {
  if (!project || !project.units) return project;
  return {
    ...project,
    calendarEvents: project.calendarEvents || [],
    units: project.units.map(unit => {
      if (!unit || !unit.trades) return unit;
      const seen = new Map<string, Trade>();
      unit.trades.forEach(trade => {
        const key = trade.name.toLowerCase().trim();
        const masterTrade = MASTER_TRADES_TEMPLATE.find(m => m.name.toLowerCase().trim() === key || m.id === trade.id);
        const canonicalId = masterTrade
          ? masterTrade.id
          : (trade.id.startsWith('trade_') && !trade.id.includes('_unit_') && !trade.id.includes('_proj_')
              ? trade.id
              : normalizeTradeId(trade.name));

        if (!seen.has(key)) {
          seen.set(key, {
            ...trade,
            id: canonicalId,
            name: masterTrade ? masterTrade.name : trade.name.trim(),
            shortName: trade.shortName || (masterTrade ? masterTrade.shortName : trade.name.trim()),
            items: [...(trade.items || [])]
          });
        } else {
          // If duplicate trade exists in this unit, merge items avoiding duplicates
          const existing = seen.get(key)!;
          const existingItemNames = new Set((existing.items || []).map(i => i.name.toLowerCase().trim()));
          (trade.items || []).forEach(item => {
            if (!existingItemNames.has(item.name.toLowerCase().trim())) {
              existing.items.push(item);
              existingItemNames.add(item.name.toLowerCase().trim());
            }
          });
        }
      });
      return {
        ...unit,
        trades: Array.from(seen.values())
      };
    })
  };
}

export function mergeProjectsWithLocalState(remoteProjects: Project[], localProjects: Project[]): Project[] {
  if (!localProjects || localProjects.length === 0) return remoteProjects;
  if (!remoteProjects || remoteProjects.length === 0) return localProjects;

  const remoteIds = new Set(remoteProjects.map(p => p.id));

  const mergedRemote = remoteProjects.map(remoteProj => {
    const localProj = localProjects.find(lp => lp.id === remoteProj.id);
    if (!localProj) return remoteProj;

    // 1. Merge Calendar Events & PM Tasks by ID with timestamp conflict resolution
    const mergedEventsMap = new Map<string, ProjectCalendarEvent>();
    // First seed with local events
    (localProj.calendarEvents || []).forEach(e => mergedEventsMap.set(e.id, e));
    // Reconcile with remote events: remote only wins if it has a strictly newer updatedAt
    (remoteProj.calendarEvents || []).forEach(remoteEvt => {
      const existing = mergedEventsMap.get(remoteEvt.id);
      if (!existing) {
        mergedEventsMap.set(remoteEvt.id, remoteEvt);
      } else {
        const localTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const remoteTime = remoteEvt.updatedAt ? new Date(remoteEvt.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          mergedEventsMap.set(remoteEvt.id, remoteEvt);
        }
      }
    });

    // 2. Merge Units (preserving local blueprints, sketches, and inspection photos)
    const mergedUnits = (remoteProj.units || []).map(remoteUnit => {
      const localUnit = (localProj.units || []).find(lu => lu.id === remoteUnit.id);
      if (!localUnit) return remoteUnit;

      // Blueprints: merge by ID non-destructively
      const bpMap = new Map<string, BlueprintDocument>();
      (localUnit.blueprints || []).forEach(b => bpMap.set(b.id, b));
      (remoteUnit.blueprints || []).forEach(b => bpMap.set(b.id, b));

      // Sketches: merge by ID non-destructively
      const sketchMap = new Map<string, SketchDocument>();
      (localUnit.sketches || []).forEach(s => sketchMap.set(s.id, s));
      (remoteUnit.sketches || []).forEach(s => sketchMap.set(s.id, s));

      // Trades & Items: merge photos by ID non-destructively
      const mergedTrades = (remoteUnit.trades || []).map(remoteTrade => {
        const localTrade = (localUnit.trades || []).find(lt => lt.id === remoteTrade.id);
        if (!localTrade) return remoteTrade;

        const mergedItems = (remoteTrade.items || []).map(remoteItem => {
          const localItem = (localTrade.items || []).find(li => li.id === remoteItem.id);
          if (!localItem) return remoteItem;

          const photoMap = new Map<string, { id: string; dataUrl: string; timestamp: string }>();
          (localItem.photos || []).forEach(ph => photoMap.set(ph.id, ph));
          (remoteItem.photos || []).forEach(ph => photoMap.set(ph.id, ph));

          return {
            ...remoteItem,
            photos: Array.from(photoMap.values())
          };
        });

        return {
          ...remoteTrade,
          items: mergedItems
        };
      });

      return {
        ...remoteUnit,
        blueprints: Array.from(bpMap.values()),
        sketches: Array.from(sketchMap.values()),
        trades: mergedTrades
      };
    });

    return {
      ...remoteProj,
      calendarEvents: Array.from(mergedEventsMap.values()),
      units: mergedUnits
    };
  });

  // Preserve any local projects that do not yet exist in remote
  const localOnlyProjects = localProjects.filter(lp => !remoteIds.has(lp.id));
  return [...mergedRemote, ...localOnlyProjects];
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Retrocompatibility check for photos array & upgrade legacy names
          parsed.forEach((p: Project) => {
            if (p.name === 'Torre Alvear' || p.id === 'proj_torre_alvear') {
              p.name = 'Parque Los Andes';
              p.location = 'Calle Agustín Alvarez 315';
            } else if (p.name === 'Residencias Los Laureles' || p.id === 'proj_complejo_palermo') {
              p.name = 'Parque Agustín';
              p.location = 'Calle Agustín Alvarez 315';
            }

            p.units?.forEach(u => {
              if (u.name === 'Depto 1-A') u.name = 'Depto 1-1';
              else if (u.name === 'Depto 1-B') u.name = 'Depto 1-2';
              else if (u.name === 'Depto 2-A') u.name = 'Depto 2-1';
              else if (u.name === 'Depto 2-B') u.name = 'Depto 2-2';
              else if (u.name === 'Módulo A-1') u.name = 'Depto 1-1';
              else if (u.name === 'Módulo A-2') u.name = 'Depto 1-2';
              else if (u.name === 'Módulo B-1') u.name = 'Depto 2-1';

              u.trades?.forEach(t => {
                t.items?.forEach(i => {
                  if (!Array.isArray(i.photos)) i.photos = [];
                });
              });
            });

            // Ensure milestones exist if loaded from storage
            if (!p.milestones || p.milestones.length === 0) {
              const initialMock = getInitialMockData().find(m => m.id === p.id);
              if (initialMock && initialMock.milestones) {
                p.milestones = initialMock.milestones;
              } else {
                p.milestones = [];
              }
            }

            // Ensure calendarEvents exist if loaded from storage
            if (!p.calendarEvents || p.calendarEvents.length === 0) {
              const initialMock = getInitialMockData().find(m => m.id === p.id);
              if (initialMock && initialMock.calendarEvents && initialMock.calendarEvents.length > 0) {
                p.calendarEvents = initialMock.calendarEvents;
              } else {
                p.calendarEvents = [];
              }
            }
          });
          return parsed.map(sanitizeProjectTrades);
        }
      }
    } catch (e) {
      console.error('Error loading projects from storage:', e);
    }
    return getInitialMockData().map(sanitizeProjectTrades);
  });

  const [showSplash, setShowSplash] = useState(true);

  const [logos, setLogos] = useState<CustomLogos>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LOGOS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.header && parsed.banner) {
          return normalizeCustomLogos(parsed);
        }
      }
    } catch (e) {
      console.error('Error loading logos from storage:', e);
    }
    return {
      header: DEFAULT_LOGO_URL,
      banner: DEFAULT_LOGO_URL
    };
  });

  // Colores de fondo, presentación, neón, tipografía e imagen de wallpaper exclusivos y locales de este dispositivo
  const [localColors, setLocalColors] = useState<LocalColors>(() => {
    try {
      const storedColors = localStorage.getItem(STORAGE_KEY_LOCAL_COLORS);
      if (storedColors) {
        const parsed = JSON.parse(storedColors);
        return {
          appBackground: parsed.appBackground || '',
          presentationBackground: parsed.presentationBackground || '',
          neonColor: parsed.neonColor || '#00f2fe',
          appBackgroundImage: parsed.appBackgroundImage || '',
          fontFamily: parsed.fontFamily || "'Inter', sans-serif",
          isBoldText: Boolean(parsed.isBoldText)
        };
      }
      // Retrocompatibilidad: si ya se habían guardado colores en STORAGE_KEY_LOGOS en este dispositivo
      const storedLogos = localStorage.getItem(STORAGE_KEY_LOGOS);
      if (storedLogos) {
        const parsed = JSON.parse(storedLogos);
        if (parsed.appBackground || parsed.presentationBackground || parsed.neonColor || parsed.appBackgroundImage) {
          const migrated: LocalColors = {
            appBackground: parsed.appBackground || '',
            presentationBackground: parsed.presentationBackground || '',
            neonColor: parsed.neonColor || '#00f2fe',
            appBackgroundImage: parsed.appBackgroundImage || '',
            fontFamily: parsed.fontFamily || "'Inter', sans-serif",
            isBoldText: Boolean(parsed.isBoldText)
          };
          localStorage.setItem(STORAGE_KEY_LOCAL_COLORS, JSON.stringify(migrated));
          return migrated;
        }
      }
    } catch (e) {
      console.error('Error loading local colors from storage:', e);
    }
    return {
      appBackground: '',
      presentationBackground: '',
      neonColor: '#00f2fe',
      appBackgroundImage: '',
      fontFamily: "'Inter', sans-serif",
      isBoldText: false
    };
  });

  // Guardado persistente exclusivo en localStorage y sincronización con html, body, fuentes y variables de neón
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOCAL_COLORS, JSON.stringify(localColors));
    } catch (e) {
      console.error('Error saving local colors to localStorage:', e);
    }

    const hasCustomBg = Boolean(localColors.appBackground || localColors.appBackgroundImage);
    if (hasCustomBg) {
      document.documentElement.classList.add('has-custom-bg');
      document.body.classList.add('has-custom-bg');
    } else {
      document.documentElement.classList.remove('has-custom-bg');
      document.body.classList.remove('has-custom-bg');
    }

    if (localColors.appBackground && !localColors.appBackgroundImage) {
      document.documentElement.style.backgroundColor = localColors.appBackground;
      document.body.style.backgroundColor = localColors.appBackground;
      document.documentElement.style.backgroundImage = 'none';
      document.body.style.backgroundImage = 'none';
    } else if (localColors.appBackgroundImage) {
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundImage = 'none';
      document.body.style.backgroundImage = 'none';
    } else {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundImage = '';
      document.body.style.backgroundImage = '';
    }

    const activeNeon = localColors.neonColor || '#00f2fe';
    document.documentElement.style.setProperty('--neon-color', activeNeon);
    document.documentElement.style.setProperty('--neon-glow', hexToRgba(activeNeon, 0.38));
    document.documentElement.style.setProperty('--neon-glow-soft', hexToRgba(activeNeon, 0.15));

    // Aplicar tipografía dinámica y modo negrita
    const activeFont = localColors.fontFamily || 'Inter, sans-serif';
    document.documentElement.style.setProperty('--app-font-family', activeFont);
    document.documentElement.style.setProperty('--font-sans', activeFont);
    document.body.style.setProperty('--app-font-family', activeFont);
    document.body.style.setProperty('--font-sans', activeFont);
    document.documentElement.style.fontFamily = activeFont;
    document.body.style.fontFamily = activeFont;

    if (localColors.isBoldText) {
      document.documentElement.classList.add('font-bold-mode');
      document.body.classList.add('font-bold-mode');
    } else {
      document.documentElement.classList.remove('font-bold-mode');
      document.body.classList.remove('font-bold-mode');
    }
  }, [localColors]);

  // Tema: Tema 1 (Apariencia Original Oscura) vs Tema 2 (Nueva Apariencia Minimalista / Glassmorphism)
  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'theme-glass' || saved === 'light') return 'theme-glass';
      if (saved === 'theme-original' || saved === 'dark') return 'theme-original';
    } catch {}
    return 'theme-original';
  });

  const handleSetTheme = (newTheme: AppTheme | 'light' | 'dark') => {
    const resolvedTheme: AppTheme =
      newTheme === 'theme-glass' || newTheme === 'light' ? 'theme-glass' : 'theme-original';

    setTheme(resolvedTheme);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, resolvedTheme);
    } catch (e) {
      console.error('Error saving theme preference:', e);
    }

    if (resolvedTheme === 'theme-original') {
      document.documentElement.classList.add('dark', 'theme-original');
      document.documentElement.classList.remove('light', 'theme-glass');
      document.body.classList.add('theme-original');
      document.body.classList.remove('theme-glass');
    } else {
      document.documentElement.classList.remove('dark', 'theme-original');
      document.documentElement.classList.add('light', 'theme-glass');
      document.body.classList.add('theme-glass');
      document.body.classList.remove('theme-original');
    }

    // Si cambia de tema explícitamente, limpiamos appBackground si tenía un color del tema contrario
    if (resolvedTheme === 'theme-glass' && localColors.appBackground && isDarkColor(localColors.appBackground)) {
      setLocalColors(prev => ({ ...prev, appBackground: '' }));
    } else if (resolvedTheme === 'theme-original' && localColors.appBackground && !isDarkColor(localColors.appBackground)) {
      setLocalColors(prev => ({ ...prev, appBackground: '' }));
    }

    showToast(
      resolvedTheme === 'theme-glass'
        ? 'Tema 2: Minimalista / Glassmorphism activado'
        : 'Tema 1: Apariencia Original activado',
      resolvedTheme === 'theme-glass' ? 'Sun' : 'Moon'
    );
  };

  const handleToggleTheme = () => {
    handleSetTheme(theme === 'theme-original' ? 'theme-glass' : 'theme-original');
  };

  useEffect(() => {
    if (theme === 'theme-original') {
      document.documentElement.classList.add('dark', 'theme-original');
      document.documentElement.classList.remove('light', 'theme-glass');
      document.body.classList.add('theme-original');
      document.body.classList.remove('theme-glass');
      if (!localColors.appBackground && !localColors.appBackgroundImage) {
        document.documentElement.style.backgroundColor = '#0e1422';
        document.body.style.backgroundColor = '#0e1422';
      }
    } else {
      document.documentElement.classList.remove('dark', 'theme-original');
      document.documentElement.classList.add('light', 'theme-glass');
      document.body.classList.add('theme-glass');
      document.body.classList.remove('theme-original');
      if (!localColors.appBackground && !localColors.appBackgroundImage) {
        document.documentElement.style.backgroundColor = '#f1f4f9';
        document.body.style.backgroundColor = '#f1f4f9';
      }
    }
  }, [theme, localColors.appBackground, localColors.appBackgroundImage]);

  // Forzar / gestionar orientación apaisada para tablets
  const handleForceLandscape = async () => {
    try {
      if (window.screen.orientation && window.screen.orientation.lock) {
        await window.screen.orientation.lock('landscape');
        showToast('Pantalla fijada en modo Apaisado / Horizontal', 'Check');
        return;
      } else if (window.screen.orientation && window.screen.orientation.unlock) {
        window.screen.orientation.unlock();
        showToast('Giro de pantalla libre', 'RotateCcw');
        return;
      }
    } catch (e) {
      console.warn('Orientation lock direct failed, trying fallback:', e);
    }

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        if (window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
          showToast('Pantalla fijada en modo Apaisado', 'Check');
          return;
        }
      }
    } catch (err) {
      console.warn('Fullscreen orientation lock failed:', err);
    }

    showToast('Gira tu tablet de forma horizontal', 'Maximize2');
  };

  // Detección automática en inicio para tablets: Si la dimensión menor es >= 500px, fijar apaisado
  useEffect(() => {
    const autoOrientTablet = async () => {
      try {
        const shortest = Math.min(window.screen.width, window.screen.height);
        const isTablet = shortest >= 500 || /tablet|ipad|playbook|silk/i.test(navigator.userAgent);
        if (isTablet && window.screen.orientation && window.screen.orientation.lock) {
          await window.screen.orientation.lock('landscape');
        }
      } catch {}
    };

    autoOrientTablet();

    const onUserTouch = () => {
      autoOrientTablet();
      window.removeEventListener('pointerdown', onUserTouch);
      window.removeEventListener('touchstart', onUserTouch);
    };
    window.addEventListener('pointerdown', onUserTouch, { passive: true });
    window.addEventListener('touchstart', onUserTouch, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onUserTouch);
      window.removeEventListener('touchstart', onUserTouch);
    };
  }, []);

  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState('inicio');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleSelectNav = (tabId: string) => {
    setActiveNavTab(tabId);
    setIsMobileSidebarOpen(false);
    if (tabId === 'inicio') {
      setCurrentView('dashboard');
    } else if (tabId === 'proyectos') {
      if (selectedProject) {
        setCurrentView('units');
      } else if (projects.length > 0) {
        setSelectedProjectId(projects[0].id);
        setCurrentView('units');
      } else {
        setIsNewProjectModalOpen(true);
      }
    } else if (tabId === 'tareas') {
      const projId = selectedProjectId || (projects.length > 0 ? projects[0].id : undefined);
      if (projId) {
        handleOpenProjectManager(projId, 'tasks');
      } else {
        showToast('Selecciona o crea una obra primero');
      }
    } else if (tabId === 'calendario') {
      const projId = selectedProjectId || (projects.length > 0 ? projects[0].id : undefined);
      if (projId) {
        handleOpenProjectManager(projId, 'calendar');
      } else {
        showToast('Selecciona o crea una obra primero');
      }
    } else if (tabId === 'gantt') {
      const projId = selectedProjectId || (projects.length > 0 ? projects[0].id : undefined);
      if (projId) {
        handleOpenProjectManager(projId, 'dashboard');
      } else {
        showToast('Selecciona o crea una obra primero');
      }
    } else if (tabId === 'documentos') {
      const proj = selectedProject || (projects.length > 0 ? projects[0] : null);
      if (proj && proj.units.length > 0) {
        setActiveBlueprintViewerUnit(proj.units[0]);
      } else {
        showToast('Selecciona una obra con planos');
      }
    } else if (tabId === 'fotos') {
      cameraInputRef.current?.click();
    } else if (tabId === 'materiales') {
      showToast('M?dulo de gesti?n y solicitud de materiales');
    } else if (tabId === 'equipo') {
      const projId = selectedProjectId || (projects.length > 0 ? projects[0].id : undefined);
      if (projId) {
        handleOpenProjectManager(projId, 'dashboard');
      } else {
        showToast('Gesti?n de cuadrillas y contratistas');
      }
    } else if (tabId === 'reportes') {
      const projId = selectedProjectId || (projects.length > 0 ? projects[0].id : undefined);
      handleOpenReportModal('project', projId);
    }
  };
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [dashboardActiveProjectId, setDashboardActiveProjectId] = useState<string>('');
  const handleActiveProjectChange = useCallback((pId: string) => {
    setDashboardActiveProjectId(prev => (prev === pId ? prev : pId));
  }, []);
  const splashJustFinishedRef = useRef(false);

  const handleFinishSplash = () => {
    setShowSplash(false);
    setCurrentView('dashboard');
    setSelectedProjectId(null);
    setSelectedUnitId(null);
    splashJustFinishedRef.current = true;
    setTimeout(() => {
      splashJustFinishedRef.current = false;
    }, 600);
  };

  // Modals state
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewUnitModalOpen, setIsNewUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeBlueprintViewerUnit, setActiveBlueprintViewerUnit] = useState<Unit | null>(null);
  const [isLogoEditorOpen, setIsLogoEditorOpen] = useState(false);
  const [logoEditorTarget, setLogoEditorTarget] = useState<'header' | 'banner'>('header');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDefaultScope, setReportDefaultScope] = useState<string>('');

  // Informe de Obra Mensual (PDF para propietarios) modal state
  const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState(false);
  const [monthlyReportProjectId, setMonthlyReportProjectId] = useState<string>('');

  const handleOpenMonthlyReport = (projectId?: string) => {
    const targetPid = projectId || selectedProjectId || (projects.length > 0 ? projects[0].id : '');
    setMonthlyReportProjectId(targetPid);
    setIsMonthlyReportModalOpen(true);
  };

  // Croquis a mano alzada modal state
  const [isCroquisModalOpen, setIsCroquisModalOpen] = useState(false);
  const [croquisModalTargetUnitId, setCroquisModalTargetUnitId] = useState<string | undefined>(undefined);

  // Milestones modal state
  const [isMilestonesModalOpen, setIsMilestonesModalOpen] = useState(false);
  const [milestonesProjectId, setMilestonesProjectId] = useState<string | null>(null);

  // Project Manager modal state (isolated per project)
  const [pmModalState, setPmModalState] = useState<{
    isOpen: boolean;
    projectId: string | null;
    initialTab?: 'dashboard' | 'tasks' | 'calendar';
    initialDate?: string;
    selectedTaskId?: string;
  }>({
    isOpen: false,
    projectId: null
  });

  const handleOpenProjectManager = (
    projectId: string,
    initialTab: 'dashboard' | 'tasks' | 'calendar' = 'dashboard',
    initialDate?: string,
    selectedTaskId?: string
  ) => {
    setPmModalState({
      isOpen: true,
      projectId,
      initialTab,
      initialDate,
      selectedTaskId
    });
  };

  const handleCloseProjectManager = () => {
    setPmModalState({
      isOpen: false,
      projectId: null
    });
  };

  const activePMProject = projects.find(p => p.id === pmModalState.projectId) || null;

  // Security confirmation modal with PIN 2600
  const [securityModal, setSecurityModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    itemType: 'project' | 'unit';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    itemName: '',
    itemType: 'project',
    onConfirm: () => {}
  });

  // Open Milestones Configuration Modal
  const handleOpenMilestonesConfig = (projectId: string) => {
    setMilestonesProjectId(projectId);
    setIsMilestonesModalOpen(true);
  };

  // Save or Update Milestone with Supabase Cloud persistence
  const handleSaveMilestone = (projectId: string, milestone: Milestone) => {
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        const currentList = proj.milestones || [];
        const exists = currentList.some(m => m.id === milestone.id);
        const updatedMilestones = exists
          ? currentList.map(m => m.id === milestone.id ? milestone : m)
          : [...currentList, milestone];
        return {
          ...proj,
          milestones: updatedMilestones
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast(`Hito "${milestone.name}" guardado en la Nube`, 'Calendar');
    });
  };

  // Delete Milestone with Supabase Cloud persistence
  const handleDeleteMilestone = (projectId: string, milestoneId: string) => {
    if (!confirm('¿Eliminar este hito del cronograma de la obra?')) return;
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          milestones: (proj.milestones || []).filter(m => m.id !== milestoneId)
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast('Hito eliminado del cronograma', 'Trash2');
    });
  };

  // Toggle Manual Complete on Milestone with Supabase Cloud persistence
  const handleToggleManualMilestone = (projectId: string, milestoneId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          milestones: (proj.milestones || []).map(m => {
            if (m.id !== milestoneId) return m;
            const nextManual = !m.manualCompleted;
            return {
              ...m,
              manualCompleted: nextManual,
              progressPercentage: nextManual ? 100 : (m.progressPercentage ?? 0)
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast('Estado del hito actualizado en la Nube', 'Check');
    });
  };

  // Update Milestone Progress Percentage with Supabase Cloud persistence
  const handleUpdateMilestoneProgress = (projectId: string, milestoneId: string, percentage: number) => {
    lastLocalEditTimeRef.current = Date.now();
    const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          milestones: (proj.milestones || []).map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m,
              progressPercentage: clamped,
              manualCompleted: clamped === 100 ? true : (m.manualCompleted && clamped < 100 ? false : m.manualCompleted)
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast(`Avance del hito actualizado al ${clamped}%`, 'Check');
    });
  };

  const projectForMilestones = projects.find(p => p.id === (milestonesProjectId || selectedProjectId));

  // Active Photo Lightbox / Camera
  const [activePhotoViewer, setActivePhotoViewer] = useState<{
    tradeId: string;
    itemId: string;
    tradeName: string;
    itemName: string;
  } | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIcon, setToastIcon] = useState<string>('Check');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hidden native camera input ref
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Cloud Sync state (Supabase)
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('syncing');
  const [isCloudSetupModalOpen, setIsCloudSetupModalOpen] = useState(false);
  const isInitialCloudLoadRef = useRef(true);
  const isRemoteUpdateRef = useRef(false);
  const cloudSaveTimerRef = useRef<any>(null);
  const lastLocalEditTimeRef = useRef<number>(0);
  const projectsRef = useRef<Project[]>(projects);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Synchronous, deterministic project updater with immediate localStorage persistence and Supabase sync
  const updateProjectsAndSync = (updater: (prev: Project[]) => Project[]) => {
    lastLocalEditTimeRef.current = Date.now();
    const nextProjects = updater(projectsRef.current);
    projectsRef.current = nextProjects;
    setProjects(nextProjects);

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(nextProjects));
    } catch (e) {
      console.warn('LocalStorage error on update:', e);
    }

    setCloudStatus('syncing');
    saveProjectsToCloud(nextProjects).then(res => {
      setCloudStatus(res.status);
    });

    return nextProjects;
  };

  // Initial cloud fetch from Supabase and active listeners
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initCloud() {
      setCloudStatus('syncing');
      try {
        const res = await loadCloudData();
        setCloudStatus(res.status);

        if (res.status === 'synced') {
          if (res.projects && res.projects.length > 0) {
            isRemoteUpdateRef.current = true;
            const sanitized = res.projects.map(sanitizeProjectTrades);
            setProjects(prev => {
              const merged = mergeProjectsWithLocalState(sanitized, prev);
              projectsRef.current = merged;
              try {
                localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(merged));
              } catch (e) {
                console.warn('LocalStorage error on cloud init:', e);
              }
              return merged;
            });
            showToast('Conectado a la Nube Supabase', 'Cloud');
          } else {
            // Seed cloud if empty
            saveProjectsToCloud(projectsRef.current);
          }

          if (res.logos) {
            isRemoteUpdateRef.current = true;
            setLogos(normalizeCustomLogos(res.logos));
          } else {
            saveLogosToCloud(logos);
          }

          // Realtime push subscription
          unsubscribe = subscribeToCloudData(
            (cloudProjects) => {
              // Protect recently edited local data from being overwritten by delayed push events (12 seconds grace)
              if (Date.now() - lastLocalEditTimeRef.current < 12000) return;
              isRemoteUpdateRef.current = true;
              setProjects(prev => {
                const sanitized = cloudProjects.map(sanitizeProjectTrades);
                const merged = mergeProjectsWithLocalState(sanitized, prev);
                projectsRef.current = merged;
                try {
                  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(merged));
                } catch (e) {
                  console.warn('LocalStorage error on realtime push:', e);
                }
                return merged;
              });
            },
            (cloudLogos) => {
              isRemoteUpdateRef.current = true;
              setLogos(normalizeCustomLogos(cloudLogos));
            }
          );
        }
      } catch (err) {
        console.error('Error al inicializar la nube:', err);
        setCloudStatus('offline');
      } finally {
        isInitialCloudLoadRef.current = false;
      }
    }

    initCloud();

    // Auto-refresh when tab is focused / unlocked on mobile or notebook
    const handleVisibilityOrFocus = async () => {
      // If user recently made a change (within 12s), do NOT pull and overwrite local unsaved changes
      if (Date.now() - lastLocalEditTimeRef.current < 12000) return;

      if (document.visibilityState === 'visible') {
        try {
          const res = await loadCloudData();
          if (res.status === 'synced') {
            if (res.projects && res.projects.length > 0) {
              const sanitizedCloudProjects = res.projects.map(sanitizeProjectTrades);
              setProjects(prev => {
                const merged = mergeProjectsWithLocalState(sanitizedCloudProjects, prev);
                projectsRef.current = merged;
                try {
                  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(merged));
                } catch (e) {
                  console.warn('LocalStorage error on focus refresh:', e);
                }
                if (JSON.stringify(prev) !== JSON.stringify(merged)) {
                  isRemoteUpdateRef.current = true;
                  return merged;
                }
                return prev;
              });
            }
            if (res.logos) {
              const normalized = normalizeCustomLogos(res.logos);
              setLogos(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(normalized)) {
                  isRemoteUpdateRef.current = true;
                  return normalized;
                }
                return prev;
              });
            }
            setCloudStatus('synced');
          }
        } catch (e) {
          console.warn('Error refreshing cloud data on focus:', e);
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Heartbeat sync every 15s to keep all devices 100% updated in real-time
    const heartbeatInterval = setInterval(handleVisibilityOrFocus, 15000);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Persist projects: save full data locally when space allows, with fallback and 100% sync to Supabase Cloud
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
    } catch (quotaError) {
      console.warn('LocalStorage al límite, guardando versión ligera (fotos completas aseguradas en Supabase Cloud):', quotaError);
      try {
        const lightProjects = createLightweightProjectsForLocal(projects);
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(lightProjects));
      } catch (e) {
        // Ignorar si el almacenamiento local está completamente saturado
      }
    }

    // If change came from remote cloud, do not re-upload
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    // Auto-sync immediately to Supabase cloud (debounced 300ms)
    if (!isInitialCloudLoadRef.current) {
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
      cloudSaveTimerRef.current = setTimeout(async () => {
        setCloudStatus('syncing');
        const res = await saveProjectsToCloud(projects);
        setCloudStatus(res.status);
      }, 300);
    }
  }, [projects]);

  // Persist logos to localStorage and Supabase Cloud
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGOS, JSON.stringify(logos));
    } catch (e) {
      console.error('Error saving logos to localStorage:', e);
    }

    if (!isInitialCloudLoadRef.current) {
      saveLogosToCloud(logos).then(res => {
        if (res.status !== 'needs_setup') {
          setCloudStatus(res.status);
        }
      });
    }
  }, [logos]);

  const showToast = (message: string, icon: string = 'Check') => {
    setToastMessage(message);
    setToastIcon(icon);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleUpdateHeaderLogo = (newUrl: string) => {
    setLogos(prev => ({
      ...prev,
      header: newUrl
    }));
    showToast('¡Logotipo actualizado con éxito!', 'Check');
  };

  const handleRetryCloudSync = async () => {
    setCloudStatus('syncing');
    try {
      const res = await loadCloudData();
      setCloudStatus(res.status);
      if (res.status === 'synced') {
        if (res.projects && res.projects.length > 0) {
          setProjects(res.projects.map(sanitizeProjectTrades));
        } else {
          await saveProjectsToCloud(projects);
        }
        if (res.logos) {
          setLogos(res.logos);
        } else {
          await saveLogosToCloud(logos);
        }
        showToast('¡Nube Supabase conectada con éxito!', 'Check');
      } else if (res.status === 'needs_setup') {
        showToast('Aún no se detectó la tabla app_data. Ejecuta el SQL en Supabase.', 'AlertCircle');
        setIsCloudSetupModalOpen(true);
      }
    } catch (e) {
      setCloudStatus('offline');
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const selectedUnit = selectedProject?.units.find(u => u.id === selectedUnitId) || null;

  const currentUnitProgress = selectedUnit ? calculateUnitProgress(selectedUnit) : 0;

  // Navigation handlers
  const handleNavigate = (view: ViewMode) => {
    setCurrentView(view);
    if (view === 'dashboard') {
      setSelectedProjectId(null);
      setSelectedUnitId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProject = (projectId: string) => {
    if (splashJustFinishedRef.current) return;
    setSelectedProjectId(projectId);
    setSelectedUnitId(null);
    setCurrentView('units');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectUnit = (unitId: string) => {
    setSelectedUnitId(unitId);
    setCurrentView('checklist');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (currentView === 'checklist') {
      setCurrentView('units');
      setSelectedUnitId(null);
    } else if (currentView === 'units') {
      setCurrentView('dashboard');
      setSelectedProjectId(null);
    }
  };

  const handleGoToUnitsView = () => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
      setSelectedUnitId(null);
      setCurrentView('units');
    } else if (selectedProjectId) {
      setCurrentView('units');
    } else {
      showToast('Primero crea o selecciona una obra', 'AlertCircle');
    }
  };

  // Delete project with security confirmation (PIN 2600)
  const handleRequestDeleteProject = (projectId: string, projectName: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Eliminar Obra / Complejo',
      itemName: projectName,
      itemType: 'project',
      onConfirm: () => {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (selectedProjectId === projectId) {
          setSelectedProjectId(null);
          setSelectedUnitId(null);
          setCurrentView('dashboard');
        }
        showToast(`Obra "${projectName}" eliminada correctamente`, 'Trash2');
      }
    });
  };

  // Delete unit or common space with security confirmation (PIN 2600)
  const handleRequestDeleteUnit = (unitId: string, unitName: string) => {
    setSecurityModal({
      isOpen: true,
      title: 'Eliminar Espacio / Departamento',
      itemName: unitName,
      itemType: 'unit',
      onConfirm: () => {
        setProjects(prev => prev.map(proj => {
          if (proj.id !== selectedProjectId) return proj;
          return {
            ...proj,
            units: proj.units.filter(u => u.id !== unitId)
          };
        }));
        if (selectedUnitId === unitId) {
          setSelectedUnitId(null);
          setCurrentView('units');
        }
        showToast(`"${unitName}" eliminado correctamente`, 'Trash2');
      }
    });
  };

  // Export inspection sheet to Excel (.xlsx)
  const handleExportExcel = (projectId: string, unitId?: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    try {
      exportInspectionPlanillaToExcel(project, unitId);
      const targetName = unitId 
        ? project.units.find(u => u.id === unitId)?.name || 'Unidad'
        : project.name;
      showToast(`Planilla Excel descargada (${targetName})`, 'Check');
    } catch (err) {
      console.error('Error al generar planilla Excel:', err);
      showToast('Error al exportar planilla Excel', 'AlertCircle');
    }
  };

  // Checklist Item Toggle
  const handleToggleItem = (tradeId: string, itemId: string) => {
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    const newCompleted = !item.completed;
                    const newPct = newCompleted ? 100 : 0;
                    showToast(
                      newCompleted ? 'Ítem completado (100%)' : 'Ítem marcado como pendiente (0%)',
                      newCompleted ? 'Check' : 'Clock'
                    );
                    return {
                      ...item,
                      completed: newCompleted,
                      progressPercentage: newPct
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
    });
  };

  // Checklist Item Progress Percentage Update (0 to 100)
  const handleUpdateItemProgress = (tradeId: string, itemId: string, percentage: number) => {
    lastLocalEditTimeRef.current = Date.now();
    const clamped = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : Math.round(percentage)));
    const isCompleted = clamped === 100;
    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                      ...item,
                      completed: isCompleted,
                      progressPercentage: clamped
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
    });
  };

  // Delete checklist item
  const handleDeleteItem = (tradeId: string, itemId: string) => {
    if (!confirm('¿Eliminar esta tarea del checklist de la unidad?')) return;
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.filter(item => item.id !== itemId)
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast('Tarea eliminada y sincronizada', 'Trash2');
    });
  };

  // Edit / rename checklist item and persist immediately to Supabase Cloud
  const handleEditItem = (tradeId: string, itemId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || !selectedProjectId || !selectedUnitId) return;

    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                      ...item,
                      name: trimmed
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast(`Ítem modificado: "${trimmed}"`, 'Check');
    });
  };

  // Add custom checklist item to trade (smart selector: current unit or replicated across selected active projects)
  const handleAddItem = (
    tradeId: string,
    itemName: string,
    scope: 'current_unit' | 'selected_projects' = 'current_unit',
    targetProjectIds: string[] = []
  ) => {
    const templateTrade = MASTER_TRADES_TEMPLATE.find(t => t.id === tradeId);

    const createNewItem = () => ({
      id: `${tradeId}_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: itemName,
      completed: false,
      progressPercentage: 0,
      photos: []
    });

    if (scope === 'current_unit' || targetProjectIds.length === 0) {
      setProjects(prev => prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            const tradeExists = u.trades.some(t => t.id === tradeId);
            const updatedTrades = tradeExists
              ? u.trades.map(t => {
                  if (t.id !== tradeId) return t;
                  return {
                    ...t,
                    items: [...t.items, createNewItem()]
                  };
                })
              : [
                  ...u.trades,
                  {
                    id: tradeId,
                    name: templateTrade?.name || tradeId,
                    shortName: templateTrade?.shortName || tradeId,
                    icon: templateTrade?.icon || 'Wrench',
                    color: templateTrade?.color || 'text-slate-600 bg-slate-50 border-slate-300',
                    items: [createNewItem()]
                  }
                ];

            return {
              ...u,
              trades: updatedTrades
            };
          })
        };
      }));
      showToast(`Tarea agregada en la unidad actual (0%)`, 'Check');
    } else {
      // Replicate to all departments/units of each selected project with 0% initial progress
      const targetSet = new Set(targetProjectIds);
      let totalUnitsAffected = 0;

      setProjects(prev => prev.map(proj => {
        if (!targetSet.has(proj.id)) return proj;
        totalUnitsAffected += proj.units.length;
        return {
          ...proj,
          units: proj.units.map(u => {
            const tradeExists = u.trades.some(t => t.id === tradeId);
            const updatedTrades = tradeExists
              ? u.trades.map(t => {
                  if (t.id !== tradeId) return t;
                  return {
                    ...t,
                    items: [...t.items, createNewItem()]
                  };
                })
              : [
                  ...u.trades,
                  {
                    id: tradeId,
                    name: templateTrade?.name || tradeId,
                    shortName: templateTrade?.shortName || tradeId,
                    icon: templateTrade?.icon || 'Wrench',
                    color: templateTrade?.color || 'text-slate-600 bg-slate-50 border-slate-300',
                    items: [createNewItem()]
                  }
                ];

            return {
              ...u,
              trades: updatedTrades
            };
          })
        };
      }));

      const countObras = targetProjectIds.length;
      showToast(`Ítem replicado en ${countObras} ${countObras === 1 ? 'obra' : 'obras'} (${totalUnitsAffected} unidades)`, 'Layers');
    }
  };

  // Add new Trade to current unit or all units in project
  const handleAddTrade = (tradeName: string, scope: 'current_unit' | 'all_units' = 'current_unit') => {
    const trimmed = tradeName.trim();
    if (!trimmed || !selectedProjectId) return;

    const canonicalTradeId = normalizeTradeId(trimmed);
    const newTrade: Trade = {
      id: canonicalTradeId,
      name: trimmed,
      shortName: trimmed,
      icon: 'Wrench',
      color: 'text-amber-800 bg-amber-50 border-amber-300',
      items: [
        {
          id: `item_${Date.now()}_init`,
          name: `Verificación general de ${trimmed}`,
          completed: false,
          progressPercentage: 0,
          photos: []
        }
      ]
    };

    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (scope === 'current_unit' && u.id !== selectedUnitId) return u;
            const exists = u.trades.some(t => t.name.toLowerCase().trim() === trimmed.toLowerCase() || t.id === canonicalTradeId);
            if (exists) return u;
            return {
              ...u,
              trades: [...u.trades, { ...newTrade }]
            };
          })
        };
      });
      const sanitized = updated.map(sanitizeProjectTrades);
      updatedProjectsList = sanitized;
      return sanitized;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast(`Gremio "${trimmed}" agregado ${scope === 'all_units' ? 'en todo el complejo' : 'en este depto'}`, 'Check');
    });
  };

  // Delete a Trade from unit or all units in project
  const handleDeleteTrade = (tradeId: string, tradeName: string, scope: 'current_unit' | 'all_units' = 'current_unit') => {
    if (!confirm(`¿Eliminar el gremio "${tradeName}" y todas sus tareas asociadas?`)) return;
    if (!selectedProjectId) return;

    const normalizedName = tradeName.toLowerCase().trim();

    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (scope === 'current_unit' && u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.filter(t => t.id !== tradeId && t.name.toLowerCase().trim() !== normalizedName)
            };
          })
        };
      });
      const sanitized = updated.map(sanitizeProjectTrades);
      updatedProjectsList = sanitized;
      return sanitized;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast(`Gremio "${tradeName}" eliminado`, 'Trash2');
    });
  };

  // Save or remove technical comment / observation on checklist item
  const handleSaveItemComment = (tradeId: string, itemId: string, comment: string) => {
    lastLocalEditTimeRef.current = Date.now();
    const trimmed = comment.trim();
    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                      ...item,
                      comment: trimmed ? trimmed : undefined
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      if (trimmed) {
        showToast('Observación guardada en la Nube', 'Check');
      } else {
        showToast('Observación eliminada en la Nube', 'Trash2');
      }
    });
  };

  // Add photo to item (from camera, file picker or modal) and persist directly to Supabase Cloud
  const handleAddPhoto = async (tradeId: string, itemId: string, dataUrl: string) => {
    if (!selectedProjectId || !selectedUnitId) return;
    lastLocalEditTimeRef.current = Date.now();

    let finalDataUrl = dataUrl;

    // Si es un payload base64 local, subir a Google Drive para guardar solo la URL ligera
    if (dataUrl && dataUrl.startsWith('data:') && !isDriveUrl(dataUrl)) {
      showToast('Subiendo foto a Google Drive...', 'Camera');
      try {
        const uploadRes = await uploadFileToDrive({
          base64: dataUrl,
          filename: `inspeccion_${tradeId}_${itemId}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg'
        });
        if (uploadRes.success && uploadRes.url) {
          finalDataUrl = uploadRes.url;
        } else if (uploadRes.error) {
          console.warn('Google Drive aviso:', uploadRes.error);
        }
      } catch (err) {
        console.warn('Error al subir a Google Drive:', err);
      }
    }

    const now = new Date();
    const dateString = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const timestamp = `${dateString}, ${timeString} hs`;

    const newPhoto = {
      id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      dataUrl: finalDataUrl,
      timestamp
    };

    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                      ...item,
                      photos: [...(item.photos || []), newPhoto]
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjectsList));
    } catch (e) {
      console.warn('LocalStorage error on photo save:', e);
    }

    // Sincronizar de inmediato a Supabase Cloud con datos completos
    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      if (res.success) {
        const isDrive = isDriveUrl(finalDataUrl);
        showToast(isDrive ? 'Foto guardada en Google Drive y Supabase' : 'Foto guardada en la Nube Supabase', 'Check');
      } else {
        showToast('Foto guardada localmente (sincronizando...)', 'AlertCircle');
      }
    });
  };

  // Delete photo from item and persist immediately to Supabase Cloud
  const handleDeletePhoto = async (tradeId: string, itemId: string, photoId: string) => {
    if (!confirm('¿Eliminar esta fotografía de la inspección?')) return;
    if (!selectedProjectId || !selectedUnitId) return;
    lastLocalEditTimeRef.current = Date.now();

    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    return {
                      ...item,
                      photos: (item.photos || []).filter(p => p.id !== photoId)
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjectsList));
    } catch (e) {
      console.warn('LocalStorage error on photo delete:', e);
    }

    // Persist immediately to Supabase Cloud
    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast('Fotografía eliminada en la Nube', 'Trash2');
    });
  };

  // Save technical observation with severity directly to Supabase Cloud
  const handleSaveObservation = async (
    tradeId: string,
    itemId: string,
    comment: string,
    severity: 'low' | 'medium' | 'high' | undefined,
    isExplicitDelete: boolean = false
  ) => {
    if (!selectedProjectId || !selectedUnitId) return;
    lastLocalEditTimeRef.current = Date.now();
    const trimmed = comment.trim();

    let updatedProjectsList: Project[] = [];
    let hadPriorComment = false;

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== selectedUnitId) return u;
            return {
              ...u,
              trades: u.trades.map(t => {
                const isMatch = t.id === tradeId || (t.name && t.name.toLowerCase().trim() === tradeId?.toLowerCase().trim()) || (t.items && t.items.some(i => i.id === itemId));
                if (!isMatch) return t;
                return {
                  ...t,
                  items: t.items.map(item => {
                    if (item.id !== itemId) return item;
                    hadPriorComment = !!(item.comment && item.comment.trim());
                    return {
                      ...item,
                      comment: trimmed ? trimmed : undefined,
                      severity: trimmed ? severity : undefined
                    };
                  })
                };
              })
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      if (trimmed) {
        showToast('Observación guardada en la Nube Supabase', 'Cloud');
      } else if (isExplicitDelete && hadPriorComment) {
        showToast('Observación eliminada en la Nube', 'Trash2');
      } else {
        showToast('Cambios guardados en la Nube', 'Check');
      }
    });
  };

  // Save Croquis sketch to unit and sync to Supabase Cloud
  const handleSaveSketch = async (projectId: string, unitId: string, sketch: SketchDocument) => {
    lastLocalEditTimeRef.current = Date.now();
    let finalSketch = { ...sketch };

    // Si el croquis es una imagen base64, subir a Google Drive
    if (sketch.dataUrl && sketch.dataUrl.startsWith('data:') && !isDriveUrl(sketch.dataUrl)) {
      showToast('Guardando croquis en Google Drive...', 'PenTool');
      try {
        const uploadRes = await uploadFileToDrive({
          base64: sketch.dataUrl,
          filename: `croquis_${(sketch.projectName || 'obra').replace(/\s+/g, '_')}_${(sketch.unitName || 'unidad').replace(/\s+/g, '_')}_${Date.now()}.png`,
          mimeType: 'image/png'
        });
        if (uploadRes.success && uploadRes.url) {
          finalSketch.dataUrl = uploadRes.url;
        } else if (uploadRes.error) {
          console.warn('Google Drive croquis aviso:', uploadRes.error);
        }
      } catch (err) {
        console.warn('Error subiendo croquis a Drive:', err);
      }
    }

    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== unitId) return u;

            let updatedTrades = u.trades;
            if (finalSketch.tradeId && finalSketch.itemId) {
              const newPhoto: InspectionPhoto = {
                id: `photo_sk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                dataUrl: finalSketch.dataUrl,
                timestamp: finalSketch.createdAt || new Date().toLocaleString()
              };

              updatedTrades = (u.trades || []).map(tr => {
                if (tr.id !== finalSketch.tradeId) return tr;
                return {
                  ...tr,
                  items: tr.items.map(it => {
                    if (it.id !== finalSketch.itemId) return it;
                    return {
                      ...it,
                      photos: [newPhoto, ...(it.photos || [])]
                    };
                  })
                };
              });
            }

            return {
              ...u,
              trades: updatedTrades,
              sketches: [finalSketch, ...(u.sketches || [])]
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjectsList));
    } catch (e) {
      console.warn('LocalStorage error on sketch save:', e);
    }

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      const isDrive = isDriveUrl(finalSketch.dataUrl);
      showToast(
        isDrive
          ? `Croquis guardado en Google Drive y Nube (${finalSketch.unitName || 'Unidad'})`
          : `Croquis guardado en ${finalSketch.unitName || 'la unidad'} (${finalSketch.projectName || 'Obra'}) y en la Nube`,
        'Check'
      );
    });
  };

  // Delete Croquis sketch from unit and sync to Supabase Cloud
  const handleDeleteSketch = (projectId: string, unitId: string, sketchId: string) => {
    if (!confirm('¿Eliminar este croquis del registro de la unidad?')) return;
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== projectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== unitId) return u;
            return {
              ...u,
              sketches: (u.sketches || []).filter(s => s.id !== sketchId)
            };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjectsList));
    } catch (e) {
      console.warn('LocalStorage error on sketch delete:', e);
    }

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast('Croquis eliminado en la Nube', 'Trash2');
    });
  };

  // Trigger camera for active item
  const handleTriggerCamera = (tradeId: string, itemId: string, tradeName: string, itemName: string) => {
    setActivePhotoViewer({ tradeId, itemId, tradeName, itemName });
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  // Handle camera capture or image selection from global input
  const handlePhotoCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoViewer) return;

    try {
      const compressedDataUrl = await compressImageFile(file, 800, 0.72);
      await handleAddPhoto(activePhotoViewer.tradeId, activePhotoViewer.itemId, compressedDataUrl);
    } catch (err) {
      console.error('Error processing captured photo:', err);
      showToast('Error al procesar la imagen', 'AlertCircle');
    } finally {
      e.target.value = '';
    }
  };

  // Create Project with flexible floor configuration and amenities
  const handleCreateProject = (payload: NewProjectPayload) => {
    const newUnits: Unit[] = payload.units.map((uConfig, idx) => ({
      id: `unit_${Date.now()}_${idx + 1}`,
      name: uConfig.name,
      type: uConfig.type || 'unit',
      floorNumber: uConfig.floorNumber,
      floorLabel: uConfig.floorLabel,
      category: uConfig.category || (uConfig.type === 'common_area' ? 'Espacio Común' : 'Departamento'),
      trades: createInitialTrades(),
      blueprints: []
    }));

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      name: payload.name,
      location: payload.location || 'Obra en ejecución',
      createdAt: new Date().toISOString().split('T')[0],
      director: payload.director || 'Msc. Arq. Agustín Arrieta',
      computoSubtitle: payload.computoSubtitle || 'Cómputo, Certificaciones y Rubros',
      technicalNotes: payload.technicalNotes || 'Toda la información del Expediente',
      expedienteMunicipal: payload.expedienteMunicipal,
      expedienteEdemsa: payload.expedienteEdemsa,
      expedienteAysam: payload.expedienteAysam,
      customServices: payload.customServices || [],
      floorsConfig: payload.floorsConfig,
      units: newUnits
    };

    setProjects(prev => [newProject, ...prev]);
    setIsNewProjectModalOpen(false);
    setSelectedProjectId(newProject.id);
    setSelectedUnitId(null);
    setCurrentView('units');
    showToast(`Obra "${payload.name}" creada con ${newUnits.length} espacios`, 'Check');
  };

  // Update Project Data (Ficha Técnica y Administrativa)
  const handleSaveProjectData = (updatedData: Partial<Project>) => {
    if (!editingProject) return;
    setProjects(prev => {
      const updated = prev.map(p => {
        if (p.id !== editingProject.id) return p;
        return { ...p, ...updatedData };
      });
      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      saveProjectsToCloud(updated);
      return updated;
    });
    showToast('Ficha técnica y administrativa actualizada', 'Check');
  };

  // Generic Update Project Handler (used by MonthlyWorkReportModal, etc.)
  const handleUpdateProject = (updatedProj: Project) => {
    setProjects(prev => {
      const updated = prev.map(p => p.id === updatedProj.id ? updatedProj : p);
      try {
        localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      saveProjectsToCloud(updated);
      return updated;
    });
  };

  // Unit Blueprints Management
  const handleAddUnitBlueprint = async (unitId: string, docData: Omit<BlueprintDocument, 'id' | 'uploadedAt'>) => {
    lastLocalEditTimeRef.current = Date.now();
    let finalDoc = { ...docData };

    // Si la URL es base64 y aún no se subió a Google Drive, asegurar subida a Drive
    if (finalDoc.url && finalDoc.url.startsWith('data:') && !isDriveUrl(finalDoc.url)) {
      showToast('Guardando plano en Google Drive...', 'Compass');
      try {
        const uploadRes = await uploadFileToDrive({
          base64: finalDoc.url,
          filename: `plano_${finalDoc.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.jpg`,
          mimeType: 'image/jpeg'
        });
        if (uploadRes.success && uploadRes.url) {
          finalDoc.url = uploadRes.url;
        }
      } catch (err) {
        console.warn('Error subiendo plano a Google Drive en handleAddUnitBlueprint:', err);
      }
    }

    const newDoc: BlueprintDocument = {
      ...finalDoc,
      id: `bp_${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };

    let updatedProjectsList: Project[] = [];
    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== unitId) return u;
            const currentBlueprints = u.blueprints || [];
            const updated = [newDoc, ...currentBlueprints];
            return { ...u, blueprints: updated };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setActiveBlueprintViewerUnit(prev => {
      if (!prev || prev.id !== unitId) return prev;
      return { ...prev, blueprints: [newDoc, ...(prev.blueprints || [])] };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjectsList));
    } catch (e) {
      console.warn('LocalStorage error on blueprint save:', e);
    }

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      const isDrive = isDriveUrl(finalDoc.url);
      showToast(
        isDrive
          ? 'Plano técnico guardado en Google Drive y Nube'
          : 'Plano técnico guardado en la Nube',
        'Check'
      );
    });
  };

  const handleDeleteUnitBlueprint = (unitId: string, docId: string) => {
    if (!confirm('¿Eliminar este plano técnico?')) return;
    lastLocalEditTimeRef.current = Date.now();
    let updatedProjectsList: Project[] = [];

    setProjects(prev => {
      const updated = prev.map(proj => {
        if (proj.id !== selectedProjectId) return proj;
        return {
          ...proj,
          units: proj.units.map(u => {
            if (u.id !== unitId) return u;
            const updated = (u.blueprints || []).filter(d => d.id !== docId);
            return { ...u, blueprints: updated };
          })
        };
      });
      updatedProjectsList = updated;
      return updated;
    });

    setActiveBlueprintViewerUnit(prev => {
      if (!prev || prev.id !== unitId) return prev;
      return { ...prev, blueprints: (prev.blueprints || []).filter(d => d.id !== docId) };
    });

    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(updatedProjectsList));
    } catch (e) {
      console.warn('LocalStorage error on blueprint delete:', e);
    }

    setCloudStatus('syncing');
    saveProjectsToCloud(updatedProjectsList).then(res => {
      setCloudStatus(res.status);
      showToast('Plano eliminado en la Nube', 'Trash2');
    });
  };

  // Create Unit
  const handleCreateUnit = (unitName: string, unitType?: 'unit' | 'common_area') => {
    if (!selectedProjectId) return;
    const resolvedType = unitType || (unitName.toLowerCase().includes('depto') ? 'unit' : 'common_area');
    const newUnit: Unit = {
      id: `unit_${Date.now()}`,
      name: unitName,
      type: resolvedType,
      category: resolvedType === 'common_area' ? 'Espacio Común' : 'Departamento',
      trades: createInitialTrades(),
      blueprints: []
    };

    setProjects(prev => prev.map(p => {
      if (p.id !== selectedProjectId) return p;
      return {
        ...p,
        units: [...p.units, newUnit]
      };
    }));

    setIsNewUnitModalOpen(false);
    showToast(`${resolvedType === 'common_area' ? 'Espacio común' : 'Departamento'} "${unitName}" agregado`, 'Check');
  };

  // Edit Unit Name and Type (Denomination by floor)
  const handleSaveUnitName = (unitId: string, newName: string, newType?: 'unit' | 'common_area') => {
    setProjects(prev => prev.map(p => {
      return {
        ...p,
        units: p.units.map(u => {
          if (u.id === unitId) {
            const updatedType = newType || u.type || (newName.toLowerCase().includes('depto') ? 'unit' : 'common_area');
            return {
              ...u,
              name: newName,
              type: updatedType,
              category: updatedType === 'common_area' ? 'Espacio Común' : 'Departamento'
            };
          }
          return u;
        })
      };
    }));
    showToast(`Denominación actualizada a "${newName}"`, 'Check');
  };

  // Update project schedule dates (startDate, estimatedEndDate)
  const handleUpdateProjectDates = (projectId: string, startDate: string, estimatedEndDate: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      return {
        ...p,
        startDate,
        estimatedEndDate
      };
    }));
    showToast('Cronograma de obra actualizado', 'Calendar');
  };

  // Calendar & Project Manager handlers (strictly isolated by project, cloud synchronized, and backed up to Google Drive)
  const handleSaveCalendarEvent = (projectId: string, event: ProjectCalendarEvent) => {
    const timestamp = new Date().toISOString();
    const eventWithTimestamp: ProjectCalendarEvent = {
      ...event,
      projectId, // Strict per-project isolation
      updatedAt: timestamp
    };

    let targetProjectName = '';
    let targetProjectEvents: ProjectCalendarEvent[] = [];

    updateProjectsAndSync(prev => {
      return prev.map(proj => {
        if (proj.id !== projectId) return proj;
        targetProjectName = proj.name;
        const currentEvents = proj.calendarEvents || [];
        const exists = currentEvents.some(e => e.id === eventWithTimestamp.id);
        const newEvents = exists
          ? currentEvents.map(e => e.id === eventWithTimestamp.id ? eventWithTimestamp : e)
          : [...currentEvents, eventWithTimestamp];
        targetProjectEvents = newEvents;
        return {
          ...proj,
          calendarEvents: newEvents
        };
      });
    });

    // Dual Google Drive Cloud backup: Agenda JSON + Project Manager JSON
    if (targetProjectName && targetProjectEvents.length > 0) {
      backupCalendarEventsToDrive(targetProjectName, targetProjectEvents);
      syncProjectManagerToDrive(targetProjectName, targetProjectEvents);
    }
  };

  const handleDeleteCalendarEvent = (projectId: string, eventId: string) => {
    let targetProjectName = '';
    let targetProjectEvents: ProjectCalendarEvent[] = [];

    updateProjectsAndSync(prev => {
      return prev.map(proj => {
        if (proj.id !== projectId) return proj;
        targetProjectName = proj.name;
        const newEvents = (proj.calendarEvents || []).filter(e => e.id !== eventId);
        targetProjectEvents = newEvents;
        return {
          ...proj,
          calendarEvents: newEvents
        };
      });
    });

    if (targetProjectName) {
      backupCalendarEventsToDrive(targetProjectName, targetProjectEvents);
      syncProjectManagerToDrive(targetProjectName, targetProjectEvents);
    }
    showToast('Tarea / Evento eliminado en la Nube', 'Trash2');
  };

  const handleToggleCalendarEvent = (projectId: string, eventId: string) => {
    let targetProjectName = '';
    let targetProjectEvents: ProjectCalendarEvent[] = [];
    const timestamp = new Date().toISOString();

    updateProjectsAndSync(prev => {
      return prev.map(proj => {
        if (proj.id !== projectId) return proj;
        targetProjectName = proj.name;
        const newEvents = (proj.calendarEvents || []).map(e => {
          if (e.id !== eventId) return e;
          const nextCompleted = !e.completed;
          return {
            ...e,
            completed: nextCompleted,
            status: (nextCompleted ? 'completed' : 'in_progress') as PMTaskStatus,
            updatedAt: timestamp
          };
        });
        targetProjectEvents = newEvents;
        return {
          ...proj,
          calendarEvents: newEvents
        };
      });
    });

    if (targetProjectName && targetProjectEvents.length > 0) {
      backupCalendarEventsToDrive(targetProjectName, targetProjectEvents);
      syncProjectManagerToDrive(targetProjectName, targetProjectEvents);
    }
  };

  const handleTogglePMSubtask = (projectId: string, taskId: string, subtaskId: string) => {
    let targetProjectName = '';
    let targetProjectEvents: ProjectCalendarEvent[] = [];
    const timestamp = new Date().toISOString();

    updateProjectsAndSync(prev => {
      return prev.map(proj => {
        if (proj.id !== projectId) return proj;
        targetProjectName = proj.name;
        const newEvents = (proj.calendarEvents || []).map(task => {
          if (task.id !== taskId) return task;
          const updatedSubtasks = (task.subtasks || []).map(st => {
            if (st.id !== subtaskId) return st;
            return { ...st, completed: !st.completed };
          });
          const allCompleted = updatedSubtasks.length > 0 && updatedSubtasks.every(st => st.completed);
          return {
            ...task,
            subtasks: updatedSubtasks,
            completed: allCompleted,
            status: (allCompleted ? 'completed' : task.status) as PMTaskStatus,
            updatedAt: timestamp
          };
        });
        targetProjectEvents = newEvents;
        return {
          ...proj,
          calendarEvents: newEvents
        };
      });
    });

    if (targetProjectName && targetProjectEvents.length > 0) {
      backupCalendarEventsToDrive(targetProjectName, targetProjectEvents);
      syncProjectManagerToDrive(targetProjectName, targetProjectEvents);
    }
  };

  // Save custom contractors / team members per project with dual cloud sync
  const handleSaveContractors = (projectId: string, contractors: ContractorProfile[]) => {
    updateProjectsAndSync(prev =>
      prev.map(proj => proj.id === projectId ? { ...proj, contractors } : proj)
    );
    try {
      localStorage.setItem(`pm_contractors_${projectId}`, JSON.stringify(contractors));
    } catch {}
    showToast('Cuadrillas y fotos del equipo actualizadas en la Nube', 'Users');
  };

  // Reset to Mock Data
  const handleResetData = () => {
    if (confirm('¿Restablecer datos de prueba de ejemplo? Se reiniciarán las obras y fotos de muestra.')) {
      setProjects(getInitialMockData());
      setSelectedProjectId(null);
      setSelectedUnitId(null);
      setCurrentView('dashboard');
      showToast('Datos reiniciados correctamente', 'RotateCcw');
    }
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Control_Avance_Obra_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Respaldo JSON descargado', 'Download');
  };

  // Open Report modal with intelligent automatic active project recognition
  const handleOpenReportModal = (type: 'auto' | 'project' | 'unit' = 'auto', projId?: string, unitId?: string) => {
    const resolvedProjectId =
      projId ||
      (currentView !== 'dashboard' && selectedProjectId ? selectedProjectId : undefined) ||
      dashboardActiveProjectId ||
      selectedProjectId ||
      (projects[0]?.id ?? '');

    const resolvedUnitId = unitId || (currentView === 'checklist' ? selectedUnitId : undefined);

    if (type === 'unit' && resolvedUnitId && resolvedProjectId) {
      setReportDefaultScope(`unit:${resolvedProjectId}:${resolvedUnitId}`);
    } else if (type === 'project' && resolvedProjectId) {
      setReportDefaultScope(`proj:${resolvedProjectId}`);
    } else if (currentView === 'checklist' && selectedUnitId && selectedProjectId) {
      setReportDefaultScope(`unit:${selectedProjectId}:${selectedUnitId}`);
    } else if (resolvedProjectId) {
      setReportDefaultScope(`proj:${resolvedProjectId}`);
    }

    setIsReportModalOpen(true);
  };

  // Get current active item for photo viewer
  const activeItem = (() => {
    if (!activePhotoViewer || !selectedProject || !selectedUnit) return null;
    const trade = selectedUnit.trades.find(t => t.id === activePhotoViewer.tradeId);
    return trade?.items.find(i => i.id === activePhotoViewer.itemId) || null;
  })();

  return (
    <div
      className={`w-full min-h-screen flex flex-col relative pb-20 transition-all duration-300 ${
        theme === 'theme-glass' ? 'theme-glass' : 'theme-original'
      } ${
        localColors.appBackgroundImage
          ? (theme === 'theme-glass' ? 'text-slate-900' : 'text-slate-100')
          : localColors.appBackground
          ? isDarkColor(localColors.appBackground) ? 'text-slate-100' : 'text-slate-900'
          : theme === 'theme-glass' ? 'bg-[#f1f4f9] text-slate-900' : 'bg-[#0e1422] text-slate-100'
      }`}
      style={{
        backgroundColor: localColors.appBackgroundImage
          ? 'transparent'
          : localColors.appBackground
          ? localColors.appBackground
          : theme === 'theme-glass'
          ? '#f0f3f8'
          : '#081321',
        backgroundImage: localColors.appBackgroundImage
          ? 'none'
          : localColors.appBackground
          ? 'none'
          : theme === 'theme-glass'
          ? 'radial-gradient(at 0% 0%, rgba(224, 231, 255, 0.85) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(207, 250, 254, 0.85) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(243, 232, 255, 0.85) 0px, transparent 50%)'
          : 'radial-gradient(at 10% 15%, rgba(6, 182, 212, 0.20) 0px, transparent 45%), radial-gradient(at 90% 20%, rgba(99, 102, 241, 0.22) 0px, transparent 50%), radial-gradient(at 50% 85%, rgba(168, 85, 247, 0.18) 0px, transparent 55%)'
      }}
    >
      {/* Dynamic Background Image Wallpaper Layer */}
      {localColors.appBackgroundImage && (
        <div
          className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 no-print"
          style={{
            backgroundImage: `url(${localColors.appBackgroundImage})`,
            backgroundAttachment: 'fixed',
            filter: theme === 'theme-glass' ? 'brightness(0.96) contrast(1.04)' : 'brightness(0.82) contrast(1.08)'
          }}
          aria-hidden="true"
        />
      )}

      {/* High-legibility subtle tint overlay for background wallpaper */}
      {localColors.appBackgroundImage && (
        <div
          className={`fixed inset-0 pointer-events-none z-0 no-print transition-all duration-500 ${
            theme === 'theme-glass'
              ? 'bg-slate-100/35 backdrop-blur-[2px]'
              : 'bg-[#090e1a]/45 backdrop-blur-[2px]'
          }`}
          aria-hidden="true"
        />
      )}

      {/* Dynamic ambient luminous orbs for visible glassmorphism floating depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 no-print" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-cyan-500/18 blur-[100px]" />
        <div className="absolute top-1/4 -right-28 w-[520px] h-[520px] rounded-full bg-indigo-600/18 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[460px] h-[460px] rounded-full bg-purple-600/16 blur-[110px]" />
        <div className="absolute -bottom-24 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/14 blur-[100px]" />
      </div>

      {/* Pantalla de inicio interactiva con tilde verde expansivo y sonido de confirmación */}
      {showSplash && <SplashScreen onFinish={handleFinishSplash} />}

      {/* Toast Notification */}
      <Toast message={toastMessage} iconName={toastIcon} />

      {/* Hidden Native Camera & Gallery Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoCaptured}
        className="hidden"
      />

      {/* Left Sidebar Navigation (Matching Reference Screenshot) */}
      <SidebarNav
        currentView={currentView}
        activeNavTab={activeNavTab}
        onSelectNav={handleSelectNav}
        onOpenSettings={() => {
          setLogoEditorTarget('header');
          setIsLogoEditorOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        directorName={selectedProject?.director || 'Arq. Venier Gast?n'}
        directorRole="Director T?cnico"
        avatarUrl="/avatar_venier.png"
      />

      {/* Main Column Wrapper (Shifted by Sidebar Width on Desktop) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-60'
      }`}>
        {/* Top Header Bar */}
        <TopHeader
          currentView={currentView}
          selectedProject={selectedProject}
          selectedUnit={selectedUnit}
          onBack={handleBack}
          onOpenReportModal={handleOpenReportModal}
          cloudStatus={cloudStatus}
          onOpenCloudSetup={() => setIsCloudSetupModalOpen(true)}
          onToggleMobileSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-[1560px] mx-auto p-3 sm:p-6 pb-24 overflow-y-auto relative z-10">
        {currentView === 'dashboard' && (
          <DashboardView
            projects={projects}
            bannerLogoUrl={logos.banner}
            presentationBg={localColors.presentationBackground}
            neonColor={localColors.neonColor || '#00f2fe'}
            onSelectProject={handleSelectProject}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            onOpenLogoEditor={() => {
              setLogoEditorTarget('banner');
              setIsLogoEditorOpen(true);
            }}
            onOpenReportModal={handleOpenReportModal}
            onResetData={handleResetData}
            onRequestDeleteProject={handleRequestDeleteProject}
            onExportExcel={handleExportExcel}
            onOpenMilestonesConfig={handleOpenMilestonesConfig}
            onSaveMilestone={handleSaveMilestone}
            onToggleManualMilestone={handleToggleManualMilestone}
            onUpdateProjectDates={handleUpdateProjectDates}
            onEditProject={(proj) => setEditingProject(proj)}
            onOpenProjectManager={handleOpenProjectManager}
            onSaveCalendarEvent={handleSaveCalendarEvent}
            onDeleteCalendarEvent={handleDeleteCalendarEvent}
            onToggleCalendarEvent={handleToggleCalendarEvent}
            onShowToast={showToast}
            onActiveProjectChange={handleActiveProjectChange}
            onOpenMonthlyReport={handleOpenMonthlyReport}
          />
        )}

        {currentView === 'units' && selectedProject && (
          <ErrorBoundary
            fallbackTitle="Error al cargar la obra"
            onReset={() => setCurrentView('dashboard')}
          >
            <UnitsView
              project={selectedProject}
              presentationBg={localColors.presentationBackground}
              neonColor={localColors.neonColor || '#00f2fe'}
              onSelectUnit={handleSelectUnit}
              onOpenNewUnitModal={() => setIsNewUnitModalOpen(true)}
              onOpenReportModal={handleOpenReportModal}
              onOpenMonthlyReport={handleOpenMonthlyReport}
              onEditUnit={setEditingUnit}
              onRequestDeleteUnit={handleRequestDeleteUnit}
              onRequestDeleteProject={handleRequestDeleteProject}
              onExportExcel={handleExportExcel}
              onOpenMilestonesConfig={handleOpenMilestonesConfig}
              onSaveMilestone={handleSaveMilestone}
              onToggleManualMilestone={handleToggleManualMilestone}
              onUpdateMilestoneProgress={handleUpdateMilestoneProgress}
              onUpdateProjectDates={handleUpdateProjectDates}
              onEditProject={(proj) => setEditingProject(proj)}
              onOpenProjectManager={handleOpenProjectManager}
              onSaveCalendarEvent={handleSaveCalendarEvent}
              onOpenUnitBlueprints={(unit) => setActiveBlueprintViewerUnit(unit)}
              onAddTrade={handleAddTrade}
              onDeleteTrade={handleDeleteTrade}
              onOpenCroquis={(unitId) => {
                setCroquisModalTargetUnitId(unitId);
                setIsCroquisModalOpen(true);
              }}
            />
          </ErrorBoundary>
        )}

        {currentView === 'checklist' && selectedProject && selectedUnit && (
          <ErrorBoundary
            fallbackTitle="Error al cargar la unidad"
            onReset={() => setCurrentView('units')}
          >
            <ChecklistView
              project={selectedProject}
              unit={selectedUnit}
              allProjects={projects}
              neonColor={localColors.neonColor || '#00f2fe'}
              onToggleItem={handleToggleItem}
              onUpdateItemProgress={handleUpdateItemProgress}
              onDeleteItem={handleDeleteItem}
              onEditItem={handleEditItem}
              onAddItem={handleAddItem}
              onSaveComment={handleSaveItemComment}
              onSaveObservation={handleSaveObservation}
              onAddPhoto={handleAddPhoto}
              onDeletePhoto={handleDeletePhoto}
              onOpenPhotoViewer={(tradeId, itemId, tradeName, itemName) => {
                setActivePhotoViewer({ tradeId, itemId, tradeName, itemName });
              }}
              onTriggerQuickPhoto={handleTriggerCamera}
              onOpenReportModal={handleOpenReportModal}
              onEditUnit={setEditingUnit}
              onRequestDeleteUnit={handleRequestDeleteUnit}
              onExportExcel={handleExportExcel}
              onOpenBlueprints={() => setActiveBlueprintViewerUnit(selectedUnit)}
              onAddTrade={handleAddTrade}
              onDeleteTrade={handleDeleteTrade}
              onOpenCroquis={(unitId) => {
                setCroquisModalTargetUnitId(unitId || selectedUnitId || undefined);
                setIsCroquisModalOpen(true);
              }}
            />
          </ErrorBoundary>
        )}
      </main>
      </div>

      {/* Executive Floating Bottom Navigation Dock - Matches Reference Screenshot */}
      <nav className="lg:hidden fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md glass-dock rounded-2xl px-5 py-2 flex justify-around items-center z-40 no-print transition-all">
        <button
          onClick={() => handleNavigate('dashboard')}
          style={currentView === 'dashboard' ? {
            color: localColors.neonColor || '#00f2fe',
            filter: `drop-shadow(0 0 8px ${hexToRgba(localColors.neonColor || '#00f2fe', 0.6)})`
          } : undefined}
          className={`group flex flex-col items-center justify-center font-bold text-[11px] touch-target active:scale-95 transition-all ${
            currentView === 'dashboard'
              ? ''
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Ir a Obras / Proyectos"
        >
          <Building2 className="w-5 h-5 mb-0.5 group-hover:scale-125 group-active:scale-130 active:scale-130 transition-transform duration-200 ease-out" />
          <span className="group-hover:scale-105 transition-transform duration-150">Proyectos</span>
        </button>

        <button
          onClick={handleGoToUnitsView}
          style={currentView === 'units' ? {
            color: localColors.neonColor || '#00f2fe',
            filter: `drop-shadow(0 0 8px ${hexToRgba(localColors.neonColor || '#00f2fe', 0.6)})`
          } : undefined}
          className={`group flex flex-col items-center justify-center font-bold text-[11px] touch-target active:scale-95 transition-all ${
            currentView === 'units'
              ? ''
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Ir a Departamentos y Unidades"
        >
          <DoorOpen className="w-5 h-5 mb-0.5 group-hover:scale-125 group-active:scale-130 active:scale-130 transition-transform duration-200 ease-out" />
          <span className="group-hover:scale-105 transition-transform duration-150">Unidades</span>
        </button>

        {/* CROQUIS BUTTON */}
        <button
          onClick={() => {
            setCroquisModalTargetUnitId(selectedUnitId || undefined);
            setIsCroquisModalOpen(true);
          }}
          style={isCroquisModalOpen ? { color: localColors.neonColor || '#00f2fe' } : undefined}
          className={`group flex flex-col items-center justify-center font-bold text-[11px] touch-target active:scale-95 relative transition-all ${
            isCroquisModalOpen
              ? ''
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Abrir hoja de croquis a mano alzada para este u otro depto"
        >
          <PenTool className="w-5 h-5 mb-0.5 group-hover:scale-125 group-active:scale-130 active:scale-130 transition-transform duration-200 ease-out" />
          <span className="group-hover:scale-105 transition-transform duration-150">Croquis</span>
        </button>

        {/* EXPORTAR PDF BUTTON */}
        <button
          onClick={() => handleOpenReportModal('auto')}
          className="group flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 font-bold text-[11px] touch-target active:scale-95 transition-all"
          title="Exportar informe técnico en PDF"
        >
          <FileText className="w-5 h-5 mb-0.5 group-hover:scale-125 group-active:scale-130 active:scale-130 transition-transform duration-200 ease-out" />
          <span className="group-hover:scale-105 transition-transform duration-150">Exportar PDF</span>
        </button>
      </nav>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {editingProject && (
        <EditProjectModal
          isOpen={!!editingProject}
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSaveProject={handleSaveProjectData}
        />
      )}

      {activeBlueprintViewerUnit && (
        <BlueprintViewerModal
          isOpen={!!activeBlueprintViewerUnit}
          unitName={activeBlueprintViewerUnit.name}
          projectName={selectedProject?.name || ''}
          blueprints={
            selectedProject?.units.find(u => u.id === activeBlueprintViewerUnit.id)?.blueprints ||
            activeBlueprintViewerUnit.blueprints ||
            []
          }
          onClose={() => setActiveBlueprintViewerUnit(null)}
          onAddBlueprint={(doc) => handleAddUnitBlueprint(activeBlueprintViewerUnit.id, doc)}
          onDeleteBlueprint={(docId) => handleDeleteUnitBlueprint(activeBlueprintViewerUnit.id, docId)}
        />
      )}

      <NewUnitModal
        isOpen={isNewUnitModalOpen}
        onClose={() => setIsNewUnitModalOpen(false)}
        onCreateUnit={handleCreateUnit}
      />

      <EditUnitModal
        isOpen={!!editingUnit}
        unit={editingUnit}
        onClose={() => setEditingUnit(null)}
        onSave={handleSaveUnitName}
        onRequestDelete={handleRequestDeleteUnit}
      />

      <PhotoViewerModal
        isOpen={!!activePhotoViewer}
        tradeName={activePhotoViewer?.tradeName || 'Gremio'}
        item={activeItem}
        onClose={() => setActivePhotoViewer(null)}
        onTriggerCamera={() => {
          if (cameraInputRef.current) {
            cameraInputRef.current.value = '';
            cameraInputRef.current.click();
          }
        }}
        onAddPhoto={(dataUrl) => {
          if (activePhotoViewer) {
            handleAddPhoto(activePhotoViewer.tradeId, activePhotoViewer.itemId, dataUrl);
          }
        }}
        onDeletePhoto={(photoId) => {
          if (activePhotoViewer) {
            handleDeletePhoto(activePhotoViewer.tradeId, activePhotoViewer.itemId, photoId);
          }
        }}
      />

      {isReportModalOpen && (
        <ErrorBoundary
          fallbackTitle="Error al abrir el reporte"
          onReset={() => setIsReportModalOpen(false)}
        >
          <ReportModal
            isOpen={isReportModalOpen}
            projects={projects}
            defaultScope={reportDefaultScope}
            headerLogoUrl={logos.header}
            onClose={() => setIsReportModalOpen(false)}
            onExportJSON={handleExportJSON}
          />
        </ErrorBoundary>
      )}

      <LogoEditorModal
        isOpen={isLogoEditorOpen}
        currentLogos={logos}
        localAppBackground={localColors.appBackground}
        localAppBackgroundImage={localColors.appBackgroundImage}
        localPresentationBackground={localColors.presentationBackground}
        localNeonColor={localColors.neonColor || '#00f2fe'}
        localFontFamily={localColors.fontFamily}
        localIsBoldText={localColors.isBoldText}
        initialTarget={logoEditorTarget}
        theme={theme}
        onToggleTheme={handleSetTheme}
        onForceLandscape={handleForceLandscape}
        onClose={() => setIsLogoEditorOpen(false)}
        onUpdateLocalColors={(updatedColors) => {
          setLocalColors(prev => ({
            ...prev,
            ...updatedColors
          }));
        }}
        onSaveLogos={(newLogos, newLocalColors) => {
          setLogos({
            header: newLogos.header,
            banner: newLogos.banner
          });
          if (newLocalColors) {
            setLocalColors(newLocalColors);
          }
        }}
        onShowToast={showToast}
      />

      <SecurityConfirmModal
        isOpen={securityModal.isOpen}
        title={securityModal.title}
        itemName={securityModal.itemName}
        itemType={securityModal.itemType}
        onClose={() => setSecurityModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={securityModal.onConfirm}
      />

      {isMilestonesModalOpen && projectForMilestones && (
        <MilestonesModal
          isOpen={isMilestonesModalOpen}
          project={projectForMilestones}
          onClose={() => setIsMilestonesModalOpen(false)}
          onSaveMilestone={handleSaveMilestone}
          onDeleteMilestone={handleDeleteMilestone}
          onToggleManualMilestone={handleToggleManualMilestone}
          onUpdateMilestoneProgress={handleUpdateMilestoneProgress}
        />
      )}

      {/* Modal de Project Manager y Agenda Integral por Obra */}
      {pmModalState.isOpen && activePMProject && (
        <ErrorBoundary
          fallbackTitle="Error al cargar el módulo de Project Manager"
          onReset={handleCloseProjectManager}
        >
          <ProjectManagerModal
            isOpen={pmModalState.isOpen}
            project={activePMProject}
            initialTab={pmModalState.initialTab || 'dashboard'}
            initialDate={pmModalState.initialDate}
            selectedTaskId={pmModalState.selectedTaskId}
            neonColor={localColors.neonColor || '#00f2fe'}
            onClose={handleCloseProjectManager}
            onSaveTask={handleSaveCalendarEvent}
            onDeleteTask={handleDeleteCalendarEvent}
            onToggleTaskStatus={handleToggleCalendarEvent}
            onToggleSubtask={handleTogglePMSubtask}
            onSaveContractors={handleSaveContractors}
            onOpenMilestonesConfig={handleOpenMilestonesConfig}
            onSaveMilestone={handleSaveMilestone}
            onShowToast={showToast}
          />
        </ErrorBoundary>
      )}

      {isCroquisModalOpen && projects.length > 0 && (
        <ErrorBoundary
          fallbackTitle="Error al cargar el módulo de croquis"
          onReset={() => setIsCroquisModalOpen(false)}
        >
          <CroquisModal
            isOpen={isCroquisModalOpen}
            projects={projects}
            initialProjectId={selectedProjectId || projects[0]?.id}
            initialUnitId={croquisModalTargetUnitId || selectedUnitId || (selectedProject?.units?.[0]?.id ?? projects[0]?.units?.[0]?.id)}
            onClose={() => setIsCroquisModalOpen(false)}
            onSaveSketch={handleSaveSketch}
            onDeleteSketch={handleDeleteSketch}
          />
        </ErrorBoundary>
      )}

      {isMonthlyReportModalOpen && (
        <MonthlyWorkReportModal
          isOpen={isMonthlyReportModalOpen}
          project={projects.find(p => p.id === monthlyReportProjectId) || selectedProject || projects[0]}
          headerLogoUrl={logos.header}
          onClose={() => setIsMonthlyReportModalOpen(false)}
          onUpdateProject={handleUpdateProject}
        />
      )}

      <CloudSetupModal
        isOpen={isCloudSetupModalOpen}
        onClose={() => setIsCloudSetupModalOpen(false)}
        onRetrySync={handleRetryCloudSync}
      />

      {/* Floating PWA App Download Balloon for Mobile and Notebook */}
      <PWAInstallPrompt />
    </div>
  );
}
