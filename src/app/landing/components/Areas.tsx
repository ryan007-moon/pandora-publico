'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { areas } from '@/lib/campus';
import { disciplinas } from '@/lib/data';
import AppImage from '@/components/ui/AppImage';
import Reveal from '@/app/landing/components/Reveal';
import Diferenciais from '@/app/landing/components/Diferenciais';

/**
 * Áreas de conhecimento (fictícias) como índice do portal: linhas numeradas
 * com miniatura fotográfica em recorte suave — no hover/foco a miniatura
 * aproxima e o ouro acende. A informação essencial está na própria linha e
 * a navegação funciona por teclado; as miniaturas são decorativas (alt vazio).
 * Cada linha leva ao portal do aluno (/cursos).
 */
export default function Areas() {
  return (
    <section
      id="areas"
      aria-labelledby="areas-title"
      className="knowledge-areas atmosphere-section scroll-mt-24 rounded-t-[40px] bg-[var(--p-color-0d0d0d)] text-[var(--p-color-f4efe4)]"
    >
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="areas-title"
                className="text-display-lg max-w-2xl text-balance text-white"
              >
                Cinco áreas, <em className="display-em text-primary">diferentes caminhos.</em>
              </h2>
            </div>
            <Link
              href="/cursos"
              className="pill link-underline inline-flex items-center gap-1 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white"
            >
              Ver disciplinas no portal
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>

        {/* Índice de áreas: linha = miniatura + texto + seta */}
        <Reveal stagger>
          <ul className="m-0 list-none space-y-2 p-0">
            {areas.map((area) => (
              <li key={area.id} data-reveal>
                <Link
                  href="/cursos"
                  aria-label={`Área de ${area.nome} — ver disciplinas no portal`}
                  className="group grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-5 rounded-3xl px-2 py-5 text-[var(--p-color-f4efe4)] transition-colors duration-500 hover:bg-white/[0.05] sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-x-8 sm:py-6"
                >
                  {/* Miniatura arredondada (decorativa) */}
                  <span className="img-editorial relative block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--p-color-151513)]">
                    <AppImage
                      src={area.imagem}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 88px, 144px"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
                    />
                  </span>

                  <span className="min-w-0">
                    <span
                      aria-hidden="true"
                      className="font-mono-data tabular block text-xs text-white/40 transition-colors duration-500 group-hover:text-primary sm:text-sm"
                    >
                      {area.numero}
                    </span>
                    <span className="font-display mt-1.5 block text-[1.55rem] font-semibold leading-tight text-white sm:text-4xl">
                      {area.nome}
                    </span>
                    <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-white/60">
                      {area.descricao}
                    </span>
                    <span className="mt-3 flex flex-wrap gap-2">
                      {area.topicos.map((topico) => (
                        <span
                          key={topico}
                          className="font-mono-data rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/50 transition-colors duration-500 group-hover:border-white/30 group-hover:text-white/75"
                        >
                          {topico}
                        </span>
                      ))}
                    </span>
                  </span>

                  <ArrowUpRight
                    size={24}
                    aria-hidden="true"
                    className="justify-self-end text-white/35 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}

            {/* Fecho do índice: painel-portal de entrada ao aluno */}
            <li data-reveal className="pt-6">
              <Link
                href="/cursos"
                className="group grid grid-cols-1 gap-5 rounded-[40px] border border-primary/40 bg-primary/[0.06] p-7 transition-colors duration-500 hover:bg-primary/[0.12] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-9"
              >
                <span>
                  <span className="font-display block text-[1.6rem] font-semibold leading-tight text-white sm:text-3xl">
                    O portal reúne as{' '}
                    <em className="display-em text-primary">{disciplinas.length} disciplinas do semestre.</em>
                  </span>
                  <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-white/70">
                    Confira as ementas, os indicadores demonstrativos e as atividades
                    organizadas por disciplina.
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-primary px-6 py-3.5 text-sm font-extrabold text-primary-foreground shadow-gold sm:self-center">
                  Ver disciplinas
                  <ArrowUpRight
                    size={18}
                    aria-hidden="true"
                    className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          </ul>
        </Reveal>

        {/* Diferenciais institucionais (fictícios) */}
        <Diferenciais />
      </div>
    </section>
  );
}
