/* ============================================================
   金阁寺 · 实拍分层
   四处部位题签 → 镜头推近 → 能力面板。
   绘景层为两张 CC0 实拍（晴日池畔 / 雪日），时刻染色 + 背景虚化视差。
   云、雨、雪与地球页同一套模拟口径；可用 ?h=&s=&w=&seed=&fx= 从地球页同步。
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
    deck: {
      k: 'C2 · 幻灯片', h: '幻灯片', en: 'HTML DECK',
      part: '顶檐 · 凤形宝珠',
      d: '6–8 页 HTML 演示：从 1397 年足利义满的北山殿，到 1950 年烧失、1955 年重建；金箔的层数与屋面曲线用原生 SVG 拆解，键盘翻页。',
      c: 'c2-kinkakuji-deck-001'
    },
    web: {
      k: 'C1 · 网页', h: '网页', en: 'WEB / SINGLE PAGE',
      part: '二层金壁',
      d: '一张可读的网页：金箔贴面的工序、室町时代的池泉回游式庭园、镜湖池的取景关系。离线可开，1440 与 390 双断点。',
      c: 'c1-kinkakuji-web-001'
    },
    video: {
      k: 'C3 · 影像', h: '影像', en: 'FILM / HTML SHORT',
      part: '镜湖池倒影',
      d: '8–12 秒的 HTML 短片：水面的金色倒影随涟漪散开，雪落进池面又化掉。整段现场渲染，循环，静音可看。',
      c: 'c3-kinkakuji-film-001'
    },
    game: {
      k: 'C4 · 游戏', h: '游戏', en: 'PLAYABLE SCENE',
      part: '池畔石组',
      d: '30–60 秒的小场景：在池畔石组之间绕行，收集落在水面的金箔光点，避开冬季湿滑的石头。键鼠与触屏同一套操作。',
      c: 'c4-kinkakuji-game-001'
    }
  };

  /* ---------------- 画幅与视口 ---------------- */
  function fitViewport() {
    var wide = window.innerWidth / window.innerHeight;
    if (window.innerWidth <= 700) {
      // 390 竖屏：收到楼阁与池面中段，四处标记仍落在画内
      wing.setAttribute('viewBox', '300 60 640 760');
      wing.setAttribute('preserveAspectRatio', 'xMidYMax meet');
    } else {
      wing.setAttribute('viewBox', '0 0 1200 840');
      wing.setAttribute('preserveAspectRatio', wide > 1.95 ? 'xMidYMid meet' : 'xMidYMid slice');
    }
  }
  fitViewport();
  window.addEventListener('resize', fitViewport);

  /* ---------------- 状态 ---------------- */
  var hour = { v: 17.5 };
  var season = 2;
  var weather = 0;
  var fxMode = 'all';           // none | cloud | all
  var seed = 20261104;
  var SEASONS = [['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']];
  var WEATHERS = [['clear', '晴'], ['cloud', '阴'], ['rain', '雨'], ['snow', '雪']];
  var FX = [['none', '无特效'], ['cloud', '仅云'], ['all', '全部']];

  var hEl = document.getElementById('hour');
  var hOut = document.getElementById('hourOut');
  var seasonsWrap = document.getElementById('seasons');
  var weathersWrap = document.getElementById('weathers');
  var fxsWrap = document.getElementById('fxs');
  var clockOut = document.getElementById('clockOut');
  var linkOut = document.getElementById('linkOut');

  function applyHour() {
    var h = hour.v;
    var cls = h < 5 || h >= 21 ? 't-night' : h < 8 ? 't-dawn' : h < 17 ? 't-day' : 't-dusk';
    body.classList.remove('t-dawn', 't-day', 't-dusk', 't-night');
    body.classList.add(cls);
    var txt = String(Math.floor(h)).padStart(2, '0') + (h % 1 ? ':30' : ':00');
    hOut.textContent = txt;
    clockOut.textContent = '京都 ' + txt;
  }

  function setSeason(i) {
    season = i;
    body.classList.remove('s-spring', 's-summer', 's-autumn', 's-winter');
    body.classList.add('s-' + SEASONS[i][0]);
    Array.prototype.forEach.call(seasonsWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
  }

  function setWeather(i) {
    weather = i;
    body.classList.remove('w-clear', 'w-cloud', 'w-rain', 'w-snow');
    body.classList.add('w-' + WEATHERS[i][0]);
    Array.prototype.forEach.call(weathersWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
    syncScene();
  }

  function setFx(m) {
    fxMode = m;
    body.classList.remove('fx-none', 'fx-cloud', 'fx-all');
    body.classList.add('fx-' + m);
    Array.prototype.forEach.call(fxsWrap.children, function (c, j) { c.classList.toggle('is-on', FX[j][0] === m); });
  }

  function syncScene() {
    // 雪日取景只在天气为「雪」时启用；其余天气用晴日池畔
    var snowSet = weather === 3;
    var pondG = document.querySelector('.scene--pond');
    var snowG = document.querySelector('.scene--snow');
    pondG.setAttribute('aria-hidden', snowSet ? 'true' : 'false');
    snowG.setAttribute('aria-hidden', snowSet ? 'false' : 'true');
    Array.prototype.forEach.call(marks, function (m) {
      var inPond = m.closest('.marks').getAttribute('data-set') === 'pond';
      m.tabIndex = (snowSet ? !inPond : inPond) ? 0 : -1;
    });
  }

  SEASONS.forEach(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = s[1];
    b.addEventListener('click', function () { setSeason(i); });
    seasonsWrap.appendChild(b);
  });

  WEATHERS.forEach(function (w, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = w[1];
    b.addEventListener('click', function () { setWeather(i); });
    weathersWrap.appendChild(b);
  });

  FX.forEach(function (f) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = f[1];
    b.addEventListener('click', function () { setFx(f[0]); });
    fxsWrap.appendChild(b);
  });

  hEl.addEventListener('input', function () { hour.v = parseFloat(hEl.value); applyHour(); });

  /* ---------------- 初值：URL 参数优先，否则设备时间（京都） ---------------- */
  (function init() {
    var q = new URLSearchParams(location.search);
    var qh = parseFloat(q.get('h'));
    var qs = SEASONS.map(function (x) { return x[0]; }).indexOf(q.get('s'));
    var qw = WEATHERS.map(function (x) { return x[0]; }).indexOf(q.get('w'));
    var qf = FX.map(function (x) { return x[0]; }).indexOf(q.get('fx'));
    var qseed = parseInt(q.get('seed'), 10);
    var fromGlobe = !isNaN(qh) || qs >= 0 || qw >= 0;

    var now = new Date(), h = 17.5, si = 2;
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: 'numeric', minute: 'numeric', hour12: false });
      f.formatToParts(now).forEach(function (p) {
        if (p.type === 'hour') h = parseInt(p.value, 10);
        if (p.type === 'minute') h = h + parseInt(p.value, 10) / 60;
      });
      var m = now.getMonth();
      si = m < 2 || m > 10 ? 3 : m < 5 ? 0 : m < 8 ? 1 : 2;
    } catch (e) { h = now.getHours() + now.getMinutes() / 60; }

    hour.v = !isNaN(qh) ? Math.round(qh * 2) / 2 : Math.round(h * 2) / 2;
    hEl.value = hour.v;
    setSeason(qs >= 0 ? qs : si);
    setWeather(qw >= 0 ? qw : 0);
    setFx(qf >= 0 ? qf : (reduce ? 'cloud' : 'all'));
    if (!isNaN(qseed)) seed = (qseed >>> 0);
    linkOut.textContent = fromGlobe ? '同步自地球页' : '本页手动';
    applyHour();
  })();

  document.getElementById('reseed').addEventListener('click', function () {
    seed = (seed ^ 0x9e3779b9) >>> 0;
    wx.reset();
    if (!isNaN(parseInt(seed, 10))) linkOut.textContent = '种子 ' + seed;
  });

  /* ---------------- 指针视差 ---------------- */
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
    for (var i = 0; i < 10; i++) {
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

  /* ---------------- 雨雪：Canvas 粒子，数量有上限，进出都淡 ---------------- */
  var wx = (function () {
    var cv = document.getElementById('wx');
    var ctx = cv.getContext('2d');
    var mobile = window.innerWidth <= 700;
    var CAP_RAIN = mobile ? 150 : 240;
    var CAP_SNOW = mobile ? 90 : 130;
    var dpr = 1, W = 0, H = 0;
    var rain = [], snow = [];
    var alpha = 0, target = 0;
    var raf = 0;

    function mulberry32(a) {
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function reset() {
      var rnd = mulberry32(seed);
      rain = []; snow = [];
      for (var i = 0; i < CAP_RAIN; i++) {
        rain.push({
          x: rnd() * W,
          y: rnd() * H,
          len: 9 + rnd() * 11,
          vy: 300 + rnd() * 260,
          vx: -34 - rnd() * 26,
          a: .18 + rnd() * .2
        });
      }
      for (var j = 0; j < CAP_SNOW; j++) {
        snow.push({
          x: rnd() * W,
          y: rnd() * H,
          r: .9 + rnd() * 1.6,
          vy: 26 + rnd() * 34,
          ph: rnd() * Math.PI * 2,
          sw: 10 + rnd() * 16,
          a: .3 + rnd() * .34
        });
      }
    }

    function draw(dt) {
      ctx.clearRect(0, 0, W, H);
      if (alpha <= .01) return;
      var kind = target > 0 ? target : 0;
      ctx.globalAlpha = Math.min(1, alpha);

      if (kind === 2) {                       // 雨：细长线段
        ctx.strokeStyle = 'rgba(224,234,244,.9)';
        ctx.lineWidth = 1.25;
        for (var i = 0; i < rain.length; i++) {
          var d = rain[i];
          ctx.globalAlpha = Math.min(1, alpha) * (0.55 + d.a * 1.6);
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x - d.len * .16, d.y + d.len);
          ctx.stroke();
          d.y += d.vy * dt;
          d.x += d.vx * dt;
          if (d.y > H + 24) { d.y = -24 - Math.random() * H * .18; d.x = Math.random() * (W + 80); }
          if (d.x < -30) d.x = W + 20;
        }
        ctx.globalAlpha = Math.min(1, alpha);
      } else if (kind === 3) {                // 雪：缓落 + 轻摆
        for (var j = 0; j < snow.length; j++) {
          var f = snow[j];
          f.ph += dt * .9;
          f.y += f.vy * dt;
          var px = f.x + Math.sin(f.ph) * f.sw;
          ctx.fillStyle = 'rgba(246,250,254,' + f.a.toFixed(2) + ')';
          ctx.beginPath();
          ctx.arc(px, f.y, f.r, 0, 6.2832);
          ctx.fill();
          if (f.y > H + 10) { f.y = -10 - Math.random() * H * .12; f.x = Math.random() * W; }
        }
      }
    }

    var last = 0;
    function tick(t) {
      raf = 0;
      var dt = last ? Math.min(.05, (t - last) / 1000) : .016;
      last = t;
      var want = (fxMode === 'all' && !reduce) ? (weather === 2 ? 2 : weather === 3 ? 3 : 0) : 0;
      if (want !== target) target = want;
      var k = target ? .075 : .05;            // 淡入略快、淡出更慢，不突然出现
      alpha = alpha + ((target ? 1 : 0) - alpha) * k;
      draw(dt);
      if (alpha > .01 || target) { raf = requestAnimationFrame(tick); }
      else { ctx.clearRect(0, 0, W, H); last = 0; }
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }

    function start() { resize(); reset(); kick(); }

    if (cv && ctx) {
      start();
      window.addEventListener('resize', function () { resize(); reset(); kick(); });
    }
    // 天气/档位变化时重新唤醒
    var obs = new MutationObserver(kick);
    obs.observe(body, { attributes: true, attributeFilter: ['class'] });

    return { reset: function () { reset(); kick(); }, info: function () { return { alpha: +alpha.toFixed(2), target: target, rain: CAP_RAIN, snow: CAP_SNOW, dpr: dpr }; } };
  })();

  /* ---------------- 四处标记 ---------------- */
  var active = null;

  function visibleSet() {
    return weather === 3 ? 'snow' : 'pond';
  }

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
  function done() {
    setTimeout(function () {
      loader.classList.add('is-off');
      // 无头环境下 opacity 过渡偶发停在首帧，这里补一道硬隐藏，保证不挡画面
      setTimeout(function () { loader.hidden = true; }, 700);
    }, 360);
  }
  var pre = new Image();
  pre.onload = done; pre.onerror = done;
  pre.src = 'assets/kj-pond.jpg';
  setTimeout(done, 900);

  /* ---------------- 自动化钩子 ---------------- */
  window.__KINKAKU__ = {
    open: function (k) {
      var set = visibleSet();
      var el = marks.filter(function (m) { return m.getAttribute('data-k') === k && m.closest('.marks').getAttribute('data-set') === set; })[0];
      if (el) openMark(k, el);
    },
    close: closeSheet,
    setHour: function (h) { hour.v = h; hEl.value = h; applyHour(); },
    setWeather: function (w) {
      var idx = WEATHERS.map(function (x) { return x[0]; }).indexOf(w);
      if (idx >= 0) setWeather(idx);
    },
    setSeason: function (s) {
      var idx = SEASONS.map(function (x) { return x[0]; }).indexOf(s);
      if (idx >= 0) setSeason(idx);
    },
    setFx: setFx,
    info: function () {
      return {
        hour: hour.v, season: SEASONS[season][0], weather: WEATHERS[weather][0], fx: fxMode, seed: seed,
        reduce: reduce, wx: wx.info(), marks: visibleSet(),
        scrollW: document.documentElement.scrollWidth, innerW: window.innerWidth
      };
    }
  };
})();
