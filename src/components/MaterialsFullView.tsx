import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Boxes,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Copy,
  Trash2,
  Pencil,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  UploadCloud,
  X,
  ExternalLink,
  ChevronDown,
  Filter,
  PackageCheck,
  PackageX,
  Truck,
  MessageSquare,
  Sparkles,
  Paperclip,
  Eye,
  Check,
  Download,
  Printer,
  ArrowLeft
} from 'lucide-react';
import {
  Project,
  MaterialOrder,
  MaterialOrderItem,
  MaterialOrderAttachment,
  MaterialOrderStatus,
  ContractorExcelFile
} from '../types';

interface MaterialsFullViewProps {
  projects: Project[];
  selectedProjectId?: string | null;
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onSaveOrder: (param1: string | MaterialOrder, param2?: MaterialOrder) => void;
  onDeleteOrder: (arg1: string, arg2?: string) => void;
  onSaveProjectMaterialsExcel?: (projectId: string, excelFile: ContractorExcelFile) => void;
  neonColor?: string;
  directorName?: string;
  onShowToast?: (msg: string, icon?: string) => void;
}

// Generate column letters (A, B, C, ... Z, AA, AB...)
const getColumnLetter = (colIndex: number): string => {
  let letter = '';
  while (colIndex >= 0) {
    letter = String.fromCharCode((colIndex % 26) + 65) + letter;
    colIndex = Math.floor(colIndex / 26) - 1;
  }
  return letter;
};

// Common units in construction
const COMMON_UNITS = [
  'bolsas',
  'm3',
  'barras',
  'unidades',
  'kg',
  'rollos',
  'cajas',
  'litros',
  'tiras',
  'pallets',
  'm2',
  'metros'
];

