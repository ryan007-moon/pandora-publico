/**
 * MODELO 3D DO CAMPUS (Etapa 4 — reconstrução tridimensional).
 *
 * Fonte única: os dados de src/lib/mapa.ts (mesmo dataset da planta 2D e do
 * Dijkstra em rota.ts). Este módulo é puro (sem three.js) para poder ser
 * reutilizado por qualquer camada visual e testado em Node.
 *
 * Escala: 1 unidade do SVG = 0,55 m — idêntica a ESCALA_M_POR_UNIDADE usada
 * pelas rotas, então distâncias exibidas e geometria 3D falam a mesma língua.
 * O campus é FICTÍCIO: alturas e volumes são ilustrativos, não medições.
 */

import {
  ESCALA_M_POR_UNIDADE,
  arestas,
  predios,
  pontoPorId,
  salas,
  zonas,
  type Aresta,
  type Predio,
  type Sala,
} from './mapa';
import type { Rota } from './rota';

/** Alturas ilustrativas (m) por prédio — coerentes com pisos declarados. */
const ALTURAS_PREDIO: Record<string, { terreo: number; mezanino: number }> = {
  // Alturas deliberadamente enfatizadas: maquete ilustrativa, não medição.
  // A escala horizontal é extensa (campus inteiro), então 11–18 m preservam
  // a leitura volumétrica no enquadramento geral sem virar "cidade".
  blocoA: { terreo: 18, mezanino: 0 },
  blocoB: { terreo: 18, mezanino: 8.5 },
  biblioteca: { terreo: 17, mezanino: 8 },
  auditorio: { terreo: 14, mezanino: 0 },
  secretaria: { terreo: 11, mezanino: 0 },
  convivencia: { terreo: 11, mezanino: 0 },
  estacionamento: { terreo: 3.6, mezanino: 0 },
  praca: { terreo: 0, mezanino: 0 },
};

/** Elevação da faixa de rota sobre o piso (m). */
export const ELEVACAO_ROTA = 0.9;

export interface VolumePredio {
  id: string;
  /** Centro no mundo (m): x leste, z sul. */
  centro: { x: number; z: number };
  tamanho: { w: number; h: number };
  altura: number;
  /** Mezanino representado por um volume menor no teto (quando ≥ 0). */
  alturaMezanino: number;
  /** Zonas abertas (praça/estacionamento) não são volumes fechados. */
  zona: boolean;
  codigo: string;
  nome: string;
}

/** Nos do grafo em coordenadas de mundo, com a altura do piso onde existem. */
export interface Ponto3D {
  id: string;
  x: number;
  y: number;
  z: number;
  tipo: 'intersecao' | 'porta' | 'interior' | 'referencia';
}

export interface SegmentoRota3D {
  /** Pontos em ordem, com elevação por piso (faixa luminosa sobe a escada). */
  pontos: Array<{ x: number; y: number; z: number }>;
  tipo: Aresta['tipo'];
  instrucao: string;
  metros: number;
}

