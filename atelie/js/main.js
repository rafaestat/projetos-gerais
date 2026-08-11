/*
 * Ateliê Essenzia — ponto de entrada
 *
 * Liga a tela inicial, o áudio e o motor, e controla a UI mínima
 * (a dica, o botão de voltar e o botão de som) que desaparece
 * durante a criação.
 */
(() => {
  const intro = document.getElementById("intro");
  const beginBtn = document.getElementById("beginBtn");
  const backBtn = document.getElementById("backBtn");
  const muteBtn = document.getElementById("muteBtn");
  const hintEl = document.getElementById("hint");

  let hintTimer = null;

  // UI exposta às estações
  window.UI = {
    hint(text) {
      clearTimeout(hintTimer);
      if (!text) { hintEl.classList.remove("show"); return; }
      // se já há uma dica visível, troca com um respiro (fade out → in)
      if (hintEl.classList.contains("show") && hintEl.textContent !== text) {
        hintEl.classList.remove("show");
        hintTimer = setTimeout(() => {
          hintEl.textContent = text;
          hintEl.classList.add("show");
          hintTimer = setTimeout(() => hintEl.classList.remove("show"), 6000);
        }, 350);
        return;
      }
      hintEl.textContent = text;
      hintEl.classList.add("show");
      // a dica recua sozinha para não poluir a tela durante a criação
      hintTimer = setTimeout(() => hintEl.classList.remove("show"), 6000);
    },
  };

  // reaparece a dica quando o usuário toca a tela de novo
  function nudgeHint() {
    if (!hintEl.textContent) return;
    hintEl.classList.add("show");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => hintEl.classList.remove("show"), 6000);
  }

  function showBack(show) {
    backBtn.classList.toggle("show", show);
  }

  // intercepta as trocas de cena para mostrar/ocultar o botão voltar
  const _go = Engine.go.bind(Engine);
  Engine.go = (name, data) => {
    showBack(name !== "menu");
    _go(name, data);
  };

  backBtn.addEventListener("click", () => {
    ASMR.click(0.2, 1);
    Engine.go("menu");
  });

  // som liga/desliga com fade suave
  muteBtn.addEventListener("click", () => {
    const m = !ASMR.muted;
    ASMR.setMuted(m);
    muteBtn.classList.toggle("muted", m);
    muteBtn.setAttribute("aria-label", m ? "Ativar som" : "Silenciar");
  });

  // começar
  let begun = false;
  function begin() {
    if (begun) return;
    begun = true;
    ASMR.start();
    intro.classList.add("hidden");
    muteBtn.classList.add("show");
    Engine.init();
    Engine.go("menu");
    // toques seguintes reavivam a dica
    window.addEventListener("pointerdown", nudgeHint);
  }

  beginBtn.addEventListener("click", begin);

  // teclas: Esc volta ao ateliê (quando já dentro do jogo)
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && intro.classList.contains("hidden")) {
      Engine.go("menu");
    }
  });
})();
