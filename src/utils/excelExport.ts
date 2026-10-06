import * as XLSX from 'xlsx';
import { Project, Unit } from '../types';
import { calculateUnitProgress, isUnitCommonArea } from './calculations';

export function exportInspectionPlanillaToExcel(project: Project, unitId?: string) {
  const isSingleUnit = Boolean(unitId);
  const targetUnits: Unit[] = isSingleUnit
    ? project.units.filter(u => u.id === unitId)
    : project.units;

  if (targetUnits.length === 0) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Sheet 1: Detailed Items with Checkboxes for field use
  const detailedRows: Array<Record<string, string | number>> = [];

  targetUnits.forEach(unit => {
    const unitTypeLabel = isUnitCommonArea(unit) ? 'Espacio Común' : 'Departamento';

    unit.trades.forEach(trade => {
      trade.items.forEach(item => {
        const itemPct = item.progressPercentage !== undefined ? item.progressPercentage : (item.completed ? 100 : 0);
        let appState = 'Pendiente (0%)';
        let handCheckbox = '[   ] PENDIENTE';
        if (item.completed || itemPct === 100) {
          appState = 'Completado (100%)';
          handCheckbox = '[ ✓ ] REALIZADO';
        } else if (itemPct > 0) {
          appState = `En curso (${itemPct}%)`;
          handCheckbox = `[ ~ ] PARCIAL (${itemPct}%)`;
        }

        detailedRows.push({
          'Unidad / Espacio': unit.name,
          'Tipo': unitTypeLabel,
          'Gremio / Rubro': trade.name,
          'Ítem Técnico a Inspeccionar': item.name,
          'Casilla Terreno (Tildar a mano)': handCheckbox,
          '% Avance en App': `${itemPct}%`,
          'Estado en App': appState,
          'Observaciones / Notas': item.comment || '',
          'Fotos en App': item.photos && item.photos.length > 0 ? `${item.photos.length} foto(s)` : '-',
          'Firma / Control en Obra': ''
        });
      });
    });
  });

  // Sheet 2: Summary by Unit/Space
  const summaryRows = targetUnits.map(unit => {
    const unitTypeLabel = isUnitCommonArea(unit) ? 'Espacio Común' : 'Departamento';
    const totalItems = unit.trades.reduce((acc, t) => acc + t.items.length, 0);
    const completedItems = unit.trades.reduce(
      (acc, t) => acc + t.items.filter(i => i.completed).length,
      0
    );
    const pendingItems = totalItems - completedItems;
    const progress = calculateUnitProgress(unit, 'all');

    let statusText = 'Pendiente';
    if (progress >= 100) statusText = 'Completado (100%)';
    else if (progress > 0) statusText = `En curso (${progress}%)`;

    return {
      'Unidad / Espacio': unit.name,
      'Tipo': unitTypeLabel,
      'Total Ítems': totalItems,
      'Completados': completedItems,
      'Pendientes': pendingItems,
      '% Avance': `${progress}%`,
      'Estado General': statusText
    };
  });

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheets
  const wsDetails = XLSX.utils.json_to_sheet(detailedRows);
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

  // Configure Column widths for wsDetails
  wsDetails['!cols'] = [
    { wch: 18 }, // Unidad / Espacio
    { wch: 16 }, // Tipo
    { wch: 26 }, // Gremio
    { wch: 42 }, // Ítem Técnico
    { wch: 26 }, // Casilla Terreno
    { wch: 16 }, // % Avance en App
    { wch: 20 }, // Estado en App
    { wch: 38 }, // Observaciones / Notas
    { wch: 14 }, // Fotos
    { wch: 22 }  // Firma / Control
  ];

  // Configure Column widths for wsSummary
  wsSummary['!cols'] = [
    { wch: 22 }, // Unidad
    { wch: 16 }, // Tipo
    { wch: 13 }, // Total
    { wch: 14 }, // Completados
    { wch: 14 }, // Pendientes
    { wch: 12 }, // % Avance
    { wch: 20 }  // Estado General
  ];

  // Append sheets
  XLSX.utils.book_append_sheet(workbook, wsDetails, 'Planilla de Control');
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumen por Unidad');

  // File naming
  const safeProjectName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const unitSuffix = isSingleUnit && targetUnits[0]
    ? `_${targetUnits[0].name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
    : '_Todas_Unidades';
  const cleanDate = dateStr.replace(/\//g, '-');
  const fileName = `Planilla_Control_${safeProjectName}${unitSuffix}_${cleanDate}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