/** Mantém relações de identidade entre modelo 2D e 3D (sel. bidirecional). */
export interface Modelo3D {
  volumes: VolumePredio[];
  pontos: Ponto3D[];
  /** Arestas do grafo para desenhar os caminhos do chão. */
  caminhos: Array<{
    de: Ponto3D;
    para: Ponto3D;
    tipo: Aresta['tipo'];
    instrucao: string;
    metros: number;
  }>;
  /** Pinos de salas (nenhum inventado: só salas do dataset). */
  salas: Array<{ sala: Sala; ponto: Ponto3D }>;
  limites: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export const ESCALA_MUNDO = ESCALA_M_POR_UNIDADE;
const CENTRO_X = 480; // centro do viewBox do SVG
const CENTRO_Z = 310;

export function paraMundo(x: number, y: number): { x: number; z: number } {
  return { x: (x - CENTRO_X) * ESCALA_MUNDO, z: (y - CENTRO_Z) * ESCALA_MUNDO };
}

/** Altura do piso do no (mezaninos = mezanino do prédio; demais = chão). */
function alturaDoNo(pontoId: string, predioId?: string): number {
  const noMezanino = salas.some((s) => s.pontoId === pontoId && s.andar === 'mezanino');
  if (noMezanino) {
    const predio = mapearPredioDoPonto(pontoId);
    return predio ? (ALTURAS_PREDIO[predio]?.mezanino ?? 0) : 4.5;
  }
  if (predioId) return ALTURAS_PREDIO[predioId]?.terreo ?? 0;
  return 0;
}

function mapearPredioDoPonto(pontoId: string): string | undefined {
  return (
    salas.find((s) => s.pontoId === pontoId)?.predioId ??
    [...predios, ...zonas].find((p) => p.destinoPadrao === pontoId)?.id
  );
}

/** Altura do piso onde a sala vive (para pinos e foco de câmera). */
export function alturaDaSala(sala: Sala): number {
  return sala.andar === 'mezanino' ? (ALTURAS_PREDIO[sala.predioId ?? '']?.mezanino ?? 4.5) : 0;
}

/** Altura do teto do volume (para pinos no telhado). */
export function alturaDoPredio(predioId: string): number {
  return ALTURAS_PREDIO[predioId]?.terreo ?? 6;
}

/** Prédio ao qual um no do grafo pertence (para revelar interiores e câmera). */
const PREDIO_DO_NO: Record<string, string> = {
  blocoAPorta: 'blocoA',
  blocoAInt: 'blocoA',
  wcA: 'blocoA',
  blocoBPorta: 'blocoB',
  blocoBInt: 'blocoB',
  blocoBMez: 'blocoB',
  blocoBLeste: 'blocoB',
  wcB: 'blocoB',
  bibPorta: 'biblioteca',
  bibInt: 'biblioteca',
  bibEsp: 'biblioteca',
  bibMez: 'biblioteca',
  wcBib: 'biblioteca',
  audPorta: 'auditorio',
  audInt: 'auditorio',
  wcAud: 'auditorio',
  convPorta: 'convivencia',
  convInt: 'convivencia',
  wcCcv: 'convivencia',
  secretPorta: 'secretaria',
  secretInt: 'secretaria',
  estacPorta: 'estacionamento',
  estacInt: 'estacionamento',
  pracaNorte: 'praca',
};
export function predioDoNo(noId: string): string | undefined {
  return PREDIO_DO_NO[noId] ?? predios.find((p) => p.destinoPadrao === noId)?.id;
}

/** Prédios atravessados pela rota (walls viram vidro para o caminho passar. */
export function prediosNaRota(nos: string[]): Set<string> {
  const prediosSet = new Set<string>();
  for (const no of nos) {
    const predio = predioDoNo(no);
    if (predio) prediosSet.add(predio);
  }
  return prediosSet;
}

/** Constrói o modelo completo (memoizável por módulo — dataset estático). */
export function criarModelo3D(): Modelo3D {
  const volumes: VolumePredio[] = [];

  const empurrar = (p: Predio, zona: boolean) => {
    const alturas = ALTURAS_PREDIO[p.id] ?? { terreo: 6, mezanino: 0 };
    const c = paraMundo(p.retangulo.x + p.retangulo.w / 2, p.retangulo.y + p.retangulo.h / 2);
    volumes.push({
      id: p.id,
      centro: c,
      tamanho: { w: p.retangulo.w * ESCALA_MUNDO, h: p.retangulo.h * ESCALA_MUNDO },
      altura: alturas.terreo,
      alturaMezanino: alturas.mezanino,
      zona,
      codigo: p.codigo,
      nome: p.nome.split('—')[0].trim(),
    });
  };
  for (const p of predios) empurrar(p, false);
  for (const z of zonas) empurrar(z, true);

  const pontos3d: Ponto3D[] = [];
  for (const aresta of arestas) {
    const a = pontoPorId(aresta.de);
    const b = pontoPorId(aresta.para);
    // Altura do no: interior/porta elevam somente se no do mezanino.
    if (a && !pontos3d.some((p) => p.id === a.id)) {
      const mundoA = paraMundo(a.x, a.y);
      pontos3d.push({
        id: a.id,
        x: mundoA.x,
        y: alturaDoNo(a.id),
        z: mundoA.z,
        tipo: a.tipo,
      });
    }
    if (b && !pontos3d.some((p) => p.id === b.id)) {
      const mundoB = paraMundo(b.x, b.y);
      pontos3d.push({
        id: b.id,
        x: mundoB.x,
        y: alturaDoNo(b.id),
        z: mundoB.z,
        tipo: b.tipo,
      });
    }
  }
  const mapaDePontos = new Map(pontos3d.map((p) => [p.id, p]));

  const caminhos = arestas
    .map((aresta) => {
      const a = mapaDePontos.get(aresta.de);
      const b = mapaDePontos.get(aresta.para);
      if (!a || !b) return null;
      return {
        de: a,
        para: b,
        tipo: aresta.tipo,
        instrucao: aresta.instrucao,
        metros: Math.round(
          Math.hypot(a.x - b.x, a.z - b.z) *
            (aresta.tipo === 'escada' || Math.abs(a.y - b.y) > 0.1 ? 1.25 : 1) // percurso vertical = esforço maior
        ),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const pinosDeSalas = salas
    .map((sala) => {
      const ponto = mapaDePontos.get(sala.pontoId);
      return ponto ? { sala, ponto } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const xs = volumes.map((v) => v.centro.x);
  const zs = volumes.map((v) => v.centro.z);

  return {
    volumes,
    pontos: pontos3d,
    caminhos,
    salas: pinosDeSalas,
    limites: {
      minX: Math.min(...xs) - 40,
      maxX: Math.max(...xs) + 40,
      minZ: Math.min(...zs) - 40,
      maxZ: Math.max(...zs) + 40,
    },
  };
}

/** Converte a rota do Dijkstra para segmentos 3D (um por aresta do caminho). */
export function rotaPara3D(rota: Rota): Array<SegmentoRota3D> {
  const segmentos: Array<SegmentoRota3D> = [];
  for (let i = 0; i < rota.nos.length - 1; i += 1) {
    const a = pontoPorId(rota.nos[i]);
    const b = pontoPorId(rota.nos[i + 1]);
    const passo = rota.passos[i];
    if (!a || !b || !passo) continue;
    const mundoA = paraMundo(a.x, a.y);
    const mundoB = paraMundo(b.x, b.y);
    const ya = alturaDoNo(a.id) + ELEVACAO_ROTA;
    const yb = alturaDoNo(b.id) + ELEVACAO_ROTA;
    segmentos.push({
      pontos: [
        { x: mundoA.x, y: ya, z: mundoA.z },
        { x: mundoB.x, y: yb, z: mundoB.z },
      ],
      tipo: passo.tipo,
      instrucao: passo.instrucao,
      metros: passo.metros,
    });
  }
  return segmentos;
}
