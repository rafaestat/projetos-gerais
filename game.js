/* ====================================================================
   Corrida da Lara — kart em pseudo-3D (estilo corrida de kart!)
   Controle: arraste o dedo (ou setas do teclado) para dirigir.
   Vença a corrida de 3 voltas contra 🐢 🦊 🐰, pegue ⭐,
   passe nos turbos e pegue a 🌟 para ficar invencível!
   ==================================================================== */

(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const startScreen = document.getElementById("start-screen");
  const overScreen = document.getElementById("over-screen");
  const hud = document.getElementById("hud");
  const posEl = document.getElementById("pos");
  const lapEl = document.getElementById("lap");
  const scoreEl = document.getElementById("score");
  const overTitle = document.getElementById("over-title");
  const overScore = document.getElementById("over-score");
  const overMedal = document.getElementById("over-medal");
  const playBtn = document.getElementById("play-btn");
  const againBtn = document.getElementById("again-btn");
  const carPicker = document.getElementById("car-picker");

  const CAR_COLORS = [
    { name: "Rosa", body: "#ff5d8f", dark: "#d63b6e" },
    { name: "Roxo", body: "#a66cff", dark: "#7d44d6" },
    { name: "Azul", body: "#4db5ff", dark: "#2e8ad6" },
    { name: "Verde", body: "#5cd97a", dark: "#36b257" },
    { name: "Amarelo", body: "#ffd23f", dark: "#e0ac00" },
    { name: "Vermelho", body: "#ff5b4d", dark: "#d6362a" },
  ];
  let chosen = CAR_COLORS[0];

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

  /* ---------------- Sons (WebAudio, sem arquivos) ------------------- */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }
  function beep(freq, dur, type, vol) {
    if (!audioCtx) return;
    try {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime;
      g.gain.setValueAtTime(vol || 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* sem som, sem drama */ }
  }
  const soundCoin  = () => { beep(1320, 0.09, "triangle", 0.18); beep(1760, 0.12, "triangle", 0.13); };
  const soundBump  = () => beep(120, 0.25, "sawtooth", 0.2);
  const soundBoost = () => { beep(300, 0.08, "sawtooth", 0.12); beep(620, 0.1, "sawtooth", 0.12); beep(980, 0.16, "sawtooth", 0.12); };
  const soundStar  = () => [880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => beep(f, 0.1, "square", 0.12), i * 70));
  const soundPass  = () => beep(1046, 0.1, "triangle", 0.14);
  const soundLap   = () => { beep(784, 0.1, "square", 0.14); beep(988, 0.15, "square", 0.14); };
  const soundWin   = () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.2, "triangle", 0.2), i * 130));
  const soundCount = (go) => beep(go ? 880 : 440, go ? 0.45 : 0.15, "square", 0.18);

  /* ---------------- Pista ------------------------------------------ */
  const SEG_L = 200;        // comprimento de cada trecho
  const ROAD_W = 2200;      // meia-largura da pista (mundo)
  const DRAW = 60;          // trechos desenhados a frente
  const CAM_H = 1100;       // altura da camera
  const LAPS = 3;
  const TOP = 58;           // velocidade maxima do jogador

  let segments = [], N = 0, trackLen = 0;

  function addRoad(enter, hold, leave, curve) {
    const push = (c) => segments.push({ curve: c, sprites: [], coin: null, star: null, boost: false });
    for (let i = 0; i < enter; i++) push(curve * (i / enter));
    for (let i = 0; i < hold; i++) push(curve);
    for (let i = 0; i < leave; i++) push(curve * (1 - i / leave));
  }

  function buildTrack() {
    segments = [];
    addRoad(0, 50, 0, 0);          // reta de largada
    addRoad(20, 40, 20, 2.6);
    addRoad(0, 30, 0, 0);
    addRoad(20, 50, 20, -3.2);
    addRoad(0, 40, 0, 0);
    addRoad(15, 30, 15, 1.6);
    addRoad(15, 25, 15, -2.4);     // "S"
    addRoad(15, 25, 15, 2.4);
    addRoad(0, 45, 0, 0);
    addRoad(25, 55, 25, -3.4);
    addRoad(0, 25, 0, 0);
    N = segments.length;
    trackLen = N * SEG_L;

    // enfeites na beira da pista
    const DECOR = ["🌳", "🌴", "🌳", "🌻", "🍄", "🌳", "🌷", "🍄"];
    for (let i = 4; i < N; i += 6) {
      const e = DECOR[Math.floor(Math.random() * DECOR.length)];
      const side = (i % 12 < 6) ? -1 : 1;
      segments[i].sprites.push({ e, off: side * (1.9 + Math.random() * 1.6), s: 950 + Math.random() * 550 });
    }
    segments[Math.floor(N * 0.55)].sprites.push({ e: "🏰", off: -3.0, s: 2400 });
    segments[Math.floor(N * 0.15)].sprites.push({ e: "🎡", off: 3.2, s: 2400 });

    // estrelinhas para pegar
    for (let i = 30; i < N - 12; i += 42) {
      const lane = Math.random() * 1.2 - 0.6;
      for (let k = 0; k < 4; k++) segments[(i + k * 3) % N].coin = { off: lane, taken: false };
    }
    // turbos
    for (let i = 70; i < N; i += 110) segments[i].boost = true;
    // super estrelas (invencivel)
    segments[Math.floor(N * 0.35)].star = { off: 0, taken: false };
    segments[Math.floor(N * 0.80)].star = { off: -0.4, taken: false };
  }

  const segAt = (z) => segments[Math.floor(z / SEG_L) % N];

  /* ---------------- Estado da corrida ------------------------------ */
  const RIVALS = [
    { e: "🐢", body: "#5cd97a", dark: "#36b257", top: 54.5 },
    { e: "🦊", body: "#ff9f43", dark: "#d67e22", top: 56.0 },
    { e: "🐰", body: "#ffb3d9", dark: "#e07aae", top: 57.2 },
  ];

  let state = "menu";  // menu | count | play | over
  let player, karts, targetNX, boostT, starT, bumpT, shake, coinsGot, lap, rank, countT, vaiT, finished;
  let hillOff = 0, clouds = [], confetti = [];
  let lastPos = "", lastLap = "", lastScore = "";

  function resetRace() {
    // comeca um pouquinho depois da linha, com o portal de chegada logo a frente
    player = { z: SEG_L * 4, x: 0, speed: 0 };
    targetNX = 0;
    boostT = 0; starT = 0; bumpT = 0; shake = 0;
    coinsGot = 0; lap = 1; rank = 4; vaiT = 0; finished = false;
    confetti = [];
    karts = RIVALS.map((r, i) => ({
      ...r,
      z: SEG_L * 4 + 500 + i * 480,
      baseX: [-0.45, 0.45, 0][i],
      ph: Math.random() * 9,
      x: [-0.45, 0.45, 0][i],
      speed: 0,
      spinT: 0,
    }));
    for (const s of segments) {
      if (s.coin) s.coin.taken = false;
      if (s.star) s.star.taken = false;
    }
    refreshHud(true);
  }

  function refreshHud(force) {
    const medals = ["🥇", "🥈", "🥉", "🏅"];
    const p = medals[rank - 1] + " " + rank + "º";
    const l = "🏁 " + Math.min(lap, LAPS) + "/" + LAPS;
    const s = "⭐ " + coinsGot;
    if (force || p !== lastPos) { posEl.textContent = p; lastPos = p; }
    if (force || l !== lastLap) { lapEl.textContent = l; lastLap = l; }
    if (force || s !== lastScore) { scoreEl.textContent = s; lastScore = s; }
  }

  /* ---------------- Loop principal --------------------------------- */
  let lastT = 0, nowMs = 0;
  function loop(t) {
    const dt = Math.min((t - lastT) / 16.67, 2.5) || 1;
    lastT = t; nowMs = t;
    try {
      if (state === "count") {
        const before = Math.ceil(countT);
        countT -= dt / 60;
        const after = Math.ceil(countT);
        if (after < before && after > 0) soundCount(false);
        if (countT <= 0) { state = "play"; vaiT = 50; soundCount(true); }
      } else if (state === "play") {
        update(dt);
      }
      draw();
    } catch (e) {
      // nunca deixar o jogo morrer em silencio
      if (window.console) console.error(e);
    }
    requestAnimationFrame(loop);
  }

  function update(dt) {
    const curSeg = segAt(player.z);
    const curve = curSeg.curve;

    // direcao: vai atras do dedo + curva empurra pra fora
    player.x += (targetNX - player.x) * 0.18 * dt;
    player.x -= curve * (player.speed / TOP) * 0.004 * dt;
    player.x = Math.max(-1.5, Math.min(1.5, player.x));

    // velocidade (acelera sozinho — crianca so dirige)
    let top = TOP;
    if (starT > 0) top = 72;
    if (boostT > 0) top = 85;
    const offroad = Math.abs(player.x) > 1.03 && starT <= 0;
    if (offroad) { top = Math.min(top, 26); shake = Math.max(shake, 2.5); }
    player.speed += (top - player.speed) * 0.03 * dt;
    player.z += player.speed * dt;

    // voltas
    const newLap = Math.floor(player.z / trackLen) + 1;
    if (newLap > lap && newLap <= LAPS) {
      lap = newLap;
      soundLap();
      for (const s of segments) { if (s.coin) s.coin.taken = false; } // estrelinhas voltam
    }
    if (player.z >= trackLen * LAPS) { finishRace(); return; }

    // rivais (com elastico pra corrida ficar sempre emocionante)
    for (const k of karts) {
      let target = k.top;
      const gap = k.z - player.z;
      if (k.spinT > 0) { target = 8; k.spinT -= dt; }
      else if (gap > 2600) target = Math.min(target, Math.max(player.speed * 0.92, 20));
      else if (gap < -2600) target = k.top * 1.15;
      k.speed += (target - k.speed) * 0.025 * dt;
      k.z += k.speed * dt;
      k.x = k.baseX + Math.sin(k.z * 0.00018 + k.ph) * 0.28;
    }

    // batidinhas nos rivais
    for (const k of karts) {
      const rel = k.z - player.z;
      if (rel > -100 && rel < 380 && Math.abs(k.x - player.x) < 0.33) {
        if (starT > 0) {
          if (k.spinT <= 0) { k.spinT = 110; soundBump(); }
        } else if (bumpT <= 0) {
          player.speed *= 0.45;
          bumpT = 60; shake = 12;
          player.x += (player.x < k.x ? -0.28 : 0.28);
          soundBump();
        }
      }
    }

    // pegar coisas (olha o trecho atual e o seguinte)
    const idx = Math.floor(player.z / SEG_L) % N;
    for (const s of [segments[idx], segments[(idx + 1) % N]]) {
      if (s.coin && !s.coin.taken && Math.abs(s.coin.off - player.x) < 0.45) {
        s.coin.taken = true; coinsGot++; soundCoin();
      }
      if (s.star && !s.star.taken && Math.abs(s.star.off - player.x) < 0.5) {
        s.star.taken = true; starT = 320; soundStar();
      }
      if (s.boost && Math.abs(player.x) < 1.0 && boostT < 20) {
        boostT = 110; soundBoost();
      }
    }

    // posicao na corrida
    const newRank = 1 + karts.filter((k) => k.z > player.z).length;
    if (newRank < rank) soundPass();
    rank = newRank;

    // timers
    if (boostT > 0) boostT -= dt;
    if (starT > 0) starT -= dt;
    if (bumpT > 0) bumpT -= dt;
    if (shake > 0) shake -= dt;
    if (vaiT > 0) vaiT -= dt;

    // cenario se mexe
    hillOff -= curve * player.speed * 0.0022 * dt;
    for (const c of clouds) {
      c.x += 0.12 * c.s * dt;
      if (c.x > W + 80) c.x = -80;
    }

    refreshHud(false);
  }

  function finishRace() {
    state = "over";
    finished = true;
    hud.classList.add("hidden");
    const medals = ["🥇", "🥈", "🥉", "🏅"];
    overMedal.textContent = medals[rank - 1];
    overTitle.textContent = rank === 1 ? "LARA CAMPEÃ! 🏆" : "Muito bem, Lara! 🎉";
    overScore.textContent = "Você chegou em " + rank + "º lugar e pegou " + coinsGot + " estrelinha" + (coinsGot === 1 ? "" : "s") + "!";
    overScreen.classList.remove("hidden");
    soundWin();
    for (let i = 0; i < 140; i++) {
      confetti.push({
        x: Math.random() * W, y: -Math.random() * H,
        vy: 1.5 + Math.random() * 2.5, ph: Math.random() * 9,
        s: 5 + Math.random() * 7,
        c: CAR_COLORS[i % CAR_COLORS.length].body,
      });
    }
  }

  /* ---------------- Desenho ---------------------------------------- */
  const rows = new Array(DRAW + 1);
  for (let i = 0; i <= DRAW; i++) rows[i] = { x: 0, y: 0, w: 0, F: 0, z: 0, segIdx: 0 };

  function draw() {
    const HOR = H * 0.40;

    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // ceu
    const sky = ctx.createLinearGradient(0, 0, 0, HOR);
    sky.addColorStop(0, "#3fa9f5");
    sky.addColorStop(1, "#cdefff");
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, W + 40, HOR + 22);

    // sol
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath(); ctx.arc(W * 0.8, HOR * 0.35, Math.min(W, H) * 0.07, 0, 7); ctx.fill();

    // nuvens
    for (const c of clouds) drawCloud(c);

    // morrinhos
    drawHills(HOR);

    // grama base
    ctx.fillStyle = "#7ed957";
    ctx.fillRect(-20, HOR, W + 40, H - HOR + 20);

    if (!segments.length || !player) { ctx.restore(); return; }

    const camZ = player.z;
    const camX = player.x * ROAD_W;
    const base = Math.floor(camZ / SEG_L);
    const frac = (camZ % SEG_L) / SEG_L;

    // limites de cada "fatia" da pista
    let xoff = 0;
    let dxo = -(segments[base % N].curve * frac);
    for (let j = 0; j <= DRAW; j++) {
      const r = rows[j];
      const z = j * SEG_L - frac * SEG_L;
      r.z = z;
      const zc = Math.max(z, 14);
      r.F = (H * 0.5) / zc;
      r.x = W / 2 + r.F * (xoff - camX);
      r.y = HOR + r.F * CAM_H;
      r.w = r.F * ROAD_W;
      r.segIdx = (base + j) % N;
      xoff += dxo;
      dxo += segments[(base + j) % N].curve;
    }

    // pista (de perto pra longe)
    for (let j = 1; j <= DRAW; j++) {
      const near = rows[j - 1], far = rows[j];
      if (far.y >= near.y) continue;
      const segIdx = (base + j - 1) % N;
      const dark = (Math.floor(segIdx / 3) % 2) === 0;

      // grama listrada
      ctx.fillStyle = dark ? "#6fcf4b" : "#8ce366";
      ctx.fillRect(-20, far.y, W + 40, near.y - far.y);

      // zebrinha (borda)
      ctx.fillStyle = dark ? "#ff5d5d" : "#ffffff";
      roadQuad(near, far, -1.14, -0.97);
      roadQuad(near, far, 0.97, 1.14);

      // asfalto
      ctx.fillStyle = dark ? "#55555f" : "#5d5d68";
      roadQuad(near, far, -1, 1);

      // linha de chegada quadriculada
      if (segIdx < 2) {
        for (let sIdx = 0; sIdx < 8; sIdx++) {
          ctx.fillStyle = (sIdx + segIdx) % 2 ? "#151515" : "#f5f5f5";
          roadQuad(near, far, -1 + sIdx * 0.25, -1 + (sIdx + 1) * 0.25);
        }
      } else if (dark) {
        // tracinho central
        ctx.fillStyle = "#ffe14d";
        roadQuad(near, far, -0.012, 0.012);
      }
    }

    // sprites e karts (de longe pra perto)
    const buckets = new Array(DRAW + 1);
    for (const k of karts || []) {
      const rel = k.z - player.z;
      if (rel < -400 || rel >= DRAW * SEG_L - SEG_L) continue;
      const jj = Math.min(DRAW, Math.max(1, Math.floor((rel + frac * SEG_L) / SEG_L) + 1));
      (buckets[jj] = buckets[jj] || []).push(k);
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    for (let j = DRAW; j >= 1; j--) {
      const r = rows[j];
      const seg = segments[r.segIdx];

      if (r.z > 100) {
        // enfeites
        for (const sp of seg.sprites) {
          const size = r.F * sp.s;
          if (size > 4) {
            ctx.font = Math.round(size) + "px sans-serif";
            ctx.fillText(sp.e, r.x + r.F * sp.off * ROAD_W, r.y + size * 0.05);
          }
        }
        // turbo (setas na pista)
        if (seg.boost) drawBoostPad(r);
        // estrelinha
        if (seg.coin && !seg.coin.taken) {
          const size = r.F * 520;
          const bob = Math.sin(nowMs * 0.005 + r.segIdx) * size * 0.15;
          ctx.font = Math.round(size) + "px sans-serif";
          ctx.fillText("⭐", r.x + r.F * seg.coin.off * ROAD_W, r.y - r.F * 120 + bob);
        }
        // super estrela
        if (seg.star && !seg.star.taken) {
          const size = r.F * 760 * (1 + Math.sin(nowMs * 0.008) * 0.12);
          ctx.font = Math.round(size) + "px sans-serif";
          ctx.fillText("🌟", r.x + r.F * seg.star.off * ROAD_W, r.y - r.F * 130);
        }
        // faixa de chegada
        if (r.segIdx === 10) drawFinishBanner(r);
      }

      // rivais
      if (buckets[j]) {
        for (const k of buckets[j]) {
          const rel = k.z - player.z;
          const worldXoff = (r.x - W / 2) / r.F + camX;
          const zk = Math.max(rel, 150);
          const Fk = (H * 0.5) / zk;
          const xk = W / 2 + Fk * (worldXoff + k.x * ROAD_W - camX);
          const yk = HOR + Fk * CAM_H;
          drawKart(xk, yk, Fk * 850, k.body, k.dark, k.e, { spin: k.spinT > 0 ? k.spinT : 0 });
        }
      }
    }

    // kart da Lara
    if (state !== "menu") {
      const pw = Math.min(W * 0.34, 200);
      const bounce = Math.sin(nowMs * 0.02) * 2 + (Math.abs(player.x) > 1.03 ? Math.random() * 3 : 0);
      drawKart(W / 2, H * 0.88 + bounce, pw, chosen.body, chosen.dark, "👧", {
        tilt: Math.max(-0.5, Math.min(0.5, (targetNX - player.x) * 0.6)),
        boost: boostT > 0,
        rainbow: starT > 0,
      });
    }

    // contagem regressiva
    if (state === "count") {
      const n = Math.ceil(countT);
      const p = 1 + (countT % 1) * 0.4;
      bigText(n > 0 ? String(n) : "VAI!", H * 0.16 * p);
    } else if (state === "play" && vaiT > 0) {
      bigText("VAI!", H * 0.16 * (1 + (50 - vaiT) * 0.004));
    }

    // confete no final
    if (state === "over" && finished) {
      for (const f of confetti) {
        f.y += f.vy; f.x += Math.sin(nowMs * 0.003 + f.ph) * 1.2;
        if (f.y > H + 20) { f.y = -20; f.x = Math.random() * W; }
        ctx.fillStyle = f.c;
        ctx.fillRect(f.x, f.y, f.s, f.s * 0.6);
      }
    }

    ctx.restore();
  }

  // desenha um trapezio na pista entre duas fatias, de a..b (fracao da largura)
  function roadQuad(near, far, a, b) {
    ctx.beginPath();
    ctx.moveTo(near.x + near.w * a, near.y + 1);
    ctx.lineTo(near.x + near.w * b, near.y + 1);
    ctx.lineTo(far.x + far.w * b, far.y);
    ctx.lineTo(far.x + far.w * a, far.y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBoostPad(r) {
    const cw = r.w * 0.30;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 ? "#ff8c00" : "#ffc400";
      const yy = r.y - r.F * (60 + i * 150);
      const hh = r.F * 110;
      ctx.beginPath();
      ctx.moveTo(r.x - cw, yy);
      ctx.lineTo(r.x + cw, yy);
      ctx.lineTo(r.x, yy - hh);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawFinishBanner(r) {
    const poleH = r.F * 1400, bw = r.F * 130;
    ctx.fillStyle = "#e9eef2";
    ctx.fillRect(r.x - r.w - bw, r.y - poleH, bw, poleH);
    ctx.fillRect(r.x + r.w, r.y - poleH, bw, poleH);
    const bh = r.F * 320, by = r.y - poleH;
    const cols = 10, cw = (2 * (r.w + bw)) / cols;
    for (let i = 0; i < cols; i++) {
      for (let jj = 0; jj < 2; jj++) {
        ctx.fillStyle = (i + jj) % 2 ? "#151515" : "#ffffff";
        ctx.fillRect(r.x - r.w - bw + i * cw, by + jj * bh / 2, cw + 0.5, bh / 2);
      }
    }
    const bs = r.F * 620;
    if (bs > 5) {
      ctx.font = Math.round(bs) + "px sans-serif";
      ctx.fillText("🎈", r.x - r.w - bw / 2, by + bh * 0.1);
      ctx.fillText("🎈", r.x + r.w + bw / 2, by + bh * 0.1);
    }
  }

  function drawKart(cx, cy, w, body, dark, face, o) {
    if (w < 3) return;
    o = o || {};
    const h = w * 0.6;
    ctx.save();
    ctx.translate(cx, cy);
    if (o.tilt) ctx.rotate(o.tilt * 0.35);
    if (o.spin) ctx.rotate(Math.sin(o.spin * 0.2) * 0.7);

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.6, w * 0.13, 0, 0, 7); ctx.fill();

    // fogo do turbo
    if (o.boost) {
      ctx.font = Math.round(w * (0.3 + Math.random() * 0.1)) + "px sans-serif";
      ctx.fillText("🔥", -w * 0.3, h * 0.35);
      ctx.fillText("🔥", w * 0.3, h * 0.35);
    }

    // rodas
    ctx.fillStyle = "#26262b";
    roundRect(-w * 0.62, -h * 0.52, w * 0.22, h * 0.58, w * 0.06); ctx.fill();
    roundRect(w * 0.40, -h * 0.52, w * 0.22, h * 0.58, w * 0.06); ctx.fill();

    // corpo
    ctx.fillStyle = o.rainbow ? "hsl(" + Math.floor(nowMs * 0.4 % 360) + " 95% 62%)" : body;
    roundRect(-w * 0.46, -h * 0.82, w * 0.92, h * 0.76, w * 0.12); ctx.fill();

    // para-choque
    ctx.fillStyle = o.rainbow ? "hsl(" + Math.floor((nowMs * 0.4 + 60) % 360) + " 95% 45%)" : dark;
    roundRect(-w * 0.40, -h * 0.36, w * 0.80, h * 0.26, w * 0.08); ctx.fill();
    // aerofolio
    roundRect(-w * 0.30, -h * 0.96, w * 0.60, h * 0.15, w * 0.05); ctx.fill();

    // rosto
    ctx.font = Math.round(w * 0.58) + "px sans-serif";
    ctx.fillText(face, 0, -h * 0.78);
    if (o.spin) { ctx.font = Math.round(w * 0.4) + "px sans-serif"; ctx.fillText("💫", 0, -h * 1.5); }
    if (o.rainbow) {
      ctx.font = Math.round(w * 0.34) + "px sans-serif";
      ctx.fillText("✨", -w * 0.68, -h * (0.7 + (nowMs % 400) / 1000));
      ctx.fillText("✨", w * 0.68, -h * (1.1 - (nowMs % 400) / 1000));
    }
    ctx.restore();
  }

  function bigText(txt, size) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(size) + "px 'Comic Sans MS', 'Trebuchet MS', sans-serif";
    ctx.lineWidth = size * 0.12;
    ctx.strokeStyle = "#d63b6e";
    ctx.strokeText(txt, W / 2, H * 0.32);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(txt, W / 2, H * 0.32);
    ctx.restore();
  }

  function drawHills(HOR) {
    const layers = [
      { c: "#b7e29a", wl: Math.max(W * 0.55, 180), amp: H * 0.055, p: 0.20 },
      { c: "#98d477", wl: Math.max(W * 0.38, 140), amp: H * 0.075, p: 0.45 },
    ];
    for (const L of layers) {
      const offm = ((hillOff * L.p) % L.wl + L.wl) % L.wl;
      ctx.fillStyle = L.c;
      ctx.beginPath();
      ctx.moveTo(-L.wl + offm - L.wl, HOR + 2);
      for (let x = -L.wl * 2 + offm; x < W + L.wl; x += L.wl) {
        ctx.quadraticCurveTo(x + L.wl / 2, HOR - L.amp * 2, x + L.wl, HOR + 2);
      }
      ctx.lineTo(W + 60, HOR + 30);
      ctx.lineTo(-60, HOR + 30);
      ctx.closePath();
      ctx.fill();
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

  function drawCloud(c) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffffff";
    const s = c.s;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 20 * s, 0, 7);
    ctx.arc(c.x + 22 * s, c.y + 5 * s, 16 * s, 0, 7);
    ctx.arc(c.x - 22 * s, c.y + 5 * s, 16 * s, 0, 7);
    ctx.arc(c.x, c.y + 10 * s, 18 * s, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  /* ---------------- Controles -------------------------------------- */
  function steerTo(clientX) {
    targetNX = Math.max(-1.45, Math.min(1.45, ((clientX / W) * 2 - 1) * 2.0));
  }
  canvas.addEventListener("touchstart", (e) => { e.preventDefault(); if (e.touches[0]) steerTo(e.touches[0].clientX); }, { passive: false });
  canvas.addEventListener("touchmove", (e) => { e.preventDefault(); if (e.touches[0]) steerTo(e.touches[0].clientX); }, { passive: false });
  canvas.addEventListener("mousedown", (e) => steerTo(e.clientX));
  canvas.addEventListener("mousemove", (e) => { if (e.buttons) steerTo(e.clientX); });
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") targetNX = Math.max(-1.45, targetNX - 0.4);
    if (e.key === "ArrowRight") targetNX = Math.min(1.45, targetNX + 0.4);
  });

  /* ---------------- Telas ------------------------------------------ */
  function buildCarPicker() {
    carPicker.innerHTML = "";
    CAR_COLORS.forEach((c, i) => {
      const sw = document.createElement("div");
      sw.className = "car-swatch" + (i === 0 ? " selected" : "");
      sw.style.background = c.body;
      sw.title = c.name;
      sw.addEventListener("click", () => {
        chosen = c;
        document.querySelectorAll(".car-swatch").forEach((el) => el.classList.remove("selected"));
        sw.classList.add("selected");
        ensureAudio();
        beep(700, 0.08, "square", 0.12);
      });
      carPicker.appendChild(sw);
    });
  }

  function startRace() {
    ensureAudio();
    resetRace();
    state = "count";
    countT = 3.999;
    soundCount(false);
    startScreen.classList.add("hidden");
    overScreen.classList.add("hidden");
    hud.classList.remove("hidden");
  }

  playBtn.addEventListener("click", startRace);
  againBtn.addEventListener("click", startRace);

  /* ---------------- Vai! ------------------------------------------- */
  buildTrack();
  resetRace();
  for (let i = 0; i < 5; i++) {
    clouds.push({ x: Math.random() * W, y: 20 + Math.random() * (H * 0.22), s: 0.7 + Math.random() * 0.9 });
  }
  buildCarPicker();
  requestAnimationFrame(loop);
})();
