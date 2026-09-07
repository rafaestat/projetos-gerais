'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Mede a largura real do container para desenhar o SVG em pixels de verdade —
 * assim os rótulos não encolhem junto com o gráfico em telas estreitas.
 */
export function useLargura<T extends HTMLElement>(inicial = 720) {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(inicial);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observer = new ResizeObserver((entradas) => {
      const medida = entradas[0]?.contentRect.width;
      if (medida && medida > 0) setLargura(medida);
    });
    observer.observe(elemento);
    return () => observer.disconnect();
  }, []);

  return { ref, largura };
}
