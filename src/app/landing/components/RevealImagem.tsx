'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

gsap.registerPlugin(ScrollTrigger);

interface RevealImagemProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Revelação de imagem por máscara (clip-path inset) no scroll —
 * a fotografia "abre" de cima para baixo como uma gravura de publicação.
 * O conteúdo nasce visível no HTML; o GSAP oculta e revela após a hidratação.
 * Sem movimento preferido: sem máscara, imagem sempre visível.
 */
export default function RevealImagem({ children, className, delay = 0 }: RevealImagemProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const element: HTMLDivElement = el;
    let ctx: gsap.Context | undefined;
    function setup() {
      ctx?.revert();
      ctx = undefined;
      if (prefereMenosMovimento() || document.documentElement.dataset.palette === 'fiap') return;
      ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1.25,
          delay,
          ease: 'expo.out',
          clearProps: 'clipPath',
          scrollTrigger: { trigger: element, start: 'top 82%', once: true },
        }
      );
      }, element);
    }
    setup();
    const limparOuvinte = ouvirMudancaMovimento(setup);
    window.addEventListener('pandora:palette', setup);
    return () => {
      limparOuvinte();
      window.removeEventListener('pandora:palette', setup);
      ctx?.revert();
    };
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
