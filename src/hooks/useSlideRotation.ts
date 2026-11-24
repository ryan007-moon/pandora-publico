'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

export interface SlideRotation {
  index: number;
  ciclo: number;
  reduce: boolean;
  rodando: boolean;
  paused: boolean;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  goTo: (i: number) => void;
  next: () => void;
  prev: () => void;
  hoverProps: { onMouseEnter: () => void; onMouseLeave: () => void };
  keyboardProps: { onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void };
  pointerProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: () => void;
  };
}

/**
 * Motor único para carrosséis do portal e do hall. A barra de progresso e o
 * temporizador recomeçam juntos após pausa, hover ou volta à aba.
 */
export function useSlideRotation(total: number, intervalMs: number): SlideRotation {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [reduce, setReduce] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [ciclo, setCiclo] = useState(0);
  const inicio = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const sincronizar = () => setReduce(prefereMenosMovimento());
    sincronizar();
    return ouvirMudancaMovimento(sincronizar);
  }, []);

  useEffect(() => {
    const sincronizar = () => setOculto(document.hidden);
    sincronizar();
    document.addEventListener('visibilitychange', sincronizar);
    return () => document.removeEventListener('visibilitychange', sincronizar);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (total < 1) return;
      setIndex(((i % total) + total) % total);
      setCiclo((c) => c + 1);
    },
    [total]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const rodando = !paused && !hover && !reduce && !oculto && total > 1;
  const rodava = useRef(rodando);

  useEffect(() => {
    // Ao retomar, a barra não pode continuar do meio se o timer inicia cheio.
    if (rodando && !rodava.current) setCiclo((c) => c + 1);
    rodava.current = rodando;
  }, [rodando]);

  useEffect(() => {
    if (!rodando) return;
    const timer = window.setTimeout(() => goTo(index + 1), intervalMs);
    return () => window.clearTimeout(timer);
  }, [rodando, index, ciclo, goTo, intervalMs]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(total - 1);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!e.isPrimary) return;
    inicio.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!inicio.current) return;
    const dx = e.clientX - inicio.current.x;
    const dy = e.clientY - inicio.current.y;
    inicio.current = null;
    // Arraste predominantemente horizontal: não captura a rolagem da página.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      goTo(index + (dx < 0 ? 1 : -1));
    }
  };
  const onPointerCancel = () => {
    inicio.current = null;
  };

  return {
    index, ciclo, reduce, rodando, paused, setPaused, goTo, next, prev,
    hoverProps: { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) },
    keyboardProps: { onKeyDown },
    pointerProps: { onPointerDown, onPointerUp, onPointerCancel },
  };
}
