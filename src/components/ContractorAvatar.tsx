import React, { useState, useEffect } from 'react';

export interface ContractorAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  color?: string;
  sizeClassName?: string;
  className?: string;
  ringClassName?: string;
  showStatusDot?: boolean;
  statusColor?: string;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Componente unificado para avatares de contratistas y cuadrillas.
 * Si cuenta con foto (URL o Base64), la renderiza con recorte circular.
 * Si NO cuenta con foto o se selecciona modo "Solo Color", muestra una silueta de perfil
 * minimalista y elegante sobre el color identificador de la cuadrilla ("sin enfocar nada").
 */
export function ContractorAvatar({
  avatarUrl,
  name = '',
  color = '#00f2fe',
  sizeClassName = 'w-10 h-10',
  className = '',
  ringClassName = '',
  showStatusDot = false,
  statusColor,
  title,
  onClick
}: ContractorAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reiniciar estado de error cuando cambie la URL
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const hasValidPhoto = Boolean(
    avatarUrl &&
    avatarUrl.trim() !== '' &&
    avatarUrl !== 'silhouette' &&
    avatarUrl !== 'color' &&
    (avatarUrl.startsWith('http://') ||
     avatarUrl.startsWith('https://') ||
     avatarUrl.startsWith('data:image/') ||
     avatarUrl.startsWith('blob:') ||
     avatarUrl.startsWith('/')) &&
    !imgError
  );

  return (
    <div
      onClick={onClick}
      className={`relative shrink-0 select-none ${sizeClassName} ${className}`}
      title={title || name}
    >
      <div
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center transition-all ${ringClassName}`}
        style={{
          backgroundColor: color,
          borderColor: color
        }}
      >
        {hasValidPhoto ? (
          <img
            src={avatarUrl!}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover rounded-full"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center relative"
            style={{
              background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.28), transparent 72%), ${color}`
            }}
          >
            {/* Silueta de perfil humano limpia y estilizada (sin enfocar nada) */}
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-full h-full p-[18%] text-white/95 drop-shadow-xs"
              aria-hidden="true"
            >
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
      </div>

      {showStatusDot && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow-xs"
          style={{ backgroundColor: statusColor || color }}
        />
      )}
    </div>
  );
}
