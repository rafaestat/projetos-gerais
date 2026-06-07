/*
 * Ateliê Essenzia — ponto de entrada
 *
 * Liga a tela inicial, o áudio e o motor, e controla a UI mínima
 * (a dica e o botão de voltar) que desaparece durante a criação.
 */
(() => {
  const intro = document.getElementById("intro");
  const beginBtn = document.getElementById("beginBtn");
  const backBtn = document.getElementById("backBtn");
  const hintEl = document.getElementById("hint");

  let hintTimer = null;

  // UI exposta às estações
  window.UI = {
    hint(text) {
      if (!text) { hintEl.classList.remove("show"); return; }
      hintEl.textContent = text;
      hintEl.classList.add("show");
      // a dica recua sozinha para não poluir a tela durante a criação
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => hintEl.classList.remove("show"), 6000);
    },
  };

  // reaparece a dica quando o ponteiro descansa (toque na tela mostra de novo)
  let idleTimer = null;
  function nudgeHint() {
    if (hintEl.textContent) hintEl.classList.add("show");
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

  // começar
  function begin() {
    ASMR.start();
    intro.classList.add("hidden");
    Engine.init();
    Engine.go("menu");
    // primeira interação revela a dica
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
