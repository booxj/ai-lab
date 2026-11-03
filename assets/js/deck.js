/* ===========================================================
   DECK — 包豪斯厅：立方体翻页 + 缩略图 + 多套演示
   =========================================================== */

const DECKS = [
  {
    id: 'aura',
    name: 'AURA 展馆',
    sub: '年度成果总览 · 2026',
    slides: [
      { scheme: 's-void', kicker: 'Deck 01 / 06 · AURA EXHIBITION', title: 'AI 成果展馆', sub: '一座为生成式作品而建的常设展厅', foot: 'AURA STUDIO', deco: [{ t: 'circle', c: '#2f56e8' }, { t: 'sq', c: '#f0c419' }] },
      { scheme: 's-blue', kicker: '01 — OVERVIEW', title: '四个展厅', sub: '网页、影像、演示与游戏，四种互不迁就的表达方式', foot: 'P.02', deco: [{ t: 'ring', c: '#f2ecdd' }, { t: 'tri', c: '#f0c419' }] },
      { scheme: 's-cream', kicker: '02 — WEB', title: '纸境', sub: '瑞士网格与真实渲染的网页缩略', foot: 'P.03', deco: [{ t: 'sq', c: '#e04a2c' }, { t: 'circle', c: '#2f56e8' }] },
      { scheme: 's-red', kicker: '03 — MOTION', title: '放映厅', sub: '没有一帧来自素材库，全部实时生成', foot: 'P.04', deco: [{ t: 'bar', c: '#fdf3e6' }, { t: 'circle', c: '#f0c419' }] },
      { scheme: 's-yellow', kicker: '04 — DECK', title: '包豪斯', sub: '撞色、几何与三维翻页的演示系统', foot: 'P.05', deco: [{ t: 'tri', c: '#e04a2c' }, { t: 'light' }] },
      { scheme: 's-void', kicker: '05 — PLAY', title: '街机厅', sub: '可玩的神经网络演示与 CRT 质感', foot: 'P.06', deco: [{ t: 'ring', c: '#23e0c0' }, { t: 'sq', c: '#ff3d81' }] },
    ],
  },
  {
    id: 'tech',
    name: '生成式影像白皮书',
    sub: '技术报告 · 内部版',
    slides: [
      { scheme: 's-cream', kicker: 'WHITEPAPER 2026', title: '生成式影像', sub: '从采样到成片的一次完整梳理', foot: 'P.01', deco: [{ t: 'sq', c: '#2f56e8' }] },
      { scheme: 's-blue', kicker: 'CHAPTER 01', title: '扩散模型', sub: '用去噪过程把随机性收敛到可描述的分布上', foot: 'P.04', deco: [{ t: 'circle', c: '#f0c419' }] },
      { scheme: 's-yellow', kicker: 'CHAPTER 02', title: '一致性', sub: '跨帧保持角色、光线与笔触的连续性', foot: 'P.11', deco: [{ t: 'bar', c: '#141210' }, { t: 'tri', c: '#e04a2c' }] },
      { scheme: 's-void', kicker: 'CHAPTER 03', title: '控制接口', sub: '用骨架、深度与姿态把镜头交给人', foot: 'P.19', deco: [{ t: 'ring', c: '#2f56e8' }] },
      { scheme: 's-red', kicker: 'CHAPTER 04', title: '后期装配', sub: '剪辑、配乐与调色的自动化流水线', foot: 'P.27', deco: [{ t: 'sq', c: '#fdf3e6' }] },
      { scheme: 's-cream', kicker: 'EPILOGUE', title: '下一步', sub: '实时、可交互、可交付的长片形态', foot: 'P.34', deco: [{ t: 'circle', c: '#e04a2c' }] },
    ],
  },
  {
    id: 'muse',
    name: '品牌提案 · 微光',
    sub: 'MUSE 品牌重塑',
    slides: [
      { scheme: 's-void', kicker: 'PROPOSAL / MUSE', title: '微光', sub: '一个关于日常观察的影像品牌', foot: '01', deco: [{ t: 'circle', c: '#f0c419' }] },
      { scheme: 's-cream', kicker: 'POSITIONING', title: '把光还给日常', sub: '在快节奏的生活里，留住被忽略的微光', foot: '02', deco: [{ t: 'sq', c: '#2f56e8' }, { t: 'ring', c: '#141210' }] },
      { scheme: 's-red', kicker: 'VISUAL SYSTEM', title: '构成', sub: '圆、三角、方块 —— 三个形状讲清所有事', foot: '05', deco: [{ t: 'tri', c: '#f0c419' }] },
      { scheme: 's-yellow', kicker: 'TYPOGRAPHY', title: '字体', sub: '粗黑体负责态度，细衬线负责呼吸', foot: '08', deco: [{ t: 'bar', c: '#141210' }] },
      { scheme: 's-blue', kicker: 'APPLICATION', title: '落地', sub: '从动态片头到包装纸箱，视觉无处不在', foot: '12', deco: [{ t: 'circle', c: '#f2ecdd' }] },
    ],
  },
];

