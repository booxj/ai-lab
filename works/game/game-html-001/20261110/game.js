/* 洞潜 / CAVE DIVE — three.js r124 · 离线可运行
   真实洞穴资料见 index.html 内「资料来源 / GAPS」与 ../SOURCES.md */
(function () {
'use strict';

const T = THREE;
const $ = function (id) { return document.getElementById(id); };
const clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
const lerp = function (a, b, t) { return a + (b - a) * t; };
const smoothstep = function (a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash1(xi + yi * 57.0);
  const b = hash1(xi + 1 + yi * 57.0);
  const c = hash1(xi + (yi + 1) * 57.0);
  const d = hash1(xi + 1 + (yi + 1) * 57.0);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
// 可平铺版本：lattice 以 per 为周期，用于无缝纹理
function vnoise2p(x, y, per) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const wrap = function (n) { return ((n % per) + per) % per; };
  const a = hash1(wrap(xi) + wrap(yi) * 57.0);
  const b = hash1(wrap(xi + 1) + wrap(yi) * 57.0);
  const c = hash1(wrap(xi) + wrap(yi + 1) * 57.0);
  const d = hash1(wrap(xi + 1) + wrap(yi + 1) * 57.0);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function radiusAt(pts, y) {
  if (y >= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (y <= a[0] && y >= b[0]) {
      const t = (a[0] - y) / Math.max(0.0001, a[0] - b[0]);
      return lerp(a[1], b[1], t);
    }
  }
  return pts[pts.length - 1][1];
}
function makeNoiseTexture(size, base, spread, alpha) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const n = (hash1(i * 12.9898) - 0.5) * spread + base;
    img.data[i * 4] = clamp(n + 12, 0, 255);
    img.data[i * 4 + 1] = clamp(n + 8, 0, 255);
    img.data[i * 4 + 2] = clamp(n, 0, 255);
    img.data[i * 4 + 3] = alpha === undefined ? 255 : alpha;
  }
  g.putImageData(img, 0, 0);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}
function makeDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(230,255,252,.75)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(c);
}

function makeRockTextureSet() {
  const size = 512;
  const cc = document.createElement('canvas');
  const bc = document.createElement('canvas');
  cc.width = cc.height = bc.width = bc.height = size;
  const cg = cc.getContext('2d'), bg = bc.getContext('2d');
  const cimg = cg.createImageData(size, size);
  const bimg = bg.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      // 各向同性斑驳，可平铺，避免方向性条纹与接缝
      const n1 = vnoise2p(u * 2.0 + 2.0, v * 2.0 + 7.0, 2);
      const n2 = vnoise2p(u * 6.0 + 8.0, v * 6.0 + 2.0, 6);
      const n3 = vnoise2p(u * 18.0 + 4.0, v * 18.0 + 5.0, 18);
      const n4 = vnoise2p(u * 40.0 + 1.0, v * 40.0 + 9.0, 40);
      const base = n1 * 0.44 + n2 * 0.30 + n3 * 0.18 + n4 * 0.08;
      const patch = smoothstep(0.60, 0.80, vnoise2p(u * 4.0 + 9.0, v * 4.0 + 3.0, 4));
      let n = 0.60 + (base - 0.5) * 0.26 - patch * 0.05;
      const i = (y * size + x) * 4;
      const val = clamp(n * 255, 0, 255);
      cimg.data[i] = val * 1.02;
      cimg.data[i + 1] = val * 0.98;
      cimg.data[i + 2] = val * 0.90;
      cimg.data[i + 3] = 255;
      const bval = clamp((n - 0.40) * 700, 0, 255);
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bval;
      bimg.data[i + 3] = 255;
    }
  }
  cg.putImageData(cimg, 0, 0);
  bg.putImageData(bimg, 0, 0);
  const ct = new T.CanvasTexture(cc);
  const bt = new T.CanvasTexture(bc);
  [ct, bt].forEach(function (t) {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.set(3, 6);
  });
  return { color: ct, bump: bt };
}

/* ============================================================
   关卡数据：尺度来自公开资料，几何为可玩化重建
   ============================================================ */
const LEVELS = [
  {
    id: 'bluehole',
    no: '01',
    name: '美国蓝洞',
    en: 'SANTA ROSA BLUE HOLE · NEW MEXICO',
    facts: '水面口径 24.4 m · 底部 39.6 m · 至格栅 24.7 m<br>水温 17°C · 能见度约 30 m · 钟形石灰岩竖井',
    itemName: '装备袋',
    obj: '潜到钟形井底，取回装备袋',
    maxDepth: 24.7,
    o2Max: 130,
    moveSpeed: 3.0,
    vertSpeed: 2.7,
    rimY: 2.2,
    greenTop: false,
    wallNoise: 0.32,
    spawn: { x: 9.7, y: 3.15, z: -1.0, yaw: 1.80, pitch: -0.28 },
    diveTo: { x: 3.2, y: -1.6, z: 0.4, yaw: 1.5, pitch: -0.18 },
    target: { x: 0, y: -24.0, z: 0.1 },
    targetDepth: 23.4,
    rubbleY: -24.45,
    preview: { x: 11.0, y: 10.2, z: -10.4, yaw: 2.35, pitch: -0.52 },
    path: [
      [0, 6, 0], [0, 2, 0], [0, -2, 0], [0.3, -8, 0], [-0.4, -14, 0],
      [-0.2, -19, 0], [0, -23, 0], [0, -25, 0]
    ],
    radii: [
      [6, 12.7], [2, 12.3], [0, 12.0], [-4, 11.3], [-9, 10.9], [-13, 11.7],
      [-17, 14.2], [-20.5, 17.6], [-23.5, 19.4], [-25, 16.8]
    ],
    skyTop: 0x4d88b8, skyBot: 0xe4cfa6, sunColor: 0xfff0cf,
    sunDir: [0.48, 0.74, 0.28], sunI: 1.25, hemiI: 0.82,
    ground: 0x7a684c, rock: 0x6f6048, rockDeep: 0x141a1b,
    aboveFog: 0xb9a98c, fogNear: 0x1d6a76, fogDeep: 0x01080c,
    waterDeep: 0x07242e, waterSky: 0x7399a4,
    fogNearD: 0.024, fogDeepD: 0.06, lightFall: 26
  },
  {
    id: 'jiudun',
    no: '02',
    name: '九顿天窗',
    en: 'JIUDUN SKYLIGHT · DU\'AN, GUANGXI',
    facts: '4 个斜井式天窗 · 口径 13.5–25.7 m<br>已知深度 212 m · 能见度 5–15 m · 水温 19°C',
    itemName: '样本回收箱',
    obj: '穿过 40 m 洞口与狭窄竖井，取回样本箱',
    maxDepth: 104,
    o2Max: 480,
    moveSpeed: 3.15,
    vertSpeed: 2.85,
    rimY: 28,
    greenTop: true,
    wallNoise: 0.2,
    spawn: { x: 9.5, y: 2.45, z: 1.2, yaw: 1.70, pitch: -0.30 },
    diveTo: { x: 7.0, y: -1.8, z: 0.6, yaw: 1.66, pitch: -0.16 },
    target: { x: 14.4, y: -103.55, z: 0 },
    targetDepth: 103.4,
    rubbleY: -104.2,
    preview: { x: 10.8, y: 22.5, z: 9.0, yaw: 2.18, pitch: -0.62 },
    path: [
      [0, 30, 0], [0, 20, 0], [0, 10, 0], [0, 0, 0], [0, -20, 0], [0, -36, 0],
      [0.8, -40, 0], [3.5, -42.5, 0], [8.5, -44, 0], [13, -46, 0], [14, -50, 0],
      [14, -60, 0], [13.6, -75, 0], [13.2, -90, 0], [13, -104, 0], [12.6, -114, 0],
      [12, -130, 0], [11, -142, 0], [10.5, -150, 0]
    ],
    radii: [
      [30, 14.6], [10, 12.6], [0, 11.7], [-20, 10.8], [-34, 8.8], [-38, 6.2],
      [-41, 4.5], [-44, 3.8], [-50, 3.6], [-70, 3.3], [-88, 3.6], [-100, 4.5],
      [-104, 4.7], [-110, 3.7], [-120, 3.2], [-135, 2.8], [-145, 2.2], [-150, 1.0]
    ],
    skyTop: 0x668b8d, skyBot: 0xd9dfc8, sunColor: 0xeaf3df,
    sunDir: [0.22, 0.86, 0.34], sunI: 0.92, hemiI: 1.0,
    ground: 0x4f5b3e, rock: 0x555a4b, rockDeep: 0x090f0e,
    aboveFog: 0xaab6a2, fogNear: 0x1d4f45, fogDeep: 0x010605,
    waterDeep: 0x04201b, waterSky: 0x729b8d,
    fogNearD: 0.045, fogDeepD: 0.085, lightFall: 30
  }
];

