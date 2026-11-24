'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MoveHorizontal, Pause, Play } from 'lucide-react';
import AppImage from '@/components/ui/AppImage';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

/**
 * Álbum panorâmico do hall: cartão fotográfico + legenda editorial.
 * Os arquivos do acervo existente foram preservados; a imagem de Tecnologia
 * foi criada para esta edição. Tudo é ilustrativo, não fotografia do campus real.
 *
 * Duas cópias de mesma largura fecham o loop sem saltos; a segunda é
 * inteiramente decorativa para tecnologias assistivas.
 */
const ESPACOS = [
  { nome: 'Tecnologia', detalhe: 'Programação e projetos', imagem: '/assets/images/landing-reel-tecnologia-original.webp', posicao: 'center' },
  { nome: 'Engenharia', detalhe: 'Projetos e protótipos', imagem: '/assets/images/landing-area-engenharia.jpg', posicao: 'center' },
  { nome: 'Gestão', detalhe: 'Organização e estratégia', imagem: '/assets/images/landing-area-administracao.jpg', posicao: 'center' },
  { nome: 'Saúde', detalhe: 'Práticas em saúde', imagem: '/assets/images/landing-area-saude.jpg', posicao: 'center' },
  { nome: 'Design', detalhe: 'Criação e comunicação', imagem: '/assets/images/landing-area-design.jpg', posicao: 'center' },
  { nome: 'Biblioteca', detalhe: 'Estudo e pesquisa', imagem: '/assets/images/landing-carousel-biblioteca.jpg', posicao: 'center' },
  { nome: 'Laboratórios', detalhe: 'Atividades práticas', imagem: '/assets/images/landing-carousel-laboratorio.jpg', posicao: 'center' },
  { nome: 'Auditório', detalhe: 'Encontros e apresentações', imagem: '/assets/images/landing-carousel-auditorio.jpg', posicao: 'center' },
];

function Cartoes({ copia }: { copia: number }) {
  return (
    <div className="photo-reel-group" aria-hidden="true">
      {ESPACOS.map((item, i) => (
        <article className="photo-reel-card" key={`${copia}-${item.nome}`}>
          <div className="photo-reel-image">
            <AppImage
              src={item.imagem}
              alt=""
              fill
              sizes="(max-width: 640px) 260px, 340px"
              loading="lazy"
              quality={75}
              className="object-cover"
              style={{ objectPosition: item.posicao }}
            />
          </div>
          <div className="photo-reel-vignette" />
          <span className="photo-reel-count">{String(i + 1).padStart(2, '0')} / 08</span>
          <div className="photo-reel-copy !right-4">
            <span className="photo-reel-name">{item.nome}</span>
            <span className="photo-reel-detail">{item.detalhe}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function FaixaDourada() {
  const [pausado, setPausado] = useState(false);
  const [reduzido, setReduzido] = useState(false);
  const [toque, setToque] = useState(false);

  useEffect(() => {
    const atualizar = () => setReduzido(prefereMenosMovimento());
    atualizar();
    const mediaToque = window.matchMedia('(hover: none) and (pointer: coarse)');
    const sincronizarToque = () => setToque(mediaToque.matches);
    sincronizarToque();
    mediaToque.addEventListener('change', sincronizarToque);
    const retirar = ouvirMudancaMovimento(atualizar);
    return () => { retirar(); mediaToque.removeEventListener('change', sincronizarToque); };
  }, []);

  return (
    <section className="faixa-dourada photo-reel" aria-labelledby="reel-title">
      <div className="photo-reel-heading">
        <div className="photo-reel-heading-copy">
          <h2 id="reel-title">Áreas e espaços do campus.</h2>
        </div>
        <div className="photo-reel-actions">
          <Link href="#areas" className="photo-reel-link">
            Conhecer as áreas <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="photo-reel-pause"
            onClick={() => setPausado((v) => !v)}
            disabled={reduzido || toque}
            aria-pressed={pausado || reduzido || toque}
            aria-label={reduzido || toque ? 'Álbum de fotografias em modo de navegação manual' : pausado ? 'Retomar carrossel de fotografias' : 'Pausar carrossel de fotografias'}
          >
            {reduzido || toque ? <MoveHorizontal size={16} aria-hidden="true" /> : pausado ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <p className="sr-only">Tecnologia, Engenharia, Gestão, Saúde, Design, Biblioteca, Laboratórios e Auditório. Conheça as áreas e espaços.</p>
      <div className="photo-reel-viewport" role="region" aria-label="Fotografias de áreas acadêmicas" data-manual={pausado || reduzido || toque ? 'true' : 'false'} tabIndex={pausado || reduzido || toque ? 0 : undefined}>
        <div className="photo-reel-track" data-paused={pausado || reduzido || toque ? 'true' : 'false'}>
          <Cartoes copia={0} />
          <Cartoes copia={1} />
        </div>
      </div>
      <div className="photo-reel-bottom" aria-hidden="true">
        <span>FOTOGRAFIAS ILUSTRATIVAS</span>
        <span>DESLIZE PARA CONHECER</span>
      </div>
    </section>
  );
}
