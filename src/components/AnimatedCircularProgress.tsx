import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentageText?: boolean;
  color?: string;
  trackColor?: string;
  textSizeClass?: string;
}

export function AnimatedCircularProgress({
  percentage,
  size = 52,
  strokeWidth = 4.5,
  className = '',
  showPercentageText = true,
  color,
  trackColor,
  textSizeClass
}: AnimatedCircularProgressProps) {
  const clampedPercentage = Math.max(0, Math.min(100, Math.round(isNaN(percentage) ? 0 : percentage)));
  const [displayValue, setDisplayValue] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(0);

  // Animate numeric count-up on mount and percentage changes
  useEffect(() => {
    startValueRef.current = displayValue;
    startTimeRef.current = null;
    const duration = 750; // ms

    const animateCount = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValueRef.current + (clampedPercentage - startValueRef.current) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateCount);
      } else {
        setDisplayValue(clampedPercentage);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateCount);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [clampedPercentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Active stroke color: default Emerald #10B981
  const activeColor = color || (clampedPercentage === 100 ? '#10B981' : clampedPercentage > 0 ? '#10B981' : '#94A3B8');

  // Dynamic text size if not provided
  const computedTextClass = textSizeClass || (size >= 70 ? 'text-base font-black' : size >= 50 ? 'text-xs font-black' : 'text-[10px] font-bold');

  return (
    <div
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ overflow: 'visible' }}
      >
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          strokeWidth={strokeWidth}
          className={trackColor ? '' : 'stroke-slate-200 dark:stroke-slate-800'}
          style={trackColor ? { stroke: trackColor } : undefined}
        />

        {/* Animated Emerald Progress Stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease'
          }}
        />
      </svg>

      {/* Centered Percentage Text */}
      {showPercentageText && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className={`font-mono text-slate-900 dark:text-white leading-none ${computedTextClass}`}>
            {displayValue}%
          </span>
        </div>
      )}
    </div>
  );
}
