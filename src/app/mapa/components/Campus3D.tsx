'use client';

/**
 * CAMPUS PANDORA 3D — maquete interativa do campus (Etapa 4).
 * Fonte de verdade: src/lib/mapa.ts via src/lib/campus3d.ts (mesma escala do
 * Dijkstra). Economicamente apenas quando algo acontece (frameloop 'demand'
 * com frames contínuos durante tweens de câmera e interação).
 *
 * Responsabilidades:
 * • volumes reais por prédio com filete dourado, mezanino e portas em arco;
 * • caminhos por tipo (alameda/corredor/escada/rampa) no chão;
 * • rota como fita dourada revelada progressivamente (livre com movimento
 *   reduzido);
 * • câmera com máquina de tween (seleção de prédio/sala/passo), limites
 *   rígidos e clamp de pan; controles touch/órbita com amortecimento;
 * • pinos: banheiros sempre, demais salas quando o prédio é focado, e a sala
 *   focada ganha anel + etiqueta;
 * • integração bidirecional com a lista/busca via callbacks existentes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CORES_3D, CORES_3D_FIAP, etiquetaSprite, type Paleta3D, type VarianteEtiqueta } from './etiquetas3d';
import { usePreferences } from '@/components/PreferencesProvider';
import {
  criarModelo3D,
  predioDoNo,
  prediosNaRota,
  rotaPara3D,
  type Modelo3D,
} from '@/lib/campus3d';
import { prefereMenosMovimento } from '@/lib/movimento';
import type { Rota } from '@/lib/rota';
import type { Sala } from '@/lib/mapa';

/* ------------------------------------------------------------------ props */

export interface Campus3DProps {
  tema: 'claro' | 'escuro';
  rota: Rota | null;
  origemPontoId: string;
  destinoPontoId: string;
  /** No modo acessível, escadas fora da rota ficam atenuadas no chão. */
  acessivel: boolean;
  salaFocada: Sala | null;
  predioSelecionadoId: string | null;
  onSelecionarSala: (id: string) => void;
  onSelecionarPredio: (id: string) => void;
  /** Com rota ativa, prédios atravessados viram vidro (interior visível). */
  modoRota?: boolean;
  /** Passo do roteiro em foco (0-based) — câmera acompanha o trecho. */
  passoAtivo?: number | null;
  /** Contador externo: cada incremento volta à visão geral da maquete. */
  visaoGeral?: number;
}

/* ------------------------------------------------------- dados & padrões */

const MODELO: Modelo3D = criarModelo3D();

// Distância suficiente para enquadrar os 528 × 341 m ilustrativos mesmo no
// painel estreito (desktop com lista lateral) e no celular em retrato.
const VISAO_GERAL_POS: [number, number, number] = [-305, 515, 435];
const VISAO_GERAL_ALVO: [number, number, number] = [10, 0, 12];
const POS_PADRAO = new THREE.Vector3(...VISAO_GERAL_POS);
const ALVO_PADRAO = new THREE.Vector3(...VISAO_GERAL_ALVO);

const EXTENSAO_X = 264; // limite de pan (recuo de borda)
const EXTENSAO_Z = 178;

interface FocoAlvo {
  pos: THREE.Vector3;
  alvo: THREE.Vector3;
}

/** Acesso tipado mínimo aos controles orbitais (implementação pode variar). */
interface ControlesCam {
  target: THREE.Vector3;
  update(): void;
}

/* Geometrias compartilhadas — criadas uma única vez por módulo. */
const GEO_BOX = new THREE.BoxGeometry(1, 1, 1);
const GEO_EDGES = new THREE.EdgesGeometry(GEO_BOX);

function formaRetanguloArredondado(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

type TipoTexturaSolo = 'terreno' | 'asfalto' | 'gramado' | 'calcada';

/** Textura procedural pequena: evita downloads e mantém o acabamento leve. */
function criarTexturaSolo(
  base: string,
  detalhe: string,
  tipo: TipoTexturaSolo,
  repeticao: [number, number]
): THREE.CanvasTexture {
  const tamanho = 256;
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, tamanho, tamanho);
    let semente = tipo.length * 7919;
    const rnd = () => {
      semente = (semente * 16807) % 2147483647;
      return semente / 2147483647;
    };
    const quantidade = tipo === 'asfalto' ? 2100 : tipo === 'gramado' ? 1300 : 650;
    ctx.fillStyle = detalhe;
    ctx.globalAlpha =
      tipo === 'asfalto' ? 0.22 : tipo === 'gramado' ? 0.18 : tipo === 'calcada' ? 0.12 : 0.1;
    for (let i = 0; i < quantidade; i += 1) {
      const x = rnd() * tamanho;
      const y = rnd() * tamanho;
      const r = tipo === 'gramado' ? 0.45 + rnd() : 0.35 + rnd() * 1.2;
      ctx.fillRect(x, y, r, tipo === 'gramado' ? r * 2.2 : r);
    }
    if (tipo === 'calcada') {
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      ctx.strokeStyle = detalhe;
      for (let i = 0; i <= tamanho; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, tamanho);
        ctx.moveTo(0, i);
        ctx.lineTo(tamanho, i);
        ctx.stroke();
      }
    }
    if (tipo === 'terreno') {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = detalhe;
      for (let i = 0; i < 36; i += 1) {
        ctx.beginPath();
        ctx.ellipse(
          rnd() * tamanho,
          rnd() * tamanho,
          8 + rnd() * 24,
          5 + rnd() * 16,
          rnd() * Math.PI,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.strokeStyle = detalhe;
      ctx.lineWidth = 1;
      for (let i = 0; i <= tamanho; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, tamanho);
        ctx.moveTo(0, i);
        ctx.lineTo(tamanho, i);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.wrapS = THREE.RepeatWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(...repeticao);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

/* ------------------------------------------------------------ etiqueta 3D */

function Etiqueta({
  variante,
  texto,
  tema,
  y,
}: {
  variante: VarianteEtiqueta;
  texto: string;
  tema: 'claro' | 'escuro';
  y: number;
}) {
  const { paleta } = usePreferences();
  const sprite = useMemo(() => etiquetaSprite({ variante, texto, tema }), [variante, texto, tema, paleta]);
  const escalaBase = useMemo(() => sprite.scale.clone(), [sprite]);
  const posMundo = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    sprite.getWorldPosition(posMundo);
    // Mantém chips legíveis no overview e impede que dominem o close.
    const fator = THREE.MathUtils.clamp(camera.position.distanceTo(posMundo) / 650, 0.4, 1.16);
    sprite.scale.set(escalaBase.x * fator, escalaBase.y * fator, 1);
  });
  // Material novo por sprite; a textura permanece em cache de módulo.
  useEffect(
    () => () => {
      (sprite.material as THREE.SpriteMaterial).dispose();
    },
    [sprite]
  );
  return <primitive object={sprite} position={[0, y, 0]} raycast={() => null} />;
}

/* ---------------------------------------------------------- piso da maquete */

function Piso({ p }: { p: Paleta3D }) {
  const textura = useMemo(() => criarTexturaSolo(p.piso, p.malha, 'terreno', [0.02, 0.02]), [p]);
  useEffect(() => () => textura.dispose(), [textura]);
  const forma = useMemo(() => formaRetanguloArredondado(650, 455, 32), []);
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.22, 0]} receiveShadow castShadow>
      <extrudeGeometry
        args={[
          forma,
          {
            depth: 2.4,
            bevelEnabled: true,
            bevelSize: 2.5,
            bevelThickness: 1.2,
            bevelSegments: 3,
            curveSegments: 10,
          },
        ]}
      />
      <meshStandardMaterial
        map={textura}
        bumpMap={textura}
        bumpScale={0.08}
        roughness={0.97}
        metalness={0}
      />
    </mesh>
  );
}

/* ----------------------------------------- paisagismo e orientação */

function Banco({ x, z, rot = 0, p }: { x: number; z: number; rot?: number; p: Paleta3D }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} raycast={() => null}>
      <mesh geometry={GEO_BOX} scale={[7, 0.45, 1.7]} position={[0, 1.45, 0]} castShadow>
        <meshStandardMaterial color={p.concretoDetalhe} roughness={0.78} />
      </mesh>
      <mesh geometry={GEO_BOX} scale={[0.4, 1.35, 1.3]} position={[-2.5, 0.7, 0]}>
        <meshStandardMaterial color={p.aresta} roughness={0.8} />
      </mesh>
      <mesh geometry={GEO_BOX} scale={[0.4, 1.35, 1.3]} position={[2.5, 0.7, 0]}>
        <meshStandardMaterial color={p.aresta} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Poste({ x, z, p }: { x: number; z: number; p: Paleta3D }) {
  return (
    <group position={[x, 0, z]} raycast={() => null}>
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 6.4, 8]} />
        <meshStandardMaterial color={p.aresta} metalness={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[0, 6.5, 0]}>
        <sphereGeometry args={[0.55, 10, 8]} />
        <meshStandardMaterial
          color={p.ouroVivo}
          emissive={p.ouro}
          emissiveIntensity={0.55}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Lixeira({ x, z, p }: { x: number; z: number; p: Paleta3D }) {
  return (
    <group position={[x, 0, z]} raycast={() => null}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.75, 0.88, 2.3, 12]} />
        <meshStandardMaterial color={p.teto} metalness={0.26} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.35, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.18, 12]} />
        <meshStandardMaterial color={p.filete} metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

