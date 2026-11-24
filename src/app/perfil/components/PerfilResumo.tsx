'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Accessibility, CalendarDays, GraduationCap, Hash, Mail, RefreshCw, Play, Pause } from 'lucide-react';
import { gsap } from 'gsap';
import type { PerfilValues } from '@/app/perfil/components/PerfilForm';
import { LOGO_WHITE, BRAND_NAME } from '@/lib/brand';
import { iniciaisDoNome } from '@/lib/data';
import AppImage from '@/components/ui/AppImage';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

interface PerfilResumoProps {
  perfil: PerfilValues;
  enrollmentCode?: string;
  enrollmentNumber?: string;
}

const LIMITE_GRAUS = 14;

/** Grade decorativa derivada da matrícula (determinística, aria-hidden). */
function gradeQr(matricula: string): boolean[] {
  const celulas: boolean[] = [];
  for (let i = 0; i < 49; i += 1) {
    const char = matricula.charCodeAt(i % matricula.length) || 7;
    celulas.push((char * (i + 3)) % 5 < 3);
  }
  return celulas;
}

/**
 * CARTEIRINHA ESTUDANTIL 2.0 — destaque do perfil, composição própria da
 * Pandora: logo em destaque, avatar com anel dourado, arcos do "Portal" como
 * fundo em profundidade, holograma e QR decorativos. Interações:
 * • Inclinação (ponteiro, arraste no toque e SETAS do teclado) com brilho de
 *   luz e sombra de chão que acompanham o ângulo — profundidade real via
 *   translateZ nas camadas (perspective + preserve-3d, CSS nativo).
 * • VIRAR (frente ↔ verso) pelo botão dedicado — GSAP anima a rotação sem
 *   ultrapassar o ângulo; no verso ficam validade, acessos e a nota de demonstração.
 * • Movimento reduzido (sistema ou Central): sem flutuação/entrada/holograma
 *   girando, inclinação desligada e o virar acontece sem animação. Nada
 *   essencial fica escondido: o verso é sempre alcançável pelo botão.
 */
