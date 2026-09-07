import { describe, expect, it } from 'vitest';

import {
  parseCompetencia,
  parseData,
  parseParcela,
  parseValor,
  previousMonth,
} from '@/lib/parse';
import { parseCsv, rowsToRecords } from '@/lib/csv';

describe('parseValor', () => {
  it('lê o formato da aba Transacoes (ponto decimal)', () => {
    expect(parseValor('-R$ 15.19')).toBe(-15.19);
    expect(parseValor('R$ 8600.00')).toBe(8600);
  });

  it('lê o formato pt-BR das abas de resumo', () => {
    expect(parseValor('-R$399,08')).toBe(-399.08);
    expect(parseValor('R$1.308,90')).toBe(1308.9);
    expect(parseValor('R$0,00')).toBe(0);
    expect(parseValor('-R$139.502,91')).toBe(-139502.91);
  });

  it('aceita o escape de barra invertida do export do Sheets', () => {
    expect(parseValor('\\-R$ 45.50')).toBe(-45.5);
  });

  it('trata milhar sem decimais como agrupamento', () => {
    expect(parseValor('R$ 1.234')).toBe(1234);
    expect(parseValor('1,234')).toBe(1.234 * 1000);
  });

  it('devolve null para células vazias ou sem número', () => {
    expect(parseValor('')).toBeNull();
    expect(parseValor(undefined)).toBeNull();
    expect(parseValor('R$')).toBeNull();
  });

  it('entende parênteses e o sinal de menos tipográfico', () => {
    expect(parseValor('(R$ 10,00)')).toBe(-10);
    expect(parseValor('−R$ 10,00')).toBe(-10);
  });
});

describe('parseData', () => {
  it('mantém ISO', () => {
    expect(parseData('2026-08-30')).toBe('2026-08-30');
    expect(parseData('2026-8-3')).toBe('2026-08-03');
  });

  it('lê dd/mm/aaaa por padrão', () => {
    expect(parseData('05/06/2026')).toBe('2026-06-05');
    expect(parseData('05/06/2026', 'mdy')).toBe('2026-05-06');
  });

  it('usa o dia > 12 para desempatar', () => {
    expect(parseData('30/08/2026', 'mdy')).toBe('2026-08-30');
  });

  it('lê o formato Date(a,m,d) do gviz', () => {
    expect(parseData('Date(2026,7,30)')).toBe('2026-08-30');
  });
});

describe('parseCompetencia', () => {
  it('normaliza os dois formatos que convivem na planilha', () => {
    expect(parseCompetencia('2026-04-01')).toBe('2026-04');
    expect(parseCompetencia('2026-04')).toBe('2026-04');
  });

  it('cai para a data quando a competência está vazia', () => {
    expect(parseCompetencia('', '2026-04-18')).toBe('2026-04');
    expect(parseCompetencia(undefined, undefined)).toBeNull();
  });
});

describe('parseParcela', () => {
  it('lê parcelas com e sem zero à esquerda', () => {
    expect(parseParcela('8/10')).toEqual({ atual: 8, total: 10 });
    expect(parseParcela('08/08')).toEqual({ atual: 8, total: 8 });
    expect(parseParcela('')).toBeNull();
  });
});

describe('previousMonth', () => {
  it('atravessa a virada de ano', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-05')).toBe('2026-04');
  });
});

describe('parseCsv', () => {
  it('respeita aspas, vírgulas internas e quebras de linha', () => {
    const csv = 'a,b\n"x, y","linha1\nlinha2"\n';
    expect(parseCsv(csv)).toEqual([
      ['a', 'b'],
      ['x, y', 'linha1\nlinha2'],
    ]);
  });

  it('acha o cabeçalho mesmo com linha em branco acima', () => {
    const grid = parseCsv(',,\nID_Hash,Descricao,Valor\nabc,Mercado,-10\n');
    expect(rowsToRecords(grid, ['ID_Hash', 'Valor'])).toEqual([
      { idhash: 'abc', descricao: 'Mercado', valor: '-10' },
    ]);
  });
});

describe('formatBRLCompacto', () => {
  it('abrevia de forma determinística (sem Intl compact, que varia por runtime)', async () => {
    const { formatBRLCompacto } = await import('@/lib/format');
    // O Intl usa espaço não separável depois de "R$"; a abreviação segue igual.
    expect(formatBRLCompacto(0)).toBe('R$\u00a00,00');
    expect(formatBRLCompacto(10_000)).toBe('R$\u00a010 mil');
    expect(formatBRLCompacto(12_340)).toBe('R$\u00a012,3 mil');
    expect(formatBRLCompacto(-2_500_000)).toBe('-R$\u00a02,5 mi');
  });
});
