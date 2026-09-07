import { FILTROS_PADRAO, type Filtros } from './analytics';
import type { BaseTemporal } from './types';

export type SearchParams = Record<string, string | string[] | undefined>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function lerFiltros(params: SearchParams): Filtros {
  const base = primeiro(params.base);
  return {
    base: (base === 'caixa' ? 'caixa' : 'competencia') as BaseTemporal,
    incluirNeutros: primeiro(params.neutros) === '1',
  };
}

export function lerMes(params: SearchParams): string | undefined {
  const mes = primeiro(params.mes);
  return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined;
}

export function lerBusca(params: SearchParams): string {
  return (primeiro(params.q) ?? '').trim();
}

export function lerCategoria(params: SearchParams): string {
  return (primeiro(params.categoria) ?? '').trim();
}

/** Mantém os filtros ao navegar entre as telas. */
export function queryFiltros(
  filtros: Filtros,
  extras: Record<string, string | undefined> = {},
): string {
  const query = new URLSearchParams();
  if (filtros.base !== FILTROS_PADRAO.base) query.set('base', filtros.base);
  if (filtros.incluirNeutros) query.set('neutros', '1');
  for (const [chave, valor] of Object.entries(extras)) {
    if (valor) query.set(chave, valor);
  }
  const texto = query.toString();
  return texto ? `?${texto}` : '';
}
