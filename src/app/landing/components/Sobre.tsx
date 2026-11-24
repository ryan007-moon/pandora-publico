import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { indicadores } from '@/lib/campus';
import AppImage from '@/components/ui/AppImage';
import Reveal from '@/app/landing/components/Reveal';
import RevealImagem from '@/app/landing/components/RevealImagem';
import Contador from '@/app/landing/components/Contador';

/**
 * Seção institucional (fictícia) "O Portal": fotografia em recorte suave
 * (rounded-3xl) com selo escuro flutuante, texto à esquerda e indicadores
 * em painéis arredondados. Revelação da foto por máscara (RevealImagem).
 */
export default function Sobre() {
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="atmosphere-section scroll-mt-24 bg-[var(--p-color-0d0f0e)]/[0.78] text-[var(--p-color-f4efe4)]">
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
          <Reveal>
            <h2 id="sobre-title" className="text-display-lg max-w-xl text-balance">
              Um lugar para <em className="display-em text-primary">aprender e explorar.</em>
            </h2>
            <div className="mt-6 max-w-xl space-y-5 text-[15px] leading-relaxed text-[var(--p-color-b4ae9f)] sm:text-base">
              <p>
                A Pandora School reúne a apresentação do campus e um portal acadêmico
                para consultar disciplinas, acompanhar notas e organizar atividades.
                A navegação foi pensada para funcionar do celular ao computador.
              </p>
              <p>
                Os espaços apresentados são parte de um projeto acadêmico demonstrativo.
                No mapa, é possível explorar os ambientes e simular rotas;
                no portal, consultar os recursos de estudo e sua organização.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/cursos"
                className="link-underline inline-flex items-center gap-1 text-sm font-bold text-[var(--p-color-f4efe4)]"
              >
                Conhecer as disciplinas do portal
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <span className="font-mono-data text-[11px] text-[var(--p-color-b4ae9f)]">
                Projeto acadêmico demonstrativo
              </span>
            </div>
          </Reveal>

          <RevealImagem className="relative">
            {/* Fotografia em recorte suave (raio 28px) */}
            <div className="img-editorial relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[var(--p-color-e8e1d0)]">
              <AppImage
                src="/assets/images/landing-sobre.jpg"
                alt="Grupo de estudantes em mesa de estudo com laptops, em sala de convivência"
                fill
                sizes="(max-width: 1024px) 100vw, 600px"
                className="object-cover"
              />
            </div>
            {/* Selo flutuante (decorativo) cruzando o recorte */}
            <div className="absolute -left-2 bottom-6 sm:-left-6">
              <div className="flex items-center gap-3 rounded-2xl border border-black/40 bg-[var(--p-color-0d0d0d)] px-5 py-4 text-[var(--p-color-f4efe4)] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.55)]">
                <svg viewBox="0 0 48 48" className="h-8 w-8 shrink-0" aria-hidden="true" focusable="false">
                  <path
                    className="spark-stroke"
                    d="M24 3.5 C26.2 15.8 32.2 21.8 44.5 24 C32.2 26.2 26.2 32.2 24 44.5 C21.8 32.2 15.8 26.2 3.5 24 C15.8 21.8 21.8 15.8 24 3.5 Z"
                  />
                </svg>
                <div>
                  <p className="font-display text-sm font-bold leading-tight">Visão ilustrativa do campus</p>
                  <p className="font-mono-data mt-0.5 text-[10px] uppercase tracking-[0.16em] text-white/55">
                    Fotografia ilustrativa
                  </p>
                </div>
              </div>
            </div>
          </RevealImagem>
        </div>

        {/* Indicadores demonstrativos em painéis suaves */}
        <Reveal stagger className="mt-16 grid grid-cols-2 gap-4 sm:mt-20 sm:gap-5 lg:grid-cols-4">
          {indicadores.map((item) => (
            <Contador
              key={item.rotulo}
              valor={item.valor}
              decimais={item.decimais}
              sufixo={item.sufixo}
              rotulo={item.rotulo}
              detalhe={item.detalhe}
            />
          ))}
        </Reveal>
        <p className="plate-caption mt-8 text-[var(--p-color-b4ae9f)]">
          Conheça nossa visão de uma experiência acadêmica integrada.
        </p>
      </div>
    </section>
  );
}
