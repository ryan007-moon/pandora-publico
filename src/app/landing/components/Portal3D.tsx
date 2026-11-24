'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

/**
 * PORTAL DE PANDORA — momento 3D principal da capa.
 * Giroscópio de três anéis (ouro · osso · grafite) construído com 3D nativo
 * de CSS (perspective + preserve-3d): sem bibliotecas 3D e sem modelos
 * pesados — o objeto inteiro é geometria e luz da própria marca.
 *
 * - Rotação contínua via CSS (@keyframes portal-orbit): funciona até sem JS.
 * - Arraste por ponteiro (mouse/toque) inclina o conjunto em tempo real.
 * - Botões acessíveis giram o portal por teclado — alternativa ao arraste
 *   exigida por WCAG 2.2 (2.5.7: funcionalidade por arrastar tem alternativa).
 * - Movimento reduzido (sistema ou Central de Acessibilidade): a rotação
 *   automática é desligada pelo CSS (html.motion-off + prefers-reduced-motion);
 *   o arraste permanece, por ser movimento iniciado pela própria pessoa.
 * - A cena é decorativa (aria-hidden): nenhum conteúdo essencial vive no 3D.
 */
export default function Portal3D() {
  const cenaRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const estado = useRef({ rotX: -16, rotY: 22, arrastando: false, px: 0, py: 0 });

  /** Aplica a inclinação atual do arraste ao contêiner do giroscópio. */
  const aplicar = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    const { rotX, rotY, arrastando } = estado.current;
    el.style.transition = arrastando ? 'none' : 'transform 0.7s var(--ease-out-expo)';
    el.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }, []);

  // Arraste por ponteiro (mouse e toque). `touch-action: pan-y` preserva a
  // rolagem vertical da página e captura apenas os arrastes horizontais.
  useEffect(() => {
    const cena = cenaRef.current;
    if (!cena) return;
    const st = estado.current;

    const aoBaixar = (e: PointerEvent) => {
      st.arrastando = true;
      st.px = e.clientX;
      st.py = e.clientY;
      try {
        cena.setPointerCapture(e.pointerId);
      } catch {
        /* captura opcional */
      }
      cena.classList.add('cursor-grabbing');
      aplicar();
    };
    const aoMover = (e: PointerEvent) => {
      if (!st.arrastando) return;
      st.rotY += (e.clientX - st.px) * 0.42;
      st.rotX = Math.min(24, Math.max(-62, st.rotX + (e.clientY - st.py) * 0.3));
      st.px = e.clientX;
      st.py = e.clientY;
      aplicar();
    };
    const aoSoltar = (e: PointerEvent) => {
      if (!st.arrastando) return;
      st.arrastando = false;
      cena.classList.remove('cursor-grabbing');
      try {
        if (cena.hasPointerCapture(e.pointerId)) cena.releasePointerCapture(e.pointerId);
      } catch {
        /* captura opcional */
      }
      aplicar();
    };

    cena.addEventListener('pointerdown', aoBaixar);
    cena.addEventListener('pointermove', aoMover);
    cena.addEventListener('pointerup', aoSoltar);
    cena.addEventListener('pointercancel', aoSoltar);
    return () => {
      cena.removeEventListener('pointerdown', aoBaixar);
      cena.removeEventListener('pointermove', aoMover);
      cena.removeEventListener('pointerup', aoSoltar);
      cena.removeEventListener('pointercancel', aoSoltar);
    };
  }, [aplicar]);

  // Se "reduzir movimento" for ativado durante a visita, interrompe o arraste.
  useEffect(() => {
    return ouvirMudancaMovimento(() => {
      if (prefereMenosMovimento()) estado.current.arrastando = false;
    });
  }, []);

  /** Giro incremental (botões acessíveis). */
  const girar = (graus: number) => {
    estado.current.rotY += graus;
    aplicar();
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      {/* Cena 3D — decorativa, ignorada por leitores de tela */}
      <div
        ref={cenaRef}
        aria-hidden="true"
        className="portal-scene relative aspect-square w-full max-w-[520px] cursor-grab touch-pan-y select-none"
      >
        {/* Órbita externa pontilhada */}
        <div className="portal-dash" />

        {/* Giroscópio: inclinação (arraste) → rotação contínua (CSS) → anéis */}
        <div ref={tiltRef} className="portal-tilt absolute inset-0">
          <div className="portal-auto absolute inset-0">
            {/* Anel ouro — trilho externo */}
            <div
              className="portal-plane"
              style={{
                width: '100%',
                height: '100%',
                borderWidth: 14,
                borderColor: 'var(--primary)',
                boxShadow:
                  '0 0 34px rgba(var(--p-rgb-242-184-36),0.22), inset 0 0 22px rgba(var(--p-rgb-138-98-0),0.35)',
                transform: 'rotateX(74deg)',
              }}
            >
              <div className="portal-orbiter" data-ritmo="rapido">
                <span className="portal-bead" />
              </div>
            </div>

            {/* Anel osso — plano intermediário */}
            <div
              className="portal-plane"
              style={{
                width: '76%',
                height: '76%',
                borderWidth: 8,
                borderColor: 'rgba(var(--p-rgb-244-239-228),0.9)',
                transform: 'rotateY(56deg) rotateX(64deg)',
              }}
            >
              <div className="portal-orbiter">
                <span
                  className="portal-bead"
                  style={{ top: -6, width: 12, height: 12, marginLeft: -6 }}
                />
              </div>
            </div>

            {/* Anel grafite — plano interno */}
            <div
              className="portal-plane"
              style={{
                width: '54%',
                height: '54%',
                borderWidth: 11,
                borderColor: 'var(--p-color-1c1c1a)',
                boxShadow: '0 0 0 1px rgba(var(--p-rgb-244-239-228),0.2)',
                transform: 'rotateY(-44deg) rotateX(78deg)',
              }}
            >
              <div className="portal-orbiter" data-ritmo="lento">
                <span
                  className="portal-bead"
                  style={{ top: -7, width: 14, height: 14, marginLeft: -7 }}
                />
              </div>
            </div>
          </div>

          {/* Selo central com o glifo spark da marca */}
          <div className="portal-core">
            <svg viewBox="0 0 48 48" className="h-1/2 w-1/2" focusable="false">
              <path
                d="M24 3.5 C26.2 15.8 32.2 21.8 44.5 24 C32.2 26.2 26.2 32.2 24 44.5 C21.8 32.2 15.8 26.2 3.5 24 C15.8 21.8 21.8 15.8 24 3.5 Z"
                fill="none"
                stroke="var(--p-color-0d0d0d)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Sombra de apoio */}
        <div className="portal-shadow" />
      </div>

      {/* Alternativa por teclado ao arraste (WCAG 2.2) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => girar(-30)}
          aria-label="Girar o portal para a esquerda"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white/80 transition-colors duration-300 hover:border-primary hover:text-primary"
        >
          <RotateCcw size={17} aria-hidden="true" />
        </button>
        <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/45">
          Arraste ou use os botões para girar o portal
        </p>
        <button
          type="button"
          onClick={() => girar(30)}
          aria-label="Girar o portal para a direita"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/25 text-white/80 transition-colors duration-300 hover:border-primary hover:text-primary"
        >
          <RotateCw size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
