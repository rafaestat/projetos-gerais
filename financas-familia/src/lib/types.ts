export type TipoCategoria =
  | 'Entrada'
  | 'Despesa Fixa'
  | 'Despesa Variável'
  | 'Neutro'
  | 'Pendente';

export interface Categoria {
  nome: string;
  descricao: string;
  tipo: TipoCategoria;
}

export interface Transacao {
  id: string;
  /** Data do fato gerador, `YYYY-MM-DD`. */
  data: string;
  /** Mês em que a transação pesa no orçamento, `YYYY-MM`. */
  competencia: string;
  descricao: string;
  /** Negativo = saída, positivo = entrada. */
  valor: number;
  parcela: { atual: number; total: number } | null;
  origem: string;
  categoria: string;
  status: string;
  obs: string;
}

/** Como agrupar os meses: regime de competência (fatura) ou de caixa (data). */
export type BaseTemporal = 'competencia' | 'caixa';

export interface Dataset {
  transacoes: Transacao[];
  categorias: Categoria[];
  /** Mês → tipo, resolvido a partir da aba Categorias. */
  tipoPorCategoria: Record<string, TipoCategoria>;
  /** Meses presentes nos dados, em ordem crescente (`YYYY-MM`). */
  meses: string[];
  /** Problemas encontrados na planilha, exibidos na tela de revisão. */
  avisos: string[];
  /** Origem dos dados: útil para o rodapé e para o modo demonstração. */
  fonte: 'api' | 'public' | 'fixture';
  atualizadoEm: string;
}
