/* ===========================================================
   HALL — 深空展馆 3D 场景
   中央核心 + 四扇悬浮之门；鼠标视差 / 拖拽环视 / 点击穿门
   =========================================================== */
import * as THREE from '../vendor/three.module.min.js';

const GATES = [
  {
    id: 'web',
    href: '/web/',
    idx: '01',
    name: 'PAPER',
    cn: '做网页 · 纸境',
    hint: 'Web / UI',
    accent: '#e0503a',
    accent2: '#f3efe6',
    tone: 'paper',
  },
  {
    id: 'video',
    href: '/video/',
    idx: '02',
    name: 'CINEMA',
    cn: '做视频 · 放映厅',
    hint: 'Motion / Film',
    accent: '#e8a33d',
    accent2: '#1a1a22',
    tone: 'cinema',
  },
  {
    id: 'deck',
    href: '/deck/',
    idx: '03',
    name: 'BAUHAUS',
    cn: '做PPT · 包豪斯',
    hint: 'Deck / Slides',
    accent: '#2f56e8',
    accent2: '#f0c419',
    tone: 'deck',
  },
  {
    id: 'game',
    href: '/game/',
    idx: '04',
    name: 'ARCADE',
    cn: '做游戏 · 街机厅',
    hint: 'Play / Interactive',
    accent: '#23e0c0',
    accent2: '#ff3d81',
    tone: 'arcade',
  },
];

