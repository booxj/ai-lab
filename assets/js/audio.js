/* AURA — 程序化配乐引擎
 * 四套主题 + 展馆环境音，全部由 Web Audio 实时合成，无外部音频文件。
 * 用法：Audio.init()（需用户手势）→ Audio.play('hall'|'paper'|'cinema'|'deck'|'arcade')
 */

const Audio = (() => {
  const THEMES = ['hall', 'paper', 'cinema', 'deck', 'arcade'];
  const state = {
    ctx: null,
    master: null,
    comp: null,
    wet: null, // convolver reverb send
    delay: null, // delay send
    theme: null,
    themeGain: null,
    nodes: [], // 主题持续节点（切主题时停止）
    muted: false,
    volume: 0.75,
    started: false,
    step: 0,
    nextTime: 0,
    timer: null,
    bpm: 90,
    scale: null,
  };

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- 基础构件 ---------- */

  function pulseWave(ctx, duty) {
    // 脉冲波（方波可调占空比），用于 chiptune
    const n = 24;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) {
      real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  function noiseBuffer(ctx, seconds = 2) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function makeIR(ctx, seconds, decay, bright) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.pow(1 - t, decay);
        const n = (Math.random() * 2 - 1) * env;
        // 一阶低通让混响尾巴更暗
        d[i] = c === 0 ? n : n * 0.92;
      }
    }
    return buf;
  }

  /* ---------- 发声原语 ---------- */

  function env(gain, t, { a = 0.005, d = 0.2, s = 0, r = 0.3, peak = 1, dur = 0.3 }) {
    const g = gain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.exponentialRampToValueAtTime(Math.max(peak * s, 0.0001), t + a + d);
    const sus = Math.max(t + a + d, t + dur);
    g.setValueAtTime(Math.max(peak * s, 0.0001), sus);
    g.exponentialRampToValueAtTime(0.0001, sus + r);
  }

  function bus(dur, t) {
    // 一个声部：osc -> filter -> gain -> panner -> (dry | reverb | delay)
    const ctx = state.ctx;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 18000;
    filt.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const pan = ctx.createStereoPanner();
    gain.connect(filt).connect(pan);
    pan.connect(state.themeGain);
    const send = ctx.createGain();
    send.gain.value = 0;
    pan.connect(send).connect(state.wet);
    const dsend = ctx.createGain();
    dsend.gain.value = 0;
    pan.connect(dsend).connect(state.delay.input);
    return { filt, gain, pan, send, dsend, dur, t };
  }

  function stopBus(b, at) {
    try {
      b.gain.gain.cancelScheduledValues(at);
      b.gain.gain.setValueAtTime(b.gain.gain.value, at);
      b.gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    } catch (e) {}
  }

  function tone(t, opts = {}) {
    const ctx = state.ctx;
    const {
      freq = 440,
      type = 'sine',
      dur = 0.4,
      peak = 0.2,
      a = 0.005,
      d = 0.15,
      s = 0.6,
      r = 0.3,
      cutoff = 18000,
      q = 0.8,
      pan = 0,
      rev = 0.25,
      dly = 0,
      detune = 0,
      wave = null,
    } = opts;
    const b = bus(dur, t);
    b.filt.frequency.setValueAtTime(cutoff, t);
    b.send.gain.value = rev;
    b.dsend.gain.value = dly;
    b.pan.pan.value = pan;
    env(b.gain, t, { a, d, s, r, peak, dur });
    const osc = ctx.createOscillator();
    if (wave) osc.setPeriodicWave(wave);
    else osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (detune) osc.detune.setValueAtTime(detune, t);
    osc.connect(b.gain);
    osc.start(t);
    osc.stop(t + dur + r + 0.15);
    return b;
  }

  function fm(t, opts = {}) {
    const ctx = state.ctx;
    const {
      freq = 440,
      ratio = 2,
      index = 300,
      dur = 0.6,
      peak = 0.2,
      decay = 0.5,
      rev = 0.3,
      dly = 0,
      pan = 0,
    } = opts;
    const carrier = ctx.createOscillator();
    carrier.frequency.value = freq;
    const mod = ctx.createOscillator();
    mod.frequency.value = freq * ratio;
    const modGain = ctx.createGain();
    modGain.gain.setValueAtTime(index, t);
    modGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    mod.connect(modGain).connect(carrier.frequency);

    const b = bus(dur, t);
    b.send.gain.value = rev;
    b.dsend.gain.value = dly;
    b.pan.pan.value = pan;
    env(b.gain, t, { a: 0.004, d: decay, s: 0, r: 0.25, peak, dur: dur * 0.4 });
    carrier.connect(b.gain);
    carrier.start(t);
    mod.start(t);
    carrier.stop(t + dur + 0.4);
    mod.stop(t + dur + 0.4);
    return b;
  }

  function noise(t, opts = {}) {
    const ctx = state.ctx;
    const {
      dur = 0.15,
      peak = 0.15,
      type = 'highpass',
      freq = 6000,
      q = 1,
      a = 0.002,
      d = 0.06,
      s = 0,
      r = 0.08,
      rev = 0.2,
      pan = 0,
      rate = 1,
    } = opts;
    const src = ctx.createBufferSource();
    src.buffer = state.noiseBuf;
    src.playbackRate.value = rate;
    const b = bus(dur, t);
    b.filt.type = type;
    b.filt.frequency.setValueAtTime(freq, t);
    b.filt.Q.value = q;
    b.send.gain.value = rev;
    b.pan.pan.value = pan;
    env(b.gain, t, { a, d, s, r, peak, dur });
    src.connect(b.gain);
    src.start(t);
    src.stop(t + dur + r + 0.1);
    return b;
  }

  function kick(t, opts = {}) {
    const ctx = state.ctx;
    const { freq = 120, drop = 44, dur = 0.4, peak = 0.6, rev = 0.08 } = opts;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(drop, t + 0.09);
    const b = bus(dur, t);
    b.send.gain.value = rev;
    env(b.gain, t, { a: 0.002, d: 0.12, s: 0, r: 0.1, peak, dur: 0.18 });
    osc.connect(b.gain);
    osc.start(t);
    osc.stop(t + dur);
    // 点击瞬态
    noise(t, { dur: 0.03, peak: peak * 0.25, type: 'bandpass', freq: 1800, q: 1.2, rev: 0.05 });
  }

  function snare(t, opts = {}) {
    const { peak = 0.32, dur = 0.22, rev = 0.24, freq = 1800 } = opts;
    noise(t, { dur, peak, type: 'bandpass', freq, q: 0.9, a: 0.001, d: dur * 0.6, r: 0.12, rev });
    tone(t, { freq: 190, type: 'triangle', dur: 0.09, peak: peak * 0.35, r: 0.06, rev: 0.1 });
  }

  function hat(t, opts = {}) {
    const { peak = 0.1, dur = 0.06, freq = 9000, open = false } = opts;
    noise(t, { dur, peak, type: 'highpass', freq, q: 0.7, a: 0.001, d: dur * 0.5, r: open ? 0.18 : 0.03, rev: 0.1 });
  }

  function shaker(t, opts = {}) {
    const { peak = 0.07, dur = 0.09 } = opts;
    noise(t, { dur, peak, type: 'bandpass', freq: 6200, q: 0.6, a: 0.004, d: dur * 0.7, r: 0.05, rev: 0.12 });
  }

  function rim(t, opts = {}) {
    const { peak = 0.16 } = opts;
    tone(t, { freq: 1750, type: 'square', dur: 0.03, peak: peak * 0.5, r: 0.02, rev: 0.18, cutoff: 5000 });
    noise(t, { dur: 0.04, peak, type: 'highpass', freq: 4000, r: 0.03, rev: 0.2 });
  }

  /* ---------- 持续节点（pad / drone / 磁带底噪） ---------- */

  function startPad(t, { freq, type = 'sawtooth', cutoff = 900, peak = 0.05, rev = 0.6, detune = 7, attack = 1.5, dur = 8 }) {
    const ctx = state.ctx;
    const b = bus(dur, t);
    b.filt.frequency.setValueAtTime(cutoff, t);
    b.filt.Q.value = 0.9;
    b.send.gain.value = rev;
    env(b.gain, t, { a: attack, d: dur * 0.5, s: 0.75, r: dur * 0.4, peak, dur: dur * 0.6 });
    const oscs = [];
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = (i - 1) * detune;
      o.connect(b.gain);
      o.start(t);
      o.stop(t + dur + 2);
      oscs.push(o);
    }
    // 缓慢滤波扫动
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = cutoff * 0.45;
    lfo.connect(lg).connect(b.filt.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 2);
    state.nodes.push({ stop: (at) => { oscs.forEach((o) => { try { o.stop(at); } catch (e) {} }); try { lfo.stop(at); } catch (e) {} } });
    return b;
  }

  function startCrackle(t) {
    // 磁带底噪 / 房间底噪
    const ctx = state.ctx;
    const src = ctx.createBufferSource();
    src.buffer = state.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    src.connect(f).connect(g).connect(state.themeGain);
    src.start(t);
    state.nodes.push({ stop: (at) => { try { src.stop(at); } catch (e) {} } });
  }

  function startDrone(t, { freq, peak = 0.07, cutoff = 220, rev = 0.4 }) {
    const ctx = state.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq / 2;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    f.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 2.5);
    const g2 = ctx.createGain();
    g2.gain.value = 0.6;
    o.connect(f);
    o2.connect(g2).connect(f);
    f.connect(g).connect(state.themeGain);
    const send = ctx.createGain();
    send.gain.value = rev;
    g.connect(send).connect(state.wet);
    o.start(t);
    o2.start(t);
    state.nodes.push({ stop: (at) => { try { o.stop(at); o2.stop(at); } catch (e) {} } });
  }

  /* ---------- 主题定义 ---------- */
  // 每个主题: { bpm, reverb, delayTime, delayFb, setup(ctx,t), tick(step, t) }
  // step 为 16 分音符计数。

  const themes = {
    /* ===== HALL：展馆环境 — 低频 drone + 稀疏玻璃钟声 ===== */
    hall: {
      bpm: 58,
      reverb: 3.6,
      delayTime: 0.0,
      setup(t) {
        startDrone(t, { freq: midi(38), peak: 0.09, cutoff: 190, rev: 0.5 });
        startDrone(t, { freq: midi(50), peak: 0.035, cutoff: 420, rev: 0.6 });
        startPad(t, { freq: midi(57), type: 'triangle', cutoff: 700, peak: 0.028, rev: 0.8, attack: 4, dur: 14 });
        startCrackle(t);
      },
      tick(step, t) {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        if (s === 0 && bar % 4 === 0) {
          fm(t, { freq: midi(57), ratio: 2.01, index: 240, dur: 4, peak: 0.055, decay: 2.2, rev: 0.9 });
          fm(t, { freq: midi(69), ratio: 3.02, index: 130, dur: 3, peak: 0.022, decay: 1.6, rev: 0.9, pan: 0.35 });
        }
        if (s === 0 && bar % 8 === 4) {
          fm(t, { freq: midi(62), ratio: 1.5, index: 180, dur: 5, peak: 0.045, decay: 3, rev: 0.95 });
        }
        if (s === 8 && bar % 2 === 1) {
          noise(t, { dur: 1.2, peak: 0.012, type: 'lowpass', freq: 600, a: 0.6, d: 0.5, s: 0, r: 0.3, rev: 0.7 });
        }
        if (s === 6 && Math.random() < 0.25) {
          fm(t, { freq: midi(74 + pick([0, 3, 5, 7])), ratio: 5, index: 60, dur: 1.2, peak: 0.012, decay: 0.8, rev: 0.95, pan: rnd(-0.6, 0.6) });
        }
      },
    },

    /* ===== PAPER：纸境 Lo-fi — 电钢 + 磁带底噪 + 沙锤 ===== */
    paper: {
      bpm: 84,
      reverb: 1.4,
      delayTime: 0.28,
      delayFb: 0.22,
      chords: [
        [53, 57, 60, 64], // Fmaj7
        [48, 55, 60, 64], // Cmaj7/E
        [50, 57, 60, 65], // Dm9
        [46, 53, 58, 62], // Bb6/9
      ],
      setup(t) {
        startCrackle(t);
        startPad(t, { freq: midi(41), type: 'triangle', cutoff: 380, peak: 0.022, rev: 0.5, attack: 3, dur: 12 });
      },
      tick(step, t) {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        const ch = this.chords[bar % this.chords.length];
        // 和弦垫
        if (s === 0) ch.forEach((m, i) => fm(t, { freq: midi(m), ratio: 2, index: 110, dur: 2.4, peak: 0.028, decay: 1.1, rev: 0.55, pan: (i - 1.5) * 0.22 }));
        // 电钢琶音
        if (s % 2 === 0) {
          const seq = [0, 2, 1, 3, 2, 1, 0, 3];
          const m = ch[seq[(step / 2) % seq.length]] + (Math.random() < 0.12 ? 12 : 0);
          fm(t, { freq: midi(m + 12), ratio: 2, index: 90, dur: 0.9, peak: 0.055, decay: 0.42, rev: 0.45, dly: 0.22 });
        }
        // 贝斯
        if (s === 0 || s === 6 || s === 10) {
          tone(t, { freq: midi(ch[0] - 12), type: 'triangle', dur: 0.5, peak: 0.16, cutoff: 400, r: 0.2, rev: 0.12 });
        }
        // 鼓
        if (s === 0 || s === 10) kick(t, { peak: 0.5, rev: 0.05 });
        if (s === 4 || s === 12) snare(t, { peak: 0.2, rev: 0.22 });
        if (s % 2 === 1) shaker(t, { peak: s % 4 === 3 ? 0.055 : 0.03, dur: 0.07 });
      },
    },

    /* ===== CINEMA：放映厅 — 弦乐 pad + 太鼓 + 反向镲 ===== */
    cinema: {
      bpm: 72,
      reverb: 4.2,
      delayTime: 0.0,
      prog: [
        [48, 55, 60, 64], // Cm
        [44, 51, 56, 60], // Ab
        [51, 58, 63, 67], // Eb
        [46, 53, 58, 62], // Bb
      ],
      setup(t) {
        startDrone(t, { freq: midi(36), peak: 0.075, cutoff: 160, rev: 0.4 });
        startCrackle(t);
      },
      tick(step, t) {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        const ch = this.prog[bar % this.prog.length];
        if (s === 0) {
          ch.forEach((m, i) => {
            startPad(t, { freq: midi(m), type: 'sawtooth', cutoff: 420 + i * 60, peak: 0.028, rev: 0.75, attack: 1.8, dur: 6, detune: 9 });
          });
        }
        // 太鼓
        if (s === 0 || s === 10) {
          const osc = state.ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(48, t + 0.16);
          const b = bus(0.5, t);
          b.send.gain.value = 0.16;
          env(b.gain, t, { a: 0.002, d: 0.2, s: 0, r: 0.16, peak: 0.72, dur: 0.28 });
          osc.connect(b.gain);
          osc.start(t);
          osc.stop(t + 0.6);
          noise(t, { dur: 0.08, peak: 0.1, type: 'bandpass', freq: 400, q: 0.8, rev: 0.2 });
        }
        if (s === 8 && bar % 2 === 1) kick(t, { peak: 0.28, freq: 90, drop: 40, rev: 0.1 });
        // 反向镲
        if (s === 12 && bar % 2 === 0) {
          noise(t, { dur: 0.9, peak: 0.05, type: 'highpass', freq: 5200, a: 0.5, d: 0.3, s: 0.6, r: 0.5, rev: 0.4 });
        }
        // 主旋律（弦乐式长音）
        const mel = [0, 0, 3, 3, 5, 5, 3, 2];
        if (s === 4) {
          const m = ch[mel[bar % mel.length]] + 12;
          fm(t, { freq: midi(m), ratio: 2.005, index: 260, dur: 2.2, peak: 0.05, decay: 1.2, rev: 0.6, pan: 0.2 });
        }
        if (s === 14 && bar % 4 === 3) {
          noise(t, { dur: 2.4, peak: 0.02, type: 'bandpass', freq: 900, q: 1.6, a: 1.6, d: 0.4, s: 0.5, r: 0.5, rev: 0.5 });
        }
      },
    },

    /* ===== DECK：包豪斯 — 马林巴 boogie + 弹跳贝斯 ===== */
    deck: {
      bpm: 104,
      reverb: 1.1,
      delayTime: 0.2,
      delayFb: 0.16,
      prog: [
        [50, 54, 57, 59], // Dm7
        [45, 48, 52, 55], // A7
        [47, 50, 54, 57], // Bbmaj7
        [43, 47, 50, 52], // G7
      ],
      melody: [
        [0, 4, 7, 4, 9, 7, 4, 2],
        [0, 4, 7, 11, 9, 7, 4, 2],
        [0, 5, 9, 5, 7, 11, 9, 5],
        [0, 4, 7, 9, 11, 9, 7, 4],
      ],
      setup(t) {
        startPad(t, { freq: midi(38), type: 'sawtooth', cutoff: 320, peak: 0.018, rev: 0.35, attack: 2, dur: 10 });
      },
      tick(step, t) {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        const ch = this.prog[bar % this.prog.length];
        // 马林巴
        const mel = this.melody[bar % this.melody.length];
        if (s % 2 === 0) {
          const idx = Math.floor(s / 2);
          const deg = mel[idx % mel.length];
          const root = ch[0] - 12;
          const m = root + deg;
          const b = bus(0.5, t);
          b.send.gain.value = 0.3;
          const o = state.ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = midi(m);
          const o2 = state.ctx.createOscillator();
          o2.type = 'sine';
          o2.frequency.value = midi(m) * 3.01;
          const g2 = state.ctx.createGain();
          g2.gain.value = 0.22;
          o2.connect(g2).connect(b.gain);
          env(b.gain, t, { a: 0.002, d: 0.18, s: 0, r: 0.16, peak: 0.075, dur: 0.22 });
          o.connect(b.gain);
          o.start(t); o.stop(t + 0.5);
          o2.start(t); o2.stop(t + 0.5);
        }
        // 弹跳贝斯
        if (s % 2 === 0) {
          const m = ch[0] - 24 + (s === 6 || s === 14 ? 7 : 0);
          tone(t, { freq: midi(m), type: 'square', dur: 0.16, peak: 0.11, cutoff: 900, r: 0.08, rev: 0.1 });
        }
        // 鼓组
        if (s === 0 || s === 8) kick(t, { peak: 0.55, rev: 0.05 });
        if (s === 4 || s === 12) snare(t, { peak: 0.24, rev: 0.18, freq: 2400 });
        if (s % 2 === 0) hat(t, { peak: 0.05, dur: 0.05 });
        if (s === 15) hat(t, { peak: 0.04, dur: 0.04, open: true });
        if (s === 0 && bar % 4 === 0) rim(t, { peak: 0.12 });
        // 和弦切分
        if (s === 6 || s === 14) {
          ch.forEach((m, i) => fm(t, { freq: midi(m + 12), ratio: 2, index: 120, dur: 0.4, peak: 0.022, decay: 0.2, rev: 0.3, pan: (i - 1.5) * 0.25 }));
        }
      },
    },

    /* ===== ARCADE：街机 — 脉冲波 chiptune ===== */
    arcade: {
      bpm: 160,
      reverb: 0.7,
      delayTime: 0.18,
      delayFb: 0.3,
      setup(t) {
        state.pulse25 = pulseWave(state.ctx, 0.25);
        state.pulse12 = pulseWave(state.ctx, 0.125);
      },
      tick(step, t) {
        const s = step % 16;
        const bar = Math.floor(step / 16) % 8;
        const bassSeq = [0, 0, 3, 0, 5, 5, 3, 0];
        const leadSeq = [
          [0, 3, 7, 10, 12, 10, 7, 3],
          [0, 3, 5, 7, 10, 7, 5, 3],
          [0, 5, 7, 12, 10, 7, 5, 0],
          [0, 3, 7, 12, 15, 12, 7, 3],
        ];
        const root = 45; // A2
        const scale = [0, 3, 5, 7, 10, 12];
        // 驱动低音
        if (s % 2 === 0) {
          const deg = bassSeq[(s / 2) % bassSeq.length];
          tone(t, { freq: midi(root + deg), type: 'square', wave: state.pulse12, dur: 0.11, peak: 0.13, cutoff: 1400, r: 0.05, rev: 0.06 });
        }
        // 主旋律
        if (s % 2 === 1) {
          const seq = leadSeq[bar % leadSeq.length];
          const deg = seq[Math.floor(s / 2) % seq.length];
          const m = root + 12 + deg;
          tone(t, { freq: midi(m), type: 'square', wave: state.pulse25, dur: 0.1, peak: 0.085, cutoff: 4200, r: 0.05, rev: 0.12, dly: 0.3 });
        }
        // 打击
        if (s === 0 || s === 6 || s === 10) kick(t, { peak: 0.42, freq: 150, drop: 55, rev: 0.04 });
        if (s === 4 || s === 12) snare(t, { peak: 0.2, rev: 0.14, freq: 2200 });
        if (s % 2 === 0) hat(t, { peak: 0.045, dur: 0.04, freq: 8000 });
        if (s === 14) noise(t, { dur: 0.12, peak: 0.06, type: 'highpass', freq: 6000, rev: 0.2 });
      },
    },
  };

  /* ---------- 调度 ---------- */

  function schedule() {
    const ctx = state.ctx;
    const th = themes[state.theme];
    if (!th) return;
    const stepDur = 60 / state.bpm / 4;
    while (state.nextTime < ctx.currentTime + 0.18) {
      th.tick(state.step, state.nextTime);
      state.step++;
      state.nextTime += stepDur;
    }
  }

  function stopTheme(fade = 0.9) {
    const ctx = state.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    if (state.themeGain) {
      const g = state.themeGain;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
      setTimeout(() => {
        state.nodes.forEach((n) => n.stop(now + fade + 0.05));
        state.nodes = [];
      }, (fade + 0.2) * 1000);
    }
  }

  function startTheme(name) {
    if (!state.ctx) return;
    if (state.theme === name) return;
    stopTheme(0.9);
    state.theme = name;
    const ctx = state.ctx;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.connect(state.comp);
    state.themeGain = g;
    const th = themes[name];
    state.bpm = th.bpm;
    state.step = 0;
    state.nextTime = ctx.currentTime + 0.15;
    // 混响参数
    state.wet.gain.value = th.reverb * 0.5;
    if (th.delayTime > 0) {
      state.delay.delayTime.value = th.delayTime;
      state.delay.fb.gain.value = th.delayFb || 0.2;
      state.delay.input.gain.value = 1;
    } else {
      state.delay.input.gain.value = 0;
    }
    th.setup(state.nextTime);
    g.gain.setValueAtTime(0.0001, state.nextTime);
    g.gain.exponentialRampToValueAtTime(state.muted ? 0.0001 : 1, state.nextTime + 1.4);
    if (!state.timer) state.timer = setInterval(schedule, 40);
  }

  /* ---------- 对外 API ---------- */

  function init() {
    if (state.ctx) {
      if (state.ctx.state === 'suspended') state.ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    state.ctx = ctx;
    state.noiseBuf = noiseBuffer(ctx, 2);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.attack.value = 0.006;
    comp.release.value = 0.22;
    comp.connect(ctx.destination);
    state.comp = comp;

    const master = ctx.createGain();
    master.gain.value = state.volume;
    master.connect(comp);
    state.master = master;

    // 混响总线
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    const conv = ctx.createConvolver();
    conv.buffer = makeIR(ctx, 4.0, 2.6);
    wet.connect(conv).connect(master);
    state.wet = wet;

    // 延迟总线
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.3;
    const fb = ctx.createGain();
    fb.gain.value = 0.25;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    const dIn = ctx.createGain();
    dIn.gain.value = 1;
    dIn.connect(delay);
    delay.connect(damp).connect(fb).connect(delay);
    damp.connect(master);
    state.delay = { input: dIn, delay, fb, damp };

    state.started = true;
    return true;
  }

  function setMuted(m) {
    state.muted = m;
    if (!state.ctx) return;
    const now = state.ctx.currentTime;
    state.master.gain.cancelScheduledValues(now);
    state.master.gain.setValueAtTime(state.master.gain.value, now);
    state.master.gain.exponentialRampToValueAtTime(m ? 0.0001 : state.volume, now + 0.25);
  }

  function setVolume(v) {
    state.volume = Math.max(0, Math.min(1, v));
    if (state.ctx && !state.muted) {
      state.master.gain.setTargetAtTime(state.volume, state.ctx.currentTime, 0.05);
    }
  }

  /* 音效：全局可用，与主题无关 */
  function sfx(kind) {
    if (!state.ctx || state.muted) return;
    const t = state.ctx.currentTime + 0.01;
    if (kind === 'hover') {
      fm(t, { freq: 1180, ratio: 3, index: 40, dur: 0.2, peak: 0.05, decay: 0.1, rev: 0.4 });
    } else if (kind === 'click') {
      fm(t, { freq: 660, ratio: 2, index: 90, dur: 0.35, peak: 0.07, decay: 0.18, rev: 0.4 });
      noise(t, { dur: 0.05, peak: 0.05, type: 'highpass', freq: 4200, rev: 0.25 });
    } else if (kind === 'open') {
      tone(t, { freq: 180, type: 'sawtooth', dur: 1.2, peak: 0.07, cutoff: 300, a: 0.02, d: 0.5, s: 0.3, r: 0.6, rev: 0.6 });
      noise(t, { dur: 1.4, peak: 0.035, type: 'bandpass', freq: 700, q: 1.2, a: 0.5, d: 0.5, s: 0.4, r: 0.4, rev: 0.6 });
      fm(t, { freq: 880, ratio: 2, index: 180, dur: 1.5, peak: 0.05, decay: 0.7, rev: 0.8 });
    } else if (kind === 'back') {
      fm(t, { freq: 440, ratio: 1.5, index: 120, dur: 0.8, peak: 0.06, decay: 0.35, rev: 0.6 });
    }
  }

  return {
    init,
    play: (name) => {
      if (!init()) return;
      if (!THEMES.includes(name)) return;
      startTheme(name);
    },
    setMuted,
    setVolume,
    sfx,
    get muted() {
      return state.muted;
    },
    get theme() {
      return state.theme;
    },
    themes: THEMES,
  };
})();

window.Audio = Audio;
