import { chaveCategoria } from './data';
import { previousMonth } from './parse';
import type { BaseTemporal, Dataset, TipoCategoria, Transacao } from './types';

export interface Filtros {
  /** `competencia` (regime de fatura) ou `caixa` (data em que o dinheiro saiu). */
  base: BaseTemporal;
  /**
   * Transferências, resgates, pagamentos de fatura e cofrinhos (tipo "Neutro")
   * entram nos totais? Por padrão não: contá-los infla receitas e despesas com
   * dinheiro que apenas trocou de lugar dentro da própria casa.
   */
  incluirNeutros: boolean;
}

export const FILTROS_PADRAO: Filtros = {
  base: 'competencia',
  incluirNeutros: false,
};

export function tipoDa(dataset: Dataset, categoria: string): TipoCategoria {
  return dataset.tipoPorCategoria[chaveCategoria(categoria)] ?? 'Despesa Variável';
}

export function mesDa(transacao: Transacao, base: BaseTemporal): string {
  return base === 'caixa' ? transacao.data.slice(0, 7) : transacao.competencia;
}

/** Remove os lançamentos neutros, salvo se o usuário pedir para incluí-los. */
export function aplicarFiltros(
  dataset: Dataset,
  transacoes: Transacao[],
  filtros: Filtros,
): Transacao[] {
  if (filtros.incluirNeutros) return transacoes;
  return transacoes.filter((t) => tipoDa(dataset, t.categoria) !== 'Neutro');
}

export function transacoesDoMes(
  dataset: Dataset,
  mes: string,
  filtros: Filtros,
): Transacao[] {
  return aplicarFiltros(
    dataset,
    dataset.transacoes.filter((t) => mesDa(t, filtros.base) === mes),
    filtros,
  );
}

export interface Resumo {
  receitas: number;
  despesas: number;
  saldo: number;
  /** Quanto circulou em transferências/fatura — informativo, fora do saldo. */
  neutros: number;
  quantidade: number;
}

export function resumo(dataset: Dataset, transacoes: Transacao[]): Resumo {
  let receitas = 0;
  let despesas = 0;
  let neutros = 0;
  let quantidade = 0;

  for (const transacao of transacoes) {
    if (tipoDa(dataset, transacao.categoria) === 'Neutro') {
      neutros += Math.abs(transacao.valor);
      continue;
    }
    quantidade++;
    if (transacao.valor >= 0) receitas += transacao.valor;
    else despesas += -transacao.valor;
  }

  return { receitas, despesas, saldo: receitas - despesas, neutros, quantidade };
}

export interface TotalCategoria {
  categoria: string;
  tipo: TipoCategoria;
  total: number;
  /** Fatia do total de despesas do período, de 0 a 1. */
  fatia: number;
  quantidade: number;
}

