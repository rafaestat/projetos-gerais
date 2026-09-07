import { ErroPlanilha } from '@/components/ErroPlanilha';
import { FiltroBar } from '@/components/FiltroBar';
import { ListaTransacoes } from '@/components/ListaTransacoes';
import { Rodape } from '@/components/Rodape';
import {
  compromissosFuturos,
  mesPadrao,
  mesesDisponiveis,
  resumo,
  transacoesDoMes,
} from '@/lib/analytics';
import { formatBRL, formatCompetencia } from '@/lib/format';
import { carregarSeguro } from '@/lib/pagina';
import { lerFiltros, lerMes, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function Futuro({
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
  const futuros = compromissosFuturos(dataset, mes, filtros);
  const totalComprometido = futuros.reduce((soma, item) => soma + item.total, 0);
  const receitaDoMes = resumo(dataset, transacoesDoMes(dataset, mes, filtros)).receitas;

  return (
    <>
      <FiltroBar
        mes={mes}
        meses={meses}
        base={filtros.base}
        incluirNeutros={filtros.incluirNeutros}
      />

      <section className="cartao p-5">
        <h1 className="text-base font-semibold text-ink">Já comprometido</h1>
        <p className="pt-1 text-sm text-ink-3">
          Parcelas e lançamentos com competência depois de {formatCompetencia(mes)} —
          o que já está contratado e vai chegar nas próximas faturas.
        </p>
        <p className="pt-4 text-4xl font-semibold text-ink">
          {formatBRL(totalComprometido)}
        </p>
        {receitaDoMes > 0 && (
          <p className="pt-1 text-sm text-ink-3">
            equivale a{' '}
            {(totalComprometido / receitaDoMes).toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })}
            × a receita de {formatCompetencia(mes)}
          </p>
        )}
      </section>

      {futuros.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-3">
          Nenhuma parcela futura lançada na planilha.
        </p>
      ) : (
        futuros.map((item) => (
          <section key={item.mes} className="cartao p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-ink">
                {formatCompetencia(item.mes)}
              </h2>
              <span className="numeros-alinhados text-base font-semibold text-ink">
                {formatBRL(item.total)}
              </span>
            </div>
            <p className="pb-3 pt-1 text-sm text-ink-3">
              {item.transacoes.length} lançamento(s)
            </p>
            <ListaTransacoes transacoes={item.transacoes} mostrarCompetencia />
          </section>
        ))
      )}

      <Rodape
        fonte={dataset.fonte}
        atualizadoEm={dataset.atualizadoEm}
        quantidade={dataset.transacoes.length}
      />
    </>
  );
}
