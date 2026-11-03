/* ===========================================================
   CINEMA — 放映厅：程序化生成短片 + 片单 + 时间轴
   四部短片各自使用独立的生成算法与色彩语言
   =========================================================== */

const FILMS = [
  {
    no: 'F-01', title: '深海信号', dur: 42, tag: 'ABYSS SIGNAL',
    desc: '声呐脉冲在黑暗水体中的回响',
    color: ['#0a3d4a', '#12e0c8', '#04202b'],
    shots: [
      { t: 0, name: '下沉', sub: '深度 3,200 米 · 灯光已关闭' },
      { t: 9, name: '回响', sub: '第一个脉冲穿过温跃层' },
      { t: 19, name: '群落', sub: '生物荧光被依次唤醒' },
      { t: 30, name: '上升', sub: '浮力带着镜头向上' },
    ],
  },
  {
    no: 'F-02', title: '霓虹雨', dur: 38, tag: 'NEON RAIN',
    desc: '一座永不天亮的城市',
    color: ['#1a0630', '#ff2e88', '#25e6ff'],
    shots: [
      { t: 0, name: '街口', sub: '雨量：每小时 42 毫米' },
      { t: 8, name: '招牌', sub: '灯管在积水里碎成第二座城' },
      { t: 18, name: '过街', sub: '一个没有伞的人' },
      { t: 28, name: '天亮前', sub: '天空开始泛起深蓝' },
    ],
  },
  {
    no: 'F-03', title: '琉璃', dur: 45, tag: 'GLASS BLOOM',
    desc: '生长中的透明结构体',
    color: ['#2a1508', '#ffb45c', '#fff0d0'],
    shots: [
      { t: 0, name: '种子', sub: '第一次折射' },
      { t: 10, name: '分叉', sub: '结构开始寻找方向' },
      { t: 22, name: '充盈', sub: '内部充满缓慢流动的光' },
      { t: 34, name: '碎裂', sub: '无声的崩塌，也是另一种生长' },
    ],
  },
  {
    no: 'F-04', title: '轨道', dur: 36, tag: 'ORBITAL',
    desc: '被引力绘制的轨迹',
    color: ['#0b0b12', '#f0f0f5', '#6a7cff'],
    shots: [
      { t: 0, name: '释放', sub: '速度 7.8 km/s' },
      { t: 8, name: '捕获', sub: '椭圆轨道闭合' },
      { t: 17, name: '衰减', sub: '大气摩擦开始起作用' },
      { t: 26, name: '再入', sub: '所有轨迹终将回到地面' },
    ],
  },
];

/* ================= 影片渲染器 ================= */
function Renderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = Math.min(devicePixelRatio, 2);

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(320, Math.round(r.width));
    H = Math.max(200, Math.round(r.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  return { ctx, resize, get W() { return W; }, get H() { return H; } };
}

/* --- F-01 深海信号：脉冲波 + 荧光粒子 --- */
function abyss(R, t, pal) {
  const { ctx } = R, W = R.W, H = R.H;
  ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * .5, H * .55, 0, W * .5, H * .55, W * .72);
  g.addColorStop(0, 'rgba(30,120,140,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // 声呐环
  ctx.save();
  ctx.translate(W * .5, H * .58);
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.26 + i / 6) % 1);
    const r = p * W * 0.62;
    const a = (1 - p) * 0.4;
    ctx.strokeStyle = `rgba(18,224,200,${a})`;
    ctx.lineWidth = 1.4 + (1 - p) * 1.6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();

  // 生物荧光粒子
  const N = 260;
  for (let i = 0; i < N; i++) {
    const seed = i * 12.9898;
    const bx = (Math.sin(seed) * 0.5 + 0.5);
    const by = (Math.sin(seed * 1.7) * 0.5 + 0.5);
    const sp = 0.4 + (Math.sin(seed * 2.3) * 0.5 + 0.5) * 1.2;
    const x = bx * W + Math.sin(t * sp + i) * 26;
    const y = by * H - ((t * sp * 9 + i * 37) % (H * 1.3));
    const ph = Math.sin(t * 2.2 + i * 1.3);
    const a = 0.16 + ph * 0.16 + 0.16;
    const r = 0.9 + (ph * 0.5 + 0.5) * 2.1;
    ctx.fillStyle = `rgba(18,224,200,${Math.max(0, a)})`;
    ctx.beginPath(); ctx.arc(x, H - y, r, 0, Math.PI * 2); ctx.fill();
  }
  // 上升气泡
  for (let i = 0; i < 26; i++) {
    const x = ((i * 97) % W);
    const y = H - (((t * (26 + i % 12)) + i * 40) % (H + 60));
    ctx.strokeStyle = 'rgba(150,240,235,.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2); ctx.stroke();
  }
}

