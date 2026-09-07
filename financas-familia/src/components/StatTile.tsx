import { formatBRL, formatPercent } from '@/lib/format';

interface Props {
  rotulo: string;
  valor: number;
  /** Variação contra o mês anterior (0.12 = +12%). */
  variacao?: number | null;
  /** Para despesas, subir é ruim; para receitas, subir é bom. */
  subirEBom?: boolean;
  cor?: 'entrada' | 'saida' | 'neutro';
  detalhe?: string;
}

export function StatTile({
  rotulo,
  valor,
  variacao,
  subirEBom = true,
  cor = 'neutro',
  detalhe,
}: Props) {
  const marca =
    cor === 'entrada'
      ? 'var(--entrada)'
      : cor === 'saida'
        ? 'var(--saida)'
        : 'var(--axis)';

  const subiu = variacao != null && variacao > 0;
  const bom = variacao == null ? null : subiu === subirEBom;

  return (
    <div className="cartao flex flex-col gap-1 p-4">
      <div className="flex items-center gap-2 text-sm text-ink-2">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: marca }}
        />
        {rotulo}
      </div>
      <div className="text-2xl font-semibold text-ink">{formatBRL(valor)}</div>
      {variacao != null && (
        <div
          className="text-sm"
          style={{ color: bom ? 'var(--texto-positivo)' : 'var(--status-critical)' }}
        >
          <span aria-hidden>{subiu ? '▲' : '▼'}</span>{' '}
          {formatPercent(Math.abs(variacao))} vs. mês anterior
        </div>
      )}
      {detalhe && <div className="text-sm text-ink-3">{detalhe}</div>}
    </div>
  );
}
