const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function formatBRL(value: number): string {
  return brl.format(value);
}

/**
 * `R$ 12,3 mil` — para eixos e rótulos onde o valor cheio não cabe.
 *
 * A abreviação é feita à mão de propósito: `notation: 'compact'` do Intl
 * produz textos diferentes entre o ICU do Node e o do navegador
 * (`R$ 10 mil` x `R$ 10,0 mil`), o que quebra a hidratação do React.
 */
export function formatBRLCompacto(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude < 1000) return brl.format(value);
  const sinal = value < 0 ? '-' : '';
  if (magnitude >= 1_000_000) {
    return `${sinal}R$\u00a0${decimal.format(magnitude / 1_000_000)} mi`;
  }
  return `${sinal}R$\u00a0${decimal.format(magnitude / 1000)} mil`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

/** `2026-04` → `abril de 2026`. */
export function formatCompetencia(competencia: string): string {
  const [year, month] = competencia.split('-').map(Number);
  const nome = MESES[month - 1];
  return nome ? `${nome} de ${year}` : competencia;
}

/** `2026-04` → `abr/26`. */
export function formatCompetenciaCurta(competencia: string): string {
  const [year, month] = competencia.split('-').map(Number);
  const nome = MESES[month - 1];
  return nome ? `${nome.slice(0, 3)}/${String(year).slice(2)}` : competencia;
}

/** `2026-04-18` → `18 de abril`. */
export function formatData(data: string): string {
  const [, month, day] = data.split('-').map(Number);
  const nome = MESES[month - 1];
  return nome ? `${day} de ${nome}` : data;
}

/** `2026-04-18` → `sáb, 18/04`. */
export function formatDataCurta(data: string): string {
  const [year, month, day] = data.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const semana = date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return `${semana.replace('.', '')}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/**
 * Rótulo de eixo: números redondos, sem centavos — `R$ 0`, `R$ 500`,
 * `R$ 2,5 mil`. Mantém o eixo estreito e legível.
 */
export function formatBRLEixo(value: number): string {
  if (value === 0) return 'R$\u00a00';
  if (Math.abs(value) < 1000) {
    const sinal = value < 0 ? '-' : '';
    return `${sinal}R$\u00a0${decimal.format(Math.abs(value))}`;
  }
  return formatBRLCompacto(value);
}
