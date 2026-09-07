'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';

import { formatCompetencia } from '@/lib/format';

interface Props {
  mes: string;
  meses: string[];
  base: 'competencia' | 'caixa';
  incluirNeutros: boolean;
  /** Telas sem recorte mensal (Extrato completo, Revisar) escondem o seletor. */
  mostrarMes?: boolean;
}

export function FiltroBar({
  mes,
  meses,
  base,
  incluirNeutros,
  mostrarMes = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pendente, iniciar] = useTransition();

  function atualizar(mudancas: Record<string, string | null>) {
    const proximos = new URLSearchParams(params.toString());
    for (const [chave, valor] of Object.entries(mudancas)) {
      if (valor === null) proximos.delete(chave);
      else proximos.set(chave, valor);
    }
    const query = proximos.toString();
    iniciar(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  const indice = meses.indexOf(mes);
  const anterior = indice > 0 ? meses[indice - 1] : null;
  const proximo = indice >= 0 && indice < meses.length - 1 ? meses[indice + 1] : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${pendente ? 'opacity-70' : ''}`}
    >
      {mostrarMes && (
        <div className="flex items-center gap-1 rounded-full border bg-surface-1 p-1">
          <button
            type="button"
            disabled={!anterior}
            onClick={() => anterior && atualizar({ mes: anterior })}
            aria-label="Mês anterior"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-2 disabled:opacity-30"
          >
            ‹
          </button>
          <label className="sr-only" htmlFor="filtro-mes">
            Mês
          </label>
          <select
            id="filtro-mes"
            value={mes}
            onChange={(evento) => atualizar({ mes: evento.target.value })}
            className="min-h-8 bg-transparent px-1 text-sm font-semibold text-ink"
          >
            {meses.map((opcao) => (
              <option key={opcao} value={opcao}>
                {formatCompetencia(opcao)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!proximo}
            onClick={() => proximo && atualizar({ mes: proximo })}
            aria-label="Próximo mês"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-2 disabled:opacity-30"
          >
            ›
          </button>
        </div>
      )}

      <div
        role="group"
        aria-label="Como agrupar os meses"
        className="flex items-center rounded-full border bg-surface-1 p-1 text-sm"
      >
        {(
          [
            ['competencia', 'Competência', 'Agrupa pelo mês da fatura'],
            ['caixa', 'Caixa', 'Agrupa pelo dia em que o dinheiro saiu'],
          ] as const
        ).map(([valor, rotulo, dica]) => (
          <button
            key={valor}
            type="button"
            title={dica}
            aria-pressed={base === valor}
            onClick={() => atualizar({ base: valor === 'competencia' ? null : valor })}
            className={`min-h-8 rounded-full px-3 ${
              base === valor ? 'bg-surface-2 font-semibold text-ink' : 'text-ink-3'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <label
        className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border bg-surface-1 px-3 text-sm text-ink-2"
        title="Transferências, pagamentos de fatura, cofrinhos e CDB: dinheiro que trocou de lugar sem virar receita ou despesa."
      >
        <input
          type="checkbox"
          checked={incluirNeutros}
          onChange={(evento) =>
            atualizar({ neutros: evento.target.checked ? '1' : null })
          }
          className="h-4 w-4 accent-[var(--entrada)]"
        />
        Mostrar transferências
      </label>
    </div>
  );
}