/* --- F-02 霓虹雨：城市剪影 + 雨 + 湿地反射 --- */
function neonRain(R, t, pal) {
  const { ctx } = R, W = R.W, H = R.H;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0a0416'); sky.addColorStop(.55, '#1a0630'); sky.addColorStop(1, '#08030f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // 霓虹光晕
  const halo = ctx.createRadialGradient(W * .5, H * .38, 0, W * .5, H * .38, W * .6);
  halo.addColorStop(0, 'rgba(255,46,136,.20)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);

  // 远景楼群
  const layers = [
    { y: .62, h: 210, c: 'rgba(10,4,22,.9)', w: 44, seed: 3 },
    { y: .72, h: 270, c: 'rgba(14,5,28,.96)', w: 62, seed: 7 },
    { y: .86, h: 340, c: 'rgba(4,2,10,1)', w: 88, seed: 11 },
  ];
  layers.forEach((L, li) => {
    ctx.fillStyle = L.c;
    let x = -40;
    let i = 0;
    while (x < W + 40) {
      const w = L.w * (0.6 + ((Math.sin((x + L.seed * 37) * 0.031) + 1) * 0.5) * 0.9);
      const h = L.h * (0.45 + ((Math.sin((x + L.seed * 91) * 0.017) + 1) * 0.5) * 0.85);
      ctx.fillRect(x, H * L.y - h, w, H);
      // 窗
      if (li >= 1) {
        const cols = Math.max(1, Math.floor(w / 16));
        const rows = Math.max(1, Math.floor(h / 22));
        for (let cxi = 0; cxi < cols; cxi++) {
          for (let ryi = 0; ryi < rows; ryi++) {
            const on = Math.sin((x + cxi * 13 + ryi * 7 + L.seed) * 0.61) > 0.55;
            if (!on) continue;
            const flick = 0.5 + 0.5 * Math.sin(t * 2 + cxi + ryi);
            ctx.fillStyle = ryi % 3 === 0
              ? `rgba(37,230,255,${0.35 + flick * 0.4})`
              : `rgba(255,46,136,${0.22 + flick * 0.45})`;
            ctx.fillRect(x + 5 + cxi * 16, H * L.y - h + 8 + ryi * 22, 6, 9);
          }
        }
        ctx.fillStyle = L.c;
      }
      x += w + 5 + (i % 3) * 6;
      i++;
    }
  });

  // 霓虹招牌
  const signs = [
    { x: .12, y: .46, w: 90, h: 150, c: pal[1] },
    { x: .78, y: .40, w: 62, h: 210, c: pal[2] },
    { x: .46, y: .55, w: 120, h: 34, c: pal[1] },
  ];
  signs.forEach((s, i) => {
    const x = s.x * W, y = s.y * H;
    ctx.save();
    ctx.shadowColor = s.c; ctx.shadowBlur = 26;
    ctx.strokeStyle = s.c; ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, s.w, s.h);
    ctx.restore();
    ctx.fillStyle = s.c; ctx.globalAlpha = .75;
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 10, y + 16 + k * (s.h / 5), s.w - 20, 3);
    ctx.globalAlpha = 1;
  });

  // 湿地反射
  ctx.save();
  ctx.globalAlpha = .22;
  ctx.translate(0, H * 1.72); ctx.scale(1, -1);
  ctx.filter = 'blur(2px)';
  layers[2] && null;
  ctx.restore();

  // 雨
  ctx.strokeStyle = 'rgba(180,220,255,.28)'; ctx.lineWidth = 1;
  for (let i = 0; i < 220; i++) {
    const seed = i * 7.31;
    const sp = 420 + (Math.sin(seed) * 0.5 + 0.5) * 620;
    const x = ((Math.sin(seed * 1.3) * 0.5 + 0.5) * (W + 220)) - 110;
    const y = ((t * sp + i * 53) % (H + 120)) - 60;
    const len = 10 + (Math.sin(seed * 2.2) * 0.5 + 0.5) * 22;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + len); ctx.stroke();
  }
}

