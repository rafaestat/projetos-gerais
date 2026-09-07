/**
 * Caminho de uma coluna/barra com a ponta arredondada (4px) e a base reta —
 * a "data-end" arredondada só do lado que cresce.
 */
export function caminhoBarra(
  x: number,
  y: number,
  largura: number,
  altura: number,
  raio = 4,
  direcao: 'cima' | 'baixo' | 'direita' = 'cima',
): string {
  const r = Math.max(0, Math.min(raio, largura / 2, Math.abs(altura)));

  if (direcao === 'direita') {
    // Cresce da esquerda para a direita: base reta à esquerda.
    const w = Math.max(0, largura);
    const rr = Math.min(r, w, altura / 2);
    return [
      `M ${x} ${y}`,
      `H ${x + w - rr}`,
      `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr}`,
      `V ${y + altura - rr}`,
      `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + altura}`,
      `H ${x}`,
      'Z',
    ].join(' ');
  }

  if (direcao === 'baixo') {
    // Cresce para baixo a partir da linha zero.
    const h = Math.max(0, altura);
    const rr = Math.min(r, h);
    return [
      `M ${x} ${y}`,
      `H ${x + largura}`,
      `V ${y + h - rr}`,
      `A ${rr} ${rr} 0 0 1 ${x + largura - rr} ${y + h}`,
      `H ${x + rr}`,
      `A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr}`,
      'Z',
    ].join(' ');
  }

  const h = Math.max(0, altura);
  const rr = Math.min(r, h);
  return [
    `M ${x} ${y + h}`,
    `V ${y + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + rr} ${y}`,
    `H ${x + largura - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + largura} ${y + rr}`,
    `V ${y + h}`,
    'Z',
  ].join(' ');
}

/** Escolhe marcas "redondas" para o eixo de valores. */
export function ticksDeValor(maximo: number, quantidade = 4): number[] {
  if (maximo <= 0) return [0];
  const bruto = maximo / quantidade;
  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10]
    .map((fator) => fator * magnitude)
    .find((candidato) => candidato >= bruto) ?? 10 * magnitude;
  const ticks: number[] = [];
  for (let valor = 0; valor <= maximo + passo / 2; valor += passo) {
    ticks.push(valor);
  }
  return ticks;
}