/* ---------- 门面板纹理（程序化生成） ---------- */
function makeGateTexture(gate) {
  const W = 620, H = 860;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  if (gate.id === 'web') {
    x.fillStyle = '#f2eee4'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(20,20,20,.13)'; x.lineWidth = 1;
    for (let i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * W / 8, 0); x.lineTo(i * W / 8, H); x.stroke(); }
    for (let i = 1; i < 11; i++) { x.beginPath(); x.moveTo(0, i * H / 11); x.lineTo(W, i * H / 11); x.stroke(); }
    x.fillStyle = '#d8402c'; x.fillRect(64, 96, 132, 132);
    x.fillStyle = '#151515';
    x.fillRect(64, 268, 300, 26);
    x.fillRect(64, 310, 210, 12);
    x.fillStyle = 'rgba(21,21,21,.28)';
    x.fillRect(64, 356, 420, 8);
    x.fillRect(64, 380, 340, 8);
    x.strokeStyle = '#151515'; x.lineWidth = 2;
    x.strokeRect(64, 440, 200, 130); x.strokeRect(284, 440, 200, 130);
    x.fillStyle = 'rgba(21,21,21,.08)'; x.fillRect(64, 440, 200, 130);
    x.fillStyle = '#d8402c'; x.fillRect(64, 636, 92, 92);
    x.font = '500 15px "Space Grotesk", sans-serif'; x.fillStyle = '#151515';
    x.fillText('AURA / WEB', 64, 800);
    x.font = '400 12px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(21,21,21,.5)';
    x.fillText('SWISS GRID · PAPER EDITION', 64, 822);
  } else if (gate.id === 'video') {
    x.fillStyle = '#0a0a0e'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 22; i++) {
      x.fillStyle = 'rgba(255,255,255,.03)';
      x.fillRect(0, i * 40 + ((i * 17) % 11), W, 1);
    }
    x.fillStyle = '#000'; x.fillRect(0, 0, 44, H); x.fillRect(W - 44, 0, 44, H);
    x.fillStyle = 'rgba(232,163,61,.85)';
    for (let i = 0; i < 14; i++) { x.fillRect(12, 40 + i * 60, 20, 22); x.fillRect(W - 32, 40 + i * 60, 20, 22); }
    x.fillStyle = '#0a0a0e'; x.fillRect(44, 150, W - 88, 470);
    const grd = x.createLinearGradient(44, 150, W - 44, 620);
    grd.addColorStop(0, 'rgba(232,163,61,.34)');
    grd.addColorStop(.5, 'rgba(232,163,61,.07)');
    grd.addColorStop(1, 'rgba(232,163,61,.26)');
    x.fillStyle = grd; x.fillRect(44, 150, W - 88, 470);
    x.strokeStyle = 'rgba(232,163,61,.6)'; x.lineWidth = 1.5;
    x.beginPath(); x.arc(W / 2, 385, 120, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(W / 2, 385, 74, 0, Math.PI * 2); x.stroke();
    x.fillStyle = '#f0d9a8';
    x.font = '400 40px "Bodoni Moda", serif'; x.fillText('CELLULOID', 76, 250);
    x.font = '400 12px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(240,217,168,.6)';
    x.fillText('REEL 04 / 2.39:1 / 24FPS', 76, 282);
    x.fillStyle = 'rgba(232,163,61,.9)'; x.fillRect(76, 660, 60, 3);
    x.font = '400 11px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(240,217,168,.55)';
    x.fillText('00:04:12:08', 76, 700);
  } else if (gate.id === 'deck') {
    x.fillStyle = '#f3eee0'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#2f56e8'; x.beginPath(); x.arc(150, 190, 104, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#f0c419'; x.beginPath();
    x.moveTo(430, 110); x.lineTo(520, 290); x.lineTo(340, 290); x.closePath(); x.fill();
    x.fillStyle = '#e04a2c'; x.fillRect(96, 350, 190, 190);
    x.fillStyle = '#151515'; x.fillRect(330, 350, 190, 34); x.fillRect(330, 400, 130, 12);
    x.fillStyle = '#151515';
    x.beginPath(); x.arc(140, 660, 62, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2f56e8'; x.fillRect(232, 600, 300, 120);
    x.fillStyle = '#f3eee0'; x.font = '400 42px "Archivo Black", sans-serif';
    x.fillText('SLIDE', 256, 678);
    x.fillStyle = '#151515'; x.font = '400 12px "JetBrains Mono", monospace';
    x.fillText('BAUHAUS SYSTEM · 16:9', 60, 810);
  } else {
    x.fillStyle = '#0a0416'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(35,224,192,.28)'; x.lineWidth = 1;
    for (let i = 0; i < 22; i++) {
      const y = 380 + i * i * 1.5;
      if (y > H) break;
      x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    }
    for (let i = -14; i < 15; i++) {
      x.beginPath(); x.moveTo(W / 2 + i * 26, 380); x.lineTo(W / 2 + i * 130, H); x.stroke();
    }
    x.fillStyle = '#ff3d81'; x.fillRect(120, 130, 60, 60);
    x.fillStyle = '#23e0c0'; x.fillRect(200, 190, 60, 60);
    x.fillStyle = '#f5d547'; x.fillRect(280, 130, 60, 60);
    x.fillStyle = '#23e0c0'; x.font = '400 44px "Press Start 2P", monospace';
    x.fillText('PLAY', 120, 320);
    x.fillStyle = 'rgba(255,61,129,.9)'; x.fillRect(120, 336, 210, 4);
    x.fillStyle = 'rgba(230,240,255,.55)'; x.font = '400 11px "JetBrains Mono", monospace';
    x.fillText('INSERT COIN / NEURAL SNAKE', 120, 380);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeGlowTexture(color) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, color);
  g.addColorStop(.35, color.replace(/,\s*[\d.]+\s*\)$/, ',0.35)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- 核心着色器 ---------- */
const coreVert = `
varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vViewW; varying float vNoise;
uniform float uTime;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float noise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float n000=hash(i), n100=hash(i+vec3(1,0,0)), n010=hash(i+vec3(0,1,0)), n110=hash(i+vec3(1,1,0));
  float n001=hash(i+vec3(0,0,1)), n101=hash(i+vec3(1,0,1)), n011=hash(i+vec3(0,1,1)), n111=hash(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y), mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y), f.z);
}
void main(){
  vec3 p = position * 1.4;
  float n = noise(p + vec3(0.0, uTime*0.25, uTime*0.12));
  vNoise = n;
  vec3 pos = position + normal * (n-0.5)*0.28;
  vec4 wp = modelMatrix * vec4(pos,1.0);
  vPosW = wp.xyz;
  vNormalW = normalize(mat3(modelMatrix)*normal);
  vViewW = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const coreFrag = `
varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vViewW; varying float vNoise;
uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uBoost;
void main(){
  vec3 N = normalize(vNormalW); vec3 V = normalize(vViewW);
  float fres = pow(1.0 - max(dot(N,V),0.0), 2.2);
  float bands = sin(vPosW.y*3.4 - uTime*1.1 + vNoise*6.0)*0.5+0.5;
  vec3 col = mix(uColorA, uColorB, bands*0.8 + vNoise*0.35);
  float a = fres*0.95 + 0.10 + bands*0.06;
  gl_FragColor = vec4(col*(0.85+uBoost*0.7), a*(0.9+uBoost*0.5));
}`;

/* ---------- 场景 ---------- */
const state = {
  renderer: null, scene: null, camera: null, clock: null,
  gates: [], hovered: null, orbit: 0, orbitTarget: 0, orbitVel: 0,
  dragging: false, lastX: 0, moved: 0, idle: 0, diving: false,
  mx: 0, my: 0, tmx: 0, tmy: 0, core: null, coreWire: null, rings: [],
};

const container = document.getElementById('stage');
const veil = document.getElementById('diveVeil');
const flash = document.getElementById('diveFlash');

function initThree() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  state.renderer = renderer;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04060b, 0.028);
  state.scene = scene;

  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 1.4, 15);
  state.camera = camera;

  const clock = new THREE.Clock();
  state.clock = clock;

  /* 星空 */
  const starGeo = new THREE.BufferGeometry();
  const N = 1400;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const c1 = new THREE.Color('#9fc4ff'), c2 = new THREE.Color('#ffd9b0'), c3 = new THREE.Color('#ffffff');
  for (let i = 0; i < N; i++) {
    const r = 40 + Math.random() * 90;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.7;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    const c = Math.random() < 0.72 ? c1 : (Math.random() < 0.6 ? c2 : c3);
    const b = 0.28 + Math.random() * 0.72;
    col[i * 3] = c.r * b; col[i * 3 + 1] = c.g * b; col[i * 3 + 2] = c.b * b;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.34, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
  scene.add(stars);

  /* 尘埃 */
  const dustGeo = new THREE.BufferGeometry();
  const M = 700;
  const dpos = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 34;
    dpos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dpos[i * 3 + 2] = (Math.random() - 0.5) * 30;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.055, color: 0xbcd4ff, transparent: true, opacity: 0.5, depthWrite: false }));
  scene.add(dust);

  /* 地面网格 */
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(46, 96),
    new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime;
        void main(){
          vec2 p = (vUv-0.5)*2.0;
          float r = length(p);
          float ring = smoothstep(0.02,0.0,abs(fract(r*14.0 - uTime*0.25)-0.5)-0.46);
          float fade = smoothstep(1.0,0.12,r);
          vec3 col = mix(vec3(0.10,0.18,0.34), vec3(0.28,0.45,0.72), ring);
          gl_FragColor = vec4(col, ring*fade*0.55 + fade*0.05);
        }`,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.2;
  scene.add(floor);

  /* 核心 */
  const coreGeo = new THREE.IcosahedronGeometry(2.05, 3);
  const coreMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color('#1d4ed8') },
      uColorB: { value: new THREE.Color('#7fd8ff') },
      uBoost: { value: 0 },
    },
    vertexShader: coreVert, fragmentShader: coreFrag,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  state.core = core;
  scene.add(core);

  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.14, 1)),
    new THREE.LineBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.55 })
  );
  state.coreWire = wire;
  scene.add(wire);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.62, 2),
    new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0.92 })
  );
  scene.add(inner);
  state.coreInner = inner;

  /* 轨道环 */
  const ringSpecs = [
    { r: 3.1, t: 0.022, color: 0x6fa8ff, rx: 1.35, rz: 0.2, speed: 0.22 },
    { r: 3.9, t: 0.014, color: 0xffb877, rx: 0.5, rz: 1.1, speed: -0.16 },
    { r: 4.6, t: 0.01, color: 0x9d7bff, rx: 1.9, rz: -0.4, speed: 0.11 },
  ];
  ringSpecs.forEach((s) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(s.r, s.t, 8, 160),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.55 })
    );
    m.rotation.x = s.rx; m.rotation.z = s.rz;
    m.userData = { speed: s.speed, base: m.rotation.clone() };
    scene.add(m);
    state.rings.push(m);
  });

  scene.add(new THREE.AmbientLight(0x2a3f66, 1.1));

  /* 门 */
  const gateGeo = new THREE.PlaneGeometry(3.1, 4.3);
  const frameGeo = new THREE.BoxGeometry(3.34, 4.54, 0.09);
  GATES.forEach((g, i) => {
    const group = new THREE.Group();
    const ang = (i / GATES.length) * Math.PI * 2 + Math.PI / 4;
    const R = 9.6;
    group.position.set(Math.cos(ang) * R, 0.55 + Math.sin(i * 1.7) * 0.35, Math.sin(ang) * R);
    group.lookAt(0, group.position.y, 0);
    group.userData = { ang, base: group.position.clone(), phase: i * 1.6 };

    const tex = makeGateTexture(g);
    const panel = new THREE.Mesh(
      gateGeo,
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96, side: THREE.DoubleSide })
    );
    panel.position.z = 0.05;
    group.add(panel);

    const frame = new THREE.Mesh(
      frameGeo,
      new THREE.MeshBasicMaterial({ color: 0x0c1220, transparent: true, opacity: 0.95, side: THREE.DoubleSide })
    );
    group.add(frame);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.34, 4.54)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(g.accent), transparent: true, opacity: 0.85 })
    );
    edge.position.z = 0.1;
    group.add(edge);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(g.accent.startsWith('#') ? hexToRgba(g.accent, 0.55) : g.accent),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55,
    }));
    glow.scale.set(9, 11, 1);
    glow.position.z = -0.4;
    group.add(glow);

    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 4.9),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.z = 0.3;
    hit.userData.gate = g;
    group.add(hit);

    group.userData.hit = hit;
    group.userData.panel = panel;
    group.userData.glow = glow;
    group.userData.edge = edge;
    scene.add(group);
    state.gates.push(group);

    // HTML 标签
    const lab = document.createElement('div');
    lab.className = 'gate-label';
    lab.style.setProperty('--gc', g.accent);
    lab.innerHTML = `
      <div class="gl-card">
        <span class="gl-idx">${g.idx} / ${g.hint}</span>
        <span class="gl-name">${g.name}</span>
        <span class="gl-cn">${g.cn}</span>
        <span class="gl-hint">◈ 点击进入</span>
      </div>`;
    document.body.appendChild(lab);
    group.userData.label = lab;
  });

  bindEvents();
  resize();
  addEventListener('resize', resize);
  renderer.setAnimationLoop(tick);
}

