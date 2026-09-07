'use client';

import { useEffect, useState } from 'react';

type Tema = 'light' | 'dark' | 'system';

const PROXIMO: Record<Tema, Tema> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

const ROTULO: Record<Tema, string> = {
  system: 'Tema do sistema',
  light: 'Tema claro',
  dark: 'Tema escuro',
};

const ICONE: Record<Tema, string> = { system: '◐', light: '☀', dark: '☾' };

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('system');

  useEffect(() => {
    const salvo = window.localStorage.getItem('tema') as Tema | null;
    if (salvo) setTema(salvo);
  }, []);

  function alternar() {
    const novo = PROXIMO[tema];
    setTema(novo);
    try {
      window.localStorage.setItem('tema', novo);
    } catch {
      // Navegador com armazenamento bloqueado: o tema vale só para esta aba.
    }
    const raiz = document.documentElement;
    if (novo === 'system') raiz.removeAttribute('data-theme');
    else raiz.setAttribute('data-theme', novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={`${ROTULO[tema]}. Clique para alternar.`}
      title={ROTULO[tema]}
      className="grid h-9 w-9 place-items-center rounded-full border text-ink-2 hover:text-ink"
    >
      <span aria-hidden>{ICONE[tema]}</span>
    </button>
  );
}
