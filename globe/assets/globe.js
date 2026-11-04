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
    var H = (state.hour - 12) * 15 * D2R;
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
  }

  /* ---------------- 地球：昼夜合成着色 ---------------- */
  var dayUniforms = null;
  var earthMat = new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: null },
      uNight: { value: null },
      uNightAmt: { value: 0.9 },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
      uDim: { value: 1 }
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
      '  day *= (0.26 + 1.02 * max(d, 0.0));',
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
      if (!reduce && frames > 8) {
        if (fpsAvg < 34 && quality === 1) { quality = 0.72; resize(); }
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
    if (earthMat.uniforms.uSun.value) { /* 已在 updateSun 更新 */ }
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
    info: function () { return { fps: Math.round(fpsAvg), quality: quality, dpr: size.dpr, w: size.w, h: size.h, hiLoaded: hiLoaded, nightLoaded: nightLoaded, tex: texState.textContent }; }
  };
})();