function TotemCampus({ x, z, rot, p }: { x: number; z: number; rot: number; p: Paleta3D }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]} raycast={() => null}>
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[3.8, 6.2, 0.7]} />
        <meshStandardMaterial color={p.teto} metalness={0.1} roughness={0.52} />
      </mesh>
      <mesh position={[0, 3.7, 0.4]}>
        <boxGeometry args={[2.7, 2.4, 0.16]} />
        <meshPhysicalMaterial color={p.vidro} emissive={p.vidroEmissivo} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, 6.3, 0]}>
        <boxGeometry args={[4.2, 0.35, 0.9]} />
        <meshStandardMaterial color={p.filete} emissive={p.filete} emissiveIntensity={0.16} />
      </mesh>
    </group>
  );
}

function JardimOrganico({
  x,
  z,
  raio,
  cor,
  indice,
  p,
  textura,
}: {
  x: number;
  z: number;
  raio: number;
  cor: string;
  indice: number;
  p: Paleta3D;
  textura: THREE.Texture;
}) {
  const forma = useMemo(() => {
    const s = new THREE.Shape();
    const pontos = 12;
    for (let i = 0; i <= pontos; i += 1) {
      const a = (i / pontos) * Math.PI * 2;
      const variacao = 0.88 + Math.sin(i * 2.17 + indice * 1.31) * 0.1;
      const px = Math.cos(a) * raio * variacao;
      const py = Math.sin(a) * raio * (0.72 + Math.cos(i * 1.73 + indice) * 0.07);
      if (i === 0) s.moveTo(px, py);
      else s.lineTo(px, py);
    }
    s.closePath();
    return s;
  }, [indice, raio]);
  return (
    <group position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <mesh scale={1.08} receiveShadow>
        <shapeGeometry args={[forma, 6]} />
        <meshStandardMaterial color={p.concretoDetalhe} roughness={0.98} />
      </mesh>
      <mesh position={[0, 0, 0.07]} receiveShadow>
        <shapeGeometry args={[forma, 6]} />
        <meshStandardMaterial
          color={cor}
          map={textura}
          bumpMap={textura}
          bumpScale={0.06}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

function MonumentoPandora({ p }: { p: Paleta3D }) {
  return (
    <group position={[0, 0, 16]} raycast={() => null}>
      <mesh position={[0, 0.65, 0]} receiveShadow>
        <cylinderGeometry args={[7.5, 8.5, 1.3, 32]} />
        <meshStandardMaterial color={p.teto} metalness={0.18} roughness={0.5} />
      </mesh>
      {/* Portal/compasso Pandora: marco vertical visível na visão geral. */}
      <mesh position={[0, 9.2, 0]} castShadow>
        <torusGeometry args={[6.4, 0.58, 12, 48, Math.PI * 1.72]} />
        <meshStandardMaterial
          color={p.filete}
          emissive={p.filete}
          emissiveIntensity={0.24}
          metalness={0.58}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[-6.32, 4.8, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.65, 9.6, 10]} />
        <meshStandardMaterial color={p.filete} metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0.9, 9, 0]} rotation={[0, 0, -0.62]} castShadow>
        <boxGeometry args={[0.55, 11, 0.9]} />
        <meshStandardMaterial color={p.osso} metalness={0.22} roughness={0.4} />
      </mesh>
      <pointLight position={[0, 7.5, 1]} color={p.ouro} intensity={0.4} distance={30} />
    </group>
  );
}

function Veiculo({ x, z, cor, p }: { x: number; z: number; cor: string; p: Paleta3D }) {
  return (
    <group position={[x, 0.35, z]} raycast={() => null}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[4.8, 1.25, 8.4]} />
        <meshPhysicalMaterial color={cor} metalness={0.22} roughness={0.38} clearcoat={0.72} />
      </mesh>
      <mesh position={[0, 1.75, -0.25]} castShadow>
        <boxGeometry args={[4, 1.25, 4.2]} />
        <meshPhysicalMaterial color={p.vidro} roughness={0.16} clearcoat={0.88} />
      </mesh>
      {[
        [-2.35, -2.55],
        [2.35, -2.55],
        [-2.35, 2.55],
        [2.35, 2.55],
      ].map(([wx, wz]) => (
        <mesh key={`${wx}-${wz}`} position={[wx, 0.55, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.75, 0.75, 0.42, 12]} />
          <meshStandardMaterial color="#171717" roughness={0.88} />
        </mesh>
      ))}
    </group>
  );
}

