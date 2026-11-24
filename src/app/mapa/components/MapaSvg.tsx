'use client';

import React from 'react';
import { arestas, pontos, predios, zonas, pontoPorId, salas, type Sala } from '@/lib/mapa';
import type { Rota } from '@/lib/rota';

interface MapaSvgProps {
  rota: Rota | null;
  origemPontoId: string;
  destinoPontoId: string;
  /** No modo acessível as escadas são atenuadas (fora da rota). */
  acessivel: boolean;
  /** Sala em foco (busca/seleção): marcador grande com halo na planta. */
  salaFocada: Sala | null;
  onSelecionarSala: (id: string) => void;
  predioSelecionadoId: string | null;
  onSelecionarPredio: (id: string) => void;
}

/** Nomes encurtados na planta para caberem nas caixas sem estouro de texto. */
const NOME_CURTO_PLANTA: Record<string, string> = {
  'auditório pan': 'Auditório',
  'secretaria acadêmica': 'Secretaria',
  'biblioteca central': 'Biblioteca',
  'centro de convivência': 'Convivência',
};

/**
 * Planta 2D simplificada. Por padrão ela mostra apenas o ESSENCIAL: prédios
 * rotulados em fonte grande, banheiros e referências de orientação. As salas
 * entram na planta quando se tornam relevantes — na busca/seleção (marcador
 * grande com halo) — evitando dezenas de rótulos disputando atenção.
 */
