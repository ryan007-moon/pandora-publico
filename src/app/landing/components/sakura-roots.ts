import * as THREE from 'three';

/**
 * Sakura root veins — editorial motion below the real tree.
 * One shared WebGL context; screen-space ribbons are anchored to document Y,
 * rather than separate canvases/scenes that reset as the user scrolls.
 * The thick, textured roots remain on the glTF tree. These thin lines are a
 * stylised continuation into the campus journey, not fake tubular 3D roots.
 */
export function createRootTrails(parent: THREE.Group, mobile: boolean) {
  const group = new THREE.Group();
  parent.add(group);
  const uniforms = {
    uViewport: { value: new THREE.Vector2(1, 1) },
    uScroll: { value: 0 },
    uTime: { value: 0 },
    uStill: { value: 0 },
    uVisible: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
    vertexShader: `
      uniform vec2 uViewport;
      uniform float uScroll, uTime, uStill;
      attribute float aAlong, aPhase, aStrength, aSide;
      varying float vAlong, vStrength, vSide, vPulse;
      void main() {
        vec3 p = position;
        // Centreline stays planted at the trunk. Wind displacement grows away
        // from the root, so there is never a floating or detached base.
        float give = smoothstep(0., .19, aAlong) * (1. - uStill);
        p.x += give * (sin(uTime*.19 + aPhase + aAlong*18.)*4.1
                    + sin(uTime*.32 - aPhase*1.4 + aAlong*35.)*1.9);
        p.y = uViewport.y + uScroll - position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        vAlong = aAlong;
        vStrength = aStrength;
        vSide = aSide;
        vPulse = pow(max(0., sin(aAlong*24.0 - uTime*.48 + aPhase)), 8.);
      }
    `,
    fragmentShader: `
      uniform float uVisible;
      varying float vAlong, vStrength, vSide, vPulse;
      void main() {
        float edge = pow(max(0., 1. - abs(vSide)), .55);
        float fade = (1. - smoothstep(.73, 1., vAlong)) * (.55 + .45*smoothstep(0., .055, vAlong));
        float breathe = .80 + .20*vPulse;
        float alpha = edge * fade * vStrength * breathe * uVisible;
        if (alpha < .003) discard;
        vec3 barkRose = vec3(.36, .17, .27);
        vec3 rootGlow = vec3(1.0, .43, .65);
        vec3 color = mix(barkRose, rootGlow, .48 + .40*vPulse);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
  const meshes: THREE.Mesh[] = [];

  function ribbon(curve: THREE.CatmullRomCurve3, segments: number, width: number, strength: number, phase: number) {
    const vertices: number[] = [], along: number[] = [], phases: number[] = [], strengths: number[] = [], sides: number[] = [], indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const d = Math.hypot(tangent.x, tangent.y) || 1;
      const normalX = -tangent.y / d, normalY = tangent.x / d;
      // A root begins wide enough to meet the textured base, then branches into
      // fine ink-like filaments, tapering to nearly nothing below the campus.
      const half = width * Math.pow(1 - t, 1.28) / 2;
      for (const side of [-1, 1]) {
        vertices.push(p.x + normalX * half * side, p.y + normalY * half * side, -250);
        along.push(t); phases.push(phase); strengths.push(strength); sides.push(side*.60);
      }
      if (i < segments) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    geometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute(strengths, 1));
    geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(sides, 1));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -3;
    meshes.push(mesh);
    group.add(mesh);
  }

  function resize(width: number, height: number, baseX: number, baseY: number, documentHeight: number) {
    uniforms.uViewport.value.set(width, height);
    for (const mesh of meshes) { group.remove(mesh); mesh.geometry.dispose(); }
    meshes.length = 0;
    // Continue past the campus, courses and accessibility sections. Do not force
    // a straight geometric line or multiply the number of particles.
    // Carry the main veins below the document so their visible ends never form a horizontal cut.
    // Smaller branches fade naturally along their own curves within the page.
    const end = Math.max(documentHeight + height*.24, baseY + height*1.9);
    const usable = Math.max(1, end - baseY);
    // Distribute the roots while still close to the trunk. The previous curves
    // used a fraction of document height as their first bend, which kept the
    // strands bunched together for most of the first screen.
    const core = mobile ? 9 : 15;
    const left = width * (mobile ? .07 : .055);
    const right = width * (mobile ? .93 : .945);
    const firstBendY = Math.min(height * .24, mobile ? 135 : 190);
    const secondBendY = Math.min(height * .72, mobile ? 350 : 530);

    for (let k = 0; k < core; k++) {
      const fraction = k / (core - 1);
      const r = (fraction - .5) * 2;
      const destination = THREE.MathUtils.lerp(left, right, fraction);
      const dx = destination - baseX;
      const bend = Math.sin(k * 2.37 + .8) * width * (mobile ? .014 : .026);
      const yStop = end - height * (.015 + .035 * ((k * 3) % 5) / 4);

      // Absolute viewport-sized bends: visibly spread in the first ~200px,
      // then flow organically down the rest of the document.
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(baseX + r * 7, baseY - 8, -250),
        new THREE.Vector3(baseX + r * 20 + dx * .035, baseY + 48 + (k % 4) * 8, -250),
        new THREE.Vector3(baseX + dx * .30 + bend * .28, baseY + firstBendY, -250),
        new THREE.Vector3(baseX + dx * .68 - bend * .48, baseY + secondBendY, -250),
        new THREE.Vector3(destination + bend, baseY + usable * .34, -250),
        new THREE.Vector3(destination - bend * .66, baseY + usable * .69, -250),
        new THREE.Vector3(destination, yStop, -250),
      ], false, 'centripetal');
      ribbon(curve, mobile ? 148 : 215, mobile ? 1.6 : 2.5, mobile ? .43 : .53, k * 1.63 + .45);

      // Fine tributaries fork near the base rather than one viewport below it.
      // Their different lengths and end positions avoid another straight cut.
      for (let branch = 0; branch < (mobile ? 2 : 3); branch++) {
        const t = (mobile ? .12 : .105) + branch * (mobile ? .16 : .12) + (k % 4) * .007;
        const at = curve.getPoint(t);
        const direction = (k + branch) % 2 ? -1 : 1;
        const spread = direction * width * (mobile ? .16 : .19);
        const tipX = THREE.MathUtils.clamp(at.x + spread, width * .045, width * .955);
        const tail = height * (.88 + branch * .25 + (k % 5) * .07);
        const offshoot = new THREE.CatmullRomCurve3([
          at,
          new THREE.Vector3(at.x + spread * .17, at.y + 45, -251),
          new THREE.Vector3(at.x + spread * .64, at.y + Math.min(height * .37, 230), -251),
          new THREE.Vector3(tipX + bend * .22, at.y + tail * .72, -251),
          new THREE.Vector3(tipX, Math.min(end - 20, at.y + tail), -251),
        ], false, 'centripetal');
        ribbon(offshoot, mobile ? 62 : 88, mobile ? .90 : 1.25, .32, .62 + branch * 1.2 + k);
      }
    }
  }
  function update(time: number, scroll: number, reduced: boolean, ready: boolean) {
    uniforms.uTime.value = time;
    uniforms.uScroll.value = scroll;
    uniforms.uStill.value = reduced ? 1 : 0;
    uniforms.uVisible.value = ready ? 1 : 0;
  }
  function dispose() {
    for (const mesh of meshes) mesh.geometry.dispose();
    material.dispose();
    parent.remove(group);
  }
  return { resize, update, dispose };
}
