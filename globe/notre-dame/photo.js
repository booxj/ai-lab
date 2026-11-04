/* ============================================================
   巴黎圣母院 · 实拍分层
   与自绘版同一套交互：四处部位题签 → 镜头推近 → 能力面板。
   差异仅在于绘景层换成 CC0 实拍照片 + 时刻染色 + 背景虚化视差。
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var wing = document.getElementById('wing');
  var frame = document.querySelector('.frame');
  var marks = Array.prototype.slice.call(document.querySelectorAll('.mark'));
  var sheet = document.getElementById('sheet');
  var loader = document.getElementById('loader');

  var CAPS = {
    video: {
      k: 'C3 · 影像', h: '影像', en: 'FILM / HTML SHORT',
      part: '正门三连拱',
      d: '8–12 秒的 HTML 短片：石面湿反光、玫瑰窗的光斑、钟声的节奏。整段现场渲染，循环，静音可看。',
      c: 'c3-notre-dame-film-001'
    },
    web: {
      k: 'C1 · 网页', h: '网页', en: 'WEB / SINGLE PAGE',
      part: '西玫瑰窗',
      d: '一张可读的网页：立面测绘、玫瑰花窗的几何拆解、石材与光的注释。离线可开，1440 与 390 双断点。',
      c: 'c1-notre-dame-web-001'
    },
    deck: {
      k: 'C2 · 幻灯片', h: '幻灯片', en: 'HTML DECK',
      part: '北塔钟室',
      d: '6–8 页 HTML 演示：从 1163 年的地基到 2019 年的火，时间线与结构图用原生 SVG 绘制，键盘翻页。',
      c: 'c2-notre-dame-deck-001'
    },
    game: {
      k: 'C4 · 游戏', h: '游戏', en: 'PLAYABLE SCENE',
      part: '南侧飞扶壁',
      d: '30–60 秒的小场景：在飞扶壁之间穿行，收集光斑，避开落石。键鼠与触屏同一套操作。',
      c: 'c4-notre-dame-game-001'
    }
  };

  /* ---------------- 画幅与视口 ---------------- */
  function fitViewport() {
    var wide = window.innerWidth / window.innerHeight;
    if (window.innerWidth <= 700) {
      // 390 竖屏：收到立面中段，仍保证四处标记完整落在画内
      wing.setAttribute('viewBox', '300 140 640 760');
      wing.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    } else {
      wing.setAttribute('viewBox', '0 0 1200 900');
      // 常规宽屏铺满画面；超宽屏退回完整取景，避免上下裁掉正门题签
      wing.setAttribute('preserveAspectRatio', wide > 2 ? 'xMidYMid meet' : 'xMidYMid slice');
    }
  }
  fitViewport();
  window.addEventListener('resize', fitViewport);

  /* ---------------- 时间 / 季节 / 天气 ---------------- */
  var hour = { v: 17.5 };
  var SEASONS = [['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']];
  var WEATHERS = [['clear', '晴'], ['cloud', '阴'], ['rain', '雨'], ['snow', '雪']];

  var hEl = document.getElementById('hour');
  var hOut = document.getElementById('hourOut');
  var seasonsWrap = document.getElementById('seasons');
  var weathersWrap = document.getElementById('weathers');
  var clockOut = document.getElementById('clockOut');

  function applyHour() {
    var h = hour.v;
    var cls = h < 5 || h >= 21 ? 't-night' : h < 8 ? 't-dawn' : h < 17 ? 't-day' : 't-dusk';
    body.classList.remove('t-dawn', 't-day', 't-dusk', 't-night');
    body.classList.add(cls);
    var txt = String(Math.floor(h)).padStart(2, '0') + (h % 1 ? ':30' : ':00');
    hOut.textContent = txt;
    clockOut.textContent = '巴黎 ' + txt;
  }

  SEASONS.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = s[1];
    b.addEventListener('click', function () {
      body.classList.remove('s-spring', 's-summer', 's-autumn', 's-winter');
      body.classList.add('s-' + s[0]);
      Array.prototype.forEach.call(seasonsWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
    });
    seasonsWrap.appendChild(b);
  });

  WEATHERS.forEach(function (w, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = w[1];
    b.addEventListener('click', function () {
      body.classList.remove('w-clear', 'w-cloud', 'w-rain', 'w-snow');
      if (i > 0) body.classList.add('w-' + w[0]);
      Array.prototype.forEach.call(weathersWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
    });
    weathersWrap.appendChild(b);
  });

  hEl.addEventListener('input', function () { hour.v = parseFloat(hEl.value); applyHour(); });

  (function initTime() {
    var now = new Date(), h = 17.5;
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hour12: false });
      var parts = f.formatToParts(now), hh = 0, mm = 0;
      parts.forEach(function (p) { if (p.type === 'hour') hh = parseInt(p.value, 10); if (p.type === 'minute') mm = parseInt(p.value, 10); });
      h = hh + mm / 60;
    } catch (e) { h = now.getHours() + now.getMinutes() / 60; }
    hour.v = Math.round(h * 2) / 2;
    hEl.value = hour.v;
    var month = now.getMonth();
    var si = month < 2 || month > 10 ? 3 : month < 5 ? 0 : month < 8 ? 1 : 2;
    body.classList.add('s-' + SEASONS[si][0]);
    Array.prototype.forEach.call(seasonsWrap.children, function (c, j) { c.classList.toggle('is-on', j === si); });
    Array.prototype.forEach.call(weathersWrap.children, function (c, j) { c.classList.toggle('is-on', j === 0); });
    applyHour();
  })();

  /* ---------------- 指针视差：背景比主层多走一点 ---------------- */
  if (!reduce && window.matchMedia('(hover:hover)').matches) {
    var root = document.documentElement;
    var raf = 0, tx = 0, ty = 0;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        root.style.setProperty('--px', (-tx * 7).toFixed(1) + 'px');
        root.style.setProperty('--py', (-ty * 4).toFixed(1) + 'px');
        root.style.setProperty('--bx', (-tx * 18).toFixed(1) + 'px');
        root.style.setProperty('--by', (-ty * 10).toFixed(1) + 'px');
      });
    });
  }

  /* ---------------- 光尘 ---------------- */
  if (!reduce) {
    var motes = document.getElementById('motes');
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      s.className = 'mote';
      s.style.left = (12 + Math.random() * 76) + '%';
      s.style.top = (30 + Math.random() * 56) + '%';
      s.style.width = s.style.height = (1 + Math.random() * 2).toFixed(1) + 'px';
      s.style.animationDuration = (18 + Math.random() * 26).toFixed(0) + 's';
      s.style.animationDelay = (-Math.random() * 40).toFixed(0) + 's';
      motes.appendChild(s);
    }
  }

  /* ---------------- 四处标记：悬停提亮 / 点击推近 ---------------- */
  var active = null;

  function openMark(k, el) {
    var cap = CAPS[k];
    if (!cap) return;
    active = k;
    marks.forEach(function (m) { m.classList.toggle('is-active', m === el); });

    var r = el.getBoundingClientRect();
    var ox = ((r.left + r.width / 2) / window.innerWidth) * 100;
    var oy = ((r.top + r.height / 2) / window.innerHeight) * 100;
    wing.style.transformOrigin = ox.toFixed(2) + '% ' + oy.toFixed(2) + '%';
    frame.classList.add('is-zoom');
    body.classList.add('is-sheet');

    document.getElementById('sheetK').textContent = cap.k + ' · ' + cap.part;
    document.getElementById('sheetH').textContent = cap.h;
    document.getElementById('sheetEn').textContent = cap.en;
    document.getElementById('sheetD').textContent = cap.d;
    document.getElementById('sheetCase').textContent = 'case-id ' + cap.c;

    setTimeout(function () {
      if (!active) return;
      sheet.hidden = false;
      requestAnimationFrame(function () { sheet.classList.add('is-in'); });
    }, reduce ? 60 : 1050);
  }

  function closeSheet() {
    active = null;
    frame.classList.remove('is-zoom');
    body.classList.remove('is-sheet');
    marks.forEach(function (m) { m.classList.remove('is-active'); });
    sheet.classList.remove('is-in');
    setTimeout(function () { if (!active) sheet.hidden = true; }, 380);
  }

  marks.forEach(function (el) {
    var k = el.getAttribute('data-k');
    el.addEventListener('click', function () { openMark(k, el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMark(k, el); }
    });
  });

  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
  document.addEventListener('click', function (e) {
    if (!active) return;
    if (sheet.contains(e.target) || e.target.closest('.mark')) return;
    closeSheet();
  });

  /* ---------------- 收尾：照片解码后再撤载入层 ---------------- */
  function done() { setTimeout(function () { loader.classList.add('is-off'); }, 380); }
  var img = document.querySelector('.photo');
  var imgEl = img && img.href && img.href.baseVal ? img.href.baseVal : null;
  if (imgEl) {
    var pre = new Image();
    pre.onload = done; pre.onerror = done;
    pre.src = imgEl;
    setTimeout(done, 900);
  } else {
    done();
  }

  window.__ND__ = {
    open: function (k) {
      var el = marks.filter(function (m) { return m.getAttribute('data-k') === k; })[0];
      if (el) openMark(k, el);
    },
    close: closeSheet,
    setHour: function (h) { hour.v = h; hEl.value = h; applyHour(); },
    setWeather: function (w) {
      var idx = WEATHERS.map(function (x) { return x[0]; }).indexOf(w);
      if (idx >= 0) weathersWrap.children[idx].click();
    },
    setSeason: function (s) {
      var idx = SEASONS.map(function (x) { return x[0]; }).indexOf(s);
      if (idx >= 0) seasonsWrap.children[idx].click();
    }
  };
})();
