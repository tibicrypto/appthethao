'use client';

import React, { useEffect, useState } from 'react';
import styles from './SVGRingProgress.module.css';

interface SVGRingProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  unit?: string;
  glow?: boolean;
}

export default function SVGRingProgress({
  value,
  max = 100,
  size = 160,
  strokeWidth = 12,
  color = 'var(--color-cyan)',
  unit = '%',
  glow = true
}: SVGRingProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Delay animation slightly for mounting effect
    const t = setTimeout(() => {
      setAnimatedValue(Math.min(value, max));
    }, 100);
    return () => clearTimeout(t);
  }, [value, max]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedValue / max) * circumference;

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg className={styles.svg} width={size} height={size}>
        {/* Background Circle */}
        <circle
          className={styles.backgroundCircle}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        
        {/* Glow Shadow Ring */}
        {glow && (
          <circle
            className={styles.glowCircle}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            fill="transparent"
          />
        )}

        {/* Progress Ring */}
        <circle
          className={styles.progressCircle}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
        />
      </svg>
      
      {/* Central Labels */}
      <div className={styles.textContainer}>
        <span className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
      </div>
    </div>
  );
}
