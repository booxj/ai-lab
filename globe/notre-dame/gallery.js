(function () {
  'use strict';
  var stage = document.getElementById('stage');
  var stack = document.getElementById('stack');
  if (!stage || !stack) return;

  var BANDS = 16;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
  var slices = [];

  function layout() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    stack.innerHTML = '';
    slices = [];
    var step = h / BANDS;
    for (var i = 0; i < BANDS; i++) {
      var d = document.createElement('div');
      d.className = 'slice';
      d.style.top = (i * step).toFixed(2) + 'px';
      d.style.height = (step + 1.2).toFixed(2) + 'px';
      d.style.backgroundImage = "url('assets/nd-front.jpg')";
      d.style.backgroundSize = w + 'px ' + h + 'px';
      d.style.backgroundPosition = '0 ' + (-i * step).toFixed(2) + 'px';
      // 画面下部当作更近的层，上部（天空/远景）更远，形成纵深；
      // 同时按透视比例反向缩放，抵消静止时的接缝（位移仍随 Z 分层）。
      // 变换原点必须落在「舞台中心」而不是各自切片中心，否则每片缩放基准不同，
      // 切片边界会错开 1–4px 露出横缝。
      var D = 1000;
      var depth = (BANDS - 1 - i) / (BANDS - 1);
      var z = depth * 22 - 11;
      d.style.transformOrigin = '50% ' + (h / 2 - i * step).toFixed(2) + 'px';
      d.style.transform = 'translateZ(' + z.toFixed(3) + 'px) scale(' + ((D - z) / D).toFixed(6) + ')';
      stack.appendChild(d);
      slices.push(d);
    }
    stack.style.transform = '';
  }

  var canParallax = !reduce && !coarse;

  function move(e) {
    if (!canParallax) return;
    var r = stage.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    stack.style.transform =
      'rotateY(' + (px * 3.4).toFixed(2) + 'deg) rotateX(' + (-py * 2.6).toFixed(2) + 'deg)';
  }

  function leave() {
    if (!canParallax) return;
    stack.style.transform = 'rotateY(0deg) rotateX(0deg)';
  }

  if (coarse || reduce) {
    stack.classList.add('stack--kenburns');
    var hint = document.querySelector('.hero__hint');
    if (hint) hint.textContent = reduce ? '已按系统偏好关闭位移，改为静止画面'
      : '移动端改为缓推镜头（不开重位移）';
  }
  if (canParallax) {
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerleave', leave);
  }

  layout();
  window.addEventListener('resize', layout);

  window.__ND_GALLERY__ = {
    info: function () {
      return {
        bands: slices.length, coarse: coarse, reduce: reduce,
        parallax: canParallax, transform: stack.style.transform
      };
    },
    // 自动化截图用：设置固定视角，便于对比两帧位移
    setAngle: function (x, y) {
      stack.style.transform = 'rotateY(' + (+x).toFixed(2) + 'deg) rotateX(' + (+y).toFixed(2) + 'deg)';
    }
  };
})();