/** Ranking de despesas por categoria no período (maior gasto primeiro). */
export function despesasPorCategoria(
  dataset: Dataset,
  transacoes: Transacao[],
): TotalCategoria[] {
  const acumulado = new Map<string, { total: number; quantidade: number }>();

  for (const transacao of transacoes) {
    const tipo = tipoDa(dataset, transacao.categoria);
    if (tipo === 'Neutro' || tipo === 'Entrada') continue;
    if (transacao.valor >= 0) continue;
    const atual = acumulado.get(transacao.categoria) ?? { total: 0, quantidade: 0 };
    atual.total += -transacao.valor;
    atual.quantidade++;
    acumulado.set(transacao.categoria, atual);
  }

  const soma = [...acumulado.values()].reduce((acc, item) => acc + item.total, 0);

  return [...acumulado.entries()]
    .map(([categoria, item]) => ({
      categoria,
      tipo: tipoDa(dataset, categoria),
      total: item.total,
      fatia: soma > 0 ? item.total / soma : 0,
      quantidade: item.quantidade,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface PontoMensal {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

export function serieMensal(dataset: Dataset, filtros: Filtros): PontoMensal[] {
  const porMes = new Map<string, PontoMensal>();

  for (const transacao of aplicarFiltros(dataset, dataset.transacoes, filtros)) {
    if (tipoDa(dataset, transacao.categoria) === 'Neutro') continue;
    const mes = mesDa(transacao, filtros.base);
    const ponto = porMes.get(mes) ?? { mes, receitas: 0, despesas: 0, saldo: 0 };
    if (transacao.valor >= 0) ponto.receitas += transacao.valor;
    else ponto.despesas += -transacao.valor;
    ponto.saldo = ponto.receitas - ponto.despesas;
    porMes.set(mes, ponto);
  }

  return [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Variação percentual contra o mês anterior; `null` quando não há base. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / Math.abs(anterior);
}

export function resumoComparado(dataset: Dataset, mes: string, filtros: Filtros) {
  const atual = resumo(dataset, transacoesDoMes(dataset, mes, filtros));
  const anterior = resumo(
    dataset,
    transacoesDoMes(dataset, previousMonth(mes), filtros),
  );
  return {
    atual,
    anterior,
    variacaoDespesas: variacao(atual.despesas, anterior.despesas),
    variacaoReceitas: variacao(atual.receitas, anterior.receitas),
  };
}

export interface CompromissoFuturo {
  mes: string;
  total: number;
  transacoes: Transacao[];
}

/**
 * Parcelas e lançamentos já contratados que caem em competências futuras —
 * o "quanto do mês que vem já está comprometido" que a planilha guarda mas
 * o resumo dela não mostra.
 */
export function compromissosFuturos(
  dataset: Dataset,
  mesReferencia: string,
  filtros: Filtros,
): CompromissoFuturo[] {
  const porMes = new Map<string, CompromissoFuturo>();

  for (const transacao of aplicarFiltros(dataset, dataset.transacoes, filtros)) {
    if (transacao.competencia <= mesReferencia) continue;
    if (transacao.valor >= 0) continue;
    const item = porMes.get(transacao.competencia) ?? {
      mes: transacao.competencia,
      total: 0,
      transacoes: [],
    };
    item.total += -transacao.valor;
    item.transacoes.push(transacao);
    porMes.set(transacao.competencia, item);
  }

  return [...porMes.values()]
    .map((item) => ({
      ...item,
      transacoes: item.transacoes.sort((a, b) => a.valor - b.valor),
    }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/**
 * Lançamentos que pedem uma decisão humana: sem categoria definida
 * (tipo "Pendente", como a categoria "Outros") ou ainda não confirmados.
 */
export function paraRevisar(dataset: Dataset): Transacao[] {
  return dataset.transacoes.filter((transacao) => {
    const tipo = tipoDa(dataset, transacao.categoria);
    const confirmada = transacao.status.toUpperCase() === 'CONFIRMADO';
    return tipo === 'Pendente' || !confirmada;
  });
}

export interface TotalOrigem {
  origem: string;
  total: number;
  quantidade: number;
}

export function despesasPorOrigem(
  dataset: Dataset,
  transacoes: Transacao[],
): TotalOrigem[] {
  const acumulado = new Map<string, TotalOrigem>();
  for (const transacao of transacoes) {
    if (transacao.valor >= 0) continue;
    if (tipoDa(dataset, transacao.categoria) === 'Neutro') continue;
    const item = acumulado.get(transacao.origem) ?? {
      origem: transacao.origem,
      total: 0,
      quantidade: 0,
    };
    item.total += -transacao.valor;
    item.quantidade++;
    acumulado.set(transacao.origem, item);
  }
  return [...acumulado.values()].sort((a, b) => b.total - a.total);
}

/** Mês mais recente com lançamentos — o mês que o app abre por padrão. */
export function mesPadrao(dataset: Dataset, filtros: Filtros): string {
  const meses = new Set(
    dataset.transacoes.map((transacao) => mesDa(transacao, filtros.base)),
  );
  const ordenados = [...meses].sort();
  const hoje = new Date().toISOString().slice(0, 7);
  if (meses.has(hoje)) return hoje;
  const passados = ordenados.filter((mes) => mes <= hoje);
  return passados.at(-1) ?? ordenados.at(-1) ?? hoje;
}

/** Todos os meses com lançamentos, do mais antigo para o mais novo. */
export function mesesDisponiveis(dataset: Dataset, filtros: Filtros): string[] {
  return [
    ...new Set(dataset.transacoes.map((transacao) => mesDa(transacao, filtros.base))),
  ].sort();
}
