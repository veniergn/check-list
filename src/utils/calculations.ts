import { Unit, Project } from '../types';

export function isTradeMatchingFilter(trade: { id: string; name: string }, tradeFilter: string): boolean {
  if (!tradeFilter || tradeFilter === 'all') return true;
  const f = tradeFilter.toLowerCase().trim();
  return trade.id.toLowerCase().trim() === f || trade.name.toLowerCase().trim() === f;
}

export function calculateUnitProgress(unit: Unit, tradeFilter: string = 'all'): number {
  if (!unit || !unit.trades || unit.trades.length === 0) return 0;
  let totalItems = 0;
  let totalProgress = 0;

  unit.trades.forEach(trade => {
    if (isTradeMatchingFilter(trade, tradeFilter)) {
      trade.items.forEach(item => {
        totalItems++;
        const pct = item.progressPercentage !== undefined
          ? item.progressPercentage
          : (item.completed ? 100 : 0);
        totalProgress += pct;
      });
    }
  });

  if (totalItems === 0) return 0;
  return Math.round(totalProgress / totalItems);
}

export function getUnitItemCounts(unit: Unit, tradeFilter: string = 'all'): { total: number; completed: number; inProgress: number } {
  let total = 0;
  let completed = 0;
  let inProgress = 0;

  if (unit && unit.trades) {
    unit.trades.forEach(trade => {
      if (isTradeMatchingFilter(trade, tradeFilter)) {
        trade.items.forEach(item => {
          total++;
          const pct = item.progressPercentage !== undefined
            ? item.progressPercentage
            : (item.completed ? 100 : 0);
          if (item.completed || pct === 100) {
            completed++;
          } else if (pct > 0) {
            inProgress++;
          }
        });
      }
    });
  }

  return { total, completed, inProgress };
}

/**
 * Accurately determines whether a unit is a common area (Espacio Común / Sala de Máquinas / etc.)
 * even if older data did not have the `type` field explicitly set.
 */
export function isUnitCommonArea(unit: { name?: string; type?: 'unit' | 'common_area'; category?: string } | null | undefined): boolean {
  if (!unit) return false;
  if (unit.type === 'common_area') return true;
  if (unit.type === 'unit') return false;

  // Fallback checks for legacy or untyped data:
  if (unit.category === 'Espacio Común' || unit.category === 'Espacio Técnico') return true;

  const n = (unit.name || '').toLowerCase();
  // If explicitly designated with depto/departamento/piso, it is a unit
  if (/^depto\b|^departamento\b|^\d+[-_]\d+/.test(n)) {
    return false;
  }

  // Keywords that denote common spaces / service areas
  const commonKeywords = [
    'quincho', 'sum', 'terraza', 'cochera', 'estacionamiento',
    'baulera', 'hall', 'máquina', 'maquina', 'bomba',
    'transformador', 'set', 'palier', 'escalera', 'común', 'comun',
    'lavadero', 'tendedero', 'tablero', 'portón', 'porton', 'fachada',
    'acceso', 'solarium', 'solárium', 'seguridad', 'garita'
  ];

  if (commonKeywords.some(k => n.includes(k))) {
    return true;
  }

  // Common emojis used for common areas
  if (/[🏢🍖🏊🚗📦⚡🚒📐🛡️🌿]/.test(unit.name || '')) {
    return true;
  }

  return false;
}

export function calculateProjectProgress(
  project: Project,
  tradeFilter: string = 'all',
  typeFilter: 'all' | 'unit' | 'common_area' = 'all'
): number {
  if (!project || !project.units || project.units.length === 0) return 0;
  let totalItemsCount = 0;
  let totalProgressSum = 0;

  project.units.forEach(unit => {
    if (!unit || !unit.trades) return;
    const isCommon = isUnitCommonArea(unit);
    if (typeFilter === 'unit' && isCommon) return;
    if (typeFilter === 'common_area' && !isCommon) return;

    unit.trades.forEach(trade => {
      if (isTradeMatchingFilter(trade, tradeFilter)) {
        trade.items.forEach(item => {
          totalItemsCount++;
          const pct = item.progressPercentage !== undefined
            ? item.progressPercentage
            : (item.completed ? 100 : 0);
          totalProgressSum += pct;
        });
      }
    });
  });

  if (totalItemsCount === 0) return 0;
  return Math.round(totalProgressSum / totalItemsCount);
}