/* ---------- 幻灯片 DOM ---------- */
function decoHTML(d) {
  if (!d) return '';
  const map = {
    circle: (c) => `<span class="shape" style="right:6%;top:8%;width:22%;aspect-ratio:1;border-radius:50%;background:${c}"></span>`,
    sq: (c) => `<span class="shape" style="right:8%;bottom:12%;width:16%;aspect-ratio:1;background:${c}"></span>`,
    tri: (c) => `<span class="shape" style="right:7%;top:14%;width:0;height:0;border-left:52px solid transparent;border-right:52px solid transparent;border-bottom:90px solid ${c}"></span>`,
    ring: (c) => `<span class="shape" style="right:5%;top:6%;width:26%;aspect-ratio:1;border-radius:50%;border:12px solid ${c};border-right-color:transparent"></span>`,
    bar: (c) => `<span class="shape" style="right:0;bottom:18%;width:34%;height:12px;background:${c}"></span>`,
    light: () => `<span class="shape" style="right:6%;bottom:14%;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,#fff,transparent 68%);opacity:.6"></span>`,
  };
  return d.map((x) => (map[x.t] ? map[x.t](x.c) : '')).join('');
}

function slideHTML(s, i) {
  return `<div class="slide-inner">
    <div class="slide-kicker">${s.kicker}</div>
    <div class="slide-title">${s.title}</div>
    <div class="slide-sub">${s.sub}</div>
    <div class="slide-foot"><span>${s.foot}</span><span>AURA / DECK</span></div>
  </div>${decoHTML(s.deco)}`;
}

const state = { deck: 0, index: 0, animating: false };

function deck() { return DECKS[state.deck]; }

function buildStage() {
  const stage = document.getElementById('cubeStage');
  const d = deck();
  const front = document.createElement('div');
  front.className = 'slide-face face-front';
  front.id = 'faceFront';
  const back = document.createElement('div');
  back.className = 'slide-face face-back';
  back.id = 'faceBack';
  stage.appendChild(front);
  stage.appendChild(back);
  paint();
}

