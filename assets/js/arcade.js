/* ===========================================================
   ARCADE — 街机厅：Neural Snake（BFS 求解）+ CRT 表现
   =========================================================== */

const GRID_W = 26;
const GRID_H = 19;

const snake = {
  body: [],
  dir: { x: 1, y: 0 },
  pending: [],
  food: { x: 0, y: 0 },
  score: 0,
  best: Number(localStorage.getItem('aura_snake_best') || 0),
  alive: true,
  ai: true,
  running: false,
  tick: 0,
  speed: 7, // 每秒格数
  lastStep: 0,
  moves: 0,
  aiSteps: 0,
};

const canvas = document.getElementById('snakeCanvas');
const ctx = canvas.getContext('2d');

let CW = 0, CH = 0, CELL = 20, PAD = 16;

function resize() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio, 2);
  CW = r.width; CH = r.height;
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CELL = Math.min((CW - PAD * 2) / GRID_W, (CH - PAD * 2) / GRID_H);
}

/* ---------- 游戏逻辑 ---------- */
function reset() {
  snake.body = [
    { x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }, { x: 5, y: 9 },
  ];
  snake.dir = { x: 1, y: 0 };
  snake.pending = [];
  snake.score = 0;
  snake.alive = true;
  snake.moves = 0;
  snake.aiSteps = 0;
  placeFood();
  updateHud();
}

function placeFood() {
  const free = [];
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (!snake.body.some((s) => s.x === x && s.y === y)) free.push({ x, y });
    }
  }
  snake.food = free.length ? free[Math.floor(Math.random() * free.length)] : { x: 0, y: 0 };
}

function key(x, y) { return y * GRID_W + x; }

