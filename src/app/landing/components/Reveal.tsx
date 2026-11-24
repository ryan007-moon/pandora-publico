'use client';

import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

gsap.registerPlugin(ScrollTrigger);

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Quando true, anima em cascata os filhos marcados com data-reveal. */
  stagger?: boolean;
  /** Deslocamento vertical inicial (px). */
  y?: number;
  delay?: number;
}

/**
 * Revelação progressiva no scroll (GSAP ScrollTrigger, once).
 * Se o usuário prefere movimento reduzido (sistema ou ajuste manual no portal),
 * o conteúdo é exibido sem animação. O conteúdo já nasce visível no HTML do servidor;
 * o GSAP só o oculta após a hidratação.
 */
export default function Reveal({ children, className, stagger = false, y = 28, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefereMenosMovimento()) return;

    const ctx = gsap.context(() => {
      const alvos = stagger ? el.querySelectorAll('[data-reveal]') : el;
      gsap.fromTo(
        alvos,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          stagger: stagger ? 0.08 : 0,
          ease: 'expo.out',
          clearProps: 'opacity,transform',
          scrollTrigger: { trigger: el, start: 'top 82%', once: true },
        }
      );
    }, el);

    // Movimento reduzido ativado durante a visita: devolve o conteúdo ao estado visível.
    const limparOuvinte = ouvirMudancaMovimento(() => {
      if (prefereMenosMovimento()) ctx.revert();
    });

    return () => {
      limparOuvinte();
      ctx.revert();
    };
  }, [stagger, y, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
