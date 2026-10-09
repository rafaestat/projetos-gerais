/* ==========================================================================
   Lara Hopper — Caçada no Labirinto (no estilo do Jurassic Hopper 2)
   Feito para a Lara (5 anos).

   - A Lara anda pulando pelo labirinto: para cima, para baixo e para os lados.
     Toque na tela na direção em que ela deve pular.
   - Botão grande 🔫 (do lado esquerdo): atira! A mira é automática no dino mais perto.
   - Dino atingido se despedaça em bloquinhos, igual ao jogo do vídeo.
   - Lá no alto do labirinto dorme o T-Rex gigante: o chefão, com barra de vida.
     Ele ruge uma vez só, quando acorda. Se alcança a Lara: NHAC! e cospe ela (BLÉ!).
   - Ninguém perde: dino que encosta só empurra a Lara ("Ai!").
   - Funciona com controle de PlayStation por Bluetooth (direcional/analógico anda,
     X ou R2 atira, Options começa).
   ========================================================================== */
(() => {
  "use strict";

  const cv = document.getElementById("game");
  const ctx = cv.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const FONT = "'Comic Sans MS','Chalkboard SE','Trebuchet MS',system-ui,sans-serif";

  const MAXX = 4;          // colunas de -4 a 4
  const ARENA = 11;        // faixas 0..10: a arena do chefão, lá no alto
  const MAZE_ROWS = 43;    // tamanho do labirinto (ímpar)
  const ZMAX = ARENA + MAZE_ROWS;
  const START_Z = ZMAX - 2;
  const BOSS_HP = 20;
  const BOSS_HOME = 2.6;   // onde o chefão fica de pé (ponta do focinho)

  const SAVE_KEY = "laraHopper.v2";
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
    BASE = H * 0.6;                   // onde a Lara fica na tela (o caminho para o chefão fica em cima)
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

  // sons novos da caçada
  sfx.pew = () => { tone(1250, 0.13, "square", 0.08, 0, 260); tone(2400, 0.08, "sine", 0.06, 0, 700); };
  sfx.wall = () => { if (AC) noiseAt(AC.currentTime, 0.08, 0.12, "bandpass", 1800, 1); };
  sfx.shatter = () => {
    if (!AC) return;
    noiseAt(AC.currentTime, 0.28, 0.35, "highpass", 1400);
    for (let i = 0; i < 6; i++) tone(380 + Math.random() * 900, 0.05, "square", 0.07, i * 0.03, 140);
    sfx.thump(0.4);
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

  const DINOS = {
    raptor: { w: 1.0, col: "#ff9f43", sp: 2.0 },
    rexy: { w: 1.25, col: "#5cd97a", sp: 1.6 },
    trike: { w: 1.7, col: "#a66cff", sp: 1.15 },
    stego: { w: 1.85, col: "#4db5ff", sp: 1.0 },
  };
  const HP = { raptor: 1, rexy: 2, trike: 3, stego: 3 };
  const STEP = { raptor: 0.55, rexy: 0.7, trike: 0.95, stego: 1.05 };

  /* ---------------- O mundo: arena lá em cima + labirinto embaixo ---------------- */
  let walls = new Map(), stars = new Set();
  const key = (x, z) => x + "," + z;
  function blocked(x, z) {
    if (z < 0 || z >= ZMAX || Math.abs(x) > MAXX) return true;
    return walls.has(key(x, z));
  }
  function buildWorld() {
    walls = new Map(); stars = new Set();
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
    // mais caminhos (menos becos sem saída) — fica gostoso de ir e voltar
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
      if (open[r][c] || (r % 2 === 0 && c % 2 === 0)) continue;
      const h = open[r][c - 1] && open[r][c + 1], v = open[r - 1][c] && open[r + 1][c];
      if ((h || v) && Math.random() < 0.38) open[r][c] = true;
    }
    // uma clareira a cada tanto, para brigar com os dinos
    for (let r = 6; r < R - 6; r += 12) for (let rr = r; rr < r + 3; rr++) for (let c = 2; c <= 6; c++) open[rr][c] = true;
    // entrada da arena (linha de cima) e o comecinho (linhas de baixo) abertos
    for (let c = 1; c < C - 1; c++) { open[0][c] = true; open[R - 1][c] = true; open[R - 2][c] = true; }
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = c - 4, z = ARENA + r;
      if (!open[r][c]) {
        const hv = hash(z * 13.7 + x * 5.3);
        walls.set(key(x, z), hv > 0.82 ? "rock" : hv > 0.62 ? "palm" : "tree");
      } else if (r > 1 && r < R - 3 && Math.random() < 0.2) stars.add(key(x, z));
    }
    // pedras de enfeite na arena, nos cantos
    for (const [x, z] of [[-4, 1], [4, 1], [-4, 6], [4, 7], [-3, 10], [3, 10]]) walls.set(key(x, z), "rock");
  }

  /* ---------------- Estado ---------------- */
  let state = "menu";   // menu | play | end
  let mode = "play";    // play | intro | catch | win
  let now = 0, last = 0, shake = 0, nStars = 0, kills = 0, paused = false, playT = 0;
  let catchT = 0, chomped = false, spat = false, introT = 0, roared = false, winT = 0, endShown = false;
  let firing = false, fireCD = 0;
  const lara = { x: 0, z: START_Z, fx: 0, fz: START_Z, hy: 0, fdx: 0, fdz: -1, hop: null, queue: null, inv: 0, bump: 0, bdx: 0, bdz: 0, spin: 0, shootT: 0 };
  const giant = { z: BOSS_HOME, boost: 0, gx: 0, ph: 0, open: 0.05, lift: 0, flash: 0 };
  const boss = { state: "sleep", hp: BOSS_HP, retreat: BOSS_HOME };
  let enemies = [], bullets = [], frags = [], wparts = [], sparts = [], texts = [], taps = [];

  function spawnEnemies() {
    enemies = [];
    const cells = [];
    for (let z = ARENA + 2; z < START_Z - 5; z++) for (let x = -MAXX; x <= MAXX; x++) if (!blocked(x, z)) cells.push([x, z]);
    const n = 17;
    for (let i = 0; i < n && cells.length; i++) {
      const [x, z] = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];
      const kind = pick(["raptor", "raptor", "raptor", "rexy", "rexy", "trike", "stego"]);
      enemies.push({ kind, x, z, fx: x, fz: z, x0: x, z0: z, t: rand(0.3, 1.5), mv: 0, hp: HP[kind], dir: Math.random() < 0.5 ? -1 : 1, ph: Math.random() * 6, flash: 0, rest: 0 });
    }
  }
  function newGame() {
    buildWorld();
    spawnEnemies();
    Object.assign(lara, { x: 0, z: START_Z, fx: 0, fz: START_Z, hy: 0, fdx: 0, fdz: -1, hop: null, queue: null, inv: 0, bump: 0, spin: 0, shootT: 0 });
    Object.assign(giant, { z: BOSS_HOME, boost: 0, gx: 0, ph: 0, open: 0.05, lift: 0, flash: 0 });
    Object.assign(boss, { state: "sleep", hp: BOSS_HP, retreat: BOSS_HOME });
    mode = "play"; nStars = 0; kills = 0; shake = 0; playT = 0;
    catchT = 0; chomped = false; spat = false; introT = 0; roared = false; winT = 0; endShown = false;
    bullets = []; frags = []; wparts = []; sparts = []; texts = []; taps = [];
    camZ = camTarget();
  }

  /* ---------------- Efeitos ---------------- */
  function addText(s, opts) { texts.push(Object.assign({ s, life: 1.2, max: 1.2, size: 34, col: "#fff" }, opts, { max: (opts && opts.life) || 1.2 })); }
  function dust(x, z, n) {
    for (let i = 0; i < n; i++) wparts.push({ x: x + rand(-0.3, 0.3), z: z + rand(-0.2, 0.1), y: 0.05, vx: rand(-0.8, 0.8), vz: 0, vy: rand(0.6, 1.4), g: 4, life: 0.4, max: 0.4, s: rand(0.07, 0.12), col: "#e8dcc0" });
  }
  function sparkle(x, z, col) {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; wparts.push({ x, z, y: 0.5, vx: Math.cos(a) * 2.2, vz: 0, vy: Math.sin(a) * 2.2, g: 0, life: 0.45, max: 0.45, s: 0.09, col: col || "#ffd23f" }); }
  }
  function confetti(n) {
    const cols = ["#ff5d8f", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff", "#ff9f43"];
    for (let i = 0; i < n; i++) sparts.push({ x: rand(0, W), y: rand(-H * 0.6, 0), vx: rand(-40, 40), vy: rand(120, 260), r: rand(0, 6), vr: rand(-6, 6), s: rand(6, 11), col: pick(cols), life: 4, max: 4 });
  }
  // despedaça em bloquinhos (igual ao jogo do vídeo)
  function shatter(x, z, w, h, y0, cols, n, size) {
    for (let i = 0; i < n; i++) {
      const s = size * rand(0.7, 1.3);
      frags.push({
        x: x + rand(-w / 2, w / 2), z: z + rand(-0.25, 0.25), y: y0 + rand(0, h),
        vx: rand(-3.2, 3.2), vz: rand(-2.2, 2.2), vy: rand(2, 6.5),
        s, col: pick(cols), life: rand(1.3, 2.0), bounce: 0,
      });
    }
    if (frags.length > 420) frags.splice(0, frags.length - 420);
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
  function move(dx, dz) {
    if (!canControl()) return;
    if (lara.hop) { if (lara.hop.kind === "hop") lara.queue = [dx, dz]; return; }
    lara.fdx = dx; lara.fdz = dz;
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
    lara.landT = 0.12;
    if (kind !== "hop") dust(lara.fx, lara.fz, 6);
    const k = key(lara.x, lara.z);
    if (stars.has(k)) { stars.delete(k); nStars++; sfx.star(); sparkle(lara.fx, lara.fz); }
    if (boss.state === "sleep" && lara.z <= ARENA - 1) startIntro();
    if (lara.queue) { const q = lara.queue; lara.queue = null; move(q[0], q[1]); }
  }
  function hurt(fromX, fromZ) {
    lara.inv = 1.4; lara.queue = null;
    sfx.boing(); rumble(70, 0.4);
    addText("Ai!", { wx: lara.fx, wz: lara.fz, wy: 1.6, size: 34, col: "#fff" });
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
  function findTarget() {
    let best = null, bd = 8.5;
    for (const e of enemies) {
      const d = Math.hypot(e.fx - lara.fx, e.fz - lara.fz);
      if (d < bd && lineClear(lara.fx, lara.fz, e.fx, e.fz)) { bd = d; best = { x: e.fx, z: e.fz }; }
    }
    if (bossAlive() && lara.z <= ARENA) {
      const d = Math.abs(lara.fz - giant.z);
      if (d < 11 && (!best || d < bd)) best = { x: giant.gx, z: giant.z - 0.6 };
    }
    return best;
  }
  function shoot() {
    if (!canControl()) return;
    const t = findTarget();
    let vx = lara.fdx, vz = lara.fdz;
    if (t) {
      const dx = t.x - lara.fx, dz = t.z - lara.fz, d = Math.hypot(dx, dz) || 1;
      vx = dx / d; vz = dz / d;
      if (Math.abs(dx) > Math.abs(dz)) { lara.fdx = Math.sign(dx); lara.fdz = 0; } else { lara.fdx = 0; lara.fdz = Math.sign(dz) || -1; }
    }
    const sp = 13;
    bullets.push({ x: lara.fx + vx * 0.35, z: lara.fz + vz * 0.35, vx: vx * sp, vz: vz * sp, life: 0.8, trail: [] });
    lara.shootT = 0.12;
    sfx.pew();
  }
  function killEnemy(e) {
    const D = DINOS[e.kind];
    shatter(e.fx, e.fz, D.w * 0.9, 0.7, 0.15, [D.col, shade(D.col, -0.28), shade(D.col, 0.25), "#fffbe8"], e.kind === "raptor" ? 22 : 34, 0.16);
    sfx.shatter(); shake = Math.max(shake, 5); rumble(40, 0.3);
    kills++;
    addText("POF!", { wx: e.fx, wz: e.fz, wy: 1.4, size: 30, col: "#ffd23f", life: 0.8 });
    if (Math.random() < 0.5) stars.add(key(e.x, e.z));
  }
  function hitBoss(b) {
    boss.hp--;
    giant.flash = 0.12;
    giant.z = Math.max(BOSS_HOME - 0.6, giant.z - 0.16);
    sfx.bossHit(); shake = Math.max(shake, 4);
    shatter(b.x, b.z, 0.3, 0.3, 2.6, ["#5aa03c", "#4a8c31", "#ffd23f"], 5, 0.12);
    if (boss.hp <= 0) bossDown();
  }
  function bossDown() {
    boss.state = "dead";
    const k = 1.25, cols = ["#5aa03c", "#4a8c31", "#2f5e20", "#c9d98a", "#fffdf0", "#ffd23f", "#e0566a"];
    for (let i = 0; i < 9; i++) shatter(giant.gx, giant.z - i * 0.7 * k, 2.6 * k, 4.0 * k, 0.3, cols, 26, 0.22);
    sfx.bigBoom(); shake = 30; rumble(500, 1);
    addText("BUUUM!", { sx: 0.5, sy: 0.3, size: 60, col: "#ffd23f", life: 1.6 });
    mode = "win"; winT = 0; lara.queue = null; lara.hop = null; lara.hy = 0;
    musicStop();
  }

  /* ---------------- Momentos do chefão ---------------- */
  function startIntro() {
    boss.state = "intro"; mode = "intro"; introT = 0; roared = false;
    lara.queue = null; musicStop();
  }
  function startCatch() {
    mode = "catch"; catchT = 0; chomped = false; spat = false;
    lara.queue = null; lara.hop = null;
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
    lara.landT = Math.max(0, (lara.landT || 0) - dt);
    giant.flash = Math.max(0, giant.flash - dt);
    fireCD = Math.max(0, fireCD - dt);
    if (state === "play") playT += dt;

    pollPad(dt);
    if (firing && fireCD <= 0 && canControl()) { shoot(); fireCD = 0.17; }

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
    } else if (state === "play") {
      if (mode === "play" || mode === "intro") lara.inv = Math.max(0, lara.inv - dt);
      updateEnemies(dt);
      updateBullets(dt);
      if (mode === "intro") updateIntro(dt);
      else if (mode === "catch") updateCatch(dt);
      else if (mode === "win") updateWin(dt);
      else updateBoss(dt);
    }
    // chefão dormindo: respira de boca fechadinha
    if (boss.state === "sleep") { giantFace(dt, 0.04 + 0.03 * Math.sin(now * 1.2), Math.sin(now * 1.2) * 0.04, 3); }

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
    for (const t of taps) t.life -= dt;
    taps = taps.filter((t) => t.life > 0);
  }

  function occupied(x, z, self) {
    for (const e of enemies) if (e !== self && ((e.x === x && e.z === z) || (Math.round(e.fx) === x && Math.round(e.fz) === z))) return true;
    return false;
  }
  function updateEnemies(dt) {
    const frozen = mode !== "play";
    for (const e of enemies) {
      e.flash = Math.max(0, e.flash - dt);
      e.ph += dt * 6;
      if (e.mv > 0) {
        e.mv = Math.max(0, e.mv - dt / 0.3);
        const k = 1 - e.mv;
        e.fx = lerp(e.x0, e.x, k); e.fz = lerp(e.z0, e.z, k);
        continue;
      }
      if (frozen) continue;
      e.rest = Math.max(0, e.rest - dt);
      e.t -= dt;
      if (e.t > 0 || e.rest > 0) continue;
      e.t = STEP[e.kind] * rand(0.85, 1.2);
      // perto da Lara: vem atrás dela; longe: passeia
      const dxL = lara.x - e.x, dzL = lara.z - e.z, near = Math.abs(dxL) + Math.abs(dzL) < 8;
      let opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => !blocked(e.x + dx, e.z + dz) && e.z + dz >= ARENA && !occupied(e.x + dx, e.z + dz, e));
      if (!opts.length) continue;
      let ch;
      if (near && Math.random() < 0.75) {
        opts.sort((a, b) => (Math.abs(dxL - a[0]) + Math.abs(dzL - a[1])) - (Math.abs(dxL - b[0]) + Math.abs(dzL - b[1])));
        ch = opts[0];
      } else ch = pick(opts);
      e.x0 = e.x; e.z0 = e.z; e.x += ch[0]; e.z += ch[1]; e.mv = 1;
      if (ch[0]) e.dir = ch[0];
    }
    // encostou na Lara?
    if (mode === "play" && lara.inv <= 0 && (!lara.hop || lara.hop.kind === "hop")) {
      for (const e of enemies) {
        if (Math.abs(e.fx - lara.fx) < 0.6 && Math.abs(e.fz - lara.fz) < 0.55) { hurt(e.fx, e.fz); e.rest = 1.0; break; }
      }
    }
  }

  function updateBullets(dt) {
    for (const b of bullets) {
      b.trail.push([b.x, b.z]); if (b.trail.length > 5) b.trail.shift();
      const n = 3;
      for (let i = 0; i < n && b.life > 0; i++) {
        b.x += (b.vx * dt) / n; b.z += (b.vz * dt) / n;
        if (blocked(Math.round(b.x), Math.round(b.z)) && !(b.z < ARENA && Math.abs(b.x) <= MAXX + 0.5)) {
          b.life = 0; sparkle(b.x, b.z, "#ffffff"); sfx.wall(); break;
        }
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (Math.abs(e.fx - b.x) < 0.5 && Math.abs(e.fz - b.z) < 0.45) {
            b.life = 0; e.hp--; e.flash = 0.12; e.rest = 0.25;
            if (e.hp <= 0) { killEnemy(e); enemies.splice(j, 1); } else { sfx.bump(); sparkle(e.fx, e.fz, "#ffffff"); }
            break;
          }
        }
        if (b.life > 0 && boss.state === "fight") {
          const k = 1.25;
          if (Math.abs(b.x - giant.gx) < 1.4 * k && b.z <= giant.z + 0.4 && b.z >= giant.z - 4 * k) { b.life = 0; hitBoss(b); }
        }
      }
      b.life -= dt;
    }
    bullets = bullets.filter((b) => b.life > 0);
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
      addText("O T-REX GIGANTE!", { sx: 0.5, sy: 0.5, size: 40, col: "#ff5b4d", life: 2.2 });
    }
    if (introT >= 3.2) {
      boss.state = "fight"; mode = "play";
      musicPlay(0, 1.25);
      addText("ATIRA, LARA!", { sx: 0.5, sy: 0.5, size: 42, col: "#ffd23f", life: 1.8 });
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
      giantFace(dt, 1, -1.5, 12);
    } else if (catchT < 1.8) {
      if (!chomped) {
        chomped = true; sfx.chomp(); rumble(160, 0.8); shake = 20;
        addText("NHAC!", { sx: 0.5, sy: 0.7, size: 64, col: "#fff", life: 1.1 });
      }
      const was = Math.sin((catchT - dt) * 14) > 0, is = Math.sin(catchT * 14) > 0;
      if (was !== is && is) sfx.munch();
      giant.open = 0.12 * Math.abs(Math.sin(catchT * 14));
      giant.lift = lerp(giant.lift, -1.0 + Math.sin(catchT * 7) * 0.12, 1 - Math.exp(-dt * 6));
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
      if (nStars > save.best) { save.best = nStars; persist(); }
    }
    if (winT > 0.9) lara.hy = Math.abs(Math.sin(winT * 6)) * 0.5;
    if (winT > 4.2 && !endShown) { endShown = true; showEnd(); }
  }

  /* ---------------- Desenho ---------------- */
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
  // a Lara de bloquinhos: maria-chiquinha com lacinhos rosa e o lançador de estrelas
  function drawLara() {
    if (state === "play" && mode === "catch" && catchT > 0.5 && catchT < 1.8) return;
    const bk = lara.bump > 0 ? Math.sin(((0.18 - lara.bump) / 0.18) * Math.PI) * 0.14 : 0;
    const x = lara.fx + bk * lara.bdx, z = lara.fz + bk * lara.bdz, y = lara.hy;
    const front = lara.fdz >= 0;            // olhando para baixo ou para os lados: vê o rostinho
    const side = lara.fdx;
    const scared = state === "play" && (mode === "intro" || mode === "catch");
    // estica no ar e achata ao pousar (fica bem "boing")
    const hopK = lara.hop && lara.hop.kind === "hop" ? lara.hop.t / lara.hop.dur : -1;
    let sq = 1;
    if (hopK >= 0) sq = 1 + 0.16 * Math.sin(hopK * Math.PI);
    if (lara.landT > 0) sq = 1 - 0.18 * Math.sin((lara.landT / 0.12) * Math.PI);
    const k = 1.3, kh = k * sq, kw = k / Math.sqrt(sq);
    shadow(x, z, 0.3 * (1 - Math.min(0.6, y * 0.3)));
    ctx.save();
    if (state === "play" && lara.inv > 0 && Math.floor(now * 14) % 2) ctx.globalAlpha = 0.45;
    if (lara.spin) {
      const cx = SX(x), cy = SY(z, y + 0.55);
      ctx.translate(cx, cy); ctx.rotate(lara.spin); ctx.translate(-cx, -cy);
    }
    const S = (dx, w, dz, h, y0, col) => vb(x + dx * kw, z, w * kw, dz * k, h * kh, y + y0 * kh, col);
    const zf = z + 0.2 * k;
    const F = (dx, yy, w, h, col) => fr(x + dx * kw, zf, y + yy * kh, w * kw, h * kh, col);
    const wave = mode === "win" ? Math.abs(Math.sin(winT * 6)) : Math.max(0, hopK >= 0 ? Math.sin(hopK * Math.PI) : 0);
    // lançador (atrás dela quando ela olha para cima)
    const gun = () => {
      const gy = 0.3, recoil = lara.shootT > 0 ? -0.06 : 0;
      if (side) {
        S(side * (0.36 + recoil), 0.2, 0.14, 0.12, gy, "#ffd23f");
        S(side * (0.5 + recoil), 0.1, 0.1, 0.08, gy + 0.02, "#4db5ff");
      } else {
        vb(x + 0.22 * kw, z + (front ? 0.2 : -0.2) * k + recoil * (front ? 1 : -1), 0.13 * kw, 0.22 * k, 0.12 * kh, y + gy * kh, "#ffd23f");
      }
      if (lara.shootT > 0) {
        const mx = side ? x + side * 0.62 * kw : x + 0.22 * kw, mz = side ? z : z + (front ? 0.45 : -0.45) * k;
        starPath(SX(mx), SY(mz, y + (gy + 0.06) * kh), T * 0.18, T * 0.08);
        ctx.fillStyle = "#fff6a8"; ctx.fill();
      }
    };
    if (!front) gun();
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
    if (front) {
      const ex = side * 0.04;
      const ey = 0.62, eh = scared ? 0.11 : 0.09;
      F(-0.13 + ex, ey, 0.07, eh, "#2a1a12"); F(0.06 + ex, ey, 0.07, eh, "#2a1a12");
      F(-0.11 + ex, ey + eh * 0.6, 0.025, 0.025, "#ffffff"); F(0.08 + ex, ey + eh * 0.6, 0.025, 0.025, "#ffffff");
      F(-0.2, 0.56, 0.07, 0.04, "#ff8fb1"); F(0.13, 0.56, 0.07, 0.04, "#ff8fb1");
      if (scared) F(-0.04 + ex, 0.52, 0.08, 0.07, "#7a2030");
      else F(-0.06 + ex, 0.53, 0.12, 0.03, "#c0392b");
      S(0, 0.5, 0.44, 0.1, 0.86, "#5a3a22");          // topo do cabelo
      F(-0.25, 0.76, 0.5, 0.11, "#5a3a22");            // franjinha
      F(-0.25, 0.5, 0.06, 0.3, "#5a3a22");
      F(0.19, 0.5, 0.06, 0.3, "#5a3a22");
    } else {
      S(0, 0.5, 0.44, 0.44, 0.46, "#5a3a22");
      fr(x - 0.012 * kw, z + 0.22 * k, y + 0.58 * kh, 0.025 * kw, 0.32 * kh, "#3d2614"); // risca do cabelo
    }
    // maria-chiquinha e lacinhos (balançam no pulo)
    const sw = wave * 0.05;
    S(-0.33 - sw, 0.15, 0.16, 0.24, 0.56 + sw, "#5a3a22"); S(0.33 + sw, 0.15, 0.16, 0.24, 0.56 + sw, "#5a3a22");
    S(-0.27 - sw, 0.13, 0.12, 0.11, 0.78 + sw, "#ff5d8f"); S(0.27 + sw, 0.13, 0.12, 0.11, 0.78 + sw, "#ff5d8f");
    if (front) gun();
    ctx.restore();
  }

  /* ---------------- Chão, mundo e efeitos ---------------- */
  function drawGround(z, xa, xb) {
    const y0 = SY(z - 0.5, 0), y1 = SY(z + 0.5, 0), h = y1 - y0 + 0.7;
    const arena = z < ARENA;
    for (let x = xa; x <= xb; x++) {
      const out = Math.abs(x) > MAXX || z < 0 || z >= ZMAX, odd = (x + z) & 1;
      let col;
      if (out) col = odd ? "#5fa94a" : "#58a044";
      else if (arena) col = odd ? "#e6b97c" : "#ddae70";
      else col = odd ? "#92d66c" : "#86cb63";
      ctx.fillStyle = col;
      ctx.fillRect(SX(x - 0.5), y0, T + 0.7, h);
      const hv = hash(z * 17.3 + x * 3.1);
      if (!out && !arena && hv > 0.86 && !walls.has(key(x, z))) {
        ctx.fillStyle = hv > 0.93 ? "#ff8fb1" : "#ffe14d";
        ctx.fillRect(SX(x - 0.2), y0 + h * 0.35, T * 0.12, T * 0.12);
        ctx.fillRect(SX(x + 0.12), y0 + h * 0.6, T * 0.1, T * 0.1);
      } else if (arena && hv > 0.7) {
        ctx.fillStyle = "#c99a5f";
        ctx.fillRect(SX(x - 0.25), y0 + h * 0.4, T * 0.14, T * 0.1);
        ctx.fillRect(SX(x + 0.05), y0 + h * 0.55, T * 0.14, T * 0.1);
      }
    }
  }
  function drawBullet(b) {
    for (let i = 0; i < b.trail.length; i++) {
      const [tx, tz] = b.trail[i], a = (i + 1) / (b.trail.length + 1);
      ctx.fillStyle = "rgba(255,240,140," + (0.5 * a).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(SX(tx), SY(tz, 0.42), T * 0.1 * a + 1, 0, Math.PI * 2); ctx.fill();
    }
    const cx = SX(b.x), cy = SY(b.z, 0.42);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, T * 0.32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,226,77,0.95)"); g.addColorStop(1, "rgba(255,93,143,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, T * 0.32, 0, Math.PI * 2); ctx.fill();
  }
  function drawFrag(f) {
    ctx.globalAlpha = clamp(f.life / 0.5, 0, 1);
    vb(f.x, f.z, f.s, f.s, f.s, f.y, f.col, true);
    ctx.globalAlpha = 1;
  }

  function drawWorld() {
    const above = Math.ceil(BASE / L) + 4, below = Math.ceil((H - BASE) / L) + 2;
    const zTop = Math.floor(camZ) - above, zBottom = Math.floor(camZ) + below;
    const xr = Math.ceil(W / 2 / T) + 1;
    const lz = Math.floor(lara.fz + 0.001), zg = Math.floor(giant.z);
    const showBoss = boss.state !== "dead";
    // agrupa por faixa o que anda (dinos, pedacinhos, tiros) para desenhar na ordem certa
    const rowsE = new Map(), rowsF = new Map();
    for (const e of enemies) { const r = Math.round(e.fz); (rowsE.get(r) || rowsE.set(r, []).get(r)).push(e); }
    for (const f of frags) { const r = Math.round(f.z); (rowsF.get(r) || rowsF.set(r, []).get(r)).push(f); }
    if (showBoss && zg < zTop) drawGiant();
    for (let z = zTop; z <= zBottom; z++) {
      drawGround(z, -xr, xr);
      // mato fechado em volta (fora do labirinto)
      for (let x = -xr; x <= xr; x++) {
        if (Math.abs(x) <= MAXX && z >= 0 && z < ZMAX) continue;
        const hv = hash(z * 31.7 + x * 7.3);
        if (hv > 0.3) drawTree(x, z, hv > 0.82 ? "palm" : hv > 0.45 ? "tree" : "rock");
      }
      for (let x = -MAXX; x <= MAXX; x++) {
        const w = walls.get(key(x, z));
        if (w) drawTree(x, z, w);
        else if (stars.has(key(x, z))) drawStar(x, z);
      }
      const es = rowsE.get(z);
      if (es) for (const e of es) {
        if (e.flash > 0) ctx.globalAlpha = 0.5;
        const hopY = e.mv > 0 ? Math.sin((1 - e.mv) * Math.PI) * 0.18 : 0;
        ctx.save(); ctx.translate(0, -hopY * YU);
        drawDino({ kind: e.kind, dir: e.dir, z: e.fz }, { x: e.fx, ph: e.ph });
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      const fs = rowsF.get(z);
      if (fs) for (const f of fs) drawFrag(f);
      if (z === lz) drawLara();
      if (showBoss && z === zg) drawGiant();
    }
    if (lz > zBottom || lz < zTop) drawLara();
    for (const b of bullets) drawBullet(b);
    for (const p of wparts) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.col;
      const s = p.s * T;
      ctx.fillRect(SX(p.x) - s / 2, SY(p.z, p.y) - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // setinhas em volta da Lara mostrando para onde ela pode pular (fortes no começo, depois clarinhas)
  function drawGuides() {
    if (state !== "play" || mode !== "play") return;
    const a = playT < 8 ? 0.85 : 0.2 + 0.07 * Math.sin(now * 3);
    const cx = SX(lara.x), cy = SY(lara.z, 0.45), s = T * 0.3, bob = Math.sin(now * 6) * T * 0.05;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineJoin = "round"; ctx.lineWidth = Math.max(3, T * 0.08); ctx.strokeStyle = "#2b1d4a"; ctx.fillStyle = "#ffffff";
    const tri = (x, y, dx, dy) => {
      const px = -dy, py = dx;
      ctx.beginPath();
      ctx.moveTo(x + dx * s, y + dy * s);
      ctx.lineTo(x - dx * s * 0.6 + px * s, y - dy * s * 0.6 + py * s);
      ctx.lineTo(x - dx * s * 0.6 - px * s, y - dy * s * 0.6 - py * s);
      ctx.closePath(); ctx.stroke(); ctx.fill();
    };
    if (!blocked(lara.x - 1, lara.z)) tri(cx - T * 1.0 - bob, cy, -1, 0);
    if (!blocked(lara.x + 1, lara.z)) tri(cx + T * 1.0 + bob, cy, 1, 0);
    if (!blocked(lara.x, lara.z + 1)) tri(cx, SY(lara.z + 1, 0.2) + bob, 0, 1);
    if (!blocked(lara.x, lara.z - 1)) tri(cx, SY(lara.z - 1, 1.6) - bob, 0, -1);
    ctx.restore();
  }
  function drawTaps() {
    for (const t of taps) {
      const k = 1 - t.life / 0.4;
      ctx.save();
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(3, T * 0.09);
      ctx.beginPath(); ctx.arc(t.x, t.y, T * (0.25 + 0.45 * k), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
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
    outlined("T-REX", x + w / 2, y + h / 2 + 1, 15, "#ffffff", "#2b1d4a");
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  const REX_BASE = { f: "#5aa03c", s: "#4a8c31", d: "#2f5e20", belly: "#c9d98a", mouth: "#8a1424", tongue: "#e0566a", tooth: "#fffdf0" };
  const REX_FLASH = { f: "#e9ffd9", s: "#d9f5c8", d: "#b9e0a8", belly: "#ffffff", mouth: "#ff9db0", tongue: "#ffc2cf", tooth: "#ffffff" };
  let REX = REX_BASE;
  function drawGiant() {
    REX = giant.flash > 0 ? REX_FLASH : REX_BASE;
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
    ctx.fillStyle = "#58a044"; ctx.fillRect(-30, -30, W + 60, H + 60);
    drawWorld();
    drawGuides();
    if (state === "play" && mode === "intro") {
      const r = ease(clamp(introT / 0.8, 0, 1)) * (1 - ease(clamp((introT - 2.6) / 0.6, 0, 1)));
      ctx.fillStyle = "rgba(20,10,35," + (0.4 * r).toFixed(3) + ")";
      ctx.fillRect(-30, -30, W + 60, H + 60);
      drawGiant(); drawLara();
    }
    ctx.restore();
    // um céu de selva bem colorido nas bordas (deixa tudo mais vivo)
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.45, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    vg.addColorStop(0, "rgba(255,200,120,0)"); vg.addColorStop(1, "rgba(255,140,90,0.22)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    for (const p of sparts) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.col; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
      ctx.restore();
    }
    drawBossBar();
    drawTaps();
    drawTexts();
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
    addText("Vai, Lara!", { sx: 0.5, sy: 0.4, size: 42, col: "#ffd23f", life: 1.6 });
    hud();
  }
  function showEnd() {
    state = "end";
    $("endStars").textContent = "⭐ " + nStars + "   🦖 " + kills;
    $("endBest").textContent = "Recorde de estrelinhas: " + save.best;
    hudEl.classList.add("hidden"); fireBtn.classList.add("hidden");
    $("end").classList.remove("hidden");
  }

  /* ---------------- Controles: toque ---------------- */
  // A Lara pula na direção em que você toca (para cima, para baixo ou para os lados).
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault(); initAudio();
    if (state !== "play") return;
    const r = cv.getBoundingClientRect();
    const tx = e.clientX - r.left, ty = e.clientY - r.top;
    const dx = tx - SX(lara.fx), dy = ty - SY(lara.fz, 0.5);
    taps.push({ x: tx, y: ty, life: 0.4 });
    if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
    else move(0, Math.sign(dy) || -1);
  });
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
    if (state !== "play") { if ((k === "Enter" || k === " ") && state !== "play") { e.preventDefault(); startGame(); } return; }
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
    firing = false; fireBtn.classList.remove("on");
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
    get state() { return state; }, get mode() { return mode; }, lara, giant, boss, move, shoot, startGame,
    get enemies() { return enemies; }, get kills() { return kills; }, get stars() { return nStars; }, blocked,
    get audio() { return AC ? AC.state : "none"; }, get musicOn() { return music.on; },
    setFiring(v) { firing = v; },
  };
})();
