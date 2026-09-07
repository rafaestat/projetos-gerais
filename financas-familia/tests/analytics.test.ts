import { describe, expect, it } from 'vitest';

import {
  FILTROS_PADRAO,
  compromissosFuturos,
  despesasPorCategoria,
  paraRevisar,
  resumo,
  serieMensal,
  transacoesDoMes,
} from '@/lib/analytics';
import type { Dataset, Transacao } from '@/lib/types';

function transacao(patch: Partial<Transacao>): Transacao {
  return {
    id: Math.random().toString(36).slice(2),
    data: '2026-05-10',
    competencia: '2026-05',
    descricao: 'Lançamento',
    valor: -100,
    parcela: null,
    origem: 'PICPAY_CARTAO',
    categoria: 'Alimentação',
    status: 'CONFIRMADO',
    obs: '',
    ...patch,
  };
}

function dataset(transacoes: Transacao[]): Dataset {
  return {
    transacoes,
    categorias: [],
    tipoPorCategoria: {
      receita: 'Entrada',
      alimentacao: 'Despesa Variável',
      moradia: 'Despesa Fixa',
      saldo: 'Neutro',
      outros: 'Pendente',
    },
    meses: [],
    avisos: [],
    fonte: 'fixture',
    atualizadoEm: '2026-09-07T00:00:00.000Z',
  };
}

describe('resumo', () => {
  it('separa receitas de despesas e ignora lançamentos neutros', () => {
    const base = dataset([
      transacao({ categoria: 'Receita', valor: 8600 }),
      transacao({ categoria: 'Alimentação', valor: -300 }),
      transacao({ categoria: 'Moradia', valor: -1000 }),
      transacao({ categoria: 'Saldo', valor: -2500 }),
    ]);

    const total = resumo(base, transacoesDoMes(base, '2026-05', FILTROS_PADRAO));

    expect(total.receitas).toBe(8600);
    expect(total.despesas).toBe(1300);
    expect(total.saldo).toBe(7300);
    expect(total.quantidade).toBe(3);
  });

  it('conta as transferências apenas quando o usuário pede', () => {
    const base = dataset([
      transacao({ categoria: 'Receita', valor: 8600 }),
      transacao({ categoria: 'Saldo', valor: -2500 }),
    ]);
    const filtros = { ...FILTROS_PADRAO, incluirNeutros: true };
    const total = resumo(base, transacoesDoMes(base, '2026-05', filtros));

    // Mesmo incluídas na listagem, transferências não viram "despesa".
    expect(total.despesas).toBe(0);
    expect(total.neutros).toBe(2500);
  });
});

describe('base temporal', () => {
  it('regime de caixa usa a data; competência usa o mês da fatura', () => {
    const base = dataset([
      transacao({ data: '2025-10-05', competencia: '2026-05', valor: -45.5 }),
    ]);

    expect(transacoesDoMes(base, '2026-05', FILTROS_PADRAO)).toHaveLength(1);
    expect(
      transacoesDoMes(base, '2025-10', { ...FILTROS_PADRAO, base: 'caixa' }),
    ).toHaveLength(1);
  });
});

describe('despesasPorCategoria', () => {
  it('ordena por gasto e calcula a fatia do total', () => {
    const base = dataset([
      transacao({ categoria: 'Alimentação', valor: -300 }),
      transacao({ categoria: 'Moradia', valor: -700 }),
      transacao({ categoria: 'Receita', valor: 5000 }),
    ]);

    const ranking = despesasPorCategoria(
      base,
      transacoesDoMes(base, '2026-05', FILTROS_PADRAO),
    );

    expect(ranking.map((item) => item.categoria)).toEqual(['Moradia', 'Alimentação']);
    expect(ranking[0].fatia).toBeCloseTo(0.7);
  });
});

describe('serieMensal', () => {
  it('agrega por mês em ordem cronológica', () => {
    const base = dataset([
      transacao({ competencia: '2026-06', valor: -200 }),
      transacao({ competencia: '2026-05', categoria: 'Receita', valor: 1000 }),
    ]);

    expect(serieMensal(base, FILTROS_PADRAO)).toEqual([
      { mes: '2026-05', receitas: 1000, despesas: 0, saldo: 1000 },
      { mes: '2026-06', receitas: 0, despesas: 200, saldo: -200 },
    ]);
  });
});

describe('compromissosFuturos', () => {
  it('lista só as competências posteriores ao mês de referência', () => {
    const base = dataset([
      transacao({ competencia: '2026-05', valor: -100 }),
      transacao({ competencia: '2026-07', valor: -45.5, parcela: { atual: 3, total: 11 } }),
      transacao({ competencia: '2026-08', valor: -45.5, parcela: { atual: 4, total: 11 } }),
    ]);

    const futuros = compromissosFuturos(base, '2026-05', FILTROS_PADRAO);

    expect(futuros.map((item) => item.mes)).toEqual(['2026-07', '2026-08']);
    expect(futuros[0].total).toBe(45.5);
  });
});

describe('paraRevisar', () => {
  it('pega pendentes e não confirmados', () => {
    const base = dataset([
      transacao({ categoria: 'Outros' }),
      transacao({ status: 'EM_ABERTO' }),
      transacao({}),
    ]);

    expect(paraRevisar(base)).toHaveLength(2);
  });
});