/* ============================================================
   程序化音频（无外部文件）
   ============================================================ */
const Sound = {
  ctx: null, master: null, ambient: null, ambientLP: null, ambientGain: null, ready: false,
  init: function () {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.2;
    }
    this.noiseBuf = buf;
    const src = this.ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.value = 0.028;
    src.connect(lp); lp.connect(g); g.connect(this.master); src.start();
    this.ambient = src; this.ambientLP = lp; this.ambientGain = g;
    this.ready = true;
  },
  resume: function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  noise: function (dur, type, freq, q, gain, when) {
    if (!this.ctx) return;
    const t0 = (when || this.ctx.currentTime);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q || 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.min(0.12, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  },
  splash: function () {
    if (!this.ready) return;
    this.noise(0.75, 'lowpass', 1100, 0.9, 0.28);
    this.noise(0.35, 'bandpass', 2400, 1.2, 0.09);
  },
  inhale: function () {
    if (!this.ready) return;
    this.noise(1.15, 'bandpass', 720, 0.9, 0.035);
  },
  exhale: function () {
    if (!this.ready) return;
    this.noise(0.9, 'bandpass', 330, 0.8, 0.045);
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) this.bubble(0.12 + Math.random() * 0.25);
  },
  bubble: function (delay) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    const f = 280 + Math.random() * 720;
    o.frequency.setValueAtTime(f, t0);
    o.frequency.exponentialRampToValueAtTime(f * 1.8, t0 + 0.08);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.035, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 0.16);
  },
  chime: function () {
    if (!this.ctx) return;
    [660, 880, 1320].forEach(function (f, i) {
      const t0 = this.ctx.currentTime + i * 0.09;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.55);
    }, this);
  },
  win: function () {
    if (!this.ctx) return;
    [392, 523, 659, 784].forEach(function (f, i) {
      const t0 = this.ctx.currentTime + i * 0.14;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 1.2);
    }, this);
  },
  lose: function () {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 2.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.6);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + 2.7);
  },
  setDepth: function (under, depth) {
    if (!this.ready) return;
    const k = clamp(depth / 120, 0, 1);
    this.ambientLP.frequency.value = under ? lerp(300, 120, k) : 420;
    this.ambientGain.gain.value = under ? lerp(0.032, 0.055, k) : 0.012;
  }
};

/* ============================================================
   渲染器 / 相机 / 世界
   ============================================================ */
const canvas = $('gl');
const renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.setSize(window.innerWidth, window.innerHeight);
const camera = new T.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.05, 620);
camera.rotation.order = 'YXZ';

let scene = null;
let W = null;
let LEVEL = LEVELS[0];
let elapsedAll = 0;

const state = {
  mode: 'menu',        // menu | shore | diveIn | swim | surface | win | lose | paused
  levelIndex: 0,
  eye: new T.Vector3(),
  vel: new T.Vector3(),
  yaw: 0, pitch: 0, roll: 0,
  o2: 0, o2Max: 100,
  maxDepth: 0,
  hasItem: false,
  elapsed: 0,
  diveT: 0,
  diveFrom: new T.Vector3(), diveTo: new T.Vector3(),
  diveYaw0: 0, diveYaw1: 0, divePitch0: 0, divePitch1: 0,
  fogMix: 0,
  submerged: false,
  breath: 0, breathPrev: 0,
  shake: 0,
  pausedFrom: null,
  lastBeep: 0,
  nearIndex: 0
};

function wallRadius(i, theta, baseR) {
  const seam = vnoise2(Math.cos(theta) * 2.4 + 5.3, Math.sin(theta) * 2.4 + i * 0.036);
  const ledge = vnoise2(i * 0.055 + 11.2, Math.cos(theta) * 1.6 + 3.1);
  const spur = vnoise2(Math.cos(theta) * 4.1 + 17.7, Math.sin(theta) * 4.1 + i * 0.021 + 9.4);
  return baseR * (1 + (seam - 0.5) * LEVEL.wallNoise +
    (ledge - 0.5) * 0.14 + (spur - 0.5) * 0.07 +
    0.075 * Math.sin(theta * 3 + i * 0.13) +
    0.075 * Math.sin(theta * 7 - i * 0.09) +
    0.048 * Math.sin(theta * 11 + i * 0.031) +
    0.030 * Math.sin(theta * 15 - i * 0.42));
}

function disposeWorld() {
  if (!scene) return;
  scene.traverse(function (o) {
    if (o.geometry) o.geometry.dispose();
    const m = o.material;
    if (m) {
      if (Array.isArray(m)) m.forEach(function (x) { x.dispose(); });
      else m.dispose();
    }
  });
  scene = null;
  W = null;
}

function buildWorld(index) {
  disposeWorld();
  LEVEL = LEVELS[index];
  scene = new T.Scene();
  scene.fog = new T.FogExp2(LEVEL.aboveFog, 0.0026);
  W = {
    cu: {
      uTime: { value: 0 },
      uCaustic: { value: 0 },
      uMaxDepth: { value: LEVEL.maxDepth }
    },
    stations: [],
    item: null,
    waterU: null,
    skyU: null,
    snow: null,
    bubbles: null,
    time: 0
  };
  buildSky();
  buildLights();
  buildCave();
  buildRim();
  buildWater();
  buildProps();
  buildRubble();
  buildGuideLine();
  buildItem();
  buildParticles();
}

/* ---------- 天空 ---------- */
function buildSky() {
  const u = {
    uTop: { value: new T.Color(LEVEL.skyTop) },
    uBot: { value: new T.Color(LEVEL.skyBot) },
    uSunCol: { value: new T.Color(LEVEL.sunColor) },
    uSunDir: { value: new T.Vector3(LEVEL.sunDir[0], LEVEL.sunDir[1], LEVEL.sunDir[2]).normalize() }
  };
  const mat = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, uniforms: u,
    vertexShader: [
      'varying vec3 vDir;',
      'void main(){',
      '  vDir = normalize(position);',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uSunCol; uniform vec3 uSunDir;',
      'varying vec3 vDir;',
      'void main(){',
      '  vec3 d = normalize(vDir);',
      '  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);',
      '  vec3 col = mix(uBot, uTop, pow(h, 0.72));',
      '  float sd = max(dot(d, normalize(uSunDir)), 0.0);',
      '  col += uSunCol * pow(sd, 900.0) * 2.6;',
      '  col += uSunCol * pow(sd, 10.0) * 0.10;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}'
    ].join('\n')
  });
  const mesh = new T.Mesh(new T.SphereGeometry(470, 32, 18), mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  W.skyU = u;
}

/* ---------- 光 ---------- */
function buildLights() {
  const sun = new T.DirectionalLight(LEVEL.sunColor, LEVEL.sunI);
  sun.position.set(LEVEL.sunDir[0], LEVEL.sunDir[1], LEVEL.sunDir[2]).multiplyScalar(120);
  scene.add(sun);
  const hemi = new T.HemisphereLight(LEVEL.skyTop, LEVEL.ground, LEVEL.hemiI);
  scene.add(hemi);
  const lamp = new T.PointLight(0xd8f4ff, 0, 30, 2);
  scene.add(lamp);
  const head = new T.SpotLight(0xe2f8ff, 0, 38, 0.62, 0.72, 1.8);
  scene.add(head);
  scene.add(head.target);
  const fill = new T.PointLight(0xffd2a0, 0, 11, 2);
  scene.add(fill);
  W.sun = sun; W.hemi = hemi; W.lamp = lamp; W.head = head; W.fill = fill;
}

