/*
 * Ateliê Essenzia — Estações de criação
 *
 * Cada estação é uma "cena" com: enter, exit, update, draw, overlay e os
 * manipuladores de ponteiro (onDown/onMove/onUp). Nada aqui pode falhar:
 * não existem cronômetros, erros ou metas — só a repetição prazerosa.
 *
 * Princípios de fluidez:
 *  - tudo que se move tem inércia (approach exponencial, nunca salto seco);
 *  - tudo que se arrasta "pesa" um pouquinho, seguindo o dedo com atraso;
 *  - toda conclusão celebra com fagulhas douradas + vibração sutil.
 */
(() => {
  /* ---------- utilidades ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  function hint(s) { if (window.UI) UI.hint(s); }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // anel de progresso muito sutil, perto da base — o valor exibido desliza
  // suavemente até o real, então nunca há saltos
  let _ringShown = 0;
  function progressRing(ctx, W, H, p) {
    p = clamp(p, 0, 1);
    if (p < _ringShown - 0.25) _ringShown = p; // recomeço: encaixa sem animar ao contrário
    _ringShown += (p - _ringShown) * 0.08;
    const cx = W / 2, cy = H - 54, r = 16;
    const full = _ringShown > 0.995;
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "rgba(243,231,211,0.12)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    if (full) { ctx.shadowColor = "rgba(232,160,90,0.9)"; ctx.shadowBlur = 12; }
    ctx.strokeStyle = full ? "rgba(240,190,120,0.95)" : "rgba(232,160,90,0.7)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * _ringShown);
    ctx.stroke();
    if (full) {
      ctx.fillStyle = "rgba(240,190,120,0.9)";
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  const P = () => Engine.pointer;
  const px = () => Engine.pointer.x * Engine.W;
  const py = () => Engine.pointer.y * Engine.H;
  const sx = () => Engine.pointer.sx * Engine.W; // posição suavizada — para o que "segue" o dedo
  const sy = () => Engine.pointer.sy * Engine.H;

  // celebração de conclusão: fagulhas douradas subindo devagar + vibração
  function celebrate(x, y) {
    const cores = ["#ffd9a0", "#f3e7d3", "#e8a05a", "#ffe9c4"];
    for (let i = 0; i < 26; i++) {
      Engine.spawn({
        x: x + rand(-30, 30), y: y + rand(-16, 16),
        vx: rand(-70, 70), vy: rand(-150, -30),
        gravity: 110, drag: 0.985,
        life: rand(1.2, 2.4), size: rand(1.8, 4),
        color: cores[Math.floor(rand(0, cores.length))],
        glow: 12, shape: i % 3 ? "circle" : "spark",
      });
    }
    Engine.haptic(24);
  }

  // mensagem de carinho ao concluir uma peça
  function done(msg, x, y) {
    ASMR.chime();
    celebrate(x != null ? x : Engine.W / 2, y != null ? y : Engine.H * 0.5);
    hint(msg + "  ·  toque para recomeçar");
  }

  /* =====================================================================
   *  MENU — o ateliê
   * ===================================================================== */
  const STATIONS = [
    { id: "velas",     nome: "Velas Artesanais",    glyph: "candle",  cor: "#e8a05a" },
    { id: "sabonete",  nome: "Sabonetes Artesanais", glyph: "soap",   cor: "#d98fa8" },
    { id: "papel",     nome: "Corte de Papel",      glyph: "paper",   cor: "#cdbf9a" },
    { id: "madeira",   nome: "Lixar Madeira",       glyph: "wood",    cor: "#c08a50" },
    { id: "selo",      nome: "Selo de Cera",        glyph: "seal",    cor: "#c75b4a" },
    { id: "micangas",  nome: "Miçangas & Cores",    glyph: "beads",   cor: "#7fa6c4" },
    { id: "embalagem", nome: "Ritual de Embalagem", glyph: "box",     cor: "#cda06a" },
  ];

  function drawGlyph(ctx, g, x, y, s, cor) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = cor;
    ctx.fillStyle = cor;
    ctx.lineWidth = s * 0.06;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = cor;
    ctx.shadowBlur = s * 0.25;
    const u = s / 2;
    switch (g) {
      case "candle": {
        ctx.strokeRect(-u * 0.4, -u * 0.2, u * 0.8, u * 1.1);
        ctx.beginPath(); ctx.moveTo(0, -u * 0.2); ctx.lineTo(0, -u * 0.45); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -u * 0.45);
        ctx.quadraticCurveTo(u * 0.18, -u * 0.6, 0, -u * 0.85);
        ctx.quadraticCurveTo(-u * 0.18, -u * 0.6, 0, -u * 0.45);
        ctx.fillStyle = "#ffd27a"; ctx.fill();
        break;
      }
      case "soap": {
        roundRect(ctx, -u * 0.55, -u * 0.35, u * 1.1, u * 0.7, u * 0.18);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(u * 0.18, 0, u * 0.12, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case "paper": {
        ctx.strokeRect(-u * 0.45, -u * 0.6, u * 0.9, u * 1.2);
        ctx.setLineDash([s * 0.05, s * 0.05]);
        ctx.beginPath(); ctx.moveTo(0, -u * 0.6); ctx.lineTo(0, u * 0.6); ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case "wood": {
        roundRect(ctx, -u * 0.6, -u * 0.3, u * 1.2, u * 0.6, u * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-u * 0.45, -u * 0.05); ctx.bezierCurveTo(-u * 0.1, -u * 0.18, u * 0.1, u * 0.05, u * 0.45, -u * 0.02);
        ctx.moveTo(-u * 0.45, u * 0.12); ctx.bezierCurveTo(-u * 0.1, u * 0.02, u * 0.1, u * 0.2, u * 0.45, u * 0.12);
        ctx.stroke();
        break;
      }
      case "seal": {
        ctx.beginPath(); ctx.arc(0, u * 0.1, u * 0.5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, u * 0.1, u * 0.28, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case "beads": {
        const cols = ["#7fa6c4", "#d98fa8", "#e8a05a", "#9ec48a"];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = cols[i];
          ctx.beginPath();
          ctx.arc(Math.cos(i * 1.7) * u * 0.35, Math.sin(i * 2.1) * u * 0.3, u * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case "box": {
        ctx.strokeRect(-u * 0.5, -u * 0.25, u, u * 0.7);
        ctx.beginPath(); ctx.moveTo(-u * 0.5, -u * 0.05); ctx.lineTo(u * 0.5, -u * 0.05); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -u * 0.25); ctx.lineTo(0, u * 0.45); ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  Engine.register("menu", {
    cards: [],
    hover: -1,
    enter(W, H) {
      hint("");
      this.hover = -1;
      this.layout(W, H);
    },
    resize(W, H) { this.layout(W, H); },
    layout(W, H) {
      const n = STATIONS.length;
      const cols = W < 640 ? 2 : (W < 980 ? 3 : 4);
      const rows = Math.ceil(n / cols);
      const cw = Math.min(220, (W - 80) / cols - 20);
      const ch = cw * 0.92;
      const gap = Math.min(28, cw * 0.16);
      const gridW = cols * cw + (cols - 1) * gap;
      const gridH = rows * ch + (rows - 1) * gap;
      const ox = (W - gridW) / 2;
      const oy = (H - gridH) / 2 + H * 0.04;
      this.cards = STATIONS.map((s, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        return {
          ...s,
          x: ox + c * (cw + gap), y: oy + r * (ch + gap), w: cw, h: ch,
          hoverK: 0, press: 0,
        };
      });
    },
    hitCard() {
      const mx = px(), my = py();
      return this.cards.findIndex(c => mx > c.x && mx < c.x + c.w && my > c.y && my < c.y + c.h);
    },
    onMove() {
      const h = this.hitCard();
      if (h !== this.hover && h >= 0) ASMR.tick(Engine.pointer.x);
      this.hover = h;
    },
    onDown() {
      const i = this.hitCard();
      if (i >= 0) {
        const c = this.cards[i];
        c.press = 1;
        ASMR.click(Engine.pointer.x, 1.2);
        Engine.haptic(12);
        Engine.go(c.id);
      }
    },
    cue() {
      return { cursor: this.hover >= 0 ? "pointer" : "default" };
    },
    update(dt) {
      this.cards.forEach((c, i) => {
        c.hoverK = Engine.approach(c.hoverK, i === this.hover ? 1 : 0, 10, dt);
        c.press = Engine.approach(c.press, 0, 7, dt);
      });
    },
    draw(ctx, W, H, t) {
      const st = Engine.sceneTime;
      const titleA = easeOut(st * 1.6);
      Engine.text("Ateliê Essenzia", W / 2, H * 0.13 - (1 - titleA) * 14, {
        size: Math.min(54, W * 0.07), weight: 600, glow: 24, letter: 2, alpha: titleA,
      });
      Engine.text("escolha um cantinho do ateliê", W / 2, H * 0.13 + 44, {
        size: 18, color: "rgba(243,231,211,0.5)", letter: 3, alpha: easeOut(st * 1.6 - 0.15),
      });
      this.cards.forEach((c, i) => {
        // entrada em cascata: cada cartão surge um pouquinho depois do anterior
        const ap = easeOut(st * 2.2 - i * 0.07);
        if (ap <= 0) return;
        const bob = Math.sin(t * 1.1 + i * 0.9) * 2;             // respiração ociosa
        const lift = c.hoverK * 8;
        const scale = (0.96 + ap * 0.04) * (1 + c.hoverK * 0.03 - c.press * 0.05);
        const cx = c.x + c.w / 2, cy = c.y + c.h / 2 + (1 - ap) * 26 + bob - lift;
        ctx.save();
        ctx.globalAlpha = ap;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-c.w / 2, -c.h / 2);
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 16 + c.hoverK * 14;
        ctx.shadowOffsetY = 8 + c.hoverK * 6;
        const g = ctx.createLinearGradient(0, 0, 0, c.h);
        g.addColorStop(0, c.hoverK > 0.5 ? "#3a2a18" : "#2c2012");
        g.addColorStop(1, c.hoverK > 0.5 ? "#241a0e" : "#1c140b");
        ctx.fillStyle = g;
        roundRect(ctx, 0, 0, c.w, c.h, 18);
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = 1;
        const br = parseInt(c.cor.slice(1, 3), 16), bg = parseInt(c.cor.slice(3, 5), 16), bb = parseInt(c.cor.slice(5, 7), 16);
        ctx.strokeStyle = `rgba(${br},${bg},${bb},${0.08 + c.hoverK * 0.45})`;
        roundRect(ctx, 0, 0, c.w, c.h, 18);
        ctx.stroke();
        drawGlyph(ctx, c.glyph, c.w / 2, c.h * 0.42, c.w * (0.42 + c.hoverK * 0.02), c.cor);
        Engine.text(c.nome, c.w / 2, c.h * 0.82, {
          size: Math.min(19, c.w * 0.11),
          color: `rgba(243,231,211,${0.78 + c.hoverK * 0.22})`,
        });
        ctx.restore();
      });
      Affordance.render(ctx, this.cue(), t);
    },
  });

  /* helper de molde reutilizável (velas e sabonete) */
  function drawMold(ctx, x, y, w, h, fill, color) {
    ctx.save();
    // recipiente
    ctx.fillStyle = "rgba(20,14,8,0.6)";
    roundRect(ctx, x - 6, y - 6, w + 12, h + 12, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(243,231,211,0.15)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    // conteúdo
    const fh = h * clamp(fill, 0, 1);
    if (fh > 1) {
      ctx.save();
      roundRect(ctx, x, y, w, h, 10);
      ctx.clip();
      const g = ctx.createLinearGradient(0, y + h - fh, 0, y + h);
      g.addColorStop(0, color);
      g.addColorStop(1, shade(color, -0.25));
      ctx.fillStyle = g;
      ctx.fillRect(x, y + h - fh, w, fh);
      // brilho na superfície do líquido
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(x, y + h - fh, w, 3);
      ctx.restore();
    }
    ctx.restore();
  }

  // aceita "#rrggbb" ou "rgb(r,g,b)" — as cores circulam nos dois formatos
  function parseColor(c) {
    if (c[0] === "#") {
      const h = c.slice(1);
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    const m = c.match(/(\d+)\D+(\d+)\D+(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
  }

  function shade(color, amt) {
    const [r, g, b] = parseColor(color);
    const f = (v) => clamp(Math.round(v + v * amt), 0, 255);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  /* =====================================================================
   *  VELAS ARTESANAIS
   * ===================================================================== */
  const VELA_AROMAS = [
    { nome: "Lavanda", cor: "#b9a3d6" },
    { nome: "Rosa", cor: "#e3a7bd" },
    { nome: "Baunilha", cor: "#e8c98a" },
    { nome: "Mel & Âmbar", cor: "#e0a05a" },
  ];

  Engine.register("velas", {
    enter(W, H) {
      this.step = 0;
      this.melt = 0;
      this.fill = 0;
      this.petals = 0;
      this.voice = null;
      this.complete = false;
      this.flame = 0;
      this.acted = false; // o usuário já fez o gesto deste passo? (esconde a mãozinha-guia)
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      this.snapK = 0;
      const a = VELA_AROMAS[Math.floor(rand(0, VELA_AROMAS.length))];
      this.aroma = a.nome;
      this.scent = a.cor;
      const g = this.geom(W, H);
      const wx = g.jar.x + g.jar.w + 70, wy = g.jar.y + g.jar.h * 0.5;
      this.wick = { x: wx, y: wy, tx: wx, ty: wy, placed: false, drag: false };
      this.stepHint();
    },
    exit() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    geom(W, H) {
      // objetos ~17% maiores que o original — feedback de checkpoint: "ícones muito pequenos"
      const jw = Math.min(175, W * 0.30), jh = jw * 1.35;
      const jx = W / 2 - jw / 2, jy = H * 0.40;
      const pw = jw * 1.25, ph = pw * 0.62;
      const px0 = W / 2 - pw / 2, py0 = H * 0.14;
      return {
        pot: { x: px0, y: py0, w: pw, h: ph },
        jar: { x: jx, y: jy, w: jw, h: jh },
      };
    },
    stepHint() {
      const msgs = [
        "Passo 1 de 4 · Derreta a cera — deslize para os lados sobre a panela.",
        "Passo 2 de 4 · Despeje — segure o dedo sobre o pote de vidro.",
        "Passo 3 de 4 · Pavio — arraste o pavio até o centro do pote.",
        "Passo 4 de 4 · Perfume — toque a superfície para soltar pétalas.",
      ];
      hint(msgs[this.step]);
    },
    onDown() {
      if (this.complete) { this.enter(Engine.W, Engine.H); return; }
      this.contact = 1; this.contactX = px(); this.contactY = py();
      if (this.step === 0) {
        this.voice = ASMR.voice({ type: "lowpass", freq: 620, max: 0.4, color: 1.5 });
      } else if (this.step === 1) {
        this.voice = ASMR.voice({ type: "bandpass", freq: 900, q: 1.2, max: 0.45, color: 0.6 });
      } else if (this.step === 2) {
        if (dist(px(), py(), this.wick.x, this.wick.y) < 95) {
          this.wick.drag = true;
          this.acted = true;
          ASMR.tick(Engine.pointer.x);
        }
      } else if (this.step === 3) {
        this.sprinkle();
      }
    },
    onMove() {
      if (this.step === 2 && this.wick.drag) { this.wick.tx = px(); this.wick.ty = py(); }
    },
    onUp() {
      if (this.voice) { this.voice.stop(); this.voice = null; }
      const g = this.geom(Engine.W, Engine.H);
      if (this.step === 2 && this.wick.drag) {
        this.wick.drag = false;
        const cx = g.jar.x + g.jar.w / 2, cy = g.jar.y + 22;
        if (dist(this.wick.x, this.wick.y, cx, cy) < 90) {
          this.wick.tx = cx; this.wick.ty = cy; this.wick.placed = true;
          ASMR.click(Engine.pointer.x, 0.9);
          Engine.haptic(14);
          this.step = 3; this.acted = false; this.stepHint();
        } else {
          // volta com gentileza para a posição inicial (sem punição)
          this.wick.tx = g.jar.x + g.jar.w + 70; this.wick.ty = g.jar.y + g.jar.h * 0.5;
        }
      }
    },
    sprinkle() {
      this.acted = true;
      ASMR.crinkle(Engine.pointer.x, 0.6);
      const cores = ["#e3a7bd", "#e8c98a", "#b9a3d6", "#c0d98f"];
      for (let i = 0; i < 6; i++) {
        Engine.spawn({
          x: px() + rand(-20, 20), y: py(),
          vx: rand(-22, 22), vy: rand(20, 60), gravity: 200, drag: 0.98,
          life: rand(1.4, 2.2), size: rand(4, 8),
          color: cores[Math.floor(rand(0, cores.length))],
          shape: "rect", rot: rand(0, 6), vrot: rand(-3, 3),
        });
      }
      this.petals++;
      if (this.petals >= 7 && !this.complete) {
        this.complete = true;
        const g = this.geom(Engine.W, Engine.H);
        done("Sua vela de " + this.aroma + " está pronta.", g.jar.x + g.jar.w / 2, g.jar.y);
      }
    },
    update(dt, p, t) {
      const g = this.geom(Engine.W, Engine.H);
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      // o pavio segue o dedo com um pouquinho de inércia — sensação de peso
      this.wick.x = Engine.approach(this.wick.x, this.wick.tx, this.wick.drag ? 22 : 10, dt);
      this.wick.y = Engine.approach(this.wick.y, this.wick.ty, this.wick.drag ? 22 : 10, dt);
      if (this.step === 0 && p.down && this.voice) {
        const pot = g.pot;
        const inPot = px() > pot.x - 30 && px() < pot.x + pot.w + 30 && py() > pot.y - 20 && py() < pot.y + pot.h + 40;
        const intensity = inPot ? clamp(p.speed * 1.4, 0, 1) : 0;
        this.voice.update(p.x, intensity * 0.7);
        if (inPot && p.speed > 0.05) {
          this.acted = true;
          this.melt = clamp(this.melt + p.speed * dt * 0.5, 0, 1);
          if (Math.random() < p.speed * dt * 2) ASMR.bubble(p.x);
        }
        if (this.melt >= 1) { this.step = 1; this.fill = 0; this.acted = false; this.stepHint(); }
      }
      if (this.step === 1 && p.down && this.voice) {
        this.acted = true;
        this.voice.update(p.x, 0.7);
        this.fill = clamp(this.fill + dt * 0.28, 0, 1);
        // fio de cera escorrendo do bico da panela até o pote
        const sx0 = g.pot.x + g.pot.w / 2;
        Engine.spawn({
          x: sx0 + rand(-5, 5), y: g.pot.y + g.pot.h,
          vx: 0, vy: rand(220, 320), gravity: 120, drag: 1,
          life: 0.6, size: rand(3, 5), color: this.scent, glow: 6,
        });
        if (this.fill >= 1) { this.step = 2; this.acted = false; this.stepHint(); }
      }
      if (this.complete) this.flame = clamp(this.flame + dt * 1.2, 0, 1);
      // alvo de encaixe do pavio — mesmo ponto usado pela regra de aceitação em onUp()
      const wickTargetX = g.jar.x + g.jar.w / 2, wickTargetY = g.jar.y + 22;
      if (this.wick.drag) {
        this.snapK = clamp(1 - dist(this.wick.x, this.wick.y, wickTargetX, wickTargetY) / 90, 0, 1);
      } else {
        this.snapK = Engine.approach(this.snapK, 0, 6, dt);
      }
      // cursor: grab/grabbing/pointer perto do objeto interativo do passo atual — nunca em draw()
      if (p.down) {
        this.cursorName = "grabbing";
      } else if (this.step === 0) {
        const pot = g.pot;
        const near = px() > pot.x - 30 && px() < pot.x + pot.w + 30 && py() > pot.y - 30 && py() < pot.y + pot.h + 30;
        this.cursorName = p.moved && near ? "grab" : "default";
      } else if (this.step === 2) {
        this.cursorName = p.moved && dist(px(), py(), this.wick.x, this.wick.y) < 95 ? "grab" : "default";
      } else if (this.step === 1 || this.step === 3) {
        const jar = g.jar;
        const near = px() > jar.x - 40 && px() < jar.x + jar.w + 40 && py() > jar.y - 40 && py() < jar.y + jar.h + 40;
        this.cursorName = p.moved && near ? "pointer" : "default";
      } else {
        this.cursorName = "default";
      }
    },
    draw(ctx, W, H, t) {
      const g = this.geom(W, H);
      const wax = this.scent;

      // ---- panela de cera (sempre visível; é a fonte) ----
      if (this.step === 0) {
        const ccx = g.pot.x + g.pot.w / 2, ccy = g.pot.y + g.pot.h / 2;
        const s = Affordance.breathe(t, 0, 0.012) * Affordance.contactScale(this.contact);
        ctx.save();
        ctx.translate(ccx, ccy);
        ctx.scale(s, s);
        ctx.translate(-ccx, -ccy);
        drawCauldron(ctx, g.pot, this.melt, wax);
        ctx.restore();
      } else {
        drawCauldron(ctx, g.pot, 1, wax);
      }

      // ---- jorro de cera ao despejar (com leve ondulação viva) ----
      if (this.step === 1 && P().down) {
        const sx0 = g.pot.x + g.pot.w / 2;
        ctx.save();
        ctx.strokeStyle = wax; ctx.globalAlpha = 0.85; ctx.lineCap = "round";
        ctx.shadowColor = wax; ctx.shadowBlur = 10;
        ctx.lineWidth = 5 + Math.sin(t * 9) * 1.2;
        ctx.beginPath();
        ctx.moveTo(sx0, g.pot.y + g.pot.h - 6);
        ctx.quadraticCurveTo(sx0 + Math.sin(t * 5) * 3, (g.pot.y + g.pot.h + g.jar.y) / 2, sx0, g.jar.y + 12);
        ctx.stroke();
        ctx.restore();
      }

      // ---- pote de vidro (a vela) ----
      if (this.step === 1) {
        const jcx = g.jar.x + g.jar.w / 2, jcy = g.jar.y + g.jar.h / 2;
        const js = Affordance.breathe(t, 1.2, 0.010) * Affordance.contactScale(this.contact);
        ctx.save();
        ctx.translate(jcx, jcy);
        ctx.scale(js, js);
        ctx.translate(-jcx, -jcy);
        drawGlassJar(ctx, g.jar, this.fill, wax);
        ctx.restore();
      } else {
        drawGlassJar(ctx, g.jar, this.step >= 1 ? this.fill : 0, wax);
      }

      // ---- pavio ----
      if (this.step >= 2) {
        const wickSway = (!this.wick.drag && !this.wick.placed) ? Affordance.sway(t, 0.5, 2.5) : 0;
        drawWick(ctx, this.wick.x + wickSway, this.wick.y, this.wick.placed ? g.jar.h * this.fill - 30 : 70, this.wick.drag);
      }

      // ---- chama acesa ao concluir ----
      if (this.complete && this.flame > 0) {
        const cx = g.jar.x + g.jar.w / 2, cy = g.jar.y + 20;
        drawFlame(ctx, cx, cy, this.flame, t);
      }

      // rótulo do aroma
      Engine.text("vela de " + this.aroma, g.jar.x + g.jar.w / 2, g.jar.y + g.jar.h + 30, {
        size: 17, color: "rgba(243,231,211,0.45)", letter: 1,
      });

      progressRing(ctx, W, H, this.complete ? 1 : (this.step + (this.step === 0 ? this.melt : this.step === 1 ? this.fill : 0)) / 4);
      Affordance.render(ctx, this.cue(), t);
    },
    overlay(ctx, W, H, t) {
      if (this.complete || this.acted) return;
      const g = this.geom(W, H);
      // mãozinha-guia: demonstra o gesto do passo atual
      if (this.step === 0) {
        const cx = g.pot.x + g.pot.w / 2, cy = g.pot.y + g.pot.h * 0.5;
        const x = cx + Math.sin(t * 3) * g.pot.w * 0.32;
        guideHand(ctx, x, cy, t, "↔");
      } else if (this.step === 1) {
        const cx = g.jar.x + g.jar.w / 2, cy = g.jar.y + 30;
        guideHand(ctx, cx, cy, t, "segure", true);
      } else if (this.step === 2) {
        const cx = g.jar.x + g.jar.w / 2, cy = g.jar.y + 22;
        const k = (Math.sin(t * 1.6) + 1) / 2;
        const x = lerp(this.wick.x, cx, k), y = lerp(this.wick.y, cy, k);
        guideHand(ctx, x, y, t, "arraste");
      } else if (this.step === 3) {
        const cx = g.jar.x + g.jar.w / 2 + Math.sin(t * 2) * g.jar.w * 0.25;
        guideHand(ctx, cx, g.jar.y + 34, t, "toque", true);
      }
    },
    cue() {
      if (this.complete) return { cursor: "pointer" };
      const g = this.geom(Engine.W, Engine.H);
      let cues;
      if (this.step === 0 && !this.acted) {
        const cx = g.pot.x + g.pot.w / 2, cy = g.pot.y + g.pot.h / 2;
        cues = [{
          kind: "invitation", x: cx, y: cy, r: g.pot.w * 0.45,
          gesture: "drag", dir: { x: 1, y: 0 }, cursor: this.cursorName,
        }];
      } else if (this.step === 1 && !this.acted) {
        cues = [{
          kind: "invitation", x: g.jar.x + g.jar.w / 2, y: g.jar.y + 30, r: 44,
          gesture: "hold", cursor: this.cursorName,
        }];
      } else if (this.step === 2) {
        const tx = g.jar.x + g.jar.w / 2, ty = g.jar.y + 22;
        const dx = tx - this.wick.x, dy = ty - this.wick.y;
        const len = Math.hypot(dx, dy) || 1;
        cues = [
          {
            kind: "invitation", x: this.wick.x, y: this.wick.y, r: 40,
            gesture: "drag", dir: { x: dx / len, y: dy / len }, cursor: this.cursorName,
          },
          { kind: "snap", x: tx, y: ty, intensity: this.snapK },
        ];
      } else if (this.step === 3 && this.petals < 1) {
        cues = [{
          kind: "invitation", x: g.jar.x + g.jar.w / 2, y: g.jar.y + 34, r: 38,
          gesture: "tap", cursor: this.cursorName,
        }];
      } else {
        cues = [{ cursor: this.cursorName }];
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
  });

  /* ---- arte vetorial da estação de velas ---- */
  function drawCauldron(ctx, r, melt, wax) {
    ctx.save();
    // corpo da panela (metal escuro com brilho)
    const body = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    body.addColorStop(0, "#4a4138");
    body.addColorStop(1, "#241f1a");
    ctx.fillStyle = body;
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16);
    ctx.fill();
    ctx.shadowColor = "transparent";
    // conteúdo: cera derretendo
    ctx.save();
    roundRect(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 12); ctx.clip();
    // poça líquida ao fundo
    const liq = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    liq.addColorStop(0, lerp01Color("#7a6a55", wax, melt));
    liq.addColorStop(1, shade(lerp01Color("#7a6a55", wax, melt), -0.25));
    ctx.fillStyle = liq;
    ctx.fillRect(r.x, r.y + 6, r.w, r.h);
    // pedaços sólidos que somem ao derreter
    const chunks = Math.round((1 - melt) * 5);
    for (let i = 0; i < chunks; i++) {
      ctx.save();
      ctx.translate(r.x + 30 + (i % 3) * (r.w - 60) / 2, r.y + r.h - 30 - Math.floor(i / 3) * 30);
      ctx.rotate((i * 1.3) % 1 - 0.5);
      const cg = ctx.createLinearGradient(-18, -14, 18, 14);
      cg.addColorStop(0, "#efe0c4"); cg.addColorStop(1, "#d8c3a0");
      ctx.fillStyle = cg;
      roundRect(ctx, -18, -14, 36, 28, 7); ctx.fill();
      ctx.restore();
    }
    // brilho na superfície líquida
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(r.x, r.y + 6, r.w, 4);
    ctx.restore();
    // borda/aro da panela
    ctx.strokeStyle = "#6a5d4e"; ctx.lineWidth = 4;
    roundRect(ctx, r.x, r.y, r.w, r.h, 16); ctx.stroke();
    // alças laterais
    ctx.lineWidth = 6; ctx.strokeStyle = "#3a322a";
    ctx.beginPath(); ctx.arc(r.x, r.y + r.h * 0.3, 14, Math.PI * 0.4, Math.PI * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(r.x + r.w, r.y + r.h * 0.3, 14, -Math.PI * 0.6, Math.PI * 0.6); ctx.stroke();
    ctx.restore();
  }

  function drawGlassJar(ctx, r, fill, wax) {
    ctx.save();
    // sombra
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 26; ctx.shadowOffsetY = 14;
    // vidro de fundo
    ctx.fillStyle = "rgba(243,231,211,0.06)";
    roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
    ctx.shadowColor = "transparent";
    // cera dentro
    const fh = (r.h - 16) * clamp(fill, 0, 1);
    if (fh > 1) {
      ctx.save();
      roundRect(ctx, r.x + 6, r.y + 8, r.w - 12, r.h - 16, 12); ctx.clip();
      const wg = ctx.createLinearGradient(0, r.y + r.h - fh, 0, r.y + r.h);
      wg.addColorStop(0, shade(wax, 0.12));
      wg.addColorStop(1, shade(wax, -0.22));
      ctx.fillStyle = wg;
      ctx.fillRect(r.x + 6, r.y + r.h - 8 - fh, r.w - 12, fh);
      // menisco brilhante na superfície
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(r.x + 6, r.y + r.h - 8 - fh, r.w - 12, 3);
      ctx.restore();
    }
    // paredes de vidro com reflexos
    ctx.strokeStyle = "rgba(243,231,211,0.35)"; ctx.lineWidth = 2.5;
    roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.stroke();
    // reflexo vertical suave
    const sh = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    sh.addColorStop(0, "rgba(255,255,255,0.18)");
    sh.addColorStop(0.18, "rgba(255,255,255,0.02)");
    sh.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sh;
    roundRect(ctx, r.x + 4, r.y + 6, r.w - 8, r.h - 12, 14); ctx.fill();
    ctx.restore();
  }

  function drawWick(ctx, x, yTop, len, lifted) {
    ctx.save();
    if (lifted) { ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 12; }
    // pavio
    ctx.strokeStyle = "#4a3320"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, yTop); ctx.lineTo(x, yTop + Math.max(20, len)); ctx.stroke();
    // base metálica
    ctx.fillStyle = "#c9b48a";
    ctx.beginPath(); ctx.ellipse(x, yTop + Math.max(20, len), 8, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawFlame(ctx, cx, cy, f, t) {
    const fl = f * (0.9 + 0.1 * Math.sin(t * 12));
    ctx.save();
    const grd = ctx.createRadialGradient(cx, cy - 10, 0, cx, cy - 10, 70 * fl);
    grd.addColorStop(0, "rgba(255,225,150,0.95)");
    grd.addColorStop(0.45, "rgba(255,150,60,0.4)");
    grd.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(cx, cy - 10, 70 * fl, 0, Math.PI * 2); ctx.fill();
    // corpo da chama
    ctx.fillStyle = "#ffe6a0";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 26 * fl);
    ctx.quadraticCurveTo(cx + 9 * fl, cy - 6, cx, cy + 6);
    ctx.quadraticCurveTo(cx - 9 * fl, cy - 6, cx, cy - 26 * fl);
    ctx.fill();
    // núcleo azulado
    ctx.fillStyle = "rgba(120,160,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8 * fl);
    ctx.quadraticCurveTo(cx + 4 * fl, cy - 2, cx, cy + 4);
    ctx.quadraticCurveTo(cx - 4 * fl, cy - 2, cx, cy - 8 * fl);
    ctx.fill();
    ctx.restore();
  }

  // mãozinha-guia: ponto luminoso pulsante + legenda, demonstrando o gesto
  function guideHand(ctx, x, y, t, label, hold) {
    if (!Affordance.legacyGuide) return;
    const pulse = hold ? (0.6 + 0.4 * Math.sin(t * 4)) : 0.85;
    ctx.save();
    // halo
    ctx.globalAlpha = 0.5 * pulse;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 34);
    grd.addColorStop(0, "rgba(255,245,220,0.9)");
    grd.addColorStop(1, "rgba(255,245,220,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
    // ponta do dedo
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,250,240,0.95)";
    ctx.beginPath(); ctx.arc(x, y, 11 * (hold ? pulse : 1), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke();
    // legenda do gesto
    ctx.globalAlpha = 0.9;
    Engine.text(label, x, y - 34, { size: 18, color: "rgba(255,250,235,0.95)", glow: 10 });
    ctx.restore();
  }

  function lerp01Color(a, b, t) {
    const [ar, ag, ab] = parseColor(a);
    const [br, bg, bb] = parseColor(b);
    return `rgb(${Math.round(lerp(ar, br, t))},${Math.round(lerp(ag, bg, t))},${Math.round(lerp(ab, bb, t))})`;
  }

  /* =====================================================================
   *  SABONETES ARTESANAIS
   * ===================================================================== */
  Engine.register("sabonete", {
    enter(W, H) {
      this.step = 0;
      this.fill = 0;
      this.color = "#f3e7d3";
      this.tint = ["#d98fa8", "#9ec48a", "#7fa6c4", "#e8c07a"][Math.floor(rand(0, 4))];
      this.swirl = 0;
      this.essence = 0;
      this.cuts = 0;
      this.cutAnim = 0;      // linha de corte crescendo suave
      this.swirls = [];
      this.voice = null;
      this.complete = false;
      this._adv = false;
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      hint("Passo 1 de 4 · Despeje a base de glicerina — segure sobre a forma.");
    },
    exit() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    geom(W, H) {
      const mw = Math.min(300, W * 0.7), mh = mw * 0.58;
      return { mx: W / 2 - mw / 2, my: H * 0.42, mw, mh };
    },
    onDown() {
      if (this.complete) { this.enter(Engine.W, Engine.H); return; }
      this.contact = 1; this.contactX = px(); this.contactY = py();
      if (this.step === 0) {
        this.voice = ASMR.voice({ type: "bandpass", freq: 850, q: 1.1, max: 0.45 });
      } else if (this.step === 1) {
        // pingar cor
        ASMR.drop(Engine.pointer.x, rand(0.85, 1.15));
        this.swirls.push({ x: px(), y: py(), r: 8, max: rand(40, 70), age: 0, col: this.tint });
        this.voice = ASMR.voice({ type: "lowpass", freq: 500, max: 0.25 });
      } else if (this.step === 2) {
        ASMR.drop(Engine.pointer.x, 1.3);
        this.essence++;
        for (let i = 0; i < 5; i++) Engine.spawn({
          x: px(), y: py(), vx: rand(-30, 30), vy: rand(-10, 20), gravity: 60,
          life: 1, size: rand(2, 4), color: "rgba(255,245,220,0.9)", glow: 8,
        });
        if (this.essence >= 5) { this.step = 3; hint("Passo 4 de 4 · Corte as barras — deslize o cortador sobre o sabonete."); }
      } else if (this.step === 3) {
        this.voice = ASMR.voice({ type: "highpass", freq: 1400, max: 0.4, color: 1 });
        this.cutStartX = px();
      }
    },
    onMove() {
      if (this.step === 1 && Engine.pointer.down) {
        this.swirl = clamp(this.swirl + Engine.pointer.speed * 0.016, 0, 1);
        this.swirls.push({ x: px(), y: py(), r: 4, max: rand(12, 24), age: 0, col: this.tint, trail: true });
        if (this.voice) this.voice.update(Engine.pointer.x, clamp(Engine.pointer.speed, 0, 1) * 0.6);
      }
    },
    onUp() {
      if (this.step === 1 && this.swirl >= 1 && !this._adv) {
        this._adv = true; this.step = 2;
        hint("Passo 3 de 4 · Perfume com gotas de essência — toque o sabonete.");
      }
      if (this.step === 3 && this.voice) {
        const moved = Math.abs(px() - (this.cutStartX || px()));
        if (moved > Engine.W * 0.3) {
          this.cuts++;
          this.cutAnim = 0;
          ASMR.crinkle(Engine.pointer.x, 0.5);
          Engine.haptic(12);
          if (this.cuts >= 3 && !this.complete) {
            this.complete = true;
            const g = this.geom(Engine.W, Engine.H);
            done("Seus sabonetes estão prontos.", g.mx + g.mw / 2, g.my);
          } else hint("Mais um corte suave...");
        }
      }
      if (this.voice) { this.voice.stop(); this.voice = null; }
    },
    update(dt, p, t) {
      const g = this.geom(Engine.W, Engine.H);
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      this.cutAnim = clamp(this.cutAnim + dt * 3, 0, 1);
      if (this.step === 0 && p.down && this.voice) {
        this.voice.update(p.x, 0.7);
        this.fill = clamp(this.fill + dt * 0.3, 0, 1);
        Engine.spawn({ x: g.mx + g.mw / 2 + rand(-10, 10), y: g.my - 30, vx: 0, vy: rand(160, 240), gravity: 100, life: 0.45, size: rand(2.5, 4), color: "rgba(243,231,211,0.7)", glow: 4 });
        if (this.fill >= 1) { this.step = 1; hint("Passo 2 de 4 · Pingue a cor e desenhe redemoinhos com o dedo."); }
      }
      if (this.step === 3 && p.down && this.voice) {
        this.voice.update(p.x, clamp(p.speed, 0, 1) * 0.8);
      }
      for (let i = this.swirls.length - 1; i >= 0; i--) {
        const s = this.swirls[i];
        s.age += dt;
        s.r = lerp(s.r, s.max, 0.06);
        if (s.trail && s.age > 1.5) this.swirls.splice(i, 1);
      }
      // cursor: grab/grabbing/pointer perto da forma — nunca decidido em draw()
      if (this.complete) {
        this.cursorName = "pointer";
      } else if (p.down) {
        this.cursorName = "grabbing";
      } else {
        const near = p.moved && px() > g.mx - 40 && px() < g.mx + g.mw + 40 && py() > g.my - 40 && py() < g.my + g.mh + 40;
        if (near) this.cursorName = (this.step === 0 || this.step === 2) ? "pointer" : "grab";
        else this.cursorName = "default";
      }
    },
    draw(ctx, W, H, t) {
      const g = this.geom(W, H);
      const cx = g.mx + g.mw / 2, cy = g.my + g.mh / 2;
      const s = this.complete ? 1 : Affordance.breathe(t, 0.4, 0.012) * Affordance.contactScale(this.contact);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      drawMold(ctx, g.mx, g.my, g.mw, g.mh, this.fill, this.color);
      // redemoinhos de cor dentro da forma
      if (this.fill > 0.1) {
        ctx.save();
        roundRect(ctx, g.mx, g.my, g.mw, g.mh, 10); ctx.clip();
        const top = g.my + g.mh - g.mh * this.fill;
        for (const swirl of this.swirls) {
          ctx.globalAlpha = 0.5;
          const grd = ctx.createRadialGradient(swirl.x, Math.max(swirl.y, top), 0, swirl.x, Math.max(swirl.y, top), swirl.r);
          grd.addColorStop(0, swirl.col);
          grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(swirl.x, Math.max(swirl.y, top + 4), swirl.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      // linhas de corte — a última cresce animada
      if (this.step >= 3) {
        ctx.save();
        ctx.strokeStyle = "rgba(20,14,8,0.5)"; ctx.lineWidth = 3; ctx.lineCap = "round";
        for (let i = 1; i <= this.cuts; i++) {
          const x = g.mx + (g.mw / 4) * i;
          const grow = i === this.cuts ? easeOut(this.cutAnim) : 1;
          ctx.beginPath(); ctx.moveTo(x, g.my); ctx.lineTo(x, g.my + g.mh * grow); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      const prog = this.complete ? 1 : (this.step + (this.step === 0 ? this.fill : this.step === 1 ? this.swirl : this.step === 2 ? this.essence / 5 : this.cuts / 3)) / 4;
      progressRing(ctx, W, H, prog);
      Affordance.render(ctx, this.cue(), t);
    },
    cue() {
      if (this.complete) return { cursor: "pointer" };
      const g = this.geom(Engine.W, Engine.H);
      const cx = g.mx + g.mw / 2, cy = g.my + g.mh / 2;
      let cues;
      if (this.step === 0 && this.fill < 0.05) {
        cues = [{
          kind: "invitation", x: cx, y: g.my - 4, r: 46,
          gesture: "hold", cursor: this.cursorName,
        }];
      } else if (this.step === 1 && this.swirl < 0.05) {
        cues = [{
          kind: "invitation", x: cx, y: cy, r: g.mw * 0.3,
          gesture: "orbit", cursor: this.cursorName,
        }];
      } else if (this.step === 2 && this.essence < 1) {
        cues = [{
          kind: "invitation", x: cx, y: cy, r: 40,
          gesture: "tap", cursor: this.cursorName,
        }];
      } else if (this.step === 3 && this.cuts < 1) {
        cues = [{
          kind: "invitation", x: g.mx + g.mw * 0.25, y: cy, r: 44,
          gesture: "drag", dir: { x: 1, y: 0 }, cursor: this.cursorName,
        }];
      } else {
        cues = [{ cursor: this.cursorName }];
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
    overlay(ctx, W, H, t) {
      if (Engine.pointer.down || this.complete) return;
      const g = this.geom(W, H);
      const cx = g.mx + g.mw / 2, cy = g.my + g.mh / 2;
      if (this.step === 0 && this.fill < 0.05) guideHand(ctx, cx, g.my - 4, t, "segure", true);
      else if (this.step === 1 && this.swirl < 0.05) guideHand(ctx, cx + Math.cos(t * 2) * g.mw * 0.18, cy + Math.sin(t * 2) * g.mh * 0.25, t, "gire");
      else if (this.step === 2 && this.essence < 1) guideHand(ctx, cx + Math.sin(t * 2) * 40, cy, t, "toque", true);
      else if (this.step === 3 && this.cuts < 1) { const k = (Math.sin(t * 1.6) + 1) / 2; guideHand(ctx, g.mx + 24 + k * (g.mw - 48), cy, t, "deslize"); }
    },
  });

  /* =====================================================================
   *  CORTE DE PAPEL
   * ===================================================================== */
  Engine.register("papel", {
    enter(W, H) {
      this.newSheet(W, H);
      this.voice = null;
      // o cursor e o toque são estado de sessão, não de folha — ficam em enter(), não em newSheet()
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      hint("Siga a linha pontilhada com a tesoura, de cima a baixo.");
    },
    exit() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    newSheet(W, H) {
      this.cut = 0;
      this.sep = 0;
      this.tone = ["#cdbf9a", "#e8d8b8", "#d8c0a0", "#c8b890"][Math.floor(rand(0, 4))];
      this.guideX = W / 2 + rand(-W * 0.05, W * 0.05);
      this.done = false;
      this.cutting = 0;   // 0..1: tesoura "ativa" (anima a abertura das lâminas)
    },
    geom(W, H) { return { x: W / 2 - Math.min(150, W * 0.4), y: H * 0.25, w: Math.min(300, W * 0.8), h: H * 0.5 }; },
    onDown() {
      const g = this.geom(Engine.W, Engine.H);
      if (this.done) { this.newSheet(Engine.W, Engine.H); hint("Outra folha, outra textura."); return; }
      this.contact = 1; this.contactX = px(); this.contactY = py();
      if (Math.abs(px() - this.guideX) < 50 && py() < g.y + this.cut * g.h + 60) {
        this.voice = ASMR.voice({ type: "highpass", freq: 2200, max: 0.5, color: 1.2, reverbSend: 0.3 });
      }
    },
    onMove(p) {
      const g = this.geom(Engine.W, Engine.H);
      if (p.down && this.voice) {
        const targetCut = clamp((py() - g.y) / g.h, 0, 1);
        if (targetCut > this.cut && Math.abs(px() - this.guideX) < 65) {
          this.cut = targetCut;
          this.voice.update(p.x, clamp(p.speed, 0, 1) * 0.9 + 0.1);
          if (Math.random() < 0.3) ASMR.click(p.x, 2 + Math.random());
          // farelos de papel
          if (Math.random() < 0.4) Engine.spawn({ x: this.guideX, y: py(), vx: rand(-30, 30), vy: rand(10, 40), gravity: 80, life: 1.2, size: rand(2, 4), color: this.tone, shape: "rect", rot: rand(0, 6), vrot: rand(-4, 4) });
        } else {
          this.voice.update(p.x, 0.05);
        }
        if (this.cut >= 0.98 && !this.done) {
          this.done = true;
          ASMR.crinkle(p.x, 1.2);
          done("Corte perfeito.", this.guideX, g.y + g.h / 2);
        }
      }
    },
    onUp() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    update(dt, p) {
      const g = this.geom(Engine.W, Engine.H);
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      if (this.done) this.sep = Engine.approach(this.sep, 44, 4, dt);
      this.cutting = Engine.approach(this.cutting, p.down && this.voice ? 1 : 0, 10, dt);
      // cursor: grab enquanto perto da linha-guia, dentro da faixa vertical da folha
      if (this.done) {
        this.cursorName = "pointer";
      } else if (p.down) {
        this.cursorName = "grabbing";
      } else {
        const near = p.moved && Math.abs(px() - this.guideX) < 65 && py() > g.y - 20 && py() < g.y + g.h + 20;
        this.cursorName = near ? "grab" : "default";
      }
    },
    draw(ctx, W, H, t) {
      const g = this.geom(W, H);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10;
      const grd = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
      grd.addColorStop(0, shade(this.tone, 0.08));
      grd.addColorStop(1, shade(this.tone, -0.12));
      ctx.fillStyle = grd;
      const splitTop = g.y + g.h * this.cut;
      // parte ainda inteira (abaixo do corte)
      ctx.fillRect(g.x, splitTop, g.w, g.y + g.h - splitTop);
      // parte cortada: dois pedaços que se afastam suavemente ao concluir
      ctx.fillRect(g.x - this.sep, g.y, this.guideX - g.x, splitTop - g.y);
      ctx.fillRect(this.guideX + this.sep, g.y, g.x + g.w - this.guideX, splitTop - g.y);
      ctx.restore();
      // textura de fibras sutil
      ctx.save();
      ctx.globalAlpha = 0.06; ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const yy = g.y + (i / 8) * g.h; ctx.beginPath(); ctx.moveTo(g.x, yy); ctx.lineTo(g.x + g.w, yy); ctx.stroke(); }
      ctx.restore();
      // linha-guia pontilhada
      ctx.save();
      ctx.strokeStyle = "rgba(232,160,90,0.55)"; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(this.guideX, splitTop); ctx.lineTo(this.guideX, g.y + g.h); ctx.stroke();
      ctx.restore();
      // a tesourinha na ponta do corte — flutua de leve em repouso, firma durante o corte
      if (!this.done) {
        const bobY = this.cutting < 0.05 ? Affordance.bob(t, 0, 3) : 0;
        drawScissors(ctx, this.guideX, splitTop + bobY, t, this.cutting);
      }
      progressRing(ctx, W, H, this.cut);
      Affordance.render(ctx, this.cue(), t);
    },
    cue() {
      const g = this.geom(Engine.W, Engine.H);
      let cues;
      if (this.done) {
        cues = [{ cursor: this.cursorName }];
      } else {
        cues = [{ kind: "snap", x: this.guideX, y: g.y + g.h, r: 64, intensity: this.cut }];
        if (this.cut < 0.05) {
          cues.push({
            kind: "invitation", x: this.guideX, y: g.y + 26, r: 44,
            gesture: "drag", dir: { x: 0, y: 1 }, cursor: this.cursorName,
          });
        } else {
          cues.push({ cursor: this.cursorName });
        }
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
    overlay(ctx, W, H, t) {
      if (Engine.pointer.down || this.done || this.cut > 0.05) return;
      const g = this.geom(W, H);
      const k = (Math.sin(t * 1.6) + 1) / 2;
      guideHand(ctx, this.guideX, g.y + 18 + k * 44, t, "siga ↓");
    },
  });

  // tesoura estilizada apontando para baixo; as lâminas abrem/fecham ao cortar
  function drawScissors(ctx, x, y, t, active) {
    const open = 0.18 + active * (0.22 + 0.18 * Math.sin(t * 14));
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.55 + active * 0.45;
    ctx.strokeStyle = "#d8cfc0";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8;
    // lâminas (para baixo, na direção do corte)
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(open) * 30, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-Math.sin(open) * 30, 34); ctx.stroke();
    // parafuso
    ctx.fillStyle = "#b8ae9e";
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    // cabos (para cima)
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#a0774a";
    ctx.beginPath(); ctx.ellipse(Math.sin(open) * 12, -22, 7, 12, Math.sin(open) * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-Math.sin(open) * 12, -22, 7, 12, -Math.sin(open) * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  /* =====================================================================
   *  LIXAR MADEIRA
   * ===================================================================== */
  Engine.register("madeira", {
    enter(W, H) {
      this.newPlank();
      this.voice = null;
      this.sanding = 0;
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      hint("Deslize a lixa para frente e para trás sobre a madeira.");
    },
    exit() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    newPlank() {
      this.smooth = 0;
      this.base = ["#7a5230", "#6b4423", "#85603a"][Math.floor(rand(0, 3))];
      this.done = false;
    },
    geom(W, H) { const w = Math.min(400, W * 0.85); return { x: W / 2 - w / 2, y: H * 0.4, w, h: H * 0.2 }; },
    inPlank() { const g = this.geom(Engine.W, Engine.H); return px() > g.x && px() < g.x + g.w && py() > g.y && py() < g.y + g.h; },
    onDown() {
      if (this.done) { this.newPlank(); hint("Outra peça de madeira para acariciar."); return; }
      this.contact = 1; this.contactX = px(); this.contactY = py();
      this.voice = ASMR.voice({ type: "bandpass", freq: 1100, q: 0.8, max: 0.5, color: 1.4, reverbSend: 0.35 });
    },
    onMove(p) {
      if (p.down && this.voice) {
        const on = this.inPlank();
        this.voice.update(p.x, on ? clamp(p.speed * 1.3, 0, 1) : 0);
        if (on && p.speed > 0.15) {
          this.smooth = clamp(this.smooth + p.speed * 0.01, 0, 1);
          if (Math.random() < p.speed * 0.3) Engine.spawn({
            x: px() + rand(-15, 15), y: py() + rand(-8, 8), vx: rand(-20, 20), vy: rand(-30, -5),
            gravity: 120, life: rand(0.6, 1.1), size: rand(1.5, 3), color: shade(this.base, 0.3), drag: 0.96,
          });
          if (this.smooth >= 1 && !this.done) {
            this.done = true;
            const g = this.geom(Engine.W, Engine.H);
            done("Lisa como seda.", g.x + g.w / 2, g.y + g.h / 2);
          }
        }
      }
    },
    onUp() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    update(dt, p) {
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      this.sanding = Engine.approach(this.sanding, p.down && !this.done ? 1 : 0, 10, dt);
      // cursor: grab só dentro da tábua — nunca decidido em draw()
      if (this.done) {
        this.cursorName = "pointer";
      } else if (p.down) {
        this.cursorName = "grabbing";
      } else {
        this.cursorName = p.moved && this.inPlank() ? "grab" : "default";
      }
    },
    draw(ctx, W, H, t) {
      const g = this.geom(W, H);
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      const s = (this.smooth < 0.05 && !this.done) ? Affordance.breathe(t, 0, 0.010) * Affordance.contactScale(this.contact) : 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(s, s);
      ctx.translate(-cx, -cy);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 12;
      const col = lerp01Color(this.base, shade(this.base, 0.35), this.smooth);
      const grd = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
      grd.addColorStop(0, shade(col, 0.1)); grd.addColorStop(1, shade(col, -0.15));
      ctx.fillStyle = grd;
      roundRect(ctx, g.x, g.y, g.w, g.h, 8); ctx.fill();
      ctx.restore();
      // veios de madeira
      ctx.save();
      roundRect(ctx, g.x, g.y, g.w, g.h, 8); ctx.clip();
      ctx.globalAlpha = lerp(0.5, 0.18, this.smooth);
      ctx.strokeStyle = shade(this.base, -0.4); ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const yy = g.y + (i + 0.5) / 5 * g.h;
        ctx.beginPath(); ctx.moveTo(g.x, yy);
        for (let xx = g.x; xx <= g.x + g.w; xx += 20) ctx.lineTo(xx, yy + Math.sin(xx * 0.03 + i) * 6);
        ctx.stroke();
      }
      // brilho acetinado quando lisa
      if (this.smooth > 0.3) {
        ctx.globalAlpha = (this.smooth - 0.3) * 0.5;
        const sg = ctx.createLinearGradient(g.x, g.y, g.x + g.w, g.y + g.h);
        sg.addColorStop(0, "rgba(255,255,255,0)");
        sg.addColorStop(0.5, "rgba(255,240,210,0.6)");
        sg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sg; ctx.fillRect(g.x, g.y, g.w, g.h);
      }
      ctx.restore();
      ctx.restore();
      // o bloco de lixa segue a mão (posição suavizada = sensação de peso) — fica fora do wrapper
      if (this.sanding > 0.02) {
        ctx.save();
        ctx.globalAlpha = this.sanding;
        ctx.translate(sx(), sy());
        ctx.rotate(Math.sin(t * 2) * 0.04);
        ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
        const bg = ctx.createLinearGradient(0, -26, 0, 26);
        bg.addColorStop(0, "#c8a878"); bg.addColorStop(1, "#a8885a");
        ctx.fillStyle = bg;
        roundRect(ctx, -44, -26, 88, 52, 10); ctx.fill();
        ctx.shadowColor = "transparent";
        // granulado da lixa
        ctx.fillStyle = "rgba(60,45,30,0.35)";
        for (let i = 0; i < 14; i++) {
          ctx.beginPath();
          ctx.arc(-34 + (i * 37) % 70, -16 + (i * 23) % 34, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      progressRing(ctx, W, H, this.smooth);
      Affordance.render(ctx, this.cue(), t);
    },
    cue() {
      const g = this.geom(Engine.W, Engine.H);
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      let cues;
      if (!this.done && this.smooth < 0.05) {
        cues = [{
          kind: "invitation", x: cx, y: cy, r: Math.min(g.h * 0.7, 70),
          gesture: "drag", dir: { x: 1, y: 0 }, cursor: this.cursorName,
        }];
      } else {
        cues = [{ cursor: this.cursorName }];
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
    overlay(ctx, W, H, t) {
      if (Engine.pointer.down || this.done || this.smooth > 0.05) return;
      const g = this.geom(W, H);
      guideHand(ctx, g.x + g.w / 2 + Math.sin(t * 3) * g.w * 0.35, g.y + g.h / 2, t, "↔");
    },
  });

  /* =====================================================================
   *  SELO DE CERA
   * ===================================================================== */
  Engine.register("selo", {
    enter(W, H) {
      this.step = 0; this.puddle = 0; this.pressT = 0; this.done = false;
      this.voice = null; this.cor = ["#c75b4a", "#7a3b6a", "#3b5a7a", "#3b6a4a"][Math.floor(rand(0, 4))];
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      this.snapK = 0;
      // estado explícito desde já — antes só nascia em onDown() e ficava undefined até o primeiro toque
      this.pressing = false;
      hint("Pingue a cera derretida sobre o papel — segure no centro.");
    },
    exit() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    center(W, H) { return { x: W / 2, y: H * 0.55 }; },
    onDown() {
      const c = this.center(Engine.W, Engine.H);
      if (this.done) { this.enter(Engine.W, Engine.H); return; }
      this.contact = 1; this.contactX = px(); this.contactY = py();
      if (this.step === 0) {
        this.voice = ASMR.voice({ type: "bandpass", freq: 700, q: 1.4, max: 0.4 });
      } else if (this.step === 1) {
        if (dist(px(), py(), c.x, c.y) < 100) { this.pressing = true; ASMR.press(Engine.pointer.x); Engine.haptic(10); }
      }
    },
    onUp() {
      if (this.voice) { this.voice.stop(); this.voice = null; }
      if (this.step === 1 && this.pressing) {
        this.pressing = false;
        if (this.pressT > 0.6 && !this.done) {
          this.done = true;
          const c = this.center(Engine.W, Engine.H);
          done("Selado com carinho.", c.x, c.y);
        }
      }
    },
    update(dt, p) {
      const c = this.center(Engine.W, Engine.H);
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      if (this.step === 0 && p.down && this.voice) {
        this.voice.update(p.x, 0.5);
        if (dist(px(), py(), c.x, c.y) < 120) {
          this.puddle = clamp(this.puddle + dt * 0.4, 0, 1);
          if (Math.random() < 0.2) Engine.spawn({ x: c.x + rand(-30, 30), y: c.y - 40, vx: 0, vy: rand(120, 200), gravity: 100, life: 0.5, size: rand(2, 4), color: this.cor, glow: 6 });
        }
        if (this.puddle >= 1) { this.step = 1; hint("Pressione e segure o selo sobre a cera."); }
      }
      if (this.step === 1 && this.pressing) {
        this.pressT = clamp(this.pressT + dt * 0.9, 0, 1);
      }
      // halo de encaixe: mesmo raio 100 que onDown() usa para aceitar a prensagem
      if (this.step === 1) {
        this.snapK = this.pressing ? 1 : clamp(1 - dist(sx(), sy(), c.x, c.y) / 100, 0, 1);
      } else {
        this.snapK = Engine.approach(this.snapK, 0, 6, dt);
      }
      // cursor: nunca decidido em draw()
      if (this.done) {
        this.cursorName = "pointer";
      } else if (p.down) {
        this.cursorName = "grabbing";
      } else if (this.step === 0) {
        this.cursorName = p.moved && dist(px(), py(), c.x, c.y) < 120 ? "pointer" : "default";
      } else if (this.step === 1) {
        this.cursorName = p.moved ? "grab" : "default";
      } else {
        this.cursorName = "default";
      }
    },
    draw(ctx, W, H, t) {
      const c = this.center(W, H);
      // papel / carta
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = 30;
      ctx.fillStyle = "#efe6d2";
      roundRect(ctx, W / 2 - Math.min(180, W * 0.42), H * 0.28, Math.min(360, W * 0.84), H * 0.5, 6); ctx.fill();
      ctx.restore();
      // poça de cera
      if (this.puddle > 0) {
        const r = 18 + this.puddle * 46;
        ctx.save();
        ctx.shadowColor = this.cor; ctx.shadowBlur = 20;
        const grd = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
        grd.addColorStop(0, shade(this.cor, 0.3));
        grd.addColorStop(1, shade(this.cor, -0.2));
        ctx.fillStyle = grd;
        ctx.beginPath();
        // borda irregular orgânica
        for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.3) {
          const rr = r * (1 + Math.sin(a * 3 + 1) * 0.06);
          const x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr;
          a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.fill();
        // relevo do selo quando pressionado
        if (this.pressT > 0) {
          ctx.globalAlpha = this.pressT * 0.8;
          ctx.strokeStyle = shade(this.cor, -0.4); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.6, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.38, 0, Math.PI * 2); ctx.stroke();
          // monograma simples "E" de Essenzia
          Engine.text("E", c.x, c.y + 1, { size: r * 0.6, color: shade(this.cor, -0.45), weight: 600 });
        }
        ctx.restore();
      }
      // selo seguindo a mão (suavizado) no passo 1 — ganha peso visual em repouso
      if (this.step === 1 && !this.done) {
        const tx = this.pressing ? c.x : sx();
        const ty = (this.pressing ? c.y + (1 - this.pressT) * 30 : sy()) + (this.pressing ? 0 : Affordance.bob(t, 0.4, 3));
        const k = Affordance.contactScale(this.contact);
        ctx.save();
        ctx.translate(tx, ty);
        ctx.scale(k, k);
        ctx.translate(-tx, -ty);
        ctx.fillStyle = "#5a4632"; ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(tx, ty, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3a2a1c";
        ctx.fillRect(tx - 6, ty - 70, 12, 44);
        ctx.restore();
      }
      progressRing(ctx, W, H, this.done ? 1 : (this.step + (this.step === 0 ? this.puddle : this.pressT)) / 2);
      Affordance.render(ctx, this.cue(), t);
    },
    cue() {
      if (this.done) return { cursor: "pointer" };
      const c = this.center(Engine.W, Engine.H);
      let cues;
      if (this.step === 0 && this.puddle < 0.05) {
        cues = [{
          kind: "invitation", x: c.x, y: c.y, r: 48,
          gesture: "hold", cursor: this.cursorName,
        }];
      } else if (this.step === 1) {
        cues = [{ kind: "snap", x: c.x, y: c.y, r: 66, intensity: this.snapK }];
        if (this.pressT < 0.05) {
          cues.push({
            kind: "invitation", x: c.x, y: c.y - 30, r: 44,
            gesture: "hold", cursor: this.cursorName,
          });
        } else {
          cues.push({ cursor: this.cursorName });
        }
      } else {
        cues = [{ cursor: this.cursorName }];
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
    overlay(ctx, W, H, t) {
      if (Engine.pointer.down || this.done) return;
      const c = this.center(W, H);
      if (this.step === 0 && this.puddle < 0.05) guideHand(ctx, c.x, c.y, t, "segure", true);
      else if (this.step === 1 && this.pressT < 0.05) guideHand(ctx, c.x, c.y - 30, t, "pressione", true);
    },
  });

  /* =====================================================================
   *  MIÇANGAS & CORES
   * ===================================================================== */
  Engine.register("micangas", {
    palette: ["#7fa6c4", "#d98fa8", "#e8a05a", "#9ec48a", "#c79ad9"],
    enter(W, H) {
      this.jars = this.palette.map((c) => ({ col: c, count: 0, pop: 0 }));
      this.beads = [];
      this.held = null;
      this.sorted = 0;
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      this.snapK = 0;
      for (let i = 0; i < 14; i++) this.spawnBead(W, H);
      hint("Leve cada miçanga ao potinho da sua cor. Sem pressa.");
    },
    exit() {},
    jarGeom(W, H, i) {
      const n = this.palette.length;
      const gw = Math.min(90, (W - 80) / n - 16);
      const gap = 16;
      const total = n * gw + (n - 1) * gap;
      const ox = (W - total) / 2;
      return { x: ox + i * (gw + gap), y: H - 150, w: gw, h: 120 };
    },
    spawnBead(W, H) {
      const ci = Math.floor(rand(0, this.palette.length));
      const x = rand(W * 0.2, W * 0.8), y = rand(H * 0.18, H * 0.5);
      this.beads.push({
        x, y, tx: x, ty: y,
        col: this.palette[ci], ci, r: rand(13, 18), held: false,
        phase: rand(0, Math.PI * 2), born: 0,
      });
    },
    onDown() {
      this.contact = 1; this.contactX = px(); this.contactY = py();
      // pega a miçanga mais próxima sob o dedo (área generosa)
      let best = null, bd = 46;
      for (const b of this.beads) {
        const d = dist(px(), py(), b.x, b.y);
        if (d < b.r + 20 && d < bd) { bd = d; best = b; }
      }
      if (best) {
        this.held = best; best.held = true;
        best.tx = px(); best.ty = py();
        ASMR.click(Engine.pointer.x, 1.6);
        Engine.haptic(8);
      }
    },
    onMove() { if (this.held) { this.held.tx = px(); this.held.ty = py(); } },
    onUp() {
      if (!this.held) return;
      const b = this.held; b.held = false; this.held = null;
      const g = this.jarGeom(Engine.W, Engine.H, b.ci);
      // se solta perto dos potes, vai para o da sua cor — sem frustração
      if (py() > Engine.H - 220) {
        b.target = g;
        b.dropping = true;
        this.jars[b.ci].count++;
        this.jars[b.ci].pop = 1;
        this.sorted++;
        ASMR.click(Engine.pointer.x, 0.7 + b.ci * 0.1);
        Engine.haptic(10);
        setTimeout(() => {
          const idx = this.beads.indexOf(b);
          if (idx >= 0) this.beads.splice(idx, 1);
          this.spawnBead(Engine.W, Engine.H);
        }, 350);
      }
    },
    update(dt, p, t) {
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      for (const b of this.beads) {
        b.born = Math.min(1, (b.born || 0) + dt * 2.5);
        if (b.dropping && b.target) {
          b.x = lerp(b.x, b.target.x + b.target.w / 2, 0.2);
          b.y = lerp(b.y, b.target.y + 30, 0.2);
        } else {
          // segue o alvo com inércia — segurar uma miçanga tem "peso" gostoso
          b.x = Engine.approach(b.x, b.tx, b.held ? 20 : 4, dt);
          b.y = Engine.approach(b.y, b.ty, b.held ? 20 : 4, dt);
        }
      }
      for (const j of this.jars) j.pop = Engine.approach(j.pop, 0, 6, dt);
      // halo de encaixe: mesmo limiar (Engine.H - 220) que onUp() usa para aceitar a soltura
      if (this.held) {
        this.snapK = clamp(1 - ((Engine.H - 220) - py()) / 160, 0, 1);
      } else {
        this.snapK = Engine.approach(this.snapK, 0, 6, dt);
      }
      // cursor: nunca decidido em draw()
      if (this.held) {
        this.cursorName = "grabbing";
      } else if (p.moved && this.beads.some((b) => dist(px(), py(), b.x, b.y) < b.r + 20)) {
        this.cursorName = "grab";
      } else {
        this.cursorName = "default";
      }
    },
    draw(ctx, W, H, t) {
      // potes
      this.jars.forEach((j, i) => {
        const g = this.jarGeom(W, H, i);
        const pop = 1 + j.pop * 0.06; // pulinho de alegria ao receber miçanga
        ctx.save();
        ctx.translate(g.x + g.w / 2, g.y + g.h);
        ctx.scale(pop, pop);
        ctx.translate(-(g.x + g.w / 2), -(g.y + g.h));
        ctx.fillStyle = "rgba(243,231,211,0.05)";
        roundRect(ctx, g.x, g.y, g.w, g.h, 12); ctx.fill();
        ctx.strokeStyle = `rgba(243,231,211,${0.18 + j.pop * 0.3})`; ctx.lineWidth = 2;
        roundRect(ctx, g.x, g.y, g.w, g.h, 12); ctx.stroke();
        // pilha de miçangas acumuladas
        const stack = Math.min(j.count, 30);
        for (let k = 0; k < stack; k++) {
          const bx = g.x + 14 + (k % 4) * (g.w - 28) / 3;
          const by = g.y + g.h - 14 - Math.floor(k / 4) * 12;
          ctx.fillStyle = j.col;
          ctx.shadowColor = j.col; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowColor = "transparent";
        // ponto de cor indicando o pote
        ctx.fillStyle = j.col;
        ctx.beginPath(); ctx.arc(g.x + g.w / 2, g.y - 14, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
      // miçangas soltas — flutuam de leve, como se respirassem (multiplicadores do
      // módulo Affordance, para prefers-reduced-motion ser respeitado de graça)
      for (const b of this.beads) {
        const bob = b.held || b.dropping ? 0 : Affordance.bob(t, b.phase, 2.5);
        const scale = easeOut(b.born) * Affordance.contactScale(b.held ? 1 : 0, 0.15);
        ctx.save();
        ctx.globalAlpha = easeOut(b.born);
        ctx.shadowColor = b.col; ctx.shadowBlur = b.held ? 24 : 10;
        const grd = ctx.createRadialGradient(b.x - b.r * 0.3, b.y + bob - b.r * 0.3, 1, b.x, b.y + bob, b.r);
        grd.addColorStop(0, shade(b.col, 0.4));
        grd.addColorStop(1, shade(b.col, -0.2));
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(b.x, b.y + bob, b.r * scale, 0, Math.PI * 2); ctx.fill();
        // furo central da miçanga
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.arc(b.x, b.y + bob, b.r * 0.3 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      Affordance.render(ctx, this.cue(), t);
    },
    cue() {
      let cues;
      if (this.held) {
        const g = this.jarGeom(Engine.W, Engine.H, this.held.ci);
        cues = [{ kind: "snap", x: g.x + g.w / 2, y: g.y + 30, r: 70, intensity: this.snapK, cursor: this.cursorName }];
      } else if (this.sorted < 1) {
        const b = this.beads.find((bead) => !bead.dropping);
        if (b) {
          const g = this.jarGeom(Engine.W, Engine.H, b.ci);
          const tx = g.x + g.w / 2, ty = g.y + 30;
          const dx = tx - b.x, dy = ty - b.y;
          const len = Math.hypot(dx, dy) || 1;
          cues = [
            {
              kind: "invitation", x: b.x, y: b.y, r: 40,
              gesture: "drag", dir: { x: dx / len, y: dy / len }, cursor: this.cursorName,
            },
            // halo fraco e constante — ensina a correspondência de cor sem competir com o convite
            { kind: "snap", x: tx, y: ty, r: 70, intensity: 0.35 },
          ];
        } else {
          cues = [{ cursor: this.cursorName }];
        }
      } else {
        cues = [{ cursor: this.cursorName }];
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
    overlay(ctx, W, H, t) {
      // demonstra arrastar a primeira miçanga até o pote da cor dela
      if (Engine.pointer.down || this.held || this.sorted > 0) return;
      const b = this.beads.find(b => !b.dropping);
      if (!b) return;
      const g = this.jarGeom(W, H, b.ci);
      const k = (Math.sin(t * 1.4) + 1) / 2;
      guideHand(ctx, lerp(b.x, g.x + g.w / 2, k), lerp(b.y, g.y + 30, k), t, "arraste");
    },
  });

  /* =====================================================================
   *  RITUAL DE EMBALAGEM
   * ===================================================================== */
  Engine.register("embalagem", {
    enter(W, H) {
      this.step = 0;
      const ix = W * 0.2, iy = H * 0.3;
      this.item = { x: ix, y: iy, tx: ix, ty: iy, placed: false, drag: false };
      this.flaps = [0, 0, 0, 0]; // esq, dir, cima, baixo
      this.ribbon = 0;
      this.done = false;
      this.voice = null;
      this.contact = 0;
      this.contactX = 0;
      this.contactY = 0;
      this.cursorName = "default";
      this.snapK = 0;
      hint("Coloque a peça dentro da caixa — arraste-a para o centro.");
    },
    exit() { if (this.voice) { this.voice.stop(); this.voice = null; } },
    box(W, H) { const w = Math.min(280, W * 0.7); return { x: W / 2 - w / 2, y: H * 0.38, w, h: w * 0.72 }; },
    onDown() {
      const b = this.box(Engine.W, Engine.H);
      if (this.done) { this.enter(Engine.W, Engine.H); return; }
      this.contact = 1; this.contactX = px(); this.contactY = py();
      if (this.step === 0 && !this.item.placed) {
        if (dist(px(), py(), this.item.x, this.item.y) < 60) {
          this.item.drag = true;
          ASMR.tick(Engine.pointer.x);
        }
      } else if (this.step === 1) {
        // segura a aba mais próxima
        this.activeFlap = this.nearestFlap(b);
      } else if (this.step === 2) {
        this.ribbonDrag = true; this.ribbonStartX = px();
        this.voice = ASMR.voice({ type: "bandpass", freq: 1200, q: 1, max: 0.35 });
      }
    },
    nearestFlap(b) {
      const pts = [
        { x: b.x, y: b.y + b.h / 2 },          // esq
        { x: b.x + b.w, y: b.y + b.h / 2 },     // dir
        { x: b.x + b.w / 2, y: b.y },           // cima
        { x: b.x + b.w / 2, y: b.y + b.h },     // baixo
      ];
      let best = -1, bd = 100;
      pts.forEach((p, i) => { if (this.flaps[i] < 1) { const d = dist(px(), py(), p.x, p.y); if (d < bd) { bd = d; best = i; } } });
      return best;
    },
    onMove(p) {
      const b = this.box(Engine.W, Engine.H);
      if (this.item.drag) { this.item.tx = px(); this.item.ty = py(); }
      if (this.step === 1 && this.activeFlap >= 0 && p.down) {
        // dobrar puxando em direção ao centro
        const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        const toward = 1 - clamp(dist(px(), py(), cx, cy) / (b.w / 2), 0, 1);
        if (toward > this.flaps[this.activeFlap]) {
          this.flaps[this.activeFlap] = toward;
          if (Math.random() < 0.2) ASMR.crinkle(p.x, 0.5);
        }
      }
      if (this.step === 2 && this.ribbonDrag && this.voice) {
        this.ribbon = clamp(Math.abs(px() - this.ribbonStartX) / (Engine.W * 0.45), 0, 1);
        this.voice.update(p.x, clamp(p.speed, 0, 1) * 0.6 + 0.1);
      }
    },
    onUp() {
      const b = this.box(Engine.W, Engine.H);
      if (this.item.drag) {
        this.item.drag = false;
        if (dist(this.item.x, this.item.y, b.x + b.w / 2, b.y + b.h / 2) < 130) {
          this.item.tx = b.x + b.w / 2; this.item.ty = b.y + b.h / 2; this.item.placed = true;
          ASMR.press(Engine.pointer.x);
          Engine.haptic(14);
          this.step = 1; hint("Dobre o papel de seda — puxe cada aba para o centro.");
        } else { this.item.tx = Engine.W * 0.2; this.item.ty = Engine.H * 0.3; }
      }
      if (this.step === 1) {
        if (this.activeFlap >= 0) ASMR.crinkle(Engine.pointer.x, 0.8);
        this.activeFlap = -1;
        if (this.flaps.every(f => f > 0.85)) { this.step = 2; hint("Lace com a fita — deslize na horizontal."); }
      }
      if (this.step === 2 && this.ribbonDrag) {
        this.ribbonDrag = false;
        if (this.voice) { this.voice.stop(); this.voice = null; }
        if (this.ribbon > 0.9 && !this.done) {
          this.done = true; this.ribbon = 1;
          done("Embrulhado com amor.", b.x + b.w / 2, b.y + b.h / 2);
        }
      }
    },
    update(dt, p, t) {
      const b = this.box(Engine.W, Engine.H);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      this.contact = Engine.approach(this.contact, 0, 6, dt);
      // a peça segue o dedo com peso; solta, ela assenta devagar
      this.item.x = Engine.approach(this.item.x, this.item.tx, this.item.drag ? 20 : 8, dt);
      this.item.y = Engine.approach(this.item.y, this.item.ty, this.item.drag ? 20 : 8, dt);
      // halo de encaixe: mesmo raio 130 que onUp() usa para aceitar a peça dentro da caixa
      if (this.item.drag) {
        this.snapK = clamp(1 - dist(this.item.x, this.item.y, cx, cy) / 130, 0, 1);
      } else {
        this.snapK = Engine.approach(this.snapK, 0, 6, dt);
      }
      // cursor: nunca decidido em draw()
      if (this.done) {
        this.cursorName = "pointer";
      } else if (p.down) {
        this.cursorName = "grabbing";
      } else if (this.step === 0) {
        this.cursorName = p.moved && dist(px(), py(), this.item.x, this.item.y) < 60 ? "grab" : "default";
      } else if (this.step === 1) {
        this.cursorName = p.moved && this.nearestFlap(b) >= 0 ? "grab" : "default";
      } else if (this.step === 2) {
        const near = p.moved && px() > b.x - 40 && px() < b.x + b.w + 40 && py() > b.y - 40 && py() < b.y + b.h + 40;
        this.cursorName = near ? "grab" : "default";
      } else {
        this.cursorName = "default";
      }
    },
    draw(ctx, W, H, t) {
      const b = this.box(W, H);
      // caixa (interior)
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.fillStyle = "#8a6a44";
      roundRect(ctx, b.x, b.y, b.w, b.h, 10); ctx.fill();
      ctx.fillStyle = "#6e5436";
      roundRect(ctx, b.x + 12, b.y + 12, b.w - 24, b.h - 24, 6); ctx.fill();
      ctx.restore();
      // papel de seda ao fundo
      ctx.save();
      roundRect(ctx, b.x + 12, b.y + 12, b.w - 24, b.h - 24, 6); ctx.clip();
      ctx.fillStyle = "rgba(243,231,211,0.5)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.restore();
      // item dentro — flutua de leve fora da caixa para se anunciar como pegável
      if (this.item.placed || this.step === 0) {
        const floatY = (!this.item.drag && !this.item.placed) ? Affordance.bob(t, 0, 3) : 0;
        ctx.save();
        ctx.translate(this.item.x, this.item.y + floatY);
        if (this.item.drag) ctx.rotate(Math.sin(t * 3) * 0.03);
        const s = (this.item.drag ? 1.06 : 1) * Affordance.contactScale(this.contact);
        ctx.scale(s, s);
        ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = this.item.drag ? 22 : 14;
        // representa um sabonete/vela
        const grd = ctx.createLinearGradient(-30, -22, 30, 22);
        grd.addColorStop(0, "#f0d8b0"); grd.addColorStop(1, "#d9b483");
        ctx.fillStyle = grd;
        roundRect(ctx, -34, -24, 68, 48, 12); ctx.fill();
        ctx.strokeStyle = "rgba(120,90,50,0.5)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      // abas de papel de seda dobrando
      if (this.step >= 1) {
        ctx.save();
        ctx.fillStyle = "rgba(243,231,211,0.82)";
        const f = this.flaps;
        // cada aba cresce do lado em direção ao centro
        ctx.fillRect(b.x, b.y, (b.w / 2) * f[0], b.h);            // esq
        ctx.fillRect(b.x + b.w - (b.w / 2) * f[1], b.y, (b.w / 2) * f[1], b.h); // dir
        ctx.fillRect(b.x, b.y, b.w, (b.h / 2) * f[2]);            // cima
        ctx.fillRect(b.x, b.y + b.h - (b.h / 2) * f[3], b.w, (b.h / 2) * f[3]); // baixo
        // vincos suaves
        ctx.strokeStyle = "rgba(200,180,150,0.4)"; ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
        ctx.restore();
      }
      // fita / laço
      if (this.step >= 2 && this.ribbon > 0) {
        ctx.save();
        ctx.fillStyle = "#c75b7a"; ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 8;
        const rw = b.w * this.ribbon;
        ctx.fillRect(b.x + b.w / 2 - 16, b.y - 8, 32, b.h + 16);              // vertical
        ctx.fillRect(b.x + b.w / 2 - rw / 2, b.y + b.h / 2 - 16, rw, 32);     // horizontal
        if (this.done) {
          // laço
          ctx.beginPath();
          ctx.ellipse(b.x + b.w / 2 - 22, b.y + b.h / 2, 22, 14, -0.4, 0, Math.PI * 2);
          ctx.ellipse(b.x + b.w / 2 + 22, b.y + b.h / 2, 22, 14, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#a8475f";
          ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 12, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      let prog = 0;
      if (this.done) prog = 1;
      else if (this.step === 0) prog = this.item.placed ? 0.25 : 0;
      else if (this.step === 1) prog = 0.25 + (this.flaps.reduce((a, b) => a + b, 0) / 4) * 0.5;
      else prog = 0.75 + this.ribbon * 0.25;
      progressRing(ctx, W, H, prog);
      Affordance.render(ctx, this.cue(), t);
    },
    cue() {
      if (this.done) return { cursor: "pointer" };
      const b = this.box(Engine.W, Engine.H);
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      let cues;
      if (this.step === 0 && !this.item.placed) {
        const dx = cx - this.item.x, dy = cy - this.item.y;
        const len = Math.hypot(dx, dy) || 1;
        cues = [
          {
            kind: "invitation", x: this.item.x, y: this.item.y, r: 44,
            gesture: "drag", dir: { x: dx / len, y: dy / len }, cursor: this.cursorName,
          },
          { kind: "snap", x: cx, y: cy, r: 72, intensity: this.snapK },
        ];
      } else if (this.step === 1) {
        const idx = this.flaps.findIndex((f) => f < 0.85);
        if (idx >= 0) {
          const pts = [{ x: b.x, y: cy }, { x: b.x + b.w, y: cy }, { x: cx, y: b.y }, { x: cx, y: b.y + b.h }];
          const pt = pts[idx];
          const dx = cx - pt.x, dy = cy - pt.y;
          const len = Math.hypot(dx, dy) || 1;
          cues = [{
            kind: "invitation", x: pt.x, y: pt.y, r: 42,
            gesture: "drag", dir: { x: dx / len, y: dy / len }, cursor: this.cursorName,
          }];
        } else {
          cues = [{ cursor: this.cursorName }];
        }
      } else if (this.step === 2 && this.ribbon < 0.05) {
        cues = [{
          kind: "invitation", x: cx, y: cy, r: 46,
          gesture: "drag", dir: { x: 1, y: 0 }, cursor: this.cursorName,
        }];
      } else {
        cues = [{ cursor: this.cursorName }];
      }
      if (this.contact > 0.02) cues.push({ kind: "contact", x: this.contactX, y: this.contactY, k: this.contact });
      return cues;
    },
    overlay(ctx, W, H, t) {
      if (Engine.pointer.down || this.done) return;
      const b = this.box(W, H);
      const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      if (this.step === 0 && !this.item.placed) {
        const k = (Math.sin(t * 1.5) + 1) / 2;
        guideHand(ctx, lerp(this.item.x, c.x, k), lerp(this.item.y, c.y, k), t, "arraste");
      } else if (this.step === 1) {
        const idx = this.flaps.findIndex(f => f < 0.85);
        if (idx < 0) return;
        const pts = [{ x: b.x, y: c.y }, { x: b.x + b.w, y: c.y }, { x: c.x, y: b.y }, { x: c.x, y: b.y + b.h }];
        const k = (Math.sin(t * 1.6) + 1) / 2;
        guideHand(ctx, lerp(pts[idx].x, c.x, k * 0.7), lerp(pts[idx].y, c.y, k * 0.7), t, "dobre");
      } else if (this.step === 2 && this.ribbon < 0.05) {
        const k = (Math.sin(t * 1.6) + 1) / 2;
        guideHand(ctx, b.x + k * b.w, c.y, t, "deslize");
      }
    },
  });
})();
