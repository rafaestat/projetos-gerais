/*
 * Ateliê Essenzia — Motor de áudio ASMR
 *
 * Todo o som é sintetizado em tempo real com a Web Audio API, então o jogo
 * não depende de nenhum arquivo externo e funciona aberto direto do arquivo.
 *
 * Princípios sensoriais:
 *  - Panning estéreo segue a posição horizontal do toque/cursor (sensação
 *    binaural quando ouvido com fones).
 *  - Uma reverberação suave e quente envolve tudo, criando o isolamento.
 *  - "Vozes contínuas" (ruído filtrado) reagem à velocidade do movimento,
 *    para cortar, lixar e despejar; "one-shots" para bolhas, gotas e estalos.
 */
const ASMR = (() => {
  let ctx = null;
  let master = null;     // ganho geral
  let reverb = null;     // convolver quente
  let reverbGain = null; // quantidade de reverb
  let ambientGain = null;
  let started = false;

  /* ---------- inicialização ---------- */
  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.6, 2.4);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.28;
    reverb.connect(reverbGain).connect(master);
  }

  function start() {
    ensure();
    if (ctx.state === "suspended") ctx.resume();
    if (!started) {
      started = true;
      startAmbient();
    }
  }

  /* impulso sintético para reverb (decaimento exponencial suave) */
  function makeImpulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /* buffer de ruído reutilizável (1s, loopável) */
  let noiseBuf = null;
  function noiseBuffer() {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      // ruído rosa-ish: ruído branco suavizado, mais aconchegante
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    return noiseBuf;
  }

  /* ---------- ambiente de fundo ---------- */
  function startAmbient() {
    // brisa quente: ruído muito filtrado e baixo
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;

    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.0;
    src.connect(lp).connect(ambientGain).connect(master);
    src.start();
    ambientGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 4);

    // um drone morno e quase imperceptível
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 58;
    const dg = ctx.createGain();
    dg.gain.value = 0.0;
    drone.connect(dg).connect(reverb);
    drone.start();
    dg.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 6);
  }

  /* helper: panner por posição horizontal (0..1) */
  function panner(x = 0.5) {
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) {
      p.pan.value = Math.max(-1, Math.min(1, (x - 0.5) * 1.7));
      return p;
    }
    // fallback simples
    const g = ctx.createGain();
    return g;
  }

  /* ===================================================================
   *  VOZ CONTÍNUA — para cortar, lixar, despejar
   *  Retorna um objeto com update(x, intensity) e stop().
   * =================================================================== */
  function voice(opts = {}) {
    ensure();
    const {
      type = "lowpass",
      freq = 1200,
      q = 0.7,
      color = 1,        // multiplicador de brilho
      max = 0.5,        // ganho máximo
      reverbSend = 0.5,
    } = opts;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;

    const g = ctx.createGain();
    g.gain.value = 0;

    // camada de "grão" cristalino: ruído agudo que aparece com a velocidade,
    // dando aquele detalhe nítido e orgânico tão característico do ASMR
    const src2 = ctx.createBufferSource();
    src2.buffer = noiseBuffer();
    src2.loop = true;
    src2.playbackRate.value = 1.4;
    const grain = ctx.createBiquadFilter();
    grain.type = "bandpass";
    grain.frequency.value = Math.max(2200, freq * 1.6);
    grain.Q.value = 1.4;
    const g2 = ctx.createGain();
    g2.gain.value = 0;

    const pan = panner();

    const send = ctx.createGain();
    send.gain.value = reverbSend;

    src.connect(filter).connect(g).connect(pan);
    src2.connect(grain).connect(g2).connect(pan);
    pan.connect(master);
    pan.connect(send).connect(reverb);
    src.start();
    src2.start();

    let alive = true;
    return {
      update(x, intensity) {
        if (!alive) return;
        const t = ctx.currentTime;
        if (pan.pan) pan.pan.setTargetAtTime((x - 0.5) * 1.7, t, 0.04);
        const target = Math.max(0, Math.min(max, intensity * max));
        g.gain.setTargetAtTime(target, t, 0.03);
        // o grão cresce mais que linearmente com a intensidade => fica "crispy"
        g2.gain.setTargetAtTime(Math.min(max * 0.5, intensity * intensity * max * 0.7), t, 0.03);
        // brilho acompanha a intensidade — movimentos rápidos soam mais nítidos
        filter.frequency.setTargetAtTime(freq * (1 + intensity * color), t, 0.05);
      },
      stop() {
        if (!alive) return;
        alive = false;
        const t = ctx.currentTime;
        g.gain.setTargetAtTime(0, t, 0.08);
        g2.gain.setTargetAtTime(0, t, 0.08);
        setTimeout(() => { try { src.stop(); src2.stop(); } catch (e) {} }, 400);
      },
    };
  }

  /* ===================================================================
   *  ONE-SHOTS
   * =================================================================== */

  // gota d'água / pingo de cor — "plip" suave
  function drop(x = 0.5, pitch = 1) {
    ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f0 = 760 * pitch;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    const pan = panner(x);
    osc.connect(g).connect(pan);
    pan.connect(master);
    pan.connect(reverb);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // bolha de sabão — borbulho curto e arredondado
  function bubble(x = 0.5) {
    ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    const f0 = 300 + Math.random() * 500;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f0 * 2.4, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    const pan = panner(x);
    osc.connect(g).connect(pan);
    pan.connect(master);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  // toque de pluma — feedback quase subliminar ao passar sobre um cartão
  function tick(x = 0.5) {
    ensure();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2600;
    bp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    const pan = panner(x);
    src.connect(bp).connect(g).connect(pan);
    pan.connect(master);
    src.start(t);
    src.stop(t + 0.08);
  }

  // estalo macio — miçanga caindo, clique de encaixe
  function click(x = 0.5, pitch = 1) {
    ensure();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800 * pitch;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    const pan = panner(x);
    src.connect(bp).connect(g).connect(pan);
    pan.connect(master);
    pan.connect(reverb);
    src.start(t);
    src.stop(t + 0.1);
  }

  // estalido de papel / crepitar — muitos micro-estalos crocantes e irregulares
  function crinkle(x = 0.5, amount = 1) {
    ensure();
    const n = 5 + Math.floor(Math.random() * 7 * amount);
    let delay = 0;
    for (let i = 0; i < n; i++) {
      // intervalos irregulares e tons variados = textura orgânica e "crispy"
      delay += 8 + Math.random() * 34;
      const pitch = 1.6 + Math.random() * 2.2;
      setTimeout(() => click(x + (Math.random() - 0.5) * 0.12, pitch), delay);
    }
  }

  // carimbo / selo de cera pressionado — baque macio e abafado
  function press(x = 0.5) {
    ensure();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const pan = panner(x);
    osc.connect(g).connect(pan);
    pan.connect(master);
    pan.connect(reverb);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  // resolução de conclusão estilo "tigela tibetana" / pad morno —
  // entra devagar (swell), sem ataque/"ding" abrupto, e se dissolve por
  // muitos segundos. Inspirado nos ASMR de singing bowl e drones suaves.
  function chime() {
    ensure();
    const base = 196.0; // sol grave, quente e relaxante
    const ratios = [1, 1.5, 2, 3]; // raiz + quinta + oitava + 12ª (harmônicos macios)
    ratios.forEach((r, i) => {
      setTimeout(() => {
        const t = ctx.currentTime;
        // dois osciladores levemente desafinados = batimento orgânico e vivo
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc.type = "sine";
        osc2.type = "sine";
        osc.frequency.value = base * r;
        osc2.frequency.value = base * r * 1.003;

        // passa-baixa para garantir que nada soe agudo ou áspero
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;

        const g = ctx.createGain();
        const peak = 0.06 - i * 0.011; // harmônicos altos bem discretos
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 1.1);          // swell lento
        g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);   // cauda longa

        osc.connect(lp);
        osc2.connect(lp);
        lp.connect(g);
        g.connect(reverb);
        g.connect(master);
        osc.start(t); osc2.start(t);
        osc.stop(t + 7); osc2.stop(t + 7);
      }, i * 450); // as notas surgem bem devagar, como um respirar
    });
  }

  /* silencia tudo com um fade suave (nada de corte seco) */
  let muted = false;
  function setMuted(m) {
    ensure();
    muted = m;
    master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.08);
  }

  return {
    start, voice, drop, bubble, click, tick, crinkle, press, chime, setMuted,
    get muted() { return muted; },
    get ready() { return started; },
  };
})();
