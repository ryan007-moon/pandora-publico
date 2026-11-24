'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { prefereMenosMovimento } from '@/lib/movimento';

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint?: string;
  alert?: boolean;
  // Quando informado, o número é animado de 0 até este valor (contagem GSAP).
  countTo?: number;
  decimals?: number;
  suffix?: string;
}

// Componente reutilizável (requisito do documento). Contagem animada com GSAP quando entra na tela.
export default function StatCard({
  icon,
  value,
  label,
  hint,
  alert = false,
  countTo,
  decimals = 0,
  suffix = '',
}: StatCardProps) {
  const [display, setDisplay] = useState(value);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (countTo === undefined) return;
    if (prefereMenosMovimento()) return;
    const counter = { v: 0 };
    setDisplay(`${(0).toFixed(decimals).replace('.', ',')}${suffix}`);
    const tween = gsap.to(counter, {
      v: countTo,
      duration: 1.6,
      ease: 'power3.out',
      delay: 0.35,
      onUpdate: () => setDisplay(`${counter.v.toFixed(decimals).replace('.', ',')}${suffix}`),
      onComplete: () => setDisplay(value),
    });
    return () => {
      tween.kill();
    };
  }, [countTo, decimals, suffix, value]);

  return (
    <article
      ref={ref}
      data-animate
      className={`academic-stat group relative flex h-full flex-col justify-between gap-4 rounded-xl border p-5 transition-colors duration-200 ${
        alert
          ? 'border-primary/55 bg-card text-card-foreground'
          : 'border-border bg-card text-card-foreground hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {label}
        </span>
        <span
          className={` ${
            alert ? 'text-gold-dark' : 'text-muted-foreground'
          }`}
        >
          {icon}
        </span>
      </div>
      <div>
        <strong className="numeral-display tabular block">{display}</strong>
        {hint ? <span className="mt-2 block text-xs opacity-70">{hint}</span> : null}
      </div>
    </article>
  );
}
