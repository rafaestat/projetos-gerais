/* ==========================================================================
   Lara Hopper — no estilo do Jurassic Hopper (bloquinhos, pular faixa por faixa)
   Feito para a Lara (5 anos).

   - Toque na tela: pula para a frente. ◀ ▶ (ou arrastar): para os lados.
     Arrastar para baixo: volta uma faixa.
   - Manadas de dinossauros cruzam as trilhas; nos rios, pule nas pedras.
   - O T-Rex gigante vem atrás, devagar. Se alcança: NHAC! e cospe a Lara (BLÉ!).
   - Um único momento tenso no meio do jogo: escurece, passos pesados, silêncio,
     e o ÚNICO rugido da partida. Depois ele corre atrás por alguns segundos.
   - Ninguém perde: bater num dino só faz a Lara voltar para a grama.
   - Chegou no ninho: festa e "Parabéns, Lara!".
   ========================================================================== */
(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const FONT = "'Comic Sans MS','Chalkboard SE','Trebuchet MS',system-ui,sans-serif";

  const GOAL = 50;      // faixa do ninho (chegada)
  const TENSE_Z = 20;   // faixa do momento tenso (o único rugido)
  const MAXX = 4;       // colunas de -4 a 4

  const SAVE_KEY = "laraHopper.v1";
  const save = { muted: false, best: 0 };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) { /* tudo bem */ }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* tudo bem */ } }

  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function hash(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  /* ---------------- Tela e projeção ---------------- */
  let W = 1, H = 1, T = 40, L = 33, YU = 32, BASE = 500;
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    T = Math.min(W / 9.4, H / 12);   // largura de um bloquinho
    L = T * 0.82;                     // profundidade de uma faixa na tela
    YU = T * 0.8;                     // altura de um bloquinho
    BASE = H * 0.42;                  // onde a Lara fica na tela (ela corre para baixo)
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

  // bloquinho: topo (claro) + frente + lateral (escura). cx,cz = centro; y0 = altura da base
  function vb(cx, cz, w, dz, h, y0, col, noSide) {
    const x1 = SX(cx - w / 2), ww = w * T, zf = cz + dz / 2;
    const yb = SY(zf, y0), yt = SY(zf, y0 + h), ytb = SY(zf - dz, y0 + h);
    ctx.fillStyle = shade(col, 0.28);
    ctx.fillRect(x1, ytb, ww, yt - ytb + 0.5);
    ctx.fillStyle = col;
    ctx.fillRect(x1, yt, ww, yb - yt);
    if (!noSide) { ctx.fillStyle = shade(col, -0.2); ctx.fillRect(x1 + ww * 0.84, yt, ww * 0.16, yb - yt); }
  }
  // retângulo pintado na face da frente (olhos, detalhes). x = borda esquerda
  function fr(x, zf, y, w, h, col) {
    const yt = SY(zf, y + h);
    ctx.fillStyle = col;
    ctx.fillRect(SX(x), yt, w * T, SY(zf, y) - yt);
  }
  function quad(x1, y1, x2, y2, x3, y3, x4, y4) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4); ctx.closePath(); ctx.fill();
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
    ctx.lineWidth = Math.max(3, size * 0.2); ctx.strokeStyle = stroke || "#2b1d4a";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
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

  /* ---------------- Mundo: faixas ---------------- */
  const DINOS = {
    raptor: { w: 1.0, col: "#ff9f43", sp: 2.0 },
    rexy: { w: 1.25, col: "#5cd97a", sp: 1.6 },
    trike: { w: 1.7, col: "#a66cff", sp: 1.15 },
    stego: { w: 1.85, col: "#4db5ff", sp: 1.0 },
  };
  const BACK = { type: "grass", trees: new Map(), star: null, back: true };
  let lanes, genZ, plan, prevRiver;

  function resetWorld() { lanes = new Map(); genZ = 0; plan = []; prevRiver = null; }
  function lane(z) {
    if (z < 0) return BACK;
    while (genZ <= z) genNext();
    return lanes.get(z);
  }
  function add(l) {
    l.z = genZ;
    prevRiver = l.type === "river" ? l.stones : null;
    lanes.set(genZ, l);
    genZ++;
  }
  function grassLane(maxTrees, clear) {
    const trees = new Map();
    if (!clear) {
      const n = randInt(0, maxTrees);
      for (let i = 0; i < n; i++) trees.set(randInt(-MAXX, MAXX), pick(["tree", "tree", "palm", "rock"]));
    }
    let star = null;
    if (Math.random() < 0.35) { const x = randInt(-MAXX, MAXX); if (!trees.has(x)) star = x; }
    return { type: "grass", trees, star };
  }
  function dinoLane(mult) {
    const kind = pick(["raptor", "raptor", "rexy", "trike", "stego"]);
    const D = DINOS[kind], dir = Math.random() < 0.5 ? -1 : 1;
    const speed = D.sp * mult * rand(0.85, 1.1);
    const dinos = [];
    const n = kind === "raptor" ? 3 : 2;
    let x = rand(-9, 9);
    for (let i = 0; i < n; i++) {
      dinos.push({ x: ((x + 9) % 18 + 18) % 18 - 9, ph: Math.random() * 6 });
      x += D.w + (kind === "raptor" && Math.random() < 0.5 ? 0.5 : rand(3.6, 5.2));
    }
    return { type: "dino", kind, dir, speed, dinos, trees: new Map(), star: Math.random() < 0.25 ? randInt(-MAXX, MAXX) : null };
  }
  function riverLane() {
    const s = new Set();
    if (prevRiver) { const a = [...prevRiver].sort(() => Math.random() - 0.5); s.add(a[0]); s.add(a[1]); }
    while (s.size < 4) s.add(randInt(-MAXX, MAXX));
    return { type: "river", stones: s, trees: new Map(), star: null };
  }
  function makePlan(z) {
    const p = z / GOAL, r = Math.random();
    // perto do momento tenso: caminho livre para dar para fugir
    if (z >= TENSE_Z - 3 && z < TENSE_Z + 12) {
      plan.push(() => grassLane(0, true));
      if (z > TENSE_Z + 1 && Math.random() < 0.45) { plan.push(() => dinoLane(0.7)); plan.push(() => grassLane(0, true)); }
      return;
    }
    if (z >= GOAL - 2) { plan.push(() => grassLane(0, true)); return; }
    if (z > 8 && r < 0.22) {
      plan.push(() => grassLane(0, true));
      const n = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < n; i++) plan.push(riverLane);
      plan.push(() => grassLane(0, true));
      return;
    }
    if (r < 0.68) {
      const n = 1 + Math.floor(Math.random() * (p < 0.25 ? 2 : 3));
      for (let i = 0; i < n; i++) plan.push(() => dinoLane(0.75 + p * 0.35));
      plan.push(() => grassLane(2));
      return;
    }
    plan.push(() => grassLane(2));
  }
  function genNext() {
    const z = genZ;
    if (z < 3) { add(grassLane(1, z < 2)); return; }
    if (z === GOAL) { add({ type: "finish", trees: new Map(), star: null }); return; }
    if (z > GOAL) { add({ type: "nest", trees: new Map(), star: null }); return; }
    if (!plan.length) makePlan(z);
    add(plan.shift()());
  }
  function blocked(x, z) {
    if (z < 0 || Math.abs(x) > MAXX) return true;
    const l = lane(z);
    if (l.type === "river") return !l.stones.has(x);
    return l.trees.has(x);
  }

  /* ---------------- Estado ---------------- */
  let state = "menu";   // menu | play | end
  let mode = "play";    // play | tense | catch | win
  let now = 0, last = 0, shake = 0, stars = 0, paused = false;
  let tenseT = 0, tenseDone = false, roared = false, tenseThumps = 0;
  let catchT = 0, chomped = false, spat = false;
  let winT = 0, endShown = false;
  const lara = { x: 0, z: 0, fx: 0, fz: 0, hy: 0, face: "front", hop: null, queue: null, inv: 0, safeX: 0, safeZ: 0, maxZ: 0, bump: 0, bdx: 0, bdz: 0, spin: 0, idle: 0 };
  const giant = { z: -6, boost: 0, gx: 0, ph: 0, open: 0.1, lift: 0 };
  let tenseZ0 = 0, retreatZ = 0;
  let wparts = [], sparts = [], texts = [];

  function newGame() {
    resetWorld();
    Object.assign(lara, { x: 0, z: 0, fx: 0, fz: 0, hy: 0, face: "front", hop: null, queue: null, inv: 0, safeX: 0, safeZ: 0, maxZ: 0, bump: 0, spin: 0, idle: 0 });
    Object.assign(giant, { z: -6, boost: 0, gx: 0, ph: 0, open: 0.1, lift: 0 });
    mode = "play"; stars = 0; shake = 0;
    tenseT = 0; tenseDone = false; roared = false; tenseThumps = 0;
    catchT = 0; chomped = false; spat = false; winT = 0; endShown = false;
    wparts = []; sparts = []; texts = [];
    camZ = 0;
  }

  /* ---------------- Efeitos ---------------- */
  function addText(s, opts) { texts.push(Object.assign({ s, life: 1.2, max: 1.2, size: 34, col: "#fff" }, opts, { max: (opts && opts.life) || 1.2 })); }
  function dust(x, z, n) {
    for (let i = 0; i < n; i++) wparts.push({ x: x + rand(-0.3, 0.3), z: z + rand(-0.2, 0.1), y: 0.05, vx: rand(-0.8, 0.8), vz: 0, vy: rand(0.6, 1.4), g: 4, life: 0.4, max: 0.4, s: rand(0.07, 0.12), col: "#e8dcc0" });
  }
  function sparkle(x, z) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; wparts.push({ x, z, y: 0.5, vx: Math.cos(a) * 2.2, vz: 0, vy: Math.sin(a) * 2.2, g: 0, life: 0.45, max: 0.45, s: 0.09, col: "#ffd23f" }); }
  }
  function confetti(n) {
    const cols = ["#ff5d8f", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff", "#ff9f43"];
    for (let i = 0; i < n; i++) sparts.push({ x: rand(0, W), y: rand(-H * 0.6, 0), vx: rand(-40, 40), vy: rand(120, 260), r: rand(0, 6), vr: rand(-6, 6), s: rand(6, 11), col: pick(cols), life: 4, max: 4 });
  }

  /* ---------------- Movimento da Lara ---------------- */
  function canControl() { return state === "play" && mode === "play"; }
  function move(dx, dz) {
    if (!canControl()) return;
    if (lara.hop) { if (lara.hop.kind === "hop") lara.queue = [dx, dz]; return; }
    lara.idle = 0;
    lara.face = dz < 0 ? "back" : "front";
    const nx = lara.x + dx, nz = lara.z + dz;
    if (blocked(nx, nz)) { lara.bump = 0.18; lara.bdx = dx; lara.bdz = dz; sfx.bump(); return; }
    startHop(nx, nz, 0.14, 0.42, "hop");
    sfx.hop();
  }
  function startHop(nx, nz, dur, arc, kind) {
    lara.hop = { x0: lara.fx, z0: lara.fz, x1: nx, z1: nz, t: 0, dur, arc, kind };
    lara.x = nx; lara.z = nz;
  }
  function land(kind) {
    dust(lara.fx, lara.fz, kind === "hop" ? 3 : 6);
    const l = lane(lara.z);
    if (l.star === lara.x) { l.star = null; stars++; sfx.star(); sparkle(lara.fx, lara.fz); }
    if (l.type === "grass" || l.type === "finish" || l.type === "nest") { lara.safeX = lara.x; lara.safeZ = lara.z; }
    if (lara.z > lara.maxZ) lara.maxZ = lara.z;
    if (lara.z >= GOAL && mode === "play") { startWin(); return; }
    if (lara.queue) { const q = lara.queue; lara.queue = null; move(q[0], q[1]); }
  }
  function hitByDino() {
    lara.inv = 1.6; lara.queue = null; lara.face = "front";
    sfx.boing(); vib(70);
    addText("Ai!", { wx: lara.fx, wz: lara.fz, wy: 1.6, size: 34, col: "#fff" });
    startHop(lara.safeX, lara.safeZ, 0.5, 1.0, "tumble");
  }
  function freeX(z, x) {
    for (let d = 0; d <= MAXX * 2; d++) for (const s of [1, -1]) { const nx = x + d * s; if (Math.abs(nx) <= MAXX && !blocked(nx, z)) return nx; }
    return 0;
  }

  /* ---------------- Momentos especiais ---------------- */
  function startTense() {
    tenseDone = true; mode = "tense"; tenseT = 0; tenseThumps = 0; roared = false;
    tenseZ0 = Math.min(giant.z, lara.fz - 6.5); musicStop();
    lara.face = "front"; lara.queue = null;
  }
  function startCatch() {
    mode = "catch"; catchT = 0; chomped = false; spat = false;
    lara.queue = null; lara.hop = null; lara.face = "front";
  }
  function startWin() {
    mode = "win"; winT = 0; lara.face = "front"; lara.queue = null;
    sfx.win(); musicPlay(1, 1); speak("Parabéns, Lara!"); confetti(160); vib([90, 60, 90, 60, 250]);
    if (stars > save.best) { save.best = stars; persist(); }
    addText("Parabéns, Lara!", { sx: 0.5, sy: 0.24, size: 44, col: "#ffd23f", life: 2.8 });
  }

  /* ---------------- Atualização ---------------- */
  function update(dt) {
    now += dt;
    shake = Math.max(0, shake - dt * 30);
    lara.inv = Math.max(0, lara.inv - (mode === "play" ? dt : 0));
    lara.bump = Math.max(0, lara.bump - dt);

    // dinos andando (em todas as faixas já criadas perto da câmera)
    const z0 = Math.floor(camZ) - 10, z1 = Math.floor(camZ) + 26;
    for (let z = Math.max(0, z0); z <= z1; z++) {
      const l = lane(z);
      if (l.type !== "dino") continue;
      for (const d of l.dinos) {
        d.x += l.dir * l.speed * dt;
        if (d.x > 9) d.x -= 18; else if (d.x < -9) d.x += 18;
        d.ph += dt * l.speed * 7;
      }
    }

    // pulo da Lara
    if (lara.hop) {
      const h = lara.hop;
      h.t += dt;
      const k = Math.min(1, h.t / h.dur);
      lara.fx = lerp(h.x0, h.x1, k);
      lara.fz = lerp(h.z0, h.z1, h.kind === "spit" ? ease(k) : k);
      lara.hy = Math.sin(k * Math.PI) * h.arc;
      lara.spin = h.kind === "tumble" || h.kind === "spit" ? k * Math.PI * 2 : 0;
      if (k >= 1) { lara.hop = null; lara.hy = 0; lara.spin = 0; land(h.kind); }
    }

    if (state === "menu") {
      lara.hy = Math.abs(Math.sin(now * 3)) * 0.12;
      giant.z = -1.1 + Math.sin(now * 0.7) * 0.2;
      giantWalk(dt, 2.5);
      giantFace(dt, 0.12 + 0.08 * Math.sin(now * 1.5), 0, 4);
    } else if (state === "play") {
      if (mode === "play") updatePlay(dt);
      else if (mode === "tense") updateTense(dt);
      else if (mode === "catch") updateCatch(dt);
      else if (mode === "win") updateWin(dt);
    }

    camZ = lerp(camZ, lara.fz, 1 - Math.exp(-dt * 8));

    for (const p of wparts) { p.life -= dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= p.g * dt; }
    wparts = wparts.filter((p) => p.life > 0);
    for (const p of sparts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; }
    sparts = sparts.filter((p) => p.life > 0 && p.y < H + 20);
    for (const t of texts) t.life -= dt;
    texts = texts.filter((t) => t.life > 0);
  }

  // anda com as pernas do gigante; devolve true quando um pé bate no chão
  function giantWalk(dt, rate) {
    const before = Math.sin(giant.ph) >= 0;
    giant.ph += dt * rate;
    return (Math.sin(giant.ph) >= 0) !== before;
  }
  function giantFollowX(dt, k) {
    giant.gx = lerp(giant.gx, clamp(lara.fx * 0.6, -2, 2), 1 - Math.exp(-dt * k));
  }
  function giantFace(dt, openTo, liftTo, k) {
    giant.open = lerp(giant.open, openTo, 1 - Math.exp(-dt * (k || 8)));
    giant.lift = lerp(giant.lift, liftTo, 1 - Math.exp(-dt * (k || 8)));
  }

  function updatePlay(dt) {
    // bateu num dino?
    if (lara.inv <= 0 && (!lara.hop || lara.hop.kind === "hop")) {
      const l = lane(Math.round(lara.fz));
      if (l.type === "dino") {
        const D = DINOS[l.kind];
        for (const d of l.dinos) if (Math.abs(d.x - lara.fx) < D.w / 2 + 0.28) { hitByDino(); break; }
      }
    }
    // parada um tempinho: vira para olhar o T-Rex
    if (!lara.hop) { lara.idle += dt; if (lara.idle > 1.2 && lara.face === "back") lara.face = "front"; }

    // momento tenso, uma vez, no meio do caminho
    if (!tenseDone && lara.z >= TENSE_Z && !lara.hop) { startTense(); return; }

    // o T-Rex gigante vem andando atrás dela, em silêncio (só se ouve quando chega bem perto)
    const prog = clamp(lara.maxZ / GOAL, 0, 1);
    const chasing = giant.boost > 0;
    const sp = chasing ? 1.15 : 0.42 + 0.22 * prog;
    if (chasing) { giant.boost -= dt; if (giant.boost <= 0 && music.on) music.tempo = 1; }
    giant.z += sp * dt;
    giant.z = Math.max(giant.z, lara.fz - 4.8);
    giant.z = Math.min(giant.z, GOAL - 1.6);
    giantFollowX(dt, 1.6);
    const d = lara.fz - giant.z;
    const near = clamp(1 - d / 2.8, 0, 1);
    giantFace(dt, d < 2.6 ? 0.35 + 0.35 * Math.abs(Math.sin(now * 4)) : 0.08 + 0.05 * Math.sin(now * 2), 0, 6);
    if (giantWalk(dt, chasing ? 9 : 5.5) && near > 0) {
      sfx.thump(0.25 + 0.6 * near);
      shake = Math.max(shake, 2 + 5 * near);
      dust(giant.gx + (Math.sin(giant.ph) > 0 ? 1 : -1) * 1.2, giant.z - 3.7 * 1.25, 4);
    }
    if (d <= 0.25 && lara.inv <= 0 && lara.z < GOAL) { startCatch(); return; }
  }

  function updateTense(dt) {
    tenseT += dt;
    // o gigante vem chegando, passos cada vez mais fortes... para... silêncio... e o rugido
    const approach = ease(clamp(tenseT / 2.2, 0, 1));
    giant.z = lerp(tenseZ0, lara.fz - 1.5, approach);
    if (tenseT > 4.4) giant.z = lerp(lara.fz - 1.5, lara.fz - 2.8, ease(clamp((tenseT - 4.4) / 0.8, 0, 1))); // recua um pouco: dá tempo de fugir
    giantFollowX(dt, 3);
    if (tenseT < 2.2) giantWalk(dt, 4.2);
    const beats = [0.7, 1.4, 2.0];
    while (tenseThumps < beats.length && tenseT >= beats[tenseThumps]) {
      sfx.thump([0.55, 0.8, 1.1][tenseThumps]);
      shake = Math.max(shake, 6 + tenseThumps * 4); vib(40 + tenseThumps * 30);
      dust(giant.gx + (tenseThumps % 2 ? 1 : -1) * 1.2, giant.z - 3.7 * 1.25, 6);
      tenseThumps++;
    }
    if (tenseT < 2.75) giantFace(dt, 0.05, 0, 6);
    else if (tenseT < 4.4) giantFace(dt, 1, 0.35 + Math.sin(tenseT * 30) * 0.05, 10);
    else giantFace(dt, 0.25, 0, 4);
    if (!roared && tenseT >= 2.75) {
      roared = true;
      sfx.roar(); vib([150, 60, 250, 60, 300]); shake = 28;
      addText("O T-REX ACORDOU!", { sx: 0.5, sy: 0.62, size: 40, col: "#ff5b4d", life: 2.3 });
    }
    if (tenseT >= 5.2) {
      mode = "play";
      giant.boost = 7;
      musicPlay(0, 1.3);
      lara.face = "front";
      addText("CORRE, LARA!", { sx: 0.5, sy: 0.62, size: 42, col: "#ffd23f", life: 1.8 });
    }
  }

  function updateCatch(dt) {
    catchT += dt;
    if (catchT < 0.5) {
      // dá o bote: abaixa a cabeça por cima dela, de boca aberta
      giant.z = lerp(giant.z, lara.fz + 0.35, 1 - Math.exp(-dt * 10));
      giant.gx = lerp(giant.gx, lara.fx, 1 - Math.exp(-dt * 10));
      giantFace(dt, 1, -1.5, 12);
    } else if (catchT < 1.8) {
      if (!chomped) {
        chomped = true; sfx.chomp(); vib([60, 40, 120]); shake = 20;
        addText("NHAC!", { sx: 0.5, sy: 0.38, size: 64, col: "#fff", life: 1.1 });
      }
      // mastigando
      const was = Math.sin((catchT - dt) * 14) > 0, is = Math.sin(catchT * 14) > 0;
      if (was !== is && is) sfx.munch();
      giant.open = 0.12 * Math.abs(Math.sin(catchT * 14));
      giant.lift = lerp(giant.lift, -1.0 + Math.sin(catchT * 7) * 0.12, 1 - Math.exp(-dt * 6));
      if (catchT > 0.9 && catchT - dt <= 0.9) addText("nhom nhom...", { sx: 0.5, sy: 0.5, size: 30, col: "#ffb3c6", life: 0.9 });
    } else {
      if (!spat) {
        spat = true;
        // cospe a Lara para a frente, numa faixa de grama
        let tz = -1;
        for (let k = 2; k <= 6; k++) { const t = lane(lara.z + k).type; if (t === "grass" || t === "finish") { tz = lara.z + k; break; } }
        if (tz < 0) tz = Math.max(lara.safeZ, lara.z);
        const tx = freeX(tz, lara.x);
        lara.fx = giant.gx; lara.fz = giant.z;
        startHop(tx, tz, 0.6, 2.6, "spit");
        lara.inv = 1.6;
        retreatZ = tz - 5.5;
        sfx.pop();
        addText("BLÉ!", { sx: 0.5, sy: 0.3, size: 56, col: "#5cd97a", life: 1.1 });
      }
      giantFace(dt, 0.7, 0.4, 8);
      giant.z = lerp(giant.z, retreatZ, 1 - Math.exp(-dt * 3));
      giantWalk(dt, -3);
    }
    if (catchT >= 2.5) mode = "play";
  }

  function updateWin(dt) {
    winT += dt;
    if (!lara.hop) lara.hy = Math.abs(Math.sin(winT * 6)) * 0.5;
    giant.z -= dt * 1.5;
    giantWalk(dt, -4);
    giantFace(dt, 0.1, 0, 4);
    if (winT > 3.2 && !endShown) { endShown = true; showEnd(); }
  }

  /* ---------------- Desenho ---------------- */
  function drawGround(z, l, xa, xb) {
    const y0 = SY(z - 0.5, 0), y1 = SY(z + 0.5, 0), h = y1 - y0 + 0.7;
    for (let x = xa; x <= xb; x++) {
      const out = Math.abs(x) > MAXX, odd = (x + z) & 1;
      let col;
      if (l.type === "grass") col = out ? (odd ? "#6fb553" : "#67aa4c") : (odd ? "#8fd16a" : "#84c862");
      else if (l.type === "dino") col = out ? "#c99a5f" : (odd ? "#dcb27a" : "#d4a970");
      else if (l.type === "river") col = "#5ec1ef";
      else if (l.type === "finish") col = out ? "#f5d68a" : (odd ? "#ffffff" : "#ff5d8f");
      else col = odd ? "#f7dc95" : "#f2d283";
      ctx.fillStyle = col;
      ctx.fillRect(SX(x - 0.5), y0, T + 0.7, h);
      // detalhes do chão
      const hv = hash(z * 17.3 + x * 3.1);
      if (l.type === "grass" && !out && hv > 0.86 && !l.trees.has(x) && l.star !== x) {
        ctx.fillStyle = hv > 0.93 ? "#ff8fb1" : "#ffe14d";
        ctx.fillRect(SX(x - 0.2), y0 + h * 0.35, T * 0.12, T * 0.12);
        ctx.fillRect(SX(x + 0.12), y0 + h * 0.6, T * 0.1, T * 0.1);
      } else if (l.type === "dino" && hv > 0.72) {
        ctx.fillStyle = "#b98a52";
        ctx.fillRect(SX(x - 0.25), y0 + h * 0.4, T * 0.14, T * 0.1);
        ctx.fillRect(SX(x + 0.05), y0 + h * 0.55, T * 0.14, T * 0.1);
      }
    }
    if (l.type === "river") {
      ctx.fillStyle = "#a8e2fb";
      const dir = z % 2 ? 1 : -1;
      for (let i = 0; i < 7; i++) {
        const xx = ((((now * 0.5 * dir + hash(z * 7 + i) * 18) % 18) + 18) % 18) - 9;
        ctx.fillRect(SX(xx), y0 + h * (0.25 + hash(z + i * 3) * 0.5), T * 0.5, Math.max(2, T * 0.05));
      }
    }
  }
  // degrauzinho de terra na frente de uma faixa de grama que fica atrás de trilha/rio
  function drawLip(z, l, xa, xb) {
    const back = lane(z - 1);
    if ((l.type === "dino" || l.type === "river") && (back.type === "grass" || back.type === "finish")) {
      ctx.fillStyle = l.type === "river" ? "#7a5236" : "#b88b55";
      ctx.fillRect(SX(xa - 0.5), SY(z - 0.5, 0), (xb - xa + 1) * T, YU * 0.2);
    }
  }

  function drawTree(x, z, kind) {
    if (kind === "rock") {
      vb(x, z, 0.74, 0.6, 0.42, 0, "#9a9aa8");
      vb(x - 0.08, z, 0.38, 0.32, 0.2, 0.42, "#b2b2be");
      return;
    }
    if (kind === "palm") {
      vb(x, z, 0.18, 0.18, 1.15, 0, "#8a5a3a");
      vb(x, z, 0.96, 0.24, 0.12, 1.1, "#3fae5a");
      vb(x, z, 0.26, 0.9, 0.12, 1.1, "#3fae5a");
      vb(x, z, 0.36, 0.36, 0.16, 1.16, "#58c46f");
      vb(x + 0.1, z, 0.12, 0.12, 0.12, 0.98, "#7a4a2a");
      return;
    }
    vb(x, z, 0.24, 0.24, 0.36, 0, "#8a5a3a");
    vb(x, z, 0.84, 0.72, 0.62, 0.32, "#3d9b4f");
    vb(x, z, 0.5, 0.44, 0.26, 0.94, "#4fb562");
  }

  function drawStone(x, z) {
    vb(x, z, 0.82, 0.7, 0.14, -0.04, "#a7a3b4");
  }

  function drawStar(x, z) {
    const cx = SX(x), cy = SY(z, 0.55 + Math.sin(now * 3 + x) * 0.08), sx = Math.abs(Math.cos(now * 2.5 + z)) * 0.65 + 0.35;
    starPath(cx, cy, T * 0.28, T * 0.13, sx);
    ctx.fillStyle = "#ffd23f"; ctx.fill();
    ctx.lineWidth = Math.max(2, T * 0.06); ctx.strokeStyle = "#c98a1b"; ctx.lineJoin = "round"; ctx.stroke();
  }

  function shadow(x, z, w) {
    ctx.fillStyle = "rgba(30,40,20,0.22)";
    ctx.beginPath(); ctx.ellipse(SX(x), SY(z, 0) - L * 0.04, T * w, L * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  }

  // dinossauros de bloquinho, de lado, andando (dir = para onde olham)
  function drawDino(l, d) {
    const D = DINOS[l.kind], dir = l.dir, z = l.z, x = d.x, c = D.col, dk = shade(c, -0.28), lt = shade(c, 0.25);
    const P = (ox, w, dz, h, y0, col) => vb(x + ox * dir, z, w, dz, h, y0, col);
    const leg = (i) => Math.max(0, Math.sin(d.ph + i * Math.PI)) * 0.08;
    const eye = (ox, y, dz) => { const ex = x + ox * dir - 0.035; fr(ex, z + dz / 2, y, 0.07, 0.08, "#2a1a12"); fr(ex + 0.01, z + dz / 2, y + 0.05, 0.025, 0.025, "#ffffff"); };
    shadow(x, z, D.w * 0.45);
    if (l.kind === "raptor") {
      P(-0.12, 0.1, 0.12, 0.3, leg(0), dk); P(0.1, 0.1, 0.12, 0.3, leg(1), dk);
      P(-0.44, 0.42, 0.16, 0.12, 0.5 + Math.sin(d.ph) * 0.02, c);
      P(0, 0.58, 0.34, 0.28, 0.3, c);
      fr(x - 0.12, z + 0.17, 0.42, 0.24, 0.05, dk);
      P(0.38, 0.34, 0.26, 0.26, 0.5, c);
      eye(0.44, 0.64, 0.26);
      fr(x + 0.36 * dir - 0.1, z + 0.13, 0.52, 0.2, 0.025, dk);
    } else if (l.kind === "rexy") {
      P(-0.14, 0.13, 0.14, 0.3, leg(0), dk); P(0.12, 0.13, 0.14, 0.3, leg(1), dk);
      P(-0.52, 0.5, 0.2, 0.14, 0.46, c);
      P(0, 0.62, 0.38, 0.38, 0.3, c);
      fr(x - 0.15, z + 0.19, 0.32, 0.3, 0.2, lt);
      P(0.32, 0.1, 0.08, 0.08, 0.44, dk);
      P(0.44, 0.46, 0.34, 0.34, 0.6, c);
      eye(0.5, 0.8, 0.34);
      for (let i = 0; i < 3; i++) fr(x + (0.36 + i * 0.1) * dir - 0.02, z + 0.17, 0.6, 0.04, 0.05, "#fffbe8");
    } else if (l.kind === "trike") {
      P(-0.4, 0.14, 0.16, 0.24, leg(0), dk); P(-0.15, 0.14, 0.16, 0.24, leg(1), dk);
      P(0.2, 0.14, 0.16, 0.24, leg(1), dk); P(0.42, 0.14, 0.16, 0.24, leg(0), dk);
      P(-0.72, 0.32, 0.2, 0.14, 0.34, c);
      P(0, 1.1, 0.5, 0.48, 0.22, c);
      fr(x - 0.35, z + 0.25, 0.5, 0.7, 0.06, dk);
      P(0.6, 0.14, 0.6, 0.72, 0.26, lt);
      P(0.8, 0.42, 0.4, 0.36, 0.2, c);
      eye(0.84, 0.42, 0.4);
      P(1.02, 0.24, 0.06, 0.06, 0.5, "#fffbe8");
      P(1.06, 0.14, 0.06, 0.06, 0.34, "#fffbe8");
    } else {
      P(-0.42, 0.16, 0.16, 0.24, leg(0), dk); P(-0.15, 0.16, 0.16, 0.24, leg(1), dk);
      P(0.18, 0.16, 0.16, 0.24, leg(1), dk); P(0.44, 0.16, 0.16, 0.24, leg(0), dk);
      P(-0.82, 0.44, 0.16, 0.12, 0.36, c);
      P(-1.0, 0.06, 0.06, 0.16, 0.48, "#fffbe8");
      P(0, 1.24, 0.48, 0.44, 0.24, c);
      for (let i = 0; i < 4; i++) P(-0.42 + i * 0.28, 0.16, 0.08, 0.22 + (i % 2) * 0.06, 0.68, i % 2 ? "#ff9f43" : "#ffd23f");
      P(0.74, 0.3, 0.26, 0.22, 0.24, c);
      eye(0.78, 0.34, 0.26);
    }
  }

  // a Lara de bloquinhos: maria-chiquinha com lacinhos rosa (igual à da Corrida da Lara)
  function drawLara(noShadow) {
    if (state === "play" && mode === "catch" && catchT > 0.5 && catchT < 1.8) return;
    const bk = lara.bump > 0 ? Math.sin(((0.18 - lara.bump) / 0.18) * Math.PI) * 0.14 : 0;
    const x = lara.fx + bk * lara.bdx, z = lara.fz + bk * lara.bdz, y = lara.hy;
    const k = 1.3, front = lara.face === "front";
    const scared = state === "play" && (mode === "tense" || mode === "catch" || lara.fz - giant.z < 2.4);
    if (!noShadow) shadow(x, z, 0.3 * (1 - Math.min(0.6, y * 0.3)));
    ctx.save();
    if (state === "play" && mode === "play" && lara.inv > 0 && Math.floor(now * 14) % 2) ctx.globalAlpha = 0.45;
    if (lara.spin) {
      const cx = SX(x), cy = SY(z, y + 0.55);
      ctx.translate(cx, cy); ctx.rotate(lara.spin); ctx.translate(-cx, -cy);
    }
    const S = (dx, w, dz, h, y0, col) => vb(x + dx * k, z, w * k, dz * k, h * k, y + y0 * k, col);
    const hopK = lara.hop && lara.hop.kind === "hop" ? Math.sin((lara.hop.t / lara.hop.dur) * Math.PI) : 0;
    const wave = mode === "win" ? Math.abs(Math.sin(winT * 6)) : hopK;
    // pernas e sapatinhos
    S(-0.08, 0.12, 0.14, 0.16, 0.04, "#7d44d6"); S(0.08, 0.12, 0.14, 0.16, 0.04, "#7d44d6");
    S(-0.08, 0.13, 0.17, 0.05, 0, "#ffffff"); S(0.08, 0.13, 0.17, 0.05, 0, "#ffffff");
    // vestido
    S(0, 0.5, 0.34, 0.1, 0.18, "#d63b6e");
    S(0, 0.42, 0.3, 0.24, 0.26, "#ff5d8f");
    // braços (sobem no pulo e na festa)
    const ay = 0.26 + wave * 0.14;
    S(-0.27, 0.09, 0.12, 0.2, ay, "#e9b48c"); S(0.27, 0.09, 0.12, 0.2, ay, "#e9b48c");
    // cabeça
    S(0, 0.46, 0.4, 0.4, 0.48, "#e9b48c");
    const zf = z + 0.2 * k;
    if (front) {
      const ey = y + 0.62 * k, eh = (scared ? 0.11 : 0.09) * k;
      fr(x - 0.13 * k, zf, ey, 0.07 * k, eh, "#2a1a12"); fr(x + 0.06 * k, zf, ey, 0.07 * k, eh, "#2a1a12");
      fr(x - 0.11 * k, zf, ey + eh * 0.6, 0.025 * k, 0.025 * k, "#ffffff"); fr(x + 0.08 * k, zf, ey + eh * 0.6, 0.025 * k, 0.025 * k, "#ffffff");
      fr(x - 0.2 * k, zf, y + 0.56 * k, 0.07 * k, 0.04 * k, "#ff8fb1"); fr(x + 0.13 * k, zf, y + 0.56 * k, 0.07 * k, 0.04 * k, "#ff8fb1");
      if (scared) fr(x - 0.04 * k, zf, y + 0.52 * k, 0.08 * k, 0.07 * k, "#7a2030");
      else fr(x - 0.06 * k, zf, y + 0.53 * k, 0.12 * k, 0.03 * k, "#c0392b");
      S(0, 0.5, 0.44, 0.1, 0.86, "#5a3a22");                           // topo do cabelo
      fr(x - 0.25 * k, zf, y + 0.76 * k, 0.5 * k, 0.11 * k, "#5a3a22"); // franjinha
      fr(x - 0.25 * k, zf, y + 0.5 * k, 0.06 * k, 0.3 * k, "#5a3a22");
      fr(x + 0.19 * k, zf, y + 0.5 * k, 0.06 * k, 0.3 * k, "#5a3a22");
      if (scared && mode !== "win") { // gotinha de suor
        ctx.fillStyle = "#bfe8ff";
        ctx.fillRect(SX(x + 0.3 * k), SY(z, y + 1.0 * k), T * 0.07, T * 0.1);
      }
    } else {
      S(0, 0.5, 0.44, 0.44, 0.46, "#5a3a22");
      fr(x - 0.012 * k, z + 0.22 * k, y + 0.58 * k, 0.025 * k, 0.32 * k, "#3d2614"); // risca do cabelo
    }
    // maria-chiquinha e lacinhos
    S(-0.33, 0.15, 0.16, 0.24, 0.56, "#5a3a22"); S(0.33, 0.15, 0.16, 0.24, 0.56, "#5a3a22");
    S(-0.27, 0.13, 0.12, 0.11, 0.78, "#ff5d8f"); S(0.27, 0.13, 0.12, 0.11, 0.78, "#ff5d8f");
    ctx.restore();
  }

  function drawFinish(z) {
    for (const sd of [-1, 1]) { vb(sd * 4.7, z, 0.28, 0.28, 3.3, 0, "#ffffff"); vb(sd * 4.7, z, 0.34, 0.34, 0.14, 3.3, "#ffd23f"); }
    const cols = ["#ff5d8f", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff"];
    const x1 = SX(-4.56), x2 = SX(4.56), yt = SY(z, 3.25), yb = SY(z, 2.55), sh = (yb - yt) / cols.length;
    cols.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x1, yt + i * sh, x2 - x1, sh + 0.5); });
    outlined("NINHO!", W / 2, (yt + yb) / 2, Math.min(yb - yt, T * 0.9) * 0.95, "#ffffff", "#2b1d4a");
  }
  function drawNest(z) {
    vb(0, z, 1.9, 1.3, 0.22, 0, "#a0703c");
    vb(0, z, 1.5, 0.9, 0.08, 0.22, "#c99a5f");
    [["#ffb3d9", -0.4], ["#bfe8ff", 0], ["#fff2a8", 0.4]].forEach(([c, ox], i) => {
      const bob = state === "play" && mode === "win" ? Math.abs(Math.sin(winT * 5 + i)) * 0.15 : 0;
      vb(ox, z, 0.3, 0.3, 0.42, 0.24 + bob, c);
      fr(ox - 0.06, z + 0.15, 0.4 + bob, 0.05, 0.05, shade(c, -0.25));
    });
  }

  function drawWorld() {
    // a câmera olha de frente para a Lara: o que vem pela frente aparece embaixo, o T-Rex fica em cima (atrás dela)
    const above = Math.ceil(BASE / L) + 4, below = Math.ceil((H - BASE) / L) + 2;
    const zTop = Math.floor(camZ) - above, zBottom = Math.floor(camZ) + below;
    const xr = Math.ceil(W / 2 / T) + 1;
    const lz = Math.floor(lara.fz + 0.001), zg = Math.floor(giant.z);
    if (zg < zTop) drawGiant();
    for (let z = zTop; z <= zBottom; z++) {
      const l = lane(z);
      drawGround(z, l, -xr, xr);
      drawLip(z, l, -xr, xr);
      if (l.type === "river") for (const s of l.stones) drawStone(s, z);
      // árvores enfeitando as bordas
      if (l.type === "grass" || l.type === "nest") {
        for (let x = -xr; x <= xr; x++) {
          if (Math.abs(x) <= MAXX) continue;
          const hv = hash(z * 31.7 + x * 7.3);
          if (hv > 0.42) drawTree(x, z, hv > 0.8 ? "palm" : hv > 0.5 ? "tree" : "rock");
        }
      }
      if (l.trees.size) for (const [x, kind] of l.trees) drawTree(x, z, kind);
      if (l.star != null) drawStar(l.star, z);
      if (l.type === "finish") drawFinish(z);
      if (l.type === "nest" && z === GOAL + 5) drawNest(z);
      if (l.type === "dino") for (const d of l.dinos) if (Math.abs(d.x) < xr + 1.5) drawDino(l, d);
      if (z === lz) drawLara();
      if (z === zg) drawGiant();
    }
    if (lz > zBottom || lz < zTop) drawLara();
    for (const p of wparts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      const s = p.s * T;
      ctx.fillRect(SX(p.x) - s / 2, SY(p.z, p.y) - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  /* T-Rex gigante de bloquinhos, no mesmo mundo da Lara.
     A Lara corre na direção de quem joga; o T-Rex vem logo atrás dela, olhando para a frente:
     cara com olhos brilhando e dentes, bracinhos, pernas pisando, costas com placas e o rabo balançando lá atrás. */
  const REX = { f: "#5aa03c", s: "#4a8c31", d: "#2f5e20", belly: "#c9d98a", mouth: "#8a1424", tongue: "#e0566a", tooth: "#fffdf0" };
  function drawGiant() {
    const k = 1.25, Z0 = giant.z, GX = giant.gx, lift = giant.lift, open = clamp(giant.open, 0, 1);
    if (SY(Z0, 0) < -10) return; // ainda lá em cima, fora da tela
    const B = (dx, dz, w, ddz, h, y, col) => vb(GX + dx * k, Z0 + dz * k, w * k, ddz * k, h * k, y * k, col);
    const F = (dx, dz, y, w, h, col) => fr(GX + dx * k, Z0 + dz * k, y * k, w * k, h * k, col); // pinta na face da frente
    const ph = giant.ph, sw = Math.sin(ph * 0.5) * 0.4;
    const legs = [[-1, Math.max(0, Math.sin(ph)) * 0.45, Math.cos(ph) * 0.3], [1, Math.max(0, -Math.sin(ph)) * 0.45, -Math.cos(ph) * 0.3]];
    const hy = lift + Math.abs(Math.sin(ph)) * 0.07;

    // sombra enorme
    ctx.fillStyle = "rgba(30,40,20,0.25)";
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(SX(GX + sd * 1.0 * k), SY(Z0 - 3.5 * k, 0), T * 0.7 * k, L * 0.45 * k, 0, 0, Math.PI * 2); ctx.fill(); }

    // ---- rabo (o mais longe, balançando lá atrás) ----
    B(sw * 1.4, -10.2, 0.45, 0.9, 0.4, 1.4, REX.f);
    B(sw * 1.0, -9.3, 0.7, 1.1, 0.6, 1.5, REX.f);
    B(sw * 0.6, -8.2, 1.0, 1.2, 0.8, 1.6, REX.f);
    B(sw * 0.3, -7.0, 1.4, 1.4, 1.0, 1.7, REX.f);

    // ---- coxas (atrás da barriga) ----
    for (const [sd, l] of legs) B(sd * 1.0, -4.6, 0.95, 1.3, 1.25, 0.85 + l * 0.5, REX.s);

    // ---- corpo ----
    B(0, -5.0, 2.4, 3.0, 1.9, 1.3, REX.f);
    F(-0.6, -3.5, 1.45, 1.2, 1.5, REX.belly);                             // barriga clarinha
    for (let i = 0; i < 4; i++) F(-0.6, -3.5, 1.7 + i * 0.32, 1.2, 0.04, "rgba(0,0,0,0.12)");
    for (let i = 0; i < 5; i++) B(0, -6.1 + i * 0.6, 0.3, 0.3, 0.2 + (i % 2) * 0.1, 3.2, REX.d); // placas nas costas
    for (const [dx, dz] of [[-0.65, -5.6], [0.7, -4.6], [-0.45, -4.1], [0.5, -6.0]]) B(dx, dz, 0.42, 0.4, 0.02, 3.2, REX.s);

    // ---- canelas e pés (pisando, um de cada vez) ----
    for (const [sd, l, f] of legs) {
      B(sd * 1.0, -4.1 + f * 0.6, 0.6, 0.6, 1.0, l + 0.2, REX.s);
      B(sd * 1.0, -3.7 + f, 0.85, 1.2, 0.3, l, REX.d);
      for (const c of [-1, 0, 1]) B(sd * 1.0 + c * 0.25, -3.05 + f, 0.14, 0.18, 0.14, l, REX.tooth);
    }

    // ---- bracinhos ----
    const wig = Math.sin(now * 8) * 0.06;
    for (const sd of [-1, 1]) {
      B(sd * 0.85, -3.2, 0.26, 0.5, 0.2, 2.1 + wig, REX.s);
      for (const c of [-1, 1]) B(sd * 0.85 + c * 0.07, -2.92, 0.06, 0.08, 0.1, 2.0 + wig, REX.tooth);
    }

    // ---- pescoço ----
    B(0, -2.9, 1.35, 1.2, 1.4, 1.9 + hy * 0.5, REX.f);

    // ---- cabeça (a parte mais perto da Lara) ----
    const up = hy + open * 0.25;            // a cabeça de cima sobe um pouco
    const ly = 2.5 + hy - open * 0.55;      // a mandíbula de baixo desce
    const sy = 2.75 + up;
    B(0, -1.9, 1.7, 1.1, 1.3, sy, REX.f);                                 // crânio
    for (const sd of [-1, 1]) {                                          // olhos brilhando (amarelo, vermelho e a fenda)
      const ex = sd * 0.55 - 0.21, ez = -1.35, eyY = sy + 0.86;
      B(sd * 0.55, -1.45, 0.46, 0.2, 0.42, eyY - 0.02, REX.d);
      F(ex, ez, eyY, 0.42, 0.36, "#ffd23f");
      F(ex + 0.09, ez, eyY + 0.07, 0.24, 0.22, "#ff2a10");
      F(ex + 0.17, ez, eyY + 0.07, 0.08, 0.22, "#111111");
      B(sd * 0.36, -1.42, 0.3, 0.16, 0.13, sy + 1.3, REX.d);             // sobrancelha brava (alta no meio)
      B(sd * 0.72, -1.42, 0.36, 0.16, 0.08, sy + 1.24, REX.d);
    }
    B(0, -2.1, 0.16, 0.18, 0.12, sy + 1.3, REX.d);                       // calombos no topo
    // mandíbula de baixo + boca por dentro (aparece quando ele abre)
    B(0, -0.8, 1.2, 1.5, 0.35, ly, REX.f);
    F(-0.45, -0.05, ly + 0.05, 0.9, 0.12, REX.belly);
    if (open > 0.04) {
      B(0, -0.75, 1.0, 1.3, 0.04, ly + 0.35, REX.mouth);
      B(0, -0.85, 0.46, 0.8, 0.05, ly + 0.39, REX.tongue);
      for (let i = 0; i < 5; i++) B(-0.48 + i * 0.24, -0.16, 0.12, 0.12, 0.16, ly + 0.35, REX.tooth);  // dentes de baixo
    }
    const uy = 2.92 + up;
    B(0, -0.7, 1.3, 1.3, 0.55, uy, REX.f);                               // focinho
    for (const sd of [-1, 1]) F(sd * 0.28 - 0.06, -0.05, uy + 0.36, 0.12, 0.08, "#14240e"); // narinas
    for (let i = 0; i < 7; i++) {                                        // dentes de cima (com dois dentões)
      const big = i === 1 || i === 5, th = big ? 0.2 : 0.12;
      F(-0.6 + i * 0.18, -0.05, uy - th, 0.1, th, REX.tooth);
    }
  }

  function drawTexts() {
    for (const t of texts) {
      const age = t.max - t.life, pop = 0.6 + 0.4 * Math.min(1, age / 0.12);
      let x, y;
      if (t.wx != null) { x = SX(t.wx); y = SY(t.wz, t.wy) - age * 30; }
      else { x = t.sx * W; y = t.sy * H; }
      const size = Math.min(t.size * (T / 42), (W * 0.92) / Math.max(4, t.s.length) * 1.7);
      ctx.save();
      ctx.globalAlpha = Math.min(1, t.life / 0.3);
      ctx.translate(x, y); ctx.scale(pop, pop); ctx.rotate(Math.sin(now * 9 + t.max) * 0.04);
      outlined(t.s, 0, 0, size, t.col, "#2b1d4a");
      ctx.restore();
    }
  }

  function render() {
    ctx.save();
    if (shake > 0.3) ctx.translate(rand(-1, 1) * shake * 0.6, rand(-1, 1) * shake * 0.6);
    ctx.fillStyle = "#6fb553"; ctx.fillRect(-30, -30, W + 60, H + 60);
    drawWorld();
    if (state === "play" && mode === "tense") {
      const r = ease(clamp(tenseT / 2.2, 0, 1)) * (1 - ease(clamp((tenseT - 4.4) / 0.8, 0, 1)));
      ctx.fillStyle = "rgba(20,10,35," + (0.5 * r).toFixed(3) + ")";
      ctx.fillRect(-30, -30, W + 60, H + 60);
    }
    if (state === "play" && mode === "tense") { drawGiant(); drawLara(true); }
    ctx.restore();
    // bordas vermelhas quando ele está colado (ou correndo atrás)
    if (state === "play" && mode === "play") {
      const d = lara.fz - giant.z, danger = giant.boost > 0 ? 0.8 : clamp(1 - (d - 0.5) / 2, 0, 1);
      if (danger > 0.05) {
        const g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
        g.addColorStop(0, "rgba(255,40,40,0)"); g.addColorStop(1, "rgba(255,40,40," + (0.45 * danger).toFixed(3) + ")");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    }
    for (const p of sparts) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }
    drawTexts();
  }

  /* ---------------- HUD e telas ---------------- */
  const hudEl = $("hud"), starsEl = $("stars"), mkLara = $("mkLara"), mkRex = $("mkRex");
  const sndBtn = $("snd");
  function hud() {
    const s = "⭐ " + stars;
    if (starsEl.textContent !== s) starsEl.textContent = s;
    mkLara.style.left = clamp(lara.fz / GOAL, 0, 1) * 100 + "%";
    mkRex.style.left = clamp(giant.z / GOAL, 0, 1) * 100 + "%";
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
    hudEl.classList.remove("hidden");
    lara.face = "front";
    addText("Pula, Lara!", { sx: 0.5, sy: 0.6, size: 40, col: "#ffd23f", life: 1.6 });
    hud();
  }
  function showEnd() {
    state = "end";
    $("endStars").textContent = stars === 1 ? "Você pegou 1 estrelinha!" : "Você pegou " + stars + " estrelinhas!";
    $("endBest").textContent = "Recorde: " + save.best + (save.best === 1 ? " estrelinha" : " estrelinhas");
    hudEl.classList.add("hidden");
    $("end").classList.remove("hidden");
  }

  /* ---------------- Controles ---------------- */
  // Toque = pula para a frente. Arrastar o dedo para os lados = anda de lado,
  // igual a dirigir o carrinho: cada pedacinho arrastado é um passo, sem tirar o dedo.
  // Arrastar para cima = volta uma faixa.
  let ptr = null;
  const stepPx = () => Math.max(34, T * 0.95); // um passo para cada bloquinho que o dedo anda
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault(); initAudio();
    if (ptr) return; // só o primeiro dedo
    ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, ax: e.clientX, side: false };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  cv.addEventListener("pointermove", (e) => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.ax, dyAll = e.clientY - ptr.y0;
    if (!ptr.side && Math.abs(dyAll) > Math.abs(e.clientX - ptr.x0) * 1.3) return; // está arrastando para cima/baixo
    const st = stepPx();
    if (Math.abs(dx) >= st) {
      ptr.side = true;
      const dir = dx > 0 ? 1 : -1;
      ptr.ax += dir * st;
      move(dir, 0);
    }
  });
  function endPtr(e, cancel) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x0, dy = e.clientY - ptr.y0, side = ptr.side;
    ptr = null;
    if (cancel || side) return;
    const st = stepPx();
    if (dy < -st && -dy > Math.abs(dx)) move(0, -1);       // arrastou para cima: volta
    else if (Math.abs(dx) < st && Math.abs(dy) < st * 1.6) move(0, 1); // toque: pula para a frente
  }
  cv.addEventListener("pointerup", (e) => endPtr(e, false));
  cv.addEventListener("pointercancel", (e) => endPtr(e, true));
  document.addEventListener("keydown", (e) => {
    const k = e.key;
    if (state !== "play") { if ((k === "Enter" || k === " ") && state === "menu") { e.preventDefault(); startGame(); } return; }
    if (k === "ArrowDown" || k === "s" || k === " ") { e.preventDefault(); move(0, 1); }
    else if (k === "ArrowUp" || k === "w") { e.preventDefault(); move(0, -1); }
    else if (k === "ArrowLeft" || k === "a") { e.preventDefault(); move(-1, 0); }
    else if (k === "ArrowRight" || k === "d") { e.preventDefault(); move(1, 0); }
  });
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
  window.__hopper = { get state() { return state; }, get mode() { return mode; }, lara, giant, move, startGame, update, render, lane, get stars() { return stars; }, get audio() { return AC ? AC.state : "none"; }, get musicOn() { return music.on; } };
})();