/* --- F-03 琉璃：生长的晶体结构 --- */
function glassBloom(R, t, pal) {
  const { ctx } = R, W = R.W, H = R.H;
  const bg = ctx.createRadialGradient(W * .5, H * .55, 10, W * .5, H * .55, W * .75);
  bg.addColorStop(0, 'rgba(90,45,12,.85)'); bg.addColorStop(.55, 'rgba(30,14,5,.95)'); bg.addColorStop(1, '#100803');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const grow = Math.min(1, 0.14 + t * 0.022);
  const branches = [];
  const build = (x, y, ang, len, depth, seed) => {
    if (depth > 5 || len < 6) return;
    const ex = x + Math.cos(ang) * len;
    const ey = y + Math.sin(ang) * len;
    branches.push({ x, y, ex, ey, depth, seed });
    const n = depth < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const spread = 0.42 + Math.sin(seed * 1.7 + i) * 0.22;
      build(ex, ey, ang + (i - (n - 1) / 2) * spread, len * 0.68, depth + 1, seed + i * 3.1);
    }
  };
  const seedB = branches.length;
  void seedB;
  branches.length = 0;
  build(W * .5, H * .95, -Math.PI / 2 + 0.2, 74, 0, 1);
  build(W * .3, H * .98, -Math.PI / 2 - 0.3, 52, 0, 7);
  build(W * .72, H * .98, -Math.PI / 2 + 0.05, 60, 0, 13);

  const shown = Math.floor(branches.length * grow);
  for (let i = 0; i < shown; i++) {
    const b = branches[i];
    const p = (i / branches.length);
    const pulse = .55 + .45 * Math.sin(t * 1.4 + b.seed);
    const a = (0.18 + (1 - b.depth / 6) * 0.55) * (0.55 + pulse * 0.45);
    ctx.strokeStyle = `rgba(255,190,110,${a})`;
    ctx.lineWidth = Math.max(0.6, (6 - b.depth) * 0.7);
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.ex, b.ey); ctx.stroke();
    if (b.depth < 3) {
      ctx.fillStyle = `rgba(255,236,200,${a * .35})`;
      ctx.beginPath(); ctx.arc(b.ex, b.ey, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  // 内部流光
  for (let i = 0; i < 40; i++) {
    const a = t * .5 + i * .6;
    const rr = 40 + (i % 9) * 22;
    const x = W * .5 + Math.cos(a) * rr * .8;
    const y = H * .58 + Math.sin(a * 1.3) * rr * .5;
    const al = .1 + .18 * Math.abs(Math.sin(a * 2));
    ctx.fillStyle = `rgba(255,240,200,${al})`;
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
}

/* --- F-04 轨道：引力轨迹 --- */
function orbital(R, t, pal) {
  const { ctx } = R, W = R.W, H = R.H;
  ctx.fillStyle = '#07070d'; ctx.fillRect(0, 0, W, H);
  const cx = W * .5, cy = H * .52;
  // 星野
  for (let i = 0; i < 200; i++) {
    const s = i * 5.13;
    const x = (Math.sin(s) * .5 + .5) * W, y = (Math.sin(s * 1.9) * .5 + .5) * H;
    ctx.fillStyle = `rgba(255,255,255,${.06 + (Math.sin(s * 3) * .5 + .5) * .22})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  // 中心引力体
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 74);
  cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(.18, 'rgba(140,160,255,.55)');
  cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 74, 0, Math.PI * 2); ctx.fill();

  // 轨道族
  for (let k = 0; k < 26; k++) {
    const s = k * 2.71;
    const ecc = .3 + (Math.sin(s) * .5 + .5) * .55;
    const rot = (Math.sin(s * 1.3) * .5 + .5) * Math.PI;
    const rx = 48 + k * 8.5 + Math.sin(t * .3 + k) * 3;
    const ry = rx * ecc;
    ctx.strokeStyle = `rgba(150,170,255,${.05 + (1 - k / 26) * .26})`;
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
    ctx.stroke();
    // 行星
    const ang = t * (.5 - k * .012) + s;
    const px = cx + Math.cos(ang) * rx * Math.cos(rot) - Math.sin(ang) * ry * Math.sin(rot);
    const py = cy + Math.cos(ang) * rx * Math.sin(rot) + Math.sin(ang) * ry * Math.cos(rot);
    ctx.fillStyle = k % 5 === 0 ? 'rgba(255,220,180,.95)' : 'rgba(220,230,255,.85)';
    ctx.beginPath(); ctx.arc(px, py, k % 5 === 0 ? 2.6 : 1.7, 0, Math.PI * 2); ctx.fill();
    if (k % 5 === 0) {
      ctx.strokeStyle = 'rgba(255,200,140,.28)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // 再入尾迹
  const rp = (t * .18) % 1;
  ctx.strokeStyle = `rgba(255,190,120,${(1 - rp) * .5})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 30 + rp * 260, 18 + rp * 160, .6, 0, Math.PI * 2);
  ctx.stroke();
}

/* ================= 播放器 ================= */
let R = null;
const state = {
  film: 0, playing: false, t: 0, last: 0, vol: 0.8, dragging: false,
};

function currentFilm() { return FILMS[state.film]; }

function renderFrame(now) {
  const f = currentFilm();
  const t = state.t;
  const [a, b, c] = f.color;
  if (f.no === 'F-01') abyss(R, t, f.color);
  else if (f.no === 'F-02') neonRain(R, t, f.color);
  else if (f.no === 'F-03') glassBloom(R, t, f.color);
  else orbital(R, t, f.color);
  void a; void b; void c;

  // 字幕 & 分镜
  let shot = f.shots[0];
  for (const s of f.shots) if (t >= s.t) shot = s;
  const sub = document.getElementById('subtitle');
  sub.textContent = shot.sub;
  sub.classList.add('is-on');

  // 片名水印
  const wm = document.getElementById('wmShot');
  wm.textContent = shot.name;

  // 时间码
  const tc = document.getElementById('timecode');
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  const ff = String(Math.floor((t % 1) * 24)).padStart(2, '0');
  tc.textContent = `${mm}:${ss}:${ff}`;

  // 进度
  const pct = (t / f.dur) * 100;
  document.getElementById('barFill').style.width = pct + '%';
  document.getElementById('barDot').style.left = pct + '%';
  document.getElementById('timeLabel').textContent = `${mm}:${ss} / ${String(Math.floor(f.dur / 60)).padStart(2, '0')}:${String(f.dur % 60).padStart(2, '0')}`;

  requestAnimationFrame(renderFrame);
}

function tick(now) {
  if (state.playing) {
    const dt = (now - state.last) / 1000;
    state.t += dt;
    if (state.t >= currentFilm().dur) {
      state.t = currentFilm().dur;
      setPlaying(false);
    }
  }
  state.last = now;
}

function setPlaying(v) {
  state.playing = v;
  const btn = document.getElementById('playBtn');
  btn.classList.toggle('is-play', v);
  btn.innerHTML = v
    ? '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  document.getElementById('rec').style.opacity = v ? '1' : '.4';
}

function loadFilm(i, autoplay) {
  state.film = ((i % FILMS.length) + FILMS.length) % FILMS.length;
  state.t = 0;
  const f = currentFilm();
  document.getElementById('slTitle').textContent = f.title;
  document.getElementById('slTag').textContent = f.tag;
  document.getElementById('slDesc').textContent = f.desc;
  document.getElementById('slDur').textContent = `0:${String(f.dur).padStart(2, '0')}`;
  document.querySelectorAll('.fl-item').forEach((el, k) => el.classList.toggle('is-on', k === state.film));
  // 章节标记
  const ch = document.getElementById('chapters');
  ch.innerHTML = f.shots.map((s) => `<i style="left:${(s.t / f.dur) * 100}%"></i>`).join('');
  // 片头字幕板
  const slate = document.getElementById('slate');
  slate.querySelector('.sl-in').textContent = f.title;
  slate.querySelector('.sl-sub').textContent = `${f.no} · ${f.tag}`;
  slate.classList.add('is-on');
  setTimeout(() => slate.classList.remove('is-on'), 1500);
  if (autoplay) setPlaying(true);
}

document.addEventListener('DOMContentLoaded', () => {
  R = Renderer(document.getElementById('screenCanvas'));
  // 片单
  const list = document.getElementById('filmList');
  FILMS.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'fl-item';
    b.type = 'button';
    b.innerHTML = `<span class="fl-no">${f.no}</span>
      <span><span class="fl-t">${f.title}</span><span class="fl-d">${f.tag}</span></span>
      <span class="fl-dur">0:${String(f.dur).padStart(2, '0')}</span>`;
    b.addEventListener('click', () => { loadFilm(i, true); if (window.Audio) window.Audio.sfx('click'); });
    list.appendChild(b);
  });

  // 控制
  document.getElementById('playBtn').addEventListener('click', () => {
    setPlaying(!state.playing);
    if (state.playing && window.Audio) window.Audio.sfx('click');
  });
  document.getElementById('prevBtn').addEventListener('click', () => loadFilm(state.film - 1, state.playing));
  document.getElementById('nextBtn').addEventListener('click', () => loadFilm(state.film + 1, state.playing));

  // 时间轴拖拽
  const track = document.getElementById('track');
  const seek = (e) => {
    const r = track.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    state.t = p * currentFilm().dur;
  };
  track.addEventListener('pointerdown', (e) => { state.dragging = true; track.setPointerCapture(e.pointerId); seek(e); });
  track.addEventListener('pointermove', (e) => { if (state.dragging) seek(e); });
  track.addEventListener('pointerup', () => { state.dragging = false; });

  // 音量
  const vol = document.getElementById('vol');
  vol.addEventListener('input', () => {
    state.vol = vol.value / 100;
    if (window.Audio) window.Audio.setVolume(state.vol);
  });

  addEventListener('resize', () => R.resize());
  addEventListener('keydown', (e) => {
    if (e.key === ' ') { e.preventDefault(); setPlaying(!state.playing); }
    if (e.key === 'ArrowRight') state.t = Math.min(currentFilm().dur, state.t + 5);
    if (e.key === 'ArrowLeft') state.t = Math.max(0, state.t - 5);
    if (e.key === 'ArrowDown') loadFilm(state.film + 1, state.playing);
    if (e.key === 'ArrowUp') loadFilm(state.film - 1, state.playing);
  });

  loadFilm(0, false);
  state.last = performance.now();
  setInterval(() => tick(performance.now()), 1000 / 30);
  requestAnimationFrame(renderFrame);

  // 片门抖动
  const scr = document.getElementById('screen');
  setInterval(() => {
    scr.classList.toggle('is-weave', Math.random() < 0.16);
  }, 340);

  AURACore.initSound('cinema');
});