/* ---------- 洞体 ---------- */
function buildCave() {
  const N = 250, R = 46;
  const curve = new T.CatmullRomCurve3(LEVEL.path.map(function (p) {
    return new T.Vector3(p[0], p[1], p[2]);
  }), false, 'catmullrom', 0.22);
  const pts = curve.getSpacedPoints(N);
  const positions = [], colors = [], uvs = [], indices = [];
  const base = new T.Color(LEVEL.rock);
  const deep = new T.Color(LEVEL.rockDeep);
  const sediment = new T.Color(0x3a3327);
  const green = new T.Color(0x4b6438);
  let prevN = null;

  for (let i = 0; i <= N; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const tan = new T.Vector3().subVectors(b, a).normalize();
    let n;
    if (!prevN) {
      n = new T.Vector3(1, 0, 0);
      if (Math.abs(tan.dot(n)) > 0.9) n.set(0, 0, 1);
      n.addScaledVector(tan, -n.dot(tan)).normalize();
    } else {
      n = prevN.clone().addScaledVector(tan, -prevN.dot(tan));
      if (n.lengthSq() < 1e-5) n.set(1, 0, 0);
      n.normalize();
    }
    prevN = n.clone();
    const bn = new T.Vector3().crossVectors(tan, n).normalize();
    const r = radiusAt(LEVEL.radii, p.y);
    W.stations.push({ p: p.clone(), t: tan.clone(), n: n.clone(), b: bn.clone(), r: r, i: i });

    for (let j = 0; j < R; j++) {
      const th = j / R * Math.PI * 2;
      const rr = wallRadius(i, th, r);
      const cos = Math.cos(th), sin = Math.sin(th);
      const x = p.x + n.x * cos * rr + bn.x * sin * rr;
      const y = p.y + n.y * cos * rr + bn.y * sin * rr;
      const z = p.z + n.z * cos * rr + bn.z * sin * rr;
      positions.push(x, y, z);
      const seam = vnoise2(Math.cos(th) * 2.4 + 5.3, Math.sin(th) * 2.4 + i * 0.036);
      const depth = Math.max(0, -p.y);
      const c = base.clone().multiplyScalar(0.58 + seam * 0.62);
      c.lerp(deep, smoothstep(0, LEVEL.maxDepth * 1.12, depth) * 0.72);
      if (LEVEL.greenTop && p.y > LEVEL.rimY * 0.55) {
        c.lerp(green, smoothstep(LEVEL.rimY * 0.55, LEVEL.rimY, p.y) * 0.55);
      }
      c.lerp(sediment, clamp((depth - LEVEL.maxDepth * 0.82) / (LEVEL.maxDepth * 0.18), 0, 1) * 0.38);
      colors.push(c.r, c.g, c.b);
      uvs.push(j / R, i / N);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < R; j++) {
      const a = i * R + j;
      const b = i * R + (j + 1) % R;
      const c = (i + 1) * R + j;
      const d = (i + 1) * R + (j + 1) % R;
      indices.push(a, b, c, b, d, c);
    }
  }
  // 底部封口
  const capIndex = positions.length / 3;
  const last = pts[N];
  positions.push(last.x, last.y, last.z);
  colors.push(0.17, 0.16, 0.13);
  uvs.push(0.5, 0.5);
  const ringStart = N * R;
  for (let j = 0; j < R; j++) {
    indices.push(ringStart + j, ringStart + (j + 1) % R, capIndex);
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const rockTex = makeRockTextureSet();
  const circ = 2 * Math.PI * radiusAt(LEVEL.radii, 0);
  const span = Math.abs(LEVEL.path[LEVEL.path.length - 1][1] - LEVEL.path[0][1]);
  rockTex.color.repeat.set(Math.max(2, circ / 4.5), Math.max(2, span / 4.5));
  rockTex.bump.repeat.copy(rockTex.color.repeat);
  const aniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;
  rockTex.color.anisotropy = aniso;
  rockTex.bump.anisotropy = aniso;
  const mat = new T.MeshStandardMaterial({
    vertexColors: true, roughness: 0.99, metalness: 0.02, side: T.BackSide,
    map: rockTex.color, bumpMap: rockTex.bump, bumpScale: 0.3
  });
  patchCaustics(mat, W.cu);
  const mesh = new T.Mesh(geo, mat);
  scene.add(mesh);
  W.cave = mesh;
  W.rockTex = rockTex;
}

function patchCaustics(mat, u) {
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uTime = u.uTime;
    shader.uniforms.uCaustic = u.uCaustic;
    shader.uniforms.uMaxDepth = u.uMaxDepth;
    shader.vertexShader = 'varying vec3 vWPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      ['#include <begin_vertex>',
       '#ifdef USE_INSTANCING',
       '  vWPos = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;',
       '#else',
       '  vWPos = (modelMatrix * vec4(transformed,1.0)).xyz;',
       '#endif'].join('\n')
    );
    shader.fragmentShader = [
      'varying vec3 vWPos;',
      'uniform float uTime;',
      'uniform float uCaustic;',
      'uniform float uMaxDepth;',
      'float caveCaustic(vec2 p, float t){',
      '  float a = sin(p.x*0.62 + t*0.72) * sin(p.y*0.57 - t*0.93);',
      '  float b = sin(p.x*0.23 - t*0.41 + p.y*0.19);',
      '  return pow(abs(a), 3.0) * 1.7 + pow(abs(b), 7.0) * 0.9;',
      '}',
      ''
    ].join('\n') + shader.fragmentShader.replace(
      'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
      ['gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
       'float cs = caveCaustic(vWPos.xz*0.55 + vWPos.y*0.07, uTime);',
       'float cf = smoothstep(-uMaxDepth, -0.5, vWPos.y);',
       'gl_FragColor.rgb += vec3(0.05,0.12,0.12) * cs * uCaustic * cf;'].join('\n')
    );
  };
  mat.customProgramCacheKey = function () { return 'cave-caustic'; };
}

