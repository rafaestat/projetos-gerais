import { formatBRL, formatDataCurta } from '@/lib/format';
import type { Transacao } from '@/lib/types';

interface Props {
  transacoes: Transacao[];
  /** Quando true, mostra a competência ao lado da data (útil em parcelas). */
  mostrarCompetencia?: boolean;
  vazio?: string;
}

function Etiqueta({ children, tom = 'neutro' }: { children: React.ReactNode; tom?: 'neutro' | 'alerta' }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs"
      style={
        tom === 'alerta'
          ? { color: 'var(--text-primary)', borderColor: 'var(--status-warning)' }
          : { color: 'var(--text-secondary)' }
      }
    >
      {children}
    </span>
  );
}

export function ListaTransacoes({
  transacoes,
  mostrarCompetencia = false,
  vazio = 'Nenhum lançamento encontrado.',
}: Props) {
  if (transacoes.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-3">{vazio}</p>;
  }

  const porDia = new Map<string, Transacao[]>();
  for (const transacao of transacoes) {
    const lista = porDia.get(transacao.data) ?? [];
    lista.push(transacao);
    porDia.set(transacao.data, lista);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia}>
          <h3 className="pb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
            {formatDataCurta(dia)}
          </h3>
          <ul className="flex flex-col">
            {lista.map((transacao) => {
              const entrada = transacao.valor >= 0;
              const pendente = transacao.status.toUpperCase() !== 'CONFIRMADO';
              return (
                <li
                  key={transacao.id}
                  className="flex items-start justify-between gap-3 border-b py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {transacao.descricao}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Etiqueta>{transacao.categoria}</Etiqueta>
                      <Etiqueta>{transacao.origem.replace(/_/g, ' ').toLowerCase()}</Etiqueta>
                      {transacao.parcela && (
                        <Etiqueta>
                          parcela {transacao.parcela.atual}/{transacao.parcela.total}
                        </Etiqueta>
                      )}
                      {mostrarCompetencia && <Etiqueta>{transacao.competencia}</Etiqueta>}
                      {pendente && (
                        <Etiqueta tom="alerta">
                          <span aria-hidden>⚠ </span>
                          {transacao.status.toLowerCase().replace(/_/g, ' ')}
                        </Etiqueta>
                      )}
                    </div>
                    {transacao.obs && (
                      <p className="mt-1 text-xs text-ink-3">{transacao.obs}</p>
                    )}
                  </div>
                  <span
                    className="shrink-0 numeros-alinhados text-sm font-semibold"
                    style={{
                      color: entrada ? 'var(--texto-positivo)' : 'var(--text-primary)',
                    }}
                  >
                    {entrada ? '+' : '−'}
                    {formatBRL(Math.abs(transacao.valor))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
