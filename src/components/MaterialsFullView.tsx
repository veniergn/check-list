import React, { useState, useMemo, useRef } from 'react';
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
  Check
} from 'lucide-react';
import { Project, MaterialOrder, MaterialOrderItem, MaterialOrderAttachment, MaterialOrderStatus } from '../types';

interface MaterialsFullViewProps {
  projects: Project[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onSaveOrder: (projectId: string, order: MaterialOrder) => void;
  onDeleteOrder: (projectId: string, orderId: string) => void;
  neonColor?: string;
  onShowToast?: (msg: string, icon?: string) => void;
}

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

export function MaterialsFullView({
  projects,
  activeProjectId,
  onSelectProject,
  onSaveOrder,
  onDeleteOrder,
  neonColor = '#00f2fe',
  onShowToast
}: MaterialsFullViewProps) {
  // Current active project
  const [selectedPid, setSelectedPid] = useState<string>(() => {
    return activeProjectId || projects[0]?.id || '';
  });

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedPid) || projects[0] || null;
  }, [projects, selectedPid]);

  // Filters
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
  const [modalProjectId, setModalProjectId] = useState<string>(selectedPid);
  const [orderTitle, setOrderTitle] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [supplier, setSupplier] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [inputMethod, setInputMethod] = useState<'manual' | 'whatsapp' | 'file'>('manual');
  
  // WhatsApp raw text
  const [whatsAppRawText, setWhatsAppRawText] = useState('');

  // Structured items
  const [items, setItems] = useState<MaterialOrderItem[]>([
    { id: 'item_1', name: '', quantity: '', unit: 'bolsas', notes: '' }
  ]);

  // Attachments
  const [attachments, setAttachments] = useState<MaterialOrderAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status for modal
  const [modalStatus, setModalStatus] = useState<MaterialOrderStatus>('pending');
  const [modalReceivedNotes, setModalReceivedNotes] = useState('');

  // Attachment Viewer Modal
  const [viewingAttachment, setViewingAttachment] = useState<MaterialOrderAttachment | null>(null);

  // Open Create Modal
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
      { id: `item_${Date.now()}_1`, name: '', quantity: '', unit: 'bolsas', notes: '' }
    ]);
    setAttachments([]);
    setModalStatus('pending');
    setModalReceivedNotes('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
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
      { id: `item_${Date.now()}_1`, name: '', quantity: '', unit: 'bolsas', notes: '' }
    ]);
    setAttachments(ord.attachments || []);
    setModalStatus(ord.status);
    setModalReceivedNotes(ord.receivedNotes || '');
    setIsModalOpen(true);
  };

  // Intelligent parser for WhatsApp text
  const handleParseWhatsApp = () => {
    if (!whatsAppRawText.trim()) {
      onShowToast?.('Pega primero el texto copiado de WhatsApp', 'AlertCircle');
      return;
    }

    const lines = whatsAppRawText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedItems: MaterialOrderItem[] = [];

    const unitRegex = /\b(bolsas?|m3|metros?\s*c[uú]bicos?|mts?|barras?|hierros?|unidades?|un|kilos?|kg|rollos?|cajas?|litros?|lts?|tiras?|pallets?|m2|baldes?)\b/i;

    lines.forEach((line, idx) => {
      // Ignore greetings or header lines
      if (/^(hola|buen|saludos|pedido|obra|gracias|atte|atte\.|buenas|estimado)/i.test(line)) {
        return;
      }
      // Remove leading bullets: -, *, •, 1., 1), etc.
      let clean = line.replace(/^[\*\-\•\d+\.\)\s]+/, '').trim();
      if (!clean) return;

      // Extract quantity from beginning
      let quantity = '';
      let unit = 'unidades';
      let name = clean;

      // Pattern: "50 bolsas de cemento" or "3 m3 arena" or "20 barras hierro 10" or "hierro del 10 x 20"
      const leadingNumMatch = clean.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z3]+)?\s*(?:de)?\s*(.*)$/i);
      
      if (leadingNumMatch) {
        quantity = leadingNumMatch[1].replace(',', '.');
        const possibleUnit = (leadingNumMatch[2] || '').toLowerCase();
        const remainder = leadingNumMatch[3] || '';

        if (unitRegex.test(possibleUnit)) {
          unit = possibleUnit;
          name = remainder.trim();
        } else if (unitRegex.test(remainder)) {
          // e.g. "50 de cemento bolsas"
          name = clean;
        } else {
          name = (possibleUnit + ' ' + remainder).trim();
        }
      } else {
        // Look for "x 50" at end
        const trailingNumMatch = clean.match(/^(.*?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z3]+)?$/);
        if (trailingNumMatch) {
          name = trailingNumMatch[1].trim();
          quantity = trailingNumMatch[2].replace(',', '.');
          if (trailingNumMatch[3]) unit = trailingNumMatch[3].toLowerCase();
        }
      }

      parsedItems.push({
        id: `item_wa_${Date.now()}_${idx}`,
        name: name || clean,
        quantity: quantity || '1',
        unit: unit || 'unidades',
        notes: ''
      });
    });

    if (parsedItems.length === 0) {
      onShowToast?.('No se pudieron extraer ítems automáticos. Se agregó como nota.', 'AlertCircle');
      setItems([{ id: `item_${Date.now()}`, name: whatsAppRawText, quantity: '1', unit: 'global' }]);
    } else {
      setItems(parsedItems);
      onShowToast?.(`¡${parsedItems.length} materiales procesados desde WhatsApp!`, 'Check');
    }
  };

  // Add Item row
  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: '', quantity: '', unit: 'unidades', notes: '' }
    ]);
  };

  // Remove Item row
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: `item_${Date.now()}`, name: '', quantity: '', unit: 'unidades' }]);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  // File Upload handler (Images / PDF)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const reader = new FileReader();

      reader.onload = (loadEvt) => {
        const resultStr = loadEvt.target?.result as string;
        if (!resultStr) return;

        const newAttachment: MaterialOrderAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          type: isPdf ? 'pdf' : 'image',
          url: resultStr,
          size: file.size
        };

        setAttachments(prev => [...prev, newAttachment]);
        onShowToast?.(`Archivo "${file.name}" adjuntado al pedido`, 'Check');
      };

      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  // Save Order
  const handleSaveOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(i => i.name.trim() !== '');
    if (validItems.length === 0 && attachments.length === 0 && !whatsAppRawText.trim()) {
      onShowToast?.('Por favor ingresa al menos un material o adjunta un archivo', 'AlertCircle');
      return;
    }

    const targetPid = modalProjectId || activeProject?.id;
    if (!targetPid) {
      onShowToast?.('Selecciona una obra', 'AlertCircle');
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    const dateStr = `${y}-${m}-${d}`;
    const timeStr = `${hh}:${mm}`;
    const createdAtFormatted = `${d}/${m}/${y}, ${timeStr} hs`;

    const existingOrd = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;

    const orderPayload: MaterialOrder = {
      id: editingOrderId || `matord_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId: targetPid,
      orderNumber: existingOrd?.orderNumber || (orders.length + 1),
      title: orderTitle.trim() || `Pedido #${orders.length + 1} - ${supplier || 'Materiales'}`,
      date: existingOrd?.date || dateStr,
      time: existingOrd?.time || timeStr,
      timestamp: existingOrd?.timestamp || now.toISOString(),
      createdAtFormatted: existingOrd?.createdAtFormatted || createdAtFormatted,
      requestedBy: requestedBy.trim() || undefined,
      supplier: supplier.trim() || undefined,
      items: validItems.length > 0 ? validItems : [
        { id: 'item_1', name: 'Materiales según comprobante adjunto', quantity: '1', unit: 'global' }
      ],
      rawWhatsAppText: whatsAppRawText.trim() || undefined,
      attachments,
      status: modalStatus,
      receivedNotes: modalStatus === 'received_incomplete' ? modalReceivedNotes.trim() : undefined,
      receivedAt: modalStatus.startsWith('received') ? (existingOrd?.receivedAt || now.toISOString()) : undefined,
      notes: generalNotes.trim() || undefined,
      updatedAt: now.toISOString(),
      updatedBy: 'veniergn@gmail.com'
    };

    onSaveOrder(targetPid, orderPayload);
    setIsModalOpen(false);
    onShowToast?.(
      editingOrderId ? '¡Pedido de materiales actualizado!' : '¡Pedido guardado y respaldado en Google Drive!',
      'Check'
    );
  };

  // Quick Reception Status Toggle on Card
  const handleQuickStatusChange = (order: MaterialOrder, newStatus: MaterialOrderStatus) => {
    if (newStatus === 'received_incomplete') {
      const missing = prompt('¿Qué materiales faltaron de este pedido?', order.receivedNotes || '');
      if (missing === null) return; // cancelled
      const updated: MaterialOrder = {
        ...order,
        status: 'received_incomplete',
        receivedNotes: missing.trim(),
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: 'veniergn@gmail.com'
      };
      onSaveOrder(order.projectId, updated);
      onShowToast?.('Pedido marcado como Incompleto con detalle de faltantes', 'AlertTriangle');
      return;
    }

    const updated: MaterialOrder = {
      ...order,
      status: newStatus,
      receivedNotes: newStatus === 'received_complete' ? undefined : order.receivedNotes,
      receivedAt: newStatus === 'received_complete' ? new Date().toISOString() : order.receivedAt,
      updatedAt: new Date().toISOString(),
      updatedBy: 'veniergn@gmail.com'
    };
    onSaveOrder(order.projectId, updated);
    onShowToast?.(
      newStatus === 'received_complete' ? '¡Pedido marcado como Llegó Completo!' : 'Estado actualizado',
      'Check'
    );
  };

  // Send WhatsApp to Suppliers
  const handleSendWhatsApp = (ord: MaterialOrder) => {
    const projName = activeProject?.name || 'Obra';
    const itemsList = ord.items.map((i, idx) => `${idx + 1}. ${i.quantity} ${i.unit || ''} - *${i.name}*${i.notes ? ` (${i.notes})` : ''}`).join('\n');
    
    let text = `📦 *PEDIDO DE MATERIALES - ${projName.toUpperCase()}*\n`;
    text += `📅 *Fecha:* ${ord.createdAtFormatted || ord.date}\n`;
    if (ord.supplier) text += `🏢 *Proveedor / Corralón:* ${ord.supplier}\n`;
    if (ord.requestedBy) text += `👤 *Solicitado por:* ${ord.requestedBy}\n`;
    text += `\n📋 *LISTADO DE MATERIALES:*\n${itemsList}\n`;
    if (ord.notes) text += `\n📝 *Instrucciones de descarga:* ${ord.notes}\n`;
    text += `\n🏗️ *Dirección de entrega:* ${activeProject?.location || 'A coordinar'}\n`;
    text += `_Sistema Control de Obras Arq. Venier Gastón (veniergn@gmail.com)_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Copy text to clipboard
  const handleCopyText = (ord: MaterialOrder) => {
    const projName = activeProject?.name || 'Obra';
    const itemsList = ord.items.map((i, idx) => `${idx + 1}. ${i.quantity} ${i.unit || ''} - ${i.name}${i.notes ? ` (${i.notes})` : ''}`).join('\n');
    let text = `PEDIDO DE MATERIALES - ${projName}\nFecha: ${ord.createdAtFormatted || ord.date}\n\n${itemsList}`;
    if (ord.notes) text += `\n\nNotas: ${ord.notes}`;

    navigator.clipboard.writeText(text);
    onShowToast?.('Listado copiado al portapapeles', 'Check');
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* 1. HEADER SECTION: Title, Project Selector, Quick Stats & New Order Button */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#29384C]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Gestión de Materiales
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  {orders.length} pedidos
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Pedidos por obra, recepción completa/incompleta y envío directo a corralones por WhatsApp
              </p>
            </div>
          </div>

          {/* Action: Agregar Material */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Agregar Material</span>
            </button>
          </div>
        </div>

        {/* PROJECT SELECTOR BAR - AISLAMIENTO ESTRICTO POR OBRA */}
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

          {/* Quick Stats Pills */}
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

        {/* SEARCH AND FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

      {/* 2. ORDERS LISTING (CARDS WITH COMPLETE ACTIONS) */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#081321] border border-[#29384C] flex items-center justify-center text-slate-500 mx-auto">
              <Boxes className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">No hay pedidos registrados en esta obra</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mx-auto mt-1">
                Haz clic en "+ Agregar Material" para cargar un listado manual, pegar un mensaje de WhatsApp o adjuntar una foto/PDF de remito.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Crear Primer Pedido</span>
            </button>
          </div>
        ) : (
          filteredOrders.map((ord, idx) => {
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
                    : 'border-[#29384C] hover:border-slate-500'
                }`}
              >
                {/* Header: Number, Date, Time, Status badge, Supplier */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#29384C]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs flex items-center justify-center border border-cyan-500/30">
                      #{ord.orderNumber || idx + 1}
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-white">
                      {ord.title || `Pedido de Materiales #${ord.orderNumber || idx + 1}`}
                    </h2>
                    {ord.supplier && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-500/40 text-blue-300">
                        Corralón: {ord.supplier}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-[11px] font-mono text-[#94A3B8] flex items-center gap-1.5 bg-[#081321] px-2.5 py-1 rounded-xl border border-[#29384C]">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      <span>{ord.createdAtFormatted || ord.date}</span>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                        isComplete
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isIncomplete
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      {isComplete ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Llegó Completo</span>
                        </>
                      ) : isIncomplete ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Llegó Incompleto</span>
                        </>
                      ) : (
                        <>
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          <span>En Camino / Pendiente</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Body: Items List (Table style) */}
                <div className="bg-[#081321] rounded-2xl border border-[#29384C] overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#17263B]/60 text-[10px] font-black uppercase text-[#94A3B8] border-b border-[#29384C]">
                    <div className="col-span-1">#</div>
                    <div className="col-span-6 sm:col-span-7">Material / Descripción</div>
                    <div className="col-span-3 sm:col-span-2 text-right">Cantidad</div>
                    <div className="col-span-2 text-right">Unidad</div>
                  </div>

                  <div className="divide-y divide-[#29384C]/50">
                    {ord.items.map((item, iIdx) => (
                      <div key={item.id || iIdx} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs items-center hover:bg-[#101D30]/40">
                        <div className="col-span-1 text-[#94A3B8] font-mono text-[11px]">{iIdx + 1}</div>
                        <div className="col-span-6 sm:col-span-7 font-bold text-white">
                          <span>{item.name}</span>
                          {item.notes && <span className="text-[10px] text-[#94A3B8] block font-normal">{item.notes}</span>}
                        </div>
                        <div className="col-span-3 sm:col-span-2 text-right font-mono font-black text-cyan-300">
                          {item.quantity}
                        </div>
                        <div className="col-span-2 text-right font-medium text-[#94A3B8]">
                          {item.unit || 'un'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* INCOMPLETE WARNING BOX (SI LLEGÓ INCOMPLETO) */}
                {isIncomplete && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-black uppercase tracking-wider text-amber-300">
                        Faltantes Registrados en Recepción:
                      </div>
                      <p className="text-xs text-amber-100 font-bold mt-0.5">
                        {ord.receivedNotes || 'Sin detalle de faltantes especificado.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ATTACHMENTS PREVIEW (FOTOS O PDFS DE REMITO) */}
                {ord.attachments && ord.attachments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-black uppercase text-[#94A3B8] flex items-center gap-1 mr-1">
                      <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                      Adjuntos ({ord.attachments.length}):
                    </span>
                    {ord.attachments.map(att => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setViewingAttachment(att)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#081321] hover:bg-[#17263B] border border-[#29384C] text-xs font-bold text-slate-200 transition-colors"
                      >
                        {att.type === 'pdf' ? (
                          <FileText className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="truncate max-w-[140px]">{att.name}</span>
                        <Eye className="w-3 h-3 text-cyan-400 ml-1" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Footer Notes if any */}
                {ord.notes && (
                  <div className="text-xs text-[#94A3B8] bg-[#081321]/50 p-2.5 rounded-xl border border-[#29384C]/60">
                    <strong className="text-slate-300">Observaciones:</strong> {ord.notes}
                  </div>
                )}

                {/* ACTIONS BAR: CONTROL DE RECEPCIÓN + WHATSAPP + EDITAR + BORRAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#29384C]">
                  {/* Control de Recepción Rápido */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase text-[#94A3B8] mr-1">
                      Recepción en Obra:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(ord, 'received_complete')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isComplete
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                      title="Marcar que todos los materiales llegaron a obra"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Llegó Completo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(ord, 'received_incomplete')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isIncomplete
                          ? 'bg-amber-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                      title="Marcar faltantes en este pedido"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Llegó Incompleto</span>
                    </button>
                  </div>

                  {/* WhatsApp and Management Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(ord)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                      title="Enviar detalle formateado por WhatsApp a corralón"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp Corralón</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyText(ord)}
                      className="p-1.5 rounded-xl bg-[#081321] hover:bg-[#17263B] text-slate-300 hover:text-white border border-[#29384C]"
                      title="Copiar texto del pedido"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(ord)}
                      className="p-1.5 rounded-xl bg-[#081321] hover:bg-[#17263B] text-cyan-400 hover:text-cyan-300 border border-[#29384C]"
                      title="Editar pedido"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('¿Eliminar este pedido de materiales?')) {
                          onDeleteOrder(ord.projectId, ord.id);
                        }
                      }}
                      className="p-1.5 rounded-xl bg-[#081321] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#29384C]"
                      title="Eliminar pedido"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. MODAL DE CREACIÓN / EDICIÓN DE PEDIDO DE MATERIALES */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingOrderId ? 'Modificar Pedido de Materiales' : 'Nuevo Pedido de Materiales'}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8]">
                    Asignación por obra con registro exacto de fecha y hora
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#081321] text-slate-400 hover:text-white flex items-center justify-center border border-[#29384C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderSubmit} className="space-y-4">
              {/* PASO 1: SELECCIÓN OBLIGATORIA DE OBRA */}
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

              {/* Título opcional, Corralón y Solicitante */}
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

              {/* PASO 2: MÉTODOS DE CARGA (TABS) */}
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
                      inputMethod === 'manual'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>1. Carga Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMethod('whatsapp')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      inputMethod === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-emerald-400/80 hover:text-emerald-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>2. Pegar WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMethod('file')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      inputMethod === 'file'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-purple-400/80 hover:text-purple-300'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>3. Foto / PDF</span>
                  </button>
                </div>
              </div>

              {/* 2A. TAB: PEGAR DESDE WHATSAPP */}
              {inputMethod === 'whatsapp' && (
                <div className="p-3.5 rounded-2xl bg-[#081321] border border-emerald-500/40 space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pegar mensaje copiado de WhatsApp</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleParseWhatsApp}
                      className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
                    >
                      <span>⚡ Procesar Listado</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={whatsAppRawText}
                    onChange={(e) => setWhatsAppRawText(e.target.value)}
                    placeholder="Pega aquí el mensaje de WhatsApp. Ej:&#10;- 50 bolsas cemento Loma Negra&#10;- 3 m3 arena fina&#10;- 20 barras hierro del 10&#10;- 2 rollos alambre de atar"
                    className="w-full bg-[#101D30] border border-[#29384C] focus:border-emerald-400 rounded-xl p-3 text-xs text-white placeholder-slate-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-[#94A3B8]">
                    Al presionar "Procesar Listado", el sistema detectará automáticamente cantidades, unidades y nombres de material y los cargará a la tabla editable.
                  </p>
                </div>
              )}

              {/* 2B. TAB: ADJUNTAR IMAGEN O PDF */}
              {inputMethod === 'file' && (
                <div className="p-3.5 rounded-2xl bg-[#081321] border border-purple-500/40 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-purple-400" />
                      <span>Adjuntar Foto de Remito o Archivo PDF</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Seleccionar Archivo</span>
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {attachments.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#29384C] hover:border-purple-400 rounded-2xl p-6 text-center cursor-pointer space-y-1 transition-colors"
                    >
                      <ImageIcon className="w-6 h-6 text-slate-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-300">Toca para subir foto o PDF del pedido</p>
                      <p className="text-[10px] text-slate-500">Imágenes de remitos en obra, fotos escritas a mano o PDFs</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {attachments.map(att => (
                        <div key={att.id} className="relative rounded-xl border border-[#29384C] bg-[#101D30] p-2 flex items-center gap-2 group">
                          {att.type === 'pdf' ? (
                            <FileText className="w-6 h-6 text-rose-400 shrink-0" />
                          ) : (
                            <img src={att.url} alt={att.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-white truncate">{att.name}</p>
                            <span className="text-[9px] uppercase text-cyan-400 font-mono">{att.type}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* LISTA ESTRUCTURADA DE ÍTEMS EDITABLES */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                    Listado de Materiales:
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Fila</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
                  {items.map((item, idx) => (
                    <div key={item.id} className="grid grid-cols-12 gap-1.5 items-center bg-[#081321] p-2 rounded-xl border border-[#29384C]">
                      <div className="col-span-1 text-center font-mono text-[11px] text-slate-500">
                        {idx + 1}
                      </div>

                      <div className="col-span-6 sm:col-span-6">
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                          }}
                          placeholder="Material (ej: Cemento Loma Negra)"
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-bold"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-2">
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                          }}
                          placeholder="Cant."
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-2 py-1.5 text-xs text-cyan-300 text-center font-bold outline-none font-mono"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-2">
                        <select
                          value={item.unit || 'unidades'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems(prev => prev.map(i => i.id === item.id ? { ...i, unit: val } : i));
                          }}
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-1.5 py-1.5 text-xs text-slate-300 outline-none"
                        >
                          {COMMON_UNITS.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-rose-400 text-sm font-bold p-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ESTADO DE RECEPCIÓN (SI SE ESTÁ EDITANDO O PRESELECCIONANDO) */}
              <div className="bg-[#081321] p-3 rounded-2xl border border-[#29384C] space-y-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-300">
                  Estado de Recepción del Pedido:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalStatus('pending')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      modalStatus === 'pending'
                        ? 'bg-blue-600 text-white border-blue-500 font-black'
                        : 'bg-[#101D30] text-slate-400 border-[#29384C]'
                    }`}
                  >
                    En Camino
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus('received_complete')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      modalStatus === 'received_complete'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-[#101D30] text-slate-400 border-[#29384C]'
                    }`}
                  >
                    Llegó Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatus('received_incomplete')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      modalStatus === 'received_incomplete'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-[#101D30] text-slate-400 border-[#29384C]'
                    }`}
                  >
                    Llegó Incompleto
                  </button>
                </div>

                {modalStatus === 'received_incomplete' && (
                  <div className="pt-2 animate-in fade-in duration-150">
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">
                      ¿Qué materiales faltaron del pedido? *
                    </label>
                    <input
                      type="text"
                      required
                      value={modalReceivedNotes}
                      onChange={(e) => setModalReceivedNotes(e.target.value)}
                      placeholder="Ej: Faltaron 10 bolsas de cemento y 2 rollos de alambre"
                      className="w-full bg-[#101D30] border border-amber-500/60 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-amber-100 font-bold outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Observaciones generales */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Instrucciones de descarga / Notas (opcional):
                </label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ej: Descargar en patio interno / llamar al capataz al llegar..."
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-cyan-400 rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between pt-3 border-t border-[#29384C]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#081321] hover:bg-[#17263B] text-slate-300 font-bold text-xs border border-[#29384C]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/30 active:scale-95 transition-all"
                >
                  {editingOrderId ? 'Guardar Cambios' : 'Emitir y Guardar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ATTACHMENT LIGHTBOX MODAL */}
      {viewingAttachment && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-[#101D30] border border-[#29384C] rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
              <div className="flex items-center gap-2">
                {viewingAttachment.type === 'pdf' ? (
                  <FileText className="w-5 h-5 text-rose-400" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-sm font-bold text-white truncate max-w-md">{viewingAttachment.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingAttachment.url}
                  download={viewingAttachment.name}
                  className="px-3 py-1 rounded-xl bg-[#081321] text-xs font-bold text-cyan-300 border border-[#29384C] hover:bg-[#17263B]"
                >
                  Descargar
                </a>
                <button
                  type="button"
                  onClick={() => setViewingAttachment(null)}
                  className="w-8 h-8 rounded-xl bg-[#081321] text-slate-400 hover:text-white flex items-center justify-center border border-[#29384C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-[#081321] rounded-2xl border border-[#29384C]">
              {viewingAttachment.type === 'pdf' ? (
                <iframe
                  src={viewingAttachment.url}
                  title={viewingAttachment.name}
                  className="w-full h-[600px] rounded-xl border-none"
                />
              ) : (
                <img
                  src={viewingAttachment.url}
                  alt={viewingAttachment.name}
                  className="max-h-[600px] max-w-full object-contain rounded-xl shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