/* ---------- 地表 / 洞口 ---------- */
function buildRim() {
  const inner = Math.max(2, radiusAt(LEVEL.radii, LEVEL.rimY) - 0.55);
  const tex = makeNoiseTexture(256, LEVEL.id === 'bluehole' ? 146 : 104, 58);
  tex.repeat.set(26, 26);
  const mat = new T.MeshStandardMaterial({ map: tex, color: LEVEL.ground, roughness: 1, side: T.DoubleSide });
  const geo = new T.RingGeometry(inner, 170, 100, 1);
  geo.rotateX(-Math.PI / 2);
  const ring = new T.Mesh(geo, mat);
  ring.position.y = LEVEL.rimY;
  scene.add(ring);

  if (LEVEL.greenTop) {
    const geoB = new T.IcosahedronBufferGeometry(1, 1);
    const matB = new T.MeshStandardMaterial({ color: 0x415a33, roughness: 1, flatShading: true });
    const inst = new T.InstancedMesh(geoB, matB, 44);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3();
    for (let i = 0; i < 44; i++) {
      const th = hash1(i * 3.1) * Math.PI * 2;
      const rad = inner + 1.5 + hash1(i * 7.7) * 11;
      e.set(0, hash1(i) * 6.28, 0); q.setFromEuler(e);
      const sc = 0.7 + hash1(i * 2.3) * 2.2;
      s.set(sc * 1.4, sc * 0.8, sc * 1.4);
      m.compose(new T.Vector3(Math.cos(th) * rad, LEVEL.rimY + sc * 0.45, Math.sin(th) * rad), q, s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  } else {
    // 蓝洞地表：散落石灰岩块，压住“沙丘”感
    const geoR = new T.IcosahedronBufferGeometry(1, 1);
    const matR = new T.MeshStandardMaterial({ color: 0x6b5f49, roughness: 1, flatShading: true });
    const inst = new T.InstancedMesh(geoR, matR, 56);
    const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3();
    for (let i = 0; i < 56; i++) {
      const th = hash1(i * 4.7 + 1.2) * Math.PI * 2;
      const rad = inner + 0.8 + hash1(i * 9.3 + 4.4) * 16;
      e.set(hash1(i * 2.1) * 0.4, hash1(i * 5.3) * 6.28, hash1(i * 1.7) * 0.4); q.setFromEuler(e);
      const sc = 0.5 + hash1(i * 3.7 + 8.8) * 1.9;
      s.set(sc * (1.1 + hash1(i) * 0.7), sc * 0.62, sc * (1.0 + hash1(i * 6.1) * 0.8));
      m.compose(new T.Vector3(Math.cos(th) * rad, LEVEL.rimY + sc * 0.18, Math.sin(th) * rad), q, s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
}

/* ---------- 水面 ---------- */
function buildWater() {
  const radius = radiusAt(LEVEL.radii, 0) + 0.12;
  const u = {
    uTime: { value: 0 },
    uDeep: { value: new T.Color(LEVEL.waterDeep) },
    uSky: { value: new T.Color(LEVEL.waterSky) },
    uSunDir: { value: new T.Vector3(LEVEL.sunDir[0], LEVEL.sunDir[1], LEVEL.sunDir[2]).normalize() },
    uSunCol: { value: new T.Color(LEVEL.sunColor) },
    uRadius: { value: radius }
  };
  const mat = new T.ShaderMaterial({
    transparent: true, side: T.DoubleSide, depthWrite: true, uniforms: u,
    vertexShader: [
      'varying vec3 vWorld;',
      'void main(){',
      '  vec4 wp = modelMatrix * vec4(position,1.0);',
      '  vWorld = wp.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime; uniform vec3 uDeep; uniform vec3 uSky; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uRadius;',
      'varying vec3 vWorld;',
      'void main(){',
      '  vec2 p = vWorld.xz;',
      '  float t = uTime;',
      '  float r = length(p);',
      '  // 多向波纹：三组不同频率的行波叠加，形成细碎水面',
      '  float gx = cos(p.x*0.92 + t*1.07)*0.92 + cos(p.x*0.33 - p.y*0.21 + t*0.63)*0.33',
      '           + cos(p.x*2.7 + p.y*1.9 + t*1.9)*0.14;',
      '  float gz = cos(p.y*1.13 - t*0.88)*1.13 + cos(p.y*0.27 + p.x*0.19 - t*0.51)*0.27',
      '           + cos(p.y*2.4 - p.x*1.6 - t*1.65)*0.14;',
      '  vec3 n = normalize(vec3(-gx*0.085, 1.0, -gz*0.085));',
      '  vec3 V = normalize(cameraPosition - vWorld);',
      '  float fres = pow(1.0 - clamp(dot(V,n), 0.0, 1.0), 3.0);',
      '  vec3 above = mix(uDeep, uSky, clamp(fres*1.35 + 0.20, 0.0, 1.0));',
      '  // 水下暗色 + 岩壁倒影近似',
      '  above = mix(above, uDeep*0.72, 0.26);',
      '  vec3 H = normalize(V + normalize(uSunDir));',
      '  float spec = pow(max(dot(n,H),0.0), 90.0);',
      '  above += uSunCol * spec * 3.0;',
      '  above += vec3(0.015,0.05,0.06) * (0.5 + 0.5*sin(p.x*1.7 + p.y*2.3 + t*1.4));',
      '  // 岸边泡沫',
      '  float edge = smoothstep(uRadius*0.90, uRadius*0.998, r);',
      '  float foam = edge * (0.30 + 0.20*sin(p.x*2.3 + p.y*1.7 + t*1.2) + 0.16*sin(p.x*5.1 - p.y*4.3 - t*1.6));',
      '  foam = clamp(foam, 0.0, 0.85) * (1.0 - smoothstep(uRadius*0.99, uRadius, r));',
      '  above = mix(above, vec3(0.72,0.85,0.86), foam);',
      '  // 水下视角：Snell 窗 + 亮斑',
      '  float upDot = dot(V, vec3(0.0,1.0,0.0));',
      '  float window = smoothstep(0.55, 0.82, upDot);',
      '  vec3 below = mix(uDeep*0.30, uSky*1.15, window);',
      '  below += vec3(0.20,0.36,0.38) * pow(max(dot(n, normalize(uSunDir)),0.0), 8.0) * window;',
      '  below += vec3(0.04,0.10,0.11) * (sin(p.x*0.8-t*1.2)*sin(p.y*0.7+t*0.9)*0.5+0.5);',
      '  vec3 col = gl_FrontFacing ? above : below;',
      '  float alpha = gl_FrontFacing ? mix(0.93, 1.0, fres) : 1.0;',
      '  gl_FragColor = vec4(col, alpha);',
      '}'
    ].join('\n')
  });
  const geo = new T.CircleGeometry(radius, 112);
  geo.rotateX(-Math.PI / 2);
  const mesh = new T.Mesh(geo, mat);
  mesh.position.y = 0.015;
  mesh.renderOrder = 2;
  scene.add(mesh);
  W.water = mesh;
  W.waterU = u;
}

/* ---------- 岸边平台 / 装备 ---------- */
function boxMesh(w, h, d, mat, x, y, z, ry) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  scene.add(m);
  return m;
}

function buildProps() {
  if (LEVEL.id === 'bluehole') {
    const metal = new T.MeshStandardMaterial({ color: 0x6d7779, roughness: 0.62, metalness: 0.55 });
    const wood = new T.MeshStandardMaterial({ color: 0x6a5138, roughness: 0.95 });
    boxMesh(4.0, 0.32, 4.4, wood, 9.35, 1.39, 0, 0);
    const plate = new T.MeshStandardMaterial({ color: 0x40372a, roughness: 0.95, metalness: 0.06 });
    boxMesh(4.1, 0.06, 4.5, plate, 9.35, 1.57, 0, 0);
    // 甲板拼缝
    const seam = new T.MeshBasicMaterial({ color: 0x2b2116 });
    for (let i = 0; i < 11; i++) {
      boxMesh(0.02, 0.012, 4.46, seam, 7.52 + i * 0.365, 1.606, 0, 0);
    }
    // 木台支柱（插入水中，顶端不露出台面）
    const postMat = new T.MeshStandardMaterial({ color: 0x4f4433, roughness: 0.98 });
    [[7.7, 1.8], [7.7, -1.8], [11.0, 1.8], [11.0, -1.8]].forEach(function (p) {
      const post = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 4.3, 8), postMat);
      post.position.set(p[0], -0.56, p[1]);
      scene.add(post);
    });
    // 入水梯
    boxMesh(0.07, 2.7, 0.07, metal, 7.35, 0.25, -1.25, 0);
    boxMesh(0.07, 2.7, 0.07, metal, 8.35, 0.25, -1.25, 0);
    for (let i = 0; i < 4; i++) {
      boxMesh(1.0, 0.05, 0.05, metal, 7.85, 1.1 - i * 0.62, -1.25, 0);
    }
    // 气瓶
    const tankMat = new T.MeshStandardMaterial({ color: 0xc8a33c, roughness: 0.45, metalness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const t = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.9, 12), tankMat);
      t.position.set(10.4, 1.95 + 0.02, -1.4 + i * 0.42);
      scene.add(t);
    }
  } else {
    const stone = new T.MeshStandardMaterial({ color: 0x6d6a56, roughness: 1 });
    const wood = new T.MeshStandardMaterial({ color: 0x5c4a34, roughness: 0.95 });
    boxMesh(4.8, 0.9, 6.2, stone, 9.25, 0.5, 0.7, 0);
    boxMesh(1.0, 0.7, 0.8, wood, 10.7, 1.3, 2.2, 0.2);
    boxMesh(0.9, 0.55, 0.7, wood, 10.2, 1.22, 2.9, -0.15);
    // 线轮
    const reel = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.16, 20), new T.MeshStandardMaterial({ color: 0xb9772f, roughness: 0.7 }));
    reel.rotation.z = Math.PI / 2;
    reel.position.set(10.6, 1.15, -1.0);
    scene.add(reel);
    // 岸标
    const pole = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 2.0, 8), new T.MeshStandardMaterial({ color: 0xb8b19a }));
    pole.position.set(10.9, 1.75, 0.2);
    scene.add(pole);
  }
}