export default function PerfilResumo({ perfil, enrollmentCode = 'Sem turma', enrollmentNumber = '—' }: PerfilResumoProps) {
  const cenaRef = useRef<HTMLDivElement>(null);
  const entradaRef = useRef<HTMLDivElement>(null);
  const sombraRef = useRef<HTMLDivElement>(null);
  const vaivemRef = useRef<HTMLDivElement>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const interacaoRef = useRef<HTMLDivElement>(null);

  const rot = useRef({ x: 0, y: 0 });
  const flip = useRef({ ang: 0 });
  const flipAlvo = useRef(0);
  const arrastando = useRef(false);
  const [virado, setVirado] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [motionChoice, setMotionChoice] = useState<'auto'|'enabled'|'disabled'>('auto');
  const motionRef = useRef<'auto'|'enabled'|'disabled'>('auto');
  function motionBlocked() {
    return motionRef.current === 'disabled' || (motionRef.current !== 'enabled' && prefereMenosMovimento());
  }
  function toggleMotion() {
    const next = motionBlocked() ? 'enabled' : 'disabled';
    motionRef.current = next;
    setMotionChoice(next);
  }

  function aplicar() {
    const el = elRef.current;
    if (!el) return;
    el.style.transform = `rotateX(${rot.current.x}deg) rotateY(${rot.current.y + flip.current.ang}deg)`;
    // Luz e sombra seguem o ângulo (luz de cima, deslocada contra a inclinação).
    el.style.setProperty('--gx', `${50 - rot.current.y * 2.6}%`);
    el.style.setProperty('--gy', `${26 + rot.current.x * 2}%`);
    const sombra = sombraRef.current;
    if (sombra) {
      sombra.style.transform = `translateX(${-rot.current.y * 2.2}px) scaleX(${1 - Math.abs(rot.current.y) / 90})`;
      sombra.style.opacity = `${0.9 - Math.abs(rot.current.x) / 60}`;
    }
  }

  function soltarAnimado() {
    arrastando.current = false;
    if (motionBlocked() || !elRef.current) {
      gsap.killTweensOf(rot.current);
      rot.current.x = 0;
      rot.current.y = 0;
      aplicar();
      return;
    }
    gsap.to(rot.current, {
      x: 0,
      y: 0,
      duration: 0.45,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: aplicar,
    });
  }

  function virar() {
    const alvo = flipAlvo.current === 180 ? 0 : 180;
    flipAlvo.current = alvo;
    setVirado(alvo === 180);
    soltarAnimado();
    gsap.killTweensOf(flip.current);
    if (motionBlocked() || !elRef.current) {
      flip.current.ang = alvo;
      aplicar();
      return;
    }
    gsap.to(flip.current, {
      ang: alvo,
      duration: 0.7,
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: aplicar,
    });
  }

  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (motionBlocked()) return;
    const el = interacaoRef.current;
    if (!el) return;
    // Mouse follows the cursor. Finger drags tilt without disabling native scroll.
    if (e.pointerType && e.pointerType !== 'mouse' && !arrastando.current) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // A superfície de entrada nunca gira: não há realimentação do transform.
    const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
    gsap.to(rot.current, {
      x: -y * ((!e.pointerType || e.pointerType === 'mouse') ? LIMITE_GRAUS : 9),
      y: x * ((!e.pointerType || e.pointerType === 'mouse') ? LIMITE_GRAUS : 9),
      duration: 0.24,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: aplicar,
    });
  }

  function onLeave(e: React.PointerEvent<HTMLElement>) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) return;
    soltarAnimado();
  }

  function onUp(e: React.PointerEvent<HTMLElement>) {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (e.pointerType && e.pointerType !== 'mouse') {
      arrastando.current = false;
      soltarAnimado();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const passos: Record<string, [number, number]> = {
      ArrowLeft: [0, -6],
      ArrowRight: [0, 6],
      ArrowUp: [6, 0],
      ArrowDown: [-6, 0],
    };
    const delta = passos[e.key];
    if (delta) {
      e.preventDefault();
      if (motionBlocked()) return;
      gsap.to(rot.current, {
        x: Math.max(-LIMITE_GRAUS, Math.min(LIMITE_GRAUS, rot.current.x + delta[0])),
        y: Math.max(-LIMITE_GRAUS, Math.min(LIMITE_GRAUS, rot.current.y + delta[1])),
        duration: 0.24,
        ease: 'power3.out',
        overwrite: true,
        onUpdate: aplicar,
      });
    } else if (e.key === 'Escape') {
      e.preventDefault();
      soltarAnimado();
    }
  }

  // Entrada coreografada: o cartão sobe, assenta com leve giro e uma varredura
  // de luz atravessa a frente uma única vez. Com movimento reduzido: nada disso.
  useEffect(() => {
    const update = () => { setReduced(prefereMenosMovimento()); };
    update();
    return ouvirMudancaMovimento(update);
  }, []);

  useEffect(() => {
    const rotacao = rot.current;
    const giro = flip.current;
    const ctx = gsap.context(() => {
      if (motionBlocked() || !entradaRef.current) return;
      const touchOnly = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      gsap.from(entradaRef.current, {
        opacity: 0,
        y: touchOnly ? 18 : 42,
        rotateX: touchOnly ? 0 : -14,
        rotateY: touchOnly ? 0 : -10,
        scale: touchOnly ? 0.98 : 0.95,
        duration: 1.1,
        ease: 'expo.out',
        clearProps: 'opacity,transform',
      });
      if (vaivemRef.current) {
        gsap.to(vaivemRef.current, {
          backgroundPosition: '-130% 0',
          duration: 1.5,
          delay: 1.0,
          ease: 'power2.inOut',
        });
      }
    }, cenaRef);
    if (motionBlocked()) {
      gsap.killTweensOf([rotacao, giro]);
      rotacao.x = rotacao.y = 0;
      giro.ang = flipAlvo.current;
      arrastando.current = false;
      aplicar();
    }
    return () => {
      ctx.revert();
      gsap.killTweensOf([rotacao, giro]);
      // Never leave a stopped flip halfway between the faces.
      giro.ang = flipAlvo.current;
      rotacao.x = rotacao.y = 0;
      aplicar();
    };
  }, [reduced, motionChoice]);

  const qr = gradeQr(enrollmentNumber);
  // Barras decorativas determinísticas a partir da matrícula (fictício).
  const barras = React.useMemo(() => {
    const itens: Array<{ x: number; w: number }> = [];
    let x = 2;
    for (const char of `${enrollmentNumber}2026`) {
      const code = char.charCodeAt(0) % 3;
      itens.push({ x, w: 4 + code * 2 });
      x += 6 + code * 2;
    }
    return itens;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const motionActive = motionChoice === 'enabled' || (motionChoice === 'auto' && !reduced);
  return (
    <div ref={cenaRef} className="carteira-cena" data-motion={motionChoice}>
      <div ref={entradaRef} className="relative pb-8">
        <div ref={sombraRef} className="carteira-sombra-chao" aria-hidden="true" />

        <div
          ref={interacaoRef}
          role="group"
          tabIndex={0}
          aria-label={`Carteirinha do aluno ${perfil.name}. Incline com o mouse, arraste horizontalmente no celular ou use as setas. Esc redefine o ângulo. O botão “Virar carteirinha” mostra o verso.`}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' || motionBlocked()) return;
            // Never forcibly capture touches: Safari must be able to scroll.
            arrastando.current = true;
          }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onLeave}
          onPointerCancel={soltarAnimado}
          onLostPointerCapture={soltarAnimado}
          onBlur={soltarAnimado}
          onKeyDown={onKeyDown}
          className="carteira-interacao relative rounded-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ring)]"
        >
          <div className="carteira-float">
            <div ref={elRef} className="carteira-tilt relative rounded-[32px]">
              {/* ---------- FRENTE ---------- */}
              <div
                aria-hidden={virado}
                style={{ WebkitBackfaceVisibility:'hidden', backfaceVisibility:'hidden', transform:'translateZ(0.5px)' }}
                className="carteira-face relative overflow-hidden rounded-[32px] border border-[var(--p-color-f4efe4)]/20 bg-[var(--p-color-0d0d0d)] p-6 text-[var(--p-color-f4efe4)] shadow-[0_44px_90px_-42px_rgba(0,0,0,0.75)] sm:p-7"
              >
                {/* Fundo: arcos do "Portal" em profundidade negativa (parallax no tilt). */}
                <div
                  aria-hidden="true"
                  className="carteira-camada pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full border border-primary/25"
                  style={{ transform: 'translateZ(-46px)' }}
                />
                <div
                  aria-hidden="true"
                  className="carteira-camada pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full border border-primary/40"
                  style={{ transform: 'translateZ(-30px)' }}
                />
                <div
                  aria-hidden="true"
                  className="carteira-camada pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full border border-[var(--p-color-f4efe4)]/10"
                  style={{ transform: 'translateZ(-38px)' }}
                />
                <div ref={vaivemRef} className="carteira-vaivem" aria-hidden="true" />
                <div className="carteira-brilho" aria-hidden="true" />

                {/* Topo: marca + selo + holograma */}
                <div
                  className="carteira-camada relative flex items-start justify-between gap-3"
                  style={{ transform: 'translateZ(34px)' }}
                >
                  <AppImage
                    src={LOGO_WHITE}
                    alt={`Logotipo ${BRAND_NAME}`}
                    width={300}
                    height={94}
                    className="h-10 w-auto object-contain"
                    priority
                  />
                  <div className="flex items-center gap-2">
                    <div
                      className="carteira-holo grid h-9 w-9 shrink-0 place-items-center rounded-full opacity-80 shadow-[inset_0_0_0_2px_rgba(var(--p-rgb-244-239-228),0.5)]"
                      aria-hidden="true"
                    >
                      <span className="h-3.5 w-3.5 rounded-full bg-[var(--p-color-0d0d0d)]/70" />
                    </div>
                    <span className="font-mono-data rounded-full bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground">
                      Matrícula ativa
                    </span>
                  </div>
                </div>

                {/* Identidade: avatar com anel dourado + nome em destaque */}
                <div
                  className="carteira-camada relative mt-7 flex items-center gap-5"
                  style={{ transform: 'translateZ(56px)' }}
                >
                  <div className="relative shrink-0">
                    <div
                      aria-hidden="true"
                      className="absolute -inset-1.5 rounded-full border border-primary/60"
                    />
                    <div className="font-display grid h-[86px] w-[86px] place-items-center rounded-full bg-primary text-[34px] font-semibold text-primary-foreground shadow-gold">
                      {iniciaisDoNome(perfil.name)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] opacity-60">
                      Estudante · {enrollmentCode}
                    </p>
                    <p className="font-display mt-1 truncate text-[34px] font-semibold leading-[1.05]">
                      {perfil.name}
                    </p>
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--p-color-f4efe4)]/20 bg-white/[0.05] px-3 py-1 text-xs font-semibold">
                      <GraduationCap size={13} className="text-primary" aria-hidden="true" />
                      {perfil.course}
                    </p>
                  </div>
                </div>

                {/* Dados essenciais em grade com hierarquia clara */}
                <dl
                  className="carteira-camada relative m-0 mt-7 grid grid-cols-1 gap-4 border-t border-[var(--p-color-f4efe4)]/15 pt-5 sm:grid-cols-2"
                  style={{ transform: 'translateZ(30px)' }}
                >
                  <div className="flex items-start gap-3">
                    <Hash size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="font-mono-data text-[10px] uppercase tracking-wider opacity-60">
                        Matrícula
                      </dt>
                      <dd className="tabular font-mono-data m-0 truncate text-base font-semibold">
                        {enrollmentNumber}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarDays
                      size={16}
                      className="mt-1 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <dt className="font-mono-data text-[10px] uppercase tracking-wider opacity-60">
                        Turma
                      </dt>
                      <dd className="m-0 truncate text-base font-semibold">{enrollmentCode}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:col-span-2">
                    <Mail size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <dt className="font-mono-data text-[10px] uppercase tracking-wider opacity-60">
                        E-mail acadêmico
                      </dt>
                      <dd className="m-0 truncate text-base font-semibold">{perfil.email}</dd>
                    </div>
                  </div>
                </dl>

                {/* Rodapé: indicadores + QR decorativo + virar */}
                <div
                  className="carteira-camada relative mt-6 flex flex-wrap items-end justify-between gap-4"
                  style={{ transform: 'translateZ(40px)' }}
                >
                  <div className="flex gap-3">
                    <div className="rounded-2xl border border-[var(--p-color-f4efe4)]/15 bg-white/[0.05] px-4 py-2.5">
                      <p className="font-mono-data text-[9.5px] uppercase tracking-wider opacity-60">
                        Vínculo
                      </p>
                      <p className="tabular font-display text-xl font-semibold text-primary">
                        {enrollmentNumber === '—' ? 'Pendente' : 'Ativo'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[var(--p-color-f4efe4)]/15 bg-white/[0.05] px-4 py-2.5">
                      <p className="font-mono-data text-[9.5px] uppercase tracking-wider opacity-60">
                        Formação
                      </p>
                      <p className="tabular font-display text-xl font-semibold text-primary">
                        {enrollmentCode}
                      </p>
                    </div>
                  </div>
                  <svg
                    width="70"
                    height="70"
                    viewBox="0 0 7 7"
                    aria-hidden="true"
                    className="shrink-0 opacity-80"
                  >
                    {qr.map((preenchido, i) =>
                      preenchido ? (
                        <rect
                          key={i}
                          x={i % 7}
                          y={Math.floor(i / 7)}
                          width="0.82"
                          height="0.82"
                          rx="0.14"
                          fill="var(--p-color-f4efe4)"
                          fillOpacity={0.9}
                        />
                      ) : null
                    )}
                  </svg>
                </div>

                <p
                  className="font-mono-data relative mt-4 text-[9.5px] uppercase tracking-[0.14em] opacity-40"
                  style={{ transform: 'translateZ(20px)' }}
                >
                  Interação por mouse ou teclado · identificação interna
                </p>
              </div>

              {/* ---------- VERSO ---------- */}
              <div
                aria-hidden={!virado}
                style={{ transform: 'rotateY(180deg) translateZ(0.5px)', WebkitBackfaceVisibility:'hidden', backfaceVisibility:'hidden' }}
                className="carteira-face absolute inset-0 overflow-y-auto overflow-x-hidden rounded-[32px] border border-[var(--p-color-f4efe4)]/20 bg-[var(--p-color-141414)] p-6 text-[var(--p-color-f4efe4)] shadow-[0_44px_90px_-42px_rgba(0,0,0,0.75)] sm:p-7"
              >
                <div className="carteira-brilho" aria-hidden="true" />
                <div
                  className="carteira-camada relative flex items-center justify-between gap-3"
                  style={{ transform: 'translateZ(26px)' }}
                >
                  <p className="eyebrow !text-primary">Verso · uso interno</p>
                  <span className="font-mono-data rounded-full border border-[var(--p-color-f4efe4)]/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">
                    Pandora ID
                  </span>
                </div>

                {/* Código de barras decorativo derivado da matrícula */}
                <div
                  className="carteira-camada relative mt-6 rounded-2xl border border-[var(--p-color-f4efe4)]/15 bg-white/[0.04] p-4"
                  style={{ transform: 'translateZ(18px)' }}
                >
                  <svg
                    viewBox="0 0 200 44"
                    aria-hidden="true"
                    className="h-11 w-full"
                    preserveAspectRatio="none"
                  >
                    {barras.map((barra, i) => (
                      <rect
                        key={i}
                        x={barra.x}
                        y="0"
                        width={barra.w}
                        height="44"
                        fill="var(--p-color-f4efe4)"
                        fillOpacity="0.85"
                      />
                    ))}
                  </svg>
                  <p className="font-mono-data mt-2 text-center text-[10px] uppercase tracking-[0.3em] opacity-60">
                    {enrollmentNumber}
                  </p>
                </div>

                <dl
                  className="carteira-camada relative m-0 mt-5 space-y-3.5 text-sm"
                  style={{ transform: 'translateZ(24px)' }}
                >
                  <div className="flex items-start gap-3">
                    <Accessibility
                      size={16}
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="font-mono-data text-[10px] uppercase tracking-wider opacity-60">
                        Acessibilidade no campus
                      </dt>
                      <dd className="m-0 leading-relaxed opacity-90">
                        Rotas sem escadas no mapa; rampas na biblioteca, no auditório e no centro de
                        convivência.
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <GraduationCap
                      size={16}
                      className="mt-0.5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="font-mono-data text-[10px] uppercase tracking-wider opacity-60">
                        Uso do cartão
                      </dt>
                      <dd className="m-0 leading-relaxed opacity-90">
                        Visualização da identificação acadêmica no portal. Os dados ficam neste dispositivo.
                      </dd>
                    </div>
                  </div>
                </dl>

                <div
                  className="carteira-camada relative mt-6 flex items-end justify-between gap-4 border-t border-[var(--p-color-f4efe4)]/15 pt-4"
                  style={{ transform: 'translateZ(16px)' }}
                >
                  <AppImage
                    src={LOGO_WHITE}
                    alt=""
                    width={220}
                    height={69}
                    className="h-8 w-auto object-contain opacity-50"
                  />
                  <p className="font-mono-data text-[9.5px] uppercase tracking-[0.14em] opacity-40">
                    Vinculada à conta acadêmica
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controle dedicado do flip: teclado, mouse e toque; anuncia o estado. */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={virar}
            aria-pressed={virado}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-input bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <RefreshCw size={15} aria-hidden="true" />
            {virado ? 'Ver a frente do cartão' : 'Virar carteirinha'}
          </button>
          <button type="button" onClick={toggleMotion} aria-pressed={motionActive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-input bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:border-primary">
            {motionActive ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
            {motionActive ? 'Pausar efeitos' : 'Ativar efeitos 3D'}
          </button>
        </div>
        {reduced && motionChoice !== 'enabled' && <p className="mt-2 text-center text-xs text-muted-foreground">Movimento reduzido ativo neste dispositivo. Você pode ativar somente os efeitos da carteirinha.</p>}
      </div>
    </div>
  );
}
