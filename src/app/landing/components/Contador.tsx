'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefereMenosMovimento } from '@/lib/movimento';

gsap.registerPlugin(ScrollTrigger);

interface ContadorProps {
  valor: number;
  decimais?: number;
  sufixo?: string;
  rotulo: string;
  detalhe?: string;
}

function formatar(valor: number, decimais: number): string {
  const base = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
  return base;
}

/**
 * Número institucional animado ao entrar em vista (padrão da StatCard do portal,
 * com contagem GSAP). Sem movimento preferido, exibe o valor final direto.
 */
export default function Contador({ valor, decimais = 0, sufixo = '', rotulo, detalhe }: ContadorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(() => `${formatar(valor, decimais)}${sufixo}`);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefereMenosMovimento()) return;

    const ctx = gsap.context(() => {
      const contador = { v: 0 };
      gsap.to(contador, {
        v: valor,
        duration: 1.8,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        onUpdate: () => setDisplay(`${formatar(contador.v, decimais)}${sufixo}`),
        onComplete: () => setDisplay(`${formatar(valor, decimais)}${sufixo}`),
      });
    }, el);

    return () => ctx.revert();
  }, [valor, decimais, sufixo]);

  return (
    <div ref={ref} data-reveal className="rounded-2xl border border-white/15 bg-white/[0.055] backdrop-blur-md p-6 shadow-card">
      <p className="numeral-display tabular text-[var(--p-color-f4efe4)]">{display}</p>
      <p className="mt-3 text-sm font-bold text-[var(--p-color-f4efe4)]">{rotulo}</p>
      {detalhe ? <p className="mt-0.5 text-xs leading-relaxed text-[var(--p-color-b4ae9f)]">{detalhe}</p> : null}
    </div>
  );
}