/* ---------- 底部堆积 / 岩块 ---------- */
function buildRubble() {
  const geo = new T.IcosahedronBufferGeometry(1, 1);
  const pa = geo.attributes.position;
  const v = new T.Vector3();
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    const k = 0.78 + vnoise2(v.x * 2.2 + 9.1, v.y * 2.2 + v.z * 2.2 + 3.7) * 0.5;
    v.multiplyScalar(k);
    pa.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const rt = W.rockTex || makeRockTextureSet();
  const bt = rt.bump.clone();
  bt.needsUpdate = true;
  bt.repeat.set(1.2, 1.2);
  const mat = new T.MeshStandardMaterial({
    color: 0x2a2c25, roughness: 1, flatShading: true,
    bumpMap: bt, bumpScale: 0.14
  });
  const count = LEVEL.id === 'bluehole' ? 140 : 200;
  const inst = new T.InstancedMesh(geo, mat, count);
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), sc = new T.Vector3();
  const bottomR = radiusAt(LEVEL.radii, LEVEL.rubbleY);
  let k = 0;
  for (let i = 0; i < 62; i++) {
    const th = hash1(i * 2.7 + 1) * Math.PI * 2;
    const rad = Math.sqrt(hash1(i * 4.1 + 2)) * bottomR * 0.82;
    const size = 0.28 + Math.pow(hash1(i * 6.3 + 3), 2) * 1.9;
    e.set(hash1(i) * 2, hash1(i * 1.7) * 6.28, hash1(i * 3.3) * 2);
    q.setFromEuler(e);
    sc.set(size * (0.7 + hash1(i * 8.1) * 0.8), size * (0.5 + hash1(i * 5.2) * 0.7), size);
    m.compose(new T.Vector3(Math.cos(th) * rad, LEVEL.rubbleY + size * 0.28, Math.sin(th) * rad), q, sc);
    inst.setMatrixAt(k++, m);
  }
  for (let i = 0; i < count - 62; i++) {
    let si = 24, st = W.stations[si], tries = 0;
    while (st.p.y > 0.1 && tries < 24) {
      tries++;
      si = 24 + Math.floor(hash1(i * 9.2 + 5 + tries * 2.13) * (W.stations.length - 40));
      st = W.stations[si];
    }
    if (st.p.y > 0.1) continue;
    const th = hash1(i * 3.9 + 7) * Math.PI * 2;
    const rad = wallRadius(st.i, th, st.r) * 0.94;
    const size = 0.3 + Math.pow(hash1(i * 1.3 + 8), 2) * 1.3;
    e.set(hash1(i) * 2, hash1(i * 2.2) * 6.28, hash1(i * 4.4) * 2);
    q.setFromEuler(e);
    sc.set(size, size * 0.7, size);
    m.compose(new T.Vector3(
      st.p.x + st.n.x * Math.cos(th) * rad + st.b.x * Math.sin(th) * rad,
      st.p.y + st.n.y * Math.cos(th) * rad + st.b.y * Math.sin(th) * rad,
      st.p.z + st.n.z * Math.cos(th) * rad + st.b.z * Math.sin(th) * rad
    ), q, sc);
    inst.setMatrixAt(k++, m);
  }
  inst.count = k;
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
}

/* ---------- 引导绳 / 深度结 ---------- */
function buildGuideLine() {
  const pts = [];
  if (LEVEL.id === 'bluehole') {
    for (let y = -0.5; y >= -24.4; y -= 0.6) pts.push(new T.Vector3(2.0, y, 0.4));
  } else {
    for (let i = 10; i < W.stations.length; i += 2) {
      const st = W.stations[i];
      if (st.p.y > -0.4) continue;
      pts.push(new T.Vector3(
        st.p.x + st.n.x * 0.75,
        st.p.y + st.n.y * 0.75,
        st.p.z + st.n.z * 0.75
      ));
    }
  }
  const geo = new T.BufferGeometry().setFromPoints(pts);
  const mat = new T.LineBasicMaterial({ color: 0xc9c2a4, transparent: true, opacity: 0.34 });
  scene.add(new T.Line(geo, mat));

  const knotGeo = new T.SphereGeometry(0.055, 6, 6);
  const knotMat = new T.MeshBasicMaterial({ color: 0xf0d98a });
  const step = LEVEL.id === 'bluehole' ? 9 : 22;
  const inst = new T.InstancedMesh(knotGeo, knotMat, Math.floor(pts.length / step) + 1);
  const m = new T.Matrix4();
  let k = 0;
  for (let i = 0; i < pts.length; i += step) {
    m.makeTranslation(pts[i].x, pts[i].y, pts[i].z);
    inst.setMatrixAt(k++, m);
  }
  inst.count = k;
  inst.instanceMatrix.needsUpdate = true;
  scene.add(inst);
}

/* ---------- 目标物 ---------- */
function buildItem() {
  const g = new T.Group();
  const pos = new T.Vector3(LEVEL.target.x, LEVEL.target.y, LEVEL.target.z);
  g.position.copy(pos);

  const bagMat = new T.MeshStandardMaterial({
    color: LEVEL.id === 'bluehole' ? 0x8a6024 : 0x9a6a28,
    roughness: 0.82, metalness: 0.06, emissive: 0x120b02, emissiveIntensity: 0.25
  });
  const dark = new T.MeshStandardMaterial({ color: 0x2e2a24, roughness: 0.9 });
  const body = new T.Mesh(new T.BoxGeometry(0.92, 0.46, 0.6), bagMat);
  body.position.y = 0.08;
  g.add(body);
  const strap1 = new T.Mesh(new T.BoxGeometry(0.07, 0.5, 0.62), dark);
  strap1.position.set(-0.23, 0.08, 0);
  g.add(strap1);
  const strap2 = strap1.clone(); strap2.position.x = 0.23; g.add(strap2);

  const ringMat = new T.MeshBasicMaterial({
    color: 0x7fe7d0, transparent: true, opacity: 0.26,
    blending: T.AdditiveBlending, depthWrite: false
  });
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new T.Mesh(new T.TorusGeometry(0.68 + i * 0.1, 0.01, 6, 52), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2 + i * 0.32;
    g.add(ring);
    rings.push(ring);
  }
  const glow = new T.Sprite(new T.SpriteMaterial({
    map: makeDotTexture(), color: 0x7fe7d0, transparent: true,
    opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false
  }));
  glow.scale.set(1.5, 1.5, 1);
  glow.position.y = 0.02;
  g.add(glow);
  const light = new T.PointLight(0x8ff4de, 0.12, 6, 2);
  light.position.y = 0.6;
  g.add(light);

  scene.add(g);
  W.item = { group: g, rings: rings, glow: glow, light: light, pos: pos, collected: false };
}

/* ---------- 悬浮颗粒 / 气泡 ---------- */
function buildParticles() {
  const dot = makeDotTexture();
  const count = 1700;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 38;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 38;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 38;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(arr, 3));
  const mat = new T.PointsMaterial({
    size: 0.09, map: dot, transparent: true, opacity: 0.5,
    color: 0xc7e8e8, depthWrite: false, sizeAttenuation: true
  });
  const points = new T.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);
  W.snow = { points: points, geo: geo, arr: arr, count: count };

  const bcount = 90;
  const barr = new Float32Array(bcount * 3);
  for (let i = 0; i < bcount; i++) barr[i * 3 + 1] = -9999;
  const bgeo = new T.BufferGeometry();
  bgeo.setAttribute('position', new T.BufferAttribute(barr, 3));
  const bmat = new T.PointsMaterial({
    size: 0.16, map: dot, transparent: true, opacity: 0.8,
    color: 0xcdf8ff, depthWrite: false, blending: T.AdditiveBlending, sizeAttenuation: true
  });
  const bpoints = new T.Points(bgeo, bmat);
  bpoints.frustumCulled = false;
  scene.add(bpoints);
  W.bubbles = {
    points: bpoints, geo: bgeo, arr: barr, count: bcount,
    vel: new Array(bcount), life: new Float32Array(bcount), cursor: 0
  };
  for (let i = 0; i < bcount; i++) W.bubbles.vel[i] = new T.Vector3();
}

/* ============================================================
   流程 / 输入 / 交互
   ============================================================ */
const keys = {};
let hintTimer = 0;
let hintSticky = false;

function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
}

function showHint(text, sec) {
  const el = $('hint');
  el.textContent = text;
  el.classList.add('on');
  hintTimer = sec === undefined ? 3 : sec;
  hintSticky = false;
}

function splashFX() {
  const el = $('splashfx');
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
  Sound.splash();
  state.shake = 1.0;
}

function refreshHudMeta() {
  $('mNo').textContent = LEVEL.no;
  $('mName').textContent = LEVEL.name;
  $('mEn').textContent = LEVEL.en;
  $('mFacts').innerHTML = LEVEL.facts;
  $('objTxt').textContent = LEVEL.obj;
  $('objSub').textContent = '在氧气耗尽前回到水面';
}

function resetRun(index) {
  state.levelIndex = index;
  state.o2Max = LEVELS[index].o2Max;
  state.o2 = state.o2Max;
  state.maxDepth = 0;
  state.hasItem = false;
  state.elapsed = 0;
  state.diveT = 0;
  state.fogMix = 0;
  state.submerged = false;
  state.breath = 0;
  state.breathPrev = 0;
  state.shake = 0;
  state.vel.set(0, 0, 0);
  state.nearIndex = 0;
  const sp = LEVELS[index].spawn;
  state.eye.set(sp.x, sp.y, sp.z);
  state.yaw = sp.yaw;
  state.pitch = sp.pitch;
  state.roll = 0;
  state.mode = 'shore';
  if (W && W.item) {
    W.item.collected = false;
    W.item.group.visible = true;
  }
  $('redflash').classList.remove('on');
  $('winPanel').classList.remove('on');
  $('losePanel').classList.remove('on');
  $('pause').classList.remove('on');
  refreshHudMeta();
}

