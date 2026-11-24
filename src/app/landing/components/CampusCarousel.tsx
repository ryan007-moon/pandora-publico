'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import { slidesCampus } from '@/lib/campus';
import AppImage from '@/components/ui/AppImage';
import { useSlideRotation } from '@/hooks/useSlideRotation';
import Reveal from '@/app/landing/components/Reveal';

const INTERVALO = 7000;

/**
 * Carrossel institucional "A vida no campus".
 * Mesma mecânica do HeroCarousel do portal (hook compartilhado useSlideRotation):
 * autoplay com barra de progresso, setas, indicadores, swipe e teclado.
 */
export default function CampusCarousel() {
  const total = slidesCampus.length;
  const { index, ciclo, reduce, rodando, paused, setPaused, goTo, next, prev, hoverProps, keyboardProps, pointerProps } =
    useSlideRotation(total, INTERVALO);
  const atual = slidesCampus[index];

  return (
    <section aria-labelledby="vida-campus-title" className="campus-gallery atmosphere-section bg-[var(--p-color-0d0d0d)] text-[var(--p-color-f4efe4)]">
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 pb-20 pt-20 sm:px-8 sm:pt-24 lg:px-12">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="vida-campus-title" className="text-display-lg max-w-2xl text-balance text-white">
                A vida no campus, em movimento.
              </h2>
            </div>
            <p className="font-mono-data max-w-xs text-xs leading-relaxed text-white/50">
              Use as setas ou arraste para descobrir novos espaços do campus.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <section
            {...hoverProps}
            {...keyboardProps}
            aria-roledescription="carrossel"
            aria-label="Imagens e espaços do campus"
            className="relative isolate overflow-hidden rounded-[32px] border border-white/15 bg-[var(--p-color-151513)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
          >
            <div
              tabIndex={0}
              role="group"
              aria-label="Use as setas do teclado ou arraste para trocar de espaço"
              {...pointerProps}
              className="relative h-[62svh] max-h-[640px] min-h-[420px] touch-pan-y select-none"
            >
              {slidesCampus.map((slide, i) => {
                const ativo = i === index;
                return (
                  <div
                    key={slide.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} de ${total}: ${slide.titulo}`}
                    aria-hidden={!ativo}
                    data-active={ativo ? 'true' : 'false'}
                    className={`campus-gallery-slide absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${
                      ativo ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                  >
                    <AppImage
                      src={slide.imagem}
                      alt={slide.alt}
                      fill
                      sizes="(max-width: 1400px) 100vw, 1350px"
                      quality={75}
                      loading={ativo || i === (index + 1) % total ? "eager" : "lazy"}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" aria-hidden="true" />
                  </div>
                );
              })}

              {/* Legenda do slide ativo */}
              <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-24 sm:p-8 sm:pb-24 lg:p-10">
                <div key={`legenda-${index}`} style={{ animation: 'hero-in 0.8s var(--ease-out-expo)' }}>
                  <h3 className="font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
                    {atual.titulo}
                  </h3>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:text-[15px]">{atual.legenda}</p>
                </div>
              </div>

              {/* Barra de controle */}
              <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-white/15 bg-black/45 px-4 py-3 backdrop-blur-sm sm:px-6">
                <div role="tablist" aria-label="Escolher espaço do campus" className="flex flex-1 items-center gap-2 sm:gap-3">
                  {slidesCampus.map((slide, i) => {
                    const ativo = i === index;
                    return (
                      <button
                        key={`tab-${slide.id}`}
                        type="button"
                        role="tab"
                        aria-selected={ativo}
                        aria-label={`Ir para ${slide.kicker}`}
                        onClick={() => goTo(i)}
                        className="group relative flex-1 py-2 text-left"
                      >
                        <span className="relative block h-[3px] overflow-hidden bg-white/25">
                          <span
                            key={ativo ? `bar-${ciclo}` : `bar-off-${i}`}
                            className="absolute inset-0 origin-left bg-primary"
                            style={
                              ativo
                                ? reduce
                                  ? { transform: 'scaleX(1)' }
                                  : {
                                      animation: `progress-fill ${INTERVALO}ms linear forwards`,
                                      animationPlayState: rodando ? 'running' : 'paused',
                                    }
                                : { transform: i < index ? 'scaleX(1)' : 'scaleX(0)' }
                            }
                          />
                        </span>
                        <span
                          className={`font-mono-data mt-2 hidden text-[10.5px] uppercase tracking-wider transition-colors sm:block ${
                            ativo ? 'text-white' : 'text-white/50 group-hover:text-white/80'
                          }`}
                        >
                          0{i + 1} · {slide.kicker}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    disabled={reduce}
                    aria-label={reduce ? 'Movimento reduzido ativado' : paused ? 'Retomar rotação automática' : 'Pausar rotação automática'}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-white"
                  >
                    {paused || reduce ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={prev}
                    aria-label="Espaço anterior"
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white transition-all hover:-translate-x-0.5 hover:bg-primary hover:text-black"
                  >
                    <ArrowLeft size={17} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    aria-label="Próximo espaço"
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/30 text-white transition-all hover:translate-x-0.5 hover:bg-primary hover:text-black"
                  >
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {`Espaço ${index + 1} de ${total}: ${atual.titulo}`}
        </p>
      </div>
    </section>
  );
}
