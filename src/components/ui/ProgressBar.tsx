'use client';

import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  value: number;
  label: string;
  tone?: 'gold' | 'ink';
}

// A barra preenche ao montar (transição CSS de largura) — micro-interação de entrada.
export default function ProgressBar({ value, label, tone = 'gold' }: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setWidth(value));
    return () => window.cancelAnimationFrame(id);
  }, [value]);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          tone === 'gold' ? 'bg-primary' : 'bg-foreground'
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}