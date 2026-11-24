/**
 * ETIQUETAS 3D — onde texto HTML não cabe na maquete, os chips são rendidos
 * como Sprite de canvas-texture (sem fetch de fontes externas).
 * Variantes:
 *   predio      — chip escuro com borda dourada (nome do prédio sobre o teto)
 *   sala        — chip dourado (código da sala)
 *   referencia  — texto puro discreto (pontos fora dos prédios)
 *   wc          — chip claro compacto (código do banheiro, ex. WC-A)
 * Texturas cacheadas por (variante·texto·tema); o material é criado por sprite
 * e descartado pelo dono do componente ao desmontar.
 */
import * as THREE from 'three';

export type VarianteEtiqueta = 'predio' | 'sala' | 'referencia' | 'wc';

export interface Paleta3D {
  fundoCena: string;
  piso: string;
  malha: string;
  parede: string;
  teto: string;
  filete: string;
  aresta: string;
  alameda: string;
  corredor: string;
  escada: string;
  rampa: string;
  ouro: string;
  ouroVivo: string;
  osso: string;
  tinta: string;
  vegetacao: string;
  vidroMezanino: string;
  vidro: string;
  vidroEmissivo: string;
  concretoDetalhe: string;
  gramado: string;
  gramadoClaro: string;
  asfalto: string;
  faixaEstacionamento: string;
  calcada: string;
  refTexto: string;
}

export const CORES_3D: Record<'claro' | 'escuro', Paleta3D> = {
  claro: {
    fundoCena: '#f6f2e7',
    piso: '#ece5d4',
    malha: '#d8cfbc',
    parede: '#f6f1e6',
    teto: '#d8cfbd',
    filete: '#f2b824',
    aresta: '#a89f8c',
    alameda: '#cfc6b1',
    corredor: '#b7ad98',
    escada: '#9a5b00',
    rampa: '#2f6b3a',
    ouro: '#f2b824',
    ouroVivo: '#ffd95e',
    osso: '#f4efe4',
    tinta: '#111111',
    vegetacao: '#77804f',
    vidroMezanino: '#efe7d2',
    vidro: '#738895',
    vidroEmissivo: '#dbe8e8',
    concretoDetalhe: '#c9bda7',
    gramado: '#8d956b',
    gramadoClaro: '#aab087',
    asfalto: '#575b5b',
    faixaEstacionamento: '#f3ead5',
    calcada: '#c9bda7',
    refTexto: '#8f8674',
  },
  escuro: {
    fundoCena: '#15130f',
    piso: '#242019',
    malha: '#3a342a',
    parede: '#342f28',
    teto: '#4a4236',
    filete: '#f2b824',
    aresta: '#8a8272',
    alameda: '#51493d',
    corredor: '#665e51',
    escada: '#d78f4e',
    rampa: '#6fae6f',
    ouro: '#f2b824',
    ouroVivo: '#ffd95e',
    osso: '#f4efe4',
    tinta: '#111111',
    vegetacao: '#4d5238',
    vidroMezanino: '#2b2519',
    vidro: '#607783',
    vidroEmissivo: '#9dc0c2',
    concretoDetalhe: '#51493d',
    gramado: '#333b2a',
    gramadoClaro: '#465039',
    asfalto: '#292d2e',
    faixaEstacionamento: '#d8d1c2',
    calcada: '#5c5549',
    refTexto: '#c8bfae',
  },
};

/** Color-only 3D variant: all geometry and route logic remain unchanged. */
export const CORES_3D_FIAP: Record<'claro' | 'escuro', Paleta3D> = {
  claro: {
    ...CORES_3D.claro,
    fundoCena:'#f9f7fb', piso:'#eee9f0', malha:'#d8ced8', parede:'#f6f1f7', teto:'#d9cfd9',
    filete:'#ed145b', ouro:'#ed145b', ouroVivo:'#ff8fba', osso:'#faf8fc', tinta:'#15131a',
    aresta:'#a99ba9', alameda:'#d2c8d2', corredor:'#beb0bf', escada:'#aa3c70',
    vidroMezanino:'#f0e6f0', concretoDetalhe:'#cbbdcd', calcada:'#d3c5d2', refTexto:'#877c8c',
  },
  escuro: {
    ...CORES_3D.escuro,
    fundoCena:'#0e0c14', piso:'#231c29', malha:'#3c303e', parede:'#342936', teto:'#49374b',
    filete:'#ed145b', ouro:'#ed145b', ouroVivo:'#ff85b1', osso:'#faf8fc', tinta:'#15131a',
    aresta:'#887786', alameda:'#514152', corredor:'#6c5969', escada:'#d66b98',
    vidroMezanino:'#2d202e', concretoDetalhe:'#524553', calcada:'#5e5060', refTexto:'#d4c3d0',
  },
};

