/* ============================================================
   AI-LAB ATLAS · 展厅运行时（七洲共用）
   仅做三件事：注入 token、构建四道门与内景、管理转场/读数
   ============================================================ */
(function () {
  'use strict';

  var ID = document.body.getAttribute('data-hall');
  var cfg = HALLS[ID];
  if (!cfg) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var app = $('#app');
  var reduced = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };

  /* 门型：所有洲共用一套骨架，只有轮廓与材质不同 */
  var DOORS = [
    { id: 'video', roman: 'I', cn: '影像', en: 'VIDEO', lede: '动线：影像 · 从镜号到成片。三件样张验证展陈位与画幅。' },
    { id: 'web', roman: 'II', cn: '网页', en: 'WEB', lede: '动线：页面 · 从栅格到交付。三件样张验证断点与体量。' },
    { id: 'deck', roman: 'III', cn: '幻灯片', en: 'DECK', lede: '动线：提案 · 从母题到页序。三件样张验证版面节奏。' },
    { id: 'game', roman: 'IV', cn: '游戏', en: 'GAME', lede: '动线：场景 · 从动线到关卡。三件样张验证镜头与 HUD。' }
  ];

  /* ---------------- 0. 噪声（0 字节外部资源） ---------------- */
  root.style.setProperty('--noise', 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.86\' numOctaves=\'3\'/%3E%3C/filter%3E%3Crect width=\'120\' height=\'120\' filter=\'n\' opacity=\'.5\'/%3E%3C/svg%3E")');

  /* ---------------- 1. 几何 ---------------- */
  function poly(pts) {
    return 'polygon(' + pts.map(function (p) {
      return (+p[0]).toFixed(2) + '% ' + (+p[1]).toFixed(2) + '%';
    }).join(',') + ')';
  }
  function arc(cx, cy, rx, ry, a0, a1, n) {
    var out = [], i, a;
    for (i = 0; i <= n; i++) {
      a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }
  function qbez(p0, p1, p2, n) {
    var out = [], i, t, u;
    for (i = 0; i <= n; i++) {
      t = i / n; u = 1 - t;
      out.push([
        u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]
      ]);
    }
    return out;
  }

  var GATE = {
    pointed: function () {
      var p = [[0, 100], [0, 52]];
      for (var i = 0; i <= 22; i++) {
        var t = i / 22, a = t * Math.PI;
        var x = 50 - 50 * Math.cos(a), y = 52 - 45 * Math.sin(a);
        p.push([x, y]);
      }
      p.push([100, 52], [100, 100]);
      return poly(p);
    },
    moon: function () {
      return poly([[0, 100], [0, 52]].concat(arc(50, 52, 50, 44, 180, 360, 18), [[100, 100]]));
    },
    ziggurat: function () {
      var s = [[0, 100], [0, 64], [9, 64], [9, 54], [18, 54], [18, 44], [28, 44], [28, 34],
        [38, 34], [38, 26], [46, 26], [46, 18], [54, 18], [54, 26], [62, 26], [62, 34],
        [72, 34], [72, 44], [82, 44], [82, 54], [91, 54], [91, 64], [100, 64], [100, 100]];
      return poly(s);
    },
    pylon: function () {
      return poly([[0, 100], [5, 19], [3, 16], [3, 8], [97, 8], [97, 16], [95, 19], [100, 100]]);
    },
    canopy: function () {
      var left = qbez([0, 50], [22, -8], [55, 4], 14);
      var right = qbez([55, 4], [84, 14], [100, 50], 10);
      return poly(left.concat(right.slice(1), [[100, 100], [0, 100]]));
    },
    shell: function () {
      var left = qbez([8, 100], [4, 42], [58, 3], 12);
      var right = qbez([58, 3], [98, 38], [88, 100], 12);
      return poly(left.concat(right.slice(1)));
    },
    pod: function () {
      return poly([[9, 100], [0, 85], [0, 12], [11, 4], [89, 4], [100, 12], [100, 85], [91, 100]]);
    }
  };

  var FG = {
    column: [[6, 100], [6, 12], [16, 5], [84, 5], [94, 12], [94, 100]],
    canopy: [[0, 100], [0, 8], [38, 20], [100, 54], [100, 100]],
    ziggurat: [[0, 100], [0, 6], [26, 12], [42, 20], [58, 28], [100, 40], [100, 100]],
    pylon: [[10, 100], [4, 2], [100, 14], [100, 100]],
    shell: [[0, 100], [4, 42], [52, 0], [100, 40], [100, 100]],
    pod: [[0, 100], [0, 14], [20, 4], [100, 20], [100, 100]],
    pointed: [[0, 100], [0, 2], [100, 100]]
  };

  /* ---------------- 2. 注入 token ---------------- */
  var VAR = {
    sky: '--sky-bg', skyGlow: '--sky-glow', facadeFilter: '--facade-filter', facadePos: '--facade-pos',
    grade: '--grade', gateFace: '--gate-face', voidBg: '--void-bg', voidHot: '--void-hot',
    leafBg: '--leaf-bg', leafTex: '--leaf-tex',
    sill: '--sill', portico: '--portico', fgFill: '--fg-fill', fgTex: '--fg-tex',
    naveFilter: '--nave-filter', intGrade: '--int-grade', beam: '--beam-grad',
    frame: '--frame-bg', mull: '--mull'
  };

  function applyTokens() {
    var p = cfg.palette, d = cfg.depth, c = cfg.curve;
    root.style.setProperty('--hall-ink', p.ink);
    root.style.setProperty('--hall-sky', p.sky);
    root.style.setProperty('--hall-stone', p.stone);
    root.style.setProperty('--hall-warm', p.warm);
    root.style.setProperty('--hall-glow', p.glow);
    root.style.setProperty('--gold', p.warm);
    root.style.setProperty('--acc', p.warm);
    root.style.setProperty('--track', cfg.track);
    root.style.setProperty('--k-sky', d.sky);
    root.style.setProperty('--k-facade', d.facade);
    root.style.setProperty('--k-haze', d.haze);
    root.style.setProperty('--k-fg', d.fg);
    root.style.setProperty('--ease', c.ease);
    root.style.setProperty('--dur-in', c.enter + 'ms');
    root.style.setProperty('--dur-out', c.exit + 'ms');
    root.style.setProperty('--sill-h', cfg.sillH);
    root.style.setProperty('--arch-clip', GATE[cfg.shape]());
    root.style.setProperty('--sig-clip', GATE[cfg.shape]());
    root.style.setProperty('--fg-clip', poly(FG[cfg.fgShape] || FG.pointed));
    Object.keys(VAR).forEach(function (k) {
      if (cfg.css[k]) root.style.setProperty(VAR[k], cfg.css[k]);
    });
  }

  /* ---------------- 3. 顶栏 / 洲际导航 ---------------- */
  function buildAtlas() {
    var nav = $('#atlas');
    nav.innerHTML = ATLAS.map(function (a) {
      var cur = a[0] === ID;
      return '<a class="atlas__btn" href="../' + a[0] + '/index.html" data-c="' + a[0] + '"' +
        (cur ? ' aria-current="true"' : '') + ' title="' + a[3] + ' · ' + a[4] + '">' +
        '<span class="atlas__num">' + a[1] + '</span>' +
        '<span class="atlas__name">' + a[3] + '</span></a>';
    }).join('');
  }

  /* ---------------- 4. 素材 ---------------- */
  function applyAssets() {
    $('#facadeImg').src = 'assets/facade.webp';
    $('#naveImg').src = 'assets/nave.webp';
    $('#arcadeImg').src = cfg.arcadeImg || 'assets/nave.webp';

    var fg = $('#fgImg'), css = $('#fgCss');
    if (cfg.fgImg) { fg.src = cfg.fgImg; fg.hidden = false; css.hidden = true; }
    else { fg.hidden = true; css.hidden = false; }

    var beam = $('#beamImg');
    if (cfg.beamImg) { beam.src = cfg.beamImg; beam.hidden = false; $('#beamCss').hidden = true; }
    else { beam.hidden = true; $('#beamCss').hidden = false; }
  }

  /* ---------------- 5. 外景 ---------------- */
  function mullions() {
    var g = ' stroke="var(--mull)" stroke-width=".55" vector-effect="non-scaling-stroke" fill="none"';
    var v = function (xs, y0) {
      return xs.map(function (x) { return '<line x1="' + x + '" y1="' + (y0 || 0) + '" x2="' + x + '" y2="100"/>'; }).join('');
    };
    var h = function (ys, x0, x1) {
      return ys.map(function (y) { return '<line x1="' + (x0 || 0) + '" y1="' + y + '" x2="' + (x1 || 100) + '" y2="' + y + '"/>'; }).join('');
    };
    var d = '';
    if (cfg.mull === 'pointed') {
      d = v([33.3, 50, 66.7], 24) + h([38, 70], 16, 84);
    } else if (cfg.mull === 'lattice') {
      d = v([16.7, 33.3, 50, 66.7, 83.3], 30) + h([30, 44, 58, 72, 86], 0, 100) +
        '<path d="M0 100 L16.7 86 M16.7 100 L0 86 M83.3 100 L100 86 M100 100 L83.3 86"/>';
    } else if (cfg.mull === 'tiles') {
      d = v([25, 50, 75]) + h([22, 44, 66, 88]) + '<path d="M0 0 L100 100 M100 0 L0 100"/>';
    } else if (cfg.mull === 'flutes') {
      d = v([8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96], 6) +
        '<path d="M0 34 L50 26 L100 34 M0 62 L50 54 L100 62"/>';
    } else if (cfg.mull === 'courses') {
      d = h([14, 24, 34, 44, 54, 64, 74, 84, 94]);
    } else if (cfg.mull === 'ribs') {
      d = '<path d="M50 2 L4 100 M50 2 L18 100 M50 2 L32 100 M50 2 L46 100 M50 2 L54 100 M50 2 L68 100 M50 2 L82 100 M50 2 L96 100"/>';
    } else {
      d = v([25, 50, 75], 8) + h([30, 56, 82]) + '<path d="M0 12 L100 12"/>';
    }
    return '<svg class="gate__mullions" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g' + g + '>' + d + '</g></svg>';
  }

  function buildGates() {
    var host = $('#gates');
    host.innerHTML = '<p class="gates__hint">外景 · 四道能力门 · 按 1–4 或点击</p>' + DOORS.map(function (d, i) {
      return '<button class="gate" data-door="' + d.id + '" aria-label="进入 ' + d.cn + ' 内景">' +
        '<span class="gate__stone"></span>' +
        '<span class="gate__grain"></span>' +
        '<span class="gate__void">' +
        mullions() +
        '<span class="gate__leaf"><i></i><i></i></span>' +
        '<span class="gate__cone"></span>' +
        '<span class="gate__num">' + d.roman + '</span>' +
        '<span class="gate__label"><span class="gate__cn">' + d.cn + '</span>' +
        '<span class="gate__en">' + d.en + '</span><span class="gate__n">3 件作品</span></span>' +
        '<span class="gate__spill"></span><span class="gate__sill"></span>' +
        '</span>' +
        '<span class="gate__rim"></span><span class="gate__sheen"></span>' +
        '</button>';
    }).join('');
    $$('.gate').forEach(function (g) {
      g.addEventListener('click', function () { enterDoor(g.getAttribute('data-door'), g); });
    });
  }

  function buildExtCopy() {
    $('#extEyebrow').textContent = '洲 ' + cfg.num + ' — ' + cfg.roman + ' / VII · ' + cfg.style;
    $('#extCn').textContent = cfg.hall;
    $('#extEn').textContent = cfg.en;
    $('#extLede').textContent = cfg.lede;
    $('#extMeta').innerHTML = '<b>' + esc(cfg.meta[0]) + '</b><span>' + esc(cfg.meta[1]) + '</span><span>' + esc(cfg.meta[2]) + '</span>';
  }

  /* ---------------- 6. 作品样张 ---------------- */
  function artHTML(w) {
    if (w.art === 'film') {
      var SUB = { a: ['arch', 'facade', 'shaft'], b: ['facade', 'shaft', 'arch'], c: ['shaft', 'arch', 'facade'] }[w.v] || ['arch', 'facade', 'shaft'];
      var TC = ['00:04', '00:11', '00:19'];
      return '<div class="art art--film"><div class="film__strip">' +
        SUB.map(function (s, i) {
          return '<div class="film__frame fr-' + s + '"><i class="fr__no">' + String(i + 1).padStart(2, '0') + 'A</i><i class="fr__tc">' + TC[i] + '</i></div>';
        }).join('') +
        '</div><div class="film__hud"><span class="film__dot"></span><b>REC</b><span>' + esc(w.m.split(' · ')[0]) + '</span><span style="margin-left:auto">16:9</span></div></div>';
    }
    if (w.art === 'web') {
      if (w.v === 'a') {
        return '<div class="art art--web web--a"><div class="web__bar"><i></i><i></i><i></i><span>' + esc(w.url) + '</span></div>' +
          '<div class="web__hero"><span>' + esc(cfg.latin) + '</span><strong>' + esc(cfg.hall) + '</strong><em>INDEX / ' + cfg.num + '</em></div>' +
          '<div class="web__grid"><i></i><i></i><i></i><i></i></div></div>';
      }
      if (w.v === 'b') {
        return '<div class="art art--web web--b"><div class="web__bar"><i></i><i></i><i></i><span>' + esc(w.url) + '</span></div>' +
          '<div class="wb__body"><div class="wb__row"><span class="wb__chip"></span><span class="wb__chip wb__chip--on"></span><span class="wb__chip"></span></div>' +
          '<div class="wb__row"><span class="wb__chip"></span><span class="wb__chip"></span><span class="wb__chip wb__chip--on"></span></div>' +
          '<p class="wb__cap">8 STATES · 44 × 44</p></div></div>';
      }
      return '<div class="art art--web web--c"><div class="wc__phone"><div class="wc__nav"><i></i><i></i><i></i></div>' +
        '<div class="wc__hero"><span>ATLAS</span></div><div class="wc__row"></div><div class="wc__row"></div><div class="wc__row"></div></div></div>';
    }
    if (w.art === 'deck') {
      var tot = w.tot || 12;
      if (w.v === 'a') {
        return '<div class="art art--deck dk-a"><span class="dk__tag">' + esc(cfg.latin) + ' · 01</span>' +
          '<div class="dk__head"><b>七洲提案</b><i></i><i></i></div><span class="dk__num">01</span><div class="dk__arch"></div>' +
          '<div class="dk__foot"><span>AI-LAB ATLAS</span><span>01 / ' + tot + '</span></div></div>';
      }
      if (w.v === 'b') {
        return '<div class="art art--deck dk-b"><div class="dk__sw">' +
          cfg.swatches.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join('') +
          '</div><div class="dk__list"><b>材质规范</b><i></i><i></i><i></i><i></i></div>' +
          '<div class="dk__foot"><span>AI-LAB</span><span>02 / ' + tot + '</span></div></div>';
      }
      return '<div class="art art--deck dk-c"><div class="dk__chart">' +
        ['16', '26', '34', '48', '62', '74'].map(function (h) { return '<span style="--h:' + h + '%"></span>'; }).join('') +
        '</div><p class="dk__cap">首屏 ≤ 1.5 MB</p><div class="dk__foot"><span>性能预算</span><span>03 / ' + tot + '</span></div></div>';
    }
    return '<div class="art art--game gm-' + w.v + '"><div class="game__scene">' +
      '<div class="game__wall l"></div><div class="game__wall r"></div><div class="game__floor"></div><div class="game__door"></div></div>' +
      '<div class="game__hud"><span>SCORE ' + esc(w.score) + '</span><span>' + w.v.toUpperCase() + ' · FLOOR</span></div></div>';
  }

  function buildGallery(door) {
    var d = DOORS.find(function (x) { return x.id === door; });
    var works = cfg.works[door];
    $('#gallery').innerHTML = works.map(function (w, i) {
      return '<figure class="work" style="--d:' + i + '"><div class="work__frame">' + artHTML(w) + '</div>' +
        '<figcaption class="work__cap"><span class="work__no">' + String(i + 1).padStart(2, '0') + ' · ' + d.en + '</span>' +
        '<h3>' + esc(w.t) + '</h3><p>' + esc(w.m) + '</p></figcaption></figure>';
    }).join('');
    $('#intEyebrow').textContent = '内景 · 门 ' + d.roman + ' — ' + cfg.hall;
    $('#intCn').textContent = d.cn;
    $('#intEn').textContent = d.en;
    $('#intLede').textContent = d.lede;
    $('#intNote').innerHTML = '作品为<b>本页实时绘制的样张</b>，用于验证展陈位与画幅；接入真实产出时替换 gallery 数据即可。';
  }

  function buildDust() {
    var n = 16, html = '', i, x, y, dx, dy, t;
    for (i = 0; i < n; i++) {
      x = (i * 61 + 13) % 96; y = (i * 37 + 21) % 82;
      dx = ((i % 5) - 2) * 9; dy = -30 - ((i * 7) % 46); t = 11 + (i % 7) * 2.4;
      html += '<span class="mote" style="left:' + x + '%;top:' + y + '%;--dx:' + dx + 'px;--dy:' + dy + 'px;animation-duration:' + t + 's;animation-delay:-' + i * 1.3 + 's"></span>';
    }
    $('#dust').innerHTML = html;
  }

  /* ---------------- 7. 路由与光幕 ---------------- */
  var veil = $('#veil');
  var state = { cont: ID, door: 'video', route: 'ext', hud: true, motion: !reduced() };
  var DUR = function () { return reduced() ? 60 : cfg.curve.enter; };

  function setVeilOrigin(el) {
    var r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    veil.style.setProperty('--ox', (r.left + r.width / 2) + 'px');
    veil.style.setProperty('--oy', (r.top + r.height / 2) + 'px');
  }

  function swap(to) {
    state.route = to;
    app.setAttribute('data-route', to);
    $('#sceneExt').hidden = to !== 'ext';
    $('#sceneInt').hidden = to !== 'int';
    $('#backBtn').hidden = to === 'ext';
    $('#hudRoute').textContent = to === 'ext' ? '外景' : '内景';
    $('#hudScope').textContent = cfg.name + ' · ' + (to === 'int' ? DOORS.find(function (d) { return d.id === state.door; }).cn : '门廊');
    app.classList.remove('veiling');
    if (to === 'int') {
      $('#sceneInt').classList.remove('is-on');
      buildGallery(state.door);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { $('#sceneInt').classList.add('is-on'); });
      });
    }
  }

  function enterDoor(id, el) {
    if (state.route === 'int' && state.door === id) return;
    state.door = id;
    setVeilOrigin(el || null);
    app.classList.add('veiling');
    $('#sceneExt').hidden = false;
    setTimeout(function () {
      swap('int');
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(function () { app.classList.remove('veiling'); }, reduced() ? 40 : 140);
    }, DUR());
  }

  function backToExt(el) {
    if (state.route === 'ext') return;
    setVeilOrigin(el || null);
    app.classList.add('veiling');
    setTimeout(function () {
      swap('ext');
      window.scrollTo({ top: 0, behavior: 'instant' });
      setTimeout(function () { app.classList.remove('veiling'); }, reduced() ? 40 : 140);
    }, reduced() ? 60 : cfg.curve.exit);
  }

  function shakeDoor(step) {
    var i = DOORS.findIndex(function (d) { return d.id === state.door; });
    enterDoor(DOORS[(i + step + DOORS.length) % DOORS.length].id, $('#gallery'));
  }

  function pulse() {
    var t = $('#toast');
    t.textContent = '已到最后一门，按 Esc 回外景';
    t.classList.add('is-on');
    clearTimeout(pulse.h);
    pulse.h = setTimeout(function () { t.classList.remove('is-on'); }, 1600);
  }

  /* ---------------- 8. 视差 + FPS ---------------- */
  var mx = 0, my = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', function (e) {
    if (reduced() || e.pointerType === 'touch') return;
    tx = (e.clientX / innerWidth - .5) * 2;
    ty = (e.clientY / innerHeight - .5) * 2;
  }, { passive: true });
  window.addEventListener('pointerleave', function () { tx = 0; ty = 0; });

  function loop() {
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    root.style.setProperty('--mx', mx.toFixed(3));
    root.style.setProperty('--my', my.toFixed(3));
    requestAnimationFrame(loop);
  }

  var frames = 0, last = performance.now(), deltas = [], fps = 0, p95 = 0;
  function tick() {
    var now = performance.now(), dt = now - last;
    last = now; frames++; deltas.push(dt); if (deltas.length > 120) deltas.shift();
    if (now - (tick.t0 || (tick.t0 = now)) >= 500) {
      fps = frames * 1000 / (now - tick.t0); frames = 0; tick.t0 = now;
      var s = deltas.slice().sort(function (a, b) { return a - b; });
      p95 = s[Math.floor(s.length * .95)] || 0;
      $('#fpsTab').textContent = fps.toFixed(0);
      $('#hudFps').textContent = fps.toFixed(1) + ' fps';
      $('#hudP95').textContent = p95.toFixed(1) + ' ms';
    }
    requestAnimationFrame(tick);
  }

  /* ---------------- 9. 启动 ---------------- */
  var PAGE_KB = 96.5; // 本页 HTML 5.7 + 壳层 CSS 37.6 + JS 22.1 + token 表 31.1

  function init() {
    applyTokens();
    buildAtlas();
    buildGates();
    buildExtCopy();
    buildDust();
    applyAssets();

    var imgKB = cfg.assets.reduce(function (s, a) { return s + a[1]; }, 0);
    var totalKB = imgKB + PAGE_KB;
    var mb = (totalKB / 1024).toFixed(2);

    $('#hudView').textContent = innerWidth + '×' + innerHeight + ' · ' + devicePixelRatio.toFixed(1) + 'x';
    $('#hudMotion').textContent = reduced() ? '降级（静态构图）' : '完整';
    $('#hudSize').textContent = mb + ' MB';
    $('#extSize').textContent = '首屏资产 ' + mb + ' MB · 4 门 · 12 件样张';
    $('#hudLayers').textContent = (cfg.fgImg ? '5' : '4') + ' 层 · 深度 ' + cfg.depth.sky + '/' + cfg.depth.facade + '/' + cfg.depth.haze + '/' + cfg.depth.fg;
    $('#hudBar').style.width = Math.min(100, (totalKB / 1536) * 100) + '%';
    document.body.setAttribute('data-ready', '1');
    document.body.classList.add('ready');

    $('#backBtn').addEventListener('click', function (e) { backToExt(e.currentTarget); });
    $('#prevDoor').addEventListener('click', function () { shakeDoor(-1); });
    $('#nextDoor').addEventListener('click', function () { shakeDoor(1); });
    $('#hudBtn').addEventListener('click', function () {
      state.hud = !state.hud;
      $('#hud').hidden = !state.hud;
      $('#hudBtn').setAttribute('aria-expanded', String(state.hud));
    });
    $('#hudTab').addEventListener('click', function () {
      var body = $('#hudBody'), open = body.hidden;
      body.hidden = !open;
      $('#hudTab').setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.route !== 'ext') backToExt(null);
      if (e.key === 'h' || e.key === 'H') { state.hud = !state.hud; $('#hud').hidden = !state.hud; }
      if (state.route === 'int' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) shakeDoor(e.key === 'ArrowLeft' ? -1 : 1);
      if (state.route === 'ext' && /^[1-4]$/.test(e.key)) {
        var g = $$('.gate')[+e.key - 1];
        if (g) enterDoor(g.getAttribute('data-door'), g);
      }
    });

    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (ev) {
      state.motion = !ev.matches;
      $('#hudMotion').textContent = ev.matches ? '降级（静态构图）' : '完整';
      root.style.setProperty('--mx', 0);
      root.style.setProperty('--my', 0);
    });

    requestAnimationFrame(loop);
    requestAnimationFrame(tick);
  }

  init();

  /* 调试/截图接口 */
  window.__hall = {
    enter: function (d) { enterDoor(d || 'video', null); },
    back: function () { backToExt(null); },
    route: function (r) { if (r === 'ext') backToExt(null); },
    state: function () { return { cont: ID, door: state.door, route: state.route, fps: +fps.toFixed(1), p95: +p95.toFixed(1) }; },
    hideHud: function () { state.hud = false; $('#hud').hidden = true; },
    showHud: function () { state.hud = true; $('#hud').hidden = false; },
    token: function () { return { palette: cfg.palette, depth: cfg.depth, texture: cfg.texture, curve: cfg.curve }; }
  };
})();