export function getProjectConsolidatedStats(project: Project, tradeFilter: string = 'all'): {
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  pendingItems: number;
  totalProgressSum: number;
  globalPercentage: number;
  remainingPercentage: number;
} {
  let totalItems = 0;
  let completedItems = 0;
  let inProgressItems = 0;
  let pendingItems = 0;
  let totalProgressSum = 0;

  if (project && project.units) {
    project.units.forEach(unit => {
      if (!unit || !unit.trades) return;
      unit.trades.forEach(trade => {
        if (isTradeMatchingFilter(trade, tradeFilter)) {
          trade.items.forEach(item => {
            totalItems++;
            const pct = item.progressPercentage !== undefined
              ? item.progressPercentage
              : (item.completed ? 100 : 0);
            totalProgressSum += pct;
            if (pct >= 100 || item.completed) {
              completedItems++;
            } else if (pct > 0) {
              inProgressItems++;
            } else {
              pendingItems++;
            }
          });
        }
      });
    });
  }

  const globalPercentage = totalItems > 0 ? Math.round(totalProgressSum / totalItems) : 0;
  const remainingPercentage = Math.max(0, 100 - globalPercentage);

  return {
    totalItems,
    completedItems,
    inProgressItems,
    pendingItems,
    totalProgressSum,
    globalPercentage,
    remainingPercentage
  };
}

/**
 * Resizes and compresses an image using HTML5 Canvas to prevent localStorage quota exhaustion.
 */
export function compressImageFile(file: File, maxDim: number = 800, quality: number = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing base64 dataUrl (PNG or heavy JPEG) to an optimized JPEG.
 * Ensures huge canvas exports or camera snapshots don't saturate Supabase or localStorage.
 */
export function compressDataUrl(dataUrl: string, maxDim: number = 1200, quality: number = 0.80): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    // If it's already a lightweight JPEG (< 350 KB), skip compression
    if (dataUrl.startsWith('data:image/jpeg') && dataUrl.length < 350 * 1024) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
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
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}


/**
 * Determines the floor number and label of a unit based on naming patterns,
 * such as "2-1" -> Floor 2, "Depto 1-2" -> Floor 1, "PB-1" -> Floor 0, etc.
 */
export function parseUnitFloor(unit: { name?: string; floorNumber?: number; floorLabel?: string; type?: 'unit' | 'common_area'; category?: string }): {
  floorNumber: number;
  label: string;
  isCommon: boolean;
} {
  if (isUnitCommonArea(unit)) {
    return {
      floorNumber: 9999,
      label: 'Espacios Comunes',
      isCommon: true
    };
  }

  const name = (unit.name || '').trim();

  // 1. Check for hyphen/slash pattern: "2-1", "Depto 2-1", "Depto 2_1", "PB-1", "Depto 2-A"
  const hyphenMatch = name.match(/(?:depto|departamento|unidad|dpto)?\s*(pb|\d+)\s*[-_/]\s*([a-z0-9]+)/i);
  if (hyphenMatch) {
    const raw = hyphenMatch[1].toLowerCase();
    if (raw === 'pb' || raw === '0') {
      return { floorNumber: 0, label: 'Planta Baja (PB)', isCommon: false };
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      return { floorNumber: num, label: `Piso ${num}`, isCommon: false };
    }
  }

  // 2. Check for "Piso X" or "PisoX" in name
  const pisoMatch = name.match(/piso\s*(\d+)/i);
  if (pisoMatch) {
    const num = parseInt(pisoMatch[1], 10);
    return { floorNumber: num, label: `Piso ${num}`, isCommon: false };
  }

  // 3. Check for 3-digit or 4-digit hotel/depto style: 101, 102 -> Piso 1; 201 -> Piso 2; 1201 -> Piso 12
  const threeDigitMatch = name.match(/(?:depto|departamento|unidad|dpto)?\s*(\d{1,2})(\d{2})\b/i);
  if (threeDigitMatch) {
    const num = parseInt(threeDigitMatch[1], 10);
    return { floorNumber: num, label: num === 0 ? 'Planta Baja (PB)' : `Piso ${num}`, isCommon: false };
  }

  // 4. Check unit.floorNumber / unit.floorLabel
  if (unit.floorNumber !== undefined) {
    const num = unit.floorNumber;
    const label = unit.floorLabel || (num === 0 ? 'Planta Baja (PB)' : `Piso ${num}`);
    return { floorNumber: num, label, isCommon: false };
  }

  if (unit.floorLabel && /piso\s*\d+/i.test(unit.floorLabel)) {
    const numMatch = unit.floorLabel.match(/\d+/);
    const num = numMatch ? parseInt(numMatch[0], 10) : 1;
    return { floorNumber: num, label: unit.floorLabel, isCommon: false };
  }

  // Default fallback
  return { floorNumber: 1, label: 'Piso 1', isCommon: false };
}

/**
 * Converts a hex color (#RGB, #RRGGBB) to an rgba(...) string with specified alpha
 */
export function hexToRgba(hex?: string, alpha: number = 1): string {
  if (!hex) return `rgba(0, 242, 254, ${alpha})`;
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length !== 6) return `rgba(0, 242, 254, ${alpha})`;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return `rgba(0, 242, 254, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