function startLevel(index) {
  Sound.init();
  Sound.resume();
  buildWorld(index);
  resetRun(index);
  $('menu').classList.add('hide');
  $('hud').classList.add('on');
  state.mode = 'shore';
  showHint('点击画面锁定视角 · 按 SPACE 入水', 5);
  lockPointer();
}

function goMenu() {
  document.exitPointerLock && document.exitPointerLock();
  buildWorld(state.levelIndex);
  resetRun(state.levelIndex);
  state.mode = 'menu';
  $('hud').classList.remove('on');
  $('winPanel').classList.remove('on');
  $('losePanel').classList.remove('on');
  $('pause').classList.remove('on');
  $('redflash').classList.remove('on');
  $('menu').classList.remove('hide');
  document.body.style.cursor = 'default';
}

function enterWater() {
  if (!W) return;
  Sound.init();
  Sound.resume();
  state.mode = 'diveIn';
  state.diveT = 0;
  state.diveSplashed = false;
  state.diveFrom.copy(state.eye);
  state.diveTo.set(LEVEL.diveTo.x, LEVEL.diveTo.y, LEVEL.diveTo.z);
  state.diveYaw0 = state.yaw;
  state.diveYaw1 = LEVEL.diveTo.yaw;
  state.divePitch0 = state.pitch;
  state.divePitch1 = LEVEL.diveTo.pitch;
}

function emerge() {
  state.eye.y = 0.12;
  state.vel.set(0, 0, 0);
  splashFX();
  if (state.hasItem) {
    winGame();
    return;
  }
  state.mode = 'surface';
  showHint('已浮出水面 · 呼吸中 · SHIFT 下潜', 3.2);
}

function diveFromSurface() {
  state.mode = 'swim';
  state.eye.y = -0.95;
  state.vel.set(0, -1.0, 0);
  state.submerged = true;
  splashFX();
}

function collectItem() {
  if (!W || !W.item) return;
  if (state.mode === 'win' || state.mode === 'lose') return;
  if (state.hasItem || W.item.collected) return;
  const d = state.eye.distanceTo(W.item.pos);
  if (d > 2.7) {
    showHint('目标还在 ' + d.toFixed(1) + ' m 外', 1.4);
    return;
  }
  state.hasItem = true;
  W.item.collected = true;
  W.item.group.visible = false;
  Sound.chime();
  state.shake = 0.18;
  showHint('已取得「' + LEVEL.itemName + '」· 立即上浮返航', 4);
  $('objTxt').textContent = '返回水面';
  $('objSub').textContent = '氧气仍在消耗 · 不要再停留';
}

function winGame() {
  if (state.mode === 'win') return;
  state.mode = 'win';
  state.vel.set(0, 0, 0);
  Sound.win();
  $('wTime').textContent = fmtTime(state.elapsed);
  $('wDepth').textContent = state.maxDepth.toFixed(1);
  $('wO2').textContent = Math.round(state.o2 / state.o2Max * 100);
  $('winText').textContent = '你在氧气耗尽前带回了「' + LEVEL.itemName + '」。';
  $('btnNext').textContent = state.levelIndex === 0 ? '进入 02 九顿天窗 →' : '再潜一次';
  $('winPanel').classList.add('on');
  document.exitPointerLock && document.exitPointerLock();
}

function loseGame() {
  if (state.mode === 'lose' || state.mode === 'win') return;
  state.mode = 'lose';
  state.vel.set(0, 0, 0);
  Sound.lose();
  $('redflash').classList.add('on');
  $('loseDepth').textContent = state.maxDepth.toFixed(1);
  $('losePanel').classList.add('on');
  document.exitPointerLock && document.exitPointerLock();
}

function retry() {
  startLevel(state.levelIndex);
}

/* ---------- 碰撞：沿洞体中心线夹紧 ---------- */
function constrainToCave(p) {
  if (!W || !W.stations.length) return;
  const sts = W.stations;
  let best = Infinity, bi = state.nearIndex;
  for (let i = 0; i < sts.length; i++) {
    const d = sts[i].p.distanceToSquared(p);
    if (d < best) { best = d; bi = i; }
  }
  state.nearIndex = bi;
  const st = sts[bi];
  const d = new T.Vector3().subVectors(p, st.p);
  const along = d.dot(st.t);
  const theta = Math.atan2(d.dot(st.b), d.dot(st.n));
  const lim = Math.max(0.55, wallRadius(st.i, theta, st.r) - 0.42);
  const lat = d.clone().addScaledVector(st.t, -along);
  if (lat.length() > lim) lat.setLength(lim);
  let al = clamp(along, -0.42, 0.42);
  if (bi === sts.length - 1) al = Math.min(al, 0);
  if (bi === 0) al = Math.max(al, 0);
  p.copy(st.p).add(lat).addScaledVector(st.t, al);
}

/* ---------- 氧气 ---------- */
function depthOf() { return Math.max(0, -state.eye.y); }
function drainRate() {
  const d = depthOf();
  const depthK = 1 + Math.pow(d / 22, 1.05) * 0.62;
  const sp = state.vel.length();
  const moveK = 1 + clamp(sp / Math.max(1, LEVEL.moveSpeed), 0, 1) * 0.65;
  return depthK * moveK;
}

/* ---------- 更新：下潜动画 ---------- */
function updateDive(dt) {
  state.diveT += dt / 1.45;
  const t = clamp(state.diveT, 0, 1);
  const e = t * t * (3 - 2 * t);
  const py = lerp(state.diveFrom.y, state.diveTo.y, e) + Math.sin(t * Math.PI) * 0.85;
  state.eye.x = lerp(state.diveFrom.x, state.diveTo.x, e);
  state.eye.y = py;
  state.eye.z = lerp(state.diveFrom.z, state.diveTo.z, e);
  state.yaw = lerp(state.diveYaw0, state.diveYaw1, e);
  state.pitch = lerp(state.divePitch0, state.divePitch1, e);
  if (!state.diveSplashed && py < -0.04) {
    state.diveSplashed = true;
    splashFX();
  }
  if (t >= 1) {
    state.mode = 'swim';
    state.eye.set(LEVEL.diveTo.x, LEVEL.diveTo.y, LEVEL.diveTo.z);
    state.vel.set(0, 0, 0);
    showHint('WASD 平移 · SPACE 上浮 · SHIFT 下潜 · E 拾取', 4);
  }
}

/* ---------- 更新：游泳 ---------- */
function updateSwim(dt) {
  state.elapsed += dt;
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const down = (keys.ShiftLeft || keys.ShiftRight || keys.KeyC) ? 1 : 0;
  const up = keys.Space ? 1 : 0;
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const dir = new T.Vector3(-sy * fwd + cy * str, 0, -cy * fwd - sy * str);
  if (dir.lengthSq() > 1) dir.normalize();
  const target = new T.Vector3(dir.x * LEVEL.moveSpeed, (up - down) * LEVEL.vertSpeed, dir.z * LEVEL.moveSpeed);
  state.vel.lerp(target, 1 - Math.exp(-dt * 4.6));

  const prevY = state.eye.y;
  state.eye.addScaledVector(state.vel, dt);
  constrainToCave(state.eye);

  if (prevY < -0.04 && state.eye.y >= -0.04) {
    emerge();
    return;
  }

  const d = depthOf();
  if (d > state.maxDepth) state.maxDepth = d;
  state.o2 -= drainRate() * dt;
  if (state.o2 <= 0) {
    state.o2 = 0;
    loseGame();
    return;
  }

  // 呼吸节奏
  const low = state.o2 / state.o2Max < 0.25;
  const before = state.breath;
  state.breath += dt / (low ? 3.0 : 4.25);
  if (state.breath >= 1) state.breath -= 1;
  if (before < 0.05 && state.breath >= 0.05) Sound.inhale();
  if (before < 0.64 && state.breath >= 0.64) {
    Sound.exhale();
    spawnBubbles(11);
  }
  if (low && W.time - state.lastBeep > 1.15) {
    state.lastBeep = W.time;
    Sound.bubble(0);
  }

  // 取物提示
  if (W.item && !state.hasItem) {
    const dist = state.eye.distanceTo(W.item.pos);
    if (dist < 2.7) {
      $('hint').textContent = 'E · 拾取「' + LEVEL.itemName + '」';
      $('hint').classList.add('on');
      hintTimer = 0.25;
    }
  }
}

