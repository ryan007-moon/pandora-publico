import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { acessibilidade } from '@/lib/campus';
import Reveal from '@/app/landing/components/Reveal';

/**
 * Compromisso com acessibilidade: linhas de um índice de compromissos
 * (implementado vs. planejado, marcados por texto e não apenas cor),
 * fechado por um bloco escuro que aponta para a Central de Acessibilidade.
 */
export default function Acessibilidade() {
  return (
    <section
      id="acessibilidade"
      aria-labelledby="acessibilidade-title"
      className="atmosphere-section scroll-mt-24 border-t border-white/15 bg-[var(--p-color-0d0f0e)]/[0.78] text-[var(--p-color-f4efe4)]"
    >
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h2 id="acessibilidade-title" className="text-display-lg max-w-2xl text-balance">
                Um campus digital que <em className="display-em text-primary">todo mundo usa.</em>
              </h2>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--p-color-b4ae9f)] sm:text-base">
                Acessibilidade aqui não é selo: é critério de construção. Confira o que já está ativo
                neste site e o que entra em etapas futuras.
              </p>
            </div>
            <span className="pill font-mono-data bg-white/[0.055] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[var(--p-color-b4ae9f)]">
              WCAG como referência de projeto
            </span>
          </div>
        </Reveal>

        <Reveal stagger>
          <ul className="m-0 mt-12 list-none p-0">
            {acessibilidade.map((item) => {
              const implementado = item.status === 'implementado';
              return (
                <li key={item.id} data-reveal className="accessibility-row index-row text-[var(--p-color-f4efe4)]">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-2 py-7 pr-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:items-baseline">
                    <h3 className="font-display text-xl font-semibold sm:text-2xl">
                      <span aria-hidden="true" className={`mr-3 inline-block ${implementado ? 'text-[var(--p-color-2f6b3a)]' : 'text-[var(--p-color-9a5b00)]'}`}>
                        {implementado ? '✓' : '◌'}
                      </span>
                      {item.titulo}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--p-color-b4ae9f)]">{item.descricao}</p>
                    <p
                      className={`font-mono-data text-[10px] uppercase tracking-[0.16em] ${
                        implementado ? 'text-[var(--p-color-2f6b3a)]' : 'text-[var(--p-color-9a5b00)]'
                      }`}
                    >
                      {item.detalhe}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {/* Bloco de fecho: convite à Central de Acessibilidade */}
        <Reveal className="mt-12">
          <article className="flex flex-col justify-between rounded-[40px] bg-[var(--p-color-111111)] p-6 text-[var(--p-color-f4efe4)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.6)] sm:p-10">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
              <div>
                <h3 className="font-display max-w-md text-2xl font-semibold leading-tight sm:text-3xl">
                  Se algo travar para você, isso é um defeito nosso.
                </h3>
              </div>
              <div className="flex flex-col justify-between gap-6">
                <p className="text-sm leading-relaxed text-white/70">
                  Teclado quebrado, foco perdido, animação intrusiva: relate. Seu relato ajuda a identificar barreiras e orientar melhorias de navegação e acessibilidade.
                </p>
                <div>
                  <Link
                    href="/acessibilidade"
                    title="Abrir a Central de Acessibilidade do portal"
                    className="btn-sweep inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-extrabold text-primary-foreground shadow-gold"
                  >
                    Central de Acessibilidade
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  <p className="font-mono-data mt-6 text-[10px] uppercase tracking-[0.16em] text-white/50">
                    ajustes de fonte, movimento, contraste e tema · salvos no seu navegador
                  </p>
                </div>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