export default function MapaSvg({
  rota,
  origemPontoId,
  destinoPontoId,
  acessivel,
  salaFocada,
  onSelecionarSala,
  predioSelecionadoId,
  onSelecionarPredio,
}: MapaSvgProps) {
  const origem = pontoPorId(origemPontoId);
  const destino = pontoPorId(destinoPontoId);
  const pontosDaRota = rota
    ? rota.nos
        .map((id) => pontoPorId(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => `${p.x},${p.y}`)
        .join(' ')
    : '';
  const pontoFinal = rota ? pontoPorId(rota.nos[rota.nos.length - 1]) : undefined;

  // Banheiros: únicos marcadores sempre visíveis — pergunta frequente, ponto fácil de perder.
  const banheiros = salas.filter((s) => s.categoria === 'banheiro');

  function tecladoEnterEspaco(event: React.KeyboardEvent, acao: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      acao();
    }
  }

  return (
    <svg
      viewBox="0 0 960 620"
      role="img"
      aria-label="Mapa do campus PANDORA SCHOOL: prédios rotulados, alamedas, praça central, estacionamento, banheiros e a rota destacada em dourado quando uma busca é feita. Prédios e banheiros são selecionáveis."
      className="block h-auto w-full"
    >
      <defs>
        <pattern id="malha" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--border)" strokeOpacity="0.3" strokeWidth="1" />
        </pattern>
        <pattern id="hachura" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="var(--muted)" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeWidth="2" />
        </pattern>
      </defs>

      {/* Fundo + malha */}
      <rect x="0" y="0" width="960" height="620" fill="var(--background)" />
      <rect x="0" y="0" width="960" height="620" fill="url(#malha)" />

      {/* Zonas abertas (praça e estacionamento) */}
      {zonas.map((zona) => {
        const selecionado = predioSelecionadoId === zona.id;
        return (
          <g
            key={zona.id}
            role="button"
            tabIndex={0}
            aria-label={`Selecionar ${zona.nome}`}
            onClick={() => onSelecionarPredio(zona.id)}
            onKeyDown={(e) => tecladoEnterEspaco(e, () => onSelecionarPredio(zona.id))}
            className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <rect
              x={zona.retangulo.x}
              y={zona.retangulo.y}
              width={zona.retangulo.w}
              height={zona.retangulo.h}
              fill={zona.id === 'praca' ? 'var(--accent)' : 'url(#hachura)'}
              fillOpacity={zona.id === 'praca' ? 0.75 : 1}
              stroke={selecionado ? 'var(--primary)' : 'var(--border)'}
              strokeWidth={selecionado ? 4 : 2}
              strokeDasharray={zona.id === 'praca' ? undefined : '10 6'}
            />
            <text
              x={zona.retangulo.x + zona.retangulo.w / 2}
              y={zona.retangulo.y + 28}
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="15"
              fontWeight="700"
              style={{ fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.08em' }}
            >
              {zona.codigo}
            </text>
          </g>
        );
      })}

      {/* Arestas ANTES dos prédios: corredores e escadas passam por trás dos
          blocos (a planta entende que os percursos atravessam o interior),
          evitando riscos sobre as caixas e mantendo os rótulos limpos. */}
      {arestas.map(({ de, para, tipo }, i) => {
        const a = pontoPorId(de);
        const b = pontoPorId(para);
        if (!a || !b) return null;
        const foraDaRotaAcessivel = acessivel && tipo === 'escada';
        return (
          <line
            key={`aresta-${i}-${de}-${para}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={corDoTipo(tipo)}
            strokeWidth={tipo === 'alameda' ? 12 : 7}
            strokeLinecap="round"
            strokeOpacity={foraDaRotaAcessivel ? 0.25 : 1}
            strokeDasharray={tipo === 'escada' ? '9 7' : tipo === 'rampa' ? '3 7' : undefined}
          />
        );
      })}

      {/* Prédios (selecionáveis por toque, clique e teclado) — por cima das
          arestas, com rótulos curtos que cabem nas caixas sem estouro. */}
      {predios.map((predio) => {
        const selecionado = predioSelecionadoId === predio.id;
        const [nomeCompletoCurto] = predio.nome.split('—').map((parte) => parte.trim());
        const nomeCurto = NOME_CURTO_PLANTA[nomeCompletoCurto.toLowerCase()] ?? nomeCompletoCurto;
        return (
          <g
            key={predio.id}
            role="button"
            tabIndex={0}
            aria-label={`Selecionar ${predio.nome}`}
            onClick={() => onSelecionarPredio(predio.id)}
            onKeyDown={(e) => tecladoEnterEspaco(e, () => onSelecionarPredio(predio.id))}
            className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <rect
              x={predio.retangulo.x}
              y={predio.retangulo.y}
              width={predio.retangulo.w}
              height={predio.retangulo.h}
              fill="var(--surface)"
              stroke={selecionado ? 'var(--primary)' : 'var(--foreground)'}
              strokeWidth={selecionado ? 5 : 2.5}
            />
            <rect x={predio.retangulo.x} y={predio.retangulo.y} width={predio.retangulo.w} height={26} fill="var(--foreground)" opacity="0.92" />
            <text
              x={predio.retangulo.x + predio.retangulo.w / 2}
              y={predio.retangulo.y + 19}
              textAnchor="middle"
              fill="var(--background)"
              fontSize="14"
              fontWeight="700"
              style={{ fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.14em' }}
            >
              {predio.codigo}
            </text>
            <text
              x={predio.retangulo.x + predio.retangulo.w / 2}
              y={predio.retangulo.y + 46}
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize="13"
              fontWeight="600"
            >
              {nomeCurto}
            </text>
          </g>
        );
      })}

      {/* Banheiros: marcadores discretos sempre visíveis (cruz, não só cor) */}
      {banheiros.map((banheiro) => {
        const p = pontoPorId(banheiro.pontoId);
        if (!p) return null;
        const ativo = salaFocada?.id === banheiro.id;
        return (
          <g
            key={banheiro.id}
            role="button"
            tabIndex={0}
            aria-label={`Abrir ${banheiro.nome}`}
            onClick={() => onSelecionarSala(banheiro.id)}
            onKeyDown={(e) => tecladoEnterEspaco(e, () => onSelecionarSala(banheiro.id))}
            className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          >
            <circle cx={p.x} cy={p.y} r={12} fill="var(--card)" stroke={ativo ? 'var(--primary)' : 'var(--muted-foreground)'} strokeWidth={ativo ? 3 : 1.6} />
            <path
              d={`M ${p.x - 1.4} ${p.y - 5} h 2.8 v 3.6 h 3.6 v 2.8 h -3.6 v 3.6 h -2.8 v -3.6 h -3.6 v -2.8 h 3.6 Z`}
              fill="var(--foreground)"
            />
            <text x={p.x} y={p.y + 25} textAnchor="middle" fill="var(--muted-foreground)" fontSize="9.5" fontWeight="700" style={{ fontFamily: 'var(--font-mono), monospace' }}>
              {banheiro.codigo}
            </text>
          </g>
        );
      })}

      {/* Sala em foco: marcador grande com halo (busca/seleção) */}
      {salaFocada
        ? (() => {
            const p = pontoPorId(salaFocada.pontoId);
            if (!p) return null;
            const rotulo = salaFocada.andar === 'mezanino' ? `${salaFocada.codigo} · M` : salaFocada.codigo;
            return (
              <g>
                <circle cx={p.x} cy={p.y - 34} r="24" fill="none" stroke="var(--primary)" strokeWidth="2.5" className="pin-pulse" />
                <rect
                  x={p.x - 40}
                  y={p.y - 48}
                  width={80}
                  height={28}
                  rx={14}
                  fill="var(--primary)"
                  stroke="var(--foreground)"
                  strokeWidth="2"
                />
                <text
                  x={p.x}
                  y={p.y - 29}
                  textAnchor="middle"
                  fill="var(--primary-foreground)"
                  fontSize="14"
                  fontWeight="700"
                  style={{ fontFamily: 'var(--font-mono), monospace', letterSpacing: '0.04em' }}
                >
                  {rotulo}
                </text>
              </g>
            );
          })()
        : null}

      {/* Rota calculada (dourada, animada) */}
      {rota && pontosDaRota ? (
        <g>
          <polyline
            points={pontosDaRota}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="rota-linha"
          />
          {origem ? (
            <g>
              <circle cx={origem.x} cy={origem.y} r="13" fill="none" stroke="var(--primary)" strokeWidth="3" />
              <circle cx={origem.x} cy={origem.y} r="5" fill="var(--primary)" />
            </g>
          ) : null}
          {pontoFinal ? (
            <g>
              <circle cx={pontoFinal.x} cy={pontoFinal.y} r="10" fill="none" stroke="var(--primary)" strokeWidth="2" className="pin-pulse" />
              <circle cx={pontoFinal.x} cy={pontoFinal.y} r="7" fill="var(--foreground)" stroke="var(--primary)" strokeWidth="3" />
            </g>
          ) : null}
        </g>
      ) : null}

      {/* Referências de orientação (poucas, só as necessárias) */}
      {pontos
        .filter((p) => p.tipo === 'referencia')
        .map((p) => (
          <g key={`ref-${p.id}`}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--foreground)" />
            <text
              x={p.x}
              y={p.y - 12}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="10"
              style={{ fontFamily: 'var(--font-mono), monospace' }}
            >
              {p.nome}
            </text>
          </g>
        ))}

      {/* Rosa dos ventos + escala ilustrativa */}
      <g opacity="0.85">
        <text x="920" y="46" textAnchor="middle" fill="var(--foreground)" fontSize="16" fontWeight="700" style={{ fontFamily: 'var(--font-mono), monospace' }}>
          N
        </text>
        <path d="M 920 52 L 920 66" stroke="var(--foreground)" strokeWidth="2" />
        <path d="M 915 60 L 920 52 L 925 60" fill="none" stroke="var(--foreground)" strokeWidth="2" />
      </g>
      <g opacity="0.85">
        <line x1="40" y1="596" x2="76" y2="596" stroke="var(--foreground)" strokeWidth="2" />
        <line x1="40" y1="592" x2="40" y2="600" stroke="var(--foreground)" strokeWidth="2" />
        <line x1="76" y1="592" x2="76" y2="600" stroke="var(--foreground)" strokeWidth="2" />
        <text x="86" y="600" fill="var(--muted-foreground)" fontSize="10" style={{ fontFamily: 'var(--font-mono), monospace' }}>
          ≈ 20 m (referência)
        </text>
      </g>
    </svg>
  );
}

function corDoTipo(tipo: string): string {
  if (tipo === 'escada') return 'var(--warning)';
  if (tipo === 'rampa') return 'var(--success)';
  if (tipo === 'corredor') return 'var(--muted-foreground)';
  return 'var(--border)';
}
