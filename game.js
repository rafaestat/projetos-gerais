/* ====================================================================
   Corrida da Lara — jogo de carrinho para crianças (5 anos)
   Controle: arraste o dedo (ou o mouse) para guiar o carrinho.
   Pegue as estrelinhas ⭐ e desvie dos outros carros 🚗
   ==================================================================== */

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // Telas / HUD
  const startScreen = document.getElementById("start-screen");
  const overScreen = document.getElementById("over-screen");
  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const overTitle = document.getElementById("over-title");
  const overScore = document.getElementById("over-score");
  const playBtn = document.getElementById("play-btn");
  const againBtn = document.getElementById("again-btn");
  const carPicker = document.getElementById("car-picker");

  // Cores de carrinho que a criança pode escolher
  const CAR_COLORS = [
    { name: "Rosa", body: "#ff5d8f", dark: "#d63b6e" },
    { name: "Roxo", body: "#a66cff", dark: "#7d44d6" },
    { name: "Azul", body: "#4db5ff", dark: "#2e8ad6" },
    { name: "Verde", body: "#5cd97a", dark: "#36b257" },
    { name: "Amarelo", body: "#ffd23f", dark: "#e0ac00" },
    { name: "Vermelho", body: "#ff5b4d", dark: "#d6362a" },
  ];
  let chosenColor = CAR_COLORS[0];

  // Dimensões lógicas (em CSS pixels)
  let W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------------- Sons simples (WebAudio, sem arquivos) ----------- */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
  }
  function beep(freq, dur, type = "sine", vol = 0.15) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  }
  function soundStar() { beep(880, 0.12, "triangle", 0.2); beep(1320, 0.12, "triangle", 0.15); }
  function soundCrash() { beep(140, 0.3, "sawtooth", 0.2); }
  function soundStart() { beep(523, 0.1, "square", 0.15); beep(784, 0.15, "square", 0.15); }

  /* ---------------- Estado do jogo --------------------------------- */
  const STATE = { MENU: 0, PLAY: 1, OVER: 2 };
  let state = STATE.MENU;

  let road;        // limites da pista
  let player;      // carrinho do jogador
  let obstacles;   // outros carros
  let stars;       // estrelinhas
  let clouds;      // nuvens decorativas
  let trees;       // arvores na beira
  let score, lives, speed, dist, spawnTimer, starTimer, invuln, shake;
  let targetX;     // posicao alvo (dedo)

  function lane(n, total) {
    const left = road.left, w = road.right - road.left;
    return left + (w / total) * (n + 0.5);
  }

  function resetGame() {
    const roadW = Math.min(W * 0.8, 520);
    road = { left: (W - roadW) / 2, right: (W + roadW) / 2 };
    const carW = Math.min(roadW * 0.22, 80);
    player = {
      x: W / 2,
      y: H - carW * 1.9 - 30,
      w: carW,
      h: carW * 1.6,
    };
    targetX = player.x;
    obstacles = [];
    stars = [];
    clouds = [];
    trees = [];
    for (let i = 0; i < 4; i++) clouds.push(makeCloud(Math.random() * H));
    for (let i = 0; i < 8; i++) trees.push(makeTree(Math.random() * H));
    score = 0;
    lives = 3;
    speed = 4.2;
    dist = 0;
    spawnTimer = 0;
    starTimer = 40;
    invuln = 0;
    shake = 0;
    updateHud();
  }

  function makeCloud(y) {
    return { x: Math.random() * W, y, s: 0.6 + Math.random() * 0.8 };
  }
  function makeTree(y) {
    const onLeft = Math.random() < 0.5;
    const x = onLeft
      ? road.left - 20 - Math.random() * Math.max(10, road.left - 30)
      : road.right + 20 + Math.random() * Math.max(10, W - road.right - 30);
    return { x, y, s: 0.8 + Math.random() * 0.6 };
  }

  function spawnObstacle() {
    const lanes = 3;
    const n = Math.floor(Math.random() * lanes);
    const w = player.w;
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    obstacles.push({
      x: lane(n, lanes),
      y: -w * 2,
      w,
      h: w * 1.6,
      color,
    });
  }

  function spawnStar() {
    const lanes = 3;
    const n = Math.floor(Math.random() * lanes);
    stars.push({ x: lane(n, lanes), y: -40, r: 22, spin: Math.random() * 6 });
  }

  function updateHud() {
    scoreEl.textContent = "⭐ " + score;
    livesEl.textContent = "❤️".repeat(Math.max(0, lives));
  }

  /* ---------------- Loop principal --------------------------------- */
  let lastT = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 16.67, 2.5) || 1;
    lastT = t;
    if (state === STATE.PLAY) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    dist += speed * dt;
    // aumenta a dificuldade bem devagar (criança)
    speed = Math.min(9, 4.2 + dist / 4000);

    // mover carrinho suavemente em direcao ao dedo
    player.x += (targetX - player.x) * 0.2 * dt;
    player.x = Math.max(road.left + player.w / 2, Math.min(road.right - player.w / 2, player.x));

    // nuvens
    for (const c of clouds) {
      c.y += speed * 0.15 * dt;
      if (c.y > H + 60) Object.assign(c, makeCloud(-60));
    }
    // arvores
    for (const tr of trees) {
      tr.y += speed * dt;
      if (tr.y > H + 60) Object.assign(tr, makeTree(-60));
    }

    // surgir carros
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(40, 95 - dist / 200);
    }
    // surgir estrelas
    starTimer -= dt;
    if (starTimer <= 0) {
      spawnStar();
      starTimer = 70 + Math.random() * 60;
    }

    // mover obstaculos
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.y += speed * dt;
      if (o.y > H + o.h) { obstacles.splice(i, 1); continue; }
      if (invuln <= 0 && hit(player, o)) {
        lives--;
        invuln = 90;
        shake = 14;
        soundCrash();
        updateHud();
        obstacles.splice(i, 1);
        if (lives <= 0) endGame();
      }
    }

    // mover estrelas
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.y += speed * dt;
      s.spin += 0.1 * dt;
      if (s.y > H + 40) { stars.splice(i, 1); continue; }
      const dx = s.x - player.x, dy = s.y - player.y;
      if (Math.hypot(dx, dy) < s.r + player.w / 2) {
        score++;
        soundStar();
        updateHud();
        stars.splice(i, 1);
      }
    }

    if (invuln > 0) invuln -= dt;
    if (shake > 0) shake -= dt;
  }

  function hit(a, b) {
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 * 0.7 &&
           Math.abs(a.y - b.y) < (a.h + b.h) / 2 * 0.8;
  }

  /* ---------------- Desenho ---------------------------------------- */
  function draw() {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }

    // ceu / grama
    ctx.fillStyle = "#7ed957";
    ctx.fillRect(-20, 0, W + 40, H);

    // estrada
    drawRoad();

    // nuvens
    for (const c of clouds) drawCloud(c);
    // arvores
    for (const tr of trees) drawTree(tr);

    // estrelas
    for (const s of stars) drawStar(s.x, s.y, s.r, s.spin);

    // obstaculos
    for (const o of obstacles) drawCar(o.x, o.y, o.w, o.h, o.color, true);

    // jogador (pisca quando invulneravel)
    if (state !== STATE.MENU) {
      if (!(invuln > 0 && Math.floor(invuln / 6) % 2 === 0)) {
        drawCar(player.x, player.y, player.w, player.h, chosenColor, false);
      }
    }

    ctx.restore();
  }

  let roadScroll = 0;
  function drawRoad() {
    const { left, right } = road;
    // asfalto
    ctx.fillStyle = "#4a4a55";
    ctx.fillRect(left, 0, right - left, H);
    // bordas
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(left - 6, 0, 6, H);
    ctx.fillRect(right, 0, 6, H);
    // faixas centrais tracejadas (2 divisoes -> 3 faixas)
    if (state === STATE.PLAY) roadScroll = (roadScroll + speed) % 80;
    const w = right - left;
    ctx.fillStyle = "#ffe14d";
    for (let d = 1; d <= 2; d++) {
      const x = left + (w / 3) * d - 4;
      for (let y = -80 + roadScroll; y < H; y += 80) {
        ctx.fillRect(x, y, 8, 44);
      }
    }
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

  // carro visto de cima. flip=true => virado para baixo (vindo na contramao)
  function drawCar(cx, cy, w, h, color, flip) {
    ctx.save();
    ctx.translate(cx, cy);
    if (flip) ctx.rotate(Math.PI);

    const x = -w / 2, y = -h / 2;
    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    roundRect(x + 4, y + 6, w, h, w * 0.22); ctx.fill();
    // corpo
    ctx.fillStyle = color.body;
    roundRect(x, y, w, h, w * 0.22); ctx.fill();
    // teto
    ctx.fillStyle = color.dark;
    roundRect(x + w * 0.16, y + h * 0.26, w * 0.68, h * 0.38, w * 0.14); ctx.fill();
    // vidro frente
    ctx.fillStyle = "#bfeaff";
    roundRect(x + w * 0.2, y + h * 0.14, w * 0.6, h * 0.16, w * 0.1); ctx.fill();
    // farois
    ctx.fillStyle = "#fff7c2";
    roundRect(x + w * 0.12, y + h * 0.02, w * 0.18, h * 0.07, 4); ctx.fill();
    roundRect(x + w * 0.7, y + h * 0.02, w * 0.18, h * 0.07, 4); ctx.fill();
    // rodas
    ctx.fillStyle = "#222";
    roundRect(x - w * 0.06, y + h * 0.16, w * 0.12, h * 0.22, 4); ctx.fill();
    roundRect(x + w * 0.94, y + h * 0.16, w * 0.12, h * 0.22, 4); ctx.fill();
    roundRect(x - w * 0.06, y + h * 0.62, w * 0.12, h * 0.22, 4); ctx.fill();
    roundRect(x + w * 0.94, y + h * 0.62, w * 0.12, h * 0.22, 4); ctx.fill();

    ctx.restore();
  }

  function drawStar(cx, cy, r, spin) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(spin * 0.3);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffd23f";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#e0ac00";
    ctx.stroke();
    ctx.restore();
  }

  function drawCloud(c) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    const s = c.s;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 22 * s, 0, 7);
    ctx.arc(c.x + 24 * s, c.y + 6 * s, 18 * s, 0, 7);
    ctx.arc(c.x - 24 * s, c.y + 6 * s, 18 * s, 0, 7);
    ctx.arc(c.x, c.y + 12 * s, 20 * s, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  function drawTree(tr) {
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.scale(tr.s, tr.s);
    // tronco
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(-5, 0, 10, 22);
    // copa
    ctx.fillStyle = "#3fae54";
    ctx.beginPath();
    ctx.arc(0, -8, 20, 0, 7);
    ctx.arc(-14, 2, 14, 0, 7);
    ctx.arc(14, 2, 14, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- Controles -------------------------------------- */
  function pointerMove(clientX) {
    targetX = clientX;
  }
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches[0]) pointerMove(e.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches[0]) pointerMove(e.touches[0].clientX);
  }, { passive: false });
  canvas.addEventListener("mousedown", (e) => pointerMove(e.clientX));
  canvas.addEventListener("mousemove", (e) => { if (e.buttons) pointerMove(e.clientX); });

  /* ---------------- Fluxo de telas --------------------------------- */
  function buildCarPicker() {
    carPicker.innerHTML = "";
    CAR_COLORS.forEach((c, i) => {
      const sw = document.createElement("div");
      sw.className = "car-swatch" + (i === 0 ? " selected" : "");
      sw.style.background = c.body;
      sw.title = c.name;
      sw.addEventListener("click", () => {
        chosenColor = c;
        document.querySelectorAll(".car-swatch").forEach(el => el.classList.remove("selected"));
        sw.classList.add("selected");
        ensureAudio();
        beep(700, 0.08, "square", 0.12);
      });
      carPicker.appendChild(sw);
    });
  }

  function startGame() {
    ensureAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    soundStart();
    resetGame();
    state = STATE.PLAY;
    startScreen.classList.add("hidden");
    overScreen.classList.add("hidden");
    hud.classList.remove("hidden");
  }

  function endGame() {
    state = STATE.OVER;
    hud.classList.add("hidden");
    overTitle.textContent = score >= 10 ? "Uauu! Incrível, Lara! 🏆" : "Muito bem, Lara! 🎉";
    overScore.textContent = "Você pegou " + score + " estrelinha" + (score === 1 ? "" : "s") + "! ⭐";
    overScreen.classList.remove("hidden");
  }

  playBtn.addEventListener("click", startGame);
  againBtn.addEventListener("click", startGame);

  buildCarPicker();
  requestAnimationFrame(loop);
})();
