/* AURA — 共享交互层：声音开关、进场揭示、页面转场 */

(function () {
  /* ---- 进场揭示 ---- */
  function initReveal(root) {
    const items = (root || document).querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const el = e.target;
            const delay = parseFloat(el.dataset.delay || 0);
            setTimeout(() => el.classList.add('is-in'), delay * 1000);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    items.forEach((el) => io.observe(el));
  }

  /* ---- 声音开关 ---- */
  let toastTimer;
  function showToast(msg) {
    let el = document.querySelector('.audio-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'audio-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function initSound(theme) {
    const btn = document.querySelector('.sound-toggle');
    if (!btn) return;
    const bars = btn.querySelector('.bars');

    const paint = () => {
      const on = window.Audio && !window.Audio.muted;
      btn.classList.toggle('is-on', on);
      btn.classList.toggle('is-off', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const label = btn.querySelector('.label');
      if (label) label.textContent = on ? '声音开' : '声音关';
    };

    const start = () => {
      if (!window.Audio) return;
      window.Audio.init();
      window.Audio.play(theme);
      if (window.Audio.muted) window.Audio.setMuted(false);
      paint();
    };

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!window.Audio) return;
      if (!window.Audio.init()) return;
      if (!window.Audio.theme) {
        window.Audio.play(theme);
        window.Audio.setMuted(false);
        showToast('配乐已启动 · ' + theme.toUpperCase());
      } else {
        window.Audio.setMuted(!window.Audio.muted);
        showToast(window.Audio.muted ? '已静音' : '声音开启');
      }
      paint();
    });

    // 首次任意交互即启动（浏览器自动播放策略）
    const once = () => {
      start();
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
      window.removeEventListener('wheel', once);
    };
    window.addEventListener('pointerdown', once, { passive: true });
    window.addEventListener('keydown', once);
    window.addEventListener('wheel', once, { passive: true });

    paint();
    if (bars) {
      bars.addEventListener('mouseenter', () => {
        if (window.Audio) window.Audio.sfx('hover');
      });
    }
  }

  /* ---- 返回展馆 ---- */
  function initBack() {
    const el = document.querySelector('.back-hall');
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Audio) window.Audio.sfx('back');
      document.body.classList.add('is-leaving');
      setTimeout(() => { window.location.href = el.getAttribute('href'); }, 420);
    });
  }

  window.AURACore = { initReveal, initSound, initBack, showToast };
  document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initBack();
  });
})();