function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- 交互 ---------- */
function bindEvents() {
  const dom = state.renderer.domElement;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const onMove = (e) => {
    state.tmx = (e.clientX / innerWidth) * 2 - 1;
    state.tmy = (e.clientY / innerHeight) * 2 - 1;
    if (state.dragging) {
      const dx = e.clientX - state.lastX;
      state.orbitTarget -= dx * 0.0055;
      state.lastX = e.clientX;
      state.moved += Math.abs(dx);
      state.idle = 0;
    }
  };
  addEventListener('pointermove', onMove);

  dom.addEventListener('pointerdown', (e) => {
    state.dragging = true; state.lastX = e.clientX; state.moved = 0;
    dom.setPointerCapture?.(e.pointerId);
    dom.style.cursor = 'grabbing';
  });
  addEventListener('pointerup', () => {
    state.dragging = false;
    dom.style.cursor = '';
  });
  dom.addEventListener('pointerleave', () => { state.hovered = null; });

  dom.addEventListener('click', (e) => {
    if (state.moved > 6) return; // 拖拽不触发点击
    const g = pick(e.clientX, e.clientY);
    if (g) dive(g);
  });

  dom.addEventListener('wheel', (e) => {
    state.orbitTarget += e.deltaY * 0.0016;
    state.idle = 0;
  }, { passive: true });

  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') state.orbitTarget += 0.5;
    if (e.key === 'ArrowRight') state.orbitTarget -= 0.5;
    if (e.key === 'Enter' && state.hovered) dive(state.hovered);
  });

  state.pickFn = (x, y) => {
    ndc.x = (x / innerWidth) * 2 - 1;
    ndc.y = -(y / innerHeight) * 2 + 1;
    ray.setFromCamera(ndc, state.camera);
    const hits = ray.intersectObjects(state.gates.map((g) => g.userData.hit), false);
    return hits.length ? hits[0].object.userData.gate : null;
  };
}

