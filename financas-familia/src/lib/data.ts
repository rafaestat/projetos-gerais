import { rowsToRecords } from './csv';
import {
  DATE_ORDER,
  SHEETS_MODE,
  TAB_CATEGORIAS,
  TAB_TRANSACOES,
} from './config';
import { parseCompetencia, parseData, parseParcela, parseValor } from './parse';
import { fetchTab } from './sheets';
import type { Categoria, Dataset, TipoCategoria, Transacao } from './types';

const COLUNAS_TRANSACOES = ['Data', 'Descricao', 'Valor', 'Categoria'];
const COLUNAS_CATEGORIAS = ['Categoria', 'Tipo'];

/** Chave estável para comparar nomes de categoria (sem acento, sem caixa). */
export function chaveCategoria(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const TIPOS: Record<string, TipoCategoria> = {
  entrada: 'Entrada',
  receita: 'Entrada',
  'despesa fixa': 'Despesa Fixa',
  'despesa variavel': 'Despesa Variável',
  neutro: 'Neutro',
  pendente: 'Pendente',
};

function normalizarTipo(raw: string): TipoCategoria {
  return TIPOS[chaveCategoria(raw)] ?? 'Despesa Variável';
}

function lerCategorias(grid: string[][]): Categoria[] {
  const registros = rowsToRecords(grid, COLUNAS_CATEGORIAS);
  const porChave = new Map<string, Categoria>();

  for (const registro of registros) {
    const nome = (registro.categoria ?? '').trim();
    if (!nome) continue;
    const chave = chaveCategoria(nome);
    const existente = porChave.get(chave);
    // A planilha repete "Saldo" com a segunda linha vazia — a primeira vence.
    if (existente && existente.tipo) continue;
    porChave.set(chave, {
      nome,
      descricao: (registro.descricaopadrao ?? registro.descricao ?? '').trim(),
      tipo: normalizarTipo(registro.tipo ?? ''),
    });
  }

  return [...porChave.values()];
}

function lerTransacoes(
  grid: string[][],
  avisos: string[],
): Transacao[] {
  const registros = rowsToRecords(grid, COLUNAS_TRANSACOES);
  const porId = new Map<string, Transacao>();
  let semData = 0;
  let semValor = 0;
  let duplicadas = 0;

  registros.forEach((registro, indice) => {
    const valor = parseValor(registro.valor);
    if (valor === null) {
      semValor++;
      return;
    }

    const data = parseData(registro.data, DATE_ORDER);
    const competencia = parseCompetencia(registro.competencia, registro.data);
    if (!data && !competencia) {
      semData++;
      return;
    }

    const dataFinal = data ?? `${competencia}-01`;
    const id = (registro.idhash ?? '').trim() || `linha-${indice}`;
    if (porId.has(id)) {
      duplicadas++;
      return;
    }

    porId.set(id, {
      id,
      data: dataFinal,
      competencia: competencia ?? dataFinal.slice(0, 7),
      descricao: (registro.descricao ?? '').trim() || 'Sem descrição',
      valor,
      parcela: parseParcela(registro.parcela),
      origem: (registro.origem ?? '').trim() || 'Não informado',
      categoria: (registro.categoria ?? '').trim() || 'Outros',
      status: (registro.status ?? '').trim() || 'CONFIRMADO',
      obs: (registro.obs ?? '').trim(),
    });
  });

  if (semValor > 0) {
    avisos.push(`${semValor} linha(s) da aba de transações sem valor numérico — ignoradas.`);
  }
  if (semData > 0) {
    avisos.push(`${semData} linha(s) sem data nem competência — ignoradas.`);
  }
  if (duplicadas > 0) {
    avisos.push(`${duplicadas} linha(s) com ID_Hash repetido — contadas uma única vez.`);
  }

  return [...porId.values()].sort((a, b) => (a.data < b.data ? 1 : -1));
}

export async function carregarDataset(): Promise<Dataset> {
  const avisos: string[] = [];
  const [gridTransacoes, gridCategorias] = await Promise.all([
    fetchTab(TAB_TRANSACOES),
    fetchTab(TAB_CATEGORIAS).catch(() => [] as string[][]),
  ]);

  const transacoes = lerTransacoes(gridTransacoes, avisos);
  const categorias = lerCategorias(gridCategorias);

  if (transacoes.length === 0) {
    avisos.push(
      `Nenhuma transação encontrada na aba "${TAB_TRANSACOES}". Confira o nome da aba em SHEET_TAB_TRANSACOES.`,
    );
  }
  if (categorias.length === 0) {
    avisos.push(
      `Não consegui ler a aba "${TAB_CATEGORIAS}"; os tipos de categoria estão sendo inferidos.`,
    );
  }

  const tipoPorCategoria: Record<string, TipoCategoria> = {};
  for (const categoria of categorias) {
    tipoPorCategoria[chaveCategoria(categoria.nome)] = categoria.tipo;
  }
  // Categorias que aparecem nas transações mas não estão cadastradas.
  const semCadastro = new Set<string>();
  for (const transacao of transacoes) {
    const chave = chaveCategoria(transacao.categoria);
    if (!(chave in tipoPorCategoria)) semCadastro.add(transacao.categoria);
  }
  if (semCadastro.size > 0) {
    avisos.push(
      `Categoria(s) usada(s) nas transações mas ausente(s) da aba Categorias: ${[...semCadastro].join(', ')}.`,
    );
  }

  const meses = [
    ...new Set(transacoes.flatMap((t) => [t.competencia, t.data.slice(0, 7)])),
  ].sort();

  return {
    transacoes,
    categorias,
    tipoPorCategoria,
    meses,
    avisos,
    fonte: SHEETS_MODE,
    atualizadoEm: new Date().toISOString(),
  };
}
