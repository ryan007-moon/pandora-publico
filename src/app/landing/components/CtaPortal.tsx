'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

gsap.registerPlugin(ScrollTrigger);

const PALAVRAS = ['Pronto', 'para', 'abrir', 'o', 'seu', 'semestre?'];

/**
 * Chamada final para o portal do aluno — momento "abrir a caixa":
 * ao entrar em vista, a régua dourada expande do centro e o título sobe
 * palavra por palavra dentro de máscaras (yPercent), como uma manchete
 * sendo composta. O h2 carrega aria-label com a frase completa; as
 * palavras visuais são aria-hidden (leitura correta por leitores de tela).
 * O botão leva ao login demonstrativo existente, com indicação clara
 * de que a experiência ainda não autentica em um servidor.
 */
export default function CtaPortal() {
  const secaoRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const secao = secaoRef.current;
    if (!secao) return;
    if (prefereMenosMovimento()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        scrollTrigger: { trigger: secao, start: 'top 72%', once: true },
      });
      tl.from('[data-cta-rule]', { scaleX: 0, transformOrigin: 'center center', duration: 1.1 });
      tl.from('[data-cta-word]', { yPercent: 112, duration: 0.95, stagger: 0.055 }, 0.15);
      tl.from('[data-cta]', { opacity: 0, y: 24, duration: 0.9, stagger: 0.08, clearProps: 'opacity,transform' }, 0.4);
    }, secao);

    const limparOuvinte = ouvirMudancaMovimento(() => {
      if (prefereMenosMovimento()) ctx.revert();
    });

    return () => {
      limparOuvinte();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={secaoRef}
      aria-labelledby="portal-title"
      className="portal-callout grain relative isolate overflow-hidden bg-[var(--p-color-0d0d0d)] text-[var(--p-color-f4efe4)]"
    >
      {/* Fundo fotográfico com overlays */}
      <div className="absolute inset-0" aria-hidden="true">
        <AppImage
          src="/assets/images/landing-cta.jpg"
          alt="Formatura universitária com estudantes celebrando em cerimônia"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--p-color-0d0d0d)]/92 via-[var(--p-color-0d0d0d)]/75 to-[var(--p-color-0d0d0d)]/92" />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-20 pt-16 text-left sm:px-8 sm:pb-24 sm:pt-20 lg:px-12">
        {/* Painel-bilhete do portal: recorte suave flutuando sobre a fotografia */}
        <div className="portal-callout-panel w-full max-w-4xl border-l-2 border-primary/65 bg-[var(--p-color-0d0d0d)]/65 px-7 py-12 sm:px-12 sm:py-16">
        <div data-cta-rule className="rule-gold w-28" aria-hidden="true" />
        <h2
          id="portal-title"
          aria-label="Pronto para abrir o seu semestre?"
          className="text-display-lg mt-5 max-w-3xl text-balance text-white"
        >
          <span aria-hidden="true">
            {PALAVRAS.map((palavra, i) => {
              const destaque = i >= 4; // "seu semestre?" em itálico dourado
              return (
                <span key={palavra + i} className="mr-[0.26em] inline-block overflow-hidden align-bottom last:mr-0">
                  <span data-cta-word className="block">
                    {destaque ? <em className="display-em text-primary">{palavra}</em> : palavra}
                  </span>
                </span>
              );
            })}
          </span>
        </h2>
        <p data-cta className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">
          Disciplinas, notas, prazos e notificações reunidos em um painel direto —
          consulte as informações do semestre sem procurar em várias páginas.
        </p>
        <div data-cta className="mt-10 flex flex-col items-start gap-4">
          <Link
            href="/login"
            title="Abrir o portal do aluno"
            className="btn-sweep group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-sm font-extrabold text-primary-foreground shadow-gold"
          >
            Abrir o portal do aluno
            <ArrowUpRight size={18} aria-hidden="true" className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
          </Link>

        </div>
        </div>
      </div>
    </section>
  );
}