function pick(x, y) { return state.pickFn ? state.pickFn(x, y) : null; }

/* ---------- 穿门转场 ---------- */
function dive(gate) {
  if (state.diving) return;
  state.diving = true;
  if (window.Audio) { window.Audio.sfx('open'); }

  const group = state.gates.find((g) => g.userData.hit.userData.gate === gate);
  const tex = group.userData.panel.material.map;

  // 用面板纹理做全屏幕
  const shot = document.createElement('div');
  shot.id = 'diveShot';
  shot.style.cssText = `position:fixed;inset:0;z-index:178;background-image:url(${tex.image.toDataURL()});background-size:cover;background-position:center;
    transform:scale(.18) translateZ(0);opacity:0;transition:transform 1.05s cubic-bezier(.7,0,.2,1),opacity .5s ease-out;pointer-events:none;filter:blur(2px)`;
  document.body.appendChild(shot);
  requestAnimationFrame(() => {
    shot.style.opacity = '1';
    shot.style.transform = 'scale(1.25)';
  });

  veil.style.setProperty('--dc', gate.accent2 === '#f3efe6' ? '#f3efe6' : gate.accent2);
  setTimeout(() => veil.classList.add('is-on'), 260);
  flash.classList.add('is-on');
  setTimeout(() => { flash.classList.remove('is-on'); flash.classList.add('is-off'); }, 140);

  // 相机推向该门
  state.diveTarget = gate;
  state.diveStart = state.clock.getElapsedTime();

  setTimeout(() => {
    window.location.href = gate.href;
  }, 1150);
}

