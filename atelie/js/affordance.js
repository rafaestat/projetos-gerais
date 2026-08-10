/*
 * Ateliê Essenzia — Vocabulário de afordância visual
 *
 * Módulo puro de sinalização: recebe contexto de canvas, descritores
 * genéricos ("cues") e o tempo da cena, e devolve pixels. Nunca conhece
 * estação, passo ou regra de negócio — só sabe desenhar repouso, convite,
 * cursor e confirmação de toque. É o vocabulário compartilhado que as
 * estações usam para se explicarem sozinhas, sem texto de instrução.
 *
 * Três sinalizadores, um vocabulário:
 *  - "invitation" — glow + verbo de gesto (tap/hold/drag/orbit) indicando
 *    onde tocar e o que fazer;
 *  - "snap"       — halo de destino que cresce conforme o gesto se
 *    aproxima do ponto de encaixe;
 *  - "contact"    — anel de confirmação no instante do toque.
 * O repouso (breathe/bob/sway) é aplicado pela própria estação sobre a
 * sua transformação de desenho — este módulo só fornece os multiplicadores.
 */
const Affordance = (() => {
  let _reduced = null; // null = ainda não lido (leitura preguiçosa, com guarda)
  let _hover = null;
  let _el = null;
  let _cursor = null;

  function reducedMotion() {
    if (_reduced === null) {
      try { _reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
      catch (e) { _reduced = false; }
    }
    return _reduced;
  }

  function hasHoverCapability() {
    if (_hover === null) {
      try { _hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches; }
      catch (e) { _hover = false; }
    }
    return _hover;
  }

  function stageEl() {
    if (!_el) _el = document.getElementById("stage");
    return _el;
  }

  function motionScale() { return reducedMotion() ? 0.25 : 1; }

  /* ---------- multiplicadores de repouso ---------- */
  function breathe(t, phase = 0, amp = 0.015) {
    return 1 + Math.sin(t * 1.6 + phase) * amp * motionScale();
  }

  function bob(t, phase = 0, amp = 3) {
    return Math.sin(t * 1.1 + phase) * amp * motionScale();
  }

  function sway(t, phase = 0, amp = 3) {
    return Math.cos(t * 0.9 + phase) * amp * motionScale();
  }

  function pulse(t, speed = 2.2) {
    if (reducedMotion()) return 0.75; // glow fixo em vez de pulso
    return 0.5 + 0.5 * Math.sin(t * speed);
  }

  function contactScale(k, amp = 0.06) {
    return 1 + k * amp;
  }

  /* ---------- cursor (único consumidor da capacidade de hover) ---------- */
  function setCursor(name) {
    if (!hasHoverCapability()) return; // sem hover não existe cursor para trocar
    const el = stageEl();
    if (!el || name === _cursor) return;
    el.style.cursor = name;
    _cursor = name;
  }

  /* ---------- utilidades internas de desenho ---------- */
  function lerpNum(a, b, k) { return a + (b - a) * k; }
  function clampNum(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function drawInvitationBase(ctx, x, y, r, intensity, t) {
    const a = 0.22 * intensity * (0.55 + 0.45 * pulse(t));
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
    halo.addColorStop(0, `rgba(255,222,170,${a})`);
    halo.addColorStop(1, "rgba(255,222,170,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255,236,200,${0.28 * intensity})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawInvitation(ctx, cue, t) {
    const { x, y, r = 46, gesture, dir, intensity = 1 } = cue;
    const mo = motionScale();
    drawInvitationBase(ctx, x, y, r, intensity, t);

    if (gesture === "hold") {
      // o anel do raio base contrai e reinicia — "pressione e fique"
      const frac = (t / 2) % 1;
      const k = Math.sin(frac * Math.PI / 2);
      const rr = r * 0.9 - (r * 0.9 - r * 0.45) * k * mo;
      ctx.globalAlpha = (0.35 + 0.35 * (1 - k)) * intensity;
      ctx.strokeStyle = "rgba(255,236,200,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, rr), 0, Math.PI * 2);
      ctx.stroke();
    } else if (gesture === "drag" && dir) {
      // risco/cometa que viaja na direção de dir — "leve para lá"
      const len = Math.hypot(dir.x, dir.y) || 1;
      const ux = dir.x / len, uy = dir.y / len;
      const frac = (t / 1.8) % 1;
      const travel = frac * r * 1.6 * mo;
      const fade = Math.sin(frac * Math.PI);
      const hx = x + ux * travel, hy = y + uy * travel;
      const tailLen = r * 0.5;
      ctx.globalAlpha = fade * 0.55 * intensity;
      ctx.strokeStyle = "rgba(255,236,200,0.9)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - ux * tailLen, hy - uy * tailLen);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    } else if (gesture === "orbit") {
      // arco curto percorrendo uma circunferência — "gire"
      const frac = (t / 2.2) % 1;
      const start = frac * Math.PI * 2 * mo;
      ctx.globalAlpha = 0.6 * intensity;
      ctx.strokeStyle = "rgba(255,236,200,0.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.7, start, start + 0.6);
      ctx.stroke();
    } else {
      // "tap" — também o padrão de segurança para verbos desconhecidos ou drag sem dir
      const frac = (t / 1.4) % 1;
      const rr = r * 0.3 + (r * 1.05 - r * 0.3) * frac * mo;
      ctx.globalAlpha = (1 - frac) * 0.5 * intensity;
      ctx.strokeStyle = "rgba(255,236,200,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(2, rr), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSnap(ctx, cue) {
    const { x, y, r = 60, intensity = 0 } = cue;
    const k = clampNum(intensity, 0, 1);
    if (k <= 0.01) return;
    const rr = r * (0.7 + 0.3 * k);
    const halo = ctx.createRadialGradient(x, y, 0, x, y, rr);
    halo.addColorStop(0, `rgba(255,210,140,${0.05 + 0.3 * k})`);
    halo.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    if (k > 0.85) {
      ctx.strokeStyle = `rgba(255,225,170,${0.5 + 0.5 * ((k - 0.85) / 0.15)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x, y, rr * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawContact(ctx, cue) {
    const { x, y, k, r = 34 } = cue;
    const kk = clampNum(k, 0, 1);
    if (kk <= 0.01) return;
    const rr = lerpNum(r * 0.4, r * 1.3, 1 - kk);
    ctx.strokeStyle = `rgba(255,240,215,${0.5 * kk})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,250,235,${0.6 * kk})`;
    ctx.beginPath();
    ctx.arc(x, y, 6 * kk, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- ponto de entrada único ---------- */
  function render(ctx, cues, t) {
    const list = cues == null ? [] : (Array.isArray(cues) ? cues : [cues]);

    let cursorName = null;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].cursor) { cursorName = list[i].cursor; break; }
    }
    setCursor(cursorName || "default");

    for (let i = 0; i < list.length; i++) {
      const cue = list[i];
      if (!cue || !cue.kind) continue;
      ctx.save();
      if (cue.kind === "invitation") drawInvitation(ctx, cue, t);
      else if (cue.kind === "snap") drawSnap(ctx, cue);
      else if (cue.kind === "contact") drawContact(ctx, cue);
      ctx.restore();
    }
  }

  return {
    render,
    breathe, bob, sway, pulse, contactScale,
    setCursor,
    get motion() { return motionScale(); },
    get hasHover() { return hasHoverCapability(); },
    legacyGuide: true,
  };
})();
