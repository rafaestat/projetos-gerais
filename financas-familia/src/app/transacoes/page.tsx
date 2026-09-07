import Link from 'next/link';

import { Busca } from '@/components/Busca';
import { ErroPlanilha } from '@/components/ErroPlanilha';
import { FiltroBar } from '@/components/FiltroBar';
import { ListaTransacoes } from '@/components/ListaTransacoes';
import { Rodape } from '@/components/Rodape';
import {
  aplicarFiltros,
  despesasPorOrigem,
  mesPadrao,
  mesesDisponiveis,
  resumo,
  transacoesDoMes,
} from '@/lib/analytics';
import { chaveCategoria } from '@/lib/data';
import { formatBRL, formatCompetencia } from '@/lib/format';
import { carregarSeguro } from '@/lib/pagina';
import {
  lerBusca,
  lerCategoria,
  lerFiltros,
  lerMes,
  queryFiltros,
  type SearchParams,
} from '@/lib/params';

export const dynamic = 'force-dynamic';

export default async function Extrato({
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
  const busca = lerBusca(params);
  const categoria = lerCategoria(params);

  // Com texto de busca a varredura passa a valer para todos os meses — é o
  // que se espera de uma busca; sem texto, o extrato é do mês selecionado.
  const base = busca
    ? aplicarFiltros(dataset, dataset.transacoes, filtros)
    : transacoesDoMes(dataset, mes, filtros);

  const termo = busca.toLowerCase();
  const transacoes = base.filter((transacao) => {
    const casaBusca =
      !termo ||
      transacao.descricao.toLowerCase().includes(termo) ||
      transacao.categoria.toLowerCase().includes(termo) ||
      transacao.origem.toLowerCase().includes(termo);
    const casaCategoria =
      !categoria || chaveCategoria(transacao.categoria) === chaveCategoria(categoria);
    return casaBusca && casaCategoria;
  });

  const total = resumo(dataset, transacoes);
  const origens = despesasPorOrigem(dataset, transacoes).slice(0, 4);

  return (
    <>
      <FiltroBar
        mes={mes}
        meses={meses}
        base={filtros.base}
        incluirNeutros={filtros.incluirNeutros}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Busca />
        {categoria && (
          <Link
            href={`/transacoes${queryFiltros(filtros, { mes, q: busca || undefined })}`}
            className="flex min-h-10 items-center gap-2 rounded-full border bg-surface-1 px-3 text-sm text-ink"
          >
            {categoria}
            <span aria-hidden className="text-ink-3">
              ✕
            </span>
            <span className="sr-only">Remover filtro de categoria</span>
          </Link>
        )}
      </div>

      <section className="cartao p-5">
        <h1 className="text-base font-semibold text-ink">
          {busca ? 'Busca em todos os meses' : `Extrato de ${formatCompetencia(mes)}`}
        </h1>
        <p className="pt-1 text-sm text-ink-3">
          {transacoes.length.toLocaleString('pt-BR')} lançamento(s) ·{' '}
          {formatBRL(total.despesas)} em despesas · {formatBRL(total.receitas)} em
          receitas
        </p>

        {origens.length > 1 && (
          <ul className="flex flex-wrap gap-2 pt-3 text-xs text-ink-2">
            {origens.map((origem) => (
              <li key={origem.origem} className="rounded-full border px-2 py-1">
                {origem.origem.replace(/_/g, ' ').toLowerCase()} ·{' '}
                <span className="numeros-alinhados">{formatBRL(origem.total)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-5">
          <ListaTransacoes
            transacoes={transacoes}
            mostrarCompetencia={filtros.base === 'caixa'}
            vazio={
              busca
                ? `Nada encontrado para “${busca}”.`
                : 'Nenhum lançamento neste mês.'
            }
          />
        </div>
      </section>

      <Rodape
        fonte={dataset.fonte}
        atualizadoEm={dataset.atualizadoEm}
        quantidade={dataset.transacoes.length}
      />
    </>
  );
}