/* ---------- 更新：水面 ---------- */
function updateSurface(dt) {
  state.elapsed += dt;
  state.o2 = Math.min(state.o2Max, state.o2 + 30 * dt);
  state.eye.y = 0.11 + Math.sin(W.time * 1.4) * 0.035;
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  const dir = new T.Vector3(-sy * fwd + cy * str, 0, -cy * fwd - sy * str);
  if (dir.lengthSq() > 1) dir.normalize();
  state.vel.lerp(new T.Vector3(dir.x * 1.7, 0, dir.z * 1.7), 1 - Math.exp(-dt * 4));
  state.eye.addScaledVector(state.vel, dt);
  state.eye.y = 0.11 + Math.sin(W.time * 1.4) * 0.035;
  constrainToCave(state.eye);
  state.eye.y = 0.11 + Math.sin(W.time * 1.4) * 0.035;

  if (keys.ShiftLeft || keys.ShiftRight || keys.KeyC) {
    diveFromSurface();
    return;
  }
  if (state.hasItem) winGame();
}

/* ---------- 气泡 ---------- */
function spawnBubbles(n) {
  if (!W || !W.bubbles) return;
  const b = W.bubbles;
  const fx = -Math.sin(state.yaw), fz = -Math.cos(state.yaw);
  for (let k = 0; k < n; k++) {
    const i = b.cursor % b.count;
    b.cursor++;
    const px = state.eye.x + fx * 0.55 + (Math.random() - 0.5) * 0.35;
    const py = state.eye.y + 0.05 + (Math.random() - 0.5) * 0.25;
    const pz = state.eye.z + fz * 0.55 + (Math.random() - 0.5) * 0.35;
    b.arr[i * 3] = px;
    b.arr[i * 3 + 1] = py;
    b.arr[i * 3 + 2] = pz;
    b.vel[i].set((Math.random() - 0.5) * 0.22, 0.55 + Math.random() * 0.7, (Math.random() - 0.5) * 0.22);
    b.life[i] = 2.2 + Math.random() * 2.4;
  }
  b.geo.attributes.position.needsUpdate = true;
}

function updateBubbles(dt) {
  if (!W || !W.bubbles) return;
  const b = W.bubbles;
  for (let i = 0; i < b.count; i++) {
    if (b.life[i] <= 0) continue;
    b.life[i] -= dt;
    if (b.life[i] <= 0 || b.arr[i * 3 + 1] > -0.02) {
      b.arr[i * 3 + 1] = -9999;
      continue;
    }
    b.vel[i].y += dt * 0.5;
    b.arr[i * 3] += (b.vel[i].x + Math.sin(W.time * 3 + i) * 0.06) * dt;
    b.arr[i * 3 + 1] += b.vel[i].y * dt;
    b.arr[i * 3 + 2] += (b.vel[i].z + Math.cos(W.time * 2.6 + i) * 0.06) * dt;
  }
  b.geo.attributes.position.needsUpdate = true;
}

/* ---------- 悬浮颗粒 ---------- */
function updateSnow(dt) {
  if (!W || !W.snow) return;
  const s = W.snow, a = s.arr;
  const cx = state.eye.x, cy = state.eye.y, cz = state.eye.z;
  for (let i = 0; i < s.count; i++) {
    a[i * 3] += Math.sin(W.time * 0.4 + i * 0.7) * dt * 0.045;
    a[i * 3 + 1] -= dt * 0.075;
    a[i * 3 + 2] += Math.cos(W.time * 0.33 + i * 0.9) * dt * 0.045;
    if (a[i * 3] - cx > 19) a[i * 3] -= 38;
    else if (a[i * 3] - cx < -19) a[i * 3] += 38;
    if (a[i * 3 + 1] - cy > 19) a[i * 3 + 1] -= 38;
    else if (a[i * 3 + 1] - cy < -19) a[i * 3 + 1] += 38;
    if (a[i * 3 + 2] - cz > 19) a[i * 3 + 2] -= 38;
    else if (a[i * 3 + 2] - cz < -19) a[i * 3 + 2] += 38;
  }
  s.geo.attributes.position.needsUpdate = true;
  s.points.material.opacity = state.submerged ? 0.5 : 0;
  s.points.visible = state.submerged;
}

/* ---------- 相机 ---------- */
function updateCamera(dt) {
  const sp = clamp(state.vel.length() / Math.max(1, LEVEL.moveSpeed), 0, 1);
  let swx = 0, swy = 0, roll = 0;
  if (state.mode === 'swim' || state.mode === 'surface' || state.mode === 'diveIn') {
    const br = Math.sin(state.breath * Math.PI * 2);
    swx = Math.sin(W.time * 1.75 + state.breath * 2.4) * 0.014 * (0.35 + sp) + Math.sin(W.time * 0.62) * 0.004;
    swy = Math.cos(W.time * 2.15) * 0.018 * (0.35 + sp) + br * 0.012;
    roll = Math.sin(W.time * 0.78 + state.breath * 1.8) * 0.010 * (0.4 + sp);
  }
  state.shake *= Math.exp(-dt * 2.6);
  const shx = (Math.random() - 0.5) * state.shake * 0.11;
  const shy = (Math.random() - 0.5) * state.shake * 0.09;
  const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw);
  camera.position.set(state.eye.x, state.eye.y, state.eye.z);
  camera.position.x += cy * (swx + shx);
  camera.position.z += -sy * (swx + shx);
  camera.position.y += swy + shy;
  camera.rotation.set(state.pitch, state.yaw, roll);
}

/* ---------- 环境视觉 ---------- */
function updateWorldVisuals(dt) {
  if (!W) return;
  W.time += dt;
  const depth = depthOf();
  const under = state.eye.y < -0.05;
  state.submerged = under;
  state.fogMix += ((under ? 1 : 0) - state.fogMix) * Math.min(1, dt * 3.4);
  const dk = smoothstep(0, LEVEL.maxDepth, depth);
  const nearC = new T.Color(LEVEL.fogNear);
  const deepC = new T.Color(LEVEL.fogDeep);
  const uw = nearC.lerp(deepC, dk);
  scene.fog.color.copy(new T.Color(LEVEL.aboveFog)).lerp(uw, state.fogMix);
  scene.fog.density = lerp(0.0026, lerp(LEVEL.fogNearD, LEVEL.fogDeepD, dk), state.fogMix);

  const atten = Math.exp(-depth / LEVEL.lightFall);
  W.sun.intensity = LEVEL.sunI * lerp(1, 0.26 * atten + 0.02, state.fogMix);
  W.hemi.intensity = LEVEL.hemiI * lerp(1, 0.10 + 0.44 * atten, state.fogMix);
  W.lamp.position.copy(state.eye);
  W.lamp.intensity = state.fogMix * (0.9 + 0.4 * (1 - dk));
  const fx = -Math.sin(state.yaw) * Math.cos(state.pitch);
  const fy = Math.sin(state.pitch);
  const fz = -Math.cos(state.yaw) * Math.cos(state.pitch);
  W.head.position.copy(state.eye);
  W.head.target.position.set(state.eye.x + fx * 12, state.eye.y + fy * 12, state.eye.z + fz * 12);
  W.head.intensity = state.fogMix * (1.0 + 0.5 * (1 - dk));
  W.fill.position.copy(state.eye);
  W.fill.intensity = state.fogMix * 0.34;

  W.cu.uTime.value = W.time;
  W.cu.uCaustic.value = state.fogMix * (1 - smoothstep(0, LEVEL.maxDepth * 0.42, depth)) * 1.05;
  if (W.waterU) W.waterU.uTime.value = W.time;

  const grade = $('grade');
  grade.style.opacity = under ? (0.20 + dk * 0.34).toFixed(3) : '0';

  if (W.item && !W.item.collected) {
    const it = W.item;
    it.group.position.y = it.pos.y + Math.sin(W.time * 1.5) * 0.09;
    for (let i = 0; i < it.rings.length; i++) {
      it.rings[i].rotation.z = W.time * (0.35 + i * 0.16) * (i % 2 ? -1 : 1);
      it.rings[i].position.y = 0.2 + i * 0.32 + Math.sin(W.time * 1.2 + i) * 0.04;
    }
    const pulse = 0.5 + Math.sin(W.time * 2.2) * 0.15;
    it.glow.material.opacity = pulse;
    it.light.intensity = 1.2 + Math.sin(W.time * 2.2) * 0.35;
  }
  if (W.water) {
    W.water.visible = true;
  }
  Sound.setDepth(under, depth);
}