function Estacionamento3D({ p }: { p: Paleta3D }) {
  const volume = MODELO.volumes.find((v) => v.id === 'estacionamento');
  const formaCalcada = useMemo(() => formaRetanguloArredondado(94, 63, 7), []);
  const formaAsfalto = useMemo(() => formaRetanguloArredondado(88, 55, 5), []);
  const texturaAsfalto = useMemo(
    () => criarTexturaSolo(p.asfalto, p.faixaEstacionamento, 'asfalto', [0.12, 0.12]),
    [p]
  );
  const texturaCalcada = useMemo(
    () => criarTexturaSolo(p.calcada, p.aresta, 'calcada', [0.12, 0.12]),
    [p]
  );
  useEffect(
    () => () => {
      texturaAsfalto.dispose();
      texturaCalcada.dispose();
    },
    [texturaAsfalto, texturaCalcada]
  );
  if (!volume) return null;
  const vagasX = [-34, -25.5, -17, -8.5, 0, 8.5, 17, 25.5, 34];
  return (
    <group position={[volume.centro.x, 0, volume.centro.z]}>
      {/* Calçada perimetral e asfalto estão praticamente coplanares ao solo. */}
      <mesh
        position={[0, 0.09, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={() => null}
      >
        <shapeGeometry args={[formaCalcada, 8]} />
        <meshStandardMaterial map={texturaCalcada} roughness={0.94} />
      </mesh>
      <mesh
        position={[0, 0.14, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={() => null}
      >
        <shapeGeometry args={[formaAsfalto, 8]} />
        <meshStandardMaterial
          map={texturaAsfalto}
          bumpMap={texturaAsfalto}
          bumpScale={0.1}
          roughness={0.92}
          metalness={0.03}
        />
      </mesh>

      {/* Vagas em duas fileiras, deixando faixa central de circulação. */}
      {[-16.2, 16.2].flatMap((z) =>
        vagasX.map((x) => (
          <mesh key={`vaga-${x}-${z}`} position={[x, 0.205, z]} raycast={() => null}>
            <boxGeometry args={[0.22, 0.05, 13.5]} />
            <meshBasicMaterial color={p.faixaEstacionamento} />
          </mesh>
        ))
      )}
      {[-9.4, 9.4].map((z) => (
        <mesh key={`limite-${z}`} position={[0, 0.205, z]} raycast={() => null}>
          <boxGeometry args={[76, 0.05, 0.2]} />
          <meshBasicMaterial color={p.faixaEstacionamento} transparent opacity={0.72} />
        </mesh>
      ))}

      {/* Baia acessível: azul nivelado + pictograma geométrico. */}
      <mesh position={[-29.8, 0.19, -16.2]} raycast={() => null}>
        <boxGeometry args={[7.6, 0.045, 13]} />
        <meshStandardMaterial color="#2d68a0" roughness={0.86} />
      </mesh>
      <group position={[-29.8, 0.245, -16.2]} raycast={() => null}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.24, 8, 24]} />
          <meshBasicMaterial color="#f7f3e8" />
        </mesh>
        <mesh position={[0.4, 0, 1.5]}>
          <boxGeometry args={[0.35, 0.06, 3.5]} />
          <meshBasicMaterial color="#f7f3e8" />
        </mesh>
      </group>

      {/* Faixa veicular central, setas e acesso sul sem meio-fio bloqueando. */}
      {[-20, 20].map((x) => (
        <group key={`seta-${x}`} position={[x, 0.22, 0]} raycast={() => null}>
          <mesh>
            <boxGeometry args={[5, 0.05, 0.32]} />
            <meshBasicMaterial color={p.faixaEstacionamento} transparent opacity={0.7} />
          </mesh>
          <mesh
            position={[x < 0 ? 2.3 : -2.3, 0, 0]}
            rotation={[0, 0, x < 0 ? -Math.PI / 2 : Math.PI / 2]}
          >
            <coneGeometry args={[1.15, 2.4, 3]} />
            <meshBasicMaterial color={p.faixaEstacionamento} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.14, 31]} raycast={() => null}>
        <boxGeometry args={[14, 0.12, 10]} />
        <meshStandardMaterial color={p.asfalto} roughness={0.9} />
      </mesh>

      {/* Meio-fio baixo, interrompido no acesso. */}
      <mesh position={[0, 0.42, -27.7]} raycast={() => null}>
        <boxGeometry args={[87, 0.55, 0.8]} />
        <meshStandardMaterial color={p.calcada} roughness={0.94} />
      </mesh>
      {[-40.5, 40.5].map((x) => (
        <mesh key={`lateral-${x}`} position={[x, 0.42, 0]} raycast={() => null}>
          <boxGeometry args={[0.8, 0.55, 54]} />
          <meshStandardMaterial color={p.calcada} roughness={0.94} />
        </mesh>
      ))}
      {[-27, 27].map((x) => (
        <mesh key={`sul-${x}`} position={[x, 0.42, 27.7]} raycast={() => null}>
          <boxGeometry args={[27, 0.55, 0.8]} />
          <meshStandardMaterial color={p.calcada} roughness={0.94} />
        </mesh>
      ))}

      <Veiculo x={10} z={16.2} cor="#8b2f2f" p={p} />
      <Veiculo x={-13} z={16.2} cor="#b7ad98" p={p} />
      <Poste x={-36} z={-23} p={p} />
      <Poste x={36} z={-23} p={p} />
      <Poste x={36} z={23} p={p} />
      <Arbusto x={-43} z={-26} escala={0.8} p={p} />
      <Arbusto x={43} z={-26} escala={0.8} p={p} />
    </group>
  );
}

function ElementosTerreno({ p }: { p: Paleta3D }) {
  const texturaGramado = useMemo(
    () => criarTexturaSolo('#ffffff', '#65704d', 'gramado', [0.08, 0.08]),
    []
  );
  useEffect(() => () => texturaGramado.dispose(), [texturaGramado]);
  const campos: Array<[number, number, number, string]> = [
    [-168, -88, 72, p.gramado],
    [158, -90, 76, p.gramadoClaro],
    [-185, 38, 68, p.gramadoClaro],
    [176, 38, 70, p.gramado],
    [-145, 122, 62, p.gramado],
    [82, 138, 54, p.gramadoClaro],
  ];
  const jardins: Array<[number, number, number, string]> = [
    [-257, -104, 19, p.gramado],
    [-76, -124, 16, p.gramadoClaro],
    [68, -126, 18, p.gramado],
    [254, -102, 21, p.gramadoClaro],
    [-264, 52, 19, p.gramadoClaro],
    [263, 57, 21, p.gramado],
    [-242, 151, 22, p.gramado],
    [23, 154, 19, p.gramadoClaro],
    [276, 163, 18, p.gramado],
  ];
  const postes: Array<[number, number]> = [
    [-55, -36],
    [56, -36],
    [-62, 50],
    [63, 52],
    [-38, 111],
    [72, 111],
  ];
  return (
    <group>
      {/* Grandes setores verdes formam o solo arquitetônico contínuo. */}
      {campos.map(([x, z, r, cor], i) => (
        <JardimOrganico
          key={`campo-${i}`}
          x={x}
          z={z}
          raio={r}
          cor={cor}
          indice={20 + i}
          p={p}
          textura={texturaGramado}
        />
      ))}

      {/* Ilhas menores articulam bordas e áreas de descanso. */}
      {jardins.map(([x, z, r, cor], i) => (
        <JardimOrganico
          key={`jardim-${i}`}
          x={x}
          z={z}
          raio={r}
          cor={cor}
          indice={i}
          p={p}
          textura={texturaGramado}
        />
      ))}

      <Estacionamento3D p={p} />

      {/* Praça central com acabamento mineral e mobiliário. */}
      <mesh
        position={[0, 0.17, 16]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={() => null}
      >
        <circleGeometry args={[43, 48]} />
        <meshStandardMaterial color={p.concretoDetalhe} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.2, 16]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[36, 37, 48]} />
        <meshStandardMaterial color={p.filete} transparent opacity={0.34} roughness={0.7} />
      </mesh>
      {/* Rosa de circulação embutida no piso; baixa e não interceptável. */}
      {[0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].map((rot, i) => (
        <mesh
          key={`eixo-praca-${i}`}
          position={[0, 0.225, 16]}
          rotation={[-Math.PI / 2, 0, rot]}
          raycast={() => null}
        >
          <planeGeometry args={[27, i < 2 ? 0.42 : 0.25]} />
          <meshBasicMaterial color={p.filete} transparent opacity={i < 2 ? 0.25 : 0.16} />
        </mesh>
      ))}
      {/* Canteiros baixos nas diagonais preservam o miolo caminhável. */}
      {[
        [-16, 16],
        [16, 16],
      ].map(([x, z], i) => (
        <group key={`canteiro-${i}`} position={[x, 0, z]} raycast={() => null}>
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[3.4, 3.8, 1.1, 12]} />
            <meshStandardMaterial color={p.concretoDetalhe} roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.45, 0]} castShadow>
            <sphereGeometry args={[2.5, 10, 7]} />
            <meshStandardMaterial color={p.gramadoClaro} roughness={0.96} />
          </mesh>
        </group>
      ))}
      <MonumentoPandora p={p} />
      <Banco x={-31} z={15} rot={Math.PI / 2} p={p} />
      <Banco x={31} z={15} rot={Math.PI / 2} p={p} />
      <Lixeira x={-35} z={23} p={p} />
      <Lixeira x={35} z={23} p={p} />
      <TotemCampus x={-46} z={-12} rot={0.62} p={p} />
      <TotemCampus x={46} z={44} rot={-0.8} p={p} />
      {postes.map(([x, z], i) => (
        <Poste key={`poste-${i}`} x={x} z={z} p={p} />
      ))}
    </group>
  );
}

/* --------------------------------------------------- caminhos do chão */

function hashCurva(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return h;
}

/** Ribbon extrudado ao longo de uma curva: topo, laterais e tampas reais. */
function geometriaPassarela(curva: THREE.CatmullRomCurve3, largura: number, espessura: number) {
  const segmentos = 28;
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let distancia = 0;
  let anterior: THREE.Vector3 | null = null;
  for (let i = 0; i <= segmentos; i += 1) {
    const t = i / segmentos;
    const centro = curva.getPointAt(t);
    const tangente = curva.getTangentAt(t).normalize();
    const lateral = new THREE.Vector3(-tangente.z, 0, tangente.x)
      .normalize()
      .multiplyScalar(largura / 2);
    const e = centro.clone().sub(lateral);
    const d = centro.clone().add(lateral);
    if (anterior) distancia += anterior.distanceTo(centro);
    anterior = centro;
    vertices.push(
      e.x,
      e.y,
      e.z,
      d.x,
      d.y,
      d.z,
      e.x,
      e.y - espessura,
      e.z,
      d.x,
      d.y - espessura,
      d.z
    );
    const v = distancia / 7;
    uvs.push(0, v, 1, v, 0, v, 1, v);
    if (i < segmentos) {
      const a = i * 4;
      const n = a + 4;
      indices.push(a, n, a + 1, a + 1, n, n + 1);
      indices.push(a, a + 2, n, n, a + 2, n + 2);
      indices.push(a + 1, n + 1, a + 3, a + 3, n + 1, n + 3);
    }
  }
  indices.push(0, 1, 2, 1, 3, 2);
  const fim = segmentos * 4;
  indices.push(fim, fim + 2, fim + 1, fim + 1, fim + 2, fim + 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function criarCurvaCaminho(
  caminho: Modelo3D['caminhos'][number],
  inverter = false,
  elevacao = 0.42
): THREE.CatmullRomCurve3 {
  const inicio = inverter ? caminho.para : caminho.de;
  const fim = inverter ? caminho.de : caminho.para;
  const a = new THREE.Vector3(inicio.x, elevacao, inicio.z);
  const b = new THREE.Vector3(fim.x, elevacao, fim.z);
  const dir = b.clone().sub(a);
  const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const sinalBase = hashCurva(`${caminho.de.id}-${caminho.para.id}`) % 2 === 0 ? 1 : -1;
  const sinal = inverter ? -sinalBase : sinalBase;
  const intensidade =
    caminho.tipo === 'alameda'
      ? Math.min(8.5, dir.length() * 0.075)
      : Math.min(2.2, dir.length() * 0.025);
  const meio = a
    .clone()
    .lerp(b, 0.5)
    .addScaledVector(normal, intensidade * sinal);
  return new THREE.CatmullRomCurve3(
    [a, a.clone().lerp(b, 0.22), meio, a.clone().lerp(b, 0.78), b],
    false,
    'centripetal',
    0.45
  );
}

function PassarelaCurva({
  caminho,
  largura,
  cor,
  borda,
  textura,
}: {
  caminho: Modelo3D['caminhos'][number];
  largura: number;
  cor: string;
  borda: string;
  textura: THREE.Texture;
}) {
  const curva = useMemo(() => criarCurvaCaminho(caminho), [caminho]);
  const geoBorda = useMemo(() => geometriaPassarela(curva, largura + 1.8, 0.34), [curva, largura]);
  const geoPiso = useMemo(() => {
    const elevada = curva.clone();
    elevada.points = curva.points.map((ponto) => ponto.clone().setY(ponto.y + 0.13));
    return geometriaPassarela(elevada, largura, 0.25);
  }, [curva, largura]);
  useEffect(
    () => () => {
      geoBorda.dispose();
      geoPiso.dispose();
    },
    [geoBorda, geoPiso]
  );
  return (
    <group raycast={() => null}>
      <mesh geometry={geoBorda} receiveShadow>
        <meshStandardMaterial color={borda} roughness={0.96} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geoPiso} receiveShadow>
        <meshPhysicalMaterial
          color={cor}
          map={textura}
          bumpMap={textura}
          bumpScale={0.07}
          roughness={0.9}
          clearcoat={0.04}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Caminhos({ p, acessivel }: { p: Paleta3D; acessivel: boolean }) {
  const texturaPavimento = useMemo(
    () => criarTexturaSolo('#ffffff', '#77736a', 'calcada', [2, 1]),
    []
  );
  useEffect(() => () => texturaPavimento.dispose(), [texturaPavimento]);
  const cores: Record<string, string> = {
    alameda: p.alameda,
    corredor: p.corredor,
    escada: p.escada,
    rampa: p.rampa,
  };
  const larguras: Record<string, number> = {
    alameda: 9.2,
    corredor: 5.8,
    escada: 4.4,
    rampa: 4.8,
  };
  const graus = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const c of MODELO.caminhos) {
      mapa.set(c.de.id, (mapa.get(c.de.id) ?? 0) + 1);
      mapa.set(c.para.id, (mapa.get(c.para.id) ?? 0) + 1);
    }
    return mapa;
  }, []);
  return (
    <group>
      {MODELO.caminhos
        .filter((c) => Math.abs(c.para.y - c.de.y) <= 0.1)
        .map((c) => (
          <PassarelaCurva
            key={`curva-${c.de.id}-${c.para.id}`}
            caminho={c}
            largura={larguras[c.tipo]}
            cor={cores[c.tipo]}
            borda={p.concretoDetalhe}
            textura={texturaPavimento}
          />
        ))}

      {/* Rótulas circulares eliminam cantos rígidos nas interseções. */}
      {MODELO.pontos
        .filter((no) => no.y === 0 && (graus.get(no.id) ?? 0) >= 2)
        .map((no) => {
          const grau = graus.get(no.id) ?? 2;
          const raio = grau >= 3 ? 7.2 : 5.2;
          return (
            <group key={`rotula-${no.id}`} position={[no.x, 0.44, no.z]} raycast={() => null}>
              <mesh receiveShadow>
                <cylinderGeometry args={[raio, raio, 0.32, 28]} />
                <meshStandardMaterial color={p.concretoDetalhe} roughness={0.94} />
              </mesh>
              <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <circleGeometry args={[raio - 0.9, 28]} />
                <meshStandardMaterial color={p.alameda} map={texturaPavimento} roughness={0.9} />
              </mesh>
            </group>
          );
        })}

      {/* Geometria vertical coerente com as mesmas arestas do grafo. */}
      {MODELO.caminhos
        .filter((c) => Math.abs(c.para.y - c.de.y) > 0.1)
        .map((c) => {
          const a = new THREE.Vector3(c.de.x, c.de.y + 0.42, c.de.z);
          const b = new THREE.Vector3(c.para.x, c.para.y + 0.42, c.para.z);
          if (c.tipo === 'rampa') {
            return (
              <Fita
                key={`vertical-${c.de.id}-${c.para.id}`}
                de={a}
                para={b}
                largura={4.8}
                altura={0.4}
                cor={p.rampa}
                emissivo={0.08}
                progresso={1}
              />
            );
          }

          const degraus = 9;
          const dx = c.para.x - c.de.x;
          const dz = c.para.z - c.de.z;
          const comprimento = Math.hypot(dx, dz);
          const angulo = -Math.atan2(dz, dx);
          return (
            <group key={`vertical-${c.de.id}-${c.para.id}`} raycast={() => null}>
              {Array.from({ length: degraus }, (_, i) => {
                const t = (i + 0.5) / degraus;
                return (
                  <mesh
                    key={i}
                    position={[
                      THREE.MathUtils.lerp(c.de.x, c.para.x, t),
                      THREE.MathUtils.lerp(c.de.y, c.para.y, t) + 0.24,
                      THREE.MathUtils.lerp(c.de.z, c.para.z, t),
                    ]}
                    rotation={[0, angulo, 0]}
                  >
                    <boxGeometry args={[comprimento / degraus + 0.5, 0.45, 4.4]} />
                    <meshStandardMaterial
                      color={p.escada}
                      transparent={acessivel}
                      opacity={acessivel ? 0.28 : 1}
                      roughness={0.7}
                    />
                  </mesh>
                );
              })}
            </group>
          );
        })}
    </group>
  );
}

