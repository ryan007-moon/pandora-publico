'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createSakuraScene } from './sakura-scene';
import { ouvirMudancaMovimento, prefereMenosMovimento } from '@/lib/movimento';

/**
 * A single living landscape for the entire public journey. This canvas remains
 * mounted between sections: no scene resets, snapping camera cuts or per-section
 * WebGL contexts. Every point is animated by shaders, not React state.
 */
export default function SectionAtmosphere({ mood: _mood = 'knowledge' }: { mood?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const mobile = matchMedia('(max-width: 767px)').matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !mobile, // mobile: trade costly MSAA for sharper native-resolution pixels
        powerPreference: 'high-performance',
      });
    } catch {
      return; // The CSS atmosphere remains visible when WebGL is not supported.
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Lower iOS fill-rate for alpha-tested leaves without dropping desktop quality.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.5));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.dataset.ready = 'false';
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
    host.appendChild(renderer.domElement);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      renderer.domElement.dataset.ready = 'false';
      contextAvailable = false;
      updateAnimation();
    };
    const onContextRestored = () => {
      contextAvailable = true;
      readyFrames = 0;
      renderer.domElement.dataset.ready = 'false';
      updateAnimation();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
    camera.position.set(0, 0, 39);
    const field = new THREE.Group();
    scene.add(field);

    // Four depth families, spread over the whole viewport rather than an isolated
    // glowing ring. Golden river-banks form the signature Pandora atmosphere.
    const count = mobile ? 1950 : 6200;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    let rng = 14621;
    const rand = () => {
      rng = (rng * 16807) % 2147483647;
      return (rng - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 72;
      const z = (rand() - 0.5) * 34;
      const layer = i % 4;
      const river =
        Math.sin(x * 0.088 + layer * 0.6) * (3.2 + layer * 0.8) +
        Math.sin(x * 0.195 - layer * 0.9) * 1.75;
      const jitter = (rand() - 0.5) * (layer === 3 ? 24 : 7.3);
      positions.set([x, river + jitter - 2.5, z - layer * 1.6], i * 3);
      seeds.set([rand() * Math.PI * 2, rand(), 1 + rand() * 4], i * 3);
      const amber = rand();
      const accent = rand();
      // Mostly warm gold, with a very small amount of bone-white and muted olive
      // particles to break the field softly without changing the Pandora palette.
      if (accent < 0.032) colors.set([0.98, 0.92, 0.79], i * 3);
      else if (accent < 0.045) colors.set([0.64, 0.7, 0.5], i * 3);
      else colors.set([1, 0.49 + 0.38 * amber, 0.085 + 0.23 * amber], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const uniforms = {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uOpacity: { value: 0.54 },
      uEnergy: { value: 0 },
      uDpr: { value: renderer.getPixelRatio() },
      uPalette: { value: document.documentElement.dataset.palette === 'fiap' ? 1 : 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        attribute vec3 aSeed;
        attribute vec3 color;
        uniform float uTime;
        uniform float uScroll;
        uniform vec2 uPointer;
        uniform float uDpr;
        uniform float uEnergy;
        uniform float uPalette;
        varying vec3 vColor;
        varying float vStrength;
        void main() {
          vec3 p=position;
          float t=uTime;
          float phase=aSeed.x;
          float s=uScroll;
          // Three non-repeating frequencies; a slowly changing field, not a looping GIF.
          // Two drifting currents, several incommensurate speeds: no short looping motion.
          float flow=sin(p.x*.13+t*.42+phase)*1.10 + sin(p.x*.065-t*.25+p.z*.105)*1.40;
          flow+=cos(p.x*.23+t*.15+phase*1.3)*.82;
          float breathe=.85+abs(sin(s*3.7+t*.11))*.28;
          p.y+=flow*breathe;
          p.x+=sin(p.y*.16+t*.28+phase)*1.05;
          p.z+=sin(p.x*.09+t*.31+phase)*1.55;
          // The whole landscape changes attitude as visitors progress, not section-by-section resets.
          p.y+=sin(s*5.8+p.x*.034)*2.3;
          p.x+=sin(s*4.3+p.z*.05)*1.6;
          p.xy += vec2(cos(t*.23+p.z*.20),sin(t*.17+p.x*.19))*(.25+uEnergy*.65);
          vec4 view=modelViewMatrix*vec4(p,1.);
          vec4 clip=projectionMatrix*view;
          vec2 screen=clip.xy/max(clip.w,.01);
          vec2 delta=screen-uPointer;
          float influence=exp(-dot(delta,delta)*9.5);
          clip.xy+=vec2(-delta.y,delta.x)*influence*(.10+aSeed.y*.13+uEnergy*.045)*clip.w;
          gl_Position=clip;
          float depth=clamp(38./max(-view.z,1.),.5,1.9);
          gl_PointSize=clamp((1.10+aSeed.y*2.9)*depth*uDpr,1.0,8.5);
          vec3 fiap=vec3(.93,.079,.35)*(.76 + aSeed.y*.40);
          if(color.g>.91) fiap=vec3(1.,.68,.82);
          vColor=mix(color,fiap,uPalette);
          vStrength=(.73+.27*sin(t*(.6+aSeed.y*.5)+phase*3.4))*(.47+aSeed.y*.53)*(1.+uEnergy*.22);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        varying vec3 vColor;
        varying float vStrength;
        void main() {
          float r=length(gl_PointCoord-.5)*2.;
          if(r>1.) discard;
          float soft=pow(1.-r,2.65);
          float core=pow(1.-r,5.);
          gl_FragColor=vec4(vColor*(1.04+core*.46), (soft*.72+core*.19)*uOpacity*vStrength);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    field.add(points);

    // Sparse filaments physically live in the same 3D space as the dust.
    const fibers: THREE.Line[] = [];
    const fiberGeometries: THREE.BufferGeometry[] = [];
    // Unlike a static wire grid, the filaments move under the same time/scroll field.
    const fiberMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uScroll;
        varying float vFade;
        void main() {
          vec3 p=position;
          p.y+=sin(p.x*.12+uTime*.52+p.z*.15)*.96
              +sin(p.x*.22-uTime*.34+p.z*.11)*.43;
          p.x+=sin(p.y*.15+uTime*.22)*.42;
          p.y+=sin(uScroll*5.8+p.x*.034)*2.3;
          p.x+=sin(uScroll*4.3+p.z*.05)*1.6;
          vec4 mv=modelViewMatrix*vec4(p,1.);
          gl_Position=projectionMatrix*mv;
          vFade=.40+.60*(1.-smoothstep(18.,72.,abs(p.x)));
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        uniform float uPalette;
        varying float vFade;
        void main() { gl_FragColor=vec4(mix(vec3(.88,.53,.14),vec3(.93,.12,.39),uPalette),.085*uOpacity*vFade); }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    for (let j = 0; j < (mobile ? 3 : 8); j++) {
      const vertices: THREE.Vector3[] = [];
      for (let i = 0; i <= 155; i++) {
        const x = -40 + (i / 155) * 80;
        const y =
          Math.sin(x * 0.088 + j * 0.4) * (3 + j * 0.12) +
          Math.sin(x * 0.19 - j * 0.6) * 1.6 +
          (j - 3.5) * 0.54 -
          2.5;
        vertices.push(new THREE.Vector3(x, y, -6 - j * 0.35));
      }
      const curve = new THREE.BufferGeometry().setFromPoints(vertices);
      const line = new THREE.Line(curve, fiberMaterial);
      field.add(line);
      fibers.push(line);
      fiberGeometries.push(curve);
    }

    // Wide translucent energy silk. Unlike repeated particle fields, this is a
    // continuous deforming surface in real 3D, behind the points and typography.
    // Inspired by scroll-synced WebGL composition, but built from our own shaders.
    const silkGeometry = new THREE.PlaneGeometry(94, 26, mobile ? 88 : 160, mobile ? 18 : 34);
    const silkMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        uniform float uTime;
        uniform float uScroll;
        uniform float uEnergy;
        varying vec2 vUv;
        varying float vDepth;
        void main(){
          vUv=uv;
          vec3 p=position;
          float t=uTime;
          float s=uScroll;
          float wave=sin(p.x*.122+t*.51+s*6.2)*2.2;
          wave+=sin(p.x*.065-t*.31+s*2.3)*1.7;
          wave+=sin(p.x*.23+t*.17+p.y*.23)*.68;
          p.y+=wave*(.56+.35*sin(uv.y*3.14159));
          p.x+=sin(p.y*.11+t*.2+s*4.)*.9;
          p.z+=cos(p.x*.1+t*.26+uv.y*4.6)*2.5;
          p.y+=sin(s*5.8+p.x*.04)*2.2;
          p.z+=sin(s*3.2+uv.y*5.)*1.5;
          vDepth=p.z;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uScroll;
        uniform float uOpacity;
        uniform float uEnergy;
        uniform float uPalette;
        varying vec2 vUv;
        varying float vDepth;
        void main(){
          float t=uTime;
          // Two narrow luminous currents, soft fringes and subtle interference.
          float w=sin(vUv.x*13.+t*.23+uScroll*5.)*.082
                +sin(vUv.x*25.-t*.31)*.025;
          float d=abs(vUv.y-.5-w);
          float core=exp(-d*d*440.);
          float halo=exp(-d*d*38.);
          float edge=exp(-pow(abs(vUv.y-.27-w*.7),2.)*170.);
          float grain=.82+.18*sin(vUv.x*95.+t*.44)*sin(vUv.y*80.-t*.25);
          float vertical=smoothstep(.0,.16,vUv.y)*(1.-smoothstep(.82,1.,vUv.y));
          float horizontal=smoothstep(.0,.12,vUv.x)*(1.-smoothstep(.84,1.,vUv.x));
          float alpha=(core*.076+halo*.032+edge*.016)*vertical*horizontal;
          alpha*=uOpacity*grain*(.91+uEnergy*.14);
          vec3 amber=mix(vec3(.49,.22,.045),vec3(1.,.72,.21),core*.75+uEnergy*.10);
          vec3 pink=mix(vec3(.46,.035,.16),vec3(1.,.32,.55),core*.75+uEnergy*.10);
          gl_FragColor=vec4(mix(amber,pink,uPalette),alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const silk = [0, 1].map((i) => {
      const mesh = new THREE.Mesh(silkGeometry, silkMaterial);
      mesh.position.set(i === 0 ? -13 : 11, i === 0 ? -6 : 5, -11 - i * 3);
      mesh.rotation.z = (i - 1) * 0.22;
      mesh.scale.set(1, i === 1 ? 0.85 : 1, 1);
      field.add(mesh);
      return mesh;
    });

    let sakura: ReturnType<typeof createSakuraScene> | undefined;
    const pointerTarget = new THREE.Vector2();
    const pointerSmooth = new THREE.Vector2();
    const clock = new THREE.Clock();
    let progress = 0;
    let scrollTarget = 0;
    let raf = 0;
    let reduced = prefereMenosMovimento();
    let suspended = false;
    let userPaused = false;
    let scrollVelocity = 0;
    let pointerEnergy = 0;
    let oldScroll = window.scrollY;
    let paletteTarget = document.documentElement.dataset.palette === 'fiap' ? 1 : 0;
    let paletteCompositing = false;
    const onPaletteTransition = (event: Event) => {
      paletteCompositing = Boolean((event as CustomEvent<{ active: boolean }>).detail?.active);
      updateAnimation();
    };
    // Pointer movement builds a directional gust, not a positional repulsion.
    const windImpulse = new THREE.Vector2();
    const windSmooth = new THREE.Vector2();
    let windFocus = 0;
    let previousPointer: { x: number; y: number; t: number } | null = null;
    let bufferW = 0, bufferH = 0;
    let readyFrames = 0;
    let contextAvailable = true;
    const onPalette = () => {
      paletteTarget = document.documentElement.dataset.palette === 'fiap' ? 1 : 0;
      // A previously loaded tree must stay ready. Forcing data-ready=false
      // here flashed the static fallback through the View Transition on iOS.
      if (paletteTarget === 1 && !sakura?.ready) {
        renderer.domElement.dataset.ready = 'false';
        readyFrames = 0;
      } else if (paletteTarget === 1 && sakura?.ready) {
        renderer.domElement.dataset.ready = 'true';
        readyFrames = 3;
      }
      uniforms.uPalette.value = paletteTarget;
      render();
    };
    const pauseHandler = (event: Event) => {
      userPaused = Boolean((event as CustomEvent<{ paused: boolean }>).detail?.paused);
      if (userPaused) render();
      updateAnimation();
    };
    const onScroll = () => {
      const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollTarget = Math.min(1, Math.max(0, window.scrollY / range));
      scrollVelocity = Math.min(1.5, scrollVelocity + Math.abs(window.scrollY - oldScroll) / 600);
      oldScroll = window.scrollY;
      if (reduced || userPaused) render();
    };
    const onPointer = (event: PointerEvent) => {
      if (reduced || event.pointerType === 'touch') return;
      const nextX = (event.clientX / Math.max(innerWidth, 1)) * 2 - 1;
      const nextY = 1 - (event.clientY / Math.max(innerHeight, 1)) * 2;
      pointerEnergy = Math.min(
        1.4,
        pointerEnergy + Math.hypot(nextX - pointerTarget.x, nextY - pointerTarget.y) * 1.4
      );
      pointerTarget.set(nextX, nextY);
      const now = performance.now();
      if (previousPointer) {
        const dt = Math.max(8, Math.min(90, now - previousPointer.t));
        const dx = event.clientX - previousPointer.x;
        const dy = event.clientY - previousPointer.y;
        // Use motion direction and speed; do not treat the absolute cursor X as wind.
        windImpulse.x = THREE.MathUtils.clamp(windImpulse.x + dx * (26 / dt), -155, 155);
        windImpulse.y = THREE.MathUtils.clamp(windImpulse.y + dy * (26 / dt), -115, 115);
        windFocus = Math.min(1,windFocus+Math.hypot(dx,dy)/100);
      }
      previousPointer = {x:event.clientX,y:event.clientY,t:now};
    };
    const onResize = () => {
      const width = Math.max(1, host.clientWidth);
      const measuredHeight = Math.max(1, host.clientHeight);
      // Keep the original backing height as iOS Safari retracts its toolbar.
      // A true orientation change modifies width and safely rebuilds the scene.
      const height = mobile && bufferW > 0 && Math.abs(bufferW - width) <= 2 && bufferH > 0
        ? bufferH : measuredHeight;
      if (Math.abs(width - bufferW) <= 1 && Math.abs(height - bufferH) <= 1) return;
      bufferW = width;
      bufferH = height;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = mobile ? 46 : 39;
      camera.updateProjectionMatrix();
      uniforms.uDpr.value = renderer.getPixelRatio();
      sakura?.resize();
      if (reduced || userPaused) render();
    };
    const render = () => {
      const fiap = paletteTarget === 1;
      field.visible = !fiap;
      if (fiap && !sakura) sakura = createSakuraScene(scene, mobile, () => {
        if (!host.isConnected) return;
        // Do not hide the illustrated fallback before the GL frame is drawn.
        readyFrames = 0;
        render();
      });
      if (sakura) {
        sakura.root.visible = fiap;
        if (fiap)
          sakura.update(
            uniforms.uTime.value,
            window.scrollY,
            pointerSmooth,
            uniforms.uEnergy.value,
            reduced,
            windSmooth,
            windFocus
          );
        // Preserve readiness while showing Original so the next switch
        // back to FIAP does not flicker or reintroduce the loading picture.
      }
      if (!contextAvailable) return;
      renderer.render(scene, fiap && sakura ? sakura.camera : camera);
      if (fiap && sakura?.ready) {
        readyFrames += 1;
        if (readyFrames >= 3 && renderer.domElement.dataset.ready !== 'true') {
          renderer.domElement.dataset.ready = 'true';
        }
      }
    };
    function drawStatic() {
      uniforms.uTime.value = 0;
      uniforms.uScroll.value = scrollTarget;
      uniforms.uOpacity.value = 0.56;
      uniforms.uPalette.value = paletteTarget;
      uniforms.uEnergy.value = 0;
      field.rotation.set(0, 0, 0);
      render();
    }
    let lastFrame = 0;
    const animate = (stamp: number) => {
      raf = 0;
      if (document.hidden || suspended || reduced || userPaused || paletteCompositing || !contextAvailable) return;
      // Avoid rendering 120-240 frames/s on high-refresh screens. A 14 ms
      // threshold preserves 60 Hz output without accidentally halving it.
      if (lastFrame && stamp - lastFrame < 14) {
        raf = requestAnimationFrame(animate);
        return;
      }
      lastFrame = stamp;
      const dt = Math.min(clock.getDelta(), 0.05);
      progress += (scrollTarget - progress) * Math.min(1, dt * 2.2);
      pointerSmooth.lerp(pointerTarget, Math.min(1, dt * 2.4));
      windImpulse.multiplyScalar(Math.exp(-dt*2.4));
      windSmooth.lerp(windImpulse, Math.min(1,dt*9));
      windFocus*=Math.exp(-dt*1.55);
      uniforms.uTime.value += dt;
      uniforms.uPalette.value += (paletteTarget - uniforms.uPalette.value) * Math.min(1, dt * 3.5);
      uniforms.uScroll.value = progress;
      scrollVelocity *= Math.exp(-dt * 2.8);
      pointerEnergy *= Math.exp(-dt * 3.9);
      const motionEnergy = Math.min(1.6, scrollVelocity + pointerEnergy * 0.8);
      uniforms.uEnergy.value += (motionEnergy - uniforms.uEnergy.value) * Math.min(1, dt * 4.2);
      uniforms.uPointer.value.copy(pointerSmooth);
      // Keep the scene quiet over the hero's own 3D, vivid below the fold.
      uniforms.uOpacity.value +=
        ((scrollTarget < 0.035 ? 0.68 : 0.76) - uniforms.uOpacity.value) * Math.min(1, dt * 1.6);
      field.rotation.y = Math.sin(uniforms.uTime.value * 0.14) * 0.1 + pointerSmooth.x * 0.055;
      field.rotation.z =
        Math.sin(uniforms.uTime.value * 0.091) * 0.055 + Math.sin(progress * 3.5) * 0.045;
      // The three layers never repeat on the same rhythm; scroll is one continuous coordinate.
      silk[0].rotation.z = -0.19 + Math.sin(uniforms.uTime.value * 0.084 + progress * 2.4) * 0.065;
      silk[1].rotation.z = 0.18 + Math.sin(uniforms.uTime.value * 0.063 - progress * 3.1) * 0.078;
      camera.position.x +=
        (pointerSmooth.x * 1.25 +
          Math.sin(uniforms.uTime.value * 0.17) * 0.24 -
          camera.position.x) *
        Math.min(1, dt * 2.1);
      camera.position.y +=
        (pointerSmooth.y * 0.75 +
          Math.cos(uniforms.uTime.value * 0.13) * 0.17 -
          camera.position.y) *
        Math.min(1, dt * 2.1);
      render();
      raf = requestAnimationFrame(animate);
    };
    function updateAnimation() {
      const running = !document.hidden && !suspended && !reduced && !userPaused
        && !paletteCompositing && contextAvailable;
      if (!running) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        lastFrame = 0;
        return;
      }
      if (!raf) {
        clock.getDelta();
        lastFrame = 0;
        raf = requestAnimationFrame(animate);
      }
    }
    function syncMotion() {
      reduced = prefereMenosMovimento();
      updateAnimation();
      if (reduced) drawStatic();
    }
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);
    const stopMotion = ouvirMudancaMovimento(syncMotion);
    const onVisibility = () => {
      suspended = document.hidden;
      if (!suspended && reduced) drawStatic();
      updateAnimation();
    };
    window.addEventListener('pandora:palette', onPalette);
    window.addEventListener('pandora:palette-transition', onPaletteTransition);
    window.addEventListener('pandora:journey-pause', pauseHandler);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    onResize();
    onScroll();
    syncMotion();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      stopMotion();
      window.removeEventListener('pandora:palette', onPalette);
      window.removeEventListener('pandora:palette-transition', onPaletteTransition);
      window.removeEventListener('pandora:journey-pause', pauseHandler);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      silk.forEach((mesh) => field.remove(mesh));
      sakura?.dispose();
      silkGeometry.dispose();
      silkMaterial.dispose();
      geometry.dispose();
      material.dispose();
      fiberGeometries.forEach((g) => g.dispose());
      fiberMaterial.dispose();
      fibers.forEach((fiber) => field.remove(fiber));
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="section-atmosphere section-atmosphere--journey"
      aria-hidden="true"
    />
  );
}
