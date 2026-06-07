/*
 * Ateliê Essenzia — Motor gráfico e de interação
 *
 * Cuida do canvas, do laço de animação, do rastreamento do ponteiro
 * (posição normalizada + velocidade), de um sistema de partículas e da
 * troca suave entre cenas (menu e cada estação). Mantém a iluminação
 * quente e o vinheteamento cinematográfico em todas as telas.
 */
const Engine = (() => {
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");

  let W = 0, H = 0, DPR = 1;

  // ---- ponteiro ----
  const pointer = {
    x: 0.5, y: 0.5,      // normalizado 0..1
    px: 0.5, py: 0.5,    // anterior
    down: false,
    speed: 0,            // velocidade suavizada (0..~)
    rawSpeed: 0,
  };

  // ---- partículas ----
  const particles = [];

  // ---- cenas ----
  let current = null;
  let next = null;
  let fade = 0;          // 0 = visível, 1 = preto
  let fading = 0;        // -1 entrando, +1 saindo
  const scenes = {};

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
    if (current && current.resize) current.resize(W, H);
  }

  function setPointerFromEvent(e) {
    const t = e.touches ? e.touches[0] : e;
    if (!t) return;
    pointer.x = t.clientX / W;
    pointer.y = t.clientY / H;
  }

  function bindInput() {
    const down = (e) => {
      setPointerFromEvent(e);
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.down = true;
      if (current && current.onDown) current.onDown(pointer);
      e.preventDefault();
    };
    const move = (e) => {
      setPointerFromEvent(e);
      if (current && current.onMove) current.onMove(pointer);
      e.preventDefault();
    };
    const up = (e) => {
      pointer.down = false;
      if (current && current.onUp) current.onUp(pointer);
    };
    canvas.addEventListener("mousedown", down);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    window.addEventListener("resize", resize);
  }

  /* ---------- partículas ---------- */
  function spawn(p) {
    // p: {x, y, vx, vy, life, size, color, gravity, fade, glow, shape}
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

  /* ---------- fundo quente comum ---------- */
  function drawAmbient() {
    // gradiente quente, base de tudo
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

  /* ---------- texto suave ---------- */
  function text(str, x, y, opts = {}) {
    const {
      size = 24, color = "rgba(243,231,211,0.85)",
      align = "center", weight = 400, glow = 0,
      font = '"Cormorant Garamond", Georgia, serif', letter = 0,
    } = opts;
    ctx.save();
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.font = `${weight} ${size}px ${font}`;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    if (letter) {
      // espaçamento manual entre letras
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
    if (fading) return;
    next = scenes[name];
    next._data = data;
    fading = 1; // escurece
  }

  function finishFade() {
    if (fading === 1) {
      // troca de cena no escuro
      if (current && current.exit) current.exit();
      clearParticles();
      current = next;
      next = null;
      if (current.enter) current.enter(W, H, current._data);
      fading = -1; // clareia
    } else if (fading === -1) {
      fading = 0;
    }
  }

  /* ---------- laço ---------- */
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    timeSec += dt;

    // velocidade do ponteiro
    const dx = pointer.x - pointer.px;
    const dy = pointer.y - pointer.py;
    pointer.rawSpeed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001);
    pointer.speed += (pointer.rawSpeed - pointer.speed) * 0.25;
    pointer.px = pointer.x;
    pointer.py = pointer.y;

    drawAmbient();

    if (current && current.update) current.update(dt, pointer, timeSec);
    updateParticles(dt);
    if (current && current.draw) current.draw(ctx, W, H, timeSec);
    drawParticles();

    drawVignette();
    if (current && current.overlay) current.overlay(ctx, W, H, timeSec);

    // transição
    if (fading) {
      fade += fading * dt * 1.6;
      if (fade >= 1) { fade = 1; finishFade(); }
      else if (fade <= 0) { fade = 0; fading = 0; }
    }
    if (fade > 0) {
      ctx.fillStyle = `rgba(8,5,3,${fade})`;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(loop);
  }

  function init() {
    resize();
    bindInput();
    requestAnimationFrame(loop);
  }

  /* utilidades expostas às estações */
  return {
    init, register, go, spawn, clearParticles, text,
    get ctx() { return ctx; },
    get W() { return W; },
    get H() { return H; },
    get pointer() { return pointer; },
    get particles() { return particles; },
    get time() { return timeSec; },
  };
})();
