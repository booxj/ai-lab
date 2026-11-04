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

  function updateSun() {
    var lat = 48.853 * D2R;
    var decl = seasonDecl[state.season] * D2R;
    // 页面时刻是巴黎钟表时间（含夏令时），换算成太阳时角：经度 2.35°E ≈ 0.16h，夏令时 +1h
    var H = (state.hour - 12 - 1.15 - 2.3499 / 15) * 15 * D2R;
    var alt = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H));
    var cosAz = (Math.sin(decl) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) + 1e-6);
    cosAz = Math.max(-1, Math.min(1, cosAz));
    var az = H > 0 ? (2 * Math.PI - Math.acos(cosAz)) : Math.acos(cosAz);
    var up = anchor.clone();
    var north = new THREE.Vector3(0, 1, 0).sub(up.clone().multiplyScalar(up.y)).normalize();
    var east = new THREE.Vector3().crossVectors(north, up).normalize();
    var dir = up.multiplyScalar(Math.sin(alt))
      .add(north.multiplyScalar(Math.cos(alt) * Math.cos(az)))
      .add(east.multiplyScalar(Math.cos(alt) * Math.sin(az)))
      .normalize();
    state.sun.copy(dir);
    state.night = alt < -0.02 ? 1 : 0;
    if (dayUniforms) dayUniforms.uSun.value.copy(dir);
    if (cloudMat) cloudMat.uniforms.uSun.value.copy(dir);
  }

  /* ---------------- 地球：昼夜合成着色 ---------------- */
  var dayUniforms = null;
  var earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: null },
      uNight: { value: null },
      uNightAmt: { value: 0.9 },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uDim: { value: 1 },
      uContrast: { value: 1.0 }
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
      '  float dayMix = smoothstep(-0.22, 0.26, d);',
      '  vec3 day = texture2D(uDay, vUv).rgb;',
      '  float amb = 0.42 - 0.18 * uContrast;',
      '  float gain = 0.58 + 0.28 * uContrast;',
      '  day *= (amb + gain * max(d, 0.0));',
      '  vec3 night = texture2D(uNight, vUv).rgb;',
      '  night = pow(night, vec3(0.82)) * 1.35;',
      '  vec3 col = mix(night * uNightAmt, day, dayMix);',
      '  float term = smoothstep(0.36, 0.0, abs(d - 0.015));',
      '  col += vec3(1.0, 0.52, 0.24) * term * 0.085;',
      '  vec3 vd = normalize(cameraPosition - vP);',
      '  float fres = pow(1.0 - clamp(dot(n, vd), 0.0, 1.0), 3.0);',
      '  col += vec3(0.30, 0.46, 0.68) * fres * (0.52 * dayMix + 0.10);',
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
  var cardEnter = document.getElementById('cardEnter');
  var hoverTimer = null;

  var THUMBS = {
    'notre-dame': '<img src="assets/thumbs/notre-dame.jpg" alt="巴黎圣母院西立面近景" loading="lazy">'
  };

  function focus(item, fromHover) {
    clearTimeout(hoverTimer);
    focused = item;
    var sp = sphericalFromVec(pins.filter(function (x) { return x.item === item; })[0].p);
    target.theta = sp.theta;
    target.phi = Math.max(0.22, Math.min(Math.PI - 0.22, sp.phi));
    target.r = fitR * 0.75;
    target.fov = 29;

    cardThumb.innerHTML = THUMBS[item.thumb] || THUMBS['notre-dame'];
    cardGeo.textContent = item.countryEn + ' / ' + item.cityEn;
    cardName.textContent = item.name;
    cardEn.textContent = item.nameEn;
    cardBlurb.textContent = item.blurb;
    if (item.status === 'open') {
      cardState.textContent = '已建成 · 场景可进入';
      cardEnter.hidden = false;
      cardEnter.href = item.slug + '/index.html';
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
  var fx = {
    mode: reduce ? 'cloud' : 'all', seed: 20261104, jitter: 0,
    cloudTarget: 0, rainOn: false, snowOn: false, degraded: false, size: 0, noDegrade: false
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
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  }

  function buildCloud() {
    var size = fx.degraded ? 512 : 1024;
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
          ' float a1 = texture2D(uCloud, vec2(vUv.x + uDrift, vUv.y)).a;',
          ' float a2 = texture2D(uCloud, vec2(vUv.x * 2.7 - uDrift * 1.6, vUv.y * 1.8 + 0.17)).a;',
          ' float a = clamp(a1 * 0.95 + a2 * 0.45, 0.0, 1.0);',
          ' a = a * a * (3.0 - 2.0 * a);',
          ' float d = dot(normalize(vN), normalize(uSun));',
          ' float lit = 0.34 + 0.90 * max(d, 0.0);',
          ' vec3 col = vec3(0.94, 0.96, 1.0) * lit * uDim;',
          ' gl_FragColor = vec4(col, a * uAmt);',
          '}'
        ].join('\n')
      });
      cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(1.018, 96, 60), cloudMat);
      cloudMesh.renderOrder = 2;
      scene.add(cloudMesh);
    }
    cloudMat.uniforms.uCloud.value = cloudTex;
    updateFxState();
  }

  /* 降水：屏幕对齐的圆盘内粒子，随相机推近缩放，只在可见半球范围 */
  var PR = 1.0;
  var precipGroup = new THREE.Group();
  precipGroup.position.set(0, 0, -3.0);
  camera.add(precipGroup);

  function precipMaterial(kind) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uSize: { value: kind === 'rain' ? 0.030 : 0.011 },
        uScale: { value: 700 }, uOpacity: { value: 0 }, uR: { value: PR },
        uVar: { value: kind === 'rain' ? 0.22 : 1.10 }
      },
      vertexShader: [
        'attribute float aPhase;',
        'uniform float uSize, uScale, uR, uVar;',
        'varying float vA;',
        'void main(){',
        ' vec3 p = position;',
        ' float ny = (p.y + uR) / (uR * 2.0);',
        ' float rn = length(p.xy) / uR;',
        ' vA = smoothstep(1.0, 0.86, ny) * smoothstep(0.0, 0.16, ny) * smoothstep(1.0, 0.80, rn);',
        ' float jit = 1.0 + uVar * (fract(aPhase * 7.13) - 0.5);',
        ' vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        ' gl_PointSize = uSize * jit * (uScale / max(0.6, -mv.z));',
        ' gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: (kind === 'rain' ? [
        'uniform float uOpacity; varying float vA;',
        'void main(){',
        ' vec2 c = gl_PointCoord;',
        ' float ax = smoothstep(0.10, 0.015, abs(c.x - 0.5));',
        ' float ay = smoothstep(0.0, 0.12, c.y) * smoothstep(1.0, 0.80, c.y);',
        ' float a = ax * ay * vA * uOpacity;',
        ' if (a < 0.01) discard;',
        ' gl_FragColor = vec4(vec3(0.80, 0.88, 1.0), a);',
        '}'
      ] : [
        'uniform float uOpacity; varying float vA;',
        'void main(){',
        ' float d = length(gl_PointCoord - vec2(0.5));',
        ' float a = smoothstep(0.5, 0.06, d) * vA * uOpacity;',
        ' if (a < 0.01) discard;',
        ' gl_FragColor = vec4(vec3(0.92, 0.96, 1.0), a);',
        '}'
      ]).join('\n')
    });
  }

  function buildPrecip(kind, max) {
    var pos = new Float32Array(max * 3), ph = new Float32Array(max), sp = new Float32Array(max);
    var rr = mulberry32(fx.seed ^ (kind === 'rain' ? 0x1234 : 0xabcd));
    for (var i = 0; i < max; i++) {
      var rad = PR * Math.sqrt(rr()), ang = rr() * Math.PI * 2;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = rr() * PR * 2 - PR;
      pos[i * 3 + 2] = 0;
      ph[i] = rr() * Math.PI * 2;
      sp[i] = kind === 'rain' ? 1.5 + rr() * 0.95 : 0.16 + rr() * 0.14;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    geo.setDrawRange(0, 0);
    var pts = new THREE.Points(geo, precipMaterial(kind));
    pts.frustumCulled = false; pts.renderOrder = 7; pts.visible = false;
    precipGroup.add(pts);
    return { kind: kind, pts: pts, geo: geo, mat: pts.material, pos: pos, ph: ph, sp: sp,
             max: max, count: 0, rr: mulberry32(fx.seed ^ (kind === 'rain' ? 0x9e37 : 0x77)) };
  }
  var rainSys = buildPrecip('rain', 1200);
  var snowSys = buildPrecip('snow', 620);

  function applyCounts() {
    var q = fx.degraded ? 0.58 : 1;
    var mobile = window.innerWidth <= 700 ? 0.72 : 1;
    rainSys.count = Math.round(rainSys.max * q * mobile);
    snowSys.count = Math.round(snowSys.max * q * mobile);
    rainSys.geo.setDrawRange(0, rainSys.count);
    snowSys.geo.setDrawRange(0, snowSys.count);
    updateFxState();
  }

  function stepPrecip(sys, dt, now, on) {
    var u = sys.mat.uniforms;
    var target = on ? (sys.kind === 'rain' ? 0.72 : 0.58) : 0;
    u.uOpacity.value += (target - u.uOpacity.value) * Math.min(1, dt / 220);
    if (u.uOpacity.value < 0.02 && !on) { sys.pts.visible = false; return; }
    if (on) sys.pts.visible = true;
    var p = sys.pos, n = sys.count, R = PR, wob = dt / 1000;
    for (var i = 0; i < n; i++) {
      var iy = i * 3 + 1;
      p[iy] -= sys.sp[i] * wob;
      if (p[iy] < -R) {
        p[iy] = R;
        p[i * 3] = (sys.rr() * 2 - 1) * R;
        p[i * 3 + 2] = 0;
      }
      if (sys.kind === 'snow') p[i * 3] += Math.sin(now * 0.0008 + sys.ph[i]) * 0.0016 * (dt / 16.7);
    }
    sys.geo.attributes.position.needsUpdate = true;
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
    syncFx();
  }

  function updateFxState() {
    if (seedOut) seedOut.textContent = '种子 ' + (fx.seed >>> 0).toString(16).slice(0, 6);
    if (!fxState) return;
    fxState.textContent = '云 ' + (fx.size ? fx.size + '×' + (fx.size >> 1) : '—') +
      ' · 雨 ' + rainSys.count + ' · 雪 ' + snowSys.count + (fx.degraded ? ' · 降级' : '');
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
      cloudDrift += dt * 0.000009;
      cloudMesh.rotation.y += dt * 0.0000022;
    }
    cu.uDrift.value = cloudDrift;

    // 点精灵按画布物理高度换算，保证 CSS 像素下粒子大小稳定
    var px = size.h * size.dpr / (2 * Math.tan(curFov * D2R / 2));
    rainSys.mat.uniforms.uScale.value = px;
    snowSys.mat.uniforms.uScale.value = px;
    // 圆盘半径跟随当前缩放，降水只在球体附近，不铺满全屏
    precipGroup.scale.setScalar(3.45 / Math.max(1.1, curR));
    stepPrecip(rainSys, dt, now, fx.rainOn && !reduce);
    stepPrecip(snowSys, dt, now, fx.snowOn && !reduce);
  }

  function degradeFx() {
    if (fx.degraded) return;
    fx.degraded = true;
    buildCloud();
    applyCounts();
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
        if (fpsAvg < 34 && quality === 1) { quality = 0.72; resize(); degradeFx(); }
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

  // 键盘：Esc 返回远景
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') blur(); });

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
    setWeather: function (i) { state.weather = i; applyWeatherChips(i); applyWeatherDim(); syncFx(); },
    setFxMode: function (m) { fx.mode = m; syncFx(); },
    setSeed: function (n) { rollWeather((n >>> 0)); },
    // 自动化截图用：关掉自动降级，便于核对未降级时的云层分辨率
    lockQuality: function (on) { fx.noDegrade = !!on; },
    setLight: function (c) { earthMat.uniforms.uContrast.value = Math.max(0.5, Math.min(1.8, c)); },
    info: function () {
      return {
        fps: Math.round(fpsAvg), quality: quality, dpr: size.dpr, w: size.w, h: size.h,
        hiLoaded: hiLoaded, nightLoaded: nightLoaded, tex: texState.textContent,
        fxMode: fx.mode, seed: fx.seed, cloudAmt: cloudMat ? +cloudMat.uniforms.uAmt.value.toFixed(2) : 0,
        cloudSize: fx.size, rainOn: fx.rainOn, snowOn: fx.snowOn, degraded: fx.degraded,
        rain: rainSys.count, snow: snowSys.count, contrast: earthMat.uniforms.uContrast.value,
        sun: [state.sun.x.toFixed(2), state.sun.y.toFixed(2), state.sun.z.toFixed(2)]
      };
    }
  };
})();
