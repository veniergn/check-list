import React, { useState, useRef } from 'react';
import {
  X,
  Users,
  Plus,
  Pencil,
  Trash2,
  Camera,
  Upload,
  Check,
  Sparkles,
  Link,
  RotateCcw,
  Palette,
  User
} from 'lucide-react';
import { ContractorProfile, Project } from '../types';
import { PRESET_AVATARS, PRESET_COLORS, DEFAULT_CONTRACTORS } from '../utils/pmContractors';
import { ContractorAvatar } from './ContractorAvatar';

interface ContractorManagerModalProps {
  isOpen: boolean;
  project: Project | null;
  contractors: ContractorProfile[];
  neonColor?: string;
  onClose: () => void;
  onSaveContractors: (updatedList: ContractorProfile[]) => void;
  onShowToast: (msg: string, icon?: string) => void;
}

export function ContractorManagerModal({
  isOpen,
  project,
  contractors,
  neonColor = '#00f2fe',
  onClose,
  onSaveContractors,
  onShowToast
}: ContractorManagerModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formAvatar, setFormAvatar] = useState(PRESET_AVATARS[0]);
  const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
  const [urlInput, setUrlInput] = useState('');
  const [isUrlMode, setIsUrlMode] = useState(false);

  // File input refs
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !project) return null;

  // Active contractor being edited
  const activeContractor = contractors.find(c => c.id === selectedId) || null;

  const handleStartEdit = (contractor: ContractorProfile) => {
    setIsCreatingNew(false);
    setSelectedId(contractor.id);
    setFormName(contractor.name);
    setFormRole(contractor.role);
    setFormAvatar(contractor.avatarUrl || '');
    setFormColor(contractor.color || PRESET_COLORS[0]);
    setUrlInput('');
    setIsUrlMode(false);
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setSelectedId(null);
    setFormName('');
    setFormRole('Técnico de Obra');
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    setFormAvatar(''); // Por defecto silueta limpia con color de cuadrilla
    setFormColor(randomColor);
    setUrlInput('');
    setIsUrlMode(false);
  };

  // Compress image on client to keep avatar lightweight & responsive
  const handleProcessImageFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 250;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setFormAvatar(compressed);
          onShowToast('Foto cargada correctamente', 'Camera');
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  const handleSaveContractor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      onShowToast('Ingresa un nombre para el responsable', 'AlertCircle');
      return;
    }

    // Generate initials
    const parts = cleanName.split(' ').filter(Boolean);
    const initials = parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : (parts[0]?.substring(0, 2) || 'OB').toUpperCase();

    if (isCreatingNew) {
      const newContractor: ContractorProfile = {
        id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: cleanName,
        role: formRole.trim() || 'Técnico de Obra',
        avatarUrl: formAvatar ? formAvatar.trim() : '',
        color: formColor,
        initials
      };
      const updated = [...contractors, newContractor];
      onSaveContractors(updated);
      onShowToast(`Responsable "${cleanName}" creado con éxito`, 'Check');
      setIsCreatingNew(false);
      setSelectedId(newContractor.id);
    } else if (activeContractor) {
      const updatedList = contractors.map(c => {
        if (c.id !== activeContractor.id) return c;
        return {
          ...c,
          name: cleanName,
          role: formRole.trim() || c.role,
          avatarUrl: formAvatar ? formAvatar.trim() : '',
          color: formColor,
          initials
        };
      });
      onSaveContractors(updatedList);
      onShowToast(`Datos de "${cleanName}" actualizados`, 'Check');
    }
  };

  const handleDeleteContractor = (contractorId: string, name: string) => {
    if (contractors.length <= 1) {
      onShowToast('Debe haber al menos un responsable en la obra', 'AlertCircle');
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar a "${name}" del equipo de obra?`)) {
      const updated = contractors.filter(c => c.id !== contractorId);
      onSaveContractors(updated);
      if (selectedId === contractorId) {
        setSelectedId(null);
        setIsCreatingNew(false);
      }
      onShowToast(`"${name}" eliminado del equipo`, 'Trash2');
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('¿Restablecer el equipo a las cuadrillas profesionales predeterminadas?')) {
      onSaveContractors(DEFAULT_CONTRACTORS);
      setSelectedId(null);
      setIsCreatingNew(false);
      onShowToast('Equipo restablecido a valores iniciales', 'RotateCcw');
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#f8fafc] dark:bg-[#0b1120] border border-slate-200/80 dark:border-slate-800/90 rounded-[32px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-slate-950 shadow-md"
              style={{ backgroundColor: neonColor }}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Gestión de Responsables y Cuadrillas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Edita nombres, roles técnicos y personaliza la foto o avatar de cada integrante
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              title="Restablecer equipo original"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restablecer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT: CONTRACTORS LIST (5 COLS) */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Equipo Activo ({contractors.length})
              </span>
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3 py-1 rounded-xl text-xs font-black text-slate-950 flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                style={{ backgroundColor: neonColor }}
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Nuevo</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
              {contractors.map(c => {
                const isSelected = selectedId === c.id && !isCreatingNew;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleStartEdit(c)}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800/90 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ContractorAvatar
                        avatarUrl={c.avatarUrl}
                        name={c.name}
                        color={c.color || neonColor}
                        sizeClassName="w-10 h-10"
                        ringClassName="ring-2 shadow-xs"
                        showStatusDot
                        statusColor={c.color || neonColor}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {c.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">
                          {c.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(c);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContractor(c.id, c.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: EDIT / CREATE FORM (7 COLS) */}
          <div className="md:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
            
            {/* HIDDEN FILE INPUTS FOR CAMERA AND LOCAL UPLOAD */}
            <input
              type="file"
              ref={fileUploadRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handleFileChange}
            />

            {(selectedId || isCreatingNew) ? (
              <form onSubmit={handleSaveContractor} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    {isCreatingNew ? (
                      <>
                        <Plus className="w-4 h-4 text-cyan-500" />
                        <span>Nuevo Responsable</span>
                      </>
                    ) : (
                      <>
                        <Pencil className="w-4 h-4 text-cyan-500" />
                        <span>Editar: {formName || activeContractor?.name}</span>
                      </>
                    )}
                  </h4>
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${formColor}20`,
                      color: formColor
                    }}
                  >
                    {formRole || 'Especialidad'}
                  </span>
                </div>

                {/* AVATAR SELECTOR & UPLOAD CONTROLS */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">
                    Foto de Perfil / Imagen del Responsable
                  </label>

                  <div className="flex items-center gap-4">
                    {/* Big Preview */}
                    <ContractorAvatar
                      avatarUrl={formAvatar}
                      name={formName || 'Vista Previa'}
                      color={formColor}
                      sizeClassName="w-16 h-16"
                      ringClassName="ring-4 shadow-lg"
                      showStatusDot
                      statusColor={formColor}
                    />

                    {/* Status & info description */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {!formAvatar ? 'Modo: Solo Color & Silueta' : 'Foto Personalizada Activa'}
                        </span>
                        {!formAvatar ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                            Silueta
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                            Foto
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {!formAvatar
                          ? 'Muestra la silueta de perfil limpia y neutra sobre el color identificador de la cuadrilla.'
                          : 'Foto cargada desde archivo, cámara o galería.'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons to change photo or switch to color silhouette */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormAvatar('');
                        onShowToast('Modo silueta activado (se usará el color de cuadrilla)', 'Palette');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 ${
                        !formAvatar
                          ? 'bg-cyan-500 text-slate-950 font-black shadow-md border-cyan-400'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                      title="Dejar solo el color con la silueta de perfil sin foto"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Solo Color (Silueta)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                      title="Tomar foto con la cámara del dispositivo"
                    >
                      <Camera className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Sacar Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileUploadRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                      title="Subir imagen desde el dispositivo"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Subir Archivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsUrlMode(!isUrlMode)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                      title="Ingresar enlace URL de internet"
                    >
                      <Link className="w-3.5 h-3.5 text-amber-500" />
                      <span>Enlace URL</span>
                    </button>

                    {formAvatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormAvatar('');
                          onShowToast('Foto eliminada, se usará silueta con color', 'Check');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-200 dark:border-rose-800/60 transition-all"
                        title="Quitar foto y usar solo color y silueta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Quitar Foto</span>
                      </button>
                    )}
                  </div>

                  {/* URL Input Bar if expanded */}
                  {isUrlMode && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="https://ejemplo.com/foto.jpg"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (urlInput.trim()) {
                            setFormAvatar(urlInput.trim());
                            onShowToast('Foto actualizada por enlace', 'Check');
                            setIsUrlMode(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 shadow-xs"
                        style={{ backgroundColor: neonColor }}
                      >
                        Aplicar
                      </button>
                    </div>
                  )}

                  {/* Preset Avatars Gallery with Silhouette Option */}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                      O elige silueta con color o un avatar profesional rápido:
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {/* Option 0: Pure color with profile silhouette */}
                      <button
                        type="button"
                        onClick={() => {
                          setFormAvatar('');
                          onShowToast('Silueta activada', 'Palette');
                        }}
                        className={`relative shrink-0 rounded-full transition-all flex items-center justify-center p-0.5 ${
                          !formAvatar ? 'ring-2 ring-cyan-500 scale-110 shadow-md' : 'opacity-70 hover:opacity-100'
                        }`}
                        title="Solo Color y Silueta de Perfil (sin foto)"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-xs"
                          style={{
                            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.28), transparent 72%), ${formColor}`
                          }}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/95">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                      </button>

                      {PRESET_AVATARS.map((av, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormAvatar(av)}
                          className={`relative shrink-0 rounded-full transition-all ${
                            formAvatar === av ? 'ring-2 ring-cyan-500 scale-105' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={av}
                            alt={`Avatar ${idx}`}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* NAME & ROLE INPUTS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Nombre Completo / Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ing. Carlos Gomez, Cuadrilla Sanitaria..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Especialidad / Rol *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Estructuras, Electricidad, Yesería..."
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
                    />
                  </div>
                </div>

                {/* THEME COLOR PICKER */}
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Color Identificador de Cuadrilla</span>
                    <span className="font-mono text-[10px] lowercase text-slate-400 font-bold">{formColor}</span>
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {PRESET_COLORS.map(col => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setFormColor(col)}
                        className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${
                          formColor === col ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col }}
                        title={col}
                      >
                        {formColor === col && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </button>
                    ))}

                    {/* Custom color picker */}
                    <label
                      className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-cyan-400 transition-colors relative overflow-hidden"
                      title="Elegir cualquier otro color personalizado"
                    >
                      <Palette className="w-3.5 h-3.5 text-slate-400 hover:text-cyan-400" />
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                  </div>
                </div>

                {/* SUBMIT BUTTONS */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setIsCreatingNew(false);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-black text-slate-950 shadow-md active:scale-95 transition-all"
                    style={{ backgroundColor: neonColor }}
                  >
                    {isCreatingNew ? 'Crear Responsable' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h5 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Selecciona un responsable para editar
                </h5>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Toca sobre cualquier integrante de la lista izquierda o pulsa en "+ Nuevo" para agregar otra cuadrilla a esta obra.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-4 py-2 rounded-xl text-xs font-black text-slate-950 shadow-sm active:scale-95 transition-all"
                  style={{ backgroundColor: neonColor }}
                >
                  + Agregar Nueva Cuadrilla
                </button>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
