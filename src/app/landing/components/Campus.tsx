import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Compass, MapPin, Route, Users } from 'lucide-react';
import { pontosCampus } from '@/lib/campus';
import Reveal from '@/app/landing/components/Reveal';

/**
 * Experiência do campus: prévia ilustrativa (não é um mapa real) do futuro
 * mapa interativo, com pins dos prédios fictícios e rota acessível desenhada.
 */
export default function Campus() {
  return (
    <section id="campus" aria-labelledby="campus-title" className="atmosphere-section scroll-mt-24 bg-[var(--p-color-0d0f0e)]/[0.78] text-[var(--p-color-f4efe4)]">
      <div className="relative z-[2] mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <Reveal>
          <h2 id="campus-title" className="text-display-lg max-w-2xl text-balance">
            Encontre seu caminho <em className="display-em text-primary">pelo campus.</em>
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--p-color-b4ae9f)] sm:text-base">
            A planta abaixo mostra os prédios, os pontos de apoio e um trajeto ilustrativo.
            No portal, você pode buscar salas, selecionar uma origem e consultar o caminho
            entre os espaços, inclusive com a opção de evitar escadas.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          {/* Prévia ilustrativa (SVG plano esquemático) */}
          <Reveal>
            <div className="campus-plan rounded-[32px] bg-[var(--p-color-0d0d0d)] p-4 shadow-[0_32px_64px_-32px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-[var(--p-color-a39d8c)]">
                  Visão do campus · planta interativa
                </p>
                <p className="font-mono-data flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-[var(--p-color-a39d8c)]">
                  <Compass size={13} aria-hidden="true" /> N
                </p>
              </div>

              <svg
                viewBox="0 0 560 360"
                role="img"
                aria-label="Visão esquemática do campus: Biblioteca Central, Bloco de Laboratórios, Auditório Pan e Centro de Convivência, conectados por uma rota acessível"
                className="w-full"
              >
                {/* Fundo e malha */}
                <rect width="560" height="360" fill="var(--p-color-131311)" />
                <g stroke="rgba(var(--p-rgb-244-239-228),0.055)" strokeWidth="1">
                  <path d="M40 0v360M120 0v360M200 0v360M280 0v360M360 0v360M440 0v360M520 0v360" />
                  <path d="M0 45h560M0 135h560M0 225h560M0 315h560" />
                </g>

                {/* Passeios e área verde */}
                <path d="M0 195h560" stroke="var(--p-color-26241f)" strokeWidth="26" />
                <path d="M255 0v360" stroke="var(--p-color-26241f)" strokeWidth="22" />
                <rect x="20" y="240" width="110" height="70" fill="var(--p-color-191d17)" stroke="var(--p-color-242820)" />

                {/* Prédios (planta baixa esquemática) */}
                <g fill="var(--p-color-23211c)" stroke="var(--p-color-3a362c)" strokeWidth="1.5">
                  <rect x="70" y="58" width="150" height="92" rx="2" />
                  <rect x="280" y="46" width="175" height="86" rx="2" />
                  <rect x="390" y="160" width="120" height="74" rx="2" />
                  <rect x="180" y="252" width="150" height="72" rx="2" />
                </g>
                {/* Detalhes internos (salas) */}
                <g fill="none" stroke="rgba(var(--p-rgb-244-239-228),0.10)" strokeWidth="1">
                  <path d="M120 58v92M170 58v92M280 89h175M325 46v86M390 197h120" />
                </g>

                {/* Rota acessível (ilustrativa) */}
                <path
                  d="M145 104 L255 104 L255 89 L365 89 L365 160 L448 160 L448 195 L448 252 L255 252 L255 288"
                  fill="none"
                  stroke="var(--p-color-f2b824)"
                  strokeWidth="2"
                  strokeDasharray="7 6"
                  strokeLinejoin="round"
                  opacity="0.75"
                />

                {/* Pins dos prédios */}
                {pontosCampus.map((ponto) => (
                  <g key={ponto.id}>
                    <circle
                      cx={ponto.pin.x}
                      cy={ponto.pin.y}
                      r="12"
                      fill="none"
                      stroke="var(--p-color-f2b824)"
                      strokeWidth="1"
                      className="pin-pulse"
                    />
                    <circle cx={ponto.pin.x} cy={ponto.pin.y} r="12" fill="var(--p-color-0d0d0d)" stroke="var(--p-color-f2b824)" strokeWidth="1.5" />
                    <text
                      x={ponto.pin.x}
                      y={ponto.pin.y + 4}
                      textAnchor="middle"
                      fill="var(--p-color-f2b824)"
                      fontSize="12"
                      fontFamily="var(--font-mono), monospace"
                      fontWeight="700"
                    >
                      {ponto.numero}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Legenda */}
              <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
                {pontosCampus.map((ponto) => (
                  <li key={ponto.id} className="flex items-baseline gap-2.5 text-sm text-[var(--p-color-a39d8c)]">
                    <span className="font-mono-data grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--p-color-f2b824)] text-[10px] font-bold text-[var(--p-color-f2b824)]">
                      {ponto.numero}
                    </span>
                    <span className="min-w-0">
                      <strong className="font-semibold text-[var(--p-color-f4efe4)]">{ponto.nome}</strong> — {ponto.descricao}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 font-mono-data text-[10px] uppercase tracking-[0.16em] text-[var(--p-color-a39d8c)]">
                <span className="inline-block h-0 w-6 border-t-2 border-dashed border-primary" aria-hidden="true" />
                Rota acessível · visão do campus
              </p>
            </div>
          </Reveal>

          {/* Destaques do mapa */}
          <Reveal stagger delay={0.1}>
            <ul className="m-0 list-none space-y-0 p-0">
              {[
                {
                  icone: <MapPin size={18} aria-hidden="true" />,
                  titulo: 'Localização de salas e prédios',
                  texto: 'Busca por bloco, sala e serviço do campus.',
                  status: 'Disponível no portal',
                },
                {
                  icone: <Route size={18} aria-hidden="true" />,
                  titulo: 'Rotas acessíveis',
                  texto: 'Rampas, elevadores e caminhos entre prédios destacados em dourado.',
                  status: 'Disponível no portal',
                },
                {
                  icone: <Users size={18} aria-hidden="true" />,
                  titulo: 'Pontos de apoio e convivência',
                  texto: 'Centro de convivência, biblioteca com horário estendido e segurança.',
                  status: 'Na visão do campus',
                },
              ].map((item) => (
                <li key={item.titulo} data-reveal className="border-b border-white/15 py-6 first:pt-0">
                  <div className="flex items-start gap-4">
                    <span className="text-primary">{item.icone}</span>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold">{item.titulo}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[var(--p-color-b4ae9f)]">{item.texto}</p>
                      <p className="font-mono-data mt-2 text-[10px] uppercase tracking-[0.16em] text-primary">
                        {item.status}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/mapa"
                title="Explorar o mapa interativo do campus"
                className="btn-sweep group inline-flex items-center gap-2 rounded-full bg-[var(--p-color-111111)] px-6 py-3.5 text-sm font-extrabold text-[var(--p-color-f4efe4)]"
              >
                Explorar mapa
                <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-1" />
              </Link>
              <p className="max-w-xs text-xs leading-relaxed text-[var(--p-color-b4ae9f)]">
                O mapa interativo está no ar: rotas a pé calculadas entre prédios, com opção de evitar
                escadas — sem sistemas de localização reais.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
