/*
 * Ateliê Essenzia — Motor gráfico e de interação
 *
 * Cuida do canvas, do laço de animação, do rastreamento do ponteiro
 * (posição normalizada + posição suavizada + velocidade), de partículas,
 * de poeira ambiente e da troca de cenas em crossfade — nada de tela
 * preta entre um cantinho e outro: a cena anterior se dissolve sobre a
 * nova, como virar a página de um caderno.
 */
const Engine = (() => {
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, DPR = 1;

  // ---- ponteiro ----
  const pointer = {
    x: 0.5, y: 0.5,      // normalizado 0..1
    px: 0.5, py: 0.5,    // frame anterior
    sx: 0.5, sy: 0.5,    // posição suavizada (para elementos que "seguem" o dedo)
    down: false,
    moved: false,         // já recebeu alguma entrada real do ponteiro?
    speed: 0,            // velocidade suavizada
    rawSpeed: 0,
  };

  // ---- partículas / feedback tátil ----
  const particles = [];
  const ripples = [];   // ondinhas ao tocar
  const motes = [];     // poeira dourada flutuando no ambiente
  let pressGlow = 0;    // brilho suave sob o dedo enquanto pressiona

  // ---- cenas ----
  let current = null;
  const scenes = {};
  let sceneTime = 0;     // segundos desde que a cena atual entrou

  // crossfade: fotografia da cena anterior que se dissolve por cima da nova
  const snapCanvas = document.createElement("canvas");
  const snapCtx = snapCanvas.getContext("2d");
  let snapA = 0;

  let last = performance.now();
  let timeSec = 0;

  /* ---------- setup ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initMotes();
    if (current && current.resize) current.resize(W, H);
  }

  function setPointerFromEvent(e) {
    pointer.x = e.clientX / W;
    pointer.y = e.clientY / H;
    pointer.moved = true;
  }

  let activePointer = null; // só o primeiro dedo comanda (evita saltos com multi-toque)

  function bindInput() {
    canvas.addEventListener("pointerdown", (e) => {
      if (activePointer !== null) return;
      activePointer = e.pointerId;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {} // arrasto rápido não perde o rastreamento
      setPointerFromEvent(e);
      pointer.px = pointer.x; pointer.py = pointer.y;
      pointer.sx = pointer.x; pointer.sy = pointer.y;
      pointer.down = true;
      ripples.push({ x: pointer.x * W, y: pointer.y * H, r: 8, a: 0.35 });
      if (current && current.onDown) current.onDown(pointer);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener("pointermove", (e) => {
      if (activePointer !== null && e.pointerId !== activePointer) return;
      setPointerFromEvent(e);
      if (current && current.onMove) current.onMove(pointer);
    });

    const up = (e) => {
      if (activePointer !== null && e.pointerId !== activePointer) return;
      activePointer = null;
      pointer.down = false;
      if (current && current.onUp) current.onUp(pointer);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("resize", resize);
  }

  /* vibração sutil no celular — o "toc" tátil de encaixar algo no lugar */
  function haptic(ms = 10) {
    if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
  }

  /* suavização exponencial independente de framerate */
  function approach(cur, target, rate, dt) {
    return cur + (target - cur) * (1 - Math.exp(-rate * dt));
  }

  /* ---------- partículas ---------- */
  function spawn(p) {
    particles.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, life: 1, age: 0,
      size: 4, color: "#fff", gravity: 0, drag: 0.99,
      glow: 0, shape: "circle", rot: 0, vrot: 0,
    }, p));
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const k = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = Math.max(0, k);
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow;
      }
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size * (p.shape === "spark" ? k : 1);
      if (p.shape === "rect") {
        ctx.fillRect(-s / 2, -s / 2, s, s * 0.4);
      } else if (p.shape === "spark") {
        ctx.fillRect(-s / 2, -s * 0.15, s, s * 0.3);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function clearParticles() { particles.length = 0; }

  /* ---------- ondinhas de toque ---------- */
  function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += dt * 160;
      r.a -= dt * 0.9;
      if (r.a <= 0) ripples.splice(i, 1);
    }
  }

  function drawRipples() {
    for (const r of ripples) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.a);
      ctx.strokeStyle = "rgba(255,240,215,0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- poeira dourada ambiente ---------- */
  function initMotes() {
    motes.length = 0;
    const n = Math.min(26, Math.round((W * H) / 46000));
    for (let i = 0; i < n; i++) {
      motes.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 1.8,
        a: 0.03 + Math.random() * 0.09,
        vy: -3 - Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        sway: 6 + Math.random() * 12,
      });
    }
  }

  function drawMotes(dt) {
    ctx.save();
    for (const m of motes) {
      m.y += m.vy * dt;
      if (m.y < -8) { m.y = H + 8; m.x = Math.random() * W; }
      const x = m.x + Math.sin(timeSec * 0.4 + m.phase) * m.sway;
      ctx.globalAlpha = m.a * (0.7 + 0.3 * Math.sin(timeSec * 0.8 + m.phase));
      ctx.fillStyle = "#e8c89a";
      ctx.beginPath();
      ctx.arc(x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- fundo quente comum ---------- */
  function drawAmbient() {
    const g = ctx.createRadialGradient(
      W * 0.5, H * 0.42, Math.min(W, H) * 0.1,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.85
    );
    g.addColorStop(0, "#33220f");
    g.addColorStop(0.55, "#1d1308");
    g.addColorStop(1, "#0c0703");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // brilho âmbar que respira lentamente
    const breathe = 0.5 + 0.5 * Math.sin(timeSec * 0.4);
    const glow = ctx.createRadialGradient(
      W * 0.5, H * 0.4, 0,
      W * 0.5, H * 0.4, Math.min(W, H) * (0.55 + breathe * 0.06)
    );
    glow.addColorStop(0, `rgba(232,160,90,${0.10 + breathe * 0.05})`);
    glow.addColorStop(1, "rgba(232,160,90,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(
      W * 0.5, H * 0.5, Math.min(W, H) * 0.35,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.75
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  /* brilho quente sob o dedo enquanto pressiona — a tela "sente" o toque */
  function drawPressGlow(dt) {
    pressGlow = approach(pressGlow, pointer.down ? 1 : 0, pointer.down ? 10 : 5, dt);
    if (pressGlow < 0.02) return;
    const x = pointer.sx * W, y = pointer.sy * H;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 90);
    g.addColorStop(0, `rgba(255,214,150,${0.10 * pressGlow})`);
    g.addColorStop(1, "rgba(255,214,150,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 90, y - 90, 180, 180);
  }

  /* ---------- texto suave ---------- */
  function text(str, x, y, opts = {}) {
    const {
      size = 24, color = "rgba(243,231,211,0.85)",
      align = "center", weight = 400, glow = 0, alpha = 1,
      font = '"Cormorant Garamond", Georgia, serif', letter = 0,
    } = opts;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.font = `${weight} ${size}px ${font}`;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    if (letter) {
      const total = str.split("").reduce((w, c) => w + ctx.measureText(c).width + letter, 0) - letter;
      let cx = align === "center" ? x - total / 2 : x;
      ctx.textAlign = "left";
      for (const c of str) {
        ctx.fillText(c, cx, y);
        cx += ctx.measureText(c).width + letter;
      }
    } else {
      ctx.fillText(str, x, y);
    }
    ctx.restore();
  }

  /* ---------- cenas ---------- */
  function register(name, scene) { scenes[name] = scene; }

  function go(name, data) {
    const nxt = scenes[name];
    if (!nxt || nxt === current) return;
    if (current) {
      // fotografa o frame atual para dissolver por cima da nova cena
      snapCanvas.width = canvas.width;
      snapCanvas.height = canvas.height;
      snapCtx.drawImage(canvas, 0, 0);
      snapA = 1;
      if (current.exit) current.exit();
    }
    clearParticles();
    ripples.length = 0;
    current = nxt;
    sceneTime = 0;
    if (current.enter) current.enter(W, H, data);
  }

  /* ---------- laço ---------- */
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    timeSec += dt;
    sceneTime += dt;

    // velocidade e posição suavizada do ponteiro
    const dx = pointer.x - pointer.px;
    const dy = pointer.y - pointer.py;
    pointer.rawSpeed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001);
    pointer.speed += (pointer.rawSpeed - pointer.speed) * 0.25;
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.sx = approach(pointer.sx, pointer.x, 18, dt);
    pointer.sy = approach(pointer.sy, pointer.y, 18, dt);

    drawAmbient();
    drawMotes(dt);

    if (current && current.update) current.update(dt, pointer, timeSec);
    updateParticles(dt);
    updateRipples(dt);
    if (current && current.draw) current.draw(ctx, W, H, timeSec);
    drawParticles();
    drawRipples();
    drawPressGlow(dt);

    drawVignette();
    if (current && current.overlay) current.overlay(ctx, W, H, timeSec);

    // crossfade: a cena anterior se dissolve com um leve zoom
    if (snapA > 0) {
      snapA = Math.max(0, snapA - dt * 2.4);
      const e = snapA * snapA; // easing: some rápido no fim
      const s = 1 + (1 - snapA) * 0.035;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = e;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(s, s);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(snapCanvas, 0, 0);
      ctx.restore();
    }

    requestAnimationFrame(loop);
  }

  let inited = false;
  function init() {
    if (inited) return;
    inited = true;
    resize();
    bindInput();
    requestAnimationFrame(loop);
  }

  /* utilidades expostas às estações */
  return {
    init, register, go, spawn, clearParticles, text, haptic, approach,
    get ctx() { return ctx; },
    get W() { return W; },
    get H() { return H; },
    get pointer() { return pointer; },
    get particles() { return particles; },
    get time() { return timeSec; },
    get sceneTime() { return sceneTime; },
  };
})();
