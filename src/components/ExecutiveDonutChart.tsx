import React, { useState, useEffect, useRef } from 'react';

interface ExecutiveDonutChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  glowColor?: string;
  className?: string;
  animationTrigger?: number;
}

export function ExecutiveDonutChart({
  percentage,
  size = 136,
  strokeWidth = 14,
  glowColor = '#00f2fe',
  className = '',
  animationTrigger
}: ExecutiveDonutChartProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const [displayPct, setDisplayPct] = useState(clamped);
  const prevTriggerRef = useRef<number | undefined>(animationTrigger);

  // When animationTrigger changes, count up dynamically from 0 to target percentage
  useEffect(() => {
    if (animationTrigger !== undefined && animationTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = animationTrigger;
      let startTimestamp: number | null = null;
      const duration = 650; // ms
      const target = clamped;

      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const elapsed = timestamp - startTimestamp;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutCubic curve
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayPct(Math.round(eased * target));
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayPct(target);
        }
      };

      setDisplayPct(0);
      const animId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animId);
    } else {
      setDisplayPct(clamped);
    }
  }, [animationTrigger, clamped]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayPct / 100) * circumference;

  const filterId = `neonGlow_${Math.random().toString(36).substring(2, 7)}`;
  const gradId = `cyanGrad_${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={glowColor} floodOpacity="0.6" />
          </filter>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Track Background Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          className="opacity-70"
        />

        {/* Dynamic Neon Cyan Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter={`url(#${filterId})`}
          className="transition-all duration-300 ease-out"
        />
      </svg>

      {/* Central Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] leading-none font-mono">
          {displayPct}%
        </span>
        <span
          className="text-[9px] font-black tracking-widest uppercase mt-1 transition-colors"
          style={{ color: glowColor }}
        >
          Completado
        </span>
      </div>
    </div>
  );
}
