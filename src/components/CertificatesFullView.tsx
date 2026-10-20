import React, { useState, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Printer,
  FileDown,
  Trash2,
  Pencil,
  FileText,
  User,
  Users,
  DollarSign,
  Briefcase,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  Award,
  Percent,
  Copy,
  Receipt,
  RotateCcw
} from 'lucide-react';
import { Project, ContractorCertificate, ContractorPaymentItem, ContractorProfile } from '../types';
import { DEFAULT_CONTRACTORS, getProjectContractors } from '../utils/pmContractors';

interface CertificatesFullViewProps {
  projects: Project[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onSaveCertificate: (projectId: string, certificate: ContractorCertificate) => void;
  onDeleteCertificate: (projectId: string, certificateId: string) => void;
  onSaveContractors?: (projectId: string, contractors: ContractorProfile[]) => void;
  neonColor?: string;
  onShowToast?: (msg: string, icon?: string) => void;
}

// Format currency ARS
const formatARS = (amount: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

// Generate standard Quincena periods for the current year
const generateDefaultPeriods = () => {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const year = new Date().getFullYear();
  const periods: string[] = [];

  // Generate for current and surrounding months
  for (let m = 0; m < 12; m++) {
    periods.push(`1ra Quincena ${months[m]} ${year}`);
    periods.push(`2da Quincena ${months[m]} ${year}`);
  }
  return periods;
};

const DEFAULT_PERIODS = generateDefaultPeriods();

export function CertificatesFullView({
  projects,
  activeProjectId,
  onSelectProject,
  onSaveCertificate,
  onDeleteCertificate,
  onSaveContractors,
  neonColor = '#00f2fe',
  onShowToast
}: CertificatesFullViewProps) {
  // Current active project
  const [selectedPid, setSelectedPid] = useState<string>(() => {
    return activeProjectId || projects[0]?.id || '';
  });

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedPid) || projects[0] || null;
  }, [projects, selectedPid]);

  // Contractors for current project
  const contractors = useMemo(() => {
    if (!activeProject) return DEFAULT_CONTRACTORS;
    return getProjectContractors(activeProject);
  }, [activeProject]);

  // Selected contractor state
  const [selectedContractorId, setSelectedContractorId] = useState<string>(() => {
    return contractors[0]?.id || '';
  });

  const selectedContractor = useMemo(() => {
    return contractors.find(c => c.id === selectedContractorId) || contractors[0] || null;
  }, [contractors, selectedContractorId]);

  // Search contractor
  const [contractorSearch, setContractorSearch] = useState('');

  const filteredContractors = useMemo(() => {
    return contractors.filter(c => {
      if (!contractorSearch.trim()) return true;
      const q = contractorSearch.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q);
    });
  }, [contractors, contractorSearch]);

  // Current selected Quincena
  const currentMonthIdx = new Date().getMonth();
  const currentDay = new Date().getDate();
  const defaultPeriodStr = `${currentDay <= 15 ? '1ra' : '2da'} Quincena ${DEFAULT_PERIODS[currentMonthIdx * 2].split(' ')[2]} ${new Date().getFullYear()}`;
  const [selectedPeriod, setSelectedPeriod] = useState<string>(defaultPeriodStr);

  // Certificates list for this project
  const projectCertificates = useMemo(() => {
    if (!activeProject) return [];
    return [...(activeProject.contractorCertificates || [])].sort((a, b) => {
      return (b.lastModifiedAt || '').localeCompare(a.lastModifiedAt || '');
    });
  }, [activeProject]);

  // Historical certificates for currently selected contractor
  const contractorHistoryCertificates = useMemo(() => {
    if (!selectedContractor) return [];
    return projectCertificates.filter(cert => cert.contractorId === selectedContractor.id);
  }, [projectCertificates, selectedContractor]);

  // Current loaded / active certificate being edited in Excel sheet
  const activeExistingCert = useMemo(() => {
    if (!selectedContractor) return null;
    return contractorHistoryCertificates.find(c => c.period === selectedPeriod) || null;
  }, [contractorHistoryCertificates, selectedPeriod]);

  // Planilla interactive items
  const [items, setItems] = useState<ContractorPaymentItem[]>([
    {
      id: 'item_1',
      taskDescription: 'Revoque grueso y fino en departamentos',
      unit: 'm2',
      contractedQuantity: 100,
      unitPrice: 12000,
      previousProgressPercent: 30,
      currentProgressPercent: 60
    }
  ]);

  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [retentionPercent, setRetentionPercent] = useState<number>(0);
  const [certNotes, setCertNotes] = useState<string>('');
  const [certStatus, setCertStatus] = useState<'draft' | 'approved' | 'paid'>('draft');

  // Modal State for Adding / Editing Contractor Profile
  const [isContractorModalOpen, setIsContractorModalOpen] = useState(false);
  const [editingContractorId, setEditingContractorId] = useState<string | null>(null);
  const [contractorNameInput, setContractorNameInput] = useState('');
  const [contractorRoleInput, setContractorRoleInput] = useState('');
  const [contractorPhoneInput, setContractorPhoneInput] = useState('');
  const [contractorDniInput, setContractorDniInput] = useState('');

  // Sync state when activeExistingCert changes or period changes
  const lastLoadedKeyRef = useRef<string>('');
  const currentKey = `${selectedPid}_${selectedContractor?.id}_${selectedPeriod}_${activeExistingCert?.id || 'new'}`;

  if (lastLoadedKeyRef.current !== currentKey) {
    lastLoadedKeyRef.current = currentKey;
    if (activeExistingCert) {
      setItems(activeExistingCert.items.length > 0 ? activeExistingCert.items : [
        {
          id: `item_${Date.now()}`,
          taskDescription: `Trabajos generales de ${selectedContractor?.role || 'obra'}`,
          unit: 'gl',
          contractedQuantity: 1,
          unitPrice: 0,
          previousProgressPercent: 0,
          currentProgressPercent: 0
        }
      ]);
      setAdvancePayment(activeExistingCert.advancePayment || 0);
      setRetentionPercent(activeExistingCert.retentionPercent || 0);
      setCertNotes(activeExistingCert.notes || '');
      setCertStatus(activeExistingCert.status || 'draft');
    } else {
      // Default blank template for new period
      setItems([
        {
          id: `item_${Date.now()}_1`,
          taskDescription: `Tareas de ${selectedContractor?.role || 'obra'}`,
          unit: 'm2',
          contractedQuantity: 50,
          unitPrice: 15000,
          previousProgressPercent: 0,
          currentProgressPercent: 50
        }
      ]);
      setAdvancePayment(0);
      setRetentionPercent(0);
      setCertNotes('');
      setCertStatus('draft');
    }
  }

  // Row item updater
  const handleUpdateItem = (id: string, field: keyof ContractorPaymentItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    }));
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        taskDescription: '',
        unit: 'm2',
        contractedQuantity: 0,
        unitPrice: 0,
        previousProgressPercent: 0,
        currentProgressPercent: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{
        id: `item_${Date.now()}`,
        taskDescription: '',
        unit: 'un',
        contractedQuantity: 0,
        unitPrice: 0,
        previousProgressPercent: 0,
        currentProgressPercent: 0
      }]);
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleResetSheet = () => {
    if (confirm('¿Deseas reiniciar la planilla a valores en blanco?')) {
      setItems([
        {
          id: `item_${Date.now()}`,
          taskDescription: '',
          unit: 'un',
          contractedQuantity: 0,
          unitPrice: 0,
          previousProgressPercent: 0,
          currentProgressPercent: 0
        }
      ]);
      setAdvancePayment(0);
      setRetentionPercent(0);
      setCertNotes('');
      onShowToast?.('Planilla reiniciada', 'RotateCcw');
    }
  };

  // Calculations for current interactive sheet
  const sheetCalculations = useMemo(() => {
    let subtotalPeriod = 0;
    const computedRows = items.map(row => {
      const prev = Math.max(0, Math.min(100, Number(row.previousProgressPercent) || 0));
      const curr = Math.max(0, Math.min(100, Number(row.currentProgressPercent) || 0));
      const periodPercent = Math.max(0, curr - prev);
      const totalContractedAmount = (Number(row.contractedQuantity) || 0) * (Number(row.unitPrice) || 0);
      const periodAmount = totalContractedAmount * (periodPercent / 100);
      subtotalPeriod += periodAmount;

      return {
        ...row,
        prev,
        curr,
        periodPercent,
        periodAmount,
        totalContractedAmount
      };
    });

    const retentionAmount = subtotalPeriod * ((Number(retentionPercent) || 0) / 100);
    const totalDeductions = (Number(advancePayment) || 0) + retentionAmount;
    const totalPayable = Math.max(0, subtotalPeriod - totalDeductions);

    return {
      computedRows,
      subtotalPeriod,
      retentionAmount,
      totalDeductions,
      totalPayable
    };
  }, [items, advancePayment, retentionPercent]);

  // Save Certificate Handler
  const handleSaveCertificateSubmit = () => {
    if (!activeProject || !selectedContractor) {
      onShowToast?.('Selecciona una obra y un contratista', 'AlertCircle');
      return;
    }

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const formattedTimestamp = `${d}/${m}/${y}, ${hh}:${mm} hs`;

    const certificatePayload: ContractorCertificate = {
      id: activeExistingCert?.id || `cert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      projectId: activeProject.id,
      contractorId: selectedContractor.id,
      contractorName: selectedContractor.name,
      contractorRole: selectedContractor.role,
      contractorDniCuit: selectedContractor.dniCuit,
      contractorPhone: selectedContractor.phone,
      period: selectedPeriod,
      items: items.map(i => ({
        id: i.id,
        taskDescription: i.taskDescription.trim() || 'Tarea certificada',
        unit: i.unit || 'un',
        contractedQuantity: Number(i.contractedQuantity) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        previousProgressPercent: Number(i.previousProgressPercent) || 0,
        currentProgressPercent: Number(i.currentProgressPercent) || 0
      })),
      advancePayment: Number(advancePayment) || 0,
      retentionPercent: Number(retentionPercent) || 0,
      notes: certNotes.trim() || undefined,
      subtotalPeriod: sheetCalculations.subtotalPeriod,
      totalPayable: sheetCalculations.totalPayable,
      status: certStatus,
      lastModifiedAt: now.toISOString(),
      lastModifiedFormatted: formattedTimestamp,
      lastModifiedBy: 'veniergn@gmail.com'
    };

    onSaveCertificate(activeProject.id, certificatePayload);
    onShowToast?.(`¡Certificado de ${selectedContractor.name} guardado con éxito!`, 'Check');
  };

  // Open Contractor Modal (Create or Edit)
  const handleOpenAddContractor = () => {
    setEditingContractorId(null);
    setContractorNameInput('');
    setContractorRoleInput('');
    setContractorPhoneInput('');
    setContractorDniInput('');
    setIsContractorModalOpen(true);
  };

  const handleOpenEditContractor = (c: ContractorProfile) => {
    setEditingContractorId(c.id);
    setContractorNameInput(c.name);
    setContractorRoleInput(c.role);
    setContractorPhoneInput(c.phone || '');
    setContractorDniInput(c.dniCuit || '');
    setIsContractorModalOpen(true);
  };

  const handleSaveContractorProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorNameInput.trim()) {
      onShowToast?.('Ingresa el nombre del contratista', 'AlertCircle');
      return;
    }
    if (!activeProject) return;

    const colors = ['#00f2fe', '#38ef7d', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    let updatedList: ContractorProfile[];
    if (editingContractorId) {
      updatedList = contractors.map(c => {
        if (c.id !== editingContractorId) return c;
        return {
          ...c,
          name: contractorNameInput.trim(),
          role: contractorRoleInput.trim() || 'Contratista',
          phone: contractorPhoneInput.trim() || undefined,
          dniCuit: contractorDniInput.trim() || undefined,
          initials: contractorNameInput.trim().slice(0, 2).toUpperCase()
        };
      });
    } else {
      const newContractor: ContractorProfile = {
        id: `cont_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: contractorNameInput.trim(),
        role: contractorRoleInput.trim() || 'Contratista',
        phone: contractorPhoneInput.trim() || undefined,
        dniCuit: contractorDniInput.trim() || undefined,
        color: randomColor,
        initials: contractorNameInput.trim().slice(0, 2).toUpperCase()
      };
      updatedList = [...contractors, newContractor];
      setSelectedContractorId(newContractor.id);
    }

    onSaveContractors?.(activeProject.id, updatedList);
    setIsContractorModalOpen(false);
    onShowToast?.('Contratista guardado correctamente', 'Check');
  };

  const handleDeleteContractor = (cId: string, cName: string) => {
    if (!activeProject) return;
    if (confirm(`¿Eliminar al contratista "${cName}" de esta obra?`)) {
      const updatedList = contractors.filter(c => c.id !== cId);
      onSaveContractors?.(activeProject.id, updatedList);
      if (selectedContractorId === cId) {
        setSelectedContractorId(updatedList[0]?.id || '');
      }
      onShowToast?.('Contratista eliminado', 'Trash2');
    }
  };

  // WhatsApp share to contractor
  const handleSendContractorWhatsApp = () => {
    if (!selectedContractor || !activeProject) return;

    let text = `💵 *CERTIFICADO DE PAGO QUINCENAL - ${activeProject.name.toUpperCase()}*\n`;
    text += `👤 *Contratista:* ${selectedContractor.name} (${selectedContractor.role})\n`;
    text += `📅 *Período:* ${selectedPeriod}\n\n`;
    text += `📋 *DESGLOSE DE TRABAJOS CERTIFICADOS:*\n`;

    sheetCalculations.computedRows.forEach((r, idx) => {
      text += `${idx + 1}. ${r.taskDescription}\n   Avance quincena: ${r.periodPercent}% → ${formatARS(r.periodAmount)}\n`;
    });

    text += `\n💰 *Subtotal Quincena:* ${formatARS(sheetCalculations.subtotalPeriod)}\n`;
    if (advancePayment > 0) text += `🔻 *Adelantos entregados:* -${formatARS(advancePayment)}\n`;
    if (retentionPercent > 0) text += `🔒 *Fondo de reparo (${retentionPercent}%):* -${formatARS(sheetCalculations.retentionAmount)}\n`;
    text += `\n✅ *TOTAL NETO A COBRAR:* *${formatARS(sheetCalculations.totalPayable)}*\n`;
    text += `\n_Última modificación: ${activeExistingCert?.lastModifiedFormatted || 'Hoy'} por veniergn@gmail.com_`;

    const phoneClean = (selectedContractor.phone || '').replace(/[^0-9]/g, '');
    const url = phoneClean
      ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  // Clean Print Handler
  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-200">
      {/* 1. TOP HEADER: Title, Project Selector, Quick Stats */}
      <div className="bg-[#101D30] border border-[#29384C] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#29384C]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Certificados de Contratistas
                </h1>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Quincenales
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Planilla interactiva de liquidación quincenal por operario con exportación, impresión y constancia histórica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddContractor}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#081321] hover:bg-[#17263B] text-cyan-300 font-bold text-xs border border-cyan-500/40 transition-all active:scale-95 shadow-sm"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>+ Nuevo Contratista</span>
            </button>
          </div>
        </div>

        {/* PROJECT SELECTOR (AISLAMIENTO ESTRICTO POR OBRA) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#081321]/80 p-3 rounded-2xl border border-[#29384C]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[11px] font-black uppercase text-[#94A3B8] flex items-center gap-1.5 shrink-0 px-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Obra:
            </span>
            {projects.map(p => {
              const isSelected = p.id === activeProject?.id;
              const certCount = (p.contractorCertificates || []).length;
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
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-[#17263B] text-slate-400'}`}>
                    {certCount} cert.
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-[#94A3B8] flex items-center gap-2">
            <span>Admin:</span>
            <span className="font-mono text-cyan-300 font-bold bg-[#101D30] px-2 py-0.5 rounded border border-[#29384C]">
              veniergn@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN LAYOUT: CONTRACTORS LIST (4 COLS) + INTERACTIVE EXCEL SHEET (8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: CONTRACTORS LIST (4 COLS) */}
        <div className="lg:col-span-4 bg-[#101D30] border border-[#29384C] rounded-3xl p-4 sm:p-5 shadow-xl space-y-4 print:hidden">
          <div className="flex items-center justify-between pb-2 border-b border-[#29384C]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-black text-white">Contratistas en Obra</h2>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
              {contractors.length}
            </span>
          </div>

          {/* Search contractor */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={contractorSearch}
              onChange={(e) => setContractorSearch(e.target.value)}
              placeholder="Buscar por nombre o rubro..."
              className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
          </div>

          {/* Contractors Listing Cards */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto no-scrollbar pt-1">
            {filteredContractors.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs italic">
                No se encontraron contratistas.
              </div>
            ) : (
              filteredContractors.map(c => {
                const isSelected = c.id === selectedContractor?.id;
                const cCerts = projectCertificates.filter(cert => cert.contractorId === c.id);
                const totalPaid = cCerts.reduce((acc, curr) => acc + (curr.totalPayable || 0), 0);

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContractorId(c.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500/20 to-[#101D30] border-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400/40'
                        : 'bg-[#081321] border-[#29384C] hover:border-slate-500 hover:bg-[#17263B]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-slate-950 text-xs shrink-0 shadow-sm"
                          style={{ backgroundColor: c.color || '#00f2fe' }}
                        >
                          {c.initials || c.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                            {c.name}
                          </p>
                          <p className="text-[11px] text-emerald-400 font-medium truncate mt-0.5">
                            {c.role || 'Contratista'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-cyan-300 block font-bold">
                          {formatARS(totalPaid)}
                        </span>
                        <span className="text-[9px] text-[#94A3B8]">
                          {cCerts.length} cert.
                        </span>
                      </div>
                    </div>

                    {/* Edit / Delete quick buttons */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#29384C]/60 text-[10px]">
                      <span className="text-slate-400">
                        {c.phone ? `📱 ${c.phone}` : 'Sin teléfono'}
                      </span>
                      <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditContractor(c);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-bold"
                          title="Editar contratista"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContractor(c.id, c.name);
                          }}
                          className="text-slate-500 hover:text-rose-400"
                          title="Eliminar contratista"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE EXCEL-STYLE SHEET (8 COLS) */}
        <div className="lg:col-span-8 bg-[#101D30] border border-[#29384C] rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
          {/* Header of Certificate: Contractor Info & Quincena Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#29384C] print:border-b-2 print:border-black">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-slate-950 text-base shadow-md shrink-0 print:border print:border-black"
                style={{ backgroundColor: selectedContractor?.color || '#00f2fe' }}
              >
                {selectedContractor?.initials || selectedContractor?.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white print:text-black">
                    {selectedContractor?.name || 'Selecciona un contratista'}
                  </h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:border-black print:text-black">
                    {selectedContractor?.role || 'Trabajo General'}
                  </span>
                </div>
                <p className="text-xs text-[#94A3B8] print:text-gray-600">
                  Obra: <strong className="text-white print:text-black">{activeProject?.name}</strong> • Ubicación: {activeProject?.location}
                </p>
              </div>
            </div>

            {/* Selector de Quincena */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-[#94A3B8] print:text-black mb-0.5">
                  Período Quincenal:
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none print:text-black print:border-black print:bg-white"
                >
                  {DEFAULT_PERIODS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Status Pill */}
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-[#94A3B8] print:hidden mb-0.5">
                  Estado:
                </label>
                <select
                  value={certStatus}
                  onChange={(e) => setCertStatus(e.target.value as any)}
                  className="bg-[#081321] border border-[#29384C] rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-bold outline-none print:hidden"
                >
                  <option value="draft">Borrador</option>
                  <option value="approved">Aprobado</option>
                  <option value="paid">Pagado</option>
                </select>
              </div>
            </div>
          </div>

          {/* INTERACTIVE EXCEL-STYLE SPREADSHEET TABLE */}
          <div className="bg-[#081321] rounded-2xl border border-[#29384C] overflow-hidden print:border print:border-black print:bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#17263B] text-[10px] font-black uppercase text-[#94A3B8] border-b border-[#29384C] print:bg-gray-100 print:text-black print:border-b">
                    <th className="py-2.5 px-2 w-8 text-center">#</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Ítem / Tarea / Concepto</th>
                    <th className="py-2.5 px-2 w-16 text-center">Unidad</th>
                    <th className="py-2.5 px-2 w-20 text-right">Cant.</th>
                    <th className="py-2.5 px-2 w-24 text-right">Precio Unit.</th>
                    <th className="py-2.5 px-2 w-16 text-center">% Ant.</th>
                    <th className="py-2.5 px-2 w-16 text-center">% Act.</th>
                    <th className="py-2.5 px-2 w-16 text-center text-cyan-300 print:text-black">% Quin.</th>
                    <th className="py-2.5 px-3 w-28 text-right text-emerald-300 print:text-black">Monto Quin.</th>
                    <th className="py-2.5 px-2 w-10 text-center print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#29384C]/60 print:divide-gray-300">
                  {sheetCalculations.computedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-[#101D30]/60 transition-colors print:hover:bg-white">
                      <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px] print:text-black">
                        {idx + 1}
                      </td>

                      <td className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.taskDescription}
                          onChange={(e) => handleUpdateItem(row.id, 'taskDescription', e.target.value)}
                          placeholder="Descripción de la tarea o avance..."
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-2.5 py-1 text-xs text-white font-bold outline-none print:border-none print:bg-white print:text-black print:p-0"
                        />
                      </td>

                      <td className="py-1.5 px-1">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleUpdateItem(row.id, 'unit', e.target.value)}
                          placeholder="m2"
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-1 py-1 text-xs text-center text-slate-300 outline-none print:border-none print:bg-white print:text-black print:p-0"
                        />
                      </td>

                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          step="any"
                          value={row.contractedQuantity || ''}
                          onChange={(e) => handleUpdateItem(row.id, 'contractedQuantity', e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-1 py-1 text-xs text-right text-white font-mono font-bold outline-none print:border-none print:bg-white print:text-black print:p-0"
                        />
                      </td>

                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          step="any"
                          value={row.unitPrice || ''}
                          onChange={(e) => handleUpdateItem(row.id, 'unitPrice', e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-1 py-1 text-xs text-right text-white font-mono font-bold outline-none print:border-none print:bg-white print:text-black print:p-0"
                        />
                      </td>

                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.previousProgressPercent || ''}
                          onChange={(e) => handleUpdateItem(row.id, 'previousProgressPercent', e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-1 py-1 text-xs text-center text-slate-400 font-mono outline-none print:border-none print:bg-white print:text-black print:p-0"
                        />
                      </td>

                      <td className="py-1.5 px-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.currentProgressPercent || ''}
                          onChange={(e) => handleUpdateItem(row.id, 'currentProgressPercent', e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#101D30] border border-[#29384C] focus:border-cyan-400 rounded-lg px-1 py-1 text-xs text-center text-cyan-300 font-mono font-bold outline-none print:border-none print:bg-white print:text-black print:p-0"
                        />
                      </td>

                      <td className="py-2 px-2 text-center font-mono font-black text-cyan-400 print:text-black">
                        {row.periodPercent}%
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-400 print:text-black">
                        {formatARS(row.periodAmount)}
                      </td>

                      <td className="py-2 px-2 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(row.id)}
                          className="text-slate-500 hover:text-rose-400 font-bold p-1 text-sm"
                          title="Eliminar fila"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table bottom controls */}
            <div className="flex items-center justify-between p-2.5 bg-[#17263B]/40 border-t border-[#29384C] print:hidden">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Agregar Fila</span>
              </button>

              <button
                type="button"
                onClick={handleResetSheet}
                className="px-3 py-1 rounded-xl text-slate-400 hover:text-white text-xs font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar Planilla</span>
              </button>
            </div>
          </div>

          {/* DEDUCTIONS & TOTALS SUMMARY CARD */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-7 space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 print:text-black">
                Observaciones del Certificado (opcional):
              </label>
              <textarea
                rows={3}
                value={certNotes}
                onChange={(e) => setCertNotes(e.target.value)}
                placeholder="Detalle de trabajos adicionales, deducción de materiales o condiciones de pago..."
                className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-2xl p-3 text-xs text-white outline-none resize-none print:border print:border-black print:text-black print:bg-white"
              />

              {/* AUDIT TRAIL RECORD */}
              <div className="text-[11px] text-[#94A3B8] font-mono bg-[#081321] p-2.5 rounded-xl border border-[#29384C] print:border-none print:text-black">
                <span className="text-slate-400 font-bold">Última modificación: </span>
                <span className="text-cyan-300 print:text-black">
                  {activeExistingCert?.lastModifiedFormatted || 'Pendiente de guardado'}
                </span>
                <span className="text-slate-400 font-bold"> por </span>
                <span className="text-white font-bold print:text-black">veniergn@gmail.com</span>
              </div>
            </div>

            {/* TOTALS BOX */}
            <div className="sm:col-span-5 bg-[#081321] p-4 rounded-2xl border border-[#29384C] space-y-2.5 print:border print:border-black print:bg-white">
              <div className="flex items-center justify-between text-xs text-slate-300 print:text-black">
                <span>Subtotal Trabajos Quincena:</span>
                <span className="font-mono font-bold text-white print:text-black">
                  {formatARS(sheetCalculations.subtotalPeriod)}
                </span>
              </div>

              {/* Adelantos Entregados */}
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-rose-400 font-medium">(-) Adelantos entregados:</span>
                <div className="w-28">
                  <input
                    type="number"
                    min="0"
                    value={advancePayment || ''}
                    onChange={(e) => setAdvancePayment(Number(e.target.value) || 0)}
                    placeholder="$ 0"
                    className="w-full bg-[#101D30] border border-[#29384C] focus:border-rose-400 rounded-lg px-2 py-0.5 text-xs text-right text-rose-300 font-mono font-bold outline-none print:border print:border-black print:text-black print:bg-white"
                  />
                </div>
              </div>

              {/* Fondo de Reparo */}
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="text-amber-400 font-medium">(-) Fondo de reparo (%):</span>
                <div className="w-28 flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={retentionPercent || ''}
                    onChange={(e) => setRetentionPercent(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full bg-[#101D30] border border-[#29384C] focus:border-amber-400 rounded-lg px-2 py-0.5 text-xs text-right text-amber-300 font-mono font-bold outline-none print:border print:border-black print:text-black print:bg-white"
                  />
                  <span className="text-amber-400 text-xs">%</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#29384C] pt-2 print:border-black">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black uppercase text-emerald-400 print:text-black tracking-wider">
                    Total Neto a Pagar:
                  </span>
                  <span className="text-lg sm:text-xl font-black font-mono text-emerald-400 print:text-black drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                    {formatARS(sheetCalculations.totalPayable)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SIGNATURE BLOCKS FOR PRINTING ONLY */}
          <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-8 border-t-2 border-black">
            <div className="text-center">
              <div className="border-t border-black w-48 mx-auto mb-1"></div>
              <p className="font-bold text-xs">{selectedContractor?.name}</p>
              <p className="text-[10px] text-gray-600">Contratista / Operario</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black w-48 mx-auto mb-1"></div>
              <p className="font-bold text-xs">Msc. Arq. Venier Gastón</p>
              <p className="text-[10px] text-gray-600">Director de Obra • veniergn@gmail.com</p>
            </div>
          </div>

          {/* BOTTOM ACTIONS BAR: GUARDAR, IMPRIMIR, WHATSAPP, HISTORIAL */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#29384C] print:hidden">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintCertificate}
                className="px-3.5 py-2 rounded-xl bg-[#081321] hover:bg-[#17263B] text-slate-200 border border-[#29384C] text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Imprimir certificado oficial o guardar como PDF"
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>Imprimir / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSendContractorWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Enviar detalle por WhatsApp al contratista"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Contratista</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeExistingCert && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('¿Eliminar este certificado del historial?')) {
                      onDeleteCertificate(activeProject.id, activeExistingCert.id);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveCertificateSubmit}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Guardar Certificado Quincenal</span>
              </button>
            </div>
          </div>

          {/* PREVIOUS CERTIFICATES HISTORY FOR THIS CONTRACTOR */}
          {contractorHistoryCertificates.length > 0 && (
            <div className="pt-4 border-t border-[#29384C] space-y-2.5 print:hidden">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                <span>Historial de Certificados Anteriores ({contractorHistoryCertificates.length})</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {contractorHistoryCertificates.map(c => {
                  const isCurrent = c.period === selectedPeriod;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedPeriod(c.period)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-400/60 text-white font-bold'
                          : 'bg-[#081321] border-[#29384C] text-slate-300 hover:bg-[#17263B]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{c.period}</p>
                        <p className="text-[10px] text-[#94A3B8]">{c.lastModifiedFormatted || c.lastModifiedAt?.slice(0, 10)}</p>
                      </div>
                      <span className="font-mono font-black text-emerald-400 ml-2">
                        {formatARS(c.totalPayable)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. MODAL DE CREACIÓN / EDICIÓN DE CONTRATISTA */}
      {isContractorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#101D30] border border-[#29384C] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#29384C]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  {editingContractorId ? 'Modificar Contratista' : 'Nuevo Contratista para la Obra'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsContractorModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-[#081321] text-slate-400 hover:text-white flex items-center justify-center border border-[#29384C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContractorProfile} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nombre y Apellido <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contractorNameInput}
                  onChange={(e) => setContractorNameInput(e.target.value)}
                  placeholder="Ej: Marcelo Gómez"
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Trabajo / Rubro que realiza <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contractorRoleInput}
                  onChange={(e) => setContractorRoleInput(e.target.value)}
                  placeholder="Ej: Albañilería / Plomería / Pintura"
                  className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Teléfono / WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={contractorPhoneInput}
                    onChange={(e) => setContractorPhoneInput(e.target.value)}
                    placeholder="Ej: 2615123456"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    DNI / CUIT (opcional):
                  </label>
                  <input
                    type="text"
                    value={contractorDniInput}
                    onChange={(e) => setContractorDniInput(e.target.value)}
                    placeholder="Ej: 20-33445566-7"
                    className="w-full bg-[#081321] border border-[#29384C] focus:border-emerald-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#29384C]">
                <button
                  type="button"
                  onClick={() => setIsContractorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#081321] hover:bg-[#17263B] text-slate-300 font-bold text-xs border border-[#29384C]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs shadow-md transition-all active:scale-95"
                >
                  {editingContractorId ? 'Guardar Cambios' : 'Crear Contratista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
