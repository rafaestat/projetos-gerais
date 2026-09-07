import Link from 'next/link';

import { BarrasCategoria } from '@/components/charts/BarrasCategoria';
import { GraficoSaldo } from '@/components/charts/GraficoSaldo';
import { ErroPlanilha } from '@/components/ErroPlanilha';
import { FiltroBar } from '@/components/FiltroBar';
import { Rodape } from '@/components/Rodape';
import { StatTile } from '@/components/StatTile';
import {
  despesasPorCategoria,
  mesPadrao,
  mesesDisponiveis,
  paraRevisar,
  resumoComparado,
  serieMensal,
  transacoesDoMes,
} from '@/lib/analytics';
import { formatBRL, formatCompetencia } from '@/lib/format';
import { carregarSeguro } from '@/lib/pagina';
import { lerFiltros, lerMes, queryFiltros, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const carga = await carregarSeguro();
  if (!carga.ok) return <ErroPlanilha mensagem={carga.mensagem} dica={carga.dica} />;

  const { dataset } = carga;
  const filtros = lerFiltros(params);
  const meses = mesesDisponiveis(dataset, filtros);
  const mes = lerMes(params) ?? mesPadrao(dataset, filtros);
  const transacoes = transacoesDoMes(dataset, mes, filtros);
  const { atual, variacaoDespesas, variacaoReceitas } = resumoComparado(
    dataset,
    mes,
    filtros,
  );
  const categorias = despesasPorCategoria(dataset, transacoes).map((item) => ({
    ...item,
    href: `/transacoes${queryFiltros(filtros, { mes, categoria: item.categoria })}`,
  }));
  const serie = serieMensal(dataset, filtros).slice(-9);
  const pendencias = paraRevisar(dataset).length;
  const sobrou = atual.saldo >= 0;

  return (
    <>
      <FiltroBar
        mes={mes}
        meses={meses}
        base={filtros.base}
        incluirNeutros={filtros.incluirNeutros}
      />

      <section className="cartao p-5">
        <p className="text-sm text-ink-2">
          {sobrou ? 'Sobrou em' : 'Faltou em'} {formatCompetencia(mes)}
        </p>
        <p
          className="mt-1 text-5xl font-semibold leading-tight"
          style={{
            color: sobrou ? 'var(--texto-positivo)' : 'var(--status-critical)',
          }}
        >
          {formatBRL(Math.abs(atual.saldo))}
        </p>
        <p className="mt-2 text-sm text-ink-3">
          {atual.quantidade.toLocaleString('pt-BR')} lançamentos no mês
          {atual.neutros > 0 && !filtros.incluirNeutros && (
            <>
              {' · '}
              {formatBRL(atual.neutros)} em transferências ficaram de fora da conta
            </>
          )}
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile
          rotulo="Receitas"
          valor={atual.receitas}
          variacao={variacaoReceitas}
          subirEBom
          cor="entrada"
        />
        <StatTile
          rotulo="Despesas"
          valor={atual.despesas}
          variacao={variacaoDespesas}
          subirEBom={false}
          cor="saida"
        />
      </div>

      {pendencias > 0 && (
        <Link
          href={`/revisar${queryFiltros(filtros)}`}
          className="cartao flex items-center gap-3 p-4 hover:bg-surface-2"
        >
          <span aria-hidden style={{ color: 'var(--status-warning)' }}>
            ⚠
          </span>
          <span className="text-sm text-ink-2">
            <strong className="text-ink">{pendencias}</strong> lançamento(s) esperando
            categoria ou confirmação
          </span>
          <span aria-hidden className="ml-auto text-ink-3">
            ›
          </span>
        </Link>
      )}

      <section className="cartao p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Para onde foi o dinheiro</h2>
          <Link
            href={`/transacoes${queryFiltros(filtros, { mes })}`}
            className="text-sm text-ink-2 underline underline-offset-4"
          >
            Ver extrato
          </Link>
        </div>
        <p className="pb-4 pt-1 text-sm text-ink-3">
          Despesas de {formatCompetencia(mes)} por categoria
        </p>
        <BarrasCategoria itens={categorias} />
      </section>

      <section className="cartao p-5">
        <h2 className="text-base font-semibold text-ink">Sobra mensal</h2>
        <p className="pb-2 pt-1 text-sm text-ink-3">
          Receitas menos despesas, mês a mês
        </p>
        <GraficoSaldo dados={serie} mesDestacado={mes} />
      </section>

      <Rodape
        fonte={dataset.fonte}
        atualizadoEm={dataset.atualizadoEm}
        quantidade={dataset.transacoes.length}
      />
    </>
  );
}
