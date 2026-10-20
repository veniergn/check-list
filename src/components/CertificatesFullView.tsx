import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  ExternalLink,
  UploadCloud,
  Download,
  Printer,
  Plus,
  Search,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Pencil,
  X,
  ChevronRight,
  Calendar,
  Clock,
  Sparkles,
  Check,
  FileText,
  Send,
  RefreshCw,
  Eye,
  ArrowLeft,
  DollarSign,
  Briefcase
} from 'lucide-react';
import {
  Project,
  ContractorProfile,
  ContractorExcelFile,
  ContractorPdfSnapshot,
  ContractorCertificate
} from '../types';
import { DEFAULT_CONTRACTORS, getProjectContractors } from '../utils/pmContractors';

interface CertificatesFullViewProps {
  projects: Project[];
  selectedProjectId?: string | null;
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onSaveCertificate?: (param1: string | ContractorCertificate, param2?: ContractorCertificate) => void;
  onDeleteCertificate?: (arg1: string, arg2?: string) => void;
  onSaveContractors?: (projectId: string, contractors: ContractorProfile[]) => void;
  onAddContractor?: (projectId: string, contractor: any) => void;
  onDeleteContractor?: (projectId: string, contractorId: string) => void;
  directorName?: string;
  neonColor?: string;
  onShowToast?: (msg: string, icon?: string) => void;
}

// Generate column headers (A, B, C, ... Z, AA, AB...)
const getColumnLetter = (colIndex: number): string => {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
};