/* ----------------------------------------------------- pintura dos chips */

const FONTE = '"JetBrains Mono", "Cascadia Code", Consolas, ui-monospace, monospace';
const W = 320;
const H = 120;

function chipPath(ctx: CanvasRenderingContext2D, raio: number) {
  ctx.beginPath();
  ctx.moveTo(raio, 4);
  ctx.arcTo(W - 4, 4, W - 4, H - 4, raio);
  ctx.arcTo(W - 4, H - 4, 4, H - 4, raio);
  ctx.arcTo(4, H - 4, 4, 4, raio);
  ctx.arcTo(4, 4, W - 4, 4, raio);
  ctx.closePath();
}

/** Desenha um chip variante no canvas dado (usado ONCE por textura). */
function pintarChip(
  ctx: CanvasRenderingContext2D,
  variante: VarianteEtiqueta,
  texto: string,
  p: Paleta3D
) {
  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (variante === 'referencia') {
    // Texto puro (sem chip) para pontos abertos: praça, portaria, paradas.
    ctx.fillStyle = p.refTexto;
    ctx.font = `700 30px ${FONTE}`;
    ctx.fillText(texto, W / 2, H / 2 + 2);
    return;
  }

  chipPath(ctx, 26);
  if (variante === 'predio') {
    ctx.fillStyle = p.tinta === '#111111' ? '#191714' : p.tinta;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = p.filete;
    ctx.stroke();
    ctx.fillStyle = p.osso;
  } else if (variante === 'sala') {
    ctx.fillStyle = p.filete;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#111111';
    ctx.stroke();
    ctx.fillStyle = '#111111';
  } else {
    // wc — chip claro, silencioso, com o código (ex.: WC-A).
    ctx.fillStyle = p.osso;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = p.corredor;
    ctx.stroke();
    ctx.fillStyle = p.tinta;
  }
  const fonte = variante === 'predio' ? 38 : 34;
  ctx.font = `800 ${fonte}px ${FONTE}`;
  ctx.fillText(texto, W / 2, H / 2 + 2);
}

/* --------------------------------------------------------------- cache */

type Cache = Map<string, THREE.CanvasTexture>;
const caches: Partial<Record<'claro' | 'escuro', Cache>> = {};

/** Larguras em metros no mundo 3D (proporção 320:120 do canvas). */
export const LARGURAS_ETIQUETA: Record<VarianteEtiqueta, [number, number]> = {
  predio: [30, 11.25],
  sala: [19, 7.1],
  referencia: [22, 8.2],
  wc: [10.8, 4.05],
};

const ALTURA_Y: Record<VarianteEtiqueta, number> = {
  predio: 10.5,
  sala: 0,
  referencia: 0,
  wc: 0,
};

/**
 * Cria um Sprite com o chip pedido (textura cacheada; material novo).
 * O chamador fica responsável por `material.dispose()` ao desmontar.
 */
export function etiquetaSprite({
  variante,
  texto,
  tema,
}: {
  variante: VarianteEtiqueta;
  texto: string;
  tema: 'claro' | 'escuro';
}): THREE.Sprite {
  const cache = (caches[tema] ??= new Map());
  const brand = document.documentElement.dataset.palette === 'fiap' ? 'fiap' : 'pandora';
  const chave = `${brand}|${variante}|${texto}`;
  let tex = cache.get(chave);
  if (!tex) {
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      pintarChip(ctx, variante, texto, brand === 'fiap' ? CORES_3D_FIAP[tema] : CORES_3D[tema]);
    }
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    cache.set(chave, tex);
  }
  const material = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const [largW, altW] = LARGURAS_ETIQUETA[variante];
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 20;
  sprite.scale.set(largW, altW, 1);
  sprite.position.y = ALTURA_Y[variante];
  return sprite;
}
