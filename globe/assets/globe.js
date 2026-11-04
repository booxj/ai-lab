/* ============================================================
   地球入口 · 三维场景
   依赖：three.js（本地 vendor，UMD），无任何网络请求。
   贴图：先用内联低清（file:// 下也稳定），再异步换高清 / 夜景灯。
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('gl');
  var data = (window.LANDMARKS && window.LANDMARKS.items) || [];
  var D2R = Math.PI / 180;

  /* ---------------- WebGL 兜底 ---------------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    renderer = null;
  }
  if (!renderer) {
    document.getElementById('nowebgl').hidden = false;
    document.getElementById('loader').classList.add('is-off');
    return;
  }
  renderer.setClearColor(0x05070b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100);
  scene.add(camera);

  /* ---------------- 光照（按经纬度 / 时刻 / 季节推算） ---------------- */
  var seasonDecl = [-14, 0, 23.2, -6]; // 春 / 夏 / 秋 / 冬（近似赤纬）
  var state = {
    hour: 17.5, season: 1, weather: 0, night: 0,
    timeMode: 'real',          // real：按 UTC 推太阳直射点；manual：按滑杆的巴黎钟表时间
    sun: new THREE.Vector3(1, 0, 0),
    dim: 1
  };

  function v3(lat, lon, r) {
    r = r || 1;
    var phi = (90 - lat) * D2R, theta = (lon + 180) * D2R;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // 以巴黎为画面中心，让欧非大陆正对镜头
  var anchor = v3(48.853, 2.3499, 1).normalize();

  // 太阳直射点：赤纬 + 时差 + 小时角，输入 UTC 时刻
  function solarEq(now) {
    var y = now.getUTCFullYear();
    var dayMs = Date.UTC(y, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(y, 0, 1);
    var N = dayMs / 86400000 + 1;
    var g = 2 * Math.PI / 365 * (N - 1);
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
      - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
      - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g); // 弧度
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
      - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g)); // 分钟
    return { decl: decl / D2R, eq: eq };
  }

  function subsolar(now) {
    var s = solarEq(now);
    var utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    var lon = -15 * (utcH + s.eq / 60 - 12);
    lon = ((lon + 540) % 360) - 180;
    return { lat: s.decl, lon: lon };
  }

  // 巴黎夏令时：4–10 月 +2，其余 +1（只用于把滑杆上的巴黎钟表时间换算成 UTC）
  var parisOffset = (function () { var m = new Date().getUTCMonth(); return (m >= 3 && m <= 9) ? 2 : 1; })();

  function sunDirFor(lat, lon) {
    return v3(lat, lon, 1).normalize();
  }

  function updateSun() {
    var decl, lon;
    if (state.timeMode === 'real') {
      var s = subsolar(new Date());
      decl = s.lat; lon = s.lon;
    } else {
      // 手动时刻：滑杆是巴黎钟表时间 → 换算 UTC 后求直射经度；赤纬按季节档位
      var utcH = Math.max(-6, Math.min(30, state.hour - parisOffset));
      lon = -15 * (utcH + solarEq(new Date()).eq / 60 - 12);
      lon = ((lon + 540) % 360) - 180;
      decl = seasonDecl[state.season];
    }
    var dir = sunDirFor(decl, lon);
    state.sunLat = decl; state.sunLon = lon;
    state.night = dir.dot(anchor) < 0 ? 1 : 0;
    state.sun.copy(dir);
    if (dayUniforms) dayUniforms.uSun.value.copy(dir);
    if (cloudMat) cloudMat.uniforms.uSun.value.copy(dir);
  }

  /* ---------------- 地球：昼夜合成着色 ---------------- */
  var blankTex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blankTex.needsUpdate = true;
  var dayUniforms = null;
  var earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: null },
      uNight: { value: null },
      uNightAmt: { value: 0.9 },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uDim: { value: 1 },
      uContrast: { value: 1.0 },
      uCloudTex: { value: blankTex },
      uCloudAmt: { value: 0 },
      uCloudDrift: { value: 0 }
    },
    vertexShader: [
      'varying vec2 vUv;',
      'varying vec3 vN;',
      'varying vec3 vP;',
      'void main(){',
      '  vUv = uv;',
      '  vN = normalize(mat3(modelMatrix) * normal);',
      '  vec4 wp = modelMatrix * vec4(position,1.0);',
      '  vP = wp.xyz;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D uDay;',
      'uniform sampler2D uNight;',
      'uniform sampler2D uCloudTex;',
      'uniform float uCloudAmt, uCloudDrift;',
      'uniform float uNightAmt;',
      'uniform float uDim;',
      'uniform float uContrast;',
      'uniform vec3 uSun;',
      'varying vec2 vUv;',
      'varying vec3 vN;',
      'varying vec3 vP;',
      'void main(){',
      '  vec3 n = normalize(vN);',
      '  vec3 sun = normalize(uSun);',
      '  float d = dot(n, sun);',
      // 晨昏线：一条宽约 ±18° 的柔化过渡，不做硬边
      '  float dayMix = smoothstep(-0.30, 0.16, d);',
      '  vec3 day = texture2D(uDay, vUv).rgb;',
      // 云影：淡压受光面的海陆，不压夜面灯光
      '  float cl = texture2D(uCloudTex, vec2(vUv.x + uCloudDrift, vUv.y)).a;',
      '  cl = clamp(cl * uCloudAmt * 2.0, 0.0, 1.0);',
      '  float shade = 1.0 - 0.30 * cl * cl * smoothstep(0.0, 0.45, d);',
      '  float amb = 0.40 - 0.16 * uContrast;',
      '  float gain = 0.56 + 0.30 * uContrast;',
      // 受光面增益留余量，避免整球提亮 / 过曝
      '  day *= (amb + gain * max(d, 0.0) * shade);',
      '  vec3 night = texture2D(uNight, vUv).rgb;',
      '  night = pow(night, vec3(0.86)) * 1.25;',
      '  vec3 col = mix(night * uNightAmt, day, dayMix);',
      // 过渡带偏暖：只在晨昏线附近叠一层橙红，不铺整球
      '  float band = smoothstep(0.30, 0.0, abs(d));',
      '  col += vec3(1.0, 0.44, 0.18) * band * band * 0.10;',
      '  vec3 vd = normalize(cameraPosition - vP);',
      '  float fres = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 3.0);',
      '  col += vec3(0.30, 0.46, 0.68) * fres * (0.48 * dayMix + 0.08);',
      '  gl_FragColor = vec4(col * uDim, 1.0);',
      '}'
    ].join('\n')
  });
  dayUniforms = earthMat.uniforms;

  var earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 80), earthMat);
  scene.add(earth);

  // 大气外晕
  var air = new THREE.Mesh(
    new THREE.SphereGeometry(1.035, 64, 40),
    new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
      vertexShader: [
        'varying vec3 vN; varying vec3 vP;',
        'void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix * vec4(position,1.0); vP = wp.xyz;',
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vN; varying vec3 vP;',
        'void main(){ vec3 vd = normalize(cameraPosition - vP);',
        ' float f = pow(1.0 - clamp(dot(normalize(vN), vd), 0.0, 1.0), 2.6);',
        ' gl_FragColor = vec4(vec3(0.34,0.54,0.80) * f, f * 0.52); }'
      ].join('\n')
    })
  );
  scene.add(air);

  // 极简星场（静态，不作为粒子动画）
  (function stars() {
    var n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 10;
      var s = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(a) * s * r;
      pos[i * 3 + 1] = u * r;
      pos[i * 3 + 2] = Math.sin(a) * s * r;
      var b = 0.35 + Math.random() * 0.55;
      col[i * 3] = b * 0.82; col[i * 3 + 1] = b * 0.88; col[i * 3 + 2] = b;
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var m = new THREE.PointsMaterial({ size: 0.11, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: reduce ? 0.5 : 0.72, depthWrite: false });
    scene.add(new THREE.Points(g, m));
  })();

  /* ---------------- 贴图：低清 → 高清 → 夜灯 ---------------- */
  var loader = new THREE.TextureLoader();
  var texState = document.getElementById('texState');
  var hiLoaded = false, nightLoaded = false;

  loader.load(window.EARTH_LOW, function (t) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    earthMat.uniforms.uDay.value = t;
  });
  // 低清先顶上夜面，避免夜间一侧全黑
  loader.load(window.EARTH_LOW, function (t) {
    t.colorSpace = THREE.SRGBColorSpace;
    if (!nightLoaded) earthMat.uniforms.uNight.value = t;
  });

  function inject(src, next) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = next;
    s.onerror = function () { texState.textContent = '贴图 低清（高清未载入）'; };
    document.body.appendChild(s);
  }

  setTimeout(function () {
    inject('assets/earth-hi.js', function () {
      if (!window.EARTH_HI) return;
      loader.load(window.EARTH_HI, function (t) {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        earthMat.uniforms.uDay.value = t;
        hiLoaded = true;
        texState.textContent = nightLoaded ? '贴图 高清 · 夜灯' : '贴图 高清';
      });
    });
  }, 320);

  setTimeout(function () {
    inject('assets/earth-night.js', function () {
      if (!window.EARTH_NIGHT) return;
      loader.load(window.EARTH_NIGHT, function (t) {
        t.colorSpace = THREE.SRGBColorSpace;
        earthMat.uniforms.uNight.value = t;
        nightLoaded = true;
        texState.textContent = hiLoaded ? '贴图 高清 · 夜灯' : '贴图 夜灯 · 低清日面';
      });
    });
  }, 1200);

  /* ---------------- 相机轨道 ---------------- */
  var orbit = { theta: 0, phi: 0, r: 3.5 };
  var target = { theta: 0, phi: 0, r: 3.5, fov: 32 };
  var curTheta = 0, curPhi = 0, curR = 3.5, curFov = 32;
  var focused = null, dragging = false, moved = false, lastX = 0, lastY = 0, velT = 0, velP = 0;

  // 让整颗球在任意画幅里都完整可见（含 10% 留白）
  function fitRadius() {
    var vf = camera.fov * D2R;
    var hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    var minF = Math.min(vf, hf);
    return 1.1 / Math.sin(minF / 2);
  }
  var fitR = 4.4;

  function sphericalFromVec(p) {
    var n = p.clone().normalize();
    return { theta: Math.atan2(n.x, n.z), phi: Math.acos(Math.max(-1, Math.min(1, n.y))) };
  }
  function applyCamera() {
    var st = Math.sin(curPhi), ct = Math.cos(curPhi);
    camera.position.set(curR * st * Math.sin(curTheta), curR * ct, curR * st * Math.cos(curTheta));
    camera.lookAt(0, 0, 0);
    if (Math.abs(camera.fov - curFov) > 0.01) {
      camera.fov = curFov;
      camera.updateProjectionMatrix();
    }
  }

  var s0 = sphericalFromVec(anchor);
  orbit.theta = target.theta = s0.theta;
  orbit.phi = target.phi = s0.phi;

  /* ---------------- 标记点 ---------------- */
  var pinsWrap = document.getElementById('pins');
  var pins = [];
  data.forEach(function (item) {
    var p = v3(item.lat, item.lon, 1);
    var el = document.createElement('button');
    el.className = 'pin' + (item.status === 'planned' ? ' pin--planned' : '');
    el.type = 'button';
    el.setAttribute('aria-label', item.name + ' · ' + item.city + (item.status === 'planned' ? ' · 筹备中' : ''));
    el.innerHTML = '<span class="pin__dot"></span><span class="pin__label">' + item.name + '</span>';
    el.addEventListener('pointerenter', function () { focus(item, true); });
    el.addEventListener('click', function (e) { e.stopPropagation(); focus(item, true); });
    el.addEventListener('focus', function () { focus(item, true); });
    pinsWrap.appendChild(el);
    pins.push({ item: item, p: p, el: el, label: el.querySelector('.pin__label'), dot: el.querySelector('.pin__dot') });
  });

  var card = document.getElementById('card');
  var cardThumb = document.getElementById('cardThumb');
  var cardGeo = document.getElementById('cardGeo');
  var cardName = document.getElementById('cardName');
  var cardEn = document.getElementById('cardEn');
  var cardBlurb = document.getElementById('cardBlurb');
  var cardState = document.getElementById('cardState');
  var cardCredit = document.getElementById('cardCredit');
  var cardEnter = document.getElementById('cardEnter');
  var hoverTimer = null;

  var THUMBS = {
    'notre-dame': '<img src="assets/thumbs/notre-dame.jpg" alt="巴黎圣母院西立面近景" loading="lazy">',
    'kinkakuji': '<img src="assets/thumbs/kinkakuji.jpg" alt="金阁寺镜湖池近景" loading="lazy">'
  };

  function focus(item, fromHover) {
    clearTimeout(hoverTimer);
    focused = item;
    var sp = sphericalFromVec(pins.filter(function (x) { return x.item === item; })[0].p);
    target.theta = sp.theta;
    target.phi = Math.max(0.22, Math.min(Math.PI - 0.22, sp.phi));
    target.r = fitR * 0.75;
    target.fov = 29;

    cardThumb.innerHTML = item.photo
      ? '<img src="' + item.photo + '" alt="' + item.name + ' 实拍照片" decoding="async">'
      : (THUMBS[item.thumb] || THUMBS['notre-dame']);
    cardGeo.textContent = item.countryEn + ' / ' + item.cityEn;
    cardName.textContent = item.name;
    cardEn.textContent = item.nameEn;
    cardBlurb.textContent = item.blurb;
    if (cardCredit) {
      cardCredit.textContent = item.photoCredit || '';
      cardCredit.hidden = !item.photoCredit;
    }
    // 卡片打开时收起环境面板，避免两个浮层互压
    if (typeof setPanel === 'function') setPanel(false);
    if (item.status === 'open') {
      cardState.textContent = '已建成 · 场景可进入';
      cardEnter.hidden = false;
      // 把当前时刻 / 季节 / 天气 / 种子一并带给场景页，保证「云、光、雨雪」同一口径
      cardEnter.href = item.slug + '/index.html'
        + '?h=' + state.hour
        + '&s=' + SEASONS[state.season][0]
        + '&w=' + WEATHERS[state.weather][0]
        + '&seed=' + fx.seed
        + '&fx=' + fx.mode;
    } else {
      cardState.textContent = '标记已登记 · 场景筹备中';
      cardEnter.hidden = true;
    }
    card.hidden = false;
    requestAnimationFrame(function () { card.classList.add('is-in'); });
    document.body.classList.add('is-card');
    pins.forEach(function (p) { p.el.classList.toggle('is-hot', p.item === item); });
    if (fromHover) return;
  }

  function blur() {
    focused = null;
    target.r = fitR;
    target.fov = 32;
    card.classList.remove('is-in');
    document.body.classList.remove('is-card');
    pins.forEach(function (p) { p.el.classList.remove('is-hot'); });
    setTimeout(function () { if (!focused) card.hidden = true; }, 420);
  }

  /* ---------------- 交互 ---------------- */
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add('dragging');
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    velT = dx * 0.0052;
    velP = dy * 0.0048;
    target.theta -= velT;
    target.phi = Math.max(0.2, Math.min(Math.PI - 0.2, target.phi - velP));
    if (focused) { /* 拖动即退出聚焦 */ }
  });
  function endDrag() { dragging = false; canvas.classList.remove('dragging'); }
  canvas.addEventListener('pointerup', function (e) {
    var wasMoved = moved;
    endDrag();
    if (!wasMoved) blur();
  });
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    target.r = Math.max(fitR * 0.42, Math.min(fitR * 1.35, target.r * (1 + (e.deltaY > 0 ? 0.075 : -0.062))));
  }, { passive: false });

  var pinch = null;
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      pinch = dist2(e.touches);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function (e) {
    if (e.touches.length === 2 && pinch) {
      var d = dist2(e.touches);
      target.r = Math.max(fitR * 0.42, Math.min(fitR * 1.35, target.r * (pinch / Math.max(1, d))));
      pinch = d;
      e.preventDefault();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function () { pinch = null; });
  function dist2(t) {
    var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  /* ---------------- 环境控制 ---------------- */
  var hourEl = document.getElementById('hour');
  var hourOut = document.getElementById('hourOut');
  var seasonsWrap = document.getElementById('seasons');
  var weatherWrap = document.getElementById('weathers');
  var SEASONS = [['spring', '春'], ['summer', '夏'], ['autumn', '秋'], ['winter', '冬']];
  var WEATHERS = [['clear', '晴'], ['cloud', '阴'], ['rain', '雨'], ['snow', '雪']];

  SEASONS.forEach(function (s, i) {
    var b = document.createElement('button');
    b.className = 'chip' + (i === state.season ? ' is-on' : '');
    b.type = 'button'; b.textContent = s[1];
    b.addEventListener('click', function () {
      state.season = i;
      Array.prototype.forEach.call(seasonsWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
      document.body.classList.remove('s-spring', 's-summer', 's-autumn', 's-winter');
      document.body.classList.add('s-' + SEASONS[i][0]);
      updateSun();
    });
    seasonsWrap.appendChild(b);
  });
  WEATHERS.forEach(function (w, i) {
    var b = document.createElement('button');
    b.className = 'chip' + (i === state.weather ? ' is-on' : '');
    b.type = 'button'; b.textContent = w[1];
    b.addEventListener('click', function () {
      state.weather = i;
      Array.prototype.forEach.call(weatherWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
      document.body.classList.remove('w-clear', 'w-cloud', 'w-rain', 'w-snow');
      if (i > 0) document.body.classList.add('w-' + WEATHERS[i][0]);
      applyWeatherDim();
      syncFx();
    });
    weatherWrap.appendChild(b);
  });

  function applyWeatherDim() {
    var dim = [1, 0.86, 0.72, 0.94][state.weather];
    if (earthMat) earthMat.uniforms.uDim.value = dim;
  }

  function applyTime() {
    var h = state.hour;
    var cls = h < 5 || h >= 21 ? 't-night' : h < 8 ? 't-dawn' : h < 17 ? 't-day' : 't-dusk';
    document.body.classList.remove('t-dawn', 't-day', 't-dusk', 't-night');
    document.body.classList.add(cls);
    var m = h % 1 ? ':30' : ':00';
    hourOut.textContent = String(Math.floor(h)).padStart(2, '0') + m;
    var pct = Math.max(12, Math.min(88, 20 + ((h - 6) / 14) * 68));
    document.documentElement.style.setProperty('--sunx', pct + '%');
    updateSun();
  }

  hourEl.addEventListener('input', function () {
    // 拖动即视为手动模式，页面明确标注「模拟」
    if (state.timeMode !== 'manual') {
      state.timeMode = 'manual';
      applyTimeMode();
    }
    state.hour = parseFloat(hourEl.value);
    applyTime();
  });

  // 默认取巴黎当地时刻
  (function initTime() {
    var now = new Date();
    var h = 0;
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hour12: false });
      var parts = f.formatToParts ? f.formatToParts(now) : [];
      var hh = 0, mm = 0;
      parts.forEach(function (p) { if (p.type === 'hour') hh = parseInt(p.value, 10); if (p.type === 'minute') mm = parseInt(p.value, 10); });
      h = hh + mm / 60;
    } catch (e) {
      h = now.getHours() + now.getMinutes() / 60;
    }
    if (!isFinite(h)) h = 17.5;
    state.hour = Math.round(h * 2) / 2;
    hourEl.value = state.hour;
    var month = now.getMonth();
    state.season = month < 2 || month > 10 ? 3 : month < 5 ? 0 : month < 8 ? 1 : 2;
    document.body.classList.add('s-' + SEASONS[state.season][0]);
    Array.prototype.forEach.call(seasonsWrap.children, function (c, i) { c.classList.toggle('is-on', i === state.season); });
    document.getElementById('tzOut').textContent = '设备 ' + now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' · 巴黎 ' + (h < 10 ? '0' : '') + Math.floor(h) + ':' + (h % 1 ? '30' : '00');
    applyTime();
  })();

  /* ---------------- 天气特效：程序化云层 + 降水粒子 ---------------- */
  var cloudMat = null, cloudMesh = null, cloudTex = null, cloudDrift = 0;
  var cloudAlpha = null, cloudAW = 0, cloudAH = 0;
  var fx = {
    mode: reduce ? 'cloud' : 'all', seed: 20261104, jitter: 0,
    cloudTarget: 0, rainOn: false, snowOn: false, degrade: 0, size: 0, noDegrade: false
  };
  var fxState = document.getElementById('fxState');
  var seedOut = document.getElementById('seedOut');
  var fxModesWrap = document.getElementById('fxModes');

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // fbm 值噪声，横向可平铺；画进 canvas 作为云层 alpha 贴图
  function buildCloudTexture(size, seed) {
    var w = size, h = size >> 1;
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    var rnd = mulberry32(seed ^ 0x5f3759df), oct = [];
    for (var o = 0; o < 4; o++) {
      var gx = 6 * (1 << o), gy = gx >> 1, g = new Float32Array(gx * gy);
      for (var i = 0; i < g.length; i++) g[i] = rnd();
      oct.push({ gx: gx, gy: gy, g: g });
    }
    function smp(o, x, y) {
      var fx0 = x * o.gx, fy0 = y * o.gy;
      var x0 = Math.floor(fx0), y0 = Math.floor(fy0);
      var tx = fx0 - x0, ty = fy0 - y0;
      var xa = ((x0 % o.gx) + o.gx) % o.gx, xb = (xa + 1) % o.gx;
      var ya = Math.max(0, Math.min(o.gy - 1, y0)), yb = Math.min(o.gy - 1, ya + 1);
      var u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
      var a = o.g[ya * o.gx + xa], b = o.g[ya * o.gx + xb];
      var cc = o.g[yb * o.gx + xa], dd = o.g[yb * o.gx + xb];
      return (a * (1 - u) + b * u) * (1 - v) + (cc * (1 - u) + dd * u) * v;
    }
    for (var py = 0; py < h; py++) {
      var ny = py / (h - 1);
      // 极区收薄，避免等距投影在极点收拢成一圈硬扇形
      var lat = Math.min(1, Math.sin(Math.PI * ny) * 2.4);
      for (var px = 0; px < w; px++) {
        var nx = px / w, v = 0, amp = 0.55, tot = 0;
        for (var k = 0; k < 4; k++) { v += smp(oct[k], nx, ny) * amp; tot += amp; amp *= 0.52; }
        v /= tot;
        var a = Math.max(0, Math.min(1, (v - 0.50) / 0.22));
        a = a * a * (3 - 2 * a) * lat;
        var idx = (py * w + px) * 4;
        d[idx] = 255; d[idx + 1] = 255; d[idx + 2] = 255; d[idx + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    cloudAW = w; cloudAH = h;
    cloudAlpha = new Float32Array(w * h);
    for (var q = 0; q < w * h; q++) cloudAlpha[q] = d[q * 4 + 3] / 255;
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  }

  function buildCloud() {
    var base = window.innerWidth <= 700 ? 768 : 1024;
    var size = fx.degrade >= 2 ? 512 : fx.degrade >= 1 ? Math.min(base, 768) : base;
    fx.size = size;
    if (cloudTex) cloudTex.dispose();
    cloudTex = buildCloudTexture(size, fx.seed);
    if (!cloudMat) {
      cloudMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.FrontSide,
        uniforms: {
          uCloud: { value: cloudTex }, uTime: { value: 0 }, uDrift: { value: 0 },
          uAmt: { value: 0 }, uDim: { value: 1 }, uSun: { value: new THREE.Vector3(1, 0, 0) }
        },
        vertexShader: [
          'varying vec2 vUv; varying vec3 vN;',
          'void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal);',
          ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }'
        ].join('\n'),
        fragmentShader: [
          'uniform sampler2D uCloud; uniform float uDrift, uAmt, uDim; uniform vec3 uSun;',
          'varying vec2 vUv; varying vec3 vN;',
          'void main(){',
          // 三层不同尺度：大尺度天气系统 + 中尺度云团 + 高频碎边
          ' float a1 = texture2D(uCloud, vec2(vUv.x + uDrift, vUv.y)).a;',
          ' float a2 = texture2D(uCloud, vec2(vUv.x * 2.7 - uDrift * 1.6, vUv.y * 1.8 + 0.17)).a;',
          ' float a3 = texture2D(uCloud, vec2(vUv.x * 5.6 + uDrift * 2.4, vUv.y * 3.6 - 0.11)).a;',
          ' float base = a1 * 0.74 + a2 * 0.42 + a3 * 0.24;',
          // 高频层当侵蚀：让边缘碎裂，不是均匀白雾
          ' float ero = a3 * 0.62 + a2 * 0.24;',
          ' float a = base * (0.52 + 0.78 * ero);',
          ' a = clamp(a, 0.0, 1.0); a = a * a * (3.0 - 2.0 * a);',
          // 厚薄差异：厚处实、薄处透，云顶亮、云底暗
          ' float core = smoothstep(0.42, 0.94, a);',
          ' float d = dot(normalize(vN), normalize(uSun));',
          ' float lit = 0.20 + 1.02 * max(d, 0.0) * mix(0.80, 1.05, core);',
          ' lit *= mix(0.58, 1.0, core);',
          // 夜面云只留微弱轮廓
          ' float dayMask = smoothstep(-0.20, 0.22, d);',
          ' vec3 col = vec3(0.93, 0.96, 1.0) * lit * uDim;',
          ' gl_FragColor = vec4(col, a * uAmt * mix(0.50, 1.0, dayMask));',
          '}'
        ].join('\n')
      });
      cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.018, 96, 60), cloudMat);
      cloudMesh.renderOrder = 2;
      scene.add(cloudMesh);
    }
    cloudMat.uniforms.uCloud.value = cloudTex;
    if (earthMat) earthMat.uniforms.uCloudTex.value = cloudTex;
    updateFxState();
  }

  /* 降水：屏幕对齐的圆盘内粒子，只在可见半球；雨为线段、雪为点精灵 */
  var PR = 1.0;
  var precipGroup = new THREE.Group();
  precipGroup.position.set(0, 0, -3.0);
  camera.add(precipGroup);

  // 局部降雨：3 个椭圆区域。按当前视野把候选点投到经纬度，再采样云图——
  // 云最厚的位置更容易落雨，晴处不下，避免整球同时下雨。
  var rainZones = [];
  function cloudAt(lat, lon) {
    if (!cloudAlpha) return 0.5;
    var u = (lon + 180) / 360, v = (90 - lat) / 180;
    var x = Math.max(0, Math.min(cloudAW - 1, Math.floor(u * cloudAW)));
    var y = Math.max(0, Math.min(cloudAH - 1, Math.floor(v * cloudAH)));
    return cloudAlpha[y * cloudAW + x];
  }
  function screenToLatLon(nx, ny) {
    var scale = 3.45 / Math.max(1.1, curR);
    var fwd = camera.position.clone().normalize().negate();
    var right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    var upv = new THREE.Vector3().crossVectors(right, fwd).normalize();
    var pw = camera.position.clone()
      .addScaledVector(right, nx * scale)
      .addScaledVector(upv, ny * scale)
      .addScaledVector(fwd, 3);
    var dir = pw.normalize();
    return {
      lat: 90 - Math.acos(Math.max(-1, Math.min(1, dir.y))) / D2R,
      lon: Math.atan2(dir.z, -dir.x) / D2R - 180
    };
  }
  function buildZones() {
    var rr = mulberry32(fx.seed ^ 0x51ed270b);
    var cand = [];
    for (var k = 0; k < 26; k++) {
      var nx = rr() * 1.5 - 0.75, ny = rr() * 1.5 - 0.75;
      var ll = screenToLatLon(nx, ny);
      var dir = v3(ll.lat, ll.lon, 1).normalize();
      var vis = dir.dot(anchor) > 0.35 ? 1 : 0.22;
      cand.push({ x: nx, y: ny, w: cloudAt(ll.lat, ll.lon) * vis + rr() * 0.06 });
    }
    cand.sort(function (a, b) { return b.w - a.w; });
    rainZones = [];
    for (var i = 0; i < 3; i++) {
      var c = cand[i] || { x: 0, y: 0 };
      rainZones.push(new THREE.Vector4(c.x, c.y, 0.22 + rr() * 0.10, 0.34 + rr() * 0.18));
    }
    if (rainSys && rainSys.mat) rainSys.mat.uniforms.uZones.value = rainZones;
    updateFxState();
  }

  var RAIN_CAP = 900, SNOW_CAP = 560, SPLASH_CAP = 40;

  function rainMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uOpacity: { value: 0 }, uR: { value: PR }, uGust: { value: 1 },
        uZones: { value: rainZones }
      },
      vertexShader: [
        'attribute float aHead;',
        'attribute float aAlpha;',
        'uniform float uOpacity, uR, uGust;',
        'uniform vec4 uZones[3];',
        'varying float vA; varying float vHead;',
        'float zoneMask(vec2 p){',
        ' float m = 0.0;',
        ' for (int i = 0; i < 3; i++) {',
        '  vec2 d = (p - uZones[i].xy) / vec2(uZones[i].z, uZones[i].w);',
        '  m = max(m, 1.0 - smoothstep(0.40, 1.0, length(d)));',
        ' }',
        ' return m;',
        '}',
        'void main(){',
        ' vec3 p = position;',
        ' float ny = (p.y + uR) / (uR * 2.0), rn = length(p.xy) / uR;',
        ' float disk = smoothstep(1.0, 0.88, ny) * smoothstep(0.0, 0.12, ny) * smoothstep(1.0, 0.84, rn);',
        ' vA = aAlpha * disk * (0.28 + 0.72 * zoneMask(p.xy)) * uGust;',
        ' vHead = aHead;',
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uOpacity; varying float vA; varying float vHead;',
        'void main(){',
        // 头部略亮、尾部虚化；1px 线宽由 WebGL 固定
        ' float a = vA * uOpacity * mix(0.14, 1.0, vHead);',
        ' if (a < 0.008) discard;',
        ' vec3 col = mix(vec3(0.60, 0.72, 0.90), vec3(0.92, 0.96, 1.0), vHead);',
        ' gl_FragColor = vec4(col, a);',
        '}'
      ].join('\n')
    });
  }

  function buildRain() {
    var pos = new Float32Array(RAIN_CAP * 6);
    var head = new Float32Array(RAIN_CAP * 2);
    var alp = new Float32Array(RAIN_CAP * 2);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aHead', new THREE.BufferAttribute(head, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alp, 1));
    geo.setDrawRange(0, 0);
    var mat = rainMaterial();
    var lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false; lines.renderOrder = 7; lines.visible = false;
    precipGroup.add(lines);
    // 三层景深：近景更大更快更实、中景正常、远景小而慢更淡；z 也拉开，透视自然分层
    var LY = [
      { spd: 2.40, len: 0.055, alpha: 0.52, z: 0.13, share: 0.30 },
      { spd: 1.55, len: 0.036, alpha: 0.33, z: 0.00, share: 0.45 },
      { spd: 0.92, len: 0.022, alpha: 0.15, z: -0.15, share: 0.25 }
    ];
    var x = new Float32Array(RAIN_CAP), y = new Float32Array(RAIN_CAP);
    var len = new Float32Array(RAIN_CAP), spd = new Float32Array(RAIN_CAP);
    var lay = new Uint8Array(RAIN_CAP), zi = new Uint8Array(RAIN_CAP);
    var rr = mulberry32(fx.seed ^ 0x1234);
    for (var i = 0; i < RAIN_CAP; i++) {
      // 按份额排布：0–30% 近景、30–75% 中景、75–100% 远景；降级时从尾部砍，先减远景层
      var f = i / RAIN_CAP;
      var L = f < 0.30 ? 0 : f < 0.75 ? 1 : 2;
      lay[i] = L;
      len[i] = LY[L].len * (0.82 + rr() * 0.36);
      spd[i] = LY[L].spd * (0.88 + rr() * 0.24);
      head[i * 2] = 1; head[i * 2 + 1] = 0;
      alp[i * 2] = LY[L].alpha; alp[i * 2 + 1] = LY[L].alpha;
      zi[i] = Math.floor(rr() * Math.max(1, rainZones.length));
      var z0 = rainZones[zi[i]] || new THREE.Vector4(0, 0, .3, .4);
      var a0 = rr() * Math.PI * 2, r0 = Math.sqrt(rr()) * 0.92;
      x[i] = z0.x + Math.cos(a0) * r0 * z0.z;
      y[i] = z0.y + Math.sin(a0) * r0 * z0.w;
    }
    return { kind: 'rain', obj: lines, geo: geo, mat: mat, pos: pos, x: x, y: y,
             len: len, spd: spd, lay: lay, zi: zi, zv: [0.13, 0.0, -0.15],
             max: RAIN_CAP, count: 0, rng: mulberry32(fx.seed ^ 0x9e37) };
  }

  function buildSnow() {
    var pos = new Float32Array(SNOW_CAP * 3);
    var ph = new Float32Array(SNOW_CAP), sz = new Float32Array(SNOW_CAP), al = new Float32Array(SNOW_CAP);
    var rr = mulberry32(fx.seed ^ 0xabcd);
    var x = new Float32Array(SNOW_CAP), y = new Float32Array(SNOW_CAP), sp = new Float32Array(SNOW_CAP);
    for (var i = 0; i < SNOW_CAP; i++) {
      var r = Math.sqrt(rr()) * PR, a = rr() * Math.PI * 2;
      x[i] = Math.cos(a) * r; y[i] = rr() * PR * 2 - PR;
      pos[i * 3] = x[i]; pos[i * 3 + 1] = y[i];
      ph[i] = rr() * Math.PI * 2;
      var c = rr();                       // 三种粒径，避免均匀白点
      sz[i] = c < 0.28 ? 1.65 : c < 0.72 ? 1.05 : 0.68;
      sp[i] = (0.19 + rr() * 0.12) * (0.55 + sz[i] * 0.42);
      al[i] = 0.26 + 0.30 * Math.min(1, sz[i] / 1.4);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1));
    geo.setDrawRange(0, 0);
    var mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uSize: { value: 0.012 }, uScale: { value: 700 }, uOpacity: { value: 0 }, uR: { value: PR } },
      vertexShader: [
        'attribute float aPhase; attribute float aSize; attribute float aAlpha;',
        'uniform float uSize, uScale, uR;',
        'varying float vA;',
        'void main(){',
        ' vec3 p = position;',
        ' float ny = (p.y + uR) / (uR * 2.0), rn = length(p.xy) / uR;',
        // 稀疏空间：被 coarse 门限压过的位置更淡，形成疏密
        ' float gate = 0.58 + 0.42 * sin(p.x * 3.1 + 1.3) * sin(p.y * 2.7 - 0.8);',
        ' vA = smoothstep(1.0, 0.86, ny) * smoothstep(0.0, 0.16, ny) * smoothstep(1.0, 0.80, rn) * aAlpha * (0.45 + 0.55 * gate);',
        ' vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        ' gl_PointSize = uSize * aSize * (uScale / max(0.6, -mv.z));',
        ' gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uOpacity; varying float vA;',
        'void main(){',
        ' float d = length(gl_PointCoord - vec2(0.5));',
        // 边缘带一点融化感，不是硬圆点
        ' float a = smoothstep(0.5, 0.10, d) * vA * uOpacity;',
        ' if (a < 0.008) discard;',
        ' gl_FragColor = vec4(vec3(0.93, 0.97, 1.0), a);',
        '}'
      ].join('\n')
    });
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false; pts.renderOrder = 7; pts.visible = false;
    precipGroup.add(pts);
    return { kind: 'snow', obj: pts, geo: geo, mat: mat, pos: pos, x: x, y: y, sp: sp, ph: ph,
             max: SNOW_CAP, count: 0, rng: mulberry32(fx.seed ^ 0x77) };
  }

  // 落地溅射：极少量短命涟漪，只在可见半球下缘
  function buildSplash() {
    var pos = new Float32Array(SPLASH_CAP * 3), age = new Float32Array(SPLASH_CAP);
    for (var i = 0; i < SPLASH_CAP; i++) { age[i] = 1; pos[i * 3 + 1] = 9; }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAge', new THREE.BufferAttribute(age, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, SPLASH_CAP);
    var mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uScale: { value: 700 }, uOpacity: { value: 0 } },
      vertexShader: [
        'attribute float aAge; uniform float uScale; varying float vAge;',
        'void main(){',
        ' vAge = aAge;',
        ' vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        ' gl_PointSize = uScale * (0.0035 + 0.0075 * aAge) / max(0.6, -mv.z);',
        ' gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uOpacity; varying float vAge;',
        'void main(){',
        ' float d = length(gl_PointCoord - vec2(0.5)) * 2.0;',
        ' float ring = smoothstep(0.16, 0.0, abs(d - 0.58));',
        ' float a = ring * (1.0 - vAge) * (1.0 - vAge) * uOpacity * 0.55;',
        ' if (a < 0.008) discard;',
        ' gl_FragColor = vec4(vec3(0.72, 0.84, 1.0), a);',
        '}'
      ].join('\n')
    });
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false; pts.renderOrder = 8; pts.visible = false;
    precipGroup.add(pts);
    return { obj: pts, geo: geo, mat: mat, pos: pos, age: age, slot: 0 };
  }

  buildZones();
  var rainSys = buildRain();
  var snowSys = buildSnow();
  var splashSys = buildSplash();
  rainSys.mat.uniforms.uZones.value = rainZones;

  var rainLevel = 0;                     // 0 小雨 / 1 暴雨
  var gustPhase = 0;

  function applyCounts() {
    // 降级时从尾部砍粒子（tail 是远景层），先降远景，再降云分辨率
    var q = fx.degrade >= 1 ? 0.62 : 1;
    var mobile = window.innerWidth <= 700 ? 0.72 : 1;
    rainSys.count = Math.round(rainSys.max * q * mobile);
    snowSys.count = Math.round(snowSys.max * (fx.degrade >= 1 ? 0.80 : 1) * mobile);
    splashSys.obj.visible = fx.degrade < 1;
    updateFxState();
  }

  function spawnRain(sys, i, atTop) {
    var zi = Math.floor(sys.rng() * Math.max(1, rainZones.length));
    sys.zi[i] = zi;
    var z = rainZones[zi] || new THREE.Vector4(0, 0, .3, .4);
    var a = sys.rng() * Math.PI * 2, r = Math.sqrt(sys.rng()) * 0.92;
    sys.x[i] = z.x + Math.cos(a) * r * z.z;
    sys.y[i] = atTop ? z.y + z.w * (0.88 + sys.rng() * 0.18) : z.y + Math.sin(a) * r * z.w;
  }
  function respawnSnow(sys, i, atTop) {
    for (var k = 0; k < 3; k++) {
      var ra = sys.rng() * Math.PI * 2, rr2 = Math.sqrt(sys.rng()) * PR;
      var gx = Math.cos(ra) * rr2, gy2 = atTop ? PR : sys.rng() * PR * 2 - PR;
      // 门限留出空档，避免均匀铺满
      if (0.58 + 0.42 * Math.sin(gx * 3.1 + 1.3) * Math.sin(gy2 * 2.7 - 0.8) > 0.34 || k === 2) {
        sys.x[i] = gx; sys.y[i] = gy2; return;
      }
    }
  }

  function stepRain(sys, dt, now, on) {
    var u = sys.mat.uniforms;
    var level = rainLevel;
    var target = on ? (level ? 0.82 : 0.58) : 0;
    u.uOpacity.value += (target - u.uOpacity.value) * Math.min(1, dt / 260);
    if (u.uOpacity.value < 0.02 && !on) { sys.obj.visible = false; return; }
    if (on) sys.obj.visible = true;

    // 阵风：密度与风速低频起伏，几秒一次
    gustPhase += dt;
    var gust = 0.72 + 0.24 * Math.sin(gustPhase * 0.00055) + 0.12 * Math.sin(gustPhase * 0.0016 + 1.2);
    gust = Math.max(0.36, Math.min(1.15, gust));
    u.uGust.value = on ? gust : 0;

    // 风向：小雨近乎垂直，暴雨明显斜；整场统一角度，不逐颗随机
    var wind = (level ? 0.34 : 0.075) + 0.05 * Math.sin(gustPhase * 0.0011);
    var wx = Math.sin(wind), wy = Math.cos(wind);
    var p = sys.pos, n = sys.count, wob = dt / 1000;
    var speedK = gust * (level ? 1.18 : 0.94);

    for (var i = 0; i < n; i++) {
      var L = sys.lay[i];
      var z = rainZones[sys.zi[i]] || rainZones[0];
      sys.y[i] -= sys.spd[i] * speedK * wob;
      sys.x[i] -= wx * sys.spd[i] * 0.55 * wob;
      // 落到雨区底边即回到雨区顶部；横向越界则绕回，避免被 zoneMask 吃掉
      if (sys.y[i] < z.y - z.w * 1.08) spawnRain(sys, i, true);
      if (sys.x[i] < z.x - z.z) sys.x[i] += z.z * 2;
      if (sys.x[i] > z.x + z.z) sys.x[i] -= z.z * 2;
      var hx = sys.x[i], hy = sys.y[i], ln = sys.len[i];
      var b = i * 6, zz = sys.zv[L];
      p[b] = hx; p[b + 1] = hy; p[b + 2] = zz;
      p[b + 3] = hx + wx * ln; p[b + 4] = hy + wy * ln; p[b + 5] = zz;
      // 局部溅射：只在近/中景、雨区下缘、概率低
      if (L < 2 && hy < z.y - z.w * 0.55 && hy > z.y - z.w * 0.9 && Math.random() < 0.05 && splashSys.obj.visible) {
        var s = splashSys.slot = (splashSys.slot + 1) % SPLASH_CAP;
        splashSys.pos[s * 3] = hx; splashSys.pos[s * 3 + 1] = hy; splashSys.pos[s * 3 + 2] = 0.01;
        splashSys.age[s] = 0;
      }
    }
    sys.geo.setDrawRange(0, n * 2);
    sys.geo.attributes.position.needsUpdate = true;
    var ax = splashSys.geo.attributes;
    for (var j = 0; j < SPLASH_CAP; j++) {
      if (splashSys.age[j] < 1) {
        splashSys.age[j] += wob / 0.42;
        if (splashSys.age[j] >= 1) { splashSys.pos[j * 3 + 1] = 9; splashSys.age[j] = 1; }
      }
    }
    ax.position.needsUpdate = true; ax.aAge.needsUpdate = true;
    splashSys.mat.uniforms.uOpacity.value = u.uOpacity.value;
  }

  function stepSnow(sys, dt, now, on) {
    var u = sys.mat.uniforms;
    u.uOpacity.value += ((on ? 0.58 : 0) - u.uOpacity.value) * Math.min(1, dt / 260);
    if (u.uOpacity.value < 0.02 && !on) { sys.obj.visible = false; return; }
    if (on) sys.obj.visible = true;
    var p = sys.pos, n = sys.count, wob = dt / 1000;
    for (var i = 0; i < n; i++) {
      var iy = i * 3 + 1;
      p[iy] -= sys.sp[i] * wob;
      // 摆动幅度与粒径相关：大颗飘得慢、摆幅大
      p[i * 3] += Math.sin(now * 0.0008 + sys.ph[i]) * 0.0018 * (0.4 + sys.ph[i] % 1) * (dt / 16.7);
      if (p[iy] < -PR) respawnSnow(sys, i, false), p[iy] = sys.y[i];
      sys.y[i] = p[iy]; sys.x[i] = p[i * 3];
    }
    sys.geo.setDrawRange(0, n);
    sys.geo.attributes.position.needsUpdate = true;
  }

  function stepPrecip(sys, dt, now, on) {
    if (sys.kind === 'rain') stepRain(sys, dt, now, on);
    else stepSnow(sys, dt, now, on);
  }

  function applyWeatherChips(i) {
    Array.prototype.forEach.call(weatherWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
    document.body.classList.remove('w-clear', 'w-cloud', 'w-rain', 'w-snow');
    if (i > 0) document.body.classList.add('w-' + WEATHERS[i][0]);
  }

  function syncFx() {
    var cover = [0.18, 0.62, 0.72, 0.60][state.weather] + fx.jitter;
    fx.cloudTarget = fx.mode === 'none' ? 0 : Math.min(0.55, Math.max(0.10, cover));
    fx.rainOn = fx.mode === 'all' && state.weather === 2;
    fx.snowOn = fx.mode === 'all' && state.weather === 3;
    if (cloudMesh) cloudMesh.visible = fx.mode !== 'none';
    updateFxState();
  }

  function rollWeather(nextSeed) {
    if (nextSeed !== undefined) fx.seed = nextSeed >>> 0;
    var rnd = mulberry32(fx.seed);
    fx.jitter = (rnd() - 0.5) * 0.14;
    var night = state.hour < 5 || state.hour >= 21;
    var dawn = state.hour >= 5 && state.hour < 8;
    var snowP = (state.season === 3 ? 0.28 : state.season === 0 ? 0.10 : 0.02) + (dawn ? 0.06 : 0);
    var rainP = (night ? 0.38 : 0.20) + (state.season === 2 ? 0.07 : 0);
    var r = rnd(), i;
    if (r < snowP) i = 3;
    else if (r < snowP + rainP) i = 2;
    else if (r < snowP + rainP + 0.28) i = 1;
    else i = 0;
    state.weather = i;
    applyWeatherChips(i);
    applyWeatherDim();
    buildCloud();
    buildZones();
    syncFx();
  }

  function updateFxState() {
    if (seedOut) seedOut.textContent = '种子 ' + (fx.seed >>> 0).toString(16).slice(0, 6);
    if (!fxState) return;
    fxState.textContent = '模拟 · ' + WEATHERS[state.weather][1] +
      (state.weather === 2 ? (rainLevel ? '（暴雨）' : '（小雨）') : '') +
      ' · 云 ' + (fx.size ? fx.size + '×' + (fx.size >> 1) : '—') +
      ' · 雨 ' + (fx.rainOn ? rainSys.count : 0) +
      ' · 雪 ' + (fx.snowOn ? snowSys.count : 0) +
      (fx.degrade ? ' · 降级' + fx.degrade : '');
  }

  /* 每帧推进：云层自转/漂移/透明度渐变，降水粒子下落与淡入淡出 */
  function updateFx(dt, now) {
    if (!cloudMat) return;
    var cu = cloudMat.uniforms;
    var target = cloudMesh.visible ? fx.cloudTarget : 0;
    if (reduce) {
      cu.uAmt.value = target;
    } else {
      cu.uAmt.value += (target - cu.uAmt.value) * Math.min(1, dt / 820);
      cloudDrift += dt * 0.000006;
      // 云层比地表（相机自转）略快：0.000029 vs 0.000025 rad/ms
      cloudMesh.rotation.y += dt * 0.000029;
    }
    cu.uDrift.value = cloudDrift;

    // 点精灵按画布物理高度换算，保证 CSS 像素下粒子大小稳定
    var px = size.h * size.dpr / (2 * Math.tan(curFov * D2R / 2));
    snowSys.mat.uniforms.uScale.value = px;
    splashSys.mat.uniforms.uScale.value = px;
    // 圆盘半径跟随当前缩放，降水只在球体附近，不铺满全屏
    precipGroup.scale.setScalar(3.45 / Math.max(1.1, curR));
    stepPrecip(rainSys, dt, now, fx.rainOn && !reduce);
    stepPrecip(snowSys, dt, now, fx.snowOn && !reduce);
  }

  function degradeFx() {
    // 两级：先砍粒子（远景层先走），仍不够再降云层分辨率；光照本身不参与降级
    if (fx.degrade >= 2) return;
    fx.degrade += 1;
    if (fx.degrade === 1) quality = 0.72;
    applyCounts();
    buildCloud();
  }

  var FXMODES = [['none', '无'], ['cloud', '仅云'], ['all', '全部']];
  FXMODES.forEach(function (m, i) {
    var b = document.createElement('button');
    b.className = 'chip' + ((fx.mode === m[0]) ? ' is-on' : '');
    b.type = 'button'; b.textContent = m[1];
    b.addEventListener('click', function () {
      fx.mode = m[0];
      Array.prototype.forEach.call(fxModesWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
      syncFx();
    });
    fxModesWrap.appendChild(b);
  });

  var reseedBtn = document.getElementById('reseed');
  if (reseedBtn) reseedBtn.addEventListener('click', function () {
    rollWeather((fx.seed ^ 0x9e3779b9) >>> 0);
  });

  /* ---------------- 日照模式 / 雨量档位 / 面板开合 ---------------- */
  var TIMEMODES = [['real', '真实时间'], ['manual', '手动时刻']];
  var RAINLEVELS = [['small', '小雨'], ['heavy', '暴雨']];
  var timeWrap = document.getElementById('timeModes');
  var rainWrap = document.getElementById('rainLevels');
  var simBadge = document.getElementById('simBadge');

  function parisHourNow() {
    var now = new Date();
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: 'numeric', minute: 'numeric', hour12: false });
      var parts = f.formatToParts ? f.formatToParts(now) : [];
      var hh = 0, mm = 0;
      parts.forEach(function (p) {
        if (p.type === 'hour') hh = parseInt(p.value, 10);
        if (p.type === 'minute') mm = parseInt(p.value, 10);
      });
      return hh + mm / 60;
    } catch (e) {
      return now.getHours() + now.getMinutes() / 60;
    }
  }

  function applyTimeMode() {
    if (timeWrap) {
      Array.prototype.forEach.call(timeWrap.children, function (c, j) {
        c.classList.toggle('is-on', TIMEMODES[j][0] === state.timeMode);
      });
    }
    if (simBadge) {
      simBadge.textContent = state.timeMode === 'real'
        ? '真实时间 · 日照按 UTC 推算'
        : '模拟 · 手动时刻';
    }
    updateSun();
  }

  if (timeWrap) {
    TIMEMODES.forEach(function (m, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (state.timeMode === m[0] ? ' is-on' : '');
      b.textContent = m[1];
      b.addEventListener('click', function () {
        state.timeMode = m[0];
        if (m[0] === 'real') {
          state.hour = Math.round(parisHourNow() * 2) / 2;
          hourEl.value = state.hour;
          applyTime();
        }
        applyTimeMode();
      });
      timeWrap.appendChild(b);
    });
  }

  if (rainWrap) {
    RAINLEVELS.forEach(function (r, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (rainLevel === i ? ' is-on' : '');
      b.textContent = r[1];
      b.addEventListener('click', function () {
        rainLevel = i;
        Array.prototype.forEach.call(rainWrap.children, function (c, j) { c.classList.toggle('is-on', j === i); });
        updateFxState();
      });
      rainWrap.appendChild(b);
    });
  }

  // 真实时间模式下每分钟刷新一次巴黎时刻，太阳方向随之缓慢移动
  setInterval(function () {
    if (state.timeMode !== 'real') return;
    state.hour = Math.round(parisHourNow() * 2) / 2;
    hourEl.value = state.hour;
    applyTime();
  }, 60000);

  var envEl = document.getElementById('env');
  var envToggle = document.getElementById('envToggle');
  var envClose = document.getElementById('envClose');

  function setPanel(open) {
    if (!envEl || !envToggle) return;
    envEl.hidden = !open;
    envToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('is-env', open);
    if (open) {
      requestAnimationFrame(function () { envEl.classList.add('is-in'); });
    } else {
      envEl.classList.remove('is-in');
    }
  }
  if (envToggle) envToggle.addEventListener('click', function () {
    setPanel(envEl.hidden);
  });
  if (envClose) envClose.addEventListener('click', function () { setPanel(false); });
  // 移动端点击面板外收起（桌面端保留面板，避免调参时误关）
  document.addEventListener('pointerdown', function (e) {
    if (window.innerWidth > 900 || !document.body.classList.contains('is-env')) return;
    if (envEl.contains(e.target) || envToggle.contains(e.target)) return;
    setPanel(false);
  });

  applyTimeMode();
  applyCounts();
  rollWeather(fx.seed);

  document.getElementById('reset').addEventListener('click', function () {
    blur();
    var s = sphericalFromVec(anchor);
    target.theta = s.theta; target.phi = s.phi; target.r = fitR; target.fov = 32;
  });

  /* ---------------- 帧循环 ---------------- */
  var last = performance.now(), acc = 0, frames = 0, fpsAvg = 60, quality = 1;
  var fpsEl = document.getElementById('fps');
  var size = { w: 0, h: 0, dpr: 1 };

  function resize() {
    size.w = window.innerWidth; size.h = window.innerHeight;
    size.dpr = Math.min(window.devicePixelRatio || 1, quality === 1 ? 2 : 1.25);
    renderer.setPixelRatio(size.dpr);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    fitR = fitRadius();
    if (!focused) { target.r = fitR; }
    applyCounts();
  }
  window.addEventListener('resize', resize);
  resize();
  curR = target.r = orbit.r = fitR;
  applyCamera();

  function projectPins() {
    var w = size.w, h = size.h;
    for (var i = 0; i < pins.length; i++) {
      var pin = pins[i];
      var n = pin.p;
      var dot = n.x * camera.position.x + n.y * camera.position.y + n.z * camera.position.z;
      dot = dot / camera.position.length();
      if (dot < 0.02) { pin.el.hidden = true; continue; }
      pin.el.hidden = false;
      var v = n.clone().project(camera);
      var x = (v.x * 0.5 + 0.5) * w;
      var y = (-v.y * 0.5 + 0.5) * h;
      pin.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) translate(-50%,-50%)';
      var edge = Math.min(1, Math.max(0, (dot - 0.02) / 0.22));
      var base = pin.item.status === 'planned' ? 0.52 : 0.96;
      pin.el.style.opacity = (base * edge).toFixed(2);
    }
  }

  var lastBreath = 0;
  function tick(now) {
    var dt = Math.min(50, now - last); last = now;
    acc += dt; frames++;
    if (acc > 500) {
      fpsAvg = frames * 1000 / acc;
      fpsEl.textContent = Math.round(fpsAvg) + ' fps';
      if (!reduce && !fx.noDegrade && frames > 8) {
        if (fpsAvg < 34 && fx.degrade < 1) { degradeFx(); resize(); }
        else if (fpsAvg < 30 && fx.degrade < 2) { degradeFx(); }
      }
      acc = 0; frames = 0;
    }

    if (!reduce && !dragging && !focused && Math.abs(target.theta - curTheta) < 0.02) {
      target.theta += 0.00042 * (dt / 16.7);
    }
    // 阻尼接近
    var k = reduce ? 0.16 : 0.075;
    curTheta += (target.theta - curTheta) * k;
    curPhi += (target.phi - curPhi) * k;
    curR += (target.r - curR) * k;
    curFov += (target.fov - curFov) * k;
    if (!reduce) {
      lastBreath += dt;
      curR += Math.sin(lastBreath / 2600) * 0.0009 * (focused ? 0 : 1);
    }

    applyCamera();
    updateFx(dt, now);
    renderer.render(scene, camera);
    projectPins();
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(function (t) {
    last = t;
    document.getElementById('loader').classList.add('is-off');
    requestAnimationFrame(tick);
  });

  // 键盘：Esc 先收面板，再退出聚焦
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (document.body.classList.contains('is-env')) setPanel(false);
    else blur();
  });

  // 便于自动化截图与排查
  window.__GLOBE__ = {
    focus: function (id) {
      var it = data.filter(function (x) { return x.id === id; })[0];
      if (it) focus(it, false);
    },
    blur: blur,
    state: state,
    fx: fx,
    setHour: function (h) {
      state.hour = Math.max(0, Math.min(23.5, h));
      hourEl.value = state.hour;
      applyTime();
    },
    setWeather: function (i) { state.weather = i; applyWeatherChips(i); applyWeatherDim(); buildCloud(); buildZones(); syncFx(); },
    setFxMode: function (m) { fx.mode = m; syncFx(); },
    setSeed: function (n) { rollWeather((n >>> 0)); },
    setTimeMode: function (m) {
      state.timeMode = m === 'manual' ? 'manual' : 'real';
      applyTimeMode();
    },
    setRainLevel: function (n) {
      rainLevel = n ? 1 : 0;
      if (rainWrap) Array.prototype.forEach.call(rainWrap.children, function (c, j) { c.classList.toggle('is-on', j === rainLevel); });
      updateFxState();
    },
    setPanel: setPanel,
    // 自动化截图用：关掉自动降级，便于核对未降级时的云层分辨率
    lockQuality: function (on) { fx.noDegrade = !!on; },
    setLight: function (c) { earthMat.uniforms.uContrast.value = Math.max(0.5, Math.min(1.8, c)); },
    info: function () {
      return {
        fps: Math.round(fpsAvg), quality: quality, dpr: size.dpr, w: size.w, h: size.h,
        hiLoaded: hiLoaded, nightLoaded: nightLoaded, tex: texState.textContent,
        fxMode: fx.mode, seed: fx.seed, cloudAmt: cloudMat ? +cloudMat.uniforms.uAmt.value.toFixed(2) : 0,
        cloudSize: fx.size, rainOn: fx.rainOn, snowOn: fx.snowOn, degrade: fx.degrade,
        rain: rainSys.count, snow: snowSys.count, rainLevel: rainLevel,
        timeMode: state.timeMode, contrast: earthMat.uniforms.uContrast.value,
        sunLat: +(state.sunLat || 0).toFixed(1), sunLon: +(state.sunLon || 0).toFixed(1),
        sun: [state.sun.x.toFixed(2), state.sun.y.toFixed(2), state.sun.z.toFixed(2)],
        panelOpen: !document.body.classList.contains('is-env') ? false : true
      };
    }
  };
})();