/* --------------------------------------------------------- fita da rota */

function Fita({
  de,
  para,
  largura,
  altura,
  cor,
  emissivo,
  progresso,
}: {
  de: THREE.Vector3;
  para: THREE.Vector3;
  largura: number;
  altura: number;
  cor: string;
  emissivo: number;
  progresso: number;
}) {
  const { origem, direcao, quat, len } = useMemo(() => {
    const dir = para.clone().sub(de);
    const l = dir.length() || 0.001;
    return {
      origem: de.clone(),
      direcao: dir.clone().normalize(),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize()),
      len: l,
    };
  }, [de, para]);
  const prog = Math.max(0, Math.min(1, progresso));
  if (prog <= 0.004) return null;
  return (
    <mesh position={origem.clone().addScaledVector(direcao, (len * prog) / 2)} quaternion={quat}>
      <boxGeometry args={[len * prog, altura, largura]} />
      <meshStandardMaterial
        color={cor}
        emissive={cor}
        emissiveIntensity={emissivo}
        transparent
        opacity={0.94}
        roughness={0.5}
      />
    </mesh>
  );
}

/* -------------------------------------------- detalhes arquitetônicos */

/**
 * Fachadas estilizadas e leves. São filhas do prédio, não participam do
 * raycasting e usam apenas boxes compartilháveis: janelas, embasamento,
 * marquise e lanternim. A quantidade se adapta ao tamanho de cada volume.
 */
function DetalhesFachada({
  volume,
  altura,
  p,
}: {
  volume: Modelo3D['volumes'][number];
  altura: number;
  p: Paleta3D;
}) {
  if (volume.zona) return null;
  const { w, h } = volume.tamanho;
  const colunasFrente = Math.max(3, Math.min(10, Math.floor(w / 13)));
  const colunasLado = Math.max(2, Math.min(7, Math.floor(h / 13)));
  const pisos = altura >= 15 ? [altura * 0.34, altura * 0.67] : [altura * 0.53];
  const janelaW = Math.min(6.4, (w * 0.76) / colunasFrente);
  const janelaLadoW = Math.min(5.8, (h * 0.72) / colunasLado);
  const janelaH = Math.min(3.2, altura * 0.22);

  return (
    <group>
      {/* Embasamento protege visualmente a parede e ancora o volume. */}
      <mesh
        geometry={GEO_BOX}
        scale={[w + 1, 1.1, h + 1]}
        position={[0, 0.55, 0]}
        raycast={() => null}
      >
        <meshStandardMaterial color={p.concretoDetalhe} roughness={0.9} />
      </mesh>

      {/* Frisos horizontais separam pavimentos sem virar uma grade pesada. */}
      {pisos.length > 1 ? (
        <mesh
          geometry={GEO_BOX}
          scale={[w + 0.5, 0.36, h + 0.5]}
          position={[0, altura * 0.51, 0]}
          raycast={() => null}
        >
          <meshStandardMaterial color={p.concretoDetalhe} roughness={0.75} />
        </mesh>
      ) : null}

      {/* Panos de vidro na fachada sul (a face mais legível na vista geral). */}
      {pisos.flatMap((y, piso) =>
        Array.from({ length: colunasFrente }, (_, i) => {
          const x = ((i + 0.5) / colunasFrente - 0.5) * w * 0.82;
          return (
            <mesh
              key={`s-${piso}-${i}`}
              geometry={GEO_BOX}
              scale={[janelaW, janelaH, 0.24]}
              position={[x, y, h / 2 + 0.13]}
              raycast={() => null}
            >
              <meshPhysicalMaterial
                color={p.vidro}
                emissive={p.vidroEmissivo}
                emissiveIntensity={0.08}
                metalness={0.18}
                roughness={0.22}
                clearcoat={0.65}
                clearcoatRoughness={0.2}
              />
            </mesh>
          );
        })
      )}

      {/* Segunda fachada dá profundidade ao orbitar a câmera. */}
      {pisos.flatMap((y, piso) =>
        Array.from({ length: colunasLado }, (_, i) => {
          const z = ((i + 0.5) / colunasLado - 0.5) * h * 0.78;
          return (
            <mesh
              key={`l-${piso}-${i}`}
              geometry={GEO_BOX}
              scale={[0.24, janelaH, janelaLadoW]}
              position={[w / 2 + 0.13, y, z]}
              raycast={() => null}
            >
              <meshPhysicalMaterial
                color={p.vidro}
                emissive={p.vidroEmissivo}
                emissiveIntensity={0.07}
                metalness={0.18}
                roughness={0.24}
                clearcoat={0.6}
              />
            </mesh>
          );
        })
      )}

      {/* Marquise e lanternim: silhueta arquitetônica, não bloco genérico. */}
      <mesh
        geometry={GEO_BOX}
        scale={[Math.min(18, w * 0.34), 0.55, 4.5]}
        position={[0, 4.7, h / 2 + 2]}
        castShadow
        raycast={() => null}
      >
        <meshStandardMaterial color={p.teto} metalness={0.14} roughness={0.5} />
      </mesh>
      <mesh
        geometry={GEO_BOX}
        scale={[Math.min(17, w * 0.25), 1.2, Math.min(10, h * 0.25)]}
        position={[w * 0.18, altura + 0.9, -h * 0.12]}
        castShadow
        raycast={() => null}
      >
        <meshPhysicalMaterial
          color={p.vidro}
          emissive={p.vidroEmissivo}
          emissiveIntensity={0.06}
          roughness={0.28}
          clearcoat={0.7}
        />
      </mesh>
    </group>
  );
}

