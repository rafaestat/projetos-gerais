/* ====================================================================
   Corrida da Lara — Kart Arco-Íris
   Corrida de kart em pseudo-3D no estilo Mario Kart, feita para crianças.
   - 4 pistas com curvas, morros, rampas e turbos
   - 8 corredores, 3 voltas, posição em tempo real
   - Caixas de item ❓: 🍄 turbo, 🍌 banana, 🐚 concha teleguiada,
     🌟 estrela invencível, ⚡ raio que encolhe os rivais
   - Mini-turbo automático nas curvas (faíscas azul → laranja → rosa)
   - Largada turbo, moedas que deixam o kart mais rápido
   - Copa de 4 corridas com pontos e troféu; 3 velocidades
   - Música e sons gerados na hora (WebAudio), sem arquivos
   Controle: arraste o dedo (ou setas) para dirigir; botão grande
   (ou espaço) para usar o item.
   ==================================================================== */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const FONT = "'Comic Sans MS','Chalkboard SE','Trebuchet MS',system-ui,sans-serif";

  /* ---------------- Dados salvos ------------------------------------ */
  const SAVE_KEY = "corridaLara.v2";
  const save = { muted: false, char: 0, color: 0, cc: 0, trophies: {} };
  try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); } catch (e) { /* sem save */ }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* tudo bem */ }
  }

  /* ---------------- Personagens, karts e velocidades ---------------- */
  const CAR_COLORS = [
    { name: "Rosa", body: "#ff5d8f", dark: "#d63b6e" },
    { name: "Roxo", body: "#a66cff", dark: "#7d44d6" },
    { name: "Azul", body: "#4db5ff", dark: "#2e8ad6" },
    { name: "Verde", body: "#5cd97a", dark: "#36b257" },
    { name: "Amarelo", body: "#ffd23f", dark: "#e0ac00" },
    { name: "Vermelho", body: "#ff5b4d", dark: "#d6362a" },
    { name: "Laranja", body: "#ff9f43", dark: "#d67e22" },
    { name: "Branco", body: "#f4f4f8", dark: "#a9a9b8" },
    { name: "Marrom", body: "#b07a4f", dark: "#7f5434" },
  ];
  const CHARS = [
    { e: "👧", name: "Lara", color: 0, fem: true, back: { type: "girl", c: "#5a3a22" } },
    { e: "🐱", name: "Gatinha", color: 6, fem: true, back: { type: "cat", c: "#ffc94d", in: "#ff9fb5" } },
    { e: "🐶", name: "Totó", color: 2, fem: false, back: { type: "dog", c: "#f3dcb8", ear: "#a0703c" } },
    { e: "🦄", name: "Unicórnio", color: 1, fem: false, back: { type: "unicorn", c: "#ffffff" } },
    { e: "🐼", name: "Panda", color: 7, fem: false, back: { type: "round", c: "#ffffff", ear: "#222228" } },
    { e: "🐸", name: "Sapinho", color: 3, fem: false, back: { type: "frog", c: "#5cd97a" } },
    { e: "🐰", name: "Coelha", color: 4, fem: true, back: { type: "bunny", c: "#f4f4f8", in: "#ffb3d9" } },
    { e: "🦊", name: "Raposa", color: 5, fem: true, back: { type: "fox", c: "#ff8a3d", in: "#3a2a20" } },
    { e: "🐢", name: "Tartaruga", color: 3, fem: true, back: { type: "turtle", c: "#8bd96a" } },
    { e: "🐻", name: "Ursinho", color: 8, fem: false, back: { type: "round", c: "#b07a4f", ear: "#b07a4f", in: "#e0b48a" } },
  ].map((c, i) => ({ ...c, i }));

  const CCS = [
    { id: "50", label: "🐢 Fácil", top: 54, skill: [0.84, 0.95], push: 0.003, aiItems: ["banana", "mush"], aiUse: 0.5, dino: 3 },
    { id: "100", label: "🐇 Médio", top: 62, skill: [0.9, 1.0], push: 0.0042, aiItems: ["banana", "mush", "shell"], aiUse: 0.8, dino: 5 },
    { id: "150", label: "🚀 Rápido", top: 70, skill: [0.94, 1.04], push: 0.0054, aiItems: ["banana", "mush", "shell", "star"], aiUse: 1, dino: 7 },
  ];
  let CC = CCS[save.cc] || CCS[0];

  const ITEM_ICON = { mush: "🍄", banana: "🍌", shell: "🐚", star: "🌟", bolt: "⚡" };
  const ROULETTE = ["🍄", "🍌", "🐚", "🌟", "⚡"];
  const DRIFT_COLORS = [null, "#4fc3ff", "#ffa726", "#ff4fd8"];
  const PTS = [15, 12, 10, 8, 6, 4, 2, 1];
  const MEDALS = ["🥇", "🥈", "🥉"];

  /* ---------------- Pistas ------------------------------------------ */
  // layout: [entrada, meio, saída, curva, morro]
  const TRACKS = [
    {
      name: "Campo Florido", icon: "🌻", song: 0,
      th: {
        sky: ["#3fa9f5", "#d4f1ff"], sun: "#fff3b0", cloud: "#ffffff", far: "#b7e29a", near: "#98d477",
        grass: ["#6fcf4b", "#86de5f"], rumble: ["#ff5d5d", "#ffffff"], road: ["#5a5a66", "#62626e"], lane: "#ffffff",
        dust: "rgba(120,90,50,0.6)",
        decor: ["🌳", "🌳", "🌻", "🍄", "🌷", "🌳", "🌼", "🌲"], marks: ["🏰", "🎡", "🏡", "🐄", "🎪"],
      },
      layout: [[0, 40, 0, 0, 0], [20, 40, 20, 2.6, 0], [20, 30, 20, 0, 700], [20, 30, 20, 0, -700], [20, 50, 20, -3, 0],
        [0, 30, 0, 0, 0], [15, 25, 15, 2.2, 450], [15, 25, 15, -2.2, -450], [0, 40, 0, 0, 0], [25, 50, 25, -3.2, 0], [0, 30, 0, 0, 0]],
      ramps: [0.68],
      secret: { kind: "space", at: 0.42, side: -1 },
    },
    {
      name: "Praia do Sol", icon: "🏖️", song: 1,
      th: {
        sky: ["#1fa2f0", "#c4f3ff"], sun: "#fff8c9", cloud: "#ffffff", sea: "#22b3e3", far: "#6cc9a0", near: "#f3dca0",
        grass: ["#f2d38b", "#f7de9f"], rumble: ["#ff7a59", "#ffffff"], road: ["#6a6a76", "#72727e"], lane: "#ffffff",
        dust: "rgba(210,170,90,0.7)",
        decor: ["🌴", "🌴", "🦀", "🐚", "⛱️", "🌺", "🌴", "🏐"], marks: ["🏝️", "⛵", "🐳", "🏰", "🎠"],
      },
      layout: [[0, 40, 0, 0, 0], [20, 30, 20, -2.4, 0], [10, 25, 10, 0, 900], [10, 25, 10, 0, -900], [20, 40, 20, 3, 0],
        [0, 30, 0, 0, 0], [15, 20, 15, -2.8, 350], [15, 20, 15, 2.8, -350], [0, 45, 0, 0, 0], [20, 40, 20, 3.4, 0], [0, 30, 0, 0, 0]],
      ramps: [0.5, 0.86],
      secret: { kind: "sea", at: 0.36, side: 1 },
    },
    {
      name: "Reino dos Doces", icon: "🍭", song: 2,
      th: {
        sky: ["#ff8fd0", "#ffe6f5"], sun: "#fff5fb", cloud: "#ffd1ea", far: "#ffc4e1", near: "#ff9ccf",
        grass: ["#fff0f7", "#ffe1ef"], rumble: ["#ff4fa0", "#ffffff"], road: ["#8a5638", "#94603f"], lane: "#ffd1ea",
        dust: "rgba(255,150,200,0.7)",
        decor: ["🍭", "🍬", "🧁", "🍩", "🍦", "🍭", "🍪", "🍓"], marks: ["🎂", "🏰", "🍰", "🍫", "🎠"],
      },
      layout: [[0, 40, 0, 0, 0], [15, 20, 15, 3, 0], [15, 20, 15, -3, 0], [15, 20, 15, 3, 0], [0, 25, 0, 0, 500],
        [20, 30, 20, -2.6, -500], [0, 30, 0, 0, 0], [20, 60, 20, 3.6, 0], [0, 30, 0, 0, 1100], [0, 30, 0, 0, -1100],
        [15, 25, 15, -2.4, 0], [0, 35, 0, 0, 0]],
      ramps: [0.4],
      secret: { kind: "sky", at: 0.47, side: -1 },
    },
    {
      name: "Estrada Arco-Íris", icon: "🌈", song: 3,
      th: {
        sky: ["#090527", "#3b1f7d"], moon: true, stars: true, far: "#2a1b5e", near: "#3b2780", peaks: true,
        grass: ["#1a1240", "#20174e"], rumble: ["#ffffff", "#ffe14d"], rainbow: true,
        dust: "rgba(200,180,255,0.7)",
        decor: ["⭐", "✨", "⭐", "💫", "🌟", "✨"], marks: ["🚀", "🛸", "🪐", "🌙", "🌈"],
      },
      layout: [[0, 40, 0, 0, 0], [25, 40, 25, 2, 1300], [25, 40, 25, -2, -1300], [0, 30, 0, 0, 0], [20, 50, 20, 3.5, 0],
        [10, 20, 10, -1.6, 650], [10, 20, 10, 1.6, -650], [0, 40, 0, 0, 0], [20, 40, 20, -3.6, 0], [0, 40, 0, 0, 0]],
      ramps: [0.3, 0.75],
      secret: { kind: "space", at: 0.5, side: 1 },
    },

    /* ----- Viagem Espacial: uma pista em cada planeta ----- */
    {
      name: "Terra", icon: "🌍", song: 0, space: true, planet: "earth",
      th: {
        sky: ["#3fa9f5", "#d4f1ff"], sun: "#fff3b0", cloud: "#ffffff", sea: "#2a9fd6", far: "#7cc26b", near: "#5fb34e",
        grass: ["#5dc24a", "#6fd05a"], rumble: ["#4db5ff", "#ffffff"], road: ["#5a5a66", "#62626e"], lane: "#ffffff",
        dust: "rgba(120,90,50,0.6)",
        decor: ["🌳", "🏠", "🌲", "🌻", "🏡", "🌳", "🐄", "🐑"], marks: ["🏙️", "🎡", "🗼", "🏰", "🚂"],
      },
      layout: [[0, 40, 0, 0, 0], [20, 40, 20, -2.6, 0], [15, 30, 15, 0, 600], [15, 30, 15, 2.4, -600], [0, 30, 0, 0, 0],
        [20, 40, 20, -3, 300], [20, 40, 20, 3, -300], [0, 40, 0, 0, 0], [25, 40, 25, 2.8, 0], [0, 30, 0, 0, 0]],
      ramps: [0.6],
    },
    {
      name: "Lua", icon: "🌕", song: 3, space: true, planet: "moon",
      th: {
        sky: ["#000005", "#16162c"], stars: true, planet: "earth", planetR: 0.12, far: "#5a5a66", near: "#7a7a86",
        grass: ["#9a9aa6", "#a8a8b4"], rumble: ["#ffffff", "#ff5d5d"], road: ["#3a3a44", "#42424c"], lane: "#ffe14d",
        dust: "rgba(225,225,235,0.8)", grav: 0.22,
        decor: ["🌑", "🛰️", "🧑‍🚀", "🚩", "🌑", "⭐"], marks: ["🚀", "🛸", "🛰️", "📡"],
      },
      layout: [[0, 40, 0, 0, 0], [20, 30, 20, 1.8, 900], [20, 30, 20, -1.8, -900], [0, 40, 0, 0, 0], [20, 40, 20, -2.8, 0],
        [10, 30, 10, 0, 1200], [10, 30, 10, 0, -1200], [20, 40, 20, 3, 0], [0, 40, 0, 0, 0]],
      ramps: [0.22, 0.48, 0.82],
    },
    {
      name: "Marte", icon: "🔴", song: 2, space: true, planet: "mars",
      th: {
        sky: ["#b9502a", "#f3b07a"], sun: "#fff0d0", far: "#a8432a", near: "#c95a35", peaks: true,
        grass: ["#d8693c", "#e07646"], rumble: ["#ffffff", "#5a2a1a"], road: ["#6b3a2a", "#74412f"], lane: "#ffd8a8",
        dust: "rgba(200,90,50,0.7)", grav: 0.38,
        decor: ["🌋", "👽", "🤖", "🛰️", "⛰️", "🛸"], marks: ["🌋", "🛸", "🤖", "🚀"],
      },
      layout: [[0, 40, 0, 0, 0], [15, 25, 15, 3.2, 400], [15, 25, 15, -3.2, -400], [0, 30, 0, 0, 0], [20, 50, 20, 3.6, 0],
        [0, 25, 0, 0, 800], [0, 25, 0, 0, -800], [15, 30, 15, -2.8, 0], [15, 30, 15, 2.8, 0], [0, 35, 0, 0, 0]],
      ramps: [0.55],
    },
    {
      name: "Saturno", icon: "🪐", song: 3, space: true, planet: "saturn",
      th: {
        sky: ["#120a2a", "#4a2a6a"], stars: true, planet: "saturn", planetR: 0.17, far: "#6a4a8a", near: "#8a6aa0",
        grass: ["#e8d3a0", "#dcc590"], rumble: ["#ffffff", "#9be7ff"], road: ["#4a3a6a", "#544470"], lane: "#9be7ff",
        dust: "rgba(240,220,170,0.7)", grav: 0.45,
        decor: ["💎", "❄️", "☄️", "✨", "⭐", "🧊"], marks: ["🛸", "☄️", "🌟", "🚀"],
      },
      layout: [[0, 40, 0, 0, 0], [30, 50, 30, 2.2, 0], [0, 30, 0, 0, 700], [0, 30, 0, 0, -700], [30, 50, 30, -2.4, 0],
        [0, 40, 0, 0, 0], [20, 40, 20, 3.2, 500], [20, 40, 20, -1.6, -500], [0, 40, 0, 0, 0]],
      ramps: [0.4, 0.7],
    },

    /* ----- Vale dos Dinossauros: fuja do T-Rex! ----- */
    {
      name: "Vale dos Dinossauros", icon: "🦖", song: 5, dino: true,
      th: {
        sky: ["#5fb8e8", "#e3f6d0"], sun: "#fff3b0", cloud: "#ffffff", far: "#4f7d3f", near: "#3e6e33", peaks: true, volcano: true,
        grass: ["#4caf50", "#5abd5d"], rumble: ["#8d5524", "#ffd23f"], road: ["#8a6a4a", "#94714f"], lane: "#ffe9b0",
        dust: "rgba(140,100,60,0.7)",
        decor: ["🌴", "🌿", "🦕", "🥚", "🌴", "🍄", "🌳", "🦴", "🌿"], marks: ["🌋", "🦕", "🦕", "🏕️"],
      },
      layout: [[0, 40, 0, 0, 0], [20, 40, 20, 2.4, 0], [15, 30, 15, 0, 800], [15, 30, 15, -2.6, -800], [0, 30, 0, 0, 0],
        [20, 50, 20, 3.2, 0], [10, 25, 10, -1.8, 500], [10, 25, 10, 1.8, -500], [0, 40, 0, 0, 0], [25, 45, 25, -3, 0], [0, 30, 0, 0, 0]],
      ramps: [0.32, 0.72],
      bombs: [0.2, 0.5, 0.86],
    },
  ];
  const CUP_LIST = [0, 1, 2, 3, 8], SPACE_LIST = [4, 5, 6, 7];

  const SMALL_DECOR = ["🍄", "🌷", "🌼", "🦀", "🐚", "🏐", "🌺", "🍓", "🍬", "🍪", "🚩", "🧑‍🚀", "👽", "🤖", "💎", "❄️", "🧊", "🐑", "🐄", "🥚", "🦴", "🌿"];

  /* ---------------- Tela e projeção --------------------------------- */
  const SEG_L = 200, DRAW = 72, CAM_DIST = 1100, LAPS = 3, NR = 8, START = 12;
  const lineZ = START * SEG_L;
  let W = 0, H = 0, dpr = 1, HOR = 0, FOCAL = 1, CAM_H = 1000, PLAYER_Y = 0;
  let ROAD_W = 1500, KW = 500, CURVE_K = 1;
  const clouds = [], stars = [];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(2400000 / Math.max(1, W * H)));
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const land = W > H;
    HOR = H * (land ? 0.44 : 0.4);
    FOCAL = Math.min(W * 1.05, H * 0.5);
    PLAYER_Y = H * (land ? 0.88 : 0.85);
    CAM_H = (CAM_DIST * (PLAYER_Y - HOR)) / FOCAL;
    // em pé a pista fica mais larga que a tela; deitado cabe inteira
    ROAD_W = (((land ? 0.78 : 1.35) * W) / 2) * CAM_DIST / FOCAL;
    KW = 0.34 * ROAD_W;
    CURVE_K = ROAD_W / 1400;
  }
  window.addEventListener("resize", resize);
  resize();

  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- Sons e música (WebAudio, sem arquivos) ---------- */
  let AC = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null, eng = null;
  const muteBtn = $("mute-btn");

  function ensureAudio() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain();
        master.connect(AC.destination);
        musicBus = AC.createGain();
        musicBus.gain.value = 0.5;
        musicBus.connect(master);
        sfxBus = AC.createGain();
        sfxBus.gain.value = 0.9;
        sfxBus.connect(master);
        noiseBuf = AC.createBuffer(1, Math.floor(AC.sampleRate * 0.5), AC.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        applyMute();
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === "suspended") AC.resume().catch(() => {});
  }
  function applyMute() {
    if (master) master.gain.value = save.muted ? 0 : 1;
    muteBtn.textContent = save.muted ? "🔇" : "🔊";
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function osc(t, f, dur, type, vol, f2, bus) {
    try {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(bus || sfxBus);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* sem som, sem drama */ }
  }
  function noiseAt(t, dur, vol, freq, bus) {
    try {
      const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      s.buffer = noiseBuf;
      f.type = "highpass";
      f.frequency.value = freq || 1000;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus || sfxBus);
      s.start(t);
      s.stop(t + dur + 0.02);
    } catch (e) { /* ok */ }
  }
  function tone(f, dur, type, vol, delay, f2) {
    if (AC) osc(AC.currentTime + (delay || 0), f, dur, type, vol, f2);
  }
  function arp(notes, gap, dur, type, vol) { notes.forEach((m, i) => tone(mtof(m), dur, type, vol, i * gap)); }

  const sfx = {
    coin: () => { tone(1320, 0.08, "triangle", 0.16); tone(1760, 0.14, "triangle", 0.12, 0.06); },
    box: () => arp([84, 88, 91], 0.04, 0.08, "square", 0.06),
    tick: () => tone(900 + Math.random() * 500, 0.03, "square", 0.04),
    get: () => arp([79, 84, 88, 91], 0.05, 0.1, "triangle", 0.14),
    boost: () => { tone(220, 0.35, "sawtooth", 0.08, 0, 880); if (AC) noiseAt(AC.currentTime, 0.3, 0.06, 2000); },
    spark: (l) => tone(1000 + l * 350, 0.07, "square", 0.06),
    hit: () => { tone(500, 0.45, "sawtooth", 0.12, 0, 70); tone(700, 0.3, "square", 0.05, 0.05, 200); },
    bump: () => tone(130, 0.15, "sawtooth", 0.14),
    banana: () => tone(300, 0.18, "sine", 0.18, 0, 620),
    shell: () => tone(500, 0.25, "square", 0.08, 0, 1300),
    star: () => arp([72, 76, 79, 84, 88, 91, 96], 0.06, 0.12, "square", 0.08),
    bolt: () => { if (AC) noiseAt(AC.currentTime, 0.5, 0.25, 300); tone(1600, 0.6, "sawtooth", 0.1, 0, 90); },
    jump: () => tone(300, 0.25, "sine", 0.16, 0, 900),
    pass: () => tone(1046, 0.1, "triangle", 0.12),
    lap: () => arp([72, 76, 79], 0.08, 0.14, "square", 0.1),
    last: () => arp([72, 72, 72, 77, 81, 84], 0.11, 0.18, "square", 0.11),
    count: (go) => tone(go ? 880 : 440, go ? 0.5 : 0.18, "square", 0.16),
    win: () => arp([72, 76, 79, 84, 79, 84, 88], 0.13, 0.25, "triangle", 0.2),
    blip: () => tone(700, 0.08, "square", 0.1),
    roar: () => { if (AC) noiseAt(AC.currentTime, 1.0, 0.22, 150); tone(150, 0.9, "sawtooth", 0.13, 0, 60); tone(230, 0.7, "square", 0.05, 0.05, 90); },
    chomp: () => { tone(320, 0.09, "square", 0.2, 0, 90); tone(320, 0.09, "square", 0.2, 0.16, 90); },
    kaboom: () => { if (AC) noiseAt(AC.currentTime, 0.7, 0.35, 60); tone(130, 0.6, "sine", 0.28, 0, 35); },
    chime: () => arp([88, 91, 95, 100], 0.06, 0.14, "sine", 0.12),
    secret: () => arp([84, 88, 91, 96, 100, 103], 0.06, 0.16, "triangle", 0.13),
    rocket: () => { if (AC) noiseAt(AC.currentTime, 1.8, 0.2, 120); tone(70, 1.6, "sawtooth", 0.08, 0, 420); },
    pop: () => { if (AC) noiseAt(AC.currentTime, 0.3, 0.16, 500); tone(1400 + Math.random() * 800, 0.08, "triangle", 0.05, 0.05); },
  };

  // músicas: 32 colcheias, notas MIDI (0 = pausa)
  const SONGS = [
    { bpm: 150, wave: "square", vol: 0.045,
      lead: [72, 0, 76, 79, 0, 76, 79, 0, 81, 79, 76, 0, 74, 0, 72, 0, 77, 0, 81, 84, 0, 81, 77, 0, 79, 77, 76, 74, 76, 0, 0, 0],
      bass: [48, 0, 48, 0, 55, 0, 55, 0, 53, 0, 53, 0, 55, 0, 55, 0, 53, 0, 53, 0, 57, 0, 57, 0, 55, 0, 55, 0, 48, 0, 55, 0] },
    { bpm: 132, wave: "triangle", vol: 0.09,
      lead: [77, 0, 81, 0, 84, 81, 0, 79, 77, 0, 74, 0, 72, 0, 74, 77, 79, 0, 82, 0, 86, 82, 0, 79, 81, 79, 77, 74, 77, 0, 0, 0],
      bass: [41, 0, 48, 41, 0, 48, 41, 0, 46, 0, 53, 46, 0, 53, 46, 0, 48, 0, 55, 48, 0, 55, 48, 0, 41, 0, 48, 0, 41, 0, 48, 0] },
    { bpm: 160, wave: "square", vol: 0.04,
      lead: [79, 83, 86, 83, 79, 0, 81, 0, 83, 81, 79, 76, 74, 0, 0, 0, 76, 79, 83, 79, 76, 0, 78, 0, 79, 78, 76, 74, 79, 0, 0, 0],
      bass: [43, 0, 50, 0, 43, 0, 50, 0, 48, 0, 55, 0, 50, 0, 57, 0, 45, 0, 52, 0, 50, 0, 57, 0, 48, 0, 50, 0, 43, 0, 50, 0] },
    { bpm: 144, wave: "triangle", vol: 0.09,
      lead: [69, 72, 76, 81, 79, 76, 72, 76, 74, 77, 81, 86, 84, 81, 77, 81, 72, 76, 79, 84, 83, 79, 76, 79, 81, 0, 76, 0, 81, 0, 0, 0],
      bass: [45, 0, 45, 57, 45, 0, 45, 57, 50, 0, 50, 62, 50, 0, 50, 62, 48, 0, 48, 60, 52, 0, 52, 64, 45, 0, 52, 0, 45, 0, 0, 0] },
    // festa do pódio
    { bpm: 140, wave: "square", vol: 0.05,
      lead: [72, 76, 79, 84, 0, 79, 84, 0, 88, 0, 86, 84, 79, 0, 0, 0, 77, 81, 84, 89, 0, 84, 89, 0, 91, 0, 89, 88, 84, 0, 0, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0, 52, 0, 55, 0, 48, 0, 55, 0, 53, 0, 57, 0, 53, 0, 57, 0, 55, 0, 59, 0, 48, 0, 55, 0] },
    // selva dos dinossauros
    { bpm: 128, wave: "triangle", vol: 0.09,
      lead: [64, 67, 69, 0, 72, 69, 67, 0, 64, 67, 69, 72, 74, 0, 72, 0, 76, 74, 72, 0, 69, 67, 64, 0, 62, 64, 67, 69, 64, 0, 0, 0],
      bass: [40, 0, 40, 47, 0, 40, 45, 0, 40, 0, 40, 47, 0, 43, 45, 0, 36, 0, 36, 43, 0, 36, 41, 0, 38, 0, 38, 45, 0, 43, 40, 0] },
  ];
  const music = { on: false, paused: false, song: 0, step: 0, next: 0, tempo: 1, timer: 0 };

  function musicPlay(i, tempo) {
    if (!AC) return;
    music.on = true; music.paused = false;
    music.song = i; music.step = 0; music.tempo = tempo || 1;
    music.next = AC.currentTime + 0.08;
    if (!music.timer) music.timer = setInterval(musicTick, 40);
  }
  function musicStop() { music.on = false; }
  function musicTick() {
    if (!music.on || music.paused || !AC || AC.state !== "running") return;
    const S = SONGS[music.song];
    const step = 60 / (S.bpm * music.tempo) / 2;
    if (music.next < AC.currentTime - 0.1) music.next = AC.currentTime + 0.03;
    while (music.next < AC.currentTime + 0.2) {
      const i = music.step % S.lead.length, t = music.next;
      if (S.lead[i]) osc(t, mtof(S.lead[i]), step * 0.9, S.wave, S.vol, 0, musicBus);
      if (S.bass[i]) osc(t, mtof(S.bass[i]), step * 1.6, "triangle", 0.12, 0, musicBus);
      if (i % 4 === 0) osc(t, 150, 0.12, "sine", 0.22, 45, musicBus);
      if (i % 4 === 2) noiseAt(t, 0.04, 0.04, 7000, musicBus);
      music.next += step;
      music.step++;
    }
  }

  function engineOn() {
    if (!AC || eng) return;
    try {
      const o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
      o.type = "sawtooth";
      o.frequency.value = 50;
      f.type = "lowpass";
      f.frequency.value = 420;
      g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(sfxBus);
      o.start();
      eng = { o, g };
    } catch (e) { eng = null; }
  }
  function engineSet(speed, vol) {
    if (!eng) return;
    const t = AC.currentTime;
    eng.o.frequency.setTargetAtTime(45 + speed * 1.3, t, 0.08);
    eng.g.gain.setTargetAtTime(vol, t, 0.1);
  }
  function engineOff() {
    if (!eng) return;
    try { eng.o.stop(); } catch (e) { /* ok */ }
    eng = null;
  }

  /* ---------------- Emojis em cache (bem mais rápido no celular) ---- */
  const emoCache = new Map();
  function emo(e, size) {
    const res = size > 120 ? 256 : 112;
    const key = e + res;
    let c = emoCache.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = c.height = res;
      const g = c.getContext("2d");
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = Math.floor(res * 0.8) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
      g.fillText(e, res / 2, res * 0.54);
      emoCache.set(key, c);
    }
    return c;
  }
  function drawEmo(e, x, yb, size) {
    if (size < 2) return;
    ctx.drawImage(emo(e, size), x - size / 2, yb - size, size, size);
  }

  /* ---------------- Construção da pista ----------------------------- */
  let T = TRACKS[0], trackIdx = 0, segments = [], N = 1, trackLen = 1, boxSegs = [], bombSegs = [];
  const idxOf = (z) => ((Math.floor(z / SEG_L) % N) + N) % N;
  const modL = (z) => ((z % trackLen) + trackLen) % trackLen;
  const wrapS = (d) => (((d % trackLen) + trackLen * 1.5) % trackLen) - trackLen / 2;
  function elevAt(z) {
    const s = z / SEG_L, i = Math.floor(s), t = s - i;
    const a = segments[((i % N) + N) % N].y, b = segments[(((i + 1) % N) + N) % N].y;
    return a + (b - a) * t;
  }

  function buildTrack(ti) {
    trackIdx = ti;
    T = TRACKS[ti];
    const r = rng(1234 + ti * 7919);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    segments = [];
    let y = 0;
    const add = (enter, hold, leave, curve, hill) => {
      const total = enter + hold + leave, y0 = y;
      for (let i = 0; i < total; i++) {
        const c = i < enter ? curve * (i / enter) : i < enter + hold ? curve : curve * (1 - (i - enter - hold) / leave);
        segments.push({
          curve: c, y: y0 + hill * (0.5 - 0.5 * Math.cos((Math.PI * i) / total)),
          sprites: [], coin: null, boxes: null, boost: null, ramp: false,
        });
      }
      y = y0 + hill;
    };
    for (const L of T.layout) add(L[0], L[1], L[2], L[3], L[4]);
    if (Math.abs(y) > 1) add(0, 30, 0, 0, -y);
    N = segments.length;
    trackLen = N * SEG_L;
    const free = (i) => { const s = segments[i]; return !s.boxes && !s.boost && !s.ramp && !s.coin; };

    // enfeites na beira da pista (bichinhos e flores ficam menores que árvores)
    const deco = (e, off, s) => ({ e, off, s: SMALL_DECOR.includes(e) ? s * 0.5 : s });
    for (let i = 0; i < N; i += 3 + Math.floor(r() * 3)) {
      const side = r() < 0.5 ? -1 : 1;
      segments[i].sprites.push(deco(pick(T.th.decor), side * (1.4 + r() * 1.3), 0.42 + r() * 0.3));
      if (r() < 0.55) segments[i].sprites.push(deco(pick(T.th.decor), -side * (2.3 + r() * 2.2), 0.5 + r() * 0.35));
    }
    T.th.marks.forEach((e, k) => {
      const i = (START + 25 + Math.floor(((k + 0.4) * N) / T.th.marks.length)) % N;
      segments[i].sprites.push({ e, off: (k % 2 ? 1 : -1) * (3.2 + r() * 0.8), s: 1.5 });
    });
    // fileiras de caixas de item ❓
    boxSegs = [];
    for (let k = 0; k < 5; k++) {
      const i = (START + 45 + Math.floor((k * N) / 5)) % N;
      segments[i].boxes = [-0.6, -0.2, 0.2, 0.6].map((off) => ({ off, t: 0 }));
      boxSegs.push(segments[i]);
    }
    // moedas
    for (let k = 0; k < 6; k++) {
      const i = (START + 90 + Math.floor((k * N) / 6)) % N;
      const lane = r() * 1.2 - 0.6;
      for (let m = 0; m < 5; m++) {
        const s = segments[(i + m * 2) % N];
        if (!s.boxes) s.coin = { off: lane, taken: false };
      }
    }
    // turbos no chão
    for (let k = 0; k < 4; k++) {
      let i = (START + 130 + Math.floor((k * N) / 4)) % N;
      for (let n = 0; n < 80 && (Math.abs(segments[i].curve) > 0.4 || !free(i)); n++) i = (i + 1) % N;
      segments[i].boost = { off: r() * 0.9 - 0.45 };
    }
    // rampas, com moedinhas no ar
    for (const f of T.ramps) {
      let i = Math.floor(f * N) % N;
      for (let n = 0; n < 80 && (Math.abs(segments[i].curve) > 0.3 || !free(i)); n++) i = (i + 1) % N;
      segments[i].ramp = true;
      for (let m = 2; m < 8; m++) {
        const s = segments[(i + m * 2) % N];
        if (!s.boxes && !s.coin) s.coin = { off: 0, taken: false, air: true };
      }
    }
    // trechos com bombas 💣
    bombSegs = [];
    for (const f of T.bombs || []) {
      let i = Math.floor(f * N) % N;
      for (let n = 0; n < 80 && !free(i); n++) i = (i + 1) % N;
      [[-0.55, 0.55], [0], [-0.75, 0.15, 0.85]].forEach((pat, m) => {
        const sg = segments[(i + m * 7) % N];
        if (sg.boxes || sg.ramp) return;
        sg.bombs = pat.map((off) => ({ off, t: 0, boom: 0 }));
        bombSegs.push(sg);
      });
    }
    // atalho secreto, com dicas: placa com seta + trilha de estrelinhas até a entrada
    if (T.secret) {
      let i = Math.floor(T.secret.at * N) % N;
      const ok = (j) => Math.abs(segments[j].curve) < 0.8 && !segments[j].ramp && !segments[j].boxes;
      for (let n = 0; n < 120 && !ok(i); n++) i = (i + 1) % N;
      const side = T.secret.side;
      segments[i].secret = { kind: T.secret.kind, side, x: side * 1.5 };
      for (let k = 1; k <= 8; k++) segments[(i - k * 2 + N) % N].hint = side * (1.45 - k * 0.05);
      segments[(i - 34 + N) % N].sign = side;
      for (let j = i - 22; j <= i + 4; j++) {
        const sg = segments[(j + N) % N];
        sg.sprites = sg.sprites.filter((sp) => sp.off * side < 0 || Math.abs(sp.off) > 2.6);
      }
    }
    // céu
    clouds.length = 0;
    for (let i = 0; i < 6; i++) clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.5, s: 0.6 + Math.random() * 0.9 });
    stars.length = 0;
    for (let i = 0; i < 80; i++) stars.push({ x: Math.random(), y: Math.random() * 0.95, s: 0.6 + Math.random() * 1.8, ph: Math.random() * 9 });
  }

  /* ---------------- Estado da corrida ------------------------------- */
  let state = "menu", pausedFrom = "race", mode = "free", gp = null;
  let racers = [], player = null, karts = [], bananas = [], shells = [];
  let targetNX = 0, countT = 0, finishCount = 0, finishT = 0, raceT = 0;
  let shake = 0, flash = 0, hillOff = 0, lastRank = NR, posPop = 0;
  let msgText = "", msgColor = "#fff", msgT = 0, msgMax = 1;
  let rocketOK = false, raceLabel = "";
  const particles = [], confetti = [];

  function msg(text, color, dur) {
    msgText = text;
    msgColor = color || "#fff";
    msgT = msgMax = dur || 80;
  }

  function makeRacer(ch, color, isPlayer, g) {
    const x0 = g % 2 ? 0.4 : -0.4;
    return {
      ch, e: ch.e, name: ch.name, body: color.body, dark: color.dark, isPlayer,
      z: lineZ - 160 - g * 240, x: x0, steerX: x0, lane: x0, laneT: 60 + Math.random() * 120,
      speed: 0, skill: 1, lap: 1, finished: false, place: 0, rank: g + 1, coins: 0,
      item: null, itemN: 0, roulT: 0, useT: 0,
      boostT: 0, starT: 0, spinT: 0, smallT: 0, bumpT: 0,
      jumpH: 0, jumpV: 0, trick: false, trickA: 0,
      driftT: 0, driftLvl: 0, driftDir: 0, off: false, eatenT: 0,
    };
  }

  function resetRace() {
    const me = CHARS[save.char] || CHARS[0];
    const rivals = CHARS.filter((c) => c !== me).slice(0, NR - 1);
    player = makeRacer(me, CAR_COLORS[save.color] || CAR_COLORS[me.color], true, NR - 1);
    karts = rivals.map((c, i) => makeRacer(c, CAR_COLORS[c.color], false, i));
    const [lo, hi] = CC.skill;
    const sk = karts.map((_, i) => lo + ((hi - lo) * i) / (karts.length - 1)).sort(() => Math.random() - 0.5);
    karts.forEach((k, i) => (k.skill = sk[i]));
    racers = [player, ...karts];
    bananas = [];
    shells = [];
    particles.length = 0;
    confetti.length = 0;
    targetNX = player.x;
    secret = null;
    dino = T.dino ? { z: Math.min(...racers.map((r) => r.z)) - 3000, x: 0, speed: 0, mode: "wait", t: 720, target: null, anim: 0, step: 0, stepT: 0 } : null;
    finishCount = 0; raceT = 0; shake = 0; flash = 0; msgT = 0; lastRank = NR; rocketOK = false;
    for (const s of segments) {
      if (s.coin) s.coin.taken = false;
      if (s.boxes) for (const b of s.boxes) b.t = 0;
      if (s.bombs) for (const b of s.bombs) { b.t = 0; b.boom = 0; }
    }
  }

  /* ---------------- Itens ------------------------------------------- */
  function rollItem(rank) {
    const f = (rank - 1) / (NR - 1); // 0 = liderando, 1 = último
    const table = f < 0.2 ? [["banana", 5], ["shell", 3], ["mush", 2]]
      : f < 0.6 ? [["banana", 3], ["shell", 3], ["mush", 3], ["mush3", 1], ["star", 1]]
        : [["mush3", 3], ["shell", 2], ["star", 3], ["bolt", 2], ["mush", 2]];
    let sum = 0;
    for (const t of table) sum += t[1];
    let x = Math.random() * sum;
    for (const t of table) { x -= t[1]; if (x <= 0) return t[0]; }
    return "mush";
  }

  function useItem(r) {
    if (!r.item || r.roulT > 0) return;
    const me = r.isPlayer && state === "race";
    const it = r.item;
    if (it === "mush") {
      r.boostT = Math.max(r.boostT, 75);
      if (me) sfx.boost();
    } else if (it === "banana") {
      bananas.push({ z: modL(r.z - 260), x: r.x, age: 0, owner: r });
      if (bananas.length > 14) bananas.shift();
      if (me) sfx.banana();
    } else if (it === "shell") {
      const target = racers.find((o) => o.rank === r.rank - 1) || null;
      shells.push({ z: r.z + 200, x: r.x, target, owner: r, life: 330, spd: Math.max(r.speed, CC.top) * 1.55 });
      if (me) sfx.shell();
    } else if (it === "star") {
      r.starT = 420;
      if (me) { sfx.star(); msg("SUPER ESTRELA! 🌟", "#ffe14d", 70); }
    } else if (it === "bolt") {
      for (const o of racers) if (o !== r && o.starT <= 0) { o.smallT = 300; o.spinT = Math.max(o.spinT, 30); o.item = null; o.roulT = 0; }
      flash = 16;
      sfx.bolt();
      if (me) msg("RAIO! ⚡", "#ffe14d", 70);
    }
    r.itemN--;
    if (r.itemN <= 0) r.item = null;
  }

  function blast(r) {
    const me = r.isPlayer && state === "race";
    if (state === "race" && Math.abs(wrapS(r.z - player.z)) < 3000) sfx.kaboom();
    if (r.starT > 0) return;
    r.jumpH = 1; r.jumpV = 11; r.trick = false; r.trickA = 0;
    r.spinT = 70; r.speed *= 0.3; r.driftT = 0; r.driftLvl = 0;
    if (me) { shake = 16; flash = 8; r.coins -= Math.min(r.coins, 2); msg("BUM! 💥", "#ff8a3d", 60); }
  }

  /* ---------------- O dinossauro --------------------------------------
     Corre atrás de quem está ficando para trás. Quando alcança, come:
     o kart some um pouquinho (os outros passam) e depois volta. */
  let dino = null;
  function updateDino(dt) {
    const D = dino;
    if (D.anim > 0) D.anim -= dt;
    const alive = racers.filter((r) => !r.finished && r.eatenT <= 0 && !(r === player && secret));
    const last = alive.length ? alive.reduce((a, b) => (b.z < a.z ? b : a)) : null;
    if (D.mode === "wait" || D.mode === "rest") {
      D.t -= dt;
      if (last) D.speed = clamp(last.speed * 0.9 + (last.z - (D.mode === "wait" ? 3500 : 5000) - D.z) * 0.02, 0, 120);
      if (D.t <= 0 && last) {
        D.mode = "chase";
        if (state === "race") {
          sfx.roar();
          if (last === player) msg("🦖 O DINOSSAURO VEM AÍ! CORRE!", "#ff5b4d", 90);
        }
      }
    } else if (D.mode === "chase") {
      if (!last) { D.mode = "rest"; D.t = 200; }
      else {
        D.target = last;
        const gap = last.z - D.z;
        D.speed = gap > 3500 ? last.speed * 1.3 + 10 : Math.max(last.speed + CC.dino, 25);
        D.x += (last.x - D.x) * Math.min(1, 0.04 * dt);
        if (gap < 200 && last.jumpH < 150) {
          if (last.starT > 0) {
            // com a estrela, o dinossauro é que foge!
            D.mode = "rest"; D.t = 300; D.z -= 2000;
            if (last.isPlayer && state === "race") msg("O dino fugiu da estrela! 🌟", "#ffe14d", 70);
          } else eatRacer(last);
        }
      }
    } else if (D.mode === "eat") {
      D.t -= dt;
      D.speed = 0;
      if (D.t <= 0) { D.mode = "rest"; D.t = 420; D.z -= 2500; }
    }
    D.z += D.speed * dt;
    D.step += D.speed * dt;
    // passos pesados quando ele vem atrás da Lara
    const g = player.z - D.z;
    if (state === "race" && D.mode === "chase" && D.target === player && g > 0 && g < 3500) {
      D.stepT -= dt;
      if (D.stepT <= 0) {
        D.stepT = 26;
        tone(65, 0.14, "sine", 0.3 * (1 - g / 3500));
        if (g < 1600) shake = Math.max(shake, 3);
      }
    }
  }
  function eatRacer(r) {
    dino.mode = "eat"; dino.t = 110; dino.anim = 40;
    r.eatenT = 110; r.speed = 0; r.item = null; r.roulT = 0; r.boostT = 0; r.driftT = 0; r.driftLvl = 0;
    if (state !== "race") return;
    sfx.chomp();
    if (r.isPlayer) { shake = 12; r.coins -= Math.min(r.coins, 2); }
    else msg("🦖 NHAC! Comeu " + (r.ch.fem ? "a " : "o ") + r.name + "!", "#ff9f43", 70);
  }

  function hit(o) {
    if (o.starT > 0) return;
    o.spinT = 70;
    o.speed *= 0.35;
    o.driftT = 0;
    o.driftLvl = 0;
    if (o.isPlayer && state === "race") {
      o.coins -= Math.min(o.coins, 2);
      shake = 10;
      sfx.hit();
      msg("Ops! 💫", "#fff", 60);
    }
  }

  /* ---------------- Atualização ------------------------------------- */
  let keyL = false, keyR = false;

  function aiSteer(k, dt) {
    k.laneT -= dt;
    if (k.laneT <= 0) { k.lane = Math.random() * 1.3 - 0.65; k.laneT = 90 + Math.random() * 200; }
    let goal = k.lane;
    const i0 = idxOf(k.z);
    if (!k.item && k.roulT <= 0) {
      for (let q = 2; q < 14; q++) {
        const s = segments[(i0 + q) % N];
        if (!s.boxes) continue;
        let bd = 9;
        for (const b of s.boxes) if (b.t <= 0 && Math.abs(b.off - k.x) < bd) { bd = Math.abs(b.off - k.x); goal = b.off; }
        break;
      }
    }
    for (const b of bananas) {
      const d = wrapS(b.z - k.z);
      if (d > 0 && d < 1100 && Math.abs(b.x - goal) < 0.36) goal = b.x > 0 ? b.x - 0.55 : b.x + 0.55;
    }
    for (let q = 1; q < 8; q++) {
      const sg = segments[(i0 + q) % N];
      if (sg.bombs) for (const b of sg.bombs) if (b.t <= 0 && Math.abs(b.off - goal) < 0.3) goal = b.off > 0 ? b.off - 0.5 : b.off + 0.5;
    }
    k.steerX = clamp(goal, -0.85, 0.85);
  }

  function physics(r, dt) {
    if (r.eatenT > 0) {
      // dentro da barriga do dinossauro: parado, e os outros passam
      r.eatenT -= dt;
      r.speed = 0;
      if (r.eatenT <= 0) {
        r.eatenT = 0;
        r.spinT = 30;
        r.x = clamp(r.x, -0.8, 0.8);
        if (r.isPlayer && state === "race") { msg("Ufa! Escapei! 😅", "#ffffff", 70); flash = 10; sfx.boost(); }
      }
      return;
    }
    const seg = segments[idxOf(r.z)];
    const control = r.isPlayer && state === "race";
    if (r.spinT <= 0) r.x += (r.steerX - r.x) * Math.min(1, (control ? 0.16 : 0.05) * dt) * (r.jumpH > 0 ? 0.5 : 1);
    if (control) r.x -= seg.curve * (r.speed / CC.top) * CC.push * dt * (r.jumpH > 0 ? 0.3 : 1);
    r.x = clamp(r.x, -1.6, 1.6);

    let top = CC.top * (r.isPlayer ? 1 + 0.01 * r.coins : r.skill);
    if (!r.isPlayer && state !== "menu") {
      // elástico: ninguém fica longe demais, a corrida fica sempre emocionante
      const gap = r.z - player.z;
      if (gap > 2500) top *= CC.id === "50" ? 0.8 : 0.9;
      else if (gap < -2500) top *= 1.12;
    }
    if (r.starT > 0) top *= 1.2;
    if (r.boostT > 0) top *= 1.42;
    if (r.smallT > 0) top *= 0.62;
    r.off = Math.abs(r.x) > 1.06 && r.jumpH <= 0;
    if (r.off && r.starT <= 0 && r.boostT <= 0) top *= 0.5;
    if (r.spinT > 0) top = 5;
    const a = r.speed < top ? (r.boostT > 0 ? 0.09 : 0.025) : 0.05;
    r.speed += (top - r.speed) * Math.min(1, a * dt);
    r.z += r.speed * dt;

    // rampa → pulo com manobra
    if (seg.ramp && r.jumpH <= 0 && Math.abs(r.x) < 1.05) {
      r.jumpV = 9 + r.speed * 0.12;
      r.jumpH = 0.1;
      r.trick = true;
      r.trickA = 0;
      if (r.isPlayer && state === "race") sfx.jump();
    }
    if (r.jumpH > 0) {
      r.jumpH += r.jumpV * dt;
      r.jumpV -= (T.th.grav || 0.55) * dt;
      r.trickA = Math.min(Math.PI * 2, r.trickA + 0.22 * dt);
      if (r.jumpH <= 0) {
        r.jumpH = 0;
        r.trickA = 0;
        if (r.trick) {
          r.trick = false;
          r.boostT = Math.max(r.boostT, 45);
          if (r.isPlayer && state === "race") { msg("MANOBRA! ✨", "#7fe7ff", 60); sfx.boost(); }
        }
      }
    }

    // mini-turbo automático: ficar numa curva forte carrega as faíscas
    const strong = Math.abs(seg.curve) > 1.5 && r.speed > CC.top * 0.6 && !r.off && r.jumpH <= 0 && r.spinT <= 0;
    if (strong) {
      r.driftT += dt;
      r.driftDir = Math.sign(seg.curve);
      const lvl = r.driftT > 210 ? 3 : r.driftT > 130 ? 2 : r.driftT > 55 ? 1 : 0;
      if (lvl > r.driftLvl && control) sfx.spark(lvl);
      r.driftLvl = lvl;
    } else if (r.driftT > 0) {
      if (r.driftLvl > 0 && !r.off && r.spinT <= 0) {
        r.boostT = Math.max(r.boostT, [0, 35, 60, 90][r.driftLvl]);
        if (control) {
          sfx.boost();
          msg(["", "Mini-turbo!", "Super turbo!", "ULTRA TURBO!"][r.driftLvl], DRIFT_COLORS[r.driftLvl], 50);
        }
      }
      r.driftT = 0;
      r.driftLvl = 0;
    }

    if (r.boostT > 0) r.boostT -= dt;
    if (r.starT > 0) r.starT -= dt;
    if (r.smallT > 0) r.smallT -= dt;
    if (r.spinT > 0) r.spinT -= dt;
    if (r.bumpT > 0) r.bumpT -= dt;
  }

  function pickups(r) {
    if (r.eatenT > 0) return;
    const i0 = idxOf(r.z);
    const me = r.isPlayer && state === "race";
    for (let q = 0; q < 2; q++) {
      const s = segments[(i0 + q) % N];
      if (r.isPlayer && s.coin && !s.coin.taken && Math.abs(s.coin.off - r.x) < 0.3 && (!s.coin.air || r.jumpH > 40)) {
        s.coin.taken = true;
        if (r.coins < 10) r.coins++;
        if (me) sfx.coin();
      }
      if (s.boxes && r.jumpH < 150) {
        for (const b of s.boxes) {
          if (b.t > 0 || Math.abs(b.off - r.x) > 0.24) continue;
          b.t = 200;
          if (!r.item && r.roulT <= 0) r.roulT = r.isPlayer ? 75 : 40;
          if (me) sfx.box();
        }
      }
      if (s.bombs && r.jumpH < 60) {
        for (const b of s.bombs) {
          if (b.t > 0 || Math.abs(b.off - r.x) > 0.22) continue;
          b.t = 360;
          b.boom = 40;
          blast(r);
        }
      }
      if (me && s.sign && s.signLap !== r.lap) {
        s.signLap = r.lap;
        sfx.chime();
        msg("✨ Siga as estrelinhas! ✨", "#ffe14d", 90);
      }
      if (me && s.secret && Math.abs(s.secret.x - r.x) < 0.42 && r.jumpH < 100) {
        startSecret(s.secret.kind);
        return;
      }
      if (s.boost && r.jumpH <= 0 && Math.abs(s.boost.off - r.x) < 0.3 && r.boostT < 30) {
        r.boostT = 80;
        if (me) { sfx.boost(); msg("TURBO! 🔥", "#ffb347", 40); }
      }
    }
  }

  function itemLogic(r, dt) {
    if (r.roulT > 0) {
      r.roulT -= dt;
      if (r.roulT <= 0) {
        const it = r.isPlayer ? rollItem(r.rank) : Math.random() < CC.aiUse ? CC.aiItems[Math.floor(Math.random() * CC.aiItems.length)] : null;
        if (it) {
          r.item = it === "mush3" ? "mush" : it;
          r.itemN = it === "mush3" ? 3 : 1;
          r.useT = 50 + Math.random() * 220;
          if (r.isPlayer && state === "race") sfx.get();
        }
      } else if (r.isPlayer && state === "race" && Math.floor(r.roulT / 5) !== Math.floor((r.roulT + dt) / 5)) {
        sfx.tick();
      }
      return;
    }
    if (r.item && !(r.isPlayer && state === "race")) {
      r.useT -= dt;
      if (r.useT <= 0) { useItem(r); r.useT = 25 + Math.random() * 40; }
    }
  }

  function updateBananas(dt) {
    for (const b of bananas) {
      b.age += dt;
      for (const o of racers) {
        if (o === b.owner && b.age < 40) continue;
        if ((o === player && secret) || o.eatenT > 0) continue;
        if (Math.abs(wrapS(o.z - b.z)) < 120 && Math.abs(o.x - b.x) < 0.24 && o.jumpH < 60) {
          hit(o);
          b.dead = true;
          break;
        }
      }
    }
    bananas = bananas.filter((b) => !b.dead);
  }

  function updateShells(dt) {
    for (const s of shells) {
      s.life -= dt;
      s.z += s.spd * dt;
      if (s.target) {
        const d = s.target.z - s.z;
        if (d < 2200) s.x += (s.target.x - s.x) * Math.min(1, 0.12 * dt);
        if (d < -300) s.target = null;
      }
      for (const o of racers) {
        if (o === s.owner && s.life > 290) continue;
        if ((o === player && secret) || o.eatenT > 0) continue;
        if (Math.abs(wrapS(o.z - s.z)) < 160 && Math.abs(o.x - s.x) < 0.28 && o.jumpH < 150) {
          hit(o);
          s.life = 0;
          break;
        }
      }
      for (const b of bananas) {
        if (s.life > 0 && Math.abs(wrapS(b.z - s.z)) < 120 && Math.abs(b.x - s.x) < 0.25) { b.dead = true; s.life = 0; }
      }
    }
    shells = shells.filter((s) => s.life > 0);
  }

  function bumps(dt) {
    const P = player;
    for (const k of karts) {
      if (secret) break;
      if (k.eatenT > 0 || P.eatenT > 0) continue;
      if (Math.abs(wrapS(k.z - P.z)) > 230 || Math.abs(k.x - P.x) > 0.3 || Math.abs(k.jumpH - P.jumpH) > 80) continue;
      if (P.starT > 0 && k.starT <= 0) { if (k.spinT <= 0) { hit(k); if (state === "race") sfx.bump(); } continue; }
      if (k.starT > 0 && P.starT <= 0) { if (P.spinT <= 0) hit(P); continue; }
      if (P.bumpT > 0) continue;
      const s = P.x < k.x ? -1 : 1;
      P.x += s * 0.13;
      k.x -= s * 0.13;
      k.lane = k.x;
      P.speed *= 0.94;
      k.speed *= 0.94;
      P.bumpT = 22;
      if (state === "race") { shake = Math.max(shake, 5); sfx.bump(); }
    }
    // rivais não ficam um em cima do outro
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j];
        if (Math.abs(wrapS(a.z - b.z)) < 200 && Math.abs(a.x - b.x) < 0.28) {
          const s = a.x < b.x ? -1 : 1;
          a.x += s * 0.012 * dt;
          b.x -= s * 0.012 * dt;
        }
      }
    }
  }

  function update(dt) {
    raceT += dt;
    const racing = state === "race";
    if (racing) {
      if (keyL) targetNX -= 0.04 * dt;
      if (keyR) targetNX += 0.04 * dt;
      targetNX = clamp(targetNX, -1.35, 1.35);
      player.steerX = targetNX;
    } else {
      aiSteer(player, dt);
    }
    for (const k of karts) aiSteer(k, dt);
    for (const r of racers) if (!(r === player && secret)) physics(r, dt);
    if (secret) updateSecret(dt);
    for (const r of racers) if (!(r === player && secret)) pickups(r);
    for (const r of racers) itemLogic(r, dt);
    updateBananas(dt);
    updateShells(dt);
    bumps(dt);
    for (const s of boxSegs) for (const b of s.boxes) if (b.t > 0) b.t -= dt;
    for (const s of bombSegs) for (const b of s.bombs) { if (b.t > 0) b.t -= dt; if (b.boom > 0) b.boom -= dt; }
    if (dino && (state === "race" || state === "finish")) updateDino(dt);

    // voltas e chegada
    for (const r of racers) {
      const dist = r.z - lineZ;
      const lap = Math.max(1, Math.floor(dist / trackLen) + 1);
      if (lap > r.lap) {
        r.lap = lap;
        if (r.isPlayer && racing && lap <= LAPS) onPlayerLap(lap);
      }
      if (!r.finished && dist >= LAPS * trackLen && state !== "menu") {
        r.finished = true;
        r.place = ++finishCount;
        if (r.isPlayer && racing) playerFinished();
      }
    }
    const order = finalOrder();
    order.forEach((r, i) => (r.rank = i + 1));
    if (racing) {
      if (player.rank < lastRank) { sfx.pass(); posPop = 18; }
      lastRank = player.rank;
    }

    if (state === "finish") {
      finishT -= dt;
      if (finishT <= 0) afterRace();
    }

    hillOff -= segments[idxOf(player.z)].curve * player.speed * 0.0025 * dt;
    if (racing || state === "finish") engineSet(player.speed, state === "race" ? 0.03 : 0.015);
  }

  function finalOrder() {
    return racers.slice().sort((a, b) =>
      a.finished && b.finished ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : b.z - a.z);
  }

  function onPlayerLap(lap) {
    for (const s of segments) if (s.coin) s.coin.taken = false; // moedas voltam
    if (lap === LAPS) {
      msg("ÚLTIMA VOLTA!", "#ffd23f", 110);
      sfx.last();
      music.tempo = 1.18;
    } else {
      msg("VOLTA " + lap + "!", "#ffffff", 70);
      sfx.lap();
    }
  }

  function updateCount(dt) {
    const before = Math.ceil(countT);
    countT -= dt / 60;
    const after = Math.ceil(countT);
    if (after < before && after > 0) sfx.count(false);
    if (countT <= 0) {
      state = "race";
      sfx.count(true);
      msg("VAI!", "#ffffff", 50);
      if (rocketOK) {
        player.boostT = 70;
        msg("LARGADA TURBO! 🚀", "#ffd23f", 80);
        sfx.boost();
      }
      for (const k of karts) if (Math.random() < 0.4) k.boostT = 30 + Math.random() * 30;
      musicPlay(T.song, 1);
      engineOn();
    }
  }

  /* ---------------- Efeitos (partículas, confete) ------------------- */
  function addP(x, y, vx, vy, life, c, s) {
    if (particles.length < 240) particles.push({ x, y, vx, vy, life, max: life, c, s });
  }
  function spawnConfetti(n) {
    const cols = ["#ff5d8f", "#ffd23f", "#4db5ff", "#5cd97a", "#a66cff", "#ff9f43"];
    for (let i = 0; i < n; i++) {
      confetti.push({ x: Math.random() * W, y: -Math.random() * H, vy: 1.5 + Math.random() * 2.5, ph: Math.random() * 9, s: 5 + Math.random() * 7, c: cols[i % cols.length] });
    }
  }

  function updateFx(dt) {
    if (state !== "pause" && player && !secret) {
      const pw = (FOCAL / CAM_DIST) * KW;
      const lift = pw * 0.62 * (player.jumpH / 100);
      const show = state !== "count";
      if (show && player.driftLvl > 0) {
        for (const sd of [-1, 1]) {
          addP(W / 2 + sd * pw * 0.48, PLAYER_Y - lift - 2, sd * (1 + Math.random() * 2.5), -1 - Math.random() * 3, 18, DRIFT_COLORS[player.driftLvl], 2 + Math.random() * 3);
        }
      }
      if (show && player.off && player.speed > 10 && Math.random() < 0.7) {
        addP(W / 2 + (Math.random() - 0.5) * pw, PLAYER_Y, (Math.random() - 0.5) * 2, -1 - Math.random() * 2, 30, T.th.dust, 5 + Math.random() * 7);
      }
      if (show && player.starT > 0 && Math.random() < 0.5) {
        addP(W / 2 + (Math.random() - 0.5) * pw * 1.4, PLAYER_Y - lift - Math.random() * pw * 0.8, 0, -1.5, 25,
          "hsl(" + Math.floor(Math.random() * 360) + ",95%,70%)", 3 + Math.random() * 3);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.12 * dt;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (msgT > 0) msgT -= dt;
      if (shake > 0) shake -= dt;
      if (flash > 0) flash -= dt;
      if (posPop > 0) posPop -= dt;
      for (const c of clouds) {
        c.x += 0.0002 * c.s * dt;
        if (c.x > 1.15) c.x = -0.15;
      }
    }
    for (const f of confetti) {
      f.y += f.vy * dt;
      f.x += Math.sin(nowMs * 0.003 + f.ph) * 1.2;
      if (f.y > H + 20) { f.y = -20; f.x = Math.random() * W; }
    }
  }

  /* ---------------- Desenho ----------------------------------------- */
  const rows = [];
  for (let i = 0; i <= DRAW + 1; i++) rows.push({ z: 0, si: 0, wx: 0, wy: 0, F: 0, x: 0, y: 0, w: 0, clip: 0 });
  const buckets = [];
  for (let i = 0; i <= DRAW + 1; i++) buckets.push([]);
  const tmpRow = { x: 0, y: 0, w: 0 };
  let camX = 0, camY = 0, camZ = 0, frac = 0;

  function draw() {
    if (secret) { drawSecret(); drawHUD(); return; }
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    drawBackground();
    if (!player) { ctx.restore(); return; }

    camZ = player.z - CAM_DIST;
    camY = elevAt(player.z);
    const base = Math.floor(camZ / SEG_L);
    frac = camZ / SEG_L - base;

    // posição de cada "fatia" da pista no mundo
    let wx = 0, dx = -segments[((base % N) + N) % N].curve * frac * CURVE_K;
    for (let j = 0; j <= DRAW + 1; j++) {
      const r = rows[j];
      r.z = (j - frac) * SEG_L;
      r.si = (((base + j) % N) + N) % N;
      r.wx = wx;
      r.wy = segments[r.si].y;
      wx += dx;
      dx += segments[r.si].curve * CURVE_K;
    }
    // a câmera fica centrada no kart da jogadora
    const pj = CAM_DIST / SEG_L + frac, pi = Math.floor(pj), pt = pj - pi;
    camX = rows[pi].wx + (rows[pi + 1].wx - rows[pi].wx) * pt + player.x * ROAD_W;
    for (let j = 0; j <= DRAW + 1; j++) {
      const r = rows[j];
      r.F = FOCAL / Math.max(r.z, 30);
      r.x = W / 2 + r.F * (r.wx - camX);
      r.y = HOR + r.F * (CAM_H + camY - r.wy);
      r.w = r.F * ROAD_W;
    }

    // pista: de perto pra longe, escondendo o que fica atrás dos morros
    let maxY = H + 10;
    rows[0].clip = maxY;
    for (let j = 1; j <= DRAW + 1; j++) {
      const n0 = rows[j - 1], f = rows[j];
      f.clip = maxY;
      if (j > DRAW || f.y >= maxY || f.y >= n0.y) continue;
      let n = n0;
      if (n0.y > maxY) {
        const t = (n0.y - maxY) / (n0.y - f.y);
        tmpRow.x = n0.x + (f.x - n0.x) * t;
        tmpRow.w = n0.w + (f.w - n0.w) * t;
        tmpRow.y = maxY;
        n = tmpRow;
      }
      drawSegment(n, f, n0.si);
      maxY = f.y;
    }

    // objetos que se mexem (karts, bananas, conchas)
    for (const b of buckets) b.length = 0;
    const addObj = (rel, kind, ref, nx) => {
      if (rel < 60 || rel >= (DRAW - 1) * SEG_L) return;
      const s = rel / SEG_L + frac, j = Math.floor(s), t = s - j;
      const a = rows[j], b = rows[j + 1];
      const F = FOCAL / rel;
      buckets[j].push({
        d: rel, kind, ref, F,
        x: W / 2 + F * (a.wx + (b.wx - a.wx) * t + nx * ROAD_W - camX),
        y: HOR + F * (CAM_H + camY - (a.wy + (b.wy - a.wy) * t)),
        clip: ref === player ? H + 10 : b.clip,
      });
    };
    for (const r of racers) if (r.eatenT <= 0) addObj(r === player ? CAM_DIST : CAM_DIST + wrapS(r.z - player.z), "kart", r, r.x);
    if (dino) addObj(CAM_DIST + wrapS(dino.z - player.z), "dino", dino, dino.x);
    for (const b of bananas) addObj(CAM_DIST + wrapS(b.z - player.z), "banana", b, b.x);
    for (const s of shells) addObj(CAM_DIST + wrapS(s.z - player.z), "shell", s, s.x);

    // enfeites e objetos: de longe pra perto
    for (let j = DRAW; j >= 1; j--) {
      const r = rows[j];
      if (r.z > 60) drawRow(r, rows[j + 1]);
      const bk = buckets[j - 1];
      if (bk.length) {
        if (bk.length > 1) bk.sort((a, b) => b.d - a.d);
        for (const o of bk) drawObj(o);
      }
    }

    // partículas
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawSpeedLines();
    drawHUD();
    if (flash > 0) {
      ctx.fillStyle = "rgba(255,255,230," + clamp(flash / 16, 0, 1) * 0.8 + ")";
      ctx.fillRect(0, 0, W, H);
    }
    for (const f of confetti) {
      ctx.fillStyle = f.c;
      ctx.fillRect(f.x, f.y, f.s, f.s * 0.6);
    }
  }

  function quad(x1, y1, x2, y2, x3, y3, x4, y4) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }
  // trapézio na pista entre duas fatias, de a até b (fração da meia-largura)
  function roadQuad(n, f, a, b) {
    quad(n.x + n.w * a, n.y + 1, n.x + n.w * b, n.y + 1, f.x + f.w * b, f.y, f.x + f.w * a, f.y);
  }

  function drawSegment(n, f, si) {
    const th = T.th;
    const alt = Math.floor(si / 3) % 2 === 0;
    ctx.fillStyle = th.grass[alt ? 0 : 1];
    ctx.fillRect(0, f.y, W, n.y - f.y + 1);
    ctx.fillStyle = th.rumble[alt ? 0 : 1];
    roadQuad(n, f, -1.15, -0.97);
    roadQuad(n, f, 0.97, 1.15);
    if (th.rainbow) ctx.fillStyle = "hsl(" + ((si * 6) % 360) + ",85%," + (alt ? 62 : 56) + "%)";
    else ctx.fillStyle = th.road[alt ? 0 : 1];
    roadQuad(n, f, -1, 1);
    if (si === START || si === START + 1) {
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = (k + si) % 2 ? "#151515" : "#f5f5f5";
        roadQuad(n, f, -1 + k * 0.25, -1 + (k + 1) * 0.25);
      }
    } else if (alt) {
      ctx.fillStyle = th.rainbow ? "rgba(255,255,255,0.75)" : th.lane;
      roadQuad(n, f, -0.35, -0.33);
      roadQuad(n, f, 0.33, 0.35);
    }
  }

  function withClip(clip, yb, fn) {
    if (yb <= clip + 1) { fn(); return; }
    if (clip <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, clip);
    ctx.clip();
    fn();
    ctx.restore();
  }

  function drawRow(r, next) {
    const seg = segments[r.si];
    withClip(r.clip, r.y, () => {
      if (seg.ramp) drawRamp(r, next);
      if (seg.boost) drawBoostPad(r, seg.boost.off);
      if (r.si === START) drawFinishBanner(r);
      if (seg.bombs) {
        for (const b of seg.bombs) {
          const bx = r.x + r.F * b.off * ROAD_W, bs = r.F * 0.17 * ROAD_W;
          if (b.t <= 0) drawBomb(bx, r.y, bs);
          else if (b.boom > 0) drawEmo("💥", bx, r.y, bs * (1.6 + (40 - b.boom) * 0.06));
        }
      }
      if (seg.hint) {
        const sz = r.F * 0.12 * ROAD_W;
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(nowMs * 0.01 + r.si);
        ctx.fillStyle = "hsl(" + Math.floor((nowMs * 0.3 + r.si * 30) % 360) + ",100%,75%)";
        sparkle(r.x + r.F * seg.hint * ROAD_W, r.y - sz, sz, nowMs * 0.004 + r.si);
        ctx.globalAlpha = 1;
      }
      if (seg.sign) drawSign(r, seg.sign);
      if (seg.secret) drawEntrance(r, seg.secret);
      for (const sp of seg.sprites) drawEmo(sp.e, r.x + r.F * sp.off * ROAD_W, r.y, r.F * sp.s * ROAD_W);
      if (seg.coin && !seg.coin.taken) {
        const lift = seg.coin.air ? 0.45 * ROAD_W : 0.06 * ROAD_W;
        drawCoin(r.x + r.F * seg.coin.off * ROAD_W, r.y - r.F * lift, r.F * 0.17 * ROAD_W, r.si);
      }
      if (seg.boxes) {
        for (const b of seg.boxes) if (b.t <= 0) drawBox(r.x + r.F * b.off * ROAD_W, r.y, r.F * 0.22 * ROAD_W, b.off * 3 + r.si);
      }
    });
  }

  function drawObj(o) {
    withClip(o.clip, o.y, () => {
      if (o.kind === "kart") {
        const w = o.F * KW;
        drawKart(o.x, o.y, w, o.ref, w * 0.62 * (o.ref.jumpH / 100));
      } else if (o.kind === "dino") {
        const D = o.ref, sz = Math.min(o.F * 1.35 * KW, H * 0.7);
        const bob = Math.abs(Math.sin(D.step * 0.004)) * sz * 0.06;
        shadow(o.x, o.y, sz * 0.38);
        ctx.save();
        ctx.translate(o.x, o.y - bob);
        if (D.anim > 0) ctx.scale(1 + Math.sin(D.anim * 0.5) * 0.08, 1 - Math.sin(D.anim * 0.5) * 0.08);
        ctx.drawImage(emo("🦖", sz), -sz / 2, -sz, sz, sz);
        ctx.restore();
        if (D.anim > 0) drawEmo("💥", o.x - sz * 0.25, o.y - sz * 0.6, sz * 0.35);
      } else if (o.kind === "banana") {
        const s = o.F * 0.2 * ROAD_W;
        shadow(o.x, o.y, s * 0.4);
        drawEmo("🍌", o.x, o.y + s * 0.05, s);
      } else {
        const s = o.F * 0.2 * ROAD_W;
        shadow(o.x, o.y, s * 0.4);
        ctx.save();
        ctx.translate(o.x, o.y - s * 0.55);
        ctx.rotate(nowMs * 0.02);
        ctx.drawImage(emo("🐚", s), -s / 2, -s / 2, s, s);
        ctx.restore();
      }
    });
  }

  function shadow(x, y, rx) {
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.25, 0, 0, 7);
    ctx.fill();
  }
  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 7);
    ctx.fill();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawRamp(n, f) {
    const lift = f.F * 0.28 * ROAD_W;
    for (let k = 0; k < 6; k++) {
      const a = -1 + k / 3, b = a + 1 / 3;
      ctx.fillStyle = k % 2 ? "#ffd23f" : "#ff6fb1";
      quad(n.x + n.w * a, n.y, n.x + n.w * b, n.y, f.x + f.w * b, f.y - lift, f.x + f.w * a, f.y - lift);
    }
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const cx = (n.x + f.x) / 2, w = n.w * 0.12, top = f.y - lift, bot = n.y;
    quad(cx - w, bot - (bot - top) * 0.25, cx, top + (bot - top) * 0.15, cx + w, bot - (bot - top) * 0.25, cx, bot - (bot - top) * 0.45);
  }

  function drawBoostPad(r, off) {
    const cx = r.x + r.F * off * ROAD_W, cw = r.w * 0.26;
    const glow = Math.floor(nowMs / 110) % 3;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === glow ? "#fff27a" : i % 2 ? "#ff8c00" : "#ffc400";
      const yy = r.y - r.F * (40 + i * 130), hh = r.F * 110;
      quad(cx - cw, yy, cx, yy - hh, cx + cw, yy, cx, yy - hh * 0.45);
    }
  }

  function drawFinishBanner(r) {
    const poleH = r.F * 0.9 * ROAD_W, bw = r.F * 0.07 * ROAD_W;
    ctx.fillStyle = "#e9eef2";
    ctx.fillRect(r.x - r.w * 1.15 - bw, r.y - poleH, bw, poleH);
    ctx.fillRect(r.x + r.w * 1.15, r.y - poleH, bw, poleH);
    const bh = r.F * 0.2 * ROAD_W, by = r.y - poleH;
    const left = r.x - r.w * 1.15 - bw, total = 2 * (r.w * 1.15 + bw), cols = 12, cw = total / cols;
    for (let i = 0; i < cols; i++) {
      for (let jj = 0; jj < 2; jj++) {
        ctx.fillStyle = (i + jj) % 2 ? "#151515" : "#ffffff";
        ctx.fillRect(left + i * cw, by + (jj * bh) / 2, cw + 0.5, bh / 2);
      }
    }
    const bs = r.F * 0.35 * ROAD_W;
    drawEmo("🎈", left + bw / 2, by + bh * 0.2, bs);
    drawEmo("🎈", left + total - bw / 2, by + bh * 0.2, bs);
  }

  function drawCoin(x, y, s, ph) {
    if (s < 2) return;
    const sx = Math.max(0.18, Math.abs(Math.cos(nowMs * 0.005 + ph)));
    ctx.fillStyle = "#d99a00";
    ctx.beginPath(); ctx.ellipse(x, y - s / 2, (s / 2) * sx, s / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffd94a";
    ctx.beginPath(); ctx.ellipse(x, y - s / 2, (s / 2) * sx * 0.72, (s / 2) * 0.72, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff6c4";
    ctx.fillRect(x - s * 0.05 * sx, y - s * 0.78, s * 0.1 * sx, s * 0.56);
  }

  function drawBox(x, y, s, ph) {
    if (s < 3) return;
    const bob = Math.sin(nowMs * 0.004 + ph) * s * 0.08;
    shadow(x, y, s * 0.4);
    ctx.save();
    ctx.translate(x, y - s * 0.8 + bob);
    ctx.rotate(Math.sin(nowMs * 0.002 + ph) * 0.35);
    ctx.fillStyle = "hsla(" + Math.floor((nowMs * 0.15 + ph * 40) % 360) + ",95%,65%,0.88)";
    roundRect(-s / 2, -s / 2, s, s, s * 0.2);
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold " + Math.round(s * 0.7) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, s * 0.05);
    ctx.restore();
  }

  function drawBomb(x, y, s) {
    if (s < 3) return;
    shadow(x, y, s * 0.4);
    const cy = y - s * 0.5;
    ctx.fillStyle = "#2b2b3a";
    circle(x, cy, s * 0.5);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    circle(x - s * 0.17, cy - s * 0.17, s * 0.12);
    ctx.fillStyle = "#777788";
    ctx.fillRect(x - s * 0.12, cy - s * 0.62, s * 0.24, s * 0.16);
    ctx.strokeStyle = "#c9a86a";
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, cy - s * 0.6);
    ctx.quadraticCurveTo(x + s * 0.1, cy - s * 0.9, x + s * 0.3, cy - s * 0.85);
    ctx.stroke();
    ctx.fillStyle = Math.floor(nowMs / 90) % 2 ? "#ffe14d" : "#ff6a00";
    sparkle(x + s * 0.3, cy - s * 0.85, s * (0.16 + Math.random() * 0.08), nowMs * 0.02);
    if (Math.floor(nowMs / 400) % 2) { ctx.fillStyle = "#ff3b3b"; circle(x + s * 0.18, cy + s * 0.1, s * 0.07); }
  }

  // cabecinha vista de costas (a gente vê os karts por trás!)
  function drawDriverBack(r, w, h) {
    const b = r.ch.back, R = w * 0.25, hy = -h * 1.18;
    ctx.fillStyle = r.dark;
    roundRect(-w * 0.24, -h * 1.0, w * 0.48, h * 0.4, w * 0.12);
    ctx.fill();
    const tri = (sd, col, k) => {
      ctx.fillStyle = col;
      quad(sd * R * 0.2 * k + sd * R * 0.15, hy - R * 0.8, sd * R * 0.98, hy - R * 0.25, sd * R * 0.82, hy - R * (0.6 + 0.75 * k), sd * R * 0.82, hy - R * (0.6 + 0.75 * k));
    };
    if (b.type === "cat" || b.type === "fox") {
      for (const sd of [-1, 1]) {
        tri(sd, b.c, 1);
        ctx.fillStyle = b.in;
        quad(sd * R * 0.5, hy - R * 0.8, sd * R * 0.82, hy - R * 0.55, sd * R * 0.8, hy - R * 1.25, sd * R * 0.8, hy - R * 1.25);
      }
    } else if (b.type === "bunny") {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = b.c;
        ctx.beginPath(); ctx.ellipse(sd * R * 0.42, hy - R * 1.35, R * 0.26, R * 0.75, sd * 0.15, 0, 7); ctx.fill();
        ctx.fillStyle = b.in;
        ctx.beginPath(); ctx.ellipse(sd * R * 0.42, hy - R * 1.35, R * 0.13, R * 0.55, sd * 0.15, 0, 7); ctx.fill();
      }
    } else if (b.type === "round") {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = b.ear;
        circle(sd * R * 0.75, hy - R * 0.72, R * 0.36);
        if (b.in) { ctx.fillStyle = b.in; circle(sd * R * 0.75, hy - R * 0.72, R * 0.18); }
      }
    } else if (b.type === "frog") {
      ctx.fillStyle = b.c;
      for (const sd of [-1, 1]) circle(sd * R * 0.5, hy - R * 0.78, R * 0.4);
    } else if (b.type === "unicorn") {
      ctx.fillStyle = "#ffd23f";
      quad(-R * 0.16, hy - R * 0.8, R * 0.16, hy - R * 0.8, 0, hy - R * 1.65, 0, hy - R * 1.65);
      for (const sd of [-1, 1]) tri(sd, b.c, 0.6);
    }
    // cabeça
    ctx.fillStyle = b.c;
    circle(0, hy, b.type === "turtle" ? R * 0.85 : R);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.ellipse(-R * 0.35, hy - R * 0.4, R * 0.25, R * 0.15, -0.5, 0, 7); ctx.fill();
    if (b.type === "girl") {
      // maria-chiquinha com lacinhos
      for (const sd of [-1, 1]) {
        ctx.fillStyle = b.c;
        circle(sd * R * 1.05, hy + R * 0.2, R * 0.42);
        ctx.fillStyle = "#ff5d8f";
        circle(sd * R * 0.78, hy - R * 0.05, R * 0.17);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = Math.max(1, R * 0.06);
      ctx.beginPath(); ctx.moveTo(0, hy - R); ctx.lineTo(0, hy + R * 0.3); ctx.stroke();
    } else if (b.type === "dog") {
      ctx.fillStyle = b.ear;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * R * 0.92, hy + R * 0.1, R * 0.28, R * 0.6, -sd * 0.3, 0, 7); ctx.fill(); }
    } else if (b.type === "unicorn") {
      ["#ff9be0", "#a66cff", "#4db5ff"].forEach((c, k) => {
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.ellipse((k - 1) * R * 0.22, hy + R * 0.05, R * 0.2, R * 0.85, 0, 0, 7); ctx.fill();
      });
    } else if (b.type === "turtle") {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      circle(0, hy + R * 0.2, R * 0.5);
    }
  }

  function flame(cx, cy, len, wid) {
    ctx.beginPath();
    ctx.moveTo(cx - wid, cy);
    ctx.quadraticCurveTo(cx, cy + len * 1.3, cx + wid, cy);
    ctx.closePath();
    ctx.fill();
  }

  function drawKart(x, y, w, r, lift, front) {
    if (w < 3) return;
    if (r.smallT > 0) w *= 0.55;
    const h = w * 0.62;
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.56 * (lift > 0 ? 0.75 : 1), w * 0.11, 0, 0, 7);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y - lift);
    let rot = 0;
    if (r.spinT > 0) rot = r.spinT * 0.3;
    else if (r.driftT > 25) rot = r.driftDir * 0.09 + Math.sin(nowMs * 0.04) * 0.015;
    else if (r.isPlayer) rot = clamp((r.steerX - r.x) * 0.3, -0.14, 0.14);
    if (r.jumpH > 0) rot += r.trickA;
    ctx.rotate(rot);
    const star = r.starT > 0;
    const body = star ? "hsl(" + Math.floor((nowMs * 0.5) % 360) + ",95%,62%)" : r.body;
    const dark = star ? "hsl(" + Math.floor((nowMs * 0.5 + 50) % 360) + ",90%,45%)" : r.dark;

    // antena com bandeirinha
    ctx.strokeStyle = "#333";
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.beginPath();
    ctx.moveTo(w * 0.3, -h * 0.75);
    ctx.lineTo(w * 0.36, -h * 1.55);
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(w * 0.36, -h * 1.55);
    ctx.lineTo(w * 0.58, -h * (1.46 + Math.sin(nowMs * 0.015 + r.z * 0.001) * 0.04));
    ctx.lineTo(w * 0.36, -h * 1.33);
    ctx.closePath();
    ctx.fill();

    // piloto (o corpo do kart cobre a parte de baixo: parece sentado)
    if (front) drawEmo(r.e, 0, -h * 0.64, w * 0.62); // virado para a câmera (festa)
    else drawDriverBack(r, w, h);

    // pneus traseiros
    ctx.fillStyle = "#24242a";
    roundRect(-w * 0.6, -h * 0.5, w * 0.24, h * 0.52, w * 0.07); ctx.fill();
    roundRect(w * 0.36, -h * 0.5, w * 0.24, h * 0.52, w * 0.07); ctx.fill();
    ctx.fillStyle = "#3d3d46";
    const tp = (r.z * 0.004) % 1;
    for (let i = 0; i < 3; i++) {
      const yy = -h * 0.47 + h * 0.42 * ((i / 3 + tp / 3) % 1);
      ctx.fillRect(-w * 0.57, yy, w * 0.18, h * 0.05);
      ctx.fillRect(w * 0.39, yy, w * 0.18, h * 0.05);
    }
    // corpo
    ctx.fillStyle = body;
    roundRect(-w * 0.42, -h * 0.82, w * 0.84, h * 0.62, w * 0.14); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    roundRect(-w * 0.34, -h * 0.78, w * 0.68, h * 0.13, w * 0.06); ctx.fill();
    // para-choque e escapamentos
    ctx.fillStyle = dark;
    roundRect(-w * 0.4, -h * 0.34, w * 0.8, h * 0.2, w * 0.07); ctx.fill();
    ctx.fillStyle = "#a3a9b1";
    circle(-w * 0.2, -h * 0.17, w * 0.06);
    circle(w * 0.2, -h * 0.17, w * 0.06);
    ctx.fillStyle = "#2a2a2a";
    circle(-w * 0.2, -h * 0.17, w * 0.035);
    circle(w * 0.2, -h * 0.17, w * 0.035);
    // emblema
    ctx.fillStyle = "#ffffff";
    circle(0, -h * 0.55, w * 0.1);
    drawEmo(r.e, 0, -h * 0.43, w * 0.15);

    // fogo do turbo
    if (r.boostT > 0) {
      for (const sd of [-1, 1]) {
        const len = h * (0.35 + Math.random() * 0.3);
        ctx.fillStyle = "#ff6a00";
        flame(sd * w * 0.2, -h * 0.14, len, w * 0.08);
        ctx.fillStyle = "#ffe14d";
        flame(sd * w * 0.2, -h * 0.14, len * 0.6, w * 0.045);
      }
    }
    // faíscas do mini-turbo
    if (r.driftLvl > 0) {
      ctx.fillStyle = DRIFT_COLORS[r.driftLvl];
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 3; i++) circle(sd * w * (0.44 + Math.random() * 0.14), -Math.random() * h * 0.18, w * (0.025 + Math.random() * 0.03));
      }
    }
    ctx.restore();

    if (r.spinT > 0) drawEmo("💫", x, y - lift - h * 1.3, w * 0.42);
    if (star) {
      const k = (nowMs % 500) / 500;
      drawEmo("✨", x - w * 0.62, y - lift - h * (0.6 + k * 0.6), w * 0.3);
      drawEmo("✨", x + w * 0.62, y - lift - h * (1.2 - k * 0.6), w * 0.3);
    }
  }

  function hillLayer(color, wl, amp, par, peaks) {
    const off = (((hillOff * par) % wl) + wl) % wl;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-2 * wl + off, HOR + 2);
    for (let x = -2 * wl + off; x < W + wl; x += wl) {
      if (peaks) { ctx.lineTo(x + wl * 0.5, HOR - amp * 2); ctx.lineTo(x + wl, HOR + 2); }
      else ctx.quadraticCurveTo(x + wl / 2, HOR - amp * 2, x + wl, HOR + 2);
    }
    ctx.lineTo(W + 60, HOR + 40);
    ctx.lineTo(-60, HOR + 40);
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground() {
    const th = T.th;
    const sky = ctx.createLinearGradient(0, 0, 0, HOR);
    sky.addColorStop(0, th.sky[0]);
    sky.addColorStop(1, th.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, HOR + 22);
    const u = Math.min(W, H);
    if (th.stars) {
      ctx.fillStyle = "#ffffff";
      for (const s of stars) {
        ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(nowMs * 0.002 + s.ph));
        ctx.fillRect(s.x * W, s.y * HOR, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    }
    if (th.sun) {
      ctx.fillStyle = "rgba(255,255,220,0.35)";
      circle(W * 0.8, HOR * 0.3, u * 0.11);
      ctx.fillStyle = th.sun;
      circle(W * 0.8, HOR * 0.3, u * 0.07);
    }
    if (th.moon) {
      drawEmo("🌙", W * 0.8, HOR * 0.42, u * 0.16);
      drawEmo("🪐", W * 0.2, HOR * 0.38, u * 0.12);
    }
    if (th.planet) drawPlanet(th.planet, W * 0.24, HOR * 0.42, u * (th.planetR || 0.12));
    if (th.cloud) {
      ctx.fillStyle = th.cloud;
      ctx.globalAlpha = 0.9;
      for (const c of clouds) {
        const s = c.s * u * 0.045, x = c.x * W, y = c.y * HOR;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, 7);
        ctx.arc(x + s * 1.1, y + s * 0.25, s * 0.8, 0, 7);
        ctx.arc(x - s * 1.1, y + s * 0.25, s * 0.8, 0, 7);
        ctx.arc(x, y + s * 0.5, s * 0.9, 0, 7);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    hillLayer(th.far, Math.max(W * 0.55, 180), H * 0.05, 0.2, th.peaks);
    if (th.volcano) {
      const vx = W * 0.7, vw = W * 0.2, vh = H * 0.13;
      ctx.fillStyle = "#6b4a3a";
      quad(vx - vw, HOR + 2, vx - vw * 0.22, HOR - vh, vx + vw * 0.22, HOR - vh, vx + vw, HOR + 2);
      ctx.fillStyle = "#ff6a00";
      quad(vx - vw * 0.22, HOR - vh, vx + vw * 0.22, HOR - vh, vx + vw * 0.12, HOR - vh * 0.82, vx - vw * 0.12, HOR - vh * 0.82);
      ctx.fillStyle = "rgba(120,120,130,0.5)";
      for (let i = 0; i < 4; i++) {
        const k = ((nowMs * 0.00015 + i / 4) % 1);
        const ps = Math.min(vw, H * 0.5);
        puff(vx + Math.sin(k * 6 + i) * ps * 0.2, HOR - vh - k * H * 0.2, ps * (0.06 + k * 0.08));
      }
    }
    if (th.sea) {
      ctx.fillStyle = th.sea;
      ctx.fillRect(-20, HOR - H * 0.03, W + 40, H * 0.03 + 3);
    }
    hillLayer(th.near, Math.max(W * 0.38, 140), H * (th.sea ? 0.02 : 0.07), 0.45, th.peaks);
    ctx.fillStyle = th.grass[0];
    ctx.fillRect(-20, HOR, W + 40, H - HOR + 20);
  }

  function drawSpeedLines() {
    if (!player || state !== "race" || (player.boostT <= 0 && player.starT <= 0)) return;
    const u = Math.min(W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r1 = u * (0.45 + Math.random() * 0.2), r2 = r1 + u * (0.1 + Math.random() * 0.25);
      ctx.lineWidth = 2 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(W / 2 + Math.cos(a) * r1, H * 0.5 + Math.sin(a) * r1);
      ctx.lineTo(W / 2 + Math.cos(a) * r2, H * 0.5 + Math.sin(a) * r2);
      ctx.stroke();
    }
  }

  /* ---------------- Placar na tela (HUD) ---------------------------- */
  function outlined(text, x, y, size, fill, stroke, align) {
    ctx.font = "bold " + Math.round(size) + "px " + FONT;
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = stroke || "rgba(0,0,0,0.55)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill || "#fff";
    ctx.fillText(text, x, y);
  }
  function pill(x, y, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    roundRect(x, y, w, h, h / 2);
    ctx.fill();
  }

  function drawHUD() {
    if (!(state === "race" || state === "count" || state === "finish" || state === "pause")) return;
    const u = Math.min(W, H), fs = clamp(u * 0.05, 15, 28);
    // volta
    const lapTxt = "VOLTA " + Math.min(player.lap, LAPS) + "/" + LAPS;
    ctx.font = "bold " + Math.round(fs) + "px " + FONT;
    const lw = ctx.measureText(lapTxt).width + fs * 1.3;
    pill(12, 12, lw, fs * 1.7);
    outlined(lapTxt, 12 + lw / 2, 12 + fs * 0.88, fs);
    // moedas
    const cy = 12 + fs * 2.1;
    pill(12, cy, fs * 4.2, fs * 1.7);
    drawCoin(12 + fs * 1.0, cy + fs * 1.4, fs * 1.15, 0);
    outlined("x " + player.coins, 12 + fs * 1.8, cy + fs * 0.88, fs, player.coins >= 10 ? "#ffd23f" : "#fff", null, "left");

    // fila de posições com as carinhas
    const order = racers.slice().sort((a, b) => a.rank - b.rank);
    const btn = clamp(u * 0.24, 84, 124), yStart = cy + fs * 2.3;
    const sp = clamp(Math.min(H * 0.058, (H - btn - 40 - yStart) / NR), 16, 46), rr = sp * 0.42, x0 = 12 + rr;
    let y0 = yStart + rr;
    for (const r of order) {
      const me = r === player;
      ctx.fillStyle = me ? "#ffe14d" : "rgba(255,255,255,0.85)";
      circle(x0, y0, me ? rr * 1.15 : rr);
      ctx.fillStyle = r.body;
      circle(x0, y0, (me ? rr * 1.15 : rr) * 0.8);
      drawEmo(r.e, x0, y0 + rr * 0.75, rr * 1.5);
      y0 += sp;
    }

    // posição grande
    if (state !== "count") {
      const p = player.rank, size = u * 0.15 * (1 + Math.max(0, posPop) * 0.02);
      const col = p === 1 ? "#ffd23f" : p === 2 ? "#e4ebf2" : p === 3 ? "#f0a35e" : "#8fd3ff";
      outlined(p + "º", W - 16, H - size * 0.62 - 10, size, col, "#2b1d4a", "right");
    }

    // contagem regressiva com semáforo
    if (state === "count") {
      const n = Math.ceil(countT);
      const lw2 = u * 0.36, lh = lw2 * 0.36, lx = W / 2 - lw2 / 2, ly = H * 0.12;
      ctx.fillStyle = "#2b2b3a";
      roundRect(lx, ly, lw2, lh, lh * 0.3);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const on = 3 - n >= i;
        ctx.fillStyle = on ? "#ff3b3b" : "#55556a";
        circle(lx + lw2 * (0.2 + i * 0.3), ly + lh / 2, lh * 0.33);
      }
      const p = 1 + (countT % 1) * 0.5;
      outlined(String(n), W / 2, H * 0.33, H * 0.14 * p, "#fff", "#d63b6e");
      outlined(raceLabel, W / 2, H * 0.45, clamp(u * 0.055, 15, 30));
      if (n <= 2) outlined("Toque na tela: largada turbo! 🚀", W / 2, H * 0.51, clamp(u * 0.042, 13, 22), "#ffe14d");
      if (T.dino) outlined("🦖 Fuja do dinossauro!", W / 2, H * 0.57, clamp(u * 0.04, 12, 22), "#ffffff");
    }

    // dinossauro vindo atrás da Lara
    if (dino && state === "race" && dino.mode === "chase" && dino.target === player && player.eatenT <= 0) {
      const g = player.z - dino.z;
      if (g > 0 && g < 4500) {
        const k = 1 - g / 4500;
        const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, "rgba(255,40,40,0)");
        vg.addColorStop(1, "rgba(255,40,40," + (0.5 * k * (0.75 + 0.25 * Math.sin(nowMs * 0.015))) + ")");
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
        const ds = u * (0.1 + 0.1 * k), cy = H * (W > H ? 0.42 : 0.62);
        drawEmo("🦖", W / 2 - u * 0.2, cy + ds * 0.4 - Math.abs(Math.sin(nowMs * 0.012)) * 8, ds);
        outlined("CORRE!", W / 2 + u * 0.06, cy, clamp(u * 0.08, 22, 44) * (1 + Math.sin(nowMs * 0.02) * 0.06), "#ffffff", "#d6362a");
      }
    }
    if (player.eatenT > 0) drawChomp(u);

    // mensagens grandes
    if (msgT > 0 && msgText) {
      const age = msgMax - msgT;
      const sc = age < 8 ? 0.5 + age / 16 : 1;
      ctx.globalAlpha = clamp(msgT / 15, 0, 1);
      let ms = clamp(u * 0.1, 26, 64);
      ctx.font = "bold " + Math.round(ms) + "px " + FONT;
      const mw = ctx.measureText(msgText).width;
      if (mw > W * 0.9) ms *= (W * 0.9) / mw;
      outlined(msgText, W / 2, H * 0.3, ms * sc, msgColor, "#2b1d4a");
      ctx.globalAlpha = 1;
    }
  }

  // NHAC! A boca do dinossauro fecha, a Lara fica um pouquinho na barriga e sai
  function drawChomp(u) {
    const e = 110 - player.eatenT;
    const c = e < 22 ? e / 22 : e > 92 ? Math.max(0, (110 - e) / 18) : 1;
    const jaw = c * H * 0.5;
    if (c >= 1) {
      ctx.fillStyle = "#7a2a3a";
      ctx.fillRect(0, 0, W, H);
      drawEmo("🦖", W / 2, H * 0.5, u * 0.35);
      outlined("NHAC!", W / 2, H * 0.3, clamp(u * 0.13, 32, 80), "#ffe14d", "#2b1d4a");
      outlined("Na barriga do dinossauro...", W / 2, H * 0.62, clamp(u * 0.05, 15, 26), "#ffffff", "#2b1d4a");
      return;
    }
    const n = 7, tw = W / n;
    ctx.fillStyle = "#4caf50";
    ctx.fillRect(0, 0, W, jaw);
    ctx.fillRect(0, H - jaw, W, jaw);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < n; i++) {
      quad(i * tw + 4, jaw, (i + 1) * tw - 4, jaw, (i + 0.5) * tw, jaw + tw * 0.6, (i + 0.5) * tw, jaw + tw * 0.6);
      quad(i * tw + 4, H - jaw, (i + 1) * tw - 4, H - jaw, (i + 0.5) * tw, H - jaw - tw * 0.6, (i + 0.5) * tw, H - jaw - tw * 0.6);
    }
  }

  /* ---------------- Botão de item e pausa --------------------------- */
  const itemBtn = $("item-btn"), itemIcon = $("item-icon"), itemCount = $("item-count");
  const pauseBtn = $("pause-btn");
  let itemKey = "";
  function syncButtons() {
    const vis = (state === "race" || state === "count") && !secret;
    let icon = "", cls = "empty", n = "";
    if (vis && player.roulT > 0) { icon = ROULETTE[Math.floor(nowMs / 70) % ROULETTE.length]; cls = "rolling"; }
    else if (vis && player.item) { icon = ITEM_ICON[player.item]; cls = "ready"; n = player.itemN > 1 ? "x" + player.itemN : ""; }
    const key = state + !!secret + "|" + icon + "|" + cls + "|" + n;
    if (key === itemKey) return;
    itemKey = key;
    itemBtn.className = (vis ? "" : "hidden ") + cls;
    itemIcon.textContent = icon;
    itemCount.textContent = n;
    pauseBtn.classList.toggle("hidden", !(vis || state === "finish"));
  }

  /* ---------------- Controles --------------------------------------- */
  let steerId = null;
  function steerTo(cx) { targetNX = clamp(((cx / W) * 2 - 1) * 1.7, -1.35, 1.35); }
  function onPress() {
    if (state === "count" && countT <= 2.05) rocketOK = true;
    if (state === "party" && party.t > (party.mini ? 40 : 150)) endParty();
    if (state === "travel" && travel.t > 120) endTravel();
  }
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (steerId === null) { steerId = t.identifier; steerTo(t.clientX); }
    onPress();
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === steerId) steerTo(t.clientX);
  }, { passive: false });
  const endTouch = (e) => { for (const t of e.changedTouches) if (t.identifier === steerId) steerId = null; };
  canvas.addEventListener("touchend", endTouch);
  canvas.addEventListener("touchcancel", endTouch);
  canvas.addEventListener("mousedown", (e) => { steerTo(e.clientX); onPress(); });
  canvas.addEventListener("mousemove", (e) => { if (e.buttons) steerTo(e.clientX); });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a") keyL = true;
    else if (k === "ArrowRight" || k === "d") keyR = true;
    else if (k === " " || k === "ArrowUp" || k === "x") {
      if (state === "race" && !secret) useItem(player);
      e.preventDefault();
    } else if (k === "Escape" || k === "p") {
      if (state === "pause") resume();
      else pause();
    }
    onPress();
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") keyL = false;
    if (e.key === "ArrowRight" || e.key === "d") keyR = false;
  });
  itemBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state === "race" && !secret) useItem(player);
    onPress();
  });
  pauseBtn.addEventListener("click", pause);

  /* ---------------- Telas ------------------------------------------- */
  const screens = { title: $("title-screen"), setup: $("setup-screen"), track: $("track-screen"), results: $("results-screen"), pause: $("pause-screen") };
  function show(name) { for (const k in screens) screens[k].classList.toggle("hidden", k !== name); }

  function buildPickers() {
    const cp = $("char-picker");
    CHARS.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "char-opt";
      b.innerHTML = '<span class="e">' + c.e + '</span><span class="n">' + c.name + "</span>";
      b.addEventListener("click", () => { save.char = i; save.color = c.color; persist(); refreshPickers(); sfx.blip(); });
      cp.appendChild(b);
    });
    const kp = $("car-picker");
    CAR_COLORS.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "car-swatch";
      b.style.background = c.body;
      b.title = c.name;
      b.addEventListener("click", () => { save.color = i; persist(); refreshPickers(); sfx.blip(); });
      kp.appendChild(b);
    });
    const vp = $("cc-picker");
    CCS.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "cc-opt";
      b.textContent = c.label;
      b.addEventListener("click", () => { save.cc = i; CC = c; persist(); refreshPickers(); sfx.blip(); });
      vp.appendChild(b);
    });
    const tp = $("track-picker");
    TRACKS.forEach((t, i) => {
      if (t.space) return;
      const b = document.createElement("button");
      b.className = "track-card";
      b.style.background = "linear-gradient(180deg," + t.th.sky[0] + "," + t.th.sky[1] + " 55%," + t.th.grass[0] + " 56%)";
      b.innerHTML = '<span class="e">' + t.icon + '</span><span class="n">' + t.name + "</span>";
      b.addEventListener("click", () => startRace(i));
      tp.appendChild(b);
    });
  }
  function refreshPickers() {
    [...$("char-picker").children].forEach((el, i) => el.classList.toggle("selected", i === save.char));
    [...$("car-picker").children].forEach((el, i) => el.classList.toggle("selected", i === save.color));
    [...$("cc-picker").children].forEach((el, i) => el.classList.toggle("selected", i === save.cc));
  }
  function renderShelf() {
    $("trophy-shelf").innerHTML = CCS.map((c) => {
      const p = save.trophies[c.id];
      const t = p === 1 ? "🏆" : p === 2 ? "🥈" : p === 3 ? "🥉" : "🏆";
      return '<div class="shelf-item' + (p ? "" : " empty") + '"><span class="t">' + t + "</span><span>" + c.label + "</span></div>";
    }).join("") + (() => {
      const p = save.trophies.space;
      return '<div class="shelf-item' + (p ? "" : " empty") + '"><span class="t">' + (p === 2 ? "🥈" : p === 3 ? "🥉" : "🏆") + "</span><span>🚀 Espaço</span></div>";
    })();
  }

  function goMenu() {
    musicStop();
    engineOff();
    state = "menu";
    gp = null;
    buildTrack(Math.floor(Math.random() * TRACKS.length));
    resetRace();
    show("title");
    renderShelf();
    if (AC) musicPlay(0, 0.9);
  }

  function startRace(ti) {
    ensureAudio();
    musicStop();
    engineOff();
    CC = CCS[save.cc] || CCS[0];
    buildTrack(ti);
    resetRace();
    state = "count";
    countT = 3.999;
    sfx.count(false);
    raceLabel = (gp ? (mode === "space" ? "Planeta " : "Corrida ") + (gp.race + 1) + "/" + gp.list.length + " · " : "") + T.icon + " " + T.name;
    show(null);
  }

  function playerFinished() {
    secret = null;
    state = "finish";
    finishT = 210;
    const p = player.place;
    msg(p === 1 ? "🏆 1º LUGAR! 🏆" : "CHEGADA! " + p + "º", p <= 3 ? "#ffd23f" : "#ffffff", 200);
    musicStop();
    sfx.win();
    player.item = null;
    player.roulT = 0;
    spawnConfetti(p <= 3 ? 120 : 60);
  }

  const resMedal = $("res-medal"), resTitle = $("res-title"), resSub = $("res-sub"), resTable = $("res-table");
  const resNext = $("res-next"), resAlt = $("res-alt");
  let onNext = null, onAlt = null;
  resNext.addEventListener("click", () => onNext && onNext());
  resAlt.addEventListener("click", () => onAlt && onAlt());
  $("res-menu").addEventListener("click", goMenu);

  function rowsHtml(list) {
    return list.map((x) =>
      '<div class="res-row' + (x.me ? " me" : "") + '"><span class="p">' + x.p + '</span><span class="f">' + x.e +
      '</span><span class="nm">' + x.name + '</span><span class="pt">' + (x.pts || "") + "</span></div>").join("");
  }

  function showResults() {
    state = "results";
    engineOff();
    const order = finalOrder();
    order.forEach((r, i) => { r.finished = true; r.place = i + 1; });
    if (gp) order.forEach((r, i) => (gp.pts[r.ch.i] += PTS[i]));
    const p = player.place, me = player.ch;
    resMedal.textContent = p <= 3 ? MEDALS[p - 1] : "🎉";
    resTitle.textContent = p === 1 ? (me.name + (me.fem ? " campeã!" : " campeão!")).toUpperCase() + " 🏆" : "Muito bem, " + me.name + "! 🎉";
    resSub.textContent = "Você chegou em " + p + "º lugar e pegou " + player.coins + " moeda" + (player.coins === 1 ? "" : "s") + "!";
    resTable.innerHTML = rowsHtml(order.map((r, i) => ({
      p: i + 1 + "º", e: r.e, name: r.name, me: r.isPlayer,
      pts: gp ? "+" + PTS[i] + " = " + gp.pts[r.ch.i] : "",
    })));
    if (gp) {
      if (gp.race < gp.list.length - 1) {
        if (mode === "space") {
          resNext.textContent = "VIAJAR PARA " + TRACKS[gp.list[gp.race + 1]].name.toUpperCase() + " 🚀";
          onNext = () => { gp.race++; startTravel(); };
        } else {
          resNext.textContent = "PRÓXIMA PISTA ▶";
          onNext = () => { gp.race++; startRace(gp.list[gp.race]); };
        }
      } else {
        resNext.textContent = "VER TROFÉU 🏆";
        onNext = showTrophy;
      }
      resAlt.classList.add("hidden");
    } else {
      resNext.textContent = "CORRER DE NOVO 🔄";
      onNext = () => startRace(trackIdx);
      resAlt.textContent = "🏁 Outra pista";
      resAlt.classList.remove("hidden");
      onAlt = () => show("track");
    }
    show("results");
  }

  function showTrophy() {
    const me = player.ch;
    const st = racers.map((r) => ({ r, pts: gp.pts[r.ch.i] }))
      .sort((a, b) => b.pts - a.pts || (a.r.isPlayer ? -1 : b.r.isPlayer ? 1 : 0));
    const place = st.findIndex((x) => x.r.isPlayer) + 1;
    const key = mode === "space" ? "space" : CC.id, sp = mode === "space";
    const prev = save.trophies[key];
    if (place <= 3 && (!prev || place < prev)) save.trophies[key] = place;
    persist();
    if (place <= 3) {
      startParty({
        top: st.slice(0, 3).map((x) => x.r), place, big: ["🏆", "🥈", "🥉"][place - 1],
        title: place === 1 ? (me.fem ? "CAMPEÃ " : "CAMPEÃO ") + (sp ? "DO ESPAÇO!" : "DA COPA!") : "TROFÉU DE " + place + "º!",
        sub: (sp ? "Viagem Espacial " : "Copa ") + CC.label + " · " + place + "º lugar geral",
        say: place === 1 ? "Parabéns, " + me.name + "! Você " + (sp ? (me.fem ? "é a campeã do Sistema Solar!" : "é o campeão do Sistema Solar!") : "ganhou a Copa!")
          : "Uau, " + me.name + "! Você ganhou um troféu!",
        onDone: () => trophyScreen(st, place),
      });
      return;
    }
    trophyScreen(st, place);
  }

  function trophyScreen(st, place) {
    const me = player.ch;
    state = "results";
    show("results");
    resMedal.textContent = place === 1 ? "🏆" : place === 2 ? "🥈" : place === 3 ? "🥉" : "🎖️";
    const sp = mode === "space";
    resTitle.textContent = place === 1 ? (me.name + (me.fem ? " campeã" : " campeão") + (sp ? " do Espaço!" : " da Copa!")).toUpperCase()
      : place <= 3 ? "Troféu de " + place + "º lugar! 🎉" : "Que corrida, " + me.name + "! 🎉";
    resSub.textContent = (sp ? "Viagem Espacial " : "Copa ") + CC.label + " · " + place + "º lugar geral";
    resTable.innerHTML = rowsHtml(st.map((x, i) => ({ p: i + 1 + "º", e: x.r.e, name: x.r.name, me: x.r.isPlayer, pts: x.pts + " pts" })));
    resNext.textContent = sp ? "NOVA VIAGEM 🚀" : "NOVA COPA 🔄";
    onNext = beginGP;
    resAlt.classList.add("hidden");
    confetti.length = 0;
    spawnConfetti(place <= 3 ? 180 : 80);
    sfx.win();
  }

  /* ---------------- Atalhos secretos -------------------------------- */
  let secret = null;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const SECRET_TXT = { space: "🚀 FOGUETE SECRETO!", sea: "🌊 TÚNEL DO FUNDO DO MAR!", sky: "🌈 ESCORREGADOR NAS NUVENS!" };
  const SEA_LIFE = ["🐠", "🐟", "🐡", "🐙", "🦑", "🐢", "🐬", "🐠", "🐟"];
  const SKY_LIFE = ["🐦", "🦋", "🕊️", "🦄", "🦋", "🐦"];

  function newCritter(pool, anywhere) {
    const dir = Math.random() < 0.5 ? -1 : 1;
    return {
      e: pool[Math.floor(Math.random() * pool.length)], dir,
      x: anywhere ? Math.random() : dir > 0 ? -0.15 : 1.15, y: 0.12 + Math.random() * 0.5,
      v: 0.0015 + Math.random() * 0.003, s: 0.07 + Math.random() * 0.09, ph: Math.random() * 9,
    };
  }

  function startSecret(kind) {
    const dur = 380;
    // atalho de verdade: anda bem mais do que andaria pela pista
    secret = { kind, t: 0, dur, rate: CC.top * 1.05 + 9000 / dur, life: [], bubbles: [], stars: [] };
    const pool = kind === "sea" ? SEA_LIFE : SKY_LIFE;
    for (let i = 0; i < 9; i++) secret.life.push(newCritter(pool, true));
    for (let i = 0; i < 120; i++) secret.stars.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 2 });
    player.boostT = kind === "space" ? 1e9 : 0;
    player.spinT = 0; player.jumpH = 0; player.driftT = 0; player.driftLvl = 0; player.off = false;
    particles.length = 0;
    sfx.secret();
    if (kind === "space") sfx.rocket();
  }

  function updateSecret(dt) {
    const S = secret;
    S.t += dt;
    player.z += S.rate * dt;
    player.speed = CC.top;
    const pool = S.kind === "sea" ? SEA_LIFE : SKY_LIFE;
    for (let i = 0; i < S.life.length; i++) {
      const c = S.life[i];
      c.x += c.v * c.dir * dt;
      if (c.x < -0.2 || c.x > 1.2) S.life[i] = newCritter(pool, false);
    }
    if (S.kind === "sea") {
      if (Math.random() < 0.4) S.bubbles.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.25, y: H * 0.78, r: 2 + Math.random() * 6, v: 1 + Math.random() * 2 });
      if (Math.random() < 0.15) S.bubbles.push({ x: Math.random() * W, y: H + 10, r: 3 + Math.random() * 8, v: 0.8 + Math.random() * 1.5 });
      if (Math.random() < 0.03) tone(600 + Math.random() * 500, 0.08, "sine", 0.05, 0, 1200);
    }
    for (const b of S.bubbles) b.y -= b.v * dt;
    S.bubbles = S.bubbles.filter((b) => b.y > -20);
    if (S.t >= S.dur) endSecret();
  }

  function endSecret() {
    secret = null;
    player.x = 0; player.steerX = 0; targetNX = 0;
    player.boostT = 70;
    player.jumpH = 160; player.jumpV = 0; player.trick = false; // cai de volta na pista
    flash = 14;
    msg("ATALHO SECRETO! 🤫✨", "#ffe14d", 90);
    sfx.boost();
  }

  function puff(x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, s, 0, 7);
    ctx.arc(x + s * 1.1, y + s * 0.25, s * 0.8, 0, 7);
    ctx.arc(x - s * 1.1, y + s * 0.25, s * 0.8, 0, 7);
    ctx.arc(x, y + s * 0.5, s * 0.9, 0, 7);
    ctx.fill();
  }

  function drawSun(x, y, R) {
    const g = ctx.createRadialGradient(x, y, R * 0.3, x, y, R * 3);
    g.addColorStop(0, "rgba(255,220,120,0.65)");
    g.addColorStop(1, "rgba(255,160,40,0)");
    ctx.fillStyle = g;
    circle(x, y, R * 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(nowMs * 0.0003);
    ctx.fillStyle = "rgba(255,230,140,0.35)";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      quad(Math.cos(a - 0.1) * R, Math.sin(a - 0.1) * R, Math.cos(a) * R * 2.1, Math.sin(a) * R * 2.1, Math.cos(a + 0.1) * R, Math.sin(a + 0.1) * R, 0, 0);
    }
    ctx.restore();
    const c = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
    c.addColorStop(0, "#fffbe0");
    c.addColorStop(0.6, "#ffd23f");
    c.addColorStop(1, "#ff9d00");
    ctx.fillStyle = c;
    circle(x, y, R);
  }

  const PLANET_COL = { earth: ["#8fdcff", "#1f6fd1"], moon: ["#ffffff", "#8e8e9a"], mars: ["#ffb98a", "#c4482a"], saturn: ["#fff0c4", "#c9a060"], jupiter: ["#ffe6c4", "#c4834a"] };
  function planetRing(x, y, R, a0, a1) {
    ctx.strokeStyle = "rgba(235,205,150,0.9)";
    ctx.lineWidth = R * 0.22;
    ctx.beginPath(); ctx.ellipse(x, y, R * 1.9, R * 0.5, -0.3, a0, a1); ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,200,0.6)";
    ctx.lineWidth = R * 0.06;
    ctx.beginPath(); ctx.ellipse(x, y, R * 2.15, R * 0.6, -0.3, a0, a1); ctx.stroke();
  }
  function drawPlanet(k, x, y, R) {
    if (R < 1) return;
    if (k === "saturn") planetRing(x, y, R, Math.PI, Math.PI * 2);
    const col = PLANET_COL[k];
    const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.35, R * 0.1, x, y, R);
    g.addColorStop(0, col[0]);
    g.addColorStop(1, col[1]);
    ctx.fillStyle = g;
    circle(x, y, R);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, 7);
    ctx.clip();
    if (k === "earth") {
      ctx.fillStyle = "#4fc35a";
      for (const [dx, dy, rx, ry] of [[-0.35, -0.2, 0.35, 0.25], [0.3, 0.25, 0.3, 0.4], [0.1, -0.55, 0.25, 0.12], [-0.2, 0.5, 0.2, 0.15]]) {
        ctx.beginPath(); ctx.ellipse(x + dx * R, y + dy * R, rx * R, ry * R, 0.5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (const [dx, dy, rx] of [[-0.1, -0.3, 0.4], [0.2, 0.1, 0.35], [-0.4, 0.35, 0.25]]) {
        ctx.beginPath(); ctx.ellipse(x + dx * R, y + dy * R, rx * R, 0.06 * R, -0.2, 0, 7); ctx.fill();
      }
    } else if (k === "moon") {
      ctx.fillStyle = "rgba(110,110,125,0.45)";
      for (const [dx, dy, r] of [[-0.3, -0.25, 0.18], [0.35, 0.1, 0.22], [-0.05, 0.45, 0.14], [0.1, -0.5, 0.1], [-0.5, 0.25, 0.1]]) circle(x + dx * R, y + dy * R, r * R);
    } else if (k === "mars") {
      ctx.fillStyle = "rgba(120,40,20,0.45)";
      for (const [dx, dy, rx, ry] of [[-0.3, 0, 0.4, 0.15], [0.3, 0.3, 0.3, 0.12], [0.2, -0.3, 0.25, 0.1]]) {
        ctx.beginPath(); ctx.ellipse(x + dx * R, y + dy * R, rx * R, ry * R, 0.2, 0, 7); ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(x, y - R * 0.92, R * 0.35, R * 0.14, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(150,90,40,0.3)";
      for (let i = -3; i <= 3; i++) ctx.fillRect(x - R, y + i * R * 0.27 - R * 0.06, R * 2, R * 0.12);
      if (k === "jupiter") {
        ctx.fillStyle = "rgba(200,70,40,0.6)";
        ctx.beginPath(); ctx.ellipse(x + R * 0.3, y + R * 0.3, R * 0.2, R * 0.1, 0, 0, 7); ctx.fill();
      }
    }
    // lado da noite
    const sh = ctx.createRadialGradient(x - R * 0.5, y - R * 0.5, R * 0.6, x - R * 0.2, y - R * 0.2, R * 1.6);
    sh.addColorStop(0, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,20,0.55)");
    ctx.fillStyle = sh;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    ctx.restore();
    if (k === "saturn") planetRing(x, y, R, 0, Math.PI);
  }

  // placa de dica com seta apontando para o atalho
  function drawSign(r, side) {
    const x = r.x + r.F * side * 1.3 * ROAD_W, s = r.F * 0.4 * ROAD_W, y = r.y;
    if (s < 3) return;
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(x - s * 0.05, y - s * 1.1, s * 0.1, s * 1.1);
    ctx.fillStyle = "#ffd23f";
    roundRect(x - s * 0.5, y - s * 1.5, s, s * 0.5, s * 0.08);
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.strokeStyle = "#8a5a2b";
    ctx.stroke();
    const cy = y - s * 1.25;
    ctx.fillStyle = "#ff4fa0";
    ctx.fillRect(Math.min(x - side * s * 0.32, x + side * s * 0.12), cy - s * 0.06, s * 0.44, s * 0.12);
    quad(x + side * s * 0.4, cy, x + side * s * 0.1, cy - s * 0.18, x + side * s * 0.1, cy + s * 0.18, x + side * s * 0.4, cy);
    const bounce = Math.abs(Math.sin(nowMs * 0.008)) * s * 0.2;
    drawEmo("✨", x, y - s * 1.5 - bounce, s * 0.5);
  }

  // entrada do lugar secreto, um pouco fora da pista
  function drawEntrance(r, sec) {
    const x = r.x + r.F * sec.x * ROAD_W, s = r.F * ROAD_W, y = r.y;
    if (s < 4) return;
    ctx.fillStyle = "rgba(255,240,150," + (0.22 + 0.15 * Math.sin(nowMs * 0.008)) + ")";
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.3, s * 0.6, s * 0.5, 0, 0, 7); ctx.fill();
    if (sec.kind === "space") {
      ctx.fillStyle = "#7d7d8c";
      ctx.fillRect(x - s * 0.35, y - s * 0.08, s * 0.7, s * 0.08);
      ctx.save();
      ctx.translate(x, y - s * 0.5);
      ctx.rotate(-Math.PI / 4);
      ctx.drawImage(emo("🚀", s * 0.9), -s * 0.45, -s * 0.45, s * 0.9, s * 0.9);
      ctx.restore();
      ctx.fillStyle = Math.floor(nowMs / 300) % 2 ? "#ff3b3b" : "#ffe14d";
      circle(x - s * 0.3, y - s * 0.12, s * 0.03);
      circle(x + s * 0.3, y - s * 0.12, s * 0.03);
    } else if (sec.kind === "sea") {
      ctx.fillStyle = "#8a8a99";
      ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.52, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b4f9e";
      ctx.beginPath(); ctx.ellipse(x, y, s * 0.31, s * 0.41, 0, Math.PI, Math.PI * 2); ctx.fill();
      drawEmo("🐠", x + Math.sin(nowMs * 0.003) * s * 0.12, y - s * 0.12, s * 0.18);
      drawEmo("🌊", x, y - s * 0.48, s * 0.3);
    } else {
      const cols = ["#ff5b4d", "#ff9f43", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff"];
      ctx.lineWidth = s * 0.06;
      cols.forEach((c, k) => {
        ctx.strokeStyle = c;
        ctx.beginPath(); ctx.arc(x, y, s * (0.5 - k * 0.06), Math.PI, Math.PI * 2); ctx.stroke();
      });
      drawEmo("☁️", x - s * 0.45, y + s * 0.08, s * 0.35);
      drawEmo("☁️", x + s * 0.45, y + s * 0.08, s * 0.35);
    }
  }

  function drawSecret() {
    const S = secret, p = S.t / S.dur, u = Math.min(W, H), t = S.t;
    if (S.kind === "space") drawSecretSpace(S, p, u, t);
    else if (S.kind === "sea") drawSecretSea(S, p, u, t);
    else drawSecretSky(S, p, u, t);
    if (t < 150) {
      ctx.globalAlpha = clamp((150 - t) / 30, 0, 1);
      outlined(SECRET_TXT[S.kind], W / 2, H * 0.24, clamp(u * 0.07, 18, 42), "#ffe14d", "#2b1d4a");
      ctx.globalAlpha = 1;
    }
    // clarão branco na entrada e na saída
    const fade = Math.max(0, 1 - t / 25, 1 - (S.dur - t) / 25);
    if (fade > 0) {
      ctx.fillStyle = "rgba(255,255,255," + clamp(fade, 0, 1) + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawSecretSpace(S, p, u, t) {
    const space = ease(clamp(p / 0.25, 0, 1)) * (1 - ease(clamp((p - 0.82) / 0.18, 0, 1)));
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#3fa9f5");
    sky.addColorStop(1, "#d4f1ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = space;
    const sp = ctx.createLinearGradient(0, 0, 0, H);
    sp.addColorStop(0, "#02010a");
    sp.addColorStop(1, "#1a0b3d");
    ctx.fillStyle = sp;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    for (const st of S.stars) ctx.fillRect(st.x * W, ((st.y + t * 0.004 * st.s) % 1) * H, st.s, st.s * (1 + 5 * space));
    // o Sol e os planetas lá de longe
    drawSun(W * 0.82, H * 0.14, u * 0.07);
    drawPlanet("saturn", W * 0.2, H * 0.2 + t * 0.03, u * 0.06);
    drawPlanet("mars", W * 0.86, H * 0.42 + t * 0.04, u * 0.035);
    drawPlanet("jupiter", W * 0.12, H * 0.5 + t * 0.02, u * 0.05);
    ctx.globalAlpha = 1;
    // a Lua passando
    const qm = clamp((p - 0.3) / 0.45, 0, 1);
    if (qm > 0 && qm < 1) drawPlanet("moon", lerp(W * 1.25, -W * 0.25, qm), H * 0.34, u * (0.1 + 0.08 * Math.sin(qm * Math.PI)));
    // a Terra ficando pequenininha lá embaixo
    const qe = ease(clamp((p - 0.05) / 0.6, 0, 1));
    if (p < 0.86) drawPlanet("earth", lerp(W / 2, W * 0.22, qe), lerp(H + W * 0.9, H * 0.84, qe), lerp(W * 1.1, u * 0.11, qe));
    const qc = clamp((p - 0.2) / 0.25, 0, 1);
    if (qc > 0 && qc < 1) drawEmo("☄️", lerp(W * 1.1, -W * 0.1, qc), lerp(H * 0.1, H * 0.32, qc), u * 0.12);
    const qa = clamp((p - 0.45) / 0.3, 0, 1);
    if (qa > 0 && qa < 1) drawEmo("🧑‍🚀", lerp(-W * 0.1, W * 1.1, qa), H * 0.5 + Math.sin(t * 0.05) * 15, u * 0.13);
    const qs = clamp((p - 0.6) / 0.22, 0, 1);
    if (qs > 0 && qs < 1) drawEmo("🛰️", lerp(W * 1.1, -W * 0.1, qs), H * 0.24, u * 0.1);
    // nuvens na subida e na descida
    if (space < 0.98) {
      ctx.globalAlpha = 1 - space;
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 7; i++) puff(((i * 0.37) % 1) * W, (((i * 0.17 + t * 0.02) % 1.2) - 0.1) * H, u * 0.07);
      ctx.globalAlpha = 1;
    }
    // kart-foguete
    const y = H * 0.68 + Math.sin(t * 0.08) * 6, w = u * 0.36;
    ctx.fillStyle = "#ff6a00";
    flame(W / 2, y - w * 0.06, w * 0.9 + Math.random() * w * 0.2, w * 0.22);
    ctx.fillStyle = "#ffe14d";
    flame(W / 2, y - w * 0.06, w * 0.5, w * 0.12);
    drawKart(W / 2, y, w, player, 0);
  }

  function drawSecretSea(S, p, u, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2aa8e8");
    g.addColorStop(0.5, "#0f5fa8");
    g.addColorStop(1, "#062a5a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let i = 0; i < 6; i++) {
      const x = W * (i / 5) + Math.sin(t * 0.01 + i) * 40;
      quad(x - 20, 0, x + 30, 0, x + 140, H * 0.8, x - 60, H * 0.8);
    }
    const qw = clamp((p - 0.15) / 0.65, 0, 1);
    if (qw > 0 && qw < 1) {
      ctx.globalAlpha = 0.85;
      drawEmo("🐳", lerp(-W * 0.3, W * 1.3, qw), H * 0.36, u * 0.42);
      ctx.globalAlpha = 1;
    }
    // túnel de vidro
    const cx = W / 2, cy = H * 0.42;
    for (let i = 0; i < 9; i++) {
      const z = (i / 9 + t * 0.01) % 1, sc = 0.04 + z * z * 1.7;
      ctx.strokeStyle = "rgba(190,245,255," + z * 0.55 + ")";
      ctx.lineWidth = 2 + sc * 10;
      ctx.beginPath();
      ctx.ellipse(cx, cy + sc * H * 0.15, W * 0.55 * sc, H * 0.42 * sc, 0, 0, 7);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(120,230,255,0.35)";
    quad(cx - 4, cy, cx + 4, cy, W * 0.95, H, W * 0.05, H);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 6; i++) {
      const z = (i / 6 + t * 0.02) % 1, z2 = Math.min(1, z + 0.07);
      const y1 = cy + (H - cy) * z * z, y2 = cy + (H - cy) * z2 * z2;
      quad(cx - (1 + z * z * W * 0.02), y1, cx + (1 + z * z * W * 0.02), y1, cx + (1 + z2 * z2 * W * 0.02), y2, cx - (1 + z2 * z2 * W * 0.02), y2);
    }
    // algas balançando
    ctx.strokeStyle = "#2fbf71";
    ctx.lineCap = "round";
    ctx.lineWidth = 8;
    for (let i = 0; i < 8; i++) {
      const x = (i < 4 ? i * 0.06 : 0.76 + (i - 4) * 0.06) * W + 10, h = H * (0.15 + (i % 3) * 0.06);
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.quadraticCurveTo(x + Math.sin(t * 0.05 + i) * 25, H - h * 0.5, x + Math.sin(t * 0.04 + i) * 15, H - h);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    drawEmo("🦀", W * 0.13 + Math.sin(t * 0.03) * 20, H, u * 0.1);
    drawEmo("🐚", W * 0.88, H, u * 0.08);
    // bichinhos nadando
    for (const c of S.life) {
      ctx.save();
      ctx.translate(c.x * W, c.y * H + Math.sin(t * 0.05 + c.ph) * 8);
      if (c.dir > 0) ctx.scale(-1, 1);
      drawEmo(c.e, 0, (u * c.s) / 2, u * c.s);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    for (const b of S.bubbles) {
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(b.y * 0.05) * 4, b.y, b.r, 0, 7);
      ctx.stroke();
    }
    // kart dentro de uma bolha
    const y = H * 0.8 + Math.sin(t * 0.06) * 5, w = u * 0.34;
    drawKart(W / 2, y, w, player, 0);
    ctx.fillStyle = "rgba(200,240,255,0.15)";
    circle(W / 2, y - w * 0.45, w * 0.78);
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(W / 2, y - w * 0.45, w * 0.78, 0, 7); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.ellipse(W / 2 - w * 0.4, y - w * 0.85, w * 0.1, w * 0.18, 0.6, 0, 7); ctx.fill();
  }

  function drawSecretSky(S, p, u, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#7fc8ff");
    g.addColorStop(1, "#ffe3f3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    drawSun(W * 0.82, H * 0.12, u * 0.06);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (let i = 0; i < 8; i++) {
      const z = (i / 8 + t * 0.006) % 1;
      const side = i % 2 ? 1 : -1;
      puff(W / 2 + side * (W * 0.1 + z * z * W * 0.7), H * 0.36 + z * z * H * 0.5, u * (0.02 + z * z * 0.16));
    }
    // escorregador de arco-íris
    const cx = W / 2, cy = H * 0.36, cols = ["#ff5b4d", "#ff9f43", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff"];
    cols.forEach((c, k) => {
      const a = -1 + k / 3, b = a + 1 / 3;
      ctx.fillStyle = c;
      quad(cx + a * 4, cy, cx + b * 4, cy, cx + b * W * 0.62, H, cx + a * W * 0.62, H);
    });
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 6; i++) {
      const z = (i / 6 + t * 0.02) % 1, z2 = Math.min(1, z + 0.05);
      const y1 = cy + (H - cy) * z * z, y2 = cy + (H - cy) * z2 * z2;
      for (const sd of [-1, 1]) {
        const xa = cx + sd * W * 0.62 * z * z, xb = cx + sd * W * 0.62 * z2 * z2;
        quad(xa - 2, y1, xa + 2, y1, xb + 3, y2, xb - 3, y2);
      }
    }
    for (const c of S.life) {
      ctx.save();
      ctx.translate(c.x * W, c.y * H * 0.8 + Math.sin(t * 0.05 + c.ph) * 10);
      if (c.dir > 0) ctx.scale(-1, 1);
      drawEmo(c.e, 0, (u * c.s) / 2, u * c.s);
      ctx.restore();
    }
    const y = H * 0.82 + Math.sin(t * 0.07) * 5, w = u * 0.34;
    ctx.fillStyle = "#fff6b0";
    for (let i = 0; i < 6; i++) sparkle(W / 2 + (Math.random() - 0.5) * w * 1.3, y - Math.random() * w * 0.9, w * 0.05, t * 0.1 + i);
    drawKart(W / 2, y, w, player, 0);
  }

  /* ---------------- Viagem Espacial: viagem entre planetas ---------- */
  let travel = null;
  function beginGP() {
    gp = { race: 0, list: mode === "space" ? SPACE_LIST : CUP_LIST, pts: CHARS.map(() => 0) };
    if (mode === "space") startTravel();
    else startRace(gp.list[0]);
  }
  function startTravel() {
    ensureAudio();
    musicStop();
    engineOff();
    CC = CCS[save.cc] || CCS[0];
    const to = TRACKS[gp.list[gp.race]], from = gp.race > 0 ? TRACKS[gp.list[gp.race - 1]] : null;
    buildTrack(gp.list[gp.race]);
    resetRace();
    for (const r of racers) r.boostT = 1e9;
    travel = { from, to, t: 0, dur: 420, stars: [] };
    for (let i = 0; i < 140; i++) travel.stars.push({ a: Math.random() * Math.PI * 2, r: Math.random() * Math.max(W, H) * 0.7, v: 0.5 + Math.random() });
    state = "travel";
    show(null);
    musicPlay(3, 1.1);
    sfx.rocket();
  }
  function updateTravel(dt) {
    travel.t += dt;
    const M = Math.max(W, H) * 0.75;
    for (const st of travel.stars) {
      st.r += (1 + st.r * 0.03) * st.v * dt;
      if (st.r > M) { st.r = Math.random() * 30; st.a = Math.random() * Math.PI * 2; }
    }
    if (travel.t >= travel.dur) endTravel();
  }
  function endTravel() {
    travel = null;
    startRace(gp.list[gp.race]);
  }
  function drawTravel() {
    const tr = travel, p = tr.t / tr.dur, u = Math.min(W, H), t = tr.t, cy = H * 0.45;
    const bg = ctx.createRadialGradient(W / 2, cy, 10, W / 2, cy, Math.max(W, H) * 0.8);
    bg.addColorStop(0, "#2a1660");
    bg.addColorStop(1, "#03020c");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // estrelas passando rapidinho (velocidade da luz!)
    ctx.strokeStyle = "#ffffff";
    const M = Math.max(W, H) * 0.75;
    for (const st of tr.stars) {
      ctx.globalAlpha = Math.min(1, st.r / 200);
      ctx.lineWidth = 1 + (st.r / M) * 2;
      const c = Math.cos(st.a), si = Math.sin(st.a);
      ctx.beginPath();
      ctx.moveTo(W / 2 + c * st.r * 0.88, cy + si * st.r * 0.88);
      ctx.lineTo(W / 2 + c * st.r, cy + si * st.r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawSun(W * 0.15, H * 0.15, u * 0.09);
    drawPlanet("jupiter", W * 0.87, H * 0.62 + t * 0.03, u * 0.05);
    if (tr.from) {
      const q = ease(clamp(p / 0.55, 0, 1));
      drawPlanet(tr.from.planet, lerp(W * 0.5, W * 0.06, q), lerp(H * 1.05, H * 0.9, q), lerp(u * 0.55, u * 0.04, q));
    }
    const q2 = ease(clamp((p - 0.2) / 0.8, 0, 1));
    drawPlanet(tr.to.planet, lerp(W * 0.82, W * 0.5, q2), lerp(H * 0.3, H * 0.33, q2), lerp(u * 0.03, u * 0.26, q2));
    // todo mundo voando junto
    const spots = [[0.2, 0.62, 0.14], [0.8, 0.6, 0.14], [0.32, 0.53, 0.1], [0.68, 0.52, 0.1]];
    karts.slice(0, 4).forEach((k, i) => {
      const [sx, sy, sw] = spots[i];
      drawKart(W * sx, H * sy + Math.sin(t * 0.06 + i) * 5, u * sw, k, 0);
    });
    drawKart(W / 2, H * 0.8 + Math.sin(t * 0.07) * 6, u * 0.3, player, 0);
    outlined(tr.from ? "🚀 Viajando pelo espaço..." : "🚀 Decolando!", W / 2, H * 0.06, clamp(u * 0.055, 15, 30), "#ffffff", "#2b1d4a");
    const label = "Próxima parada: " + tr.to.name.toUpperCase() + " " + tr.to.icon;
    let ns = clamp(u * 0.08, 20, 48) * (1 + Math.sin(t * 0.08) * 0.04);
    ctx.font = "bold " + Math.round(ns) + "px " + FONT;
    const lw = ctx.measureText(label).width;
    if (lw > W * 0.92) ns *= (W * 0.92) / lw;
    outlined(label, W / 2, H * 0.93, ns, "#ffe14d", "#2b1d4a");
    if (t > 120) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.1);
      outlined("Toque para continuar ▶", W / 2, H * 0.12, clamp(u * 0.04, 13, 20), "#ffffff", "#2b1d4a");
      ctx.globalAlpha = 1;
    }
    const fade = clamp((t - (tr.dur - 25)) / 25, 0, 1);
    if (fade > 0) {
      ctx.fillStyle = "rgba(255,255,255," + fade + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ---------------- Festa do pódio (1º, 2º e 3º lugar) ------------- */
  let party = null;
  const GLITTER = ["#ffffff", "#ffe14d", "#ff9be0", "#9be7ff", "#ffd23f", "#c8a2ff"];

  function afterRace() {
    const p = player.place, me = player.ch, top = finalOrder().slice(0, 3);
    if (p > 3) {
      // fora do pódio: festinha rápida com os 3 primeiros
      startParty({ mini: true, top, place: p, big: "🏁", title: "PÓDIO!", sub: me.name + " chegou em " + p + "º · vamos de novo! 💪", onDone: showResults });
      return;
    }
    startParty({
      top, place: p, big: MEDALS[p - 1],
      title: p === 1 ? me.name.toUpperCase() + (me.fem ? " CAMPEÃ!" : " CAMPEÃO!") : p + "º LUGAR!",
      sub: p === 1 ? "Você ganhou a corrida! 🏁" : "Você subiu no pódio! 🎉",
      say: p === 1 ? "Parabéns, " + me.name + "! Você " + (me.fem ? "é a campeã!" : "é o campeão!")
        : p === 2 ? "Uau, " + me.name + "! Segundo lugar!" : "Muito bem, " + me.name + "! Terceiro lugar!",
      onDone: showResults,
    });
  }

  function startParty(o) {
    const mini = !!o.mini, grand = !mini && o.place === 1;
    party = { ...o, mini, grand, t: 0, fx: [], glitter: [], balloons: [], nextBoom: 5 };
    for (let i = 0; i < (mini ? 30 : grand ? 170 : 80); i++) {
      party.glitter.push({ x: Math.random() * W, y: Math.random() * H, vy: 0.4 + Math.random() * 1.3, s: 3 + Math.random() * 7, ph: Math.random() * 9, c: GLITTER[i % GLITTER.length] });
    }
    for (let i = 0; i < (mini ? 5 : grand ? 22 : 12); i++) {
      party.balloons.push({ x: Math.random() * W, y: H + Math.random() * H, vy: 0.8 + Math.random() * 1.4, hue: Math.floor(Math.random() * 360), ph: Math.random() * 9, s: 0.7 + Math.random() * 0.6 });
    }
    for (const r of party.top) { r.spinT = 0; r.boostT = 0; r.driftT = 0; r.driftLvl = 0; r.smallT = 0; r.jumpH = 0; r.trickA = 0; }
    if (party.top.includes(player)) player.starT = 1e9; // kart arco-íris brilhando
    state = "party";
    show(null);
    engineOff();
    musicStop();
    confetti.length = 0;
    if (mini) {
      sfx.lap();
      musicPlay(4, 1.15);
      spawnConfetti(60);
      return;
    }
    sfx.win();
    setTimeout(() => { if (state === "party") musicPlay(4, 1); }, 900);
    spawnConfetti(grand ? 320 : 160);
    try { if (navigator.vibrate) navigator.vibrate([90, 60, 90, 60, 250]); } catch (e) { /* ok */ }
    // voz comemorando com o nome dela
    try {
      if (!save.muted && window.speechSynthesis && o.say) {
        const u = new SpeechSynthesisUtterance(o.say);
        u.lang = "pt-BR";
        u.pitch = 1.4;
        u.rate = 1.0;
        setTimeout(() => window.speechSynthesis.speak(u), 600);
      }
    } catch (e) { /* sem voz, tudo bem */ }
  }

  function endParty() {
    const done = party.onDone;
    party = null;
    player.starT = 0;
    musicStop();
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ok */ }
    done();
  }

  function boom() {
    const u = Math.min(W, H), hue = Math.floor(Math.random() * 360);
    const x = W * (0.1 + Math.random() * 0.8), y = H * (0.08 + Math.random() * 0.4);
    const n = 50, k = u / 420;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.1, v = (2.2 + Math.random() * 3.6) * k;
      party.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 55 + Math.random() * 35, max: 90, hue: hue + Math.random() * 40, s: (1.6 + Math.random() * 2.2) * k });
    }
    if (party.fx.length > 700) party.fx.splice(0, party.fx.length - 700);
    sfx.pop();
  }

  function updateParty(dt) {
    const p = party;
    p.t += dt;
    p.nextBoom -= dt;
    if (p.nextBoom <= 0) {
      boom();
      if (Math.random() < (p.grand ? 0.7 : 0.35)) boom();
      p.nextBoom = p.mini ? 35 + Math.random() * 30 : p.grand ? 7 + Math.random() * 14 : 16 + Math.random() * 28;
    }
    if (p.mini && p.t > 240) { endParty(); return; }
    for (let i = p.fx.length - 1; i >= 0; i--) {
      const f = p.fx[i];
      f.x += f.vx * dt; f.y += f.vy * dt;
      f.vy += 0.045 * dt; f.vx *= 0.985; f.vy *= 0.985;
      f.life -= dt;
      if (f.life <= 0) p.fx.splice(i, 1);
    }
    for (const g of p.glitter) { g.y += g.vy * dt; g.x += Math.sin(p.t * 0.03 + g.ph) * 0.4; if (g.y > H + 10) { g.y = -10; g.x = Math.random() * W; } }
    for (const b of p.balloons) { b.y -= b.vy * dt; if (b.y < -120) { b.y = H + 60; b.x = Math.random() * W; } }
  }

  function sparkle(x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    quad(0, -s, s * 0.28, 0, 0, s, -s * 0.28, 0);
    quad(-s, 0, 0, -s * 0.28, s, 0, 0, s * 0.28);
    ctx.restore();
  }

  function drawParty() {
    const p = party, t = p.t, u = Math.min(W, H), land = W > H;
    // fundo com raios de arco-íris girando
    const bg = ctx.createRadialGradient(W / 2, H * 0.6, 10, W / 2, H * 0.6, Math.max(W, H) * 0.85);
    bg.addColorStop(0, "#7a3fc4");
    bg.addColorStop(1, "#160b38");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H * 0.62);
    ctx.rotate(t * 0.004);
    const R = Math.max(W, H) * 1.2;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ctx.fillStyle = "hsla(" + Math.floor((i * 20 + t * 2) % 360) + ",95%,65%,0.16)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
      ctx.lineTo(Math.cos(a + Math.PI / 18) * R, Math.sin(a + Math.PI / 18) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // fogos de artifício
    ctx.globalCompositeOperation = "lighter";
    for (const f of p.fx) {
      ctx.globalAlpha = clamp(f.life / 60, 0, 1) * (0.55 + Math.random() * 0.45);
      ctx.fillStyle = "hsl(" + Math.floor(f.hue % 360) + ",100%," + (55 + Math.random() * 25) + "%)";
      circle(f.x, f.y, f.s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // balões subindo
    for (const b of p.balloons) {
      const bx = b.x + Math.sin(t * 0.02 + b.ph) * 12, r = u * 0.05 * b.s;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, b.y + r * 1.2);
      ctx.quadraticCurveTo(bx + 8, b.y + r * 2.2, bx, b.y + r * 3.2);
      ctx.stroke();
      ctx.fillStyle = "hsl(" + b.hue + ",90%,62%)";
      ctx.beginPath();
      ctx.ellipse(bx, b.y, r * 0.85, r * 1.1, 0, 0, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.ellipse(bx - r * 0.3, b.y - r * 0.4, r * 0.18, r * 0.3, -0.4, 0, 7);
      ctx.fill();
    }

    // pódio com os 3 primeiros
    const bw = Math.min(W * 0.28, 170, land ? H * 0.32 : 999), baseY = H * 0.9;
    if (p.grand) {
      // arco-íris gigante atrás do pódio
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = bw * 0.16;
      ["#ff5b4d", "#ff9f43", "#ffd23f", "#5cd97a", "#4db5ff", "#a66cff"].forEach((c, k) => {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(W / 2, baseY, bw * (1.9 - k * 0.16) + Math.sin(t * 0.05) * 4, Math.PI, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    const spots = [
      { place: 2, x: W / 2 - bw * 1.04, h: H * 0.15, c: "#e4ebf2", d: "#9fb0c2" },
      { place: 1, x: W / 2, h: H * 0.21, c: "#ffd23f", d: "#d9a400" },
      { place: 3, x: W / 2 + bw * 1.04, h: H * 0.11, c: "#f0a35e", d: "#c07030" },
    ];
    for (const sp of spots) {
      const top = baseY - sp.h;
      ctx.fillStyle = sp.d;
      ctx.fillRect(sp.x - bw / 2, top, bw, sp.h);
      ctx.fillStyle = sp.c;
      ctx.fillRect(sp.x - bw / 2 + 4, top + 4, bw - 8, sp.h - 4);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(sp.x - bw / 2 + 4, top + 4, bw - 8, Math.max(4, sp.h * 0.08));
      outlined(String(sp.place), sp.x, top + sp.h * 0.55, Math.min(sp.h * 0.6, bw * 0.6), "#ffffff", sp.d);
      const r = p.top[sp.place - 1];
      if (!r) continue;
      const kw = bw * 0.78, me = r.isPlayer;
      const jump = me ? Math.abs(Math.sin(t * 0.09)) * u * 0.07 : Math.abs(Math.sin(t * 0.05 + sp.place)) * u * 0.012;
      if (me) {
        ctx.fillStyle = "rgba(255,240,150,0.25)";
        circle(sp.x, top - kw * 0.45 - jump, kw * 0.85);
      }
      drawKart(sp.x, top, kw, r, jump, true);
      if (p.grand && me) {
        ctx.fillStyle = "#ffe14d";
        for (let i = 0; i < 12; i++) {
          const a = t * 0.05 + (i / 12) * Math.PI * 2;
          sparkle(sp.x + Math.cos(a) * kw * 0.95, top - kw * 0.45 - jump + Math.sin(a) * kw * 0.75, kw * (0.05 + 0.03 * Math.abs(Math.sin(t * 0.1 + i))), a);
        }
      }
      if (sp.place === 1) drawEmo("👑", sp.x, top - jump - kw * 0.98, kw * 0.42);
    }

    // medalha / troféu girando com brilhos
    const ms = u * (land ? 0.26 : 0.22), wob = Math.sin(t * 0.06) * 0.12;
    const medals = land ? [[W * 0.12, H * 0.62], [W * 0.88, H * 0.62]] : [[W / 2, H * 0.37]];
    for (const [mx, my] of medals) {
      ctx.save();
      ctx.translate(mx, my - ms / 2 + Math.sin(t * 0.05) * 6);
      ctx.rotate(wob);
      drawEmo(p.big, 0, ms / 2, ms);
      ctx.restore();
      ctx.fillStyle = "#fff6b0";
      for (let i = 0; i < 8; i++) {
        const a = t * 0.03 + (i / 8) * Math.PI * 2, rr = ms * 0.75;
        sparkle(mx + Math.cos(a) * rr, my - ms / 2 + Math.sin(a) * rr, ms * (0.07 + 0.05 * Math.abs(Math.sin(t * 0.1 + i))), a);
      }
    }

    // título brilhante
    let ts = clamp(u * 0.12, 28, 76) * (1 + Math.sin(t * 0.08) * 0.05);
    ctx.font = "900 " + Math.round(ts) + "px " + FONT;
    const tw = ctx.measureText(p.title).width;
    if (tw > W * 0.92) ts *= (W * 0.92) / tw;
    ctx.font = "900 " + Math.round(ts) + "px " + FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const ty = H * (land ? 0.13 : 0.11);
    const grad = ctx.createLinearGradient(W / 2 - W * 0.4, 0, W / 2 + W * 0.4, 0);
    for (let i = 0; i <= 4; i++) grad.addColorStop(i / 4, "hsl(" + Math.floor((t * 3 + i * 50) % 360) + ",100%,65%)");
    ctx.lineWidth = ts * 0.32;
    ctx.strokeStyle = "#2b1d4a";
    ctx.strokeText(p.title, W / 2, ty);
    ctx.lineWidth = ts * 0.14;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(p.title, W / 2, ty);
    ctx.fillStyle = grad;
    ctx.fillText(p.title, W / 2, ty);
    let ss = clamp(u * 0.05, 15, 28);
    ctx.font = "bold " + Math.round(ss) + "px " + FONT;
    const sw = ctx.measureText(p.sub).width;
    if (sw > W * 0.92) ss *= (W * 0.92) / sw;
    outlined(p.sub, W / 2, ty + ts * 0.95, ss, "#fff6b0", "#2b1d4a");

    // purpurina caindo por cima de tudo
    for (const g of p.glitter) {
      ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.12 + g.ph));
      ctx.fillStyle = g.c;
      sparkle(g.x, g.y, g.s, t * 0.05 + g.ph);
    }
    ctx.globalAlpha = 1;
    for (const f of confetti) {
      ctx.fillStyle = f.c;
      ctx.fillRect(f.x, f.y, f.s, f.s * 0.6);
    }

    if (t > (p.mini ? 40 : 150)) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.1);
      outlined("Toque para continuar ▶", W / 2, H * 0.955, clamp(u * 0.045, 14, 24), "#ffffff", "#2b1d4a");
      ctx.globalAlpha = 1;
    }
  }

  function pause() {
    if (!(state === "race" || state === "count" || state === "finish")) return;
    pausedFrom = state;
    state = "pause";
    music.paused = true;
    engineSet(0, 0);
    show("pause");
  }
  function resume() {
    if (state !== "pause") return;
    state = pausedFrom;
    music.paused = false;
    show(null);
  }

  $("cup-btn").addEventListener("click", () => { mode = "cup"; show("setup"); });
  $("free-btn").addEventListener("click", () => { mode = "free"; show("setup"); });
  $("space-btn").addEventListener("click", () => { mode = "space"; show("setup"); });
  $("setup-go").addEventListener("click", () => {
    if (mode === "free") show("track");
    else beginGP();
  });
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
  $("resume-btn").addEventListener("click", resume);
  $("quit-btn").addEventListener("click", goMenu);
  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    save.muted = !save.muted;
    persist();
    ensureAudio();
    applyMute();
  });
  // som só pode começar depois do primeiro toque
  document.addEventListener("pointerdown", () => {
    ensureAudio();
    if (state === "menu" && !music.on) musicPlay(0, 0.9);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { pause(); if (AC) AC.suspend().catch(() => {}); }
    else if (AC) AC.resume().catch(() => {});
  });

  /* ---------------- Loop principal ---------------------------------- */
  let lastT = 0, nowMs = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 16.667, 3) || 1;
    lastT = t;
    nowMs = t;
    try {
      if (state === "travel") { updateTravel(dt); if (travel) drawTravel(); syncButtons(); requestAnimationFrame(loop); return; }
      if (state === "party") { updateParty(dt); updateFx(dt); if (party) drawParty(); else draw(); syncButtons(); requestAnimationFrame(loop); return; }
      if (state === "count") updateCount(dt);
      else if (state !== "pause") update(dt);
      updateFx(dt);
      draw();
      syncButtons();
    } catch (e) {
      // nunca deixar o jogo morrer em silêncio
      if (window.console) console.error(e);
    }
    requestAnimationFrame(loop);
  }

  // ganchos para testes automáticos
  window.__corrida = {
    get state() { return state; },
    get player() { return player; },
    get racers() { return racers; },
    finishLap() { player.z = lineZ + player.lap * trackLen - 300; },
    give(it) { player.item = it; player.itemN = 1; },
    toSecret(dist) {
      const i = segments.findIndex((sg) => sg.secret);
      if (i < 0) return null;
      player.z = Math.floor((player.z - lineZ) / trackLen) * trackLen + lineZ + (i - START) * SEG_L - dist;
      return segments[i].secret;
    },
    get secret() { return secret && secret.kind; },
    get dino() { return dino && { mode: dino.mode, gap: Math.round(player.z - dino.z), target: dino.target && dino.target.name }; },
    dinoChase(gap) { dino.mode = "chase"; dino.z = player.z - gap; },
    toBomb() {
      const i = segments.findIndex((sg) => sg.bombs && sg.bombs.length === 1);
      player.z = Math.floor((player.z - lineZ) / trackLen) * trackLen + lineZ + (i - START) * SEG_L - 1500;
      targetNX = 0; player.x = 0;
      return i;
    },
    playerLast() { for (const k of karts) k.z = Math.max(k.z, player.z + 2500); },
    dinoRest() { dino.mode = "rest"; dino.t = 99999; dino.z = player.z - 20000; player.eatenT = 0; },
    rivalsFinish() { for (const k of karts) k.z = lineZ + LAPS * trackLen + 50; },
  };

  applyMute();
  buildPickers();
  refreshPickers();
  goMenu();
  requestAnimationFrame(loop);
})();