// Create a default base certificate template sheet if contractor has no Excel yet
const createDefaultBaseTemplate = (contractorName: string, obraName: string): { [sheetName: string]: (string | number | null)[][] } => {
  const dateStr = new Date().toLocaleDateString('es-AR');
  return {
    'Certificado': [
      ['CONTROL DE AVANCE DE OBRAS - PLANILLA DE CERTIFICACIÓN QUINCENAL', '', '', '', '', '', '', '', ''],
      ['Obra:', obraName, '', 'Fecha:', dateStr, '', 'Período:', 'Quincenal', ''],
      ['Contratista:', contractorName, '', 'Director Técnico:', 'Arq. Venier Gastón', '', 'Administrador:', 'veniergn@gmail.com', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['N°', 'Ítem / Rubro / Tarea', 'Unidad', 'Cant. Contratada', 'Precio Unitario ($)', '% Avance Anterior', '% Avance Actual', '% Quincena', 'Monto a Cobrar ($)'],
      [1, 'Replanteo y nivelación de obra', 'gl', 1, 150000, 100, 100, 0, 0],
      [2, 'Mampostería de elevación', 'm2', 240, 14500, 25, 45, 20, 696000],
      [3, 'Revoque grueso exterior', 'm2', 180, 9200, 10, 30, 20, 331200],
      [4, 'Contrapisos y carpetas', 'm2', 120, 8000, 0, 15, 15, 144000],
      [5, 'Instalaciones y canalizaciones', 'gl', 1, 350000, 20, 40, 20, 70000],
      ['', '', '', '', '', '', '', '', ''],
      ['', 'SUBTOTAL CERTIFICACIÓN QUINCENAL', '', '', '', '', '', '', 1241200],
      ['', 'Anticipo entregado (-)', '', '', '', '', '', '', 0],
      ['', 'Fondo de Reparo 5% (-)', '', '', '', '', '', '', 62060],
      ['', 'TOTAL NETO A PAGAR ($)', '', '', '', '', '', '', 1179140]
    ]
  };
};

export function CertificatesFullView({
  projects,
  selectedProjectId,
  activeProjectId,
  onSelectProject,
  onSaveCertificate,
  onDeleteCertificate,
  onSaveContractors,
  directorName = 'Arq. Venier Gastón',
  neonColor = '#00f2fe',
  onShowToast
}: CertificatesFullViewProps) {
  // 1. Current active project (isolated by Obra)
  const initialPid = selectedProjectId || activeProjectId || projects[0]?.id || '';
  const [selectedPid, setSelectedPid] = useState<string>(initialPid);

  useEffect(() => {
    if (selectedProjectId && selectedProjectId !== selectedPid) {
      setSelectedPid(selectedProjectId);
    }
  }, [selectedProjectId]);

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedPid) || projects[0] || null;
  }, [projects, selectedPid]);

  // 2. Contractors for current project
  const contractors = useMemo(() => {
    if (!activeProject) return DEFAULT_CONTRACTORS;
    return getProjectContractors(activeProject);
  }, [activeProject]);

  // Selected contractor state
  const [selectedContractorId, setSelectedContractorId] = useState<string>(() => {
    return contractors[0]?.id || '';
  });

  // Ensure selectedContractor is valid when changing obra
  useEffect(() => {
    if (contractors.length > 0) {
      const exists = contractors.some(c => c.id === selectedContractorId);
      if (!exists) {
        setSelectedContractorId(contractors[0].id);
      }
    } else {
      setSelectedContractorId('');
    }
  }, [contractors, selectedContractorId]);

  const selectedContractor = useMemo(() => {
    return contractors.find(c => c.id === selectedContractorId) || contractors[0] || null;
  }, [contractors, selectedContractorId]);

  // Hidden file input for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. EXCEL EDITOR / VIEWER MODAL STATE
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableSheets, setEditableSheets] = useState<{ [sheetName: string]: (string | number | null)[][] }>({});
  const [activeSheetName, setActiveSheetName] = useState<string>('Certificado');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 4. NEW CONTRACTOR MODAL
  const [isNewContractorModalOpen, setIsNewContractorModalOpen] = useState(false);
  const [newContractorName, setNewContractorName] = useState('');
  const [newContractorRole, setNewContractorRole] = useState('');
  const [newContractorPhone, setNewContractorPhone] = useState('');
  const [newContractorDni, setNewContractorDni] = useState('');

  // Internal back navigation hook
  useEffect(() => {
    (window as any).__customSectionBackHandler = () => {
      if (isEditorOpen) {
        if (isDirty) {
          if (confirm('Tienes cambios sin guardar. ¿Deseas cerrar el visor de todas formas?')) {
            setIsEditorOpen(false);
            return true;
          }
          return true;
        }
        setIsEditorOpen(false);
        return true;
      }
      if (isNewContractorModalOpen) {
        setIsNewContractorModalOpen(false);
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).__customSectionBackHandler;
    };
  }, [isEditorOpen, isNewContractorModalOpen, isDirty]);

  // Search contractors
  const [contractorSearch, setContractorSearch] = useState('');

  const filteredContractors = useMemo(() => {
    if (!contractorSearch.trim()) return contractors;
    const q = contractorSearch.toLowerCase();
    return contractors.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [contractors, contractorSearch]);

  // -------------------------------------------------------------
  // HELPER: Save contractor changes into project and sync
  // -------------------------------------------------------------
  const persistContractors = (updatedList: ContractorProfile[]) => {
    if (!activeProject) return;
    onSaveContractors?.(activeProject.id, updatedList);
  };

  // -------------------------------------------------------------
  // ABRIR ARCHIVO DIRECTAMENTE EN LA APP DE EXCEL (VENTANA APARTE)
  // -------------------------------------------------------------
  const handleOpenInDesktopExcel = () => {
    if (!selectedContractor || !activeProject) return;

    let blob: Blob;
    const fileName = selectedContractor.excelFile?.fileName ||
      ('Certificado_' + activeProject.name.replace(/\s+/g, '_') + '_' + selectedContractor.name.replace(/\s+/g, '_') + '.xlsx');

    if (selectedContractor.excelFile?.base64Data) {
      try {
        const binary = atob(selectedContractor.excelFile.base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
      } catch (err) {
        console.error('Error al generar blob:', err);
        return;
      }
    } else {
      const defaultTemplate = createDefaultBaseTemplate(selectedContractor.name, activeProject.name);
      const wb = XLSX.utils.book_new();
      Object.keys(defaultTemplate).forEach(name => {
        const ws = XLSX.utils.aoa_to_sheet(defaultTemplate[name]);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([arrayBuf], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }

    const blobUrl = URL.createObjectURL(blob);

    // 1. Descargar / lanzar para que Windows lo abra en Microsoft Excel
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 2. Abrir también en ventana aparte
    window.open(blobUrl, '_blank');

    onShowToast?.('Abriendo "' + fileName + '" en la aplicación de Excel...', 'FileSpreadsheet');
  };

  // -------------------------------------------------------------
  // BOTÓN 1: CARGAR / SUBIR ARCHIVO EXCEL DEL CONTRATISTA
  // -------------------------------------------------------------
  const handleTriggerUpload = () => {
    if (!selectedContractor) {
      onShowToast?.('Por favor selecciona un contratista primero', 'AlertTriangle');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedContractor || !activeProject) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Convert all sheets to 2D arrays
      const sheetsData: { [sheetName: string]: (string | number | null)[][] } = {};
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number | null)[][];
        sheetsData[sheetName] = data.length > 0 ? data : [['']];
      });

      // Binary to base64
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      const now = new Date();
      const formatted = now.toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }) + ', ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';

      const firstSheet = workbook.SheetNames[0] || 'Hoja1';

      const excelFileRecord: ContractorExcelFile = {
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: now.toISOString(),
        lastModifiedAt: now.toISOString(),
        lastModifiedFormatted: formatted,
        lastModifiedBy: 'veniergn@gmail.com',
        base64Data,
        sheetsData,
        activeSheetName: firstSheet
      };

      const updatedContractors = contractors.map(c => {
        if (c.id !== selectedContractor.id) return c;
        return {
          ...c,
          excelFile: excelFileRecord
        };
      });

      persistContractors(updatedContractors);
      onShowToast?.('Archivo "' + file.name + '" cargado con éxito para ' + selectedContractor.name, 'Check');
    } catch (err) {
      console.error('Error al procesar archivo Excel:', err);
      onShowToast?.('Error al leer el archivo Excel. Asegúrate de que sea .xlsx o .xls válido', 'AlertTriangle');
    } finally {
      e.target.value = '';
    }
  };

  // -------------------------------------------------------------
  // BOTÓN 2: ABRIR Y MODIFICAR EL ARCHIVO EXCEL EN LA APP
  // -------------------------------------------------------------
  const handleOpenExcelEditor = () => {
    if (!selectedContractor || !activeProject) return;

    if (selectedContractor.excelFile && selectedContractor.excelFile.sheetsData) {
      // Load existing user uploaded Excel sheets
      setEditableSheets(JSON.parse(JSON.stringify(selectedContractor.excelFile.sheetsData)));
      setActiveSheetName(selectedContractor.excelFile.activeSheetName || Object.keys(selectedContractor.excelFile.sheetsData)[0] || 'Hoja1');
      setIsDirty(false);
      setIsEditorOpen(true);
    } else {
      // Contractor has no Excel yet: generate base template and open directly
      const defaultTemplate = createDefaultBaseTemplate(selectedContractor.name, activeProject.name);
      setEditableSheets(defaultTemplate);
      setActiveSheetName('Certificado');
      setIsDirty(true);
      setIsEditorOpen(true);
      onShowToast?.('Se abrió la planilla base para este contratista. Puedes modificarla y guardarla.', 'Sparkles');
    }
  };

  // Cell modification handler
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    setEditableSheets(prev => {
      const currentRows = prev[activeSheetName] ? [...prev[activeSheetName]] : [];
      while (currentRows.length <= rowIndex) {
        currentRows.push([]);
      }
      const currentRow = [...(currentRows[rowIndex] || [])];
      while (currentRow.length <= colIndex) {
        currentRow.push('');
      }
      const numVal = Number(value);
      currentRow[colIndex] = !isNaN(numVal) && value.trim() !== '' ? numVal : value;
      currentRows[rowIndex] = currentRow;

      return {
        ...prev,
        [activeSheetName]: currentRows
      };
    });
    setIsDirty(true);
  };

  // Add Row
  const handleAddRow = () => {
    setEditableSheets(prev => {
      const currentRows = prev[activeSheetName] ? [...prev[activeSheetName]] : [];
      const colCount = currentRows[0]?.length || 8;
      const newEmptyRow = new Array(colCount).fill('');
      return {
        ...prev,
        [activeSheetName]: [...currentRows, newEmptyRow]
      };
    });
    setIsDirty(true);
  };

  // -------------------------------------------------------------
  // GUARDAR CAMBIOS EN EL ARCHIVO EXCEL (PERSISTENCIA Y PRÓXIMA QUINCENA)
  // -------------------------------------------------------------
  const handleSaveExcelChanges = () => {
    if (!selectedContractor || !activeProject) return;

    setIsSaving(true);
    try {
      const wb = XLSX.utils.book_new();
      const sheetNames = Object.keys(editableSheets);

      sheetNames.forEach(name => {
        const rows = editableSheets[name] || [];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });

      const newBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      const now = new Date();
      const formatted = now.toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }) + ', ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';

      const fileName = selectedContractor.excelFile?.fileName ||
        ('Certificado_' + activeProject.name.replace(/\s+/g, '_') + '_' + selectedContractor.name.replace(/\s+/g, '_') + '.xlsx');

      const updatedExcel: ContractorExcelFile = {
        fileName,
        fileSize: Math.round(newBase64.length * 0.75),
        uploadedAt: selectedContractor.excelFile?.uploadedAt || now.toISOString(),
        lastModifiedAt: now.toISOString(),
        lastModifiedFormatted: formatted,
        lastModifiedBy: 'veniergn@gmail.com',
        base64Data: newBase64,
        sheetsData: editableSheets,
        activeSheetName
      };

      const updatedContractors = contractors.map(c => {
        if (c.id !== selectedContractor.id) return c;
        return {
          ...c,
          excelFile: updatedExcel
        };
      });

      persistContractors(updatedContractors);
      setIsDirty(false);
      onShowToast?.('✓ Planilla guardada exitosamente. Lista para la próxima quincena.', 'Check');
    } catch (err) {
      console.error('Error al guardar Excel:', err);
      onShowToast?.('Error al guardar los cambios en el Excel', 'AlertTriangle');
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // GENERAR / GUARDAR PDF DEL ARCHIVO EXCEL CON FIRMAS
  // -------------------------------------------------------------
  const handleExportAndSavePdf = () => {
    if (!selectedContractor || !activeProject) return;

    // 1. Guardar primero los cambios del Excel
    handleSaveExcelChanges();

    // 2. Registrar en el historial de PDFs emitidos
    const now = new Date();
    const formatted = now.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';

    const newPdfSnapshot: ContractorPdfSnapshot = {
      id: 'pdf_' + Date.now(),
      title: 'Certificado ' + selectedContractor.name + ' - ' + now.toLocaleDateString('es-AR'),
      period: 'Quincena ' + now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
      generatedAt: now.toISOString(),
      generatedFormatted: formatted,
      generatedBy: 'veniergn@gmail.com'
    };

    const currentHistory = selectedContractor.pdfHistory || [];
    const updatedContractors = contractors.map(c => {
      if (c.id !== selectedContractor.id) return c;
      return {
        ...c,
        pdfHistory: [newPdfSnapshot, ...currentHistory]
      };
    });

    persistContractors(updatedContractors);

    // 3. Lanzar ventana de impresión para guardar PDF
    setTimeout(() => {
      window.print();
    }, 250);

    onShowToast?.('PDF generado y registrado en el historial del contratista', 'Check');
  };

  // -------------------------------------------------------------
  // DESCARGAR ARCHIVO .XLSX DIRECTO
  // -------------------------------------------------------------
  const handleDownloadXlsx = () => {
    if (!selectedContractor) return;

    const fileName = selectedContractor.excelFile?.fileName ||
      ('Certificado_' + selectedContractor.name.replace(/\s+/g, '_') + '.xlsx');

    if (selectedContractor.excelFile?.base64Data) {
      try {
        const binary = atob(selectedContractor.excelFile.base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onShowToast?.('Descargando ' + fileName, 'Check');
      } catch (err) {
        console.error('Error al descargar:', err);
      }
    } else {
      const wb = XLSX.utils.book_new();
      const sheetNames = Object.keys(editableSheets);
      sheetNames.forEach(name => {
        const rows = editableSheets[name] || [];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, name);
      });
      XLSX.writeFile(wb, fileName);
    }
  };

  // -------------------------------------------------------------
  // QUITAR ARCHIVO EXCEL DEL CONTRATISTA
  // -------------------------------------------------------------
  const handleRemoveExcel = () => {
    if (!selectedContractor || !activeProject) return;
    if (confirm('¿Eliminar el archivo Excel asociado a "' + selectedContractor.name + '"?')) {
      const updatedContractors = contractors.map(c => {
        if (c.id !== selectedContractor.id) return c;
        const copy = { ...c };
        delete copy.excelFile;
        return copy;
      });
      persistContractors(updatedContractors);
      onShowToast?.('Archivo Excel desvinculado', 'Trash2');
    }
  };

  // -------------------------------------------------------------
  // CREAR NUEVO CONTRATISTA
  // -------------------------------------------------------------
  const handleCreateContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractorName.trim() || !activeProject) return;

    const newC: ContractorProfile = {
      id: 'c_' + Date.now(),
      name: newContractorName.trim(),
      role: newContractorRole.trim() || 'Contratista General',
      phone: newContractorPhone.trim() || undefined,
      dniCuit: newContractorDni.trim() || undefined,
      color: '#00f2fe',
      initials: newContractorName.trim().slice(0, 2).toUpperCase()
    };

    const updatedList = [...contractors, newC];
    persistContractors(updatedList);
    setSelectedContractorId(newC.id);
    setIsNewContractorModalOpen(false);
    setNewContractorName('');
    setNewContractorRole('');
    setNewContractorPhone('');
    setNewContractorDni('');
    onShowToast?.('Contratista "' + newC.name + '" agregado con éxito', 'Check');
  };

  // Current active sheet rows for editor
  const currentSheetRows = useMemo(() => {
    return editableSheets[activeSheetName] || [];
  }, [editableSheets, activeSheetName]);

  // Max columns count in current sheet
  const maxCols = useMemo(() => {
    let max = 6;
    currentSheetRows.forEach(row => {
      if (row.length > max) max = row.length;
    });
    return Math.max(max, 8);
  }, [currentSheetRows]);

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. TOP HEADER & PROJECT SELECTOR (AISLAMIENTO ESTRICTO POR OBRA) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Certificados de Contratistas
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Planillas Excel
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Gestión quincenal por archivo Excel de cada contratista, modificación en vivo y guardado en PDF
              </p>
            </div>
          </div>
        </div>

        {/* PROJECT SELECTOR BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081321]/80 p-3 rounded-2xl border border-[#29384C]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-black uppercase text-[#94A3B8] flex items-center gap-1.5 shrink-0 px-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Obra Activa:
            </span>
            {projects.map(p => {
              const isSelected = p.id === activeProject?.id;
              const pContractors = getProjectContractors(p);
              const withExcelCount = pContractors.filter(c => c.excelFile).length;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPid(p.id);
                    onSelectProject?.(p.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-600/30 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#101D30] border border-transparent'
                  }`}
                >
                  <span>🏗️ {p.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-[#17263B] text-slate-400'
                  }`}>
                    {withExcelCount}/{pContractors.length} Excel
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-[#94A3B8] flex items-center gap-2">
            <span>Admin:</span>
            <span className="font-mono font-bold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40">
              veniergn@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN SPLIT VIEW: CONTRACTORS LIST (LEFT) & CONTRACTOR EXCEL CONTROLS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LIST OF CONTRACTORS (4 COLS) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase text-white tracking-wider">
                  Contratistas ({contractors.length})
                </h3>
              </div>
              <button
                onClick={() => setIsNewContractorModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar</span>
              </button>
            </div>

            {/* Contractor search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={contractorSearch}
                onChange={(e) => setContractorSearch(e.target.value)}
                placeholder="Buscar contratista o rubro..."
                className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[560px] overflow-y-auto no-scrollbar pt-1">
              {filteredContractors.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No se encontraron contratistas en esta obra.
                </div>
              ) : (
                filteredContractors.map(c => {
                  const isSelected = c.id === selectedContractor?.id;
                  const hasExcel = Boolean(c.excelFile);

                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedContractorId(c.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between gap-3 border ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 border-emerald-400/60 shadow-lg shadow-emerald-500/10'
                          : 'bg-[#081321]/60 hover:bg-[#17263B] border-[#29384C]/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{ backgroundColor: c.color || '#00f2fe' }}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-sm"
                        >
                          {c.initials || c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate">{c.name}</h4>
                          <p className="text-[10px] text-[#94A3B8] truncate">{c.role}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {hasExcel ? (
                              <span className="text-[9px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Excel listo
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-500">
                                Sin archivo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN CONTRACTOR CARD & TWO ACTION BUTTONS (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedContractor ? (
            <div className="space-y-4">
              {/* CONTRACTOR EXECUTIVE CARD */}
              <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-5 shadow-xl space-y-5">
                {/* Contractor info top */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#29384C]">
                  <div className="flex items-center gap-3.5">
                    <div
                      style={{ backgroundColor: selectedContractor.color || '#00f2fe' }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-950 font-black text-base shadow-md shrink-0"
                    >
                      {selectedContractor.initials || selectedContractor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                          Contratista de {activeProject?.name}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-white">
                        {selectedContractor.name}
                      </h2>
                      <p className="text-xs text-[#94A3B8]">
                        Rubro: <span className="text-white font-bold">{selectedContractor.role}</span>
                        {selectedContractor.dniCuit && <span> • DNI/CUIT: {selectedContractor.dniCuit}</span>}
                        {selectedContractor.phone && <span> • Tel: {selectedContractor.phone}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Director Técnico</span>
                    <span className="text-xs font-bold text-white">{directorName}</span>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* LOS DOS BOTONES PRINCIPALES PEDIDOS POR EL USUARIO */}
                {/* ========================================================= */}
                <div className="bg-[#081321] border border-[#29384C] p-5 rounded-3xl space-y-4">
                  <div>
                    <h3 className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Gestión de Certificado por Archivo Excel</span>
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5">
                      Sube tu propio archivo Excel preparado para este contratista, ábrelo en la app para modificar los avances de la quincena y genera el PDF firmado.
                    </p>
                  </div>

                  {/* GRID DE LOS DOS BOTONES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* BOTÓN 1: CARGAR / SUBIR ARCHIVO EXCEL */}
                    <div className="bg-[#101D30] border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-blue-400 transition-all">
                      <div>
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                          <UploadCloud className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Paso 1: Archivo Base</span>
                        </div>
                        <h4 className="text-sm font-black text-white">
                          {selectedContractor.excelFile ? 'Actualizar / Reemplazar Excel' : 'Cargar Archivo Excel'}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {selectedContractor.excelFile
                            ? ('Archivo activo: "' + selectedContractor.excelFile.fileName + '"')
                            : 'Sube el archivo Excel (.xlsx / .xls) que ya tienes preparado para este contratista.'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{selectedContractor.excelFile ? 'Cambiar Archivo Excel' : 'Cargar Archivo Excel (.xlsx)'}</span>
                      </button>
                    </div>

                    {/* BOTÓN 2: ABRIR Y MODIFICAR ARCHIVO EXCEL */}
                    <div className="bg-[#101D30] border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-emerald-400 transition-all">
                      <div>
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Paso 2: Liquidación Quincenal</span>
                        </div>
                        <h4 className="text-sm font-black text-white">
                          Abrir Planilla de Excel
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Abre el archivo directamente en la aplicación de Excel (ventana aparte) o modifícalo en la app.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={handleOpenInDesktopExcel}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                        >
                          <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                          <span>Abrir en Excel (App de Escritorio / Ventana Aparte)</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-950" />
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenExcelEditor}
                          className="w-full py-2 px-3 rounded-xl bg-[#17263B] hover:bg-[#1E324A] text-slate-300 hover:text-white text-xs font-bold border border-[#29384C] flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Modificar Planilla en la App</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ESTADO DEL ARCHIVO EXCEL CARGADO */}
                  {selectedContractor.excelFile ? (
                    <div className="p-3.5 rounded-2xl bg-[#101D30]/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-sm shrink-0">
                          📊
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">
                              {selectedContractor.excelFile.fileName}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Activo
                            </span>
                          </div>
                          <p className="text-[10px] text-[#94A3B8]">
                            Última modificación: {selectedContractor.excelFile.lastModifiedFormatted || 'Hoy'} por {selectedContractor.excelFile.lastModifiedBy || 'veniergn@gmail.com'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleDownloadXlsx}
                          className="px-3 py-1.5 rounded-xl bg-[#17263B] hover:bg-[#1E324A] text-slate-300 hover:text-white border border-[#29384C] text-[11px] font-bold flex items-center gap-1.5 transition-all"
                          title="Descargar copia del Excel a tu computadora"
                        >
                          <Download className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Descargar .xlsx</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveExcel}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                          title="Quitar archivo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>
                        Este contratista aún no tiene un archivo Excel subido. Puedes cargarlo ahora con el botón azul o presionar <strong>"Abrir y Modificar Planilla Excel"</strong> para comenzar con una planilla modelo preconfigurada.
                      </span>
                    </div>
                  )}
                </div>

                {/* HISTORIAL DE CERTIFICADOS / PDFS EMITIDOS */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Historial de Certificados y PDFs Emitidos</span>
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {(selectedContractor.pdfHistory || []).length} emitidos
                    </span>
                  </div>

                  {(selectedContractor.pdfHistory || []).length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#081321] border border-[#29384C] text-center text-xs text-slate-500">
                      Aún no se han emitido PDFs para este contratista. Al abrir la planilla y presionar "Generar / Guardar PDF", cada certificado quedará registrado aquí.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(selectedContractor.pdfHistory || []).map(snap => (
                        <div
                          key={snap.id}
                          className="p-3 rounded-2xl bg-[#081321] border border-[#29384C] flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-white truncate block">{snap.title}</span>
                              <span className="text-[10px] text-slate-400">
                                {snap.period || 'Quincena'} • {snap.generatedFormatted} por {snap.generatedBy}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenExcelEditor();
                              setTimeout(() => window.print(), 400);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-cyan-300 border border-cyan-500/30 font-bold text-[11px] flex items-center gap-1 shrink-0"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Reimprimir</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">Selecciona un contratista</h3>
              <p className="text-xs max-w-sm mx-auto">
                Elige un operario de la columna izquierda para cargar su archivo Excel o abrir su planilla de certificación.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISOR / EDITOR INTERACTIVO DE EXCEL (PANTALLA COMPLETA / MODAL) */}
      {/* ========================================================================= */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col animate-in fade-in duration-200">
          {/* Top Bar of Excel Editor */}
          <div className="bg-[#081321] border-b border-[#29384C] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isDirty) {
                    if (confirm('Tienes cambios sin guardar. ¿Deseas cerrar el visor de todas formas?')) {
                      setIsEditorOpen(false);
                    }
                  } else {
                    setIsEditorOpen(false);
                  }
                }}
                className="p-2 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] transition-all"
                title="Cerrar visor de Excel"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      {selectedContractor?.excelFile?.fileName || 'Planilla_Certificado.xlsx'}
                    </h3>
                    {isDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Modificaciones sin guardar
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Contratista: <span className="text-white font-bold">{selectedContractor?.name}</span> ({selectedContractor?.role}) • Obra: <span className="text-emerald-400 font-bold">{activeProject?.name}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS IN TOP BAR */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-3 py-2 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Agregar nueva fila al final"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Fila</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadXlsx}
                className="px-3 py-2 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Descargar archivo .xlsx modificado"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Descargar .xlsx</span>
              </button>

              <button
                type="button"
                onClick={handleExportAndSavePdf}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                title="Generar e imprimir el PDF formal con firmas"
              >
                <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Generar / Guardar PDF</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveExcelChanges}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50"
                title="Guardar modificaciones en la nube para la próxima quincena"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl bg-[#101D30] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#29384C] transition-all ml-1"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sheet tabs bar if multiple sheets exist */}
          {Object.keys(editableSheets).length > 1 && (
            <div className="bg-[#0b1626] border-b border-[#29384C] px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[10px] font-bold uppercase text-slate-500 px-1">Hojas:</span>
              {Object.keys(editableSheets).map(sheetName => (
                <button
                  key={sheetName}
                  onClick={() => setActiveSheetName(sheetName)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    activeSheetName === sheetName
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#101D30]'
                  }`}
                >
                  {sheetName}
                </button>
              ))}
            </div>
          )}

          {/* Excel Grid Viewer and In-Place Editor */}
          <div className="flex-1 overflow-auto bg-[#050C16] p-4 font-mono text-xs select-text">
            <div className="inline-block min-w-full bg-[#081321] rounded-2xl border border-[#29384C] shadow-2xl overflow-hidden">
              <table className="border-collapse w-full">
                {/* Column letters row */}
                <thead>
                  <tr className="bg-[#0b1626] border-b border-[#29384C]">
                    <th className="w-12 px-2 py-2 text-center text-[10px] font-black text-slate-500 border-r border-[#29384C] bg-[#081321] sticky left-0 z-10">
                      #
                    </th>
                    {Array.from({ length: maxCols }).map((_, colIdx) => (
                      <th
                        key={colIdx}
                        className="px-3 py-2 text-center text-[11px] font-bold text-slate-400 border-r border-[#29384C]/60 min-w-[130px]"
                      >
                        {getColumnLetter(colIdx)}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Rows and editable cells */}
                <tbody>
                  {currentSheetRows.map((row, rowIdx) => {
                    const isHeaderRow = rowIdx === 0 || rowIdx === 4;
                    const isTotalRow = String(row[1] || '').includes('TOTAL') || String(row[0] || '').includes('TOTAL');

                    return (
                      <tr
                        key={rowIdx}
                        className={`border-b border-[#29384C]/40 transition-colors ${
                          isHeaderRow
                            ? 'bg-[#101D30]/90 font-bold'
                            : isTotalRow
                            ? 'bg-emerald-950/25 font-bold'
                            : rowIdx % 2 === 0
                            ? 'bg-[#081321]/60'
                            : 'bg-[#0D1826]/60'
                        }`}
                      >
                        {/* Row number */}
                        <td className="w-12 px-2 py-1.5 text-center text-[10px] font-bold text-slate-500 border-r border-[#29384C] bg-[#0b1626] sticky left-0 z-10 select-none">
                          {rowIdx + 1}
                        </td>

                        {/* Cells */}
                        {Array.from({ length: maxCols }).map((_, colIdx) => {
                          const val = row[colIdx] !== null && row[colIdx] !== undefined ? String(row[colIdx]) : '';
                          const isNumeric = !isNaN(Number(val)) && val.trim() !== '';

                          return (
                            <td
                              key={colIdx}
                              className="border-r border-[#29384C]/40 p-0 hover:bg-emerald-500/10 focus-within:bg-cyan-500/15 focus-within:ring-1 focus-within:ring-cyan-400 transition-all"
                            >
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                className={`w-full h-full px-2.5 py-1.5 bg-transparent text-xs outline-none transition-colors ${
                                  isHeaderRow
                                    ? 'text-cyan-300 font-bold'
                                    : isTotalRow
                                    ? 'text-emerald-300 font-black'
                                    : isNumeric
                                    ? 'text-right text-emerald-200'
                                    : 'text-left text-slate-200'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick helper tip */}
            <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between px-2">
              <span>💡 Haz clic en cualquier celda para modificarla. Presiona "Guardar Cambios" para salvar el archivo y tenerlo listo la próxima quincena.</span>
              <span>Total de filas: {currentSheetRows.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: AGREGAR NUEVO CONTRATISTA */}
      {/* ========================================================================= */}
      {isNewContractorModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101D30] border border-[#29384C] w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#29384C] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Nuevo Contratista</h3>
              </div>
              <button
                onClick={() => setIsNewContractorModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContractor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  required
                  type="text"
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                  placeholder="Ej: Marcelo Fernández"
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Trabajo / Rubro que realiza *
                </label>
                <input
                  required
                  type="text"
                  value={newContractorRole}
                  onChange={(e) => setNewContractorRole(e.target.value)}
                  placeholder="Ej: Yesería, Pintura, Herrería, Albañilería"
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={newContractorPhone}
                    onChange={(e) => setNewContractorPhone(e.target.value)}
                    placeholder="Ej: +54 9 261 555-1234"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    DNI / CUIT
                  </label>
                  <input
                    type="text"
                    value={newContractorDni}
                    onChange={(e) => setNewContractorDni(e.target.value)}
                    placeholder="Ej: 20-33445566-9"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#29384C]">
                <button
                  type="button"
                  onClick={() => setIsNewContractorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#081321] text-slate-400 hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  Guardar Contratista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISTA DE IMPRESIÓN EXCLUSIVA (PRINT-ONLY) PARA GENERAR EL PDF FORMAL */}
      {/* ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999] overflow-visible">
        {/* MEMBRETE EJECUTIVO */}
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-black">
              CERTIFICADO DE AVANCE Y LIQUIDACIÓN DE CONTRATISTA
            </h1>
            <p className="text-xs text-gray-800 font-bold mt-1">
              OBRA: <span className="uppercase">{activeProject?.name}</span> ({activeProject?.location || 'Mendoza'})
            </p>
            <p className="text-xs text-gray-700">
              CONTRATISTA: <span className="font-bold text-black">{selectedContractor?.name}</span> • ESPECIALIDAD: <span className="font-bold text-black">{selectedContractor?.role}</span>
            </p>
            {selectedContractor?.dniCuit && (
              <p className="text-[11px] text-gray-600">DNI/CUIT: {selectedContractor.dniCuit}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-black">{directorName}</p>
            <p className="text-[11px] text-gray-700 font-semibold">Dirección Técnica de Obras</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
            </p>
            <p className="text-[10px] text-gray-500">
              Archivo Fuente: {selectedContractor?.excelFile?.fileName || 'Planilla_Excel.xlsx'}
            </p>
          </div>
        </div>

        {/* TABLA FORMAL DE CELDAS EXCEL */}
        <table className="w-full border-collapse border border-black text-[10px] my-3">
          <tbody>
            {currentSheetRows.map((row, rIdx) => {
              const isHeader = rIdx === 0 || rIdx === 4;
              const isTotal = String(row[1] || '').includes('TOTAL') || String(row[0] || '').includes('TOTAL');

              return (
                <tr
                  key={rIdx}
                  className={`${
                    isHeader
                      ? 'bg-gray-200 font-black'
                      : isTotal
                      ? 'bg-gray-100 font-black border-t-2 border-black'
                      : ''
                  }`}
                >
                  {row.slice(0, maxCols).map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="border border-gray-400 px-2 py-1 text-black"
                    >
                      {cell !== null && cell !== undefined ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* BLOQUE DE FIRMAS FORMALES */}
        <div className="mt-16 pt-6 flex justify-around items-end">
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="text-xs font-bold text-black">{selectedContractor?.name}</p>
            <p className="text-[10px] text-gray-600">Firma del Contratista / Operario</p>
          </div>
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="text-xs font-bold text-black">{directorName}</p>
            <p className="text-[10px] text-gray-600">Dirección Técnica y Certificaciones</p>
          </div>
        </div>

        {/* PIE DE PÁGINA */}
        <div className="mt-8 text-center text-[9px] text-gray-500 border-t border-gray-300 pt-2">
          Documento emitido y respaldado bajo el usuario veniergn@gmail.com • Control de Avance de Obras
        </div>
      </div>
    </div>
  );
}