/**
 * Assinatura arquitetônica por função. Mantém o volume-base e acrescenta
 * poucos elementos reconhecíveis: sheds dos laboratórios, lanternim da
 * biblioteca, pórtico do auditório, marquise da secretaria e pergolado da
 * convivência. Tudo é decorativo e não intercepta seleção.
 */
function IdentidadePredio({
  volume,
  altura,
  p,
}: {
  volume: Modelo3D['volumes'][number];
  altura: number;
  p: Paleta3D;
}) {
  if (volume.zona) return null;
  const { w, h } = volume.tamanho;
  const decorativo = { raycast: () => null } as const;

  if (volume.id === 'biblioteca') {
    return (
      <group {...decorativo}>
        {/* Lanternim longitudinal e aletas: luz zenital de biblioteca. */}
        <mesh position={[0, altura + 1.8, 0]} castShadow>
          <boxGeometry args={[w * 0.58, 3.2, h * 0.2]} />
          <meshPhysicalMaterial
            color={p.vidro}
            emissive={p.vidroEmissivo}
            emissiveIntensity={0.13}
            roughness={0.2}
            clearcoat={0.8}
            transparent
            opacity={0.86}
          />
        </mesh>
        {[-0.3, -0.15, 0, 0.15, 0.3].map((fator) => (
          <mesh key={fator} position={[w * fator, altura * 0.48, h / 2 + 0.34]}>
            <boxGeometry args={[0.42, altura * 0.72, 0.7]} />
            <meshStandardMaterial color={p.concretoDetalhe} roughness={0.7} />
          </mesh>
        ))}
        {/* Pavilhão de leitura envidraçado rompe o volume retangular. */}
        <mesh position={[w * 0.28, altura * 0.31, h / 2 + 5.2]} castShadow>
          <cylinderGeometry args={[7.5, 7.5, altura * 0.62, 20]} />
          <meshPhysicalMaterial
            color={p.vidro}
            emissive={p.vidroEmissivo}
            emissiveIntensity={0.09}
            transparent
            opacity={0.82}
            roughness={0.2}
            clearcoat={0.82}
          />
        </mesh>
      </group>
    );
  }

  if (volume.id === 'auditorio') {
    return (
      <group {...decorativo}>
        {/* Pórtico cívico: grande marquise e pilares na fachada de acesso. */}
        <mesh position={[0, altura * 0.48, -h / 2 - 1.2]} castShadow>
          <boxGeometry args={[w * 0.64, 1, 5.2]} />
          <meshPhysicalMaterial color={p.teto} metalness={0.12} roughness={0.42} clearcoat={0.35} />
        </mesh>
        {[-0.24, -0.08, 0.08, 0.24].map((fator) => (
          <mesh key={fator} position={[w * fator, altura * 0.24, -h / 2 - 1.4]} castShadow>
            <cylinderGeometry args={[0.48, 0.62, altura * 0.48, 10]} />
            <meshStandardMaterial color={p.concretoDetalhe} roughness={0.72} />
          </mesh>
        ))}
        {/* Caixa acústica superior diferencia a silhueta. */}
        <mesh position={[0, altura + 1.25, h * 0.1]} castShadow>
          <boxGeometry args={[w * 0.46, 2.2, h * 0.46]} />
          <meshStandardMaterial color={p.concretoDetalhe} roughness={0.68} />
        </mesh>
        {/* Foyer semicircular voltado à praça. */}
        <mesh position={[0, altura * 0.36, -h / 2 - 2]} scale={[1, 1, 0.58]} castShadow>
          <cylinderGeometry args={[w * 0.22, w * 0.22, altura * 0.72, 28, 1, false, 0, Math.PI]} />
          <meshPhysicalMaterial
            color={p.vidro}
            emissive={p.vidroEmissivo}
            emissiveIntensity={0.08}
            roughness={0.26}
            clearcoat={0.7}
          />
        </mesh>
      </group>
    );
  }

  if (volume.id === 'blocoB') {
    return (
      <group {...decorativo}>
        {/* Sheds/lanternins técnicos dos laboratórios. */}
        {[-0.25, 0, 0.25].map((fator) => (
          <group key={fator} position={[w * fator, altura + 1.4, 0]} rotation={[0, 0, -0.2]}>
            <mesh castShadow>
              <boxGeometry args={[w * 0.16, 2.5, h * 0.52]} />
              <meshPhysicalMaterial
                color={p.vidro}
                emissive={p.vidroEmissivo}
                emissiveIntensity={0.1}
                roughness={0.24}
                clearcoat={0.72}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  if (volume.id === 'blocoA') {
    return (
      <group {...decorativo}>
        {/* Ritmo acadêmico: pilastras claras e relógio/medalhão central. */}
        {[-0.34, -0.17, 0.17, 0.34].map((fator) => (
          <mesh key={fator} position={[w * fator, altura * 0.48, h / 2 + 0.38]}>
            <boxGeometry args={[0.7, altura * 0.82, 0.76]} />
            <meshStandardMaterial color={p.concretoDetalhe} roughness={0.74} />
          </mesh>
        ))}
        <mesh position={[0, altura * 0.73, h / 2 + 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[2, 2, 0.55, 24]} />
          <meshStandardMaterial color={p.filete} metalness={0.35} roughness={0.42} />
        </mesh>
        {/* Torres de circulação nas extremidades dão leitura de bloco acadêmico. */}
        {[-0.46, 0.46].map((fator) => (
          <mesh key={`torre-${fator}`} position={[w * fator, altura * 0.58, -h * 0.22]} castShadow>
            <boxGeometry args={[8.5, altura * 1.16, h * 0.34]} />
            <meshStandardMaterial color={p.concretoDetalhe} roughness={0.7} />
          </mesh>
        ))}
      </group>
    );
  }

  if (volume.id === 'secretaria') {
    return (
      <group {...decorativo}>
        {/* Atendimento: marquise linear e guichês contínuos. */}
        <mesh position={[0, altura * 0.5, h / 2 + 2.2]} castShadow>
          <boxGeometry args={[w * 0.82, 0.65, 5]} />
          <meshStandardMaterial color={p.teto} metalness={0.12} roughness={0.48} />
        </mesh>
        <mesh position={[0, altura * 0.34, h / 2 + 0.3]}>
          <boxGeometry args={[w * 0.68, altura * 0.3, 0.35]} />
          <meshPhysicalMaterial
            color={p.vidro}
            emissive={p.vidroEmissivo}
            emissiveIntensity={0.1}
            roughness={0.2}
            clearcoat={0.7}
          />
        </mesh>
      </group>
    );
  }

  if (volume.id === 'convivencia') {
    return (
      <group {...decorativo}>
        {/* Pergolado aberto: leitura mais leve e social. */}
        {[-0.32, -0.16, 0, 0.16, 0.32].map((fator) => (
          <mesh key={fator} position={[w * fator, altura + 1.2, 0]} castShadow>
            <boxGeometry args={[1, 1, h * 0.78]} />
            <meshStandardMaterial color={p.concretoDetalhe} roughness={0.72} />
          </mesh>
        ))}
        <mesh position={[0, altura * 0.42, h / 2 + 1.6]} castShadow>
          <boxGeometry args={[w * 0.5, 0.55, 4]} />
          <meshStandardMaterial color={p.gramadoClaro} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  return null;
}

/* ------------------------------------------------------ volume (prédio) */

function Volume({
  volume,
  p,
  tema,
  selecionado,
  onSelecionarPredio,
  revelado,
}: {
  volume: Modelo3D['volumes'][number];
  p: Paleta3D;
  tema: 'claro' | 'escuro';
  selecionado: boolean;
  onSelecionarPredio: (id: string) => void;
  revelado: boolean;
}) {
  const [passando, setPassando] = useState(false);
  const t = volume.tamanho;
  const alturaVisivel = volume.zona ? Math.min(volume.altura + 0.4, 0.9) : volume.altura;
  // Zonas abertas continuam sendo hit-areas clicáveis, mas sua representação
  // visual vive no terreno nivelado (praça/estacionamento), não em boxes.
  const opacidadeParede = volume.zona ? 0 : revelado ? 0.55 : 0.97;

  return (
    <group position={[volume.centro.x, 0, volume.centro.z]}>
      {/* Contorno maquete — seleção/hover */}
      <mesh
        visible={passando || selecionado}
        scale={[t.w + 1.4, alturaVisivel + 1.4, t.h + 1.4]}
        position={[0, alturaVisivel / 2, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          transparent
          color={selecionado ? p.ouro : p.osso}
          opacity={selecionado ? 0.85 : 0.45}
        />
      </mesh>

      {/* Corpo principal */}
      <mesh
        geometry={GEO_BOX}
        scale={[t.w, alturaVisivel, t.h]}
        position={[0, alturaVisivel / 2, 0]}
        castShadow={!volume.zona}
        receiveShadow={!volume.zona}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelecionarPredio(volume.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setPassando(true);
        }}
        onPointerOut={() => setPassando(false)}
      >
        <meshPhysicalMaterial
          color={passando ? p.vidroMezanino : p.parede}
          transparent
          opacity={volume.zona ? 0 : passando ? Math.max(opacidadeParede, 0.55) : opacidadeParede}
          depthWrite={!volume.zona}
          roughness={0.82}
          metalness={0.05}
          clearcoat={0.14}
          clearcoatRoughness={0.72}
          emissive={passando ? p.filete : '#000000'}
          emissiveIntensity={passando ? 0.1 : 0}
        />
      </mesh>

      {/* Arestas (leitura de maquete) */}
      <lineSegments
        geometry={GEO_EDGES}
        scale={[t.w, alturaVisivel, t.h]}
        position={[0, alturaVisivel / 2, 0]}
      >
        <lineBasicMaterial color={p.aresta} transparent opacity={volume.zona ? 0 : 0.7} />
      </lineSegments>

      <DetalhesFachada volume={volume} altura={alturaVisivel} p={p} />
      <IdentidadePredio volume={volume} altura={alturaVisivel} p={p} />

      {/* Filete dourado no perímetro do teto + cobertura + mezanino */}
      {!volume.zona ? (
        <>
          <mesh
            geometry={GEO_BOX}
            scale={[t.w + 0.4, 0.26, 0.4]}
            position={[0, alturaVisivel + 0.13, t.h / 2]}
          >
            <meshStandardMaterial color={p.filete} emissive={p.filete} emissiveIntensity={0.4} />
          </mesh>
          <mesh
            geometry={GEO_BOX}
            scale={[t.w + 0.4, 0.26, 0.4]}
            position={[0, alturaVisivel + 0.13, -t.h / 2]}
          >
            <meshStandardMaterial color={p.filete} emissive={p.filete} emissiveIntensity={0.4} />
          </mesh>
          <mesh
            geometry={GEO_BOX}
            scale={[0.4, 0.26, t.h + 0.4]}
            position={[t.w / 2, alturaVisivel + 0.13, 0]}
          >
            <meshStandardMaterial color={p.filete} emissive={p.filete} emissiveIntensity={0.4} />
          </mesh>
          <mesh
            geometry={GEO_BOX}
            scale={[0.4, 0.26, t.h + 0.4]}
            position={[-t.w / 2, alturaVisivel + 0.13, 0]}
          >
            <meshStandardMaterial color={p.filete} emissive={p.filete} emissiveIntensity={0.4} />
          </mesh>
          <mesh
            geometry={GEO_BOX}
            scale={[t.w - 0.8, 0.3, t.h - 0.8]}
            position={[0, alturaVisivel + 0.15, 0]}
          >
            <meshPhysicalMaterial
              color={p.teto}
              roughness={0.58}
              metalness={0.08}
              clearcoat={0.28}
              clearcoatRoughness={0.62}
            />
          </mesh>

          {volume.alturaMezanino > 0 ? (
            <>
              {/* Laje do mezanino */}
              <mesh
                geometry={GEO_BOX}
                scale={[t.w * 0.84, 0.4, t.h * 0.8]}
                position={[0, volume.alturaMezanino, 0]}
              >
                <meshStandardMaterial
                  color={p.vidroMezanino}
                  transparent
                  opacity={revelado ? 0.85 : 0.4}
                  roughness={0.6}
                />
              </mesh>
              {/* Volume interno do pavimento superior */}
              <mesh
                geometry={GEO_BOX}
                scale={[
                  t.w * 0.66,
                  Math.max(volume.altura - volume.alturaMezanino - 1.2, 0.8),
                  t.h * 0.6,
                ]}
                position={[
                  0,
                  volume.alturaMezanino + (volume.altura - volume.alturaMezanino) / 2,
                  0,
                ]}
              >
                <meshStandardMaterial
                  color={p.vidroMezanino}
                  transparent
                  opacity={revelado ? 0.7 : 0.32}
                  roughness={0.7}
                />
              </mesh>
            </>
          ) : null}
        </>
      ) : null}

      {/* Chip do prédio flutuando acima do teto */}
      <Etiqueta
        variante="predio"
        texto={volume.codigo}
        tema={tema}
        y={volume.id === 'praca' ? alturaVisivel + 16 : alturaVisivel + 6}
      />
    </group>
  );
}

/* -------------------------------------------------------------- entradas */

function Entradas({ p, rota }: { p: Paleta3D; rota: Rota | null }) {
  const portas = [
    'blocoAPorta',
    'blocoBPorta',
    'bibPorta',
    'audPorta',
    'convPorta',
    'secretPorta',
    'estacPorta',
  ];
  return (
    <group>
      {portas.map((id) => {
        const ponto = MODELO.pontos.find((x) => x.id === id);
        if (!ponto) return null;
        const predio = predioDoNo(id);
        const vol = MODELO.volumes.find((v) => v.id === predio);
        if (!vol) return null;
        // Normal apontando para FORA do prédio; o arco fica de frente para ela.
        const nx = ponto.x - vol.centro.x;
        const nz = ponto.z - vol.centro.z;
        const angulo = Math.atan2(nx, nz);
        const naRota = rota?.nos.includes(id) ?? false;
        const destino = rota?.nos.at(-1) === id;
        return (
          <group
            key={`porta-${id}`}
            position={[ponto.x, 0, ponto.z]}
            rotation={[0, angulo, 0]}
            raycast={() => null}
          >
            {/* Arco dourado da entrada */}
            <mesh position={[0, 4.25, 1]}>
              <torusGeometry args={[2.4, 0.17, 8, 26, Math.PI]} />
              <meshStandardMaterial
                color={naRota ? p.ouroVivo : p.filete}
                emissive={p.filete}
                emissiveIntensity={naRota ? 0.65 : 0.22}
                metalness={0.5}
                roughness={0.35}
              />
            </mesh>
            {[-2.4, 2.4].map((x) => (
              <mesh key={x} position={[x, 2.15, 1]} castShadow>
                <boxGeometry args={[0.34, 4.3, 0.34]} />
                <meshStandardMaterial
                  color={naRota ? p.ouroVivo : p.filete}
                  emissive={p.filete}
                  emissiveIntensity={naRota ? 0.45 : 0.12}
                  metalness={0.4}
                  roughness={0.4}
                />
              </mesh>
            ))}
            {/* Vidro da porta */}
            <mesh position={[0, 2.1, 1.0]}>
              <boxGeometry args={[4.5, 4.2, 0.14]} />
              <meshPhysicalMaterial
                color={p.vidro}
                emissive={p.vidroEmissivo}
                emissiveIntensity={naRota ? 0.22 : 0.06}
                transparent
                opacity={0.68}
                roughness={0.2}
                clearcoat={0.75}
              />
            </mesh>
            {/* Marquise curta torna o acesso reconhecível em visão oblíqua. */}
            <mesh position={[0, 5.25, 2.3]} castShadow>
              <boxGeometry args={[6.5, 0.38, 3.2]} />
              <meshStandardMaterial color={p.teto} metalness={0.12} roughness={0.5} />
            </mesh>
            {/* Capa no chão */}
            <mesh position={[0, 0.09, 2.4]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[7, 4.6]} />
              <meshStandardMaterial
                color={naRota ? p.ouro : p.alameda}
                transparent
                opacity={naRota ? 0.72 : 0.9}
                roughness={0.84}
              />
            </mesh>
            {naRota ? (
              <mesh position={[0, 0.18, 2.4]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[2.7, destino ? 4.1 : 3.5, 28]} />
                <meshBasicMaterial
                  color={destino ? p.ouroVivo : p.ouro}
                  transparent
                  opacity={destino ? 0.72 : 0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}
            {naRota ? (
              <pointLight position={[0, 5.4, 2]} color={p.ouro} intensity={0.45} distance={28} />
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------- vegetação */

function Arvore({ x, z, escala, p }: { x: number; z: number; escala: number; p: Paleta3D }) {
  return (
    <group position={[x, 0, z]} scale={escala * 1.25} raycast={() => null}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.58, 4, 8]} />
        <meshStandardMaterial color={p.concretoDetalhe} roughness={0.96} />
      </mesh>
      <mesh position={[0, 5.4, 0]} castShadow>
        <dodecahedronGeometry args={[2.8, 1]} />
        <meshStandardMaterial color={p.vegetacao} roughness={0.95} />
      </mesh>
      <mesh position={[-1.7, 4.8, 0.35]} castShadow>
        <dodecahedronGeometry args={[2.05, 1]} />
        <meshStandardMaterial color={p.gramado} roughness={0.96} />
      </mesh>
      <mesh position={[1.55, 5, -0.25]} castShadow>
        <dodecahedronGeometry args={[2.2, 1]} />
        <meshStandardMaterial color={p.gramadoClaro} roughness={0.96} />
      </mesh>
    </group>
  );
}

function Arbusto({ x, z, p, escala = 1 }: { x: number; z: number; p: Paleta3D; escala?: number }) {
  return (
    <group position={[x, 0.45, z]} scale={escala} raycast={() => null}>
      {[-1.5, 0, 1.45].map((dx, i) => (
        <mesh key={dx} position={[dx, i === 1 ? 0.55 : 0, i === 1 ? -0.35 : 0]} castShadow>
          <dodecahedronGeometry args={[1.35 + (i === 1 ? 0.25 : 0), 0]} />
          <meshStandardMaterial color={i === 1 ? p.gramadoClaro : p.vegetacao} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Vegetacao({ p }: { p: Paleta3D }) {
  const arvores = useMemo(() => {
    // RNG determinístico: mesma vegetação em cada visita (sem flicker de SSR).
    let semente = 7;
    const rnd = () => {
      semente = (semente * 16807) % 2147483647;
      return semente / 2147483647;
    };
    const spots: Array<[number, number, number]> = [];
    for (let i = 0; i < 20; i += 1) {
      const ang = (i / 20) * Math.PI * 2 + rnd() * 0.16;
      const raio = 275 + rnd() * 34;
      spots.push([Math.cos(ang) * raio, Math.sin(ang) * raio * 0.78 + 10, 0.86 + rnd() * 0.58]);
    }
    // Árvores curadas nas ilhas de jardim — fora de prédios e passarelas.
    for (const [gx, gz] of [
      [-260, -108],
      [-78, -126],
      [68, -128],
      [258, -104],
      [-267, 54],
      [266, 59],
      [-246, 153],
      [25, 157],
      [279, 165],
    ] as const) {
      spots.push([gx, gz, 1.05 + rnd() * 0.38]);
    }
    return spots;
  }, []);
  return (
    <group>
      {arvores.map(([x, z, e], i) => (
        <Arvore key={`arv-${i}`} x={x} z={z} escala={e} p={p} />
      ))}
      {[
        [-244, -105, 1.05],
        [-88, -127, 0.9],
        [57, -130, 0.95],
        [242, -104, 1.05],
        [-252, 54, 1],
        [251, 61, 1.05],
        [-230, 154, 1.1],
        [10, 157, 0.95],
      ].map(([x, z, e], i) => (
        <Arbusto key={`arb-${i}`} x={x} z={z} escala={e} p={p} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------ pinos/salas */

function Pino({
  sala,
  ponto,
  ativo,
  tipo,
  p,
  tema,
  onSelecionarSala,
}: {
  sala: Modelo3D['salas'][number]['sala'];
  ponto: Modelo3D['salas'][number]['ponto'];
  ativo: boolean;
  tipo: VarianteEtiqueta;
  p: Paleta3D;
  tema: 'claro' | 'escuro';
  onSelecionarSala: (id: string) => void;
}) {
  return (
    <group position={[ponto.x, ponto.y, ponto.z]}>
      <mesh
        scale={ativo ? 1.5 : 1}
        castShadow={false}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelecionarSala(sala.id);
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => e.stopPropagation()}
      >
        <icosahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial
          color={ativo ? p.ouroVivo : p.osso}
          emissive={ativo ? p.ouro : p.corredor}
          emissiveIntensity={ativo ? 0.55 : 0.14}
          roughness={0.4}
        />
      </mesh>
      <Etiqueta variante={tipo} texto={sala.codigo} tema={tema} y={ativo ? 3.4 : 2.3} />
    </group>
  );
}

function PinosSalas({
  p,
  tema,
  predioSelecionadoId,
  salaFocada,
  onSelecionarSala,
}: {
  p: Paleta3D;
  tema: 'claro' | 'escuro';
  predioSelecionadoId: string | null;
  salaFocada: Sala | null;
  onSelecionarSala: (id: string) => void;
}) {
  const listas = useMemo(() => {
    const banheiros = MODELO.salas.filter((s) => s.sala.categoria === 'banheiro');
    const doPredio = predioSelecionadoId
      ? MODELO.salas.filter(
          (s) => s.sala.predioId === predioSelecionadoId && s.sala.categoria !== 'banheiro'
        )
      : [];
    return { banheiros, doPredio };
  }, [predioSelecionadoId]);

  const foca = salaFocada ? MODELO.salas.find((s) => s.sala.id === salaFocada.id) : undefined;

  return (
    <group>
      {listas.banheiros.map(({ sala, ponto }) => (
        <Pino
          key={`wc-${sala.id}`}
          sala={sala}
          ponto={ponto}
          ativo={salaFocada?.id === sala.id}
          tipo="wc"
          p={p}
          tema={tema}
          onSelecionarSala={onSelecionarSala}
        />
      ))}
      {listas.doPredio.map(({ sala, ponto }) => (
        <Pino
          key={`sp-${sala.id}`}
          sala={sala}
          ponto={ponto}
          ativo={salaFocada?.id === sala.id}
          tipo="sala"
          p={p}
          tema={tema}
          onSelecionarSala={onSelecionarSala}
        />
      ))}

      {foca ? (
        <group position={[foca.ponto.x, foca.ponto.y, foca.ponto.z]}>
          {/* Anel de foco no piso do pavimento da sala */}
          <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[4.4, 0.24, 10, 40]} />
            <meshStandardMaterial
              color={p.ouro}
              emissive={p.ouro}
              emissiveIntensity={0.5}
              roughness={0.4}
            />
          </mesh>
          <Etiqueta
            variante="sala"
            texto={foca.sala.codigo + (foca.sala.andar === 'mezanino' ? ' · M' : '')}
            tema={tema}
            y={6.4}
          />
        </group>
      ) : null}
    </group>
  );
}

/* ---------------------------------------------------------- rota em 3D */

function FitaRotaCurva({
  caminho,
  inverter,
  progresso,
  ativo,
  p,
}: {
  caminho: Modelo3D['caminhos'][number];
  inverter: boolean;
  progresso: number;
  ativo: boolean;
  p: Paleta3D;
}) {
  const geometria = useMemo(() => {
    const y = Math.max(caminho.de.y, caminho.para.y) + 0.92;
    const completa = criarCurvaCaminho(caminho, inverter, y);
    const n = Math.max(2, Math.ceil(24 * Math.max(0.02, progresso)));
    const pontos = Array.from({ length: n + 1 }, (_, i) =>
      completa.getPointAt((i / n) * progresso)
    );
    const parcial = new THREE.CatmullRomCurve3(pontos, false, 'centripetal', 0.45);
    return geometriaPassarela(parcial, ativo ? 2.8 : 1.9, ativo ? 0.62 : 0.44);
  }, [ativo, caminho, inverter, progresso]);
  useEffect(() => () => geometria.dispose(), [geometria]);
  return (
    <mesh geometry={geometria} raycast={() => null}>
      <meshStandardMaterial
        color={ativo ? p.ouroVivo : p.filete}
        emissive={p.ouro}
        emissiveIntensity={ativo ? 0.68 : 0.42}
        roughness={0.42}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Rota3DScene({
  rota,
  p,
  passoAtivo,
}: {
  rota: Rota | null;
  p: Paleta3D;
  passoAtivo: number | null;
}) {
  const segmentos = useMemo(() => (rota ? rotaPara3D(rota) : []), [rota]);

  const [progresso, setProgresso] = useState(1);
  useEffect(() => {
    if (!rota || segmentos.length === 0) {
      setProgresso(1);
      return;
    }
    if (prefereMenosMovimento()) {
      setProgresso(1);
      return;
    }
    setProgresso(0);
    let raf = 0;
    const inicio = performance.now();
    const durar = 1400;
    const avancar = () => {
      const t = (performance.now() - inicio) / durar;
      setProgresso(Math.min(1, t));
      if (t < 1) raf = requestAnimationFrame(avancar);
    };
    raf = requestAnimationFrame(avancar);
    return () => cancelAnimationFrame(raf);
  }, [rota, segmentos.length]);

  if (!rota || segmentos.length === 0) return null;

  const origem = MODELO.pontos.find((n) => n.id === rota.nos[0]);
  const destino = MODELO.pontos.find((n) => n.id === rota.nos[rota.nos.length - 1]);

  return (
    <group>
      {segmentos.map((seg, i) => {
        const revelado = Math.max(0, Math.min(1, progresso * segmentos.length - i));
        if (revelado <= 0.004) return null;
        const a = seg.pontos[0];
        const b = seg.pontos[1];
        const ativo = passoAtivo === i;
        const noA = rota.nos[i];
        const noB = rota.nos[i + 1];
        const caminho = MODELO.caminhos.find(
          (c) => (c.de.id === noA && c.para.id === noB) || (c.de.id === noB && c.para.id === noA)
        );
        if (caminho && Math.abs(caminho.para.y - caminho.de.y) <= 0.1) {
          return (
            <FitaRotaCurva
              key={`seg-curvo-${i}-${seg.instrucao}`}
              caminho={caminho}
              inverter={caminho.de.id !== noA}
              progresso={revelado}
              ativo={ativo}
              p={p}
            />
          );
        }
        return (
          <Fita
            key={`seg-${i}-${seg.instrucao}`}
            de={new THREE.Vector3(a.x, a.y, a.z)}
            para={new THREE.Vector3(b.x, b.y, b.z)}
            largura={ativo ? 2.7 : 1.8}
            altura={ativo ? 0.62 : 0.42}
            cor={ativo ? p.ouroVivo : p.filete}
            emissivo={ativo ? 0.9 : 0.45}
            progresso={revelado}
          />
        );
      })}

      {origem ? (
        <mesh position={[origem.x, origem.y + 0.18, origem.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.7, 2.7, 30]} />
          <meshStandardMaterial
            color={p.ouro}
            emissive={p.ouro}
            emissiveIntensity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}

      {destino ? (
        <group>
          <mesh position={[destino.x, destino.y + 0.32, destino.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.1, 3.3, 30]} />
            <meshStandardMaterial
              color={p.ouroVivo}
              emissive={p.ouro}
              emissiveIntensity={passoAtivo !== null ? 0.95 : 0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Farol vertical discreto no destino */}
          <mesh position={[destino.x, destino.y + 7.5, destino.z]}>
            <cylinderGeometry args={[0.4, 0.4, 15, 10, 1, true]} />
            <meshBasicMaterial
              color={p.ouro}
              transparent
              opacity={0.18}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/* --------------------------------------------------------- luz da cena */

function Luzes({ p }: { p: Paleta3D }) {
  return (
    <>
      <hemisphereLight args={[p.osso, p.gramado, 1.05]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        castShadow
        position={[-240, 300, 180]}
        intensity={1.3}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-420}
        shadow-camera-right={420}
        shadow-camera-top={320}
        shadow-camera-bottom={-320}
        shadow-camera-far={1100}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
      />
      <directionalLight position={[260, 190, -230]} intensity={0.5} color={p.vidroEmissivo} />
      <pointLight position={[0, 90, 20]} intensity={0.22} color={p.ouroVivo} distance={500} />
    </>
  );
}

/* ----------------------------------------------- máquina de foco da câmera */

const DURACAO_TWEEN = 1.25;

function MaquinaCamera({
  foco,
  visaoGeral,
  aoAnimando,
}: {
  foco: FocoAlvo | null;
  visaoGeral: number;
  aoAnimando: (v: boolean) => void;
}) {
  const controls = useThree((s) => s.controls) as ControlesCam | null;
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const tween = useRef<{
    t: number;
    posDe: THREE.Vector3;
    alvoDe: THREE.Vector3;
  } | null>(null);
  const assinatura = useRef('');

  useEffect(() => {
    // A assinatura inclui o contador: "ver visão geral" sempre re-anima mesmo
    // que o foco já fosse nulo (p.ex. após o usuário deslocar a câmera).
    const novaAssinatura = `${visaoGeral}|${
      foco
        ? `${foco.pos.x.toFixed(1)},${foco.pos.y.toFixed(1)},${foco.pos.z.toFixed(
            1
          )},${foco.alvo.x.toFixed(1)},${foco.alvo.z.toFixed(1)}`
        : 'geral'
    }`;
    if (novaAssinatura === assinatura.current) return;
    assinatura.current = novaAssinatura;
    tween.current = {
      t: 0,
      posDe: camera.position.clone(),
      alvoDe: controls ? controls.target.clone() : ALVO_PADRAO.clone(),
    };
    aoAnimando(true);
  }, [foco, visaoGeral, camera, controls, aoAnimando]);

  useFrame((_, dt) => {
    const atual = tween.current;
    if (!atual || !controls) return;
    atual.t = Math.min(1, atual.t + dt / DURACAO_TWEEN);
    const e = 1 - Math.pow(1 - atual.t, 3);
    const alvoFinal = foco ? foco.alvo : ALVO_PADRAO;
    const posFinal = foco ? foco.pos : POS_PADRAO;
    controls.target.lerpVectors(atual.alvoDe, alvoFinal, e);
    camera.position.lerpVectors(atual.posDe, posFinal, e);
    controls.update();
    invalidate();
    if (atual.t >= 1) {
      tween.current = null;
      aoAnimando(false);
    }
  });
  return null;
}

/** Mantém o alvo do pan dentro da maquete — nada de "perder" o campus. */
function ClampAlvo() {
  const controls = useThree((s) => s.controls) as ControlesCam | null;
  useFrame(() => {
    if (!controls) return;
    const alvo = controls.target;
    if (Math.abs(alvo.x) > EXTENSAO_X || Math.abs(alvo.z) > EXTENSAO_Z) {
      alvo.x = THREE.MathUtils.clamp(alvo.x, -EXTENSAO_X, EXTENSAO_X);
      alvo.z = THREE.MathUtils.clamp(alvo.z, -EXTENSAO_Z, EXTENSAO_Z);
      controls.update();
    }
  });
  return null;
}

/* ---------------------------------------------------------- foco câmera */

/** Deriva o alvo da câmera do estado atual (passo → sala → prédio → geral). */
function computarFoco({
  passoAtivo,
  rota,
  salaFocada,
  predioSelecionadoId,
}: {
  passoAtivo: number | null;
  rota: Rota | null;
  salaFocada: Sala | null;
  predioSelecionadoId: string | null;
}): FocoAlvo | null {
  if (passoAtivo !== null && rota && rota.nos.length > passoAtivo + 1) {
    const a = MODELO.pontos.find((n) => n.id === rota.nos[passoAtivo]);
    const b = MODELO.pontos.find((n) => n.id === rota.nos[passoAtivo + 1]);
    if (a && b) {
      const meio = {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
      };
      return {
        pos: new THREE.Vector3(meio.x - 85, Math.max(meio.y + 75, 70), meio.z + 125),
        alvo: new THREE.Vector3(meio.x, meio.y + 1, meio.z),
      };
    }
  }
  // Com a rota completa ativa, a visão geral é mais útil do que o close da
  // sala selecionada: permite entender o percurso inteiro antes de iniciar
  // a demonstração passo a passo.
  if (rota) return null;
  if (salaFocada) {
    const item = MODELO.salas.find((s) => s.sala.id === salaFocada.id);
    if (item) {
      const y = item.ponto.y;
      return {
        pos: new THREE.Vector3(item.ponto.x + 112, y + 128, item.ponto.z + 190),
        alvo: new THREE.Vector3(item.ponto.x, y + 1.5, item.ponto.z),
      };
    }
  }
  if (predioSelecionadoId) {
    const vol = MODELO.volumes.find((v) => v.id === predioSelecionadoId);
    if (vol) {
      const alto = vol.zona ? 0 : vol.altura;
      return {
        pos: new THREE.Vector3(vol.centro.x + 96, alto + 154, vol.centro.z + 168),
        alvo: new THREE.Vector3(vol.centro.x, alto / 2, vol.centro.z),
      };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ cena */

function Cena({
  tema,
  rota,
  acessivel,
  salaFocada,
  predioSelecionadoId,
  onSelecionarSala,
  onSelecionarPredio,
  modoRota = false,
  passoAtivo = null,
  visaoGeral = 0,
}: Campus3DProps) {
  const { paleta } = usePreferences();
  const p = paleta === 'fiap' ? CORES_3D_FIAP[tema] : CORES_3D[tema];
  const invalidate = useThree((s) => s.invalidate);

  // Prédios "de vidro": atravessados pela rota ativa ou selecionado.
  const revelados = useMemo(() => {
    const set = modoRota && rota ? prediosNaRota(rota.nos) : new Set<string>();
    if (predioSelecionadoId) set.add(predioSelecionadoId);
    return set;
  }, [modoRota, rota, predioSelecionadoId]);

  // Cinto de segurança: cada mudança visual garante ao menos um frame na modal
  // de demanda (a R3F normalmente invalida no commit, isto é redobro).
  useEffect(() => {
    invalidate();
  }, [
    tema,
    rota,
    acessivel,
    salaFocada,
    predioSelecionadoId,
    modoRota,
    passoAtivo,
    visaoGeral,
    revelados,
    p,
    invalidate,
  ]);

  return (
    <>
      <color attach="background" args={[p.fundoCena]} />
      <fog attach="fog" args={[p.fundoCena, 900, 1600]} />
      <Luzes p={p} />
      <Piso p={p} />
      <ElementosTerreno p={p} />
      <Caminhos p={p} acessivel={acessivel} />
      {MODELO.volumes.map((v) => (
        <Volume
          key={v.id}
          volume={v}
          p={p}
          tema={tema}
          selecionado={predioSelecionadoId === v.id}
          onSelecionarPredio={onSelecionarPredio}
          revelado={revelados.has(v.id)}
        />
      ))}
      <Entradas p={p} rota={rota} />
      <PinosSalas
        p={p}
        tema={tema}
        predioSelecionadoId={predioSelecionadoId}
        salaFocada={salaFocada}
        onSelecionarSala={onSelecionarSala}
      />
      <Rota3DScene rota={rota} p={p} passoAtivo={passoAtivo} />
      <Vegetacao p={p} />
    </>
  );
}

/* ------------------------------------------------------------- wrapper 3D */

export default function Campus3D(props: Campus3DProps) {
  const [animado, setAnimado] = useState(false);
  const aoAnimando = useCallback((v: boolean) => setAnimado((a) => (a === v ? a : v)), []);
  // Alvo de câmera do estado atual (compartilhado pela máquina de tween).
  const foco = useMemo(
    () =>
      computarFoco({
        passoAtivo: props.passoAtivo ?? null,
        rota: props.rota,
        salaFocada: props.salaFocada,
        predioSelecionadoId: props.predioSelecionadoId,
      }),
    [props.passoAtivo, props.rota, props.salaFocada, props.predioSelecionadoId]
  );

  return (
    <Canvas
      shadows="basic"
      dpr={[1, 1.8]}
      camera={{
        position: VISAO_GERAL_POS,
        fov: 41,
        near: 1,
        far: 1600,
      }}
      frameloop={animado ? 'always' : 'demand'}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: props.tema === 'escuro' ? 1.38 : 1.08,
      }}
      style={{ touchAction: 'none', width: '100%', height: '100%' }}
    >
      <Cena {...props} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.09}
        minDistance={60}
        maxDistance={860}
        minPolarAngle={0.5}
        maxPolarAngle={1.33}
        enablePan
        screenSpacePanning={false}
        target={VISAO_GERAL_ALVO}
        onStart={() => aoAnimando(true)}
        onEnd={() => aoAnimando(false)}
      />
      <MaquinaCamera foco={foco} visaoGeral={props.visaoGeral ?? 0} aoAnimando={aoAnimando} />
      <ClampAlvo />
    </Canvas>
  );
}
