/* ==========================================================================
   Lara Hopper — Caçada no Labirinto
   Feito para a Lara (5 anos).

   - Toque onde a Lara deve ir: ela acha o caminho e vai pulando sozinha.
     Segurar o dedo e arrastar também anda (um joystick aparece embaixo do dedo).
   - Atirar: botão grande 💥 (segurar = tiro sem parar) ou tocar em cima do dino.
     A mira é automática.
   - Cada dino tem seu jeito: o raptor corre em arrancadas, o T-Rex bebê persegue,
     o triceratops dá cabeçada (e fica tonto se bate na parede), o estegossauro
     dorme até alguém chegar perto e o pterodáctilo mergulha lá de cima.
   - Ovos surpresa: super tiro, bolha, ímã de estrelas e um amiguinho que ajuda.
   - Lá no alto dorme o T-Rex gigante: o chefão. Ele ruge uma vez só, quando acorda.
   - Ninguém perde: dino que encosta só empurra a Lara ("Ai!").
   - Funciona com controle de PlayStation por Bluetooth.
   ========================================================================== */
(() => {
  "use strict";

  const cv = document.getElementById("game");
  let ctx = cv.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const FONT = "'Comic Sans MS','Chalkboard SE','Trebuchet MS',system-ui,sans-serif";
  const OUT = "#2b1d4a";   // contorno de desenho animado
  const TAU = Math.PI * 2;

  const MAXX = 4;          // colunas de -4 a 4
  const ARENA = 11;        // faixas 0..10: a arena do chefão, lá no alto
  const MAZE_ROWS = 43;    // tamanho do labirinto (ímpar)
  const ZMAX = ARENA + MAZE_ROWS;
  const START_Z = ZMAX - 2;
  const BOSS_HP = 20;
  const BOSS_HOME = 2.6;   // onde o chefão fica (ponta do focinho)

  const SAVE_KEY = "laraHopper.v2";
  const save = { muted: false, best: 0, album: {}, wins: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) { /* tudo bem */ }
  if (!save.album || typeof save.album !== "object") save.album = {};
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* tudo bem */ } }

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  /* ---------------- Tela e projeção ---------------- */
  let W = 1, H = 1, T = 40, L = 33, YU = 32, BASE = 500, DPR = 1;
  let sprites = new Map();
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    T = Math.min(W / 9.4, H / 12);   // largura de um quadradinho
    L = T * 0.82;                     // profundidade de uma faixa na tela
    YU = T * 0.8;                     // altura
    BASE = H * 0.6;                   // onde a Lara fica na tela
    sprites = new Map();              // os desenhos prontos dependem do tamanho
  }

  let camZ = 0;
  const SX = (x) => W / 2 + x * T;
  const SY = (z, y) => BASE + (z - camZ) * L - (y || 0) * YU;

  const shadeCache = new Map();
  function shade(hex, k) {
    const key = hex + k;
    let v = shadeCache.get(key);
    if (v) return v;
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k));
    v = "rgb(" + f(n >> 16) + "," + f((n >> 8) & 255) + "," + f(n & 255) + ")";
    shadeCache.set(key, v);
    return v;
  }
  function starPath(cx, cy, R, r, sx) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r : R;
      const x = cx + Math.cos(a) * d * (sx || 1), y = cy + Math.sin(a) * d;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
  }
  function outlined(text, x, y, size, fill, stroke) {
    ctx.font = "bold " + Math.round(size) + "px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size * 0.2); ctx.strokeStyle = stroke || OUT;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }

  /* ---------------- Pincel de desenho animado ----------------
     Tudo é desenhado em "quadradinhos": 1 = a largura de uma casa; y negativo = para cima. */
  function pen(g) { g.lineWidth = 0.055; g.strokeStyle = OUT; g.lineJoin = "round"; g.lineCap = "round"; }
  function at(x, z, y, s, flip) {
    ctx.save(); ctx.translate(SX(x), SY(z, y)); ctx.scale(T * s * (flip || 1), T * s); pen(ctx);
  }
  function E(x, y, rx, ry, col, rot, bare) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    ctx.fillStyle = col; ctx.fill(); if (!bare) ctx.stroke();
  }
  // forma fechada e macia passando perto dos pontos
  function P(pts, col, bare) {
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); if (!bare) ctx.stroke();
  }
  // forma de pontas (dentes, chifres, placas)
  function PL(pts, col, bare) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill(); if (!bare) ctx.stroke();
  }
  // perninha/bracinho: traço grosso com contorno
  function LN(x1, y1, x2, y2, w, col) {
    const lw = ctx.lineWidth;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineWidth = w + lw * 2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
    ctx.lineWidth = lw; ctx.strokeStyle = OUT;
  }
  // risquinho (boca, listras)
  function ST(pts, col, w) {
    const lw = ctx.lineWidth;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.lineWidth = w || lw; ctx.strokeStyle = col || OUT; ctx.stroke();
    ctx.lineWidth = lw; ctx.strokeStyle = OUT;
  }
  // várias bolas que viram uma forma só (copa de árvore, pedra)
  function cluster(list, col) {
    const lw = ctx.lineWidth;
    ctx.lineWidth = lw * 2; ctx.beginPath();
    for (const [x, y, rx, ry] of list) { ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, ry || rx, 0, 0, TAU); }
    ctx.stroke(); ctx.lineWidth = lw;
    ctx.fillStyle = col; ctx.beginPath();
    for (const [x, y, rx, ry] of list) { ctx.moveTo(x + rx, y); ctx.ellipse(x, y, rx, ry || rx, 0, 0, TAU); }
    ctx.fill();
  }
  // olhão de desenho: normal, bravo, tonto, dormindo, feliz
  function eye(x, y, r, mood) {
    if (mood === "sleep" || mood === "happy") {
      ctx.beginPath();
      if (mood === "sleep") ctx.arc(x, y - r * 0.3, r * 0.85, 0.15 * Math.PI, 0.85 * Math.PI);
      else ctx.arc(x, y + r * 0.3, r * 0.85, 1.15 * Math.PI, 1.85 * Math.PI);
      ctx.stroke();
      return;
    }
    E(x, y, r, r, "#ffffff");
    if (mood === "dizzy") {
      ST([[x - r * 0.5, y - r * 0.5], [x + r * 0.5, y + r * 0.5]], OUT, r * 0.35);
      ST([[x + r * 0.5, y - r * 0.5], [x - r * 0.5, y + r * 0.5]], OUT, r * 0.35);
      return;
    }
    E(x + r * 0.25, y + (mood === "angry" ? r * 0.12 : 0), r * 0.55, r * 0.58, "#221533", 0, true);
    E(x + r * 0.45, y - r * 0.2, r * 0.2, r * 0.2, "#ffffff", 0, true);
    if (mood === "angry") ST([[x - r * 1.15, y - r * 1.25], [x + r * 1.25, y - r * 0.45]], OUT, r * 0.5);
  }

  /* ---------------- Som e música (WebAudio, sem arquivos — o mesmo jeito da Corrida da Lara) ----------------
     Frequências médias para aparecer no alto-falante do celular. A música para no momento tenso:
     passos, silêncio... e o único rugido da partida. */
  let AC = null, master = null, musicBus = null, sfxBus = null, NB = null, DIST = null;
  function initAudio() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain(); master.connect(AC.destination);
        musicBus = AC.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
        sfxBus = AC.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
        NB = AC.createBuffer(1, Math.floor(AC.sampleRate * 2), AC.sampleRate);
        const d = NB.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        DIST = AC.createWaveShaper();
        const n = 1024, c = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(x * 2.5); }
        DIST.curve = c; DIST.connect(sfxBus);
        applyMute();
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === "suspended") AC.resume().catch(() => {});
  }
  function applyMute() { if (master) master.gain.value = save.muted ? 0 : 1; }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function osc(t, f, dur, type, vol, f2, bus) {
    try {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus || sfxBus);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* sem som, sem drama */ }
  }
  function noiseAt(t, dur, vol, type, freq, q, bus) {
    try {
      const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      s.buffer = NB; f.type = type || "highpass"; f.frequency.value = freq || 1000; f.Q.value = q || 0.7;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus || sfxBus);
      s.start(t); s.stop(t + dur + 0.02);
    } catch (e) { /* ok */ }
  }
  function tone(f, dur, type, vol, delay, f2) { if (AC) osc(AC.currentTime + (delay || 0), f, dur, type, vol, f2); }
  function arp(notes, gap, dur, type, vol) { notes.forEach((m, i) => tone(mtof(m), dur, type, vol, i * gap)); }

  const sfx = {
    hop: () => tone(430 + Math.random() * 80, 0.09, "triangle", 0.13, 0, 860),
    star: () => { tone(1320, 0.08, "triangle", 0.18); tone(1760, 0.14, "triangle", 0.14, 0.06); },
    bump: () => tone(150, 0.14, "sawtooth", 0.12),
    boing: () => { tone(300, 0.16, "sine", 0.24, 0, 640); tone(640, 0.22, "sine", 0.18, 0.15, 220); },
    // passo pesado: grave + "tum" médio que o celular consegue tocar
    thump: (v) => {
      if (!AC) return;
      const t = AC.currentTime;
      osc(t, 170, 0.3, "sine", 0.6 * v, 50);
      osc(t, 110, 0.22, "square", 0.1 * v, 45);
      noiseAt(t, 0.2, 0.45 * v, "lowpass", 700, 0.8);
    },
    roar: () => {
      if (!AC) return;
      const t = AC.currentTime, d = 1.9;
      try {
        // rosnado médio, com tremido
        const o = AC.createOscillator(), bp = AC.createBiquadFilter(), g = AC.createGain(), lfo = AC.createOscillator(), lg = AC.createGain();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(290, t + 0.25); o.frequency.exponentialRampToValueAtTime(90, t + d);
        lfo.frequency.value = 24; lg.gain.value = 28; lfo.connect(lg); lg.connect(o.frequency);
        bp.type = "bandpass"; bp.Q.value = 1.1;
        bp.frequency.setValueAtTime(950, t); bp.frequency.exponentialRampToValueAtTime(360, t + d);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.85, t + 0.12);
        g.gain.setValueAtTime(0.85, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(bp); bp.connect(g); g.connect(DIST);
        o.start(t); lfo.start(t); o.stop(t + d + 0.05); lfo.stop(t + d + 0.05);
        // bafo (chiado que desce)
        const n = AC.createBufferSource(), nf = AC.createBiquadFilter(), ng = AC.createGain();
        n.buffer = NB; nf.type = "bandpass"; nf.Q.value = 0.8;
        nf.frequency.setValueAtTime(1400, t); nf.frequency.exponentialRampToValueAtTime(280, t + d);
        ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.7, t + 0.1); ng.gain.exponentialRampToValueAtTime(0.0001, t + d);
        n.connect(nf); nf.connect(ng); ng.connect(DIST); n.start(t); n.stop(t + d + 0.05);
      } catch (e) { /* ok */ }
      // o grave do rugido da corrida
      noiseAt(t, 1.7, 0.3, "highpass", 90);
      tone(115, 1.5, "sawtooth", 0.17, 0, 42);
      tone(170, 1.2, "sawtooth", 0.12, 0.06, 58);
      sfx.thump(1);
    },
    chomp: () => { tone(320, 0.09, "square", 0.22, 0, 90); tone(320, 0.09, "square", 0.22, 0.16, 90); sfx.thump(0.6); },
    munch: () => tone(260 + Math.random() * 60, 0.07, "square", 0.08, 0, 120),
    pop: () => { if (AC) noiseAt(AC.currentTime, 0.25, 0.2, "highpass", 500); tone(260, 0.2, "sine", 0.28, 0, 980); },
    win: () => arp([72, 76, 79, 84, 79, 84, 88], 0.13, 0.25, "triangle", 0.2),
  };

  // músicas: 32 colcheias, notas MIDI (0 = pausa) — as mesmas da Corrida da Lara
  const SONGS = [
    // selva dos dinossauros
    { bpm: 128, wave: "triangle", vol: 0.1,
      lead: [64, 67, 69, 0, 72, 69, 67, 0, 64, 67, 69, 72, 74, 0, 72, 0, 76, 74, 72, 0, 69, 67, 64, 0, 62, 64, 67, 69, 64, 0, 0, 0],
      bass: [40, 0, 40, 47, 0, 40, 45, 0, 40, 0, 40, 47, 0, 43, 45, 0, 36, 0, 36, 43, 0, 36, 41, 0, 38, 0, 38, 45, 0, 43, 40, 0] },
    // festa
    { bpm: 140, wave: "square", vol: 0.05,
      lead: [72, 76, 79, 84, 0, 79, 84, 0, 88, 0, 86, 84, 79, 0, 0, 0, 77, 81, 84, 89, 0, 84, 89, 0, 91, 0, 89, 88, 84, 0, 0, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0, 52, 0, 55, 0, 48, 0, 55, 0, 53, 0, 57, 0, 53, 0, 57, 0, 55, 0, 59, 0, 48, 0, 55, 0] },
  ];
  const music = { on: false, song: 0, step: 0, next: 0, tempo: 1, timer: 0 };
  function musicPlay(i, tempo) {
    if (!AC) return;
    music.on = true; music.song = i; music.step = 0; music.tempo = tempo || 1;
    music.next = AC.currentTime + 0.08;
    if (!music.timer) music.timer = setInterval(musicTick, 40);
  }
  function musicStop() { music.on = false; }
  function musicTick() {
    if (!music.on || !AC || AC.state !== "running") return;
    const S = SONGS[music.song], step = 60 / (S.bpm * music.tempo) / 2;
    if (music.next < AC.currentTime - 0.1) music.next = AC.currentTime + 0.03;
    while (music.next < AC.currentTime + 0.2) {
      const i = music.step % S.lead.length, t = music.next;
      if (S.lead[i]) osc(t, mtof(S.lead[i]), step * 0.9, S.wave, S.vol, 0, musicBus);
      if (S.bass[i]) osc(t, mtof(S.bass[i]), step * 1.6, "triangle", 0.12, 0, musicBus);
      if (i % 4 === 0) osc(t, 150, 0.12, "sine", 0.22, 45, musicBus);
      if (i % 4 === 2) noiseAt(t, 0.04, 0.04, "highpass", 7000, 0.7, musicBus);
      music.next += step;
      music.step++;
    }
  }
  function vib(p) { try { if (!save.muted && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ok */ } }
  function speak(text) {
    try {
      if (save.muted || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR"; u.pitch = 1.4; u.rate = 1.0;
      setTimeout(() => window.speechSynthesis.speak(u), 500);
    } catch (e) { /* sem voz, tudo bem */ }
  }
  let wl = null;
  async function wake() { try { if ("wakeLock" in navigator && !wl) { wl = await navigator.wakeLock.request("screen"); wl.addEventListener("release", () => { wl = null; }); } } catch (e) { /* ok */ } }

  // sons novos
  sfx.pew = () => { tone(1250, 0.13, "square", 0.08, 0, 260); tone(2400, 0.08, "sine", 0.06, 0, 700); };
  sfx.wall = () => { if (AC) noiseAt(AC.currentTime, 0.08, 0.12, "bandpass", 1800, 1); };
  sfx.shatter = () => {
    if (!AC) return;
    noiseAt(AC.currentTime, 0.22, 0.28, "highpass", 1400);
    tone(300, 0.2, "sine", 0.24, 0, 900);
    sfx.thump(0.35);
  };
  sfx.bossHit = () => { tone(190, 0.14, "sawtooth", 0.15, 0, 90); if (AC) noiseAt(AC.currentTime, 0.1, 0.22, "bandpass", 900, 1); };
  sfx.bigBoom = () => {
    if (!AC) return;
    const t = AC.currentTime;
    noiseAt(t, 1.3, 0.55, "lowpass", 900, 0.7);
    tone(140, 1.0, "sine", 0.45, 0, 35);
    for (let i = 0; i < 14; i++) tone(300 + Math.random() * 1200, 0.06, "square", 0.07, i * 0.05, 120);
    sfx.thump(1);
  };
  sfx.power = () => arp([67, 72, 76, 79, 84], 0.07, 0.16, "triangle", 0.16);
  sfx.crack = () => { if (AC) noiseAt(AC.currentTime, 0.12, 0.25, "highpass", 2500); tone(700, 0.08, "square", 0.08, 0.05, 1400); };
  sfx.snort = () => { if (AC) noiseAt(AC.currentTime, 0.3, 0.3, "bandpass", 500, 1.5); tone(140, 0.25, "sawtooth", 0.12, 0, 90); };
  sfx.squawk = () => { tone(900, 0.12, "sawtooth", 0.07, 0, 1500); tone(1400, 0.16, "sawtooth", 0.06, 0.1, 800); };
  sfx.combo = (n) => arp([72, 76, 79, 84, 88].slice(0, Math.min(5, n + 1)), 0.06, 0.12, "triangle", 0.15);
  sfx.piu = () => tone(1700, 0.07, "sine", 0.05, 0, 2300);
  sfx.hit = () => tone(520, 0.08, "square", 0.09, 0, 260);

  /* ---------------- Os dinos ---------------- */
  const DINOS = {
    raptor: { name: "Raptor", c: "#ff9a3d", d: "#e36a1c", l: "#ffe6b0", s: 1.0, sw: 0.34, hp: 1, stars: 1 },
    rexy: { name: "T-Rex bebê", c: "#4fd070", d: "#2a9e4c", l: "#e2f9b8", s: 1.0, sw: 0.36, hp: 2, stars: 2 },
    trike: { name: "Triceratops", c: "#a97bff", d: "#7b4de0", l: "#eadcff", s: 0.95, sw: 0.5, hp: 3, stars: 3 },
    stego: { name: "Estegossauro", c: "#45b5ff", d: "#1f86d4", l: "#d8f0ff", s: 0.9, sw: 0.55, hp: 3, stars: 3 },
    ptero: { name: "Pterodáctilo", c: "#ff6b8a", d: "#d63e5e", l: "#ffd9b0", s: 1.0, sw: 0.3, hp: 1, stars: 2 },
  };
  const KINDS = ["raptor", "rexy", "trike", "stego", "ptero"];
  const WHITE = { c: "#ffffff", d: "#f0f0f0", l: "#ffffff" };

  // cada desenho olha para a direita; a.ph = passo, a.walk = 0/1, a.mood, a.open = boca (0..1)
  const DRAW = {
    raptor(p, a) {
      const w = Math.sin(a.ph) * 0.05, s = Math.sin(a.ph) * 0.12 * a.walk;
      P([[-0.16, -0.54], [-0.5, -0.68 + w], [-0.95, -0.82 + w * 2], [-0.5, -0.52 + w], [-0.18, -0.34]], p.c);
      LN(0.06, -0.34, 0.06 - s, -0.06, 0.09, p.d); E(0.1 - s, -0.04, 0.09, 0.045, p.d);
      LN(0.22, -0.56, 0.36, -0.8, 0.17, p.c);
      E(0, -0.46, 0.32, 0.21, p.c, -0.3);
      E(0.06, -0.39, 0.2, 0.09, p.l, -0.3, true);
      for (let i = 0; i < 3; i++) ST([[-0.2 + i * 0.11, -0.6 - i * 0.035], [-0.15 + i * 0.11, -0.49 - i * 0.035]], p.d, 0.045);
      LN(-0.06, -0.34, -0.06 + s, -0.06, 0.1, p.c); E(-0.02 + s, -0.04, 0.1, 0.05, p.c);
      LN(0.2, -0.46, 0.34, -0.38, 0.045, p.d);
      const j = a.open * 0.09;
      P([[0.36, -0.76 + j], [0.6, -0.76 + j], [0.78, -0.8 + j], [0.7, -0.7 + j], [0.4, -0.68 + j]], p.d);
      PL([[0.26, -0.98], [0.13, -1.16], [0.32, -1.04]], "#ff5d8f"); PL([[0.2, -0.92], [0.04, -1.02], [0.24, -0.86]], "#ffd23f");
      P([[0.2, -0.92], [0.32, -1.04], [0.54, -1.0], [0.8, -0.9], [0.82, -0.8], [0.6, -0.74], [0.32, -0.72], [0.2, -0.8]], p.c);
      if (a.open > 0.2) for (let i = 0; i < 3; i++) PL([[0.5 + i * 0.09, -0.76], [0.54 + i * 0.09, -0.69], [0.58 + i * 0.09, -0.77]], "#ffffff");
      E(0.75, -0.87, 0.018, 0.018, OUT, 0, true);
      eye(0.45, -0.9, 0.085, a.mood);
    },
    rexy(p, a) {
      const w = Math.sin(a.ph) * 0.05, s = Math.sin(a.ph) * 0.11 * a.walk, j = a.open * 0.13;
      P([[-0.16, -0.56], [-0.52, -0.56 + w], [-0.9, -0.44 + w * 2], [-0.5, -0.32 + w], [-0.18, -0.26]], p.c);
      LN(0.08, -0.3, 0.08 - s, -0.06, 0.12, p.d); E(0.13 - s, -0.04, 0.11, 0.05, p.d);
      E(0, -0.5, 0.3, 0.29, p.c, -0.4);
      E(0.1, -0.43, 0.16, 0.19, p.l, -0.4, true);
      for (const [x, y] of [[-0.14, -0.66], [-0.22, -0.5], [-0.04, -0.74]]) E(x, y, 0.045, 0.035, p.d, 0, true);
      LN(-0.08, -0.3, -0.08 + s, -0.06, 0.13, p.c); E(-0.03 + s, -0.04, 0.12, 0.055, p.c);
      LN(0.22, -0.52, 0.36, -0.46, 0.05, p.d);
      P([[0.22, -0.8 + j], [0.5, -0.8 + j], [0.8, -0.86 + j], [0.74, -0.72 + j], [0.3, -0.68 + j]], p.d);
      if (a.open > 0.25) E(0.5, -0.78 + j * 0.5, 0.16, 0.035 + j * 0.3, "#8a1424", 0, true);
      P([[0.06, -1.0], [0.2, -1.18], [0.52, -1.18], [0.82, -1.04], [0.86, -0.88], [0.52, -0.8], [0.2, -0.76], [0.06, -0.86]], p.c);
      for (let i = 0; i < 3; i++) PL([[0.44 + i * 0.12, -0.83], [0.49 + i * 0.12, -0.74], [0.54 + i * 0.12, -0.84]], "#ffffff");
      E(0.78, -1.0, 0.02, 0.02, OUT, 0, true);
      eye(0.36, -1.02, 0.105, a.mood);
    },
    trike(p, a) {
      const w = Math.sin(a.ph) * 0.04, s = Math.sin(a.ph) * 0.09 * a.walk;
      P([[-0.5, -0.56], [-0.82, -0.5 + w], [-1.05, -0.34 + w * 2], [-0.76, -0.32], [-0.5, -0.28]], p.c);
      LN(-0.3, -0.26, -0.3 - s, -0.05, 0.12, p.d); LN(0.3, -0.26, 0.3 + s, -0.05, 0.12, p.d);
      E(-0.05, -0.47, 0.54, 0.3, p.c);
      E(-0.02, -0.36, 0.36, 0.13, p.l, 0, true);
      LN(-0.4, -0.26, -0.4 + s, -0.05, 0.14, p.c); LN(0.18, -0.26, 0.18 - s, -0.05, 0.14, p.c);
      P([[0.3, -0.5], [0.24, -0.9], [0.42, -1.12], [0.64, -1.0], [0.62, -0.5]], "#ffb3d1");
      for (const [x, y] of [[0.33, -0.9], [0.44, -1.0], [0.55, -0.93]]) E(x, y, 0.035, 0.035, "#ff5d8f", 0, true);
      PL([[0.6, -0.8], [0.86, -1.12], [0.74, -0.74]], "#fffbe8");
      P([[0.4, -0.8], [0.64, -0.84], [0.92, -0.64], [1.02, -0.46], [0.9, -0.34], [0.58, -0.32], [0.4, -0.46]], p.c);
      PL([[0.86, -0.62], [1.02, -0.84], [0.97, -0.56]], "#fffbe8");
      P([[0.92, -0.5], [1.04, -0.46], [0.96, -0.36]], p.l);
      ST([[0.72, -0.4], [0.9, -0.42]], OUT, 0.035);
      eye(0.62, -0.62, 0.08, a.mood);
    },
    stego(p, a) {
      const w = Math.sin(a.ph) * 0.04, s = Math.sin(a.ph) * 0.08 * a.walk;
      P([[-0.55, -0.52], [-0.92, -0.54 + w], [-1.25, -0.66 + w * 2], [-0.9, -0.36 + w], [-0.55, -0.28]], p.c);
      PL([[-1.12, -0.68 + w * 2], [-1.2, -0.92 + w * 2], [-1.02, -0.72 + w * 2]], "#fffbe8");
      PL([[-1.24, -0.62 + w * 2], [-1.42, -0.78 + w * 2], [-1.18, -0.52 + w * 2]], "#fffbe8");
      const hs = [0.2, 0.3, 0.36, 0.3, 0.2];
      for (let i = 0; i < 5; i++) {
        const x = -0.5 + i * 0.22, yb = -0.44 - 0.3 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 0.05) / 0.62, 2))) + 0.05;
        PL([[x - 0.12, yb], [x - 0.02, yb - hs[i] - 0.06], [x + 0.04, yb - hs[i]], [x + 0.12, yb]], i % 2 ? "#ff9f43" : "#ffd23f");
      }
      LN(-0.32, -0.24, -0.32 - s, -0.05, 0.13, p.d); LN(0.3, -0.24, 0.3 + s, -0.05, 0.13, p.d);
      E(-0.05, -0.45, 0.62, 0.32, p.c);
      E(-0.02, -0.33, 0.42, 0.13, p.l, 0, true);
      LN(-0.44, -0.24, -0.44 + s, -0.05, 0.15, p.c); LN(0.18, -0.24, 0.18 - s, -0.05, 0.15, p.c);
      P([[0.44, -0.54], [0.72, -0.56], [0.96, -0.42], [1.0, -0.28], [0.84, -0.2], [0.5, -0.24]], p.c);
      ST([[0.78, -0.27], [0.94, -0.3]], OUT, 0.035);
      E(0.95, -0.4, 0.016, 0.016, OUT, 0, true);
      eye(0.72, -0.42, 0.07, a.mood);
    },
    ptero(p, a) {
      const f = Math.sin(a.ph * 1.6);
      P([[0.02, -0.06], [-0.2, -0.24 - f * 0.4], [-0.72, -0.14 - f * 0.55], [-0.34, 0.04]], p.d);
      LN(-0.12, 0.08, -0.2, 0.2, 0.035, p.d); LN(-0.02, 0.1, -0.08, 0.22, 0.035, p.d);
      E(0, 0, 0.27, 0.15, p.c, -0.15);
      E(0.03, 0.05, 0.17, 0.07, p.l, -0.15, true);
      PL([[0.42, -0.1], [0.92, 0.0 + a.open * 0.02], [0.44, 0.06]], "#ffd23f");
      P([[0.18, -0.06], [-0.02, -0.4], [0.3, -0.24], [0.52, -0.08], [0.48, 0.06], [0.24, 0.08]], p.c);
      P([[0.08, -0.04], [-0.08, -0.3 - f * 0.45], [-0.8, -0.2 - f * 0.65], [-0.38, 0.06]], p.c);
      ST([[-0.1, -0.2 - f * 0.3], [-0.4, -0.02]], p.d, 0.035);
      eye(0.32, -0.1, 0.065, a.mood);
    },
    // o amiguinho: dino bebê com a casquinha do ovo na cabeça
    pet(p, a) {
      const s = Math.sin(a.ph) * 0.06 * a.walk;
      P([[-0.1, -0.24], [-0.3, -0.26], [-0.42, -0.14], [-0.26, -0.12], [-0.1, -0.1]], "#ffd84d");
      E(-0.05 - s, -0.03, 0.06, 0.035, "#ffb62e"); E(0.07 + s, -0.03, 0.06, 0.035, "#ffb62e");
      E(0, -0.2, 0.17, 0.15, "#ffd84d");
      E(0.03, -0.16, 0.09, 0.07, "#fff6c8", 0, true);
      E(0.1, -0.44, 0.21, 0.19, "#ffd84d");
      PL([[-0.1, -0.52], [-0.04, -0.6], [0.02, -0.53], [0.09, -0.61], [0.16, -0.54], [0.23, -0.6], [0.29, -0.52], [0.24, -0.66], [0.1, -0.72], [-0.05, -0.66]], "#fffdf2");
      E(0.26, -0.38, 0.045, 0.03, "#ff9db5", 0, true);
      ST([[0.2, -0.34], [0.28, -0.32]], OUT, 0.03);
      eye(0.16, -0.46, 0.075, a.mood);
    },
  };

  /* ---------------- O mundo: arena lá em cima + labirinto embaixo ---------------- */
  let walls = new Map(), stars = new Set(), eggs = new Set(), eggPrizes = [], totalStars = 1;
  const key = (x, z) => x + "," + z;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function blocked(x, z) {
    if (z < 0 || z >= ZMAX || Math.abs(x) > MAXX) return true;
    return walls.has(key(x, z));
  }
  function buildWorld() {
    walls = new Map(); stars = new Set(); eggs = new Set();
    // labirinto: células nas colunas/linhas ímpares, paredes entre elas
    const C = 9, R = MAZE_ROWS, open = [];
    for (let r = 0; r < R; r++) { open.push(new Array(C).fill(false)); }
    const st = [[1, R - 2]];
    open[R - 2][1] = true;
    while (st.length) {
      const [c, r] = st[st.length - 1];
      const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dc, dr]) => [c + dc, r + dr, dc, dr])
        .filter(([nc, nr]) => nc >= 1 && nc <= C - 2 && nr >= 1 && nr <= R - 2 && !open[nr][nc]);
      if (!nb.length) { st.pop(); continue; }
      const [nc, nr, dc, dr] = pick(nb);
      open[r + dr / 2][c + dc / 2] = true; open[nr][nc] = true;
      st.push([nc, nr]);
    }
    // mais caminhos (menos becos sem saída)
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
      if (open[r][c] || (r % 2 === 0 && c % 2 === 0)) continue;
      const h = open[r][c - 1] && open[r][c + 1], v = open[r - 1][c] && open[r + 1][c];
      if ((h || v) && Math.random() < 0.38) open[r][c] = true;
    }
    // uma clareira a cada tanto, para brincar com os dinos
    for (let r = 6; r < R - 6; r += 12) for (let rr = r; rr < r + 3; rr++) for (let c = 2; c <= 6; c++) open[rr][c] = true;
    // entrada da arena (linha de cima) e o comecinho (linhas de baixo) abertos
    for (let c = 1; c < C - 1; c++) { open[0][c] = true; open[R - 1][c] = true; open[R - 2][c] = true; }
    const ends = [];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = c - 4, z = ARENA + r;
      if (!open[r][c]) {
        const hv = hash(z * 13.7 + x * 5.3);
        walls.set(key(x, z), hv > 0.82 ? "rock" : hv > 0.62 ? "palm" : hv > 0.3 ? "tree" : "bush");
      } else {
        if (r > 1 && r < R - 3 && Math.random() < 0.2) stars.add(key(x, z));
        if (r > 2 && r < R - 5) {
          let n = 0;
          for (const [dc, dr] of DIRS) if (open[r + dr] && open[r + dr][c + dc]) n++;
          if (n === 1) ends.push([x, z]);
        }
      }
    }
    // pedras de enfeite na arena, nos cantos
    for (const [x, z] of [[-4, 1], [4, 1], [-4, 6], [4, 7], [-3, 10], [3, 10]]) walls.set(key(x, z), "rock");
    // ovos surpresa: nos becos sem saída (um prêmio por explorar), espalhados pelo caminho
    shuffle(ends);
    const chosen = [];
    for (const [x, z] of ends) {
      if (chosen.length >= 6) break;
      if (chosen.every(([, cz]) => Math.abs(cz - z) >= 4)) chosen.push([x, z]);
    }
    for (let tries = 0; chosen.length < 6 && tries < 300; tries++) {
      const x = Math.floor(rand(-MAXX, MAXX + 1)), z = Math.floor(rand(ARENA + 3, START_Z - 4));
      if (!blocked(x, z) && chosen.every(([cx, cz]) => Math.abs(cz - z) + Math.abs(cx - x) >= 4)) chosen.push([x, z]);
    }
    for (const [x, z] of chosen) { eggs.add(key(x, z)); stars.delete(key(x, z)); }
    // o primeiro ovo que ela achar é sempre o amiguinho
    eggPrizes = ["amigo"].concat(shuffle(["tiro", "bolha", "ima", "tiro", "bolha"]));
  }
  // caminho mais curto entre duas casas (para "toque onde quer ir")
  function findPath(x0, z0, x1, z1) {
    const q = [[x0, z0]], prev = new Map([[key(x0, z0), null]]);
    for (let i = 0; i < q.length; i++) {
      const [x, z] = q[i];
      if (x === x1 && z === z1) {
        const path = [];
        let c = [x, z];
        while (c && !(c[0] === x0 && c[1] === z0)) { path.unshift(c); c = prev.get(key(c[0], c[1])); }
        return path;
      }
      for (const [dx, dz] of DIRS) {
        const nx = x + dx, nz = z + dz, k = key(nx, nz);
        if (!prev.has(k) && !blocked(nx, nz)) { prev.set(k, [x, z]); q.push([nx, nz]); }
      }
    }
    return null;
  }

  /* ---------------- Estado ---------------- */
  let state = "menu";   // menu | play | end
  let mode = "play";    // play | intro | catch | win
  let now = 0, last = 0, shake = 0, nStars = 0, kills = 0, paused = false, playT = 0;
  let catchT = 0, chomped = false, spat = false, introT = 0, roared = false, winT = 0, endShown = false;
  let firing = false, fireCD = 0, burstN = 0, aimE = null, comboN = 0, comboT = 0, bumpSnd = 0;
  const lara = { x: 0, z: START_Z, fx: 0, fz: START_Z, hy: 0, fdx: 0, fdz: -1, hop: null, queue: null, path: null, dest: null, inv: 0, bump: 0, bdx: 0, bdz: 0, spin: 0, shootT: 0, idle: 0, px: 0, pz: START_Z, landT: 0 };
  const giant = { z: BOSS_HOME, boost: 0, gx: 0, ph: 0, open: 0.05, lift: 0, flash: 0 };
  const boss = { state: "sleep", hp: BOSS_HP, retreat: BOSS_HOME };
  const pw = { tiro: 0, bolha: 0, ima: 0 };
  let pet = null;
  let enemies = [], bullets = [], frags = [], wparts = [], sparts = [], texts = [], flies = [], seen = {};
  let ptr = null, stickDir = null;

  function spawnEnemies() {
    enemies = [];
    const cells = [];
    for (let z = ARENA + 2; z < START_Z - 8; z++) for (let x = -MAXX; x <= MAXX; x++) if (!blocked(x, z) && !eggs.has(key(x, z))) cells.push([x, z]);
    const list = ["raptor", "raptor", "raptor", "raptor", "raptor", "rexy", "rexy", "rexy", "rexy", "trike", "trike", "trike", "stego", "stego", "stego"];
    for (const kind of list) {
      if (!cells.length) break;
      const [x, z] = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
      enemies.push({ kind, x, z, fx: x, fz: z, x0: x, z0: z, t: rand(0.3, 1.5), mv: 0, mvDur: 0.3, hp: DINOS[kind].hp, dir: Math.random() < 0.5 ? -1 : 1,
        ph: Math.random() * 6, flash: 0, squash: 0, st: kind === "stego" ? "sleep" : "idle", stT: 0, cd: 0, n: 0, alert: 0, hpT: 0, y: 0, cdx: 0, cdz: 0 });
    }
    // pterodáctilos: voam por cima das árvores
    for (let i = 0; i < 3; i++) {
      const z = ARENA + 8 + i * 11;
      enemies.push({ kind: "ptero", x: 0, z, fx: rand(-3, 3), fz: z, x0: 0, z0: z, t: 0, mv: 0, mvDur: 0.3, hp: 1, dir: 1, vx: (i % 2 ? -1 : 1) * 1.6,
        ph: Math.random() * 6, ph2: Math.random() * 6, flash: 0, squash: 0, st: "fly", stT: 0, cd: rand(2, 5), n: 0, alert: 0, hpT: 0, y: 1.5, tx: 0, tz: 0, sx: 0, sz: 0 });
    }
  }
  function newGame() {
    buildWorld();
    spawnEnemies();
    totalStars = stars.size + enemies.reduce((n, e) => n + DINOS[e.kind].stars, 0);
    Object.assign(lara, { x: 0, z: START_Z, fx: 0, fz: START_Z, hy: 0, fdx: 0, fdz: -1, hop: null, queue: null, path: null, dest: null, inv: 0, bump: 0, spin: 0, shootT: 0, idle: 0, px: 0, pz: START_Z, landT: 0 });
    Object.assign(giant, { z: BOSS_HOME, boost: 0, gx: 0, ph: 0, open: 0.05, lift: 0, flash: 0 });
    Object.assign(boss, { state: "sleep", hp: BOSS_HP, retreat: BOSS_HOME });
    pw.tiro = 0; pw.bolha = 0; pw.ima = 0; pet = null;
    mode = "play"; nStars = 0; kills = 0; shake = 0; playT = 0; comboN = 0; comboT = 0; burstN = 0; aimE = null;
    catchT = 0; chomped = false; spat = false; introT = 0; roared = false; winT = 0; endShown = false;
    bullets = []; frags = []; wparts = []; sparts = []; texts = []; flies = []; seen = {};
    ptr = null; stickDir = null;
    camZ = camTarget();
  }

  /* ---------------- Efeitos ---------------- */
  function addText(s, opts) { texts.push(Object.assign({ s, life: 1.2, max: 1.2, size: 34, col: "#fff" }, opts, { max: (opts && opts.life) || 1.2 })); }
  function dust(x, z, n) {
    for (let i = 0; i < n; i++) wparts.push({ x: x + rand(-0.3, 0.3), z: z + rand(-0.2, 0.1), y: 0.05, vx: rand(-0.8, 0.8), vz: 0, vy: rand(0.6, 1.4), g: 4, life: 0.4, max: 0.4, s: rand(0.09, 0.15), col: "#f3ead2" });
  }
  function sparkle(x, z, col, y) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; wparts.push({ x, z, y: y == null ? 0.5 : y, vx: Math.cos(a) * 2.2, vz: 0, vy: Math.sin(a) * 2.2, g: 0, life: 0.45, max: 0.45, s: 0.1, col: col || "#ffd23f" }); }
  }
  function confetti(n) {
    const cols = ["#ff5d8f", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff", "#ff9f43"];
    for (let i = 0; i < n; i++) sparts.push({ x: rand(0, W), y: rand(-H * 0.6, 0), vx: rand(-40, 40), vy: rand(120, 260), r: rand(0, 6), vr: rand(-6, 6), s: rand(6, 11), col: pick(cols), life: 4, max: 4 });
  }
  // vira um monte de bolinhas coloridas
  function shatter(x, z, w, h, y0, cols, n, size) {
    for (let i = 0; i < n; i++) {
      const s = size * rand(0.7, 1.3);
      frags.push({
        x: x + rand(-w / 2, w / 2), z: z + rand(-0.25, 0.25), y: y0 + rand(0, h),
        vx: rand(-3.2, 3.2), vz: rand(-2.2, 2.2), vy: rand(2, 6.5),
        s, col: pick(cols), life: rand(1.0, 1.7), bounce: 0,
      });
    }
    if (frags.length > 380) frags.splice(0, frags.length - 380);
  }
  // estrelinhas que voam até o placar
  function gain(n, wx, wz, wy) {
    nStars += n;
    const x = SX(wx), y = SY(wz, wy == null ? 0.5 : wy);
    for (let i = 0; i < Math.min(n, 8); i++) flies.push({ x0: x + rand(-10, 10), y0: y + rand(-10, 10), t: -i * 0.07 });
  }
  function rumble(ms, strong) {
    vib(ms);
    try {
      const gp = currentPad();
      if (gp && gp.vibrationActuator && !save.muted) gp.vibrationActuator.playEffect("dual-rumble", { duration: ms, strongMagnitude: strong || 0.6, weakMagnitude: 0.5 });
    } catch (e) { /* ok */ }
  }

  /* ---------------- Movimento da Lara ---------------- */
  function canControl() { return state === "play" && mode === "play"; }
  // auto = passo dado pelo caminho automático (não cancela o caminho)
  function move(dx, dz, auto) {
    if (!canControl()) return false;
    if (!auto) { lara.path = null; lara.dest = null; }
    if (lara.hop) { if (lara.hop.kind === "hop" && !auto) lara.queue = [dx, dz]; return false; }
    lara.fdx = dx; lara.fdz = dz; lara.idle = 0;
    const nx = lara.x + dx, nz = lara.z + dz;
    if (blocked(nx, nz)) {
      if (lara.bump <= 0) { lara.bump = 0.18; lara.bdx = dx; lara.bdz = dz; if (bumpSnd <= 0) { sfx.bump(); bumpSnd = 0.45; } }
      return false;
    }
    lara.px = lara.x; lara.pz = lara.z;
    startHop(nx, nz, 0.15, 0.42, "hop");
    sfx.hop();
    return true;
  }
  function startHop(nx, nz, dur, arc, kind) {
    lara.hop = { x0: lara.fx, z0: lara.fz, x1: nx, z1: nz, t: 0, dur, arc, kind };
    lara.x = nx; lara.z = nz;
  }
  function goTo(x, z) {
    const p = findPath(lara.x, lara.z, x, z);
    if (!p || !p.length) return false;
    lara.path = p; lara.dest = [x, z]; lara.queue = null;
    return true;
  }
  function land(kind) {
    lara.landT = 0.12;
    if (kind !== "hop") dust(lara.fx, lara.fz, 6);
    const k = key(lara.x, lara.z);
    if (stars.has(k)) { stars.delete(k); sfx.star(); sparkle(lara.fx, lara.fz); gain(1, lara.fx, lara.fz); }
    if (eggs.has(k)) { eggs.delete(k); hatch(); }
    if (boss.state === "sleep" && lara.z <= ARENA - 1) startIntro();
    if (lara.queue) { const q = lara.queue; lara.queue = null; move(q[0], q[1]); }
  }
  function hurt(fromX, fromZ, e) {
    lara.queue = null; lara.path = null; lara.dest = null;
    if (pw.bolha > 0) {       // a bolha estoura no lugar dela
      pw.bolha = 0; lara.inv = 1.2;
      sfx.pop(); sparkle(lara.fx, lara.fz, "#9be7ff", 0.7);
      addText("PLOC!", { wx: lara.fx, wz: lara.fz, wy: 1.7, size: 32, col: "#9be7ff" });
      if (e && e.kind !== "ptero") { e.st = "dizzy"; e.stT = 1.8; }
      return;
    }
    lara.inv = 1.4;
    sfx.boing(); rumble(70, 0.4);
    addText("Ai!", { wx: lara.fx, wz: lara.fz, wy: 1.7, size: 34, col: "#fff" });
    // empurrãozinho para longe do dino
    let dx = Math.sign(lara.x - fromX), dz = Math.sign(lara.z - fromZ);
    if (dx && dz) { if (Math.random() < 0.5) dx = 0; else dz = 0; }
    if (!dx && !dz) dz = 1;
    const opts = [[dx, dz], [dz, dx], [-dz, -dx], [-dx, -dz]];
    for (const [ox, oz] of opts) if (!blocked(lara.x + ox, lara.z + oz)) { startHop(lara.x + ox, lara.z + oz, 0.32, 0.8, "tumble"); return; }
  }
  function freeX(z, x) {
    for (let d = 0; d <= MAXX * 2; d++) for (const s of [1, -1]) { const nx = x + d * s; if (Math.abs(nx) <= MAXX && !blocked(nx, z)) return nx; }
    return 0;
  }

  /* ---------------- Ovos surpresa ---------------- */
  function hatch() {
    let prize = eggPrizes.shift() || "tiro";
    if (prize === "amigo" && pet) prize = "tiro";
    sfx.crack(); sfx.power(); rumble(60, 0.4);
    shatter(lara.fx, lara.fz, 0.4, 0.4, 0.2, ["#fffdf2", "#ffe9b8", "#ffd23f"], 12, 0.12);
    sparkle(lara.fx, lara.fz, "#ffffff", 0.6);
    const say = (s, col) => addText(s, { sx: 0.5, sy: 0.36, size: 38, col, life: 2 });
    if (prize === "amigo") {
      pet = { fx: lara.fx, fz: lara.fz, ph: 0, cd: 1, dir: 1, mv: 0, pop: 0.6 };
      say("UM AMIGUINHO! 🐣", "#ffd84d");
    } else if (prize === "tiro") { pw.tiro = 14; say("SUPER TIRO! 🌈", "#ff8fd0"); }
    else if (prize === "bolha") { pw.bolha = 25; say("BOLHA MÁGICA! 🛡️", "#9be7ff"); }
    else { pw.ima = 18; say("ÍMÃ DE ESTRELAS! 🧲", "#ffd23f"); }
  }

  /* ---------------- Tiro ---------------- */
  function lineClear(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.25);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (blocked(Math.round(lerp(x0, x1, t)), Math.round(lerp(z0, z1, t)))) return false;
    }
    return true;
  }
  function bossAlive() { return boss.state === "fight" || boss.state === "intro"; }
  function findTarget(fx, fz, range) {
    let best = null, bd = range || 8.5;
    for (const e of enemies) {
      const d = Math.hypot(e.fx - fx, e.fz - fz);
      if (d < bd && (e.kind === "ptero" || lineClear(fx, fz, e.fx, e.fz))) { bd = d; best = { x: e.fx, z: e.fz, air: e.kind === "ptero" }; }
    }
    if (bossAlive() && fz <= ARENA) {
      const d = Math.abs(fz - giant.z);
      if (d < 11 && (!best || d < bd)) best = { x: giant.gx, z: giant.z - 0.6 };
    }
    return best;
  }
  function shoot() {
    if (!canControl()) return;
    let t = null;
    if (aimE && enemies.includes(aimE)) t = { x: aimE.fx, z: aimE.fz, air: true };
    else t = findTarget(lara.fx, lara.fz);
    let vx = lara.fdx, vz = lara.fdz;
    if (t) {
      const dx = t.x - lara.fx, dz = t.z - lara.fz, d = Math.hypot(dx, dz) || 1;
      vx = dx / d; vz = dz / d;
      if (Math.abs(dx) > Math.abs(dz)) { lara.fdx = Math.sign(dx); lara.fdz = 0; } else { lara.fdx = 0; lara.fdz = Math.sign(dz) || -1; }
    }
    lara.idle = 0;
    const sp = 13, a0 = Math.atan2(vz, vx), spread = pw.tiro > 0 ? [-0.24, 0, 0.24] : [0];
    spread.forEach((da, i) => {
      const cx = Math.cos(a0 + da), cz = Math.sin(a0 + da);
      bullets.push({ x: lara.fx + cx * 0.35, z: lara.fz + cz * 0.35, vx: cx * sp, vz: cz * sp, life: 0.8, trail: [], air: !!(t && t.air),
        col: pw.tiro > 0 ? ["#ff5d8f", "#ffd23f", "#4db5ff"][i] : "#ffd23f" });
    });
    lara.shootT = 0.12;
    sfx.pew();
  }
  function killEnemy(e) {
    const D = DINOS[e.kind];
    shatter(e.fx, e.fz, 0.8, 0.6, 0.15 + e.y, [D.c, D.d, D.l, "#ffffff"], 16, 0.15);
    sparkle(e.fx, e.fz, "#ffffff", 0.5 + e.y);
    sfx.shatter(); shake = Math.max(shake, 5); rumble(40, 0.3);
    kills++;
    save.album[e.kind] = (save.album[e.kind] || 0) + 1; persist();
    comboN = comboT > 0 ? comboN + 1 : 1; comboT = 3;
    const bonus = Math.min(4, comboN - 1);
    addText("POF!", { wx: e.fx, wz: e.fz, wy: 1.5 + e.y, size: 30, col: "#ffd23f", life: 0.8 });
    if (comboN >= 2) { addText(comboN + "x COMBO!", { sx: 0.5, sy: 0.3, size: 36, col: "#ff8fd0", life: 1.2 }); sfx.combo(comboN); }
    else sfx.star();
    gain(D.stars + bonus, e.fx, e.fz, 0.6 + e.y);
    if (aimE === e) aimE = null;
  }
  function hitEnemy(e, b) {
    e.hp--; e.flash = 0.12; e.squash = 1; e.hpT = 1.6;
    if (e.hp <= 0) { killEnemy(e); return true; }
    sfx.hit(); sparkle(e.fx, e.fz, "#ffffff");
    if (e.st === "sleep") { e.st = "idle"; e.alert = 0.8; e.t = 0.5; }
    // leva um empurrãozinho para trás
    if (e.kind !== "ptero" && e.st !== "charge" && e.mv <= 0) {
      const dx = Math.abs(b.vx) > Math.abs(b.vz) ? Math.sign(b.vx) : 0, dz = dx ? 0 : Math.sign(b.vz);
      if (!blocked(e.x + dx, e.z + dz) && e.z + dz >= ARENA && !occupied(e.x + dx, e.z + dz, e)) { const d = e.dir; stepE(e, [dx, dz], 0.14); e.dir = d; }
      e.t = Math.max(e.t, 0.45);
    }
    return false;
  }
  function hitBoss(b) {
    if (giant.flash > 0) return;   // um machucado por vez (o super tiro não derruba ele num segundo)
    boss.hp--;
    giant.flash = 0.12;
    giant.z = Math.max(BOSS_HOME - 0.6, giant.z - 0.16);
    sfx.bossHit(); shake = Math.max(shake, 4);
    shatter(b.x, b.z, 0.3, 0.3, 1.6, ["#5ec24a", "#3f9a36", "#ffd23f"], 4, 0.12);
    if (boss.hp <= 0) bossDown();
  }
  function bossDown() {
    boss.state = "dead";
    const cols = ["#5ec24a", "#3f9a36", "#2c7a2c", "#e4f2a6", "#fffdf0", "#ffd23f", "#ff8fd0"];
    for (let i = 0; i < 8; i++) shatter(giant.gx, giant.z - i * 0.75, 3.4, 4.0, 0.3, cols, 26, 0.24);
    sfx.bigBoom(); shake = 30; rumble(500, 1);
    addText("BUUUM!", { sx: 0.5, sy: 0.3, size: 60, col: "#ffd23f", life: 1.6 });
    gain(10, giant.gx, giant.z - 2, 1.5);
    mode = "win"; winT = 0; lara.queue = null; lara.path = null; lara.dest = null; lara.hop = null; lara.hy = 0; lara.spin = 0;
    musicStop();
  }

  /* ---------------- Momentos do chefão ---------------- */
  function startIntro() {
    boss.state = "intro"; mode = "intro"; introT = 0; roared = false;
    lara.queue = null; lara.path = null; lara.dest = null; musicStop();
  }
  function startCatch() {
    mode = "catch"; catchT = 0; chomped = false; spat = false;
    lara.queue = null; lara.path = null; lara.dest = null; lara.hop = null;
  }
  function giantWalk(dt, rate) {
    const before = Math.sin(giant.ph) >= 0;
    giant.ph += dt * rate;
    return (Math.sin(giant.ph) >= 0) !== before;
  }
  function giantFace(dt, openTo, liftTo, k) {
    giant.open = lerp(giant.open, openTo, 1 - Math.exp(-dt * (k || 8)));
    giant.lift = lerp(giant.lift, liftTo, 1 - Math.exp(-dt * (k || 8)));
  }

  /* ---------------- Atualização ---------------- */
  function camTarget() {
    // perto da arena a câmera sobe para mostrar o T-Rex inteiro (com a Lara mais embaixo)
    const lift = boss.state === "dead" ? 0 : clamp((ARENA + 4 - lara.fz) / 4, 0, 1) * 3.2;
    return clamp(lara.fz - lift, 4.5, ZMAX - 4);
  }
  function update(dt) {
    now += dt;
    shake = Math.max(0, shake - dt * 30);
    lara.bump = Math.max(0, lara.bump - dt);
    lara.shootT = Math.max(0, lara.shootT - dt);
    lara.landT = Math.max(0, lara.landT - dt);
    lara.idle += dt;
    bumpSnd = Math.max(0, bumpSnd - dt);
    giant.flash = Math.max(0, giant.flash - dt);
    fireCD = Math.max(0, fireCD - dt);
    comboT = Math.max(0, comboT - dt);
    if (state === "play") playT += dt;

    pollPad(dt);
    if (canControl()) {
      if ((firing || burstN > 0) && fireCD <= 0) { shoot(); fireCD = pw.tiro > 0 ? 0.13 : 0.17; if (burstN > 0 && --burstN === 0) aimE = null; }
      if (!lara.hop) {
        if (stickDir) move(stickDir[0], stickDir[1]);
        else if (lara.path) {
          const n = lara.path.shift();
          if (!n || !move(n[0] - lara.x, n[1] - lara.z, true)) { lara.path = null; lara.dest = null; }
          else if (!lara.path.length) lara.path = null;
        } else if (lara.dest) lara.dest = null;
      }
      for (const k of ["tiro", "bolha", "ima"]) pw[k] = Math.max(0, pw[k] - dt);
      // ímã: as estrelinhas de perto vêm voando
      if (pw.ima > 0) for (const k of stars) {
        const [sx, sz] = k.split(",").map(Number);
        if (Math.abs(sx - lara.x) + Math.abs(sz - lara.z) <= 3) { stars.delete(k); sfx.star(); gain(1, sx, sz); }
      }
    } else { burstN = 0; }

    // pulo da Lara
    if (lara.hop) {
      const h = lara.hop;
      h.t += dt;
      const k = Math.min(1, h.t / h.dur);
      lara.fx = lerp(h.x0, h.x1, k);
      lara.fz = lerp(h.z0, h.z1, h.kind === "spit" ? ease(k) : k);
      lara.hy = Math.sin(k * Math.PI) * h.arc;
      lara.spin = h.kind === "tumble" || h.kind === "spit" ? k * TAU : 0;
      if (k >= 1) { lara.hop = null; lara.hy = 0; lara.spin = 0; land(h.kind); }
    }

    if (state === "menu") {
      lara.hy = Math.abs(Math.sin(now * 3)) * 0.12; lara.idle = 5;
    } else if (state === "play") {
      if (mode === "play" || mode === "intro") lara.inv = Math.max(0, lara.inv - dt);
      updateEnemies(dt);
      updateBullets(dt);
      updatePet(dt);
      if (mode === "intro") updateIntro(dt);
      else if (mode === "catch") updateCatch(dt);
      else if (mode === "win") updateWin(dt);
      else updateBoss(dt);
    }
    // chefão dormindo: respira de boca fechadinha
    if (boss.state === "sleep") { giantFace(dt, 0.02 + 0.02 * Math.sin(now * 1.2), Math.sin(now * 1.2) * 0.05, 3); }

    camZ = lerp(camZ, camTarget(), 1 - Math.exp(-dt * 7));

    for (const p of wparts) { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= p.g * dt; }
    wparts = wparts.filter((p) => p.life > 0);
    for (const f of frags) {
      f.life -= dt; f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt; f.vy -= 16 * dt;
      if (f.y < 0) { f.y = 0; if (f.bounce < 2) { f.vy = -f.vy * 0.35; f.bounce++; } else f.vy = 0; f.vx *= 0.55; f.vz *= 0.55; }
    }
    frags = frags.filter((f) => f.life > 0);
    for (const p of sparts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
    sparts = sparts.filter((p) => p.life > 0 && p.y < H + 20);
    for (const t of texts) t.life -= dt;
    texts = texts.filter((t) => t.life > 0);
    for (const f of flies) f.t += dt * 1.7;
    flies = flies.filter((f) => f.t < 1);
  }

  function occupied(x, z, self) {
    for (const e of enemies) if (e !== self && e.kind !== "ptero" && ((e.x === x && e.z === z) || (Math.round(e.fx) === x && Math.round(e.fz) === z))) return true;
    return false;
  }
  function freeDirs(e) { return DIRS.filter(([dx, dz]) => !blocked(e.x + dx, e.z + dz) && e.z + dz >= ARENA && !occupied(e.x + dx, e.z + dz, e)); }
  function stepE(e, ch, dur) { e.x0 = e.x; e.z0 = e.z; e.x += ch[0]; e.z += ch[1]; e.mv = 1; e.mvDur = dur; if (ch[0]) e.dir = ch[0]; }
  // dá um passo: na direção da Lara (com chance p) ou passeando
  function walkE(e, dur, p) {
    const o = freeDirs(e);
    if (!o.length) return false;
    const dxL = lara.x - e.x, dzL = lara.z - e.z;
    let ch;
    if (Math.random() < p) {
      o.sort((a, b) => (Math.abs(dxL - a[0]) + Math.abs(dzL - a[1])) - (Math.abs(dxL - b[0]) + Math.abs(dzL - b[1])));
      ch = o[0];
    } else ch = pick(o);
    stepE(e, ch, dur);
    return true;
  }
  function notice(e) { if (!seen[e.kind]) { seen[e.kind] = true; addText(DINOS[e.kind].name + "!", { wx: e.fx, wz: e.fz, wy: 1.9 + e.y, size: 24, col: "#ffffff", life: 1.6 }); } }

  function updateEnemies(dt) {
    const frozen = mode !== "play";
    for (const e of enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.squash = Math.max(0, e.squash - dt * 5);
      e.alert = Math.max(0, e.alert - dt);
      e.hpT = Math.max(0, e.hpT - dt);
      e.cd = Math.max(0, e.cd - dt);
      const dist = Math.abs(lara.x - e.x) + Math.abs(lara.z - e.z);
      if (e.kind === "ptero") { updatePtero(e, dt, frozen); continue; }
      e.ph += dt * (e.mv > 0 ? 14 : 3);
      if (e.mv > 0) {
        e.mv = Math.max(0, e.mv - dt / e.mvDur);
        const k = 1 - e.mv;
        e.fx = lerp(e.x0, e.x, k); e.fz = lerp(e.z0, e.z, k);
        continue;
      }
      if (frozen) continue;
      if (dist < 6) notice(e);
      if (e.st === "dizzy") { e.stT -= dt; if (e.stT <= 0) { e.st = "idle"; e.t = 0.4; } continue; }
      e.t -= dt;
      if (e.kind === "raptor") {
        // corre em arrancadas de três pulos e para para respirar
        if (e.st === "burst") {
          if (e.n > 0 && walkE(e, 0.19, 0.9)) e.n--;
          else { e.st = "idle"; e.t = rand(0.9, 1.3); }
        } else if (e.t <= 0) {
          if (dist < 7) { e.st = "burst"; e.n = 3; e.alert = 0.5; }
          else { walkE(e, 0.3, 0); e.t = rand(0.5, 1.2); }
        }
      } else if (e.kind === "rexy") {
        // vem atrás, sem parar, de boca aberta
        if (e.t <= 0) { walkE(e, 0.32, dist < 8 ? 0.8 : 0); e.t = dist < 8 ? 0.42 : rand(0.6, 1.2); }
      } else if (e.kind === "trike") {
        // viu a Lara em linha reta: cisca o chão e dá uma cabeçada até bater em alguma coisa
        if (e.st === "tele") {
          e.stT -= dt;
          if (e.stT <= 0) { e.st = "charge"; e.n = 9; }
        } else if (e.st === "charge") {
          if (e.n > 0 && !blocked(e.x + e.cdx, e.z + e.cdz) && e.z + e.cdz >= ARENA && !occupied(e.x + e.cdx, e.z + e.cdz, e)) { stepE(e, [e.cdx, e.cdz], 0.1); e.n--; }
          else {
            e.st = "dizzy"; e.stT = 2.2; e.cd = 4;
            if (e.n > 0) { sfx.wall(); sfx.thump(0.4); shake = Math.max(shake, 5); dust(e.fx + e.cdx * 0.4, e.fz + e.cdz * 0.4, 8); }
          }
        } else {
          const sameCol = lara.x === e.x, sameRow = lara.z === e.z;
          if (e.cd <= 0 && (sameCol || sameRow) && dist >= 2 && dist <= 7 && lineClear(e.x, e.z, lara.x, lara.z)) {
            e.st = "tele"; e.stT = 0.85; e.alert = 0.85;
            e.cdx = sameRow ? Math.sign(lara.x - e.x) : 0; e.cdz = sameCol ? Math.sign(lara.z - e.z) : 0;
            if (e.cdx) e.dir = e.cdx;
            sfx.snort();
          } else if (e.t <= 0) { walkE(e, 0.45, dist < 7 ? 0.5 : 0); e.t = rand(0.8, 1.4); }
        }
      } else {
        // estegossauro: dorme até alguém chegar perto
        if (e.st === "sleep") { if (dist <= 3) { e.st = "idle"; e.alert = 0.8; e.t = 0.7; } }
        else if (e.t <= 0) { walkE(e, 0.55, dist < 6 ? 0.7 : 0); e.t = rand(0.9, 1.3); }
      }
    }
    // encostou na Lara?
    if (mode === "play" && lara.inv <= 0 && (!lara.hop || lara.hop.kind === "hop")) {
      for (const e of enemies) {
        if (e.kind === "ptero" || e.st === "dizzy") continue;
        if (Math.abs(e.fx - lara.fx) < 0.6 && Math.abs(e.fz - lara.fz) < 0.55) {
          if (e.st === "sleep") { e.st = "idle"; e.alert = 0.8; e.t = 1.0; continue; }
          hurt(e.fx, e.fz, e); e.t = Math.max(e.t, 1.0);
          if (e.st === "charge" || e.st === "burst") { e.st = "idle"; e.cd = 3; }
          break;
        }
      }
    }
  }
  // voa de um lado para o outro; de vez em quando marca o chão e mergulha
  function updatePtero(e, dt, frozen) {
    e.ph += dt * 6; e.ph2 += dt;
    if (e.st === "fly") {
      e.fx += e.vx * dt;
      if (Math.abs(e.fx) > MAXX + 0.6) { e.vx = -Math.sign(e.fx) * Math.abs(e.vx); }
      e.dir = Math.sign(e.vx) || 1;
      e.fz = lerp(e.fz, e.z0 + Math.sin(e.ph2 * 0.8) * 1.2, 1 - Math.exp(-dt * 3));
      e.y = lerp(e.y, 1.5 + Math.sin(e.ph2 * 2) * 0.1, 1 - Math.exp(-dt * 4));
      if (!frozen && Math.abs(lara.fz - e.fz) < 7) notice(e);
      if (!frozen && e.cd <= 0 && Math.abs(lara.fz - e.fz) < 5 && lara.z >= ARENA) {
        e.st = "tele"; e.stT = 1.0; e.tx = lara.x; e.tz = lara.z; e.alert = 1.0; sfx.squawk();
      }
    } else if (e.st === "tele") {
      e.stT -= dt;
      e.fx = lerp(e.fx, e.tx, 1 - Math.exp(-dt * 5)); e.fz = lerp(e.fz, e.tz - 0.4, 1 - Math.exp(-dt * 5));
      if (Math.abs(e.tx - e.fx) > 0.1) e.dir = Math.sign(e.tx - e.fx);
      if (e.stT <= 0) { e.st = "dive"; e.stT = 0.3; e.sx = e.fx; e.sz = e.fz; }
    } else if (e.st === "dive") {
      e.stT -= dt;
      const k = clamp(1 - e.stT / 0.3, 0, 1);
      e.fx = lerp(e.sx, e.tx, k); e.fz = lerp(e.sz, e.tz, k); e.y = lerp(1.5, 0.2, k);
      if (e.stT <= 0) {
        dust(e.tx, e.tz, 6);
        if (mode === "play" && lara.inv <= 0 && lara.x === e.tx && lara.z === e.tz && (!lara.hop || lara.hop.kind === "hop")) hurt(e.fx - e.dir, e.fz, e);
        e.st = "rise"; e.stT = 0.7;
      }
    } else {
      e.stT -= dt;
      e.y = lerp(e.y, 1.5, 1 - Math.exp(-dt * 4));
      if (e.stT <= 0) { e.st = "fly"; e.cd = rand(4, 6.5); e.z0 = clamp(e.fz, ARENA + 3, ZMAX - 4); }
    }
    e.x = Math.round(e.fx); e.z = Math.round(e.fz);
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      b.trail.push([b.x, b.z]); if (b.trail.length > 5) b.trail.shift();
      const n = 3;
      for (let i = 0; i < n && b.life > 0; i++) {
        b.x += (b.vx * dt) / n; b.z += (b.vz * dt) / n;
        if (!b.air && blocked(Math.round(b.x), Math.round(b.z)) && !(b.z < ARENA && Math.abs(b.x) <= MAXX + 0.5)) {
          b.life = 0; sparkle(b.x, b.z, "#ffffff"); if (!b.pet) sfx.wall(); break;
        }
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (Math.abs(e.fx - b.x) < 0.55 && Math.abs(e.fz - b.z) < 0.5) {
            b.life = 0;
            if (hitEnemy(e, b)) enemies.splice(j, 1);
            break;
          }
        }
        if (b.life > 0 && boss.state === "fight") {
          if (Math.abs(b.x - giant.gx) < 1.8 && b.z <= giant.z + 0.4 && b.z >= giant.z - 5) { b.life = 0; hitBoss(b); }
        }
      }
      b.life -= dt;
    }
    bullets = bullets.filter((b) => b.life > 0);
  }

  // o amiguinho segue a Lara e joga coraçõezinhos nos dinos
  function updatePet(dt) {
    if (!pet) return;
    pet.pop = Math.max(0, pet.pop - dt);
    const tx = lara.hop ? lara.hop.x0 : lara.px, tz = lara.hop ? lara.hop.z0 : lara.pz;
    const dx = tx - pet.fx, dz = tz - pet.fz, d = Math.hypot(dx, dz);
    pet.mv = d > 0.08 ? 1 : 0;
    pet.ph += dt * (pet.mv ? 16 : 3);
    if (d > 4) { pet.fx = tx; pet.fz = tz; }
    else if (d > 0.02) { const k = 1 - Math.exp(-dt * 9); pet.fx += dx * k; pet.fz += dz * k; if (Math.abs(dx) > 0.05) pet.dir = Math.sign(dx); }
    pet.cd -= dt;
    if (pet.cd <= 0 && mode === "play") {
      const t = findTarget(pet.fx, pet.fz, 5);
      if (t) {
        const ax = t.x - pet.fx, az = t.z - pet.fz, ad = Math.hypot(ax, az) || 1;
        bullets.push({ x: pet.fx, z: pet.fz, vx: (ax / ad) * 9, vz: (az / ad) * 9, life: 0.8, trail: [], air: !!t.air, col: "#ff8fd0", pet: true });
        if (Math.abs(ax) > 0.1) pet.dir = Math.sign(ax);
        sfx.piu(); pet.cd = 1.5;
      } else pet.cd = 0.3;
    }
  }

  function updateIntro(dt) {
    introT += dt;
    // acorda: abre os olhos, levanta a cabeça... e o ÚNICO rugido do jogo
    giant.gx = lerp(giant.gx, clamp(lara.fx * 0.5, -2, 2), 1 - Math.exp(-dt * 2));
    if (introT < 1.0) giantFace(dt, 0.1, 0.2, 4);
    else if (introT < 2.6) giantFace(dt, 1, 0.4 + Math.sin(introT * 30) * 0.05, 10);
    else giantFace(dt, 0.2, 0, 4);
    if (!roared && introT >= 1.0) {
      roared = true;
      sfx.roar(); rumble(700, 1); shake = 26;
      addText("O T-REX GIGANTE!", { sx: 0.5, sy: 0.56, size: 40, col: "#ff5b4d", life: 2.2 });
    }
    if (introT >= 3.2) {
      boss.state = "fight"; mode = "play";
      musicPlay(0, 1.25);
      addText("ATIRA, LARA!", { sx: 0.5, sy: 0.56, size: 42, col: "#ffd23f", life: 1.8 });
    }
  }

  function updateBoss(dt) {
    if (boss.state !== "fight") return;
    // anda devagar em direção à Lara (sem entrar no labirinto)
    const target = Math.min(lara.fz - 0.1, ARENA - 1.2);
    if (giant.z < target) giant.z = Math.min(target, giant.z + 0.34 * dt);
    giant.gx = lerp(giant.gx, clamp(lara.fx * 0.7, -2.5, 2.5), 1 - Math.exp(-dt * 1.2));
    const d = lara.fz - giant.z;
    giantFace(dt, d < 2.6 ? 0.4 + 0.35 * Math.abs(Math.sin(now * 4)) : 0.15 + 0.1 * Math.abs(Math.sin(now * 2)), 0, 6);
    if (giantWalk(dt, 4.5) && d < 5) { sfx.thump(0.3 + 0.5 * clamp(1 - d / 5, 0, 1)); shake = Math.max(shake, 2 + 4 * clamp(1 - d / 5, 0, 1)); }
    if (d <= 0.3 && Math.abs(giant.gx - lara.fx) < 1.6 && lara.inv <= 0 && !lara.hop) startCatch();
  }

  function updateCatch(dt) {
    catchT += dt;
    if (catchT < 0.5) {
      giant.z = lerp(giant.z, lara.fz + 0.35, 1 - Math.exp(-dt * 10));
      giant.gx = lerp(giant.gx, lara.fx, 1 - Math.exp(-dt * 10));
      giantFace(dt, 1, -0.6, 12);
    } else if (catchT < 1.8) {
      if (!chomped) {
        chomped = true; sfx.chomp(); rumble(160, 0.8); shake = 20;
        addText("NHAC!", { sx: 0.5, sy: 0.7, size: 64, col: "#fff", life: 1.1 });
      }
      const was = Math.sin((catchT - dt) * 14) > 0, is = Math.sin(catchT * 14) > 0;
      if (was !== is && is) sfx.munch();
      giant.open = 0.12 * Math.abs(Math.sin(catchT * 14));
      giant.lift = lerp(giant.lift, -0.3 + Math.sin(catchT * 7) * 0.1, 1 - Math.exp(-dt * 6));
    } else {
      if (!spat) {
        spat = true;
        // cospe a Lara de volta para a entrada do labirinto
        const tz = ARENA + 1, tx = freeX(tz, lara.x);
        lara.fx = giant.gx; lara.fz = giant.z;
        startHop(tx, tz, 0.7, 2.8, "spit");
        lara.inv = 1.8;
        sfx.pop();
        addText("BLÉ!", { sx: 0.5, sy: 0.6, size: 56, col: "#5cd97a", life: 1.1 });
      }
      giantFace(dt, 0.7, 0.3, 8);
      giant.z = lerp(giant.z, BOSS_HOME, 1 - Math.exp(-dt * 3));
      giantWalk(dt, -3);
    }
    if (catchT >= 2.6) mode = "play";
  }

  function updateWin(dt) {
    winT += dt;
    if (winT > 0.9 && winT - dt <= 0.9) {
      sfx.win(); musicPlay(1, 1); speak("Parabéns, Lara!"); confetti(180); rumble(300, 0.6);
      addText("Parabéns, Lara!", { sx: 0.5, sy: 0.24, size: 44, col: "#ffd23f", life: 3 });
      save.wins = (save.wins || 0) + 1;
      if (nStars > save.best) { save.best = nStars; save.newBest = true; } else save.newBest = false;
      persist();
    }
    if (winT > 0.9) lara.hy = Math.abs(Math.sin(winT * 6)) * 0.5;
    if (winT > 4.2 && !endShown) { endShown = true; showEnd(); }
  }

  /* ---------------- Desenho: cenário ---------------- */
  // desenhos prontos (árvores, pedras): feitos uma vez e carimbados na tela
  function sprite(name, w, h, ax, ay, draw) {
    let s = sprites.get(name);
    if (s) return s;
    const c = document.createElement("canvas");
    c.width = Math.ceil(w * T * DPR); c.height = Math.ceil(h * T * DPR);
    const g = c.getContext("2d");
    g.scale(T * DPR, T * DPR); g.translate(ax, ay); pen(g);
    const old = ctx; ctx = g;
    try { draw(); } finally { ctx = old; }
    s = { c, w: w * T, h: h * T, ax: ax * T, ay: ay * T };
    sprites.set(name, s);
    return s;
  }
  const SCENERY = {
    tree() {
      E(0, 0, 0.42, 0.13, "rgba(30,50,20,0.25)", 0, true);
      P([[-0.11, 0.02], [-0.08, -0.5], [0.08, -0.5], [0.11, 0.02]], "#9a6238");
      cluster([[0, -0.72, 0.42, 0.36], [-0.3, -0.56, 0.24, 0.22], [0.3, -0.56, 0.24, 0.22], [0, -0.98, 0.26, 0.22]], "#34a853");
      E(-0.12, -0.9, 0.17, 0.11, "#5fd070", -0.4, true);
      E(0.2, -0.62, 0.08, 0.06, "#2b9247", 0, true); E(-0.26, -0.5, 0.07, 0.05, "#2b9247", 0, true);
    },
    bush() {
      E(0, 0, 0.44, 0.12, "rgba(30,50,20,0.25)", 0, true);
      cluster([[0, -0.4, 0.4, 0.34], [-0.3, -0.26, 0.2, 0.2], [0.3, -0.26, 0.2, 0.2]], "#46bd5c");
      E(-0.1, -0.52, 0.16, 0.1, "#7be07f", -0.3, true);
      for (const [x, y] of [[0.16, -0.36], [-0.2, -0.3], [0.02, -0.6]]) { E(x, y, 0.06, 0.06, "#ff5d8f", 0, true); E(x - 0.015, y - 0.015, 0.02, 0.02, "#ffd0e0", 0, true); }
    },
    palm() {
      E(0, 0, 0.36, 0.11, "rgba(30,50,20,0.25)", 0, true);
      P([[-0.08, 0.02], [-0.02, -0.5], [0.06, -0.95], [0.16, -0.95], [0.12, -0.5], [0.08, 0.02]], "#b07a45");
      for (const y of [-0.2, -0.42, -0.64]) ST([[-0.04, y], [0.1, y - 0.03]], "#8a5a2c", 0.035);
      for (const [dx, dy, r] of [[-0.52, -0.2, 0.3], [0.56, -0.16, -0.3], [-0.36, 0.14, 0.9], [0.44, 0.16, -0.9], [0.02, -0.34, 0]]) {
        P([[0.1, -0.98], [0.1 + dx * 0.5 - dy * 0.3, -0.98 + dy * 0.5 - 0.16], [0.1 + dx, -0.98 + dy], [0.1 + dx * 0.5 + dy * 0.2, -0.98 + dy * 0.5 + 0.1]], r > 0.5 || r < -0.5 ? "#2fa04f" : "#43c463");
      }
      E(0.06, -0.92, 0.06, 0.06, "#7a4a2a"); E(0.17, -0.9, 0.055, 0.055, "#7a4a2a");
    },
    rock() {
      E(0, 0, 0.42, 0.12, "rgba(30,50,20,0.25)", 0, true);
      cluster([[0, -0.24, 0.38, 0.26], [-0.2, -0.16, 0.2, 0.17], [0.18, -0.4, 0.18, 0.16]], "#a9abbd");
      E(-0.1, -0.36, 0.14, 0.08, "#cfd1de", -0.3, true);
      ST([[0.12, -0.2], [0.2, -0.1], [0.14, -0.04]], "#7f8196", 0.035);
    },
    egg() {
      E(0, -0.02, 0.2, 0.07, "rgba(30,50,20,0.25)", 0, true);
      P([[0, -0.62], [-0.2, -0.46], [-0.24, -0.16], [0, 0], [0.24, -0.16], [0.2, -0.46]], "#fffdf2");
      for (const [x, y, c] of [[-0.08, -0.4, "#ff8fd0"], [0.09, -0.26, "#4db5ff"], [-0.06, -0.14, "#ffd23f"], [0.08, -0.46, "#5cd97a"]]) E(x, y, 0.05, 0.045, c, 0, true);
    },
  };
  const SPR = { tree: [1.5, 1.5, 0.75, 1.32], bush: [1.3, 1.0, 0.65, 0.84], palm: [1.7, 1.7, 0.8, 1.52], rock: [1.2, 0.9, 0.6, 0.74], egg: [0.8, 0.9, 0.4, 0.76] };
  function scenery(kind) { const d = SPR[kind]; return sprite(kind, d[0], d[1], d[2], d[3], SCENERY[kind]); }
  function put(kind, x, z, flip, dy, rot) {
    const s = scenery(kind), px = SX(x), py = SY(z + 0.36, 0) - (dy || 0);
    if (flip || rot) {
      ctx.save(); ctx.translate(px, py); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1);
      ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); ctx.restore();
    } else ctx.drawImage(s.c, px - s.ax, py - s.ay, s.w, s.h);
  }

  function drawStar(x, z) {
    const cx = SX(x), cy = SY(z, 0.5 + Math.sin(now * 3 + x) * 0.08), sx = Math.abs(Math.cos(now * 2.5 + z)) * 0.6 + 0.4;
    ctx.fillStyle = "rgba(30,50,20,0.18)";
    ctx.beginPath(); ctx.ellipse(cx, SY(z, 0), T * 0.2, L * 0.09, 0, 0, TAU); ctx.fill();
    starPath(cx, cy, T * 0.3, T * 0.14, sx);
    ctx.fillStyle = "#ffd23f"; ctx.fill();
    ctx.lineWidth = Math.max(2, T * 0.06); ctx.strokeStyle = OUT; ctx.lineJoin = "round"; ctx.stroke();
    starPath(cx - T * 0.03 * sx, cy - T * 0.03, T * 0.13, T * 0.06, sx);
    ctx.fillStyle = "#fff6a8"; ctx.fill();
  }
  function shadow(x, z, w) {
    ctx.fillStyle = "rgba(30,50,20,0.25)";
    ctx.beginPath(); ctx.ellipse(SX(x), SY(z, 0), T * w, L * 0.16, 0, 0, TAU); ctx.fill();
  }

  /* ---------------- Desenho: dinos ---------------- */
  function moodOf(e) {
    if (e.st === "dizzy") return "dizzy";
    if (e.st === "sleep") return "sleep";
    if (e.st === "tele" || e.st === "charge" || e.st === "burst" || e.st === "dive") return "angry";
    if (e.kind === "rexy" && Math.abs(lara.x - e.x) + Math.abs(lara.z - e.z) < 8) return "angry";
    return "normal";
  }
  function drawEnemy(e) {
    const D = DINOS[e.kind];
    const hop = e.mv > 0 && e.st !== "charge" ? Math.sin((1 - e.mv) * Math.PI) * 0.16 : 0;
    const tele = e.st === "tele" && e.kind === "trike";
    const jx = tele ? Math.sin(now * 50) * 0.03 - e.cdx * 0.1 : 0;
    const air = e.kind === "ptero";
    if (air && (e.st === "tele" || e.st === "dive")) {   // alvo no chão: sai daí!
      const k = 0.6 + 0.4 * Math.abs(Math.sin(now * 12));
      ctx.strokeStyle = "rgba(255,70,70," + k.toFixed(2) + ")"; ctx.lineWidth = Math.max(3, T * 0.09);
      ctx.beginPath(); ctx.ellipse(SX(e.tx), SY(e.tz, 0), T * 0.42, L * 0.3, 0, 0, TAU); ctx.stroke();
    }
    shadow(e.fx, e.fz + (air ? 0.4 : 0), D.sw * (air ? clamp(1 - e.y * 0.3, 0.4, 1) : 1));
    at(e.fx + jx, e.fz, e.y + hop + (air ? 0.25 : 0), D.s, e.dir);
    if (e.squash > 0) ctx.scale(1 + e.squash * 0.25, 1 - e.squash * 0.25);
    if (e.st === "sleep") ctx.scale(1, 0.94 + 0.04 * Math.sin(now * 2 + e.ph));
    if (e.st === "dizzy") ctx.rotate(Math.sin(now * 9) * 0.07);
    if (e.st === "dive") ctx.rotate(0.5);
    const mood = moodOf(e);
    const open = e.kind === "rexy" && mood === "angry" ? Math.abs(Math.sin(now * 7)) : e.st === "burst" ? 0.8 : e.st === "tele" || e.st === "dive" ? 1 : 0;
    DRAW[e.kind](e.flash > 0 ? WHITE : D, { ph: e.ph, walk: e.mv > 0 || (tele ? 1 : 0), mood, open });
    ctx.restore();
    // balõezinhos em cima do dino
    const hx = SX(e.fx), hy = SY(e.fz, e.y + hop + 1.25 * D.s + (air ? -0.5 : 0));
    if (e.st === "sleep") {
      const k = (now * 0.6 + e.ph) % 1;
      outlined("z", hx + T * 0.25 + k * T * 0.3, hy - k * T * 0.5, T * (0.3 + k * 0.25), "#ffffff", OUT);
    } else if (e.st === "dizzy") {
      for (let i = 0; i < 3; i++) {
        const a = now * 5 + (i * TAU) / 3;
        starPath(hx + Math.cos(a) * T * 0.34, hy + T * 0.18 + Math.sin(a) * T * 0.1, T * 0.11, T * 0.05);
        ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = OUT; ctx.stroke();
      }
    } else if (e.alert > 0) {
      outlined("!", hx, hy - Math.abs(Math.sin(now * 14)) * T * 0.1, T * 0.6, "#ff4d4d", "#ffffff");
    }
    if (e.hpT > 0 && D.hp > 1 && e.st !== "dizzy") {
      for (let i = 0; i < D.hp; i++) {
        ctx.fillStyle = i < e.hp ? "#ff5d8f" : "rgba(43,29,74,0.35)";
        ctx.beginPath(); ctx.arc(hx + (i - (D.hp - 1) / 2) * T * 0.24, hy + T * 0.2, T * 0.085, 0, TAU); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      }
    }
  }
  function drawPet() {
    const hop = pet.mv ? Math.abs(Math.sin(pet.ph * 0.5)) * 0.14 : 0;
    shadow(pet.fx, pet.fz, 0.2);
    at(pet.fx, pet.fz, hop, 1 + pet.pop * 0.6, pet.dir);
    DRAW.pet(null, { ph: pet.ph, walk: pet.mv, mood: mode === "win" ? "happy" : "normal", open: 0 });
    ctx.restore();
  }

  /* ---------------- Desenho: a Lara ---------------- */
  // maria-chiquinha com lacinhos rosa, vestido rosa e o lançador de estrelas
  function laraShape(o) {
    const sk = "#f7c9a3", hair = "#6b4226", pk = "#ff5d8f", pkd = "#d63b6e", lg = "#7d44d6";
    const hy = -0.34 - o.wave * 0.36, sd = o.side;
    const gun = () => {
      if (sd) {
        const r = o.shoot ? -0.05 : 0;
        P([[sd * (0.28 + r), hy - 0.08], [sd * (0.58 + r), hy - 0.08], [sd * (0.58 + r), hy + 0.05], [sd * (0.28 + r), hy + 0.05]], "#ffd23f");
        E(sd * (0.6 + r), hy - 0.015, 0.055, 0.055, "#4db5ff");
        if (o.shoot) { starPath(sd * 0.76, hy - 0.015, 0.17, 0.07); ctx.fillStyle = "#fff6a8"; ctx.fill(); ctx.stroke(); }
      } else {
        const d = o.front ? 1 : -1;
        P([[0.26, hy - 0.02 * d], [0.4, hy - 0.02 * d], [0.4, hy + 0.24 * d], [0.26, hy + 0.24 * d]], "#ffd23f");
        E(0.33, hy + 0.26 * d, 0.055, 0.055, "#4db5ff");
        if (o.shoot) { starPath(0.33, hy + 0.42 * d, 0.17, 0.07); ctx.fillStyle = "#fff6a8"; ctx.fill(); ctx.stroke(); }
      }
    };
    if (!o.front) gun();
    // maria-chiquinhas (atrás da cabeça)
    E(-0.37, -0.8 - o.wave * 0.05, 0.11, 0.18, hair, -0.35); E(0.37, -0.8 - o.wave * 0.05, 0.11, 0.18, hair, 0.35);
    // pernas e sapatinhos
    LN(-0.09, -0.22, -0.09, -0.07, 0.075, lg); LN(0.09, -0.22, 0.09, -0.07, 0.075, lg);
    E(-0.1, -0.04, 0.095, 0.055, "#ffffff"); E(0.1, -0.04, 0.095, 0.055, "#ffffff");
    // braços (sobem no pulo e na festa)
    LN(-0.19, -0.5, -0.33, hy, 0.07, sk); LN(0.19, -0.5, 0.33, hy, 0.07, sk);
    // vestido
    P([[0, -0.62], [-0.2, -0.6], [-0.36, -0.2], [0, -0.12], [0.36, -0.2], [0.2, -0.6]], pk);
    ST([[-0.27, -0.24], [0, -0.19], [0.27, -0.24]], pkd, 0.05);
    // cabeça
    if (o.front) {
      const ex = sd * 0.06;
      E(0, -0.85, 0.3, 0.27, sk);
      P([[-0.32, -0.84], [-0.3, -1.08], [0, -1.18], [0.3, -1.08], [0.32, -0.84], [0.2, -1.0], [0, -0.95], [-0.2, -1.0]], hair);
      if (o.scared) {
        E(-0.11 + ex, -0.83, 0.06, 0.075, "#ffffff"); E(0.11 + ex, -0.83, 0.06, 0.075, "#ffffff");
        E(-0.11 + ex, -0.82, 0.03, 0.035, "#2a1a12", 0, true); E(0.11 + ex, -0.82, 0.03, 0.035, "#2a1a12", 0, true);
        E(ex, -0.69, 0.045, 0.055, "#7a2030");
      } else {
        E(-0.11 + ex, -0.83, 0.045, 0.062, "#2a1a12", 0, true); E(0.11 + ex, -0.83, 0.045, 0.062, "#2a1a12", 0, true);
        E(-0.095 + ex, -0.85, 0.016, 0.02, "#ffffff", 0, true); E(0.125 + ex, -0.85, 0.016, 0.02, "#ffffff", 0, true);
        ctx.beginPath(); ctx.arc(ex, -0.75, 0.07, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 0.035; ctx.strokeStyle = "#a02c3c"; ctx.stroke();
        ctx.lineWidth = 0.055; ctx.strokeStyle = OUT;
      }
      E(-0.2 + ex, -0.75, 0.05, 0.03, "#ff9db5", 0, true); E(0.2 + ex, -0.75, 0.05, 0.03, "#ff9db5", 0, true);
    } else {
      E(0, -0.86, 0.31, 0.29, hair);
      ST([[0, -1.13], [0, -0.72]], "#4e2f1a", 0.03);
    }
    // lacinhos
    for (const s of [-1, 1]) {
      const bx = s * 0.36, by = -1.0 - o.wave * 0.05;
      PL([[bx, by], [bx - 0.12, by - 0.1], [bx - 0.12, by + 0.08]], pk); PL([[bx, by], [bx + 0.12, by - 0.1], [bx + 0.12, by + 0.08]], pk);
      E(bx, by, 0.04, 0.04, pkd);
    }
    if (o.front) gun();
  }
  function drawLara() {
    if (state === "play" && mode === "catch" && catchT > 0.5 && catchT < 1.8) return;
    const bk = lara.bump > 0 ? Math.sin(((0.18 - lara.bump) / 0.18) * Math.PI) * 0.14 : 0;
    const x = lara.fx + bk * lara.bdx, z = lara.fz + bk * lara.bdz, y = lara.hy;
    const win = state === "play" && mode === "win";
    const front = lara.fdz >= 0 || lara.idle > 0.9 || win;      // parada, ela olha para você
    const scared = state === "play" && (mode === "intro" || mode === "catch");
    // estica no ar e achata ao pousar (fica bem "boing")
    const hopK = lara.hop && lara.hop.kind === "hop" ? lara.hop.t / lara.hop.dur : -1;
    let sq = 1;
    if (hopK >= 0) sq = 1 + 0.16 * Math.sin(hopK * Math.PI);
    if (lara.landT > 0) sq = 1 - 0.18 * Math.sin((lara.landT / 0.12) * Math.PI);
    shadow(x, z, 0.3 * (1 - Math.min(0.6, y * 0.3)));
    at(x, z, y, 1.15);
    if (state === "play" && lara.inv > 0 && Math.floor(now * 14) % 2) ctx.globalAlpha = 0.45;
    if (lara.spin) { ctx.translate(0, -0.55); ctx.rotate(lara.spin); ctx.translate(0, 0.55); }
    ctx.scale(1 / Math.sqrt(sq), sq);
    const wave = win ? Math.abs(Math.sin(winT * 6)) : Math.max(0, hopK >= 0 ? Math.sin(hopK * Math.PI) * 0.4 : 0);
    laraShape({ front, side: lara.idle > 0.9 || win ? 0 : lara.fdx, scared, wave, shoot: lara.shootT > 0 });
    if (pw.bolha > 0 && (pw.bolha > 3 || Math.floor(now * 8) % 2)) {
      ctx.globalAlpha = 1;
      E(0, -0.58, 0.62, 0.7, "rgba(140,225,255,0.28)", 0, true);
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.ellipse(0, -0.58, 0.62, 0.7, 0, 0, TAU); ctx.stroke();
      E(-0.26, -0.98, 0.1, 0.05, "rgba(255,255,255,0.8)", -0.6, true);
    }
    ctx.restore();
  }

  /* ---------------- Desenho: chão e mundo ---------------- */
  function drawGround(z, xa, xb) {
    const y0 = SY(z - 0.5, 0), y1 = SY(z + 0.5, 0), h = y1 - y0 + 0.7;
    const arena = z < ARENA;
    for (let x = xa; x <= xb; x++) {
      const out = Math.abs(x) > MAXX || z < 0 || z >= ZMAX, odd = (x + z) & 1;
      let col;
      if (out) col = odd ? "#4fa64a" : "#489c44";
      else if (arena) col = odd ? "#f0c888" : "#e8bd7b";
      else col = odd ? "#a3e36f" : "#97da66";
      ctx.fillStyle = col;
      ctx.fillRect(SX(x - 0.5), y0, T + 0.7, h);
      const hv = hash(z * 17.3 + x * 3.1);
      if (!out && !arena && hv > 0.8 && !walls.has(key(x, z))) {
        if (hv > 0.9) {         // florzinha
          const fx = SX(x - 0.22), fy = y0 + h * 0.45, r = T * 0.055;
          ctx.fillStyle = hv > 0.95 ? "#ff8fd0" : "#ffffff";
          for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * r, fy + Math.sin(a) * r * 0.8, r * 0.75, 0, TAU); ctx.fill(); }
          ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(fx, fy, r * 0.6, 0, TAU); ctx.fill();
        } else {                // tufinho de grama
          ctx.strokeStyle = "#6fc04f"; ctx.lineWidth = Math.max(1.5, T * 0.04); ctx.lineCap = "round";
          const gx = SX(x + 0.15), gy = y0 + h * 0.62;
          ctx.beginPath(); ctx.moveTo(gx - T * 0.07, gy); ctx.lineTo(gx - T * 0.1, gy - T * 0.1); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - T * 0.14); ctx.moveTo(gx + T * 0.07, gy); ctx.lineTo(gx + T * 0.1, gy - T * 0.1); ctx.stroke();
        }
      } else if (arena && !out && hv > 0.7) {
        ctx.fillStyle = "#d6a765";
        ctx.beginPath(); ctx.ellipse(SX(x - 0.15), y0 + h * 0.45, T * 0.08, T * 0.045, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(SX(x + 0.2), y0 + h * 0.68, T * 0.06, T * 0.035, 0, 0, TAU); ctx.fill();
      }
    }
  }
  function drawBullet(b) {
    for (let i = 0; i < b.trail.length; i++) {
      const [tx, tz] = b.trail[i], a = (i + 1) / (b.trail.length + 1);
      ctx.globalAlpha = 0.5 * a; ctx.fillStyle = b.col;
      ctx.beginPath(); ctx.arc(SX(tx), SY(tz, 0.42), T * 0.1 * a + 1, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const cx = SX(b.x), cy = SY(b.z, 0.42);
    if (b.pet) {   // coraçãozinho
      const r = T * 0.11;
      ctx.fillStyle = b.col; ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1.5, T * 0.04);
      ctx.beginPath(); ctx.moveTo(cx, cy + r * 1.2); ctx.bezierCurveTo(cx - r * 2.2, cy - r * 0.4, cx - r * 0.8, cy - r * 1.8, cx, cy - r * 0.5);
      ctx.bezierCurveTo(cx + r * 0.8, cy - r * 1.8, cx + r * 2.2, cy - r * 0.4, cx, cy + r * 1.2); ctx.fill(); ctx.stroke();
      return;
    }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(now * 14);
    starPath(0, 0, T * 0.24, T * 0.11);
    ctx.fillStyle = b.col; ctx.fill(); ctx.lineWidth = Math.max(2, T * 0.05); ctx.strokeStyle = OUT; ctx.lineJoin = "round"; ctx.stroke();
    ctx.restore();
  }

  function drawWorld() {
    const above = Math.ceil(BASE / L) + 4, below = Math.ceil((H - BASE) / L) + 2;
    const zTop = Math.floor(camZ) - above, zBottom = Math.floor(camZ) + below;
    const xr = Math.ceil(W / 2 / T) + 1;
    const lz = Math.round(lara.fz), zg = Math.floor(giant.z), pz = pet ? Math.round(pet.fz) : null;
    const showBoss = boss.state !== "dead";
    // agrupa por faixa o que anda, para desenhar na ordem certa
    const rowsE = new Map(), rowsF = new Map(), flying = [];
    for (const e of enemies) { if (e.kind === "ptero") { flying.push(e); continue; } const r = Math.round(e.fz); (rowsE.get(r) || rowsE.set(r, []).get(r)).push(e); }
    for (const f of frags) { const r = Math.round(f.z); (rowsF.get(r) || rowsF.set(r, []).get(r)).push(f); }
    for (let z = zTop; z <= zBottom; z++) drawGround(z, -xr, xr);
    // para onde ela está indo
    if (lara.dest && state === "play") {
      const k = (now * 1.6) % 1, cx = SX(lara.dest[0]), cy = SY(lara.dest[1], 0);
      ctx.strokeStyle = "rgba(255,255,255," + (0.9 * (1 - k)).toFixed(2) + ")"; ctx.lineWidth = Math.max(3, T * 0.08);
      ctx.beginPath(); ctx.ellipse(cx, cy, T * (0.2 + 0.25 * k), L * (0.16 + 0.2 * k), 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(cx, cy, T * 0.13, L * 0.1, 0, 0, TAU); ctx.fill();
    }
    if (showBoss && zg < zTop) drawGiant();
    for (let z = zTop; z <= zBottom; z++) {
      // mato fechado em volta (fora do labirinto)
      for (let x = -xr; x <= xr; x++) {
        if (Math.abs(x) <= MAXX && z >= 0 && z < ZMAX) continue;
        const hv = hash(z * 31.7 + x * 7.3);
        if (hv > 0.25) put(hv > 0.85 ? "palm" : hv > 0.5 ? "tree" : hv > 0.38 ? "bush" : "rock", x, z, hv * 100 % 1 > 0.5);
      }
      for (let x = -MAXX; x <= MAXX; x++) {
        const k = key(x, z), w = walls.get(k);
        if (w) put(w, x, z, hash(z * 3.3 + x * 9.1) > 0.5);
        else if (eggs.has(k)) put("egg", x, z, false, Math.abs(Math.sin(now * 3 + x)) * T * 0.08 + L * 0.3, Math.sin(now * 5 + z) * 0.12);
        else if (stars.has(k)) drawStar(x, z);
      }
      const es = rowsE.get(z);
      if (es) for (const e of es) drawEnemy(e);
      const fs = rowsF.get(z);
      if (fs) for (const f of fs) {
        ctx.globalAlpha = clamp(f.life / 0.4, 0, 1); ctx.fillStyle = f.col;
        ctx.beginPath(); ctx.arc(SX(f.x), SY(f.z, f.y + f.s * 0.5), f.s * T * 0.5, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (pet && z === pz) drawPet();
      if (z === lz) drawLara();
      if (showBoss && z === zg) drawGiant();
    }
    if (lz > zBottom || lz < zTop) drawLara();
    for (const e of flying) drawEnemy(e);
    for (const b of bullets) drawBullet(b);
    for (const p of wparts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(SX(p.x), SY(p.z, p.y), p.s * T * 0.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // joystick que aparece embaixo do dedo
  function drawStick() {
    if (!ptr || !ptr.stick || state !== "play") return;
    const R = T * 1.1;
    ctx.save();
    ctx.fillStyle = "rgba(43,29,74,0.22)"; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ptr.ox, ptr.oy, R, 0, TAU); ctx.fill(); ctx.stroke();
    const kx = stickDir ? stickDir[0] : 0, kz = stickDir ? stickDir[1] : 0;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath(); ctx.arc(ptr.ox + kx * R * 0.55, ptr.oy + kz * R * 0.55, R * 0.45, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function drawBossBar() {
    if (boss.state !== "fight" && boss.state !== "intro") return;
    const w = Math.min(W * 0.8, 360), h = 18, x = (W - w) / 2, y = Math.max(64, H * 0.085);
    const k = boss.state === "intro" ? clamp(introT / 1.2, 0, 1) : boss.hp / BOSS_HP;
    ctx.save();
    ctx.fillStyle = "rgba(43,29,74,0.75)";
    roundRect(x - 6, y - 6, w + 12, h + 12, 14); ctx.fill();
    ctx.fillStyle = "#4a1020"; roundRect(x, y, w, h, 9); ctx.fill();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#ff5b4d"); g.addColorStop(1, "#ffb03d");
    ctx.fillStyle = g; roundRect(x, y, Math.max(h, w * k), h, 9); ctx.fill();
    outlined("T-REX", x + w / 2, y + h / 2 + 1, 15, "#ffffff", OUT);
    ctx.restore();
  }
  // poderes ligados (com o tempinho que falta)
  function drawPowers() {
    if (state !== "play") return;
    const list = [["tiro", "🌈", 14, "#ff8fd0"], ["bolha", "🛡️", 25, "#9be7ff"], ["ima", "🧲", 18, "#ffd23f"]].filter((p) => pw[p[0]] > 0);
    let y = Math.max(64, H * 0.085) + (bossAlive() ? 40 : 0);
    for (const [k, icon, max, col] of list) {
      ctx.fillStyle = "rgba(43,29,74,0.7)"; roundRect(12, y, 92, 30, 15); ctx.fill();
      ctx.font = "20px " + FONT; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "#fff"; ctx.fillText(icon, 18, y + 16);
      ctx.fillStyle = "rgba(255,255,255,0.25)"; roundRect(46, y + 10, 50, 10, 5); ctx.fill();
      ctx.fillStyle = col; roundRect(46, y + 10, Math.max(10, 50 * (pw[k] / max)), 10, 5); ctx.fill();
      y += 36;
    }
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---------------- Desenho: o T-Rex gigante (de frente, vindo para cima da Lara) ---------------- */
  const REX_BASE = { f: "#5ec24a", s: "#3f9a36", d: "#2c7a2c", belly: "#e4f2a6", mouth: "#8a1424", tongue: "#ff7d95", tooth: "#fffdf0" };
  const REX_FLASH = { f: "#f3ffe9", s: "#e6fadb", d: "#cdeec0", belly: "#ffffff", mouth: "#ff9db0", tongue: "#ffc2cf", tooth: "#ffffff" };
  function drawGiant() {
    const C = giant.flash > 0 ? REX_FLASH : REX_BASE;
    if (SY(giant.z, 0) < -10) return; // ainda lá em cima, fora da tela
    const ph = giant.ph, open = clamp(giant.open, 0, 1), sleep = boss.state === "sleep";
    const sw = Math.sin(ph * 0.5 + now * 0.8) * 0.25, bob = Math.abs(Math.sin(ph)) * 0.08;
    const l1 = Math.max(0, Math.sin(ph)) * 0.35, l2 = Math.max(0, -Math.sin(ph)) * 0.35;
    at(giant.gx, giant.z, 0, 1.22);
    ctx.lineWidth = 0.07;
    // sombra
    E(0, -1.5, 2.3, 0.75, "rgba(30,40,20,0.28)", 0, true);
    // rabo balançando lá atrás
    P([[0.9, -3.4], [1.9 + sw, -4.2], [2.7 + sw * 2, -5.3], [2.3 + sw * 1.5, -3.9], [1.5, -2.6]], C.s);
    // pernas (pisando, uma de cada vez)
    for (const [sd, l] of [[-1, l1], [1, l2]]) {
      E(sd * 1.25, -2.3 - l, 0.62, 0.85, C.s);
      P([[sd * 0.75, -1.5 - l], [sd * 0.85, -1.05 - l], [sd * 1.75, -1.05 - l], [sd * 1.85, -1.5 - l], [sd * 1.3, -1.75 - l]], C.d);
      for (const c of [-1, 0, 1]) PL([[sd * 1.3 + c * 0.33 - 0.1, -1.1 - l], [sd * 1.3 + c * 0.33, -0.88 - l], [sd * 1.3 + c * 0.33 + 0.1, -1.1 - l]], C.tooth);
    }
    // corpo, barriga e placas nas costas
    for (let i = 0; i < 5; i++) { const x = -0.8 + i * 0.4, y = -4.72 + Math.abs(i - 2) * 0.12; PL([[x - 0.2, y + 0.1], [x, y - 0.32], [x + 0.2, y + 0.1]], C.d); }
    P([[0, -4.75 - bob], [-1.25, -4.5], [-1.85, -3.1], [-1.4, -1.9], [0, -1.7], [1.4, -1.9], [1.85, -3.1], [1.25, -4.5]], C.f);
    E(0, -2.9, 1.05, 1.1, C.belly, 0, true);
    for (let i = 0; i < 4; i++) ST([[-0.75 + i * 0.05, -3.5 + i * 0.32], [0.75 - i * 0.05, -3.5 + i * 0.32]], "rgba(60,90,30,0.25)", 0.05);
    // bracinhos
    const wig = Math.sin(now * 8) * 0.07;
    for (const sd of [-1, 1]) {
      LN(sd * 1.55, -3.0, sd * 1.95, -2.5 + wig, 0.2, C.s);
      for (const c of [-1, 1]) PL([[sd * 1.95 + c * 0.1 - 0.05, -2.47 + wig], [sd * 1.95 + c * 0.1, -2.3 + wig], [sd * 1.95 + c * 0.1 + 0.05, -2.47 + wig]], C.tooth);
    }
    // cabeçona (a parte mais perto da Lara)
    ctx.translate(0, -giant.lift * 0.9 - bob + (sleep ? 0.35 : 0));
    const j = open * 0.85;
    // queixo de baixo e a boca por dentro
    P([[-1.05, -1.5 + j * 0.3], [-0.95, -0.55 + j], [0, -0.3 + j], [0.95, -0.55 + j], [1.05, -1.5 + j * 0.3]], C.s);
    if (open > 0.05) {
      P([[-0.88, -1.4], [-0.82, -0.72 + j], [0, -0.52 + j], [0.82, -0.72 + j], [0.88, -1.4]], C.mouth);
      E(0, -0.72 + j, 0.42, 0.2 + j * 0.12, C.tongue);
      for (let i = 0; i < 6; i++) { const x = -0.7 + i * 0.28; PL([[x - 0.1, -0.62 + j], [x, -0.88 + j], [x + 0.1, -0.62 + j]], C.tooth); }
    }
    // crânio e focinho
    P([[0, -3.5], [-0.95, -3.4], [-1.35, -2.7], [-1.3, -1.75], [-1.05, -1.2], [-0.6, -1.05], [0, -1.0], [0.6, -1.05], [1.05, -1.2], [1.3, -1.75], [1.35, -2.7], [0.95, -3.4]], C.f);
    E(0, -1.45, 0.95, 0.36, C.belly, 0, true);
    for (const sd of [-1, 1]) E(sd * 0.3, -1.52, 0.11, 0.07, C.d, sd * 0.3, true);
    for (const [x, y] of [[-0.75, -3.0], [0.8, -2.95], [0, -3.2], [-0.35, -2.2], [0.4, -2.15]]) E(x, y, 0.1, 0.07, C.s, 0, true);
    // dentes de cima (com dois dentões)
    for (let i = 0; i < 7; i++) {
      const big = i === 1 || i === 5, x = -0.78 + i * 0.26, th = big ? 0.36 : 0.22;
      PL([[x - 0.11, -1.1], [x, -1.1 + th], [x + 0.11, -1.1]], C.tooth);
    }
    // olhos
    for (const sd of [-1, 1]) {
      const ex = sd * 0.68, ey = -2.5;
      if (sleep) { ctx.beginPath(); ctx.arc(ex, ey - 0.1, 0.3, 0.1 * Math.PI, 0.9 * Math.PI); ctx.lineWidth = 0.09; ctx.stroke(); ctx.lineWidth = 0.07; continue; }
      E(ex, ey, 0.36, 0.34, "#ffe14d");
      E(ex - sd * 0.06, ey + 0.04, 0.1, 0.25, "#1a1026", 0, true);
      E(ex - sd * 0.02, ey - 0.12, 0.06, 0.06, "#ffffff", 0, true);
      // sobrancelha brava
      PL([[ex - sd * 0.5, ey - 0.16], [ex + sd * 0.5, ey - 0.62], [ex + sd * 0.56, ey - 0.4], [ex - sd * 0.44, ey + 0.02]], C.d);
    }
    ctx.restore();
    if (sleep) {
      const hx = SX(giant.gx + 1.6), hy = SY(giant.z, 3.6);
      for (let i = 0; i < 3; i++) {
        const k = (now * 0.4 + i / 3) % 1;
        ctx.globalAlpha = 1 - k;
        outlined("Z", hx + k * T * 1.2, hy - k * T * 1.6, T * (0.4 + k * 0.5), "#ffffff", OUT);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawTexts() {
    for (const t of texts) {
      const age = t.max - t.life, pop = 0.6 + 0.4 * Math.min(1, age / 0.12);
      let x, y;
      if (t.wx != null) { x = clamp(SX(t.wx), W * 0.2, W * 0.8); y = SY(t.wz, t.wy) - age * 30; }
      else { x = t.sx * W; y = t.sy * H; }
      const size = Math.min(t.size * (T / 42), (W * 0.92) / Math.max(4, t.s.length) * 1.7);
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life / 0.3);
      ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate(Math.sin(now * 9 + t.max) * 0.04);
      outlined(t.s, 0, 0, size, t.col, OUT);
      ctx.restore();
    }
  }
  function drawFlies() {
    for (const f of flies) {
      if (f.t < 0) continue;
      const k = ease(f.t), x = lerp(f.x0, 56, k), y = lerp(f.y0, 40, k) - Math.sin(f.t * Math.PI) * 60;
      starPath(x, y, 11, 5);
      ctx.fillStyle = "#ffd23f"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.stroke();
    }
  }

  function render() {
    ctx.save();
    if (shake > 0.3) ctx.translate(rand(-1, 1) * shake * 0.6, rand(-1, 1) * shake * 0.6);
    ctx.fillStyle = "#489c44"; ctx.fillRect(-30, -30, W + 60, H + 60);
    drawWorld();
    if (state === "play" && mode === "intro") {
      const r = ease(clamp(introT / 0.8, 0, 1)) * (1 - ease(clamp((introT - 2.6) / 0.6, 0, 1)));
      ctx.fillStyle = "rgba(20,10,35," + (0.4 * r).toFixed(3) + ")";
      ctx.fillRect(-30, -30, W + 60, H + 60);
      drawGiant(); drawLara();
    }
    ctx.restore();
    // um céu quentinho nas bordas (deixa tudo mais vivo)
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.45, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    vg.addColorStop(0, "rgba(255,200,120,0)"); vg.addColorStop(1, "rgba(255,140,90,0.2)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    for (const p of sparts) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }
    drawBossBar();
    drawPowers();
    drawStick();
    drawTexts();
    drawFlies();
  }

  /* ---------------- HUD e telas ---------------- */
  const hudEl = $("hud"), fireBtn = $("fire"), starsEl = $("stars"), killsEl = $("kills"), mkLara = $("mkLara");
  const sndBtn = $("snd");
  function hud() {
    const s = "⭐ " + nStars, kl = "🦖 " + kills;
    if (starsEl.textContent !== s) starsEl.textContent = s;
    if (killsEl.textContent !== kl) killsEl.textContent = kl;
    mkLara.style.left = clamp((START_Z - lara.fz) / (START_Z - ARENA + 1), 0, 1) * 100 + "%";
  }
  function setSound() {
    sndBtn.textContent = save.muted ? "🔇" : "🔊";
    sndBtn.setAttribute("aria-label", save.muted ? "Som desligado" : "Som ligado");
    applyMute();
  }
  function startGame() {
    initAudio(); wake();
    newGame();
    musicPlay(0, 1);
    state = "play";
    $("start").classList.add("hidden"); $("end").classList.add("hidden");
    hudEl.classList.remove("hidden"); fireBtn.classList.remove("hidden");
    addText("Toque onde a Lara deve ir! 👆", { sx: 0.5, sy: 0.19, size: 30, col: "#ffd23f", life: 3.5 });
    hud();
  }
  // álbum: os dinos que ela já derrotou (em todas as partidas)
  function drawAlbum() {
    const c = $("album");
    if (!c) return;
    const cw = 320, ch = 96, d = Math.min(2, window.devicePixelRatio || 1);
    c.width = cw * d; c.height = ch * d;
    const g = c.getContext("2d"), old = ctx;
    ctx = g;
    try {
      g.setTransform(d, 0, 0, d, 0, 0);
      KINDS.forEach((kind, i) => {
        const n = save.album[kind] || 0, cx = 32 + i * 64;
        g.save(); g.translate(cx - (kind === "ptero" ? 4 : 2), kind === "ptero" ? 46 : 62); g.scale(kind === "trike" || kind === "stego" ? 24 : 30, kind === "trike" || kind === "stego" ? 24 : 30); pen(g);
        g.globalAlpha = n ? 1 : 0.25;
        DRAW[kind](n ? DINOS[kind] : { c: "#b8b8c8", d: "#9a9aae", l: "#d8d8e4" }, { ph: 1, walk: 0, mood: n ? "dizzy" : "normal", open: 0 });
        g.restore();
        g.font = "bold 16px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = n ? "#2b1d4a" : "#a9a9b8";
        g.fillText(n ? "×" + n : "?", cx, 82);
      });
    } finally { ctx = old; }
  }
  function showEnd() {
    state = "end";
    const rating = nStars >= totalStars * 0.6 ? 3 : nStars >= totalStars * 0.3 ? 2 : 1;
    $("endRating").textContent = "⭐".repeat(rating) + "☆".repeat(3 - rating);
    $("endStars").textContent = "⭐ " + nStars + "   🦖 " + kills;
    $("endBest").textContent = (save.newBest ? "Novo recorde! " : "Recorde: ") + save.best + " estrelinhas  •  🏆 " + (save.wins || 0);
    drawAlbum();
    hudEl.classList.add("hidden"); fireBtn.classList.add("hidden");
    $("end").classList.remove("hidden");
  }

  /* ---------------- Controles: toque ----------------
     - Toque rápido no chão: a Lara vai até lá sozinha (acha o caminho).
     - Toque em cima de um dino (ou do T-Rex): ela atira nele.
     - Segurar e arrastar: joystick embaixo do dedo; ela anda enquanto o dedo estiver na tela. */
  function tapAt(tx, ty) {
    if (!canControl()) return;
    // tocou num dino?
    let hit = null, hd = T * 0.85;
    for (const e of enemies) {
      const d = Math.hypot(tx - SX(e.fx), ty - SY(e.fz, 0.45 + e.y));
      if (d < hd) { hd = d; hit = e; }
    }
    if (hit) { aimE = hit; burstN = 3; return; }
    if (bossAlive() && Math.abs(tx - SX(giant.gx)) < T * 2.2 && ty < SY(giant.z, 0) + T * 0.4 && ty > SY(giant.z, 6)) { burstN = 3; return; }
    // tocou no chão: acha a casa livre mais perto do dedo e vai até lá
    const wx = (tx - W / 2) / T, wz = camZ + (ty - BASE) / L + 0.2;
    let best = null, bd = 2.2;
    for (let z = Math.round(wz) - 2; z <= Math.round(wz) + 2; z++) for (let x = Math.round(wx) - 2; x <= Math.round(wx) + 2; x++) {
      if (blocked(x, z)) continue;
      const d = Math.hypot(x - wx, z - wz);
      if (d < bd) { bd = d; best = [x, z]; }
    }
    if (best && goTo(best[0], best[1])) return;
    // sem caminho: um pulinho na direção do toque
    const dx = tx - SX(lara.fx), dy = ty - SY(lara.fz, 0.5);
    if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy) || -1);
  }
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault(); initAudio();
    if (state !== "play" || ptr) return;
    const r = cv.getBoundingClientRect();
    ptr = { id: e.pointerId, ox: e.clientX - r.left, oy: e.clientY - r.top, x: e.clientX - r.left, y: e.clientY - r.top, t0: performance.now(), stick: false };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const r = cv.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    let dx = ptr.x - ptr.ox, dy = ptr.y - ptr.oy, d = Math.hypot(dx, dy);
    const dead = Math.max(12, T * 0.32), R = T * 1.1;
    if (!ptr.stick && d > dead) { ptr.stick = true; lara.path = null; lara.dest = null; }
    if (!ptr.stick) return;
    if (d > R) { ptr.ox += dx * (1 - R / d); ptr.oy += dy * (1 - R / d); dx = ptr.x - ptr.ox; dy = ptr.y - ptr.oy; d = R; }
    if (d > dead * 0.6) {
      // só troca de direção quando o dedo passa bem para o outro lado (não treme)
      const horiz = stickDir && stickDir[0] !== 0, bias = stickDir ? (horiz ? 1.35 : 1 / 1.35) : 1;
      stickDir = Math.abs(dx) * bias > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    }
  });
  const ptrEnd = (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const wasTap = !ptr.stick && e.type === "pointerup" && performance.now() - ptr.t0 < 600;
    const x = ptr.x, y = ptr.y;
    ptr = null; stickDir = null;
    if (wasTap) tapAt(x, y);
  };
  cv.addEventListener("pointerup", ptrEnd);
  cv.addEventListener("pointercancel", ptrEnd);
  // botão de tiro: segurar = tiro sem parar
  const fireOn = (e) => { e.preventDefault(); e.stopPropagation(); initAudio(); firing = true; fireBtn.classList.add("on"); };
  const fireOff = (e) => { if (e) e.preventDefault(); firing = false; fireBtn.classList.remove("on"); };
  fireBtn.addEventListener("pointerdown", fireOn);
  fireBtn.addEventListener("pointerup", fireOff);
  fireBtn.addEventListener("pointercancel", fireOff);
  fireBtn.addEventListener("pointerleave", fireOff);
  fireBtn.addEventListener("contextmenu", (e) => e.preventDefault());

  /* ---------------- Controles: teclado ---------------- */
  let keyFire = false;
  document.addEventListener("keydown", (e) => {
    const k = e.key;
    if (state !== "play") { if (k === "Enter" || k === " ") { e.preventDefault(); startGame(); } return; }
    if (k === "ArrowUp" || k === "w") { e.preventDefault(); move(0, -1); }
    else if (k === "ArrowDown" || k === "s") { e.preventDefault(); move(0, 1); }
    else if (k === "ArrowLeft" || k === "a") { e.preventDefault(); move(-1, 0); }
    else if (k === "ArrowRight" || k === "d") { e.preventDefault(); move(1, 0); }
    else if (k === " " || k === "j" || k === "x") { e.preventDefault(); keyFire = true; firing = true; }
  });
  document.addEventListener("keyup", (e) => {
    if ((e.key === " " || e.key === "j" || e.key === "x") && keyFire) { keyFire = false; firing = false; }
  });

  /* ---------------- Controles: controle de PlayStation (Bluetooth) ----------------
     Direcional ou analógico esquerdo: anda. X, quadrado, R1, R2, L1 ou L2: atira. Options/X nas telas: joga. */
  let padIndex = -1, padPrev = [], padDir = null, padRepeat = 0, padFiring = false;
  function currentPad() {
    if (padIndex < 0 || !navigator.getGamepads) return null;
    try { return navigator.getGamepads()[padIndex] || null; } catch (e) { return null; }
  }
  window.addEventListener("gamepadconnected", (e) => {
    padIndex = e.gamepad.index;
    initAudio();
    addText("🎮 Controle ligado!", { sx: 0.5, sy: 0.88, size: 28, col: "#ffffff", life: 2 });
    const hint = $("padHint"); if (hint) hint.classList.remove("hidden");
  });
  window.addEventListener("gamepaddisconnected", (e) => { if (e.gamepad.index === padIndex) { padIndex = -1; if (padFiring) { padFiring = false; firing = false; } } });
  function pollPad(dt) {
    if (!navigator.getGamepads) return;
    let gp = currentPad();
    if (!gp) {
      // alguns celulares só avisam o controle depois do primeiro botão
      try { for (const g of navigator.getGamepads()) if (g && g.connected) { padIndex = g.index; gp = g; break; } } catch (e) { return; }
      if (!gp) return;
    }
    const b = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.4));
    const pressed = (i) => b(i) && !padPrev[i];
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    let dir = null;
    if (b(12) || ay < -0.55) dir = [0, -1];
    else if (b(13) || ay > 0.55) dir = [0, 1];
    else if (b(14) || ax < -0.55) dir = [-1, 0];
    else if (b(15) || ax > 0.55) dir = [1, 0];
    if (state === "play") {
      if (dir) {
        const same = padDir && padDir[0] === dir[0] && padDir[1] === dir[1];
        padRepeat -= dt;
        if (!same || padRepeat <= 0) { move(dir[0], dir[1]); padRepeat = same ? 0.17 : 0.3; }
      }
      const fireNow = b(0) || b(2) || b(4) || b(5) || b(6) || b(7);
      if (fireNow && !padFiring) { padFiring = true; firing = true; }
      else if (!fireNow && padFiring) { padFiring = false; if (!keyFire && !fireBtn.classList.contains("on")) firing = false; }
    } else if (pressed(0) || pressed(9) || pressed(1)) {
      startGame();
    }
    padDir = dir;
    padPrev = gp.buttons.map((x) => x.pressed || x.value > 0.4);
  }

  $("play").addEventListener("click", startGame);
  $("again").addEventListener("click", startGame);
  sndBtn.addEventListener("click", (e) => { e.stopPropagation(); save.muted = !save.muted; persist(); initAudio(); setSound(); });
  // o som só pode começar depois do primeiro toque (regra do celular)
  document.addEventListener("pointerdown", () => {
    initAudio();
    if (state === "menu" && !music.on) musicPlay(0, 0.85);
  }, true);
  document.addEventListener("visibilitychange", () => {
    paused = document.visibilityState !== "visible";
    if (AC) { if (paused) AC.suspend().catch(() => {}); else AC.resume().catch(() => {}); }
    if (!paused && state === "play") wake();
    firing = false; fireBtn.classList.remove("on"); ptr = null; stickDir = null;
    last = 0;
  });

  /* ---------------- Laço principal ---------------- */
  function frame(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    if (!paused) {
      update(dt);
      render();
      if (state === "play") hud();
    }
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(cv.parentElement);
  newGame();
  setSound();
  requestAnimationFrame(frame);

  // ganchos para teste automático (não afetam o jogo)
  window.__hopper = {
    get state() { return state; }, get mode() { return mode; }, lara, giant, boss, pw, move, shoot, startGame, goTo, tapAt, hatch,
    get enemies() { return enemies; }, get kills() { return kills; }, get stars() { return nStars; }, blocked,
    get pet() { return pet; }, get eggs() { return eggs; }, get camZ() { return camZ; },
    get audio() { return AC ? AC.state : "none"; }, get musicOn() { return music.on; },
    setFiring(v) { firing = v; }, proj: (x, z, y) => [SX(x), SY(z, y)],
  };
})();