function paint() {
  const d = deck();
  const front = document.getElementById('faceFront');
  const back = document.getElementById('faceBack');
  if (!front) return;
  front.className = 'slide-face face-front ' + d.slides[state.index].scheme;
  front.innerHTML = slideHTML(d.slides[state.index], state.index);
  const nxt = d.slides[(state.index + 1) % d.slides.length];
  back.className = 'slide-face face-back ' + nxt.scheme;
  back.innerHTML = slideHTML(nxt, state.index + 1);
  document.getElementById('pagerFill').style.width = ((state.index + 1) / d.slides.length) * 100 + '%';
  document.getElementById('pagerText').textContent =
    String(state.index + 1).padStart(2, '0') + ' / ' + String(d.slides.length).padStart(2, '0');
  document.getElementById('deckName').textContent = d.name;
  document.getElementById('deckSub').textContent = d.sub;
  document.querySelectorAll('.thumb').forEach((t, i) => t.classList.toggle('is-on', i === state.index));
  const th = document.querySelector('.thumb-row');
  if (th) {
    const on = th.querySelector('.thumb.is-on');
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
}

/* 立方体翻页：当前面向 -90° 旋转退出，下一张从 +90° 转回正面 */
function flip(dir) {
  if (state.animating) return;
  const d = deck();
  state.animating = true;
  const front = document.getElementById('faceFront');
  const back = document.getElementById('faceBack');
  const nextIdx = (state.index + (dir > 0 ? 1 : -1) + d.slides.length) % d.slides.length;

  // 背面内容预先设置为目标页
  const target = d.slides[nextIdx];
  back.className = 'slide-face face-back ' + target.scheme;
  back.innerHTML = slideHTML(target, nextIdx);

  front.style.transition = 'transform .85s cubic-bezier(.65,0,.35,1)';
  back.style.transition = 'transform .85s cubic-bezier(.65,0,.35,1)';

  if (dir > 0) {
    // 下一张：从右侧转回正面；当前张向左退出
    back.style.transform = 'translate(-50%,-50%) rotateY(90deg) translateZ(var(--d))';
    void back.offsetWidth;
    front.style.transform = 'translate(-50%,-50%) rotateY(-90deg) translateZ(var(--d))';
    back.style.transform = 'translate(-50%,-50%) rotateY(0deg) translateZ(var(--d))';
  } else {
    // 上一张：从左侧转回正面；当前张向右退出
    back.style.transform = 'translate(-50%,-50%) rotateY(-90deg) translateZ(var(--d))';
    void back.offsetWidth;
    front.style.transform = 'translate(-50%,-50%) rotateY(90deg) translateZ(var(--d))';
    back.style.transform = 'translate(-50%,-50%) rotateY(0deg) translateZ(var(--d))';
  }

  if (window.Audio) window.Audio.sfx('click');
  setTimeout(() => {
    state.index = nextIdx;
    paint();
    front.style.transition = 'none';
    back.style.transition = 'none';
    front.style.transform = 'translate(-50%,-50%) rotateY(0deg) translateZ(var(--d))';
    back.style.transform = 'translate(-50%,-50%) rotateY(90deg) translateZ(var(--d))';
    void front.offsetWidth;
    front.style.transition = '';
    back.style.transition = '';
    state.animating = false;
  }, 860);
}

function buildThumbs() {
  const row = document.querySelector('.thumb-row');
  row.innerHTML = '';
  const d = deck();
  d.slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'thumb';
    b.type = 'button';
    b.innerHTML = `<div class="tv ${s.scheme}">
        <span class="tk">${s.kicker}</span>
        <span class="tt">${s.title}</span>
        ${decoHTML(s.deco)}
      </div>
      <div class="tm"><span class="n">${String(i + 1).padStart(2, '0')}</span><span>${s.foot}</span></div>`;
    b.addEventListener('click', () => {
      const dir = i > state.index ? 1 : -1;
      const steps = Math.abs(i - state.index);
      const go = (k) => {
        if (k <= 0) return;
        flip(dir);
        setTimeout(() => go(k - 1), 880);
      };
      go(steps);
    });
    row.appendChild(b);
  });
}

function buildDeckPicker() {
  const wrap = document.getElementById('deckPicker');
  wrap.innerHTML = '';
  DECKS.forEach((dk, i) => {
    const b = document.createElement('button');
    b.className = 'dk-btn' + (i === state.deck ? ' solid' : '');
    b.type = 'button';
    b.textContent = dk.name;
    b.addEventListener('click', () => {
      if (i === state.deck) return;
      state.deck = i;
      state.index = 0;
      buildDeckPicker();
      buildThumbs();
      paint();
      if (window.Audio) window.Audio.sfx('click');
    });
    wrap.appendChild(b);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildStage();
  buildThumbs();
  buildDeckPicker();
  paint();

  document.getElementById('prevSlide').addEventListener('click', () => flip(-1));
  document.getElementById('nextSlide').addEventListener('click', () => flip(1));

  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); flip(1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); flip(-1); }
  });

  // 舞台拖拽翻页
  const stage = document.getElementById('cubeStage');
  let dx = 0, dragging = false, sx = 0;
  stage.addEventListener('pointerdown', (e) => { dragging = true; sx = e.clientX; dx = 0; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', (e) => { if (!dragging) return; dx = e.clientX - sx; });
  stage.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(dx) > 70) flip(dx < 0 ? 1 : -1);
  });

  // 舞台尺寸 → 立方体边长
  const fit = () => {
    const el = document.querySelector('.stage-wrap');
    if (!el) return;
    const w = Math.min(el.clientWidth * 0.82, 880);
    const h = w * 9 / 16;
    document.documentElement.style.setProperty('--d', (w / 2) + 'px');
    document.querySelectorAll('.slide-face').forEach((f) => {
      f.style.width = w + 'px';
      f.style.height = h + 'px';
    });
  };
  fit();
  addEventListener('resize', fit);
  setTimeout(fit, 60);

  AURACore.initSound('deck');
});
