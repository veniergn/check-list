import React, { useState, useEffect, useRef } from 'react';

interface ExecutiveGaugeChartProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  valueDisplay?: string | number;
  size?: number;
  status?: 'ok' | 'warning' | 'critical';
  colorVariant?: 'coral_cyan' | 'amber' | 'coral' | 'emerald';
  className?: string;
  animationTrigger?: number;
}

export function ExecutiveGaugeChart({
  value,
  label,
  sublabel,
  valueDisplay,
  size = 76,
  colorVariant = 'coral_cyan',
  className = '',
  animationTrigger
}: ExecutiveGaugeChartProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const [displayValue, setDisplayValue] = useState(clampedValue);
  const prevTriggerRef = useRef<number | undefined>(animationTrigger);

  useEffect(() => {
    if (animationTrigger !== undefined && animationTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = animationTrigger;
      let startTimestamp: number | null = null;
      const duration = 600; // ms
      const target = clampedValue;

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(eased * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayValue(target);
        }
      };

      setDisplayValue(0);
      const animId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animId);
    } else {
      setDisplayValue(clampedValue);
    }
  }, [animationTrigger, clampedValue]);

  // Angle maps from -90deg (far left, 0%) to +90deg (far right, 100%)
  const angle = -90 + (displayValue / 100) * 180;

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 4;

  const gradId = `gaugeGrad_${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.7}`} className="overflow-visible select-none">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {colorVariant === 'coral_cyan' ? (
              <>
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#00f2fe" />
              </>
            ) : colorVariant === 'amber' ? (
              <>
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f97316" />
              </>
            ) : colorVariant === 'emerald' ? (
              <>
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#00f2fe" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#334155" />
              </>
            )}
          </linearGradient>
        </defs>

        {/* Background Semicircle Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored Segment Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Needle Line */}
        <g transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={-radius + 4}
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]"
          />
          <circle cx="0" cy="0" r="3.5" fill="#ffffff" />
        </g>
      </svg>

      {/* Primary Value Display */}
      {valueDisplay !== undefined && (
        <span className="text-[11px] font-black text-white font-mono mt-0.5 tracking-tight leading-none">
          {valueDisplay}
        </span>
      )}

      {/* Label */}
      {label && (
        <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider text-center leading-tight">
          {label}
        </span>
      )}

      {/* Optional Sublabel */}
      {sublabel && (
        <span className="text-[8px] font-semibold text-slate-500 text-center leading-tight">
          {sublabel}
        </span>
      )}
    </div>
  );
}
