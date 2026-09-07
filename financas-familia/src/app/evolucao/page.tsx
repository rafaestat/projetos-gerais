import { GraficoMensal } from '@/components/charts/GraficoMensal';
import { GraficoSaldo } from '@/components/charts/GraficoSaldo';
import { ErroPlanilha } from '@/components/ErroPlanilha';
import { FiltroBar } from '@/components/FiltroBar';
import { Rodape } from '@/components/Rodape';
import { mesPadrao, mesesDisponiveis, serieMensal } from '@/lib/analytics';
import { formatBRL } from '@/lib/format';
import { carregarSeguro } from '@/lib/pagina';
import { lerFiltros, lerMes, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function Evolucao({
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
  const serie = serieMensal(dataset, filtros);
  const acumulado = serie.reduce((soma, ponto) => soma + ponto.saldo, 0);
  const mediaDespesas =
    serie.length > 0
      ? serie.reduce((soma, ponto) => soma + ponto.despesas, 0) / serie.length
      : 0;

  return (
    <>
      <FiltroBar
        mes={mes}
        meses={meses}
        base={filtros.base}
        incluirNeutros={filtros.incluirNeutros}
      />

      <section className="cartao p-5">
        <h1 className="text-base font-semibold text-ink">Receitas x despesas</h1>
        <p className="pb-3 pt-1 text-sm text-ink-3">
          Cada mês do histórico da planilha, no regime de{' '}
          {filtros.base === 'caixa' ? 'caixa' : 'competência'}
        </p>
        <GraficoMensal dados={serie} mesDestacado={mes} />
      </section>

      <section className="cartao p-5">
        <h2 className="text-base font-semibold text-ink">Sobra mensal</h2>
        <p className="pb-2 pt-1 text-sm text-ink-3">
          Acumulado do período: <strong className="text-ink">{formatBRL(acumulado)}</strong>{' '}
          · média de despesas: {formatBRL(mediaDespesas)}
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
