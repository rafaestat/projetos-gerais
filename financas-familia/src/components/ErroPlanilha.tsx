interface Props {
  mensagem: string;
  dica?: string;
}

export function ErroPlanilha({ mensagem, dica }: Props) {
  return (
    <div className="cartao p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <span aria-hidden style={{ color: 'var(--status-critical)' }}>
          ✕
        </span>
        Não consegui ler a planilha
      </h2>
      <p className="mt-2 text-sm text-ink-2">{mensagem}</p>
      {dica && <p className="mt-2 text-sm text-ink-3">{dica}</p>}
      <p className="mt-4 text-sm text-ink-3">
        Enquanto isso, dá para rodar com dados de exemplo definindo{' '}
        <code className="rounded bg-surface-2 px-1">SHEETS_MODE=fixture</code> no
        arquivo <code className="rounded bg-surface-2 px-1">.env.local</code>.
      </p>
    </div>
  );
}
