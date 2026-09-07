'use client';

import Link from 'next/link';

import type { TotalCategoria } from '@/lib/analytics';
import { formatBRL, formatPercent } from '@/lib/format';

import { TabelaDados } from './TabelaDados';

/** O href já vem pronto do servidor: componentes cliente não recebem funções. */
export type ItemCategoria = TotalCategoria & { href: string };

interface Props {
  itens: ItemCategoria[];
}

/**
 * Ranking de gastos do mês. Uma série só, portanto uma cor só para todas as
 * barras — a identidade vem do rótulo, não do matiz.
 */
export function BarrasCategoria({ itens }: Props) {
  if (itens.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-ink-3">
        Nenhuma despesa lançada neste mês.
      </p>
    );
  }

  const maior = itens[0].total;

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {itens.map((item) => (
          <li key={item.categoria}>
            <Link
              href={item.href}
              className="group block rounded-lg px-1 py-1 hover:bg-surface-2"
            >
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{item.categoria}</span>
                <span className="shrink-0 numeros-alinhados text-ink">
                  {formatBRL(item.total)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="h-3 flex-1 overflow-hidden rounded-full"
                  style={{ background: 'var(--surface-2)' }}
                  role="img"
                  aria-label={`${item.categoria}: ${formatBRL(item.total)}, ${formatPercent(item.fatia)} das despesas do mês`}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.max(2, (item.total / maior) * 100)}%`,
                      background: 'var(--serie-1)',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs text-ink-3 numeros-alinhados">
                  {formatPercent(item.fatia)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <TabelaDados
        titulo="Despesas por categoria no mês"
        colunas={['Categoria', 'Lançamentos', 'Fatia', 'Total']}
        linhas={itens.map((item) => [
          item.categoria,
          item.quantidade,
          formatPercent(item.fatia),
          formatBRL(item.total),
        ])}
      />
    </div>
  );
}
