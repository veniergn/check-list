import { useState, useRef, useEffect, useId } from 'react';
import {
  X,
  Users,
  Plus,
  Calendar,
  Clock,
  Camera,
  Image as ImageIcon,
  Send,
  Copy,
  Trash2,
  Edit3,
  Search,
  Check,
  Building2,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  ExternalLink,
  ClipboardPaste,
  Maximize2
} from 'lucide-react';
import { Project, SiteMeeting, SiteMeetingPhoto } from '../types';
import {
  formatMeetingForWhatsApp,
  formatMeetingDate,
  sendMeetingWhatsApp,
  shareMeetingNative,
  copyMeetingWhatsAppText
} from '../utils/whatsappMeetings';
import { compressBase64Image, uploadFileToDrive } from '../lib/driveUpload';

// WhatsApp icon SVG component
function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

interface SiteMeetingsModalProps {
  isOpen: boolean;
  project: Project;
  neonColor?: string;
  onClose: () => void;
  onSaveMeeting: (meeting: SiteMeeting) => void;
  onDeleteMeeting: (meetingId: string) => void;
  onShowToast?: (message: string, icon?: string) => void;
}

export function SiteMeetingsModal({
  isOpen,
  project,
  neonColor = '#6366f1',
  onClose,
  onSaveMeeting,
  onDeleteMeeting,
  onShowToast
}: SiteMeetingsModalProps) {
  const meetings = project.siteMeetings || [];

  // View state: 'list' | 'create' | 'edit'
  const [viewState, setViewState] = useState<'list' | 'create' | 'edit'>('list');
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Sincronizar el botón "Volver para atrás" del navegador o de la barra superior
  useEffect(() => {
    if (!isOpen) return;
    (window as any).__customSectionBackHandler = () => {
      if (viewState === 'create' || viewState === 'edit') {
        setViewState('list');
        return true;
      }
      onClose();
      return true;
    };
    return () => {
      if ((window as any).__customSectionBackHandler) {
        (window as any).__customSectionBackHandler = null;
      }
    };
  }, [isOpen, viewState, onClose]);

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formAttendees, setFormAttendees] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formTopics, setFormTopics] = useState('');
  const [formCommitments, setFormCommitments] = useState('');
  const [formPhotos, setFormPhotos] = useState<SiteMeetingPhoto[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Expanded topics map in list view
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Lightbox modal for previewing photos
  const [activeLightboxPhoto, setActiveLightboxPhoto] = useState<SiteMeetingPhoto | null>(null);

  // Copy feedback state
  const [copiedMeetingId, setCopiedMeetingId] = useState<string | null>(null);

  // File input refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const topicsTextareaRef = useRef<HTMLTextAreaElement>(null);

  const cameraInputId = useId();
  const galleryInputId = useId();

  // Initialize new meeting form with default date and time
  const handleStartCreate = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    setFormDate(dateStr);
    setFormTime(timeStr);
    setFormAttendees('');
    setFormTitle('');
    setFormTopics('');
    setFormCommitments('');
    setFormPhotos([]);
    setEditingMeetingId(null);
    setViewState('create');
  };

  const handleStartEdit = (meeting: SiteMeeting) => {
    setFormDate(meeting.date || '');
    setFormTime(meeting.time || '');
    setFormAttendees(meeting.attendees || '');
    setFormTitle(meeting.title || '');
    setFormTopics(meeting.topics || '');
    setFormCommitments(meeting.commitments || '');
    setFormPhotos(meeting.photos ? [...meeting.photos] : []);
    setEditingMeetingId(meeting.id);
    setViewState('edit');
  };

  // Quick chips: add contractor to attendees
  const handleAddAttendeeChip = (contractorName: string) => {
    if (!contractorName) return;
    if (!formAttendees.trim()) {
      setFormAttendees(contractorName);
    } else if (!formAttendees.toLowerCase().includes(contractorName.toLowerCase())) {
      setFormAttendees(prev => `${prev}, ${contractorName}`);
    }
  };

  // Paste from clipboard button
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setFormTopics(prev => {
            if (!prev.trim()) return text;
            return `${prev}\n\n${text}`;
          });
          onShowToast?.('Texto pegado desde el portapapeles', 'Clipboard');
          return;
        }
      }
      onShowToast?.('No se encontró texto en el portapapeles', 'AlertCircle');
    } catch {
      onShowToast?.('Permiso de portapapeles denegado o no disponible. Puedes pegar directamente con Ctrl+V o manteniendo presionado.', 'AlertCircle');
    }
  };

  // Handle image files selection (from camera or gallery)
  const handleProcessImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);

    try {
      const newPhotos: SiteMeetingPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        // Convert file to base64
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Compress image client side
        const compressed = await compressBase64Image(rawBase64, 1400, 0.78);
        const photoId = 'photo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const newPhotoItem: SiteMeetingPhoto = {
          id: photoId,
          dataUrl: compressed,
          createdAt: new Date().toISOString()
        };

        newPhotos.push(newPhotoItem);

        // Upload to Google Drive in background to obtain permanent driveUrl
        const cleanProjectName = ((project?.name || 'Obra') || 'Obra').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Reunion_${cleanProjectName}_${Date.now()}_${i + 1}.jpg`;

        uploadFileToDrive({
          base64: compressed,
          filename,
          mimeType: 'image/jpeg'
        }).then(res => {
          if (res.success && res.url) {
            setFormPhotos(current =>
              current.map(p =>
                p.id === photoId
                  ? { ...p, driveUrl: res.url, driveFileId: res.fileId }
                  : p
              )
            );
          }
        }).catch(e => console.warn('Aviso subiendo foto de reunión a Google Drive:', e));
      }

      setFormPhotos(prev => [...prev, ...newPhotos]);
      onShowToast?.(`${newPhotos.length} foto(s) agregada(s)`, 'Camera');
    } catch (err: any) {
      console.error('Error procesando fotos de reunión:', err);
      onShowToast?.('Error al procesar las fotos', 'AlertCircle');
    } finally {
      setIsUploadingPhoto(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  // Remove photo from form
  const handleRemovePhoto = (photoId: string) => {
    setFormPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Update photo caption
  const handleUpdatePhotoCaption = (photoId: string, caption: string) => {
    setFormPhotos(prev =>
      prev.map(p => (p.id === photoId ? { ...p, caption } : p))
    );
  };

  // Save meeting (either create or edit)
  const handleSave = (andShareWhatsApp = false) => {
    if (!formDate.trim()) {
      onShowToast?.('Por favor ingresa la fecha de la reunión', 'AlertCircle');
      return;
    }
    if (!formAttendees.trim()) {
      onShowToast?.('Por favor indica con quién fue la reunión', 'AlertCircle');
      return;
    }
    if (!formTopics.trim() && !formTitle.trim()) {
      onShowToast?.('Por favor escribe los temas tratados o el título de la reunión', 'AlertCircle');
      return;
    }

    const meetingId = editingMeetingId || 'meeting_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const existingMeeting = meetings.find(m => m.id === meetingId);

    const updatedMeeting: SiteMeeting = {
      id: meetingId,
      projectId: project.id,
      projectName: (project?.name || 'Obra'),
      title: formTitle.trim() || 'Reunión en Obra',
      date: formDate,
      time: formTime || '09:00',
      attendees: formAttendees.trim(),
      topics: formTopics.trim(),
      commitments: formCommitments.trim() || undefined,
      photos: formPhotos,
      createdAt: existingMeeting ? existingMeeting.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      onSaveMeeting(updatedMeeting);
      onShowToast?.(editingMeetingId ? 'Reunión actualizada' : 'Reunión guardada exitosamente', 'Check');

      if (andShareWhatsApp) {
        sendMeetingWhatsApp(updatedMeeting);
      }

      setViewState('list');
    } catch (err) {
      console.error('Error al guardar reunión:', err);
      onShowToast?.('Error al guardar la reunión', 'AlertCircle');
    }
  };

  // WhatsApp quick send from list card
  const handleSendWhatsAppCard = (meeting: SiteMeeting) => {
    sendMeetingWhatsApp(meeting);
  };

  // Copy text from list card
  const handleCopyCard = async (meeting: SiteMeeting) => {
    const ok = await copyMeetingWhatsAppText(meeting);
    if (ok) {
      setCopiedMeetingId(meeting.id);
      onShowToast?.('Minuta copiada al portapapeles', 'Copy');
      setTimeout(() => setCopiedMeetingId(null), 2500);
    }
  };

  // Filtered meetings
  const filteredMeetings = meetings.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.attendees && m.attendees.toLowerCase().includes(q)) ||
      (m.topics && m.topics.toLowerCase().includes(q)) ||
      (m.date && m.date.includes(q))
    );
  }).sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    return (b.time || '').localeCompare(a.time || '');
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-[#172554] via-[#1e1b4b] to-[#0f172a] border-b border-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Users className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Reuniones en Obra
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/25 text-indigo-300 border border-indigo-500/40">
                  {meetings.length}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300 font-bold">{(project?.name || 'Obra')}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Minutas, fotos y envío a WhatsApp</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {viewState === 'list' && (
              <button
                type="button"
                onClick={handleStartCreate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(99,102,241,0.3)] active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nueva Reunión</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Switch between 'list' and 'create'/'edit' */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {viewState === 'list' ? (
            <>
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#1e293b]/60 p-2.5 rounded-xl border border-slate-700/50">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por asistente, tema o fecha..."
                    className="w-full bg-[#0f172a] border border-slate-700/70 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Meetings List */}
              {filteredMeetings.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-[#0f172a]/50">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Users className="w-8 h-8 opacity-70" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {searchQuery ? 'No se encontraron reuniones' : 'No hay reuniones registradas'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                    {searchQuery
                      ? 'No hay reuniones que coincidan con la búsqueda. Intenta con otros términos.'
                      : 'Lleva el registro de todo lo que se habla en obra, participantes, fecha, hora, fotos y compártelo directo por WhatsApp a quienes no tengan la app.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Registrar Primera Reunión en Obra</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMeetings.map(meeting => {
                    const isExpanded = !!expandedTopics[meeting.id];
                    const isLongText = (meeting.topics || '').length > 250;
                    const previewText = isExpanded || !isLongText
                      ? meeting.topics
                      : (meeting.topics || '').slice(0, 250) + '...';

                    return (
                      <div
                        key={meeting.id}
                        className="bg-[#131c2e] hover:bg-[#162136] border border-[#1e293b] rounded-2xl p-4 sm:p-5 transition-all shadow-md"
                      >
                        {/* Card Header */}
                        <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-indigo-400" />
                                {formatMeetingDate(meeting.date)}
                              </span>
                              {meeting.time && (
                                <span className="px-2 py-0.5 rounded-lg text-xs font-mono text-slate-300 bg-slate-800/80 border border-slate-700/60 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {meeting.time} hs
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-800/40">
                                🏢 {meeting.projectName}
                              </span>
                            </div>
                            <h4 className="text-sm sm:text-base font-black text-white tracking-wide mt-1">
                              {meeting.title}
                            </h4>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppCard(meeting)}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                              title="Enviar minuta completa con fotos por WhatsApp"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-400" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyCard(meeting)}
                              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                              title="Copiar texto para WhatsApp"
                            >
                              {copiedMeetingId === meeting.id ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(meeting)}
                              className="p-1.5 bg-slate-800/80 hover:bg-indigo-900/60 text-slate-300 hover:text-indigo-300 rounded-xl text-xs transition-colors"
                              title="Editar reunión"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('¿Deseas eliminar el registro de esta reunión?')) {
                                  onDeleteMeeting(meeting.id);
                                  onShowToast?.('Reunión eliminada', 'Trash2');
                                }
                              }}
                              className="p-1.5 bg-slate-800/80 hover:bg-rose-900/60 text-slate-300 hover:text-rose-400 rounded-xl text-xs transition-colors"
                              title="Eliminar reunión"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Attendees */}
                        <div className="mt-3 flex items-start gap-2 text-xs">
                          <span className="font-bold text-slate-400 shrink-0">👥 Con quién fue:</span>
                          <span className="text-slate-200 font-semibold">{meeting.attendees}</span>
                        </div>

                        {/* Topics */}
                        <div className="mt-2.5 text-xs text-slate-300 bg-[#0d1420] p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                          {previewText}
                          {isLongText && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTopics(prev => ({
                                  ...prev,
                                  [meeting.id]: !isExpanded
                                }))
                              }
                              className="block mt-2 text-indigo-400 hover:text-indigo-300 font-bold underline text-[11px]"
                            >
                              {isExpanded ? 'Ver menos' : 'Ver todo el detalle'}
                            </button>
                          )}
                        </div>

                        {/* Commitments */}
                        {meeting.commitments && (
                          <div className="mt-2.5 text-xs text-amber-200 bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/40">
                            <span className="font-bold text-amber-400 block mb-1">🤝 Acuerdos y Compromisos:</span>
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {meeting.commitments}
                            </div>
                          </div>
                        )}

                        {/* Photos strip */}
                        {meeting.photos && meeting.photos.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-2">
                              <Camera className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Fotos de la reunión ({meeting.photos.length}):</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {meeting.photos.map((photo, pIdx) => (
                                <div
                                  key={photo.id || pIdx}
                                  onClick={() => setActiveLightboxPhoto(photo)}
                                  className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 cursor-pointer shadow-sm hover:border-indigo-400 transition-all hover:scale-105"
                                  title={photo.caption || 'Ver fotografía en grande'}
                                >
                                  <img
                                    src={photo.dataUrl || photo.driveUrl}
                                    alt={photo.caption || `Foto ${pIdx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {photo.caption && (
                                    <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[9px] text-white truncate text-center">
                                      {photo.caption}
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-indigo-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* CREATE / EDIT FORM VIEW */
            <div className="space-y-4">
              {/* Form Navigation Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewState('list')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  ← Volver al listado
                </button>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  {viewState === 'create' ? 'Nueva Minuta de Reunión' : 'Editar Minuta de Reunión'}
                </span>
              </div>

              {/* Row 1: Obra, Fecha, Hora */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Obra */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    🏢 Obra
                  </label>
                  <div className="px-3 py-2 bg-[#172554]/50 border border-indigo-500/40 rounded-xl text-xs font-bold text-cyan-300 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{(project?.name || 'Obra')}</span>
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      📅 Fecha
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormDate(new Date().toISOString().split('T')[0])}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                    >
                      Hoy
                    </button>
                  </div>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full bg-[#131c2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Hora */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-300">
                      ⏰ Hora
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormTime(new Date().toTimeString().slice(0, 5))}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                    >
                      Ahora
                    </button>
                  </div>
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full bg-[#131c2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Con quién fue la reunión */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  👥 ¿Con quién fue la reunión? <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formAttendees}
                  onChange={e => setFormAttendees(e.target.value)}
                  placeholder="Ej: Ing. Sanchez, Walter Gómez (Capataz), Herrero Carlos, Electricista..."
                  className="w-full bg-[#131c2e] border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />

                {/* Quick Chips from Project Contractors */}
                {project.contractors && project.contractors.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-medium">Sugeridos de la obra:</span>
                    {project.contractors.map(c => (
                      <button
                        key={c.id || c.name}
                        type="button"
                        onClick={() => handleAddAttendeeChip(c.name || c.trade)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-indigo-900/60 text-slate-300 hover:text-indigo-300 border border-slate-700 transition-colors"
                        title="Hacer clic para agregar a los asistentes"
                      >
                        + {c.name || c.trade}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Row 3: Motivo / Título de la reunión */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  📌 Motivo o Título de la reunión
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ej: Replanteo de tabiques, Revisión de niveles y cañerías, Coordinación de hormigón..."
                  className="w-full bg-[#131c2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Row 4: Temas hablados en la reunión con botón de Pegar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    📝 Temas hablados en la reunión <span className="text-rose-400">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    title="Pegar texto copiado desde WhatsApp, celular u otra app"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pegar desde Portapapeles</span>
                  </button>
                </div>
                <textarea
                  ref={topicsTextareaRef}
                  value={formTopics}
                  onChange={e => setFormTopics(e.target.value)}
                  placeholder="Escribe o pega aquí todos los temas tratados en la reunión... Puedes copiar y pegar directamente desde tu celular cualquier mensaje, nota técnica o detalle."
                  rows={6}
                  className="w-full bg-[#131c2e] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Row 5: Acuerdos, Compromisos y Próximos Pasos (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  🤝 Acuerdos, compromisos y próximos pasos (opcional)
                </label>
                <textarea
                  value={formCommitments}
                  onChange={e => setFormCommitments(e.target.value)}
                  placeholder="Ej: Se acordó que el herrero entrega barandas el 12/11. Capataz revisa plomos antes de hormigonar..."
                  rows={3}
                  className="w-full bg-[#131c2e] border border-amber-900/50 rounded-xl p-3 text-xs text-amber-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Row 6: Fotografías e Imágenes */}
              <div className="p-4 bg-[#111927] border border-slate-800 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <span>Fotos e imágenes de la reunión</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Saca fotos con la cámara o selecciona imágenes de los temas hablados. Se sincronizan en tu Google Drive.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Camera Button */}
                    <input
                      ref={cameraInputRef}
                      id={cameraInputId}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => handleProcessImageFiles(e.target.files)}
                    />
                    <label
                      htmlFor={cameraInputId}
                      className="cursor-pointer px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Sacar Foto</span>
                    </label>

                    {/* Gallery Button */}
                    <input
                      ref={galleryInputRef}
                      id={galleryInputId}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleProcessImageFiles(e.target.files)}
                    />
                    <label
                      htmlFor={galleryInputId}
                      className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors border border-slate-700 active:scale-95"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Subir Fotos</span>
                    </label>
                  </div>
                </div>

                {isUploadingPhoto && (
                  <div className="py-3 text-center text-xs text-indigo-300 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    <span>Optimizando y preparando imágenes...</span>
                  </div>
                )}

                {/* Photos List in Form */}
                {formPhotos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                    {formPhotos.map((photo, pIdx) => (
                      <div
                        key={photo.id || pIdx}
                        className="bg-[#0f172a] border border-slate-800 rounded-xl p-2 relative flex flex-col gap-2"
                      >
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-800">
                          <img
                            src={photo.dataUrl || photo.driveUrl}
                            alt={photo.caption || `Foto ${pIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(photo.id)}
                            className="absolute top-1.5 right-1.5 p-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg transition-colors shadow"
                            title="Eliminar foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={photo.caption || ''}
                          onChange={e => handleUpdatePhotoCaption(photo.id, e.target.value)}
                          placeholder="Pie de foto / Detalle..."
                          className="w-full bg-[#131c2e] border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions of Form */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewState('list')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Reunión</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                  title="Guarda la reunión y abre WhatsApp automáticamente para enviarla"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white" />
                  <span>Guardar y Enviar por WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Photo Preview */}
      {activeLightboxPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          onClick={() => setActiveLightboxPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setActiveLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white bg-slate-800/80 hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="max-w-4xl max-h-[85vh] flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={activeLightboxPhoto.dataUrl || activeLightboxPhoto.driveUrl}
              alt={activeLightboxPhoto.caption || 'Fotografía de reunión'}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl border border-slate-700"
            />
            {activeLightboxPhoto.caption && (
              <p className="mt-3 text-sm text-slate-200 font-medium bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                {activeLightboxPhoto.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