// Create default base template for materials Excel if obra has no file yet
const createDefaultMaterialsTemplate = (obraName: string): { [sheetName: string]: (string | number | null)[][] } => {
  const dateStr = new Date().toLocaleDateString('es-AR');
  return {
    'Materiales': [
      ['CONTROL DE AVANCE DE OBRAS - PLANILLA DE CÓMPUTO Y PEDIDO DE MATERIALES', '', '', '', '', '', '', '', ''],
      ['Obra:', obraName, '', 'Fecha:', dateStr, '', 'Director Técnico:', 'Arq. Venier Gastón', 'veniergn@gmail.com'],
      ['', '', '', '', '', '', '', '', ''],
      ['N°', 'Rubro / Ubicación', 'Material / Insumo Solicitado', 'Cantidad', 'Unidad', 'Proveedor / Corralón', 'Fecha Pedido', 'Estado Recepción', 'Faltantes / Observaciones'],
      [1, 'Estructura / Hormigón', 'Cemento Loma Negra / Holcim', 150, 'bolsas', 'Corralón Central', dateStr, 'Llegó Completo', ''],
      [2, 'Estructura / Armaduras', 'Hierro ADN 420 Ø 10mm', 80, 'barras', 'Hierros Cuyanos', dateStr, 'Llegó Completo', ''],
      [3, 'Albañilería', 'Ladrillo cerámico hueco 12x18x33', 1200, 'unidades', 'Cerámica Mendoza', dateStr, 'Llegó Completo', ''],
      [4, 'Albañilería / Mezcla', 'Arena fina lavada', 12, 'm3', 'Áridos del Oeste', dateStr, 'Llegó Incompleto', 'Faltaron 4 m3 por entregar'],
      [5, 'Instalaciones sanitarias', 'Caños PVC cloacal 110mm', 25, 'tiras', 'Sanitarios Mendoza', dateStr, 'En Camino', ''],
      [6, 'Aislaciones', 'Membrana asfáltica 4mm con aluminio', 30, 'rollos', 'Impermeabilizaciones Cuyo', dateStr, 'En Camino', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['', 'RESUMEN DE ESTADO:', '', '', '', '', '', '', ''],
      ['', 'Total ítems pedidos:', 6, '', '', 'Completos: 3', '', 'Incompletos: 1', 'En Camino: 2']
    ]
  };
};

export function MaterialsFullView({
  projects,
  selectedProjectId,
  activeProjectId,
  onSelectProject,
  onSaveOrder,
  onDeleteOrder,
  onSaveProjectMaterialsExcel,
  neonColor = '#00f2fe',
  directorName = 'Arq. Venier Gastón',
  onShowToast
}: MaterialsFullViewProps) {
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

  // Hidden file input for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. EXCEL EDITOR / VIEWER STATE FOR MATERIALS
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editableSheets, setEditableSheets] = useState<{ [sheetName: string]: (string | number | null)[][] }>({});
  const [activeSheetName, setActiveSheetName] = useState<string>('Materiales');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 3. Filters for traditional orders
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MaterialOrderStatus>('all');

  // Orders for current project
  const orders = useMemo(() => {
    if (!activeProject) return [];
    return [...(activeProject.materialOrders || [])].sort((a, b) => {
      return (b.timestamp || b.date).localeCompare(a.timestamp || a.date);
    });
  }, [activeProject]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(ord => {
      if (statusFilter !== 'all' && ord.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (ord.title || '').toLowerCase().includes(q);
        const matchSupplier = (ord.supplier || '').toLowerCase().includes(q);
        const matchRequester = (ord.requestedBy || '').toLowerCase().includes(q);
        const matchItems = ord.items.some(i => i.name.toLowerCase().includes(q));
        if (!matchTitle && !matchSupplier && !matchRequester && !matchItems) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    let complete = 0;
    let incomplete = 0;
    let pending = 0;
    orders.forEach(o => {
      if (o.status === 'received_complete') complete++;
      else if (o.status === 'received_incomplete') incomplete++;
      else pending++;
    });
    return { total: orders.length, complete, incomplete, pending };
  }, [orders]);

  // Modal State for New / Edit Order
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [modalProjectId, setModalProjectId] = useState<string>('');
  const [orderTitle, setOrderTitle] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [supplier, setSupplier] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [inputMethod, setInputMethod] = useState<'manual' | 'whatsapp' | 'file'>('manual');
  const [whatsAppRawText, setWhatsAppRawText] = useState('');
  const [items, setItems] = useState<MaterialOrderItem[]>([
    { id: 'item_1', name: '', quantity: '', unit: 'bolsas', notes: '' }
  ]);
  const [attachments, setAttachments] = useState<MaterialOrderAttachment[]>([]);
  const [modalStatus, setModalStatus] = useState<MaterialOrderStatus>('pending');
  const [modalReceivedNotes, setModalReceivedNotes] = useState('');

  // Attachment Viewer Modal
  const [viewingAttachment, setViewingAttachment] = useState<MaterialOrderAttachment | null>(null);

  // -------------------------------------------------------------
  // REGISTRO DE NAVEGACIÓN INTERNA (VOLVER SIN SALIR DE LA SECCIÓN)
  // -------------------------------------------------------------
  useEffect(() => {
    (window as any).__customSectionBackHandler = () => {
      if (isEditorOpen) {
        if (isDirty) {
          if (confirm('Tienes cambios sin guardar en la planilla Excel. ¿Deseas volver a la lista de materiales?')) {
            setIsEditorOpen(false);
            return true;
          }
          return true;
        }
        setIsEditorOpen(false);
        return true; // Se cerró el editor dentro de la misma sección
      }
      if (isModalOpen) {
        setIsModalOpen(false);
        return true; // Se cerró el modal de carga dentro de la misma sección
      }
      if (viewingAttachment) {
        setViewingAttachment(null);
        return true;
      }
      return false; // Ya está en la raíz de Materiales -> permite volver a la hoja anterior (units)
    };

    return () => {
      delete (window as any).__customSectionBackHandler;
    };
  }, [isEditorOpen, isModalOpen, viewingAttachment, isDirty]);

  // -------------------------------------------------------------
  // BOTÓN 1: CARGAR ARCHIVO EXCEL DE MATERIALES
  // -------------------------------------------------------------
  const handleTriggerUpload = () => {
    if (!activeProject) {
      onShowToast?.('Selecciona una obra primero', 'AlertTriangle');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject) return;

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

      onSaveProjectMaterialsExcel?.(activeProject.id, excelFileRecord);
      onShowToast?.('Archivo Excel "' + file.name + '" cargado con éxito para ' + activeProject.name, 'Check');
    } catch (err) {
      console.error('Error al procesar archivo Excel:', err);
      onShowToast?.('Error al leer el archivo Excel. Verifica que sea .xlsx o .xls válido', 'AlertTriangle');
    } finally {
      e.target.value = '';
    }
  };

  // -------------------------------------------------------------
  // BOTÓN 2: ABRIR Y MODIFICAR PLANILLA EXCEL
  // -------------------------------------------------------------
  const handleOpenExcelEditor = () => {
    if (!activeProject) return;

    if (activeProject.materialsExcelFile && activeProject.materialsExcelFile.sheetsData) {
      // Load the exact Excel file the user uploaded
      setEditableSheets(JSON.parse(JSON.stringify(activeProject.materialsExcelFile.sheetsData)));
      setActiveSheetName(activeProject.materialsExcelFile.activeSheetName || Object.keys(activeProject.materialsExcelFile.sheetsData)[0] || 'Materiales');
      setIsDirty(false);
      setIsEditorOpen(true);
    } else {
      // Create clean base template and open directly
      const defaultTemplate = createDefaultMaterialsTemplate(activeProject.name);
      setEditableSheets(defaultTemplate);
      setActiveSheetName('Materiales');
      setIsDirty(true);
      setIsEditorOpen(true);
      onShowToast?.('Se abrió la planilla de materiales base para ' + activeProject.name + '. Puedes modificarla y guardarla.', 'Sparkles');
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
      const colCount = currentRows[0]?.length || 9;
      const newEmptyRow = new Array(colCount).fill('');
      return {
        ...prev,
        [activeSheetName]: [...currentRows, newEmptyRow]
      };
    });
    setIsDirty(true);
  };

  // -------------------------------------------------------------
  // GUARDAR CAMBIOS EN LA PLANILLA EXCEL
  // -------------------------------------------------------------
  const handleSaveExcelChanges = () => {
    if (!activeProject) return;

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

      const fileName = activeProject.materialsExcelFile?.fileName ||
        ('Materiales_' + activeProject.name.replace(/\s+/g, '_') + '.xlsx');

      const updatedExcel: ContractorExcelFile = {
        fileName,
        fileSize: Math.round(newBase64.length * 0.75),
        uploadedAt: activeProject.materialsExcelFile?.uploadedAt || now.toISOString(),
        lastModifiedAt: now.toISOString(),
        lastModifiedFormatted: formatted,
        lastModifiedBy: 'veniergn@gmail.com',
        base64Data: newBase64,
        sheetsData: editableSheets,
        activeSheetName
      };

      onSaveProjectMaterialsExcel?.(activeProject.id, updatedExcel);
      setIsDirty(false);
      onShowToast?.('✓ Planilla de materiales guardada exitosamente en la Nube.', 'Check');
    } catch (err) {
      console.error('Error al guardar Excel:', err);
      onShowToast?.('Error al guardar los cambios en la planilla Excel', 'AlertTriangle');
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // GENERAR / GUARDAR PDF CON MEMBRETE Y FIRMAS
  // -------------------------------------------------------------
  const handleExportAndSavePdf = () => {
    if (!activeProject) return;

    handleSaveExcelChanges();

    setTimeout(() => {
      window.print();
    }, 250);

    onShowToast?.('Generando PDF de materiales con membrete formal...', 'Printer');
  };

  // -------------------------------------------------------------
  // ENVIAR POR WHATSAPP A CORRALÓN DESDE LA PLANILLA EXCEL
  // -------------------------------------------------------------
  const handleSendExcelWhatsApp = () => {
    if (!activeProject) return;

    let text = '📦 *PEDIDO DE MATERIALES - ' + activeProject.name.toUpperCase() + '*\n';
    text += '📅 *Fecha:* ' + new Date().toLocaleDateString('es-AR') + '\n';
    text += '🏗️ *Obra:* ' + activeProject.name + ' (' + (activeProject.location || 'Mendoza') + ')\n';
    text += '👤 *Dirección Técnica:* ' + (directorName || 'Arq. Venier Gastón') + '\n\n';
    text += '📋 *LISTADO DE MATERIALES SOLICITADOS:*\n';

    const rows = editableSheets[activeSheetName] || [];
    rows.slice(4).forEach((r) => {
      const item = r[2] || r[1] || '';
      const qty = r[3] || '';
      const unit = r[4] || '';
      const notes = r[8] || '';
      if (String(item).trim() && !String(item).includes('RESUMEN')) {
        text += '• *' + item + '*: ' + qty + ' ' + unit + (notes ? ' (' + notes + ')' : '') + '\n';
      }
    });

    text += '\n_Emitido desde Control de Avance de Obras (veniergn@gmail.com)_';
    const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  };

  // -------------------------------------------------------------
  // DESCARGAR ARCHIVO .XLSX DIRECTO
  // -------------------------------------------------------------
  const handleDownloadXlsx = () => {
    if (!activeProject) return;

    const fileName = activeProject.materialsExcelFile?.fileName ||
      ('Materiales_' + activeProject.name.replace(/\s+/g, '_') + '.xlsx');

    if (activeProject.materialsExcelFile?.base64Data) {
      try {
        const binary = atob(activeProject.materialsExcelFile.base64Data);
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

  // Desvincular Excel
  const handleRemoveExcel = () => {
    if (!activeProject) return;
    if (confirm('¿Eliminar la planilla Excel asociada a "' + activeProject.name + '"?')) {
      onSaveProjectMaterialsExcel?.(activeProject.id, undefined as any);
      onShowToast?.('Planilla Excel desvinculada', 'Trash2');
    }
  };

  // -------------------------------------------------------------
  // FLUJO TRADICIONAL DE PEDIDOS (+ AGREGAR PEDIDO MANUAL / WHATSAPP / PDF)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setEditingOrderId(null);
    setModalProjectId(activeProject?.id || projects[0]?.id || '');
    setOrderTitle('');
    setRequestedBy(activeProject?.director || 'Director de Obra');
    setSupplier('');
    setGeneralNotes('');
    setInputMethod('manual');
    setWhatsAppRawText('');
    setItems([
      { id: 'item_' + Date.now() + '_1', name: '', quantity: '', unit: 'bolsas', notes: '' }
    ]);
    setAttachments([]);
    setModalStatus('pending');
    setModalReceivedNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ord: MaterialOrder) => {
    setEditingOrderId(ord.id);
    setModalProjectId(ord.projectId);
    setOrderTitle(ord.title || '');
    setRequestedBy(ord.requestedBy || '');
    setSupplier(ord.supplier || '');
    setGeneralNotes(ord.notes || '');
    setInputMethod(ord.rawWhatsAppText ? 'whatsapp' : 'manual');
    setWhatsAppRawText(ord.rawWhatsAppText || '');
    setItems(ord.items.length > 0 ? ord.items : [
      { id: 'item_' + Date.now() + '_1', name: '', quantity: '', unit: 'bolsas', notes: '' }
    ]);
    setAttachments(ord.attachments || []);
    setModalStatus(ord.status);
    setModalReceivedNotes(ord.receivedNotes || '');
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      { id: 'item_' + Date.now() + '_' + (prev.length + 1), name: '', quantity: '', unit: 'bolsas', notes: '' }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof MaterialOrderItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleParseWhatsApp = () => {
    if (!whatsAppRawText.trim()) return;
    const lines = whatsAppRawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: MaterialOrderItem[] = [];

    lines.forEach((line, idx) => {
      let clean = line.replace(/^[\*\-•\d\.\)\s]+/, '').trim();
      const match = clean.match(/^([\d\.,\/]+)\s*([a-zA-ZáéíóúÁÉÍÓÚ32]+)?\s*(?:de\s+)?(.*)$/i);
      if (match) {
        const qty = match[1];
        const unitCand = (match[2] || 'unidades').toLowerCase();
        const nameCand = match[3] || clean;
        const matchedUnit = COMMON_UNITS.find(u => unitCand.startsWith(u.slice(0, 3))) || 'unidades';
        parsed.push({
          id: 'item_wa_' + idx + '_' + Date.now(),
          name: nameCand.trim() || clean,
          quantity: qty,
          unit: matchedUnit,
          notes: ''
        });
      } else {
        parsed.push({
          id: 'item_wa_' + idx + '_' + Date.now(),
          name: clean,
          quantity: '1',
          unit: 'unidades',
          notes: ''
        });
      }
    });

    if (parsed.length > 0) {
      setItems(parsed);
      onShowToast?.('Se procesaron ' + parsed.length + ' ítems desde WhatsApp', 'Sparkles');
    }
  };

  const handleFileUploadOrderAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachments(prev => [
          ...prev,
          {
            id: 'att_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: file.name,
            type: isPdf ? 'pdf' : 'image',
            url: result,
            size: file.size
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSaveOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.name.trim().length > 0);
    if (validItems.length === 0 && attachments.length === 0) {
      onShowToast?.('Por favor ingresa al menos un material o adjunta un archivo', 'AlertTriangle');
      return;
    }

    const targetPid = modalProjectId || activeProject?.id || projects[0]?.id;
    if (!targetPid) return;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs';

    const orderPayload: MaterialOrder = {
      id: editingOrderId || ('order_' + Date.now()),
      projectId: targetPid,
      title: orderTitle.trim() || ('Pedido ' + (supplier ? 'a ' + supplier : 'de Materiales')),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      timestamp: now.toISOString(),
      createdAtFormatted: dateFormatted,
      requestedBy: requestedBy.trim() || 'Director de Obra',
      supplier: supplier.trim() || 'Corralón General',
      items: validItems,
      rawWhatsAppText: inputMethod === 'whatsapp' ? whatsAppRawText : undefined,
      attachments,
      status: modalStatus,
      receivedNotes: modalStatus === 'received_incomplete' ? modalReceivedNotes : undefined,
      notes: generalNotes.trim() || undefined,
      updatedAt: now.toISOString(),
      updatedBy: 'veniergn@gmail.com'
    };

    onSaveOrder(targetPid, orderPayload);
    setIsModalOpen(false);
    onShowToast?.('Pedido guardado correctamente', 'Check');
  };

  // WhatsApp share for traditional order
  const handleSendWhatsAppOrder = (order: MaterialOrder) => {
    const targetProject = projects.find(p => p.id === order.projectId) || activeProject;
    let text = '📦 *PEDIDO DE MATERIALES - ' + (targetProject ? targetProject.name.toUpperCase() : 'OBRA') + '*\n';
    text += '📅 *Fecha y Hora:* ' + order.createdAtFormatted + '\n';
    if (order.supplier) text += '🏢 *Corralón / Destinatario:* ' + order.supplier + '\n';
    if (order.requestedBy) text += '👤 *Solicitado por:* ' + order.requestedBy + '\n\n';
    text += '📋 *DETALLE DEL PEDIDO:*\n';
    order.items.forEach((item, idx) => {
      text += (idx + 1) + '. *' + item.name + '* — Cant: *' + item.quantity + '* ' + (item.unit || '') + (item.notes ? ' (' + item.notes + ')' : '') + '\n';
    });
    if (order.notes) text += '\n📝 *Observaciones:* ' + order.notes + '\n';
    text += '\n_Enviado desde Control de Avance de Obras (veniergn@gmail.com)_';
    const url = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  };

  // Current active sheet rows for editor
  const currentSheetRows = useMemo(() => {
    return editableSheets[activeSheetName] || [];
  }, [editableSheets, activeSheetName]);

  const maxCols = useMemo(() => {
    let max = 6;
    currentSheetRows.forEach(row => {
      if (row.length > max) max = row.length;
    });
    return Math.max(max, 9);
  }, [currentSheetRows]);

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Hidden File Input for Excel Upload */}
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Gestión de Materiales
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Planillas y Pedidos
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Cómputos y pedidos por obra con archivo Excel interactivo, carga por WhatsApp y remitos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] text-xs font-bold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>+ Nuevo Pedido Rápido</span>
            </button>
          </div>
        </div>

        {/* PROJECT SELECTOR BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081321]/80 p-3 rounded-2xl border border-[#29384C]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-black uppercase text-[#94A3B8] flex items-center gap-1.5 shrink-0 px-1">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              Obra Activa:
            </span>
            {projects.map(p => {
              const isSelected = p.id === activeProject?.id;
              const pCount = (p.materialOrders || []).length;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPid(p.id);
                    onSelectProject?.(p.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-[#101D30] border border-transparent'
                  }`}
                >
                  <span>🏗️ {p.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-[#17263B] text-slate-400'}`}>
                    {pCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 text-[11px] font-bold shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{stats.complete} Completos</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{stats.incomplete} Incompletos</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>{stats.pending} En Camino</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LOS DOS BOTONES PRINCIPALES: ARCHIVO EXCEL DE MATERIALES DE LA OBRA */}
        {/* ========================================================================= */}
        {activeProject && (
          <div className="bg-[#101D30] border border-cyan-500/40 p-5 rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#29384C] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-lg shrink-0">
                  📊
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Planilla Excel de Materiales: {activeProject.name}</span>
                    {activeProject.materialsExcelFile ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Archivo Activo
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pendiente de carga
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    Carga el archivo Excel preparado para esta obra y ábrelo para modificar cómputos, verificar llegadas y emitir el PDF.
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 block">Usuario Administrador</span>
                <span className="font-mono text-xs font-bold text-cyan-300">veniergn@gmail.com</span>
              </div>
            </div>

            {/* GRID DE LOS DOS BOTONES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BOTÓN 1: CARGAR ARCHIVO DE EXCEL */}
              <div className="bg-[#081321] border border-blue-500/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-blue-400 transition-all">
                <div>
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <UploadCloud className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Paso 1: Archivo de Cómputo</span>
                  </div>
                  <h4 className="text-sm font-black text-white">
                    {activeProject.materialsExcelFile ? 'Actualizar / Cambiar Excel' : 'Cargar Archivo de Excel'}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {activeProject.materialsExcelFile
                      ? ('Archivo cargado: "' + activeProject.materialsExcelFile.fileName + '"')
                      : 'Sube el archivo Excel (.xlsx / .xls) que preparaste para los materiales de ' + activeProject.name + '.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{activeProject.materialsExcelFile ? 'Cambiar Archivo Excel' : 'Cargar Archivo Excel (.xlsx)'}</span>
                </button>
              </div>

              {/* BOTÓN 2: ABRIR Y MODIFICAR PLANILLA DE EXCEL */}
              <div className="bg-[#081321] border border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-cyan-400 transition-all">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Paso 2: Gestión y Trabajo</span>
                  </div>
                  <h4 className="text-sm font-black text-white">
                    Abrir y Modificar Planilla de Excel
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Abre el archivo cargado para editar celdas en vivo, marcar llegadas, guardar cambios y generar el PDF.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenExcelEditor}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 active:scale-95 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                  <span>Abrir y Modificar Planilla de Excel</span>
                </button>
              </div>
            </div>

            {/* ESTADO DE LA PLANILLA EXCEL CARGADA */}
            {activeProject.materialsExcelFile && (
              <div className="p-3 rounded-2xl bg-[#081321]/90 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-emerald-400 font-bold">✓ Archivo en uso:</span>
                  <span className="font-bold text-white">{activeProject.materialsExcelFile.fileName}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    Última modificación: {activeProject.materialsExcelFile.lastModifiedFormatted || 'Hoy'} por {activeProject.materialsExcelFile.lastModifiedBy || 'veniergn@gmail.com'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadXlsx}
                    className="px-3 py-1.5 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] text-[11px] font-bold flex items-center gap-1.5 transition-all"
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
            )}
          </div>
        )}

        {/* SEARCH AND FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar material, corralón, responsable..."
              className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                statusFilter === 'all' ? 'bg-[#17263B] text-white border border-slate-600' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                statusFilter === 'pending' ? 'bg-blue-600/25 text-blue-300 border-blue-500' : 'text-blue-400/70 border-transparent hover:text-blue-300'
              }`}
            >
              En Camino
            </button>
            <button
              onClick={() => setStatusFilter('received_complete')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                statusFilter === 'received_complete' ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500' : 'text-emerald-400/70 border-transparent hover:text-emerald-300'
              }`}
            >
              Completos
            </button>
            <button
              onClick={() => setStatusFilter('received_incomplete')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                statusFilter === 'received_incomplete' ? 'bg-amber-500/25 text-amber-300 border-amber-500' : 'text-amber-400/70 border-transparent hover:text-amber-300'
              }`}
            >
              Incompletos (Faltantes)
            </button>
          </div>
        </div>
      </div>

      {/* 2. ORDERS LISTING (CARDS CON ACCIONES COMPLETAS) */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-[#081321] border border-[#29384C] flex items-center justify-center text-slate-500 mx-auto">
              <Boxes className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">No hay pedidos manuales registrados en {activeProject?.name}</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-1">
                Puedes trabajar directamente sobre la <strong>Planilla de Excel</strong> de la obra con los dos botones superiores, o crear un pedido individual mediante "+ Nuevo Pedido Rápido".
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleOpenExcelEditor}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                <span>Abrir Planilla Excel de la Obra</span>
              </button>
            </div>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const isComplete = ord.status === 'received_complete';
            const isIncomplete = ord.status === 'received_incomplete';

            return (
              <div
                key={ord.id}
                className={`bg-[#101D30] border rounded-3xl p-4 sm:p-5 shadow-xl transition-all space-y-4 ${
                  isComplete
                    ? 'border-emerald-500/40 bg-gradient-to-b from-[#101D30] to-emerald-950/10'
                    : isIncomplete
                    ? 'border-amber-500/50 bg-gradient-to-b from-[#101D30] to-amber-950/10'
                    : 'border-[#29384C] hover:border-cyan-500/40'
                }`}
              >
                {/* Header de la orden */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#29384C]/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isComplete
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isIncomplete
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      {isComplete ? <Check className="w-5 h-5" /> : isIncomplete ? <AlertTriangle className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white">{ord.title}</h3>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {ord.createdAtFormatted}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8]">
                        Proveedor: <span className="text-cyan-300 font-bold">{ord.supplier}</span> • Solicitado por: <span className="text-white font-medium">{ord.requestedBy}</span>
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleSendWhatsAppOrder(ord)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                      title="Enviar a corralón por WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(ord)}
                      className="p-1.5 rounded-xl bg-[#081321] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] transition-all"
                      title="Editar pedido"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar este pedido de materiales?')) {
                          onDeleteOrder(ord.projectId, ord.id);
                        }
                      }}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                      title="Eliminar pedido"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ítems listados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {ord.items.map((item, i) => (
                    <div
                      key={item.id || i}
                      className="bg-[#081321]/60 border border-[#29384C]/50 rounded-2xl p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{item.name}</span>
                        {item.notes && <span className="text-[10px] text-slate-400 block truncate">{item.notes}</span>}
                      </div>
                      <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-lg border border-cyan-800/40 shrink-0">
                        {item.quantity} {item.unit || ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Si faltó algo */}
                {isIncomplete && ord.receivedNotes && (
                  <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[10px] block text-amber-400">Detalle de lo que faltó:</span>
                      <p>{ord.receivedNotes}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. VISOR / EDITOR INTERACTIVO DE EXCEL DE MATERIALES (PANTALLA COMPLETA) */}
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
                    if (confirm('Tienes cambios sin guardar. ¿Deseas volver a la lista de materiales?')) {
                      setIsEditorOpen(false);
                    }
                  } else {
                    setIsEditorOpen(false);
                  }
                }}
                className="p-2 rounded-xl bg-[#101D30] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C] transition-all"
                title="Volver a la vista de materiales de la obra"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white">
                      {activeProject?.materialsExcelFile?.fileName || 'Planilla_Materiales.xlsx'}
                    </h3>
                    {isDirty && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Modificaciones sin guardar
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Obra: <span className="text-cyan-300 font-bold">{activeProject?.name}</span> • Director Técnico: <span className="text-white font-bold">{directorName}</span>
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
                title="Agregar nueva fila de material"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Fila</span>
              </button>

              <button
                type="button"
                onClick={handleSendExcelWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                title="Enviar listado por WhatsApp a corralón"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar WhatsApp</span>
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
                title="Generar e imprimir PDF formal de materiales"
              >
                <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Generar PDF</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveExcelChanges}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-50"
                title="Guardar modificaciones de la planilla en la nube"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl bg-[#101D30] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#29384C] transition-all ml-1"
                title="Cerrar visor"
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
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
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

                <tbody>
                  {currentSheetRows.map((row, rowIdx) => {
                    const isHeaderRow = rowIdx === 0 || rowIdx === 3;
                    const isTotalRow = String(row[1] || '').includes('RESUMEN') || String(row[0] || '').includes('RESUMEN');

                    return (
                      <tr
                        key={rowIdx}
                        className={`border-b border-[#29384C]/40 transition-colors ${
                          isHeaderRow
                            ? 'bg-[#101D30]/90 font-bold'
                            : isTotalRow
                            ? 'bg-cyan-950/25 font-bold'
                            : rowIdx % 2 === 0
                            ? 'bg-[#081321]/60'
                            : 'bg-[#0D1826]/60'
                        }`}
                      >
                        <td className="w-12 px-2 py-1.5 text-center text-[10px] font-bold text-slate-500 border-r border-[#29384C] bg-[#0b1626] sticky left-0 z-10 select-none">
                          {rowIdx + 1}
                        </td>

                        {Array.from({ length: maxCols }).map((_, colIdx) => {
                          const val = row[colIdx] !== null && row[colIdx] !== undefined ? String(row[colIdx]) : '';
                          const isNumeric = !isNaN(Number(val)) && val.trim() !== '';

                          return (
                            <td
                              key={colIdx}
                              className="border-r border-[#29384C]/40 p-0 hover:bg-cyan-500/10 focus-within:bg-blue-500/15 focus-within:ring-1 focus-within:ring-cyan-400 transition-all"
                            >
                              <input
                                type="text"
                                value={val}
                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                className={`w-full h-full px-2.5 py-1.5 bg-transparent text-xs outline-none transition-colors ${
                                  isHeaderRow
                                    ? 'text-cyan-300 font-bold'
                                    : isTotalRow
                                    ? 'text-cyan-200 font-black'
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

            <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between px-2">
              <span>💡 Haz clic en cualquier celda para modificarla. Presiona "Guardar Cambios" para salvar el archivo en la obra.</span>
              <span>Total de filas: {currentSheetRows.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: NUEVO / EDITAR PEDIDO INDIVIDUAL */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#101D30] border border-[#29384C] w-full max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#29384C] pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">
                  {editingOrderId ? 'Editar Pedido de Materiales' : 'Nuevo Pedido de Materiales'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderSubmit} className="space-y-4">
              {/* Obra Destino */}
              <div className="bg-[#081321] p-3 rounded-2xl border border-[#29384C] space-y-1">
                <label className="block text-[11px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Obra Destino (Aislamiento Obligatorio) *</span>
                </label>
                <select
                  required
                  value={modalProjectId}
                  onChange={(e) => setModalProjectId(e.target.value)}
                  className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>🏗️ {p.name} - {p.location || 'Mendoza'}</option>
                  ))}
                </select>
              </div>

              {/* Proveedor y Solicitante */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Corralón / Proveedor:
                  </label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    placeholder="Ej: Corralón Godoy Cruz / Hierros Cuyanos"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Solicitado por:
                  </label>
                  <input
                    type="text"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    placeholder="Ej: Capataz / Arq. Venier Gastón"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Métodos de Carga */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Método de Carga del Listado:
                  </label>
                  <span className="text-[10px] text-cyan-400 font-bold">
                    {items.filter(i => i.name.trim()).length} ítems en lista
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#081321] p-1 rounded-2xl border border-[#29384C]">
                  <button
                    type="button"
                    onClick={() => setInputMethod('manual')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      inputMethod === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>1. Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMethod('whatsapp')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      inputMethod === 'whatsapp' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400/80 hover:text-emerald-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>2. WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMethod('file')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      inputMethod === 'file' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-400/80 hover:text-purple-300'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>3. Remito / PDF</span>
                  </button>
                </div>
              </div>

              {/* Pestaña WhatsApp */}
              {inputMethod === 'whatsapp' && (
                <div className="p-3.5 rounded-2xl bg-[#081321] border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pegar mensaje copiado de WhatsApp</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleParseWhatsApp}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                    >
                      Procesar Lista
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={whatsAppRawText}
                    onChange={(e) => setWhatsAppRawText(e.target.value)}
                    placeholder="Pega aquí el texto de WhatsApp..."
                    className="w-full bg-[#101D30] border border-[#29384C] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none"
                  />
                </div>
              )}

              {/* Pestaña Archivos / Remito */}
              {inputMethod === 'file' && (
                <div className="p-3.5 rounded-2xl bg-[#081321] border border-purple-500/40 space-y-2.5">
                  <label className="block text-xs font-bold text-purple-300">
                    Adjuntar Foto del Remito o Archivo PDF:
                  </label>
                  <input
                    type="file"
                    accept="image/*, application/pdf"
                    multiple
                    onChange={handleFileUploadOrderAttachment}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500"
                  />
                </div>
              )}

              {/* Lista de ítems interactiva */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Ítems de Materiales:</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Renglón</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2 bg-[#081321] p-2 rounded-xl border border-[#29384C]">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleItemChange(it.id, 'name', e.target.value)}
                        placeholder="Descripción del material..."
                        className="flex-1 bg-transparent text-xs text-white outline-none"
                      />
                      <input
                        type="text"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(it.id, 'quantity', e.target.value)}
                        placeholder="Cant."
                        className="w-16 bg-[#101D30] border border-[#29384C] rounded-lg px-2 py-1 text-xs text-center text-white outline-none font-mono"
                      />
                      <select
                        value={it.unit || 'bolsas'}
                        onChange={(e) => handleItemChange(it.id, 'unit', e.target.value)}
                        className="bg-[#101D30] border border-[#29384C] rounded-lg px-2 py-1 text-xs text-slate-300 outline-none"
                      >
                        {COMMON_UNITS.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(it.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado de Recepción */}
              <div className="bg-[#081321] p-3 rounded-2xl border border-[#29384C] space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Control de Recepción en Obra:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalStatus('pending')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      modalStatus === 'pending' ? 'bg-blue-600 text-white border-blue-400' : 'text-slate-400 border-[#29384C]'
                    }`}
                  >
                    En Camino
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus('received_complete')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      modalStatus === 'received_complete' ? 'bg-emerald-600 text-white border-emerald-400' : 'text-slate-400 border-[#29384C]'
                    }`}
                  >
                    Llegó Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus('received_incomplete')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      modalStatus === 'received_incomplete' ? 'bg-amber-600 text-white border-amber-400' : 'text-slate-400 border-[#29384C]'
                    }`}
                  >
                    Llegó Incompleto
                  </button>
                </div>

                {modalStatus === 'received_incomplete' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      ¿Qué faltó del pedido? (Detalle obligatorio):
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={modalReceivedNotes}
                      onChange={(e) => setModalReceivedNotes(e.target.value)}
                      placeholder="Ej: Faltaron 4 bolsas de cemento y las barras de hierro del 10..."
                      className="w-full bg-[#101D30] border border-amber-500/50 rounded-xl p-2 text-xs text-white placeholder-slate-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#29384C]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#081321] text-slate-400 hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  Guardar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISTA DE IMPRESIÓN (PRINT-ONLY) DE LA PLANILLA DE MATERIALES */}
      {/* ========================================================================= */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999] overflow-visible">
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-black">
              PLANILLA DE CÓMPUTO Y PEDIDO DE MATERIALES
            </h1>
            <p className="text-xs text-gray-800 font-bold mt-1">
              OBRA: <span className="uppercase">{activeProject?.name}</span> ({activeProject?.location || 'Mendoza'})
            </p>
            <p className="text-xs text-gray-700">
              DIRECCIÓN TÉCNICA: <span className="font-bold text-black">{directorName}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-black">CONTROL DE AVANCE DE OBRAS</p>
            <p className="text-[10px] text-gray-500 mt-1">
              Fecha de Emisión: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
            </p>
            <p className="text-[10px] text-gray-500">
              Archivo: {activeProject?.materialsExcelFile?.fileName || 'Planilla_Materiales.xlsx'}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[10px] my-3">
          <tbody>
            {currentSheetRows.map((row, rIdx) => {
              const isHeader = rIdx === 0 || rIdx === 3;
              const isTotal = String(row[1] || '').includes('RESUMEN') || String(row[0] || '').includes('RESUMEN');

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
                    <td key={cIdx} className="border border-gray-400 px-2 py-1 text-black">
                      {cell !== null && cell !== undefined ? String(cell) : ''}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-16 pt-6 flex justify-around items-end">
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="text-xs font-bold text-black">Firma de Recepción en Obra</p>
            <p className="text-[10px] text-gray-600">Capataz / Encargado</p>
          </div>
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="text-xs font-bold text-black">{directorName}</p>
            <p className="text-[10px] text-gray-600">Dirección Técnica y Cómputos</p>
          </div>
        </div>

        <div className="mt-8 text-center text-[9px] text-gray-500 border-t border-gray-300 pt-2">
          Documento emitido y respaldado bajo el usuario veniergn@gmail.com • Control de Avance de Obras
        </div>
      </div>
    </div>
  );
}
