import * as THREE from 'three';
import { createRootTrails } from './sakura-roots';

/**
 * A real, textured sakura by Jagobo (CC BY 4.0), plus one shader-driven
 * petal stream shared by the entire public journey. One renderer, no remounts
 * as the visitor crosses sections. Only mounted in the FIAP palette.
 *
 * Model credit: public/assets/models/sakura/CREDITOS.md
 */
export function createSakuraScene(scene: THREE.Scene, mobile: boolean, onReady?: () => void) {
  const root = new THREE.Group();
  scene.add(root);
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -2000, 2000);
  camera.position.z = 800;

  const tree = new THREE.Group();
  root.add(tree);
  // Root filaments use the same renderer and page coordinates as the petals.
  // They grow from the real trunk into the rest of the landing, without a seam.
  const trails = createRootTrails(root, mobile);
  let loaded = false;
  let disposed = false;
  let model: THREE.Object3D | undefined;
  let flowerScale = 1;
  const branchBreeze = { value: 0 };
  const animatedMaterials = new Set<THREE.MeshStandardMaterial>();
  const geomResources: THREE.BufferGeometry[] = [];
  const materialResources: THREE.Material[] = [];
  const textures = new Set<THREE.Texture>();

  const ambient = new THREE.HemisphereLight('#ffeff4', '#261c25', 1.1);
  const key = new THREE.DirectionalLight('#fff5fa', 1.8);
  key.position.set(-220, 420, 420);
  const rim = new THREE.DirectionalLight('#ed5286', 0.70);
  rim.position.set(320, 160, -260);
  root.add(ambient, key, rim);

  function disposeModel(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const geometry = child.geometry as THREE.BufferGeometry;
      geometry.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        for (const prop of Object.values(mat)) if (prop instanceof THREE.Texture) textures.add(prop);
        mat.dispose();
      }
    });
    for (const texture of textures) texture.dispose();
    textures.clear();
  }

  // Load the model parser only when the visitor actually selects FIAP.
  void import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    if (disposed) return;
    new GLTFLoader().load(
    mobile ? '/assets/models/sakura/scene-mobile.gltf' : '/assets/models/sakura/scene.gltf',
    ({ scene: imported }) => {
      if (disposed) { disposeModel(imported); return; }
      model = imported;
      // Source model is Z-up with the crown at negative Z; rotate it upright.
      model.rotation.x = Math.PI / 2;
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of mats) {
          if (material instanceof THREE.MeshStandardMaterial) {
            material.side = THREE.DoubleSide;
            // Alphabetic cutout avoids heavy sorting artifacts for overlapping blossoms.
            if (material.transparent || material.name.toLowerCase().includes('foliage')) {
              material.alphaTest = 0.14;
              material.alphaToCoverage = !mobile; // desktop MSAA; mobile uses higher DPR instead
              material.transparent = false;
              material.depthWrite = true;
            }
            material.roughness = Math.max(0.78, material.roughness);
            for (const texture of [material.map, material.normalMap, material.roughnessMap]) {
              if (texture) { texture.anisotropy = mobile ? 4 : 8; texture.needsUpdate = true; }
            }
            material.needsUpdate = true;
          }
        }
        child.frustumCulled = false;
      });
      // A lightweight vertex breeze bends the crown while holding the trunk fixed.
      // This runs on the GPU; no CPU mesh updates and no animation reset on scroll.
      model.traverse((part) => {
        if (!(part instanceof THREE.Mesh)) return;
        const mats = Array.isArray(part.material) ? part.material : [part.material];
        for (const mat of mats) {
          if (!(mat instanceof THREE.MeshStandardMaterial) || animatedMaterials.has(mat)) continue;
          animatedMaterials.add(mat);
          const originalCompile = mat.onBeforeCompile.bind(mat);
          mat.onBeforeCompile = (shader, renderer) => {
            originalCompile(shader, renderer);
            shader.uniforms.uSakuraBreeze = branchBreeze;
            shader.vertexShader = shader.vertexShader.replace(
              '#include <common>', '#include <common>\nuniform float uSakuraBreeze;'
            ).replace('#include <begin_vertex>', `#include <begin_vertex>
              float bloomHeight = clamp(-position.z / 103.0, 0.0, 1.0);
              float crownFlex = pow(smoothstep(0.13, 0.96, bloomHeight), 1.8);
              transformed.x += crownFlex * (sin(uSakuraBreeze * 0.57 + position.y * 0.042) * 0.72
                + cos(uSakuraBreeze * 0.29 + position.x * 0.052) * 0.40);
              transformed.y += crownFlex * sin(uSakuraBreeze * 0.41 + position.x * 0.054) * 0.32;
            `);
          };
          mat.customProgramCacheKey = () => 'pandora-branch-breeze-v12';
          mat.needsUpdate = true;
        }
      });

      // The downloaded model ends on a plane. Add short, asymmetrical tapered
      // roots in its own Z-up coordinates to give the base a believable footing.
      const barkMesh = imported.getObjectByName('Bark') as THREE.Mesh | undefined;
      // Round the source model's planar stump into a tapered root collar.
      // Work in mesh-local coordinates: the asset is Z-up, crown toward -Z.
      if (barkMesh?.geometry) {
        const geometry = barkMesh.geometry.clone();
        barkMesh.geometry = geometry;
        geometry.computeBoundingBox();
        const bounds = geometry.boundingBox;
        const positions = geometry.getAttribute('position');
        if (bounds && positions) {
          const depth = bounds.max.z - bounds.min.z;
          const collar = depth * 0.095;
          let cx = 0, cy = 0, samples = 0;
          for (let i = 0; i < positions.count; i++) {
            if (positions.getZ(i) >= bounds.max.z - collar * 0.12) {
              cx += positions.getX(i); cy += positions.getY(i); samples++;
            }
          }
          if (samples && collar > 0) {
            cx /= samples; cy /= samples;
            for (let i = 0; i < positions.count; i++) {
              const z = positions.getZ(i);
              const t = THREE.MathUtils.smoothstep(z, bounds.max.z - collar, bounds.max.z);
              const x = positions.getX(i) - cx, y = positions.getY(i) - cy;
              // The former .97 taper collapsed the bark into a point. The base
              // should widen into the roots, not turn into a pencil tip.
              const azimuth = Math.atan2(y, x);
              const flare = 1 + t * (0.23 + 0.055 * Math.sin(azimuth * 3));
              positions.setXYZ(i, cx + x * flare, cy + y * flare,
                z + t * collar * (0.075 + 0.02 * Math.cos(azimuth * 2)));
            }
            positions.needsUpdate = true;
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            geometry.computeBoundingSphere();
          }
        }
      }
      const bark = barkMesh?.material;
      const rootMaterial = bark instanceof THREE.MeshStandardMaterial
        ? bark.clone() : new THREE.MeshStandardMaterial({ color: '#594447', roughness: 0.96 });
      rootMaterial.side = THREE.FrontSide;
      materialResources.push(rootMaterial);
      const rootGroup = new THREE.Group();
      const scaleRoots = mobile ? 0.73 : 1;
      const angles = [0.18, 1.29, 2.53, 3.55, 4.83, 5.71];
      angles.forEach((angle, i) => {
        const length = (i % 2 === 0 ? 17 : 23) * scaleRoots;
        const ux = Math.cos(angle), uy = Math.sin(angle);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(ux * 0.65, uy * 0.6, -6.1 * scaleRoots),
          new THREE.Vector3(ux * 3.2 * scaleRoots, uy * 2.3 * scaleRoots, -2.9 * scaleRoots),
          new THREE.Vector3(ux * length * 0.61, uy * length * 0.53, -0.2),
          new THREE.Vector3(ux * length, uy * length * 0.86, 1.1 * scaleRoots),
        ]);
        const tubularSegments = 24, radialSegments = 7;
        const geo = new THREE.TubeGeometry(curve, tubularSegments, 1.05 * scaleRoots, radialSegments, false);
        const a = geo.getAttribute('position');
        for (let ring = 0; ring <= tubularSegments; ring++) {
          const t = ring / tubularSegments;
          const center = curve.getPointAt(t);
          const taper = Math.pow(1 - t, 1.3) * (1.2 + (i % 3) * .2) + .025;
          for (let j = 0; j <= radialSegments; j++) {
            const k = ring * (radialSegments + 1) + j;
            a.setXYZ(k,
              center.x + (a.getX(k) - center.x) * taper,
              center.y + (a.getY(k) - center.y) * taper,
              center.z + (a.getZ(k) - center.z) * taper);
          }
        }
        a.needsUpdate = true;
        geo.computeVertexNormals();
        geomResources.push(geo);
        rootGroup.add(new THREE.Mesh(geo, rootMaterial));
      });
      model.add(rootGroup);
      tree.add(model);
      loaded = true;
      resize();
      onReady?.();
    },
    undefined,
    (error) => {
      if (!disposed) console.warn('[Pandora Sakura] Modelo glTF não pôde ser carregado; fallback mantido.', error);
    }
    );
  }).catch((error) => {
    if (!disposed) console.warn('[Pandora Sakura] Falha ao iniciar carregador glTF.', error);
  });

  // A gently cupped petal, not a point sprite. At the end of its lifespan it
  // shrinks into a glimmer, echoing the flower-to-particle transition.
  const petalBase = new THREE.PlaneGeometry(1, 1.5, 4, 6);
  const pos = petalBase.getAttribute('position');
  const uv = petalBase.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    const contour = Math.pow(Math.max(0, Math.sin(v * Math.PI)), 0.58);
    pos.setXYZ(i, pos.getX(i) * contour * (0.98 - 0.1 * v), pos.getY(i), 0.16 * Math.sin(Math.PI * v) + 0.1 * Math.pow(u - .5, 2));
  }
  pos.needsUpdate = true;
  petalBase.computeVertexNormals();
  geomResources.push(petalBase);

  // R13: make the sakura legible. The leaves are accents, not an opaque shower.
  const countCrown = mobile ? 38 : 95;
  const countAmbient = mobile ? 54 : 156;
  const count = countCrown + countAmbient;
  const petals = new THREE.InstancedBufferGeometry();
  petals.setIndex(petalBase.getIndex()?.clone() ?? null);
  for (const [name, attribute] of Object.entries(petalBase.attributes)) {
    petals.setAttribute(name, attribute.clone());
  }
  petals.instanceCount = count;
  geomResources.push(petals);
  const birth = new Float32Array(count * 4);
  const seed = new Float32Array(count * 4);
  const kind = new Float32Array(count);
  let state = 19117;
  const rand = () => ((state = state * 16807 % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < count; i++) {
    // Crown particles are biased toward the blossom canopy; ambient particles
    // cover the viewport instead of being diluted across the full document.
    const crown = i < countCrown;
    const side = rand(), height = rand();
    birth.set([side, height, rand(), rand()], i * 4);
    seed.set([rand(), rand(), rand(), rand()], i * 4);
    kind[i] = crown ? 0 : 1;
  }
  petals.setAttribute('aBirth', new THREE.InstancedBufferAttribute(birth, 4));
  petals.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  petals.setAttribute('aKind', new THREE.InstancedBufferAttribute(kind, 1));

  const uniforms = {
    uTime: { value: 0 },
    uViewport: { value: new THREE.Vector2(1, 1) },
    uScroll: { value: 0 },
    uAnchor: { value: new THREE.Vector2(0, 0) },
    uTreeHeight: { value: 660 },
    uTreeWidth: { value: 660 },
    uPointer: { value: new THREE.Vector2(-9000, -9000) },
    uEnergy: { value: 0 },
    uWind: { value: new THREE.Vector2(0, 0) },
    uWindFocus: { value: 0 },
    uStage: { value: 0.5 },
    uHero: { value: 1 },
  };
  const petalMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: `
      attribute vec4 aBirth; attribute vec4 aSeed; attribute float aKind;
      uniform float uTime,uScroll,uTreeHeight,uTreeWidth,uEnergy,uStage,uHero,uWindFocus;
      uniform vec2 uViewport,uAnchor,uPointer,uWind;
      varying vec2 vUv; varying float vAlpha; varying float vDust; varying vec3 vColor;
      void main(){
        float crown=1.-aKind;
        float speed=mix(29.+aSeed.y*45.,45.+aSeed.y*42.,aKind);
        float cycle=mix(max(420.,uTreeHeight*.96),uViewport.y+210.,aKind);
        float age=mod(uTime*speed+aSeed.x*cycle,cycle);
        float life=age/cycle;
        // Three low-frequency currents with phase offsets; no identical falling paths.
        float wind=sin(uTime*.44+aSeed.z*6.283+age*.011)*27. + sin(uTime*.23+age*.018+aSeed.w*15.)*17.;
        float flutter=sin(uTime*(1.3+aSeed.y*2.0)+aSeed.w*22.+age*.031)*8.;
        float gust=sin(uTime*.17+aSeed.y*14.)*(9.+uEnergy*13.);
        float heroX=uAnchor.x+(aBirth.x-.5)*uTreeWidth*.81+wind+flutter+gust;
        float heroDocY=uAnchor.y-uTreeHeight*(.61+aBirth.y*.32)+age;
        float fieldX=(.07+aBirth.x*.86)*uViewport.x+wind*1.4+gust;
        float fieldY=-80.+age;
        vec2 screen=vec2(mix(heroX,fieldX,aKind),mix(uViewport.y-heroDocY+uScroll,fieldY,aKind));
        vec2 delta=screen-uPointer;
        // The pointer is a moving wind source. Its recent velocity has inertia;
        // neighbouring petals bend downwind and spin in the wake, not away radially.
        float proximity=exp(-dot(delta,delta)/(2.*230.*230.));
        vec2 windFlow = uWind*(.22+proximity*1.35)*( .65+aSeed.z*.9);
        float swirl = sin(uTime*1.4+aSeed.w*11.+age*.027);
        vec2 wake = vec2(-delta.y,delta.x)*(.034*proximity*swirl*uWindFocus);
        screen += windFlow + wake;
        float turn=uTime*(.48+aSeed.z*1.12)+aSeed.w*31.+age*.018;
        float tumble=uTime*(1.0+aSeed.y*1.8)+aSeed.x*14.+age*.025+dot(windFlow,vec2(.02,.015));
        float dust=smoothstep(.88,1.,life);
        vec3 vertex=position;
        float c=cos(turn), sn=sin(turn);
        vertex.xy=mat2(c,-sn,sn,c)*vertex.xy;
        float fold=cos(tumble);
        vertex.xz=mat2(fold,-sin(tumble),sin(tumble),fold)*vertex.xz;
        float foldY=cos(tumble*.71);
        vertex.yz=mat2(foldY,-sin(tumble*.71),sin(tumble*.71),foldY)*vertex.yz;
        float scale=(3.0+aSeed.z*6.3)*(1.-dust*.90);
        vertex*=scale;
        vertex.xy+=screen;
        vertex.z+=aSeed.y*180.-90.;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(vertex,1.);
        vUv=uv; vDust=dust;
        // Make petals transparent around headline, not totally invisible.
        float readZone=1.-smoothstep(.12,.66,abs(screen.x/uViewport.x-.25)*2.);
        float protect=mix(1.,.50,readZone*crown);
        float fadeIn=smoothstep(0.,.045,life);
        float fadeOut=1.-smoothstep(.91,1.,life);
        float heroFade=mix(uHero,1.,aKind);
        vAlpha=fadeIn*fadeOut*protect*heroFade*(.44+.22*aSeed.y)*(1.+uStage*.055);
        vec3 pale=vec3(1.,.86,.92);
        vec3 bright=vec3(.99,.57,.73);
        vec3 saturated=vec3(.95,.31,.53);
        vColor=mix(pale,bright,aBirth.z*.8);
        vColor=mix(vColor,saturated,step(.91,aSeed.w)*.26);
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vAlpha; varying float vDust; varying vec3 vColor;
      void main(){
        // Soft highlight at the petal centre and a tiny point of light as it dissolves.
        vec2 centred=vUv-vec2(.5,.48);
        float taper=sin(3.14159265*clamp(vUv.y,0.,1.));
        float silhouette=1.-smoothstep(.68,.95,abs(centred.x)/(max(.065,taper*.5)));
        float edge=smoothstep(.03,.20,vUv.y)*(1.-smoothstep(.80,.99,vUv.y))*silhouette;
        float highlight=1.+.17*exp(-dot(centred,centred)*12.);
        float alpha=vAlpha*mix(edge,exp(-dot(vUv-.5,vUv-.5)*42.),vDust)*highlight;
        if(alpha<.018) discard;
        gl_FragColor=vec4(vColor*(.97+.24*vDust),alpha);
      }`,
  });
  materialResources.push(petalMaterial);
  // Barely visible ribbons of airborne pollen: a spatial cue for the wind,
  // not another repeated field of luminous points. The scene remains one canvas.
  const breezeMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime, uStage;
      uniform vec2 uViewport, uWind;
      varying float vFade;
      void main() {
        float x=position.x;
        float phase=position.y;
        vec3 p=vec3((x*1.25-.12)*uViewport.x,
          (phase+.022*sin(x*13.+uTime*.23+phase*18.) + .015*sin(x*23.-uTime*.37)) * uViewport.y,
          -430.);
        p.xy += uWind*.045;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
        vFade=smoothstep(.00,.24,x)*(1.-smoothstep(.78,1.,x)) * (.6+uStage*.4);
      }`,
    fragmentShader: `
      varying float vFade;
      void main(){gl_FragColor=vec4(.92,.38,.58,.041*vFade);}
    `,
  });
  materialResources.push(breezeMaterial);
  const breezeLines: THREE.Line[] = [];
  for (let j = 0; j < (mobile ? 1 : 3); j++) {
    const positions = [];
    for (let k = 0; k <= 140; k++) positions.push(k/140, .12+j*.125, 0);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geomResources.push(geo);
    const line=new THREE.Line(geo,breezeMaterial);
    line.frustumCulled=false;
    line.renderOrder=-4;
    root.add(line);
    breezeLines.push(line);
  }

  // Give the tree a low, irregular earthen contact patch, rather than a trunk
  // floating in a black void. Reuse the existing GPU quad and draw call.
  const contactGeometry = new THREE.PlaneGeometry(1, 1);
  const contactMaterial = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false, transparent: true,
    uniforms: { uWarmth: { value: 0.7 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 vUv; uniform float uWarmth;
      void main(){
        vec2 p=(vUv-.5)*2.;
        float angle=atan(p.y,p.x);
        float irregular=.035*sin(angle*9.+p.x*6.)+.024*sin(angle*15.-p.y*4.);
        float r=length(vec2(p.x,p.y*1.14))+irregular;
        float earth=1.-smoothstep(.38,.88,r);
        float dust=1.-smoothstep(.56,1.08,r);
        float grain=.89+.11*sin(p.x*56.+p.y*31.)*sin(p.x*23.-p.y*48.);
        float scattered=pow(max(0.,sin(p.x*77.)*sin(p.y*43.)),12.);
        vec3 soil=mix(vec3(.19,.12,.15),vec3(.38,.20,.25),uWarmth);
        vec3 rose=vec3(.69,.24,.37);
        vec3 color=mix(soil,rose,(.13+.11*scattered)*dust);
        float alpha=(.58*earth+.14*dust)*grain;
        if(alpha<.007) discard;
        gl_FragColor=vec4(color,alpha);
      }`,
  });
  geomResources.push(contactGeometry);
  materialResources.push(contactMaterial);
  const contact = new THREE.Mesh(contactGeometry, contactMaterial);
  // Draw terrain behind the glTF bark and the luminous roots.
  contact.renderOrder = -5;
  root.add(contact);

  const falling = new THREE.Mesh(petals, petalMaterial);
  falling.frustumCulled = false;
  root.add(falling);

  let width=1, height=1, heroTop=0, heroHeight=800;
  let sections: { y: number; mood: number }[] = [];
  function resize() {
    width=Math.max(1,innerWidth); height=Math.max(1,innerHeight);
    const hero=document.getElementById('inicio');
    const rect=hero?.getBoundingClientRect();
    heroTop=(rect?.top ?? 0)+window.scrollY;
    heroHeight=rect?.height ?? height;
    sections=['inicio','sobre','areas','campus','acessibilidade'].map((id,i)=>({
      y:(document.getElementById(id)?.getBoundingClientRect().top ?? 0)+window.scrollY,
      mood:[.95,.55,.83,.62,.48][i],
    }));
    const narrow = width < 768;
    const base = heroTop + (narrow ? Math.min(455,heroHeight*.455) : heroHeight - 33);
    trails.resize(width, height, narrow ? width*.52 : width*.735, base,
      Math.max(base+1200, document.documentElement.scrollHeight));
    camera.right=width;
    camera.top=height;
    camera.updateProjectionMatrix();
    uniforms.uViewport.value.set(width,height);
  }
  resize();

  function update(time:number, scroll:number, pointer:THREE.Vector2, energy:number, reduced:boolean, wind:THREE.Vector2, windFocus:number) {
    const narrow=width<768;
    // Model bounding box: ~102 units wide x 99 units high. One large tree,
    // contained in the hero, with a different art-directed crop on mobile.
    const modelWidth=narrow ? 66 : 101, modelHeight=narrow ? 57 : 100;
    const pixelHeight=narrow?Math.min(372,width*.94,heroHeight*.40):Math.min(690,heroHeight*.84,width*.55);
    flowerScale=pixelHeight/modelHeight;
    const treeWidth=modelWidth*flowerScale;
    // One deliberate anchor: centre-right on desktop, centred on compact screens.
    // The roots now meet the visual ground *inside* the hero instead of below it.
    const x=narrow?width*.52:width*.735;
    const base=heroTop+(narrow?Math.min(455,heroHeight*.455):heroHeight-33);
    tree.position.set(x,height-base+scroll,-70);
    tree.scale.setScalar(flowerScale);
    tree.rotation.y=reduced?-.065:-.065+Math.sin(time*.20)*.035+pointer.x*.021;
    tree.rotation.z=reduced?0:Math.sin(time*.26)*.005;
    branchBreeze.value=reduced ? 0 : time;
    contact.position.set(x, height-base+scroll-9, -115);
    contact.scale.set(
      Math.max(narrow ? 250 : 120, treeWidth*(narrow ? .92 : .64)),
      Math.max(narrow ? 70 : 40, treeWidth*(narrow ? .28 : .20)),
      1
    );
    // Several glTF parts disable frustum culling. Otherwise iOS keeps
    // rendering the entire crown even after scrolling far past the hero.
    const screenBase = base - scroll;
    const treeOnScreen = screenBase > -60 && screenBase - pixelHeight < height + 80;
    contact.visible=loaded && treeOnScreen;
    trails.update(time,scroll,reduced,loaded);
    tree.visible=loaded && treeOnScreen;
    uniforms.uAnchor.value.set(x,base);
    uniforms.uTreeHeight.value=pixelHeight;
    uniforms.uTreeWidth.value=treeWidth;
    uniforms.uTime.value=time;
    uniforms.uScroll.value=scroll;
    uniforms.uEnergy.value=energy;
    uniforms.uWind.value.copy(wind);
    uniforms.uWindFocus.value=windFocus;
    uniforms.uPointer.value.set((pointer.x+1)*width*.5,(pointer.y+1)*height*.5);
    uniforms.uHero.value=1.-THREE.MathUtils.smoothstep(scroll,heroTop+heroHeight*.45,heroTop+heroHeight*1.07);
    let mood=sections.at(-1)?.mood ?? .5;
    const at=scroll+height*.45;
    for(let i=0;i<sections.length-1;i++) {
      if(at<sections[i+1].y) {
        mood=THREE.MathUtils.lerp(sections[i].mood,sections[i+1].mood,THREE.MathUtils.smoothstep(at,sections[i].y,sections[i+1].y));
        break;
      }
    }
    uniforms.uStage.value=mood;
    falling.visible=!reduced;
  }
  return {
    root,camera,resize,update,
    get ready(){return loaded;},
    dispose(){
      disposed=true;
      scene.remove(root);
      trails.dispose();
      if(model)disposeModel(model);
      geomResources.forEach((g)=>g.dispose());
      materialResources.forEach((m)=>m.dispose());
    },
  };
}