/* ---------- HUD ---------- */
function updateHUD() {
  if (state.mode === 'menu') return;
  const d = depthOf();
  $('depthNum').textContent = d.toFixed(1);
  $('maxDepth').textContent = state.maxDepth.toFixed(1);
  const pct = clamp(state.o2 / state.o2Max, 0, 1);
  $('o2pct').textContent = Math.round(pct * 100) + '%';
  const fill = $('o2fill');
  fill.style.width = (pct * 100).toFixed(1) + '%';
  fill.className = pct < 0.12 ? 'crit' : (pct < 0.3 ? 'warn' : '');
  const rate = drainRate();
  $('o2rate').textContent = rate.toFixed(1) + '×';
  if (state.mode === 'surface') {
    $('o2time').textContent = '呼吸中';
  } else {
    $('o2time').textContent = fmtTime(state.o2 / Math.max(0.2, rate));
  }

  const arrow = $('cArrow');
  const lab = $('cLab');
  if (state.hasItem) {
    lab.textContent = 'SURFACE';
    $('cDist').textContent = d.toFixed(1) + ' m';
    arrow.style.transform = 'translate(-50%,-100%) rotate(0deg)';
  } else if (W && W.item) {
    lab.textContent = 'TARGET';
    const dx = W.item.pos.x - state.eye.x;
    const dz = W.item.pos.z - state.eye.z;
    const dy = W.item.pos.y - state.eye.y;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    $('cDist').textContent = dist.toFixed(1) + ' m';
    const want = Math.atan2(-dx, -dz);
    let rel = want - state.yaw;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    arrow.style.transform = 'translate(-50%,-100%) rotate(' + rel.toFixed(3) + 'rad)';
  }

  if (hintTimer > 0) {
    hintTimer -= 1 / 60;
    if (hintTimer <= 0) $('hint').classList.remove('on');
  }
}

/* ---------- 主循环 ---------- */
function update(dt) {
  if (!W) return;
  // 方向键转视角（Pointer Lock 不可用时的回退）
  if (['swim', 'surface', 'diveIn', 'shore'].includes(state.mode)) {
    const ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    const ay = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if (ax) state.yaw -= ax * dt * 1.5;
    if (ay) state.pitch = clamp(state.pitch - ay * dt * 1.0, -1.35, 1.35);
  }
  if (state.mode === 'menu') {
    const pv = LEVEL.preview || LEVEL.spawn;
    state.yaw = pv.yaw + Math.sin(W.time * 0.11) * 0.15;
    state.pitch = pv.pitch + Math.sin(W.time * 0.07) * 0.035;
    state.eye.set(pv.x, pv.y, pv.z);
  } else if (state.mode === 'shore') {
    state.eye.set(LEVEL.spawn.x, LEVEL.spawn.y + Math.sin(W.time * 1.1) * 0.012, LEVEL.spawn.z);
  } else if (state.mode === 'diveIn') {
    updateDive(dt);
  } else if (state.mode === 'swim') {
    updateSwim(dt);
  } else if (state.mode === 'surface') {
    updateSurface(dt);
  }
  updateWorldVisuals(dt);
  updateSnow(dt);
  updateBubbles(dt);
  updateCamera(dt);
  updateHUD();
}

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0.0001, (now - lastT) / 1000));
  lastT = now;
  update(dt);
  if (scene) renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------- 输入 ---------- */
function rotateView(dx, dy) {
  if (!['swim', 'surface', 'diveIn', 'shore', 'menu'].includes(state.mode)) return;
  state.yaw -= dx * 0.0022;
  state.pitch = clamp(state.pitch - dy * 0.0022, -1.35, 1.35);
}

window.addEventListener('keydown', function (e) {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.code === 'Space') {
    if (state.mode === 'shore') enterWater();
    else if (state.mode === 'surface') diveFromSurface();
  }
  if (e.code === 'KeyE') collectItem();
  if (e.code === 'Escape' && (state.mode === 'swim' || state.mode === 'surface')) {
    document.exitPointerLock && document.exitPointerLock();
  }
});
window.addEventListener('keyup', function (e) { keys[e.code] = false; });

let dragging = false, dragX = 0, dragY = 0;
canvas.addEventListener('mousedown', function (e) {
  if (!document.pointerLockElement && state.mode !== 'menu') {
    dragging = true; dragX = e.clientX; dragY = e.clientY;
  }
});
window.addEventListener('mouseup', function () { dragging = false; });
window.addEventListener('mousemove', function (e) {
  if (document.pointerLockElement === canvas) {
    rotateView(e.movementX || 0, e.movementY || 0);
  } else if (dragging) {
    rotateView(e.clientX - dragX, e.clientY - dragY);
    dragX = e.clientX; dragY = e.clientY;
  }
});

function lockPointer() {
  Sound.resume();
  if (canvas.requestPointerLock) {
    try {
      const pr = canvas.requestPointerLock();
      if (pr && typeof pr.catch === 'function') pr.catch(function () { /* 回退到拖拽视角 */ });
    } catch (err) { /* 允许拖拽视角 */ }
  }
}
canvas.addEventListener('click', function () {
  if (state.mode === 'menu') return;
  if (state.mode === 'paused') { resumeGame(); return; }
  if (!document.pointerLockElement) lockPointer();
});
$('pause').addEventListener('click', resumeGame);
function resumeGame() {
  $('pause').classList.remove('on');
  state.mode = state.pausedFrom || 'swim';
  lockPointer();
}
document.addEventListener('pointerlockchange', function () {
  const locked = document.pointerLockElement === canvas;
  if (!locked && ['swim', 'surface', 'diveIn'].includes(state.mode)) {
    state.pausedFrom = state.mode;
    state.mode = 'paused';
    $('pause').classList.add('on');
  } else if (locked) {
    $('pause').classList.remove('on');
  }
});
document.addEventListener('pointerlockerror', function () {
  showHint('视角：按住左键拖拽 / 方向键；SPACE 上浮 · SHIFT 下潜', 6);
});

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------- 菜单 / 面板 ---------- */
document.querySelectorAll('.lv').forEach(function (el) {
  el.addEventListener('click', function () {
    startLevel(parseInt(el.getAttribute('data-level'), 10));
  });
});
$('btnRetry').addEventListener('click', retry);
$('btnLoseLevels').addEventListener('click', goMenu);
$('btnLevels').addEventListener('click', goMenu);
$('btnNext').addEventListener('click', function () {
  if (state.levelIndex === 0) startLevel(1);
  else retry();
});
$('srcLink').addEventListener('click', function (e) {
  e.preventDefault();
  $('sources').classList.add('on');
});
$('srcClose').addEventListener('click', function () { $('sources').classList.remove('on'); });
$('sources').addEventListener('click', function (e) {
  if (e.target === $('sources')) $('sources').classList.remove('on');
});
window.addEventListener('keydown', function (e) {
  if (e.code === 'Escape' && $('sources').classList.contains('on')) {
    $('sources').classList.remove('on');
  }
});

/* ---------- 启动 ---------- */
buildWorld(0);
resetRun(0);
state.mode = 'menu';
$('menu').classList.remove('hide');
$('hud').classList.remove('on');
requestAnimationFrame(frame);

/* ---------- 调试接口（自动化验收用，不影响玩法） ---------- */
window.CAVE = {
  startLevel: startLevel,
  retry: retry,
  menu: goMenu,
  collect: collectItem,
  state: function () {
    return {
      mode: state.mode, level: state.levelIndex, depth: depthOf(),
      o2: state.o2, o2Max: state.o2Max, hasItem: state.hasItem,
      maxDepth: state.maxDepth, eye: state.eye.toArray(),
      drain: drainRate()
    };
  },
  teleport: function (x, y, z) {
    state.eye.set(x, y, z);
    state.nearIndex = 0;
  },
  setO2: function (v) { state.o2 = v; },
  look: function (yaw, pitch) {
    if (yaw !== undefined && yaw !== null) state.yaw = yaw;
    if (pitch !== undefined && pitch !== null) state.pitch = pitch;
  },
  dive: diveFromSurface,
  surface: function () { state.eye.y = 0.12; emerge(); },
  itemPos: function () { return W && W.item ? W.item.pos.toArray() : null; },
  levels: LEVELS.map(function (l) { return { id: l.id, o2: l.o2Max, targetDepth: l.targetDepth }; })
};

})();
