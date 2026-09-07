import { ErroPlanilha } from '@/components/ErroPlanilha';
import { ListaTransacoes } from '@/components/ListaTransacoes';
import { Rodape } from '@/components/Rodape';
import { paraRevisar, tipoDa } from '@/lib/analytics';
import { formatBRL } from '@/lib/format';
import { carregarSeguro } from '@/lib/pagina';

export const dynamic = 'force-dynamic';

export default async function Revisar() {
  const carga = await carregarSeguro();
  if (!carga.ok) return <ErroPlanilha mensagem={carga.mensagem} dica={carga.dica} />;

  const { dataset } = carga;
  const pendentes = paraRevisar(dataset);
  const semCategoria = pendentes.filter(
    (transacao) => tipoDa(dataset, transacao.categoria) === 'Pendente',
  );
  const naoConfirmadas = pendentes.filter(
    (transacao) => transacao.status.toUpperCase() !== 'CONFIRMADO',
  );
  const totalSemCategoria = semCategoria.reduce(
    (soma, transacao) => soma + Math.abs(transacao.valor),
    0,
  );

  return (
    <>
      <section className="cartao p-5">
        <h1 className="text-base font-semibold text-ink">Revisar</h1>
        <p className="pt-1 text-sm text-ink-3">
          A correção é feita na planilha — este painel só aponta o que está solto.
          Ajuste a coluna <code className="rounded bg-surface-2 px-1">Categoria</code>{' '}
          (ou o termo na aba de aprendizado) e recarregue com “Atualizar da planilha”.
        </p>
        <div className="grid gap-3 pt-4 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-ink-2">Sem categoria definida</p>
            <p className="text-xl font-semibold text-ink">{semCategoria.length}</p>
            <p className="text-sm text-ink-3">{formatBRL(totalSemCategoria)} em jogo</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-ink-2">Ainda não confirmadas</p>
            <p className="text-xl font-semibold text-ink">{naoConfirmadas.length}</p>
            <p className="text-sm text-ink-3">fatura em aberto ou importação parcial</p>
          </div>
        </div>
      </section>

      {dataset.avisos.length > 0 && (
        <section className="cartao p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <span aria-hidden style={{ color: 'var(--status-warning)' }}>
              ⚠
            </span>
            Avisos da leitura da planilha
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5 pt-2 text-sm text-ink-2">
            {dataset.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="cartao p-5">
        <h2 className="text-base font-semibold text-ink">Lançamentos a revisar</h2>
        <p className="pb-4 pt-1 text-sm text-ink-3">
          {pendentes.length} no histórico inteiro, do mais recente para o mais antigo
        </p>
        <ListaTransacoes
          transacoes={pendentes.slice(0, 200)}
          mostrarCompetencia
          vazio="Nada pendente. A planilha está em dia."
        />
        {pendentes.length > 200 && (
          <p className="pt-4 text-sm text-ink-3">
            Mostrando os 200 mais recentes de {pendentes.length}.
          </p>
        )}
      </section>

      <Rodape
        fonte={dataset.fonte}
        atualizadoEm={dataset.atualizadoEm}
        quantidade={dataset.transacoes.length}
      />
    </>
  );
}
