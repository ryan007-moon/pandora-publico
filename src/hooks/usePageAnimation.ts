'use client';

import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

// ANIMAÇÃO GSAP 1 (entrada de página): anima todos os elementos [data-animate] do container.
// Usa gsap.context com escopo no container e reverte no desmonte (evita vazamento entre rotas).
export function usePageAnimation(containerRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (prefereMenosMovimento()) return;

    const context = gsap.context(() => {
      gsap.from('[data-animate]', {
        opacity: 0,
        y: 36,
        duration: 0.9,
        stagger: 0.08,
        ease: 'expo.out',
        clearProps: 'opacity,transform',
      });
    }, containerRef);

    // Se o usuário ativar movimento reduzido no meio da visita, reverte as animações.
    const limparOuvinte = ouvirMudancaMovimento(() => {
      if (prefereMenosMovimento()) context.revert();
    });

    return () => {
      limparOuvinte();
      context.revert();
    };
  }, [containerRef]);
}