/* ---------- 主循环 ---------- */
function tick() {
  const t = state.clock.getElapsedTime();
  const dt = Math.min(state.clock.getDelta ? 0.016 : 0.016, 0.05);

  // 轨道
  state.idle += dt;
  if (state.idle > 3.2 && !state.dragging) state.orbitTarget += dt * 0.035;
  state.orbit += (state.orbitTarget - state.orbit) * 0.055;

  // 视差
  state.mx += (state.tmx - state.mx) * 0.045;
  state.my += (state.tmy - state.my) * 0.045;

  const cam = state.camera;
  if (state.diving && state.diveTarget) {
    const g = state.gates.find((x) => x.userData.hit.userData.gate === state.diveTarget);
    const dest = g.position.clone().normalize().multiplyScalar(4.2);
    dest.y = g.position.y;
    cam.position.lerp(dest, 0.055);
    const look = g.position.clone().multiplyScalar(0.4);
    cam.lookAt(look);
  } else {
    const R = 15.2;
    const a = state.orbit;
    cam.position.x = Math.sin(a) * R + state.mx * 1.9;
    cam.position.y = 1.4 - state.my * 1.25 + Math.sin(t * 0.25) * 0.25;
    cam.position.z = Math.cos(a) * R;
    cam.lookAt(state.mx * 0.5, 0.35 - state.my * 0.28, 0);
  }

  // 核心
  state.core.rotation.y = t * 0.14;
  state.core.rotation.x = Math.sin(t * 0.2) * 0.12;
  state.core.material.uniforms.uTime.value = t;
  state.coreWire.rotation.y = -t * 0.1;
  state.coreWire.rotation.z = t * 0.06;
  state.coreInner.rotation.set(t * 0.4, t * 0.6, 0);
  const pulse = 0.5 + 0.5 * Math.sin(t * 1.1);
  state.core.material.uniforms.uBoost.value = pulse * 0.35;

  state.rings.forEach((r) => {
    r.rotation.z += r.userData.speed * dt * 2;
    r.rotation.y += r.userData.speed * dt * 0.6;
  });

  // 门
  const hovered = pick(state.lastClientX || innerWidth / 2, state.lastClientY || innerHeight / 2);
  state.gates.forEach((g, i) => {
    const base = g.userData.base;
    g.position.y = base.y + Math.sin(t * 0.7 + g.userData.phase) * 0.22;
    g.rotation.y = Math.sin(t * 0.3 + i) * 0.08;
    const isHot = hovered && hovered.id === g.userData.hit.userData.gate.id;
    const target = isHot ? 1.1 : 1;
    g.scale.lerp(new THREE.Vector3(target, target, target), 0.09);
    g.userData.glow.material.opacity = isHot ? 0.95 : 0.42 + 0.08 * Math.sin(t * 1.4 + i);
    g.userData.edge.material.opacity = isHot ? 1 : 0.6;
    const lab = g.userData.label;
    if (lab) {
      const p = g.position.clone().project(cam);
      const vis = p.z < 1 && Math.abs(p.x) < 1.25 && Math.abs(p.y) < 1.25;
      lab.style.transform = `translate(-50%,-50%) translate(${(p.x * 0.5 + 0.5) * innerWidth}px, ${(-p.y * 0.5 + 0.5) * innerHeight - 130}px)`;
      lab.classList.toggle('is-hot', !!isHot);
      lab.style.opacity = vis ? '1' : '0';
    }
  });
  if (hovered !== state.hovered) {
    state.hovered = hovered;
    state.renderer.domElement.style.cursor = hovered ? 'pointer' : '';
    if (hovered && window.Audio) window.Audio.sfx('hover');
  }

  state.renderer.render(state.scene, state.camera);
}

addEventListener('pointermove', (e) => {
  state.lastClientX = e.clientX;
  state.lastClientY = e.clientY;
});

function resize() {
  if (!state.renderer) return;
  state.camera.aspect = innerWidth / innerHeight;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(innerWidth, innerHeight);
}

/* ---------- 启动 ---------- */
async function boot() {
  const loader = document.getElementById('hallLoader');
  const bar = loader?.querySelector('.hl-bar i');
  try { await document.fonts.ready; } catch (e) {}
  const step = (p) => { if (bar) bar.style.width = p + '%'; };
  step(35);
  await new Promise((r) => setTimeout(r, 60));
  try {
    initThree();
    step(100);
  } catch (err) {
    console.error('[AURA] hall init failed:', err);
    step(100);
  }
  setTimeout(() => loader?.classList.add('is-gone'), 320);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