/* BFS 最短路径（避开蛇身） */
function bfs(from, goal, blocked) {
  const prev = new Int32Array(GRID_W * GRID_H).fill(-1);
  const seen = new Uint8Array(GRID_W * GRID_H);
  const q = [from];
  seen[key(from.x, from.y)] = 1;
  const goalK = key(goal.x, goal.y);
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    if (key(cur.x, cur.y) === goalK) {
      const path = [];
      let k = key(cur.x, cur.y);
      while (k !== -1) {
        path.push({ x: k % GRID_W, y: Math.floor(k / GRID_W) });
        k = prev[k];
      }
      return path.reverse();
    }
    const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    for (const d of dirs) {
      const nx = cur.x + d.x, ny = cur.y + d.y;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
      const k = key(nx, ny);
      if (seen[k]) continue;
      if (blocked.has(k) && k !== goalK) continue;
      seen[k] = 1;
      prev[k] = key(cur.x, cur.y);
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}

/* AI：优先最短路径，其次选择能容纳最多空间的走法 */
function aiDecide() {
  const head = snake.body[0];
  const blocked = new Set();
  snake.body.slice(0, -1).forEach((s) => blocked.add(key(s.x, s.y)));

  const path = bfs(head, snake.food, blocked);
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  const free = (x, y) => x >= 0 && y >= 0 && x < GRID_W && y < GRID_H && !blocked.has(key(x, y));

  if (path && path.length > 1) {
    const next = path[1];
    const d = { x: next.x - head.x, y: next.y - head.y };
    // 避免直接撞向自身
    if (free(head.x + d.x, head.y + d.y)) {
      snake.dir = d;
      snake.aiSteps++;
      return;
    }
  }
  // 兜底：走向能扩展空间最大的一侧
  let best = null, bestScore = -1;
  for (const d of dirs) {
    const nx = head.x + d.x, ny = head.y + d.y;
    if (!free(nx, ny)) continue;
    const b2 = new Set(blocked);
    b2.add(key(nx, ny));
    const reach = floodFill(nx, ny, b2);
    const score = reach * 10 - Math.abs(d.x + snake.dir.x) + Math.abs(d.y + snake.dir.y) * 0.5;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  if (best) { snake.dir = best; snake.aiSteps++; }
}

function floodFill(sx, sy, blocked) {
  const seen = new Uint8Array(GRID_W * GRID_H);
  const q = [{ x: sx, y: sy }];
  seen[key(sx, sy)] = 1;
  let n = 0, head = 0;
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  while (head < q.length) {
    const c = q[head++]; n++;
    for (const d of dirs) {
      const nx = c.x + d.x, ny = c.y + d.y;
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
      const k = key(nx, ny);
      if (seen[k] || blocked.has(k)) continue;
      seen[k] = 1;
      q.push({ x: nx, y: ny });
    }
  }
  return n;
}

function step() {
  if (snake.pending.length) {
    const d = snake.pending.shift();
    if (!(d.x === -snake.dir.x && d.y === -snake.dir.y)) snake.dir = d;
  }
  const head = snake.body[0];
  const nx = head.x + snake.dir.x;
  const ny = head.y + snake.dir.y;

  if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) return gameOver();
  if (snake.body.some((s, i) => i < snake.body.length - 1 && s.x === nx && s.y === ny)) return gameOver();

  snake.body.unshift({ x: nx, y: ny });
  if (nx === snake.food.x && ny === snake.food.y) {
    snake.score += 10;
    snake.speed = Math.min(18, snake.speed + 0.35);
    placeFood();
    updateHud();
  } else {
    snake.body.pop();
  }
  snake.moves++;
}

function gameOver() {
  snake.alive = false;
  snake.running = false;
  if (snake.score > snake.best) {
    snake.best = snake.score;
    localStorage.setItem('aura_snake_best', String(snake.best));
  }
  updateHud();
  if (window.Audio) window.Audio.sfx('back');
  document.getElementById('overBanner').classList.add('is-on');
}

function updateHud() {
  document.getElementById('hudScore').textContent = String(snake.score).padStart(5, '0');
  document.getElementById('hudLen').textContent = String(snake.body.length).padStart(2, '0');
  document.getElementById('hudBest').textContent = String(snake.best).padStart(5, '0');
  document.getElementById('hudLevel').textContent = String(Math.floor(snake.score / 50) + 1).padStart(2, '0');
  const sl = document.getElementById('statLen');
  const st = document.getElementById('statStep');
  const ai = document.getElementById('statAi');
  if (sl) sl.textContent = String(snake.body.length).padStart(2, '0');
  if (st) st.textContent = String(snake.moves);
  if (ai) ai.textContent = (snake.moves ? Math.round((snake.aiSteps / snake.moves) * 100) : 100) + '%';
}

/* ---------- 渲染 ---------- */
function draw(t) {
  const W = CW, H = CH;
  ctx.clearRect(0, 0, W, H);

  // 背景
  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  bg.addColorStop(0, '#0a0620');
  bg.addColorStop(1, '#03020a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const ox = (W - CELL * GRID_W) / 2;
  const oy = (H - CELL * GRID_H) / 2;

  // 网格
  ctx.strokeStyle = 'rgba(35,224,192,.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(ox + x * CELL, oy); ctx.lineTo(ox + x * CELL, oy + CELL * GRID_H); ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(ox, oy + y * CELL); ctx.lineTo(ox + CELL * GRID_W, oy + y * CELL); ctx.stroke();
  }

  // 食物
  const f = snake.food;
  const fx = ox + f.x * CELL + CELL / 2;
  const fy = oy + f.y * CELL + CELL / 2;
  const pulse = 1 + Math.sin(t * 6) * 0.12;
  ctx.save();
  ctx.shadowColor = '#ff3d81';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#ff3d81';
  ctx.beginPath();
  ctx.arc(fx, fy, (CELL * 0.3) * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,61,129,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(fx, fy, CELL * 0.46 * pulse, 0, Math.PI * 2);
  ctx.stroke();

  // 蛇
  snake.body.forEach((s, i) => {
    const x = ox + s.x * CELL, y = oy + s.y * CELL;
    const isHead = i === 0;
    const k = i / Math.max(1, snake.body.length - 1);
    ctx.save();
    ctx.shadowColor = isHead ? '#8ffff0' : 'rgba(35,224,192,.9)';
    ctx.shadowBlur = isHead ? 20 : 10;
    ctx.fillStyle = isHead ? '#c9fff5' : `rgba(35,224,192,${0.95 - k * 0.55})`;
    const inset = isHead ? 1.5 : 2.5;
    roundRect(x + inset, y + inset, CELL - inset * 2, CELL - inset * 2, isHead ? 3 : 2);
    ctx.fill();
    ctx.restore();
    if (isHead) {
      // 眼睛
      const d = snake.dir;
      ctx.fillStyle = '#ff3d81';
      const ex = x + CELL / 2 + d.x * CELL * 0.16;
      const ey = y + CELL / 2 + d.y * CELL * 0.16;
      const px = d.y !== 0 ? CELL * 0.2 : 0;
      const py = d.x !== 0 ? CELL * 0.2 : 0;
      ctx.beginPath(); ctx.arc(ex + px, ey + py, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex - px, ey - py, 1.7, 0, Math.PI * 2); ctx.fill();
    }
  });

  // AI 视线
  if (snake.ai && snake.alive) {
    const head = snake.body[0];
    const blocked = new Set();
    snake.body.slice(0, -1).forEach((s) => blocked.add(key(s.x, s.y)));
    const path = bfs(head, snake.food, blocked);
    if (path) {
      ctx.save();
      ctx.strokeStyle = 'rgba(35,224,192,.28)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      path.forEach((p, i) => {
        const px = ox + p.x * CELL + CELL / 2, py = oy + p.y * CELL + CELL / 2;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }
  }

  // 状态提示
  if (!snake.running && snake.alive) {
    ctx.fillStyle = 'rgba(3,2,10,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#23e0c0';
    ctx.font = `${Math.max(13, W * 0.028)}px "Press Start 2P", monospace`;
    ctx.fillText('PRESS START', W / 2, H / 2 - 6);
    ctx.fillStyle = 'rgba(233,246,255,.55)';
    ctx.font = `${Math.max(8, W * 0.015)}px "JetBrains Mono", monospace`;
    ctx.fillText('按 ENTER 或点击 START 开始', W / 2, H / 2 + 22);
    ctx.textAlign = 'left';
  }
  if (!snake.alive) {
    ctx.fillStyle = 'rgba(20,2,10,.62)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3d81';
    ctx.font = `${Math.max(14, W * 0.03)}px "Press Start 2P", monospace`;
    ctx.fillText('GAME OVER', W / 2, H / 2 - 8);
    ctx.fillStyle = '#e9f6ff';
    ctx.font = `${Math.max(9, W * 0.016)}px "JetBrains Mono", monospace`;
    ctx.fillText(`SCORE ${snake.score} · 按 ENTER 重新开始`, W / 2, H / 2 + 20);
    ctx.textAlign = 'left';
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- 主循环 ---------- */
let lastT = 0, acc = 0;
function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, t - lastT);
  lastT = t;

  if (snake.running && snake.alive) {
    acc += dt * snake.speed;
    while (acc >= 1) {
      acc -= 1;
      if (snake.ai) aiDecide();
      step();
      if (!snake.alive) break;
    }
  }
  draw(t);
  requestAnimationFrame(loop);
}

function startGame() {
  if (!snake.alive) reset();
  snake.running = true;
  snake.alive = true;
  document.getElementById('overBanner').classList.remove('is-on');
  document.getElementById('btnStart').classList.add('is-on');
  document.getElementById('btnStart').textContent = 'RUNNING';
  if (window.Audio) window.Audio.sfx('open');
}

function pauseGame() {
  snake.running = false;
  document.getElementById('btnStart').classList.remove('is-on');
  document.getElementById('btnStart').textContent = 'PAUSED';
}

function toggleAI() {
  snake.ai = !snake.ai;
  const el = document.getElementById('aiState');
  el.textContent = snake.ai ? 'AI AUTOPILOT' : 'MANUAL';
  el.className = 'ai-state ' + (snake.ai ? 'ai' : 'man');
  document.getElementById('btnAI').classList.toggle('is-on', snake.ai);
  document.getElementById('btnAI').textContent = snake.ai ? 'AI: ON' : 'AI: OFF';
  if (window.Audio) window.Audio.sfx('click');
}

const KEYS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  W: { x: 0, y: -1 }, S: { x: 0, y: 1 }, A: { x: -1, y: 0 }, D: { x: 1, y: 0 },
};

document.addEventListener('DOMContentLoaded', () => {
  resize();
  addEventListener('resize', resize);
  reset();
  requestAnimationFrame(loop);

  document.getElementById('btnStart').addEventListener('click', () => {
    if (snake.running) pauseGame();
    else startGame();
  });
  document.getElementById('btnAI').addEventListener('click', toggleAI);
  document.getElementById('btnReset').addEventListener('click', () => {
    reset();
    startGame();
  });
  document.getElementById('overBanner').addEventListener('click', () => { reset(); startGame(); });

  addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!snake.alive) { reset(); startGame(); }
      else if (!snake.running) startGame();
      else pauseGame();
      return;
    }
    const d = KEYS[e.key];
    if (d) {
      e.preventDefault();
      snake.ai = false;
      const el = document.getElementById('aiState');
      el.textContent = 'MANUAL';
      el.className = 'ai-state man';
      document.getElementById('btnAI').classList.remove('is-on');
      document.getElementById('btnAI').textContent = 'AI: OFF';
      snake.pending.push(d);
      if (!snake.running) startGame();
    }
  });

  // 排行榜（演示数据 + 本机最佳）
  const LB = [
    ['ZER0', 4820], ['KIRA', 4110], ['MØTH', 3760], ['PIXEL', 2980], ['NOVA', 2410],
  ];
  const lb = document.getElementById('lbBody');
  LB.forEach(([n, s], i) => {
    const d = document.createElement('div');
    d.className = 'lb-row';
    d.innerHTML = `<span class="r">${String(i + 1).padStart(2, '0')}</span><span>${n}</span><span class="s">${s}</span>`;
    lb.appendChild(d);
  });
  const me = document.createElement('div');
  me.className = 'lb-row';
  me.innerHTML = `<span class="r">--</span><span>YOU (THIS MACHINE)</span><span class="s">${snake.best}</span>`;
  lb.appendChild(me);

  AURACore.initSound('arcade');
});
