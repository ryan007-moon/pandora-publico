'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, Pause, Play } from 'lucide-react';
import { gsap } from 'gsap';
import { usePreferences } from '@/components/PreferencesProvider';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

export default function Hero() {
  const { alternarMovimento } = usePreferences();
  const sectionRef = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (prefereMenosMovimento()) return;
      gsap.from('[data-entrance]', {
        y: 42,
        opacity: 0,
        duration: 1.25,
        stagger: 0.12,
        ease: 'power3.out',
        clearProps: 'all',
      });
    }, sectionRef);
    const update = () => {
      const reduce = prefereMenosMovimento();
      setReduced(reduce);
      if (reduce) ctx.revert();
    };
    update();
    const unlisten = ouvirMudancaMovimento(update);
    return () => {
      unlisten();
      ctx.revert();
    };
  }, []);
  return (
    <section ref={sectionRef} id="inicio" className="entrance" aria-labelledby="entrance-title">
      <div className="entrance-backdrop" aria-hidden="true">
        <Image
          src="/assets/images/landing-carousel-praca.jpg"
          alt=""
          fill
          priority
          quality={75}
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: 'center 58%' }}
        />
      </div>
      <div className="sakura-fallback" aria-hidden="true" />
      <div className="entrance-shade" aria-hidden="true" />
      <div className="entrance-content">
        <h1 data-entrance id="entrance-title">
          Seu próximo
          <br />
          mundo <em>começa aqui.</em>
        </h1>
        <p data-entrance className="entrance-description">
          Explore o campus, encontre disciplinas e acompanhe sua vida acadêmica.
          <br className="hidden sm:block" /> Tudo começa pelo seu portal.
        </p>
        <div data-entrance className="entrance-actions">
          <Link href="/login" className="entrance-primary">
            Entrar no meu portal <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
          <a href="#campus" className="entrance-secondary">
            Conhecer o campus <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="entrance-footer">
        <a href="#sobre" className="entrance-scroll">
          <span className="round-arrow">
            <ArrowDown size={17} aria-hidden="true" />
          </span>
          <span>
            Há um mundo
            <br />
            para descobrir
          </span>
        </a>
        <button
          type="button"
          className="entrance-motion"
          aria-pressed={paused || reduced}
          onClick={() => {
            if (reduced) alternarMovimento();
            const next = reduced ? false : !paused;
            setPaused(next);
            window.dispatchEvent(
              new CustomEvent('pandora:journey-pause', { detail: { paused: next } })
            );
          }}
          aria-label={
            reduced
              ? 'Ativar animações do Pandora'
              : paused
                ? 'Retomar movimento da cena'
                : 'Pausar movimento da cena'
          }
        >
          {paused || reduced ? (
            <Play size={13} aria-hidden="true" />
          ) : (
            <Pause size={13} aria-hidden="true" />
          )}
          <span>{reduced ? 'Ativar animações' : paused ? 'Retomar cena' : 'Pausar cena'}</span>
        </button>
      </div>
    </section>
  );
}
