import React from 'react';
import { Accessibility, BookOpen, CreditCard, MapPinned } from 'lucide-react';
import Reveal from '@/app/landing/components/Reveal';

interface Diferencial {
  id: string;
  icone: React.ReactNode;
  titulo: string;
  texto: string;
}

const itens: Diferencial[] = [
  {
    id: 'dif-disciplinas',
    icone: <BookOpen size={18} aria-hidden="true" />,
    titulo: 'Disciplinas em um lugar',
    texto: 'Conteúdos, prazos e indicadores de estudo organizados por matéria.',
  },
  {
    id: 'dif-mapa',
    icone: <MapPinned size={18} aria-hidden="true" />,
    titulo: 'Mapa para se orientar',
    texto: 'Busque salas e visualize trajetos no campus ilustrativo.',
  },
  {
    id: 'dif-carteirinha',
    icone: <CreditCard size={18} aria-hidden="true" />,
    titulo: 'Seu perfil acadêmico',
    texto: 'Dados da conta e uma carteirinha ilustrativa acessíveis no perfil.',
  },
  {
    id: 'dif-acessibilidade',
    icone: <Accessibility size={18} aria-hidden="true" />,
    titulo: 'Acessibilidade configurável',
    texto: 'Controles de movimento, contraste e tema, além da navegação por teclado.',
  },
];

/**
 * Diferenciais institucionais (fictícios) como manifesto tipográfico:
 * quatro colunas separadas por filetes (sem caixas), com numeração mono
 * e ícone dourado inline — revelação herdada do Reveal.
 */
export default function Diferenciais() {
  return (
    <div className="mt-16 border-t border-white/10 pt-12 sm:mt-20">
      <Reveal>
        <h3 className="font-display max-w-xl text-balance text-2xl font-semibold leading-tight text-white sm:text-3xl">
          O que você encontra no portal.
        </h3>
      </Reveal>

      <Reveal stagger className="mt-10 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {itens.map((item) => (
          <article key={item.id} data-reveal className="group lg:border-l lg:border-white/10 lg:pl-8 lg:first:border-l-0 lg:first:pl-0">
            <span className="inline-grid h-10 w-10 place-items-center border-b border-primary/60 text-gold-dark" aria-hidden="true">
              {item.icone}
            </span>
            <h4 className="font-display mt-4 text-lg font-semibold leading-snug text-white">{item.titulo}</h4>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{item.texto}</p>
          </article>
        ))}
      </Reveal>
    </div>
  );
}
